from django.test import TestCase
from django.core.files.uploadedfile import SimpleUploadedFile
from django.contrib.auth import get_user_model
from testCases.models import TestCase as TestCaseModel
from campaigns.models import Campaign
from Project.models import Project
from .models import Anomalie
from .serializers import AnomalieSerializer
from rest_framework.exceptions import ValidationError

User = get_user_model()

class AnomalieSHAProofTestCase(TestCase):
    def setUp(self):
        # Create user, project, campaign, and test case
        self.user = User.objects.create_user(username='tester', email='tester@lloyd.com', password='password')
        self.project = Project.objects.create(name='Project Lloyd')
        self.campaign = Campaign.objects.create(title='Campaign 1', project=self.project)
        self.test_case = TestCaseModel.objects.create(
            test_case_ref='TC_01',
            campaign=self.campaign
        )
        
        # Create test files
        self.file_content_1 = b"unique file content 1"
        self.file_content_2 = b"unique file content 2"
        
        self.file_1 = SimpleUploadedFile("proof1.png", self.file_content_1, content_type="image/png")
        self.file_2 = SimpleUploadedFile("proof2.png", self.file_content_2, content_type="image/png")
        self.file_1_duplicate = SimpleUploadedFile("proof1_dup.png", self.file_content_1, content_type="image/png")

    def test_proof_hash_auto_generation(self):
        # Create an anomaly with a proof file
        anomaly = Anomalie.objects.create(
            test_case=self.test_case,
            titre="Bug 1",
            description="Description 1",
            cree_par=self.user,
            preuve_image=self.file_1
        )
        # Check that hash is computed
        self.assertIsNotNone(anomaly.preuve_hash)
        self.assertEqual(len(anomaly.preuve_hash), 64) # SHA-256 is 64 hex characters
        
        # Check hash value is correct
        import hashlib
        expected_hash = hashlib.sha256(self.file_content_1).hexdigest()
        self.assertEqual(anomaly.preuve_hash, expected_hash)

    def test_serializer_rejects_duplicate_hash(self):
        # Save first anomaly
        Anomalie.objects.create(
            test_case=self.test_case,
            titre="Bug 1",
            description="Description 1",
            cree_par=self.user,
            preuve_image=self.file_1
        )
        
        # Create serializer data for a second anomaly with the same file
        data = {
            'test_case': self.test_case.id,
            'titre': "Bug 2",
            'description': "Description 2",
            'preuve_image': self.file_1_duplicate,
            'cree_par': self.user.id
        }
        
        serializer = AnomalieSerializer(data=data)
        # It should fail validation
        with self.assertRaises(ValidationError) as context:
            serializer.is_valid(raise_exception=True)
        
        self.assertIn("preuve_image", context.exception.detail)
        self.assertIn("Ce fichier de preuve existe déjà", str(context.exception.detail["preuve_image"][0]))

    def test_serializer_allows_different_hash(self):
        # Save first anomaly
        Anomalie.objects.create(
            test_case=self.test_case,
            titre="Bug 1",
            description="Description 1",
            cree_par=self.user,
            preuve_image=self.file_1
        )
        
        # Create serializer data for a second anomaly with a different file
        data = {
            'test_case': self.test_case.id,
            'titre': "Bug 2",
            'description': "Description 2",
            'preuve_image': self.file_2,
            'cree_par': self.user.id
        }
        
        serializer = AnomalieSerializer(data=data)
        self.assertTrue(serializer.is_valid())


class AnomalieSearchTestCase(TestCase):
    def setUp(self):
        self.manager = User.objects.create_user(
            username='manager',
            email='manager@lloyd.com',
            password='password',
            role='MANAGER',
        )
        self.project = Project.objects.create(name='Project Lloyd')
        self.campaign = Campaign.objects.create(title='Campaign 1', project=self.project)
        self.test_case = TestCaseModel.objects.create(
            test_case_ref='TC_01',
            campaign=self.campaign,
        )
        self.anomaly = Anomalie.objects.create(
            test_case=self.test_case,
            titre='Bug login',
            description='Erreur OTP',
            cree_par=self.manager,
        )

    def test_search_by_anomaly_id(self):
        from rest_framework.test import APIClient
        client = APIClient()
        client.force_authenticate(user=self.manager)
        response = client.get('/api/anomalies/', {'search': str(self.anomaly.id)})
        self.assertEqual(response.status_code, 200)
        results = response.data.get('results', response.data)
        self.assertEqual(len(results), 1)
        self.assertEqual(results[0]['id'], self.anomaly.id)

    def test_search_by_hash_prefixed_id(self):
        from rest_framework.test import APIClient
        client = APIClient()
        client.force_authenticate(user=self.manager)
        response = client.get('/api/anomalies/', {'search': f'#{self.anomaly.id}'})
        self.assertEqual(response.status_code, 200)
        results = response.data.get('results', response.data)
        self.assertEqual(len(results), 1)
        self.assertEqual(results[0]['id'], self.anomaly.id)

    def test_numeric_search_excludes_unrelated_ids(self):
        from rest_framework.test import APIClient

        other = Anomalie.objects.create(
            test_case=self.test_case,
            titre='Autre bug',
            description='Sans lien',
            cree_par=self.manager,
        )
        client = APIClient()
        client.force_authenticate(user=self.manager)
        response = client.get('/api/anomalies/', {'search': str(self.anomaly.id)})
        self.assertEqual(response.status_code, 200)
        results = response.data.get('results', response.data)
        ids = {item['id'] for item in results}
        self.assertIn(self.anomaly.id, ids)
        self.assertNotIn(other.id, ids)
