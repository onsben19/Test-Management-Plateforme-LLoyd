from rest_framework import serializers
from .models import Anomalie

class AnomalieSerializer(serializers.ModelSerializer):
    cree_par_nom = serializers.SerializerMethodField()

    def get_cree_par_nom(self, obj):
        if obj.cree_par:
            full_name = f"{obj.cree_par.first_name} {obj.cree_par.last_name}".strip()
            return full_name if full_name else obj.cree_par.username
        return "Inconnu"
    test_case_ref = serializers.ReadOnlyField(source='test_case.test_case_ref')
    campaign_title = serializers.SerializerMethodField()
    project_name = serializers.SerializerMethodField()

    def get_campaign_title(self, obj):
        try:
            return obj.test_case.campaign.title if obj.test_case and obj.test_case.campaign else "Inconnu"
        except AttributeError:
            return "Inconnu"

    def get_project_name(self, obj):
        try:
            return obj.test_case.campaign.project.name if obj.test_case and obj.test_case.campaign and obj.test_case.campaign.project else "Inconnu"
        except AttributeError:
            return "Inconnu"

    class Meta:
        model = Anomalie
        fields = ['id', 'titre', 'description', 'criticite', 'preuve_image', 'cree_le', 'cree_par', 'cree_par_nom', 'test_case', 'test_case_ref', 'campaign_title', 'project_name']
        read_only_fields = ['cree_par', 'cree_le', 'cree_par_nom', 'test_case_ref', 'campaign_title', 'project_name']