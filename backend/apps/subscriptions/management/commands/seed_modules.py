"""
SIA HMS — Seed core addon modules with pricing, categories, and business type recommendations.
Run: python manage.py seed_modules
"""

from django.core.management.base import BaseCommand
from apps.subscriptions.models import AddonModule, ModuleCategory
from apps.tenants.models import BusinessType

# ─── Module Catalog ───────────────────────────────────────────────────────────
# Category, key, name, description, icon_name, price_monthly, price_yearly, is_core, depends_on_keys, recommended_for

MODULE_CATALOG = [
    # ── CORE MODULES (universal) ──
    {
        "key": "billing",
        "name": "Billing & Invoicing",
        "description": "Invoice generation with Nepal-compliant 10% Service Charge + 13% VAT, digital payment rebates, payment settlements, and IRD-ready PDF invoices.",
        "category": ModuleCategory.UNIVERSAL,
        "icon_name": "Receipt",
        "price_monthly": 500,
        "price_yearly": 5000,
        "is_core": True,
        "depends_on_keys": [],
        "recommended_for": ["hotel", "restaurant", "gaming_cafe", "coworking", "spa_salon", "billiards", "karaoke", "parking", "other"],
    },
    {
        "key": "analytics",
        "name": "Analytics & Reports",
        "description": "Daily metrics aggregation, revenue/occupancy/ADR trends, top menu items, guest sources, and exportable PDF/Excel reports.",
        "category": ModuleCategory.UNIVERSAL,
        "icon_name": "BarChart3",
        "price_monthly": 500,
        "price_yearly": 5000,
        "is_core": True,
        "depends_on_keys": [],
        "recommended_for": ["hotel", "restaurant", "gaming_cafe", "coworking", "spa_salon", "billiards", "karaoke", "parking", "other"],
    },
    {
        "key": "staff",
        "name": "Staff & HR Management",
        "description": "Employee records, departments, work shifts, clock-in/out with PIN, attendance grid, leave requests, overtime calculation (1.5x), and payroll-ready data.",
        "category": ModuleCategory.UNIVERSAL,
        "icon_name": "Users",
        "price_monthly": 800,
        "price_yearly": 8000,
        "is_core": False,
        "depends_on_keys": [],
        "recommended_for": ["hotel", "restaurant", "gaming_cafe", "coworking", "spa_salon", "billiards", "karaoke"],
    },
    {
        "key": "payroll",
        "name": "Nepalese Payroll",
        "description": "Progressive TDS tax computation, SSF contributions, salary slip generation with QR verification, payroll periods, and accountant review workflows.",
        "category": ModuleCategory.UNIVERSAL,
        "icon_name": "Wallet",
        "price_monthly": 1200,
        "price_yearly": 12000,
        "is_core": False,
        "depends_on_keys": ["staff"],
        "recommended_for": ["hotel", "restaurant"],
    },
    {
        "key": "inventory",
        "name": "Inventory Management",
        "description": "Suppliers registry, purchase order cycles, goods receipt notes, stock movements (adjustments/transfers/write-offs), recipes with cost %, and auto-deductions on POS orders.",
        "category": ModuleCategory.UNIVERSAL,
        "icon_name": "Package",
        "price_monthly": 700,
        "price_yearly": 7000,
        "is_core": False,
        "depends_on_keys": [],
        "recommended_for": ["hotel", "restaurant"],
    },
    {
        "key": "crm",
        "name": "CRM & Loyalty",
        "description": "Guest profiles with segmentation tags, activity tracking, SMS marketing campaigns, loyalty points (1 point per Rs. 100), and tier management.",
        "category": ModuleCategory.UNIVERSAL,
        "icon_name": "Heart",
        "price_monthly": 600,
        "price_yearly": 6000,
        "is_core": False,
        "depends_on_keys": [],
        "recommended_for": ["hotel", "restaurant", "gaming_cafe", "spa_salon", "karaoke"],
    },
    # ── HOSPITALITY MODULES ──
    {
        "key": "rooms",
        "name": "Room Management",
        "description": "Manage room types, floor layouts, room status (available/occupied/dirty/maintenance), and property configuration.",
        "category": ModuleCategory.HOSPITALITY,
        "icon_name": "DoorOpen",
        "price_monthly": 800,
        "price_yearly": 8000,
        "is_core": False,
        "depends_on_keys": [],
        "recommended_for": ["hotel"],
    },
    {
        "key": "bookings",
        "name": "Booking Engine",
        "description": "Online and walk-in reservations with availability calendar, rate plans, guest profiles, overbooking prevention, and public booking widget.",
        "category": ModuleCategory.HOSPITALITY,
        "icon_name": "CalendarCheck",
        "price_monthly": 1000,
        "price_yearly": 10000,
        "is_core": False,
        "depends_on_keys": ["rooms"],
        "recommended_for": ["hotel", "coworking", "spa_salon"],
    },
    {
        "key": "frontdesk",
        "name": "Front Desk Operations",
        "description": "Check-in/check-out workflows, key assignment, guest folio management, walk-in registration, and daily arrivals/departures board.",
        "category": ModuleCategory.HOSPITALITY,
        "icon_name": "ConciergeBell",
        "price_monthly": 600,
        "price_yearly": 6000,
        "is_core": False,
        "depends_on_keys": ["rooms", "bookings"],
        "recommended_for": ["hotel"],
    },
    {
        "key": "housekeeping",
        "name": "Housekeeping",
        "description": "Room cleaning schedules, task assignment to staff, status updates, maintenance requests, lost & found tracking, and room discrepancy resolution.",
        "category": ModuleCategory.HOSPITALITY,
        "icon_name": "SprayCan",
        "price_monthly": 500,
        "price_yearly": 5000,
        "is_core": False,
        "depends_on_keys": ["rooms"],
        "recommended_for": ["hotel"],
    },
    # ── F&B MODULES ──
    {
        "key": "pos",
        "name": "Restaurant & POS",
        "description": "Order taking, menu categories, item modifiers, cart management, Kitchen Display integration, table service, and bill settlement.",
        "category": ModuleCategory.FND,
        "icon_name": "Utensils",
        "price_monthly": 800,
        "price_yearly": 8000,
        "is_core": False,
        "depends_on_keys": ["billing"],
        "recommended_for": ["hotel", "restaurant", "gaming_cafe", "billiards", "karaoke"],
    },
    {
        "key": "kds",
        "name": "Kitchen Display System",
        "description": "Real-time KOT routing by station, order preparation tracking, and WebSocket-connected kitchen screens.",
        "category": ModuleCategory.FND,
        "icon_name": "Monitor",
        "price_monthly": 400,
        "price_yearly": 4000,
        "is_core": False,
        "depends_on_keys": ["pos"],
        "recommended_for": ["hotel", "restaurant"],
    },
    {
        "key": "table_mgmt",
        "name": "Table Management",
        "description": "Dining table status lifecycle, steward/waiter assignment, table merge/split, and floor plan coordinates.",
        "category": ModuleCategory.FND,
        "icon_name": "Grid3X3",
        "price_monthly": 300,
        "price_yearly": 3000,
        "is_core": False,
        "depends_on_keys": ["pos"],
        "recommended_for": ["restaurant", "gaming_cafe", "billiards", "karaoke"],
    },
    # ── TIMED SESSION MODULE ──
    {
        "key": "timed_sessions",
        "name": "Timed Session Management",
        "description": "Session-based billing for gaming cafes, coworking spaces, spa/salons, billiards, and karaoke. Tracks start/end times and auto-calculates charges.",
        "category": ModuleCategory.UNIVERSAL,
        "icon_name": "Timer",
        "price_monthly": 700,
        "price_yearly": 7000,
        "is_core": False,
        "depends_on_keys": ["billing"],
        "recommended_for": ["gaming_cafe", "coworking", "spa_salon", "billiards", "karaoke", "parking"],
    },
]

