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

        tester_id = self.request.query_params.get('tester_id')
        if tester_id:
            queryset = queryset.filter(tester_id=tester_id)

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
        try:
            generated_code = groq_service.generate_playwright_test(title, manual_data)
            return Response({"code": generated_code})
        except Exception as e:
            error_msg = str(e)
            # Detect quota/rate-limit errors from Groq or Gemini
            if '429' in error_msg or 'quota' in error_msg.lower() or 'rate' in error_msg.lower():
                return Response({
                    "error": "quota_exceeded",
                    "message": "Les quotas journaliers des APIs IA (Groq + Gemini) sont épuisés. Réessayez demain ou configurez une clé API avec un plan payant."
                }, status=503)
            return Response({"error": "generation_failed", "message": error_msg}, status=500)

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
        """
        Starts Playwright execution in a background thread and returns IMMEDIATELY.
        The frontend polls live-logs/ to get progress and the final result.
        This prevents JWT expiry / thread pool starvation on long-running tests.
        """
        import threading, re, shutil
        test_case = self.get_object()
        path = test_case.automation_script_path
        if not path or not os.path.exists(path):
            return Response({"error": "Script not found"}, status=404)

        project_dir = os.path.abspath(os.path.join(settings.BASE_DIR, '..', 'project'))

        # Remove missing storageState to prevent ENOENT crash
        try:
            with open(path, 'r') as f:
                content = f.read()
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
        live_log_path = os.path.join(project_dir, 'test-results', f'live_{test_case.id}.log')
        result_path = os.path.join(project_dir, 'test-results', f'result_{test_case.id}.json')

        os.makedirs(os.path.dirname(live_log_path), exist_ok=True)

        # Remove stale result file from a previous run
        if os.path.exists(result_path):
            os.remove(result_path)

        # Write startup message so first poll is never empty
        with open(live_log_path, 'w') as f:
            f.write(f'▶ Démarrage du runner Playwright pour : {test_case.test_case_ref}\n')

        execution_mode = request.data.get('execution_mode', 'headless')  # 'headless' | 'headed' | 'ui'
        tester_id = request.user.id

        mode_label = {'headless': 'Headless ⚡', 'headed': 'Headed 👁️', 'ui': 'UI 🎮'}.get(execution_mode, 'Headless ⚡')

        # Overwrite startup message with mode info
        with open(live_log_path, 'w') as f:
            f.write(f'▶ Démarrage du runner Playwright pour : {test_case.test_case_ref}\n')
            f.write(f'▶ Mode d\'exécution : {mode_label}\n\n')

        def run_playwright():
            import json as _json
            from django.db import connection as _db_connection
            from django.core.files import File

            try:
                if os.path.exists(output_dir):
                    shutil.rmtree(output_dir)

                env = os.environ.copy()
                env['SKIP_WEBSERVER'] = 'true'
                env['PYTHONUNBUFFERED'] = '1'
                env['FORCE_COLOR'] = '0'
                env['CI'] = 'true'
                # DEBUG=pw:api streams each Playwright action to stdout as it executes
                env['DEBUG'] = 'pw:api'

                # Activate video recording via env var (playwright.config.ts reads PW_VIDEO)
                env['PW_VIDEO'] = 'on'

                # Build Playwright command based on execution_mode
                cmd = ['npx', 'playwright', 'test', path, f'--output={output_dir}', '--reporter=list']

                if execution_mode in ('headed', 'ui'):
                    # Use the existing Xvfb on :99 (started at container boot, watched by x11vnc + noVNC)
                    # Do NOT use xvfb-run — it creates a new display invisible to x11vnc
                    env['DISPLAY'] = ':99'
                    env['PW_HEADED'] = 'true'
                    cmd.append('--headed')
                    if execution_mode == 'ui':
                        env['PLAYWRIGHT_SLOWMO'] = '800'

                # Write stdout/stderr directly to file — bypasses Node.js pipe buffering
                with open(live_log_path, 'a') as live_log_file:
                    process = subprocess.Popen(
                        cmd,
                        cwd=project_dir,
                        stdout=live_log_file,
                        stderr=live_log_file,
                        env=env
                    )
                    returncode = process.wait()

                with open(live_log_path, 'r', errors='replace') as f:
                    logs = f.read()
                status = 'PASSED' if returncode == 0 else 'FAILED'

                # Persist to DB
                tc = TestCase.objects.get(pk=test_case.id)
                tc_data = tc.data_json or {}
                if not isinstance(tc_data, dict):
                    tc_data = {}
                tc_data['execution_logs'] = logs
                tc.data_json = tc_data
                tc.status = status
                tc.execution_date = timezone.now()
                from django.contrib.auth import get_user_model
                User = get_user_model()
                tc.tester = User.objects.get(pk=tester_id)

                # Screenshot + Video
                screenshot_path = None
                video_path = None
                for root, _, files in os.walk(output_dir):
                    for file in files:
                        if file.endswith('.png') and not screenshot_path:
                            screenshot_path = os.path.join(root, file)
                        if file.endswith('.webm') and not video_path:
                            video_path = os.path.join(root, file)
                    if screenshot_path and video_path:
                        break

                if screenshot_path and os.path.exists(screenshot_path):
                    with open(screenshot_path, 'rb') as f:
                        tc.proof_file.save(f'screenshot_tc_{tc.id}.png', File(f), save=False)

                if video_path and os.path.exists(video_path):
                    with open(video_path, 'rb') as f:
                        tc.proof_video.save(f'video_tc_{tc.id}.webm', File(f), save=False)

                anomaly_id = None
                if status == 'FAILED':
                    from anomalies.models import Anomalie
                    groq_service = GroqService()
                    try:
                        anomaly_title, anomaly_desc = groq_service.generate_anomaly_from_logs(tc.test_case_ref, logs)
                    except Exception as exc:
                        logger.error(f"Groq error: {exc}")
                        anomaly_title = f"Échec du test automatique : {tc.test_case_ref}"
                        anomaly_desc = "Le test a échoué. Diagnostic IA indisponible."

                    safe_title = str(anomaly_title).replace('\x00', '')[:250]
                    safe_desc = str(anomaly_desc).replace('\x00', '') + f"\n\n--- LOGS ---\n{logs.replace(chr(0), '')}"

                    anomaly = Anomalie(
                        test_case=tc,
                        titre=safe_title,
                        description=safe_desc,
                        impact='A_DEFINIR',
                        priorite='A_DEFINIR',
                        visibilite='PUBLIQUE',
                        statut='OUVERTE',
                        cree_par=User.objects.get(pk=tester_id)
                    )
                    if screenshot_path and os.path.exists(screenshot_path):
                        with open(screenshot_path, 'rb') as f:
                            anomaly.preuve_image.save(f'screenshot_tc_{tc.id}.png', File(f), save=False)
                    if video_path and os.path.exists(video_path):
                        with open(video_path, 'rb') as f:
                            anomaly.preuve_video.save(f'video_tc_{tc.id}.webm', File(f), save=False)
                    anomaly.save()
                    anomaly_id = anomaly.id

                tc.save()

                # Write result file so live-logs/ knows execution is done
                result = {
                    'status': status,
                    'logs': logs,
                    'anomaly_id': anomaly_id,
                    'video_path': video_path,
                }
                with open(result_path, 'w') as f:
                    _json.dump(result, f)

            except Exception as exc:
                import traceback as _tb
                logger.error(f"Playwright thread error: {_tb.format_exc()}")
                result = {'status': 'FAILED', 'logs': f'Erreur interne : {exc}', 'anomaly_id': None}
                with open(result_path, 'w') as f:
                    import json as _json2
                    _json2.dump(result, f)
            finally:
                # Remove live log file so live-logs/ endpoint knows execution ended
                if os.path.exists(live_log_path):
                    try:
                        os.remove(live_log_path)
                    except Exception:
                        pass
                _db_connection.close()

        thread = threading.Thread(target=run_playwright, daemon=True)
        thread.start()

        # Return immediately — frontend will poll live-logs/ for the result
        return Response({"status": "RUNNING", "id": test_case.id})

    @action(detail=True, methods=['get'], url_path='live-logs')
    def live_logs(self, request, pk=None):
        """Polling endpoint: returns logs in progress, or final result when done."""
        import json as _json
        test_case = self.get_object()
        project_dir = os.path.abspath(os.path.join(settings.BASE_DIR, '..', 'project'))
        live_log_path = os.path.join(project_dir, 'test-results', f'live_{test_case.id}.log')
        result_path = os.path.join(project_dir, 'test-results', f'result_{test_case.id}.json')

        # Execution still running — return current log content
        if os.path.exists(live_log_path):
            with open(live_log_path, 'r', errors='replace') as f:
                content = f.read()
            return Response({'logs': content, 'running': True})

        # Result file written by background thread — execution finished
        if os.path.exists(result_path):
            with open(result_path, 'r') as f:
                result = _json.load(f)
            os.remove(result_path)
            return Response({
                'logs': result.get('logs', ''),
                'running': False,
                'status': result.get('status'),
                'anomaly_id': result.get('anomaly_id'),
                'video_path': result.get('video_path'),
            })

        # Fallback: execution finished but no result file (old run or error)
        tc_data = test_case.data_json or {}
        stored_logs = tc_data.get('execution_logs', '') if isinstance(tc_data, dict) else ''
        return Response({'logs': stored_logs, 'running': False, 'status': test_case.status})

    @action(detail=True, methods=['get'], url_path='serve-video')
    def serve_video(self, request, pk=None):
        """Serves the latest recorded Playwright video (.webm) for this test case."""
        from django.http import FileResponse, Http404
        test_case = self.get_object()
        project_dir = os.path.abspath(os.path.join(settings.BASE_DIR, '..', 'project'))
        output_dir = os.path.join(project_dir, 'test-results', f'test_{test_case.id}')
        video_path = None
        if os.path.exists(output_dir):
            for root, _, files in os.walk(output_dir):
                for file in files:
                    if file.endswith('.webm'):
                        video_path = os.path.join(root, file)
                        break
                if video_path:
                    break
        if not video_path or not os.path.exists(video_path):
            raise Http404("Vidéo non trouvée")
        return FileResponse(open(video_path, 'rb'), content_type='video/webm', as_attachment=False)