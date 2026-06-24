from django.apps import AppConfig

class BusinessProjectsConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'business_projects'
    verbose_name = 'Gestion des Projets'

    def ready(self):
        import business_projects.signals  # noqa: F401
