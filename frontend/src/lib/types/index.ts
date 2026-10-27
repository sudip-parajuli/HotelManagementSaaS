/**
 * SIA HMS — Central TypeScript Types
 * All shared interfaces and types for the HMS frontend.
 */

// ─────────────────────────────
// Auth & Users
// ─────────────────────────────

export type UserRole =
  | "SUPER_ADMIN"
  | "PROPERTY_MANAGER"
  | "FRONT_DESK"
  | "HOUSEKEEPING"
  | "RESTAURANT_STAFF"
  | "INVENTORY_MANAGER"
  | "ACCOUNTANT";

export interface UserProfile {
  id: number;
  email: string;
  username: string;
  first_name: string;
  last_name: string;
  full_name: string;
  phone?: string;
  avatar?: string;
  avatar_url?: string;
  role: UserRole;
  preferred_language?: "en" | "ne";
  is_active: boolean;
  date_joined: string;
  last_login?: string;
}

export interface LoginPayload {
  email: string;
  password: string;
}

export interface LoginResponse {
  user: UserProfile;
}

export interface ChangePasswordPayload {
  old_password: string;
  new_password: string;
  confirm_password: string;
}

// ─────────────────────────────
// Tenants
// ─────────────────────────────

export interface Tenant {
  id: number;
  name: string;
  schema_name: string;
  contact_email: string;
  contact_phone?: string;
  is_active: boolean;
  business_type?: number | null;
  business_type_name?: string | null;
  business_type_key?: string | null;
  business_description?: string;
  subscription_plan?: string;
  notes?: string;
  onboarded_at?: string;
  created_on: string;
  active_module_count?: number;
}

export interface TenantUsage {
  tenant: string;
  plan: string | null;
  status: string | null;
  rooms_used: number;
  rooms_limit: number | null;
  staff_used: number;
  staff_limit: number | null;
}

export interface TenantFeatureItem {
  key: string;
  in_plan: boolean;
  manually_granted: boolean;
  grant_expires_at: string | null;
  grant_reason: string;
  grant_id: number | null;
}

export interface TenantFeaturesResponse {
  features: TenantFeatureItem[];
  plan: string | null;
}

export interface Domain {
  id: number;
  domain: string;
  tenant: number;
  is_primary: boolean;
}

// ─────────────────────────────
// API Response Wrappers
// ─────────────────────────────

export interface PaginatedResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

export interface APIError {
  error: string;
  code: string;
  detail: Record<string, string[]> | Record<string, string> | {};
}

// ─────────────────────────────
// Properties & Rooms
// ─────────────────────────────

export interface Property {
  id: number;
  name: string;
  tagline?: string;
  address: string;
  city: string;
  country: string;
  phone: string;
  email: string;
  website?: string;
  logo?: string;
  cover_image?: string;
  currency: string;
  timezone: string;
  check_in_time: string;
  check_out_time: string;
}

export type RoomStatus = "available" | "occupied" | "dirty" | "maintenance" | "out_of_order";

export interface Room {
  id: number;
  room_type: RoomType;
  room_number: string;
  floor: number;
  status: RoomStatus;
  is_active: boolean;
  notes?: string;
  last_cleaned_at?: string;
}

export interface Amenity {
  id: number;
  name: string;
  icon: string;
  category: string;
  category_display?: string;
}

export interface RoomType {
  id: number;
  property?: number | Property;
  name: string;
  slug: string;
  description?: string;
  max_occupancy: number;
  base_price_per_night: string;
  weekend_price?: string;
  extra_person_charge: string;
  amenities?: Amenity[];
  is_active: boolean;
  display_order?: number;
}

// ─────────────────────────────
// Bookings
// ─────────────────────────────

export type ReservationStatus =
  | "pending"
  | "confirmed"
  | "checked_in"
  | "checked_out"
  | "cancelled"
  | "no_show";

export type BookingSource =
  | "direct"
  | "phone"
  | "walk_in"
  | "online"
  | "ota_booking"
  | "ota_agoda"
  | "ota_expedia";

export interface GuestProfile {
  id: number;
  first_name: string;
  last_name: string;
  email?: string;
  phone: string;
  nationality?: string;
  id_type?: string;
  id_number?: string;
  is_blacklisted: boolean;
}

