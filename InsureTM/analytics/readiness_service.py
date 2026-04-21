from django.utils import timezone
from campaigns.models import Campaign
from testCases.models import TestCase
from anomalies.models import Anomalie
from .ml_service import MLTimelineGuard
import math

class ReleaseReadinessManager:
    def __init__(self):
        self.ml_guard = MLTimelineGuard()

    def calculate_readiness_score(self, campaign_id=None, project_id=None):
        try:
            campaigns = []
            if project_id:
                campaigns = list(Campaign.objects.filter(project_id=project_id))
                if not campaigns:
                    return {"score": 0, "reasons": ["Aucune campagne trouvée pour ce projet."], "breakdown": {}}
            else:
                campaign = Campaign.objects.get(id=campaign_id)
                campaigns = [campaign]
            
            total_tests = 0
            passed_tests = 0
            failed_tests = 0
            all_test_cases = TestCase.objects.none()
            worst_ml_status = "INITIAL"
            highest_delay = 0
            highest_confidence = 0
            
            # Aggregate stats across all targeted campaigns
            all_test_cases = TestCase.objects.filter(campaign__in=campaigns)
            total_executed = all_test_cases.filter(status__in=['PASSED', 'FAILED']).count()

            for camp in campaigns:
                # 1. Tests counts
                c_test_cases = all_test_cases.filter(campaign=camp)
                
                c_db_total = c_test_cases.count()
                c_db_passed = c_test_cases.filter(status='PASSED').count()
                c_db_failed = c_test_cases.filter(status='FAILED').count()
                
                c_total = camp.nb_test_cases if camp.nb_test_cases and camp.nb_test_cases > 0 else c_db_total
                total_tests += c_total
                passed_tests += c_db_passed
                failed_tests += c_db_failed
                
                # 2. ML status (worst-case for project)
                try:
                    c_ml = self.ml_guard.get_campaign_status(camp.id)
                    c_status = c_ml.get('status', 'INITIAL')
                    
                    # Order of severity: CRITICAL > WARNING > INITIAL/WAITING > OPTIMAL
                    if c_status == 'CRITICAL' or worst_ml_status == 'INITIAL':
                        worst_ml_status = 'CRITICAL'
                    elif c_status == 'WARNING' and worst_ml_status not in ['CRITICAL']:
                        worst_ml_status = 'WARNING'
                    elif c_status in ['INITIAL', 'WAITING'] and worst_ml_status not in ['CRITICAL', 'WARNING']:
                         worst_ml_status = 'WAITING'
                    elif c_status == 'OPTIMAL' and worst_ml_status not in ['CRITICAL', 'WARNING', 'WAITING']:
                        worst_ml_status = 'OPTIMAL'
                    
                    highest_delay = max(highest_delay, c_ml.get('delay_days', 0))
                    highest_confidence = max(highest_confidence, c_ml.get('confidence_score', 0))
                except Exception:
                    # Fallback if ML service fails for one campaign
                    if worst_ml_status == 'INITIAL':
                        worst_ml_status = 'WARNING'

            if total_tests == 0:
                return {
                    "score": 0,
                    "breakdown": {
                        "test_pass_rate": 0,
                        "anomaly_penalty": 0,
                        "ml_confidence": 0,
                        "critical_coverage": 0
                    },
                    "reasons": ["Aucun cas de test défini."],
                    "ml_details": {}
                }

            # 1. Test Pass Rate (40%)
            pass_rate_score = (passed_tests / total_tests) * 40 if total_tests > 0 else 0
            
            # 2. ML Stability (30%)
            ml_stability_score = 0
            if total_executed > 0:
                if worst_ml_status == 'OPTIMAL':
                    ml_stability_score = 30
                elif worst_ml_status == 'WARNING':
                    ml_stability_score = 20
                elif worst_ml_status in ['WAITING', 'INITIAL']:
                    ml_stability_score = 10
                elif worst_ml_status == 'CRITICAL':
                    ml_stability_score = 0
            
            # 3. Existing Anomalies (20%) - General health
            open_anomalies = Anomalie.objects.filter(test_case__campaign__in=campaigns).exclude(statut='RESOLUE')
            penalty = 0
            blocking_count = open_anomalies.filter(impact='BLOQUANTES').count()
            
            for anomaly in open_anomalies:
                if anomaly.impact == 'BLOQUANTES':
                    penalty += 30 # Heavy penalty
                elif anomaly.impact == 'CRITIQUE':
                    penalty += 15
                elif anomaly.impact in ['MAJEUR', 'MINEURS']:
                    penalty += 5
                else:
                    penalty += 2
            
            if total_executed > 0:
                anomaly_score = max(0, 20 - (penalty / 2)) # Scaled penalty for the 20% pillar
            else:
                anomaly_score = 0
            
            # 4. Blocking Anomaly Guard (10%) - Binary safety
            blocking_score = 10 if (total_executed > 0 and blocking_count == 0) else 0

            # Global score calculation
            total_score = round(pass_rate_score + ml_stability_score + anomaly_score + blocking_score)
            
            # Reasons for transparency
            reasons = []
            if total_executed == 0:
                reasons.append("La campagne n'a pas encore démarré (0 exécutions).")

            if pass_rate_score < 30 and total_executed > 0:
                reasons.append(f"Taux de réussite insuffisant ({passed_tests}/{total_tests}).")
            
            if blocking_count > 0:
                reasons.append(f"ALERTE : {blocking_count} anomalie(s) BLOQUANTE(S) détectée(s).")
            
            if penalty > 0 and blocking_count == 0:
                critique_count = open_anomalies.filter(impact='CRITIQUE').count()
                if critique_count > 0:
                    reasons.append(f"{critique_count} anomalie(s) critique(s) impactent la stabilité.")
                else:
                    reasons.append("Anomalies mineures détectées (impact modéré sur le score).")
            
            if worst_ml_status == 'CRITICAL':
                reasons.append(f"Prédiction : Retard critique ({highest_delay} jours prévus).")
            elif worst_ml_status == 'WARNING':
                reasons.append("Prédiction : Risque de retard modéré sur les objectifs.")

            return {
                "score": total_score,
                "breakdown": {
                    "test_pass_rate": round(pass_rate_score, 1),
                    "ml_stability": round(ml_stability_score, 1),
                    "anomalies_health": round(anomaly_score, 1),
                    "blocking_guard": round(blocking_score, 1)
                },
                "source_data": {
                    "project_id": project_id,
                    "campaign_id": campaigns[0].id if campaigns else None,
                    "campaign_count": len(campaigns),
                    "tests": {
                        "passed": passed_tests,
                        "failed": failed_tests,
                        "total": total_tests,
                        "percent": round((passed_tests / total_tests) * 100 if total_tests > 0 else 0, 1)
                    },
                    "anomalies": {
                        "total": open_anomalies.count(),
                        "critical": open_anomalies.filter(impact='CRITIQUE').count(),
                        "blocking": blocking_count,
                        "penalty": round(penalty, 1)
                    },
                    "ml": {
                        "status": worst_ml_status,
                        "delay_days": highest_delay,
                        "confidence": highest_confidence
                    }
                },
                "reasons": reasons
            }

        except Campaign.DoesNotExist:
            return {"error": "Campagne introuvable"}
        except Exception as e:
            return {"error": str(e)}
