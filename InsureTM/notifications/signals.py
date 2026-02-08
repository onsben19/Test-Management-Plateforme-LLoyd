from django.db.models.signals import m2m_changed
from django.dispatch import receiver
from campaigns.models import Campaign
from .models import Notification

@receiver(m2m_changed, sender=Campaign.assigned_testers.through)
def notify_tester_assignment(sender, instance, action, reverse, model, pk_set, **kwargs):
    print(f"DEBUG: Signal Triggered! Action: {action}, Instance: {instance}")
    if action == "post_add":
        # 'instance' is the Campaign object
        # 'pk_set' contains the IDs of the added users (testers)
        from django.contrib.auth import get_user_model
        User = get_user_model()
        
        testers = User.objects.filter(pk__in=pk_set)
        for tester in testers:
            Notification.objects.create(
                recipient=tester,
                title="Nouvelle Campagne Assignée",
                message=f"Vous avez été assigné à la campagne : {instance.title}",
                type='campaign_assignment',
                related_campaign=instance
            )
