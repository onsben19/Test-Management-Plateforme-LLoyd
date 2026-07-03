from rest_framework import serializers
from django.contrib.auth import get_user_model

User = get_user_model()


class UserSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, required=False)
    avatar_url = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'role', 'first_name', 'last_name', 'is_active', 'password', 'phone_number', 'avatar', 'avatar_url']

    def get_avatar_url(self, obj):
        if obj.avatar:
            request = self.context.get('request')
            if request:
                url = request.build_absolute_uri(obj.avatar.url)
                # Force HTTPS in production (avoid mixed-content warnings)
                if url.startswith('http://'):
                    url = 'https://' + url[7:]
                return url
            return obj.avatar.url
        return None

    def update(self, instance, validated_data):
        password = validated_data.pop('password', None)
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        if password:
            instance.set_password(password)
        instance.save()
        return instance

class UserProfileUpdateSerializer(serializers.ModelSerializer):
    phone_number = serializers.CharField(required=False, allow_blank=True, allow_null=True)
    avatar = serializers.ImageField(required=False, allow_null=True)

    class Meta:
        model = User
        fields = ['first_name', 'last_name', 'email', 'phone_number', 'avatar']
        read_only_fields = ['email', 'first_name', 'last_name']

class UserRegistrationSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, required=False, allow_blank=True)

    class Meta:
        model = User
        fields = ['username', 'email', 'password', 'role', 'first_name', 'last_name']

    def create(self, validated_data):
        password = validated_data.pop('password', None)
        if not password:
            # We use the static method we added to the User model
            password = User.generate_random_password()
        
        user = User.objects.create(**validated_data)
        user.set_password(password)
        user.save()
        
        # Attach raw password to instance temporarily for the view to use
        user._raw_password = password
        return user