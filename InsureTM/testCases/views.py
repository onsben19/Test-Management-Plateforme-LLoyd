from rest_framework import viewsets, permissions
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from django.db.models import Q
from .models import TestCase
from .serializers import TestCaseSerializer

class IsTesterOrAdmin(permissions.BasePermission):
    def has_permission(self, request, view):
        # Consultation autorisée pour tout utilisateur authentifié
        if view.action in ['list', 'retrieve']:
            return True
        # Création/Modification/Suppression réservée aux Testeurs et Admins
        return request.user.is_authenticated and request.user.role in ['TESTER', 'ADMIN']

class TestCaseViewSet(viewsets.ModelViewSet):
    queryset = TestCase.objects.all()
    serializer_class = TestCaseSerializer
    permission_classes = [permissions.IsAuthenticated, IsTesterOrAdmin]
    parser_classes = (MultiPartParser, FormParser, JSONParser)

    def create(self, request, *args, **kwargs):
        print(f"DEBUG: Create TestCase called.")
        print(f"DEBUG: request.FILES: {request.FILES}")
        print(f"DEBUG: request.data keys: {request.data.keys()}")
        if 'proof_file' in request.data:
            print(f"DEBUG: proof_file type: {type(request.data['proof_file'])}")
        
        serializer = self.get_serializer(data=request.data)
        if not serializer.is_valid():
            print(f"DEBUG: Serializer Errors: {serializer.errors}")
            return super().create(request, *args, **kwargs) # Let it fail naturally or return response
            
        return super().create(request, *args, **kwargs)

    def get_queryset(self):
        queryset = TestCase.objects.all()
        search = self.request.query_params.get('search', None)
        status = self.request.query_params.get('status', None)

        if search:
            queryset = queryset.filter(
                Q(test_case_ref__icontains=search) | 
                Q(campaign__title__icontains=search)
            )
        
        if status and status != 'ALL':
            queryset = queryset.filter(status=status)
            
        return queryset

    def perform_update(self, serializer):
        # Assign the current user as the tester ONLY if it's not an Admin update
        # If Admin, preserve the original tester unless it was None
        user = self.request.user
        if user.role == 'ADMIN':
            # Keep existing tester if possible. 
            # In update, if we don't pass 'tester', it remains unchanged in DB if partial=True?
            # Serializer.save(tester=...) forces it.
            # So checking existing instance:
            instance = serializer.instance
            if instance.tester:
                serializer.save() # Don't overwrite tester
            else:
                serializer.save(tester=user) # If was empty, assign Admin? Or leave empty? Let's assign.
        else:
            # For Testers/Managers executing the test, they become the tester
            serializer.save(tester=user)

        # Notification Logic
        if serializer.instance.status in ['PASSED', 'FAILED']:
            campaign = serializer.instance.campaign
            # Notify the manager (imported_by) or Admins if None
            recipient = campaign.imported_by
            recipients = [recipient] if recipient else []
            
            if not recipients:
                from django.contrib.auth import get_user_model
                recipients = list(get_user_model().objects.filter(role='ADMIN'))
                print("DEBUG: No imported_by, falling back to all ADMINS")

            for recipient in recipients:
                if recipient and recipient != user:
                    from notifications.models import Notification
                    Notification.objects.create(
                        recipient=recipient,
                        title=f"Test {serializer.instance.status}",
                        message=f"{user.username} a exécuté le test {serializer.instance.test_case_ref} : {serializer.instance.status}",
                        type='execution_validated',
                        related_campaign=campaign,
                        related_object_id=serializer.instance.id
                    )
                    print(f"DEBUG: Notification created for {recipient.username}")