from django.utils import timezone
from datetime import timedelta
from campaigns.models import Campaign
from testCases.models import TestCase
from testCases.models import TestCase
import math
import joblib
import os
import pandas as pd

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

    def get_campaign_status(self, campaign_id, generate_insight=True):
        try:
            campaign = Campaign.objects.get(id=campaign_id)
            db_total = TestCase.objects.filter(campaign=campaign).count()
            total_cases = max(campaign.nb_test_cases or 0, db_total)
            
            # 1. Calculer les tests terminés (exclure PENDING)
            executed_tests = TestCase.objects.filter(
                campaign=campaign
            ).exclude(status='PENDING')
            
            finished_count = executed_tests.count()
            
            # 2. Préparation des Features pour le modèle
            start_date = campaign.start_date
            if not start_date and executed_tests.exists():
                start_date = executed_tests.order_by('execution_date').first().execution_date.date()
            
            if not start_date:
                start_date = campaign.created_at.date()

            days_elapsed = (timezone.now().date() - start_date).days
            if days_elapsed <= 0:
                days_elapsed = 1

            velocity = finished_count / days_elapsed
            
            # 3. Inférence (Modèle ML local)
            if finished_count >= total_cases and total_cases > 0:
                # Cas où la campagne est terminée
                days_needed = 0
                risk_status = "OPTIMAL"
            elif self.model and velocity > 0:
                # Création du DataFrame pour l'inférence
                input_df = pd.DataFrame([{
                    'total_cases': total_cases,
                    'finished_cases': finished_count,
                    'days_elapsed': days_elapsed,
                    'velocity': velocity
                }])
                # Le modèle prédit les jours restants
                days_needed = math.ceil(self.model.predict(input_df)[0])
                # Sécurité : si on est proche de la fin, le calcul linéaire est parfois plus précis
                remaining_cases = total_cases - finished_count
                linear_days = math.ceil(remaining_cases / velocity)
                # On prend le min pour éviter les prédictions trop pessimistes du modèle sur les petites données C'est une sécurité
                days_needed = min(days_needed, linear_days)
            else:
                # Fallback sur calcul linéaire si pas de modèle ou pas de données
                remaining_cases = total_cases - finished_count
                if velocity == 0:
                    if total_cases == 0:
                         return self._format_response("INITIAL", 0, None, 0, "Aucun test défini.")
                    # Si on a déjà commencé (days_elapsed > 1) mais 0 tests -> c'est un risque
                    status = "WAITING" if days_elapsed <= 1 else "WARNING"
                    return self._format_response(status, 0, None, 0, "En attente d'exécution." if status == "WAITING" else "La campagne a débuté mais aucun test n'a été validé.")
                days_needed = math.ceil(remaining_cases / velocity)

            projected_end_date = timezone.now().date() + timedelta(days=days_needed)
            
            # 4. Analyse de risque (si pas déjà mise à OPTIMAL par le check terminé)
            if finished_count < total_cases:
                delay_days = 0
                risk_status = "OPTIMAL"
                
                if campaign.estimated_end_date:
                    delay_days = (projected_end_date - campaign.estimated_end_date).days
                    if delay_days > 5:
                        risk_status = "CRITICAL"
                    elif delay_days > 0:
                        risk_status = "WARNING"
            else:
                delay_days = 0
                risk_status = "OPTIMAL"
            
            # 5. Insight IA (Groq)
            if generate_insight:
                ai_message = self._generate_ai_insight(
                    campaign.title, 
                    finished_count, 
                    total_cases, 
                    velocity, 
                    projected_end_date,
                    campaign.estimated_end_date
                )
            else:
                ai_message = "Analyse IA désactivée pour optimisation."

            return self._format_response(
                risk_status, 
                velocity, 
                projected_end_date, 
                delay_days, 
                ai_message,
                finished_count,
                total_cases
            )

        except Campaign.DoesNotExist:
            return {"error": "Campagne introuvable"}
        except Exception as e:
            return {"error": str(e)}

    def _format_response(self, status, velocity, end_date, delay, message, finished=0, total=0):
        return {
            "status": status,
            "velocity": math.ceil(velocity),
            "projected_end_date": end_date.isoformat() if end_date else None,
            "delay_days": max(0, delay),
            "message": message,
            "progress": {
                "finished": finished,
                "total": total,
                "percentage": round((finished / total * 100), 1) if total > 0 else 0
            }
        }

    def score_tester(self, tester_id, campaign_id=None):
        """
        ML scoring system for testers fitness & availability.
        Calculates a score from 0-100 based on behavioral and logistical features.
        """
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
            
            return {
                "score": round(final_score, 1),
                "metrics": {
                    "productivity": round(productivity_score, 1),
                    "constancy": round(constancy_score, 1),
                    "availability": round(availability_score, 1),
                    "pending_tasks": pending_load
                },
                "label": "ELITE" if final_score > 80 else "STABLE" if final_score > 40 else "OVERLOADED" if availability_score < 30 else "TRAINEE"
            }
        except Exception:
            return {"score": 50, "metrics": {}, "label": "NEUTRAL"}

    def _generate_ai_insight(self, title, finished, total, velocity, projected, target):
        if finished >= total and total > 0:
            return "Objectif atteint ! Tous les cas de tests ont été validés avec succès. La campagne est terminée."

        prompt = f"""
        Expert QA Platform Analyser.
        Campaign: {title}
        Progress: {finished}/{total}
        Velocity: {velocity:.2f} tests/day
        ML Projected End: {projected}
        Deadline: {target}
        
        Provide a very short professional advice (max 2 sentences) in French.
        """
        try:
            completion = self.groq_service.client.chat.completions.create(
                messages=[{"role": "user", "content": prompt}],
                model="llama-3.3-70b-versatile",
                temperature=0.5,
            )
            return completion.choices[0].message.content.strip()
        except:
            return "Analyse IA temporairement indisponible."
