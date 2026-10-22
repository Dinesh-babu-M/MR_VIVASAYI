// ============================================================
// MR. VIVASAYI PLATFORM - TypeScript Type Definitions
// ============================================================

// --- Enums / Union Types ---

export type UserRole =
  | 'SUPER_ADMIN'
  | 'OWNER'
  | 'ADMIN'
  | 'STORE_MANAGER'
  | 'PRODUCT_MANAGER'
  | 'BILLING_MANAGER'
  | 'STAFF'
  | 'INVENTORY_MANAGER'
  | 'SALES_STAFF'
  | 'DELIVERY_STAFF'
  | 'VIEWER';

export type StockStatus = 'IN_STOCK' | 'LOW_STOCK' | 'OUT_OF_STOCK' | 'DISABLED';

export type MovementType =
  | 'PURCHASE'
  | 'SALE'
  | 'CUSTOMER_RETURN'
  | 'DAMAGE'
  | 'EXPIRY'
  | 'ADJUSTMENT'
  | 'SUPPLIER_RETURN'
  | 'OPENING';

export type OrderStatus =
  | 'NEW'
  | 'CONFIRMED'
  | 'PACKING'
  | 'READY'
  | 'OUT_FOR_DELIVERY'
  | 'DELIVERED'
  | 'CANCELLED'
  | 'RETURNED';

export type OrderSource = 'WHATSAPP' | 'POS' | 'WEBSITE' | 'PHONE' | 'WALK_IN';

export type PaymentMethod = 'CASH' | 'UPI' | 'CARD' | 'BANK' | 'OTHER' | 'PENDING';

export type PaymentStatus = 'PENDING' | 'PARTIAL' | 'PAID' | 'REFUNDED' | 'FAILED';

export type DeliveryStatus =
  | 'PENDING'
  | 'ASSIGNED'
  | 'OUT_FOR_DELIVERY'
  | 'DELIVERED'
  | 'FAILED'
  | 'CANCELLED';

export type MessageStatus =
  | 'PENDING'
  | 'PROCESSING'
  | 'SENT'
  | 'DELIVERED'
  | 'READ'
  | 'FAILED'
  | 'RETRY'
  | 'CANCELLED';

export type ChannelType = 'WHATSAPP' | 'EMAIL' | 'SMS';

export type PromotionStatus =
  | 'DRAFT'
  | 'PREVIEW'
  | 'APPROVED'
  | 'ACTIVE'
  | 'SCHEDULED'
  | 'SENT'
  | 'ARCHIVED'
  | 'CANCELLED';

export type ReviewStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'HIDDEN';

export type CMSStatus = 'DRAFT' | 'PREVIEW' | 'PUBLISHED' | 'SCHEDULED' | 'ARCHIVED';

export type PurchaseStatus = 'DRAFT' | 'ORDERED' | 'PARTIAL' | 'RECEIVED' | 'CANCELLED';

export type Theme = 'light' | 'dark' | 'system';

// --- Database Entity Types ---

export interface UserProfile {
  id: string;
  email: string;
  full_name: string;
  phone?: string;
  role: UserRole | string;
  avatar_url?: string;
  bio?: string;
  designation?: string;
  department?: string;
  user_group?: string;
  emergency_contact?: string;
  joined_date?: string;
  password?: string;
  permissions?: any[];
  custom_permissions?: Record<string, Record<string, boolean>>;
  metadata?: Record<string, any>;
  notes?: string;
  is_active: boolean;
  status?: 'ACTIVE' | 'SUSPENDED' | 'DELETED';
  last_login_at?: string;
  created_at: string;
  updated_at: string;
}

export type StaffUser = UserProfile;

export interface UserPermission {
  id: string;
  user_id: string;
  module: string;
  can_view: boolean;
  can_create: boolean;
  can_edit: boolean;
  can_delete: boolean;
  can_export: boolean;
  created_at: string;
  updated_at: string;
}

export interface Category {
  id: string;
  name: string;
  tamil_name?: string;
  slug: string;
  description?: string;
  image_url?: string;
  icon?: string;
  display_order: number;
  is_active: boolean;
  is_visible: boolean;
  created_at: string;
  updated_at: string;
  product_count?: number;
}

