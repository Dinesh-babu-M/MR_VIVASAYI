-- ============================================================================
-- MR. VIVASAYI - MISSING SUPABASE DATABASE TABLES CREATION SCRIPT
-- Run this script in your Supabase SQL Editor:
-- https://supabase.com/dashboard/project/tzomdxdrzanzsobstfrg/sql/new
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ----------------------------------------------------------------------------
-- 1. ROLES & PERMISSIONS TABLE
-- ----------------------------------------------------------------------------
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

ALTER TABLE public.roles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public Full Access roles" ON public.roles;
CREATE POLICY "Public Full Access roles" ON public.roles FOR ALL USING (true) WITH CHECK (true);
CREATE INDEX IF NOT EXISTS idx_roles_role ON public.roles(role);

-- Seed System Default Roles
INSERT INTO public.roles (id, role, title, level, description, badge_color, is_custom, department, permissions) VALUES
('role-super-admin', 'SUPER_ADMIN', 'Super Admin / Owner', 1, 'Full unconstrained platform owner access across all stores, finances and audit logs.', 'bg-emerald-100 text-emerald-800 border-emerald-300', false, 'Executive Management', '{"all": true}'::jsonb),
('role-admin', 'ADMIN', 'Store Administrator', 2, 'Manages operations, inventory, customers, message campaigns and store settings.', 'bg-blue-100 text-blue-800 border-blue-300', false, 'Store Operations', '{"catalog": true, "sales": true, "customers": true, "cms": true, "inventory": true}'::jsonb),
('role-inventory', 'INVENTORY_MANAGER', 'Inventory Manager', 3, 'Controls catalog, procurement, suppliers, stock counts and warehouse restocks.', 'bg-amber-100 text-amber-800 border-amber-300', false, 'Supply Chain & Procurement', '{"catalog": true, "inventory": true, "suppliers": true}'::jsonb),
('role-sales', 'SALES_STAFF', 'POS & Sales Staff', 4, 'Conducts retail billing, counter invoices, customer lookups and sales ledger.', 'bg-purple-100 text-purple-800 border-purple-300', false, 'Retail Sales', '{"sales": true, "pos": true, "customers": true}'::jsonb),
('role-delivery', 'DELIVERY_STAFF', 'Delivery & Dispatch', 5, 'Manages order dispatch, delivery status updates and customer WhatsApp alerts.', 'bg-teal-100 text-teal-800 border-teal-300', false, 'Logistics & Dispatch', '{"orders": true, "dispatch": true}'::jsonb),
('role-viewer', 'VIEWER', 'Auditor & Viewer', 6, 'Read-only access for financial review, external auditors and reports inspection.', 'bg-gray-100 text-gray-800 border-gray-300', false, 'Audit & Compliance', '{"view_only": true}'::jsonb),
('role-staff', 'STAFF', 'General Staff Member', 7, 'Operational store team member handling orders and customer requests.', 'bg-slate-100 text-slate-800 border-slate-300', false, 'Store Operations', '{"orders": true, "customers": true}'::jsonb)
ON CONFLICT (id) DO NOTHING;


-- ----------------------------------------------------------------------------
-- 2. SAMPLE BILLING ORDERS TABLE (Test POS Bills & Simulation Invoices)
-- ----------------------------------------------------------------------------
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
CREATE INDEX IF NOT EXISTS idx_sample_billing_created ON public.sample_billing_orders(created_at);

-- Seed Initial Sample Billing Order
INSERT INTO public.sample_billing_orders (
  id, order_number, sample_code, source, customer_id, customer_name_snapshot,
  customer_phone_snapshot, status, subtotal, discount, delivery_fee, tax_amount,
  total, payment_method, payment_status, items, is_sample, show_watermark,
  total_mrp, mrp_savings, gst_percent, created_by
) VALUES (
  'smp-ord-1001', 'SMP-2026-0001', 'id-0001', 'SAMPLE_BILLING', 'cust-001',
  'Karthik Sundaram (Demo)', '9876543210', 'COMPLETED', 635.00, 20.00, 0.00,
  29.29, 615.00, 'UPI', 'PAID',
  '[{"id":"smp-item-1","product_id":"p-001","product_name_snapshot":"Mapillai Samba Rice (1kg)","pack_size_snapshot":"1kg","unit_price_snapshot":155.00,"quantity":2,"total":310.00},{"id":"smp-item-2","product_id":"p-016","product_name_snapshot":"Cold-Pressed Groundnut Oil (1L)","pack_size_snapshot":"1L","unit_price_snapshot":270.00,"quantity":1,"total":270.00}]'::jsonb,
  true, true, 670.00, 55.00, 5.0, 'Owner'
) ON CONFLICT (id) DO NOTHING;


