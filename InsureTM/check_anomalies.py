
import os
import django
import sys

# Setup Django environment
sys.path.append('/Users/user/Desktop/projet fe/InsureTM')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from anomalies.models import Anomalie

print(f"Total Anomalies: {Anomalie.objects.count()}")
for a in Anomalie.objects.all():
    print(f"ID: {a.id}, Titre: {a.titre}, Criticite: '{a.criticite}'")
