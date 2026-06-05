from django.test import TestCase
from config.asgi import application
from testCases.models import TestCase as TestCaseModel
from campaigns.models import Campaign
from Project.models import Project
from django.contrib.auth import get_user_model
from channels.layers import get_channel_layer
from asgiref.sync import async_to_sync
from channels.testing import WebsocketCommunicator

User = get_user_model()

class TestCaseLogsConsumerTest(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(username='tester', email='tester@lloyd.com', password='password')
        self.project = Project.objects.create(name='Project 1')
        self.campaign = Campaign.objects.create(title='Campaign 1', project=self.project)
        self.test_case = TestCaseModel.objects.create(
            test_case_ref='TC_01',
            campaign=self.campaign
        )

    def test_logs_websocket_stream(self):
        async def run_test():
            communicator = WebsocketCommunicator(
                application, 
                f"/ws/testcases/{self.test_case.id}/logs/"
            )
            connected, _ = await communicator.connect()
            self.assertTrue(connected)
            
            channel_layer = get_channel_layer()
            await channel_layer.group_send(
                f"testcase_logs_{self.test_case.id}",
                {
                    "type": "log_message",
                    "message": "Playwright test started\n"
                }
            )
            
            response = await communicator.receive_json_from()
            self.assertEqual(response["type"], "log")
            self.assertEqual(response["message"], "Playwright test started\n")
            
            await communicator.disconnect()
            
        async_to_sync(run_test)()


from django.core.files.uploadedfile import SimpleUploadedFile
from testCases.serializers import TestCaseSerializer
from rest_framework.exceptions import ValidationError

class TestCaseSHAProofTestCase(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(username='tester2', email='tester2@lloyd.com', password='password')
        self.project = Project.objects.create(name='Project 2')
        self.campaign = Campaign.objects.create(title='Campaign 2', project=self.project)

    def test_sha256_hash_calculated_on_save(self):
        file_content = b"my unique proof content"
        uploaded_file = SimpleUploadedFile("proof.png", file_content, content_type="image/png")
        
        tc = TestCaseModel.objects.create(
            test_case_ref='TC_02',
            campaign=self.campaign,
            tester=self.user,
            proof_file=uploaded_file
        )
        
        # Vérifie que le hash a été calculé
        self.assertIsNotNone(tc.proof_hash)
        self.assertEqual(len(tc.proof_hash), 64)

    def test_duplicate_proof_file_rejected_by_serializer(self):
        file_content = b"same proof image content"
        file1 = SimpleUploadedFile("proof1.png", file_content, content_type="image/png")
        file2 = SimpleUploadedFile("proof2.png", file_content, content_type="image/png")
        
        # Enregistre le premier cas de test
        tc1 = TestCaseModel.objects.create(
            test_case_ref='TC_03',
            campaign=self.campaign,
            tester=self.user,
            proof_file=file1
        )
        self.assertIsNotNone(tc1.proof_hash)
        
        # Essaye de valider un second cas de test avec le même contenu de preuve
        serializer_data = {
            'campaign': self.campaign.id,
            'test_case_ref': 'TC_04',
            'tester': self.user.id,
            'proof_file': file2,
            'status': 'PASSED'
        }
        
        serializer = TestCaseSerializer(data=serializer_data)
        with self.assertRaises(ValidationError) as context:
            serializer.is_valid(raise_exception=True)
            
        self.assertIn("Ce fichier de preuve existe déjà dans la base de données (doublon détecté via SHA-256).", str(context.exception))

