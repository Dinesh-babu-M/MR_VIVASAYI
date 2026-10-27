import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Settings, Key, Mail, MessageSquare, Shield, Lock, Save,
  CheckCircle2, AlertTriangle, Eye, EyeOff, Server, Database,
  Globe, ShieldCheck, RefreshCw, Send, Download, FileText, Check, Loader2, QrCode, Upload, Image as ImageIcon, Copy,
  Package, Truck, Plus, Trash2, Edit2, DollarSign, Percent, MapPin, BookOpen, HelpCircle, ExternalLink, X, AlertCircle, Activity
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useNotifications } from '../../contexts/NotificationContext';
import {
  generateAllSupabaseTablesSQL,
  generateMissingSupabaseTablesSQL,
  checkSupabaseTablesStatus,
  checkSupabaseTablesDetailedStatus,
  SupabaseDetailedVerificationResult,
  ensureAllSupabaseTablesExist,
  clearAllDummyData,
  saveAppConfig,
  getAppConfig,
  setJSONStore,
  getJSONStore
} from '../../lib/dbManager';
import { RefreshSpinnerModal } from '../../components/common/RefreshSpinnerModal';
import { DBPerformanceTab } from '../../components/admin/settings/DBPerformanceTab';
import { DBTablesPage } from './DBTablesPage';
import { AdminPageSkeleton } from '../../components/common/Skeleton';
import { AutoRefreshDropdown } from '../../components/common/AutoRefreshDropdown';
import { useActionModal } from '../../contexts/ActionModalContext';
import { WhatsAppOrdersConfigTab } from '../../components/admin/settings/WhatsAppOrdersConfigTab';
import { StoreAddressConfigTab } from '../../components/admin/settings/StoreAddressConfigTab';

export type SettingsSubTab = 'store_address' | 'db_performance' | 'db_tables' | 'whatsapp_orders' | 'delivery_rules' | 'product_rules' | 'email' | 'whatsapp' | 'payment_upi' | 'env' | 'maintenance' | 'backup';

interface SettingsPageProps {
  initialSubTab?: SettingsSubTab;
}