export interface Reservation {
  id: number;
  guest: GuestProfile;
  room: Room;
  check_in_date: string;
  check_out_date: string;
  adults: number;
  children: number;
  status: ReservationStatus;
  booking_source: BookingSource;
  total_nights: number;
  base_amount: string;
  tax_amount: string;
  discount_amount: string;
  total_amount: string;
  deposit_paid: boolean;
  special_requests?: string;
  created_by?: number;
  created_at?: string;
  updated_at?: string;
}

// ─────────────────────────────
// Billing & Payments
// ─────────────────────────────

export type InvoiceStatus = "draft" | "unpaid" | "partially_paid" | "paid" | "voided";
export type InvoiceType = "hotel" | "restaurant" | "mixed";
export type InvoiceItemType = "room_charge" | "pos_charge" | "extra_charge" | "discount";
export type PaymentMethod = "cash" | "card" | "esewa" | "khalti" | "fonepay" | "bank_transfer" | "credit";

export interface Invoice {
  id: number;
  invoice_number: string;
  invoice_type: InvoiceType;
  reservation?: any;
  walk_in_guest_name: string;
  walk_in_guest_phone: string;
  subtotal: string;
  discount_amount: string;
  service_charge_rate: string;
  service_charge_amount: string;
  tax_rate: string;
  tax_amount: string;
  vat_amount: string;
  digital_rebate_amount: string;
  net_payable_amount: string;
  total_amount: string;
  paid_amount: string;
  balance_due: string;
  due_amount?: string;
  is_paid?: boolean;
  status: InvoiceStatus;
  is_irdbill: boolean;
  fiscal_year: string;
  notes: string;
  created_at: string;
  updated_at: string;
  items?: InvoiceItem[];
  payments?: Payment[];
}

// ─────────────────────────────
// Dashboard Analytics
// ─────────────────────────────

export interface DashboardStats {
  total_rooms: number;
  available_rooms: number;
  occupied_rooms: number;
  dirty_rooms: number;
  maintenance_rooms: number;
  occupancy_rate: number;
  today_arrivals: number;
  today_departures: number;
  today_in_house: number;
  today_revenue: number;
}

// ─────────────────────────────
// Restaurant & POS (Phase 4)
// ─────────────────────────────

export interface DiningArea {
  id: number;
  name: string;
  is_active: boolean;
}

export type TableStatus = "available" | "occupied" | "reserved" | "cleaning";

export interface DiningTable {
  id: number;
  area: number;
  area_name: string;
  table_number: string;
  capacity: number;
  status: TableStatus;
  qr_code: string;
}

export interface MenuItem {
  id: number;
  category: number;
  category_name: string;
  name: string;
  description: string;
  price: string; // decimal from backend
  cost_price: string;
  is_available: boolean;
  prep_time_minutes: number;
  image: string;
  is_vegetarian: boolean;
  is_vegan: boolean;
  contains_allergens: string[];
}

export interface MenuCategory {
  id: number;
  name: string;
  display_order: number;
  is_active: boolean;
  icon: string;
  items: MenuItem[];
}

export type OrderType = "dine_in" | "takeaway" | "room_service" | "bar";

export type OrderStatus = "pending" | "preparing" | "ready" | "served" | "paid" | "cancelled";

export type OrderItemStatus = "pending" | "preparing" | "ready" | "served";

export interface OrderItem {
  id: number;
  menu_item: MenuItem;
  quantity: number;
  unit_price: string;
  modifiers: Record<string, any>;
  notes: string;
  status: OrderItemStatus;
  status_display: string;
}

export interface Order {
  id: number;
  table: number | null;
  table_number: string | null;
  reservation: number | null;
  guest_name: string | null;
  order_type: OrderType;
  status: OrderStatus;
  notes: string;
  subtotal: string;
  tax_amount: string;
  discount_amount: string;
  total_amount: string;
  items: OrderItem[];
  created_by: number | null;
  created_at: string;
  served_at: string | null;
  paid_at: string | null;
}

export type KOTStatus = "pending" | "done";
export type KOTStation = "hot_kitchen" | "cold_prep" | "bar" | "pastry";

