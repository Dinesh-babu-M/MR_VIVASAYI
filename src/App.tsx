import React, { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { CartProvider } from './contexts/CartContext';
import { NotificationProvider } from './contexts/NotificationContext';
import { ActionModalProvider } from './contexts/ActionModalContext';
import { Toaster } from 'react-hot-toast';
import type { UserRole } from './types';

// ---- Layouts ----
import PublicLayout from './components/public/PublicLayout';
import AdminLayout from './components/admin/AdminLayout';
import { getJSONStore, recordWebsiteVisit, isWebsiteAnalyzerEnabled } from './lib/dbManager';
import { PublicPageSkeleton, AdminPageSkeleton } from './components/common/Skeleton';

// ---- Public Pages (lazy) ----
const HomePage = lazy(() => import('./pages/public/HomePage'));
const ProductsPage = lazy(() => import('./pages/public/ProductsPage'));
const ProductDetailPage = lazy(() => import('./pages/public/ProductDetailPage'));
const AboutPage = lazy(() => import('./pages/public/AboutPage'));
const ContactPage = lazy(() => import('./pages/public/ContactPage'));
const PrivacyPolicyPage = lazy(() => import('./pages/public/PrivacyPolicyPage'));
const TermsConditionsPage = lazy(() => import('./pages/public/TermsConditionsPage'));
const ReviewsPublicPage = lazy(() => import('./pages/public/ReviewsPublicPage'));
const TrackOrderPage = lazy(() => import('./pages/public/TrackOrderPage'));
const NotFoundPage = lazy(() => import('./pages/NotFoundPage'));

// ---- Admin Pages (lazy) ----
const AdminLoginPage = lazy(() => import('./pages/admin/AdminLoginPage'));
const DashboardPage = lazy(() => import('./pages/admin/DashboardPage'));
const POSPage = lazy(() => import('./pages/admin/POSPage'));
const OrdersPage = lazy(() => import('./pages/admin/OrdersPage'));
const AdminOrderDetailPage = lazy(() => import('./pages/admin/AdminOrderDetailPage'));
const ProductsManagerPage = lazy(() => import('./pages/admin/ProductsManagerPage'));
const ProductEditorPage = lazy(() => import('./pages/admin/ProductEditorPage'));
const InventoryPage = lazy(() => import('./pages/admin/InventoryPage'));
const SuppliersPage = lazy(() => import('./pages/admin/SuppliersPage'));
const CustomersPage = lazy(() => import('./pages/admin/CustomersPage'));
const PromotionsPage = lazy(() => import('./pages/admin/PromotionsPage'));
const WhatsAppHubPage = lazy(() => import('./pages/admin/WhatsAppHubPage'));
const ReportsPage = lazy(() => import('./pages/admin/ReportsPage'));
const CMSPage = lazy(() => import('./pages/admin/CMSPage'));
const AuditLogsPage = lazy(() => import('./pages/admin/AuditLogsPage'));
const AuditCatalogPage = lazy(() => import('./pages/admin/AuditCatalogPage').then(m => ({ default: m.AuditCatalogPage })));
const AuditSalesPage = lazy(() => import('./pages/admin/AuditSalesPage').then(m => ({ default: m.AuditSalesPage })));
const AuditSecurityPage = lazy(() => import('./pages/admin/AuditSecurityPage').then(m => ({ default: m.AuditSecurityPage })));
const AuditActivityPage = lazy(() => import('./pages/admin/AuditActivityPage').then(m => ({ default: m.AuditActivityPage })));
const StaffPage = lazy(() => import('./pages/admin/StaffPage'));
const ProfilePage = lazy(() => import('./pages/admin/ProfilePage'));
const SettingsPage = lazy(() => import('./pages/admin/SettingsPage'));
const MessageTemplatesPage = lazy(() => import('./pages/admin/MessageTemplatesPage'));
const CustomerDetailPage = lazy(() => import('./pages/admin/CustomerDetailPage'));
const ReviewsPage = lazy(() => import('./pages/admin/ReviewsPage'));
const POSBillingDetailsPage = lazy(() => import('./pages/admin/POSBillingDetailsPage'));
const CouponsPage = lazy(() => import('./pages/admin/CouponsPage'));
const DBTablesPage = lazy(() => import('./pages/admin/DBTablesPage'));
const SamplePOSPage = lazy(() => import('./pages/admin/SamplePOSPage'));
const SampleBillingInvoicesPage = lazy(() => import('./pages/admin/SampleBillingInvoicesPage'));

import Logo from './components/common/Logo';

// ---- User & Role Custom Page Loader ----
const PageLoader = () => {
  const { user, isSwitchingRole } = useAuth();
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-emerald-950 via-emerald-900 to-emerald-950 text-white p-6 animate-fadeIn relative overflow-hidden">
      <div className="absolute inset-0 opacity-10 bg-[radial-gradient(#fff_1px,transparent_1px)] [background-size:20px_20px]" />
      
      <div className="text-center space-y-6 max-w-sm w-full relative z-10">
        {/* Animated Mobile-Friendly Brand Logo */}
        <div className="relative inline-block mx-auto">
          <div className="absolute -inset-4 bg-amber-400/20 rounded-full blur-xl animate-pulse" />
          <div className="relative p-4 bg-emerald-900/90 rounded-3xl border border-emerald-700 shadow-2xl backdrop-blur-md flex items-center justify-center">
            <Logo variant="full" theme="dark" size="lg" showTagline={true} className="animate-bounce-gentle" />
          </div>
        </div>

        {/* Loading Spinner & Progress Bar */}
        <div className="space-y-3">
          <div className="flex justify-center items-center gap-2">
            <div className="w-5 h-5 border-3 border-amber-400 border-t-transparent rounded-full animate-spin" />
            <span className="text-amber-300 font-extrabold text-xs uppercase tracking-widest font-mono">
              MR. VIVASAYI ORGANIC
            </span>
          </div>

          <div className="space-y-1">
            <h3 className="text-base sm:text-lg font-serif font-extrabold text-amber-100">
              {isSwitchingRole ? 'Switching Staff Account...' : 'Loading Fresh Produce Store...'}
            </h3>
            <p className="text-xs text-emerald-200">
              Fetching organic products, farm harvest batches & layout settings.
            </p>
          </div>
        </div>

        {user && (
          <div className="p-3 bg-emerald-900/80 border border-emerald-800 rounded-2xl shadow-xl flex items-center justify-between text-xs backdrop-blur-sm">
            <div className="text-left truncate pr-2">
              <div className="font-extrabold text-amber-300 truncate">{user.full_name}</div>
              <div className="text-[11px] text-emerald-300 truncate">{user.email}</div>
            </div>
            <span className="bg-amber-400 text-emerald-950 font-black text-[10px] px-2.5 py-1 rounded-md uppercase tracking-wider font-mono shrink-0">
              {user.role}
            </span>
          </div>
        )}
      </div>
    </div>
  );
};

