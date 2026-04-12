from rest_framework import serializers
from .models import Campaign, TaskAssignment

class TaskAssignmentSerializer(serializers.ModelSerializer):
    class Meta:
        model = TaskAssignment
        fields = '__all__'

class CampaignSerializer(serializers.ModelSerializer):
    # On peut inclure les tâches pour voir l'avancement
    tasks = TaskAssignmentSerializer(many=True, read_only=True)
    project_name = serializers.ReadOnlyField(source='project.name')
    manager_name = serializers.SerializerMethodField()
    assigned_testers_names = serializers.SerializerMethodField()
    excel_file = serializers.FileField(required=False, allow_null=True)
    
    passed_count = serializers.SerializerMethodField()
    failed_count = serializers.SerializerMethodField()
    anomalies_count = serializers.SerializerMethodField()

    def get_passed_count(self, obj):
        from testCases.models import TestCase
        return TestCase.objects.filter(campaign=obj, status='PASSED').count()

    def get_failed_count(self, obj):
        from testCases.models import TestCase
        return TestCase.objects.filter(campaign=obj, status='FAILED').count()

    def get_anomalies_count(self, obj):
        from anomalies.models import Anomalie
        return Anomalie.objects.filter(test_case__campaign=obj).exclude(statut='RESOLUE').count()

    def get_manager_name(self, obj):
        if obj.imported_by:
            name = f"{obj.imported_by.first_name} {obj.imported_by.last_name}".strip()
            return name if name else obj.imported_by.username
        return "Inconnu"

    def get_assigned_testers_names(self, obj):
        return [user.username for user in obj.assigned_testers.all()]

    class Meta:
        model = Campaign
        fields = [
            'id', 'project', 'project_name', 'title', 'created_at', 
            'start_date', 'estimated_end_date', 'excel_file', 
            'is_processed', 'scheduled_at', 'assigned_testers', 'assigned_testers_names', 
            'tasks', 'description', 'nb_test_cases', 'imported_by', 'manager_name',
            'passed_count', 'failed_count', 'anomalies_count'
        ]
        read_only_fields = ['imported_by']