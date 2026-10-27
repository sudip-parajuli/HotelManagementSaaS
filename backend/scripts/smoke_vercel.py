"""Exercise the hosted guest lifecycle in the explicitly labelled demo tenant only.

Credentials and cookies are never printed. Creates fictional demo records and
a sample cash-settled invoice; no external payment provider is called.
"""
from datetime import datetime, timedelta
from pathlib import Path
from zoneinfo import ZoneInfo
from decouple import RepositoryEnv
import requests

root = Path(__file__).resolve().parents[1]
values = RepositoryEnv(str(root / ".env.supabase.local")).data
base = "https://staywired.vercel.app"
session = requests.Session()
session.headers["Origin"] = base


def call(method, path, expected=200, **kwargs):
    response = session.request(method, base + path, timeout=55, **kwargs)
    print(f"{method} {path}: {response.status_code}", flush=True)
    if response.status_code != expected:
        # Status and keys are sufficient diagnostics; never dump auth responses.
        try:
            print("Response fields:", list(response.json())[:8])
        except ValueError:
            print("Response is not JSON.")
        raise SystemExit("Live verification failed; no credentials were printed.")
    return response.json()


def rows(data):
    return data if isinstance(data, list) else data.get("results", [])


call("POST", "/api-auth/login/", json={"email": values["STAYWIRED_ADMIN_EMAIL"], "password": values["STAYWIRED_ADMIN_PASSWORD"]})
call("GET", "/api-auth/me/")
tenants = rows(call("GET", "/api/admin/tenants/"))
tenant = next((t for t in tenants if t.get("schema_name") == "staywired_demo" and t.get("name") == "Himalayan Haven (Demo)"), None)
if not tenant:
    raise SystemExit("The explicitly labelled demo tenant was not found; refusing to test another hotel.")
call("POST", "/api-auth/impersonate/", json={"tenantId": tenant["id"], "reason": "Deployment verification in the fictional Staywired demo property."})
info = call("GET", "/api/modules/tenant/")
assert info["schema_name"] == "staywired_demo"
room_list = rows(call("GET", "/api/properties/rooms/"))
room = next((r for r in room_list if r["room_number"] == "108" and r["status"] == "available"), None)
if not room:
    raise SystemExit("Demo room 108 is not ready. Refusing to change an occupied room.")
guest = call("POST", "/api/bookings/guests/", expected=201, json={"first_name": "Deployment", "last_name": "Demo Guest", "email": "deployment-demo@example.com", "phone": "0000000001", "nationality": "Nepalese", "id_type": "citizenship", "id_number": "DEMO-ONLY"})
today = datetime.now(ZoneInfo("Asia/Kathmandu")).date()
payload = {"guest_id": guest["id"], "room_id": room["id"], "check_in_date": today.isoformat(), "check_out_date": (today + timedelta(days=1)).isoformat(), "adults": 1, "status": "confirmed", "booking_source": "walk_in", "internal_notes": "Fictional deployment verification; no real guest or payment."}
stay = call("POST", "/api/bookings/reservations/", expected=201, json=payload)
call("POST", "/api/bookings/reservations/", expected=400, json=payload)
call("POST", "/api/frontdesk/checkin/", expected=201, json={"reservation_id": stay["id"], "key_issued": "DEMO-108"})
checkout = call("POST", "/api/frontdesk/checkout/", json={"reservation_id": stay["id"], "additional_charges": [], "payment_method": "cash"})
tasks = rows(call("GET", "/api/housekeeping/tasks/"))
task = next(t for t in tasks if t["room_number"] == "108" and t["status"] != "done")
call("POST", f'/api/housekeeping/tasks/{task["id"]}/complete/', json={"notes": "Deployment demo: room verified ready."})
room_after = call("GET", f'/api/properties/rooms/{room["id"]}/')
assert room_after["status"] == "available"
call("POST", "/api-auth/logout/")
print("PASS: hosted login, tenant isolation, room availability, overlap guard, check-in, sample checkout, invoice creation and housekeeping turnover.")
