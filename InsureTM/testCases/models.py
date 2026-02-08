from django.db import models
from django.conf import settings

class TestCase(models.Model):
    # Relation : Une campagne a plusieurs Test Cases
    campaign = models.ForeignKey(
        'campaigns.Campaign', 
        on_delete=models.CASCADE, 
        related_name='test_cases'
    )
    
    # Référence stable (ex: ID, Numéro de ligne) pour l'assignation
    test_case_ref = models.CharField(max_length=100)
    
    # Contenu variable de l'Excel (Etape, Résultat, etc.)
    data_json = models.JSONField(default=dict)
    
    # État actuel du test pour le testeur
    status = models.CharField(
        max_length=20, 
        choices=[('PENDING', 'En attente'), ('PASSED', 'Succès'), ('FAILED', 'Échec')],
        default='PENDING'
    )
    
    tester = models.ForeignKey(
        settings.AUTH_USER_MODEL, 
        on_delete=models.SET_NULL, 
        null=True, 
        related_name='executed_test_cases'
    )
    execution_date = models.DateTimeField(auto_now_add=True, null=True)
    
    # Preuve d'exécution (Capture écran ou fichier)
    proof_file = models.FileField(upload_to='executions/proofs/%Y/%m/%d/', blank=True, null=True)

    def __str__(self):
        return f"{self.test_case_ref} - {self.campaign.title}"