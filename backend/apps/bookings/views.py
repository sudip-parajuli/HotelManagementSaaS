"""
SIA HMS — Booking & Reservation Views
"""

from rest_framework import viewsets, permissions, status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.decorators import action
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework.filters import SearchFilter, OrderingFilter
from django.utils import timezone
from datetime import date
from django.db import transaction

from apps.accounts.permissions import IsAnyStaff, IsPropertyManager, IsFrontDesk
from apps.properties.models import Room, RoomType
from apps.properties.serializers import RoomSerializer, RoomTypeSerializer
from .models import GuestProfile, Reservation, RatePlan, ReservationStatus, BookingSource
from .serializers import GuestProfileSerializer, RatePlanSerializer, ReservationSerializer
from .availability import get_available_rooms, calculate_price


class GuestProfileViewSet(viewsets.ModelViewSet):
    """
    ViewSet for GuestProfile CRUD.
    Managers & Front Desk can write; all staff can read.
    """

    queryset = GuestProfile.objects.all()
    serializer_class = GuestProfileSerializer
    filter_backends = [DjangoFilterBackend, SearchFilter]
    filterset_fields = ["is_blacklisted"]
    search_fields = ["first_name", "last_name", "phone", "email"]

    def get_permissions(self):
        if self.request.method in permissions.SAFE_METHODS:
            return [IsAnyStaff()]
        return [IsFrontDesk()]


class RatePlanViewSet(viewsets.ModelViewSet):
    """
    ViewSet for RatePlan CRUD.
    Managers can write; all staff can read.
    """

    queryset = RatePlan.objects.all()
    serializer_class = RatePlanSerializer
    filter_backends = [DjangoFilterBackend, OrderingFilter]
    filterset_fields = ["room_type", "is_active"]
    ordering_fields = ["valid_from", "price_per_night"]

    def get_permissions(self):
        if self.request.method in permissions.SAFE_METHODS:
            return [IsAnyStaff()]
        return [IsPropertyManager()]