export interface KOT {
  id: number;
  order_id: number;
  table_number: string;
  order_type: string;
  station: KOTStation;
  station_display: string;
  status: KOTStatus;
  created_at: string;
  items: Array<{
    item_id: number;
    name: string;
    quantity: number;
    notes: string;
    modifiers: Record<string, any>;
    status: OrderItemStatus;
  }>;
}

export interface CreateOrderPayload {
  table_id?: number | null;
  reservation_id?: number | null;
  order_type: OrderType;
  notes?: string;
  discount_amount?: string;
  items: Array<{
    menu_item_id: number;
    quantity: number;
    modifiers?: Record<string, any>;
    notes?: string;
  }>;
}

// ─────────────────────────────
// Housekeeping & Maintenance (Phase 5)
// ─────────────────────────────

export type HousekeepingStatus = "pending" | "in_progress" | "done" | "skipped" | "issue_reported";
export type HousekeepingPriority = "low" | "normal" | "high" | "urgent";
export type HousekeepingTaskType = "clean" | "deep_clean" | "turndown" | "maintenance" | "inspection";

export interface HousekeepingTask {
  id: number;
  room: number;
  room_number: string;
  room_floor: number;
  room_status: RoomStatus;
  assigned_to: number | null;
  assigned_to_name: string | null;
  task_type: HousekeepingTaskType;
  status: HousekeepingStatus;
  priority: HousekeepingPriority;
  triggered_by: string;
  notes: string;
  issue_description: string;
  completion_photo: string;
  due_by: string | null;
  started_at: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}

export type MaintenanceCategory = "plumbing" | "electrical" | "furniture" | "ac" | "other";
export type MaintenanceStatus = "open" | "in_progress" | "resolved";

export interface MaintenanceRequest {
  id: number;
  room: number;
  room_number: string;
  reported_by: number;
  reported_by_name: string;
  category: MaintenanceCategory;
  status: MaintenanceStatus;
  description: string;
  resolved_by: number | null;
  resolved_by_name: string | null;
  resolution_notes: string;
  resolved_at: string | null;
  created_at: string;
}

export interface HousekeepingBoardRoom {
  room_id: number;
  room_number: string;
  floor: number;
  room_type_name: string;
  status: RoomStatus;
  active_task: HousekeepingTask | null;
}

export interface CreateMaintenancePayload {
   room_id: number;
   category: MaintenanceCategory;
   description: string;
 }

 export interface RoomDiscrepancy {
   id: number;
   room: number;
   room_number: string;
   system_status: RoomStatus;
   physical_status_found: RoomStatus;
   reported_by: number;
   reported_by_name: string | null;
   reported_at: string;
   resolved: boolean;
   resolution_notes: string | null;
 }

 export interface LostFoundItem {
   id: number;
   room: number;
   room_number: string;
   found_by: number;
   found_by_name: string | null;
   description: string;
   photo: string | null;
   found_at: string;
   status: "stored" | "claimed" | "disposed";
   claimed_by_guest_id: number | null;
   claimed_by_guest_name: string | null;
   claimed_at: string | null;
 }

 export interface BookingGap {
   date: string;
   room_id: number;
   room_number: string;
   is_available: boolean;
   reservation_id: number | null;
 }

// ─────────────────────────────
// Inventory (Phase 5)
// ─────────────────────────────

export interface Category {
  id: number;
  name: string;
  parent?: number | null;
  parent_name?: string | null;
}

export type InventoryUnit = "kg" | "litre" | "piece" | "box" | "dozen";

export interface InventoryItem {
  id: number;
  category: number;
  category_name: string;
  name: string;
  sku: string;
  unit: InventoryUnit;
  current_stock: string; // decimal from backend
  reorder_level: string;
  max_stock: string;
  cost_price: string;
  last_purchase_price: string;
  is_perishable: boolean;
  expiry_tracking: boolean;
}

export interface Supplier {
  id: number;
  name: string;
  contact_person: string;
  phone: string;
  email: string;
  address: string;
  payment_terms: string;
  rating: number;
}

export interface POItem {
  id: number;
  item: number;
  item_name: string;
  item_sku: string;
  item_unit: string;
  quantity: string; // decimal from backend
  unit_price: string;
  received_qty: string;
}

