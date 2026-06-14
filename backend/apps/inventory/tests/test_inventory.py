"""
SIA HMS — Inventory Operations Tests
"""

import pytest
from decimal import Decimal
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APIClient
from django_tenants.utils import schema_context
from rest_framework_simplejwt.tokens import RefreshToken

from apps.accounts.models import UserRole, User
from apps.restaurant.models import MenuItem, MenuCategory
from apps.pos.models import Order, OrderItem
from apps.inventory.models import (
    Category,
    InventoryItem,
    Supplier,
    PurchaseOrder,
    POItem,
    StockMovement,
    Recipe,
)
from apps.tenants.models import Client, Domain

pytestmark = pytest.mark.django_db


@pytest.fixture
def test_tenant(db):
    """Creates a test tenant client and domain."""
    # Clean up stale test data if any
    try:
        if Client.objects.filter(schema_name="test_inv_tenant").exists():
            with schema_context("test_inv_tenant"):
                User.objects.filter(username="invmanager@invtest.com").delete()
    except Exception:
        pass
    try:
        Domain.objects.filter(domain="inv-test.localhost").delete()
        Client.objects.filter(schema_name="test_inv_tenant").delete()
    except Exception:
        pass
    try:
        User.objects.filter(username="invmanager@invtest.com").delete()
    except Exception:
        pass

    client = Client.objects.create(
        schema_name="test_inv_tenant",
        name="Inventory Test Hotel",
        contact_email="inv_test@hotel.com",
    )
    domain = Domain.objects.create(
        domain="inv-test.localhost",
        tenant=client,
        is_primary=True,
    )
    yield client


@pytest.fixture
def tenant_manager(test_tenant):
    """Creates an inventory manager user in the context of the test tenant."""
    with schema_context(test_tenant.schema_name):
        user = User.objects.create(
            username="invmanager@invtest.com",
            email="invmanager@invtest.com",
            first_name="Inv",
            last_name="Manager",
            role=UserRole.PROPERTY_MANAGER,
            is_active=True,
        )
        user.set_password("Password123!")
        user.save()
        return user


@pytest.fixture
def tenant_auth_client(test_tenant, tenant_manager):
    """Returns an authenticated APIClient routed to the tenant schema."""
    client = APIClient(HTTP_HOST="inv-test.localhost")
    refresh = RefreshToken.for_user(tenant_manager)
    client.credentials(HTTP_AUTHORIZATION=f"Bearer {str(refresh.access_token)}")
    return client


@pytest.fixture
def sample_setup(test_tenant):
    """Creates basic category, items, supplier, and menu item."""
    with schema_context(test_tenant.schema_name):
        cat = Category.objects.create(name="Raw Materials")
        item1 = InventoryItem.objects.create(
            category=cat,
            name="Chicken Breast",
            sku="RAW-CHK-01",
            unit=InventoryItem.UnitChoices.KG,
            current_stock=Decimal("10.0000"),
            reorder_level=Decimal("5.0000"),
            max_stock=Decimal("50.0000"),
            cost_price=Decimal("450.00"),
        )
        item2 = InventoryItem.objects.create(
            category=cat,
            name="Cooking Oil",
            sku="RAW-OIL-01",
            unit=InventoryItem.UnitChoices.LITRE,
            current_stock=Decimal("5.0000"),
            reorder_level=Decimal("2.0000"),
            max_stock=Decimal("20.0000"),
            cost_price=Decimal("250.00"),
        )
        supplier = Supplier.objects.create(
            name="Kathmandu Fresh Foods",
            phone="9801234567",
            email="info@freshfoods.com.np",
            rating=5,
        )
        m_cat = MenuCategory.objects.create(name="Main Course")
        menu_item = MenuItem.objects.create(
            category=m_cat,
            name="Butter Chicken",
            price=650.00,
            is_available=True,
        )
        # Create recipe for butter chicken
        recipe1 = Recipe.objects.create(
            menu_item=menu_item,
            ingredient=item1,
            quantity_per_serving=Decimal("0.3500"),
            unit="kg",
        )
        recipe2 = Recipe.objects.create(
            menu_item=menu_item,
            ingredient=item2,
            quantity_per_serving=Decimal("0.0500"),
            unit="litre",
        )
        return cat, item1, item2, supplier, menu_item


