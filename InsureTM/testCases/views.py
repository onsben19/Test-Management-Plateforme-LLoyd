import logging
import os
import subprocess
from django.utils import timezone

from django.db.models import Q
from django.contrib.auth import get_user_model
from rest_framework import viewsets, permissions
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from django.conf import settings
from analytics.groq_service import GroqService
from anomalies.models import Anomalie

from notifications.models import Notification
from utils.email_service import send_execution_validated_email
from .models import TestCase
from .serializers import TestCaseSerializer

logger = logging.getLogger(__name__)


class IsTesterOrAdmin(permissions.BasePermission):
    """Allow read access to all authenticated users; write access only to Testers, Admins, and Managers."""

    def has_permission(self, request, view):
        if view.action in ['list', 'retrieve']:
            return True
        return request.user.is_authenticated and request.user.role in ['TESTER', 'ADMIN', 'MANAGER']


class TestCaseViewSet(viewsets.ModelViewSet):
    queryset = TestCase.objects.all()
    serializer_class = TestCaseSerializer
    permission_classes = [permissions.IsAuthenticated, IsTesterOrAdmin]
    parser_classes = (MultiPartParser, FormParser, JSONParser)

    def get_queryset(self):
        queryset = TestCase.objects.all()
        
        if self.request.user.role == 'TESTER':
            from campaigns.models import TaskAssignment
            assigned_tasks = TaskAssignment.objects.filter(tester=self.request.user)
            q_filter = Q(tester=self.request.user)
            for task in assigned_tasks:
                q_filter |= Q(campaign=task.campaign, test_case_ref=task.test_case_ref)
            queryset = queryset.filter(q_filter)

        search = self.request.query_params.get('search')
        status = self.request.query_params.get('status')
        ordering = self.request.query_params.get('ordering')

        if search:
            queryset = queryset.filter(
                Q(test_case_ref__icontains=search) |
                Q(campaign__title__icontains=search)
            )

        if status and status != 'ALL':
            queryset = queryset.filter(status=status)
            
        if ordering:
            queryset = queryset.order_by(ordering)

        return queryset

    def perform_update(self, serializer):
        user = self.request.user
        instance = self.get_object()
        old_status = instance.status
        old_tester = instance.tester

        # If Admin or Manager is editing, keep original tester unless deliberately changed?
        if user.role in ['ADMIN', 'MANAGER'] and instance.tester:
            serializer.save()
        else:
            serializer.save(tester=user)

        updated = serializer.instance
        campaign = updated.campaign

        # 1. Notify Manager of Execution Results (PASSED/FAILED)
        if updated.status in ['PASSED', 'FAILED'] and old_status != updated.status:
            updated.execution_date = timezone.now()
            updated.save()
            
            recipients = set()
            if campaign and campaign.imported_by:
                recipients.add(campaign.imported_by)
            # Add all Admins if no specific manager
            if not recipients:
                recipients.update(get_user_model().objects.filter(role='ADMIN'))
            
            recipients.discard(user)
            for r in recipients:
                Notification.objects.create(
                    recipient=r,
                    title=f"Test {updated.status}",
                    message=f"{user.username} a exécuté le test {updated.test_case_ref} : {updated.status}",
                    type='execution_validated',
                    related_campaign=campaign,
                    related_object_id=updated.id,
                )
                if r.email:
                    send_execution_validated_email(r, user, updated)

        # 2. Notify Tester if Admin/Manager changed status or re-assigned
        if user.role in ['ADMIN', 'MANAGER'] and updated.tester and user != updated.tester:
            if old_status != updated.status or old_tester != updated.tester:
                Notification.objects.create(
                    recipient=updated.tester,
                    title="Mise à jour de Test",
                    message=f"L'encadrement a mis à jour votre test {updated.test_case_ref} : {updated.status}",
                    type='info',
                    related_campaign=campaign,
                    related_object_id=updated.id
                )

    def perform_destroy(self, instance):
        campaign = instance.campaign
        tester = instance.tester
        manager = campaign.imported_by if campaign else None
        
        recipients = set()
        if tester: recipients.add(tester)
        if manager: recipients.add(manager)
        recipients.discard(self.request.user)
        
        for r in recipients:
            Notification.objects.create(
                recipient=r,
                title="Cas de test Supprimé",
                message=f"Le cas de test {instance.test_case_ref} a été supprimé.",
                type='info'
            )
        instance.delete()

    @action(detail=True, methods=['post'], url_path='generate-script')
    def generate_script(self, request, pk=None):
        test_case = self.get_object()
        groq_service = GroqService()
        title = test_case.test_case_ref
        
        manual_data = request.data.get('manual_data')
        data = manual_data if manual_data else test_case.data_json
        
        generated_code = groq_service.generate_playwright_test(title, data)
        test_case.automation_code = generated_code
        test_case.save()
        return Response({"code": generated_code})

    @action(detail=False, methods=['post'], url_path='generate-script-standalone')
    def generate_script_standalone(self, request):
        title = request.data.get('title', 'Test')
        manual_data = request.data.get('manual_data')
        if not manual_data:
            return Response({"error": "manual_data is required"}, status=400)
            
        groq_service = GroqService()
        generated_code = groq_service.generate_playwright_test(title, manual_data)
        return Response({"code": generated_code})

    @action(detail=True, methods=['post'], url_path='save-script')
    def save_script(self, request, pk=None):
        test_case = self.get_object()
        code = request.data.get('code')
        if not code:
            return Response({"error": "No code provided"}, status=400)
            
        test_case.automation_code = code
        test_case.is_automated = True
        
        tests_dir = os.path.abspath(os.path.join(settings.BASE_DIR, '..', 'project', 'tests', 'generated'))
        os.makedirs(tests_dir, exist_ok=True)
        filename = f"test_{test_case.id}_{test_case.test_case_ref}.spec.ts".replace(" ", "_").replace("/", "_")
        filepath = os.path.join(tests_dir, filename)
        
        # Inject screenshot, baseURL and storageState config based on user role
        frontend_url = os.environ.get('FRONTEND_URL', 'http://nginx')
        
        role = request.user.role.lower() if request.user and getattr(request.user, 'role', None) else 'tester'
        if role not in ['manager', 'tester']:
            role = 'tester'
            
        storage_state_path = f"tests/{role}/.auth/{role}.json"
        
        config_injection = f"test.use({{ screenshot: 'on', baseURL: '{frontend_url}', storageState: '{storage_state_path}' }});\n"
            
        if 'test.use' not in code:
            code = code.replace("from '@playwright/test';", f"from '@playwright/test';\n\n{config_injection}")

        with open(filepath, 'w') as f:
            f.write(code)
            
        test_case.automation_script_path = filepath
        test_case.save()
        return Response({"status": "success", "path": filepath})

    @action(detail=True, methods=['post'], url_path='execute-script')
    def execute_script(self, request, pk=None):
        test_case = self.get_object()
        path = test_case.automation_script_path
        if not path or not os.path.exists(path):
            return Response({"error": "Script not found"}, status=404)
            
        project_dir = os.path.abspath(os.path.join(settings.BASE_DIR, '..', 'project'))
        
        # Check if storageState path exists, if not, remove it to prevent ENOENT crash
        try:
            with open(path, 'r') as f:
                content = f.read()
            import re
            storage_match = re.search(r'storageState:\s*(["\'])(.*?)\1', content)
            if storage_match:
                storage_rel_path = storage_match.group(2)
                storage_abs_path = os.path.abspath(os.path.join(project_dir, storage_rel_path))
                if not os.path.exists(storage_abs_path):
                    new_content = re.sub(r',\s*storageState:\s*(["\'])(.*?)\1', '', content)
                    new_content = re.sub(r'storageState:\s*(["\'])(.*?)\1\s*,?', '', new_content)
                    if new_content != content:
                        with open(path, 'w') as f:
                            f.write(new_content)
        except Exception as e:
            logger.error(f"Failed to check/remove missing storageState: {e}")
            
        output_dir = os.path.join(project_dir, 'test-results', f'test_{test_case.id}')
        
        try:
            import shutil
            if os.path.exists(output_dir):
                shutil.rmtree(output_dir)
                
            from channels.layers import get_channel_layer
            from asgiref.sync import async_to_sync
            channel_layer = get_channel_layer()
            group_name = f'testcase_logs_{test_case.id}'

            env = os.environ.copy()
            env['SKIP_WEBSERVER'] = 'true'

            process = subprocess.Popen(
                ['npx', 'playwright', 'test', path, f'--output={output_dir}'],
                cwd=project_dir,
                stdout=subprocess.PIPE,
                stderr=subprocess.STDOUT,
                text=True,
                bufsize=1,
                env=env
            )

            logs_list = []
            for line in iter(process.stdout.readline, ''):
                logs_list.append(line)
                if channel_layer:
                    async_to_sync(channel_layer.group_send)(
                        group_name,
                        {
                            "type": "log_message",
                            "message": line
                        }
                    )

            process.stdout.close()
            returncode = process.wait()
            logs = "".join(logs_list)
            status = 'PASSED' if returncode == 0 else 'FAILED'
            
            # Save logs to TestCase data_json
            tc_data = test_case.data_json or {}
            if not isinstance(tc_data, dict):
                tc_data = {}
            tc_data['execution_logs'] = logs
            test_case.data_json = tc_data
            
            test_case.status = status
            test_case.execution_date = timezone.now()
            test_case.tester = request.user
            
            # Look for the screenshot (captured by Playwright)
            from django.core.files import File
            screenshot_path = None
            for root, _, files in os.walk(output_dir):
                for file in files:
                    if file.endswith('.png'):
                        screenshot_path = os.path.join(root, file)
                        break
                if screenshot_path: break
            
            if screenshot_path and os.path.exists(screenshot_path):
                with open(screenshot_path, 'rb') as f:
                    file_obj = File(f)
                    test_case.proof_file.save(f'screenshot_tc_{test_case.id}.png', file_obj, save=False)
            
            if status == 'FAILED':
                from anomalies.models import Anomalie
                
                groq_service = GroqService()
                try:
                    anomaly_title, anomaly_desc = groq_service.generate_anomaly_from_logs(test_case.test_case_ref, logs)
                except Exception as e:
                    logger.error(f"Erreur lors de l'appel LLM Groq : {e}")
                    anomaly_title = f"Échec du test automatique : {test_case.test_case_ref}"
                    anomaly_desc = "Le test a échoué. Le diagnostic IA n'a pas pu être généré suite à une erreur technique de l'API LLM."
                
                # Sanitize to prevent DB errors and append raw logs
                safe_title = str(anomaly_title).replace('\x00', '')[:250]
                safe_desc = str(anomaly_desc).replace('\x00', '') + f"\n\n--- LOGS D'EXÉCUTION ---\n{logs.replace(chr(0), '')}"
                
                anomaly = Anomalie(
                    test_case=test_case,
                    titre=safe_title,
                    description=safe_desc,
                    impact='A_DEFINIR',
                    priorite='A_DEFINIR',
                    visibilite='PUBLIQUE',
                    statut='OUVERTE',
                    cree_par=request.user
                )
                
                if screenshot_path and os.path.exists(screenshot_path):
                    with open(screenshot_path, 'rb') as f:
                        file_obj = File(f)
                        anomaly.preuve_image.save(f'screenshot_tc_{test_case.id}.png', file_obj, save=False)
                        
                anomaly.save()

            test_case.save()

            response_data = {
                "status": test_case.status,
                "logs": logs
            }
            if status == 'FAILED' and 'anomaly' in locals():
                response_data["anomaly_id"] = anomaly.id
                
            return Response(response_data)
        except Exception as e:
            import traceback; traceback.print_exc(); return Response({"error": str(e)}, status=500)