-- ----------------------------------------------------------------------------
-- 3. WEBSITE ANALYZE TABLE (Real-Time Audience & Page Analytics)
-- ----------------------------------------------------------------------------
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
CREATE INDEX IF NOT EXISTS idx_website_analyze_session ON public.website_analyze(session_id);
CREATE INDEX IF NOT EXISTS idx_website_analyze_created_at ON public.website_analyze(created_at);

-- Seed Initial Website Analyze Record
INSERT INTO public.website_analyze (
  id, session_id, path, page_title, referrer, device_type, browser, os, ip_hash, city, country, duration_seconds, is_unique
) VALUES (
  'wa-seed-1', 'sess-seed-001', '/', 'Home - MR. VIVASAYI Native Farm Store', 'https://google.com', 'Mobile', 'Chrome Mobile', 'Android', 'hash_abc123', 'Theni', 'India', 45, true
) ON CONFLICT (id) DO NOTHING;


-- ----------------------------------------------------------------------------
-- 4. POP NOTIFICATION EVENTS TABLE (Impression, Allow, Dismiss Telemetry)
-- ----------------------------------------------------------------------------
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
CREATE INDEX IF NOT EXISTS idx_pop_events_created_at ON public.pop_notification_events(created_at);

-- Seed Initial Pop Notification Telemetry
INSERT INTO public.pop_notification_events (
  id, type, device, browser, path, event_title, event_message, created_at
) VALUES 
('pop-evt-1', 'IMPRESSION', 'mobile', 'Chrome Mobile', '/', '🌿 100% Traditional Harvest Special', 'Fresh Cold Pressed Marachekku Oils and Heirloom Rice are now ready for dispatch!', NOW() - INTERVAL '2 hours'),
('pop-evt-2', 'ALLOW', 'mobile', 'Chrome Mobile', '/', '🌿 100% Traditional Harvest Special', 'Fresh Cold Pressed Marachekku Oils and Heirloom Rice are now ready for dispatch!', NOW() - INTERVAL '1 hour')
ON CONFLICT (id) DO NOTHING;


-- ----------------------------------------------------------------------------
-- 5. POP NOTIFICATION SUBSCRIBERS TABLE (Push Notification Subscribers)
-- ----------------------------------------------------------------------------
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
CREATE INDEX IF NOT EXISTS idx_pop_subscribers_created ON public.pop_notification_subscribers(created_at);

-- Seed Initial Pop Notification Subscriber
INSERT INTO public.pop_notification_subscribers (
  id, subscription_token, device, browser, status, subscribed_at
) VALUES (
  'sub-seed-1', 'sub_tok_mrvivasayi_seed_001', 'mobile', 'Chrome Mobile', 'ACTIVE', NOW()
) ON CONFLICT (id) DO NOTHING;


-- ----------------------------------------------------------------------------
-- 6. PRODUCT PRICE HISTORY TABLE (Audit Trail for Catalog Price Changes)
-- ----------------------------------------------------------------------------
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
CREATE INDEX IF NOT EXISTS idx_price_history_sku ON public.price_history(sku);
CREATE INDEX IF NOT EXISTS idx_price_history_created ON public.price_history(created_at);

-- Seed Initial Price History Record
INSERT INTO public.price_history (
  id, product_id, sku, name, old_selling_price, new_selling_price,
  old_offer_price, new_offer_price, mrp, purchase_price, landed_cost,
  changed_by, reason
) VALUES (
  'pph-seed-1', 'p-001', 'LIF-001', 'Mapillai Samba Rice', 165.00, 160.00,
  160.00, 155.00, 175.00, 120.00, 125.00,
  'Owner', 'Harvest season festival promotional discount'
) ON CONFLICT (id) DO NOTHING;

-- ----------------------------------------------------------------------------
-- Verification Query: Check All 21 Tables Status in Supabase
-- ----------------------------------------------------------------------------
SELECT 
  table_name,
  (SELECT COUNT(*) FROM information_schema.columns WHERE table_schema = 'public' AND table_name = t.table_name) AS column_count
FROM information_schema.tables t
WHERE table_schema = 'public'
ORDER BY table_name ASC;
