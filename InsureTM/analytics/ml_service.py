from django.utils import timezone
from datetime import timedelta
from campaigns.models import Campaign
from testCases.models import TestCase
import math
import joblib
import os
import pandas as pd


def invalidate_campaign_timeline_cache(campaign_id):
    """Invalidate cached timeline guard / AI insight after campaign metadata changes."""
    from django.core.cache import cache
    for suffix in ('insight', 'fast'):
        cache.delete(f"campaign_status_{campaign_id}_{suffix}")
        cache.delete(f"campaign_status_v2_{campaign_id}_{suffix}")
        cache.delete(f"campaign_status_v3_{campaign_id}_{suffix}")


class MLTimelineGuard:
    _cached_model = None
    _cached_model_path = None

    def __init__(self):
        from .groq_service import GroqService
        self.groq_service = GroqService()
        # Chemin vers le modèle entraîné dans le dossier research
        self.model_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'research', 'timeline_model.joblib')
        
        if MLTimelineGuard._cached_model_path != self.model_path:
            MLTimelineGuard._cached_model = None
            MLTimelineGuard._cached_model_path = self.model_path

        if MLTimelineGuard._cached_model is None and os.path.exists(self.model_path):
            try:
                MLTimelineGuard._cached_model = joblib.load(self.model_path)
            except Exception as e:
                print(f"Erreur chargement modèle ML: {e}")
        
        self.model = MLTimelineGuard._cached_model

    def _compute_effective_velocity(self, executed_tests, first_exec_date, today):
        """
        Estime le rythme actuel en privilégiant les fenêtres récentes
        (détecte l'accélération du testeur).
        """
        finished_count = executed_tests.count()
        days_since_first = max(1, (today - first_exec_date).days)
        velocity_overall = finished_count / days_since_first

        now = timezone.now()
        recent_7d = executed_tests.filter(execution_date__gte=now - timedelta(days=7)).count()
        days_7d = max(1, min(7, days_since_first + 1))
        velocity_7d = recent_7d / days_7d

        recent_3d = executed_tests.filter(execution_date__gte=now - timedelta(days=3)).count()
        days_3d = max(1, min(3, days_since_first + 1))
        velocity_3d = recent_3d / days_3d if recent_3d > 0 else 0

        today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
        today_finished = executed_tests.filter(execution_date__gte=today_start).count()

        return max(velocity_overall, velocity_7d, velocity_3d, float(today_finished))

    def _project_completion(self, remaining_cases, velocity):
        """Projection linéaire : Dl = ceil(cas restants / vélocité effective)."""
        if remaining_cases <= 0:
            return 0
        if velocity <= 0:
            return None
        return max(0, math.ceil(remaining_cases / velocity))

    def _predict_ml_days(self, total_cases, finished_count, days_elapsed):
        """
        Prédiction Random Forest (Dml) — mêmes features que research/train_model.py.
        Retourne None si le modèle .joblib est absent ou en cas d'erreur.
        """
        if not self.model or finished_count >= total_cases:
            return None
        remaining = total_cases - finished_count
        if remaining <= 0:
            return 0
        simple_velocity = finished_count / max(1, days_elapsed)
        try:
            features = pd.DataFrame([{
                'total_cases': int(total_cases),
                'finished_cases': int(finished_count),
                'days_elapsed': int(max(1, days_elapsed)),
                'velocity': float(max(simple_velocity, 0.1)),
            }])
            raw = float(self.model.predict(features)[0])
            return max(0, math.ceil(raw))
        except Exception as e:
            print(f"Erreur prédiction Random Forest: {e}")
            return None

    def _combine_projections(self, linear_days, ml_days):
        """Garde-fou documenté : Dp = min(Dml, Dl) quand les deux existent."""
        if linear_days is None and ml_days is None:
            return None
        if linear_days is None:
            return ml_days
        if ml_days is None:
            return linear_days
        return min(ml_days, linear_days)

    def get_campaign_status(self, campaign_id, generate_insight=True):
        from django.core.cache import cache
        cache_key = f"campaign_status_v3_{campaign_id}_{'insight' if generate_insight else 'fast'}"
        cached = cache.get(cache_key)
        if cached:
            return cached
        try:
            campaign = Campaign.objects.get(id=campaign_id)
            db_total = TestCase.objects.filter(campaign=campaign).count()
            total_cases = max(campaign.nb_test_cases or 0, db_total)
            
            # 1. Calculer les tests terminés (exclure PENDING)
            executed_tests = TestCase.objects.filter(
                campaign=campaign
            ).exclude(status='PENDING')
            
            finished_count = executed_tests.count()

            # 2. Dates effectives — la cadence se calcule depuis la 1ère exécution,
            # pas depuis le start_date (sinon un démarrage tardif fausse tout en « EN RETARD »).
            start_date = campaign.start_date
            if not start_date:
                start_date = campaign.created_at.date()

            first_execution = executed_tests.order_by('execution_date').first()
            today = timezone.now().date()
            if first_execution and first_execution.execution_date:
                first_exec_date = first_execution.execution_date.date()
                days_elapsed = max(1, (today - first_exec_date).days)
                velocity = self._compute_effective_velocity(
                    executed_tests, first_exec_date, today
                )
            else:
                days_elapsed = max(1, (today - start_date).days)
                velocity = 0

            remaining_cases = total_cases - finished_count
            linear_days = None
            ml_days = None

            # 3. Projection de fin — Dp = min(Dml Random Forest, Dl linéaire)
            if finished_count >= total_cases and total_cases > 0:
                days_needed = 0
                risk_status = "OPTIMAL"
                projected_end_date = today
            elif velocity > 0:
                linear_days = self._project_completion(remaining_cases, velocity)
                ml_days = self._predict_ml_days(total_cases, finished_count, days_elapsed)
                days_needed = self._combine_projections(linear_days, ml_days)
                if days_needed is None:
                    if total_cases == 0:
                        return self._format_response("INITIAL", 0, None, 0, 0, "Aucun test défini.")
                    status = "WAITING" if days_elapsed <= 1 else "WARNING"
                    return self._format_response(
                        status, 0, None, 0, 0,
                        "En attente d'exécution." if status == "WAITING"
                        else "La campagne a débuté mais aucun test n'a été validé."
                    )
                projected_end_date = today + timedelta(days=days_needed)
            else:
                if total_cases == 0:
                    return self._format_response("INITIAL", 0, None, 0, 0, "Aucun test défini.")
                status = "WAITING" if days_elapsed <= 1 else "WARNING"
                return self._format_response(
                    status, 0, None, 0, 0,
                    "En attente d'exécution." if status == "WAITING"
                    else "La campagne a débuté mais aucun test n'a été validé."
                )

            # 4. Avance / retard par rapport à la deadline
            advance_days = 0
            delay_days = 0
            risk_status = "OPTIMAL"
            if finished_count < total_cases and campaign.estimated_end_date:
                days_left = (campaign.estimated_end_date - today).days
                slack_days = (campaign.estimated_end_date - projected_end_date).days

                if days_left < 0:
                    delay_days = abs(days_left)
                    risk_status = "CRITICAL" if delay_days > 5 else "WARNING"
                elif velocity > 0 and remaining_cases > 0:
                    required_velocity = remaining_cases / max(1, days_left)
                    if slack_days > 0:
                        advance_days = slack_days
                        delay_days = 0
                        risk_status = "OPTIMAL"
                    elif slack_days == 0:
                        risk_status = "OPTIMAL"
                    else:
                        delay_days = abs(slack_days)
                        risk_status = "CRITICAL" if delay_days > 5 else "WARNING"
                else:
                    if slack_days >= 0:
                        advance_days = slack_days
                        risk_status = "OPTIMAL"
                    else:
                        delay_days = abs(slack_days)
                        risk_status = "CRITICAL" if delay_days > 5 else "WARNING"
            elif finished_count >= total_cases:
                risk_status = "OPTIMAL"
            
            # 5. Insight IA (Groq)
            if generate_insight:
                failed_count = executed_tests.filter(status='FAILED').count()
                ai_message = self._generate_ai_insight(
                    campaign.title,
                    finished_count,
                    total_cases,
                    velocity,
                    projected_end_date,
                    campaign.estimated_end_date,
                    failed_count=failed_count,
                    advance_days=advance_days,
                    delay_days=delay_days,
                    risk_status=risk_status,
                )
            else:
                ai_message = "Analyse IA désactivée pour optimisation."

            result = self._format_response(
                risk_status,
                velocity,
                projected_end_date,
                delay_days,
                advance_days,
                ai_message,
                finished_count,
                total_cases,
                linear_days=linear_days,
                ml_days=ml_days,
            )
            # Cache fast (no insight) for 2 min, with insight for 5 min
            ttl = 300 if generate_insight else 120
            cache.set(cache_key, result, timeout=ttl)
            return result

        except Campaign.DoesNotExist:
            return {"error": "Campagne introuvable"}
        except Exception as e:
            return {"error": str(e)}

    def _format_velocity(self, velocity):
        """Affichage cadence : entier arrondi (pas de 0,5 test/jour)."""
        return max(0, int(round(velocity)))

    def _format_response(
        self, status, velocity, end_date, delay, advance, message,
        finished=0, total=0, linear_days=None, ml_days=None,
    ):
        display_velocity = self._format_velocity(velocity)

        payload = {
            "status": status,
            "velocity": display_velocity,
            "projected_end_date": end_date.isoformat() if end_date else None,
            "delay_days": max(0, delay),
            "advance_days": max(0, advance),
            "message": message,
            "progress": {
                "finished": finished,
                "total": total,
                "percentage": round((finished / total * 100), 1) if total > 0 else 0
            },
        }
        if linear_days is not None or ml_days is not None:
            combined = self._combine_projections(linear_days, ml_days)
            payload["projection"] = {
                "linear_days": linear_days,
                "ml_days": ml_days,
                "combined_days": combined,
                "model_used": self.model is not None and ml_days is not None,
            }
        return payload

    def score_tester(self, tester_id, campaign_id=None):
        """
        ML scoring system for testers fitness & availability.
        Calculates a score from 0-100 based on behavioral and logistical features.
        """
        from django.core.cache import cache
        cache_key = f"ml_score_tester_{tester_id}"
        cached = cache.get(cache_key)
        if cached:
            return cached

        try:
            from testCases.models import TestCase
            from django.contrib.auth import get_user_model
            User = get_user_model()
            tester = User.objects.get(id=tester_id)
            
            # 1. Indice de Productivité (Volume Historique - Weight 25%)
            # On valorise l'expérience accumulée sur la plateforme (excluant PENDING)
            all_tests = TestCase.objects.filter(tester=tester).exclude(status='PENDING')
            total_history = all_tests.count()
            
            if total_history == 0: 
                return {
                    "score": 40.0,
                    "metrics": {"productivity": 0, "constancy": 0, "availability": 100},
                    "label": "NEW_TALENT"
                }

            productivity_score = min(100, (total_history / 500.0) * 100) # Maxé à 500 tests
            
            # 2. Indice de Constance (Stabilité - Weight 25%)
            # Travail sur les 14 derniers jours
            last_14_days = timezone.now() - timedelta(days=14)
            active_days = all_tests.filter(execution_date__gte=last_14_days).dates('execution_date', 'day').count()
            constancy_score = (active_days / 14.0) * 100
            
            # 3. Indice de Charge (Disponibilité Temps Réel - Weight 50%)
            # On regarde les tests PENDING actuellement assignés (toutes campagnes confondues)
            pending_load = TestCase.objects.filter(tester=tester, status='PENDING').count()
            # Malus : 100% de dispo si 0 pending, 0% si 50+ pending
            availability_score = max(0, 100 - (pending_load * 2))
            
            # Final ML score (Weighted Average - Configured as requested)
            # 25% Productivity / 25% Constancy / 50% Availability
            final_score = (productivity_score * 0.25) + (constancy_score * 0.25) + (availability_score * 0.50)
            
            result = {
                "score": round(final_score, 1),
                "metrics": {
                    "productivity": round(productivity_score, 1),
                    "constancy": round(constancy_score, 1),
                    "availability": round(availability_score, 1),
                    "pending_tasks": pending_load
                },
                "label": "ELITE" if final_score > 80 else "STABLE" if final_score > 40 else "OVERLOADED" if availability_score < 30 else "TRAINEE"
            }
            cache.set(cache_key, result, timeout=300)
            return result
        except Exception:
            return {"score": 50, "metrics": {}, "label": "NEUTRAL"}

    def _generate_ai_insight(
        self,
        title,
        finished,
        total,
        velocity,
        projected,
        target,
        failed_count=0,
        advance_days=0,
        delay_days=0,
        risk_status="OPTIMAL",
    ):
        if finished >= total and total > 0:
            if failed_count > 0:
                return "Tous les cas de tests ont été exécutés, mais des anomalies ont été détectées. Les corrections doivent être validées."
            return "Objectif atteint ! Tous les cas de tests ont été validés avec succès. La campagne est terminée."

        projected_label = projected.strftime('%d/%m/%Y') if projected else '—'
        target_label = target.strftime('%d/%m/%Y') if target else '—'
        cadence = self._format_velocity(velocity)

        if risk_status == "OPTIMAL" and advance_days > 0:
            return (
                f"La campagne « {title} » est en avance de {advance_days} jour(s) sur l'échéance "
                f"({target_label}). Avec {finished}/{total} tests exécutés et une cadence de "
                f"{cadence} test(s)/jour, la fin est estimée au {projected_label}. "
                f"Maintenez ce rythme pour conserver l'avance."
            )

        if risk_status == "OPTIMAL":
            return (
                f"La campagne « {title} » progresse normalement ({finished}/{total} tests, "
                f"{cadence} test(s)/jour). Fin estimée au {projected_label}, "
                f"dans les délais prévus ({target_label})."
            )

        if velocity <= 0 or risk_status == "WAITING":
            return (
                f"La campagne « {title} » a démarré mais aucun test n'a encore été exécuté. "
                f"Lancez les premières exécutions pour activer le suivi prédictif."
            )

        prompt = f"""
        Expert QA Platform Analyser.
        Campaign: {title}
        Progress: {finished}/{total}
        Velocity: {cadence} tests/day
        Projected End: {projected_label}
        Deadline: {target_label}
        Risk status: {risk_status}
        Days ahead of deadline: {advance_days}
        Days behind schedule: {delay_days}
        Failed tests: {failed_count}

        Provide a very short professional advice (max 2 sentences) in French.
        If days ahead of deadline > 0, acknowledge the positive trajectory and do NOT urge acceleration.
        If days behind schedule > 0, recommend concrete actions to catch up.
        """
        try:
            completion = self.groq_service.client.chat.completions.create(
                messages=[{"role": "user", "content": prompt}],
                model="llama-3.3-70b-versatile",
                temperature=0.5,
            )
            return completion.choices[0].message.content.strip()
        except Exception:
            if delay_days > 0:
                return (
                    f"Retard estimé de {delay_days} jour(s) sur l'échéance ({target_label}). "
                    f"Accélérez les exécutions ou réallouez les testeurs pour rattraper le planning."
                )
            return "Analyse IA temporairement indisponible."
