"""
SIA HMS — Analytics Background Tasks
Defines Daily Metric aggregates and background file generation tasks.
"""

import logging
from datetime import datetime
from decimal import Decimal
from django.utils import timezone
from django.core.files.storage import default_storage
from django.core.files.base import ContentFile
from celery import shared_task
from apps.properties.models import Property, Room
from apps.bookings.models import Reservation, ReservationStatus
from apps.billing.models import Payment, InvoiceItem
from apps.pos.models import Order
from django.db.models import Sum, Min
from .models import DailyMetric, ReportExport, ReportExportStatus, ReportType

logger = logging.getLogger(__name__)


@shared_task
def aggregate_daily_metrics(date_str=None, property_id=None):
    """
    Computes daily totals for a specific property and date.
    Runs every midnight.
    """
    if date_str:
        target_date = datetime.strptime(date_str, "%Y-%m-%d").date()
    else:
        target_date = timezone.localdate() - timezone.timedelta(days=1)

    properties = Property.objects.all()
    if property_id:
        properties = properties.filter(id=property_id)

    for prop in properties:
        try:
            logger.info(f"Aggregating daily metrics for property {prop.name} on {target_date}")
            
            payments_today = Payment.objects.filter(
                paid_at__date=target_date,
                invoice__reservation__room__room_type__property=prop
            )
            total_revenue = payments_today.aggregate(total=Sum("amount"))["total"] or Decimal("0.00")
            
            room_rev = InvoiceItem.objects.filter(
                item_type="room_charge",
                invoice__payments__paid_at__date=target_date,
                invoice__reservation__room__room_type__property=prop
            ).aggregate(total=Sum("amount"))["total"] or Decimal("0.00")
            
            restaurant_rev = InvoiceItem.objects.filter(
                item_type="pos_charge",
                invoice__payments__paid_at__date=target_date,
                invoice__reservation__room__room_type__property=prop
            ).aggregate(total=Sum("amount"))["total"] or Decimal("0.00")
            
            other_rev = InvoiceItem.objects.filter(
                item_type="extra_charge",
                invoice__payments__paid_at__date=target_date,
                invoice__reservation__room__room_type__property=prop
            ).aggregate(total=Sum("amount"))["total"] or Decimal("0.00")

            occupied_rooms = Reservation.objects.filter(
                status=ReservationStatus.CHECKED_IN,
                room__room_type__property=prop,
                check_in_date__lte=target_date,
                check_out_date__gt=target_date
            ).count()
            
            total_rooms = Room.objects.filter(
                room_type__property=prop,
                is_active=True
            ).count()
            
            occupancy_rate = Decimal("0.00")
            if total_rooms > 0:
                occupancy_rate = (Decimal(occupied_rooms) / Decimal(total_rooms)) * Decimal("100.00")

            adr = Decimal("0.00")
            if occupied_rooms > 0:
                adr = room_rev / Decimal(occupied_rooms)
                
            revpar = Decimal("0.00")
            if total_rooms > 0:
                revpar = room_rev / Decimal(total_rooms)

            active_res = Reservation.objects.filter(
                status=ReservationStatus.CHECKED_IN,
                room__room_type__property=prop,
                check_in_date__lte=target_date,
                check_out_date__gt=target_date
            )
            total_guests = 0
            for res in active_res:
                total_guests += res.adults + res.children

            new_guests = active_res.filter(check_in_date=target_date).annotate(
                min_stay=Min("guest__reservations__check_in_date")
            ).filter(min_stay=target_date).count()

            restaurant_covers = Order.objects.filter(
                status="served",
                served_at__date=target_date
            ).count()
            
            avg_restaurant_spend = Decimal("0.00")
            if restaurant_covers > 0:
                orders_revenue = Order.objects.filter(
                    status="served",
                    served_at__date=target_date
                ).aggregate(total=Sum("total_amount"))["total"] or Decimal("0.00")
                avg_restaurant_spend = orders_revenue / Decimal(restaurant_covers)

            metric, created = DailyMetric.objects.update_or_create(
                property=prop,
                date=target_date,
                defaults={
                    "total_revenue": total_revenue,
                    "room_revenue": room_rev,
                    "restaurant_revenue": restaurant_rev,
                    "other_revenue": other_rev,
                    "occupied_rooms": occupied_rooms,
                    "total_rooms": total_rooms,
                    "occupancy_rate": occupancy_rate,
                    "adr": adr,
                    "revpar": revpar,
                    "total_guests": total_guests,
                    "new_guests": new_guests,
                    "restaurant_covers": restaurant_covers,
                    "avg_restaurant_spend": avg_restaurant_spend,
                }
            )
            logger.info(f"Successfully aggregated daily metrics for {prop.name}: Metric ID {metric.id}")
        except Exception as e:
            logger.exception(f"Failed to aggregate metrics for property {prop.id} on {target_date}: {e}")


@shared_task
def generate_report_task(export_id):
    """
    Background job generating PDF / Excel report contents and saving them to media store.
    """
    try:
        export = ReportExport.objects.get(id=export_id)
    except ReportExport.DoesNotExist:
        logger.error(f"ReportExport with ID {export_id} does not exist.")
        return

    export.status = ReportExportStatus.PENDING
    export.save()

    try:
        from apps.reports import pdf_builders, excel_builders
        
        file_data = None
        file_ext = export.format.lower()
        
        # Dispatch builders
        if export.report_type == ReportType.DAILY_REVENUE:
            file_data = pdf_builders.build_revenue_pdf(export.start_date, export.end_date)
                
        elif export.report_type == ReportType.OCCUPANCY:
            file_data = pdf_builders.build_occupancy_pdf(export.start_date, export.end_date)
                
        elif export.report_type == ReportType.GUEST_LEDGER:
            file_data = pdf_builders.build_guest_ledger_pdf()
            
        elif export.report_type == ReportType.STAFF_ATTENDANCE:
            file_data = excel_builders.build_attendance_summary_excel(export.start_date, export.end_date)
            
        elif export.report_type == ReportType.INVENTORY_CONSUMPTION:
            file_data = excel_builders.build_inventory_consumption_excel(export.start_date, export.end_date)
            
        elif export.report_type == ReportType.PROFIT_LOSS:
            file_data = excel_builders.build_profit_loss_excel(export.start_date, export.end_date)
            
        elif export.report_type == ReportType.NEPAL_VAT:
            file_data = pdf_builders.build_nepal_vat_book_pdf(export.start_date, export.end_date)
            
        elif export.report_type == ReportType.PAYROLL:
            file_data = excel_builders.build_payroll_summary_excel(export.start_date, export.end_date)

        if not file_data:
            raise ValueError(f"Unsupported report parameters: type={export.report_type}, format={export.format}")

        filename = f"reports/report_{export.report_type}_{export.id}.{file_ext}"
        saved_path = default_storage.save(filename, ContentFile(file_data))
        
        export.file_path = default_storage.url(saved_path)
        export.status = ReportExportStatus.COMPLETED
        export.completed_at = timezone.now()
        export.save()
        logger.info(f"Successfully generated report ID {export.id} at {export.file_path}")
        
    except Exception as e:
        logger.exception(f"Report generation error for export ID {export_id}: {e}")
        export.status = ReportExportStatus.FAILED
        export.error_message = str(e)
        export.save()
