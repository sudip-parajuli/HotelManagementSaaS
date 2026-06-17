import os
import django
import random
from datetime import date, timedelta
from decimal import Decimal

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings.development")
django.setup()

from django.db import transaction
from django.utils import timezone
from django_tenants.utils import tenant_context

from apps.tenants.models import Client, Domain
from apps.subscriptions.models import SubscriptionPlan, TenantSubscription, SubscriptionStatus
from apps.accounts.models import User, UserRole


def seed_lahana():
    schema_name = "lahana_resort"
    tenant = Client.objects.filter(schema_name=schema_name).first()

    if not tenant:
        print("Creating tenant 'lahana_resort'...")
        plan = SubscriptionPlan.objects.filter(slug="enterprise", is_active=True).first()
        if not plan:
            plan = SubscriptionPlan.objects.create(
                name="Enterprise",
                slug="enterprise",
                price_monthly=Decimal("12000.00"),
                is_active=True
            )
        
        tenant = Client.objects.create(
            schema_name=schema_name,
            name="Lahana Resort",
            contact_email="manager@lahana.com",
            contact_phone="9801234567",
            subscription_plan="enterprise",
            is_active=True
        )
        
        Domain.objects.create(
            domain="lahana.localhost",
            tenant=tenant,
            is_primary=True
        )
        
        today = timezone.localdate()
        TenantSubscription.objects.create(
            tenant=tenant,
            plan=plan,
            status=SubscriptionStatus.ACTIVE,
            current_period_start=today,
            current_period_end=today + timedelta(days=30),
            next_billing_date=today + timedelta(days=30)
        )
        print("Tenant 'lahana_resort' created.")
    else:
        print("Tenant 'lahana_resort' already exists.")

    users_data = [
        {
            "username": "manager@lahana.com",
            "email": "manager@lahana.com",
            "first_name": "Roshan",
            "last_name": "Adhikari",
            "role": UserRole.PROPERTY_MANAGER,
            "password": "LahanaPassword123!",
            "phone": "9801111111",
        },
        {
            "username": "receptionist@lahana.com",
            "email": "receptionist@lahana.com",
            "first_name": "Sajina",
            "last_name": "Shrestha",
            "role": UserRole.FRONT_DESK,
            "password": "LahanaPassword123!",
            "phone": "9802222222",
        },
        {
            "username": "housekeeper@lahana.com",
            "email": "housekeeper@lahana.com",
            "first_name": "Niranjan",
            "last_name": "Thapa",
            "role": UserRole.HOUSEKEEPING,
            "password": "LahanaPassword123!",
            "phone": "9803333333",
        },
        {
            "username": "chef@lahana.com",
            "email": "chef@lahana.com",
            "first_name": "Prem",
            "last_name": "Gurung",
            "role": UserRole.RESTAURANT_STAFF,
            "password": "LahanaPassword123!",
            "phone": "9804444444",
        },
        {
            "username": "inventory@lahana.com",
            "email": "inventory@lahana.com",
            "first_name": "Bikram",
            "last_name": "Karki",
            "role": UserRole.INVENTORY_MANAGER,
            "password": "LahanaPassword123!",
            "phone": "9805555555",
        },
        {
            "username": "accountant@lahana.com",
            "email": "accountant@lahana.com",
            "first_name": "Mina",
            "last_name": "Dahal",
            "role": UserRole.ACCOUNTANT,
            "password": "LahanaPassword123!",
            "phone": "9806666666",
        },
    ]

    print("Seeding users...")
    created_users = {}
    for udata in users_data:
        user = User.objects.filter(email=udata["email"]).first()
        if user:
            print(f"User {udata['email']} already exists. Updating...")
            user.username = udata["username"]
            user.first_name = udata["first_name"]
            user.last_name = udata["last_name"]
            user.role = udata["role"]
            user.phone = udata["phone"]
            user.is_active = True
            user.set_password(udata["password"])
            user.save()
        else:
            user = User.objects.create(
                username=udata["username"],
                email=udata["email"],
                first_name=udata["first_name"],
                last_name=udata["last_name"],
                role=udata["role"],
                phone=udata["phone"],
                preferred_language="en",
                is_active=True
            )
            user.set_password(udata["password"])
            user.save()
            print(f"User {udata['email']} created.")
        created_users[udata["role"]] = user

    # Seeding tenant models inside tenant schema context
    print("Entering tenant context for 'lahana_resort' to seed data...")
    with tenant_context(tenant):
        from apps.properties.models import Property, Amenity, RoomType, Room
        from apps.bookings.models import GuestProfile, Reservation, RatePlan
        from apps.frontdesk.models import CheckIn, CheckOut
        from apps.restaurant.models import DiningArea, DiningTable, MenuCategory, MenuItem
        from apps.pos.models import Order, OrderItem, KOT
        from apps.housekeeping.models import HousekeepingTask, MaintenanceRequest
        from apps.billing.models import Invoice, InvoiceItem, Payment, InvoiceItemType, InvoiceType
        from apps.payments.models import PaymentTransaction
        from apps.staff.models import Department, StaffMember
        from apps.hr.models import Shift, Attendance, LeaveType, LeaveBalance, LeaveRequest
        from apps.payroll.models import PayrollPeriod, PayrollEntry
        from apps.inventory.models import Category as InvCategory, InventoryItem, Supplier, PurchaseOrder, POItem, StockMovement, Recipe
        from apps.crm.models import GuestTag, GuestActivity, Campaign
        from apps.loyalty.models import LoyaltyAccount, LoyaltyTransaction
        from apps.analytics.models import DailyMetric

        # Clear existing tenant records
        print("Cleaning up old tenant data...")
        KOT.objects.all().delete()
        OrderItem.objects.all().delete()
        Order.objects.all().delete()
        MaintenanceRequest.objects.all().delete()
        HousekeepingTask.objects.all().delete()
        DailyMetric.objects.all().delete()
        LoyaltyTransaction.objects.all().delete()
        LoyaltyAccount.objects.all().delete()
        Campaign.objects.all().delete()
        GuestActivity.objects.all().delete()
        GuestTag.objects.all().delete()
        Recipe.objects.all().delete()
        StockMovement.objects.all().delete()
        POItem.objects.all().delete()
        PurchaseOrder.objects.all().delete()
        Supplier.objects.all().delete()
        InventoryItem.objects.all().delete()
        InvCategory.objects.all().delete()
        PayrollEntry.objects.all().delete()
        PayrollPeriod.objects.all().delete()
        LeaveRequest.objects.all().delete()
        LeaveBalance.objects.all().delete()
        LeaveType.objects.all().delete()
        Attendance.objects.all().delete()
        Shift.objects.all().delete()
        StaffMember.objects.all().delete()
        Department.objects.all().delete()
        PaymentTransaction.objects.all().delete()
        Payment.objects.all().delete()
        InvoiceItem.objects.all().delete()
        Invoice.objects.all().delete()
        CheckOut.objects.all().delete()
        CheckIn.objects.all().delete()
        Reservation.objects.all().delete()
        RatePlan.objects.all().delete()
        GuestProfile.objects.all().delete()
        Room.objects.all().delete()
        RoomType.objects.all().delete()
        Amenity.objects.all().delete()
        MenuItem.objects.all().delete()
        MenuCategory.objects.all().delete()
        DiningTable.objects.all().delete()
        DiningArea.objects.all().delete()
        Property.objects.all().delete()

        # 1. Property
        prop = Property.objects.create(
            name="Lahana Resort",
            tagline="Tranquil Lakeside Luxury",
            address="Lakeside Ward 6, Pokhara",
            city="Pokhara",
            country="Nepal",
            phone="061-460123",
            email="info@lahanaresort.com",
            website="https://lahanaresort.com",
            vat_number="601234567",
            pan_number="601234567",
            check_in_time="14:00:00",
            check_out_time="12:00:00",
        )
        print("Property created.")

        # Amenities
        amenities_data = [
            {"name": "High-Speed Wi-Fi", "icon": "wifi", "category": Amenity.Category.ROOM},
            {"name": "Smart LED TV", "icon": "tv", "category": Amenity.Category.MEDIA},
            {"name": "Mini Bar", "icon": "cup-soda", "category": Amenity.Category.FOOD},
            {"name": "Private Balcony", "icon": "sunset", "category": Amenity.Category.ROOM},
            {"name": "Luxury Bathtub", "icon": "bath", "category": Amenity.Category.BATHROOM},
            {"name": "Air Conditioning", "icon": "wind", "category": Amenity.Category.ROOM},
        ]
        amenities = []
        for am_data in amenities_data:
            am = Amenity.objects.create(**am_data)
            amenities.append(am)
        print(f"Created {len(amenities)} amenities.")

        # RoomType
        room_types_data = [
            {"name": "Deluxe King Room", "base_price_per_night": Decimal("7500.00"), "max_occupancy": 2},
            {"name": "Lakeside Suite", "base_price_per_night": Decimal("15000.00"), "max_occupancy": 3},
            {"name": "Family Suite", "base_price_per_night": Decimal("18000.00"), "max_occupancy": 4},
            {"name": "Standard Queen Room", "base_price_per_night": Decimal("5000.00"), "max_occupancy": 2},
            {"name": "Presidential Villa", "base_price_per_night": Decimal("45000.00"), "max_occupancy": 6},
        ]
        room_types = []
        for rt_data in room_types_data:
            rt = RoomType.objects.create(
                property=prop,
                name=rt_data["name"],
                base_price_per_night=rt_data["base_price_per_night"],
                max_occupancy=rt_data["max_occupancy"],
                is_active=True,
            )
            rt.amenities.set(random.sample(amenities, k=3))
            room_types.append(rt)
        print(f"Created {len(room_types)} room types.")

        # Room
        rooms_data = [
            {"room_number": "101", "floor": 1, "room_type": room_types[0]},
            {"room_number": "102", "floor": 1, "room_type": room_types[3]},
            {"room_number": "201", "floor": 2, "room_type": room_types[1]},
            {"room_number": "202", "floor": 2, "room_type": room_types[2]},
            {"room_number": "301", "floor": 3, "room_type": room_types[4]},
            {"room_number": "302", "floor": 3, "room_type": room_types[0]},
        ]
        rooms = []
        for r_data in rooms_data:
            r = Room.objects.create(
                room_number=r_data["room_number"],
                floor=r_data["floor"],
                room_type=r_data["room_type"],
                status="available",
                is_active=True,
            )
            rooms.append(r)
        print(f"Created {len(rooms)} rooms.")

        # 2. Bookings
        guests_data = [
            {"first_name": "Ramesh", "last_name": "Thapa", "email": "ramesh@gmail.com", "phone": "9841234567", "nationality": "Nepalese"},
            {"first_name": "Sita", "last_name": "Shrestha", "email": "sita@yahoo.com", "phone": "9812345678", "nationality": "Nepalese"},
            {"first_name": "David", "last_name": "Miller", "email": "david.miller@gmail.com", "phone": "+14155552671", "nationality": "American"},
            {"first_name": "Aayush", "last_name": "Poudel", "email": "aayush@outlook.com", "phone": "9851029384", "nationality": "Nepalese"},
            {"first_name": "Nisha", "last_name": "Sharma", "email": "nisha.sharma@gmail.com", "phone": "9809876543", "nationality": "Nepalese"},
        ]
        guests = []
        for g_data in guests_data:
            g = GuestProfile.objects.create(**g_data)
            guests.append(g)
        print(f"Created {len(guests)} guest profiles.")

        # RatePlan
        rate_plans_data = [
            {"name": "Standard Rate", "price_per_night": Decimal("7500.00"), "room_type": room_types[0]},
            {"name": "Lakeside Stay Special", "price_per_night": Decimal("14000.00"), "room_type": room_types[1]},
            {"name": "Family Getaway Package", "price_per_night": Decimal("17000.00"), "room_type": room_types[2]},
            {"name": "Budget Queen Rate", "price_per_night": Decimal("4800.00"), "room_type": room_types[3]},
            {"name": "Royal Villa Package", "price_per_night": Decimal("42000.00"), "room_type": room_types[4]},
        ]
        rate_plans = []
        today_date = date.today()
        for rp_data in rate_plans_data:
            rp = RatePlan.objects.create(
                name=rp_data["name"],
                room_type=rp_data["room_type"],
                price_per_night=rp_data["price_per_night"],
                valid_from=today_date - timedelta(days=30),
                valid_to=today_date + timedelta(days=365),
                is_active=True,
            )
            rate_plans.append(rp)
        print(f"Created {len(rate_plans)} rate plans.")

        # Reservation
        reservations_data = [
            {
                "guest": guests[0],
                "room": rooms[0],
                "check_in_date": today_date - timedelta(days=5),
                "check_out_date": today_date - timedelta(days=3),
                "status": "checked_out",
                "total_nights": 2,
                "base_amount": Decimal("15000.00"),
                "tax_amount": Decimal("1950.00"),
                "total_amount": Decimal("16950.00"),
            },
            {
                "guest": guests[1],
                "room": rooms[2],
                "check_in_date": today_date - timedelta(days=1),
                "check_out_date": today_date + timedelta(days=2),
                "status": "checked_in",
                "total_nights": 3,
                "base_amount": Decimal("45000.00"),
                "tax_amount": Decimal("5850.00"),
                "total_amount": Decimal("50850.00"),
            },
            {
                "guest": guests[2],
                "room": rooms[4],
                "check_in_date": today_date,
                "check_out_date": today_date + timedelta(days=4),
                "status": "confirmed",
                "total_nights": 4,
                "base_amount": Decimal("180000.00"),
                "tax_amount": Decimal("23400.00"),
                "total_amount": Decimal("203400.00"),
            },
            {
                "guest": guests[3],
                "room": rooms[1],
                "check_in_date": today_date + timedelta(days=5),
                "check_out_date": today_date + timedelta(days=7),
                "status": "confirmed",
                "total_nights": 2,
                "base_amount": Decimal("10000.00"),
                "tax_amount": Decimal("1300.00"),
                "total_amount": Decimal("11300.00"),
            },
            {
                "guest": guests[4],
                "room": rooms[3],
                "check_in_date": today_date - timedelta(days=10),
                "check_out_date": today_date - timedelta(days=8),
                "status": "checked_out",
                "total_nights": 2,
                "base_amount": Decimal("36000.00"),
                "tax_amount": Decimal("4680.00"),
                "total_amount": Decimal("40680.00"),
            },
        ]
        reservations = []
        for res_data in reservations_data:
            res = Reservation.objects.create(
                guest=res_data["guest"],
                room=res_data["room"],
                check_in_date=res_data["check_in_date"],
                check_out_date=res_data["check_out_date"],
                status=res_data["status"],
                total_nights=res_data["total_nights"],
                base_amount=res_data["base_amount"],
                tax_amount=res_data["tax_amount"],
                total_amount=res_data["total_amount"],
                created_by=created_users[UserRole.FRONT_DESK],
            )
            reservations.append(res)
        print(f"Created {len(reservations)} reservations.")

        for res in reservations:
            if res.status == "checked_in":
                res.room.status = "occupied"
                res.room.save()

        # 3. Front Desk (CheckIns and CheckOuts)
        checkins_to_create = [
            {"reservation": reservations[0], "key_issued": "KEY-101", "locker_number": "L-12"},
            {"reservation": reservations[1], "key_issued": "KEY-201", "locker_number": "L-14"},
            {"reservation": reservations[4], "key_issued": "KEY-202", "locker_number": "L-18"},
        ]
        # Adding more checked_out reservations to satisfy at least 5 checkins and checkouts
        extra_res_data = [
            {
                "guest": guests[0],
                "room": rooms[5],
                "check_in_date": today_date - timedelta(days=15),
                "check_out_date": today_date - timedelta(days=12),
                "status": "checked_out",
                "total_nights": 3,
                "base_amount": Decimal("22500.00"),
                "tax_amount": Decimal("2925.00"),
                "total_amount": Decimal("25425.00"),
            },
            {
                "guest": guests[1],
                "room": rooms[1],
                "check_in_date": today_date - timedelta(days=8),
                "check_out_date": today_date - timedelta(days=6),
                "status": "checked_out",
                "total_nights": 2,
                "base_amount": Decimal("10000.00"),
                "tax_amount": Decimal("1300.00"),
                "total_amount": Decimal("11300.00"),
            },
            {
                "guest": guests[2],
                "room": rooms[0],
                "check_in_date": today_date - timedelta(days=20),
                "check_out_date": today_date - timedelta(days=18),
                "status": "checked_out",
                "total_nights": 2,
                "base_amount": Decimal("15000.00"),
                "tax_amount": Decimal("1950.00"),
                "total_amount": Decimal("16950.00"),
            }
        ]
        for data in extra_res_data:
            res = Reservation.objects.create(
                guest=data["guest"],
                room=data["room"],
                check_in_date=data["check_in_date"],
                check_out_date=data["check_out_date"],
                status=data["status"],
                total_nights=data["total_nights"],
                base_amount=data["base_amount"],
                tax_amount=data["tax_amount"],
                total_amount=data["total_amount"],
                created_by=created_users[UserRole.FRONT_DESK],
            )
            reservations.append(res)
            checkins_to_create.append({"reservation": res, "key_issued": "KEY-TEMP", "locker_number": "L-TEMP"})

        checkins = []
        for c_data in checkins_to_create:
            ci = CheckIn.objects.create(
                reservation=c_data["reservation"],
                key_issued=c_data["key_issued"],
                locker_number=c_data["locker_number"],
                checked_in_by=created_users[UserRole.FRONT_DESK],
                notes="Smooth checkin process.",
            )
            checkins.append(ci)
        print(f"Created {len(checkins)} check-in records.")

        checkout_res = [reservations[0], reservations[4], reservations[5], reservations[6], reservations[7]]
        checkouts = []
        for res in checkout_res:
            co = CheckOut.objects.create(
                reservation=res,
                checked_out_by=created_users[UserRole.FRONT_DESK],
                final_amount=res.total_amount,
                payment_method=CheckOut.PaymentMethodChoices.CASH,
                feedback_rating=random.choice([4, 5]),
                feedback_comment="Fantastic lakeside resort, excellent hospitality!"
            )
            checkouts.append(co)
        print(f"Created {len(checkouts)} check-out records.")

        # 4. Restaurant
        dining_areas_data = ["Garden Restaurant", "Lakeside Patio", "Pool Bar", "Indoor Diner", "Rooftop Lounge"]
        dining_areas = []
        for da_name in dining_areas_data:
            da = DiningArea.objects.create(name=da_name, is_active=True)
            dining_areas.append(da)

        dining_tables = []
        for i in range(1, 7):
            dt = DiningTable.objects.create(
                table_number=f"T{i}",
                area=dining_areas[i % len(dining_areas)],
                capacity=random.choice([2, 4, 6, 8]),
                status=DiningTable.TableStatus.AVAILABLE
            )
            dining_tables.append(dt)
        print(f"Created {len(dining_tables)} dining tables.")

        menu_categories_data = [
            {"name": "Starters & Appetizers", "display_order": 1, "icon": "utensils"},
            {"name": "Traditional Nepalese Thali", "display_order": 2, "icon": "soup"},
            {"name": "Continental Mains", "display_order": 3, "icon": "chef-hat"},
            {"name": "Desserts & Pastries", "display_order": 4, "icon": "cake"},
            {"name": "Beverages & Mocktails", "display_order": 5, "icon": "coffee"},
        ]
        menu_categories = []
        for mc_data in menu_categories_data:
            mc = MenuCategory.objects.create(**mc_data)
            menu_categories.append(mc)

        menu_items_data = [
            {"name": "Chicken Momo", "category": menu_categories[0], "price": Decimal("350.00"), "cost_price": Decimal("120.00"), "prep_time_minutes": 15},
            {"name": "Traditional Thakali Thali (Mutton)", "category": menu_categories[1], "price": Decimal("850.00"), "cost_price": Decimal("300.00"), "prep_time_minutes": 25},
            {"name": "Grilled Pokhara Trout", "category": menu_categories[2], "price": Decimal("1200.00"), "cost_price": Decimal("450.00"), "prep_time_minutes": 20},
            {"name": "Yomari with Chocolate Fill", "category": menu_categories[3], "price": Decimal("300.00"), "cost_price": Decimal("90.00"), "prep_time_minutes": 15},
            {"name": "Himalayan Pink Salt Lemonade", "category": menu_categories[4], "price": Decimal("250.00"), "cost_price": Decimal("60.00"), "prep_time_minutes": 5},
            {"name": "Paneer Chilli", "category": menu_categories[0], "price": Decimal("400.00"), "cost_price": Decimal("150.00"), "prep_time_minutes": 12},
        ]
        menu_items = []
        for mi_data in menu_items_data:
            mi = MenuItem.objects.create(**mi_data)
            menu_items.append(mi)
        print(f"Created {len(menu_items)} menu items.")

        # 5. POS (Orders, OrderItems, KOTs)
        orders = []
        for i in range(5):
            order = Order.objects.create(
                table=dining_tables[i],
                order_type=Order.OrderType.DINE_IN,
                status=Order.OrderStatus.PAID if i < 4 else Order.OrderStatus.PENDING,
                created_by=created_users[UserRole.RESTAURANT_STAFF],
                subtotal=Decimal("0.00"),
                tax_amount=Decimal("0.00"),
                discount_amount=Decimal("0.00"),
                total_amount=Decimal("0.00"),
            )
            items_to_add = random.sample(menu_items, k=2)
            subtotal = Decimal("0.00")
            for item in items_to_add:
                qty = random.randint(1, 3)
                price = item.price
                amt = Decimal(qty) * price
                OrderItem.objects.create(
                    order=order,
                    menu_item=item,
                    quantity=qty,
                    unit_price=price,
                    status=OrderItem.ItemStatus.SERVED if i < 4 else OrderItem.ItemStatus.PENDING
                )
                subtotal += amt
            
            sc = subtotal * Decimal("0.10")
            vat = (subtotal + sc) * Decimal("0.13")
            total = subtotal + sc + vat
            
            order.subtotal = subtotal
            order.tax_amount = vat
            order.total_amount = total
            if i < 4:
                order.paid_at = timezone.now()
            order.save()
            orders.append(order)

            kot = KOT.objects.create(
                order=order,
                station=KOT.StationChoices.HOT_KITCHEN,
                status=KOT.KOTStatus.DONE if i < 4 else KOT.KOTStatus.PENDING
            )
            kot.items.set(order.items.all())
        print(f"Created {len(orders)} POS orders and KOTs.")

        # 6. Housekeeping
        hsk_tasks = []
        for i in range(5):
            task = HousekeepingTask.objects.create(
                room=rooms[i % len(rooms)],
                assigned_to=created_users[UserRole.HOUSEKEEPING],
                task_type=random.choice(["clean", "deep_clean", "turndown"]),
                status="done" if i < 4 else "pending",
                priority=random.choice(["low", "normal", "high"]),
                triggered_by="scheduled",
                notes="Standard room cleanup.",
                due_by=date.today()
            )
            hsk_tasks.append(task)
        print(f"Created {len(hsk_tasks)} housekeeping tasks.")

        maintenance_requests = []
        categories = ["plumbing", "electrical", "furniture", "ac", "other"]
        for i in range(5):
            req = MaintenanceRequest.objects.create(
                room=rooms[i % len(rooms)],
                reported_by=created_users[UserRole.HOUSEKEEPING],
                category=categories[i],
                status="resolved" if i < 4 else "open",
                description=f"Maintenance issue with {categories[i]} in room {rooms[i % len(rooms)].room_number}.",
            )
            if i < 4:
                req.resolved_by = created_users[UserRole.PROPERTY_MANAGER]
                req.resolution_notes = "Resolved by internal team."
                req.resolved_at = timezone.now()
                req.save()
            maintenance_requests.append(req)
        print(f"Created {len(maintenance_requests)} maintenance requests.")

        # 7. Billing (Invoices, Items, Payments)
        invoices = []
        for i in range(6):
            res = reservations[i]
            inv = Invoice.objects.create(
                invoice_type=InvoiceType.HOTEL,
                reservation=res,
                subtotal=res.base_amount,
                discount_amount=Decimal("0.00"),
                service_charge_rate=Decimal("10.00"),
                service_charge_amount=res.base_amount * Decimal("0.10"),
                tax_rate=Decimal("13.00"),
                tax_amount=(res.base_amount * Decimal("1.10")) * Decimal("0.13"),
                total_amount=res.total_amount,
                paid_amount=res.total_amount if i < 5 else Decimal("0.00"),
                status="paid" if i < 5 else "unpaid",
                fiscal_year="2081/82"
            )
            InvoiceItem.objects.create(
                invoice=inv,
                description=f"Room Charges for {res.total_nights} Nights Stay",
                quantity=Decimal(res.total_nights),
                unit_price=res.base_amount / res.total_nights,
                item_type=InvoiceItemType.ROOM_CHARGE
            )
            invoices.append(inv)
            
            if i < 5:
                Payment.objects.create(
                    invoice=inv,
                    amount=inv.total_amount,
                    payment_method=random.choice(["cash", "esewa", "khalti", "fonepay"]),
                    paid_at=timezone.now(),
                    received_by=created_users[UserRole.FRONT_DESK],
                    reference_number=f"REF-{random.randint(100000, 999999)}",
                )
        print(f"Created {len(invoices)} invoices and 5 payments.")

        # 8. Payments (PaymentTransaction)
        payment_transactions = []
        gateways = ["esewa", "khalti", "fonepay"]
        for i in range(5):
            tx = PaymentTransaction.objects.create(
                invoice=invoices[i],
                gateway=gateways[i % len(gateways)],
                amount=invoices[i].total_amount,
                status="success" if i < 4 else "pending",
                gateway_ref=f"GW-REF-{random.randint(100000, 999999)}"
            )
            payment_transactions.append(tx)
        print(f"Created {len(payment_transactions)} payment transactions.")

        # 9. Staff (Departments & StaffMembers)
        depts_data = ["Front Desk", "Housekeeping", "Food & Beverage", "Finance", "HR & Admin"]
        departments = []
        for name in depts_data:
            dept = Department.objects.create(name=name)
            departments.append(dept)

        staff_members = []
        roles_to_dept = {
            UserRole.PROPERTY_MANAGER: departments[4],
            UserRole.FRONT_DESK: departments[0],
            UserRole.HOUSEKEEPING: departments[1],
            UserRole.RESTAURANT_STAFF: departments[2],
            UserRole.INVENTORY_MANAGER: departments[2],
            UserRole.ACCOUNTANT: departments[3],
        }
        for role, user in created_users.items():
            staff = StaffMember.objects.create(
                user=user,
                department=roles_to_dept.get(role, departments[0]),
                designation=role.replace("_", " ").title(),
                hire_date=date.today() - timedelta(days=180),
                base_salary=Decimal("35000.00") if role != UserRole.PROPERTY_MANAGER else Decimal("75000.00"),
                tax_filing_status="single",
                attendance_pin="1234",
                is_active=True,
            )
            staff_members.append(staff)
        print(f"Created {len(staff_members)} staff members.")

        # 10. HR (Shifts, Attendance, LeaveTypes, Balances, LeaveRequests)
        shifts = []
        for i in range(5):
            shift = Shift.objects.create(
                staff=staff_members[i],
                date=date.today() + timedelta(days=i),
                start_time="09:00:00",
                end_time="17:00:00",
                department=staff_members[i].department,
                is_confirmed=True
            )
            shifts.append(shift)
        print(f"Created {len(shifts)} shifts.")

        attendance_records = []
        for i in range(5):
            att = Attendance.objects.create(
                staff=staff_members[i],
                date=date.today() - timedelta(days=i+1),
                clock_in=timezone.now() - timedelta(hours=8),
                clock_out=timezone.now(),
                status="present",
                overtime_hours=Decimal("0.00")
            )
            attendance_records.append(att)
        print(f"Created {len(attendance_records)} attendance logs.")

        leave_types_data = [
            {"name": "Casual Leave", "days_per_year": 12},
            {"name": "Sick Leave", "days_per_year": 12},
            {"name": "Annual Leave", "days_per_year": 18},
            {"name": "Maternity Leave", "days_per_year": 60},
            {"name": "Paternity Leave", "days_per_year": 15},
        ]
        leave_types = []
        for lt_data in leave_types_data:
            lt = LeaveType.objects.create(**lt_data)
            leave_types.append(lt)
        print(f"Created {len(leave_types)} leave types.")

        for staff in staff_members[:5]:
            for lt in leave_types:
                LeaveBalance.objects.create(
                    staff=staff,
                    leave_type=lt,
                    year=2026,
                    total=lt.days_per_year,
                    used=0,
                    remaining=lt.days_per_year
                )
        print("Created leave balances.")

        leave_requests = []
        for i in range(5):
            req = LeaveRequest.objects.create(
                staff=staff_members[i],
                leave_type=leave_types[i],
                start_date=date.today() + timedelta(days=10),
                end_date=date.today() + timedelta(days=12),
                days=2,
                reason="Personal family business.",
                status="approved" if i < 4 else "pending"
            )
            leave_requests.append(req)
        print(f"Created {len(leave_requests)} leave requests.")

        # 11. Payroll (Periods & Entries)
        periods = []
        for month in [1, 2, 3, 4, 5]:
            period = PayrollPeriod.objects.create(
                month=month,
                year=2026,
                status="paid" if month < 5 else "draft"
            )
            periods.append(period)
        print(f"Created {len(periods)} payroll periods.")

        for i in range(5):
            PayrollEntry.objects.create(
                period=periods[4],
                staff=staff_members[i],
                working_days=Decimal("25.0"),
                present_days=Decimal("24.0"),
                absent_days=Decimal("1.0"),
                leave_days=Decimal("0.0"),
                basic_salary=staff_members[i].base_salary,
                net_salary=staff_members[i].base_salary * Decimal("0.85"),
                ssf_employee=staff_members[i].base_salary * Decimal("0.11"),
                ssf_employer=staff_members[i].base_salary * Decimal("0.20"),
                is_approved=True if i < 4 else False
            )
        print("Created payroll entries.")

        # 12. Inventory (Categories, Items, Suppliers, POs, POItems, StockMovements, Recipes)
        inv_categories_data = ["Vegetables", "Dairy Products", "Kitchen Staples", "Cleaning Supplies", "Room Amenities"]
        inv_categories = []
        for cat_name in inv_categories_data:
            cat = InvCategory.objects.create(name=cat_name)
            inv_categories.append(cat)

        inventory_items_data = [
            {"name": "Organic Tomatoes", "sku": "VEG-TOM-001", "unit": "kg", "category": inv_categories[0]},
            {"name": "Whole Milk", "sku": "DAI-MIL-001", "unit": "litre", "category": inv_categories[1]},
            {"name": "Basmati Rice", "sku": "KST-RIC-001", "unit": "kg", "category": inv_categories[2]},
            {"name": "Dishwashing Liquid", "sku": "CLN-DSH-001", "unit": "piece", "category": inv_categories[3]},
            {"name": "Luxury Soap Bar", "sku": "AMN-SOP-001", "unit": "piece", "category": inv_categories[4]},
            {"name": "Chicken Breast", "sku": "KST-CHK-001", "unit": "kg", "category": inv_categories[2]},
        ]
        inventory_items = []
        for ii_data in inventory_items_data:
            ii = InventoryItem.objects.create(
                sku=ii_data["sku"],
                name=ii_data["name"],
                unit=ii_data["unit"],
                category=ii_data["category"],
                current_stock=Decimal("100.00"),
                reorder_level=Decimal("10.00"),
                max_stock=Decimal("500.00"),
                cost_price=Decimal("150.00"),
                last_purchase_price=Decimal("150.00")
            )
            inventory_items.append(ii)
        print(f"Created {len(inventory_items)} inventory items.")

        suppliers_data = [
            {"name": "Pokhara Fresh Veggies", "phone": "061-550111", "email": "fresh@veggies.com"},
            {"name": "Annapurna Dairy Co.", "phone": "061-550222", "email": "info@annapurnadairy.com"},
            {"name": "Sajha Rice Distributors", "phone": "061-550333", "email": "sajha@rice.com"},
            {"name": "Clean & Green Supplies", "phone": "061-550444", "email": "sales@cleangreen.com"},
            {"name": "Luxury Amenities Pvt. Ltd.", "phone": "01-440111", "email": "contact@luxuryamenities.com"},
        ]
        suppliers = []
        for sup_data in suppliers_data:
            sup = Supplier.objects.create(**sup_data)
            suppliers.append(sup)
        print(f"Created {len(suppliers)} suppliers.")

        purchase_orders = []
        for i in range(5):
            po = PurchaseOrder.objects.create(
                supplier=suppliers[i],
                status="fulfilled" if i < 4 else "sent",
                expected_date=date.today() + timedelta(days=2),
                total_amount=Decimal("1500.00")
            )
            purchase_orders.append(po)
            
            POItem.objects.create(
                po=po,
                item=inventory_items[i % len(inventory_items)],
                quantity=Decimal("10.00"),
                unit_price=Decimal("150.00"),
                received_qty=Decimal("10.00") if i < 4 else Decimal("0.00")
            )
        print(f"Created {len(purchase_orders)} purchase orders and PO items.")

        for i in range(5):
            StockMovement.objects.create(
                item=inventory_items[i],
                movement_type="purchase_in" if i < 4 else "manual_in",
                quantity=Decimal("50.00"),
                unit_cost=Decimal("150.00"),
                notes="Seeded stock movement."
            )
        print("Created stock movements.")

        Recipe.objects.create(
            menu_item=menu_items[0],
            ingredient=inventory_items[5],
            quantity_per_serving=Decimal("0.2000"),
            unit="kg"
        )
        Recipe.objects.create(
            menu_item=menu_items[0],
            ingredient=inventory_items[0],
            quantity_per_serving=Decimal("0.0500"),
            unit="kg"
        )
        Recipe.objects.create(
            menu_item=menu_items[1],
            ingredient=inventory_items[2],
            quantity_per_serving=Decimal("0.2500"),
            unit="kg"
        )
        Recipe.objects.create(
            menu_item=menu_items[2],
            ingredient=inventory_items[0],
            quantity_per_serving=Decimal("0.1000"),
            unit="kg"
        )
        Recipe.objects.create(
            menu_item=menu_items[5],
            ingredient=inventory_items[0],
            quantity_per_serving=Decimal("0.0500"),
            unit="kg"
        )
        print("Created recipes.")

        # 13. CRM (Tags, Activities, Campaigns)
        tags_data = [
            {"name": "VIP Guest", "color": "#ffc107"},
            {"name": "Corporate Client", "color": "#17a2b8"},
            {"name": "Frequent Flyer", "color": "#28a745"},
            {"name": "Vegetarian", "color": "#20c997"},
            {"name": "Honeymooner", "color": "#e83e8c"},
        ]
        tags = []
        for t_data in tags_data:
            tag = GuestTag.objects.create(name=t_data["name"], color=t_data["color"])
            tag.guests.set(random.sample(guests, k=2))
            tags.append(tag)
        print(f"Created {len(tags)} guest tags.")

        for i in range(5):
            GuestActivity.objects.create(
                guest=guests[i],
                activity_type="booking_create",
                description=f"Auto-generated booking log entry for {guests[i].full_name}."
            )
        print("Created guest activities.")

        campaigns_data = [
            {"name": "Dashain Festival Greeting", "campaign_type": "promotion", "message_template": "Wishing you a Happy Dashain! Enjoy 15% off at Lahana Resort."},
            {"name": "Winter Getaway Promo", "campaign_type": "promotion", "message_template": "Escape to Lakeside Pokhara this winter! Special rates apply."},
            {"name": "Birthday Greeting SMS", "campaign_type": "birthday", "message_template": "Happy Birthday {guest_name}! Celebrate with a free cake at Lahana."},
            {"name": "Anniversary Loyalty Bonus", "campaign_type": "anniversary", "message_template": "Happy Anniversary! We have added 50 loyalty points to your account."},
            {"name": "New Year Special Campaign", "campaign_type": "promotion", "message_template": "Celebrate Nepali New Year 2083 at Lahana Resort!"},
        ]
        for camp_data in campaigns_data:
            Campaign.objects.create(
                name=camp_data["name"],
                campaign_type=camp_data["campaign_type"],
                message_template=camp_data["message_template"],
                status="sent"
            )
        print("Created campaigns.")

        # 14. Loyalty (Accounts & Transactions)
        loyalty_accounts = []
        for i in range(5):
            acc, created = LoyaltyAccount.objects.get_or_create(
                guest=guests[i],
                defaults={
                    "points_balance": 100 * (i+1),
                    "tier": "gold" if i > 2 else "silver" if i > 0 else "bronze"
                }
            )
            if not created:
                acc.points_balance = 100 * (i+1)
                acc.tier = "gold" if i > 2 else "silver" if i > 0 else "bronze"
                acc.save()
            loyalty_accounts.append(acc)

        for i in range(5):
            LoyaltyTransaction.objects.create(
                account=loyalty_accounts[i],
                points=100,
                transaction_type="earn",
                description="Stay loyalty credit."
            )
        print("Created loyalty accounts and transactions.")

        # 15. Analytics (DailyMetrics)
        for i in range(5):
            DailyMetric.objects.create(
                property=prop,
                date=date.today() - timedelta(days=i),
                total_revenue=Decimal("25000.00") + i * Decimal("5000.00"),
                room_revenue=Decimal("18000.00") + i * Decimal("4000.00"),
                restaurant_revenue=Decimal("5000.00") + i * Decimal("8000.00"),
                other_revenue=Decimal("2000.00") + i * Decimal("2000.00"),
                occupied_rooms=3,
                total_rooms=6,
                occupancy_rate=Decimal("50.00"),
                adr=Decimal("6000.00"),
                revpar=Decimal("3000.00"),
                total_guests=5,
                new_guests=1,
                restaurant_covers=10,
                avg_restaurant_spend=Decimal("500.00")
            )
        print("Created daily metrics.")

    print("\nDatabase seeding completed successfully for tenant 'lahana_resort'!")


if __name__ == "__main__":
    seed_lahana()
