"""
SIA HMS — POS Operations Tests
"""

import pytest
from datetime import date, timedelta
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APIClient
from django_tenants.utils import schema_context
from rest_framework_simplejwt.tokens import RefreshToken

from apps.accounts.models import UserRole, User
from apps.restaurant.models import DiningArea, DiningTable, MenuCategory, MenuItem
from apps.bookings.models import GuestProfile, Reservation, RatePlan, ReservationStatus
from apps.pos.models import Order, OrderItem, KOT
from apps.tenants.models import Client, Domain

pytestmark = pytest.mark.django_db


@pytest.fixture
def test_tenant(db):
    """Creates a test tenant client and domain."""
    # Clean up stale test data if any
    try:
        if Client.objects.filter(schema_name="test_pos_tenant").exists():
            with schema_context("test_pos_tenant"):
                User.objects.filter(username="waiter@postest.com").delete()
    except Exception:
        pass
    try:
        Domain.objects.filter(domain="pos-test.localhost").delete()
        Client.objects.filter(schema_name="test_pos_tenant").delete()
    except Exception:
        pass
    try:
        User.objects.filter(username="waiter@postest.com").delete()
    except Exception:
        pass

    client = Client.objects.create(
        schema_name="test_pos_tenant",
        name="POS Test Hotel",
        contact_email="pos_test@hotel.com",
    )
    domain = Domain.objects.create(
        domain="pos-test.localhost",
        tenant=client,
        is_primary=True,
    )
    yield client


@pytest.fixture
def tenant_staff(test_tenant):
    """Creates a restaurant staff user in the context of the test tenant."""
    with schema_context(test_tenant.schema_name):
        user = User.objects.create(
            username="waiter@postest.com",
            email="waiter@postest.com",
            first_name="Wait",
            last_name="Staff",
            role=UserRole.RESTAURANT_STAFF,
            is_active=True,
        )
        user.set_password("Password123!")
        user.save()
        return user


@pytest.fixture
def tenant_auth_client(test_tenant, tenant_staff):
    """Returns an authenticated APIClient routed to the tenant schema."""
    client = APIClient(HTTP_HOST="pos-test.localhost")
    refresh = RefreshToken.for_user(tenant_staff)
    client.credentials(HTTP_AUTHORIZATION=f"Bearer {str(refresh.access_token)}")
    return client


@pytest.fixture
def sample_setup(test_tenant):
    """Creates basic DiningArea, DiningTable, MenuCategory, MenuItem, and Reservation."""
    with schema_context(test_tenant.schema_name):
        # Dining areas
        area = DiningArea.objects.create(name="Main Dining Room")
        table = DiningTable.objects.create(area=area, table_number="T-12", capacity=4)

        # Menu catalog
        cat = MenuCategory.objects.create(name="Main Entrees", display_order=1)
        burger = MenuItem.objects.create(
            category=cat,
            name="Classic Cheeseburger",
            price=450.00,
            prep_time_minutes=15,
        )

        cat_drinks = MenuCategory.objects.create(name="Beverages", display_order=2)
        coke = MenuItem.objects.create(
            category=cat_drinks,
            name="Coke",
            price=80.00,
            prep_time_minutes=5,
        )

        # Reservation setup
        prop = GuestProfile.objects.create(
            first_name="Hari",
            last_name="Bahadur",
            phone="9801234567",
        )
        
        # We need property for Reservation
        from apps.properties.models import Property, RoomType, Room
        p = Property.objects.create(name="Pokhara Heights", address="Lakeside", city="Pokhara")
        rt = RoomType.objects.create(property=p, name="Deluxe", base_price_per_night=5000)
        room = Room.objects.create(room_type=rt, room_number="301", floor=3)
        
        res = Reservation.objects.create(
            guest=prop,
            room=room,
            check_in_date=date.today(),
            check_out_date=date.today() + timedelta(days=2),
            adults=2,
            total_nights=2,
            base_amount=10000,
            tax_amount=1300,
            total_amount=11300,
            status=ReservationStatus.CHECKED_IN,
        )

        return area, table, burger, coke, res


