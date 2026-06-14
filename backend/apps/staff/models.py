"""
SIA HMS — Staff App Models
Defines Department, StaffMember, and StaffDocument.
"""

from django.db import models
from django.conf import settings


class Department(models.Model):
    """
    Represents a hotel department (e.g., Housekeeping, Front Desk, F&B).
    """
    name = models.CharField(max_length=100, unique=True)
    head = models.ForeignKey(
        "StaffMember",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="led_departments",
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "Department"
        verbose_name_plural = "Departments"
        ordering = ["name"]

    def __str__(self):
        return self.name


class EmploymentType(models.TextChoices):
    FULL_TIME = "full_time", "Full Time"
    PART_TIME = "part_time", "Part Time"
    CONTRACT = "contract", "Contract"


class SalaryType(models.TextChoices):
    MONTHLY = "monthly", "Monthly"
    HOURLY = "hourly", "Hourly"


class TaxFilingStatus(models.TextChoices):
    SINGLE = "single", "Single"
    MARRIED = "married", "Married"


class StaffMember(models.Model):
    """
    Represents profile metadata for employees linked to a system User.
    """
    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="staff_profile",
    )
    department = models.ForeignKey(
        Department,
        on_delete=models.PROTECT,
        related_name="staff_members",
    )
    designation = models.CharField(max_length=100)
    hire_date = models.DateField()
    employment_type = models.CharField(
        max_length=20,
        choices=EmploymentType.choices,
        default=EmploymentType.FULL_TIME,
    )
    base_salary = models.DecimalField(max_digits=10, decimal_places=2)
    salary_type = models.CharField(
        max_length=20,
        choices=SalaryType.choices,
        default=SalaryType.MONTHLY,
    )
    bank_name = models.CharField(max_length=100, blank=True)
    bank_account_number = models.CharField(max_length=50, blank=True)
    emergency_contact_name = models.CharField(max_length=100, blank=True)
    emergency_contact_phone = models.CharField(max_length=20, blank=True)
    profile_photo = models.ImageField(
        upload_to="staff_photos/",
        null=True,
        blank=True,
        help_text="Employee portrait",
    )
    tax_filing_status = models.CharField(
        max_length=20,
        choices=TaxFilingStatus.choices,
        default=TaxFilingStatus.SINGLE,
    )
    attendance_pin = models.CharField(
        max_length=4,
        default="1234",
        help_text="4-digit pin code for quick clock-in/out authentication",
    )
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "Staff Member"
        verbose_name_plural = "Staff Members"
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["department"]),
            models.Index(fields=["is_active"]),
        ]

    def __str__(self):
        return f"{self.user.get_full_name() or self.user.email} — {self.designation}"


class StaffDocument(models.Model):
    """
    Represents citizenship files, passport copies, employment contracts, and academic certs.
    """
    class DocumentType(models.TextChoices):
        CITIZENSHIP = "citizenship", "Citizenship Card"
        PASSPORT = "passport", "Passport"
        CONTRACT = "contract", "Employment Contract"
        CERTIFICATE = "certificate", "Academic/Training Certificate"
        OTHER = "other", "Other Document"

    staff = models.ForeignKey(
        StaffMember,
        on_delete=models.CASCADE,
        related_name="documents",
    )
    document_type = models.CharField(
        max_length=30,
        choices=DocumentType.choices,
        default=DocumentType.OTHER,
    )
    file = models.FileField(upload_to="staff_documents/")
    expiry_date = models.DateField(null=True, blank=True)
    notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = "Staff Document"
        verbose_name_plural = "Staff Documents"
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.get_document_type_display()} for {self.staff}"
