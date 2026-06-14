# SIA HMS — SaaS Hotel Management System

SIA HMS is a multi-tenant SaaS Hotel Management System built using a Django backend (with isolated PostgreSQL schema-per-tenant architecture) and a Next.js App Router frontend.

This guide provides step-by-step instructions on setting up and running the application.

---

## 🚀 Quick Start (Docker Compose — Recommended)

The easiest way to run the entire system (including Database, Redis, Celery, Nginx, MinIO, Backend, and Frontend) is via Docker Compose.

### 1. Prerequisites
Ensure you have the following installed:
* [Docker Desktop](https://www.docker.com/products/docker-desktop) (which includes Docker Compose)
* Git

### 2. Configure Environment
1. Copy the `.env.example` file to `.env` in the root directory:
   ```bash
   cp .env.example .env
   ```
2. For local Docker testing, the default environment values are pre-configured.

### 3. Build and Run the Services
Run the following command to build and launch all 8 services in the background:
```bash
docker-compose up --build
```
This boots:
* **db**: PostgreSQL database (port `5432`)
* **redis**: In-memory broker (port `6379`)
* **backend**: Django Rest Framework API (port `8000`)
* **celery_worker / celery_beat**: Background reports & billing task queues
* **minio**: S3-compatible storage engine (port `9000` / Console `9001`)
* **frontend**: Next.js 14 Web App (port `3000`)
* **nginx**: Gateway Router (proxies all web traffic)

### 4. Bootstrap the Database & Super Admin
On the first run, initialize the shared `public` schema containing subscription plans and create the global Super Admin credentials:
```bash
# 1. Run migrations for public schema
docker-compose exec backend python manage.py migrate

# 2. Onboard the public root tenant and superadmin user
docker-compose exec backend python manage.py create_tenant --schema=public --name="Public Tenant" --domain=localhost --email=superadmin@sia.com --password=SecureAdminPass123!

# 3. Seed SaaS plans (starter, professional, enterprise)
docker-compose exec backend python manage.py shell -c "
from apps.subscriptions.models import SubscriptionPlan
SubscriptionPlan.objects.get_or_create(name='Starter Plan', slug='starter', price_monthly=2000.0, price_yearly=21600.0, max_rooms=15, max_staff_users=5, max_restaurants=1, features=['pos'])
SubscriptionPlan.objects.get_or_create(name='Professional Plan', slug='professional', price_monthly=5000.0, price_yearly=54000.0, max_rooms=50, max_staff_users=20, max_restaurants=2, features=['pos', 'payroll', 'crm'])
SubscriptionPlan.objects.get_or_create(name='Enterprise Plan', slug='enterprise', price_monthly=12000.0, price_yearly=129600.0, max_rooms=200, max_staff_users=100, max_restaurants=5, features=['pos', 'payroll', 'crm', 'analytics'])
"
```

---

## 🛠️ Local Development (Manual Setup)

If you prefer to run services natively (outside Docker), follow these steps:

### 1. Prerequisites
* **Python**: `3.11` or `3.12`
* **Node.js**: `v18+` or `v20+`
* **PostgreSQL**: Running locally on port `5432` with a database named `sia_hms_db`
* **Redis**: Running locally on port `6379`

### 2. Configure Local Env Files
Create a `.env` file in the `backend/` directory and a `.env.local` file in the `frontend/` directory based on their respective examples. Set `POSTGRES_HOST=localhost` and `REDIS_URL=redis://localhost:6379/0` for local connection.

### 3. Backend Setup
1. Open a terminal inside the `backend/` directory:
   ```bash
   cd backend
   ```
2. Create and activate a Python virtual environment:
   ```bash
   python -m venv .venv
   # Windows:
   .venv\Scripts\activate
   # Linux/Mac:
   source .venv/bin/activate
   ```
3. Install dependencies:
   ```bash
   pip install -r requirements/development.txt
   ```
4. Run migrations and bootstrap the public schema:
   ```bash
   python manage.py migrate
   python manage.py create_tenant --schema=public --name="Public Tenant" --domain=localhost --email=superadmin@sia.com --password=SecureAdminPass123!
   ```
5. Launch the Django server:
   ```bash
   python manage.py runserver 8000
   ```
6. Run Celery Worker & Beat (in separate terminals with virtual environment activated):
   ```bash
   # Terminal 2: Worker
   celery -A config worker --loglevel=info
   
   # Terminal 3: Beat Scheduler
   celery -A config beat --loglevel=info
   ```

### 4. Frontend Setup
1. Open a terminal inside the `frontend/` directory:
   ```bash
   cd frontend
   ```
2. Install Node dependencies:
   ```bash
   npm install
   ```
3. Run the development server:
   ```bash
   npm run dev
   ```
   The application will be accessible at [http://localhost:3000](http://localhost:3000).

---

## 🔑 Default Credentials & Onboarding Flow

1. Go to the dashboard login page at [http://localhost:3000/login](http://localhost:3000/login).
2. Log in as the Super Admin:
   * **Email:** `superadmin@sia.com`
   * **Password:** `SecureAdminPass123!`
3. You will be redirected to the **SaaS Super Admin Platform** (`/superadmin`).
4. Navigate to **Hotels Directory** (`/superadmin/tenants`) and click **Onboard New Hotel**:
   * Complete the form (e.g. name: `Himalayan Oasis`, schema: `himalayan_oasis`, subdomain: `himalayan`).
   * Specify the administrator credentials (e.g. `admin@oasis.com` / `Password123!`).
5. Upon submitting, the system programmatically creates the PostgreSQL database schema `himalayan_oasis`, applies migrations, seeds basic defaults, and redirects you.
6. The new hotel is now routable at `http://himalayan.localhost:3000`.

---

## 🎭 Tenant Impersonation & Feature Gating

### How to Impersonate:
1. In the **Hotels Directory** (`/superadmin/tenants`), click the **Impersonate** button next to any active hotel.
2. The browser automatically swaps cookies, routes database connections dynamically to the target schema, and redirects you to the main hotel dashboard (`/`).
3. You will see an amber banner at the top of the screen: `Viewing system as [Hotel Name] (Impersonating)`.
4. Click **Stop Impersonating** at any time to restore your original Super Admin session and return to the panel.

### Gated Modules:
Module permissions are dynamically checked based on the active plan:
* **Starter Plan:** Only supports basic rooms and restaurant POS. Accessing Payroll or Analytics returns permission warnings.
* **Enterprise Plan:** Unlocks all modules: progressive Nepalese payroll, campaigns, loyalty tiers, and Recharts performance dashboards.

---

## 💳 Nepal Payment Sandbox Testing

To test integration checkout flows under simulated sandbox parameters, use the following:

### 1. eSewa (epay v2)
1. Initiate checkout from the invoice payment settlement screen and select **eSewa**.
2. You will be redirected to the official eSewa sandbox checkout screen.
3. Enter credentials:
   * **Mobile Number / Email:** `9841000000`
   * **MPIN / Password:** `1234`
   * **OTP Code (Received on screen):** `123456`

### 2. Khalti Wallet Checkout
1. Select **Khalti** on checkout.
2. In the modal, provide any test Nepalese mobile number (e.g., `9800000000`).
3. Use test verification credentials:
   * **OTP Code:** `12345`
   * **Pin:** `9876`

---

## 🧪 Running Tests
To verify all SaaS logic, onboarding hooks, and billing triggers, activate the virtual environment inside `backend/` and run:
```bash
pytest apps/subscriptions/tests/
```
To run the full suite:
```bash
pytest
```
