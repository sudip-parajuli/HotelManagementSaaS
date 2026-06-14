"""
SIA HMS — Availability & Pricing Engine
Contains get_available_rooms and calculate_price logic.
"""

from datetime import datetime, timedelta
from django.db.models import Q
from decimal import Decimal

from apps.properties.models import Room, RoomType
from .models import Reservation, ReservationStatus, RatePlan


def get_available_rooms(check_in, check_out, adults, room_type=None):
    """
    Returns a list of rooms that are available between check_in and check_out dates
    and satisfy the maximum occupancy criteria.
    
    Excludes rooms with overlapping reservations that are not cancelled or no-show.
    """
    # Parse dates if they are strings
    if isinstance(check_in, str):
        check_in = datetime.strptime(check_in, "%Y-%m-%d").date()
    if isinstance(check_out, str):
        check_out = datetime.strptime(check_out, "%Y-%m-%d").date()
    
    # 1. Start with active rooms that fit the occupancy
    rooms_query = Room.objects.filter(
        is_active=True,
        room_type__max_occupancy__gte=adults,
    )
    
    if room_type:
        rooms_query = rooms_query.filter(room_type=room_type)

    # 2. Find rooms with overlapping active reservations
    # overlap condition: reservation.check_in < check_out AND reservation.check_out > check_in
    active_statuses = [
        ReservationStatus.PENDING,
        ReservationStatus.CONFIRMED,
        ReservationStatus.CHECKED_IN,
    ]
    
    overlapping_room_ids = Reservation.objects.filter(
        status__in=active_statuses,
        check_in_date__lt=check_out,
        check_out_date__gt=check_in,
    ).values_list("room_id", flat=True)

    # 3. Exclude overlapping rooms from query
    available_rooms = rooms_query.exclude(id__in=overlapping_room_ids)
    
    return available_rooms


def calculate_price(room_type, check_in, check_out):
    """
    Calculates nightly pricing for a specific room type between check_in and check_out dates.
    Applies active RatePlans (matched date-by-date), weekend price overrides, and outputs
    a complete details breakdown.
    
    Nepal official weekend is Saturday (weekday = 5 in python).
    """
    if isinstance(check_in, str):
        check_in = datetime.strptime(check_in, "%Y-%m-%d").date()
    if isinstance(check_out, str):
        check_out = datetime.strptime(check_out, "%Y-%m-%d").date()
        
    nights = (check_out - check_in).days
    if nights <= 0:
        return {
            "base_amount": Decimal("0.00"),
            "tax_amount": Decimal("0.00"),
            "total_amount": Decimal("0.00"),
            "nights": 0,
            "breakdown": []
        }

    daily_breakdown = []
    base_amount = Decimal("0.00")

    current_date = check_in
    while current_date < check_out:
        night_price = None
        rate_plan_name = "Base Rate"

        # 1. Check if there is an active RatePlan covering this specific date
        rate_plan = RatePlan.objects.filter(
            room_type=room_type,
            is_active=True,
            valid_from__lte=current_date,
            valid_to__gte=current_date,
        ).first()

        if rate_plan:
            night_price = rate_plan.price_per_night
            rate_plan_name = rate_plan.name
        else:
            # 2. Check if weekend price override is set (Friday=4, Saturday=5 in Nepal)
            # In Nepal, Saturday is the official weekend day, but many resorts include Friday.
            # We will apply weekend price for Friday (4) and Saturday (5).
            is_weekend = current_date.weekday() in [4, 5]
            if is_weekend and room_type.weekend_price is not None:
                night_price = room_type.weekend_price
                rate_plan_name = "Weekend Override Rate"
            else:
                # 3. Fallback to base price per night
                night_price = room_type.base_price_per_night
        # Ensure Decimal type for calculations
        if night_price is not None:
            night_price = Decimal(str(night_price))

        base_amount += night_price
        daily_breakdown.append({
            "date": current_date.strftime("%Y-%m-%d"),
            "price": str(night_price),
            "rate_plan": rate_plan_name
        })
        current_date += timedelta(days=1)

    # Calculate 13% VAT (standard Nepal tax)
    tax_amount = (base_amount * Decimal("0.13")).quantize(Decimal("0.01"))
    total_amount = base_amount + tax_amount

    return {
        "base_amount": base_amount,
        "tax_amount": tax_amount,
        "total_amount": total_amount,
        "nights": nights,
        "breakdown": daily_breakdown
    }
