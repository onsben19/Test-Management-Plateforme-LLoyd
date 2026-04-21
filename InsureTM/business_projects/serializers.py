from rest_framework import serializers
from .models import BusinessProject

class BusinessProjectSerializer(serializers.ModelSerializer):
    created_by_username = serializers.ReadOnlyField(source='created_by.username')
    releases_count = serializers.IntegerField(source='releases.count', read_only=True)
    recent_releases = serializers.SerializerMethodField()

    class Meta:
        model = BusinessProject
        fields = [
            'id', 'name', 'description', 'created_at', 
            'created_by', 'created_by_username', 'releases_count',
            'recent_releases'
        ]
        read_only_fields = ['created_by']

    def get_recent_releases(self, obj):
        # On retourne les noms des 3 premières releases
        return list(obj.releases.all().values_list('name', flat=True)[:3])

    def create(self, validated_data):
        validated_data['created_by'] = self.context['request'].user
        return super().create(validated_data)
