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
            if project_id:
                campaign = Campaign.objects.filter(project_id=project_id).order_by('-created_at').first()
                if not campaign:
                    return {"score": 0, "reasons": ["Aucune campagne trouvée pour ce projet."], "breakdown": {}}
            else:
                campaign = Campaign.objects.get(id=campaign_id)
            
            campaign_id = campaign.id
            test_cases = TestCase.objects.filter(campaign=campaign)
            total_tests = test_cases.count()
            
            if total_tests == 0:
                return {
                    "score": 0,
                    "breakdown": {
                        "test_pass_rate": 0,
                        "anomaly_penalty": 0,
                        "ml_confidence": 0,
                        "critical_coverage": 0
                    },
                    "reasons": ["Aucun cas de test défini pour cette campagne."],
                    "ml_details": {}
                }

            # 1. Test Pass Rate (40%)
            passed_tests = test_cases.filter(status='PASSED').count()
            pass_rate_score = (passed_tests / total_tests) * 40
            
            # 2. Anomaly Penalty (30%)
            # We start with 30 and subtract based on open anomalies
            open_anomalies = Anomalie.objects.filter(test_case__campaign=campaign).exclude(statut='RESOLUE')
            penalty = 0
            for anomaly in open_anomalies:
                if anomaly.criticite == 'CRITIQUE':
                    penalty += 15
                elif anomaly.criticite == 'MOYENNE':
                    penalty += 5
                else: # FAIBLE
                    penalty += 2
            
            anomaly_score = max(0, 30 - penalty)
            
            # 3. ML Confidence (20%)
            ml_status = self.ml_guard.get_campaign_status(campaign_id)
            ml_confidence_score = 0
            risk_status = ml_status.get('status', 'INITIAL')
            
            if risk_status == 'OPTIMAL':
                ml_confidence_score = 20
            elif risk_status == 'WARNING':
                ml_confidence_score = 10
            elif risk_status == 'CRITICAL':
                ml_confidence_score = 0
            
            # 4. Critical Module Coverage (10%)
            # Identify critical keywords
            critical_keywords = ['paiement', 'contrat', 'sinistre', 'auth', 'login', 'paiements', 'contrats', 'sinistres', 'billing', 'payment']
            critical_tests = []
            
            # Convert to list to avoid multiple queries if possible, or use a complex filter
            # For simplicity and robustness with small datasets, we'll iterate
            for tc in test_cases:
                ref = tc.test_case_ref.lower()
                # Safely get data_json content
                data_str = str(tc.data_json).lower() if tc.data_json else ""
                if any(kw in ref or kw in data_str for kw in critical_keywords):
                    critical_tests.append(tc)
            
            if not critical_tests:
                # If no critical modules identified, we give the benefit of the doubt or standard score
                coverage_score = 10
            else:
                passed_critical = len([tc for tc in critical_tests if tc.status == 'PASSED'])
                coverage_score = (passed_critical / len(critical_tests)) * 10

            total_score = round(pass_rate_score + anomaly_score + ml_confidence_score + coverage_score)
            
            # Reasons for the score
            reasons = []
            if pass_rate_score < 30:
                reasons.append(f"Taux de réussite des tests insuffisant ({passed_tests}/{total_tests}).")
            
            if penalty > 0:
                critique_count = open_anomalies.filter(criticite='CRITIQUE').count()
                if critique_count > 0:
                    reasons.append(f"{critique_count} anomalie(s) critique(s) non résolue(s).")
                else:
                    reasons.append(f"Présence d'anomalies en cours de résolution.")
            
            if risk_status == 'CRITICAL':
                reasons.append(f"Risque de retard important prédit par le ML ({ml_status.get('delay_days', 0)} jours de retard).")
            elif risk_status == 'WARNING':
                reasons.append("Léger retard prévu sur la completion de la campagne.")
                
            if coverage_score < 7 and critical_tests:
                 reasons.append(f"La couverture des modules critiques ({', '.join(critical_keywords[:3])}...) est incomplète.")

            return {
                "score": total_score,
                "breakdown": {
                    "test_pass_rate": round(pass_rate_score, 1),
                    "anomaly_penalty": round(anomaly_score, 1),
                    "ml_confidence": round(ml_confidence_score, 1),
                    "critical_coverage": round(coverage_score, 1)
                },
                "source_data": {
                    "campaign_id": campaign.id,
                    "tests": {
                        "passed": passed_tests,
                        "total": total_tests,
                        "percent": round((passed_tests / total_tests) * 100 if total_tests > 0 else 0, 1)
                    },
                    "anomalies": {
                        "total": open_anomalies.count(),
                        "critical": open_anomalies.filter(criticite='CRITIQUE').count(),
                        "penalty": round(penalty, 1)
                    },
                    "ml": {
                        "status": risk_status,
                        "delay_days": ml_status.get('delay_days', 0),
                        "confidence": ml_status.get('confidence_score', 0)
                    },
                    "critical_coverage": {
                        "count": len(critical_tests),
                        "passed": len([tc for tc in critical_tests if tc.status == 'PASSED']) if critical_tests else 0
                    }
                },
                "reasons": reasons,
                "ml_details": ml_status
            }

        except Campaign.DoesNotExist:
            return {"error": "Campagne introuvable"}
        except Exception as e:
            return {"error": str(e)}
