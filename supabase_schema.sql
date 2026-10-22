-- ============================================================
-- MR. VIVASAYI ORGANIC STOREFRONT & CRM - COMPLETE SUPABASE DDL & SEED
-- ============================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Users & Staff
CREATE TABLE IF NOT EXISTS public.users (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  full_name TEXT NOT NULL,
  phone TEXT,
  role TEXT NOT NULL DEFAULT 'STAFF',
  avatar_url TEXT,
  password TEXT DEFAULT 'sha256:8b2ab5e27d05ef1e1cbff546d57d8ed9e8de479941332508c7ddd5fb0c8f9a6a',
  designation TEXT DEFAULT 'Staff Member',
  department TEXT DEFAULT 'Operations',
  bio TEXT DEFAULT '',
  emergency_contact TEXT DEFAULT '',
  joined_date TEXT DEFAULT '',
  user_group TEXT DEFAULT 'Store Operations',
  permissions JSONB DEFAULT '[]'::jsonb,
  custom_permissions JSONB DEFAULT '{}'::jsonb,
  metadata JSONB DEFAULT '{}'::jsonb,
  notes TEXT DEFAULT '',
  is_active BOOLEAN DEFAULT true,
  last_login_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 1B. Roles & Access Control
CREATE TABLE IF NOT EXISTS public.roles (
  id TEXT PRIMARY KEY,
  role TEXT UNIQUE NOT NULL,
  title TEXT NOT NULL,
  level INT DEFAULT 3,
  description TEXT,
  badge_color TEXT,
  is_custom BOOLEAN DEFAULT false,
  department TEXT DEFAULT 'Store Operations',
  permissions JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Categories
CREATE TABLE IF NOT EXISTS public.categories (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  tamil_name TEXT,
  slug TEXT UNIQUE NOT NULL,
  description TEXT,
  image_url TEXT,
  icon TEXT,
  display_order INT DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  is_visible BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Suppliers
CREATE TABLE IF NOT EXISTS public.suppliers (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  business_name TEXT,
  phone TEXT,
  email TEXT,
  address TEXT,
  district TEXT,
  state TEXT DEFAULT 'Tamil Nadu',
  pincode TEXT,
  payment_terms TEXT,
  bank_details TEXT,
  notes TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Products
CREATE TABLE IF NOT EXISTS public.products (
  id TEXT PRIMARY KEY,
  sku TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  tamil_name TEXT,
  slug TEXT UNIQUE NOT NULL,
  category_id TEXT,
  supplier_id TEXT,
  description TEXT,
  short_description TEXT,
  pack_size TEXT NOT NULL,
  unit TEXT NOT NULL,
  image_url TEXT,
  purchase_price NUMERIC(10,2) DEFAULT 0,
  landed_cost NUMERIC(10,2) DEFAULT 0,
  mrp NUMERIC(10,2) NOT NULL,
  selling_price NUMERIC(10,2) NOT NULL,
  offer_price NUMERIC(10,2),
  tax_percent NUMERIC(5,2) DEFAULT 5.0,
  reorder_level INT DEFAULT 10,
  opening_stock INT DEFAULT 0,
  current_stock INT DEFAULT 0,
  stock_status TEXT DEFAULT 'IN_STOCK',
  is_featured BOOLEAN DEFAULT false,
  is_visible BOOLEAN DEFAULT true,
  is_organic BOOLEAN DEFAULT true,
  organic_certification TEXT,
  source_description TEXT,
  storage_info TEXT,
  expiry_tracking BOOLEAN DEFAULT false,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Customers
CREATE TABLE IF NOT EXISTS public.customers (
  id TEXT PRIMARY KEY,
  customer_id TEXT UNIQUE,
  name TEXT NOT NULL,
  phone TEXT,
  whatsapp_number TEXT,
  country_code TEXT DEFAULT 'IN',
  calling_code TEXT DEFAULT '+91',
  email TEXT,
  address TEXT,
  area TEXT,
  city TEXT DEFAULT '',
  state TEXT DEFAULT 'Tamil Nadu',
  pincode TEXT,
  notes TEXT,
  source_channel TEXT DEFAULT 'OFFLINE_POS',
  assigned_staff TEXT,
  return_count INT DEFAULT 0,
  total_orders INT DEFAULT 0,
  total_spent NUMERIC(12,2) DEFAULT 0,
  whatsapp_sent_status TEXT DEFAULT 'NOT_SENT',
  email_sent_status TEXT DEFAULT 'NOT_SENT',
  last_template_sent TEXT,
  last_template_sent_at TIMESTAMPTZ,
  last_sent_channel TEXT,
  category_preference TEXT,
  promotion_schedule TEXT DEFAULT 'NONE',
  custom_schedule_date TEXT,
  first_order_at TIMESTAMPTZ,
  last_order_at TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Orders
CREATE TABLE IF NOT EXISTS public.orders (
  id TEXT PRIMARY KEY,
  order_number TEXT UNIQUE NOT NULL,
  source TEXT NOT NULL DEFAULT 'POS',
  customer_id TEXT,
  customer_name_snapshot TEXT,
  customer_phone_snapshot TEXT,
  country_code TEXT DEFAULT 'IN',
  calling_code TEXT DEFAULT '+91',
  whatsapp_message_status TEXT DEFAULT 'PENDING',
  status TEXT DEFAULT 'NEW',
  subtotal NUMERIC(12,2) DEFAULT 0,
  discount NUMERIC(12,2) DEFAULT 0,
  delivery_fee NUMERIC(10,2) DEFAULT 0,
  tax_amount NUMERIC(10,2) DEFAULT 0,
  total NUMERIC(12,2) DEFAULT 0,
  payment_method TEXT DEFAULT 'CASH',
  payment_status TEXT DEFAULT 'PENDING',
  delivery_address TEXT,
  delivery_area TEXT,
  notes TEXT,
  items JSONB DEFAULT '[]'::jsonb,
  created_by TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. Order Items
CREATE TABLE IF NOT EXISTS public.order_items (
  id TEXT PRIMARY KEY,
  order_id TEXT,
  product_id TEXT,
  product_name_snapshot TEXT NOT NULL,
  tamil_name_snapshot TEXT,
  pack_size_snapshot TEXT,
  sku_snapshot TEXT,
  quantity INT NOT NULL,
  unit_price_snapshot NUMERIC(10,2) NOT NULL,
  discount NUMERIC(10,2) DEFAULT 0,
  total NUMERIC(12,2) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 8. Stock Movements
CREATE TABLE IF NOT EXISTS public.stock_movements (
  id TEXT PRIMARY KEY,
  product_id TEXT,
  movement_type TEXT NOT NULL,
  quantity INT NOT NULL,
  stock_before INT NOT NULL,
  stock_after INT NOT NULL,
  reference_id TEXT,
  reference_type TEXT,
  notes TEXT,
  created_by TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 9. Reviews
CREATE TABLE IF NOT EXISTS public.reviews (
  id TEXT PRIMARY KEY,
  product_id TEXT,
  customer_name TEXT NOT NULL,
  rating INT NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment TEXT,
  status TEXT DEFAULT 'APPROVED',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 10. Expenses
CREATE TABLE IF NOT EXISTS public.expenses (
  id TEXT PRIMARY KEY,
  expense_date TEXT NOT NULL,
  category_name TEXT NOT NULL,
  description TEXT NOT NULL,
  payment_method TEXT DEFAULT 'CASH',
  amount NUMERIC(10,2) NOT NULL,
  vendor_name TEXT,
  receipt_url TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 11. Coupons
CREATE TABLE IF NOT EXISTS public.coupons (
  id TEXT PRIMARY KEY,
  code TEXT UNIQUE NOT NULL,
  description TEXT,
  discount_type TEXT NOT NULL,
  discount_value NUMERIC(10,2) NOT NULL,
  min_order_amount NUMERIC(10,2) DEFAULT 0,
  max_discount_amount NUMERIC(10,2),
  is_active BOOLEAN DEFAULT true,
  usage_limit INT,
  used_count INT DEFAULT 0,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 12. Message Templates
CREATE TABLE IF NOT EXISTS public.message_templates (
  id TEXT PRIMARY KEY,
  template_number TEXT,
  title TEXT NOT NULL,
  category TEXT NOT NULL,
  channel TEXT NOT NULL,
  body_text TEXT DEFAULT '',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 13. Purchase Orders
CREATE TABLE IF NOT EXISTS public.purchase_orders (
  id TEXT PRIMARY KEY,
  po_number TEXT UNIQUE NOT NULL,
  supplier_id TEXT,
  status TEXT DEFAULT 'DRAFT',
  ordered_at TIMESTAMPTZ,
  received_at TIMESTAMPTZ,
  subtotal NUMERIC(12,2) DEFAULT 0,
  tax_amount NUMERIC(10,2) DEFAULT 0,
  total NUMERIC(12,2) DEFAULT 0,
  paid_amount NUMERIC(12,2) DEFAULT 0,
  notes TEXT,
  created_by TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 14. Audit Logs
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id TEXT PRIMARY KEY,
  user_email TEXT,
  user_name TEXT,
  user_role TEXT,
  action TEXT NOT NULL,
  object_type TEXT NOT NULL,
  object_id TEXT,
  description TEXT,
  old_data JSONB,
  new_data JSONB,
  ip_address TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 15. Default Data Table (CMS, navigation, system settings)
CREATE TABLE IF NOT EXISTS public.default_data (
  id TEXT PRIMARY KEY,
  module TEXT UNIQUE NOT NULL,
  payload JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 16. Disable RLS or Allow Full Access on all tables
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stock_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coupons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.message_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchase_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.default_data ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public Full Access users" ON public.users FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public Full Access categories" ON public.categories FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public Full Access suppliers" ON public.suppliers FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public Full Access products" ON public.products FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public Full Access customers" ON public.customers FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public Full Access orders" ON public.orders FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public Full Access order_items" ON public.order_items FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public Full Access stock_movements" ON public.stock_movements FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public Full Access reviews" ON public.reviews FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public Full Access expenses" ON public.expenses FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public Full Access coupons" ON public.coupons FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public Full Access message_templates" ON public.message_templates FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public Full Access purchase_orders" ON public.purchase_orders FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public Full Access audit_logs" ON public.audit_logs FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public Full Access default_data" ON public.default_data FOR ALL USING (true) WITH CHECK (true);

-- ============================================================
-- BASE SEED DATA
-- ============================================================
INSERT INTO public.categories (id, name, tamil_name, slug, description, image_url, icon, display_order, is_active, is_visible) VALUES ('cat-1', 'Traditional Rice', 'Parampariya Arisi', 'traditional-rice', 'Heirloom and traditional rice varieties from Tamil Nadu', NULL, '🌾', 1, TRUE, TRUE) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.categories (id, name, tamil_name, slug, description, image_url, icon, display_order, is_active, is_visible) VALUES ('cat-2', 'Millets', 'Sirudhanyam', 'millets', 'Nutritious ancient millets for a healthy lifestyle', NULL, '🌿', 2, TRUE, TRUE) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.categories (id, name, tamil_name, slug, description, image_url, icon, display_order, is_active, is_visible) VALUES ('cat-3', 'Pulses & Legumes', 'Payaru & Paruppu', 'pulses', 'Protein-rich traditional pulses and legumes', NULL, '🫘', 3, TRUE, TRUE) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.categories (id, name, tamil_name, slug, description, image_url, icon, display_order, is_active, is_visible) VALUES ('cat-1791682350228', 'Testing', 'Test', 'testing', NULL, NULL, '🫘', 4, TRUE, TRUE) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.suppliers (id, name, business_name, phone, email, address, district, state, pincode, is_active) VALUES ('sup-1', 'Rajan Krishnamurthy', 'Rajan Agro Farms', '9876543201', 'rajan@rajanagro.com', '45, Farm Road, Palani', 'Dindigul', 'Tamil Nadu', '624601', TRUE) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.suppliers (id, name, business_name, phone, email, address, district, state, pincode, is_active) VALUES ('sup-2', 'Selvi Muthusamy', 'Selvi Traditional Mills', '9876543202', 'selvi@tradmills.com', '12, Mill Street, Usilampatti', 'Madurai', 'Tamil Nadu', '625532', TRUE) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.suppliers (id, name, business_name, phone, email, address, district, state, pincode, is_active) VALUES ('sup-3', 'Palanisamy Gounder', 'Palanivel Cold Press Unit', '9876543203', 'palanivel@coldpress.in', '78, Oil Mill Road, Namakkal', 'Namakkal', 'Tamil Nadu', '637001', TRUE) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.suppliers (id, name, business_name, phone, email, address, district, state, pincode, is_active) VALUES ('sup-4', 'Meenakshi Devi', 'Meena Natural Foods', '9876543204', 'meena@naturalfoods.in', '33, Bazaar Street, Cumbum', 'Theni', 'Tamil Nadu', '625516', TRUE) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.suppliers (id, name, business_name, phone, email, address, district, state, pincode, is_active) VALUES ('sup-5', 'Arumugam Pillai', 'Arumugam Millet Farms', '9876543205', 'arumugam@milletfarms.com', '9, Village Road, Sivagangai', 'Sivagangai', 'Tamil Nadu', '630561', TRUE) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.products (id, sku, name, tamil_name, slug, category_id, supplier_id, description, short_description, pack_size, unit, image_url, purchase_price, landed_cost, mrp, selling_price, offer_price, tax_percent, reorder_level, opening_stock, current_stock, stock_status, is_featured, is_visible, is_organic) VALUES ('p-001', 'LIF-001', 'Mapillai Samba Rice', 'Mapillai Samba Arisi', 'mapillai-samba-rice', 'cat-1', 'sup-1', 'Mapillai Samba is an ancient red rice variety known for its high iron content and earthy flavour.', 'Iron-rich traditional rice variety prized for centuries.', '1kg', 'kg', '/products/mapillai-samba-rice.svg', 120, 125, 175, 160, 155, 5, 15, 100, 72, 'IN_STOCK', TRUE, TRUE, TRUE) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.products (id, sku, name, tamil_name, slug, category_id, supplier_id, description, short_description, pack_size, unit, image_url, purchase_price, landed_cost, mrp, selling_price, offer_price, tax_percent, reorder_level, opening_stock, current_stock, stock_status, is_featured, is_visible, is_organic) VALUES ('p-002', 'LIF-002', 'Karunguruvai Rice', 'Karunguruvai Arisi', 'karunguruvai-rice', 'cat-1', 'sup-1', 'Karunguruvai rice is a heritage variety celebrated for its nutty aroma and health benefits.', 'Rare black-husk heritage rice with a distinctive nutty flavour.', '1kg', 'kg', '/products/karunguruvai-rice.svg', 100, 135, 200, 150, NULL, 5, 10, 80, 58, 'IN_STOCK', FALSE, TRUE, TRUE) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.products (id, sku, name, tamil_name, slug, category_id, supplier_id, description, short_description, pack_size, unit, image_url, purchase_price, landed_cost, mrp, selling_price, offer_price, tax_percent, reorder_level, opening_stock, current_stock, stock_status, is_featured, is_visible, is_organic) VALUES ('p-004', 'LIF-004', 'Seeraga Samba Rice', 'Seeraga Samba Arisi', 'seeraga-samba-rice', 'cat-1', 'sup-1', 'Seeraga Samba rice is prized for its fragrance and perfect texture in biryani.', 'The king of biryani rice — small-grain, aromatic, and premium.', '1kg', 'kg', '/products/seeraga-samba-rice.svg', 140, 145, 200, 185, 175, 5, 20, 120, 84, 'IN_STOCK', TRUE, TRUE, TRUE) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.products (id, sku, name, tamil_name, slug, category_id, supplier_id, description, short_description, pack_size, unit, image_url, purchase_price, landed_cost, mrp, selling_price, offer_price, tax_percent, reorder_level, opening_stock, current_stock, stock_status, is_featured, is_visible, is_organic) VALUES ('p-006', 'LIF-006', 'Foxtail Millet', 'Thinai', 'foxtail-millet', 'cat-2', 'sup-5', 'Foxtail millet is a high‑fiber grain excellent for wholesome meals.', 'Ancient millet rich in iron and fibre for daily nutrition.', '500g', 'g', '/products/foxtail-millet.svg', 45, 48, 75, 65, 60, 5, 30, 200, 165, 'IN_STOCK', TRUE, TRUE, TRUE) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.products (id, sku, name, tamil_name, slug, category_id, supplier_id, description, short_description, pack_size, unit, image_url, purchase_price, landed_cost, mrp, selling_price, offer_price, tax_percent, reorder_level, opening_stock, current_stock, stock_status, is_featured, is_visible, is_organic) VALUES ('p-016', 'LIF-016', 'Cold-Pressed Groundnut Oil', 'Chekku Kadalai Ennai', 'cold-pressed-groundnut-oil', 'cat-4', 'sup-3', 'Groundnut oil cold‑pressed preserves nutrients and taste.', 'Traditional wooden cold-pressed peanut oil with pure nutty flavour.', '1L', 'L', '/products/cold-pressed-groundnut-oil.svg', 220, 230, 320, 285, 270, 5, 15, 100, 59, 'IN_STOCK', TRUE, TRUE, TRUE) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.products (id, sku, name, tamil_name, slug, category_id, supplier_id, description, short_description, pack_size, unit, image_url, purchase_price, landed_cost, mrp, selling_price, offer_price, tax_percent, reorder_level, opening_stock, current_stock, stock_status, is_featured, is_visible, is_organic) VALUES ('p-017', 'LIF-017', 'Cold-Pressed Sesame Oil', 'Chekku Nallennai', 'cold-pressed-sesame-oil', 'cat-4', 'sup-3', 'Sesame oil cold‑pressed retains antioxidants and aroma.', 'Pure cold-pressed gingelly oil for cooking and wellness.', '500ml', 'ml', '/products/cold-pressed-sesame-oil.svg', 180, 190, 265, 240, NULL, 5, 10, 60, 42, 'IN_STOCK', TRUE, TRUE, TRUE) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.products (id, sku, name, tamil_name, slug, category_id, supplier_id, description, short_description, pack_size, unit, image_url, purchase_price, landed_cost, mrp, selling_price, offer_price, tax_percent, reorder_level, opening_stock, current_stock, stock_status, is_featured, is_visible, is_organic) VALUES ('p-019', 'LIF-019', 'Palm Jaggery', 'Karupatti', 'palm-jaggery', 'cat-5', 'sup-4', 'Palm jaggery is a traditional sweetener rich in minerals.', 'Natural unrefined palm jaggery — a healthier alternative to sugar.', '500g', 'g', '/products/palm-jaggery.svg', 95, 100, 145, 130, 120, 5, 20, 150, 112, 'IN_STOCK', TRUE, TRUE, TRUE) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.products (id, sku, name, tamil_name, slug, category_id, supplier_id, description, short_description, pack_size, unit, image_url, purchase_price, landed_cost, mrp, selling_price, offer_price, tax_percent, reorder_level, opening_stock, current_stock, stock_status, is_featured, is_visible, is_organic) VALUES ('p-020', 'LIF-020', 'Organic Turmeric Powder', 'உயிர் மஞ்சள் தூள்', 'organic-turmeric-powder', 'cat-7', 'sup-2', 'Pure organic turmeric powder sourced from certified farms, high curcumin content.', 'Finely ground organic turmeric for health and cooking.', '250g', 'g', '/products/organic-turmeric-powder.svg', 60, 65, 120, 100, NULL, 5, 15, 100, 79, 'IN_STOCK', FALSE, TRUE, TRUE) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.products (id, sku, name, tamil_name, slug, category_id, supplier_id, description, short_description, pack_size, unit, image_url, purchase_price, landed_cost, mrp, selling_price, offer_price, tax_percent, reorder_level, opening_stock, current_stock, stock_status, is_featured, is_visible, is_organic) VALUES ('p-021', 'LIF-021', 'Organic Brown Rice', 'ஒழுங்கான பழுப்பு அரிசி', 'organic-brown-rice', 'cat-1', 'sup-2', 'Organic brown rice is cultivated without chemicals and retains natural bran.', 'Whole grain organic brown rice, high in fiber and nutrients.', '1kg', 'kg', '/products/organic-brown-rice.svg', 150, 155, 210, 190, NULL, 5, 12, 80, 49, 'IN_STOCK', FALSE, TRUE, TRUE) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.products (id, sku, name, tamil_name, slug, category_id, supplier_id, description, short_description, pack_size, unit, image_url, purchase_price, landed_cost, mrp, selling_price, offer_price, tax_percent, reorder_level, opening_stock, current_stock, stock_status, is_featured, is_visible, is_organic) VALUES ('p-022', 'LIF-022', 'Millet Dosa Mix', 'சோறு தோசை கலவை', 'millet-dosa-mix', 'cat-2', 'sup-5', 'Blend of millets and spices produces a nutritious dosa batter.', 'Ready‑to‑cook millet flour mix for crisp, healthy dosas.', '500g', 'g', '/products/millet-dosa-mix.svg', 60, 65, 100, 90, NULL, 5, 15, 100, 80, 'IN_STOCK', FALSE, TRUE, TRUE) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.users (id, email, full_name, phone, role, password, designation, department, is_active) VALUES ('usr-001', 'superadmin@mrvivasayi.in', 'Owner', '9876543210', 'SUPER_ADMIN', 'sha256:8b2ab5e27d05ef1e1cbff546d57d8ed9e8de479941332508c7ddd5fb0c8f9a6a', 'General Manager / Owner', 'Executive Management', TRUE) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.users (id, email, full_name, phone, role, password, designation, department, is_active) VALUES ('usr-002', 'admin@mrvivasayi.in', 'Admin User', '9876543211', 'ADMIN', 'sha256:8b2ab5e27d05ef1e1cbff546d57d8ed9e8de479941332508c7ddd5fb0c8f9a6a', 'Operations Lead', 'Store Operations', TRUE) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.users (id, email, full_name, phone, role, password, designation, department, is_active) VALUES ('usr-003', 'staff@mrvivasayi.in', 'Staff Member', '9876543212', 'STAFF', 'sha256:8b2ab5e27d05ef1e1cbff546d57d8ed9e8de479941332508c7ddd5fb0c8f9a6a', 'Store Assistant', 'Fulfillment', TRUE) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.users (id, email, full_name, phone, role, password, designation, department, is_active) VALUES ('usr-004', 'inventory@mrvivasayi.in', 'Inventory Manager', '9876543213', 'INVENTORY_MANAGER', 'sha256:8b2ab5e27d05ef1e1cbff546d57d8ed9e8de479941332508c7ddd5fb0c8f9a6a', 'Inventory Controller', 'Supply Chain & Procurement', TRUE) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.users (id, email, full_name, phone, role, password, designation, department, is_active) VALUES ('usr-005', 'sales@mrvivasayi.in', 'Sales Staff', '9876543214', 'SALES_STAFF', 'sha256:8b2ab5e27d05ef1e1cbff546d57d8ed9e8de479941332508c7ddd5fb0c8f9a6a', 'POS Cashier', 'Retail Sales', TRUE) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.users (id, email, full_name, phone, role, password, designation, department, is_active) VALUES ('usr-006', 'delivery@mrvivasayi.in', 'Delivery Staff', '9876543215', 'DELIVERY_STAFF', 'sha256:8b2ab5e27d05ef1e1cbff546d57d8ed9e8de479941332508c7ddd5fb0c8f9a6a', 'Dispatch Agent', 'Logistics', TRUE) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.users (id, email, full_name, phone, role, password, designation, department, is_active) VALUES ('usr-007', 'viewer@mrvivasayi.in', 'Viewer User', '9876543216', 'VIEWER', 'sha256:8b2ab5e27d05ef1e1cbff546d57d8ed9e8de479941332508c7ddd5fb0c8f9a6a', 'External Auditor', 'Audit & Compliance', TRUE) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.coupons (id, code, description, discount_type, discount_value, min_order_amount, is_active) VALUES ('coupon-1', 'WELCOME10', '10% off on your first order', 'PERCENTAGE', 10, 0, TRUE) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.coupons (id, code, description, discount_type, discount_value, min_order_amount, is_active) VALUES ('coupon-2', 'FLAT50', 'Flat Rs. 50 off on orders above Rs. 1000', 'FIXED', 50, 0, TRUE) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.expenses (id, expense_date, category_name, description, payment_method, amount, vendor_name) VALUES ('exp-101', '2026-10-01', 'Store Rent & Utilities', 'Monthly retail shop rent for Madurai Main Branch', 'BANK', 18500, NULL) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.expenses (id, expense_date, category_name, description, payment_method, amount, vendor_name) VALUES ('exp-102', '2026-10-03', 'Packaging & Eco-Bags', 'Biodegradable jute bags & unbleached paper boxes', 'UPI', 4200, NULL) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.expenses (id, expense_date, category_name, description, payment_method, amount, vendor_name) VALUES ('exp-103', '2026-10-05', 'Farm Freight & Logistics', 'Transport & cold-chain freight from organic farm cluster', 'CASH', 6800, NULL) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.expenses (id, expense_date, category_name, description, payment_method, amount, vendor_name) VALUES ('exp-104', '2026-10-08', 'Platform & WhatsApp API', 'WhatsApp Business Cloud API messaging credits', 'CARD', 1499, NULL) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.expenses (id, expense_date, category_name, description, payment_method, amount, vendor_name) VALUES ('exp-105', '2026-10-10', 'Store Electricity', 'Electricity & cold-storage power bill (TANGEDCO)', 'UPI', 3450, NULL) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.message_templates (id, template_number, title, category, channel, body_text, is_active) VALUES ('tpl-1', 1, 'Payment Request & COD QR Verification', 'PAYMENT', 'WHATSAPP', 'Dear {{customer_name}}, please scan our UPI QR code to complete payment for Order #{{order_id}}.', TRUE) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.message_templates (id, template_number, title, category, channel, body_text, is_active) VALUES ('tpl-2', 2, 'Payment Confirmation / Thank You', 'PAYMENT', 'WHATSAPP', 'Dear {{customer_name}}, payment received successfully for Order #{{order_id}}. Thank you for choosing Mr. Vivasayi!', TRUE) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.message_templates (id, template_number, title, category, channel, body_text, is_active) VALUES ('tpl-3', 3, 'Payment Successful', 'PAYMENT', 'WHATSAPP', 'Your payment of Rs {{amount}} for Order #{{order_id}} is verified and confirmed.', TRUE) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.message_templates (id, template_number, title, category, channel, body_text, is_active) VALUES ('tpl-4', 4, 'Order Confirmation & Delivery Details', 'GENERAL', 'WHATSAPP', 'Namaste {{customer_name}}! Order #{{order_id}} is confirmed and scheduled for dispatch tomorrow.', TRUE) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.message_templates (id, template_number, title, category, channel, body_text, is_active) VALUES ('tpl-5', 5, 'Restock Alert', 'GENERAL', 'WHATSAPP', 'Fresh harvest alert! Mapillai Samba Rice & Wood Cold-Pressed Oils are now back in stock.', TRUE) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.default_data (id, module, payload) VALUES ('def-cms-settings', 'cms_settings', '[{"hero":{"headline":"Pure. Traditional. Straight from the Farm.","subheadline":"Experience authentic South Indian flavours — cold-pressed oils, heritage rice, artisan spices and more. Grown with love, delivered to your door.","cta_text":"Shop Now","cta_link":"/products","bg_image_url":"https://images.unsplash.com/photo-1586201375761-83865001e31c?auto=format&fit=crop&w=800&q=80","bg_image_animation":"float","is_published":true,"guarantee_badges":["100% Unprocessed","Farmer Sourced","Zero Preservatives"],"floating_pill_text":"Lab Tested & Certified Pure"},"announcement":{"items":[{"id":"ann_1","text":"🌿 Free delivery on orders above ₹499 — Limited time offer!","link":"/products","is_active":true},{"id":"ann_2","text":"🌾 Fresh Harvest Alert: Mapillai Samba & Seeraga Samba Rice In Stock!","link":"/products","is_active":true},{"id":"ann_3","text":"🚜 100% Wood Cold-Pressed Chekku Oils — Direct From Local Farmers","link":"/about","is_active":true}],"text":"🌿 Free delivery on orders above ₹499 — Limited time offer!","link":"/products","bg_color":"#065f46","text_color":"#ffffff","position_align":"center","animation_type":"scroll_right_to_left","is_active":true,"approved":true},"badges":[{"id":"b_1","text":"100% Certified Organic"},{"id":"b_2","text":"Direct from Smallholders"},{"id":"b_3","text":"Traditional Wood Pressed"},{"id":"b_4","text":"Zero Chemical Processing"}],"headerFooter":{"top_bar_enabled":true,"announcement_text":"🌿 Free Delivery on orders above ₹499 | Farm Fresh Organic Direct To You","announcement_link":"/products","announcement_bg_color":"#065f46","nav_custom_link_text":"Special Offers","nav_custom_link_url":"/products?featured=true","footer_brand_tagline":"Preserving traditional South Indian agriculture, heirloom grains, and pure unrefined cold-pressed oils.","footer_phone":"+91 98765 43210","footer_email":"hello@vivasayi.com","footer_address":"12 Farm Gate Road, Thanjavur, Tamil Nadu 613001","footer_hours":"Mon – Sat: 8:00 AM – 8:00 PM","show_farmer_badge":true,"show_zero_chemical_badge":true,"copyright_text":"© 2026 MR. VIVASAYI. Handcrafted for healthier lives."},"about":{"brand_story":"Founded with a deep reverence for ancestral farming wisdom, we work directly with verified agrarian communities across Tamil Nadu. We bypass industrial intermediaries to ensure fair prices for farmers and untouched, pure, chemical-free food for your home.","stats":[{"id":"stat_1","label":"Farmer Families Supported","value":"150+"},{"id":"stat_2","label":"Native Crop Varieties","value":"45+"},{"id":"stat_3","label":"Acres Cultivated Chem-Free","value":"1,200+"},{"id":"stat_4","label":"Happy Conscious Homes","value":"18,000+"}],"core_values":[{"id":"val_1","title":"Farmer Dignity & Direct Fair Trade","description":"Every rupee goes straight to the hands that till the soil, creating sustainable regional farming ecosystems."},{"id":"val_2","title":"Zero Additives or Chemical Adulteration","description":"Completely unbleached, unrefined, and cold-extracted using traditional granite and wood presses."},{"id":"val_3","title":"Preserving Native Heirloom Seeds","description":"Reviving nutrition-dense indigenous grains like Mapillai Samba, Karuppu Kavuni, and Poongar."}]},"seo":{"Home":{"page":"Home","title":"MR. VIVASAYI – Pure Cold-Pressed Oils & Traditional Heirloom Grains","description":"Authentic South Indian natural farm products: wood cold-pressed oils, organic millets, traditional rice varieties delivered directly from local farmers.","keywords":"cold pressed oil, traditional rice, organic farm store, vivasayi, wooden chekku, millets","og_image":"https://images.unsplash.com/photo-1586201375761-83865001e31c?auto=format&fit=crop&w=1200&q=80"},"Products":{"page":"Products","title":"Shop Natural Grains, Cold-Pressed Oils & Spices | MR. VIVASAYI","description":"Explore farm-fresh organic food: cold pressed sesame oil, groundnut oil, coconut oil, traditional rice, and herbal health mixes.","keywords":"buy organic oil, wood pressed oil online, raw spices, authentic grocery","og_image":"https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=1200&q=80"},"About":{"page":"About","title":"Our Story & Farm Heritage | MR. VIVASAYI","description":"Learn how we partner with smallholder organic farmers across South India to bring chemical-free heirloom foods to your family kitchen.","keywords":"about vivasayi, organic farmers, natural farming story, farm to table","og_image":"https://images.unsplash.com/photo-1500937386664-56d1dfef3854?auto=format&fit=crop&w=1200&q=80"},"Contact":{"page":"Contact","title":"Contact MR. VIVASAYI – WhatsApp Order & Store Location","description":"Get in touch with us for bulk orders, farmer inquiries, store visits, and fast WhatsApp customer support.","keywords":"vivasayi store contact, farm order phone, whatsapp customer support","og_image":"https://images.unsplash.com/photo-1596524430615-b46475ddff6e?auto=format&fit=crop&w=1200&q=80"}},"contact":{"store_name":"MR. VIVASAYI Organic Store","address":"12 Farm Gate Road, Thanjavur, Tamil Nadu 613001, India","phone_primary":"+91 98765 43210","phone_secondary":"+91 94444 12345","email_primary":"orders@vivasayi.com","email_secondary":"support@vivasayi.com","operating_hours_weekdays":"8:00 AM – 8:00 PM (Mon – Sat)","operating_hours_sunday":"9:00 AM – 2:00 PM (Sunday)","whatsapp_number":"919876543210"}}]') ON CONFLICT (module) DO NOTHING;
INSERT INTO public.default_data (id, module, payload) VALUES ('def-settings', 'settings', '[{"dataSource":"local","apiBaseUrl":"https://mrvivasayi.in","featureToggles":{"pushNotifications":true,"mobileLoadingAnimation":true,"cms":true,"offlineMode":true,"analytics":false,"whatsappChat":true},"theme":"dark","version":"1.0.0","maintenanceMode":false,"allowedRoles":["SUPER_ADMIN","ADMIN","INVENTORY_MANAGER","SALES_STAFF","DELIVERY_STAFF","VIEWER"],"product_rules":{"enableBulkDiscounts":true,"maxPurchaseLimitPerUser":"50 kg","lowStockAlertThreshold":"10 kg","autoHideOutOfStock":false,"allowPreOrders":true,"enableOrganicCertificationBadge":true},"delivery_rules":{"freeDeliveryThreshold":"500","standardDeliveryCharge":"40","expressDeliveryCharge":"100","maxDeliveryDistanceKm":"25"}}]') ON CONFLICT (module) DO NOTHING;
INSERT INTO public.default_data (id, module, payload) VALUES ('def-navigation', 'navigation', '[{"id":"dashboard","title":"Main Dashboard","icon":"LayoutDashboard","submenus":[{"path":"/admin","label":"Main Dashboard","minRole":"VIEWER","module":"dashboard"}]},{"id":"sales","title":"Sales & Orders","icon":"ShoppingCart","groupBadge":"10 New","groupBadgeColor":"bg-emerald-100 text-emerald-800 border-emerald-200","submenus":[{"path":"/admin/orders","label":"Orders Hub (WhatsApp & POS)","badge":"10 New","badgeColor":"bg-emerald-100 text-emerald-800","minRole":"STAFF","module":"orders"},{"path":"/admin/pos","label":"Counter POS Billing","badge":"POS","badgeColor":"bg-blue-100 text-blue-800","minRole":"SALES_STAFF","module":"pos"},{"path":"/admin/pos-billing-details","label":"POS Billing & Sales Details","badge":"Bills","badgeColor":"bg-amber-100 text-amber-800","minRole":"SALES_STAFF","module":"pos"},{"path":"/admin/whatsapp-hub","label":"WhatsApp Order Inbox","badge":"3 Unread","badgeColor":"bg-amber-100 text-amber-800","minRole":"STAFF","module":"whatsapp_hub"}]},{"id":"coupons","title":"Discount Coupons","icon":"Ticket","submenus":[{"path":"/admin/coupons","label":"Coupons Management","minRole":"ADMIN","module":"promotions"}]},{"id":"catalog","title":"Catalog & Inventory","icon":"Boxes","groupBadge":"3 Low","groupBadgeColor":"bg-amber-100 text-amber-800 border-amber-200","submenus":[{"path":"/admin/products","label":"Product Catalog & Prices","minRole":"INVENTORY_MANAGER","module":"products"},{"path":"/admin/inventory","label":"Stock & Inventory Audit","badge":"3 Low","badgeColor":"bg-amber-100 text-amber-800","minRole":"INVENTORY_MANAGER","module":"inventory"},{"path":"/admin/suppliers","label":"Suppliers & Purchases","minRole":"INVENTORY_MANAGER","module":"suppliers"}]},{"id":"crm","title":"Customer CRM & Marketing","icon":"Users","groupBadge":"CRM","groupBadgeColor":"bg-emerald-100 text-emerald-800 border-emerald-200","submenus":[{"path":"/admin/customers","label":"All Customers","badge":"10","badgeColor":"bg-gray-100 text-gray-700","minRole":"STAFF","module":"customers"},{"path":"/admin/customers/pos","label":"Offline Store POS","badge":"POS","badgeColor":"bg-purple-100 text-purple-800","minRole":"STAFF","module":"customers"},{"path":"/admin/customers/website","label":"Website E-Commerce","badge":"Web","badgeColor":"bg-blue-100 text-blue-800","minRole":"STAFF","module":"customers"},{"path":"/admin/customers/whatsapp","label":"WhatsApp Inbox","badge":"WA","badgeColor":"bg-emerald-100 text-emerald-800","minRole":"STAFF","module":"customers"},{"path":"/admin/customers/na","label":"N/A Direct","badge":"N/A","badgeColor":"bg-slate-100 text-slate-700","minRole":"STAFF","module":"customers"},{"path":"/admin/customers/returns","label":"Order Delivery Returns","badge":"Returns","badgeColor":"bg-rose-100 text-rose-800","minRole":"STAFF","module":"customers"},{"path":"/admin/promotions","label":"WhatsApp Campaigns","badge":"Active","badgeColor":"bg-emerald-100 text-emerald-800","minRole":"ADMIN","module":"promotions"},{"path":"/admin/reviews","label":"Customer Reviews (4 Box)","badge":"4 Box","badgeColor":"bg-amber-100 text-amber-900","minRole":"STAFF","module":"cms"}]},{"id":"message_templates","title":"Message Templates Menu","icon":"MessageSquare","groupBadge":"20 Tpls","groupBadgeColor":"bg-amber-100 text-amber-900 border-amber-200","submenus":[{"path":"/admin/templates/whatsapp","label":"Submenu: WhatsApp (20 Tpls)","badge":"20 WA","badgeColor":"bg-emerald-100 text-emerald-800","minRole":"STAFF","module":"promotions"},{"path":"/admin/templates/email","label":"Submenu: Email","badge":"Email","badgeColor":"bg-blue-100 text-blue-800","minRole":"STAFF","module":"promotions"}]},{"id":"staff_section","title":"Staff Section","icon":"UserCheck","groupBadge":"7 Staff","groupBadgeColor":"bg-purple-100 text-purple-800 border-purple-200","submenus":[{"path":"/admin/staff","label":"All Staff","badge":"7 Staff","badgeColor":"bg-purple-100 text-purple-800","minRole":"ADMIN","module":"user_roles"},{"path":"/admin/staff/create","label":"Create Staff","badge":"New","badgeColor":"bg-emerald-100 text-emerald-800","minRole":"ADMIN","module":"user_roles"},{"path":"/admin/staff/permissions","label":"Change Permission","badge":"Matrix","badgeColor":"bg-blue-100 text-blue-800","minRole":"SUPER_ADMIN","module":"user_roles"},{"path":"/admin/staff/roles","label":"Role Management","badge":"7 Roles","badgeColor":"bg-teal-100 text-teal-800","minRole":"SUPER_ADMIN","module":"user_roles"}]},{"id":"cms","title":"Website Content (CMS)","icon":"Globe","groupBadge":"CMS","groupBadgeColor":"bg-teal-100 text-teal-800 border-teal-200","submenus":[{"path":"/admin/cms/website-analyzer","label":"Website Analyzer (Live Stats)","badge":"1st • Analytics","badgeColor":"bg-indigo-100 text-indigo-900 font-bold","minRole":"ADMIN","module":"cms"},{"path":"/admin/cms","label":"Hero Banner & Story","badge":"Live","badgeColor":"bg-emerald-100 text-emerald-800","minRole":"ADMIN","module":"cms"},{"path":"/admin/cms/pop-notification","label":"Pop Notification (Mobile/Desktop)","badge":"4 Box • Live","badgeColor":"bg-pink-100 text-pink-900 font-bold","minRole":"ADMIN","module":"cms"},{"path":"/admin/cms/announcements","label":"Announcement Bar","minRole":"ADMIN","module":"cms"},{"path":"/admin/cms/header-footer","label":"Header & Footer CMS","badge":"Header/Footer","badgeColor":"bg-amber-100 text-amber-900","minRole":"ADMIN","module":"cms"},{"path":"/admin/cms/about","label":"About Page Content","minRole":"ADMIN","module":"cms"},{"path":"/admin/cms/seo","label":"SEO Meta Settings","minRole":"ADMIN","module":"cms"},{"path":"/admin/cms/contact","label":"Contact & Store Info","minRole":"ADMIN","module":"cms"}]},{"id":"audit_logs","title":"System Audit Trail","icon":"Shield","groupBadge":"Audit Trail","groupBadgeColor":"bg-rose-100 text-rose-800 border-rose-200","submenus":[{"path":"/admin/audit","label":"📋 All System Trail Logs","badge":"Logs","badgeColor":"bg-rose-100 text-rose-800","minRole":"SUPER_ADMIN","module":"audit_logs"},{"path":"/admin/audit/catalog","label":"📦 Catalog & Inventory Logs","badge":"Catalog","badgeColor":"bg-emerald-100 text-emerald-800","minRole":"SUPER_ADMIN","module":"audit_logs"},{"path":"/admin/audit/sales","label":"🛍️ Sales & POS Order Logs","badge":"Sales","badgeColor":"bg-blue-100 text-blue-800","minRole":"SUPER_ADMIN","module":"audit_logs"},{"path":"/admin/audit/security","label":"🔑 Auth & Security Event Logs","badge":"Security","badgeColor":"bg-purple-100 text-purple-800","minRole":"SUPER_ADMIN","module":"audit_logs"},{"path":"/admin/audit/activity","label":"👤 User Activity Logs","badge":"User Activity","badgeColor":"bg-amber-100 text-amber-800","minRole":"SUPER_ADMIN","module":"audit_logs"}]},{"id":"analytics","title":"Analytics & Reports","icon":"BarChart3","submenus":[{"path":"/admin/reports","label":"Sales & Financial Reports","minRole":"ADMIN","module":"reports"}]},{"id":"settings","title":"System Settings","icon":"Settings","groupBadge":"Settings","groupBadgeColor":"bg-emerald-100 text-emerald-900 border-emerald-200","submenus":[{"path":"/admin/settings","label":"Settings Hub","badge":"All","badgeColor":"bg-emerald-100 text-emerald-900","minRole":"SUPER_ADMIN","module":"audit_logs"},{"path":"/admin/settings/db-performance","label":"DB Performance (6 Box • 8 Chart)","badge":"6 Box • 8 Chart","badgeColor":"bg-cyan-100 text-cyan-900 font-bold","minRole":"SUPER_ADMIN","module":"audit_logs"},{"path":"/admin/settings/delivery-rules","label":"Location & Weight Delivery Charges","badge":"Rules","badgeColor":"bg-amber-100 text-amber-950 font-black","minRole":"SUPER_ADMIN","module":"audit_logs"},{"path":"/admin/settings/product-rules","label":"Product Catalog Settings","badge":"Catalog","badgeColor":"bg-blue-100 text-blue-900","minRole":"SUPER_ADMIN","module":"audit_logs"},{"path":"/admin/settings/email","label":"Email SMTP Credentials","badge":"SMTP","badgeColor":"bg-purple-100 text-purple-900","minRole":"SUPER_ADMIN","module":"audit_logs"},{"path":"/admin/settings/whatsapp","label":"WhatsApp API Credentials","badge":"WA Cloud","badgeColor":"bg-emerald-100 text-emerald-900","minRole":"SUPER_ADMIN","module":"audit_logs"},{"path":"/admin/settings/upi","label":"Payment UPI & QR Code","badge":"UPI QR","badgeColor":"bg-amber-100 text-amber-950 font-bold","minRole":"SUPER_ADMIN","module":"audit_logs"},{"path":"/admin/settings/env","label":"Environment & Supabase","badge":"Backend","badgeColor":"bg-slate-100 text-slate-800","minRole":"SUPER_ADMIN","module":"audit_logs"},{"path":"/admin/settings/maintenance","label":"Maintenance Mode Control","badge":"On/Off","badgeColor":"bg-rose-100 text-rose-900 font-bold","minRole":"SUPER_ADMIN","module":"audit_logs"},{"path":"/admin/settings/backup","label":"Database Backup & Dump","badge":"Dump","badgeColor":"bg-indigo-100 text-indigo-900","minRole":"SUPER_ADMIN","module":"audit_logs"}]}]') ON CONFLICT (module) DO NOTHING;

-- ============================================================
-- SAFE MIGRATIONS & COMPLIANCE INDEXES
-- ============================================================
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS customer_id TEXT;
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS country_code TEXT DEFAULT 'IN';
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS calling_code TEXT DEFAULT '+91';

ALTER TABLE public.users ADD COLUMN IF NOT EXISTS user_group TEXT DEFAULT 'Store Operations';
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS custom_permissions JSONB DEFAULT '{}'::jsonb;

ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS country_code TEXT DEFAULT 'IN';
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS calling_code TEXT DEFAULT '+91';
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS whatsapp_message_status TEXT DEFAULT 'PENDING';

CREATE INDEX IF NOT EXISTS idx_customers_customer_id ON public.customers(customer_id);
CREATE INDEX IF NOT EXISTS idx_customers_phone ON public.customers(phone);
CREATE INDEX IF NOT EXISTS idx_customers_country_code ON public.customers(country_code);
CREATE INDEX IF NOT EXISTS idx_orders_customer_id ON public.orders(customer_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON public.orders(status);

-- ============================================================
-- 16. SAMPLE BILLING ORDERS (Test Bills & Simulated Invoices)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.sample_billing_orders (
  id TEXT PRIMARY KEY,
  order_number TEXT UNIQUE NOT NULL,
  sample_code TEXT,
  source TEXT NOT NULL DEFAULT 'SAMPLE_BILLING',
  customer_id TEXT,
  customer_name_snapshot TEXT,
  customer_phone_snapshot TEXT,
  status TEXT DEFAULT 'COMPLETED',
  subtotal NUMERIC(12,2) DEFAULT 0,
  discount NUMERIC(12,2) DEFAULT 0,
  delivery_fee NUMERIC(10,2) DEFAULT 0,
  tax_amount NUMERIC(10,2) DEFAULT 0,
  total NUMERIC(12,2) DEFAULT 0,
  payment_method TEXT DEFAULT 'CASH',
  payment_status TEXT DEFAULT 'PAID',
  items JSONB DEFAULT '[]'::jsonb,
  is_sample BOOLEAN DEFAULT true,
  converted_to_live BOOLEAN DEFAULT false,
  converted_at TIMESTAMPTZ,
  converted_order_id TEXT,
  show_watermark BOOLEAN DEFAULT true,
  total_mrp NUMERIC(12,2) DEFAULT 0,
  mrp_savings NUMERIC(12,2) DEFAULT 0,
  extra_discount_mode TEXT,
  extra_discount_value NUMERIC(10,2),
  extra_discount_amount NUMERIC(10,2),
  gst_percent NUMERIC(5,2) DEFAULT 5.0,
  notes TEXT,
  created_by TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.sample_billing_orders ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public Full Access sample_billing_orders" ON public.sample_billing_orders;
CREATE POLICY "Public Full Access sample_billing_orders" ON public.sample_billing_orders FOR ALL USING (true) WITH CHECK (true);
CREATE INDEX IF NOT EXISTS idx_sample_billing_code ON public.sample_billing_orders(sample_code);
CREATE INDEX IF NOT EXISTS idx_sample_billing_cust ON public.sample_billing_orders(customer_id);

-- ============================================================
-- 17. WEBSITE ANALYZE (Real-Time Audience & Traffic Telemetry)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.website_analyze (
  id TEXT PRIMARY KEY,
  session_id TEXT,
  path TEXT NOT NULL,
  page_title TEXT,
  referrer TEXT,
  device_type TEXT,
  browser TEXT,
  os TEXT,
  ip_hash TEXT,
  city TEXT,
  country TEXT,
  duration_seconds INT DEFAULT 0,
  is_unique BOOLEAN DEFAULT false,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.website_analyze ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public Full Access website_analyze" ON public.website_analyze FOR ALL USING (true) WITH CHECK (true);
CREATE INDEX IF NOT EXISTS idx_website_analyze_path ON public.website_analyze(path);
CREATE INDEX IF NOT EXISTS idx_website_analyze_created ON public.website_analyze(created_at);

-- ============================================================
-- 18. POP NOTIFICATION EVENTS (Impressions, Allows, Dismissals)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.pop_notification_events (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL,
  device TEXT,
  browser TEXT,
  path TEXT,
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  event_title TEXT,
  event_message TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.pop_notification_events ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public Full Access pop_notification_events" ON public.pop_notification_events FOR ALL USING (true) WITH CHECK (true);
CREATE INDEX IF NOT EXISTS idx_pop_events_type ON public.pop_notification_events(type);
CREATE INDEX IF NOT EXISTS idx_pop_events_created ON public.pop_notification_events(created_at);

-- ============================================================
-- 19. POP NOTIFICATION SUBSCRIBERS (Opted-in Push Subscribers)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.pop_notification_subscribers (
  id TEXT PRIMARY KEY,
  subscription_token TEXT,
  customer_id TEXT,
  device TEXT,
  browser TEXT,
  subscribed_at TIMESTAMPTZ DEFAULT NOW(),
  status TEXT DEFAULT 'ACTIVE',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.pop_notification_subscribers ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public Full Access pop_notification_subscribers" ON public.pop_notification_subscribers FOR ALL USING (true) WITH CHECK (true);
CREATE INDEX IF NOT EXISTS idx_pop_subscribers_status ON public.pop_notification_subscribers(status);

-- ============================================================
-- 20. PRICE HISTORY (Product Price Audit Trail)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.price_history (
  id TEXT PRIMARY KEY,
  product_id TEXT NOT NULL,
  sku TEXT NOT NULL,
  name TEXT NOT NULL,
  old_selling_price NUMERIC(10,2),
  new_selling_price NUMERIC(10,2) NOT NULL,
  old_offer_price NUMERIC(10,2),
  new_offer_price NUMERIC(10,2),
  mrp NUMERIC(10,2) NOT NULL,
  purchase_price NUMERIC(10,2) NOT NULL,
  landed_cost NUMERIC(10,2),
  changed_by TEXT NOT NULL,
  reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.price_history ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public Full Access price_history" ON public.price_history FOR ALL USING (true) WITH CHECK (true);
CREATE INDEX IF NOT EXISTS idx_price_history_prod ON public.price_history(product_id);
CREATE INDEX IF NOT EXISTS idx_price_history_created ON public.price_history(created_at);