class TestPOSOperations:
    """Tests the POS order placement, modifications, payments, KDS Done, and room charging."""

    def test_create_order_dinein_success(self, test_tenant, tenant_auth_client, sample_setup):
        area, table, burger, coke, res = sample_setup
        url = reverse("pos-order-list")
        
        payload = {
            "table_id": table.id,
            "order_type": "dine_in",
            "items": [
                {"menu_item_id": burger.id, "quantity": 2},
                {"menu_item_id": coke.id, "quantity": 1},
            ],
            "discount_amount": "50.00",
        }
        
        response = tenant_auth_client.post(url, payload, format="json")
        assert response.status_code == status.HTTP_201_CREATED
        
        # subtotal: (450 * 2) + 80 = 980
        # tax: 980 * 0.13 = 127.4
        # total: 980 + 127.4 - 50 = 1057.4
        assert float(response.data["subtotal"]) == 980.00
        assert float(response.data["total_amount"]) == 1057.40
        assert response.data["table_number"] == "T-12"

        with schema_context(test_tenant.schema_name):
            table.refresh_from_db()
            assert table.status == DiningTable.TableStatus.OCCUPIED
            
            order = Order.objects.get(id=response.data["id"])
            assert OrderItem.objects.filter(order=order).count() == 2
            
            # Hot kitchen KOT and Bar KOT created automatically
            assert KOT.objects.filter(order=order).count() == 2
            assert KOT.objects.filter(order=order, station="hot_kitchen").exists()
            assert KOT.objects.filter(order=order, station="bar").exists()

    def test_add_items_to_order(self, test_tenant, tenant_auth_client, sample_setup):
        area, table, burger, coke, res = sample_setup
        with schema_context(test_tenant.schema_name):
            order = Order.objects.create(
                table=table,
                order_type=Order.OrderType.DINE_IN,
                subtotal=980,
                tax_amount=127.4,
                total_amount=1107.4,
            )
            OrderItem.objects.create(order=order, menu_item=burger, quantity=2, unit_price=450)
            OrderItem.objects.create(order=order, menu_item=coke, quantity=1, unit_price=80)
            
        url = reverse("pos-order-items", kwargs={"pk": order.id})
        payload = {
            "items": [
                {"menu_item_id": coke.id, "quantity": 2},
            ]
        }
        
        response = tenant_auth_client.post(url, payload, format="json")
        assert response.status_code == status.HTTP_201_CREATED
        
        with schema_context(test_tenant.schema_name):
            order.refresh_from_db()
            assert float(order.subtotal) == 1140.00 # 980 + 160
            assert float(order.total_amount) == 1288.20 # 1140 * 1.13
            # New KOT for Coke (bar station)
            assert KOT.objects.filter(order=order, station="bar").exists()

    def test_pay_cash_checkout(self, test_tenant, tenant_auth_client, sample_setup):
        area, table, burger, coke, res = sample_setup
        with schema_context(test_tenant.schema_name):
            order = Order.objects.create(
                table=table,
                order_type=Order.OrderType.DINE_IN,
                subtotal=980,
                tax_amount=127.4,
                total_amount=1107.4,
            )
            table.status = DiningTable.TableStatus.OCCUPIED
            table.save()
            
        url = reverse("pos-order-pay", kwargs={"pk": order.id})
        payload = {"payment_method": "cash"}
        
        response = tenant_auth_client.post(url, payload)
        assert response.status_code == status.HTTP_200_OK
        assert response.data["status"] == "paid"
        
        with schema_context(test_tenant.schema_name):
            table.refresh_from_db()
            # Table transitions to CLEANING status post-payment
            assert table.status == DiningTable.TableStatus.CLEANING

    def test_charge_to_guest_room(self, test_tenant, tenant_auth_client, sample_setup):
        area, table, burger, coke, res = sample_setup
        with schema_context(test_tenant.schema_name):
            order = Order.objects.create(
                table=table,
                order_type=Order.OrderType.DINE_IN,
                subtotal=980,
                tax_amount=127.4,
                total_amount=1107.4,
            )
            
        url = reverse("pos-order-pay", kwargs={"pk": order.id})
        payload = {
            "payment_method": "room",
            "reservation_id": res.id,
        }
        
        response = tenant_auth_client.post(url, payload)
        assert response.status_code == status.HTTP_200_OK
        assert response.data["status"] == "served" # shifts to served, pending guest checkout
        
        with schema_context(test_tenant.schema_name):
            order.refresh_from_db()
            assert order.reservation == res

    def test_kds_mark_kot_done(self, test_tenant, tenant_auth_client, sample_setup):
        area, table, burger, coke, res = sample_setup
        with schema_context(test_tenant.schema_name):
            order = Order.objects.create(
                table=table,
                order_type=Order.OrderType.DINE_IN,
                subtotal=450,
                tax_amount=58.5,
                total_amount=508.5,
            )
            it = OrderItem.objects.create(order=order, menu_item=burger, quantity=1, unit_price=450)
            kot = KOT.objects.create(order=order, station="hot_kitchen")
            kot.items.add(it)
            
        url = reverse("pos-kot-done", kwargs={"pk": kot.id})
        response = tenant_auth_client.post(url)
        assert response.status_code == status.HTTP_200_OK
        assert response.data["status"] == "done"
        
        with schema_context(test_tenant.schema_name):
            it.refresh_from_db()
            assert it.status == OrderItem.ItemStatus.SERVED
