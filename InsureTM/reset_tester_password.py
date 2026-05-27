import os
import django

# Setup Django environment
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from django.contrib.auth import get_user_model

User = get_user_model()

def align_passwords():
    print("🔄 Alignement des mots de passe de la base de données avec les identifiants de Playwright...")
    
    credentials = {
        'admin': 'admin123',
        'manager': '+WpKuC3Rt@O*',
        'tester': 'qpB&II@SzA7Q',
    }
    
    for username, password in credentials.items():
        try:
            user = User.objects.get(username=username)
            user.set_password(password)
            user.save()
            print(f"✅ Mot de passe réinitialisé avec succès pour l'utilisateur '{username}'")
        except User.DoesNotExist:
            print(f"ℹ️ L'utilisateur '{username}' n'existe pas en base, aucune action nécessaire.")
            
    print("🎉 Alignement des mots de passe terminé !")

if __name__ == "__main__":
    align_passwords()
