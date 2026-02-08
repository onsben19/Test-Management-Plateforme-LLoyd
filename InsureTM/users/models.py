import secrets
import string
from django.contrib.auth.models import AbstractUser
from django.db import models

class User(AbstractUser):
    ROLE_CHOICES = (
        ('ADMIN', 'Administrateur'),
        ('MANAGER', 'Manager'),
        ('TESTER', 'Testeur'),
    )
    role = models.CharField(max_length=10, choices=ROLE_CHOICES, default='TESTER')

    def generate_random_password(self, length=12):
        """Génère une chaîne aléatoire de 12 caractères."""
        alphabet = string.ascii_letters + string.digits + string.punctuation
        return ''.join(secrets.choice(alphabet) for _ in range(length))

    def save(self, *args, **kwargs):
        # On génère un nouveau mot de passe seulement si l'utilisateur est créé
        # et qu'il n'a pas encore de mot de passe (ou qu'on veut le forcer à la création).
        if not self.pk and not self.password:
            new_password = self.generate_random_password()
            self.set_password(new_password)
            # LOG TEMPORAIRE (À supprimer après tes tests Postman !)
            print(f"ATTENTION : Nouveau mot de passe pour {self.username} : {new_password}")
        
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.username} - {self.role}"