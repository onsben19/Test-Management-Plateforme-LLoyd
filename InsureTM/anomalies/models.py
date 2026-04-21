# models.py
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
    
    # Traçabilité du testeur
    cree_par = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    cree_le = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Bug: {self.titre} (Test: {self.test_case.test_case_ref})"