export type POStatus = "draft" | "sent" | "partial" | "fulfilled" | "cancelled";

export interface PurchaseOrder {
  id: number;
  supplier: number;
  supplier_name: string;
  status: POStatus;
  expected_date: string | null;
  notes: string;
  total_amount: string;
  created_by: number | null;
  created_by_name: string | null;
  created_at: string;
  items: POItem[];
}

export type StockMovementType =
  | "purchase_in"
  | "manual_in"
  | "recipe_out"
  | "manual_out"
  | "waste"
  | "adjustment";

export interface StockMovement {
  id: number;
  item: number;
  item_name: string;
  item_sku: string;
  movement_type: StockMovementType;
  quantity: string; // decimal from backend
  unit_cost: string;
  reference_id: number | null;
  notes: string;
  created_by: number | null;
  created_by_name: string | null;
  created_at: string;
}

export interface Recipe {
  id: number;
  menu_item: number;
  menu_item_name: string;
  ingredient: number;
  ingredient_name: string;
  quantity_per_serving: string;
  unit: string;
}

export interface RoomAmenityConsumption {
  id: number;
  room: number;
  room_number: string;
  inventory_item: number;
  item_name: string;
  quantity: string;
  consumed_at: string;
  logged_by: number;
  is_complimentary: boolean;
  reservation?: number;
}

// ─────────────────────────────
// Staff, HR, & Payroll (Phase 6)
// ─────────────────────────────

export interface Department {
  id: number;
  name: string;
  head?: number | null;
  head_name?: string | null;
  created_at?: string;
  updated_at?: string;
}

export type EmploymentType = "full_time" | "part_time" | "contract";
export type SalaryType = "monthly" | "hourly";
export type TaxFilingStatus = "single" | "married";

export interface StaffUserPayload {
  email: string;
  first_name: string;
  last_name: string;
  phone?: string;
  role: UserRole;
  password?: string;
  is_active: boolean;
}

