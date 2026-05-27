import os
import django
import sys
from datetime import timedelta
from django.utils import timezone

# Setup Django environment
sys.path.append('/app')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from django.contrib.auth import get_user_model
from testCases.models import TestCase
from campaigns.models import Campaign
from analytics.ml_service import MLTimelineGuard

User = get_user_model()

def run_scoring_test():
    print("=== Testing ML Recommendation Scoring (New Model) ===\n")
    
    # 1. Cleanup or Get/Create Test Users
    User.objects.filter(username__startswith='test_').delete()
    
    # Scenario 1: The Elite
    elite = User.objects.create_user(username='test_elite', email='elite@test.com', password='password123')
    # Simulate 500 tests in history
    # Scenario 2: The Overloaded
    busy = User.objects.create_user(username='test_busy', email='busy@test.com', password='password123')
    # Scenario 3: The Newcomer
    newbie = User.objects.create_user(username='test_newbie', email='newbie@test.com', password='password123')
    
    campaign = Campaign.objects.first()
    if not campaign:
        campaign = Campaign.objects.create(title="Test Campaign", nb_test_cases=100)

    # Fill Elite History
    now = timezone.now()
    for i in range(100): # 100 tests total
        execution_date = now - timedelta(days=i % 14) # active every day
        TestCase.objects.create(
            tester=elite, 
            campaign=campaign, 
            status='PASSED', 
            execution_date=execution_date,
            test_case_ref=f"REF-E-{i}"
        )
    
    # Fill Busy History + Pending
    for i in range(100):
        TestCase.objects.create(
            tester=busy, 
            campaign=campaign, 
            status='PASSED', 
            execution_date=now - timedelta(days=i % 14),
            test_case_ref=f"REF-B-{i}"
        )
    # Add 50 pending tests
    for i in range(50):
        TestCase.objects.create(
            tester=busy, 
            campaign=campaign, 
            status='PENDING',
            test_case_ref=f"REF-P-{i}"
        )

    guard = MLTimelineGuard()
    
    users = [
        ("ELITE (Regular, 100 tests, 0 pending)", elite),
        ("BUSY (Regular, 100 tests, 50 pending)", busy),
        ("NEWBIE (0 tests)", newbie)
    ]
    
    for desc, user in users:
        result = guard.score_tester(user.id)
        print(f"User: {desc}")
        print(f"  Score: {result['score']}")
        print(f"  Label: {result['label']}")
        print(f"  Metrics: {result['metrics']}")
        print("-" * 30)

    # Cleanup
    User.objects.filter(username__startswith='test_').delete()

if __name__ == "__main__":
    run_scoring_test()
