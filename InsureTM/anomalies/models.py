# models.py
from django.db import models
from django.conf import settings



class Anomalie(models.Model):
    # Lien direct avec le test case spécifique
    test_case = models.ForeignKey(
        'testCases.TestCase', 
        on_delete=models.CASCADE, 
        related_name='anomalies'
    )
    
    # Champs correspondant à ton interface visuelle
    titre = models.CharField(max_length=255)
    description = models.TextField()
    criticite = models.CharField(
        max_length=20, 
        choices=[('FAIBLE', 'Faible'), ('MOYENNE', 'Moyenne'), ('CRITIQUE', 'Critique')],
        default='FAIBLE'
    )
    
    # Preuve visuelle (Capture d'écran ou fichier)
    preuve_image = models.FileField(upload_to='anomalies/preuves/%Y/%m/%d/', blank=True, null=True)
    
    # Traçabilité du testeur
    cree_par = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    cree_le = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Bug: {self.titre} (Test: {self.test_case.test_case_ref})"