class TestInventoryOperations:
    """Tests inventory categories, items, stock adjustments, Purchase Orders (GRNs), and recipes."""

    def test_adjust_stock_manual(self, test_tenant, tenant_auth_client, sample_setup):
        cat, item1, item2, supplier, menu_item = sample_setup
        url = reverse("inventoryitem-adjust", kwargs={"pk": item1.id})
        payload = {
            "quantity": 5.5000,
            "notes": "Added raw supplies",
            "movement_type": "manual_in",
        }

        response = tenant_auth_client.post(url, payload, format="json")
        assert response.status_code == status.HTTP_200_OK
        assert Decimal(response.data["current_stock"]) == Decimal("15.5000")

        with schema_context(test_tenant.schema_name):
            item1.refresh_from_db()
            assert item1.current_stock == Decimal("15.5000")
            
            # Verify StockMovement was logged
            movement = StockMovement.objects.filter(item=item1, movement_type="manual_in").first()
            assert movement is not None
            assert movement.quantity == Decimal("5.5000")
            assert movement.notes == "Added raw supplies"

    def test_create_purchase_order_nested_items(self, test_tenant, tenant_auth_client, sample_setup):
        cat, item1, item2, supplier, menu_item = sample_setup
        url = reverse("purchaseorder-list")
        payload = {
            "supplier_id": supplier.id,
            "expected_date": "2026-06-20",
            "notes": "Weekly raw order",
            "items": [
                {"item_id": item1.id, "quantity": 20.0000, "unit_price": 440.00},
                {"item_id": item2.id, "quantity": 10.0000, "unit_price": 240.00},
            ],
        }

        response = tenant_auth_client.post(url, payload, format="json")
        print("PO CREATION RESPONSE:", response.content)
        assert response.status_code == status.HTTP_201_CREATED
        assert Decimal(response.data["total_amount"]) == Decimal("11200.00") # (20*440) + (10*240)

        with schema_context(test_tenant.schema_name):
            po = PurchaseOrder.objects.get(id=response.data["id"])
            assert po.items.count() == 2
            assert po.status == PurchaseOrder.POStatus.DRAFT

    def test_receive_purchase_order_grn(self, test_tenant, tenant_auth_client, sample_setup):
        cat, item1, item2, supplier, menu_item = sample_setup
        
        with schema_context(test_tenant.schema_name):
            po = PurchaseOrder.objects.create(supplier=supplier, status=PurchaseOrder.POStatus.SENT)
            po_item1 = POItem.objects.create(po=po, item=item1, quantity=10.00, unit_price=450.00)
            po_item2 = POItem.objects.create(po=po, item=item2, quantity=5.00, unit_price=250.00)

        url = reverse("purchaseorder-receive", kwargs={"pk": po.id})
        # Partial receipt payload
        payload = {
            "items": [
                {"po_item_id": po_item1.id, "received_qty": 6.00},
                {"po_item_id": po_item2.id, "received_qty": 5.00},
            ]
        }

        response = tenant_auth_client.post(url, payload, format="json")
        assert response.status_code == status.HTTP_200_OK
        assert response.data["status"] == PurchaseOrder.POStatus.PARTIAL

        with schema_context(test_tenant.schema_name):
            item1.refresh_from_db()
            item2.refresh_from_db()
            # Chicken Breast stock 10 + received 6 = 16
            assert item1.current_stock == Decimal("16.0000")
            assert item1.last_purchase_price == Decimal("450.00")
            # Cooking Oil stock 5 + received 5 = 10
            assert item2.current_stock == Decimal("10.0000")
            assert item2.last_purchase_price == Decimal("250.00")

            # Check PO status is updated and item quantities are recorded
            po.refresh_from_db()
            assert po.status == PurchaseOrder.POStatus.PARTIAL
            po_item1.refresh_from_db()
            po_item2.refresh_from_db()
            assert po_item1.received_qty == Decimal("6.0000")
            assert po_item2.received_qty == Decimal("5.0000")

            # Verify purchase_in movements
            assert StockMovement.objects.filter(
                item=item1,
                movement_type="purchase_in",
                quantity=Decimal("6.0000"),
                reference_id=po.id,
            ).exists()

    def test_recipe_autodeduction_on_served_order(self, test_tenant, tenant_auth_client, sample_setup):
        cat, item1, item2, supplier, menu_item = sample_setup

        with schema_context(test_tenant.schema_name):
            # 1. Create a POS order
            order = Order.objects.create(
                order_type=Order.OrderType.DINE_IN,
                status=Order.OrderStatus.PENDING,
            )
            order_item = OrderItem.objects.create(
                order=order,
                menu_item=menu_item,
                quantity=2, # Requires 2 * 0.35kg chicken breast & 2 * 0.05l cooking oil
                unit_price=menu_item.price,
                status=OrderItem.ItemStatus.PENDING,
            )
            
            # Initial stocks: Chicken 10kg, Oil 5l
            assert item1.current_stock == Decimal("10.0000")
            assert item2.current_stock == Decimal("5.0000")

            # 2. Transition OrderItem status to SERVED
            order_item.status = OrderItem.ItemStatus.SERVED
            order_item.save()

            # 3. Check stocks are decremented
            item1.refresh_from_db()
            item2.refresh_from_db()
            # chicken breast: 10 - (2 * 0.35) = 9.30
            assert item1.current_stock == Decimal("9.3000")
            # cooking oil: 5 - (2 * 0.05) = 4.90
            assert item2.current_stock == Decimal("4.9000")

            # 4. Verify StockMovements
            assert StockMovement.objects.filter(
                item=item1,
                movement_type=StockMovement.MovementType.RECIPE_OUT,
                quantity=Decimal("0.7000"),
                reference_id=order_item.id,
            ).exists()

            assert StockMovement.objects.filter(
                item=item2,
                movement_type=StockMovement.MovementType.RECIPE_OUT,
                quantity=Decimal("0.1000"),
                reference_id=order_item.id,
            ).exists()

            # 5. Save again to test deduplication defense
            order_item.notes = "Adding custom instructions to served item"
            order_item.save()

            item1.refresh_from_db()
            # Chicken breast stock should remain 9.30, no second deduction
            assert item1.current_stock == Decimal("9.3000")
            assert StockMovement.objects.filter(
                item=item1,
                movement_type=StockMovement.MovementType.RECIPE_OUT,
                reference_id=order_item.id,
            ).count() == 1
