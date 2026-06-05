import logging
import secrets
import string

from django.contrib.auth.models import AbstractUser
from django.db import models

logger = logging.getLogger(__name__)


class User(AbstractUser):
    ROLE_CHOICES = (
        ('ADMIN', 'Administrateur'),
        ('MANAGER', 'Manager'),
        ('TESTER', 'Testeur'),
    )
    role = models.CharField(max_length=10, choices=ROLE_CHOICES, default='TESTER')
    email = models.EmailField(unique=True)

    # 2FA Fields
    otp_code = models.CharField(max_length=6, blank=True, null=True)
    otp_expiry = models.DateTimeField(blank=True, null=True)

    @staticmethod
    def generate_random_password(length=12):
        """Génère un mot de passe aléatoire de longueur `length`."""
        alphabet = string.ascii_letters + string.digits + string.punctuation
        return ''.join(secrets.choice(alphabet) for _ in range(length))

    def _generate_random_password(self, length=12):
        return self.generate_random_password(length)

    def save(self, *args, **kwargs):
        if not self.pk and not self.password:
            new_password = self._generate_random_password()
            self.set_password(new_password)
            logger.info("New user '%s' created with an auto-generated password.", self.username)
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.username} ({self.role})"from django.db import models
from django.conf import settings

class Campaign(models.Model):
    # IMPORTANT : Ne pas importer Project. Utiliser 'Project.Project'
    project = models.ForeignKey(
        'Project.Project', 
        on_delete=models.CASCADE, 
        related_name='campaigns'
    )
    
    title = models.CharField(max_length=200)
    start_date = models.DateField(null=True, blank=True)
    estimated_end_date = models.DateField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    excel_file = models.FileField(upload_to='campaigns/referentiels/%Y/%m/%d/', blank=True)
    scheduled_at = models.DateTimeField(null=True, blank=True)

    description = models.TextField(blank=True, null=True)
    nb_test_cases = models.IntegerField(default=0)
    imported_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, 
        on_delete=models.SET_NULL, 
        null=True, 
        related_name='imported_campaigns'
    )
    
    assigned_testers = models.ManyToManyField(
        settings.AUTH_USER_MODEL, 
        related_name='assigned_campaigns',
        blank=True,
        through='CampaignAssignment'
    )

    def __str__(self):
        return f"{self.title} (Project: {self.project.name})"

class CampaignAssignment(models.Model):
    campaign = models.ForeignKey(Campaign, on_delete=models.CASCADE, related_name='tester_assignments')
    tester = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='campaign_assignments')
    test_quota = models.IntegerField(default=0)
    assigned_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('campaign', 'tester')

class TaskAssignment(models.Model):
    campaign = models.ForeignKey(Campaign, on_delete=models.CASCADE, related_name='tasks')
    tester = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    test_case_ref = models.CharField(max_length=100) 
    assigned_at = models.DateTimeField(auto_now_add=True)
    is_completed = models.BooleanField(default=False)

    class Meta:
        unique_together = ('campaign', 'test_case_ref')# models.py
from django.db import models
from django.conf import settings



class Anomalie(models.Model):
    # Lien direct avec le test case spécifique
    test_case = models.ForeignKey(
        'testCases.TestCase', 
        on_delete=models.CASCADE, 
        related_name='anomalies',
        null=True, 
        blank=True
    )
    
    # Champs correspondant à ton interface visuelle
    titre = models.CharField(max_length=255)
    description = models.TextField()
    # Impact (anciennement criticité) avec choix étendus
    IMPACT_CHOICES = [
        ('FONCTIONNALITE', 'Fonctionnalité'),
        ('SIMPLE', 'Simple'),
        ('TEXTE', 'Texte'),
        ('COSMETIQUE', 'Cosmétique'),
        ('MINEURS', 'Mineurs'),
        ('MAJEUR', 'Majeur'),
        ('CRITIQUE', 'Critique'),
        ('BLOQUANTES', 'Bloquantes'),
    ]
    impact = models.CharField(
        max_length=20, 
        choices=IMPACT_CHOICES,
        default='MINEURS'
    )
    
    # Priorité
    PRIORITE_CHOICES = [
        ('NORMALE', 'Normale'),
        ('BASSE', 'Basse'),
        ('ELEVEE', 'Élevée'),
        ('URGENTE', 'Urgente'),
        ('IMMEDIATE', 'Immédiate'),
    ]
    priorite = models.CharField(
        max_length=20, 
        choices=PRIORITE_CHOICES,
        default='NORMALE'
    )
    
    # Visibilité
    VISIBILITE_CHOICES = [
        ('PUBLIQUE', 'Publique'),
        ('PRIVEE', 'Privée'),
    ]
    visibilite = models.CharField(
        max_length=20, 
        choices=VISIBILITE_CHOICES,
        default='PUBLIQUE'
    )

    statut = models.CharField(
        max_length=20, 
        choices=[('OUVERTE', 'Ouverte'), ('EN_INVESTIGATION', 'En investigation'), ('RESOLUE', 'Résolue')],
        default='OUVERTE'
    )
    
    # Preuve visuelle (Capture d'écran ou fichier)
    preuve_image = models.FileField(upload_to='anomalies/preuves/%Y/%m/%d/', blank=True, null=True)
    preuve_hash = models.CharField(max_length=64, blank=True, null=True, db_index=True)
    
    # Traçabilité du testeur
    cree_par = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    cree_le = models.DateTimeField(auto_now_add=True)

    def save(self, *args, **kwargs):
        if self.preuve_image:
            import hashlib
            hasher = hashlib.sha256()
            try:
                opened_here = False
                if self.preuve_image.closed:
                    self.preuve_image.open('rb')
                    opened_here = True
                else:
                    self.preuve_image.seek(0)
                
                for chunk in self.preuve_image.chunks():
                    hasher.update(chunk)
                
                self.preuve_hash = hasher.hexdigest()
                
                if opened_here:
                    self.preuve_image.close()
            except Exception:
                pass
        else:
            self.preuve_hash = None
        super().save(*args, **kwargs)

    def __str__(self):
        return f"Bug: {self.titre} (Test: {self.test_case.test_case_ref})"from django.db import models
