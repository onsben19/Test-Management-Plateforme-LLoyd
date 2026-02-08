from django.contrib import admin
from django.contrib.auth.admin import UserAdmin
from .models import User

# Configuration pour afficher le champ 'role' dans l'admin Django
class CustomUserAdmin(UserAdmin):
    model = User
    list_display = ['username', 'email', 'role', 'is_staff']
    fieldsets = UserAdmin.fieldsets + (
        ('Informations de Rôle', {'fields': ('role',)}),
    )

admin.site.register(User, CustomUserAdmin)