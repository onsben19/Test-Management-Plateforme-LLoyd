import logging
import secrets
import string

from django.contrib.auth.models import AbstractUser
from django.db import models

logger = logging.getLogger(__name__)


class User(AbstractUser):
    ROLE_CHOICES = (
        ('ADMIN', 'Administrateur'),
        ('MANAGER', 'Manager'),
        ('TESTER', 'Testeur'),
    )
    role = models.CharField(max_length=10, choices=ROLE_CHOICES, default='TESTER')

    def _generate_random_password(self, length=12):
        """Génère un mot de passe aléatoire de longueur `length`."""
        alphabet = string.ascii_letters + string.digits + string.punctuation
        return ''.join(secrets.choice(alphabet) for _ in range(length))

    def save(self, *args, **kwargs):
        if not self.pk and not self.password:
            new_password = self._generate_random_password()
            self.set_password(new_password)
            logger.info("New user '%s' created with an auto-generated password.", self.username)
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.username} ({self.role})"