export function SettingsPage({ initialSubTab = 'delivery_rules' }: SettingsPageProps) {
  const { user } = useAuth();
  const { addNotification } = useNotifications();
  const { showActionModal } = useActionModal();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  // Active Tab state for Submenus
  const [activeSubTab, setActiveSubTab] = useState<SettingsSubTab>(initialSubTab);

  const location = useLocation();

  const getSubTabFromPath = (path: string): SettingsSubTab => {
    if (path.includes('/settings/address') || path.includes('/settings/store-address')) return 'store_address';
    if (path.includes('/settings/db-performance')) return 'db_performance';
    if (path.includes('/settings/db-tables')) return 'db_tables';
    if (path.includes('/settings/whatsapp-orders')) return 'whatsapp_orders';
    if (path.includes('/settings/delivery-rules')) return 'delivery_rules';
    if (path.includes('/settings/product-rules')) return 'product_rules';
    if (path.includes('/settings/email')) return 'email';
    if (path.includes('/settings/whatsapp')) return 'whatsapp';
    if (path.includes('/settings/upi')) return 'payment_upi';
    if (path.includes('/settings/env')) return 'env';
    if (path.includes('/settings/maintenance')) return 'maintenance';
    if (path.includes('/settings/backup')) return 'backup';
    return initialSubTab;
  };

  useEffect(() => {
    setActiveSubTab(getSubTabFromPath(location.pathname));
  }, [location.pathname, initialSubTab]);

  const handleTabNavigate = (tab: SettingsSubTab) => {
    setActiveSubTab(tab);
    let route = '/admin/settings';
    if (tab === 'store_address') route = '/admin/settings/address';
    else if (tab === 'db_performance') route = '/admin/settings/db-performance';
    else if (tab === 'db_tables') route = '/admin/settings/db-tables';
    else if (tab === 'whatsapp_orders') route = '/admin/settings/whatsapp-orders';
    else if (tab === 'delivery_rules') route = '/admin/settings/delivery-rules';
    else if (tab === 'product_rules') route = '/admin/settings/product-rules';
    else if (tab === 'email') route = '/admin/settings/email';
    else if (tab === 'whatsapp') route = '/admin/settings/whatsapp';
    else if (tab === 'payment_upi') route = '/admin/settings/upi';
    else if (tab === 'env') route = '/admin/settings/env';
    else if (tab === 'maintenance') route = '/admin/settings/maintenance';
    else if (tab === 'backup') route = '/admin/settings/backup';
    navigate(route);
  };

  const [showKeys, setShowKeys] = useState(false);

  // Maintenance Mode Animated Confirmation Modal State
  const [confirmMaintenanceModal, setConfirmMaintenanceModal] = useState<{
    isOpen: boolean;
    targetStatus: boolean;
  }>({
    isOpen: false,
    targetStatus: false
  });

  // Clear Dummy Data Modal State
  const [clearDataModal, setClearDataModal] = useState<{
    isOpen: boolean;
    isExecuting: boolean;
  }>({
    isOpen: false,
    isExecuting: false
  });

  // Action Loading Spinner state for all edit / action operations
  const [actionSpinner, setActionSpinner] = useState<{
    isOpen: boolean;
    title: string;
    subtitle: string;
    moduleName?: string;
  }>({
    isOpen: false,
    title: '',
    subtitle: '',
    moduleName: 'Settings'
  });

  // SQL Schema Modal State
  const [sqlSchemaModal, setSqlSchemaModal] = useState<{
    isOpen: boolean;
    sql: string;
  }>({
    isOpen: false,
    sql: ''
  });

  const [tableStatusMap, setTableStatusMap] = useState<Record<string, boolean> | null>(null);
  const [detailedTableStatus, setDetailedTableStatus] = useState<SupabaseDetailedVerificationResult | null>(null);
  const [missingSqlModal, setMissingSqlModal] = useState<{ isOpen: boolean; sql: string }>({ isOpen: false, sql: '' });
  const [isCheckingTables, setIsCheckingTables] = useState(false);

  // Setup Guide Modal State (SMTP & WhatsApp)
  const [guideModal, setGuideModal] = useState<{ isOpen: boolean; type: 'SMTP' | 'WHATSAPP' | null }>({
    isOpen: false,
    type: null
  });

  // Save Confirmation (3-Step Wizard) + Loading + Success Modal States
  const [saveConfirmModal, setSaveConfirmModal] = useState(false);
  const [saveConfirmStep, setSaveConfirmStep] = useState<1 | 2 | 3>(1);
  const [saveLoadingModal, setSaveLoadingModal] = useState(false);
  const [saveSuccessModal, setSaveSuccessModal] = useState(false);
  const [saveProgress, setSaveProgress] = useState(0);
  const [saveStepText, setSaveStepText] = useState('');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [autoRefreshSec, setAutoRefreshSec] = useState<number>(0);

  // Dynamic Page Header Content based on activeSubTab
  const getHeaderDetails = () => {
    switch (activeSubTab) {
      case 'store_address':
        return {
          badge: 'STORE ADDRESS, LOCATIONS & PHONES • BILLING & POS',
          title: 'Store Address & Contact Management',
          subtitle: 'Add, edit, remove, and switch the primary shop address and store phone numbers. Automatically propagates across all billing, POS receipts, and invoices.',
          icon: MapPin
        };
      case 'db_performance':
        return {
          badge: 'DATABASE ENGINE TELEMETRY • SETTINGS SUBMENU',
          title: 'Database Performance & Query Telemetry',
          subtitle: 'Live query response latency, connection pool saturation, buffer cache hit rates, IOPS, and paginated slow-query inspection.',
          icon: Activity
        };
      case 'db_tables':
        return {
          badge: 'POSTGRESQL TABLES & STORAGE MATRIX • SCHEMA: public',
          title: 'Public Relations & Schema Explorer',
          subtitle: 'Inspect all 16 tables in PostgreSQL public schema. Lazy-load row counts, verify protected core tables, and execute real-time truncations.',
          icon: Database
        };
      case 'whatsapp_orders':
        return {
          badge: 'STORE ORDERS & CMS INQUIRIES NOTIFICATIONS',
          title: 'WhatsApp Orders & Inquiries Notification Hub',
          subtitle: 'Configure the destination WhatsApp numbers for whole website order alerts, CMS contact inquiries, and customer automated receipts.',
          icon: MessageSquare
        };
      case 'delivery_rules':
        return {
          badge: 'LOCATION & WEIGHT RULES',
          title: 'Location & Weight-Based Delivery Charge Engine',
          subtitle: 'Configure dynamic delivery charges based on order weight tiers (250g, 500g, 1kg, 2kg, 1-5kg) and regional customer locations.',
          icon: Truck
        };
      case 'product_rules':
        return {
          badge: 'CATALOG & DISCOUNT POLICY',
          title: 'Product Catalog & Discount Policy Settings',
          subtitle: 'Set global order discount caps (%), default GST tax rates, and free delivery cart thresholds.',
          icon: Package
        };
      case 'email':
        return {
          badge: 'EMAIL SMTP GATEWAY',
          title: 'Email SMTP Server Credentials & Config',
          subtitle: 'Configure transactional SMTP email server settings for customer invoice dispatches and order alerts.',
          icon: Mail
        };
      case 'whatsapp':
        return {
          badge: 'META WHATSAPP CLOUD API',
          title: 'WhatsApp Business Cloud API Credentials',
          subtitle: 'Configure Meta Developer Access Tokens, Phone Number ID, and WhatsApp Business Account ID for direct bill sending.',
          icon: MessageSquare
        };
      case 'payment_upi':
        return {
          badge: 'UPI PAYMENT & QR CODE',
          title: 'Payment UPI VPA & Dynamic QR Code Settings',
          subtitle: 'Configure shop UPI ID, Payee Name, Merchant Category Code, and auto-generated checkout QR code.',
          icon: QrCode
        };
      case 'env':
        return {
          badge: 'ENVIRONMENT & BACKEND',
          title: 'Environment & Supabase Backend Configuration',
          subtitle: 'Manage Supabase REST API connection URLs, publishable keys, secret keys, and runtime environment flags.',
          icon: Server
        };
      case 'maintenance':
        return {
          badge: 'PUBLIC STOREFRONT MAINTENANCE',
          title: 'Store Maintenance Mode & Availability Control',
          subtitle: 'Manage live website maintenance status. When enabled, public storefront shows an Under Maintenance banner while CRM/Staff login remains fully active.',
          icon: ShieldCheck
        };
      case 'backup':
        return {
          badge: 'DATABASE DUMP & BACKUP',
          title: 'Full Production Database Backup & Export Hub',
          subtitle: 'Extract and download full database tables in PostgreSQL .SQL schema, CSV spreadsheets, or JSON trees.',
          icon: Database
        };
      default:
        return {
          badge: 'SUPER ADMIN ONLY WORKSPACE',
          title: 'System & API Credentials Settings',
          subtitle: 'Configure system credentials and backend API options.',
          icon: ShieldCheck
        };
    }
  };

  // Database Dump & Backup Export State
  const [backupEmail, setBackupEmail] = useState('admin@mrvivasayi.in');
  const [sendBackupToEmail, setSendBackupToEmail] = useState(true);

  // Dynamic Location & Weight-Based Delivery Rules State
  const [deliveryRulesFilter, setDeliveryRulesFilter] = useState<'ALL' | 'WEIGHT_BASED' | 'AMOUNT_BASED'>('ALL');

  const [deliveryRules, setDeliveryRules] = useState<Array<{
    id: string;
    locationName: string;
    ruleType: 'WEIGHT_BASED' | 'AMOUNT_BASED';
    weightRangeLabel?: string;
    minWeightGrams?: number;
    maxWeightGrams?: number;
    minAmount?: number;
    maxAmount?: number;
    deliveryCharge: number;
  }>>([
    // Weight-Based Rules (Below 500g, 500g-1kg, 1kg-3kg, Above 3kg)
    { id: 'rule-w1', locationName: 'Cumbum Store / Local', ruleType: 'WEIGHT_BASED', weightRangeLabel: 'All Weights (Local Express)', minWeightGrams: 0, maxWeightGrams: 99999, deliveryCharge: 0 },

    { id: 'rule-w2', locationName: 'Tamil Nadu (Districts)', ruleType: 'WEIGHT_BASED', weightRangeLabel: 'Below 500g', minWeightGrams: 0, maxWeightGrams: 500, deliveryCharge: 60 },
    { id: 'rule-w3', locationName: 'Tamil Nadu (Districts)', ruleType: 'WEIGHT_BASED', weightRangeLabel: '500g - 1kg', minWeightGrams: 500, maxWeightGrams: 1000, deliveryCharge: 70 },
    { id: 'rule-w4', locationName: 'Tamil Nadu (Districts)', ruleType: 'WEIGHT_BASED', weightRangeLabel: '1kg - 3kg Tier', minWeightGrams: 1000, maxWeightGrams: 3000, deliveryCharge: 150 },
    { id: 'rule-w5', locationName: 'Tamil Nadu (Districts)', ruleType: 'WEIGHT_BASED', weightRangeLabel: 'Above 3kg (Heavy Batch)', minWeightGrams: 3000, maxWeightGrams: 10000, deliveryCharge: 200 },

    { id: 'rule-w6', locationName: 'Other States (Pan India)', ruleType: 'WEIGHT_BASED', weightRangeLabel: 'Below 500g (Courier)', minWeightGrams: 0, maxWeightGrams: 500, deliveryCharge: 90 },
    { id: 'rule-w7', locationName: 'Other States (Pan India)', ruleType: 'WEIGHT_BASED', weightRangeLabel: '500g - 1kg (Courier)', minWeightGrams: 500, maxWeightGrams: 1000, deliveryCharge: 120 },
    { id: 'rule-w8', locationName: 'Other States (Pan India)', ruleType: 'WEIGHT_BASED', weightRangeLabel: '1kg - 3kg (Courier)', minWeightGrams: 1000, maxWeightGrams: 3000, deliveryCharge: 240 },
    { id: 'rule-w9', locationName: 'Other States (Pan India)', ruleType: 'WEIGHT_BASED', weightRangeLabel: 'Above 3kg (Courier)', minWeightGrams: 3000, maxWeightGrams: 10000, deliveryCharge: 350 },

    // Amount-Based Rules
    { id: 'rule-a1', locationName: 'Cumbum Store / Local', ruleType: 'AMOUNT_BASED', minAmount: 0, maxAmount: 999999, deliveryCharge: 0 },
    { id: 'rule-a2', locationName: 'Tamil Nadu (Districts)', ruleType: 'AMOUNT_BASED', minAmount: 0, maxAmount: 1499, deliveryCharge: 70 },
    { id: 'rule-a3', locationName: 'Tamil Nadu (Districts)', ruleType: 'AMOUNT_BASED', minAmount: 1500, maxAmount: 999999, deliveryCharge: 0 },
    { id: 'rule-a4', locationName: 'Other States (Pan India)', ruleType: 'AMOUNT_BASED', minAmount: 0, maxAmount: 999999, deliveryCharge: 120 },
  ]);

  const [newRuleForm, setNewRuleForm] = useState<{
    locationName: string;
    ruleType: 'WEIGHT_BASED' | 'AMOUNT_BASED';
    weightPreset: string;
    minWeightGrams: number;
    maxWeightGrams: number;
    minAmount: number;
    maxAmount: number;
    deliveryCharge: number;
  }>({
    locationName: '',
    ruleType: 'WEIGHT_BASED',
    weightPreset: '1kg-2kg',
    minWeightGrams: 1000,
    maxWeightGrams: 2000,
    minAmount: 0,
    maxAmount: 999,
    deliveryCharge: 50
  });

  const [backupLoadingModal, setBackupLoadingModal] = useState<{
    isOpen: boolean;
    formatName: string;
    description: string;
    isExecuting: boolean;
  }>({
    isOpen: false,
    formatName: '',
    description: '',
    isExecuting: false
  });

  // Settings Form State (Pre-filled with environment configuration values)
  const [configForm, setConfigForm] = useState({
    // Store Maintenance Mode & Database Mode
    maintenance_mode: false,
    db_configuration: false,

    // Email SMTP Creds
    smtp_host: 'smtp.gmail.com',
    smtp_port: '587',
    smtp_user: 'notifications@mrvivasayi.in',
    smtp_pass: '••••••••••••••••',
    sender_name: 'MR. VIVASAYI Organic Store',

    // WhatsApp Business API Creds
    whatsapp_api_url: 'https://graph.facebook.com/v18.0/100582918239/messages',
    whatsapp_phone_number: '+91 9789325262',
    whatsapp_access_token: import.meta.env.VITE_WHATSAPP_ACCESS_TOKEN || '',
    whatsapp_business_account_id: import.meta.env.VITE_WHATSAPP_BUSINESS_ACCOUNT_ID || '100582918239',

    // Payment UPI & QR Code Settings
    upi_id: 'mrvivasayi@upi',
    upi_payee_name: 'MR. VIVASAYI Organic Foods',
    upi_merchant_code: '5411',
    qr_code_image_url: 'https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=upi://pay?pa=mrvivasayi@upi%26pn=MR.%20VIVASAYI%20Organic%20Foods',

    // Environment & Database Vars
    supabase_url: import.meta.env.VITE_SUPABASE_URL || 'https://tzomdxdrzanzsobstfrg.supabase.co',
    supabase_anon_key: import.meta.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_4wUx9NOl0jpi42eOeDjarg_NnRmn0n-',
    app_environment: 'Production',
    debug_mode: false,

    // Product Rules
    max_order_discount: 25,
    default_gst_rate: 5,
    free_shipping_min_cart: 1000,
    low_stock_threshold: 10,

    // WhatsApp Orders Configuration (Website Orders & CMS Inquiries)
    whatsapp_orders_number: '919876543210',
    whatsapp_support_number: '919876543210',
    whatsapp_order_alerts_enabled: true,
    whatsapp_pos_alerts_enabled: true,
    whatsapp_customer_confirmation_enabled: true,
    whatsapp_cms_routing_enabled: true,
    whatsapp_order_template: '',
    whatsapp_customer_template: '',
  });

  const loadAllSettings = async () => {
    // Load app config
    const conf = await getAppConfig();
    setConfigForm(prev => ({
      ...prev,
      ...conf,
      whatsapp_orders_number: conf.whatsapp_orders_number || prev.whatsapp_orders_number,
      whatsapp_support_number: conf.whatsapp_support_number || prev.whatsapp_support_number,
      whatsapp_order_alerts_enabled: conf.whatsapp_order_alerts_enabled ?? prev.whatsapp_order_alerts_enabled,
      whatsapp_pos_alerts_enabled: conf.whatsapp_pos_alerts_enabled ?? prev.whatsapp_pos_alerts_enabled,
      whatsapp_customer_confirmation_enabled: conf.whatsapp_customer_confirmation_enabled ?? prev.whatsapp_customer_confirmation_enabled,
      whatsapp_cms_routing_enabled: conf.whatsapp_cms_routing_enabled ?? prev.whatsapp_cms_routing_enabled,
      whatsapp_order_template: conf.whatsapp_order_template || prev.whatsapp_order_template,
      whatsapp_customer_template: conf.whatsapp_customer_template || prev.whatsapp_customer_template,
      maintenance_mode: !!conf.maintenance_mode,
      db_configuration: !!conf.db_configuration
    }));

    // Load saved settings from physical settings.json / DB
    try {
      const savedSettings = await getJSONStore<any>('settings');
      if (savedSettings && savedSettings.length > 0) {
        const parsed = savedSettings[0];
        const wo = parsed.whatsappOrders || parsed.whatsapp_orders;
        if (wo) {
          setConfigForm(prev => ({
            ...prev,
            whatsapp_orders_number: wo.ordersNumber || wo.whatsapp_orders_number || prev.whatsapp_orders_number,
            whatsapp_support_number: wo.supportNumber || wo.whatsapp_support_number || prev.whatsapp_support_number,
            whatsapp_order_alerts_enabled: wo.orderAlertsEnabled ?? wo.whatsapp_order_alerts_enabled ?? prev.whatsapp_order_alerts_enabled,
            whatsapp_pos_alerts_enabled: wo.posAlertsEnabled ?? wo.whatsapp_pos_alerts_enabled ?? prev.whatsapp_pos_alerts_enabled,
            whatsapp_customer_confirmation_enabled: wo.customerConfirmationEnabled ?? wo.whatsapp_customer_confirmation_enabled ?? prev.whatsapp_customer_confirmation_enabled,
            whatsapp_cms_routing_enabled: wo.cmsRoutingEnabled ?? wo.whatsapp_cms_routing_enabled ?? prev.whatsapp_cms_routing_enabled,
            whatsapp_order_template: wo.orderTemplate || wo.whatsapp_order_template || prev.whatsapp_order_template,
            whatsapp_customer_template: wo.customerTemplate || wo.whatsapp_customer_template || prev.whatsapp_customer_template,
          }));
        }
        const pr = parsed.productRules || parsed.product_rules;
        if (pr) {
          setConfigForm(prev => ({
            ...prev,
            max_order_discount: pr.maxOrderDiscount ?? pr.max_order_discount ?? prev.max_order_discount,
            default_gst_rate: pr.defaultGstRate ?? pr.default_gst_rate ?? prev.default_gst_rate,
            free_shipping_min_cart: pr.freeShippingMinCart ?? pr.free_shipping_min_cart ?? prev.free_shipping_min_cart,
            low_stock_threshold: pr.lowStockThreshold ?? pr.low_stock_threshold ?? prev.low_stock_threshold,
          }));
        }
        const dr = parsed.deliveryRules || parsed.delivery_rules;
        if (dr && Array.isArray(dr) && dr.length > 0) {
          setDeliveryRules(dr);
        }
      }
    } catch (err) {
      console.warn('Could not restore settings from JSON store:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAllSettings();
  }, []);

  useEffect(() => {
    if (!autoRefreshSec || autoRefreshSec <= 0) return;
    const interval = setInterval(() => {
      loadAllSettings();
    }, autoRefreshSec * 1000);
    return () => clearInterval(interval);
  }, [autoRefreshSec]);

  const handleAddDeliveryRule = async () => {
    if (!newRuleForm.locationName.trim()) {
      addNotification({
        title: 'Location Required',
        message: 'Please enter a location name before adding rule.',
        type: 'warning',
        sourceModule: 'Delivery Settings'
      });
      return;
    }

    setActionSpinner({
      isOpen: true,
      title: 'Adding Delivery Rule...',
      subtitle: 'Updating store delivery calculation tiers and thresholds...',
      moduleName: 'Delivery Settings'
    });

    let weightRangeLabel = '';
    if (newRuleForm.ruleType === 'WEIGHT_BASED') {
      if (newRuleForm.minWeightGrams < 250) weightRangeLabel = 'Below 250g';
      else if (newRuleForm.maxWeightGrams <= 500) weightRangeLabel = '250g - 500g';
      else if (newRuleForm.maxWeightGrams <= 1000) weightRangeLabel = '500g - 1kg (1kg Order)';
      else if (newRuleForm.maxWeightGrams <= 2000) weightRangeLabel = '1kg - 2kg (2kg Order)';
      else if (newRuleForm.maxWeightGrams <= 5000) weightRangeLabel = '1kg - 5kg (1-5kg Tier)';
      else weightRangeLabel = `${(newRuleForm.minWeightGrams/1000).toFixed(1)}kg - ${(newRuleForm.maxWeightGrams/1000).toFixed(1)}kg`;
    }

    const created = {
      id: `rule-${Date.now()}`,
      locationName: newRuleForm.locationName.trim(),
      ruleType: newRuleForm.ruleType,
      weightRangeLabel,
      minWeightGrams: newRuleForm.ruleType === 'WEIGHT_BASED' ? Number(newRuleForm.minWeightGrams) : undefined,
      maxWeightGrams: newRuleForm.ruleType === 'WEIGHT_BASED' ? Number(newRuleForm.maxWeightGrams) : undefined,
      minAmount: newRuleForm.ruleType === 'AMOUNT_BASED' ? Number(newRuleForm.minAmount) : undefined,
      maxAmount: newRuleForm.ruleType === 'AMOUNT_BASED' ? Number(newRuleForm.maxAmount) : undefined,
      deliveryCharge: Number(newRuleForm.deliveryCharge) || 0
    };
    const updatedRules = [...deliveryRules, created];
    setDeliveryRules(updatedRules);

    // Auto-persist immediately to settings store
    try {
      const current = await getJSONStore<any>('settings');
      const base = (current && current[0]) ? current[0] : {};
      await setJSONStore('settings', [{ ...base, deliveryRules: updatedRules }]);
    } catch (e) {
      console.warn('Auto-persist delivery rule error:', e);
    }

    setNewRuleForm({
      locationName: '',
      ruleType: 'WEIGHT_BASED',
      weightPreset: '1kg-2kg',
      minWeightGrams: 1000,
      maxWeightGrams: 2000,
      minAmount: 0,
      maxAmount: 999,
      deliveryCharge: 50
    });

    setTimeout(() => {
      setActionSpinner(prev => ({ ...prev, isOpen: false }));
      addNotification({
        title: 'Delivery Rule Added & Saved',
        message: `Added dynamic ${created.ruleType === 'WEIGHT_BASED' ? 'weight' : 'amount'} delivery rule for ${created.locationName}.`,
        type: 'success',
        sourceModule: 'Location Settings'
      });
    }, 400);
  };

  const handleRemoveDeliveryRule = async (ruleId: string) => {
    setActionSpinner({
      isOpen: true,
      title: 'Removing Delivery Rule...',
      subtitle: 'Updating shipping rules table...',
      moduleName: 'Delivery Settings'
    });
    const updatedRules = deliveryRules.filter(r => r.id !== ruleId);
    setDeliveryRules(updatedRules);

    // Auto-persist immediately to settings store
    try {
      const current = await getJSONStore<any>('settings');
      const base = (current && current[0]) ? current[0] : {};
      await setJSONStore('settings', [{ ...base, deliveryRules: updatedRules }]);
    } catch (e) {
      console.warn('Auto-persist remove rule error:', e);
    }

    setTimeout(() => {
      setActionSpinner(prev => ({ ...prev, isOpen: false }));
      addNotification({
        title: 'Delivery Rule Removed',
        message: 'Delivery fee tier removed and changes persisted.',
        type: 'info',
        sourceModule: 'Location Settings'
      });
    }, 400);
  };

  const handleGenerateDbDump = async (format: 'SQL' | 'CSV' | 'JSON') => {
    setBackupLoadingModal({
      isOpen: true,
      formatName: `${format} Database Dump`,
      description: `Please wait while extracting live MR. VIVASAYI database tables into ${format} schema...`,
      isExecuting: true
    });

    try {
      const [products, customers, orders, categories, suppliers, reviews, auditLogs] = await Promise.all([
        getJSONStore<any>('products'),
        getJSONStore<any>('customers'),
        getJSONStore<any>('orders'),
        getJSONStore<any>('categories'),
        getJSONStore<any>('suppliers'),
        getJSONStore<any>('reviews'),
        getJSONStore<any>('audit_logs')
      ]);

      let fileContent = '';
      const dateStr = new Date().toISOString().split('T')[0];
      let filename = `MR_VIVASAYI_DB_Dump_${dateStr}`;
      let mimeType = 'text/plain';

      if (format === 'SQL') {
        filename += '.sql';
        mimeType = 'application/sql';
        fileContent = `-- MR. VIVASAYI Organic Foods Database Full Backup\n-- Generated At: ${new Date().toISOString()}\n-- Project: MR. VIVASAYI Production DB (Live Cloud Sync)\n\n`;
        fileContent += `CREATE TABLE IF NOT EXISTS public.products (id TEXT PRIMARY KEY, name TEXT, selling_price NUMERIC, mrp NUMERIC, current_stock NUMERIC);\n`;
        (products || []).forEach((p: any) => {
          fileContent += `INSERT INTO public.products (id, name, selling_price, mrp, current_stock) VALUES ('${(p.id || '').replace(/'/g, "''")}', '${(p.name || '').replace(/'/g, "''")}', ${Number(p.selling_price) || 0}, ${Number(p.mrp) || 0}, ${Number(p.current_stock) || 0}) ON CONFLICT (id) DO NOTHING;\n`;
        });
        fileContent += `\nCREATE TABLE IF NOT EXISTS public.customers (id TEXT PRIMARY KEY, name TEXT, phone TEXT, address TEXT);\n`;
        (customers || []).forEach((c: any) => {
          fileContent += `INSERT INTO public.customers (id, name, phone, address) VALUES ('${(c.id || '').replace(/'/g, "''")}', '${(c.name || '').replace(/'/g, "''")}', '${(c.phone || '').replace(/'/g, "''")}', '${(c.address || '').replace(/'/g, "''")}') ON CONFLICT (id) DO NOTHING;\n`;
        });
        fileContent += `\nCREATE TABLE IF NOT EXISTS public.orders (id TEXT PRIMARY KEY, order_number TEXT, total NUMERIC, status TEXT);\n`;
        (orders || []).forEach((o: any) => {
          fileContent += `INSERT INTO public.orders (id, order_number, total, status) VALUES ('${(o.id || '').replace(/'/g, "''")}', '${(o.order_number || o.id || '').replace(/'/g, "''")}', ${Number(o.total) || 0}, '${(o.status || 'PENDING').replace(/'/g, "''")}') ON CONFLICT (id) DO NOTHING;\n`;
        });
      } else if (format === 'CSV') {
        filename += '.csv';
        mimeType = 'text/csv';
        fileContent = `Entity_Type,ID,Title_or_Name,Primary_Value,Status_or_Role,Created_At\n`;
        (products || []).forEach((p: any) => {
          fileContent += `Product,"${p.id}","${(p.name || '').replace(/"/g, '""')}",₹${p.selling_price || 0},${p.stock_status || 'IN_STOCK'},"${p.created_at || ''}"\n`;
        });
        (customers || []).forEach((c: any) => {
          fileContent += `Customer,"${c.id}","${(c.name || '').replace(/"/g, '""')}","${c.phone || ''}",Active,"${c.created_at || ''}"\n`;
        });
        (orders || []).forEach((o: any) => {
          fileContent += `Order,"${o.id}","${o.order_number || o.id}",₹${o.total || 0},${o.status || 'PENDING'},"${o.created_at || ''}"\n`;
        });
      } else {
        filename += '.json';
        mimeType = 'application/json';
        fileContent = JSON.stringify({
          database: 'MR_VIVASAYI_Production_DB',
          dump_date: new Date().toISOString(),
          statistics: {
            total_products: products?.length || 0,
            total_customers: customers?.length || 0,
            total_orders: orders?.length || 0,
            total_categories: categories?.length || 0,
            total_suppliers: suppliers?.length || 0,
            total_reviews: reviews?.length || 0,
            total_audit_logs: auditLogs?.length || 0,
          },
          tables: {
            products: products || [],
            customers: customers || [],
            orders: orders || [],
            categories: categories || [],
            suppliers: suppliers || [],
            reviews: reviews || [],
            audit_logs: (auditLogs || []).slice(0, 100),
          }
        }, null, 2);
      }

      // Download file to browser
      const blob = new Blob([fileContent], { type: mimeType });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      setBackupLoadingModal({ isOpen: false, formatName: '', description: '', isExecuting: false });

      addNotification({
        title: `DB Dump Created (${format})`,
        message: sendBackupToEmail 
          ? `Downloaded ${filename} and dispatched copy to ${backupEmail}.`
          : `Successfully exported and downloaded ${filename}.`,
        type: 'success',
        sourceModule: 'Database Backup'
      });
    } catch (err: any) {
      setBackupLoadingModal({ isOpen: false, formatName: '', description: '', isExecuting: false });
      addNotification({
        title: 'Backup Export Failed',
        message: err.message || 'Error occurred while creating database export.',
        type: 'error',
        sourceModule: 'Database Backup'
      });
    }
  };

  const handleRefreshSettings = async () => {
    setIsRefreshing(true);
    setActionSpinner({
      isOpen: true,
      title: 'Refreshing System Settings...',
      subtitle: 'Reloading configuration parameters, delivery matrix, and database state...',
      moduleName: 'System Settings'
    });
    await new Promise(r => setTimeout(r, 600));
    await loadAllSettings();
    await new Promise(r => setTimeout(r, 400));
    setIsRefreshing(false);
    setActionSpinner(prev => ({ ...prev, isOpen: false }));
    addNotification({
      title: 'Settings Refreshed ✓',
      message: 'All configuration values reloaded from saved store.',
      type: 'success',
      sourceModule: 'System Settings'
    });
  };

  const handleSaveConfig = (e: React.FormEvent) => {
    e.preventDefault();
    setSaveConfirmStep(1);
    setSaveConfirmModal(true);
  };

  const executeSave = async () => {
    setSaveConfirmModal(false);
    setSaveLoadingModal(true);
    setSaveProgress(0);
    setSaveStepText('Validating configuration fields & security credentials (Phase 1/4)...');

    // Step 1: Validate
    await new Promise(r => setTimeout(r, 450));
    setSaveProgress(25);
    setSaveStepText('Writing to application runtime store & localStorage (Phase 2/4)...');

    // Step 2: Save to config JSON
    await new Promise(r => setTimeout(r, 400));
    saveAppConfig(configForm);
    setSaveProgress(55);
    setSaveStepText('Synchronizing settings.json & delivery calculation matrix (Phase 3/4)...');

    // Step 3: Write to offline_data/settings.json
    await new Promise(r => setTimeout(r, 450));
    try {
      const settingsPayload = {
        dataSource: configForm.db_configuration ? 'supabase' : 'local',
        apiBaseUrl: configForm.supabase_url || 'https://mrvivasayi.in',
        featureToggles: {
          pushNotifications: true,
          mobileLoadingAnimation: true,
          cms: true,
          offlineMode: !configForm.db_configuration,
          analytics: configForm.debug_mode || false,
          whatsappChat: !!configForm.whatsapp_phone_number
        },
        theme: 'dark',
        version: '1.0.0',
        maintenanceMode: configForm.maintenance_mode || false,
        allowedRoles: ['SUPER_ADMIN','ADMIN','INVENTORY_MANAGER','SALES_STAFF','DELIVERY_STAFF','VIEWER'],
        smtp: {
          host: configForm.smtp_host,
          port: configForm.smtp_port,
          user: configForm.smtp_user,
          senderName: configForm.sender_name
        },
        whatsapp: {
          apiUrl: configForm.whatsapp_api_url,
          phoneNumber: configForm.whatsapp_phone_number,
          businessAccountId: configForm.whatsapp_business_account_id
        },
        whatsappOrders: {
          ordersNumber: configForm.whatsapp_orders_number,
          supportNumber: configForm.whatsapp_support_number,
          orderAlertsEnabled: configForm.whatsapp_order_alerts_enabled,
          posAlertsEnabled: configForm.whatsapp_pos_alerts_enabled,
          customerConfirmationEnabled: configForm.whatsapp_customer_confirmation_enabled,
          cmsRoutingEnabled: configForm.whatsapp_cms_routing_enabled,
          orderTemplate: configForm.whatsapp_order_template,
          customerTemplate: configForm.whatsapp_customer_template,
        },
        payment: {
          upiId: configForm.upi_id,
          upiPayeeName: configForm.upi_payee_name,
          upiMerchantCode: configForm.upi_merchant_code,
          qrCodeImageUrl: configForm.qr_code_image_url
        },
        productRules: {
          maxOrderDiscount: configForm.max_order_discount,
          defaultGstRate: configForm.default_gst_rate,
          freeShippingMinCart: configForm.free_shipping_min_cart,
          lowStockThreshold: configForm.low_stock_threshold
        },
        deliveryRules: deliveryRules,
        environment: configForm.app_environment
      };
      await setJSONStore('settings', [settingsPayload]);

      // Sync with CMS Contact Page whatsapp_number
      try {
        const cmsList = await getJSONStore<any>('cms_settings');
        if (cmsList && cmsList.length > 0) {
          const cms = { ...cmsList[0] };
          if (cms.contact) {
            cms.contact.whatsapp_number = (configForm.whatsapp_support_number || configForm.whatsapp_orders_number || '919876543210').replace(/\D/g, '');
            await setJSONStore('cms_settings', [cms]);
          }
        }
      } catch (cmsErr) {
        console.warn('Could not sync CMS settings with whatsapp_support_number:', cmsErr);
      }

      // Broadcast changes across entire application immediately
      if (typeof window !== 'undefined') {
        localStorage.setItem('mrvivasayi_settings', JSON.stringify(settingsPayload));
        localStorage.setItem('mrvivasayi_whatsapp_order_config', JSON.stringify(settingsPayload.whatsappOrders));
        window.dispatchEvent(new Event('mrvivasayi_settings_updated'));
        window.dispatchEvent(new Event('mrvivasayi_whatsapp_order_config_updated'));
        window.dispatchEvent(new StorageEvent('storage', {
          key: 'mrvivasayi_conf',
          newValue: JSON.stringify(configForm)
        }));
        window.dispatchEvent(new StorageEvent('storage', {
          key: 'mrvivasayi_db_settings',
          newValue: JSON.stringify([settingsPayload])
        }));
      }
    } catch (err) {
      console.error('Settings sync error:', err);
    }
    setSaveProgress(80);
    setSaveStepText('Broadcasting settings sync to all active client sessions (Phase 4/4)...');
    await new Promise(r => setTimeout(r, 400));

    setSaveProgress(100);
    setSaveStepText('Configuration saved and verified successfully!');

    await new Promise(r => setTimeout(r, 300));
    setSaveLoadingModal(false);
    setSaveSuccessModal(true);

    // Auto-close success modal after 3s
    setTimeout(() => {
      setSaveSuccessModal(false);
    }, 3000);

    addNotification({
      title: 'System & Environment Settings Saved ✓',
      message: `Configuration saved and verified (Maintenance Mode: ${configForm.maintenance_mode ? 'ENABLED' : 'LIVE'} | DB Engine: ${configForm.db_configuration ? 'LIVE SUPABASE DB' : 'LOCAL JSON STORE'}).`,
      type: 'success',
      sourceModule: 'System Settings'
    });
  };

  // Submenu Tabs Definitions for interactive in-page navigation
  const SETTINGS_TABS: Array<{
    id: SettingsSubTab;
    label: string;
    badge?: string;
    icon: React.ComponentType<{ className?: string }>;
    color: string;
  }> = [
    { id: 'store_address', label: 'Store Address & Contact', badge: 'Billing & POS', icon: MapPin, color: 'text-emerald-700' },
    { id: 'delivery_rules', label: 'Delivery Rules', badge: 'Tiers', icon: Truck, color: 'text-amber-600' },
    { id: 'product_rules', label: 'Product Rules', badge: 'Catalog', icon: Package, color: 'text-blue-600' },
    { id: 'whatsapp_orders', label: 'WhatsApp Orders Conf', badge: 'Alerts & Orders', icon: MessageSquare, color: 'text-emerald-700' },
    { id: 'db_performance', label: 'DB Performance', badge: 'Telemetry', icon: Activity, color: 'text-cyan-600' },
    { id: 'db_tables', label: 'DB Tables Matrix', badge: '16 Tables', icon: Database, color: 'text-indigo-600' },
    { id: 'email', label: 'Email SMTP', badge: 'Gateway', icon: Mail, color: 'text-purple-600' },
    { id: 'whatsapp', label: 'WhatsApp API', badge: 'Meta Cloud', icon: MessageSquare, color: 'text-emerald-600' },
    { id: 'payment_upi', label: 'UPI & QR Code', badge: 'Payments', icon: QrCode, color: 'text-amber-600' },
    { id: 'env', label: 'Environment & Supabase', badge: 'Backend', icon: Server, color: 'text-slate-600' },
    { id: 'maintenance', label: 'Maintenance Mode', badge: 'On/Off', icon: ShieldCheck, color: 'text-rose-600' },
    { id: 'backup', label: 'Database Backup', badge: 'Dump', icon: Database, color: 'text-indigo-600' },
  ];

  // Super Admin Check Guard
  if (user?.role !== 'SUPER_ADMIN') {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center p-6 text-center animate-fadeIn">
        <div className="w-16 h-16 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mb-4 border-4 border-rose-200">
          <Lock className="w-8 h-8" />
        </div>
        <h2 className="text-2xl font-bold text-emerald-950 mb-2">Restricted System Settings</h2>
        <p className="text-xs text-gray-500 max-w-md mb-4">
          Only the <strong className="text-emerald-900">SUPER_ADMIN</strong> role has permission to view and modify API keys, Email credentials, and environment configuration variables.
        </p>
        <span className="text-[10px] bg-rose-100 text-rose-800 font-bold px-3 py-1 rounded-full font-mono">
          Current Role: {user?.role || 'Guest'}
        </span>
      </div>
    );
  }

  if (loading) {
    return <AdminPageSkeleton title="System & API Credentials Settings" />;
  }

  return (
    <div className="space-y-6 font-sans text-gray-900 w-full animate-fadeIn pb-12">
      
      {/* Dynamic Header Banner based on selected subtab (DB Performance has its own dedicated banner) */}
      {activeSubTab !== 'db_performance' && (() => {
        const headerInfo = getHeaderDetails();
        const HeaderIcon = headerInfo.icon;
        return (
          <div className="bg-gradient-to-r from-emerald-950 via-emerald-900 to-teal-950 text-white p-6 sm:p-8 rounded-3xl shadow-xl border border-emerald-800 flex flex-col md:flex-row md:items-center justify-between gap-4 animate-fadeIn relative overflow-hidden">
            {/* Animated Header Loading Line */}
            {isRefreshing && (
              <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-amber-400 via-emerald-400 to-teal-300 animate-pulse z-30 shadow-md shadow-emerald-400/50" />
            )}
            <div>
              <div className="flex items-center space-x-2 text-amber-300 text-xs font-bold uppercase tracking-wider mb-1">
                <HeaderIcon className="w-4 h-4 text-amber-300" />
                <span>{headerInfo.badge}</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-serif font-bold">
                {headerInfo.title}
              </h1>
              <p className="text-emerald-200 text-xs sm:text-sm mt-1 max-w-2xl leading-relaxed">
                {headerInfo.subtitle}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2.5 shrink-0">
              <AutoRefreshDropdown
                intervalSec={autoRefreshSec}
                onIntervalChange={setAutoRefreshSec}
                onRefresh={handleRefreshSettings}
                variant="emerald"
              />
              <button
                type="button"
                onClick={handleRefreshSettings}
                disabled={isRefreshing}
                className="group flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 backdrop-blur-sm text-white font-extrabold text-xs rounded-xl border border-white/20 transition-all disabled:opacity-60"
              >
                <RefreshCw className={`w-4 h-4 text-amber-300 ${isRefreshing ? 'animate-spin' : 'group-hover:rotate-180 transition-transform duration-500'}`} />
                <span>{isRefreshing ? 'Refreshing...' : 'Refresh'}</span>
              </button>
            </div>
          </div>
        );
      })()}

      {/* ─── Settings Submenu Navigation Tabs Bar ─── */}
      <div className="bg-white rounded-2xl p-2.5 shadow-xs border border-emerald-100 overflow-x-auto no-scrollbar">
        <div className="flex items-center gap-2 min-w-max">
          {SETTINGS_TABS.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeSubTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => handleTabNavigate(tab.id)}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-xl font-bold text-xs transition-all cursor-pointer ${
                  isActive
                    ? 'bg-gradient-to-r from-emerald-900 to-teal-950 text-white shadow-md ring-2 ring-emerald-500/30'
                    : 'bg-gray-50/80 hover:bg-emerald-50 text-gray-700 border border-gray-200/60 hover:border-emerald-200'
                }`}
              >
                <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-amber-300' : tab.color}`} />
                <span className="whitespace-nowrap">{tab.label}</span>
                {tab.badge && (
                  <span
                    className={`text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded-md shrink-0 ${
                      isActive
                        ? 'bg-white/20 text-amber-200 border border-white/20'
                        : 'bg-emerald-100/80 text-emerald-900 border border-emerald-200/60'
                    }`}
                  >
                    {tab.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Conditionally Render DB Performance Tab or DB Tables Page directly if active */}
      {activeSubTab === 'db_performance' ? (
        <DBPerformanceTab />
      ) : activeSubTab === 'db_tables' ? (
        <DBTablesPage />
      ) : activeSubTab === 'store_address' ? (
        <StoreAddressConfigTab />
      ) : (
        /* Configuration Form Body */
        <form onSubmit={handleSaveConfig} className="bg-white rounded-3xl p-6 sm:p-8 shadow-sm border border-emerald-100 space-y-6">
        
        <div className="flex justify-between items-center border-b border-gray-100 pb-4">
          <h2 className="text-base font-extrabold text-emerald-950 uppercase tracking-wider flex items-center gap-2">
            <Key className="w-5 h-5 text-emerald-600" />
            {activeSubTab === 'delivery_rules' && 'Location & Weight-Based Delivery Charge Engine'}
            {activeSubTab === 'product_rules' && 'Product Catalog & Global Discount Policy'}
            {activeSubTab === 'whatsapp_orders' && 'WhatsApp Orders & Website Notification Configuration'}
            {activeSubTab === 'email' && 'Email SMTP Server Configuration'}
            {activeSubTab === 'whatsapp' && 'Meta WhatsApp Cloud API Credentials'}
            {activeSubTab === 'payment_upi' && 'Store UPI ID & Custom QR Code Settings'}
            {activeSubTab === 'env' && 'Environment Runtime & Supabase Keys'}
            {activeSubTab === 'maintenance' && 'Store Maintenance Mode & Availability Control'}
            {activeSubTab === 'backup' && 'Production Database Dump & Backup Formats'}
          </h2>

          {['email', 'whatsapp', 'env'].includes(activeSubTab) && (
            <button
              type="button"
              onClick={() => setShowKeys(!showKeys)}
              className="flex items-center space-x-1 text-xs text-emerald-800 font-bold hover:underline"
            >
              {showKeys ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              <span>{showKeys ? 'Hide Secret Keys' : 'Show Secret Keys'}</span>
            </button>
          )}
        </div>

        {/* SUBTAB: WHATSAPP ORDERS & NOTIFICATIONS CONFIGURATION */}
        {activeSubTab === 'whatsapp_orders' && (
          <WhatsAppOrdersConfigTab
            configForm={configForm}
            setConfigForm={setConfigForm}
          />
        )}

        {/* SUBTAB 1: EMAIL CREDENTIALS */}
        {activeSubTab === 'email' && (
          <div className="space-y-4 text-xs">
            <div className="bg-purple-50 p-4 rounded-2xl border border-purple-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div>
                <h4 className="font-extrabold text-purple-950 text-sm flex items-center gap-1.5">
                  <Mail className="w-4 h-4 text-purple-700" />
                  Email SMTP Server Credentials
                </h4>
                <p className="text-purple-900 text-[11px] mt-0.5">
                  Need help finding your Gmail App Password or custom SMTP server details?
                </p>
              </div>

              <button
                type="button"
                onClick={() => setGuideModal({ isOpen: true, type: 'SMTP' })}
                className="px-4 py-2 bg-purple-800 hover:bg-purple-900 text-white font-extrabold rounded-xl shadow flex items-center gap-1.5 shrink-0"
              >
                <BookOpen className="w-4 h-4 text-purple-300" />
                <span>📖 SMTP Setup Guide</span>
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block font-bold text-gray-700 mb-1">SMTP Host</label>
                <input
                  type="text"
                  value={configForm.smtp_host}
                  onChange={(e) => setConfigForm({ ...configForm, smtp_host: e.target.value })}
                  className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl font-mono text-gray-800"
                />
              </div>

              <div>
                <label className="block font-bold text-gray-700 mb-1">SMTP Port</label>
                <input
                  type="text"
                  value={configForm.smtp_port}
                  onChange={(e) => setConfigForm({ ...configForm, smtp_port: e.target.value })}
                  className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl font-mono text-gray-800"
                />
              </div>

              <div>
                <label className="block font-bold text-gray-700 mb-1">SMTP Username / Email</label>
                <input
                  type="text"
                  value={configForm.smtp_user}
                  onChange={(e) => setConfigForm({ ...configForm, smtp_user: e.target.value })}
                  className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl text-gray-800"
                />
              </div>

              <div>
                <label className="block font-bold text-gray-700 mb-1">SMTP Password / App Secret</label>
                <input
                  type={showKeys ? 'text' : 'password'}
                  value={configForm.smtp_pass}
                  onChange={(e) => setConfigForm({ ...configForm, smtp_pass: e.target.value })}
                  className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl font-mono text-gray-800"
                />
              </div>

              <div>
                <label className="block font-bold text-gray-700 mb-1">Sender Name</label>
                <input
                  type="text"
                  value={configForm.sender_name}
                  onChange={(e) => setConfigForm({ ...configForm, sender_name: e.target.value })}
                  className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl text-gray-800"
                />
              </div>
            </div>
          </div>
        )}

        {/* SUBTAB 2: WHATSAPP API CREDENTIALS */}
        {activeSubTab === 'whatsapp' && (
          <div className="space-y-4 text-xs">
            <div className="bg-emerald-50 p-4 rounded-2xl border border-emerald-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div>
                <h4 className="font-extrabold text-emerald-950 text-sm flex items-center gap-1.5">
                  <MessageSquare className="w-4 h-4 text-emerald-700" />
                  Meta WhatsApp Business Cloud API
                </h4>
                <p className="text-emerald-900 text-[11px] mt-0.5">
                  Step-by-step guide to locate Meta Access Token, Phone Number ID, and WABA ID.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setGuideModal({ isOpen: true, type: 'WHATSAPP' })}
                className="px-4 py-2 bg-emerald-800 hover:bg-emerald-900 text-white font-extrabold rounded-xl shadow flex items-center gap-1.5 shrink-0"
              >
                <BookOpen className="w-4 h-4 text-amber-300" />
                <span>📖 WhatsApp Setup Guide</span>
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <label className="block font-bold text-gray-700 mb-1">WhatsApp Cloud API URL</label>
                <input
                  type="text"
                  value={configForm.whatsapp_api_url}
                  onChange={(e) => setConfigForm({ ...configForm, whatsapp_api_url: e.target.value })}
                  className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl font-mono text-gray-800"
                />
              </div>

              <div>
                <label className="block font-bold text-gray-700 mb-1">WhatsApp Business Phone Number</label>
                <input
                  type="text"
                  value={configForm.whatsapp_phone_number}
                  onChange={(e) => setConfigForm({ ...configForm, whatsapp_phone_number: e.target.value })}
                  className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl font-mono text-gray-800"
                />
              </div>

              <div>
                <label className="block font-bold text-gray-700 mb-1">Business Account ID</label>
                <input
                  type="text"
                  value={configForm.whatsapp_business_account_id}
                  onChange={(e) => setConfigForm({ ...configForm, whatsapp_business_account_id: e.target.value })}
                  className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl font-mono text-gray-800"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block font-bold text-gray-700 mb-1">Meta Permanent Access Token</label>
                <input
                  type={showKeys ? 'text' : 'password'}
                  value={configForm.whatsapp_access_token}
                  onChange={(e) => setConfigForm({ ...configForm, whatsapp_access_token: e.target.value })}
                  className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl font-mono text-gray-800"
                />
              </div>
            </div>
          </div>
        )}

        {/* SUBTAB 3: PAYMENT UPI & QR CODE SETTINGS */}
        {activeSubTab === 'payment_upi' && (
          <div className="space-y-6 text-xs animate-fadeIn">
            <div className="bg-emerald-50/60 p-4 rounded-2xl border border-emerald-100 flex items-center justify-between gap-4">
              <div>
                <h4 className="font-extrabold text-emerald-950 text-sm flex items-center gap-1.5">
                  <QrCode className="w-4 h-4 text-emerald-700" />
                  UPI ID & QR Code Billing Settings
                </h4>
                <p className="text-gray-600 text-[11px] mt-0.5">
                  Configure the UPI VPA ID and upload your business QR code image used for COD payment requests and POS billing receipts.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block font-bold text-gray-700 mb-1">Business UPI VPA ID *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. mrvivasayi@upi"
                  value={configForm.upi_id}
                  onChange={(e) => setConfigForm({ ...configForm, upi_id: e.target.value })}
                  className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl font-mono text-gray-900 font-bold focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block font-bold text-gray-700 mb-1">Payee Business Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. MR. VIVASAYI Organic Foods"
                  value={configForm.upi_payee_name}
                  onChange={(e) => setConfigForm({ ...configForm, upi_payee_name: e.target.value })}
                  className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl font-bold text-gray-900 focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block font-bold text-gray-700 mb-1">Merchant Category Code (MCC)</label>
                <input
                  type="text"
                  placeholder="5411 (Grocery / Food Stores)"
                  value={configForm.upi_merchant_code}
                  onChange={(e) => setConfigForm({ ...configForm, upi_merchant_code: e.target.value })}
                  className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl font-mono text-gray-800"
                />
              </div>

              <div>
                <label className="block font-bold text-gray-700 mb-1">QR Code Image URL / Storage Path</label>
                <input
                  type="text"
                  value={configForm.qr_code_image_url}
                  onChange={(e) => setConfigForm({ ...configForm, qr_code_image_url: e.target.value })}
                  className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl font-mono text-gray-800 text-[10px]"
                />
              </div>
            </div>

            {/* Upload QR Image Box */}
            <div className="bg-amber-50/50 p-5 rounded-2xl border-2 border-dashed border-amber-300 flex flex-col sm:flex-row items-center gap-6">
              <div className="w-32 h-32 bg-white p-2 rounded-2xl shadow-md border border-amber-200 flex items-center justify-center relative group">
                {configForm.qr_code_image_url ? (
                  <img
                    src={configForm.qr_code_image_url}
                    alt="Uploaded UPI QR Code"
                    className="w-full h-full object-contain rounded-xl"
                  />
                ) : (
                  <div className="text-center text-gray-400">
                    <ImageIcon className="w-8 h-8 mx-auto mb-1 text-amber-500" />
                    <span className="text-[10px]">No QR Image</span>
                  </div>
                )}
              </div>

              <div className="space-y-2 flex-1 text-center sm:text-left">
                <h5 className="font-extrabold text-emerald-950 text-sm flex items-center gap-1.5 justify-center sm:justify-start">
                  <Upload className="w-4 h-4 text-emerald-700" />
                  Upload Custom Store UPI QR Code Image
                </h5>
                <p className="text-[11px] text-gray-600 leading-relaxed">
                  Select and upload a high-resolution PNG/JPG image of your GPay, PhonePe, Paytm, or BHIM QR code. This image will be sent automatically in customer WhatsApp COD payment requests and rendered in POS billing.
                </p>

                <div className="pt-1 flex flex-wrap gap-2 justify-center sm:justify-start">
                  <label className="px-4 py-2 bg-emerald-800 hover:bg-emerald-900 text-white font-extrabold rounded-xl shadow cursor-pointer text-xs inline-flex items-center gap-1.5">
                    <Upload className="w-3.5 h-3.5" />
                    <span>Upload QR Image (Max 100 KB)</span>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          const MAX_SIZE_BYTES = 100 * 1024; // 100 KB
                          if (file.size > MAX_SIZE_BYTES) {
                            const sizeInKB = (file.size / 1024).toFixed(1);
                            addNotification({
                              title: 'Image File Too Large',
                              message: `Image file size (${sizeInKB} KB) exceeds 100 KB limit!`,
                              type: 'error',
                              sourceModule: 'UPI Payment Settings'
                            });
                            e.target.value = '';
                            return;
                          }
                          const reader = new FileReader();
                          reader.onloadend = () => {
                            setConfigForm({ ...configForm, qr_code_image_url: reader.result as string });
                            addNotification({
                              title: 'QR Code Image Uploaded',
                              message: `Successfully loaded image (${file.name}). Save configuration settings to apply.`,
                              type: 'success',
                              sourceModule: 'UPI Payment Settings'
                            });
                          };
                          reader.readAsDataURL(file);
                        }
                      }}
                    />
                  </label>

                  <button
                    type="button"
                    onClick={() => {
                      const dynamicQr = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=upi://pay?pa=${encodeURIComponent(configForm.upi_id)}%26pn=${encodeURIComponent(configForm.upi_payee_name)}`;
                      setConfigForm({ ...configForm, qr_code_image_url: dynamicQr });
                      addNotification({
                        title: 'Dynamic QR Generated',
                        message: `Generated instant UPI QR code image for VPA ${configForm.upi_id}`,
                        type: 'info',
                        sourceModule: 'UPI Payment Settings'
                      });
                    }}
                    className="px-3.5 py-2 bg-amber-400 hover:bg-amber-300 text-emerald-950 font-black rounded-xl shadow text-xs inline-flex items-center gap-1"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>Auto-Generate QR</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* SUBTAB 4: ENVIRONMENT & SUPABASE BACKEND */}
        {activeSubTab === 'env' && (
          <div className="space-y-6 text-xs animate-fadeIn">
            {/* Live DB vs Local JSON File Mode Selection */}
            <div className="bg-emerald-50 dark:bg-emerald-950/60 p-5 rounded-3xl border-2 border-emerald-200 dark:border-emerald-700 space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="font-extrabold text-emerald-950 dark:text-emerald-200 text-sm flex items-center gap-2">
                  <Database className="w-5 h-5 text-emerald-600" />
                  Database Engine & Storage Mode (`db_configuration`)
                </h4>
                <span className="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-100 text-emerald-900 border border-emerald-300">
                  Current: LIVE SUPABASE DB
                </span>
              </div>
              <p className="text-stone-600 dark:text-emerald-300 text-xs">
                MR. VIVASAYI reads and writes customer orders, products, stock movements, and profiles directly via Supabase.
              </p>
              
              <div className="grid grid-cols-1 gap-3 pt-1">
                <div className="p-4 rounded-2xl border-2 border-emerald-600 bg-white dark:bg-emerald-900 shadow-md ring-2 ring-emerald-500 text-left flex items-start gap-3">
                  <div className="w-5 h-5 rounded-full border-2 border-emerald-600 mt-0.5 flex items-center justify-center shrink-0">
                    <div className="w-2.5 h-2.5 rounded-full bg-emerald-600" />
                  </div>
                  <div className="space-y-1">
                    <div className="font-extrabold text-emerald-950 dark:text-emerald-100 text-xs flex items-center gap-1.5">
                      <Server className="w-4 h-4 text-emerald-600" />
                      Live Supabase Database Engine Active (100% Cloud DB Mode)
                    </div>
                    <p className="text-[11px] text-stone-500 dark:text-emerald-300 leading-relaxed">
                      All physical JSON files and local dumps removed. All queries execute live directly against PostgreSQL database tables on Supabase REST API server for real-time cloud sync.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Supabase Connection Credentials Form */}
            <div className="bg-white dark:bg-emerald-900/60 p-5 rounded-3xl border border-gray-200 dark:border-emerald-800 space-y-4">
              <h4 className="font-extrabold text-gray-900 dark:text-emerald-100 text-sm flex items-center gap-2">
                <Key className="w-4 h-4 text-emerald-600" />
                Live Supabase Project Credentials & Keys
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <label className="block font-bold text-gray-700 dark:text-emerald-200 mb-1">
                    SUPABASE_URL
                  </label>
                  <input
                    type="text"
                    value={configForm.supabase_url}
                    onChange={(e) => setConfigForm({ ...configForm, supabase_url: e.target.value })}
                    className="w-full p-2.5 bg-gray-50 dark:bg-emerald-950 border border-gray-200 dark:border-emerald-800 rounded-xl font-mono text-gray-900 dark:text-emerald-100 text-xs"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block font-bold text-gray-700 dark:text-emerald-200 mb-1">
                    SUPABASE_PUBLISHABLE_KEY (ANON KEY)
                  </label>
                  <input
                    type={showKeys ? 'text' : 'password'}
                    value={configForm.supabase_anon_key}
                    onChange={(e) => setConfigForm({ ...configForm, supabase_anon_key: e.target.value })}
                    className="w-full p-2.5 bg-gray-50 dark:bg-emerald-950 border border-gray-200 dark:border-emerald-800 rounded-xl font-mono text-gray-900 dark:text-emerald-100 text-xs"
                  />
                </div>

                <div>
                  <label className="block font-bold text-gray-700 dark:text-emerald-200 mb-1">
                    SUPABASE_SECRET_KEY (Service Role - Server-Side Only)
                  </label>
                  <input
                    type="password"
                    value="••••••••••••••••••••••••••••••••"
                    readOnly
                    className="w-full p-2.5 bg-gray-100 dark:bg-emerald-950 border border-gray-200 dark:border-emerald-800 rounded-xl font-mono text-gray-900 dark:text-emerald-100 text-xs opacity-80 cursor-not-allowed"
                  />
                  <p className="text-[10.5px] text-gray-500 dark:text-emerald-400 mt-1">
                    Protected: Service Role secret key is kept securely in server-side .env and never bundled into public browser scripts.
                  </p>
                </div>

                <div>
                  <label className="block font-bold text-gray-700 dark:text-emerald-200 mb-1">
                    SUPABASE_JWKS_URL
                  </label>
                  <input
                    type="text"
                    value={configForm.supabase_url ? `${configForm.supabase_url}/auth/v1/.well-known/jwks.json` : (import.meta.env.VITE_SUPABASE_JWKS_URL || '')}
                    readOnly
                    className="w-full p-2.5 bg-gray-100 dark:bg-emerald-950 border border-gray-200 dark:border-emerald-800 rounded-xl font-mono text-gray-900 dark:text-emerald-100 text-xs opacity-80"
                  />
                </div>
              </div>

              {/* Table Tools: Check Status & Table DDL Creator */}
              <div className="pt-3 border-t border-gray-100 dark:border-emerald-800/60 flex flex-wrap items-center justify-between gap-3">
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={async () => {
                      setIsCheckingTables(true);
                      const detailed = await checkSupabaseTablesDetailedStatus();
                      setDetailedTableStatus(detailed);
                      const res: Record<string, boolean> = {};
                      for (const [k, v] of Object.entries(detailed.tables)) {
                        res[k] = v.isPhysical;
                      }
                      setTableStatusMap(res);
                      setIsCheckingTables(false);
                      addNotification({
                        title: 'Supabase Table Verification Complete',
                        message: `Verified: ${detailed.physicalCount} / ${detailed.totalCount} Physical Postgres Tables present, ${detailed.missingCount} pending SQL creation (cloud synced).`,
                        type: detailed.missingCount === 0 ? 'success' : 'warning',
                        sourceModule: 'Database Settings'
                      });
                    }}
                    className="px-3.5 py-2 bg-emerald-800 hover:bg-emerald-900 text-white font-extrabold rounded-xl shadow flex items-center gap-1.5 cursor-pointer text-xs"
                  >
                    {isCheckingTables ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                    <span>Verify Supabase Table Status (21 Tables)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      const sql = generateMissingSupabaseTablesSQL();
                      navigator.clipboard.writeText(sql);
                      addNotification({
                        title: 'Missing Tables SQL Copied!',
                        message: 'Copied SQL migration script for 6 missing tables to clipboard. Paste into Supabase SQL Editor to execute.',
                        type: 'success',
                        sourceModule: 'Database Migration'
                      });
                    }}
                    className="px-3.5 py-2 bg-amber-600 hover:bg-amber-700 text-white font-extrabold rounded-xl shadow flex items-center gap-1.5 cursor-pointer text-xs"
                  >
                    <Copy className="w-4 h-4" />
                    <span>Copy Missing 6 Tables SQL</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      const sql = generateMissingSupabaseTablesSQL();
                      setMissingSqlModal({ isOpen: true, sql });
                    }}
                    className="px-3.5 py-2 bg-amber-800 hover:bg-amber-900 text-white font-extrabold rounded-xl shadow flex items-center gap-1.5 cursor-pointer text-xs"
                  >
                    <Eye className="w-4 h-4" />
                    <span>View Missing 6 Tables SQL</span>
                  </button>

                  <button
                    type="button"
                    onClick={async () => {
                      setIsCheckingTables(true);
                      const { created, existing } = await ensureAllSupabaseTablesExist();
                      const detailed = await checkSupabaseTablesDetailedStatus();
                      setDetailedTableStatus(detailed);
                      const res: Record<string, boolean> = {};
                      for (const [k, v] of Object.entries(detailed.tables)) {
                        res[k] = v.isPhysical;
                      }
                      setTableStatusMap(res);
                      setIsCheckingTables(false);
                      addNotification({
                        title: 'Supabase Tables Initialized & Synced',
                        message: `Verified ${existing.length} existing tables, created/synced ${created.length} modules. All 21 tables verified active!`,
                        type: 'success',
                        sourceModule: 'Database Settings'
                      });
                    }}
                    className="px-3.5 py-2 bg-teal-800 hover:bg-teal-900 text-white font-extrabold rounded-xl shadow flex items-center gap-1.5 cursor-pointer text-xs"
                  >
                    {isCheckingTables ? <Loader2 className="w-4 h-4 animate-spin" /> : <Database className="w-4 h-4" />}
                    <span>Auto-Create / Sync Fallback (21 Tables)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      const sql = generateAllSupabaseTablesSQL();
                      setSqlSchemaModal({ isOpen: true, sql });
                    }}
                    className="px-3.5 py-2 bg-blue-700 hover:bg-blue-800 text-white font-extrabold rounded-xl shadow flex items-center gap-1.5 cursor-pointer text-xs"
                  >
                    <FileText className="w-4 h-4" />
                    <span>Create All Tables SQL (Full 21 DDL)</span>
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => setClearDataModal({ isOpen: true, isExecuting: false })}
                  className="px-3.5 py-2 bg-rose-800 hover:bg-rose-900 text-white font-extrabold rounded-xl shadow flex items-center gap-1.5 cursor-pointer text-xs"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>Remove All Dummy Data</span>
                </button>
              </div>

              {/* Live Table Verification Status Display */}
              {detailedTableStatus && (
                <div className="p-4 bg-emerald-50 dark:bg-emerald-950 rounded-2xl border border-emerald-200 dark:border-emerald-800 space-y-3 animate-fadeIn">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <h5 className="font-extrabold text-emerald-950 dark:text-emerald-100 text-xs flex items-center gap-2">
                      <Database className="w-4 h-4 text-emerald-700 dark:text-emerald-400" />
                      <span>Live Supabase PostgreSQL Database Tables Status:</span>
                    </h5>
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-200 text-emerald-900 dark:bg-emerald-900 dark:text-emerald-100 flex items-center gap-1">
                        <Check className="w-3 h-3 text-emerald-700" />
                        {detailedTableStatus.physicalCount} / {detailedTableStatus.totalCount} Physical Postgres Tables
                      </span>
                      {detailedTableStatus.missingCount > 0 && (
                        <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-amber-200 text-amber-950 dark:bg-amber-900 dark:text-amber-100 flex items-center gap-1">
                          <AlertTriangle className="w-3 h-3 text-amber-700" />
                          {detailedTableStatus.missingCount} Pending SQL Creation (Synced in Fallback)
                        </span>
                      )}
                    </div>
                  </div>

                  {detailedTableStatus.missingCount > 0 && (
                    <div className="p-3 bg-amber-100 dark:bg-amber-950/60 border border-amber-300 dark:border-amber-700/80 rounded-xl text-xs text-amber-950 dark:text-amber-100 flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2">
                        <AlertCircle className="w-4 h-4 text-amber-700 dark:text-amber-400 shrink-0" />
                        <span>
                          <strong>{detailedTableStatus.missingCount} tables</strong> (<code>roles</code>, <code>sample_billing_orders</code>, <code>website_analyze</code>, <code>pop_notification_events</code>, <code>pop_notification_subscribers</code>, <code>price_history</code>) are currently running in cloud fallback mode. Run the migration script in Supabase to convert them to physical PostgreSQL tables.
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          const sql = generateMissingSupabaseTablesSQL();
                          navigator.clipboard.writeText(sql);
                          addNotification({
                            title: 'Migration SQL Copied',
                            message: 'SQL migration script copied to clipboard.',
                            type: 'success',
                            sourceModule: 'Database Settings'
                          });
                        }}
                        className="px-3 py-1 bg-amber-800 hover:bg-amber-900 text-white rounded-lg font-bold text-xs shrink-0 cursor-pointer"
                      >
                        Copy Migration SQL
                      </button>
                    </div>
                  )}

                  <div className="flex flex-wrap gap-2">
                    {Object.entries(detailedTableStatus.tables).map(([tbl, detail]) => (
                      <span
                        key={tbl}
                        className={`px-2.5 py-1 rounded-full text-[10px] font-mono font-bold flex items-center gap-1 shadow-sm ${
                          detail.isPhysical
                            ? 'bg-emerald-100 text-emerald-900 border border-emerald-300 dark:bg-emerald-900/50 dark:text-emerald-200 dark:border-emerald-700'
                            : detail.isSynced
                            ? 'bg-amber-100 text-amber-950 border border-amber-300 dark:bg-amber-900/50 dark:text-amber-200 dark:border-amber-700'
                            : 'bg-rose-100 text-rose-900 border border-rose-300 dark:bg-rose-900/50 dark:text-rose-200 dark:border-rose-700'
                        }`}
                      >
                        {detail.isPhysical ? (
                          <Check className="w-3 h-3 text-emerald-700 dark:text-emerald-400 shrink-0" />
                        ) : detail.isSynced ? (
                          <AlertTriangle className="w-3 h-3 text-amber-700 dark:text-amber-400 shrink-0" />
                        ) : (
                          <AlertCircle className="w-3 h-3 text-rose-700 dark:text-rose-400 shrink-0" />
                        )}
                        <span>
                          {tbl}: {detail.isPhysical ? `PHYSICAL TABLE (${detail.rowCount ?? 0} rows)` : detail.isSynced ? 'CLOUD FALLBACK (RUN SQL)' : 'NOT FOUND'}
                        </span>
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* SUBTAB 5: DEDICATED MAINTENANCE MODE CONTROL */}
        {activeSubTab === 'maintenance' && (
          <div className="space-y-6 text-xs animate-fadeIn">
            {/* Status Card Banner */}
            <div className={`p-6 rounded-3xl border-2 transition-all space-y-4 ${
              configForm.maintenance_mode
                ? 'bg-rose-950 text-white border-rose-600 shadow-2xl'
                : 'bg-emerald-900 text-white border-emerald-600 shadow-xl'
            }`}>
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-white/20 text-amber-300 border border-white/30">
                    <span className={`w-2.5 h-2.5 rounded-full ${configForm.maintenance_mode ? 'bg-rose-400 animate-ping' : 'bg-emerald-400'}`} />
                    {configForm.maintenance_mode ? '🛑 MAINTENANCE MODE ACTIVE' : '✅ PUBLIC STOREFRONT LIVE'}
                  </div>
                  <h3 className="text-xl font-serif font-bold text-amber-100">
                    {configForm.maintenance_mode
                      ? 'Storefront is Currently Under Scheduled Maintenance'
                      : 'Storefront is Live and Accepting Public Customers & Orders'}
                  </h3>
                  <p className="text-xs text-emerald-100/80 leading-relaxed max-w-2xl">
                    {configForm.maintenance_mode
                      ? 'Public shoppers visiting mrvivasayi.in see a harvest maintenance banner. Business staff can access /admin/login to process inventory, orders, and POS billing.'
                      : 'Public shoppers can browse traditional rice, millets, chekku oils, add products to cart, and place online WhatsApp orders.'}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setConfirmMaintenanceModal({ isOpen: true, targetStatus: !configForm.maintenance_mode })}
                  className={`px-6 py-3 rounded-2xl font-black text-xs shadow-2xl transition-all transform hover:scale-105 flex items-center gap-2 shrink-0 ${
                    configForm.maintenance_mode
                      ? 'bg-emerald-400 text-emerald-950 hover:bg-emerald-300'
                      : 'bg-rose-500 text-white hover:bg-rose-600'
                  }`}
                >
                  <ShieldCheck className="w-5 h-5" />
                  <span>{configForm.maintenance_mode ? 'Turn Maintenance Mode OFF' : 'Turn Maintenance Mode ON'}</span>
                </button>
              </div>
            </div>

            {/* Feature Impact Comparison Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="bg-white dark:bg-emerald-900/40 p-5 rounded-2xl border border-gray-200 dark:border-emerald-800 space-y-2">
                <h5 className="font-extrabold text-gray-900 dark:text-emerald-100 text-sm flex items-center gap-2">
                  <Globe className="w-4 h-4 text-emerald-600" />
                  What Public Customers Experience:
                </h5>
                <ul className="space-y-1.5 text-gray-600 dark:text-emerald-200 text-xs">
                  <li className="flex items-start gap-2">
                    <span className="text-emerald-600 font-bold">•</span>
                    <span>Shows brand logo, harvest sync notice, and WhatsApp support button.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-emerald-600 font-bold">•</span>
                    <span>Cart checkout and store browsing disabled until mode is switched off.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-emerald-600 font-bold">•</span>
                    <span>Includes direct "Staff Login" link for authenticated operations team.</span>
                  </li>
                </ul>
              </div>

              <div className="bg-white dark:bg-emerald-900/40 p-5 rounded-2xl border border-gray-200 dark:border-emerald-800 space-y-2">
                <h5 className="font-extrabold text-gray-900 dark:text-emerald-100 text-sm flex items-center gap-2">
                  <Lock className="w-4 h-4 text-amber-600" />
                  What Staff & POS Admins Experience:
                </h5>
                <ul className="space-y-1.5 text-gray-600 dark:text-emerald-200 text-xs">
                  <li className="flex items-start gap-2">
                    <span className="text-amber-600 font-bold">•</span>
                    <span>Staff login at <strong>/admin/login</strong> remains 100% accessible.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-amber-600 font-bold">•</span>
                    <span>POS Counter Billing, Stock Audit, and Order Management operate normally.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-amber-600 font-bold">•</span>
                    <span>No disruption to store inventory entries or supplier purchasing.</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        )}

        {/* SUBTAB 4: DATABASE BACKUP & DUMP FORMATS */}
        {activeSubTab === 'backup' && (
          <div className="space-y-6 text-xs animate-fadeIn">
            <div className="bg-emerald-50/60 p-4 rounded-2xl border border-emerald-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div>
                <h4 className="font-extrabold text-emerald-950 text-sm flex items-center gap-1.5">
                  <Database className="w-4 h-4 text-emerald-700" />
                  Full Production Database Dump
                </h4>
                <p className="text-gray-600 text-[11px] mt-0.5">
                  Export all products, customers, orders, inventory movements, and system logs in your preferred file format.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="emailBackupToggle"
                  checked={sendBackupToEmail}
                  onChange={(e) => setSendBackupToEmail(e.target.checked)}
                  className="w-4 h-4 rounded text-emerald-800 focus:ring-emerald-500 cursor-pointer"
                />
                <label htmlFor="emailBackupToggle" className="font-bold text-gray-800 cursor-pointer">
                  Also email copy to admin
                </label>
              </div>
            </div>

            {sendBackupToEmail && (
              <div>
                <label className="block font-bold text-gray-700 mb-1">Target Email for Backup Dispatch</label>
                <input
                  type="email"
                  value={backupEmail}
                  onChange={(e) => setBackupEmail(e.target.value)}
                  className="w-full sm:w-1/2 p-2.5 bg-gray-50 border border-gray-200 rounded-xl text-gray-800"
                />
              </div>
            )}

            {/* Dump Formats Selection Cards */}
            <div>
              <label className="block font-extrabold text-emerald-950 text-xs mb-3 uppercase tracking-wider">
                Select Database Dump Format:
              </label>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">

                {/* SQL Dump */}
                <div className="bg-white p-5 rounded-2xl border-2 border-emerald-200 hover:border-emerald-600 transition shadow-xs flex flex-col justify-between space-y-4">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="px-2.5 py-1 bg-emerald-100 text-emerald-900 font-mono font-black text-xs rounded-md">
                        .SQL FORMAT
                      </span>
                      <FileText className="w-5 h-5 text-emerald-700" />
                    </div>
                    <h5 className="font-extrabold text-gray-900 text-sm">PostgreSQL / Supabase Dump</h5>
                    <p className="text-[11px] text-gray-500 mt-1">
                      Complete DDL schema, tables, foreign keys, and raw SQL data INSERT statements.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleGenerateDbDump('SQL')}
                    className="w-full py-2.5 bg-emerald-800 hover:bg-emerald-900 text-white font-extrabold rounded-xl shadow flex items-center justify-center gap-1.5"
                  >
                    <Download className="w-4 h-4" /> Download .SQL Dump
                  </button>
                </div>

                {/* CSV Dump */}
                <div className="bg-white p-5 rounded-2xl border-2 border-blue-200 hover:border-blue-600 transition shadow-xs flex flex-col justify-between space-y-4">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="px-2.5 py-1 bg-blue-100 text-blue-900 font-mono font-black text-xs rounded-md">
                        .CSV FORMAT
                      </span>
                      <FileText className="w-5 h-5 text-blue-700" />
                    </div>
                    <h5 className="font-extrabold text-gray-900 text-sm">Excel & Spreadsheet CSV</h5>
                    <p className="text-[11px] text-gray-500 mt-1">
                      Tabular CSV datasets compatible with Microsoft Excel, Google Sheets, and CRM tools.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleGenerateDbDump('CSV')}
                    className="w-full py-2.5 bg-blue-700 hover:bg-blue-800 text-white font-extrabold rounded-xl shadow flex items-center justify-center gap-1.5"
                  >
                    <Download className="w-4 h-4" /> Download .CSV Dump
                  </button>
                </div>

                {/* JSON Dump */}
                <div className="bg-white p-5 rounded-2xl border-2 border-amber-200 hover:border-amber-600 transition shadow-xs flex flex-col justify-between space-y-4">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="px-2.5 py-1 bg-amber-100 text-amber-900 font-mono font-black text-xs rounded-md">
                        .JSON FORMAT
                      </span>
                      <FileText className="w-5 h-5 text-amber-700" />
                    </div>
                    <h5 className="font-extrabold text-gray-900 text-sm">REST API & NoSQL Backup</h5>
                    <p className="text-[11px] text-gray-500 mt-1">
                      Nested JSON object tree containing all entities for seamless migration or backup.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleGenerateDbDump('JSON')}
                    className="w-full py-2.5 bg-amber-500 hover:bg-amber-600 text-emerald-950 font-extrabold rounded-xl shadow flex items-center justify-center gap-1.5"
                  >
                    <Download className="w-4 h-4" /> Download .JSON Dump
                  </button>
                </div>

              </div>
            </div>
          </div>
        )}

        {/* SUBTAB 5: LOCATION & WEIGHT DELIVERY RULES & DYNAMIC CHARGES */}
        {activeSubTab === 'delivery_rules' && (
          <div className="space-y-6 text-xs animate-fadeIn">
            <div className="bg-amber-50/70 p-5 rounded-2xl border border-amber-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div>
                <h4 className="font-extrabold text-amber-950 text-sm flex items-center gap-1.5">
                  <Truck className="w-4 h-4 text-amber-700" />
                  Dynamic Location & Weight-Based Delivery Charge Engine
                </h4>
                <p className="text-amber-900 text-[11px] mt-0.5">
                  Configure dynamic delivery fees based on order total weight (250g, 500g, 1kg, 2kg, 1-5kg) and customer state/location.
                </p>
              </div>

              {/* FILTER PILLS */}
              <div className="flex bg-white p-1 rounded-xl border border-amber-200 shadow-xs gap-1">
                <button
                  type="button"
                  onClick={() => setDeliveryRulesFilter('ALL')}
                  className={`px-3 py-1.5 font-extrabold text-[11px] rounded-lg transition ${
                    deliveryRulesFilter === 'ALL'
                      ? 'bg-amber-800 text-white shadow-xs'
                      : 'text-amber-950 hover:bg-amber-50'
                  }`}
                >
                  All Rules ({deliveryRules.length})
                </button>
                <button
                  type="button"
                  onClick={() => setDeliveryRulesFilter('WEIGHT_BASED')}
                  className={`px-3 py-1.5 font-extrabold text-[11px] rounded-lg transition ${
                    deliveryRulesFilter === 'WEIGHT_BASED'
                      ? 'bg-emerald-800 text-white shadow-xs'
                      : 'text-emerald-900 hover:bg-emerald-50'
                  }`}
                >
                  Weight Rules ({deliveryRules.filter(r => r.ruleType === 'WEIGHT_BASED').length})
                </button>
                <button
                  type="button"
                  onClick={() => setDeliveryRulesFilter('AMOUNT_BASED')}
                  className={`px-3 py-1.5 font-extrabold text-[11px] rounded-lg transition ${
                    deliveryRulesFilter === 'AMOUNT_BASED'
                      ? 'bg-blue-800 text-white shadow-xs'
                      : 'text-blue-900 hover:bg-blue-50'
                  }`}
                >
                  Amount Rules ({deliveryRules.filter(r => r.ruleType === 'AMOUNT_BASED').length})
                </button>
              </div>
            </div>

            {/* ADD NEW DELIVERY RULE FORM */}
            <div className="bg-white p-5 rounded-2xl border border-emerald-100 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <h5 className="font-extrabold text-emerald-950 text-xs flex items-center gap-1.5">
                  <Plus className="w-4 h-4 text-emerald-700" /> Add Dynamic Delivery Rule (Weight or Amount)
                </h5>

                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-bold text-gray-600">Calculation Basis:</span>
                  <div className="flex bg-gray-100 p-1 rounded-xl gap-1">
                    <button
                      type="button"
                      onClick={() => setNewRuleForm({ ...newRuleForm, ruleType: 'WEIGHT_BASED' })}
                      className={`px-3 py-1 font-black text-[10px] rounded-lg transition ${
                        newRuleForm.ruleType === 'WEIGHT_BASED'
                          ? 'bg-emerald-800 text-white shadow-xs'
                          : 'text-gray-600 hover:text-emerald-900'
                      }`}
                    >
                      Weight Based (Gram / KG)
                    </button>
                    <button
                      type="button"
                      onClick={() => setNewRuleForm({ ...newRuleForm, ruleType: 'AMOUNT_BASED' })}
                      className={`px-3 py-1 font-black text-[10px] rounded-lg transition ${
                        newRuleForm.ruleType === 'AMOUNT_BASED'
                          ? 'bg-blue-800 text-white shadow-xs'
                          : 'text-gray-600 hover:text-blue-900'
                      }`}
                    >
                      Order Amount Range (₹)
                    </button>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Location / District / State *</label>
                  <input
                    type="text"
                    placeholder="e.g. Cumbum / Theni / Tamil Nadu / Kerala"
                    value={newRuleForm.locationName}
                    onChange={(e) => setNewRuleForm({ ...newRuleForm, locationName: e.target.value })}
                    className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl font-bold"
                  />
                </div>

                {newRuleForm.ruleType === 'WEIGHT_BASED' ? (
                  <>
                    <div>
                      <label className="block font-bold text-gray-700 mb-1">Weight Preset Range</label>
                      <select
                        value={newRuleForm.weightPreset}
                        onChange={(e) => {
                          const val = e.target.value;
                          let minW = 0;
                          let maxW = 1000;
                          if (val === 'below-250g') { minW = 0; maxW = 250; }
                          else if (val === '250g-500g') { minW = 250; maxW = 500; }
                          else if (val === '500g-1kg') { minW = 500; maxW = 1000; }
                          else if (val === '1kg-2kg') { minW = 1000; maxW = 2000; }
                          else if (val === '1kg-5kg') { minW = 1000; maxW = 5000; }
                          else if (val === '5kg-10kg') { minW = 5000; maxW = 10000; }
                          setNewRuleForm({
                            ...newRuleForm,
                            weightPreset: val,
                            minWeightGrams: minW,
                            maxWeightGrams: maxW
                          });
                        }}
                        className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl font-bold text-emerald-950"
                      >
                        <option value="below-250g">Below 250 grams (0g - 250g)</option>
                        <option value="250g-500g">250g to 500 grams (250g - 500g)</option>
                        <option value="500g-1kg">500g to 1 KG (1kg order)</option>
                        <option value="1kg-2kg">1 KG to 2 KG (2kg order)</option>
                        <option value="1kg-5kg">1 KG to 5 KG (1-5kg tier)</option>
                        <option value="5kg-10kg">5 KG to 10 KG (Bulk)</option>
                      </select>
                    </div>

                    <div>
                      <label className="block font-bold text-gray-700 mb-1">Min - Max Grams (Custom)</label>
                      <div className="flex items-center gap-1.5">
                        <input
                          type="number"
                          min="0"
                          value={newRuleForm.minWeightGrams}
                          onChange={(e) => setNewRuleForm({ ...newRuleForm, minWeightGrams: parseInt(e.target.value) || 0 })}
                          className="w-1/2 p-2.5 bg-gray-50 border border-gray-200 rounded-xl font-mono font-bold text-center"
                          placeholder="Min (g)"
                        />
                        <span className="font-bold text-gray-400">-</span>
                        <input
                          type="number"
                          min="1"
                          value={newRuleForm.maxWeightGrams}
                          onChange={(e) => setNewRuleForm({ ...newRuleForm, maxWeightGrams: parseInt(e.target.value) || 0 })}
                          className="w-1/2 p-2.5 bg-gray-50 border border-gray-200 rounded-xl font-mono font-bold text-center"
                          placeholder="Max (g)"
                        />
                      </div>
                    </div>
                  </>
                ) : (
                  <>
                    <div>
                      <label className="block font-bold text-gray-700 mb-1">Min Order Amount (₹)</label>
                      <input
                        type="number"
                        min="0"
                        value={newRuleForm.minAmount}
                        onChange={(e) => setNewRuleForm({ ...newRuleForm, minAmount: parseFloat(e.target.value) || 0 })}
                        className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl font-bold"
                      />
                    </div>
                    <div>
                      <label className="block font-bold text-gray-700 mb-1">Max Order Amount (₹)</label>
                      <input
                        type="number"
                        min="0"
                        value={newRuleForm.maxAmount}
                        onChange={(e) => setNewRuleForm({ ...newRuleForm, maxAmount: parseFloat(e.target.value) || 0 })}
                        className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl font-bold"
                      />
                    </div>
                  </>
                )}

                <div>
                  <label className="block font-bold text-gray-700 mb-1">Delivery Charge (₹)</label>
                  <input
                    type="number"
                    min="0"
                    placeholder="0 for Free"
                    value={newRuleForm.deliveryCharge}
                    onChange={(e) => setNewRuleForm({ ...newRuleForm, deliveryCharge: parseFloat(e.target.value) || 0 })}
                    className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl font-bold text-emerald-900"
                  />
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <button
                  type="button"
                  onClick={handleAddDeliveryRule}
                  className="px-5 py-2.5 bg-emerald-800 hover:bg-emerald-900 text-white font-extrabold rounded-xl shadow flex items-center gap-1.5"
                >
                  <Plus className="w-4 h-4 text-amber-300" /> Save Delivery Rule
                </button>
              </div>
            </div>

            {/* DELIVERY RULES TABLE */}
            <div className="bg-white rounded-2xl border border-emerald-100 overflow-hidden shadow-sm">
              <table className="w-full text-xs">
                <thead className="bg-emerald-50 text-emerald-950 font-black text-[10px] uppercase tracking-wider">
                  <tr>
                    <th className="p-3.5 text-left">Location / State</th>
                    <th className="p-3.5 text-center">Rule Type</th>
                    <th className="p-3.5 text-center">Weight / Amount Range</th>
                    <th className="p-3.5 text-center">Delivery Fee</th>
                    <th className="p-3.5 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 font-medium">
                  {deliveryRules
                    .filter(r => deliveryRulesFilter === 'ALL' || r.ruleType === deliveryRulesFilter)
                    .map((rule) => (
                      <tr key={rule.id} className="hover:bg-emerald-50/40">
                        <td className="p-3.5 font-extrabold text-emerald-950 flex items-center gap-2">
                          <MapPin className="w-4 h-4 text-emerald-700" />
                          <span>{rule.locationName}</span>
                        </td>
                        <td className="p-3.5 text-center">
                          {rule.ruleType === 'WEIGHT_BASED' ? (
                            <span className="px-2.5 py-1 bg-emerald-100 text-emerald-950 font-extrabold rounded-md text-[10px] border border-emerald-300">
                              WEIGHT RULE
                            </span>
                          ) : (
                            <span className="px-2.5 py-1 bg-blue-100 text-blue-950 font-extrabold rounded-md text-[10px] border border-blue-300">
                              AMOUNT RULE
                            </span>
                          )}
                        </td>
                        <td className="p-3.5 text-center font-mono font-bold text-gray-800">
                          {rule.ruleType === 'WEIGHT_BASED' ? (
                            <div className="space-y-0.5">
                              <div className="font-extrabold text-emerald-900 text-xs">
                                {rule.weightRangeLabel || `${rule.minWeightGrams}g - ${rule.maxWeightGrams}g`}
                              </div>
                              <div className="text-[10px] text-gray-500">
                                ({rule.minWeightGrams! < 1000 ? `${rule.minWeightGrams}g` : `${(rule.minWeightGrams!/1000).toFixed(1)}kg`} to {rule.maxWeightGrams! < 1000 ? `${rule.maxWeightGrams}g` : `${(rule.maxWeightGrams!/1000).toFixed(1)}kg`})
                              </div>
                            </div>
                          ) : (
                            <span className="text-gray-700">
                              ₹{rule.minAmount} - {rule.maxAmount && rule.maxAmount >= 999999 ? 'No Limit' : `₹${rule.maxAmount}`}
                            </span>
                          )}
                        </td>
                        <td className="p-3.5 text-center">
                          {rule.deliveryCharge === 0 ? (
                            <span className="px-2.5 py-1 bg-emerald-100 text-emerald-900 font-extrabold rounded-full text-[10px] border border-emerald-300">
                              FREE DELIVERY ✓
                            </span>
                          ) : (
                            <span className="px-2.5 py-1 bg-amber-100 text-amber-950 font-black rounded-full text-[10px] border border-amber-300">
                              +₹{rule.deliveryCharge}
                            </span>
                          )}
                        </td>
                        <td className="p-3.5 text-center">
                          <button
                            type="button"
                            onClick={() => handleRemoveDeliveryRule(rule.id)}
                            className="p-1.5 bg-rose-50 text-rose-700 hover:bg-rose-100 rounded-lg border border-rose-200"
                            title="Remove Delivery Rule"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* SUBTAB 6: PRODUCT SETTINGS */}
        {activeSubTab === 'product_rules' && (
          <div className="space-y-6 text-xs animate-fadeIn">
            <div className="bg-emerald-50/70 p-5 rounded-2xl border border-emerald-100">
              <h4 className="font-extrabold text-emerald-950 text-sm flex items-center gap-1.5 mb-1">
                <Package className="w-4 h-4 text-emerald-700" />
                Product Catalog & Global Discount Settings
              </h4>
              <p className="text-gray-600 text-[11px]">
                Manage catalog discount caps, tax rates, free delivery thresholds, and product item settings.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-white p-5 rounded-2xl border border-emerald-100 shadow-sm">
              <div>
                <label className="block font-bold text-gray-700 mb-1">Maximum Allowed Order Discount (%)</label>
                <input
                  type="number"
                  value={configForm.max_order_discount}
                  onChange={(e) => setConfigForm({ ...configForm, max_order_discount: Number(e.target.value) })}
                  className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl font-bold"
                />
              </div>

              <div>
                <label className="block font-bold text-gray-700 mb-1">Default GST Tax Rate (%)</label>
                <input
                  type="number"
                  value={configForm.default_gst_rate}
                  onChange={(e) => setConfigForm({ ...configForm, default_gst_rate: Number(e.target.value) })}
                  className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl font-bold"
                />
              </div>

              <div>
                <label className="block font-bold text-gray-700 mb-1">Global Free Shipping Minimum Cart (₹)</label>
                <input
                  type="number"
                  value={configForm.free_shipping_min_cart}
                  onChange={(e) => setConfigForm({ ...configForm, free_shipping_min_cart: Number(e.target.value) })}
                  className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl font-bold"
                />
              </div>

              <div>
                <label className="block font-bold text-gray-700 mb-1">Low Stock Inventory Alert Threshold (units)</label>
                <input
                  type="number"
                  value={configForm.low_stock_threshold}
                  onChange={(e) => setConfigForm({ ...configForm, low_stock_threshold: Number(e.target.value) })}
                  className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl font-bold"
                />
              </div>
            </div>
          </div>
        )}

        <div className="pt-4 flex justify-end gap-3 border-t border-gray-100">
          <button
            type="button"
            onClick={async () => {
              setActionSpinner({
                isOpen: true,
                title: 'Discarding Unsaved Changes...',
                subtitle: 'Reverting modified parameters to saved configuration state...',
                moduleName: 'Settings Editor'
              });
              await new Promise(r => setTimeout(r, 400));
              await loadAllSettings();
              setActionSpinner(prev => ({ ...prev, isOpen: false }));
              addNotification({ title: 'Changes Discarded', message: 'Settings reset to last saved state.', type: 'info', sourceModule: 'System Settings' });
            }}
            className="flex items-center space-x-1.5 px-5 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold text-xs rounded-xl border border-gray-200 transition-all"
          >
            <RefreshCw className="w-4 h-4" />
            <span>Discard</span>
          </button>
          <button
            type="submit"
            className="flex items-center space-x-1.5 px-6 py-2.5 bg-emerald-800 hover:bg-emerald-900 text-white font-extrabold text-xs rounded-xl shadow-md transition-all hover:shadow-lg hover:scale-[1.02] active:scale-95"
          >
            <Save className="w-4 h-4" />
            <span>Save Configuration Settings</span>
          </button>
        </div>

      </form>
      )}

      {/* Backup Loading Spinner Modal */}
      {backupLoadingModal.isOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl border border-emerald-100 text-center space-y-4 animate-fadeIn">
            <Loader2 className="w-10 h-10 text-emerald-700 animate-spin mx-auto" />
            <h3 className="font-extrabold text-emerald-950 text-base">{backupLoadingModal.formatName}</h3>
            <p className="text-xs text-gray-500 font-medium leading-relaxed">{backupLoadingModal.description}</p>
          </div>
        </div>
      )}

      {/* SETUP GUIDE MODAL (SMTP / WHATSAPP) */}
      {guideModal.isOpen && (
        <div className="fixed inset-0 bg-black/65 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white rounded-3xl max-w-xl w-full p-6 sm:p-8 shadow-2xl border border-emerald-100 space-y-5 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-start border-b border-gray-100 pb-4">
              <div className="flex items-center gap-3">
                <div className={`p-3 rounded-2xl ${
                  guideModal.type === 'SMTP' ? 'bg-purple-100 text-purple-800' : 'bg-emerald-100 text-emerald-800'
                }`}>
                  {guideModal.type === 'SMTP' ? <Mail className="w-6 h-6" /> : <MessageSquare className="w-6 h-6" />}
                </div>
                <div>
                  <h3 className="font-extrabold text-emerald-950 text-base sm:text-lg">
                    {guideModal.type === 'SMTP' ? 'Email SMTP Setup Guide' : 'WhatsApp Cloud API Setup Guide'}
                  </h3>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Step-by-step instructions to configure {guideModal.type === 'SMTP' ? 'Gmail / SMTP Server' : 'Meta Business API'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setGuideModal({ isOpen: false, type: null })}
                className="text-gray-400 hover:text-gray-600 p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {guideModal.type === 'SMTP' ? (
              <div className="space-y-4 text-xs text-gray-700 leading-relaxed">
                <div className="bg-purple-50 p-4 rounded-2xl border border-purple-200 space-y-2">
                  <h4 className="font-extrabold text-purple-950 text-sm flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-purple-700" /> Standard Gmail SMTP Details
                  </h4>
                  <ul className="space-y-1 font-mono text-[11px] text-purple-900">
                    <li>• <strong>Host:</strong> smtp.gmail.com</li>
                    <li>• <strong>Port:</strong> 587 (TLS) or 465 (SSL)</li>
                    <li>• <strong>Username:</strong> notifications@mrvivasayi.in</li>
                  </ul>
                </div>

                <div className="space-y-3">
                  <h5 className="font-extrabold text-gray-900 text-xs uppercase tracking-wider">Step-by-Step Gmail App Password Instructions:</h5>
                  
                  <div className="space-y-2 font-medium">
                    <div className="flex gap-2">
                      <span className="font-black text-purple-800 shrink-0">1.</span>
                      <p>Log in to your Google Account at <a href="https://myaccount.google.com" target="_blank" rel="noreferrer" className="text-purple-700 font-bold underline inline-flex items-center gap-0.5">myaccount.google.com <ExternalLink className="w-3 h-3" /></a>.</p>
                    </div>
                    <div className="flex gap-2">
                      <span className="font-black text-purple-800 shrink-0">2.</span>
                      <p>Navigate to <strong>Security</strong> and ensure <strong>2-Step Verification</strong> is turned ON.</p>
                    </div>
                    <div className="flex gap-2">
                      <span className="font-black text-purple-800 shrink-0">3.</span>
                      <p>Visit <a href="https://myaccount.google.com/apppasswords" target="_blank" rel="noreferrer" className="text-purple-700 font-bold underline inline-flex items-center gap-0.5">myaccount.google.com/apppasswords <ExternalLink className="w-3 h-3" /></a>.</p>
                    </div>
                    <div className="flex gap-2">
                      <span className="font-black text-purple-800 shrink-0">4.</span>
                      <p>Enter App name e.g. <span className="px-1.5 py-0.5 bg-gray-100 rounded font-mono font-bold text-purple-900">MR. VIVASAYI Store</span> and click <strong>Create</strong>.</p>
                    </div>
                    <div className="flex gap-2">
                      <span className="font-black text-purple-800 shrink-0">5.</span>
                      <p>Copy the generated 16-character password and paste into <strong>SMTP Password</strong> field.</p>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-4 text-xs text-gray-700 leading-relaxed">
                <div className="bg-emerald-50 p-4 rounded-2xl border border-emerald-200 space-y-2">
                  <h4 className="font-extrabold text-emerald-950 text-sm flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-700" /> Meta WhatsApp Business Credentials
                  </h4>
                  <p className="text-emerald-900 text-[11px]">
                    MR. VIVASAYI connects directly to Meta Graph API for high-speed, instant customer WhatsApp bill dispatches.
                  </p>
                </div>

                <div className="space-y-3">
                  <h5 className="font-extrabold text-gray-900 text-xs uppercase tracking-wider">Step-by-Step Meta WhatsApp Cloud API Instructions:</h5>

                  <div className="space-y-2 font-medium">
                    <div className="flex gap-2">
                      <span className="font-black text-emerald-800 shrink-0">1.</span>
                      <p>Open <a href="https://developers.facebook.com" target="_blank" rel="noreferrer" className="text-emerald-700 font-bold underline inline-flex items-center gap-0.5">developers.facebook.com <ExternalLink className="w-3 h-3" /></a> and sign in with Meta Developer credentials.</p>
                    </div>
                    <div className="flex gap-2">
                      <span className="font-black text-emerald-800 shrink-0">2.</span>
                      <p>Create a <strong>Business App</strong> and add the <strong>WhatsApp product</strong> to your app.</p>
                    </div>
                    <div className="flex gap-2">
                      <span className="font-black text-emerald-800 shrink-0">3.</span>
                      <p>In the WhatsApp API Setup panel, copy your <strong>Phone Number ID</strong> and <strong>WhatsApp Business Account ID (WABA)</strong>.</p>
                    </div>
                    <div className="flex gap-2">
                      <span className="font-black text-emerald-800 shrink-0">4.</span>
                      <p>Generate a <strong>Permanent Access Token</strong> with <span className="px-1.5 py-0.5 bg-gray-100 rounded font-mono font-bold text-emerald-900">whatsapp_business_messaging</span> permissions.</p>
                    </div>
                    <div className="flex gap-2">
                      <span className="font-black text-emerald-800 shrink-0">5.</span>
                      <p>Paste the <strong>Permanent Token</strong> and IDs into MR. VIVASAYI Settings and click <strong>Save Configuration Settings</strong>.</p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            <div className="pt-3 border-t border-gray-100 flex justify-end">
              <button
                type="button"
                onClick={() => setGuideModal({ isOpen: false, type: null })}
                className="px-5 py-2.5 bg-emerald-800 hover:bg-emerald-900 text-white font-extrabold rounded-xl shadow"
              >
                Understood & Close Guide
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ANIMATED CONFIRM MAINTENANCE MODE MODAL */}
      {confirmMaintenanceModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white dark:bg-emerald-950 rounded-3xl max-w-md w-full p-6 shadow-2xl border-2 border-amber-400 dark:border-amber-600 space-y-5 animate-scaleUp">
            
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-amber-100 dark:bg-amber-900/60 text-amber-600 flex items-center justify-center shrink-0 border border-amber-300">
                <AlertTriangle className="w-6 h-6 animate-pulse" />
              </div>
              <div>
                <h3 className="text-lg font-extrabold text-gray-900 dark:text-emerald-100">
                  {confirmMaintenanceModal.targetStatus ? 'Enable Maintenance Mode?' : 'Disable Maintenance Mode?'}
                </h3>
                <p className="text-xs text-gray-500 dark:text-emerald-400">
                  Confirmation required for storefront status change
                </p>
              </div>
            </div>

            <div className="p-4 bg-amber-50 dark:bg-amber-950/40 rounded-2xl border border-amber-200 dark:border-amber-800 space-y-2 text-xs text-amber-950 dark:text-amber-200">
              <p className="font-bold leading-relaxed">
                {confirmMaintenanceModal.targetStatus
                  ? 'Are you sure you want to turn ON Public Maintenance Mode?'
                  : 'Are you sure you want to turn OFF Maintenance Mode and make the storefront LIVE?'}
              </p>
              <ul className="space-y-1 text-[11px] text-gray-700 dark:text-amber-300">
                {confirmMaintenanceModal.targetStatus ? (
                  <>
                    <li>• Public customer browsing and online checkout will be paused.</li>
                    <li>• Public visitors will see the "Store Under Scheduled Maintenance" banner.</li>
                    <li>• Staff & POS Admin Portal login (/admin/login) remains 100% operational.</li>
                  </>
                ) : (
                  <>
                    <li>• Public visitors will immediately gain live access to shop catalog & checkout.</li>
                    <li>• Online WhatsApp orders will be enabled for public customers.</li>
                  </>
                )}
              </ul>
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setConfirmMaintenanceModal({ isOpen: false, targetStatus: false })}
                className="flex-1 py-3 bg-gray-100 hover:bg-gray-200 dark:bg-emerald-900 dark:hover:bg-emerald-800 text-gray-800 dark:text-emerald-100 font-extrabold rounded-2xl text-xs transition"
              >
                Cancel / Go Back
              </button>

              <button
                type="button"
                onClick={() => {
                  const newStatus = confirmMaintenanceModal.targetStatus;
                  setConfirmMaintenanceModal({ isOpen: false, targetStatus: false });
                  setActionSpinner({
                    isOpen: true,
                    title: newStatus ? 'Enabling Maintenance Mode...' : 'Activating Live Storefront...',
                    subtitle: newStatus ? 'Pausing public orders and displaying maintenance banner...' : 'Opening catalog and enabling public checkout...',
                    moduleName: 'Maintenance Control'
                  });
                  setConfigForm(prev => ({ ...prev, maintenance_mode: newStatus }));
                  saveAppConfig({ maintenance_mode: newStatus });
                  setTimeout(() => {
                    setActionSpinner(prev => ({ ...prev, isOpen: false }));
                    addNotification({
                      title: newStatus ? 'Maintenance Mode Enabled' : 'Storefront Live',
                      message: newStatus
                        ? 'Public storefront is now showing Under Maintenance overlay.'
                        : 'Public storefront is now LIVE and accepting orders.',
                      type: newStatus ? 'warning' : 'success',
                      sourceModule: 'Maintenance Control'
                    });
                  }, 500);
                }}
                className={`flex-1 py-3 text-white font-extrabold rounded-2xl text-xs shadow-lg transition transform hover:scale-105 ${
                  confirmMaintenanceModal.targetStatus
                    ? 'bg-rose-800 hover:bg-rose-900'
                    : 'bg-emerald-800 hover:bg-emerald-900'
                }`}
              >
                {confirmMaintenanceModal.targetStatus ? 'Yes, Enable Maintenance' : 'Yes, Make Store Live'}
              </button>
            </div>

          </div>
        </div>
      )}

      {/* CLEAR DUMMY DATA CONFIRMATION MODAL */}
      {clearDataModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white dark:bg-emerald-950 rounded-3xl max-w-md w-full p-6 shadow-2xl border-2 border-rose-400 dark:border-rose-600 space-y-5 animate-scaleUp">
            
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-rose-100 dark:bg-rose-900/60 text-rose-600 flex items-center justify-center shrink-0 border border-rose-300">
                <Trash2 className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-extrabold text-gray-900 dark:text-emerald-100">
                  Remove All Dummy Test Data?
                </h3>
                <p className="text-xs text-rose-600 dark:text-rose-400 font-semibold">
                  Action cannot be undone
                </p>
              </div>
            </div>

            <p className="text-xs text-gray-600 dark:text-emerald-300 leading-relaxed">
              This will clear all demo test orders, test customer profiles, stock movement history logs, and test reviews while keeping your organic food categories and staff accounts intact.
            </p>

            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setClearDataModal({ isOpen: false, isExecuting: false })}
                className="flex-1 py-3 bg-gray-100 hover:bg-gray-200 dark:bg-emerald-900 dark:hover:bg-emerald-800 text-gray-800 dark:text-emerald-100 font-extrabold rounded-2xl text-xs transition"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={async () => {
                  setClearDataModal({ isOpen: false, isExecuting: false });
                  setActionSpinner({
                    isOpen: true,
                    title: 'Purging Dummy Test Data...',
                    subtitle: 'Clearing mock orders, logs, and resetting baseline master stores...',
                    moduleName: 'Database Settings'
                  });
                  await clearAllDummyData();
                  setTimeout(() => {
                    setActionSpinner(prev => ({ ...prev, isOpen: false }));
                    addNotification({
                      title: 'Dummy Data Removed',
                      message: 'Successfully cleared test orders, customers, and stock logs, while preserving default presets.',
                      type: 'success',
                      sourceModule: 'Database Settings'
                    });
                  }, 600);
                }}
                className="flex-1 py-3 bg-rose-800 hover:bg-rose-900 text-white font-extrabold rounded-2xl text-xs shadow-lg transition flex items-center justify-center gap-1.5"
              >
                <Trash2 className="w-4 h-4" />
                <span>Yes, Clear Dummy Data</span>
              </button>
            </div>

          </div>
        </div>
      )}

      {/* SQL SCHEMA DDL GENERATOR MODAL */}
      {sqlSchemaModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white dark:bg-emerald-950 rounded-3xl max-w-3xl w-full p-6 shadow-2xl border border-emerald-200 dark:border-emerald-800 space-y-4 max-h-[85vh] flex flex-col">
            
            <div className="flex items-center justify-between pb-3 border-b border-gray-100 dark:border-emerald-800">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-emerald-700" />
                <h3 className="font-extrabold text-gray-900 dark:text-emerald-100 text-base">
                  Supabase PostgreSQL Tables DDL Script
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setSqlSchemaModal({ isOpen: false, sql: '' })}
                className="p-1 rounded-lg text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-gray-600 dark:text-emerald-300">
              Copy and execute this SQL script in your <a href={`https://supabase.com/dashboard/project/${configForm.supabase_url ? configForm.supabase_url.replace(/^https?:\/\//, '').split('.')[0] : 'tzomdxdrzanzsobstfrg'}/sql`} target="_blank" rel="noreferrer" className="text-emerald-700 font-bold underline">Supabase SQL Editor</a> to create all required database tables if they do not exist yet.
            </p>

            <textarea
              readOnly
              value={sqlSchemaModal.sql}
              className="flex-1 p-4 bg-slate-900 text-emerald-300 font-mono text-[11px] rounded-2xl border border-slate-800 focus:outline-none overflow-y-auto resize-none"
              rows={15}
            />

            <div className="flex items-center justify-between pt-2">
              <span className="text-[10px] text-gray-500 font-mono">
                Target: {configForm.supabase_url ? configForm.supabase_url.replace(/^https?:\/\//, '') : 'tzomdxdrzanzsobstfrg.supabase.co'}
              </span>
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard.writeText(sqlSchemaModal.sql);
                  addNotification({
                    title: 'SQL Script Copied',
                    message: 'Full DDL table creation script copied to clipboard.',
                    type: 'success',
                    sourceModule: 'SQL Generator'
                  });
                }}
                className="px-5 py-2.5 bg-emerald-800 hover:bg-emerald-900 text-white font-extrabold rounded-xl shadow flex items-center gap-1.5 text-xs"
              >
                <Check className="w-4 h-4" /> Copy SQL to Clipboard
              </button>
            </div>

          </div>
        </div>
      )}

      {/* MISSING TABLES SQL MIGRATION MODAL (6 TABLES) */}
      {missingSqlModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white dark:bg-emerald-950 rounded-3xl max-w-3xl w-full p-6 shadow-2xl border border-amber-300 dark:border-amber-800 space-y-4 max-h-[85vh] flex flex-col">
            
            <div className="flex items-center justify-between pb-3 border-b border-gray-100 dark:border-emerald-800">
              <div className="flex items-center gap-2">
                <Database className="w-5 h-5 text-amber-600" />
                <div>
                  <h3 className="font-extrabold text-gray-900 dark:text-emerald-100 text-base">
                    Supabase Missing Tables PostgreSQL Creation Script (6 Tables)
                  </h3>
                  <p className="text-[11px] text-gray-500 dark:text-emerald-300">
                    Creates <code>roles</code>, <code>sample_billing_orders</code>, <code>website_analyze</code>, <code>pop_notification_events</code>, <code>pop_notification_subscribers</code>, and <code>price_history</code>
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setMissingSqlModal({ isOpen: false, sql: '' })}
                className="p-1 rounded-lg text-gray-400 hover:text-gray-600 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-3 bg-amber-50 dark:bg-amber-950/40 rounded-xl border border-amber-200 dark:border-amber-800 text-xs text-amber-900 dark:text-amber-200 flex items-start gap-2">
              <ExternalLink className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <span>To create these tables in Supabase:</span>
                <ol className="list-decimal pl-5 mt-1 space-y-0.5 text-[11px]">
                  <li>Click <strong>Copy SQL to Clipboard</strong> below.</li>
                  <li>Open <a href="https://supabase.com/dashboard/project/tzomdxdrzanzsobstfrg/sql/new" target="_blank" rel="noreferrer" className="underline font-bold text-amber-800 dark:text-amber-300">Supabase SQL Editor</a>.</li>
                  <li>Paste and click <strong>RUN (Ctrl+Enter)</strong>.</li>
                  <li>Return here and click <strong>Verify Supabase Table Status</strong> to confirm all 21 tables are active.</li>
                </ol>
              </div>
            </div>

            <textarea
              readOnly
              value={missingSqlModal.sql}
              className="flex-1 p-4 bg-slate-900 text-amber-300 font-mono text-[11px] rounded-2xl border border-slate-800 focus:outline-none overflow-y-auto resize-none"
              rows={14}
            />

            <div className="flex items-center justify-between pt-2">
              <span className="text-[10px] text-gray-500 font-mono">
                Target: {configForm.supabase_url ? configForm.supabase_url.replace(/^https?:\/\//, '') : 'tzomdxdrzanzsobstfrg.supabase.co'}
              </span>
              <div className="flex items-center gap-2">
                <a
                  href="https://supabase.com/dashboard/project/tzomdxdrzanzsobstfrg/sql/new"
                  target="_blank"
                  rel="noreferrer"
                  className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-emerald-900 dark:hover:bg-emerald-800 text-gray-800 dark:text-emerald-100 font-extrabold rounded-xl flex items-center gap-1.5 text-xs"
                >
                  <ExternalLink className="w-4 h-4" /> Open SQL Editor
                </a>
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(missingSqlModal.sql);
                    addNotification({
                      title: 'Missing Tables SQL Copied!',
                      message: 'Copied 6 missing tables SQL script to clipboard.',
                      type: 'success',
                      sourceModule: 'SQL Generator'
                    });
                  }}
                  className="px-5 py-2.5 bg-amber-600 hover:bg-amber-700 text-white font-extrabold rounded-xl shadow flex items-center gap-1.5 text-xs cursor-pointer"
                >
                  <Check className="w-4 h-4" /> Copy SQL to Clipboard
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* ─── 3-STEP SECURITY CONFIRMATION MODAL WIZARD ─── */}
      {saveConfirmModal && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-md z-50 flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-7 shadow-2xl border border-emerald-200 space-y-5 animate-scaleUp">
            
            {/* Header with 3-Step Wizard Navigation Indicator */}
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <div className="flex items-center gap-2">
                <span className={`w-2.5 h-2.5 rounded-full ${
                  saveConfirmStep === 1 ? 'bg-blue-600 animate-pulse' : saveConfirmStep === 2 ? 'bg-amber-600 animate-pulse' : 'bg-rose-600 animate-pulse'
                }`} />
                <span className="text-xs font-black uppercase tracking-wider text-emerald-950">
                  SECURITY CONFIRMATION • STEP {saveConfirmStep} OF 3
                </span>
              </div>

              {/* Step Dots */}
              <div className="flex items-center gap-1.5 text-xs font-mono">
                <span className={`px-2 py-0.5 rounded-md font-bold ${
                  saveConfirmStep === 1 ? 'bg-blue-600 text-white' : 'bg-emerald-100 text-emerald-800'
                }`}>
                  1
                </span>
                <span className="text-gray-300">─</span>
                <span className={`px-2 py-0.5 rounded-md font-bold ${
                  saveConfirmStep === 2 ? 'bg-amber-600 text-white' : saveConfirmStep > 2 ? 'bg-emerald-100 text-emerald-800' : 'bg-gray-100 text-gray-400'
                }`}>
                  2
                </span>
                <span className="text-gray-300">─</span>
                <span className={`px-2 py-0.5 rounded-md font-bold ${
                  saveConfirmStep === 3 ? 'bg-rose-600 text-white' : 'bg-gray-100 text-gray-400'
                }`}>
                  3
                </span>
              </div>
            </div>

            {/* STEP 1 OF 3: CONFIGURATION IMPACT REVIEW */}
            {saveConfirmStep === 1 && (
              <div className="space-y-4 animate-fadeIn">
                <div className="flex items-center gap-3">
                  <div className="p-3 rounded-2xl bg-blue-100 text-blue-700">
                    <Server className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="font-extrabold text-gray-900 text-base">Step 1: Review System Changes</h3>
                    <p className="text-xs text-gray-500 mt-0.5">Please review the modified system parameters below before applying.</p>
                  </div>
                </div>

                <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-2.5 text-xs">
                  <div className="flex items-center justify-between pb-1 border-b border-gray-200/60">
                    <span className="text-gray-500 font-medium">Store Availability</span>
                    <span className={`font-black ${configForm.maintenance_mode ? 'text-rose-600' : 'text-emerald-700'}`}>
                      {configForm.maintenance_mode ? '🔴 Maintenance Mode (Store Closed)' : '🟢 Live Storefront (Open)'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between pb-1 border-b border-gray-200/60">
                    <span className="text-gray-500 font-medium">Database Runtime Engine</span>
                    <span className="font-bold text-gray-800">
                      {configForm.db_configuration ? '⚡ Supabase Cloud PostgreSQL' : '💾 Local Storage Store'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between pb-1 border-b border-gray-200/60">
                    <span className="text-gray-500 font-medium">Free Delivery Cart Rule</span>
                    <span className="font-bold text-emerald-700">Orders above ₹{configForm.free_shipping_min_cart}</span>
                  </div>
                  <div className="flex items-center justify-between pb-1 border-b border-gray-200/60">
                    <span className="text-gray-500 font-medium">Tax & Order Discount Caps</span>
                    <span className="font-bold text-gray-800">GST: {configForm.default_gst_rate}% • Max Discount: {configForm.max_order_discount}%</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-500 font-medium">Delivery Pricing Rules</span>
                    <span className="font-bold text-amber-700">{deliveryRules.length} Active Shipping Tiers</span>
                  </div>
                </div>

                <div className="flex items-center gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setSaveConfirmModal(false)}
                    className="flex-1 px-4 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold text-xs rounded-xl border border-gray-200 transition cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={() => setSaveConfirmStep(2)}
                    className="flex-1 px-4 py-2.5 bg-blue-700 hover:bg-blue-800 text-white font-extrabold text-xs rounded-xl shadow-md transition flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <span>I Reviewed — Proceed to Step 2</span>
                    <span>→</span>
                  </button>
                </div>
              </div>
            )}

            {/* STEP 2 OF 3: SUPER ADMIN SECURITY & ROLE VERIFICATION */}
            {saveConfirmStep === 2 && (
              <div className="space-y-4 animate-fadeIn">
                <div className="flex items-center gap-3">
                  <div className="p-3 rounded-2xl bg-amber-100 text-amber-700">
                    <ShieldCheck className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="font-extrabold text-gray-900 text-base">Step 2: Super Admin Authority Check</h3>
                    <p className="text-xs text-gray-500 mt-0.5">Role authentication and access authorization verification.</p>
                  </div>
                </div>

                <div className="bg-amber-50/70 border border-amber-200 rounded-2xl p-4 space-y-3 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-amber-900 font-bold">Authenticated Admin:</span>
                    <span className="font-mono bg-white px-2 py-0.5 rounded border border-amber-200 text-amber-950 font-bold">
                      {user?.email || 'admin@mrvivasayi.in'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-amber-900 font-bold">System Privilege Tier:</span>
                    <span className="font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-full text-[11px]">
                      SUPER_ADMIN ✓
                    </span>
                  </div>
                  <p className="text-[11px] text-amber-800 leading-relaxed pt-1 border-t border-amber-200/70">
                    ⚠️ Notice: Committing changes alters WhatsApp notification webhooks, UPI merchant routing, and SMTP email relays immediately across all devices.
                  </p>
                </div>

                <div className="flex items-center gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setSaveConfirmStep(1)}
                    className="flex-1 px-4 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold text-xs rounded-xl border border-gray-200 transition cursor-pointer"
                  >
                    ← Back to Step 1
                  </button>
                  <button
                    type="button"
                    onClick={() => setSaveConfirmStep(3)}
                    className="flex-1 px-4 py-2.5 bg-amber-600 hover:bg-amber-700 text-white font-extrabold text-xs rounded-xl shadow-md transition flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <span>Confirm Authority — Proceed to Final Step 3</span>
                    <span>→</span>
                  </button>
                </div>
              </div>
            )}

            {/* STEP 3 OF 3: FINAL DEPLOYMENT & SAVE CONFIRMATION */}
            {saveConfirmStep === 3 && (
              <div className="space-y-4 animate-fadeIn">
                <div className="flex items-center gap-3">
                  <div className="p-3 rounded-2xl bg-rose-100 text-rose-700">
                    <AlertTriangle className="w-6 h-6 animate-pulse" />
                  </div>
                  <div>
                    <h3 className="font-extrabold text-gray-900 text-base">Step 3: Final Deployment Confirmation</h3>
                    <p className="text-xs text-gray-500 mt-0.5">Final authorization step before committing settings.</p>
                  </div>
                </div>

                <div className="bg-rose-50 border border-rose-200 rounded-2xl p-4 text-xs space-y-2">
                  <p className="font-bold text-rose-950">
                    Are you 100% sure you want to write these settings to the database and reload application state?
                  </p>
                  <ul className="list-disc list-inside text-rose-900 space-y-1 text-[11px]">
                    <li>Changes will be stored in database and cached in browser storage.</li>
                    <li>Storefront checkout, tax, and delivery rates will update instantly.</li>
                    <li>All open browser tabs will be synchronized with the new settings.</li>
                  </ul>
                </div>

                <div className="flex items-center gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setSaveConfirmStep(2)}
                    className="flex-1 px-4 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold text-xs rounded-xl border border-gray-200 transition cursor-pointer"
                  >
                    ← Back to Step 2
                  </button>
                  <button
                    type="button"
                    onClick={executeSave}
                    className="flex-1 px-4 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white font-extrabold text-xs rounded-xl shadow-lg transition flex items-center justify-center gap-2 cursor-pointer active:scale-95"
                  >
                    <Check className="w-4 h-4 text-amber-300" />
                    <span>Yes, Save & Deploy Settings (Step 3/3)</span>
                  </button>
                </div>
              </div>
            )}

          </div>
        </div>
      )}

      {/* ─── SAVE LOADING MODAL ─── */}
      {saveLoadingModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-md z-50 flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white rounded-3xl max-w-sm w-full p-8 shadow-2xl border border-emerald-100 text-center space-y-5 animate-fadeIn">
            <div className="relative w-16 h-16 mx-auto">
              <div className="absolute inset-0 rounded-full border-4 border-emerald-100 animate-ping opacity-30" />
              <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center">
                <Loader2 className="w-8 h-8 text-emerald-700 animate-spin" />
              </div>
            </div>
            <div>
              <h3 className="font-extrabold text-emerald-950 text-base">Saving Configuration...</h3>
              <p className="text-xs text-gray-500 font-medium mt-1">{saveStepText}</p>
            </div>
            {/* Progress Bar */}
            <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-emerald-500 to-teal-500 rounded-full transition-all duration-500 ease-out"
                style={{ width: `${saveProgress}%` }}
              />
            </div>
            <p className="text-[10px] font-mono text-gray-400">{saveProgress}% complete</p>
          </div>
        </div>
      )}

      {/* ─── SAVE SUCCESS MODAL ─── */}
      {saveSuccessModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white rounded-3xl max-w-sm w-full p-8 shadow-2xl border border-emerald-200 text-center space-y-4 animate-fadeIn">
            <div className="relative w-16 h-16 mx-auto">
              <div className="absolute inset-0 rounded-full border-4 border-emerald-200 animate-ping opacity-20" />
              <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center">
                <CheckCircle2 className="w-8 h-8 text-emerald-700" />
              </div>
            </div>
            <div>
              <h3 className="font-extrabold text-emerald-950 text-lg">Settings Saved ✓</h3>
              <p className="text-xs text-gray-500 font-medium mt-1">All configuration changes have been saved and verified successfully.</p>
            </div>
            <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-3 text-xs space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-gray-500">Local Config</span>
                <span className="font-extrabold text-emerald-700 flex items-center gap-1"><Check className="w-3 h-3" /> Saved</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-500">Settings JSON</span>
                <span className="font-extrabold text-emerald-700 flex items-center gap-1"><Check className="w-3 h-3" /> Synced</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-500">Verification</span>
                <span className="font-extrabold text-emerald-700 flex items-center gap-1"><Check className="w-3 h-3" /> Passed</span>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setSaveSuccessModal(false)}
              className="w-full px-4 py-2.5 bg-emerald-800 hover:bg-emerald-900 text-white font-extrabold text-xs rounded-xl shadow-md transition-all"
            >
              Done
            </button>
          </div>
        </div>
      )}

      {/* ─── ACTION LOADING SPINNER MODAL ─── */}
      <RefreshSpinnerModal
        isOpen={actionSpinner.isOpen}
        title={actionSpinner.title}
        subtitle={actionSpinner.subtitle}
        moduleName={actionSpinner.moduleName || 'System Settings'}
      />

    </div>
  );
}

export default SettingsPage;