// ---- Protected admin authentication guard ----
function AdminGuard({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading, isSwitchingRole } = useAuth();
  if (isLoading || isSwitchingRole) return <PageLoader />;
  if (!isAuthenticated) return <Navigate to="/admin/login" replace />;
  return <>{children}</>;
}

// ---- Role & Module permission route guard ----
function RequirePermission({
  minRole = 'VIEWER',
  module = 'dashboard',
  children
}: {
  minRole?: UserRole;
  module?: string;
  children: React.ReactNode;
}) {
  const { user, hasRole, hasPermission } = useAuth();

  if (!user) return <Navigate to="/admin/login" replace />;

  const allowed = hasRole(minRole) && (module === 'dashboard' || hasPermission(module, 'view'));

  if (!allowed) {
    return <NotFoundPage />;
  }

  return <>{children}</>;
}

function DynamicPageTitleManager() {
  const location = useLocation();

  React.useEffect(() => {
    const path = location.pathname;
    let title = 'MR. VIVASAYI – Organic & Natural Foods';

    if (path === '/') {
      title = 'MR. VIVASAYI – Organic & Natural Foods';
    } else if (path === '/about') {
      title = 'MR. VIVASAYI - About';
    } else if (path === '/products') {
      title = 'MR. VIVASAYI - Products Catalog';
    } else if (path.startsWith('/products/')) {
      title = 'MR. VIVASAYI - Product Details';
    } else if (path === '/contact') {
      title = 'MR. VIVASAYI - Contact Us';
    } else if (path === '/privacy') {
      title = 'MR. VIVASAYI - Privacy Policy';
    } else if (path === '/terms') {
      title = 'MR. VIVASAYI - Terms & Conditions';
    } else if (path === '/admin/login') {
      title = 'MR. VIVASAYI - Admin Login';
    } else if (path === '/admin' || path === '/admin/') {
      title = 'MR. VIVASAYI - Dashboard';
    }

    // Apply CMS configured SEO meta title if present for public pages
    if (['/', '/about', '/products', '/contact'].includes(path)) {
      getJSONStore<any>('cms_settings').then(cms => {
        if (cms && cms.length && cms[0].seo) {
          const pageKey = path === '/' ? 'Home' : path === '/about' ? 'About' : path === '/products' ? 'Products' : 'Contact';
          const pageSeo = cms[0].seo[pageKey];
          if (pageSeo && pageSeo.title && pageSeo.title.trim()) {
            document.title = pageSeo.title;
          }
          if (pageSeo && pageSeo.description) {
            const metaDesc = document.querySelector('meta[name="description"]');
            if (metaDesc) metaDesc.setAttribute('content', pageSeo.description);
          }
        }
      }).catch(() => {});
    } else if (path.startsWith('/track-order') || path.startsWith('/track')) {
      title = 'MR. VIVASAYI - Live Shipment & Order Tracker';
    } else if (path.startsWith('/admin/sample-pos')) {
      title = 'MR. VIVASAYI - Sample POS Counter Simulator';
    } else if (path.startsWith('/admin/sample-invoices') || path.startsWith('/admin/sample-billing')) {
      title = 'MR. VIVASAYI - Sample Invoices & Test Orders Hub';
    } else if (path.startsWith('/admin/pos')) {
      title = 'MR. VIVASAYI - Counter POS Billing';
    } else if (path.startsWith('/admin/orders')) {
      title = 'MR. VIVASAYI - Orders Hub';
    } else if (path.startsWith('/admin/products')) {
      title = 'MR. VIVASAYI - Product Catalog';
    } else if (path.startsWith('/admin/inventory')) {
      title = 'MR. VIVASAYI - Stock & Inventory Audit';
    } else if (path.startsWith('/admin/suppliers')) {
      title = 'MR. VIVASAYI - Suppliers & Procurement';
    } else if (path.startsWith('/admin/customers')) {
      title = 'MR. VIVASAYI - Customers Management';
    } else if (path.startsWith('/admin/promotions')) {
      title = 'MR. VIVASAYI - WhatsApp Campaigns';
    } else if (path.startsWith('/admin/coupons')) {
      title = 'MR. VIVASAYI - Discount Coupons';
    } else if (path.startsWith('/admin/reviews')) {
      title = 'MR. VIVASAYI - Customer Reviews & Ratings';
    } else if (path.startsWith('/admin/templates')) {
      title = 'MR. VIVASAYI - Message Templates Library';
    } else if (path.startsWith('/admin/whatsapp-hub')) {
      title = 'MR. VIVASAYI - WhatsApp Order Inbox';
    } else if (path.startsWith('/admin/reports')) {
      title = 'MR. VIVASAYI - Sales & Financial Reports';
    } else if (path.startsWith('/admin/cms')) {
      title = 'MR. VIVASAYI - Content Management System';
    } else if (path.startsWith('/admin/audit')) {
      title = 'MR. VIVASAYI - Audit Trail Logs';
    } else if (path.startsWith('/admin/staff')) {
      title = 'MR. VIVASAYI - Staff & Role Management';
    } else if (path.startsWith('/admin/settings/db-tables') || path.startsWith('/admin/tables')) {
      title = 'MR. VIVASAYI - PostgreSQL Tables & Storage Matrix';
    } else if (path.startsWith('/admin/settings')) {
      title = 'MR. VIVASAYI - System Settings';
    } else if (path.startsWith('/admin/profile')) {
      title = 'MR. VIVASAYI - User Profile';
    }

    document.title = title;

    // Real website traffic telemetry tracking for website_analyze (respects master ON/OFF switch)
    if (!path.startsWith('/admin') && isWebsiteAnalyzerEnabled()) {
      const pageTitle = title || document.title || 'Store';
      recordWebsiteVisit({
        path,
        page_title: pageTitle
      }).catch(() => {});
    }
  }, [location]);

  return null;
}

