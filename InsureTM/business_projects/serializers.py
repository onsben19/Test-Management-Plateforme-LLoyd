from rest_framework import serializers
from django.core.cache import cache
from django.db.models import Count, Q
from .models import BusinessProject


class BusinessProjectSerializer(serializers.ModelSerializer):
    created_by_username = serializers.ReadOnlyField(source='created_by.username')
    releases_count = serializers.IntegerField(source='releases.count', read_only=True)
    recent_releases = serializers.SerializerMethodField()
    health_score = serializers.SerializerMethodField()
    health_label = serializers.SerializerMethodField()
    open_anomalies_count = serializers.SerializerMethodField()

    class Meta:
        model = BusinessProject
        fields = [
            'id', 'name', 'description', 'status', 'created_at',
            'created_by', 'created_by_username', 'releases_count',
            'recent_releases', 'health_score', 'health_label', 'open_anomalies_count'
        ]
        read_only_fields = ['created_by']

    def _compute_health(self, obj):
        """
        Compute health score and label in a single pass using aggregated queries.
        Result is cached per project for 2 minutes.
        """
        cache_key = f"bp_health_{obj.id}"
        cached = cache.get(cache_key)
        if cached is not None:
            return cached

        from campaigns.models import Campaign
        from testCases.models import TestCase
        from anomalies.models import Anomalie

        # One query: all campaigns for this business project
        campaigns = list(
            Campaign.objects
            .filter(project__business_project=obj)
            .only('id', 'nb_test_cases')
        )
        if not campaigns:
            label = 'Terminé ✓' if obj.status == 'TERMINÉ' else 'Pas encore démarré'
            result = {'score': None, 'label': label, 'open_anomalies': 0}
            cache.set(cache_key, result, timeout=120)
            return result

        camp_ids = [c.id for c in campaigns]
        nb_map = {c.id: (c.nb_test_cases or 0) for c in campaigns}

        # One aggregated query: passed/failed/total per campaign
        tc_stats = (
            TestCase.objects
            .filter(campaign_id__in=camp_ids)
            .values('campaign_id')
            .annotate(
                total_db=Count('id'),
                passed=Count('id', filter=Q(status='PASSED')),
                failed=Count('id', filter=Q(status='FAILED')),
            )
        )
        tc_map = {r['campaign_id']: r for r in tc_stats}

        # One aggregated query: open anomalies per campaign
        anom_stats = (
            Anomalie.objects
            .filter(
                test_case__campaign_id__in=camp_ids,
                statut__in=['OUVERTE', 'EN_INVESTIGATION']
            )
            .values('test_case__campaign_id')
            .annotate(cnt=Count('id'))
        )
        anom_map = {r['test_case__campaign_id']: r['cnt'] for r in anom_stats}

        total_planned = 0
        total_passed = 0
        total_failed = 0
        total_open = 0
        campaigns_complete = 0
        campaigns_with_tests = 0

        for camp in campaigns:
            s = tc_map.get(camp.id)
            planned = max(nb_map[camp.id], s['total_db'] if s else 0)
            passed = s['passed'] if s else 0
            failed = s['failed'] if s else 0
            open_anom = anom_map.get(camp.id, 0)

            total_planned += planned
            total_passed += passed
            total_failed += failed
            total_open += open_anom

            if planned > 0 and (passed + failed) > 0:
                campaigns_with_tests += 1
                if passed >= planned and failed == 0 and open_anom == 0:
                    campaigns_complete += 1

        total_executed = total_passed + total_failed

        if total_executed == 0 or total_planned == 0:
            label = 'Terminé ✓' if obj.status == 'TERMINÉ' else 'Pas encore démarré'
            result = {'score': None, 'label': label, 'open_anomalies': total_open}
            cache.set(cache_key, result, timeout=120)
            return result

        # Score global = part des tests planifiés réussis (pas le max d'une seule campagne)
        score = round((min(total_passed, total_planned) / total_planned) * 100, 1)
        success_rate = round((total_passed / total_executed) * 100, 1) if total_executed else 0
        all_campaigns_done = (
            campaigns_with_tests > 0
            and campaigns_complete == len(campaigns)
            and total_passed >= total_planned
        )

        if all_campaigns_done and total_open == 0:
            label = 'Complet ✓'
        elif success_rate >= 80 and total_open == 0:
            label = 'Excellent'
        elif score >= 50 or total_executed >= total_planned * 0.5:
            label = 'En cours'
        elif score > 0 or total_executed > 0:
            label = 'Démarrage'
        else:
            label = 'Pas encore démarré'

        if obj.status == 'TERMINÉ':
            label = 'Terminé ✓'

        result = {'score': score, 'label': label, 'open_anomalies': total_open}
        cache.set(cache_key, result, timeout=120)
        return result

    def get_health_score(self, obj):
        return self._compute_health(obj)['score']

    def get_health_label(self, obj):
        return self._compute_health(obj)['label']

    def get_open_anomalies_count(self, obj):
        return self._compute_health(obj)['open_anomalies']

    def get_recent_releases(self, obj):
        return list(obj.releases.values_list('name', flat=True)[:3])

    def create(self, validated_data):
        validated_data['created_by'] = self.context['request'].user
        return super().create(validated_data)
