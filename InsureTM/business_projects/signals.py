from django.db.models.signals import post_save
from django.dispatch import receiver

from .health_cache import invalidate_bp_health
from .models import BusinessProject


@receiver(post_save, sender=BusinessProject)
def invalidate_health_on_business_project_save(sender, instance, **kwargs):
    invalidate_bp_health(instance.id)
