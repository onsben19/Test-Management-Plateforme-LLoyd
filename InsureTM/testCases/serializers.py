import json
import logging
from datetime import datetime, date

from rest_framework import serializers

from .models import TestCase

logger = logging.getLogger(__name__)


def sanitize_for_json(obj):
    """Recursively convert datetime/date objects to ISO strings so JSONField can store them."""
    if isinstance(obj, dict):
        return {k: sanitize_for_json(v) for k, v in obj.items()}
    elif isinstance(obj, list):
        return [sanitize_for_json(i) for i in obj]
    elif isinstance(obj, (datetime, date)):
        return obj.isoformat()
    return obj



class TestCaseSerializer(serializers.ModelSerializer):
    tester_name = serializers.SerializerMethodField()
    campaign_title = serializers.SerializerMethodField()
    project_name = serializers.SerializerMethodField()
    business_project_name = serializers.SerializerMethodField()
    release_type = serializers.SerializerMethodField()
    assigned_tester_name = serializers.SerializerMethodField()

    def get_tester_name(self, obj):
        if obj.tester:
            full_name = f"{obj.tester.first_name} {obj.tester.last_name}".strip()
            return full_name or obj.tester.username
        return "Non assigné"

    def get_campaign_title(self, obj):
        return obj.campaign.title if obj.campaign else "Inconnu"

    def get_project_name(self, obj):
        return obj.campaign.project.name if obj.campaign and obj.campaign.project else "Inconnu"

    def get_business_project_name(self, obj):
        try:
            return obj.campaign.project.business_project.name if obj.campaign and obj.campaign.project and obj.campaign.project.business_project else "Inconnu"
        except AttributeError:
            return "Inconnu"

    def get_release_type(self, obj):
        try:
            return obj.campaign.project.release_type if obj.campaign and obj.campaign.project else None
        except AttributeError:
            return None

    def get_assigned_tester_name(self, obj):
        from campaigns.models import TaskAssignment
        try:
            assignment = TaskAssignment.objects.filter(
                campaign=obj.campaign,
                test_case_ref=obj.test_case_ref
            ).first()
            if assignment and assignment.tester:
                full_name = f"{assignment.tester.first_name} {assignment.tester.last_name}".strip()
                return full_name or assignment.tester.username
            return "Non assigné"
        except Exception:
            return "Non assigné"

    def to_internal_value(self, data):
        data_mutable = data.copy() if hasattr(data, 'copy') else dict(data)

        # Parse JSON string for data_json field (arrives as string from FormData)
        parsed_data_json = None
        if 'data_json' in data_mutable:
            raw = data_mutable.pop('data_json')
            if isinstance(raw, str):
                try:
                    parsed_data_json = json.loads(raw)
                except ValueError:
                    pass
            else:
                parsed_data_json = raw

        # Remove empty proof_file (string placeholder sent by some clients)
        if 'proof_file' in data_mutable and not hasattr(data_mutable['proof_file'], 'name'):
            del data_mutable['proof_file']

        validated_data = super().to_internal_value(data_mutable)

        if parsed_data_json is not None:
            validated_data['data_json'] = sanitize_for_json(parsed_data_json)

        return validated_data

    class Meta:
        model = TestCase
        fields = [
            'id', 'campaign', 'campaign_title', 'project_name',
            'business_project_name', 'release_type',
            'test_case_ref', 'data_json', 'status',
            'tester', 'tester_name', 'assigned_tester_name',
            'execution_date', 'proof_file',
        ]