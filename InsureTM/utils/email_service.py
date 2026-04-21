"""
InsureTM - Centralized Email Notification Service
Sends professional SMTP emails for platform events.
"""
import logging
from django.core.mail import send_mail
from django.conf import settings

logger = logging.getLogger(__name__)


# Set to True to allow outgoing emails
EMAILS_ENABLED = True


def _send(subject: str, message: str, recipient_email: str):
    """Low-level helper — logs failures silently."""
    if not EMAILS_ENABLED:
        logger.info("[EMAILS BLOCKED] Attempted to send email to %s: %s", recipient_email, subject)
        return

    if not recipient_email:
        logger.warning("Attempted to send email but recipient_email is empty.")
        return
    try:
        send_mail(
            subject=subject,
            message=message,
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[recipient_email],
            fail_silently=False,
        )
    except Exception as e:
        logger.error("Failed to send email to %s: %s", recipient_email, str(e))


# ---------------------------------------------------------------------------
# Campaign Assignment
# ---------------------------------------------------------------------------
def send_campaign_assignment_email(tester, campaign):
    subject = f"[InsureTM] Nouvelle campagne assignée : {campaign.title}"
    message = f"""Bonjour {tester.first_name or tester.username},

Vous avez été assigné(e) à la campagne de tests suivante :

  Campagne   : {campaign.title}
  Échéance   : {campaign.estimated_end_date.strftime('%d/%m/%Y') if campaign.estimated_end_date else 'Non définie'}

Connectez-vous à la plateforme InsureTM pour consulter vos cas de test assignés.

Cordialement,
L'équipe InsureTM
"""
    _send(subject, message, tester.email)


# ---------------------------------------------------------------------------
# Anomaly Reported
# ---------------------------------------------------------------------------
def send_anomaly_reported_email(recipient, reporter, anomalie, test_case):
    subject = f"[InsureTM] Anomalie signalée sur {test_case.test_case_ref} ({anomalie.impact})"
    message = f"""Bonjour {recipient.first_name or recipient.username},

Une nouvelle anomalie vient d'être signalée sur votre campagne.

  Titre      : {anomalie.titre}
  Impact     : {anomalie.impact}
  Cas de test: {test_case.test_case_ref}
  Signalée par : {reporter.get_full_name() or reporter.username}
  Date       : {anomalie.cree_le.strftime('%d/%m/%Y à %H:%M') if anomalie.cree_le else '—'}

Description :
{anomalie.description or '—'}

Connectez-vous à InsureTM pour traiter cette anomalie.

Cordialement,
L'équipe InsureTM
"""
    _send(subject, message, recipient.email)


# ---------------------------------------------------------------------------
# Comment Posted
# ---------------------------------------------------------------------------
def send_comment_posted_email(recipient, author, comment, test_case):
    subject = f"[InsureTM] Nouveau commentaire sur {test_case.test_case_ref}"
    message = f"""Bonjour {recipient.first_name or recipient.username},

Un commentaire vient d'être ajouté sur le cas de test {test_case.test_case_ref}.

  Auteur     : {author.get_full_name() or author.username}
  Cas de test: {test_case.test_case_ref}
  Campagne   : {test_case.campaign.title if test_case.campaign else '—'}

Message :
{comment.message}

Connectez-vous à InsureTM pour répondre ou consulter le fil de discussion.

Cordialement,
L'équipe InsureTM
"""
    _send(subject, message, recipient.email)


# ---------------------------------------------------------------------------
# Execution Validated
# ---------------------------------------------------------------------------
def send_execution_validated_email(recipient, tester, test_case):
    status_label = "✅ SUCCÈS" if test_case.status == 'PASSED' else "❌ ÉCHEC"
    subject = f"[InsureTM] Résultat de test : {test_case.test_case_ref} ({test_case.status})"
    message = f"""Bonjour {recipient.first_name or recipient.username},

Un test vient d'être exécuté sur votre campagne.

  Cas de test: {test_case.test_case_ref}
  Résultat   : {status_label}
  Testeur    : {tester.get_full_name() or tester.username}
  Campagne   : {test_case.campaign.title if test_case.campaign else '—'}

Connectez-vous à InsureTM pour voir les détails de l'exécution.

Cordialement,
L'équipe InsureTM
"""
    _send(subject, message, recipient.email)


