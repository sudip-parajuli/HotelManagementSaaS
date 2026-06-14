"""
SIA HMS — Front Desk Operations Views
"""

from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.db import transaction
from django.utils import timezone
from datetime import date

from apps.accounts.permissions import IsFrontDesk, IsPropertyManager, IsAnyStaff
from apps.bookings.models import Reservation, ReservationStatus, GuestProfile, BookingSource
from apps.bookings.serializers import ReservationSerializer
from apps.properties.models import Room, RoomStatus
from apps.housekeeping.models import HousekeepingTask, HousekeepingStatus, HousekeepingPriority
from apps.billing.models import Invoice, InvoiceStatus
from apps.loyalty.models import LoyaltyAccount, LoyaltyTransaction

from .models import CheckIn, CheckOut
from .serializers import CheckInSerializer, CheckOutSerializer, WalkInSerializer


class FrontDeskViewSet(viewsets.ViewSet):
    """
    Exposes endpoints for guest check-ins, check-outs, and quick walk-ins.
    """
    permission_classes = [IsAuthenticated, IsFrontDesk | IsPropertyManager]

    @action(detail=False, methods=["get"], permission_classes=[IsAuthenticated, IsAnyStaff])
    def today(self, request):
        """
        Retrieves today's operations statistics and arrivals, departures, and in-house guest listings.
        """
        today = date.today()
        
        # Arrivals: reservations starting today with status CONFIRMED
        arrivals = Reservation.objects.filter(
            check_in_date=today,
            status=ReservationStatus.CONFIRMED,
        )
        
        # Departures: reservations ending today with status CHECKED_IN
        departures = Reservation.objects.filter(
            check_out_date=today,
            status=ReservationStatus.CHECKED_IN,
        )
        
        # In-House: reservations with status CHECKED_IN
        in_house = Reservation.objects.filter(
            status=ReservationStatus.CHECKED_IN,
        )
        
        # Calculate active room occupancy percentage rate
        total_rooms = Room.objects.filter(is_active=True).count()
        occupied_rooms = Room.objects.filter(is_active=True, status=RoomStatus.OCCUPIED).count()
        occupancy_rate = (occupied_rooms / total_rooms * 100.0) if total_rooms > 0 else 0.0
        
        return Response({
            "arrivals": ReservationSerializer(arrivals, many=True).data,
            "departures": ReservationSerializer(departures, many=True).data,
            "in_house": ReservationSerializer(in_house, many=True).data,
            "occupancy_rate": round(occupancy_rate, 2),
        })

    @action(detail=False, methods=["post"])
    def checkin(self, request):
        """
        Executes a check-in transaction. Transitioning Reservation and Room status.
        """
        serializer = CheckInSerializer(data=request.data, context={"request": request})
        serializer.is_valid(raise_exception=True)
        
        res_id = serializer.validated_data["reservation_id"]
        
        with transaction.atomic():
            res = Reservation.objects.select_for_update().get(id=res_id)
            
            # Create CheckIn record
            checkin_record = serializer.save(
                reservation=res,
                checked_in_by=request.user,
            )
            
            # Transition statuses
            res.status = ReservationStatus.CHECKED_IN
            res.save()
            
            room = res.room
            room.status = RoomStatus.OCCUPIED
            room.save()
            
        return Response(serializer.data, status=status.HTTP_201_CREATED)

    @action(detail=False, methods=["post"])
    def checkout(self, request):
        """
        Executes a check-out transaction. Compiles invoice balances and triggers housekeeping alerts.
        """
        serializer = CheckOutSerializer(data=request.data, context={"request": request})
        serializer.is_valid(raise_exception=True)
        
        res_id = serializer.validated_data["reservation_id"]
        payment_method = serializer.validated_data.get("payment_method", CheckOut.PaymentMethodChoices.CASH)
        additional_charges = serializer.validated_data.get("additional_charges", [])
        
        with transaction.atomic():
            res = Reservation.objects.select_for_update().get(id=res_id)
            
            # Room bill components
            subtotal = res.base_amount
            tax_amount = res.tax_amount
            discount_amount = res.discount_amount
            total_room_charges = res.total_amount
            
            # Aggregate custom line items
            additional_total = 0
            for item in additional_charges:
                additional_total += item.get("amount", 0)
            
            grand_total = total_room_charges + additional_total
            
            # Create Invoice record
            invoice = Invoice.objects.create(
                reservation=res,
                subtotal=subtotal + additional_total,
                discount_amount=discount_amount,
                tax_amount=tax_amount,
                total_amount=grand_total,
                paid_amount=grand_total,
                balance_due=0.00,
                status=InvoiceStatus.PAID,
            )
            
            # Create CheckOut record
            checkout_record = serializer.save(
                reservation=res,
                checked_out_by=request.user,
                final_amount=grand_total,
            )
            
            # Transition reservation to checked_out and room to dirty
            res.status = ReservationStatus.CHECKED_OUT
            res.save()
            
            room = res.room
            room.status = RoomStatus.DIRTY
            room.save()
            
            # Trigger Housekeeping Task
            HousekeepingTask.objects.create(
                room=room,
                status=HousekeepingStatus.PENDING,
                priority=HousekeepingPriority.HIGH,
                notes=f"Post check-out cleaning for Room {room.room_number}.",
            )
            
            # Credit Loyalty Points (1 point per Rs. 100 spent)
            points_earned = int(grand_total // 100)
            if points_earned > 0:
                loyalty_acc, created = LoyaltyAccount.objects.get_or_create(
                    guest=res.guest,
                    defaults={"points_balance": 0},
                )
                loyalty_acc.points_balance += points_earned
                loyalty_acc.save()
                
                LoyaltyTransaction.objects.create(
                    account=loyalty_acc,
                    points=points_earned,
                    transaction_type=LoyaltyTransaction.TransactionType.EARN,
                    description=f"Earned points from Reservation #{res.id} checkout.",
                )
                
        return Response({
            "checkout_id": checkout_record.id,
            "invoice_id": invoice.id,
            "invoice_number": invoice.invoice_number,
            "total_amount": str(grand_total),
            "checkout_summary": f"Checked out room {room.room_number}. Settled Rs. {grand_total} via {payment_method}.",
        }, status=status.HTTP_200_OK)

    @action(detail=False, methods=["post"])
    def walkin(self, request):
        """
        Walk-in transaction check-in. Combines profile, reservation and check-in into one atomic block.
        """
        serializer = WalkInSerializer(data=request.data, context={"request": request})
        serializer.is_valid(raise_exception=True)
        
        data = serializer.validated_data
        
        with transaction.atomic():
            # Create GuestProfile
            guest = GuestProfile.objects.create(
                first_name=data["first_name"],
                last_name=data["last_name"],
                phone=data["phone"],
                email=data.get("email"),
                nationality=data.get("nationality", "Nepalese"),
                id_type=data.get("id_type"),
                id_number=data.get("id_number", ""),
            )
            
            room = Room.objects.select_for_update().get(id=data["room_id"])
            
            # Calculate pricing
            from apps.bookings.availability import calculate_price
            pricing = calculate_price(room.room_type, data["check_in_date"], data["check_out_date"])
            
            # Create Reservation
            res = Reservation.objects.create(
                guest=guest,
                room=room,
                check_in_date=data["check_in_date"],
                check_out_date=data["check_out_date"],
                adults=data["adults"],
                status=ReservationStatus.CHECKED_IN,
                booking_source=BookingSource.WALK_IN,
                total_nights=pricing["nights"],
                base_amount=pricing["base_amount"],
                tax_amount=pricing["tax_amount"],
                total_amount=pricing["total_amount"],
                special_requests=data.get("special_requests", ""),
                created_by=request.user,
            )
            
            # Set Room to OCCUPIED
            room.status = RoomStatus.OCCUPIED
            room.save()
            
            # Create CheckIn
            checkin_record = CheckIn.objects.create(
                reservation=res,
                checked_in_by=request.user,
                key_issued=data.get("key_issued", ""),
                locker_number=data.get("locker_number", ""),
                notes=data.get("notes", ""),
            )
            
        return Response({
            "reservation": ReservationSerializer(res).data,
            "checkin_id": checkin_record.id,
        }, status=status.HTTP_201_CREATED)
