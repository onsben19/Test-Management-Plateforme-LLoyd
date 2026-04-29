import os
import django
from datetime import timedelta
from django.utils import timezone
import random

# Setup Django environment
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from django.contrib.auth import get_user_model
from Project.models import Project
from campaigns.models import Campaign
from testCases.models import TestCase

User = get_user_model()

def create_tester(username, role='TESTER'):
    user, created = User.objects.get_or_create(
        username=username,
        defaults={'email': f'{username}@example.com', 'role': role}
    )
    if created:
        user.set_password('password123')
        user.save()
    return user

def add_historical_tests(tester, campaign, count, status_ratio=1.0, days_back=14):
    """Adds historical test executions to a tester."""
    for i in range(count):
        status = 'PASSED' if random.random() < status_ratio else 'FAILED'
        # Random date between days_back and now
        random_days = random.randint(0, days_back)
        exec_date = timezone.now() - timedelta(days=random_days)
        
        tc = TestCase.objects.create(
            campaign=campaign,
            test_case_ref=f"HIST-{tester.username}-{i}",
            tester=tester,
            status=status
        )
        # Manually update execution_date since it's auto_now_add
        TestCase.objects.filter(id=tc.id).update(execution_date=exec_date)

def seed():
    print("Starting seeding for recommendation testing...")
    
    # 1. Create a Manager
    manager = create_tester('manager_rec', 'MANAGER')
    
    # 2. Create a Project
    project, _ = Project.objects.get_or_create(
        name="Project Rec Testing",
        defaults={'description': "Testing recommendation engine", 'created_by': manager}
    )
    
    # 3. Create a Campaign with high pressure
    # 1000 tests total, only ~100 done, deadline tomorrow
    campaign = Campaign.objects.create(
        project=project,
        title="CRITICAL High Pressure Campaign",
        nb_test_cases=1000,
        start_date=timezone.now().date() - timedelta(days=5),
        estimated_end_date=timezone.now().date() + timedelta(days=1),
        imported_by=manager
    )

    
    # 4. Create Testers with different profiles
    expert = create_tester('tester_expert')
    low_performer = create_tester('tester_low')
    overloaded = create_tester('tester_overloaded')
    new_tester = create_tester('tester_new')
    
    # Assign them to the campaign
    campaign.assigned_testers.add(expert, low_performer, overloaded, new_tester)
    
    print(f"Testers created and assigned to campaign '{campaign.title}'")
    
    # 5. Populate History
    
    # Expert: 50+ tests in last 14 days, 100% success, high velocity
    print("Seeding expert history...")
    for day in range(14):
        # 6-8 tests per day
        for i in range(random.randint(6, 8)):

            exec_date = timezone.now() - timedelta(days=day)
            tc = TestCase.objects.create(
                campaign=campaign,
                test_case_ref=f"EXPERT-D{day}-T{i}",
                tester=expert,
                status='PASSED'
            )
            TestCase.objects.filter(id=tc.id).update(execution_date=exec_date)
            
    # Low Performer: 20 tests, 40% success, infrequent activity
    print("Seeding low performer history...")
    for i in range(20):
        status = 'PASSED' if random.random() < 0.4 else 'FAILED'
        exec_date = timezone.now() - timedelta(days=random.randint(0, 14))
        tc = TestCase.objects.create(
            campaign=campaign,
            test_case_ref=f"LOW-T{i}",
            tester=low_performer,
            status=status
        )
        TestCase.objects.filter(id=tc.id).update(execution_date=exec_date)
        
    # Overloaded Tester: High activity in last 3 days
    print("Seeding overloaded tester history...")
    # Historical base (to get a good ML score but high load)
    for i in range(10):
        tc = TestCase.objects.create(
            campaign=campaign,
            test_case_ref=f"OV-HIST-T{i}",
            tester=overloaded,
            status='PASSED'
        )
        TestCase.objects.filter(id=tc.id).update(execution_date=timezone.now() - timedelta(days=10))
        
    # Recent high load (10 tests/day for last 3 days)
    for day in range(3):
        for i in range(10):
            exec_date = timezone.now() - timedelta(days=day)
            tc = TestCase.objects.create(
                campaign=campaign,
                test_case_ref=f"OV-RECENT-D{day}-T{i}",
                tester=overloaded,
                status='PASSED'
            )
            TestCase.objects.filter(id=tc.id).update(execution_date=exec_date)
            
    # New Tester: No history at all.
    print("New tester left with no history.")
    
    print("Seeding completed successfully!")
    print(f"Campaign ID: {campaign.id}")

if __name__ == "__main__":
    seed()
