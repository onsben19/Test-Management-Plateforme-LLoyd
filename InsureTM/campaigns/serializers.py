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

    def get_manager_name(self, obj):
        if obj.imported_by:
            return f"{obj.imported_by.first_name} {obj.imported_by.last_name}"
        return "Inconnu"

    def get_assigned_testers_names(self, obj):
        return [user.username for user in obj.assigned_testers.all()]

    class Meta:
        model = Campaign
        fields = ['id', 'project', 'project_name', 'title', 'created_at', 'excel_file', 'is_processed', 'assigned_testers', 'assigned_testers_names', 'tasks', 'description', 'nb_test_cases', 'imported_by', 'manager_name']