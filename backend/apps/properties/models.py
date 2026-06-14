"""
SIA HMS — Property & Room Models
Defines Property, Amenity, RoomType, Room, and RoomImage.
"""

from django.db import models
from django.utils.text import slugify


class Property(models.Model):
    """
    Represents a physical hotel or villa property.
    Supports basic tenant information, contact info, default settings, and policies.
    """

    name = models.CharField(max_length=255)
    tagline = models.CharField(max_length=255, blank=True, null=True)
    address = models.TextField()
    city = models.CharField(max_length=100)
    country = models.CharField(max_length=100, default="Nepal")
    phone = models.CharField(max_length=50)
    email = models.EmailField()
    website = models.URLField(blank=True, null=True)
    
    logo = models.ImageField(
        upload_to="properties/",
        null=True,
        blank=True,
        help_text="Logo image stored in MinIO",
    )
    cover_image = models.ImageField(
        upload_to="properties/",
        null=True,
        blank=True,
        help_text="Cover image stored in MinIO",
    )

    currency = models.CharField(max_length=10, default="NPR")
    timezone = models.CharField(max_length=100, default="Asia/Kathmandu")
    vat_number = models.CharField(max_length=50, blank=True)
    pan_number = models.CharField(max_length=50, blank=True)
    
    check_in_time = models.TimeField(default="14:00:00")
    check_out_time = models.TimeField(default="12:00:00")
    cancellation_policy = models.TextField(blank=True)
    terms = models.TextField(blank=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "Property"
        verbose_name_plural = "Properties"

    def __str__(self):
        return f"{self.name} ({self.city}, {self.country})"


class Amenity(models.Model):
    """
    Catalog of amenities available for room types.
    """

    class Category(models.TextChoices):
        ROOM = "room", "Room"
        BATHROOM = "bathroom", "Bathroom"
        HOTEL = "hotel", "Hotel/General"
        MEDIA = "media", "Media & Tech"
        FOOD = "food", "Food & Drink"

    name = models.CharField(max_length=100, unique=True)
    icon = models.CharField(
        max_length=100,
        help_text="Lucide-react icon identifier (e.g., wifi, tv)",
    )
    category = models.CharField(
        max_length=50,
        choices=Category.choices,
        default=Category.ROOM,
    )

    class Meta:
        verbose_name = "Amenity"
        verbose_name_plural = "Amenities"
        ordering = ["category", "name"]

    def __str__(self):
        return f"{self.name} ({self.get_category_display()})"


class RoomType(models.Model):
    """
    Different types of rooms available in a property (e.g., Deluxe, Suite).
    """

    property = models.ForeignKey(
        Property,
        on_delete=models.CASCADE,
        related_name="room_types",
    )
    name = models.CharField(max_length=100)
    slug = models.SlugField(max_length=150, blank=True)
    description = models.TextField(blank=True)
    max_occupancy = models.PositiveIntegerField(default=2)
    
    base_price_per_night = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        help_text="Standard weekday rate",
    )
    weekend_price = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        null=True,
        blank=True,
        help_text="Rate applicable on weekends (optional)",
    )
    extra_person_charge = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        default=0.00,
        help_text="Charge per extra guest above double occupancy",
    )

    amenities = models.ManyToManyField(
        Amenity,
        blank=True,
        related_name="room_types",
    )
    is_active = models.BooleanField(default=True)
    display_order = models.IntegerField(default=0)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "Room Type"
        verbose_name_plural = "Room Types"
        ordering = ["display_order", "name"]
        unique_together = ("property", "name")

    def __str__(self):
        return f"{self.name} — {self.property.name}"

    def save(self, *args, **kwargs):
        if not self.slug:
            self.slug = slugify(self.name)
        super().save(*args, **kwargs)


class RoomStatus(models.TextChoices):
    AVAILABLE = "available", "Available"
    OCCUPIED = "occupied", "Occupied"
    DIRTY = "dirty", "Dirty"
    MAINTENANCE = "maintenance", "Maintenance"
    OUT_OF_ORDER = "out_of_order", "Out of Order"


class Room(models.Model):
    """
    Physical room unit in the property.
    """

    room_type = models.ForeignKey(
        RoomType,
        on_delete=models.CASCADE,
        related_name="rooms",
    )
    room_number = models.CharField(max_length=50, unique=True)
    floor = models.IntegerField(help_text="Floor level (e.g. 0 for Ground, 1 for First Floor)")
    status = models.CharField(
        max_length=25,
        choices=RoomStatus.choices,
        default=RoomStatus.AVAILABLE,
    )
    is_active = models.BooleanField(default=True)
    notes = models.TextField(blank=True)
    last_cleaned_at = models.DateTimeField(null=True, blank=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "Room"
        verbose_name_plural = "Rooms"
        ordering = ["floor", "room_number"]

    def __str__(self):
        return f"Room {self.room_number} ({self.room_type.name})"


class RoomImage(models.Model):
    """
    Images associated with a RoomType.
    """

    room_type = models.ForeignKey(
        RoomType,
        on_delete=models.CASCADE,
        related_name="images",
    )
    image = models.ImageField(upload_to="rooms/")
    caption = models.CharField(max_length=255, blank=True)
    is_primary = models.BooleanField(
        default=False,
        help_text="If True, this image is used as the cover photo for this room type",
    )
    display_order = models.IntegerField(default=0)

    class Meta:
        verbose_name = "Room Image"
        verbose_name_plural = "Room Images"
        ordering = ["display_order", "id"]

    def __str__(self):
        return f"Image for {self.room_type.name} ({self.caption or 'No caption'})"

    def save(self, *args, **kwargs):
        # Ensure only one primary image per RoomType
        if self.is_primary:
            RoomImage.objects.filter(
                room_type=self.room_type,
                is_primary=True,
            ).update(is_primary=False)
        super().save(*args, **kwargs)
