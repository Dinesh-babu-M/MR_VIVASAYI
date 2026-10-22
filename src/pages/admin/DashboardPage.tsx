import React from 'react';
import { Link } from 'react-router-dom';
import { 
  TrendingUp, ShoppingCart, Users, AlertTriangle, MessageSquare, 
  ArrowUpRight, DollarSign, Package, Clock, ShieldCheck, CheckCircle2, ChevronRight,
  Boxes, Truck, FileText, Globe, Award, Shield, UserCheck, RefreshCw,
  BarChart3, PieChart, Layers, Wallet, ArrowDownRight, Activity, Percent, Sparkles,
  Database, Filter, Banknote, Landmark, Receipt, Coins, Scale,
  ChevronDown, ChevronUp, Maximize2, Minimize2, Eye, X, Info
} from 'lucide-react';
import { formatPrice } from '../../lib/utils';
import { useAuth } from '../../contexts/AuthContext';
import { getJSONStore, isLiveDatabaseMode, SYSTEM_STAFF_USERS } from '../../lib/dbManager';
import { RefreshSpinnerModal } from '../../components/common/RefreshSpinnerModal';
import { DashboardSkeleton } from '../../components/common/Skeleton';
import { AutoRefreshDropdown } from '../../components/common/AutoRefreshDropdown';
import type { Order, Product, UserProfile, Expense, Category } from '../../types';

// Helper to check if date string is today
const isToday = (dateStr?: string) => {
  if (!dateStr) return true;
  const d = new Date(dateStr);
  const now = new Date();
  return d.getDate() === now.getDate() &&
    d.getMonth() === now.getMonth() &&
    d.getFullYear() === now.getFullYear();
};

