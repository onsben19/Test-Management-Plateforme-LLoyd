import logging
import math
from datetime import date, timedelta
from concurrent.futures import ThreadPoolExecutor, as_completed
from django.utils import timezone
from django.core.cache import cache
from django.contrib.auth import get_user_model
from campaigns.models import Campaign
from testCases.models import TestCase
from .ml_service import MLTimelineGuard
from .groq_service import GroqService
import requests

logger = logging.getLogger(__name__)
User = get_user_model()

class CatchupRecommendationManager:
    def __init__(self):
        self.ml_guard = MLTimelineGuard()
        self.groq_service = GroqService()

    def send_to_n8n(self, plan_data):
        """
        Envoie le plan de rattrapage à n8n via un Webhook.
        """
        import os
        from django.conf import settings as django_settings
        token = os.environ.get('N8N_WEBHOOK_TOKEN', '')
        n8n_base = getattr(django_settings, 'N8N_BASE_URL', 'http://insuretm-n8n:5678')
        n8n_url = f"{n8n_base}/webhook/catchup-plan?token={token}"
        try:
            logger.info(f"Tentative d'envoi du plan à n8n: {n8n_url}")
            response = requests.post(n8n_url, json=plan_data, timeout=5)
            if response.status_code == 200:
                logger.info("Plan envoyé avec succès à n8n.")
                return True
            else:
                logger.warning(f"Erreur n8n. Code: {response.status_code}")
                return False
        except Exception as e:
            logger.error(f"Erreur appel n8n: {e}")
            return False

    def _score_one_tester(self, tester, campaign, current_tester_ids, campaign_id, cutoff):
        """Compute stats for a single tester — designed to run in a thread pool."""
        from campaigns.models import CampaignAssignment

        cache_key = f"catchup_tester_{tester.id}_{campaign_id}"
        cached = cache.get(cache_key)
        if cached:
            return cached

        recent_tests = TestCase.objects.filter(
            tester=tester,
            execution_date__gte=cutoff
        ).count()
        tester_load = recent_tests / 3.0

        perf = self.ml_guard.score_tester(tester.id, campaign_id)

        is_already_in = tester.id in current_tester_ids

        has_finished_quota = False
        if is_already_in:
            assignment = CampaignAssignment.objects.filter(campaign=campaign, tester=tester).first()
            if assignment and assignment.test_quota > 0:
                total_done = TestCase.objects.filter(
                    campaign=campaign, tester=tester
                ).exclude(status='PENDING').count()
                has_finished_quota = total_done >= assignment.test_quota

        result = {
            "id": tester.id,
            "name": (
                f"{tester.first_name} {tester.last_name[0]}."
                if tester.first_name and tester.last_name
                else tester.username
            ),
            "email": tester.email,
            "current_load": round(tester_load, 1),
            "is_overloaded": tester_load > 8,
            "is_already_in": is_already_in,
            "has_finished_quota": has_finished_quota,
            "ml_score": perf['score'],
            "ml_label": perf['label'],
            "ml_metrics": perf['metrics'],
        }
        cache.set(cache_key, result, timeout=120)
        return result

    def get_catchup_plan(self, campaign_id):
        plan_cache_key = f"catchup_plan_{campaign_id}"
        cached_plan = cache.get(plan_cache_key)
        if cached_plan:
            return cached_plan

        try:
            campaign = Campaign.objects.get(id=campaign_id)
            ml_status = self.ml_guard.get_campaign_status(campaign_id, generate_insight=False)
            
            delay_days = ml_status.get('delay_days', 0)
            current_velocity = ml_status.get('velocity', 0)
            
            db_total = TestCase.objects.filter(campaign=campaign).count()
            total_tests = max(campaign.nb_test_cases or 0, db_total)
            finished_tests = ml_status.get('progress', {}).get('finished', 0)
            remaining_tests = max(0, total_tests - finished_tests)
            
            target_date = campaign.estimated_end_date
            if not target_date:
                target_date = timezone.now().date() + timedelta(days=7)
                
            today = timezone.now().date()
            days_left = max(1, (target_date - today).days)
            required_velocity = remaining_tests / days_left
            
            current_tester_ids = set(campaign.assigned_testers.values_list('id', flat=True))
            all_relevant_testers = list(User.objects.filter(role='TESTER'))
            cutoff = timezone.now() - timedelta(days=3)
            
            # Score all testers in parallel (up to 8 threads)
            tester_stats = []
            with ThreadPoolExecutor(max_workers=min(8, len(all_relevant_testers) or 1)) as executor:
                futures = {
                    executor.submit(
                        self._score_one_tester,
                        tester, campaign, current_tester_ids, campaign_id, cutoff
                    ): tester
                    for tester in all_relevant_testers
                }
                for future in as_completed(futures):
                    try:
                        tester_stats.append(future.result())
                    except Exception as exc:
                        logger.warning(f"score_tester failed: {exc}")
                
            # Distribution intelligente : on cherche des renforts
            # (ceux qui ne sont PAS dans la campagne OU ceux qui ont déjà fini leur quota)
            potential_reinforcements = [
                t for t in tester_stats 
                if not t['is_overloaded'] and (not t['is_already_in'] or t['has_finished_quota'])
            ]
            potential_reinforcements.sort(key=lambda x: (-x['ml_score'], x['current_load']))
            
            delta_velocity = max(0, required_velocity - current_velocity)
            
            # Suggérer une charge supplémentaire pour les 2 testeurs les moins chargés PARMI LES RENFORTS
            recommendations = []
            if delta_velocity > 0 and potential_reinforcements:
                num_to_assign = min(2, len(potential_reinforcements))
                for i in range(num_to_assign):
                    tester = potential_reinforcements[i]
                    extra = math.ceil(delta_velocity / num_to_assign)
                    tester['recommended_extra'] = extra
                    tester['status'] = 'RECOMMENDED'
                    recommendations.append({
                        "type": "assignment",
                        "tester_id": tester['id'],
                        "tester_name": tester['name'],
                        "extra_tests_per_day": extra
                    })

            # Marquer les testeurs déjà assignés comme "CURRENT"
            for t in tester_stats:
                if t['is_already_in'] and t.get('status') != 'RECOMMENDED':
                    t['status'] = 'CURRENT'

            # Toujours inclure : renforts recommandés + équipe actuelle
            final_distribution = [
                t for t in tester_stats
                if t.get('status') in ('RECOMMENDED', 'CURRENT')
            ]

            # Si vraiment personne, afficher tout le monde pour information
            if not final_distribution:
                final_distribution = tester_stats

            start_date_val = campaign.start_date.isoformat() if campaign.start_date else campaign.created_at.date().isoformat()
            projected_end_date_val = ml_status.get('projected_end_date')

            plan_data = {
                "campaign_id": campaign_id,
                "campaign_title": campaign.title,
                "delay_days": delay_days,
                "current_velocity": math.ceil(current_velocity),
                "required_velocity": math.ceil(required_velocity),
                "days_left": days_left,
                "remaining_tests": remaining_tests,
                "progress_percentage": ml_status.get('progress', {}).get('percentage', 0),
                "tester_distribution": final_distribution,
                "deadline": target_date.isoformat(),
                "start_date": start_date_val,
                "projected_end_date": projected_end_date_val,
                "recommendation_engine": "ML Performance Model v1.0"
            }

            # NE PAS appeler send_to_n8n ici — n8n est déclenché uniquement
            # par NotifyCatchupView (bouton "Informer" du manager).
            cache.set(plan_cache_key, plan_data, timeout=90)
            return plan_data
        except Exception as e:
            logger.exception("Error in CatchupRecommendationManager")
            return {"error": str(e)}

