import os
import django

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")
django.setup()

from users.models import User

def create_users():
    # Create Superuser (Admin)
    try:
        if not User.objects.filter(username='admin').exists():
            User.objects.create_superuser('admin', 'admin@example.com', 'admin', role='ADMIN')
            print("User 'admin' created")
        else:
            u = User.objects.get(username='admin')
            u.set_password('admin')
            u.role = 'ADMIN'
            u.save()
            print("User 'admin' updated")

        # Create Tester
        if not User.objects.filter(username='tester').exists():
            User.objects.create_user('tester', 'tester@example.com', 'tester', role='TESTER')
            print("User 'tester' created")
        else:
            u = User.objects.get(username='tester')
            u.set_password('tester')
            u.role = 'TESTER'
            u.save()
            print("User 'tester' updated")

        # Create Manager
        if not User.objects.filter(username='manager').exists():
            User.objects.create_user('manager', 'manager@example.com', 'manager', role='MANAGER')
            print("User 'manager' created")
        else:
            u = User.objects.get(username='manager')
            u.set_password('manager')
            u.role = 'MANAGER'
            u.save()
            print("User 'manager' updated")

    except Exception as e:
        print(f"Error creating users: {e}")

if __name__ == '__main__':
    create_users()
