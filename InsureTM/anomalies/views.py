import logging
from django.contrib.auth import get_user_model
from django.db.models import Q
from django.http import HttpResponse
from datetime import datetime
from fpdf import FPDF

from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated
from rest_framework.parsers import MultiPartParser, FormParser
from rest_framework.decorators import action

from notifications.models import Notification
from utils.email_service import send_anomaly_reported_email, send_anomaly_updated_email
from .models import Anomalie
from .serializers import AnomalieSerializer

logger = logging.getLogger(__name__)

class AnomalieViewSet(viewsets.ModelViewSet):
    queryset = Anomalie.objects.all()
    serializer_class = AnomalieSerializer
    permission_classes = [IsAuthenticated]
    parser_classes = (MultiPartParser, FormParser)

    def get_queryset(self):
        queryset = Anomalie.objects.all()
        search = self.request.query_params.get('search')
        criticite = self.request.query_params.get('criticite')

        if search:
            queryset = queryset.filter(Q(titre__icontains=search) | Q(description__icontains=search))

        if criticite and criticite != 'ALL' and criticite != 'Tout':
            queryset = queryset.filter(criticite=criticite.upper())

        ordering = self.request.query_params.get('ordering')
        if ordering:
            queryset = queryset.order_by(ordering)

        return queryset

    def perform_create(self, serializer):
        instance = serializer.save(cree_par=self.request.user)

        test_case = instance.test_case
        if not (test_case and test_case.campaign):
            return

        campaign = test_case.campaign
        recipient = campaign.imported_by
        recipients = [recipient] if recipient else list(
            get_user_model().objects.filter(role='ADMIN')
        )

        for r in recipients:
            if r and r != self.request.user:
                Notification.objects.create(
                    recipient=r,
                    title="Nouvelle Anomalie",
                    message=f"{self.request.user.username} a signalé une anomalie sur {test_case.test_case_ref}",
                    type='anomaly_reported',
                    related_campaign=campaign,
                    related_object_id=instance.id,
                )
                if r.email:
                    send_anomaly_reported_email(r, self.request.user, instance, test_case)

    def perform_update(self, serializer):
        old_instance = self.get_object()
        old_status = old_instance.statut
        instance = serializer.save()
        
        # Notify stakeholders if status or priority changed
        if old_status != instance.statut or 'criticite' in serializer.validated_data:
            test_case = instance.test_case
            if test_case and test_case.campaign:
                campaign = test_case.campaign
                manager = campaign.imported_by
                reporter = instance.cree_par
                
                recipients = set()
                if manager: recipients.add(manager)
                if reporter: recipients.add(reporter)
                recipients.discard(self.request.user)
                
                for r in recipients:
                    Notification.objects.create(
                        recipient=r,
                        title="Anomalie Mise à jour",
                        message=f"L'anomalie #{instance.id} a été mise à jour : {instance.statut}",
                        type='anomaly_reported',
                        related_campaign=campaign,
                        related_object_id=instance.id
                    )
                    if r.email:
                        send_anomaly_updated_email(r, self.request.user, instance)

    @action(detail=False, methods=['get'])
    def export_pdf(self, request):
        queryset = self.get_queryset()
        
        class PDF(FPDF):
            def header(self):
                self.set_fill_color(239, 68, 68) # Red-500
                self.rect(0, 0, 300, 10, 'F')
                self.set_font('helvetica', 'B', 24)
                self.set_text_color(30, 41, 59) # Slate-800
                self.cell(0, 30, "Rapport d'Anomalies - InsureTM", ln=True, align='L')
                self.set_font('helvetica', 'I', 10)
                self.set_text_color(100, 116, 139) # Slate-500
                self.cell(0, 10, f"Généré le {datetime.now().strftime('%d/%m/%Y à %H:%M')}", ln=True, align='L')
                self.ln(5)

        pdf = PDF()
        pdf.add_page()
        pdf.set_font('helvetica', 'B', 10)
        pdf.set_fill_color(248, 250, 252) # Slate-50
        pdf.set_text_color(71, 85, 105) # Slate-600
        
        headers = [('ID', 15), ('Titre / Description', 100), ('Gravité', 30), ('Projet', 40), ('Test lié', 40), ('Date', 25)]
        for h, w in headers:
            pdf.cell(w, 10, h, border=1, align='L', fill=True)
        pdf.ln()

        pdf.set_font('helvetica', '', 9)
        pdf.set_text_color(30, 41, 59) # Slate-800
        fill = False
        for an in queryset:
            text_y = pdf.get_y()
            if text_y > 175:
                pdf.add_page()
                text_y = pdf.get_y()
            pdf.set_font('helvetica', 'B', 9)
            pdf.cell(15, 12, f"#{an.id}", border='TB', fill=fill)
            pdf.set_x(25)
            desc = (an.description or "")[:120] + "..." if an.description and len(an.description) > 120 else (an.description or "")
            pdf.multi_cell(100, 6, f"{an.titre}\n{desc}", border='TB', align='L', fill=fill)
            pdf.set_xy(125, text_y)
            if an.criticite == 'CRITIQUE':
                pdf.set_text_color(239, 68, 68)
            elif an.criticite == 'MOYENNE':
                pdf.set_text_color(234, 179, 8)
            else:
                pdf.set_text_color(59, 130, 246)
            pdf.cell(30, 12, an.criticite or "FAIBLE", border='TB', fill=fill)
            pdf.set_text_color(30, 41, 59)
            proj_name = "-"
            if an.test_case and an.test_case.campaign and an.test_case.campaign.project:
                proj_name = an.test_case.campaign.project.name[:20]
            pdf.cell(40, 12, proj_name, border='TB', fill=fill)
            test_ref = an.test_case.test_case_ref[:20] if an.test_case else "-"
            pdf.cell(40, 12, test_ref, border='TB', fill=fill)
            pdf.cell(25, 12, an.cree_le.strftime('%d/%m/%Y'), border='TB', fill=fill)
            pdf.ln()
            fill = not fill

        response = HttpResponse(bytes(pdf.output()), content_type='application/pdf')
        response['Content-Disposition'] = 'attachment; filename="rapport_anomalies.pdf"'
        return response