export interface Supplier {
  id: string;
  name: string;
  business_name?: string;
  phone?: string;
  email?: string;
  address?: string;
  district?: string;
  state: string;
  pincode?: string;
  payment_terms?: string;
  bank_details?: Record<string, string> | string;
  notes?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Product {
  id: string;
  sku: string;
  name: string;
  tamil_name?: string;
  slug: string;
  category_id?: string;
  supplier_id?: string;
  description?: string;
  short_description?: string;
  pack_size?: string;
  unit: string;
  image_url?: string;
  images?: string[];
  purchase_price: number;
  landed_cost: number;
  mrp: number;
  selling_price: number;
  offer_price?: number;
  tax_percent: number;
  reorder_level: number;
  opening_stock: number;
  current_stock: number;
  stock_status: StockStatus;
  is_featured: boolean;
  is_visible: boolean;
  is_organic: boolean;
  labels?: string[];
  festival_offer?: string;
  organic_certification?: string;
  source_description?: string;
  storage_info?: string;
  expiry_tracking?: boolean;
  notes?: string;
  created_at: string;
  updated_at: string;
  // Joined
  category?: Category;
  supplier?: Supplier;
  rating?: number;
  review_count?: number;
}

export interface ProductPriceHistory {
  id: string;
  product_id: string;
  old_selling_price?: number;
  new_selling_price: number;
  old_offer_price?: number;
  new_offer_price?: number;
  old_mrp?: number;
  new_mrp?: number;
  reason?: string;
  changed_by?: string;
  effective_from: string;
  created_at: string;
}

export interface Customer {
  id: string;
  customer_id?: string;
  name: string;
  phone?: string;
  whatsapp_number?: string;
  country_code?: string; // ISO 3166-1 alpha-2, e.g. 'IN'
  calling_code?: string; // e.g. '+91'
  email?: string;
  address?: string;
  area?: string;
  city: string;
  state: string;
  pincode?: string;
  notes?: string;
  source_channel?: 'WEBSITE' | 'WHATSAPP' | 'OFFLINE_POS' | 'N_A';
  return_count?: number;
  assigned_staff?: string;
  total_orders: number;
  total_spent: number;
  first_order_at?: string;
  last_order_at?: string;
  whatsapp_sent_status?: 'SENT' | 'NOT_SENT';
  email_sent_status?: 'SENT' | 'NOT_SENT';
  last_template_sent?: 'THANKS_MESSAGE' | 'RESTOCK_ALERT' | 'ORDER_CONFIRMATION' | 'PROMOTION_SCHEDULED' | 'DETAILS_NOT_SENT' | 'COD_PAYMENT_REQUEST' | 'COD_SCREENSHOT_PENDING';
  last_template_sent_at?: string;
  last_sent_channel?: 'WHATSAPP' | 'EMAIL' | 'BOTH' | 'NONE';
  category_preference?: string; // e.g. 'Traditional Rice', 'Millets', 'Cold-Pressed Oils'
  promotion_schedule?: 'EVERY_1_DAY' | 'EVERY_1_WEEK' | 'EVERY_1_MONTH' | 'CUSTOM_DATE' | 'NONE';
  custom_schedule_date?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CustomerNote {
  id: string;
  customer_id: string;
  note: string;
  created_by?: string;
  created_at: string;
}

export interface PurchaseOrder {
  id: string;
  po_number: string;
  supplier_id: string;
  status: PurchaseStatus;
  ordered_at?: string;
  received_at?: string;
  subtotal: number;
  discount?: number;
  tax_amount: number;
  delivery_charge?: number;
  total: number;
  paid_amount: number;
  notes?: string;
  sourcing_notes?: string;
  created_by?: string;
  created_at: string;
  updated_at: string;
  supplier?: Supplier;
  items?: PurchaseOrderItem[];
}

export interface PurchaseOrderItem {
  id: string;
  purchase_order_id: string;
  product_id: string;
  product_name_snapshot: string;
  quantity: number;
  received_quantity: number;
  purchase_price: number;
  total: number;
  created_at: string;
  product?: Product;
}

export interface StockMovement {
  id: string;
  product_id: string;
  movement_type: MovementType;
  quantity: number;
  stock_before: number;
  stock_after: number;
  reference_id?: string;
  reference_type?: string;
  notes?: string;
  created_by?: string;
  created_at: string;
  product?: Product;
}

export interface InventoryBatch {
  id: string;
  product_id: string;
  purchase_order_id?: string;
  batch_number?: string;
  quantity: number;
  remaining_quantity: number;
  purchase_price?: number;
  manufactured_date?: string;
  expiry_date?: string;
  created_at: string;
  updated_at: string;
}

export interface Order {
  id: string;
  order_number: string;
  source: OrderSource;
  customer_id?: string;
  customer_name_snapshot?: string;
  customer_phone_snapshot?: string;
  country_code?: string;
  calling_code?: string;
  whatsapp_message_status?: 'PENDING' | 'SENT' | 'DELIVERED' | 'FAILED';
  status: OrderStatus;
  subtotal: number;
  discount: number;
  delivery_fee: number;
  tax_amount: number;
  total: number;
  payment_method: PaymentMethod;
  payment_status: PaymentStatus;
  delivery_address?: string;
  delivery_area?: string;
  notes?: string;
  created_by?: string;
  is_deleted?: boolean;
  deleted_at?: string;
  created_at: string;
  updated_at: string;
  customer?: Customer;
  items?: OrderItem[];
}

export interface SampleBillingOrder extends Order {
  is_sample: true;
  sample_code: string; // e.g. "id-0001", "id-0002"
  converted_to_live?: boolean;
  converted_at?: string;
  converted_order_id?: string;
  show_watermark?: boolean;
  total_mrp?: number;
  mrp_savings?: number;
  extra_discount_mode?: 'PERCENT' | 'AMOUNT';
  extra_discount_value?: number;
  extra_discount_amount?: number;
  gst_percent?: number;
}

export interface OrderItem {
  id: string;
  order_id: string;
  product_id?: string;
  product_name_snapshot: string;
  tamil_name_snapshot?: string;
  pack_size_snapshot?: string;
  sku_snapshot?: string;
  quantity: number;
  unit_price_snapshot: number;
  mrp_snapshot?: number;
  discount: number;
  item_discount_percent?: number;
  total: number;
  created_at: string;
}

export interface OrderStatusHistory {
  id: string;
  order_id: string;
  old_status?: OrderStatus;
  new_status: OrderStatus;
  notes?: string;
  changed_by?: string;
  created_at: string;
}

export interface Invoice {
  id: string;
  invoice_number: string;
  order_id?: string;
  customer_id?: string;
  customer_name_snapshot?: string;
  customer_phone_snapshot?: string;
  customer_address_snapshot?: string;
  subtotal: number;
  discount: number;
  tax_amount: number;
  delivery_fee: number;
  total: number;
  payment_method: PaymentMethod;
  payment_status: PaymentStatus;
  notes?: string;
  created_by?: string;
  created_at: string;
  items?: InvoiceItem[];
}

export interface InvoiceItem {
  id: string;
  invoice_id: string;
  product_id?: string;
  product_name_snapshot: string;
  pack_size_snapshot?: string;
  sku_snapshot?: string;
  quantity: number;
  unit_price_snapshot: number;
  discount: number;
  total: number;
  created_at: string;
}

export interface Payment {
  id: string;
  order_id?: string;
  invoice_id?: string;
  customer_id?: string;
  amount: number;
  method: PaymentMethod;
  status: PaymentStatus;
  reference?: string;
  notes?: string;
  created_by?: string;
  created_at: string;
}

export interface DeliveryArea {
  id: string;
  name: string;
  charge: number;
  is_active: boolean;
  created_at: string;
}

export interface Delivery {
  id: string;
  order_id: string;
  customer_id?: string;
  area_id?: string;
  delivery_address?: string;
  area?: string;
  charge: number;
  assigned_to?: string;
  status: DeliveryStatus;
  assigned_at?: string;
  dispatched_at?: string;
  delivered_at?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface ExpenseCategory {
  id: string;
  name: string;
  is_active: boolean;
  created_at: string;
}

export interface Expense {
  id: string;
  category_id?: string;
  category_name: string;
  amount: number;
  description?: string;
  receipt_url?: string;
  expense_date: string;
  payment_method: PaymentMethod;
  created_by?: string;
  created_at: string;
  updated_at: string;
}

export interface Promotion {
  id: string;
  name: string;
  description?: string;
  discount_type: 'PERCENTAGE' | 'FIXED';
  discount_value: number;
  status: PromotionStatus;
  frequency: 'ONE_TIME' | 'EVERY_15_DAYS' | 'MONTHLY';
  start_date?: string;
  end_date?: string;
  send_date?: string;
  send_whatsapp: boolean;
  send_email: boolean;
  created_by?: string;
  approved_by?: string;
  created_at: string;
  updated_at: string;
}

export interface Coupon {
  id: string;
  coupon_id?: string;
  coupons_ids?: string;
  code: string;
  description?: string;
  discount_type: 'PERCENTAGE' | 'FIXED';
  discount_value: number;
  min_order_value?: number;
  max_discount_value?: number;
  is_active: boolean;
  usage_limit?: number;
  times_used: number;
  created_at: string;
}

export interface Combo {
  id: string;
  name: string;
  description?: string;
  image_url?: string;
  combo_price: number;
  mrp?: number;
  is_active: boolean;
  is_visible: boolean;
  created_at: string;
  updated_at: string;
  items?: ComboItem[];
}

export interface ComboItem {
  id: string;
  combo_id: string;
  product_id: string;
  quantity: number;
  created_at: string;
  product?: Product;
}

export interface WhatsappMessage {
  id: string;
  external_message_id?: string;
  customer_id?: string;
  phone_number?: string;
  message_text?: string;
  message_type: string;
  direction: 'inbound' | 'outbound';
  status: MessageStatus;
  order_id?: string;
  raw_payload?: Record<string, unknown>;
  received_at?: string;
  sent_at?: string;
  created_at: string;
}

export interface Review {
  id: string;
  customer_id?: string;
  customer_name: string;
  customer_phone?: string;
  customer_location?: string;
  product_id?: string;
  order_id?: string;
  rating: number;
  title?: string;
  body: string;
  image_url?: string;
  images?: string[];
  is_verified_purchase: boolean;
  is_featured: boolean;
  status: ReviewStatus;
  admin_reply?: string;
  admin_reply_at?: string;
  admin_reply_by?: string;
  created_at: string;
  updated_at: string;
  product?: Product;
}

export interface WebsiteSection {
  id: string;
  page: string;
  section_key: string;
  title?: string;
  subtitle?: string;
  content?: string;
  image_url?: string;
  cta_text?: string;
  cta_link?: string;
  data_json?: Record<string, unknown>;
  display_order: number;
  is_visible: boolean;
  status: CMSStatus;
  published_at?: string;
  published_by?: string;
  created_at: string;
  updated_at: string;
}

export interface WebsiteSetting {
  id: string;
  key: string;
  value?: string;
  value_json?: Record<string, unknown>;
  label?: string;
  description?: string;
  is_public: boolean;
  updated_at: string;
}

export interface WebsiteNavigation {
  id: string;
  location: string;
  label: string;
  url: string;
  display_order: number;
  is_visible: boolean;
  created_at: string;
  updated_at: string;
}

export interface WebsiteSEO {
  id: string;
  page: string;
  title?: string;
  description?: string;
  keywords?: string;
  og_image?: string;
  canonical_url?: string;
  updated_at: string;
}

export interface WebsiteChangeHistory {
  id: string;
  user_id?: string;
  object_type: string;
  object_id?: string;
  object_label?: string;
  action: string;
  old_value?: string;
  new_value?: string;
  old_json?: Record<string, unknown>;
  new_json?: Record<string, unknown>;
  created_at: string;
  user?: UserProfile;
}

export interface AuditLog {
  id: string;
  user_id?: string;
  user_email?: string;
  action: string;
  object_type?: string;
  object_id?: string;
  old_data?: Record<string, unknown>;
  new_data?: Record<string, unknown>;
  ip_address?: string;
  user_agent?: string;
  created_at: string;
}

export interface NotificationQueue {
  id: string;
  channel: ChannelType;
  customer_id?: string;
  recipient: string;
  template_key?: string;
  reference_id?: string;
  reference_type?: string;
  payload?: Record<string, unknown>;
  status: MessageStatus;
  attempts: number;
  max_attempts: number;
  scheduled_at?: string;
  sent_at?: string;
  failed_at?: string;
  error?: string;
  created_at: string;
  updated_at: string;
}

export interface NotificationSetting {
  id: string;
  event_key: string;
  event_label: string;
  whatsapp_enabled: boolean;
  email_enabled: boolean;
  updated_at: string;
}

// --- Application / UI Types ---

export interface CartItem {
  product: Product;
  quantity: number;
}

export interface POSCartItem {
  product: Product;
  quantity: number;
  discount: number;
  unitPrice: number;
  total: number;
}

export interface DashboardStats {
  todaySales: number;
  todayOrders: number;
  newCustomers: number;
  repeatCustomers: number;
  grossProfit: number;
  expenses: number;
  pendingPayments: number;
  lowStockCount: number;
  outOfStockCount: number;
  expiringCount: number;
  weekSales: number[];
  weekLabels: string[];
}

export interface SearchResult {
  type: 'product' | 'customer' | 'order' | 'invoice' | 'supplier';
  id: string;
  label: string;
  sublabel?: string;
  url: string;
}

export interface Setting {
  id: string;
  key: string;
  value?: string;
  value_json?: Record<string, unknown>;
  label?: string;
  category: string;
  is_sensitive: boolean;
  updated_at: string;
}

export interface SalesChartData {
  date: string;
  sales: number;
  orders: number;
  profit: number;
}

export interface TopProduct {
  product_id: string;
  product_name: string;
  total_quantity: number;
  total_revenue: number;
}

export interface WebsiteAnalyzeEvent {
  id: string;
  session_id: string;
  path: string;
  page_title: string;
  referrer: string;
  device_type: 'Mobile' | 'Desktop' | 'Tablet';
  browser: string;
  os: string;
  ip_hash: string;
  city: string;
  country: string;
  duration_seconds: number;
  is_unique: boolean;
  created_at: string;
}

