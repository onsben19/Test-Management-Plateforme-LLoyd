
import logging
from django.core.mail import EmailMultiAlternatives
from django.conf import settings

logger = logging.getLogger(__name__)

# Set to True to allow outgoing emails
EMAILS_ENABLED = True


def _base_html(title: str, badge: str, badge_color: str, content_html: str) -> str:
    """Base InsureTM HTML email template."""
    return f"""<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background-color:#f8fafc;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;color:#1e293b;">
  <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color:#f8fafc;padding:40px 10px;">
    <tr><td align="center">
      <table border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width:600px;background-color:#ffffff;border:1px solid #e2e8f0;border-radius:12px;overflow:hidden;box-shadow:0 4px 6px -1px rgba(0,0,0,0.05);">

        <!-- Header -->
        <tr style="background-color:#0f172a;">
          <td style="padding:24px 40px;">
            <table width="100%"><tr>
              <td><span style="font-size:20px;font-weight:800;color:#ffffff;letter-spacing:-0.5px;">Insure<span style="color:#3b82f6;">TM</span></span></td>
              <td align="right"><span style="background-color:{badge_color};color:#ffffff;padding:4px 12px;border-radius:20px;font-size:11px;font-weight:700;text-transform:uppercase;">{badge}</span></td>
            </tr></table>
          </td>
        </tr>

        <!-- Body -->
        <tr><td style="padding:40px;">
          <h2 style="margin:0 0 24px 0;font-size:18px;font-weight:700;color:#0f172a;">{title}</h2>
          {content_html}
        </td></tr>

        <!-- Footer -->
        <tr><td style="padding:24px 40px;background-color:#f8fafc;border-top:1px solid #e2e8f0;text-align:center;">
          <p style="margin:0;font-size:12px;color:#94a3b8;line-height:1.5;">
            Notification automatique générée par <strong>InsureTM</strong>.<br>
            &copy; 2026 – Plateforme de gestion des tests logiciels.
          </p>
        </td></tr>

      </table>
    </td></tr>
  </table>
</body>
</html>"""


def _info_row(label: str, value: str) -> str:
    return f"""<tr>
      <td style="padding:8px 0;font-size:13px;font-weight:700;color:#64748b;width:40%;">{label}</td>
      <td style="padding:8px 0;font-size:13px;color:#1e293b;font-weight:500;">{value}</td>
    </tr>"""


def _send(subject: str, html_body: str, recipient_email: str):
    """Low-level helper — sends HTML email, logs failures silently."""
    if not EMAILS_ENABLED:
        logger.info("[EMAILS BLOCKED] Attempted to send email to %s: %s", recipient_email, subject)
        return
    if not recipient_email:
        logger.warning("Attempted to send email but recipient_email is empty.")
        return
    try:
        plain = "Veuillez consulter cet email dans un client supportant le HTML."
        msg = EmailMultiAlternatives(
            subject=subject,
            body=plain,
            from_email=settings.DEFAULT_FROM_EMAIL,
            to=[recipient_email],
        )
        msg.attach_alternative(html_body, "text/html")
        msg.send(fail_silently=False)
    except Exception as e:
        logger.error("Failed to send email to %s: %s", recipient_email, str(e))


# ---------------------------------------------------------------------------
# Campaign Assignment
# ---------------------------------------------------------------------------
def send_campaign_assignment_email(tester, campaign):
    subject = f"[InsureTM] Nouvelle campagne assignée : {campaign.title}"
    deadline = campaign.estimated_end_date.strftime('%d/%m/%Y') if campaign.estimated_end_date else 'Non définie'
    name = tester.first_name or tester.username
    content = f"""
    <p style="margin:0 0 20px 0;font-size:15px;line-height:1.6;color:#475569;">
        Bonjour <strong>{name}</strong>,<br><br>
        Vous avez été assigné(e) à une nouvelle campagne de tests. Connectez-vous à InsureTM pour consulter vos cas de test.
    </p>
    <div style="background-color:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:20px;margin-bottom:24px;">
        <table width="100%">
            {_info_row('Campagne', campaign.title)}
            {_info_row('Échéance', deadline)}
        </table>
    </div>
    <div style="background-color:#eff6ff;border:1px solid #bfdbfe;border-radius:8px;padding:16px;">
        <p style="margin:0;font-size:13px;color:#1e40af;">
            💡 Connectez-vous à la plateforme pour consulter vos cas de test assignés et commencer vos exécutions.
        </p>
    </div>"""
    html = _base_html("Nouvelle campagne assignée", "Tester", "#2563eb", content)
    _send(subject, html, tester.email)