# ---------------------------------------------------------------------------
# Campaign Created (notify ADMINs / MANAGERs)
# ---------------------------------------------------------------------------
def send_campaign_created_email(recipient, creator, campaign):
    subject = f"[InsureTM] Nouvelle campagne créée : {campaign.title}"
    message = f"""Bonjour {recipient.first_name or recipient.username},

Une nouvelle campagne de tests vient d'être créée sur InsureTM.

  Campagne   : {campaign.title}
  Créée par  : {creator.get_full_name() or creator.username}
  Échéance   : {campaign.estimated_end_date.strftime('%d/%m/%Y') if campaign.estimated_end_date else 'Non définie'}

Connectez-vous à InsureTM pour consulter et gérer cette campagne.

Cordialement,
L'équipe InsureTM
"""
    _send(subject, message, recipient.email)


# ---------------------------------------------------------------------------
# Account Created (welcome email to the new user)
# ---------------------------------------------------------------------------
def send_account_created_email(new_user, raw_password=None):
    subject = "[InsureTM] Bienvenue — Votre compte a été créé"
    pwd_line = f"  Mot de passe temporaire : {raw_password}" if raw_password else "  Mot de passe : (fourni par votre administrateur)"
    message = f"""Bonjour {new_user.first_name or new_user.username},

Bienvenue sur InsureTM ! Votre compte a été créé avec succès.

  Nom d'utilisateur : {new_user.username}
  Rôle              : {new_user.role}
{pwd_line}

Veuillez vous connecter à la plateforme et changer votre mot de passe dès que possible.

Cordialement,
L'équipe InsureTM
"""
    _send(subject, message, new_user.email)


# ---------------------------------------------------------------------------
# Anomaly Updated
# ---------------------------------------------------------------------------
def send_anomaly_updated_email(recipient, updater, anomalie):
    subject = f"[InsureTM] Mise à jour anomalie #{anomalie.id} : {anomalie.statut}"
    message = f"""Bonjour {recipient.first_name or recipient.username},

L'anomalie suivante a été mise à jour par {updater.username} :

  ID         : #{anomalie.id}
  Titre      : {anomalie.titre}
  Nouveau Statut : {anomalie.statut}
  Impact     : {anomalie.impact}

Connectez-vous à InsureTM pour consulter les détails ou le fil de discussion.

Cordialement,
L'équipe InsureTM
"""
    _send(subject, message, recipient.email)


# ---------------------------------------------------------------------------
# 2FA OTP
# ---------------------------------------------------------------------------
def send_otp_email(user, otp):
    subject = f"[InsureTM] Votre code de sécurité : {otp}"
    message = f"""Bonjour {user.first_name or user.username},

Pour finaliser votre connexion à InsureTM, veuillez saisir le code de sécurité suivant :

  Code : {otp}

Ce code expirera dans 5 minutes. Si vous n'êtes pas à l'origine de cette demande, veuillez ignorer cet email.

Cordialement,
L'équipe InsureTM
"""
    _send(subject, message, user.email)
    
# ---------------------------------------------------------------------------
# Password Reset
# ---------------------------------------------------------------------------
def send_password_reset_email(user, new_password):
    subject = "[InsureTM] Votre nouveau mot de passe"
    message = f"""Bonjour {user.first_name or user.username},

À votre demande, un nouveau mot de passe a été généré pour votre compte InsureTM.

  Identifiant : {user.username}
  Nouveau mot de passe de sécurité : {new_password}

Veuillez vous connecter avec ce nouveau mot de passe et le changer immédiatement dans vos paramètres.

Cordialement,
L'équipe InsureTM
"""
    _send(subject, message, user.email)
