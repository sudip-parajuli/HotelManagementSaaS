"""
SIA HMS — PDF Report Builders
Compiles HTML templates and uses WeasyPrint to build premium PDF reports.
"""

from io import BytesIO
from django.template.loader import render_to_string
from django.utils import timezone
from weasyprint import HTML
from apps.analytics.models import DailyMetric
from apps.billing.models import Invoice
from apps.bookings.models import Reservation
from django.db.models import Sum


def build_revenue_pdf(start_date, end_date):
    metrics = DailyMetric.objects.filter(date__range=(start_date, end_date)).order_by("date")
    total_rev = metrics.aggregate(Sum("total_revenue"))["total_revenue__sum"] or 0
    room_rev = metrics.aggregate(Sum("room_revenue"))["room_revenue__sum"] or 0
    pos_rev = metrics.aggregate(Sum("restaurant_revenue"))["restaurant_revenue__sum"] or 0
    other_rev = metrics.aggregate(Sum("other_revenue"))["other_revenue__sum"] or 0

    context = {
        "metrics": metrics,
        "start_date": start_date,
        "end_date": end_date,
        "total_revenue": total_rev,
        "room_revenue": room_rev,
        "restaurant_revenue": pos_rev,
        "other_revenue": other_rev,
        "generated_at": timezone.now(),
    }
    html_content = render_to_string("pdf/reports/daily_revenue.html", context)
    pdf_file = BytesIO()
    HTML(string=html_content).write_pdf(pdf_file)
    return pdf_file.getvalue()


def build_occupancy_pdf(start_date, end_date):
    metrics = DailyMetric.objects.filter(date__range=(start_date, end_date)).order_by("date")
    count = metrics.count()
    avg_occ = (metrics.aggregate(Sum("occupancy_rate"))["occupancy_rate__sum"] or 0) / count if count > 0 else 0
    avg_adr = (metrics.aggregate(Sum("adr"))["adr__sum"] or 0) / count if count > 0 else 0
    avg_revpar = (metrics.aggregate(Sum("revpar"))["revpar__sum"] or 0) / count if count > 0 else 0

    context = {
        "metrics": metrics,
        "start_date": start_date,
        "end_date": end_date,
        "avg_occupancy": avg_occ,
        "avg_adr": avg_adr,
        "avg_revpar": avg_revpar,
        "generated_at": timezone.now(),
    }
    html_content = render_to_string("pdf/reports/occupancy_report.html", context)
    pdf_file = BytesIO()
    HTML(string=html_content).write_pdf(pdf_file)
    return pdf_file.getvalue()


def build_guest_ledger_pdf():
    # Fetch active in-house reservations and their compiled billing balances
    reservations = Reservation.objects.filter(status="checked_in").order_by("room__room_number")
    
    ledger_items = []
    for res in reservations:
        # Get matching invoices
        invoice = res.invoices.first()
        if invoice:
            balance = invoice.balance_due
            total = invoice.total_amount
            paid = invoice.paid_amount
        else:
            balance = 0
            total = 0
            paid = 0
        ledger_items.append({
            "room_number": res.room.room_number,
            "guest_name": res.guest.full_name,
            "phone": res.guest.phone,
            "check_in_date": res.check_in_date,
            "check_out_date": res.check_out_date,
            "total_amount": total,
            "paid_amount": paid,
            "balance_due": balance,
        })

    context = {
        "ledger_items": ledger_items,
        "generated_at": timezone.now(),
    }
    html_content = render_to_string("pdf/reports/guest_ledger.html", context)
    pdf_file = BytesIO()
    HTML(string=html_content).write_pdf(pdf_file)
    return pdf_file.getvalue()


def build_nepal_vat_book_pdf(start_date, end_date):
    # Nepal IRD VAT Sales Register format
    invoices = Invoice.objects.filter(
        created_at__date__range=(start_date, end_date),
        status__in=["paid", "partially_paid"]
    ).order_by("created_at")

    vat_items = []
    total_sales = 0
    total_taxable = 0
    total_vat = 0
    total_exempt = 0

    for inv in invoices:
        taxable = inv.subtotal - inv.discount_amount
        vat = inv.tax_amount
        exempt = 0

        total_sales += inv.total_amount
        total_taxable += taxable
        total_vat += vat
        
        vat_items.append({
            "date": inv.created_at.date(),
            "invoice_number": inv.invoice_number,
            "guest_name": inv.walk_in_guest_name or (inv.reservation.guest.full_name if inv.reservation else "Guest"),
            "pan_number": inv.reservation.guest.id_number if (inv.reservation and inv.reservation.guest.id_type == "citizenship") else "",
            "total_amount": inv.total_amount,
            "taxable_amount": taxable,
            "non_taxable_amount": exempt,
            "vat_amount": vat,
        })

    context = {
        "vat_items": vat_items,
        "start_date": start_date,
        "end_date": end_date,
        "total_sales": total_sales,
        "total_taxable": total_taxable,
        "total_vat": total_vat,
        "total_exempt": total_exempt,
        "generated_at": timezone.now(),
    }
    html_content = render_to_string("pdf/reports/nepal_vat_book.html", context)
    pdf_file = BytesIO()
    HTML(string=html_content).write_pdf(pdf_file)
    return pdf_file.getvalue()
