import logging
from datetime import date, timedelta
from django.utils import timezone
from django.contrib.auth import get_user_model
from campaigns.models import Campaign
from testCases.models import TestCase
from .ml_service import MLTimelineGuard
from .groq_service import GroqService

logger = logging.getLogger(__name__)
User = get_user_model()

class CatchupRecommendationManager:
    def __init__(self):
        self.ml_guard = MLTimelineGuard()
        self.groq_service = GroqService()

    def get_catchup_plan(self, campaign_id):
        try:
            campaign = Campaign.objects.get(id=campaign_id)
            ml_status = self.ml_guard.get_campaign_status(campaign_id)
            
            delay_days = ml_status.get('delay_days', 0)
            current_velocity = ml_status.get('velocity', 0)
            
            total_tests = campaign.nb_test_cases or 0
            finished_tests = ml_status.get('progress', {}).get('finished', 0)
            remaining_tests = max(0, total_tests - finished_tests)
            
            # Calcul de la date cible (deadline originale)
            target_date = campaign.estimated_end_date
            if not target_date:
                # Si pas de date, on prend la date d'aujourd'hui + 7 jours par défaut pour le calcul
                target_date = timezone.now().date() + timedelta(days=7)
                
            today = timezone.now().date()
            days_left = (target_date - today).days
            
            if days_left <= 0:
                days_left = 1 # Sécurité pour éviter division par zéro
                
            required_velocity = remaining_tests / days_left
            
            # Analyse des testeurs disponibles (ceux du projet ou tous les testeurs)
            # On cherche des renforts parmi ceux qui ne sont pas déjà dans la campagne
            current_tester_ids = list(campaign.assigned_testers.values_list('id', flat=True))
            
            # Pool de testeurs potentiels : tous les testeurs du système
            all_relevant_testers = User.objects.filter(role='TESTER')
            
            from campaigns.models import CampaignAssignment
            
            tester_stats = []
            for tester in all_relevant_testers:
                # 1. Measure recent load (last 3 days)
                recent_tests = TestCase.objects.filter(
                    tester=tester,
                    execution_date__gte=timezone.now() - timedelta(days=3)
                ).count()
                tester_load = recent_tests / 3.0
                
                # 2. Get ML Performance Score
                perf = self.ml_guard.score_tester(tester.id, campaign_id)
                
                is_already_in = tester.id in current_tester_ids
                
                # 3. Check if they finished their quota (if already in)
                has_finished_quota = False
                if is_already_in:
                    assignment = CampaignAssignment.objects.filter(campaign=campaign, tester=tester).first()
                    if assignment and assignment.test_quota > 0:
                        total_done = TestCase.objects.filter(campaign=campaign, tester=tester).count()
                        has_finished_quota = total_done >= assignment.test_quota

                tester_stats.append({
                    "id": tester.id,
                    "name": f"{tester.first_name} {tester.last_name[0]}." if tester.first_name and tester.last_name else tester.username,
                    "current_load": round(tester_load, 1),
                    "is_overloaded": tester_load > 8,
                    "is_already_in": is_already_in,
                    "has_finished_quota": has_finished_quota,
                    "ml_score": perf['score'],
                    "ml_label": perf['label'],
                    "ml_metrics": perf['metrics']
                })
                
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
                    extra = round(delta_velocity / num_to_assign, 1)
                    tester['recommended_extra'] = extra
                    tester['status'] = 'RECOMMENDED'
                    recommendations.append({
                        "type": "assignment",
                        "tester_id": tester['id'],
                        "tester_name": tester['name'],
                        "extra_tests_per_day": extra
                    })

            # On ne retourne que les testeurs recommandés (renforts) ou ceux qui sont intéressants à voir
            final_distribution = [t for t in tester_stats if t.get('status') == 'RECOMMENDED']
            
            # Si aucun renfort n'est disponible, on montre les testeurs actuels pour information
            if not final_distribution:
                final_distribution = [t for t in tester_stats if t['is_already_in']]

            return {
                "campaign_id": campaign_id,
                "campaign_title": campaign.title,
                "delay_days": delay_days,
                "current_velocity": round(current_velocity, 1),
                "required_velocity": round(required_velocity, 1),
                "days_left": days_left,
                "remaining_tests": remaining_tests,
                "progress_percentage": ml_status.get('progress', {}).get('percentage', 0),
                "tester_distribution": final_distribution,
                "deadline": target_date.isoformat(),
                "recommendation_engine": "ML Performance Model v1.0"
            }
        except Exception as e:
            logger.exception("Error in CatchupRecommendationManager")
            return {"error": str(e)}

