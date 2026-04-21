import os
import django

# Set up Django environment
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from campaigns.models import Campaign
from testCases.models import TestCase
from Project.models import Project

def test_progression():
    # Create a dummy project and campaign
    project = Project.objects.create(name="Test Project")
    campaign = Campaign.objects.create(title="Test Campaign", project=project)
    
    # Add dummy test cases
    TestCase.objects.create(campaign=campaign, test_case_ref="TC01", status='PASSED')
    TestCase.objects.create(campaign=campaign, test_case_ref="TC02", status='FAILED')
    TestCase.objects.create(campaign=campaign, test_case_ref="TC03", status='PASSED')
    
    print(f"Total Test Cases: {campaign.test_cases.count()}")
    print(f"Passed Test Cases: {campaign.test_cases.filter(status='PASSED').count()}")
    print(f"Progression: {campaign.get_progression}%")
    
    # Cleanup
    campaign.delete()
    project.delete()

if __name__ == "__main__":
    test_progression()