# ---------------------------------------------------------------------------
# Anomaly Reported
# ---------------------------------------------------------------------------
def send_anomaly_reported_email(recipient, reporter, anomalie, test_case):
    impact_colors = {
        'CRITIQUE': '#dc2626', 'BLOQUANTES': '#dc2626',
        'MAJEUR': '#d97706', 'MINEURS': '#d97706',
    }
    impact_color = impact_colors.get(anomalie.impact, '#6b7280')
    date_str = anomalie.cree_le.strftime('%d/%m/%Y à %H:%M') if anomalie.cree_le else '—'
    name = recipient.first_name or recipient.username
    subject = f"[InsureTM] Anomalie signalée sur {test_case.test_case_ref} ({anomalie.impact})"
    content = f"""
    <p style="margin:0 0 20px 0;font-size:15px;line-height:1.6;color:#475569;">
        Bonjour <strong>{name}</strong>,<br><br>
        Une nouvelle anomalie a été signalée sur votre campagne. Veuillez en prendre connaissance dès que possible.
    </p>
    <div style="background-color:#fff7ed;border:1px solid #fed7aa;border-radius:8px;padding:20px;margin-bottom:24px;">
        <table width="100%">
            {_info_row('Titre', anomalie.titre)}
            {_info_row('Cas de test', test_case.test_case_ref)}
            {_info_row('Signalée par', reporter.get_full_name() or reporter.username)}
            {_info_row('Date', date_str)}
            {_info_row('Description', anomalie.description or '—')}
        </table>
    </div>
    <div style="text-align:center;margin-bottom:8px;">
        <span style="background-color:{impact_color};color:#ffffff;padding:6px 20px;border-radius:20px;font-size:12px;font-weight:700;text-transform:uppercase;">
            Impact : {anomalie.impact}
        </span>
    </div>"""
    html = _base_html("Anomalie signalée", "Alerte", "#dc2626", content)
    _send(subject, html, recipient.email)


# ---------------------------------------------------------------------------
# Comment Posted
# ---------------------------------------------------------------------------
def send_comment_posted_email(recipient, author, comment, test_case):
    subject = f"[InsureTM] Nouveau commentaire sur {test_case.test_case_ref}"
    name = recipient.first_name or recipient.username
    campaign_title = test_case.campaign.title if test_case.campaign else '—'
    content = f"""
    <p style="margin:0 0 20px 0;font-size:15px;line-height:1.6;color:#475569;">
        Bonjour <strong>{name}</strong>,<br><br>
        Un nouveau commentaire a été ajouté sur un cas de test vous concernant.
    </p>
    <div style="background-color:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:20px;margin-bottom:24px;">
        <table width="100%">
            {_info_row('Auteur', author.get_full_name() or author.username)}
            {_info_row('Cas de test', test_case.test_case_ref)}
            {_info_row('Campagne', campaign_title)}
        </table>
    </div>
    <div style="background-color:#f1f5f9;border-left:4px solid #3b82f6;padding:16px;border-radius:0 8px 8px 0;margin-bottom:8px;">
        <p style="margin:0;font-size:14px;color:#334155;line-height:1.6;font-style:italic;">"{comment.message}"</p>
    </div>"""
    html = _base_html("Nouveau commentaire", "Commentaire", "#6366f1", content)
    _send(subject, html, recipient.email)


