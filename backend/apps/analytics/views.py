"""
SIA HMS — Analytics Views
Exposes REST API endpoints for analytics dashboards, Recharts components, and reports.
"""

from rest_framework import views, status, viewsets
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.utils import timezone
from datetime import datetime, timedelta
from django.db.models import Sum, Count
from apps.properties.models import Property, Room
from apps.bookings.models import Reservation, ReservationStatus
from apps.billing.models import Payment, InvoiceItem
from apps.pos.models import Order, OrderItem
from .models import DailyMetric, ReportExport
from .serializers import DailyMetricSerializer, ReportExportSerializer
from .tasks import generate_report_task, aggregate_daily_metrics


class DashboardSummaryView(views.APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        prop = Property.objects.first()
        if not prop:
            return Response({"error": "No property configured"}, status=status.HTTP_400_BAD_REQUEST)

        today = timezone.localdate()
        start_date = today - timedelta(days=30)
        metrics = DailyMetric.objects.filter(property=prop, date__range=(start_date, today)).order_by("date")
        
        payments_today = Payment.objects.filter(
            paid_at__date=today,
            invoice__reservation__room__room_type__property=prop
        )
        total_rev = payments_today.aggregate(total=Sum("amount"))["total"] or 0
        
        room_rev = InvoiceItem.objects.filter(
            item_type="room_charge",
            invoice__payments__paid_at__date=today,
            invoice__reservation__room__room_type__property=prop
        ).aggregate(total=Sum("amount"))["total"] or 0
        
        pos_rev = InvoiceItem.objects.filter(
            item_type="pos_charge",
            invoice__payments__paid_at__date=today,
            invoice__reservation__room__room_type__property=prop
        ).aggregate(total=Sum("amount"))["total"] or 0

        occupied = Reservation.objects.filter(
            status=ReservationStatus.CHECKED_IN,
            room__room_type__property=prop,
            check_in_date__lte=today,
            check_out_date__gt=today
        ).count()
        
        total_rooms = Room.objects.filter(
            room_type__property=prop,
            is_active=True
        ).count()
        
        occ_rate = (occupied / total_rooms * 100) if total_rooms > 0 else 0
        adr = (room_rev / occupied) if occupied > 0 else 0
        revpar = (room_rev / total_rooms) if total_rooms > 0 else 0

        covers = Order.objects.filter(status="served", served_at__date=today).count()

        today_snapshot = {
            "total_revenue": float(total_rev),
            "room_revenue": float(room_rev),
            "restaurant_revenue": float(pos_rev),
            "occupied_rooms": occupied,
            "total_rooms": total_rooms,
            "occupancy_rate": float(occ_rate),
            "adr": float(adr),
            "revpar": float(revpar),
            "restaurant_covers": covers,
        }

        serializer = DailyMetricSerializer(metrics, many=True)
        return Response({
            "metrics": serializer.data,
            "today": today_snapshot,
        })

    def post(self, request):
        date_str = request.data.get("date")
        prop = Property.objects.first()
        if not prop:
            return Response({"error": "No property"}, status=status.HTTP_400_BAD_REQUEST)
        
        aggregate_daily_metrics(date_str=date_str, property_id=prop.id)
        return Response({"status": "success", "message": f"Aggregated metrics for date {date_str or 'yesterday'}"})


class RevenueAnalyticsView(views.APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        start_str = request.query_params.get("start_date")
        end_str = request.query_params.get("end_date")

        if not start_str or not end_str:
            end_date = timezone.localdate()
            start_date = end_date - timedelta(days=30)
        else:
            start_date = datetime.strptime(start_str, "%Y-%m-%d").date()
            end_date = datetime.strptime(end_str, "%Y-%m-%d").date()

        metrics = DailyMetric.objects.filter(date__range=(start_date, end_date)).order_by("date")
        serializer = DailyMetricSerializer(metrics, many=True)
        return Response(serializer.data)


class OccupancyAnalyticsView(views.APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        start_str = request.query_params.get("start_date")
        end_str = request.query_params.get("end_date")
        
        if not start_str or not end_str:
            end_date = timezone.localdate()
            start_date = end_date - timedelta(days=30)
        else:
            start_date = datetime.strptime(start_str, "%Y-%m-%d").date()
            end_date = datetime.strptime(end_str, "%Y-%m-%d").date()

        metrics = DailyMetric.objects.filter(date__range=(start_date, end_date)).order_by("date")
        
        reservations = Reservation.objects.filter(
            status__in=[ReservationStatus.CHECKED_IN, ReservationStatus.CHECKED_OUT],
            check_in_date__lte=end_date,
            check_out_date__gte=start_date
        )
        
        type_counts = reservations.values("room__room_type__name").annotate(
            count=Count("id")
        ).order_by("-count")
        
        room_types_summary = {
            item["room__room_type__name"]: item["count"] for item in type_counts
        }

        serializer = DailyMetricSerializer(metrics, many=True)
        return Response({
            "metrics": serializer.data,
            "room_types_summary": room_types_summary
        })


class TopMenuItemsView(views.APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        start_str = request.query_params.get("start_date")
        end_str = request.query_params.get("end_date")
        limit = int(request.query_params.get("limit", 10))

        if not start_str or not end_str:
            end_date = timezone.localdate()
            start_date = end_date - timedelta(days=30)
        else:
            start_date = datetime.strptime(start_str, "%Y-%m-%d").date()
            end_date = datetime.strptime(end_str, "%Y-%m-%d").date()

        items = OrderItem.objects.filter(
            order__status__in=["served", "paid"],
            order__served_at__date__range=(start_date, end_date)
        ).values("menu_item__name", "menu_item__category__name").annotate(
            total_qty=Sum("quantity")
        ).order_by("-total_qty")[:limit]

        formatted_items = []
        for it in items:
            order_items = OrderItem.objects.filter(
                menu_item__name=it["menu_item__name"],
                order__status__in=["served", "paid"],
                order__served_at__date__range=(start_date, end_date)
            )
            revenue = sum(x.quantity * x.unit_price for x in order_items)
            qty = sum(x.quantity for x in order_items)
            formatted_items.append({
                "name": it["menu_item__name"],
                "category": it["menu_item__category__name"],
                "quantity": qty,
                "revenue": float(revenue)
            })

        formatted_items = sorted(formatted_items, key=lambda x: x["revenue"], reverse=True)
        return Response(formatted_items)


class GuestSourcesView(views.APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        start_str = request.query_params.get("start_date")
        end_str = request.query_params.get("end_date")

        if not start_str or not end_str:
            end_date = timezone.localdate()
            start_date = end_date - timedelta(days=30)
        else:
            start_date = datetime.strptime(start_str, "%Y-%m-%d").date()
            end_date = datetime.strptime(end_str, "%Y-%m-%d").date()

        sources = Reservation.objects.filter(
            check_in_date__range=(start_date, end_date)
        ).values("booking_source").annotate(
            count=Count("id")
        ).order_by("-count")

        formatted = []
        for s in sources:
            formatted.append({
                "source": s["booking_source"],
                "count": s["count"]
            })
        return Response(formatted)


class ReportExportViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated]
    queryset = ReportExport.objects.all()
    serializer_class = ReportExportSerializer

    def get_queryset(self):
        return ReportExport.objects.all().order_by("-created_at")[:15]

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        export = serializer.save()
        
        task = generate_report_task.delay(export.id)
        export.task_id = task.id
        export.save()
        
        return Response(ReportExportSerializer(export).data, status=status.HTTP_201_CREATED)
