from rest_framework import serializers
from django.contrib.auth import get_user_model

User = get_user_model()

class UserSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, required=False)
    
    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'role', 'first_name', 'last_name', 'is_active', 'password']

    def update(self, instance, validated_data):
        password = validated_data.pop('password', None)
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        if password:
            instance.set_password(password)
        instance.save()
        return instance

class UserRegistrationSerializer(serializers.ModelSerializer):
    # On ajoute required=False et allow_blank=True pour que Postman ne bloque pas
    password = serializers.CharField(write_only=True, required=False, allow_blank=True)

    class Meta:
        model = User
        fields = ['username', 'email', 'password', 'role', 'first_name', 'last_name']

    def create(self, validated_data):
        # On retire le mot de passe de validated_data s'il est vide ou présent
        # car ta méthode save() dans le modèle va en générer un nouveau de toute façon.
        validated_data.pop('password', None)
        
        # On utilise create sans passer de password pour laisser le modèle agir
        user = User.objects.create(**validated_data)
        return user