# ---------------------------------------------------------------------------
# Execution Validated
# ---------------------------------------------------------------------------
def send_execution_validated_email(recipient, tester, test_case):
    is_passed = test_case.status == 'PASSED'
    status_label = "SUCCÈS" if is_passed else "ÉCHEC"
    status_color = "#16a34a" if is_passed else "#dc2626"
    status_bg = "#f0fdf4" if is_passed else "#fef2f2"
    status_border = "#bbf7d0" if is_passed else "#fee2e2"
    subject = f"[InsureTM] Résultat de test : {test_case.test_case_ref} ({test_case.status})"
    name = recipient.first_name or recipient.username
    campaign_title = test_case.campaign.title if test_case.campaign else '—'
    content = f"""
    <p style="margin:0 0 20px 0;font-size:15px;line-height:1.6;color:#475569;">
        Bonjour <strong>{name}</strong>,<br><br>
        Un cas de test vient d'être exécuté sur votre campagne.
    </p>
    <div style="background-color:{status_bg};border:1px solid {status_border};border-radius:8px;padding:20px;margin-bottom:24px;">
        <table width="100%">
            {_info_row('Cas de test', test_case.test_case_ref)}
            {_info_row('Campagne', campaign_title)}
            {_info_row('Testeur', tester.get_full_name() or tester.username)}
        </table>
    </div>
    <div style="text-align:center;">
        <span style="background-color:{status_color};color:#ffffff;padding:8px 24px;border-radius:20px;font-size:13px;font-weight:700;text-transform:uppercase;">
            Résultat : {status_label}
        </span>
    </div>"""
    badge_color = "#16a34a" if is_passed else "#dc2626"
    html = _base_html("Résultat d'exécution", status_label, badge_color, content)
    _send(subject, html, recipient.email)


# ---------------------------------------------------------------------------
# Campaign Created
# ---------------------------------------------------------------------------
def send_campaign_created_email(recipient, creator, campaign):
    subject = f"[InsureTM] Nouvelle campagne créée : {campaign.title}"
    deadline = campaign.estimated_end_date.strftime('%d/%m/%Y') if campaign.estimated_end_date else 'Non définie'
    name = recipient.first_name or recipient.username
    content = f"""
    <p style="margin:0 0 20px 0;font-size:15px;line-height:1.6;color:#475569;">
        Bonjour <strong>{name}</strong>,<br><br>
        Une nouvelle campagne de tests a été créée sur InsureTM.
    </p>
    <div style="background-color:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:20px;margin-bottom:24px;">
        <table width="100%">
            {_info_row('Campagne', campaign.title)}
            {_info_row('Créée par', creator.get_full_name() or creator.username)}
            {_info_row('Échéance', deadline)}
        </table>
    </div>
    <div style="background-color:#eff6ff;border:1px solid #bfdbfe;border-radius:8px;padding:16px;">
        <p style="margin:0;font-size:13px;color:#1e40af;">
            💡 Connectez-vous à la plateforme InsureTM pour consulter et gérer cette campagne.
        </p>
    </div>"""
    html = _base_html("Nouvelle campagne créée", "Manager", "#7c3aed", content)
    _send(subject, html, recipient.email)


# ---------------------------------------------------------------------------
# Account Created (welcome email)
# ---------------------------------------------------------------------------
def send_account_created_email(new_user, raw_password=None):
    subject = "[InsureTM] Bienvenue — Votre compte a été créé"
    name = new_user.first_name or new_user.username
    pwd_row = _info_row('Mot de passe temporaire', raw_password) if raw_password else ''
    content = f"""
    <p style="margin:0 0 20px 0;font-size:15px;line-height:1.6;color:#475569;">
        Bonjour <strong>{name}</strong>,<br><br>
        Bienvenue sur InsureTM ! Votre compte a été créé avec succès. Voici vos identifiants de connexion.
    </p>
    <div style="background-color:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:20px;margin-bottom:24px;">
        <table width="100%">
            {_info_row("Nom d'utilisateur", new_user.username)}
            {_info_row('Rôle', new_user.role)}
            {pwd_row}
        </table>
    </div>
    <div style="background-color:#fefce8;border:1px solid #fde047;border-radius:8px;padding:16px;">
        <p style="margin:0;font-size:13px;color:#854d0e;">
            ⚠️ Veuillez changer votre mot de passe dès votre première connexion.
        </p>
    </div>"""
    html = _base_html("Bienvenue sur InsureTM", "Nouveau compte", "#0891b2", content)
    _send(subject, html, new_user.email)