# ─── Business Type Recommendations ────────────────────────────────────────────

BUSINESS_TYPES = [
    {
        "key": "hotel",
        "name": "Hotel / Resort",
        "description": "Full-service hotel with rooms, restaurant, and event spaces.",
        "icon_name": "Hotel",
        "module_keys": ["rooms", "bookings", "frontdesk", "housekeeping", "billing", "staff", "pos", "kds", "inventory", "crm", "analytics"],
    },
    {
        "key": "restaurant",
        "name": "Restaurant / Café",
        "description": "Restaurant, cafe, bar, or food court.",
        "icon_name": "Utensils",
        "module_keys": ["pos", "kds", "table_mgmt", "billing", "inventory", "crm", "staff", "analytics"],
    },
    {
        "key": "gaming_cafe",
        "name": "Gaming Café",
        "description": "Internet/gaming cafe with timed session billing.",
        "icon_name": "Gamepad2",
        "module_keys": ["timed_sessions", "pos", "table_mgmt", "billing", "crm", "staff", "analytics"],
    },
    {
        "key": "coworking",
        "name": "Co-working Space",
        "description": "Shared office space with meeting room bookings.",
        "icon_name": "Building2",
        "module_keys": ["timed_sessions", "bookings", "billing", "crm", "staff", "analytics"],
    },
    {
        "key": "spa_salon",
        "name": "Spa / Salon",
        "description": "Spa, salon, and wellness center with appointment-based services.",
        "icon_name": "Sparkles",
        "module_keys": ["timed_sessions", "bookings", "billing", "crm", "staff", "analytics"],
    },
    {
        "key": "billiards",
        "name": "Billiards / Snooker Hall",
        "description": "Billiard/pool hall with timed session billing.",
        "icon_name": "Circle",
        "module_keys": ["timed_sessions", "pos", "billing", "staff", "analytics"],
    },
    {
        "key": "karaoke",
        "name": "Karaoke Venue",
        "description": "Karaoke lounge with room-based timed sessions.",
        "icon_name": "Mic",
        "module_keys": ["timed_sessions", "pos", "billing", "crm", "staff", "analytics"],
    },
    {
        "key": "parking",
        "name": "Parking Management",
        "description": "Parking lot management with timed billing.",
        "icon_name": "ParkingCircle",
        "module_keys": ["timed_sessions", "billing", "staff", "analytics"],
    },
    {
        "key": "other",
        "name": "Other Business",
        "description": "Other business types not listed.",
        "icon_name": "Briefcase",
        "module_keys": ["billing", "analytics"],
    },
]


