from django.contrib.auth import get_user_model
from rest_framework.test import APITestCase
from rest_framework import status

from .models import Notification

User = get_user_model()


class NotificationAPITests(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            username='notif_tester',
            email='notif@test.com',
            password='testpass123',
            role='MANAGER',
        )
        self.client.force_authenticate(user=self.user)
        for i in range(12):
            Notification.objects.create(
                recipient=self.user,
                title=f'Notif {i}',
                message=f'Message {i}',
                type='info',
                is_read=i >= 5,
            )

    def test_list_returns_all_without_pagination(self):
        response = self.client.get('/api/notifications/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIsInstance(response.data, list)
        self.assertEqual(len(response.data), 12)

    def test_mark_all_read_updates_every_notification(self):
        response = self.client.post('/api/notifications/mark_all_read/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['updated'], 5)
        self.assertEqual(
            Notification.objects.filter(recipient=self.user, is_read=False).count(),
            0,
        )

    def test_mark_read_single_notification(self):
        notif = Notification.objects.filter(recipient=self.user, is_read=False).first()
        response = self.client.post(f'/api/notifications/{notif.id}/mark_read/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        notif.refresh_from_db()
        self.assertTrue(notif.is_read)
