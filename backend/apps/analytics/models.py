"""
SIA HMS — Analytics Models
Defines DailyMetric and ReportExport.
"""

from django.db import models
from apps.properties.models import Property


class DailyMetric(models.Model):
    property = models.ForeignKey(
        Property,
        on_delete=models.CASCADE,
        related_name="daily_metrics"
    )
    date = models.DateField()
    total_revenue = models.DecimalField(max_digits=12, decimal_places=2, default=0.00)
    room_revenue = models.DecimalField(max_digits=12, decimal_places=2, default=0.00)
    restaurant_revenue = models.DecimalField(max_digits=12, decimal_places=2, default=0.00)
    other_revenue = models.DecimalField(max_digits=12, decimal_places=2, default=0.00)
    
    occupied_rooms = models.IntegerField(default=0)
    total_rooms = models.IntegerField(default=0)
    occupancy_rate = models.DecimalField(max_digits=5, decimal_places=2, default=0.00)
    
    adr = models.DecimalField(max_digits=12, decimal_places=2, default=0.00)
    revpar = models.DecimalField(max_digits=12, decimal_places=2, default=0.00)
    
    total_guests = models.IntegerField(default=0)
    new_guests = models.IntegerField(default=0)
    
    restaurant_covers = models.IntegerField(default=0)
    avg_restaurant_spend = models.DecimalField(max_digits=12, decimal_places=2, default=0.00)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "Daily Metric"
        verbose_name_plural = "Daily Metrics"
        unique_together = ("property", "date")
        ordering = ["-date"]
        indexes = [
            models.Index(fields=["date", "property"]),
        ]

    def __str__(self):
        return f"Metrics for {self.property.name} on {self.date}"


class ReportExportStatus(models.TextChoices):
    PENDING = "pending", "Pending"
    COMPLETED = "completed", "Completed"
    FAILED = "failed", "Failed"


class ReportType(models.TextChoices):
    DAILY_REVENUE = "daily_revenue", "Daily Revenue Report"
    OCCUPANCY = "occupancy", "Occupancy Report"
    GUEST_LEDGER = "guest_ledger", "Guest Ledger"
    STAFF_ATTENDANCE = "staff_attendance", "Staff Attendance Summary"
    INVENTORY_CONSUMPTION = "inventory_consumption", "Inventory Consumption"
    PROFIT_LOSS = "profit_loss", "P&L Summary"
    NEPAL_VAT = "nepal_vat", "Nepal VAT Report"
    PAYROLL = "payroll", "Payroll Summary"


class ReportExport(models.Model):
    report_type = models.CharField(max_length=50, choices=ReportType.choices)
    format = models.CharField(max_length=10, choices=[("pdf", "PDF"), ("excel", "Excel")])
    status = models.CharField(
        max_length=20,
        choices=ReportExportStatus.choices,
        default=ReportExportStatus.PENDING
    )
    start_date = models.DateField()
    end_date = models.DateField()
    file_path = models.CharField(max_length=255, blank=True, null=True)
    error_message = models.TextField(blank=True, null=True)
    task_id = models.CharField(max_length=100, blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    completed_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        verbose_name = "Report Export"
        verbose_name_plural = "Report Exports"
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.get_report_type_display()} ({self.format}) — {self.status}"
