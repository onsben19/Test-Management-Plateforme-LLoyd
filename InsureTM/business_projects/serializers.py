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

        if obj.status == 'TERMINÉ':
            result = {'score': 100.0, 'label': 'Terminé ✓', 'open_anomalies': 0}
            cache.set(cache_key, result, timeout=120)
            return result

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
            result = {'score': None, 'label': 'Pas encore démarré', 'open_anomalies': 0}
            cache.set(cache_key, result, timeout=120)
            return result

        camp_ids = [c.id for c in campaigns]
        nb_map = {c.id: (c.nb_test_cases or 0) for c in campaigns}

        # One aggregated query: passed count + total count per campaign
        tc_stats = (
            TestCase.objects
            .filter(campaign_id__in=camp_ids)
            .values('campaign_id')
            .annotate(
                total_db=Count('id'),
                passed=Count('id', filter=Q(status='PASSED')),
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

        scores = []
        has_complete = False
        total_open = sum(anom_map.values())

        for camp in campaigns:
            s = tc_map.get(camp.id)
            if not s:
                continue
            total = max(nb_map[camp.id], s['total_db'])
            if total == 0:
                continue
            passed = s['passed']
            score = round((min(passed, total) / total) * 100, 1)
            scores.append(score)
            if score == 100.0 and anom_map.get(camp.id, 0) == 0:
                has_complete = True

        if not scores:
            result = {'score': None, 'label': 'Pas encore démarré', 'open_anomalies': total_open}
            cache.set(cache_key, result, timeout=120)
            return result

        best = max(scores)
        if has_complete:
            label = 'Complet ✓'
        elif best >= 80:
            label = 'Excellent'
        elif best >= 50:
            label = 'En cours'
        elif best > 0:
            label = 'Démarrage'
        else:
            label = 'Pas encore démarré'

        result = {'score': best, 'label': label, 'open_anomalies': total_open}
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
