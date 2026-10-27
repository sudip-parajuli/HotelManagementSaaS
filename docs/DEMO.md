# Staywired interactive demo

Open `/demo/`. No account, Django server, Supabase project or payment provider is required.

## A five-minute hotel day

1. Select **New reservation**. Choose today's date, a future departure, an available room and a fictional guest name. The quote updates to the nightly rate multiplied by nights.
2. Open **Front desk**. Check in the new guest. A confirmed reservation can check in only within its dates, to a vacant room marked ready.
3. Try checking out with an open balance. The demo explains that the balance must be settled first.
4. Select **Settle**, then **Check out**. No real payment is taken. The reservation closes and the room becomes dirty.
5. Open **Housekeeping** and select **Mark ready**. The room is ready for its next arrival.
6. Search by guest, room or reference; filter reservation status; export a CSV from Reservations or Revenue.
7. Reload to check persistence, or select **Reset demo** and confirm to restore sample data.

## Features

- Overview with live occupancy, arrivals, departures, collected demo payments and daily priorities.
- Reservation creation, date overlap prevention, guest-capacity checks, sources and guest preferences.
- Front desk state transitions, cancellation, balance settlement and room handover.
- Sixteen-room board with readiness, occupancy and maintenance states.
- Housekeeping queue linked to checkouts.
- Revenue view with folios, open balances, current in-house ADR and RevPAR.
- Responsive sidebar, keyboard focus, native focus-trapped dialogs, reduced-motion support, empty states and feedback toasts.
- Browser-local persistence with snapshot validation and recovery if storage is unavailable.

## Metric definitions

Amounts are NPR. Occupancy is in-house rooms divided by rooms not in maintenance. ADR is the sum of current in-house nightly room rates divided by in-house stays. RevPAR divides those nightly rates by sellable rooms. Collected payments are the sum of recorded payments across all demo reservations, not today's cash receipts. Outstanding balances include confirmed and in-house reservations.

Quotes are room-only, without taxes, discounts, extras or actual payment processing. These demo metrics are operational illustrations, not financial statements. Dates use Nepal time (`Asia/Kathmandu`). Adjacent stays may share a departure/arrival date without overlapping.

## Data handling and limitations

All guests and the Himalayan Haven property are fictional. State uses browser storage key `staywired-demo-v1`. Do not enter real personal information. Data is not shared across browsers or synchronized across tabs/devices. No notifications are sent. A long-running saved demo retains its reservation dates; reset it for a fresh scenario on another day. Reset requires confirmation.

The demo does not bypass production authentication or set login cookies. Existing staff/POS/inventory/payroll modules remain in the authenticated application and require the Django backend; they are not simulated here.

## Source and tests

- `frontend/src/lib/demo/hotel.ts`: business transitions, availability, pricing and state validation.
- `frontend/src/app/(public)/demo/`: workspace UI and responsive styling.
- `frontend/scripts/demo.test.cjs`: complete guest lifecycle, balance guard, overlaps, capacity, dirty/maintenance rooms, future arrivals, snapshot validation and protected-route regressions.

Run `cd frontend && npm test`. Tests use Node's built-in test runner and the existing TypeScript compiler; no browser test dependency is required.
