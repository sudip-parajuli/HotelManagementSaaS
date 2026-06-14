"""
SIA HMS — Housekeeping Models
Defines HousekeepingTask and MaintenanceRequest.
"""

from django.db import models
from django.conf import settings
from apps.properties.models import Room


class HousekeepingStatus(models.TextChoices):
    PENDING = "pending", "Pending"
    IN_PROGRESS = "in_progress", "In Progress"
    DONE = "done", "Done"
    SKIPPED = "skipped", "Skipped"
    ISSUE_REPORTED = "issue_reported", "Issue Reported"


class HousekeepingPriority(models.TextChoices):
    LOW = "low", "Low"
    NORMAL = "normal", "Normal"
    HIGH = "high", "High"
    URGENT = "urgent", "Urgent"


class HousekeepingTaskType(models.TextChoices):
    CLEAN = "clean", "Clean"
    DEEP_CLEAN = "deep_clean", "Deep Clean"
    TURNDOWN = "turndown", "Turndown Service"
    MAINTENANCE = "maintenance", "Maintenance Check"
    INSPECTION = "inspection", "Inspection Check"


class HousekeepingTrigger(models.TextChoices):
    CHECKOUT = "checkout", "Check Out"
    MANUAL = "manual", "Manual Entry"
    SCHEDULED = "scheduled", "Scheduled"
    MAINTENANCE_REQUEST = "maintenance_request", "Maintenance Request"


class HousekeepingTask(models.Model):
    """
    Represents a cleaning or maintenance task assigned to a room.
    """
    room = models.ForeignKey(
        Room,
        on_delete=models.CASCADE,
        related_name="housekeeping_tasks",
    )
    assigned_to = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="assigned_housekeeping_tasks",
    )
    task_type = models.CharField(
        max_length=30,
        choices=HousekeepingTaskType.choices,
        default=HousekeepingTaskType.CLEAN,
    )
    status = models.CharField(
        max_length=20,
        choices=HousekeepingStatus.choices,
        default=HousekeepingStatus.PENDING,
    )
    priority = models.CharField(
        max_length=20,
        choices=HousekeepingPriority.choices,
        default=HousekeepingPriority.NORMAL,
    )
    triggered_by = models.CharField(
        max_length=30,
        choices=HousekeepingTrigger.choices,
        default=HousekeepingTrigger.MANUAL,
    )
    notes = models.TextField(blank=True)
    issue_description = models.TextField(blank=True)
    completion_photo = models.CharField(max_length=255, blank=True)
    
    due_by = models.DateField(null=True, blank=True)
    started_at = models.DateTimeField(null=True, blank=True)
    completed_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "Housekeeping Task"
        verbose_name_plural = "Housekeeping Tasks"
        ordering = ["-priority", "-created_at"]

    def __str__(self):
        return f"{self.get_task_type_display()} for Room {self.room.room_number} ({self.status})"


class MaintenanceRequest(models.Model):
    """
    Represents a maintenance repair issue reported for a room.
    """
    class MaintenanceCategory(models.TextChoices):
        PLUMBING = "plumbing", "Plumbing"
        ELECTRICAL = "electrical", "Electrical"
        FURNITURE = "furniture", "Furniture"
        AC = "ac", "AC / HVAC"
        OTHER = "other", "Other"

    class MaintenanceStatus(models.TextChoices):
        OPEN = "open", "Open"
        IN_PROGRESS = "in_progress", "In Progress"
        RESOLVED = "resolved", "Resolved"

    room = models.ForeignKey(
        Room,
        on_delete=models.CASCADE,
        related_name="maintenance_requests",
    )
    reported_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="reported_maintenance_requests",
    )
    category = models.CharField(
        max_length=30,
        choices=MaintenanceCategory.choices,
        default=MaintenanceCategory.OTHER,
    )
    status = models.CharField(
        max_length=20,
        choices=MaintenanceStatus.choices,
        default=MaintenanceStatus.OPEN,
    )
    description = models.TextField()
    
    resolved_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="resolved_maintenance_requests",
    )
    resolution_notes = models.TextField(blank=True)
    resolved_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = "Maintenance Request"
        verbose_name_plural = "Maintenance Requests"
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.get_category_display()} Issue in Room {self.room.room_number} ({self.status})"