class ReservationViewSet(viewsets.ModelViewSet):
    """
    ViewSet for Reservation CRUD.
    Managers & Front Desk can write; all staff can read.
    """

    queryset = Reservation.objects.all()
    serializer_class = ReservationSerializer
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ["status", "room", "guest", "check_in_date", "check_out_date"]
    search_fields = ["guest__first_name", "guest__last_name", "guest__phone", "room__room_number"]
    ordering_fields = ["check_in_date", "check_out_date", "created_at", "total_amount"]

    def get_permissions(self):
        if self.request.method in permissions.SAFE_METHODS:
            return [IsAnyStaff()]
        return [IsFrontDesk()]

    @action(detail=True, methods=["post"])
    def confirm(self, request, pk=None):
        """Confirm a reservation."""
        reservation = self.get_object()
        if reservation.status != ReservationStatus.PENDING:
            return Response(
                {"error": f"Cannot confirm a reservation in {reservation.status} state."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        reservation.status = ReservationStatus.CONFIRMED
        reservation.confirmed_at = timezone.now()
        reservation.save()
        
        # Here we would trigger SMS/email notifications.
        
        return Response(ReservationSerializer(reservation).data)

    @action(detail=True, methods=["post"])
    def cancel(self, request, pk=None):
        """Cancel a reservation."""
        reservation = self.get_object()
        reason = request.data.get("cancellation_reason", "")
        
        if reservation.status in [ReservationStatus.CHECKED_OUT, ReservationStatus.CANCELLED]:
            return Response(
                {"error": f"Cannot cancel a reservation in {reservation.status} state."},
                status=status.HTTP_400_BAD_REQUEST,
            )
            
        reservation.status = ReservationStatus.CANCELLED
        reservation.cancelled_at = timezone.now()
        reservation.cancellation_reason = reason
        reservation.save()
        
        return Response(ReservationSerializer(reservation).data)

    @action(detail=False, methods=["get"])
    def today(self, request):
        """Returns check-ins, check-outs, and in-house counts for today."""
        today_val = date.today()
        
        arrivals = self.queryset.filter(check_in_date=today_val, status=ReservationStatus.CONFIRMED)
        departures = self.queryset.filter(check_out_date=today_val, status=ReservationStatus.CHECKED_IN)
        in_house = self.queryset.filter(status=ReservationStatus.CHECKED_IN)

        return Response({
            "arrivals_count": arrivals.count(),
            "departures_count": departures.count(),
            "in_house_count": in_house.count(),
            "arrivals": ReservationSerializer(arrivals[:10], many=True).data,
            "departures": ReservationSerializer(departures[:10], many=True).data,
        })

    @action(detail=False, methods=["get"])
    def check_availability(self, request):
        """Staff endpoint to check room availability and calculate rates."""
        check_in = request.query_params.get("check_in")
        check_out = request.query_params.get("check_out")
        adults = request.query_params.get("adults")
        room_type_id = request.query_params.get("room_type")

        if not check_in or not check_out or not adults:
            return Response(
                {"error": "Missing required query params: check_in, check_out, adults"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            adults_count = int(adults)
        except ValueError:
            return Response({"error": "Invalid adults count format"}, status=status.HTTP_400_BAD_REQUEST)

        available_rooms = get_available_rooms(
            check_in, check_out, adults_count, room_type_id
        )

        # Generate pricing estimates for unique room types
        pricing_estimates = {}
        unique_room_types = RoomType.objects.filter(is_active=True)
        if room_type_id:
            unique_room_types = unique_room_types.filter(id=room_type_id)

        for rt in unique_room_types:
            pricing = calculate_price(rt, check_in, check_out)
            pricing_estimates[rt.id] = {
                "base_price": str(pricing["base_amount"]),
                "tax_price": str(pricing["tax_amount"]),
                "total_price": str(pricing["total_amount"]),
                "nights": pricing["nights"],
                "breakdown": pricing["breakdown"],
            }

        return Response({
            "available_rooms": RoomSerializer(available_rooms, many=True).data,
            "pricing_estimates": pricing_estimates,
        })


# ─────────────────────────────
# Public Guest-Facing APIs
# ─────────────────────────────

class PublicAvailabilityView(APIView):
    """
    Public availability search API for guests (no auth required).
    """
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        check_in = request.query_params.get("check_in")
        check_out = request.query_params.get("check_out")
        adults = request.query_params.get("adults")
        room_type_id = request.query_params.get("room_type")

        if not check_in or not check_out or not adults:
            return Response(
                {"error": "Missing required parameters: check_in, check_out, adults"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            adults_count = int(adults)
        except ValueError:
            return Response({"error": "Invalid adults count"}, status=status.HTTP_400_BAD_REQUEST)

        available_rooms = get_available_rooms(check_in, check_out, adults_count, room_type_id)

        # Get available room types (we group available rooms by type)
        available_type_ids = available_rooms.values_list("room_type_id", flat=True).distinct()
        available_types = RoomType.objects.filter(id__in=available_type_ids, is_active=True)

        results = []
        for rt in available_types:
            pricing = calculate_price(rt, check_in, check_out)
            rt_serializer = RoomTypeSerializer(rt, context={"request": request})
            results.append({
                "room_type": rt_serializer.data,
                "pricing": {
                    "base_price": str(pricing["base_amount"]),
                    "tax_price": str(pricing["tax_amount"]),
                    "total_price": str(pricing["total_amount"]),
                    "nights": pricing["nights"],
                    "breakdown": pricing["breakdown"],
                }
            })

        return Response(results)


class PublicBookingCreateView(APIView):
    """
    Public endpoint to create a reservation from the guest widget.
    Autocreates/looks up GuestProfile by phone number.
    Creates reservation in PENDING state.
    """
    permission_classes = [permissions.AllowAny]

    @transaction.atomic
    def post(self, request):
        guest_data = request.data.get("guest")
        booking_data = request.data.get("booking")

        if not guest_data or not booking_data:
            return Response(
                {"error": "Missing guest or booking payload parameters"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        phone = guest_data.get("phone")
        first_name = guest_data.get("first_name")
        last_name = guest_data.get("last_name")

        if not phone or not first_name or not last_name:
            return Response(
                {"error": "Missing required guest fields: phone, first_name, last_name"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # 1. Fetch or create guest profile based on phone number
        guest, created = GuestProfile.objects.get_or_create(
            phone=phone,
            defaults={
                "first_name": first_name,
                "last_name": last_name,
                "email": guest_data.get("email"),
                "nationality": guest_data.get("nationality", "Nepalese"),
            }
        )

        # 2. Extract booking details
        check_in = booking_data.get("check_in_date")
        check_out = booking_data.get("check_out_date")
        room_type_id = booking_data.get("room_type_id")
        adults = int(booking_data.get("adults", 1))

        # 3. Find first available room of that type
        available_rooms = get_available_rooms(check_in, check_out, adults, room_type_id)
        if not available_rooms.exists():
            return Response(
                {"error": "No rooms of this class are available for the selected dates."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        selected_room = available_rooms.first()

        # 4. Construct reservation record
        res_data = {
            "guest_id": guest.id,
            "room_id": selected_room.id,
            "check_in_date": check_in,
            "check_out_date": check_out,
            "adults": adults,
            "children": int(booking_data.get("children", 0)),
            "infants": int(booking_data.get("infants", 0)),
            "status": ReservationStatus.PENDING,
            "booking_source": BookingSource.ONLINE,
            "special_requests": booking_data.get("special_requests", ""),
        }

        serializer = ReservationSerializer(data=res_data)
        if serializer.is_valid():
            reservation = serializer.save()
            return Response(ReservationSerializer(reservation).data, status=status.HTTP_201_CREATED)
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