function AppRoutes() {
  return (
    <Suspense fallback={<PublicPageSkeleton />}>
      <DynamicPageTitleManager />
      <Routes>
        {/* ======= PUBLIC WEBSITE ======= */}
        <Route element={<Suspense fallback={<PublicPageSkeleton />}><PublicLayout /></Suspense>}>
          <Route path="/" element={<HomePage />} />
          <Route path="/products" element={<ProductsPage />} />
          <Route path="/products/:id" element={<ProductDetailPage />} />
          <Route path="/products/:id/:slug" element={<ProductDetailPage />} />
          <Route path="/products/:id/*" element={<ProductDetailPage />} />
          <Route path="/product/:id" element={<ProductDetailPage />} />
          <Route path="/product/:id/:slug" element={<ProductDetailPage />} />
          <Route path="/product/:id/*" element={<ProductDetailPage />} />
          <Route path="/about" element={<AboutPage />} />
          <Route path="/reviews" element={<ReviewsPublicPage />} />
          <Route path="/contact" element={<ContactPage />} />
          <Route path="/privacy" element={<PrivacyPolicyPage />} />
          <Route path="/terms" element={<TermsConditionsPage />} />
          <Route path="/track-order" element={<TrackOrderPage />} />
          <Route path="/track" element={<TrackOrderPage />} />
        </Route>

        {/* ======= ADMIN LOGIN ======= */}
        <Route path="/admin/login" element={<AdminLoginPage />} />

        {/* ======= ADMIN WORKSPACE ======= */}
        <Route
          path="/admin"
          element={
            <AdminGuard>
              <Suspense fallback={<AdminPageSkeleton />}>
                <AdminLayout />
              </Suspense>
            </AdminGuard>
          }
        >
          {/* Main Role-Based Dashboard */}
          <Route index element={<DashboardPage />} />
          
          {/* Dedicated User Profile Page */}
          <Route path="profile" element={<ProfilePage />} />

          {/* Sample Billing Module Routes */}
          <Route
            path="sample-pos"
            element={
              <RequirePermission minRole="STAFF" module="pos">
                <SamplePOSPage />
              </RequirePermission>
            }
          />
          <Route
            path="sample-invoices"
            element={
              <RequirePermission minRole="STAFF" module="orders">
                <SampleBillingInvoicesPage />
              </RequirePermission>
            }
          />
          <Route
            path="sample-billing"
            element={<Navigate to="/admin/sample-invoices" replace />}
          />

          {/* Module Routes protected with strict role guards */}
          <Route
            path="pos"
            element={
              <RequirePermission minRole="SALES_STAFF" module="pos">
                <POSPage />
              </RequirePermission>
            }
          />
          <Route
            path="pos-billing-details"
            element={
              <RequirePermission minRole="SALES_STAFF" module="pos">
                <POSBillingDetailsPage />
              </RequirePermission>
            }
          />
          <Route
            path="orders"
            element={
              <RequirePermission minRole="STAFF" module="orders">
                <OrdersPage />
              </RequirePermission>
            }
          />
          <Route
            path="orders/:id"
            element={
              <RequirePermission minRole="STAFF" module="orders">
                <AdminOrderDetailPage />
              </RequirePermission>
            }
          />
          <Route
            path="coupons"
            element={
              <RequirePermission minRole="ADMIN" module="promotions">
                <CouponsPage />
              </RequirePermission>
            }
          />
          <Route
            path="products"
            element={
              <RequirePermission minRole="INVENTORY_MANAGER" module="products">
                <ProductsManagerPage />
              </RequirePermission>
            }
          />
          <Route
            path="products/new"
            element={
              <RequirePermission minRole="INVENTORY_MANAGER" module="products">
                <ProductEditorPage />
              </RequirePermission>
            }
          />
          <Route
            path="products/edit/:productId"
            element={
              <RequirePermission minRole="INVENTORY_MANAGER" module="products">
                <ProductEditorPage />
              </RequirePermission>
            }
          />
          <Route
            path="inventory"
            element={
              <RequirePermission minRole="INVENTORY_MANAGER" module="inventory">
                <InventoryPage />
              </RequirePermission>
            }
          />
          <Route
            path="suppliers"
            element={
              <RequirePermission minRole="INVENTORY_MANAGER" module="suppliers">
                <SuppliersPage />
              </RequirePermission>
            }
          />
          <Route
            path="customers"
            element={
              <RequirePermission minRole="STAFF" module="customers">
                <CustomersPage initialFilter="ALL" />
              </RequirePermission>
            }
          />
          <Route
            path="customers/pos"
            element={
              <RequirePermission minRole="STAFF" module="customers">
                <CustomersPage initialFilter="OFFLINE_POS" />
              </RequirePermission>
            }
          />
          <Route
            path="customers/website"
            element={
              <RequirePermission minRole="STAFF" module="customers">
                <CustomersPage initialFilter="WEBSITE" />
              </RequirePermission>
            }
          />
          <Route
            path="customers/whatsapp"
            element={
              <RequirePermission minRole="STAFF" module="customers">
                <CustomersPage initialFilter="WHATSAPP" />
              </RequirePermission>
            }
          />
          <Route
            path="customers/na"
            element={
              <RequirePermission minRole="STAFF" module="customers">
                <CustomersPage initialFilter="N_A" />
              </RequirePermission>
            }
          />
          <Route
            path="customers/returns"
            element={
              <RequirePermission minRole="STAFF" module="customers">
                <CustomersPage initialFilter="RETURNS" />
              </RequirePermission>
            }
          />
          <Route
            path="customers/:customerId"
            element={
              <RequirePermission minRole="STAFF" module="customers">
                <CustomerDetailPage />
              </RequirePermission>
            }
          />
          <Route
            path="promotions"
            element={
              <RequirePermission minRole="ADMIN" module="promotions">
                <PromotionsPage />
              </RequirePermission>
            }
          />
          <Route
            path="templates/whatsapp"
            element={
              <RequirePermission minRole="STAFF" module="promotions">
                <MessageTemplatesPage initialChannel="WHATSAPP" />
              </RequirePermission>
            }
          />
          <Route
            path="templates/email"
            element={
              <RequirePermission minRole="STAFF" module="promotions">
                <MessageTemplatesPage initialChannel="EMAIL" />
              </RequirePermission>
            }
          />
          <Route
            path="whatsapp-hub"
            element={
              <RequirePermission minRole="STAFF" module="whatsapp_hub">
                <WhatsAppHubPage />
              </RequirePermission>
            }
          />
          <Route
            path="reports"
            element={
              <RequirePermission minRole="ADMIN" module="reports">
                <ReportsPage />
              </RequirePermission>
            }
          />
          <Route
            path="cms"
            element={
              <RequirePermission minRole="ADMIN" module="cms">
                <CMSPage initialTab="hero" />
              </RequirePermission>
            }
          />
          <Route
            path="cms/website-analyzer"
            element={
              <RequirePermission minRole="ADMIN" module="cms">
                <CMSPage initialTab="website_analyzer" />
              </RequirePermission>
            }
          />
          <Route
            path="cms/seo-guide"
            element={
              <RequirePermission minRole="ADMIN" module="cms">
                <CMSPage initialTab="seo_guide" />
              </RequirePermission>
            }
          />
          <Route
            path="cms/pop-notification"
            element={
              <RequirePermission minRole="ADMIN" module="cms">
                <CMSPage initialTab="pop_notification" />
              </RequirePermission>
            }
          />
          <Route
            path="reviews"
            element={
              <RequirePermission minRole="STAFF" module="cms">
                <ReviewsPage />
              </RequirePermission>
            }
          />
          <Route
            path="cms/announcements"
            element={
              <RequirePermission minRole="ADMIN" module="cms">
                <CMSPage initialTab="announcements" />
              </RequirePermission>
            }
          />
          <Route
            path="cms/header-footer"
            element={
              <RequirePermission minRole="ADMIN" module="cms">
                <CMSPage initialTab="header_footer" />
              </RequirePermission>
            }
          />
          <Route
            path="cms/about"
            element={
              <RequirePermission minRole="ADMIN" module="cms">
                <CMSPage initialTab="about" />
              </RequirePermission>
            }
          />
          <Route
            path="cms/seo"
            element={
              <RequirePermission minRole="ADMIN" module="cms">
                <CMSPage initialTab="seo" />
              </RequirePermission>
            }
          />
          <Route
            path="cms/contact"
            element={
              <RequirePermission minRole="ADMIN" module="cms">
                <CMSPage initialTab="contact" />
              </RequirePermission>
            }
          />
          <Route
            path="cms/login-page"
            element={
              <RequirePermission minRole="ADMIN" module="cms">
                <CMSPage initialTab="login_page" />
              </RequirePermission>
            }
          />
          <Route
            path="audit"
            element={
              <RequirePermission minRole="SUPER_ADMIN" module="audit_logs">
                <AuditLogsPage initialTab="audit" />
              </RequirePermission>
            }
          />
          <Route
            path="audit/catalog"
            element={
              <RequirePermission minRole="SUPER_ADMIN" module="audit_logs">
                <AuditCatalogPage />
              </RequirePermission>
            }
          />
          <Route
            path="audit/sales"
            element={
              <RequirePermission minRole="SUPER_ADMIN" module="audit_logs">
                <AuditSalesPage />
              </RequirePermission>
            }
          />
          <Route
            path="audit/activity"
            element={
              <RequirePermission minRole="SUPER_ADMIN" module="audit_logs">
                <AuditActivityPage />
              </RequirePermission>
            }
          />
          <Route
            path="audit/security"
            element={
              <RequirePermission minRole="SUPER_ADMIN" module="audit_logs">
                <AuditSecurityPage />
              </RequirePermission>
            }
          />
          <Route
            path="staff"
            element={
              <RequirePermission minRole="ADMIN" module="user_roles">
                <StaffPage initialTab="all" />
              </RequirePermission>
            }
          />
          <Route
            path="staff/create"
            element={
              <RequirePermission minRole="ADMIN" module="user_roles">
                <StaffPage initialTab="create" />
              </RequirePermission>
            }
          />
          <Route
            path="staff/permissions"
            element={
              <RequirePermission minRole="SUPER_ADMIN" module="user_roles">
                <StaffPage initialTab="permissions" />
              </RequirePermission>
            }
          />
          <Route
            path="staff/roles"
            element={
              <RequirePermission minRole="SUPER_ADMIN" module="user_roles">
                <StaffPage initialTab="roles" />
              </RequirePermission>
            }
          />
          <Route
            path="settings"
            element={
              <RequirePermission minRole="SUPER_ADMIN" module="audit_logs">
                <SettingsPage initialSubTab="store_address" />
              </RequirePermission>
            }
          />
          <Route
            path="settings/address"
            element={
              <RequirePermission minRole="SUPER_ADMIN" module="audit_logs">
                <SettingsPage initialSubTab="store_address" />
              </RequirePermission>
            }
          />
          <Route
            path="settings/store-address"
            element={
              <RequirePermission minRole="SUPER_ADMIN" module="audit_logs">
                <SettingsPage initialSubTab="store_address" />
              </RequirePermission>
            }
          />
          <Route
            path="settings/db-performance"
            element={
              <RequirePermission minRole="SUPER_ADMIN" module="audit_logs">
                <SettingsPage initialSubTab="db_performance" />
              </RequirePermission>
            }
          />
          <Route
            path="settings/db-tables"
            element={
              <RequirePermission minRole="SUPER_ADMIN" module="audit_logs">
                <DBTablesPage />
              </RequirePermission>
            }
          />
          <Route
            path="tables"
            element={
              <RequirePermission minRole="SUPER_ADMIN" module="audit_logs">
                <DBTablesPage />
              </RequirePermission>
            }
          />
          <Route
            path="settings/delivery-rules"
            element={
              <RequirePermission minRole="SUPER_ADMIN" module="audit_logs">
                <SettingsPage initialSubTab="delivery_rules" />
              </RequirePermission>
            }
          />
          <Route
            path="settings/product-rules"
            element={
              <RequirePermission minRole="SUPER_ADMIN" module="audit_logs">
                <SettingsPage initialSubTab="product_rules" />
              </RequirePermission>
            }
          />
          <Route
            path="settings/email"
            element={
              <RequirePermission minRole="SUPER_ADMIN" module="audit_logs">
                <SettingsPage initialSubTab="email" />
              </RequirePermission>
            }
          />
          <Route
            path="settings/whatsapp-orders"
            element={
              <RequirePermission minRole="SUPER_ADMIN" module="audit_logs">
                <SettingsPage initialSubTab="whatsapp_orders" />
              </RequirePermission>
            }
          />
          <Route
            path="settings/whatsapp"
            element={
              <RequirePermission minRole="SUPER_ADMIN" module="audit_logs">
                <SettingsPage initialSubTab="whatsapp" />
              </RequirePermission>
            }
          />
          <Route
            path="settings/upi"
            element={
              <RequirePermission minRole="SUPER_ADMIN" module="audit_logs">
                <SettingsPage initialSubTab="payment_upi" />
              </RequirePermission>
            }
          />
          <Route
            path="settings/env"
            element={
              <RequirePermission minRole="SUPER_ADMIN" module="audit_logs">
                <SettingsPage initialSubTab="env" />
              </RequirePermission>
            }
          />
          <Route
            path="settings/maintenance"
            element={
              <RequirePermission minRole="SUPER_ADMIN" module="audit_logs">
                <SettingsPage initialSubTab="maintenance" />
              </RequirePermission>
            }
          />
          <Route
            path="settings/backup"
            element={
              <RequirePermission minRole="SUPER_ADMIN" module="audit_logs">
                <SettingsPage initialSubTab="backup" />
              </RequirePermission>
            }
          />

          {/* Invalid sub-route within admin workspace -> Render 404 Guard Page */}
          <Route path="*" element={<NotFoundPage />} />
        </Route>

        {/* ======= GLOBAL 404 CATCH-ALL ROUTE ======= */}
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </Suspense>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <ThemeProvider>
        <AuthProvider>
          <NotificationProvider>
            <ActionModalProvider>
              <CartProvider>
                <AppRoutes />
                <Toaster
                  position="top-right"
                  toastOptions={{
                    className: 'text-sm font-semibold',
                    style: { borderRadius: '12px', padding: '12px 16px' },
                    success: { style: { background: '#052e16', color: '#a7f3d0', border: '1px solid #065f46' } },
                    error: { style: { background: '#450a0a', color: '#fca5a5', border: '1px solid #7f1d1d' } },
                  }}
                />
              </CartProvider>
            </ActionModalProvider>
          </NotificationProvider>
        </AuthProvider>
      </ThemeProvider>
    </BrowserRouter>
  );
}