export interface StaffMember {
  id: number;
  user: StaffUserPayload;
  full_name: string;
  email: string;
  department: number;
  department_name: string;
  designation: string;
  hire_date: string;
  employment_type: EmploymentType;
  base_salary: string;
  salary_type: SalaryType;
  bank_name: string;
  bank_account_number: string;
  emergency_contact_name: string;
  emergency_contact_phone: string;
  profile_photo: string | null;
  profile_photo_url: string | null;
  tax_filing_status: TaxFilingStatus;
  attendance_pin: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export type DocumentType = "citizenship" | "passport" | "contract" | "certificate" | "other";

export interface StaffDocument {
  id: number;
  staff: number;
  document_type: DocumentType;
  file: string;
  file_url: string | null;
  expiry_date: string | null;
  notes: string;
  created_at: string;
}

export interface Shift {
  id: number;
  staff: number;
  staff_name: string;
  date: string;
  start_time: string;
  end_time: string;
  department: number;
  department_name: string;
  is_confirmed: boolean;
  notes: string;
  created_at?: string;
  updated_at?: string;
}

export type AttendanceStatus = "present" | "absent" | "half_day" | "leave" | "holiday" | "weekend";

export interface Attendance {
  id: number;
  staff: number;
  staff_name: string;
  date: string;
  clock_in: string | null;
  clock_out: string | null;
  status: AttendanceStatus;
  clock_in_by: number | null;
  clock_in_by_name: string | null;
  overtime_hours: string;
  notes: string;
  created_at?: string;
  updated_at?: string;
}

export interface LeaveType {
  id: number;
  name: string;
  days_per_year: number;
  is_paid: boolean;
  carry_forward_limit: number;
}

export interface LeaveBalance {
  id: number;
  staff: number;
  staff_name: string;
  leave_type: number;
  leave_type_name: string;
  year: number;
  total: number;
  used: number;
  remaining: number;
}

export type LeaveRequestStatus = "pending" | "approved" | "rejected";

export interface LeaveRequest {
  id: number;
  staff: number;
  staff_name: string;
  leave_type: number;
  leave_type_name: string;
  start_date: string;
  end_date: string;
  days: number;
  reason: string;
  status: LeaveRequestStatus;
  approved_by: number | null;
  approved_by_name: string | null;
  approved_at: string | null;
  rejection_reason: string;
  created_at?: string;
  updated_at?: string;
}

export type PayrollPeriodStatus = "draft" | "processing" | "approved" | "paid";

export interface PayrollPeriod {
  id: number;
  month: number;
  month_display: string;
  year: number;
  status: PayrollPeriodStatus;
  entry_count: number;
  created_at: string;
  updated_at?: string;
}

export interface AdjustmentItem {
  name: string;
  amount: string;
}

export interface PayrollEntry {
  id: number;
  period: number;
  staff: number;
  staff_name: string;
  staff_designation: string;
  staff_department: string;
  working_days: string;
  present_days: string;
  absent_days: string;
  leave_days: string;
  basic_salary: string;
  overtime_hours: string;
  overtime_rate: string;
  overtime_amount: string;
  allowances: AdjustmentItem[];
  deductions: AdjustmentItem[];
  ssf_employee: string;
  ssf_employer: string;
  income_tax: string;
  gross_salary: string;
  total_deductions: string;
  net_salary: string;
  is_approved: boolean;
  notes: string;
  created_at: string;
  updated_at?: string;
}

// ─────────────────────────────
// Billing & Payments
// ─────────────────────────────

// Invoices and PaymentMethod are defined at the top to avoid duplicates.

export interface InvoiceItem {
  id: number;
  invoice: number;
  description: string;
  quantity: string;
  unit_price: string;
  amount: string;
  item_type: InvoiceItemType;
}

export interface Payment {
  id: number;
  invoice: number;
  amount: string;
  payment_method: PaymentMethod;
  paid_at: string;
  reference_number: string;
  received_by: number;
  received_by_name?: string;
  notes: string;
  created_at: string;
}

export interface PaymentTransaction {
  id: number;
  invoice: number;
  gateway: "esewa" | "khalti" | "fonepay";
  amount: string;
  status: "pending" | "success" | "failed";
  gateway_ref: string;
  raw_response: any;
  created_at: string;
  updated_at: string;
}

// ─────────────────────────────
// CRM & Loyalty
// ─────────────────────────────

export interface GuestTag {
  id: number;
  name: string;
  color: string;
  created_at: string;
}

export interface GuestActivity {
  id: number;
  guest: number;
  activity_type: string;
  activity_type_display: string;
  description: string;
  created_at: string;
}

export interface Campaign {
  id: number;
  name: string;
  campaign_type: "birthday" | "anniversary" | "winback" | "promotion";
  campaign_type_display?: string;
  message_template: string;
  scheduled_at: string | null;
  status: "draft" | "queued" | "sent";
  status_display?: string;
  created_at: string;
}

export interface LoyaltyAccount {
  id: number;
  guest: any;
  points_balance: number;
  tier: "bronze" | "silver" | "gold" | "platinum";
  tier_display: string;
  tier_updated_at: string;
  transactions?: LoyaltyTransaction[];
  created_at: string;
}

export interface LoyaltyTransaction {
  id: number;
  account: number;
  guest_name?: string;
  points: number;
  transaction_type: "earn" | "redeem";
  transaction_type_display: string;
  description: string;
  created_at: string;
}

// ─────────────────────────────
// Analytics & Reporting
// ─────────────────────────────

export interface DailyMetric {
  id: number;
  property: number;
  date: string;
  total_revenue: string;
  room_revenue: string;
  restaurant_revenue: string;
  other_revenue: string;
  occupied_rooms: number;
  total_rooms: number;
  occupancy_rate: string;
  adr: string;
  revpar: string;
  total_guests: number;
  new_guests: number;
  restaurant_covers: number;
  avg_restaurant_spend: string;
  created_at: string;
  updated_at: string;
}

export interface TodaySnapshot {
  total_revenue: number;
  room_revenue: number;
  restaurant_revenue: number;
  occupied_rooms: number;
  total_rooms: number;
  occupancy_rate: number;
  adr: number;
  revpar: number;
  restaurant_covers: number;
}

export interface DashboardSummaryResponse {
  metrics: DailyMetric[];
  today: TodaySnapshot;
}

export type ReportType =
  | "daily_revenue"
  | "occupancy"
  | "guest_ledger"
  | "staff_attendance"
  | "inventory_consumption"
  | "profit_loss"
  | "nepal_vat"
  | "payroll";

export interface ReportExport {
  id: number;
  report_type: ReportType;
  report_type_display: string;
  format: "pdf" | "excel";
  status: "pending" | "completed" | "failed";
  start_date: string;
  end_date: string;
  file_path: string | null;
  error_message: string | null;
  task_id: string | null;
  created_at: string;
  completed_at: string | null;
}

// ─────────────────────────────
// SaaS Subscriptions & Super Admin (Phase 9)
// ─────────────────────────────

export type SubscriptionStatus = "trial" | "active" | "past_due" | "cancelled" | "suspended";
export type SubscriptionInvoiceStatus = "pending" | "paid" | "failed";

export interface SubscriptionPlan {
  id: number;
  name: string;
  slug: string;
  price_monthly: string;
  price_yearly: string;
  max_rooms: number;
  max_staff_users: number;
  max_restaurants: number;
  features: string[];
  is_active: boolean;
  is_public: boolean;
  created_at: string;
  updated_at: string;
}

export interface TenantSubscription {
  id: number;
  tenant: number;
  tenant_name: string;
  plan: number;
  plan_details: SubscriptionPlan;
  status: SubscriptionStatus;
  trial_ends_at: string | null;
  current_period_start: string;
  current_period_end: string;
  next_billing_date: string;
  cancelled_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface SubscriptionInvoice {
  id: number;
  tenant: number;
  tenant_name: string;
  plan: number;
  plan_name: string;
  amount: string;
  period_start: string;
  period_end: string;
  status: SubscriptionInvoiceStatus;
  paid_at: string | null;
  payment_ref: string;
  created_at: string;
}

export interface AddonModule {
  id: number;
  key: string;
  name: string;
  description: string;
  icon_name: string;
  price_monthly: string | null;
  price_yearly: string | null;
  category: string;
  is_core: boolean;
  depends_on_keys: string[];
  recommended_for: string[];
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface TenantModuleSubAdmin {
  id: number;
  module_key: string;
  module_name: string;
  module_category: string;
  status: string;
  billing_cycle: string;
  price_at_activation: string;
  activated_at: string | null;
  cancelled_at: string | null;
  next_billing_date: string | null;
}

export interface ModuleRevenueItem {
  key: string;
  name: string;
  category: string;
  icon_name: string;
  price_monthly: string;
  price_yearly: string | null;
  is_core: boolean;
  active_tenants: number;
  cancelled_tenants: number;
  mrr: number;
}

export interface ModuleRevenueResponse {
  modules: ModuleRevenueItem[];
  total_mrr: number;
  trends: Record<string, Record<string, { name: string; count: number }>>;
}

export interface AddonRequest {
  id: number;
  tenant: number;
  tenant_name: string;
  addon: number;
  addon_name: string;
  requested_by: number | null;
  requested_by_name: string;
  status: "pending" | "approved" | "rejected" | "active";
  message: string;
  rejection_reason: string;
  reviewed_by: number | null;
  reviewed_by_name: string;
  requested_at: string;
  reviewed_at: string | null;
}

export interface SuperAdminMetrics {
  active_hotels: number;
  active_tenants: number;
  trial_hotels: number;
  trial_tenants: number;
  mrr: number;
  plan_mrr: number;
  module_mrr: number;
  pending_invoices: number;
  growth_data: Array<{
    month: string;
    revenue: number;
  }>;
  total_tenants: number;
  trial_ending_soon: number;
  churn_this_month: number;
  plan_distribution: Record<string, number>;
  tenant_health: Array<{
    id: number;
    name: string;
    plan: string;
    status: string;
    last_active: string;
    days_since_signup: number;
    activity_status: "healthy" | "low_activity" | "at_risk";
  }>;
  recent_events: Array<{
    id: string;
    timestamp: string;
    type: "signup" | "impersonation" | "payment" | "support";
    message: string;
  }>;
}

export interface ClientOnboardPayload {
  name: string;
  schema_name: string;
  subdomain: string;
  admin_email: string;
  admin_password: string;
  business_type?: string;
  contact_phone?: string;
}


