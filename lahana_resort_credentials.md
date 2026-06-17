# Lahana Resort Tenant & User Credentials

This file contains the configuration, subdomain access info, and credentials for all roles seeded in the database for the **Lahana Resort** tenant.

## Tenant Information
- **Hotel Name:** Lahana Resort
- **Subdomain Routing:** [http://lahana.localhost:3000](http://lahana.localhost:3000)
- **Schema Name:** `lahana_resort`
- **Subscription Plan:** Enterprise
- **Address:** Lakeside Ward 6, Pokhara, Nepal

---

## User Accounts & Credentials

The password for all accounts is: `LahanaPassword123!`
The clock-in attendance PIN for all staff members is: `1234`

| Employee Name | Email / Username | Role / Designation | Dashboard Role Permissions | Attendance PIN |
| :--- | :--- | :--- | :--- | :--- |
| **Roshan Adhikari** | `manager@lahana.com` | Property Manager | Full access to settings, room pricing, tenant properties, and admin settings. | `1234` |
| **Sajina Shrestha** | `receptionist@lahana.com` | Front Desk | Access to reservations, guest check-in/check-out, billing details, and invoice settlements. | `1234` |
| **Niranjan Thapa** | `housekeeper@lahana.com` | Housekeeping | Access to housekeeping checklists, room status updates, and maintenance reporting. | `1234` |
| **Prem Gurung** | `chef@lahana.com` | Restaurant Staff / Chef | Access to Kitchen Order Tickets (KOT), active dining orders, and menu updates. | `1234` |
| **Bikram Karki** | `inventory@lahana.com` | Inventory Manager | Access to suppliers registry, purchase order cycles, recipes, and stock log adjustments. | `1234` |
| **Mina Dahal** | `accountant@lahana.com` | Accountant | Access to payroll periods, employee attendance books, Nepalese tax adjustments, and salary ledgers. | `1234` |

---

## Seeded Modules & Data Breakdown

At least **5 data points** have been populated for all core modules inside the `lahana_resort` schema context:

1. **Properties**: 1 Property profile, 6 Amenities, 5 Room Types, and 6 Rooms.
2. **Bookings**: 5 Guest Profiles, 5 Rate Plans, and 8 Reservations.
3. **Front Desk**: 6 Check-In transactions and 5 Check-Out settlement logs.
4. **Restaurant**: 5 Dining Areas, 6 Dining Tables, 5 Menu Categories, and 6 Menu Items.
5. **POS (Point of Sale)**: 5 Orders, 10 Order Items, and 5 Kitchen Order Tickets (KOT).
6. **Housekeeping**: 5 Housekeeping Tasks and 5 Maintenance Requests.
7. **Billing**: 6 Invoices (complete with Service Charge & VAT) and 5 settled Invoice Payments.
8. **Payments**: 5 Payment Gateway Transactions (simulating eSewa, Khalti, and Fonepay).
9. **Staff**: 5 Departments and 6 Staff Members linked to user profiles.
10. **HR**: 5 Work Shifts, 5 Attendance/Clock Logs, 5 Leave Types, and 5 Leave Requests.
11. **Payroll**: 5 Payroll Periods and 5 Payroll Entries (linked to progressive tax/SSF computations).
12. **Inventory**: 5 Inventory Categories, 6 Inventory Items, 5 Suppliers, 5 Purchase Orders, 5 Stock Movements, and 5 Recipes.
13. **CRM**: 5 Segmentation Guest Tags, 5 Guest Profile Activity logs, and 5 SMS Marketing Campaigns.
14. **Loyalty**: 5 Loyalty Accounts and 5 Loyalty Transactions (earn/redeem logs).
15. **Analytics**: 5 Daily Metric reports (total revenue, room/food division, ADR, and occupancy).
