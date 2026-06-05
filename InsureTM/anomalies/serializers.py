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

    playwright_script = serializers.SerializerMethodField()

    def get_playwright_script(self, obj):
        """Retourne le script Playwright généré par l'IA associé à ce cas de test."""
        try:
            return obj.test_case.automation_code if obj.test_case else None
        except AttributeError:
            return None

    def validate_preuve_image(self, value):
        if value:
            import hashlib
            hasher = hashlib.sha256()
            try:
                for chunk in value.chunks():
                    hasher.update(chunk)
                file_hash = hasher.hexdigest()
                
                # Check if hash already exists in base
                queryset = Anomalie.objects.filter(preuve_hash=file_hash)
                if self.instance:
                    queryset = queryset.exclude(id=self.instance.id)
                
                if queryset.exists():
                    raise serializers.ValidationError(
                        "Ce fichier de preuve existe déjà dans la base de données (doublon détecté via SHA-256)."
                    )
            except serializers.ValidationError:
                raise
            except Exception:
                pass
        return value

    class Meta:
        model = Anomalie
        fields = ['id', 'titre', 'description', 'impact', 'priorite', 'visibilite', 'statut', 'preuve_image', 'preuve_hash', 'cree_le', 'cree_par', 'cree_par_nom', 'test_case', 'test_case_ref', 'campaign_title', 'project_name', 'playwright_script']
        read_only_fields = ['cree_par', 'cree_le', 'cree_par_nom', 'preuve_hash', 'test_case_ref', 'campaign_title', 'project_name', 'playwright_script']