class Command(BaseCommand):
    help = "Seed the full module catalog with pricing, categories, and business type recommendations."

    def handle(self, *args, **options):
        self._seed_modules()
        self._seed_business_types()
        self.stdout.write(self.style.SUCCESS("Done seeding modules and business types."))

    def _seed_modules(self):
        """Create / update all addon modules."""
        for mod in MODULE_CATALOG:
            depends_on_keys = mod.pop("depends_on_keys", [])
            obj, created = AddonModule.objects.update_or_create(
                key=mod["key"],
                defaults=mod,
            )
            # Resolve dependencies
            if depends_on_keys:
                deps = AddonModule.objects.filter(key__in=depends_on_keys)
                obj.depends_on.set(deps)
            self.stdout.write(
                f"  {'Created' if created else 'Updated'} module: {obj.key} — Rs.{obj.price_monthly}/mo"
            )

    def _seed_business_types(self):
        """Create / update business types with recommended modules."""
        for bt in BUSINESS_TYPES:
            module_keys = bt.pop("module_keys", [])
            obj, created = BusinessType.objects.update_or_create(
                key=bt["key"],
                defaults=bt,
            )
            if module_keys:
                modules = AddonModule.objects.filter(key__in=module_keys)
                obj.recommended_modules.set(modules)
            self.stdout.write(
                f"  {'Created' if created else 'Updated'} business type: {obj.key}"
            )
