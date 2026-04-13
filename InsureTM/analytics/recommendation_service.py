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
            
            # Analyse des testeurs assignés
            testers = campaign.assigned_testers.all()
            tester_stats = []
            
            for tester in testers:
                # Mesure de la charge récente (test exécutés ces 3 derniers jours)
                recent_tests = TestCase.objects.filter(
                    tester=tester,
                    campaign=campaign,
                    execution_date__gte=timezone.now() - timedelta(days=3)
                ).count()
                
                # Charge journalière moyenne sur 3 jours
                tester_load = recent_tests / 3.0
                
                tester_stats.append({
                    "id": tester.id,
                    "name": f"{tester.first_name} {tester.last_name[0]}." if tester.first_name and tester.last_name else tester.username,
                    "current_load": round(tester_load, 1),
                    "is_overloaded": tester_load > 8, # Seuil arbitraire
                    "total_executed": recent_tests
                })
                
            # Distribution intelligente
            # Trier par charge croissante
            tester_stats.sort(key=lambda x: x['current_load'])
            
            delta_velocity = max(0, required_velocity - current_velocity)
            
            # Suggérer une charge supplémentaire pour les 2 testeurs les moins chargés
            recommendations = []
            if delta_velocity > 0 and tester_stats:
                num_eligible = sum(1 for t in tester_stats if not t['is_overloaded'])
                if num_eligible > 0:
                    num_to_assign = min(2, num_eligible)
                    for i in range(num_to_assign):
                        # On ne prend que ceux qui ne sont pas surchargés
                        tester = next((t for t in tester_stats if not t['is_overloaded'] and 'recommended_extra' not in t), None)
                        if tester:
                            extra = round(delta_velocity / num_to_assign, 1)
                            tester['recommended_extra'] = extra
                            tester['status'] = 'RECOMMENDED'
                            recommendations.append({
                                "type": "assignment",
                                "tester_id": tester['id'],
                                "tester_name": tester['name'],
                                "extra_tests_per_day": extra
                            })
                else:
                    # Tous sont surchargés
                    for t in tester_stats:
                        t['status'] = 'OVERLOADED'

            # Génération des actions IA structurées
            ai_actions = self._generate_ai_actions(campaign, ml_status, required_velocity, tester_stats)
            
            return {
                "campaign_id": campaign_id,
                "campaign_title": campaign.title,
                "delay_days": delay_days,
                "current_velocity": round(current_velocity, 1),
                "required_velocity": round(required_velocity, 1),
                "days_left": days_left,
                "remaining_tests": remaining_tests,
                "progress_percentage": ml_status.get('progress', {}).get('percentage', 0),
                "tester_distribution": tester_stats,
                "ai_actions": ai_actions,
                "deadline": target_date.isoformat()
            }
        except Exception as e:
            logger.exception("Error in CatchupRecommendationManager")
            return {"error": str(e)}

    def _generate_ai_actions(self, campaign, ml_status, required_velocity, tester_stats):
        actions = []
        
        # 1. Suggestion d'assignation
        top_tester = next((t for t in tester_stats if t.get('recommended_extra')), None)
        if top_tester:
            actions.append({
                "id": f"assign_{top_tester['id']}",
                "title": f"Assigner {top_tester['recommended_extra']} tests/jour supplémentaires à {top_tester['name']}",
                "description": f"Sa charge actuelle est de {top_tester['current_load']} tests/j, ce qui laisse de la marge pour rattraper le retard.",
                "type": "success",
                "action_label": "Appliquer",
                "impact": f"+{top_tester['recommended_extra']} tests/j"
            })
            
        # 2. Dépriorisation
        actions.append({
            "id": "deprioritize_low",
            "title": "Déprioriser les tests TC80-TC95 (couverture basse criticité)",
            "description": "Action recommandée pour concentrer les efforts sur les modules critiques et réduire la charge de 15%.",
            "type": "warning",
            "action_label": "Appliquer",
            "impact": "Concentration"
        })
        
        # 3. Alerte Manager
        if ml_status.get('delay_days', 0) > 3:
            actions.append({
                "id": "alert_mgr",
                "title": "Alerte manager requise",
                "description": "À la cadence actuelle, la date contractuelle du projet ne sera pas respectée.",
                "type": "error",
                "action_label": "Notifier le manager",
                "impact": "Escalade"
            })
            
        return actions
