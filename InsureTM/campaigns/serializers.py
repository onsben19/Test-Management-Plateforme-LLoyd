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
    executed_count = serializers.SerializerMethodField()
    progress_percentage = serializers.SerializerMethodField()
    anomalies_count = serializers.SerializerMethodField()

    def get_passed_count(self, obj):
        from testCases.models import TestCase
        return TestCase.objects.filter(campaign=obj, status='PASSED').count()

    def get_failed_count(self, obj):
        from testCases.models import TestCase
        return TestCase.objects.filter(campaign=obj, status='FAILED').count()

    def get_executed_count(self, obj):
        from testCases.models import TestCase
        return TestCase.objects.filter(campaign=obj).exclude(status='PENDING').count()

    def get_progress_percentage(self, obj):
        from testCases.models import TestCase
        db_count = TestCase.objects.filter(campaign=obj).count()
        total = max(obj.nb_test_cases or 0, db_count)
        if total <= 0:
            return 0
        executed = TestCase.objects.filter(campaign=obj).exclude(status='PENDING').count()
        return round((executed / total) * 100)

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
    tester_progress = serializers.SerializerMethodField()

    def get_current_quotas(self, obj):
        from .models import CampaignAssignment
        assignments = CampaignAssignment.objects.filter(campaign=obj)
        return {str(a.tester_id): a.test_quota for a in assignments}

    def get_tester_progress(self, obj):
        from django.db.models import Count
        from .models import CampaignAssignment
        from testCases.models import TestCase

        assignments = CampaignAssignment.objects.filter(campaign=obj)
        if not assignments:
            return {}

        tester_ids = [a.tester_id for a in assignments]
        executed_map = {
            row['tester_id']: row['cnt']
            for row in (
                TestCase.objects.filter(campaign=obj, tester_id__in=tester_ids)
                .exclude(status='PENDING')
                .values('tester_id')
                .annotate(cnt=Count('id'))
            )
        }

        return {
            str(a.tester_id): {
                'executed': executed_map.get(a.tester_id, 0),
                'quota': a.test_quota,
            }
            for a in assignments
        }

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

    def to_representation(self, instance):
        ret = super().to_representation(instance)
        request = self.context.get('request')
        
        from testCases.models import TestCase
        from anomalies.models import Anomalie
        from .models import CampaignAssignment
        
        if request and hasattr(request.user, 'role') and request.user.role == 'TESTER':
            tester = request.user
            
            # Tester specific stats
            my_passed = TestCase.objects.filter(campaign=instance, status='PASSED', tester=tester).count()
            my_failed = TestCase.objects.filter(campaign=instance, status='FAILED', tester=tester).count()
            my_anomalies = Anomalie.objects.filter(test_case__campaign=instance, test_case__tester=tester).exclude(statut='RESOLUE').count()
            
            # Tester specific quota
            assignment = CampaignAssignment.objects.filter(campaign=instance, tester=tester).first()
            my_quota = assignment.test_quota if assignment else 0
            
            ret['passed_count'] = my_passed
            ret['failed_count'] = my_failed
            ret['executed_count'] = my_passed + my_failed
            ret['anomalies_count'] = my_anomalies
            ret['nb_test_cases'] = my_quota
            quota = my_quota or 0
            ret['progress_percentage'] = round(((my_passed + my_failed) / quota) * 100) if quota > 0 else 0
        else:
            # Global stats logic
            db_count = TestCase.objects.filter(campaign=instance).count()
            ret['nb_test_cases'] = max(instance.nb_test_cases, db_count)
            executed = ret.get('executed_count', 0)
            total = ret['nb_test_cases'] or 0
            ret['progress_percentage'] = round((executed / total) * 100) if total > 0 else 0
            
        return ret


    class Meta:
        model = Campaign
        fields = [
            'id', 'project', 'project_name', 'business_project_name', 'release_type', 
            'title', 'created_at', 
            'start_date', 'estimated_end_date', 'excel_file', 
            'scheduled_at', 'assigned_testers', 'assigned_testers_names', 
            'tasks', 'description', 'nb_test_cases', 'imported_by', 'manager_name',
            'passed_count', 'failed_count', 'executed_count', 'progress_percentage',
            'anomalies_count', 'tester_quotas', 'current_quotas', 'tester_progress'
        ]
        read_only_fields = ['imported_by']