from django.conf import settings
import uuid

class Conversation(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='analytics_conversations')
    title = models.CharField(max_length=255, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-updated_at']

    def __str__(self):
        return self.title or f"Conversation {self.created_at}"

class Message(models.Model):
    SENDER_CHOICES = (
        ('user', 'User'),
        ('agent', 'Agent'),
    )
    
    conversation = models.ForeignKey(Conversation, on_delete=models.CASCADE, related_name='messages')
    sender = models.CharField(max_length=10, choices=SENDER_CHOICES)
    text = models.TextField()
    
    # Metadata for rich responses
    type = models.CharField(max_length=20, default='text') # text, bar, line, table, metric, error
    sql = models.TextField(blank=True, null=True)
    data = models.JSONField(default=list, blank=True)
    file = models.FileField(upload_to='analytics_files/', null=True, blank=True)
    
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['created_at']

    def __str__(self):
        return f"{self.sender}: {self.text[:50]}..."


class ReinforcementNotification(models.Model):
    """Tracks reinforcement email notifications sent via n8n."""

    STATUS_CHOICES = [
        ('PENDING',  'En attente'),
        ('ACCEPTED', 'Accepté'),
        ('REFUSED',  'Refusé'),
    ]

    campaign   = models.ForeignKey(
        'campaigns.Campaign',
        on_delete=models.CASCADE,
        related_name='reinforcement_notifications'
    )
    tester     = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='reinforcement_notifications'
    )
    status     = models.CharField(max_length=10, choices=STATUS_CHOICES, default='PENDING')
    sent_at    = models.DateTimeField(auto_now_add=True)
    replied_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ['-sent_at']
        unique_together = ('campaign', 'tester')

    def __str__(self):
        return f"{self.tester.username} -> Campagne {self.campaign_id} : {self.status}"

class QANews(models.Model):
    """Stores scraped QA articles and AI-generated tips."""
    title = models.CharField(max_length=255)
    url = models.URLField(unique=True)
    source = models.CharField(max_length=100, default='Ministry of Testing')
    content_summary = models.TextField()
    ai_tip = models.TextField(blank=True, null=True)
    published_date = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return self.title
from django.db import models
from django.conf import settings

class Conversation(models.Model):
    CONV_TYPES = [
        ('DIRECT', 'Direct Message'),
        ('GROUP', 'Group Chat'),
    ]
    name = models.CharField(max_length=255, blank=True, null=True)
    type = models.CharField(max_length=10, choices=CONV_TYPES, default='DIRECT')
    participants = models.ManyToManyField(settings.AUTH_USER_MODEL, related_name='conversations')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        if self.type == 'DIRECT':
            return f"Private chat ({self.id})"
        return self.name or f"Group {self.id}"

class Message(models.Model):
    conversation = models.ForeignKey(Conversation, on_delete=models.CASCADE, related_name='messages')
    author = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='chat_messages')
    text = models.TextField(blank=True, null=True)
    attachment = models.FileField(upload_to='chat_attachments/', null=True, blank=True)
    is_edited = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['created_at']

    def __str__(self):
        return f"Msg by {self.author} at {self.created_at}"
from django.db import models
from django.conf import settings

class Email(models.Model):
    sender = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='sent_emails')
    recipient = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='received_emails')
    subject = models.CharField(max_length=255)
    body = models.TextField()
    attachment = models.FileField(upload_to='email_attachments/%Y/%m/%d/', null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    is_read = models.BooleanField(default=False)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"From {self.sender} to {self.recipient}: {self.subject}"
