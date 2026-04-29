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
    business_project_name = serializers.ReadOnlyField(source='project.business_project.name')
    release_type = serializers.ReadOnlyField(source='project.release_type')
    manager_name = serializers.SerializerMethodField()
    assigned_testers_names = serializers.SerializerMethodField()
    assigned_testers = serializers.PrimaryKeyRelatedField(
        many=True, 
        queryset=Campaign.assigned_testers.through.tester.field.related_model.objects.all()
    )

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

    tester_quotas = serializers.CharField(write_only=True, required=False)
    current_quotas = serializers.SerializerMethodField()

    def get_current_quotas(self, obj):
        from .models import CampaignAssignment
        assignments = CampaignAssignment.objects.filter(campaign=obj)
        return {str(a.tester_id): a.test_quota for a in assignments}

    def create(self, validated_data):
        tester_quotas_data = validated_data.pop('tester_quotas', None)
        # On extrait les testeurs pour les gérer manuellement avec le modèle 'through'
        assigned_testers = validated_data.pop('assigned_testers', [])
        
        campaign = Campaign.objects.create(**validated_data)
        
        # Gestion des quotas
        import json
        quotas = {}
        if tester_quotas_data:
            try:
                quotas = json.loads(tester_quotas_data)
            except:
                pass

        from .models import CampaignAssignment
        for tester in assigned_testers:
            quota = quotas.get(str(tester.id), 0)
            CampaignAssignment.objects.create(
                campaign=campaign,
                tester=tester,
                test_quota=quota
            )
        
        return campaign

    def update(self, instance, validated_data):
        tester_quotas_data = validated_data.pop('tester_quotas', None)
        assigned_testers = validated_data.pop('assigned_testers', None)
        
        instance = super().update(instance, validated_data)
        
        if assigned_testers is not None:
            import json
            quotas = {}
            if tester_quotas_data:
                try:
                    quotas = json.loads(tester_quotas_data)
                except:
                    pass
            
            from .models import CampaignAssignment
            # On nettoie les anciennes assignations
            CampaignAssignment.objects.filter(campaign=instance).delete()
            # On recrée avec les nouveaux quotas
            for tester in assigned_testers:
                quota = quotas.get(str(tester.id), 0)
                CampaignAssignment.objects.create(
                    campaign=instance,
                    tester=tester,
                    test_quota=quota
                )
        
        return instance

    class Meta:
        model = Campaign
        fields = [
            'id', 'project', 'project_name', 'business_project_name', 'release_type', 
            'title', 'created_at', 
            'start_date', 'estimated_end_date', 'excel_file', 
            'scheduled_at', 'assigned_testers', 'assigned_testers_names', 
            'tasks', 'description', 'nb_test_cases', 'imported_by', 'manager_name',
            'passed_count', 'failed_count', 'anomalies_count', 'tester_quotas', 'current_quotas'
        ]
        read_only_fields = ['imported_by']