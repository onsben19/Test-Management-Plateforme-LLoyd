import os

BACKEND_URL = os.environ.get('BACKEND_URL', 'http://backend:8000')


def test_create_campaign():
    url = f"{BACKEND_URL.rstrip('/')}/api/campaigns/"
    pass

if __name__ == "__main__":
    pass
