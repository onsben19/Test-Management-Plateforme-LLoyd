from django.db import models
from django.conf import settings

class Campaign(models.Model):
    # IMPORTANT : Ne pas importer Project. Utiliser 'Project.Project'
    project = models.ForeignKey(
        'Project.Project', 
        on_delete=models.CASCADE, 
        related_name='campaigns'
    )
    
    title = models.CharField(max_length=200)
    start_date = models.DateField(null=True, blank=True)
    estimated_end_date = models.DateField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    excel_file = models.FileField(upload_to='campaigns/referentiels/%Y/%m/%d/')
    is_processed = models.BooleanField(default=False)

    description = models.TextField(blank=True, null=True)
    nb_test_cases = models.IntegerField(default=0)
    imported_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, 
        on_delete=models.SET_NULL, 
        null=True, 
        related_name='imported_campaigns'
    )
    
    assigned_testers = models.ManyToManyField(
        settings.AUTH_USER_MODEL, 
        related_name='assigned_campaigns',
        blank=True
    )

    def __str__(self):
        return f"{self.title} (Project: {self.project.name})"

class TaskAssignment(models.Model):
    campaign = models.ForeignKey(Campaign, on_delete=models.CASCADE, related_name='tasks')
    tester = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    test_case_ref = models.CharField(max_length=100) 
    assigned_at = models.DateTimeField(auto_now_add=True)
    is_completed = models.BooleanField(default=False)

    class Meta:
        # Correction : Ajout du nom de l'app si nécessaire, mais ici unique_together est local
        unique_together = ('campaign', 'test_case_ref')