// ---- Role 1: SUPER_ADMIN Master Dashboard ----
const SuperAdminDashboard: React.FC = () => {
  const [orders, setOrders] = React.useState<Order[]>([]);
  const [products, setProducts] = React.useState<Product[]>([]);
  const [staffList, setStaffList] = React.useState<UserProfile[]>([]);
  const [expenses, setExpenses] = React.useState<Expense[]>([]);
  const [categories, setCategories] = React.useState<Category[]>([]);
  const [isRefreshing, setIsRefreshing] = React.useState(false);
  const [loading, setLoading] = React.useState(true);
  const isDB = isLiveDatabaseMode();

  // Grafana-Style Live Auto Refresh & Filtering
  const [autoRefreshSec, setAutoRefreshSec] = React.useState<number>(0); // 0 = off, 1 = 1s, 2 = 2s, 5 = 5s
  const [selectedTimeframe, setSelectedTimeframe] = React.useState<'ALL' | 'TODAY' | '7D' | '30D'>('ALL');
  const [selectedSource, setSelectedSource] = React.useState<'ALL' | 'WHATSAPP' | 'POS' | 'WEBSITE'>('ALL');
  const [selectedStatus, setSelectedStatus] = React.useState<'ALL' | 'DELIVERED' | 'CONFIRMED' | 'NEW' | 'CANCELLED'>('ALL');

  // Interactive Expand / Collapse States for the 3 Primary Cards
  const [isAllExpanded, setIsAllExpanded] = React.useState(false);
  const [expandedRevenue, setExpandedRevenue] = React.useState(false);
  const [expandedMargin, setExpandedMargin] = React.useState(false);
  const [expandedNetProfit, setExpandedNetProfit] = React.useState(false);
  const [showNetProfitModal, setShowNetProfitModal] = React.useState(false);

  const loadData = React.useCallback(async () => {
    try {
      const [o, p, u, e, c] = await Promise.all([
        getJSONStore<Order>('orders'),
        getJSONStore<Product>('products'),
        getJSONStore<UserProfile>('users'),
        getJSONStore<Expense>('expenses'),
        getJSONStore<Category>('categories')
      ]);
      setOrders(o || []);
      setProducts(p || []);
      setStaffList(u || []);
      setExpenses(e || []);
      setCategories(c || []);
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    loadData();
  }, [loadData]);

  // Live Auto-Refresh Interval
  React.useEffect(() => {
    if (!autoRefreshSec || autoRefreshSec <= 0) return;
    const interval = setInterval(() => {
      loadData();
    }, autoRefreshSec * 1000);
    return () => clearInterval(interval);
  }, [autoRefreshSec, loadData]);

  // Filtered Orders based on active dropdown controls
  const filteredOrders = React.useMemo(() => {
    return orders.filter(o => {
      // Timeframe filter
      if (selectedTimeframe === 'TODAY' && !isToday(o.created_at)) return false;
      if (selectedTimeframe === '7D' && o.created_at) {
        const diffDays = (Date.now() - new Date(o.created_at).getTime()) / (1000 * 3600 * 24);
        if (diffDays > 7) return false;
      }
      if (selectedTimeframe === '30D' && o.created_at) {
        const diffDays = (Date.now() - new Date(o.created_at).getTime()) / (1000 * 3600 * 24);
        if (diffDays > 30) return false;
      }

      // Source filter
      if (selectedSource !== 'ALL') {
        if (selectedSource === 'POS' && o.source !== 'POS' && o.source !== 'WALK_IN') return false;
        if (selectedSource !== 'POS' && o.source !== selectedSource) return false;
      }

      // Status filter
      if (selectedStatus !== 'ALL' && o.status !== selectedStatus) return false;

      return true;
    });
  }, [orders, selectedTimeframe, selectedSource, selectedStatus]);

  // Real-time calculated metrics: 3 Master Pillars (9 Granular Sub-Metrics)
  // Pillar 1: Store Revenue & Cash Flow
  const totalSales = filteredOrders.reduce((acc: number, o: Order) => acc + (o.total || 0), 0);
  const todayOrdersList = filteredOrders.filter(o => isToday(o.created_at));
  const todaySales = todayOrdersList.reduce((acc: number, o: Order) => acc + (o.total || 0), 0);
  const todayOrdersCount = filteredOrders.length;

  const collectedOrders = filteredOrders.filter((o: Order) => 
    o.payment_status === 'PAID' || 
    o.payment_method === 'CASH' || 
    o.payment_method === 'UPI' || 
    o.status === 'DELIVERED'
  );
  const collectedRevenue = collectedOrders.reduce((acc: number, o: Order) => acc + (o.total || 0), 0);
  const pendingReceivables = Math.max(0, totalSales - collectedRevenue);
  const pendingOrdersCount = filteredOrders.length - collectedOrders.length;
  const cashCollectionRate = totalSales > 0 ? ((collectedRevenue / totalSales) * 100).toFixed(1) : '100.0';
  const avgOrderValue = filteredOrders.length > 0 ? Math.round(totalSales / filteredOrders.length) : 0;

  const actualStaffCount = staffList.length > 0 ? staffList.length : Object.keys(SYSTEM_STAFF_USERS).length;

  // Pillar 2: Real-time exact COGS & Gross Profit
  const cogsTotal = filteredOrders.reduce((sum, order) => {
    const items = order.items || [];
    return sum + items.reduce((iSum, itm) => {
      const prod = products.find(p => p.id === itm.product_id || p.sku === itm.sku_snapshot);
      const landed = prod?.landed_cost || prod?.purchase_price || (itm.unit_price_snapshot ? itm.unit_price_snapshot * 0.7 : 0);
      return iSum + (itm.quantity * landed);
    }, 0);
  }, 0);

  const collectedCOGS = collectedOrders.reduce((sum, order) => {
    const items = order.items || [];
    return sum + items.reduce((iSum, itm) => {
      const prod = products.find(p => p.id === itm.product_id || p.sku === itm.sku_snapshot);
      const landed = prod?.landed_cost || prod?.purchase_price || (itm.unit_price_snapshot ? itm.unit_price_snapshot * 0.7 : 0);
      return iSum + (itm.quantity * landed);
    }, 0);
  }, 0);

  const grossProfit = totalSales - cogsTotal;
  const grossProfitMarginPercent = totalSales > 0 ? ((grossProfit / totalSales) * 100).toFixed(1) : '32.5';
  const inHandMargin = Math.max(0, collectedRevenue - collectedCOGS);
  const inHandMarginPercent = collectedRevenue > 0 ? ((inHandMargin / collectedRevenue) * 100).toFixed(1) : '30.0';

  // Pillar 3: Net Operating Profit & Solvency Coverage
  const totalOperatingExpenses = expenses.reduce((sum, e) => sum + (e.amount || 0), 0);
  const netOperatingProfit = grossProfit - totalOperatingExpenses;
  const netMarginPercent = totalSales > 0 ? ((netOperatingProfit / totalSales) * 100).toFixed(1) : '18.4';
  const overheadCoverageRatio = totalOperatingExpenses > 0 ? (grossProfit / totalOperatingExpenses).toFixed(2) : '12.4';

  // Total Inventory Capital Investment & Projected Returns
  const totalStockInvestment = products.reduce((acc: number, p: Product) => 
    acc + (p.current_stock || 0) * (p.landed_cost || p.purchase_price || 0), 0
  );
  const totalStockRetailReturn = products.reduce((acc: number, p: Product) => 
    acc + (p.current_stock || 0) * (p.selling_price || 0), 0
  );
  const potentialStockProfit = Math.max(0, totalStockRetailReturn - totalStockInvestment);
  const stockProfitMarginPercent = totalStockRetailReturn > 0 
    ? ((potentialStockProfit / totalStockRetailReturn) * 100).toFixed(1) 
    : '0.0';
  const totalStockUnits = products.reduce((acc: number, p: Product) => acc + (p.current_stock || 0), 0);

  const lowStockProducts = products.filter((p: Product) => (p.current_stock || 0) <= (p.reorder_level || 15));
  const outOfStockCount = products.filter((p: Product) => (p.current_stock || 0) <= 0).length;
  const healthyStockCount = products.length - lowStockProducts.length;

  const recentOrders = filteredOrders.slice(0, 6);

  // -------------------------------------------------------------
  // CHART 1 DATA: Past 7 Days Daily Revenue & Transaction Trend
  // -------------------------------------------------------------
  const last7DaysData = React.useMemo(() => {
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const result: { label: string; date: string; revenue: number; count: number }[] = [];
    const now = new Date();

    for (let i = 6; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(now.getDate() - i);
      const dateStr = d.toDateString();
      const dayLabel = days[d.getDay()];

      const dayOrders = filteredOrders.filter(o => {
        if (!o.created_at) return false;
        return new Date(o.created_at).toDateString() === dateStr;
      });
      const dayRevenue = dayOrders.reduce((sum, o) => sum + (o.total || 0), 0);

      result.push({
        label: i === 0 ? 'Today' : dayLabel,
        date: d.toLocaleDateString('en-IN', { month: 'short', day: 'numeric' }),
        revenue: dayRevenue,
        count: dayOrders.length
      });
    }

    return result;
  }, [filteredOrders]);

  // -------------------------------------------------------------
  // CHART 2 DATA: Channel Revenue Distribution (WhatsApp vs POS vs Web)
  // -------------------------------------------------------------
  const whatsappRevenue = filteredOrders.filter(o => o.source === 'WHATSAPP').reduce((s, o) => s + (o.total || 0), 0);
  const posRevenue = filteredOrders.filter(o => o.source === 'POS' || o.source === 'WALK_IN').reduce((s, o) => s + (o.total || 0), 0);
  const webRevenue = filteredOrders.filter(o => o.source === 'WEBSITE').reduce((s, o) => s + (o.total || 0), 0);
  
  const whatsappPct = totalSales > 0 ? Math.round((whatsappRevenue / totalSales) * 100) : 48;
  const posPct = totalSales > 0 ? Math.round((posRevenue / totalSales) * 100) : 34;
  const webPct = totalSales > 0 ? Math.round((webRevenue / totalSales) * 100) : 18;

  // -------------------------------------------------------------
  // CHART 3 DATA: Category Performance Analysis
  // -------------------------------------------------------------
  const categoryStats = React.useMemo(() => {
    const categoryTotals: Record<string, { name: string; revenue: number; count: number }> = {};

    filteredOrders.forEach(order => {
      (order.items || []).forEach(item => {
        const prod = products.find(p => p.id === item.product_id || p.sku === item.sku_snapshot);
        const catName = prod?.category_id || 'Heritage Staples';
        if (!categoryTotals[catName]) {
          categoryTotals[catName] = { name: catName, revenue: 0, count: 0 };
        }
        categoryTotals[catName].revenue += (item.total || (item.quantity * (item.unit_price_snapshot || 0)));
        categoryTotals[catName].count += item.quantity;
      });
    });

    const list = Object.values(categoryTotals);
    if (list.length === 0) {
      return [
        { name: 'Wood-Pressed Cold Oils', revenue: Math.round(totalSales * 0.42) || 12400, count: 28 },
        { name: 'Heritage Traditional Rice', revenue: Math.round(totalSales * 0.28) || 8900, count: 42 },
        { name: 'Native Farm Millets & Pulses', revenue: Math.round(totalSales * 0.18) || 5400, count: 21 },
        { name: 'Pure Spices & Natural Sweeteners', revenue: Math.round(totalSales * 0.12) || 3600, count: 16 }
      ];
    }
    return list.sort((a, b) => b.revenue - a.revenue).slice(0, 4);
  }, [filteredOrders, products, totalSales]);

  // -------------------------------------------------------------
  // CHART 4 DATA: Payment Method Split (UPI vs Cash vs Card)
  // -------------------------------------------------------------
  const paymentStats = React.useMemo(() => {
    const upiRevenue = filteredOrders.filter(o => o.payment_method === 'UPI').reduce((s, o) => s + (o.total || 0), 0);
    const cashRevenue = filteredOrders.filter(o => o.payment_method === 'CASH').reduce((s, o) => s + (o.total || 0), 0);
    const cardRevenue = filteredOrders.filter(o => o.payment_method === 'CARD' || o.payment_method === 'BANK').reduce((s, o) => s + (o.total || 0), 0);
    const otherRevenue = totalSales - upiRevenue - cashRevenue - cardRevenue;

    return {
      upi: { amount: upiRevenue, pct: totalSales > 0 ? Math.round((upiRevenue / totalSales) * 100) : 58 },
      cash: { amount: cashRevenue, pct: totalSales > 0 ? Math.round((cashRevenue / totalSales) * 100) : 32 },
      card: { amount: cardRevenue, pct: totalSales > 0 ? Math.round((cardRevenue / totalSales) * 100) : 10 },
      other: { amount: Math.max(0, otherRevenue), pct: 0 }
    };
  }, [filteredOrders, totalSales]);

  if (loading) {
    return <DashboardSkeleton />;
  }

  return (
    <div className="space-y-8 animate-fadeIn pb-12">
      <RefreshSpinnerModal
        isOpen={isRefreshing}
        moduleName="Command Center"
        title="Refreshing Master Dashboard Analytics..."
        subtitle="Syncing total sales, COGS gross margins, and live 6-chart business intelligence..."
        onComplete={() => {
          loadData();
          setIsRefreshing(false);
        }}
      />
      
      {/* Executive Welcome Hero Banner */}
      <div className="bg-gradient-to-r from-emerald-950 via-emerald-900 to-teal-950 text-white p-6 sm:p-8 rounded-3xl shadow-xl border border-emerald-800 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="flex items-center space-x-2 text-amber-300 text-xs font-bold uppercase tracking-wider mb-1">
            <ShieldCheck className="w-4 h-4" />
            <span>EXECUTIVE COMMAND CENTER — SUPER ADMIN</span>
            <span className="bg-emerald-800 text-emerald-200 px-2 py-0.5 rounded text-[10px] font-black border border-emerald-700 flex items-center gap-1">
              <Database className="w-3 h-3 text-amber-400" />
              {isDB ? 'Live Supabase DB' : 'JSON Offline Engine'}
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-serif font-bold text-white flex items-center gap-2">
            <span>Platform Master Command Center</span>
            <Sparkles className="w-5 h-5 text-amber-400 animate-pulse" />
          </h1>
          <p className="text-emerald-200 text-xs sm:text-sm mt-1 max-w-2xl">
            Real-time business performance analytics, gross profit velocity, channel revenue splits, inventory health, and multi-chart intelligence.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3 shrink-0">
          {/* Auto-Refresh Dropdown with presets (Off, 1s, 2s, 3s, 5s, 10s, 30s, 1min) & Custom Duration */}
          <AutoRefreshDropdown
            intervalSec={autoRefreshSec}
            onIntervalChange={setAutoRefreshSec}
            onRefresh={() => {
              loadData();
              setIsRefreshing(true);
            }}
            variant="emerald"
          />

          <button
            onClick={() => {
              loadData();
              setIsRefreshing(true);
            }}
            className="px-3.5 py-2 bg-emerald-800 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow border border-emerald-700 flex items-center gap-1.5 transition-all cursor-pointer"
          >
            <RefreshCw className={`w-4 h-4 text-amber-300 ${isRefreshing ? 'animate-spin' : ''}`} />
            <span>Sync Live</span>
          </button>

          <Link
            to="/admin/reports"
            className="px-4 py-2 bg-emerald-700 hover:bg-emerald-600 text-white font-extrabold text-xs rounded-xl shadow border border-emerald-600 transition-all flex items-center gap-1.5"
          >
            <BarChart3 className="w-4 h-4 text-amber-300" />
            <span>Reports Hub</span>
          </Link>
          <Link
            to="/admin/staff"
            className="px-4 py-2 bg-amber-400 hover:bg-amber-300 text-emerald-950 font-extrabold text-xs rounded-xl shadow transition-all flex items-center gap-1.5"
          >
            <UserCheck className="w-4 h-4" />
            <span>Staff ({actualStaffCount})</span>
          </Link>
        </div>
      </div>

      {/* Real Filter Toolbar for Metrics and Charts */}
      <div className="bg-white dark:bg-emerald-950 p-4 rounded-2xl border border-emerald-100 dark:border-emerald-800 shadow-sm flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex flex-wrap items-center gap-3">
          <span className="font-black text-emerald-950 dark:text-emerald-200 uppercase tracking-wider flex items-center gap-1.5">
            <Filter className="w-4 h-4 text-emerald-600" /> Telemetry Filters:
          </span>

          {/* Timeframe Filter */}
          <div className="flex items-center gap-1 bg-emerald-50 dark:bg-emerald-900/50 p-1 rounded-xl border border-emerald-200 dark:border-emerald-700">
            {(['ALL', 'TODAY', '7D', '30D'] as const).map(tf => (
              <button
                key={tf}
                onClick={() => setSelectedTimeframe(tf)}
                className={`px-3 py-1 rounded-lg font-bold text-xs transition ${
                  selectedTimeframe === tf
                    ? 'bg-emerald-800 text-white shadow'
                    : 'text-emerald-900 dark:text-emerald-300 hover:bg-emerald-100 dark:hover:bg-emerald-800'
                }`}
              >
                {tf === 'ALL' ? 'Lifetime' : tf === 'TODAY' ? 'Today' : tf === '7D' ? 'Last 7 Days' : 'Last 30 Days'}
              </button>
            ))}
          </div>

          {/* Source Filter */}
          <select
            value={selectedSource}
            onChange={(e) => setSelectedSource(e.target.value as any)}
            className="px-3 py-1.5 bg-emerald-50 dark:bg-emerald-900/50 border border-emerald-200 dark:border-emerald-700 rounded-xl font-bold text-emerald-900 dark:text-emerald-200 text-xs"
          >
            <option value="ALL">All Order Channels</option>
            <option value="WHATSAPP">WhatsApp Orders Only</option>
            <option value="POS">Store Counter POS Only</option>
            <option value="WEBSITE">Website Storefront Only</option>
          </select>

          {/* Status Filter */}
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value as any)}
            className="px-3 py-1.5 bg-emerald-50 dark:bg-emerald-900/50 border border-emerald-200 dark:border-emerald-700 rounded-xl font-bold text-emerald-900 dark:text-emerald-200 text-xs"
          >
            <option value="ALL">All Fulfillment Statuses</option>
            <option value="DELIVERED">Delivered Only</option>
            <option value="CONFIRMED">Confirmed Orders Only</option>
            <option value="NEW">New Pending Orders</option>
            <option value="CANCELLED">Cancelled Orders</option>
          </select>
        </div>

        <div className="text-[11px] font-bold text-emerald-700 dark:text-emerald-300 flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
          Showing {filteredOrders.length} of {orders.length} orders
        </div>
      </div>

      {/* ============================================================== */}
      {/* 3 PRIMARY EXPANDABLE CARDS (WITH 9 SUB-CARDS & STOCK ENGINE)  */}
      {/* ============================================================== */}
      <div className="space-y-6">
        {/* Section Header with Expand All Toggle */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-emerald-200 dark:border-emerald-800 pb-3">
          <div>
            <h2 className="text-lg font-bold font-serif text-emerald-950 dark:text-emerald-100 flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-emerald-600 dark:text-amber-400" />
              <span>Executive Financial Intelligence Suite</span>
            </h2>
            <p className="text-xs text-gray-500 dark:text-emerald-400">
              3 Primary performance cards • Click to expand sub-cards & explore Stock Investment Valuation
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                const next = !isAllExpanded;
                setIsAllExpanded(next);
                setExpandedRevenue(next);
                setExpandedMargin(next);
                setExpandedNetProfit(next);
              }}
              className="px-3.5 py-1.5 rounded-xl text-xs font-bold bg-white dark:bg-emerald-900 border border-emerald-200 dark:border-emerald-700 text-emerald-800 dark:text-emerald-200 shadow-sm hover:bg-emerald-50 dark:hover:bg-emerald-800 transition flex items-center gap-1.5"
            >
              {isAllExpanded ? <Minimize2 className="w-3.5 h-3.5 text-amber-500" /> : <Maximize2 className="w-3.5 h-3.5 text-emerald-600 dark:text-amber-400" />}
              <span>{isAllExpanded ? 'Collapse All Sub-Cards' : '⚡ Expand All 9 Cards'}</span>
            </button>
            <button
              onClick={() => setShowNetProfitModal(true)}
              className="px-3 py-1.5 rounded-xl text-xs font-bold bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-700 hover:to-teal-800 text-white shadow-sm transition flex items-center gap-1.5"
            >
              <Package className="w-3.5 h-3.5 text-amber-300" />
              <span>Stock & Profit Breakdown</span>
            </button>
          </div>
        </div>

        {/* 3 Master Primary Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* MASTER CARD 1: TOTAL STORE REVENUE */}
          <div className="bg-white dark:bg-emerald-950 p-6 rounded-3xl border border-emerald-100 dark:border-emerald-800 shadow-sm space-y-3 hover:shadow-md transition">
            <div className="flex justify-between items-start text-xs font-bold text-gray-500 dark:text-emerald-300">
              <div className="space-y-1">
                <span>TOTAL STORE REVENUE</span>
                <div>
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-gradient-to-b from-white to-emerald-50 dark:from-emerald-900 dark:to-emerald-950 text-emerald-900 dark:text-emerald-200 border border-emerald-300 dark:border-emerald-700 shadow-[0_2px_4px_rgba(0,0,0,0.08),inset_0_1px_0_rgba(255,255,255,0.9)] dark:shadow-[0_2px_4px_rgba(0,0,0,0.3),inset_0_1px_0_rgba(255,255,255,0.15)]">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
                    Gross Billed
                  </span>
                </div>
              </div>
              <div className="p-2.5 bg-emerald-100 dark:bg-emerald-900 text-emerald-700 dark:text-amber-400 rounded-2xl shadow-inner">
                <DollarSign className="w-4 h-4" />
              </div>
            </div>
            <div className="text-3xl font-black text-gray-900 dark:text-emerald-100 font-mono tracking-tight">
              {formatPrice(totalSales)}
            </div>
            <div className="text-xs text-emerald-700 dark:text-amber-300 font-bold flex items-center justify-between pt-1 border-t border-emerald-50 dark:border-emerald-900/60">
              <span className="flex items-center gap-1"><TrendingUp className="w-3.5 h-3.5" /> {filteredOrders.length} orders total</span>
              <button
                onClick={() => setExpandedRevenue(!expandedRevenue)}
                className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-emerald-50 dark:bg-emerald-900/50 text-[11px] font-extrabold text-emerald-800 dark:text-emerald-200 hover:bg-emerald-100 transition"
              >
                <span>{expandedRevenue || isAllExpanded ? 'Hide' : 'Expand 3 Cards'}</span>
                {expandedRevenue || isAllExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
              </button>
            </div>
          </div>

          {/* MASTER CARD 2: GROSS PROFIT MARGIN */}
          <div className="bg-white dark:bg-emerald-950 p-6 rounded-3xl border border-emerald-100 dark:border-emerald-800 shadow-sm space-y-3 hover:shadow-md transition">
            <div className="flex justify-between items-start text-xs font-bold text-gray-500 dark:text-emerald-300">
              <div className="space-y-1">
                <span>GROSS PROFIT MARGIN</span>
                <div>
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-gradient-to-b from-white to-teal-50 dark:from-teal-900 dark:to-emerald-950 text-teal-900 dark:text-teal-200 border border-teal-300 dark:border-teal-700 shadow-[0_2px_4px_rgba(0,0,0,0.08),inset_0_1px_0_rgba(255,255,255,0.9)] dark:shadow-[0_2px_4px_rgba(0,0,0,0.3),inset_0_1px_0_rgba(255,255,255,0.15)]">
                    <span className="w-1.5 h-1.5 rounded-full bg-teal-500 animate-pulse" />
                    Margin Velocity
                  </span>
                </div>
              </div>
              <div className="p-2.5 bg-emerald-100 dark:bg-emerald-900 text-emerald-700 dark:text-amber-400 rounded-2xl shadow-inner">
                <Percent className="w-4 h-4" />
              </div>
            </div>
            <div className="text-3xl font-black text-emerald-800 dark:text-amber-300 font-mono tracking-tight">
              {grossProfitMarginPercent}%
            </div>
            <div className="text-xs text-emerald-600 dark:text-emerald-400 font-bold flex items-center justify-between pt-1 border-t border-emerald-50 dark:border-emerald-900/60">
              <span>Gross Profit: {formatPrice(grossProfit)}</span>
              <button
                onClick={() => setExpandedMargin(!expandedMargin)}
                className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-teal-50 dark:bg-teal-950/50 text-[11px] font-extrabold text-teal-800 dark:text-teal-200 hover:bg-teal-100 transition"
              >
                <span>{expandedMargin || isAllExpanded ? 'Hide' : 'Expand 3 Cards'}</span>
                {expandedMargin || isAllExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
              </button>
            </div>
          </div>

          {/* MASTER CARD 3: NET OPERATING PROFIT (Interactive with Full Stock Engine) */}
          <div className="bg-white dark:bg-emerald-950 p-6 rounded-3xl border-2 border-emerald-400/80 dark:border-emerald-600/80 shadow-md space-y-3 hover:shadow-xl transition group relative overflow-hidden">
            <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-bl from-amber-400/15 via-emerald-400/10 to-transparent rounded-bl-full pointer-events-none" />
            <div className="flex justify-between items-start text-xs font-bold text-gray-500 dark:text-emerald-300">
              <div className="space-y-1">
                <div className="flex items-center gap-1.5">
                  <span className="text-emerald-950 dark:text-emerald-100 font-black">NET OPERATING PROFIT</span>
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                </div>
                <div>
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-gradient-to-b from-white to-emerald-50 dark:from-emerald-900 dark:to-emerald-950 text-emerald-900 dark:text-emerald-200 border border-emerald-300 dark:border-emerald-700 shadow-[0_2px_4px_rgba(0,0,0,0.08),inset_0_1px_0_rgba(255,255,255,0.9)] dark:shadow-[0_2px_4px_rgba(0,0,0,0.3),inset_0_1px_0_rgba(255,255,255,0.15)]">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
                    Retained EBITDA
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => setShowNetProfitModal(true)}
                  className="p-1.5 bg-amber-100 hover:bg-amber-200 dark:bg-amber-900/60 dark:hover:bg-amber-800 text-amber-900 dark:text-amber-200 rounded-xl transition shadow-sm"
                  title="Click to view detailed Stock Capital Investment & Profit Breakdown"
                >
                  <Eye className="w-3.5 h-3.5" />
                </button>
                <div className="p-2.5 bg-emerald-100 dark:bg-emerald-900 text-emerald-700 dark:text-amber-400 rounded-2xl shadow-inner">
                  <TrendingUp className="w-4 h-4" />
                </div>
              </div>
            </div>
            <div 
              onClick={() => setShowNetProfitModal(true)}
              className="text-3xl font-black text-emerald-900 dark:text-emerald-100 font-mono tracking-tight cursor-pointer hover:text-amber-600 transition"
              title="Click to open full Stock Investment & Net Operating Profit Breakdown"
            >
              {formatPrice(netOperatingProfit)}
            </div>
            <div className="text-xs text-emerald-700 dark:text-emerald-400 font-bold flex items-center justify-between pt-1 border-t border-emerald-100 dark:border-emerald-900/60">
              <span className="flex items-center gap-1"><Award className="w-3.5 h-3.5" /> {netMarginPercent}% Net after Opex</span>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setShowNetProfitModal(true)}
                  className="text-[10px] text-amber-700 dark:text-amber-300 font-extrabold hover:underline"
                >
                  Stock Breakdown ↗
                </button>
                <button
                  onClick={() => setExpandedNetProfit(!expandedNetProfit)}
                  className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-emerald-100 dark:bg-emerald-900 text-[11px] font-extrabold text-emerald-900 dark:text-emerald-200 hover:bg-emerald-200 transition"
                >
                  <span>{expandedNetProfit || isAllExpanded ? 'Hide' : 'Expand'}</span>
                  {expandedNetProfit || isAllExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* EXPANDABLE SECTION 1: REVENUE SUB-CARDS (Cards 1A, 1B, 1C) */}
        {(expandedRevenue || isAllExpanded) && (
          <div className="p-4 rounded-3xl bg-emerald-50/50 dark:bg-emerald-950/40 border border-emerald-200/80 dark:border-emerald-800/80 space-y-3 animate-fadeIn">
            <div className="text-xs font-black text-emerald-900 dark:text-emerald-200 uppercase tracking-wider flex items-center gap-2">
              <DollarSign className="w-4 h-4 text-emerald-600" />
              <span>Revenue Sub-Cards Breakdown (Billed vs Liquid Cash vs COD)</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Card 1A: Gross Billed Sales */}
              <div className="bg-white dark:bg-emerald-950 p-5 rounded-2xl border border-emerald-100 dark:border-emerald-800 shadow-sm space-y-2">
                <div className="flex justify-between items-center text-xs font-bold text-gray-500 dark:text-emerald-300">
                  <span>TOTAL GROSS BILLED</span>
                  <div className="p-1.5 bg-emerald-100 dark:bg-emerald-900 text-emerald-700 dark:text-amber-400 rounded-lg">
                    <DollarSign className="w-3.5 h-3.5" />
                  </div>
                </div>
                <div className="text-2xl font-black text-gray-900 dark:text-emerald-100 font-mono">{formatPrice(totalSales)}</div>
                <div className="text-xs text-emerald-700 dark:text-amber-300 font-bold flex items-center justify-between">
                  <span>{filteredOrders.length} processed orders</span>
                  <span>Today: {formatPrice(todaySales)}</span>
                </div>
              </div>

              {/* Card 1B: Liquid In-Hand Cash Flow */}
              <div className="bg-white dark:bg-emerald-950 p-5 rounded-2xl border border-emerald-100 dark:border-emerald-800 shadow-sm space-y-2">
                <div className="flex justify-between items-center text-xs font-bold text-gray-500 dark:text-emerald-300">
                  <span>IN-HAND LIQUID CASH</span>
                  <div className="p-1.5 bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300 rounded-lg">
                    <Banknote className="w-3.5 h-3.5" />
                  </div>
                </div>
                <div className="text-2xl font-black text-green-800 dark:text-green-300 font-mono">{formatPrice(collectedRevenue)}</div>
                <div className="text-xs text-green-700 dark:text-green-400 font-bold flex items-center justify-between">
                  <span>{cashCollectionRate}% Collected</span>
                  <span>AOV: {formatPrice(avgOrderValue)}</span>
                </div>
              </div>

              {/* Card 1C: COD & Outstanding Receivables */}
              <div className="bg-white dark:bg-emerald-950 p-5 rounded-2xl border border-emerald-100 dark:border-emerald-800 shadow-sm space-y-2">
                <div className="flex justify-between items-center text-xs font-bold text-gray-500 dark:text-emerald-300">
                  <span>COD & RECEIVABLES</span>
                  <div className="p-1.5 bg-amber-100 dark:bg-amber-900 text-amber-700 dark:text-amber-300 rounded-lg">
                    <Clock className="w-3.5 h-3.5" />
                  </div>
                </div>
                <div className="text-2xl font-black text-amber-700 dark:text-amber-300 font-mono">{formatPrice(pendingReceivables)}</div>
                <div className="text-xs text-amber-700 dark:text-amber-300 font-bold flex items-center justify-between">
                  <span>{pendingOrdersCount} orders in transit</span>
                  <span>{totalSales > 0 ? (100 - Number(cashCollectionRate)).toFixed(1) : 0}% pipeline</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* EXPANDABLE SECTION 2: GROSS MARGIN SUB-CARDS (Cards 2A, 2B, 2C) */}
        {(expandedMargin || isAllExpanded) && (
          <div className="p-4 rounded-3xl bg-teal-50/50 dark:bg-emerald-950/40 border border-teal-200/80 dark:border-teal-800/80 space-y-3 animate-fadeIn">
            <div className="text-xs font-black text-teal-900 dark:text-teal-200 uppercase tracking-wider flex items-center gap-2">
              <Percent className="w-4 h-4 text-teal-600" />
              <span>Gross Margin Sub-Cards Breakdown (Profit Spread vs Velocity vs Realized Margin)</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Card 2A: Product Gross Profit */}
              <div className="bg-white dark:bg-emerald-950 p-5 rounded-2xl border border-teal-100 dark:border-teal-800 shadow-sm space-y-2">
                <div className="flex justify-between items-center text-xs font-bold text-gray-500 dark:text-emerald-300">
                  <span>GROSS PROFIT SPREAD</span>
                  <div className="p-1.5 bg-emerald-100 dark:bg-emerald-900 text-emerald-700 dark:text-amber-400 rounded-lg">
                    <TrendingUp className="w-3.5 h-3.5" />
                  </div>
                </div>
                <div className="text-2xl font-black text-emerald-800 dark:text-amber-300 font-mono">{formatPrice(grossProfit)}</div>
                <div className="text-xs text-emerald-600 dark:text-emerald-400 font-bold flex items-center justify-between">
                  <span>Billed Sales - Landed Cost</span>
                  <span>COGS: {formatPrice(cogsTotal)}</span>
                </div>
              </div>

              {/* Card 2B: Gross Margin Velocity */}
              <div className="bg-white dark:bg-emerald-950 p-5 rounded-2xl border border-teal-100 dark:border-teal-800 shadow-sm space-y-2">
                <div className="flex justify-between items-center text-xs font-bold text-gray-500 dark:text-emerald-300">
                  <span>GROSS MARGIN RATE</span>
                  <div className="p-1.5 bg-emerald-100 dark:bg-emerald-900 text-emerald-700 dark:text-amber-400 rounded-lg">
                    <Percent className="w-3.5 h-3.5" />
                  </div>
                </div>
                <div className="text-2xl font-black text-emerald-700 dark:text-amber-400 font-mono">{grossProfitMarginPercent}%</div>
                <div className="text-xs text-emerald-600 dark:text-emerald-400 font-bold flex items-center justify-between">
                  <span>Target &gt;30% (Healthy)</span>
                  <span>{cogsTotal > 0 ? ((grossProfit / cogsTotal) * 100).toFixed(1) : 0}% markup</span>
                </div>
              </div>

              {/* Card 2C: Realized In-Hand Margin */}
              <div className="bg-white dark:bg-emerald-950 p-5 rounded-2xl border border-teal-100 dark:border-teal-800 shadow-sm space-y-2">
                <div className="flex justify-between items-center text-xs font-bold text-gray-500 dark:text-emerald-300">
                  <span>IN-HAND PROFIT MARGIN</span>
                  <div className="p-1.5 bg-amber-100 dark:bg-amber-900 text-amber-700 dark:text-amber-300 rounded-lg">
                    <Coins className="w-3.5 h-3.5" />
                  </div>
                </div>
                <div className="text-2xl font-black text-amber-700 dark:text-amber-400 font-mono">{formatPrice(inHandMargin)}</div>
                <div className="text-xs text-amber-700 dark:text-amber-300 font-bold flex items-center justify-between">
                  <span>{inHandMarginPercent}% on Cash Flow</span>
                  <span>{grossProfit > 0 ? ((inHandMargin / grossProfit) * 100).toFixed(1) : 0}% realized</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* EXPANDABLE SECTION 3: NET OPERATING PROFIT SUB-CARDS + FULL STOCK VALUATION ENGINE */}
        {(expandedNetProfit || isAllExpanded) && (
          <div className="p-5 rounded-3xl bg-gradient-to-br from-emerald-950 to-teal-950 text-white border-2 border-emerald-500/50 shadow-2xl space-y-5 animate-fadeIn">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-emerald-800 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2.5 bg-emerald-500 text-white rounded-2xl shadow-lg">
                  <Package className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-black uppercase tracking-wide text-white flex items-center gap-2">
                    <span>Net Operating Profit & Stock Investment Valuation Engine</span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] bg-amber-400 text-emerald-950 font-black">LIVE DRILLDOWN</span>
                  </h3>
                  <p className="text-xs text-emerald-300">
                    Stock landed cost investment, retail projected returns, in-hand realized cash profit & retained EBITDA
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowNetProfitModal(true)}
                className="px-4 py-2 rounded-xl text-xs font-black bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-500 hover:to-amber-600 text-emerald-950 shadow-md transition flex items-center gap-1.5 self-start sm:self-auto"
              >
                <Eye className="w-4 h-4" />
                <span>Full Financial Drilldown Modal ↗</span>
              </button>
            </div>

            {/* 3 Net Profit Sub-Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-white/10 backdrop-blur-sm p-4 rounded-2xl border border-white/10 space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-200">Net Retained Profit (EBITDA)</span>
                <div className="text-2xl font-black font-mono text-emerald-300">{formatPrice(netOperatingProfit)}</div>
                <p className="text-[11px] text-emerald-200 font-bold">{netMarginPercent}% Net after ₹{totalOperatingExpenses} Opex</p>
              </div>

              <div className="bg-white/10 backdrop-blur-sm p-4 rounded-2xl border border-white/10 space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-rose-200">Fixed Operating Overhead Cost</span>
                <div className="text-2xl font-black font-mono text-rose-400">{formatPrice(totalOperatingExpenses)}</div>
                <p className="text-[11px] text-rose-200 font-bold">{expenses.length} operating expense ledger records</p>
              </div>

              <div className="bg-white/10 backdrop-blur-sm p-4 rounded-2xl border border-white/10 space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-purple-200">Solvency & Overhead Coverage</span>
                <div className="text-2xl font-black font-mono text-purple-300">{overheadCoverageRatio}x</div>
                <p className="text-[11px] text-purple-200 font-bold">Gross covers overhead by {overheadCoverageRatio} times</p>
              </div>
            </div>

            {/* Comprehensive Stock Valuation & Overall Return Grid */}
            <div className="pt-2">
              <div className="text-xs font-black text-amber-300 uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
                <Coins className="w-4 h-4" />
                <span>Inventory Investment, Retail Returns & Profit Spread (Price minus Cost)</span>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
                {/* 1. Total Stock Investment */}
                <div className="bg-black/25 p-3.5 rounded-2xl border border-emerald-600/40 space-y-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-gray-300">Total Stock Investment</span>
                  <div className="text-lg font-black font-mono text-white">{formatPrice(totalStockInvestment)}</div>
                  <p className="text-[10px] text-emerald-300 font-semibold">{totalStockUnits} total stock units</p>
                </div>

                {/* 2. Projected Return Amount */}
                <div className="bg-black/25 p-3.5 rounded-2xl border border-amber-600/40 space-y-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-gray-300">Projected Return Amount</span>
                  <div className="text-lg font-black font-mono text-amber-300">{formatPrice(totalStockRetailReturn)}</div>
                  <p className="text-[10px] text-amber-200 font-semibold">Retail catalog value</p>
                </div>

                {/* 3. Stock Profit Amount (Price minus Cost) */}
                <div className="bg-black/25 p-3.5 rounded-2xl border border-teal-600/40 space-y-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-gray-300">Stock Profit (Price - Cost)</span>
                  <div className="text-lg font-black font-mono text-teal-300">+{formatPrice(potentialStockProfit)}</div>
                  <p className="text-[10px] text-teal-200 font-semibold">+{stockProfitMarginPercent}% profit margin</p>
                </div>

                {/* 4. In-Hand Overall Realized Profit */}
                <div className="bg-black/25 p-3.5 rounded-2xl border border-green-600/40 space-y-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-gray-300">In-Hand Overall Profit</span>
                  <div className="text-lg font-black font-mono text-green-300">{formatPrice(inHandMargin)}</div>
                  <p className="text-[10px] text-green-200 font-semibold">{inHandMarginPercent}% on cash inflow</p>
                </div>

                {/* 5. Gross Overall Profit */}
                <div className="bg-black/25 p-3.5 rounded-2xl border border-emerald-600/40 space-y-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-gray-300">Gross Overall Profit</span>
                  <div className="text-lg font-black font-mono text-emerald-300">{formatPrice(grossProfit)}</div>
                  <p className="text-[10px] text-emerald-200 font-semibold">{grossProfitMarginPercent}% gross margin</p>
                </div>

                {/* 6. Net Operating Overall */}
                <div className="bg-black/25 p-3.5 rounded-2xl border border-amber-500/40 space-y-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-gray-300">Net Operating Overall</span>
                  <div className="text-lg font-black font-mono text-amber-400">{formatPrice(netOperatingProfit)}</div>
                  <p className="text-[10px] text-amber-200 font-semibold">{netMarginPercent}% net retained EBITDA</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Operational Health & Inventory Risk Control Banner */}
        <div className="bg-white dark:bg-emerald-950 p-4 rounded-3xl border border-amber-200 dark:border-amber-900/60 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-amber-100 dark:bg-amber-900/60 text-amber-700 dark:text-amber-300 rounded-2xl">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs font-black text-amber-900 dark:text-amber-300 uppercase tracking-wide flex items-center gap-2">
                <span>INVENTORY RISK & STOCK CONTROL</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] bg-amber-200/80 dark:bg-amber-800 text-amber-900 dark:text-amber-100 font-bold">
                  {lowStockProducts.length} Reorder Items
                </span>
              </div>
              <p className="text-[11px] text-gray-600 dark:text-emerald-400 mt-0.5">
                {outOfStockCount > 0 ? `${outOfStockCount} items currently OUT OF STOCK!` : 'All critical skus within safe buffer thresholds.'} {healthyStockCount} items fully stocked.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <Link
              to="/admin/inventory"
              className="px-3.5 py-1.5 rounded-xl text-xs font-bold bg-amber-600 hover:bg-amber-700 text-white shadow-sm transition flex items-center gap-1.5 self-start sm:self-auto"
            >
              <span>Manage Inventory</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </div>

      {/* ============================================================== */}
      {/* INTERACTIVE NET OPERATING PROFIT & STOCK VALUATION MODAL        */}
      {/* ============================================================== */}
      {showNetProfitModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white dark:bg-emerald-950 border-2 border-emerald-500/50 rounded-3xl shadow-2xl max-w-3xl w-full p-6 space-y-6 animate-scaleUp">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-emerald-100 dark:border-emerald-800 pb-3">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-gradient-to-br from-emerald-500 to-teal-600 text-white rounded-2xl shadow-md">
                  <Landmark className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-base font-black text-emerald-950 dark:text-emerald-100 uppercase tracking-wide flex items-center gap-2">
                    <span>Executive Net Operating Profit & Stock Investment Breakdown</span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] bg-emerald-100 dark:bg-emerald-900 text-emerald-800 dark:text-emerald-200 font-extrabold">LIVE</span>
                  </h3>
                  <p className="text-xs text-gray-500 dark:text-emerald-400">
                    Comprehensive asset capital valuation, projected retail return, and net retained earnings
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowNetProfitModal(false)}
                className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-emerald-200 rounded-xl transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Section 1: Stock Capital Investment vs Projected Retail Return */}
            <div className="space-y-3">
              <h4 className="text-xs font-black uppercase tracking-wider text-emerald-900 dark:text-emerald-200 flex items-center gap-1.5">
                <Package className="w-4 h-4 text-emerald-600 dark:text-amber-400" />
                <span>1. Stock Capital Investment & Projected Returns (Price Minus Cost)</span>
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="bg-emerald-50 dark:bg-emerald-900/40 p-4 rounded-2xl border border-emerald-200 dark:border-emerald-800 space-y-1">
                  <span className="text-[10px] font-extrabold uppercase text-gray-500 dark:text-emerald-300">Total Stock Investment</span>
                  <div className="text-2xl font-black font-mono text-emerald-950 dark:text-emerald-100">{formatPrice(totalStockInvestment)}</div>
                  <p className="text-[11px] text-gray-500 dark:text-emerald-400">Landed cost of {totalStockUnits} inventory units</p>
                </div>

                <div className="bg-amber-50 dark:bg-amber-950/40 p-4 rounded-2xl border border-amber-200 dark:border-amber-800 space-y-1">
                  <span className="text-[10px] font-extrabold uppercase text-gray-500 dark:text-amber-300">Projected Retail Return</span>
                  <div className="text-2xl font-black font-mono text-amber-700 dark:text-amber-300">{formatPrice(totalStockRetailReturn)}</div>
                  <p className="text-[11px] text-gray-500 dark:text-amber-400">Gross revenue at catalog retail prices</p>
                </div>

                <div className="bg-teal-50 dark:bg-teal-950/40 p-4 rounded-2xl border border-teal-200 dark:border-teal-800 space-y-1">
                  <span className="text-[10px] font-extrabold uppercase text-gray-500 dark:text-teal-300">Stock Profit (Price - Cost)</span>
                  <div className="text-2xl font-black font-mono text-teal-700 dark:text-teal-300">+{formatPrice(potentialStockProfit)}</div>
                  <p className="text-[11px] text-teal-700 dark:text-teal-400 font-bold">+{stockProfitMarginPercent}% profit margin on stock</p>
                </div>
              </div>
            </div>

            {/* Section 2: Overall Cash Flow & Retained EBITDA Matrix */}
            <div className="space-y-3">
              <h4 className="text-xs font-black uppercase tracking-wider text-emerald-900 dark:text-emerald-200 flex items-center gap-1.5">
                <Coins className="w-4 h-4 text-emerald-600 dark:text-amber-400" />
                <span>2. Overall Cash Flow, Gross Margins & Net Operating Earnings</span>
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="bg-green-50 dark:bg-green-950/40 p-4 rounded-2xl border border-green-200 dark:border-green-800 space-y-1">
                  <span className="text-[10px] font-extrabold uppercase text-gray-500 dark:text-green-300">In-Hand Overall Realized</span>
                  <div className="text-2xl font-black font-mono text-green-800 dark:text-green-300">{formatPrice(inHandMargin)}</div>
                  <p className="text-[11px] text-green-700 dark:text-green-400 font-bold">{inHandMarginPercent}% on collected {formatPrice(collectedRevenue)}</p>
                </div>

                <div className="bg-emerald-50 dark:bg-emerald-900/40 p-4 rounded-2xl border border-emerald-200 dark:border-emerald-800 space-y-1">
                  <span className="text-[10px] font-extrabold uppercase text-gray-500 dark:text-emerald-300">Gross Overall Profit</span>
                  <div className="text-2xl font-black font-mono text-emerald-800 dark:text-amber-300">{formatPrice(grossProfit)}</div>
                  <p className="text-[11px] text-emerald-700 dark:text-emerald-400 font-bold">{grossProfitMarginPercent}% Gross margin on total sales</p>
                </div>

                <div className="bg-emerald-100/70 dark:bg-emerald-900/70 p-4 rounded-2xl border-2 border-emerald-400 dark:border-emerald-600 space-y-1">
                  <span className="text-[10px] font-extrabold uppercase text-emerald-900 dark:text-amber-300">Net Operating Profit</span>
                  <div className="text-2xl font-black font-mono text-emerald-950 dark:text-emerald-100">{formatPrice(netOperatingProfit)}</div>
                  <p className="text-[11px] text-emerald-800 dark:text-emerald-200 font-bold">{netMarginPercent}% Net after ₹{totalOperatingExpenses} Opex</p>
                </div>
              </div>
            </div>

            {/* Section 3: Summary Key Facts */}
            <div className="p-4 rounded-2xl bg-gray-50 dark:bg-emerald-900/30 border border-gray-200 dark:border-emerald-800 text-xs text-gray-600 dark:text-emerald-300 flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-amber-400" />
                <span>
                  Solvency Buffer: Gross Profit covers fixed operating expenses by <strong>{overheadCoverageRatio} times</strong>.
                </span>
              </div>
              <button
                onClick={() => setShowNetProfitModal(false)}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-emerald-700 hover:bg-emerald-800 text-white transition shadow-sm"
              >
                Close Breakdown
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* 5+ ANALYTICAL CHARTS SUITE                                     */}
      {/* ============================================================== */}
      <div className="space-y-6">
        <div className="flex items-center justify-between border-b border-emerald-200 dark:border-emerald-800 pb-3">
          <h2 className="text-lg font-bold font-serif text-emerald-950 dark:text-emerald-100 flex items-center gap-2">
            <Activity className="w-5 h-5 text-emerald-600 dark:text-amber-400" />
            <span>Master Business Intelligence — 6 Visual Performance Charts</span>
          </h2>
          <span className="text-xs text-gray-500 dark:text-emerald-300 font-semibold">
            Live Automated Calculations
          </span>
        </div>

        {/* ROW 1: Chart 1 (Daily Revenue Trend) & Chart 2 (Channel Donut Chart) */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* CHART 1: Past 7 Days Daily Revenue & Volume (2 Columns) */}
          <div className="lg:col-span-2 bg-white dark:bg-emerald-950 p-6 rounded-3xl border border-emerald-100 dark:border-emerald-800 shadow-sm space-y-4">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="text-sm font-extrabold text-emerald-950 dark:text-emerald-100 flex items-center gap-2">
                  <BarChart3 className="w-4 h-4 text-emerald-600 dark:text-amber-400" />
                  <span>Chart 1: Daily Revenue & Order Volume Trend</span>
                </h3>
                <p className="text-[11px] text-gray-500 dark:text-emerald-300">
                  Last 7 days revenue collection (₹) and orders processed
                </p>
              </div>
              <span className="px-2.5 py-1 text-[10px] font-black rounded-lg bg-emerald-50 dark:bg-emerald-900 text-emerald-800 dark:text-amber-300 border border-emerald-200 dark:border-emerald-700">
                7 Days Live
              </span>
            </div>

            <div className="h-56 flex items-end justify-between gap-3 pt-6 pb-2 px-3 bg-emerald-50/50 dark:bg-emerald-900/30 rounded-2xl">
              {last7DaysData.map((item, idx) => {
                const maxVal = Math.max(...last7DaysData.map(t => t.revenue), 1);
                const heightPct = item.revenue > 0 ? Math.max(20, Math.round((item.revenue / maxVal) * 100)) : 10;
                return (
                  <div key={idx} className="flex-1 flex flex-col items-center h-full justify-end group">
                    <div className="text-[10px] font-mono font-bold text-emerald-800 dark:text-amber-300 mb-1 opacity-90">
                      ₹{item.revenue}
                    </div>
                    <div
                      style={{ height: `${heightPct}%` }}
                      className={`w-full rounded-t-xl transition-all duration-300 ${
                        item.revenue > 0
                          ? 'bg-gradient-to-t from-emerald-700 to-emerald-500 dark:from-emerald-600 dark:to-amber-400 group-hover:from-emerald-600 group-hover:to-amber-300 shadow-sm'
                          : 'bg-gray-200 dark:bg-emerald-800/40'
                      }`}
                    />
                    <span className="text-[11px] font-extrabold text-gray-800 dark:text-emerald-200 mt-2">
                      {item.label}
                    </span>
                    <span className="text-[9px] text-gray-400 dark:text-emerald-400">
                      {item.count} orders
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* CHART 2: Sales Channels Distribution Donut Chart */}
          <div className="bg-white dark:bg-emerald-950 p-6 rounded-3xl border border-emerald-100 dark:border-emerald-800 shadow-sm space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-sm font-extrabold text-emerald-950 dark:text-emerald-100 flex items-center gap-2">
                <PieChart className="w-4 h-4 text-emerald-600 dark:text-amber-400" />
                <span>Chart 2: Channel Split</span>
              </h3>
              <span className="text-[10px] font-bold text-gray-400">Omni-Channel</span>
            </div>

            {/* Visual Circular Representation */}
            <div className="flex items-center justify-center py-2">
              <div className="relative w-36 h-36 flex items-center justify-center">
                <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                  {/* Background Circle */}
                  <path
                    className="text-gray-100 dark:text-emerald-900"
                    strokeWidth="4"
                    stroke="currentColor"
                    fill="none"
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  />
                  {/* WhatsApp Segment */}
                  <path
                    className="text-emerald-600 dark:text-emerald-400"
                    strokeDasharray={`${whatsappPct}, 100`}
                    strokeWidth="4"
                    stroke="currentColor"
                    fill="none"
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  />
                  {/* POS Segment */}
                  <path
                    className="text-blue-600 dark:text-blue-400"
                    strokeDasharray={`${posPct}, 100`}
                    strokeDashoffset={`-${whatsappPct}`}
                    strokeWidth="4"
                    stroke="currentColor"
                    fill="none"
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  />
                </svg>
                <div className="absolute text-center">
                  <span className="text-[10px] font-bold text-gray-400 uppercase">Top Channel</span>
                  <div className="text-sm font-black text-emerald-800 dark:text-amber-300">WhatsApp</div>
                  <div className="text-[11px] font-extrabold text-gray-700 dark:text-emerald-200">{whatsappPct}%</div>
                </div>
              </div>
            </div>

            {/* Legend & Breakdown */}
            <div className="space-y-2 text-xs pt-1">
              <div className="flex justify-between items-center">
                <span className="flex items-center gap-1.5 font-bold text-emerald-800 dark:text-emerald-300">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-600 inline-block" /> WhatsApp Orders
                </span>
                <span className="font-mono font-bold text-gray-900 dark:text-emerald-100">{formatPrice(whatsappRevenue)} ({whatsappPct}%)</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="flex items-center gap-1.5 font-bold text-blue-800 dark:text-blue-300">
                  <span className="w-2.5 h-2.5 rounded-full bg-blue-600 inline-block" /> Counter POS
                </span>
                <span className="font-mono font-bold text-gray-900 dark:text-emerald-100">{formatPrice(posRevenue)} ({posPct}%)</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="flex items-center gap-1.5 font-bold text-purple-800 dark:text-purple-300">
                  <span className="w-2.5 h-2.5 rounded-full bg-purple-600 inline-block" /> Website Store
                </span>
                <span className="font-mono font-bold text-gray-900 dark:text-emerald-100">{formatPrice(webRevenue)} ({webPct}%)</span>
              </div>
            </div>
          </div>
        </div>

        {/* ROW 2: Chart 3 (P&L Financial Margin), Chart 4 (Category Breakdown), Chart 5 (Stock Health), Chart 6 (Payment Split) */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* CHART 3: P&L Financial Waterfall / Margin Analysis */}
          <div className="bg-white dark:bg-emerald-950 p-6 rounded-3xl border border-emerald-100 dark:border-emerald-800 shadow-sm space-y-4">
            <h3 className="text-sm font-extrabold text-emerald-950 dark:text-emerald-100 flex items-center gap-2">
              <DollarSign className="w-4 h-4 text-emerald-600 dark:text-amber-400" />
              <span>Chart 3: P&L Flow (₹)</span>
            </h3>
            <p className="text-[11px] text-gray-500 dark:text-emerald-300">Financial distribution breakdown</p>

            <div className="space-y-3 pt-2">
              <div>
                <div className="flex justify-between text-xs font-bold mb-1">
                  <span className="text-gray-700 dark:text-emerald-300">Gross Sales</span>
                  <span className="font-mono text-emerald-950 dark:text-amber-300">{formatPrice(totalSales)}</span>
                </div>
                <div className="w-full bg-emerald-100 dark:bg-emerald-900 h-2 rounded-full overflow-hidden">
                  <div style={{ width: '100%' }} className="bg-emerald-600 h-full rounded-full" />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-xs font-bold mb-1">
                  <span className="text-amber-700 dark:text-amber-400">COGS Landed Cost</span>
                  <span className="font-mono text-amber-700 dark:text-amber-400">{formatPrice(cogsTotal)}</span>
                </div>
                <div className="w-full bg-amber-100 dark:bg-amber-950 h-2 rounded-full overflow-hidden">
                  <div style={{ width: `${totalSales > 0 ? (cogsTotal / totalSales) * 100 : 0}%` }} className="bg-amber-500 h-full rounded-full" />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-xs font-bold mb-1">
                  <span className="text-rose-700 dark:text-rose-400">Operating Expenses</span>
                  <span className="font-mono text-rose-700 dark:text-rose-400">{formatPrice(totalOperatingExpenses)}</span>
                </div>
                <div className="w-full bg-rose-100 dark:bg-rose-950 h-2 rounded-full overflow-hidden">
                  <div style={{ width: `${totalSales > 0 ? (totalOperatingExpenses / totalSales) * 100 : 0}%` }} className="bg-rose-500 h-full rounded-full" />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-xs font-black mb-1">
                  <span className="text-emerald-900 dark:text-amber-300">Net Operating Profit</span>
                  <span className="font-mono text-emerald-800 dark:text-amber-300">{formatPrice(netOperatingProfit)}</span>
                </div>
                <div className="w-full bg-emerald-100 dark:bg-emerald-900 h-2 rounded-full overflow-hidden">
                  <div style={{ width: `${totalSales > 0 ? (netOperatingProfit / totalSales) * 100 : 0}%` }} className="bg-emerald-700 h-full rounded-full" />
                </div>
              </div>
            </div>
          </div>

          {/* CHART 4: Category Revenue Performance */}
          <div className="bg-white dark:bg-emerald-950 p-6 rounded-3xl border border-emerald-100 dark:border-emerald-800 shadow-sm space-y-4">
            <h3 className="text-sm font-extrabold text-emerald-950 dark:text-emerald-100 flex items-center gap-2">
              <Layers className="w-4 h-4 text-emerald-600 dark:text-amber-400" />
              <span>Chart 4: Category Sales</span>
            </h3>
            <p className="text-[11px] text-gray-500 dark:text-emerald-300">Top revenue producing lines</p>

            <div className="space-y-3 pt-2">
              {categoryStats.map((cat, idx) => {
                const maxCatRev = Math.max(...categoryStats.map(c => c.revenue), 1);
                const pct = Math.round((cat.revenue / maxCatRev) * 100);
                return (
                  <div key={idx}>
                    <div className="flex justify-between text-xs font-bold mb-1 truncate">
                      <span className="text-gray-800 dark:text-emerald-200 truncate pr-2">{cat.name}</span>
                      <span className="font-mono text-emerald-950 dark:text-amber-300 font-bold">{formatPrice(cat.revenue)}</span>
                    </div>
                    <div className="w-full bg-gray-100 dark:bg-emerald-900 h-2 rounded-full overflow-hidden">
                      <div style={{ width: `${pct}%` }} className="bg-emerald-600 h-full rounded-full" />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* CHART 5: Inventory Stock Health & Risk Assessment */}
          <div className="bg-white dark:bg-emerald-950 p-6 rounded-3xl border border-emerald-100 dark:border-emerald-800 shadow-sm space-y-4">
            <h3 className="text-sm font-extrabold text-emerald-950 dark:text-emerald-100 flex items-center gap-2">
              <Boxes className="w-4 h-4 text-emerald-600 dark:text-amber-400" />
              <span>Chart 5: Stock Health</span>
            </h3>
            <p className="text-[11px] text-gray-500 dark:text-emerald-300">Catalog inventory condition</p>

            <div className="pt-2 space-y-3">
              <div className="p-3 bg-emerald-50 dark:bg-emerald-900/40 rounded-2xl border border-emerald-200 dark:border-emerald-800 flex justify-between items-center">
                <div>
                  <div className="text-xs font-bold text-emerald-900 dark:text-emerald-200">In Stock (Healthy)</div>
                  <div className="text-[10px] text-gray-500 dark:text-emerald-400">Above reorder limits</div>
                </div>
                <div className="text-lg font-black text-emerald-800 dark:text-amber-300">{healthyStockCount} SKUs</div>
              </div>

              <div className="p-3 bg-amber-50 dark:bg-amber-950/40 rounded-2xl border border-amber-200 dark:border-amber-900 flex justify-between items-center">
                <div>
                  <div className="text-xs font-bold text-amber-900 dark:text-amber-200">Low Stock Alert</div>
                  <div className="text-[10px] text-gray-500 dark:text-amber-400">Reorder threshold reached</div>
                </div>
                <div className="text-lg font-black text-amber-700 dark:text-amber-400">{lowStockProducts.length} SKUs</div>
              </div>

              <div className="p-3 bg-rose-50 dark:bg-rose-950/40 rounded-2xl border border-rose-200 dark:border-rose-900 flex justify-between items-center">
                <div>
                  <div className="text-xs font-bold text-rose-900 dark:text-rose-200">Critical Out of Stock</div>
                  <div className="text-[10px] text-gray-500 dark:text-rose-400">Urgent procurement required</div>
                </div>
                <div className="text-lg font-black text-rose-700 dark:text-rose-400">{outOfStockCount} SKUs</div>
              </div>
            </div>
          </div>

          {/* CHART 6: Payment Method Settlement Split */}
          <div className="bg-white dark:bg-emerald-950 p-6 rounded-3xl border border-emerald-100 dark:border-emerald-800 shadow-sm space-y-4">
            <h3 className="text-sm font-extrabold text-emerald-950 dark:text-emerald-100 flex items-center gap-2">
              <Wallet className="w-4 h-4 text-emerald-600 dark:text-amber-400" />
              <span>Chart 6: Payment Split</span>
            </h3>
            <p className="text-[11px] text-gray-500 dark:text-emerald-300">Customer settlement methods</p>

            <div className="space-y-3 pt-2">
              <div>
                <div className="flex justify-between text-xs font-bold mb-1">
                  <span className="text-emerald-800 dark:text-emerald-300">UPI / QR Code</span>
                  <span className="font-mono text-emerald-950 dark:text-amber-300">{formatPrice(paymentStats.upi.amount)} ({paymentStats.upi.pct}%)</span>
                </div>
                <div className="w-full bg-emerald-100 dark:bg-emerald-900 h-2 rounded-full overflow-hidden">
                  <div style={{ width: `${paymentStats.upi.pct}%` }} className="bg-emerald-600 h-full rounded-full" />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-xs font-bold mb-1">
                  <span className="text-blue-800 dark:text-blue-300">Cash on Delivery / POS</span>
                  <span className="font-mono text-emerald-950 dark:text-amber-300">{formatPrice(paymentStats.cash.amount)} ({paymentStats.cash.pct}%)</span>
                </div>
                <div className="w-full bg-blue-100 dark:bg-blue-950 h-2 rounded-full overflow-hidden">
                  <div style={{ width: `${paymentStats.cash.pct}%` }} className="bg-blue-600 h-full rounded-full" />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-xs font-bold mb-1">
                  <span className="text-purple-800 dark:text-purple-300">Card / Net Banking</span>
                  <span className="font-mono text-emerald-950 dark:text-amber-300">{formatPrice(paymentStats.card.amount)} ({paymentStats.card.pct}%)</span>
                </div>
                <div className="w-full bg-purple-100 dark:bg-purple-950 h-2 rounded-full overflow-hidden">
                  <div style={{ width: `${paymentStats.card.pct}%` }} className="bg-purple-600 h-full rounded-full" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Orders & Stock Alerts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 bg-white dark:bg-emerald-950 p-6 rounded-3xl border border-emerald-100 dark:border-emerald-800 shadow-sm space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-bold text-gray-900 dark:text-emerald-100 flex items-center gap-2">
              <ShoppingCart className="w-5 h-5 text-emerald-700 dark:text-amber-400" />
              Recent Live Orders Ledger
            </h3>
            <Link to="/admin/orders" className="text-xs font-bold text-emerald-700 dark:text-amber-400 hover:underline">View All &rarr;</Link>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-emerald-50 dark:bg-emerald-900 text-gray-600 dark:text-emerald-200 font-bold uppercase text-[10px]">
                <tr>
                  <th className="p-3">Order #</th>
                  <th className="p-3">Customer</th>
                  <th className="p-3">Source</th>
                  <th className="p-3">Status</th>
                  <th className="p-3 text-right">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-emerald-100 dark:divide-emerald-800 text-gray-700 dark:text-emerald-200">
                {recentOrders.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="p-8 text-center text-gray-500 dark:text-emerald-300 text-xs font-medium">
                      No active sales or orders recorded yet. When orders are placed, they will appear here.
                    </td>
                  </tr>
                ) : (
                  recentOrders.map((order) => (
                    <tr key={order.id} className="hover:bg-emerald-50/50 dark:hover:bg-emerald-900/30">
                      <td className="p-3 font-mono font-bold text-emerald-800 dark:text-amber-300">{order.order_number}</td>
                      <td className="p-3 font-semibold text-gray-900 dark:text-emerald-100">{order.customer_name_snapshot || 'Walk-in Customer'}</td>
                      <td className="p-3">
                        <span className="px-2 py-0.5 rounded font-bold text-[10px] bg-emerald-100 dark:bg-emerald-900 text-emerald-800 dark:text-emerald-300">{order.source}</span>
                      </td>
                      <td className="p-3">
                        <span className="px-2 py-0.5 rounded font-bold text-[10px] bg-amber-100 dark:bg-amber-900/60 text-amber-800 dark:text-amber-300">{order.status}</span>
                      </td>
                      <td className="p-3 text-right font-mono font-bold text-emerald-900 dark:text-emerald-100">{formatPrice(order.total)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="bg-white dark:bg-emerald-950 p-6 rounded-3xl border border-emerald-100 dark:border-emerald-800 shadow-sm space-y-4">
          <h3 className="text-lg font-bold text-gray-900 dark:text-emerald-100 flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-amber-500" />
            Inventory Stock Alerts
          </h3>
          <div className="space-y-3">
            {lowStockProducts.slice(0, 5).map((p) => (
              <div key={p.id} className="p-3 bg-amber-50/60 dark:bg-emerald-900/40 rounded-xl border border-amber-200 dark:border-amber-800 flex items-center justify-between">
                <div>
                  <div className="font-bold text-xs text-gray-900 dark:text-emerald-100">{p.name}</div>
                  <div className="text-[10px] text-gray-500 dark:text-emerald-400">SKU: {p.sku}</div>
                </div>
                <div className="text-right">
                  <div className="text-xs font-extrabold text-amber-700 dark:text-amber-300">{p.current_stock} left</div>
                </div>
              </div>
            ))}
          </div>
          <Link to="/admin/inventory" className="block text-center py-2.5 bg-emerald-800 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow transition">
            Open Inventory Audit &rarr;
          </Link>
        </div>
      </div>
    </div>
  );
};

// ---- Role 2: ADMIN Dashboard ----
const AdminDashboard: React.FC = () => {
  return <SuperAdminDashboard />;
};

// ---- Role 3: INVENTORY_MANAGER Dashboard ----
const InventoryManagerDashboard: React.FC = () => {
  const [products, setProducts] = React.useState<Product[]>([]);

  React.useEffect(() => {
    async function load() {
      const p = await getJSONStore<Product>('products');
      setProducts(p || []);
    }
    load();
  }, []);

  const lowStock = products.filter((p: Product) => (p.current_stock || 0) <= (p.reorder_level || 15));
  return (
    <div className="space-y-8 animate-fadeIn">
      <div className="bg-gradient-to-r from-emerald-900 to-teal-800 text-white p-6 rounded-3xl shadow-xl flex justify-between items-center">
        <div>
          <div className="text-xs font-bold text-amber-300 uppercase tracking-wider">INVENTORY MANAGER DASHBOARD</div>
          <h1 className="text-2xl font-bold font-serif">Stock Control & Supplier Purchases</h1>
          <p className="text-xs text-emerald-100 mt-1">Monitor product quantities, reorder thresholds, and landed costs.</p>
        </div>
        <Link to="/admin/suppliers" className="px-4 py-2 bg-amber-400 text-emerald-950 font-bold text-xs rounded-xl shadow">
          Create PO &rarr;
        </Link>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        <div className="bg-white dark:bg-emerald-950 p-6 rounded-2xl border border-emerald-100 dark:border-emerald-800 shadow-sm">
          <div className="text-xs font-bold text-gray-500">LOW STOCK ITEMS</div>
          <div className="text-3xl font-black text-amber-600 mt-2">{lowStock.length} Items</div>
          <div className="text-xs text-amber-700 mt-1">Below reorder level</div>
        </div>
        <div className="bg-white dark:bg-emerald-950 p-6 rounded-2xl border border-emerald-100 dark:border-emerald-800 shadow-sm">
          <div className="text-xs font-bold text-gray-500">TOTAL CATALOG PRODUCTS</div>
          <div className="text-3xl font-black text-emerald-900 dark:text-emerald-100 mt-2">{products.length} SKUs</div>
          <div className="text-xs text-emerald-600 mt-1">Active items</div>
        </div>
        <div className="bg-white dark:bg-emerald-950 p-6 rounded-2xl border border-emerald-100 dark:border-emerald-800 shadow-sm">
          <div className="text-xs font-bold text-gray-500">PENDING PURCHASE ORDERS</div>
          <div className="text-3xl font-black text-blue-600 mt-2">2 POs</div>
          <div className="text-xs text-blue-700 mt-1">Awaiting delivery</div>
        </div>
      </div>
    </div>
  );
};

// ---- Role 4: SALES_STAFF Dashboard ----
const SalesStaffDashboard: React.FC = () => {
  const [orders, setOrders] = React.useState<Order[]>([]);

  React.useEffect(() => {
    async function load() {
      const o = await getJSONStore<Order>('orders');
      setOrders(o || []);
    }
    load();
  }, []);

  const posOrders = orders.filter(o => o.source === 'POS');
  const posTotal = posOrders.reduce((sum, o) => sum + (o.total || 0), 0);

  return (
    <div className="space-y-8 animate-fadeIn">
      <div className="bg-gradient-to-r from-blue-900 to-emerald-900 text-white p-6 rounded-3xl shadow-xl flex justify-between items-center">
        <div>
          <div className="text-xs font-bold text-amber-300 uppercase tracking-wider">SALES STAFF TERMINAL</div>
          <h1 className="text-2xl font-bold font-serif">Counter Billing & Customer POS</h1>
          <p className="text-xs text-emerald-100 mt-1">Process store billing, issue cash/UPI receipts, and record customer details.</p>
        </div>
        <Link to="/admin/pos" className="px-5 py-2.5 bg-amber-400 text-emerald-950 font-extrabold text-xs rounded-xl shadow">
          Launch Counter POS &rarr;
        </Link>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-emerald-950 p-6 rounded-2xl border border-emerald-100 dark:border-emerald-800 shadow-sm space-y-2">
          <div className="text-xs font-bold text-gray-500">MY SHIFT COUNTER BILLS</div>
          <div className="text-3xl font-black text-emerald-900 dark:text-emerald-100">{posOrders.length} Orders</div>
          <div className="text-xs text-emerald-600">{formatPrice(posTotal)} total collected</div>
        </div>
        <div className="bg-white dark:bg-emerald-950 p-6 rounded-2xl border border-emerald-100 dark:border-emerald-800 shadow-sm space-y-2">
          <div className="text-xs font-bold text-gray-500">QUICK PRODUCT LOOKUP</div>
          <Link to="/admin/products" className="block text-xs font-bold text-blue-700 dark:text-blue-400 hover:underline">
            Search Organic Catalog &rarr;
          </Link>
        </div>
      </div>
    </div>
  );
};

// ---- Role 5: STAFF Dashboard ----
const StaffDashboard: React.FC = () => {
  const [orders, setOrders] = React.useState<Order[]>([]);

  React.useEffect(() => {
    async function load() {
      const o = await getJSONStore<Order>('orders');
      setOrders(o || []);
    }
    load();
  }, []);

  const packCount = orders.filter(o => o.status === 'NEW' || o.status === 'PACKING' || o.status === 'CONFIRMED').length;

  return (
    <div className="space-y-8 animate-fadeIn">
      <div className="bg-gradient-to-r from-purple-900 to-emerald-900 text-white p-6 rounded-3xl shadow-xl">
        <div className="text-xs font-bold text-amber-300 uppercase tracking-wider">STAFF OPERATIONS WORKSPACE</div>
        <h1 className="text-2xl font-bold font-serif">Store Operations & Customer Orders</h1>
        <p className="text-xs text-emerald-100 mt-1">Assist with WhatsApp order packaging, inventory handling, and customer service.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-emerald-950 p-6 rounded-2xl border border-emerald-100 dark:border-emerald-800 shadow-sm">
          <div className="text-xs font-bold text-gray-500">ORDERS TO PACK</div>
          <div className="text-3xl font-black text-purple-900 dark:text-purple-300 mt-2">{packCount} Orders</div>
          <div className="text-xs text-purple-700 mt-1">Ready for packaging</div>
        </div>
        <div className="bg-white dark:bg-emerald-950 p-6 rounded-2xl border border-emerald-100 dark:border-emerald-800 shadow-sm">
          <div className="text-xs font-bold text-gray-500">WHATSAPP INBOX</div>
          <div className="text-3xl font-black text-amber-600 mt-2">5 Messages</div>
          <div className="text-xs text-amber-700 mt-1">Unread customer chats</div>
        </div>
      </div>
    </div>
  );
};

// ---- Role 6: DELIVERY_STAFF Dashboard ----
const DeliveryStaffDashboard: React.FC = () => {
  const [orders, setOrders] = React.useState<Order[]>([]);

  React.useEffect(() => {
    async function load() {
      const o = await getJSONStore<Order>('orders');
      setOrders(o || []);
    }
    load();
  }, []);

  const deliveryOrders = orders.filter(o => o.status === 'OUT_FOR_DELIVERY' || o.status === 'READY');
  const codAmount = deliveryOrders.filter(o => o.payment_method === 'CASH').reduce((sum, o) => sum + (o.total || 0), 0);

  return (
    <div className="space-y-8 animate-fadeIn">
      <div className="bg-gradient-to-r from-amber-900 to-emerald-900 text-white p-6 rounded-3xl shadow-xl">
        <div className="text-xs font-bold text-amber-300 uppercase tracking-wider">DELIVERY DISPATCH BOARD</div>
        <h1 className="text-2xl font-bold font-serif">Local Doorstep Deliveries</h1>
        <p className="text-xs text-emerald-100 mt-1">Track assigned local orders, delivery locations, and cash-on-delivery payments.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-emerald-950 p-6 rounded-2xl border border-emerald-100 dark:border-emerald-800 shadow-sm space-y-2">
          <div className="text-xs font-bold text-gray-500">ASSIGNED DELIVERIES</div>
          <div className="text-3xl font-black text-amber-600">{deliveryOrders.length} Deliveries</div>
          <div className="text-xs text-emerald-700">Local Area Delivery</div>
        </div>
        <div className="bg-white dark:bg-emerald-950 p-6 rounded-2xl border border-emerald-100 dark:border-emerald-800 shadow-sm space-y-2">
          <div className="text-xs font-bold text-gray-500">COD CASH TO COLLECT</div>
          <div className="text-3xl font-black text-emerald-900 dark:text-emerald-100">{formatPrice(codAmount)}</div>
          <div className="text-xs text-emerald-600">Pending delivery completion</div>
        </div>
      </div>
    </div>
  );
};

// ---- Role 7: VIEWER Dashboard ----
const ViewerDashboard: React.FC = () => {
  return (
    <div className="space-y-8 animate-fadeIn">
      <div className="bg-gradient-to-r from-slate-800 to-emerald-900 text-white p-6 rounded-3xl shadow-xl">
        <div className="text-xs font-bold text-amber-300 uppercase tracking-wider">READ-ONLY DASHBOARD</div>
        <h1 className="text-2xl font-bold font-serif">Store Overview & Audit Viewer</h1>
        <p className="text-xs text-emerald-100 mt-1">Read-only access to store performance metrics and product details.</p>
      </div>

      <div className="bg-white dark:bg-emerald-950 p-6 rounded-2xl border border-emerald-100 dark:border-emerald-800 shadow-sm text-center space-y-3">
        <Shield className="w-12 h-12 text-emerald-700 dark:text-amber-400 mx-auto" />
        <h3 className="font-extrabold text-gray-900 dark:text-emerald-100 text-sm">Viewer Access Level</h3>
        <p className="text-xs text-gray-500 dark:text-emerald-300 max-w-md mx-auto">
          You are logged in as a Viewer. You can inspect metrics and catalog listings, but modification actions are disabled for your account.
        </p>
      </div>
    </div>
  );
};

// ---- Main Dashboard Router based on Active User Role ----
export const DashboardPage: React.FC = () => {
  const { user } = useAuth();

  if (!user) return null;

  switch (user.role) {
    case 'SUPER_ADMIN':
      return <SuperAdminDashboard />;
    case 'ADMIN':
      return <AdminDashboard />;
    case 'INVENTORY_MANAGER':
      return <InventoryManagerDashboard />;
    case 'SALES_STAFF':
      return <SalesStaffDashboard />;
    case 'STAFF':
      return <StaffDashboard />;
    case 'DELIVERY_STAFF':
      return <DeliveryStaffDashboard />;
    case 'VIEWER':
      return <ViewerDashboard />;
    default:
      return <SuperAdminDashboard />;
  }
};

export default DashboardPage;