# ---------------------------------------------------------------------------
# Anomaly Updated
# ---------------------------------------------------------------------------
def send_anomaly_updated_email(recipient, updater, anomalie):
    subject = f"[InsureTM] Mise à jour anomalie #{anomalie.id} : {anomalie.statut}"
    name = recipient.first_name or recipient.username
    statut_colors = {
        'RESOLUE': '#16a34a', 'FERMEE': '#6b7280',
        'EN_COURS': '#d97706', 'OUVERTE': '#dc2626',
    }
    statut_color = statut_colors.get(anomalie.statut, '#6b7280')
    content = f"""
    <p style="margin:0 0 20px 0;font-size:15px;line-height:1.6;color:#475569;">
        Bonjour <strong>{name}</strong>,<br><br>
        Une anomalie vous concernant a été mise à jour par <strong>{updater.username}</strong>.
    </p>
    <div style="background-color:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:20px;margin-bottom:24px;">
        <table width="100%">
            {_info_row('ID', f'#{anomalie.id}')}
            {_info_row('Titre', anomalie.titre)}
            {_info_row('Impact', anomalie.impact)}
        </table>
    </div>
    <div style="text-align:center;">
        <span style="background-color:{statut_color};color:#ffffff;padding:8px 24px;border-radius:20px;font-size:13px;font-weight:700;text-transform:uppercase;">
            Nouveau statut : {anomalie.statut}
        </span>
    </div>"""
    html = _base_html("Mise à jour d'anomalie", "Anomalie", statut_color, content)
    _send(subject, html, recipient.email)


# ---------------------------------------------------------------------------
# 2FA OTP
# ---------------------------------------------------------------------------
def send_otp_email(user, otp):
    subject = f"[InsureTM] Votre code de sécurité : {otp}"
    name = user.first_name or user.username
    content = f"""
    <p style="margin:0 0 24px 0;font-size:15px;line-height:1.6;color:#475569;">
        Bonjour <strong>{name}</strong>,<br><br>
        Pour finaliser votre connexion à InsureTM, utilisez le code ci-dessous.
    </p>
    <div style="text-align:center;margin-bottom:24px;">
        <div style="display:inline-block;background-color:#0f172a;border-radius:12px;padding:20px 40px;">
            <span style="font-size:36px;font-weight:800;color:#3b82f6;letter-spacing:8px;">{otp}</span>
        </div>
    </div>
    <div style="background-color:#fef2f2;border:1px solid #fee2e2;border-radius:8px;padding:16px;">
        <p style="margin:0;font-size:13px;color:#991b1b;">
            ⏱️ Ce code expire dans <strong>5 minutes</strong>. Si vous n'êtes pas à l'origine de cette demande, ignorez cet email.
        </p>
    </div>"""
    html = _base_html("Code de vérification", "2FA Sécurité", "#0891b2", content)
    _send(subject, html, user.email)


# ---------------------------------------------------------------------------
# Password Reset
# ---------------------------------------------------------------------------
def send_password_reset_email(user, new_password):
    subject = "[InsureTM] Votre nouveau mot de passe"
    name = user.first_name or user.username
    content = f"""
    <p style="margin:0 0 20px 0;font-size:15px;line-height:1.6;color:#475569;">
        Bonjour <strong>{name}</strong>,<br><br>
        À votre demande, un nouveau mot de passe a été généré pour votre compte InsureTM.
    </p>
    <div style="background-color:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:20px;margin-bottom:24px;">
        <table width="100%">
            {_info_row('Identifiant', user.username)}
            {_info_row('Nouveau mot de passe', new_password)}
        </table>
    </div>
    <div style="background-color:#fefce8;border:1px solid #fde047;border-radius:8px;padding:16px;">
        <p style="margin:0;font-size:13px;color:#854d0e;">
            ⚠️ Connectez-vous immédiatement et changez ce mot de passe depuis vos paramètres de profil.
        </p>
    </div>"""
    html = _base_html("Réinitialisation du mot de passe", "Sécurité", "#7c3aed", content)
    _send(subject, html, user.email)
