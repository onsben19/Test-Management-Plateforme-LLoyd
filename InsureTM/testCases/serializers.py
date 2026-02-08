from rest_framework import serializers
from .models import TestCase


class TestCaseSerializer(serializers.ModelSerializer):
    tester_name = serializers.SerializerMethodField()
    campaign_title = serializers.SerializerMethodField()
    project_name = serializers.SerializerMethodField()
    assigned_tester_name = serializers.SerializerMethodField()

    def get_tester_name(self, obj):
        if obj.tester:
            full_name = f"{obj.tester.first_name} {obj.tester.last_name}".strip()
            return full_name if full_name else obj.tester.username
        return "Non assigné"

    def get_campaign_title(self, obj):
        return obj.campaign.title if obj.campaign else "Inconnu"

    def get_project_name(self, obj):
        try:
            return obj.campaign.project.name if obj.campaign and obj.campaign.project else "Inconnu"
        except AttributeError:
            return "Inconnu"

    def get_assigned_tester_name(self, obj):
        from campaigns.models import TaskAssignment
        try:
            assignment = TaskAssignment.objects.filter(campaign=obj.campaign, test_case_ref=obj.test_case_ref).first()
            if assignment and assignment.tester:
                full_name = f"{assignment.tester.first_name} {assignment.tester.last_name}".strip()
                return full_name if full_name else assignment.tester.username
            return "Non assigné"
        except Exception:
            return "Non assigné"
    
    def to_internal_value(self, data):
        # Handle FormData where JSON fields might be strings
        # Create a mutable copy of data
        if hasattr(data, 'copy'):
            data_mutable = data.copy()
        else:
            data_mutable = dict(data)

        parsed_data_json = None
        if 'data_json' in data_mutable:
            raw_data_json = data_mutable['data_json']
            if isinstance(raw_data_json, str):
                import json
                try:
                    parsed_data_json = json.loads(raw_data_json)
                except ValueError:
                    pass # Invalid JSON, let it fail or handle
            else:
                parsed_data_json = raw_data_json
            
            # Remove data_json from data passed to super to avoid validation error
            # We will add it back to the result
            if 'data_json' in data_mutable:
                 del data_mutable['data_json']

        # Cleanup empty proof_file
        if 'proof_file' in data_mutable and not hasattr(data_mutable['proof_file'], 'name'):
             del data_mutable['proof_file']

        # Call super
        validated_data = super().to_internal_value(data_mutable)

        # Add back parsed data_json if it exists and wasn't handled by super
        if parsed_data_json is not None:
            validated_data['data_json'] = parsed_data_json
            
        return validated_data

    def validate(self, data):
        return data

    class Meta:
        model = TestCase
        fields = ['id', 'campaign', 'campaign_title', 'project_name', 'test_case_ref', 'data_json', 'status', 'tester', 'tester_name', 'assigned_tester_name', 'execution_date', 'proof_file']