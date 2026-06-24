from django.core.cache import cache


def invalidate_bp_health(business_project_id):
    if business_project_id:
        cache.delete(f"bp_health_{business_project_id}")


def invalidate_bp_health_for_campaign(campaign_id):
    if not campaign_id:
        return
    from campaigns.models import Campaign

    bp_id = (
        Campaign.objects.filter(pk=campaign_id)
        .values_list("project__business_project_id", flat=True)
        .first()
    )
    invalidate_bp_health(bp_id)
