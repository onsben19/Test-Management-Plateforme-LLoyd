from django.contrib import admin
from .models import BusinessProject

@admin.register(BusinessProject)
class BusinessProjectAdmin(admin.ModelAdmin):
    list_display = ('name', 'created_at', 'created_by')
    search_fields = ('name',)
    list_filter = ('created_at', 'created_by')
