from rest_framework import serializers
from .models import Project

class ProjectSerializer(serializers.ModelSerializer):
    # Champ calculé que nous avons défini dans le modèle
    # Champ calculé pour afficher le nom de l'utilisateur
    created_by_username = serializers.ReadOnlyField(source='created_by.username')

    class Meta:
        model = Project
        fields = ['id', 'name', 'description', 'status', 'created_at', 'created_by', 'created_by_username', 'campaign_count']