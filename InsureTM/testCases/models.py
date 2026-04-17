from django.db import models
from django.conf import settings
from django.db.models.signals import post_save
from django.dispatch import receiver
from channels.layers import get_channel_layer
from asgiref.sync import async_to_sync
from django.utils import timezone

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
        choices=[('PASSED', 'Succès'), ('FAILED', 'Échec')],
        default='PASSED'
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

@receiver(post_save, sender=TestCase)
def broadcast_test_case_event(sender, instance, created, **kwargs):
    try:
        channel_layer = get_channel_layer()
        group_name = f'campaign_{instance.campaign.id}'
        
        payload = {
            "type": "tester_activity",
            "tester_id": instance.tester.id if instance.tester else 0,
            "action": "completed" if instance.status == 'PASSED' else "failed",
            "tc_id": instance.test_case_ref,
            "timestamp": instance.execution_date.isoformat() if instance.execution_date else timezone.now().isoformat()
        }
        
        async_to_sync(channel_layer.group_send)(
            group_name,
            {
                "type": "live_event",
                "payload": payload
            }
        )
    except Exception as e:
        # Standard logging could be added here
        pass