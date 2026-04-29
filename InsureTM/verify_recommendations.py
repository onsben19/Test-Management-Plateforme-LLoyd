import os
import django
import json

# Setup Django environment
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from analytics.recommendation_service import CatchupRecommendationManager

def verify():
    campaign_id = 33 # From the seed output

    manager = CatchupRecommendationManager()
    plan = manager.get_catchup_plan(campaign_id)
    
    print("\n--- Catchup Plan Verification ---")
    print(f"Campaign: {plan.get('campaign_title')}")
    print(f"Remaining Tests: {plan.get('remaining_tests')}")
    print(f"Required Velocity: {plan.get('required_velocity')} TC/day")
    print(f"Current Velocity: {plan.get('current_velocity')} TC/day")
    print(f"Delay Days: {plan.get('delay_days')}")
    
    print("\nTester Distribution:")
    for t in plan.get('tester_distribution', []):
        print(f"- {t['name']}:")
        print(f"  ML Score: {t['ml_score']} ({t['ml_label']})")
        print(f"  Current Load: {t['current_load']} TC/day (Overloaded: {t['is_overloaded']})")
        if 'recommended_extra' in t:
            print(f"  -> RECOMMENDED EXTRA: +{t['recommended_extra']} TC/day")
        if t.get('status') == 'OVERLOADED':
            print(f"  -> STATUS: OVERLOADED")

    print("\nML Actions:")
    for action in plan.get('ml_actions', []):
        print(f"- [{action['type'].upper()}] {action['title']}")
        print(f"  {action['description']}")

if __name__ == "__main__":
    verify()
