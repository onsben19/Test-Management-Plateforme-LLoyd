from django.urls import re_path
from . import consumers

websocket_urlpatterns = [
    re_path(r'ws/testcases/(?P<test_case_id>\d+)/logs/$', consumers.TestCaseLogsConsumer.as_asgi()),
]
