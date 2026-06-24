from django.db import models
from django.conf import settings
from django.db.models.signals import post_save, post_delete
from django.dispatch import receiver

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
        unique_together = ('campaign', 'test_case_ref')


@receiver(post_save, sender=Campaign)
@receiver(post_delete, sender=Campaign)
def invalidate_bp_health_on_campaign_change(sender, instance, **kwargs):
    from business_projects.health_cache import invalidate_bp_health_for_campaign
    from analytics.ml_service import invalidate_campaign_timeline_cache
    invalidate_bp_health_for_campaign(instance.id)
    invalidate_campaign_timeline_cache(instance.id)


@receiver(post_save, sender=CampaignAssignment)
@receiver(post_delete, sender=CampaignAssignment)
def invalidate_timeline_on_assignment_change(sender, instance, **kwargs):
    from analytics.ml_service import invalidate_campaign_timeline_cache
    invalidate_campaign_timeline_cache(instance.campaign_id)