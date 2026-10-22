import React, { useState, useEffect, useMemo } from 'react';
import {
  BarChart3,
  TrendingUp,
  Package,
  Users,
  DollarSign,
  Download,
  ArrowUpRight,
  RefreshCw,
  Printer,
  Calendar,
  Layers,
  PieChart,
  CheckCircle2,
  AlertTriangle,
  FileText,
  TrendingDown,
  Database,
  Building2,
  Percent,
  ShoppingCart,
  ShieldCheck,
  Zap,
  Plus,
  Pencil,
  Trash2,
  HelpCircle,
  X,
  ChevronLeft,
  ChevronRight,
  CreditCard,
  Smartphone,
  Banknote
} from 'lucide-react';
import toast from 'react-hot-toast';
import { formatPrice } from '../../lib/utils';
import { getJSONStore, setJSONStore, isLiveDatabaseMode } from '../../lib/dbManager';
import { RefreshSpinnerModal } from '../../components/common/RefreshSpinnerModal';
import { ExportFormatModal, ExportFormat } from '../../components/common/ExportFormatModal';
import { DashboardSkeleton } from '../../components/common/Skeleton';
import { AutoRefreshDropdown } from '../../components/common/AutoRefreshDropdown';
import { useActionModal } from '../../contexts/ActionModalContext';
import type { Product, Order, Customer, Expense } from '../../types';

function exportReportData(
  format: ExportFormat,
  orders: Order[],
  products: Product[],
  expenses: Expense[],
  customers: Customer[],
  timeRange: string
) {
  if (format === 'PDF' || format === 'PRINT') {
    window.print();
    return;
  }

  const delimiter = format === 'EXCEL' ? '\t' : ',';
  const fileExt = format === 'EXCEL' ? 'xls' : 'csv';

  let content = `MR. VIVASAYI Mart - BUSINESS PERFORMANCE & FINANCIAL ANALYTICS REPORT (${timeRange})\n`;
  content += `Store${delimiter}MR. VIVASAYI Mart\n`;
  content += `Generated At${delimiter}${new Date().toLocaleString()}\n`;
  content += `Data Source${delimiter}${isLiveDatabaseMode() ? 'Live Supabase Database' : 'Local Offline JSON Engine'}\n\n`;

  // 1. EXECUTIVE BUSINESS SUMMARY
  const totalRevenue = orders.reduce((sum, o) => sum + (o.total || 0), 0);
  const totalExpenses = expenses.reduce((sum, e) => sum + (e.amount || 0), 0);
  const totalStockLandedValuation = products.reduce((sum, p) => sum + (p.current_stock || 0) * (p.landed_cost || p.purchase_price || 0), 0);
  const netProfit = totalRevenue - totalExpenses;

  content += `1. EXECUTIVE FINANCIAL SUMMARY\n`;
  content += `Metric${delimiter}Value\n`;
  content += `Gross Sales Revenue (INR)${delimiter}${totalRevenue}\n`;
  content += `Total Operating Expenses (INR)${delimiter}${totalExpenses}\n`;
  content += `Net Operating Profit (INR)${delimiter}${netProfit}\n`;
  content += `Inventory Holding Landed Cost (INR)${delimiter}${totalStockLandedValuation}\n`;
  content += `Total Processed Orders${delimiter}${orders.length}\n\n`;

  // 2. REVENUE CHANNEL BREAKDOWN
  const whatsappRevenue = orders.filter(o => o.source === 'WHATSAPP').reduce((s, o) => s + (o.total || 0), 0);
  const posRevenue = orders.filter(o => o.source === 'POS' || o.source === 'WALK_IN').reduce((s, o) => s + (o.total || 0), 0);
  const webRevenue = orders.filter(o => o.source === 'WEBSITE').reduce((s, o) => s + (o.total || 0), 0);

  content += `2. SALES CHANNEL BREAKDOWN\n`;
  content += `Channel${delimiter}Orders Count${delimiter}Gross Revenue (INR)${delimiter}Revenue Share (%)\n`;
  content += `WhatsApp Commerce${delimiter}${orders.filter(o => o.source === 'WHATSAPP').length}${delimiter}${whatsappRevenue}${delimiter}${totalRevenue > 0 ? ((whatsappRevenue/totalRevenue)*100).toFixed(1) : 0}%\n`;
  content += `Counter POS${delimiter}${orders.filter(o => o.source === 'POS' || o.source === 'WALK_IN').length}${delimiter}${posRevenue}${delimiter}${totalRevenue > 0 ? ((posRevenue/totalRevenue)*100).toFixed(1) : 0}%\n`;
  content += `Online Storefront Website${delimiter}${orders.filter(o => o.source === 'WEBSITE').length}${delimiter}${webRevenue}${delimiter}${totalRevenue > 0 ? ((webRevenue/totalRevenue)*100).toFixed(1) : 0}%\n\n`;

  // 3. PRODUCT CATALOG VALUATION
  content += `3. PRODUCT CATALOG & INVENTORY VALUATION\n`;
  content += `SKU${delimiter}Product Name${delimiter}Current Stock${delimiter}Unit${delimiter}Landed Cost (INR)${delimiter}Selling Price (INR)${delimiter}Stock Valuation (INR)\n`;
  products.forEach(p => {
    const val = (p.current_stock || 0) * (p.landed_cost || p.purchase_price || 0);
    content += `"${p.sku}"${delimiter}"${p.name}"${delimiter}${p.current_stock}${delimiter}"${p.unit}"${delimiter}${p.landed_cost || 0}${delimiter}${p.selling_price || 0}${delimiter}${val}\n`;
  });
  content += `\n`;

  // 4. EXPENSES LOG
  content += `4. OPERATING EXPENSES LOG\n`;
  content += `Expense ID${delimiter}Date${delimiter}Category${delimiter}Description${delimiter}Payment Method${delimiter}Amount (INR)\n`;
  expenses.forEach(e => {
    content += `"${e.id}"${delimiter}"${e.expense_date}"${delimiter}"${e.category_name}"${delimiter}"${e.description}"${delimiter}"${e.payment_method}"${delimiter}${e.amount}\n`;
  });
  content += `\n`;

  // 5. CUSTOMER LTV
  content += `5. TOP CUSTOMERS LIFETIME VALUE\n`;
  content += `Customer Name${delimiter}Phone${delimiter}Location${delimiter}Orders Count${delimiter}Total Lifetime Spent (INR)\n`;
  customers.forEach(c => {
    content += `"${c.name}"${delimiter}"${c.phone || ''}"${delimiter}"${c.area || c.city || ''}"${delimiter}${c.total_orders || 1}${delimiter}${c.total_spent || 0}\n`;
  });

  const mimeType = format === 'EXCEL' ? 'application/vnd.ms-excel;charset=utf-8;' : 'text/csv;charset=utf-8;';
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `MR_VIVASAYI_Mart_Business_Report_${timeRange.toLowerCase()}_${new Date().toISOString().slice(0, 10)}.${fileExt}`;
  a.click();
  URL.revokeObjectURL(url);
}

const EXPENSE_CATEGORIES = [
  'Store Rent & Lease',
  'Staff Salary & Wages',
  'Electricity & Utilities',
  'Packaging Materials',
  'Logistics & Delivery',
  'Marketing & Promotion',
  'Store Maintenance & Repairs',
  'Office & Administrative',
  'Raw Procurement Transport',
  'Miscellaneous'
];

interface PaginationBarProps {
  currentPage: number;
  pageSize: number;
  totalItems: number;
  onPageChange: (newPage: number) => void;
  onPageSizeChange: (newSize: number) => void;
  label?: string;
}

const PaginationBar: React.FC<PaginationBarProps> = ({
  currentPage,
  pageSize,
  totalItems,
  onPageChange,
  onPageSizeChange,
  label = 'records'
}) => {
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const startItem = totalItems === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const endItem = Math.min(currentPage * pageSize, totalItems);

  if (totalItems <= 0) return null;

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t border-emerald-100 dark:border-emerald-800 text-xs">
      <div className="flex items-center gap-3">
        <span className="text-gray-500 dark:text-emerald-400 font-medium">
          Showing <span className="font-bold text-emerald-950 dark:text-emerald-100">{startItem}</span> to{' '}
          <span className="font-bold text-emerald-950 dark:text-emerald-100">{endItem}</span> of{' '}
          <span className="font-bold text-emerald-950 dark:text-emerald-100">{totalItems}</span> {label}
        </span>
        <div className="flex items-center gap-1.5 ml-2">
          <span className="text-[11px] text-gray-400">Rows:</span>
          <select
            value={pageSize}
            onChange={e => {
              onPageSizeChange(Number(e.target.value));
              onPageChange(1);
            }}
            className="px-2 py-1 bg-white dark:bg-emerald-900 border border-emerald-200 dark:border-emerald-700 rounded-lg text-xs font-bold text-emerald-900 dark:text-emerald-100 outline-none cursor-pointer"
          >
            <option value={10}>10</option>
            <option value={25}>25</option>
            <option value={50}>50</option>
            <option value={100}>100</option>
          </select>
        </div>
      </div>

      <div className="flex items-center gap-1.5">
        <button
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage <= 1}
          className="px-3 py-1.5 rounded-xl border border-emerald-200 dark:border-emerald-700 bg-white dark:bg-emerald-900/60 text-emerald-900 dark:text-emerald-100 font-bold disabled:opacity-35 disabled:cursor-not-allowed hover:bg-emerald-50 dark:hover:bg-emerald-800 transition flex items-center gap-1 shadow-sm"
        >
          <ChevronLeft className="w-3.5 h-3.5" />
          <span>Prev</span>
        </button>

        <div className="flex items-center gap-1 px-1">
          {Array.from({ length: totalPages }, (_, i) => i + 1)
            .filter(p => p === 1 || p === totalPages || Math.abs(p - currentPage) <= 1)
            .map((p, idx, arr) => (
              <React.Fragment key={p}>
                {idx > 0 && arr[idx - 1] !== p - 1 && (
                  <span className="px-1 text-gray-400 font-bold">...</span>
                )}
                <button
                  onClick={() => onPageChange(p)}
                  className={`w-8 h-8 rounded-xl font-mono text-xs font-black transition shadow-sm ${
                    currentPage === p
                      ? 'bg-gradient-to-b from-emerald-600 to-teal-700 text-white shadow-emerald-500/30'
                      : 'bg-white dark:bg-emerald-900/60 text-emerald-900 dark:text-emerald-200 border border-emerald-200 dark:border-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-800'
                  }`}
                >
                  {p}
                </button>
              </React.Fragment>
            ))}
        </div>

        <button
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage >= totalPages}
          className="px-3 py-1.5 rounded-xl border border-emerald-200 dark:border-emerald-700 bg-white dark:bg-emerald-900/60 text-emerald-900 dark:text-emerald-100 font-bold disabled:opacity-35 disabled:cursor-not-allowed hover:bg-emerald-50 dark:hover:bg-emerald-800 transition flex items-center gap-1 shadow-sm"
        >
          <span>Next</span>
          <ChevronRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};

export default function ReportsPage() {
  const [activeTab, setActiveTab] = useState<'OVERVIEW' | 'SALES' | 'INVENTORY' | 'FINANCIAL' | 'CUSTOMERS'>('OVERVIEW');
  const [timeRange, setTimeRange] = useState<'TODAY' | 'WEEK' | 'MONTH' | 'YEAR' | 'ALL'>('MONTH');
  const [selectedChannel, setSelectedChannel] = useState<'ALL' | 'WHATSAPP' | 'POS' | 'WEBSITE'>('ALL');
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');
  const [autoRefreshSec, setAutoRefreshSec] = useState<number>(0); // 0 = off, 1 = 1s, 2 = 2s, 5 = 5s

  const [orders, setOrders] = useState<Order[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const { showActionModal, confirmAndExecute } = useActionModal();
  const isDBMode = isLiveDatabaseMode();

  // Pagination states for each report table
  const [salesPage, setSalesPage] = useState(1);
  const [salesPageSize, setSalesPageSize] = useState(10);

  const [invPage, setInvPage] = useState(1);
  const [invPageSize, setInvPageSize] = useState(10);

  const [expPage, setExpPage] = useState(1);
  const [expPageSize, setExpPageSize] = useState(10);

  const [custPage, setCustPage] = useState(1);
  const [custPageSize, setCustPageSize] = useState(10);

  // Expense CRUD Modal states
  const [showExpenseModal, setShowExpenseModal] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [expenseForm, setExpenseForm] = useState({
    category_name: 'Store Rent & Lease',
    amount: '',
    expense_date: new Date().toISOString().slice(0, 10),
    payment_method: 'CASH',
    description: '',
  });

  // Reset pagination on filter or tab change
  useEffect(() => {
    setSalesPage(1);
    setExpPage(1);
  }, [timeRange, selectedChannel, selectedStatus, activeTab]);

  const loadAllReportData = React.useCallback(async () => {
    try {
      // getJSONStore handles DB fetching if Supabase is active, or offline JSON files if offline
      const [o, p, c, e] = await Promise.all([
        getJSONStore<Order>('orders'),
        getJSONStore<Product>('products'),
        getJSONStore<Customer>('customers'),
        getJSONStore<Expense>('expenses'),
      ]);
      setOrders(o || []);
      setProducts(p || []);
      setCustomers(c || []);
      setExpenses(e || []);
    } catch (err) {
      console.warn('Failed to load DB / JSON report store data:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAllReportData();
  }, [loadAllReportData]);

  // Live Auto-Refresh Interval with Pop Modal
  useEffect(() => {
    if (!autoRefreshSec || autoRefreshSec <= 0) return;
    const interval = setInterval(() => {
      setIsRefreshing(true);
      loadAllReportData();
    }, autoRefreshSec * 1000);
    return () => clearInterval(interval);
  }, [autoRefreshSec, loadAllReportData]);

  // Strict Multi-Filter for Orders (Date Range, Channel, Status)
  const filteredOrders = useMemo(() => {
    if (!orders || orders.length === 0) return [];

    const now = new Date();
    return orders.filter(o => {
      // Time Range Filter
      if (timeRange !== 'ALL') {
        if (!o.created_at) return false;
        const oDate = new Date(o.created_at);
        const diffMs = now.getTime() - oDate.getTime();
        const diffDays = diffMs / (1000 * 3600 * 24);

        if (timeRange === 'TODAY' && oDate.toDateString() !== now.toDateString()) return false;
        if (timeRange === 'WEEK' && (diffDays < 0 || diffDays > 7)) return false;
        if (timeRange === 'MONTH' && (diffDays < 0 || diffDays > 30)) return false;
        if (timeRange === 'YEAR' && (diffDays < 0 || diffDays > 365)) return false;
      }

      // Channel Filter
      if (selectedChannel !== 'ALL') {
        if (selectedChannel === 'POS' && o.source !== 'POS' && o.source !== 'WALK_IN') return false;
        if (selectedChannel !== 'POS' && o.source !== selectedChannel) return false;
      }

      // Order Status Filter
      if (selectedStatus !== 'ALL' && o.status !== selectedStatus) return false;

      return true;
    });
  }, [orders, timeRange, selectedChannel, selectedStatus]);

  // Strict Date Range Filter for Expenses
  const filteredExpenses = useMemo(() => {
    if (!expenses || expenses.length === 0) return [];
    if (timeRange === 'ALL') return expenses;

    const now = new Date();
    return expenses.filter(e => {
      const eDateStr = e.expense_date || e.created_at;
      if (!eDateStr) return false;
      const eDate = new Date(eDateStr);
      const diffMs = now.getTime() - eDate.getTime();
      const diffDays = diffMs / (1000 * 3600 * 24);

      if (timeRange === 'TODAY') {
        return eDate.toDateString() === now.toDateString();
      }
      if (timeRange === 'WEEK') {
        return diffDays >= 0 && diffDays <= 7;
      }
      if (timeRange === 'MONTH') {
        return diffDays >= 0 && diffDays <= 30;
      }
      if (timeRange === 'YEAR') {
        return diffDays >= 0 && diffDays <= 365;
      }
      return true;
    });
  }, [expenses, timeRange]);

  // Real Dynamic Calculations computed strictly from filtered data (NO fake fallbacks)
  const totalSales = useMemo(() => filteredOrders.reduce((acc, o) => acc + (o.total || 0), 0), [filteredOrders]);
  const whatsappSales = useMemo(() => filteredOrders.filter(o => o.source === 'WHATSAPP').reduce((acc, o) => acc + (o.total || 0), 0), [filteredOrders]);
  const posSales = useMemo(() => filteredOrders.filter(o => o.source === 'POS' || o.source === 'WALK_IN').reduce((acc, o) => acc + (o.total || 0), 0), [filteredOrders]);
  const websiteSales = useMemo(() => filteredOrders.filter(o => o.source === 'WEBSITE').reduce((acc, o) => acc + (o.total || 0), 0), [filteredOrders]);
  
  const avgOrderValue = useMemo(() => filteredOrders.length > 0 ? Math.round(totalSales / filteredOrders.length) : 0, [totalSales, filteredOrders]);

  // Exact COGS calculated from actual order items and product landed costs
  const calculatedCOGS = useMemo(() => {
    return filteredOrders.reduce((sum, order) => {
      if (!order.items || !Array.isArray(order.items)) return sum;
      const orderItemsCost = order.items.reduce((itemSum, item) => {
        const prod = products.find(p => p.id === item.product_id || p.sku === item.sku_snapshot);
        const landedCost = prod?.landed_cost || prod?.purchase_price || 0;
        return itemSum + (item.quantity * landedCost);
      }, 0);
      return sum + orderItemsCost;
    }, 0);
  }, [filteredOrders, products]);

  const grossProfit = useMemo(() => totalSales - calculatedCOGS, [totalSales, calculatedCOGS]);
  const grossProfitMarginPct = useMemo(() => totalSales > 0 ? Math.round((grossProfit / totalSales) * 100) : 0, [grossProfit, totalSales]);

  const totalOperatingExpenses = useMemo(() => filteredExpenses.reduce((acc, e) => acc + (e.amount || 0), 0), [filteredExpenses]);
  const netOperatingProfit = useMemo(() => grossProfit - totalOperatingExpenses, [grossProfit, totalOperatingExpenses]);
  const netMarginPct = useMemo(() => totalSales > 0 ? Math.round((netOperatingProfit / totalSales) * 100) : 0, [netOperatingProfit, totalSales]);

  // Inventory Stock Holding Values
  const inventoryStockLandedCost = useMemo(() => products.reduce((acc, p) => acc + (p.current_stock || 0) * (p.landed_cost || p.purchase_price || 0), 0), [products]);
  const inventoryRetailValue = useMemo(() => products.reduce((acc, p) => acc + (p.current_stock || 0) * (p.selling_price || 0), 0), [products]);
  const potentialInventoryMargin = useMemo(() => inventoryRetailValue - inventoryStockLandedCost, [inventoryRetailValue, inventoryStockLandedCost]);

  const lowStockCount = useMemo(() => products.filter(p => (p.current_stock || 0) <= (p.reorder_level || 5)).length, [products]);

  // Past 7 Days Revenue Trend calculated accurately
  const last7DaysTrend = useMemo(() => {
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const result: { label: string; dateStr: string; total: number; count: number }[] = [];
    const now = new Date();

    for (let i = 6; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(now.getDate() - i);
      const compareStr = d.toDateString();
      const dayLabel = days[d.getDay()];

      const dayOrders = orders.filter(o => {
        if (!o.created_at) return false;
        return new Date(o.created_at).toDateString() === compareStr;
      });
      const dayTotal = dayOrders.reduce((acc, o) => acc + (o.total || 0), 0);

      result.push({
        label: i === 0 ? 'Today' : dayLabel,
        dateStr: d.toLocaleDateString('en-IN', { month: 'short', day: 'numeric' }),
        total: dayTotal,
        count: dayOrders.length
      });
    }

    return result;
  }, [orders]);

  // Sorted & Paged Data across all tabs with Recent-First sorting
  const sortedFilteredOrders = useMemo(() => {
    return [...filteredOrders].sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime());
  }, [filteredOrders]);

  const pagedOrders = useMemo(() => {
    const start = (salesPage - 1) * salesPageSize;
    return sortedFilteredOrders.slice(start, start + salesPageSize);
  }, [sortedFilteredOrders, salesPage, salesPageSize]);

  const pagedProducts = useMemo(() => {
    const start = (invPage - 1) * invPageSize;
    return products.slice(start, start + invPageSize);
  }, [products, invPage, invPageSize]);

  const sortedFilteredExpenses = useMemo(() => {
    return [...filteredExpenses].sort((a, b) => new Date(b.expense_date || b.created_at || 0).getTime() - new Date(a.expense_date || a.created_at || 0).getTime());
  }, [filteredExpenses]);

  const pagedExpenses = useMemo(() => {
    const start = (expPage - 1) * expPageSize;
    return sortedFilteredExpenses.slice(start, start + expPageSize);
  }, [sortedFilteredExpenses, expPage, expPageSize]);

  const sortedCustomers = useMemo(() => {
    return [...customers].sort((a, b) => (b.total_spent || 0) - (a.total_spent || 0));
  }, [customers]);

  const pagedCustomers = useMemo(() => {
    const start = (custPage - 1) * custPageSize;
    return sortedCustomers.slice(start, start + custPageSize);
  }, [sortedCustomers, custPage, custPageSize]);

  // Expense Handlers (Add, Edit, Delete) with "Yes or No" confirmation pop modal
  const handleOpenAddExpense = () => {
    setEditingExpense(null);
    setExpenseForm({
      category_name: 'Store Rent & Lease',
      amount: '',
      expense_date: new Date().toISOString().slice(0, 10),
      payment_method: 'CASH',
      description: '',
    });
    setShowExpenseModal(true);
  };

  const handleOpenEditExpense = (exp: Expense) => {
    setEditingExpense(exp);
    setExpenseForm({
      category_name: exp.category_name,
      amount: String(exp.amount),
      expense_date: exp.expense_date || new Date().toISOString().slice(0, 10),
      payment_method: exp.payment_method || 'CASH',
      description: exp.description || '',
    });
    setShowExpenseModal(true);
  };

  const handleSaveExpense = (e: React.FormEvent) => {
    e.preventDefault();
    const amt = parseFloat(expenseForm.amount);
    if (isNaN(amt) || amt <= 0) {
      toast.error('Please enter a valid expense amount greater than ₹0');
      return;
    }
    if (!expenseForm.description.trim()) {
      toast.error('Please enter an expense description / purpose');
      return;
    }

    // Modal asking "Yes or No" before executing
    confirmAndExecute(
      {
        title: editingExpense ? 'Confirm Update Operating Expense' : 'Confirm Add Operating Expense',
        message: `Are you sure you want to ${editingExpense ? 'update' : 'record'} an operating expense of ₹${amt.toLocaleString('en-IN')} for "${expenseForm.category_name}"?`,
        description: 'Please select YES to commit this transaction to the ledger, or NO to cancel.',
        confirmText: editingExpense ? 'Yes, Update Expense' : 'Yes, Add Expense',
        cancelText: 'No, Cancel',
        variant: 'success'
      },
      {
        title: editingExpense ? 'Updating Operating Expense' : 'Recording Operating Expense',
        subtitle: `Saving ₹${amt.toLocaleString('en-IN')} under ${expenseForm.category_name}...`,
        badge: 'Expense Ledger Live',
        duration: 750,
        steps: [
          'Validating expense amount & account allocation...',
          'Persisting record to database & local storage...',
          'Recalculating Net P&L & Solvency Coverage ratio...',
          'Operating expense successfully committed!'
        ],
        onComplete: () => {
          setShowExpenseModal(false);
          setEditingExpense(null);
          toast.success(editingExpense ? 'Operating expense updated!' : 'New operating expense recorded!');
        }
      },
      async () => {
        const now = new Date().toISOString();
        let updated: Expense[];
        if (editingExpense) {
          const updatedItem: Expense = {
            ...editingExpense,
            category_name: expenseForm.category_name,
            amount: amt,
            expense_date: expenseForm.expense_date,
            payment_method: expenseForm.payment_method as any,
            description: expenseForm.description.trim(),
            updated_at: now
          };
          updated = expenses.map(ex => ex.id === editingExpense.id ? updatedItem : ex);
        } else {
          const newItem: Expense = {
            id: `exp-${Date.now()}`,
            category_name: expenseForm.category_name,
            amount: amt,
            expense_date: expenseForm.expense_date,
            payment_method: expenseForm.payment_method as any,
            description: expenseForm.description.trim(),
            created_at: now,
            updated_at: now
          };
          updated = [newItem, ...expenses];
        }
        await setJSONStore('expenses', updated);
        setExpenses(updated);
      }
    );
  };

  const handleDeleteExpense = (exp: Expense) => {
    // Modal asking "Yes or No" before executing
    confirmAndExecute(
      {
        title: 'Confirm Delete Operating Expense',
        message: `Are you sure you want to permanently delete expense "${exp.description || exp.category_name}" for ₹${Number(exp.amount).toLocaleString('en-IN')}?`,
        description: 'This transaction will be purged from the ledger. Select YES to confirm or NO to cancel.',
        confirmText: 'Yes, Delete Permanently',
        cancelText: 'No, Cancel',
        variant: 'danger'
      },
      {
        title: 'Deleting Operating Expense',
        subtitle: `Purging transaction ₹${Number(exp.amount).toLocaleString('en-IN')}...`,
        badge: 'Expense Ledger Live',
        duration: 700,
        steps: [
          'Locating transaction in ledger storage...',
          'Purging expense record from cloud database...',
          'Re-balancing Net Operating Profit and EBITDA...',
          'Expense deleted successfully!'
        ],
        onComplete: () => {
          toast.success('Operating expense permanently deleted!');
        }
      },
      async () => {
        const updated = expenses.filter(e => e.id !== exp.id);
        await setJSONStore('expenses', updated);
        setExpenses(updated);
      }
    );
  };

  if (loading) {
    return <DashboardSkeleton />;
  }

  const handleExportWithProgress = (fmt: ExportFormat) => {
    setIsExportModalOpen(false);
    showActionModal({
      title: `Compiling ${fmt} Intelligence Report`,
      subtitle: `Aggregating ${filteredOrders.length} orders & stock ledger records...`,
      badge: 'Report Engine Live',
      duration: 850,
      steps: [
        'Analyzing financial ledgers & product land costs...',
        `Formatting document stream as ${fmt}...`,
        'Finalizing business intelligence report download...',
        'Report exported successfully!'
      ],
      onComplete: () => {
        exportReportData(fmt, filteredOrders, products, filteredExpenses, customers, timeRange);
      }
    });
  };

  return (
    <div className="space-y-6 animate-fadeIn pb-12">
      <RefreshSpinnerModal
        isOpen={isRefreshing}
        moduleName="Business Intelligence & Reports"
        title="Loading Live Database & JSON Report Analytics..."
        subtitle="Computing real-time sales revenue, COGS, landed cost valuation & P&L metrics..."
        onComplete={() => setIsRefreshing(false)}
      />

      <ExportFormatModal
        isOpen={isExportModalOpen}
        title="Export Business Intelligence Report"
        description={`Select your desired format to download the ${timeRange} report data:`}
        totalRecords={filteredOrders.length}
        onClose={() => setIsExportModalOpen(false)}
        onExport={handleExportWithProgress}
      />

      {/* Top Header Card */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-emerald-950 p-6 rounded-3xl shadow-sm border border-emerald-100 dark:border-emerald-800">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold font-serif text-emerald-950 dark:text-emerald-100 flex items-center gap-2">
              <BarChart3 className="w-7 h-7 text-emerald-600 dark:text-amber-400" />
              Reports & Business Intelligence
            </h1>
            <span className="px-2.5 py-1 text-[11px] font-black rounded-lg bg-emerald-100 dark:bg-emerald-900/80 text-emerald-900 dark:text-amber-300 border border-emerald-300 dark:border-emerald-700 flex items-center gap-1">
              <Database className="w-3 h-3 text-emerald-600 dark:text-amber-400" />
              {isDBMode ? 'Supabase DB' : 'JSON Offline Engine'}
            </span>
          </div>
          <p className="text-xs text-gray-500 dark:text-emerald-300 mt-1">
            Real-time business performance analytics, COGS gross margins, stock valuation, and operating P&L summaries.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 md:gap-3">
          {/* Auto-Refresh Dropdown with presets (Off, 1s, 2s, 3s, 5s, 10s, 30s, 1min) & Custom Duration */}
          <AutoRefreshDropdown
            intervalSec={autoRefreshSec}
            onIntervalChange={(sec) => {
              setAutoRefreshSec(sec);
              if (sec > 0) setIsRefreshing(true);
            }}
            onRefresh={() => {
              setIsRefreshing(true);
              loadAllReportData();
            }}
            variant="emerald"
          />

          {/* Time Range Selector */}
          <div className="flex bg-emerald-50 dark:bg-emerald-900 p-1 rounded-2xl border border-emerald-200 dark:border-emerald-700">
            {(['TODAY', 'WEEK', 'MONTH', 'YEAR', 'ALL'] as const).map(range => (
              <button
                key={range}
                onClick={() => setTimeRange(range)}
                className={`px-3 py-1.5 text-xs font-black rounded-xl transition cursor-pointer ${
                  timeRange === range
                    ? 'bg-emerald-700 text-white shadow-sm'
                    : 'text-emerald-800 dark:text-emerald-200 hover:text-emerald-950'
                }`}
              >
                {range}
              </button>
            ))}
          </div>

          {/* Acquisition Channel Filter */}
          <div className="flex items-center bg-white dark:bg-emerald-900 border border-emerald-200 dark:border-emerald-700 px-2.5 py-1.5 rounded-2xl text-xs font-bold shadow-xs">
            <span className="text-[10px] font-black uppercase text-emerald-600 dark:text-emerald-300 mr-1.5">Channel:</span>
            <select
              value={selectedChannel}
              onChange={(e) => setSelectedChannel(e.target.value as any)}
              className="bg-transparent text-emerald-950 dark:text-emerald-100 font-extrabold focus:outline-hidden cursor-pointer"
            >
              <option value="ALL" className="dark:bg-emerald-950">All Channels</option>
              <option value="WHATSAPP" className="dark:bg-emerald-950">WhatsApp Direct</option>
              <option value="POS" className="dark:bg-emerald-950">POS Store</option>
              <option value="WEBSITE" className="dark:bg-emerald-950">Website</option>
            </select>
          </div>

          {/* Fulfillment Status Filter */}
          <div className="flex items-center bg-white dark:bg-emerald-900 border border-emerald-200 dark:border-emerald-700 px-2.5 py-1.5 rounded-2xl text-xs font-bold shadow-xs">
            <span className="text-[10px] font-black uppercase text-emerald-600 dark:text-emerald-300 mr-1.5">Status:</span>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="bg-transparent text-emerald-950 dark:text-emerald-100 font-extrabold focus:outline-hidden cursor-pointer"
            >
              <option value="ALL" className="dark:bg-emerald-950">All Statuses</option>
              <option value="DELIVERED" className="dark:bg-emerald-950">Delivered</option>
              <option value="CONFIRMED" className="dark:bg-emerald-950">Confirmed</option>
              <option value="READY" className="dark:bg-emerald-950">Ready</option>
              <option value="PACKING" className="dark:bg-emerald-950">Packing</option>
              <option value="NEW" className="dark:bg-emerald-950">New</option>
              <option value="CANCELLED" className="dark:bg-emerald-950">Cancelled</option>
            </select>
          </div>

          <button
            onClick={() => {
              setIsRefreshing(true);
              loadAllReportData();
            }}
            className="px-3.5 py-2 bg-white dark:bg-emerald-900 border border-emerald-200 dark:border-emerald-700 hover:bg-emerald-50 text-emerald-900 dark:text-emerald-200 font-bold text-xs rounded-xl shadow-xs flex items-center gap-1.5 transition-all cursor-pointer"
          >
            <RefreshCw className={`w-4 h-4 text-emerald-600 dark:text-amber-400 ${isRefreshing ? 'animate-spin' : ''}`} />
            <span>Sync Data</span>
          </button>

          <button
            onClick={() => setIsExportModalOpen(true)}
            className="px-4 py-2 bg-gradient-to-r from-emerald-700 to-emerald-800 hover:from-emerald-800 hover:to-emerald-900 text-white font-extrabold text-xs rounded-xl shadow flex items-center gap-1.5 cursor-pointer"
          >
            <Download className="w-4 h-4" /> Export Report...
          </button>
        </div>
      </div>

      {/* Tabs Header */}
      <div className="flex border-b border-emerald-200 dark:border-emerald-800 gap-3 sm:gap-6 text-xs font-extrabold overflow-x-auto pb-1">
        {[
          { key: 'OVERVIEW', label: 'Executive Overview', icon: Building2 },
          { key: 'SALES', label: 'Sales & Revenue Channels', icon: TrendingUp },
          { key: 'INVENTORY', label: 'Inventory Cost & Stock Value', icon: Package },
          { key: 'FINANCIAL', label: 'Financial P&L & Expenses', icon: DollarSign },
          { key: 'CUSTOMERS', label: 'Customer Lifetime Value', icon: Users }
        ].map(tab => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as any)}
              className={`pb-3 flex items-center gap-2 transition border-b-2 whitespace-nowrap cursor-pointer ${
                activeTab === tab.key
                  ? 'border-emerald-600 text-emerald-950 dark:text-amber-400 dark:border-amber-400 font-black'
                  : 'border-transparent text-gray-500 dark:text-emerald-400 hover:text-emerald-900'
              }`}
            >
              <Icon className="w-4 h-4" /> {tab.label}
            </button>
          );
        })}
      </div>

      {/* 1. EXECUTIVE OVERVIEW TAB */}
      {activeTab === 'OVERVIEW' && (
        <div className="space-y-6">
          {/* Key KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white dark:bg-emerald-950 p-5 rounded-3xl border border-emerald-100 dark:border-emerald-800 shadow-sm">
              <div className="flex justify-between items-start">
                <p className="text-xs font-bold text-gray-500 dark:text-emerald-300">Gross Sales Revenue</p>
                <span className="p-2 bg-emerald-50 dark:bg-emerald-900 rounded-xl text-emerald-700 dark:text-amber-400">
                  <TrendingUp className="w-4 h-4" />
                </span>
              </div>
              <h3 className="text-2xl font-black text-emerald-950 dark:text-emerald-100 mt-1">{formatPrice(totalSales)}</h3>
              <p className="text-[11px] text-emerald-700 dark:text-amber-300 mt-1 font-semibold flex items-center gap-1">
                <ShoppingCart className="w-3.5 h-3.5" /> {filteredOrders.length} orders in {timeRange}
              </p>
            </div>

            <div className="bg-white dark:bg-emerald-950 p-5 rounded-3xl border border-emerald-100 dark:border-emerald-800 shadow-sm">
              <div className="flex justify-between items-start">
                <p className="text-xs font-bold text-emerald-700 dark:text-emerald-300">Gross Profit (Margin %)</p>
                <span className="p-2 bg-emerald-50 dark:bg-emerald-900 rounded-xl text-emerald-700 dark:text-amber-400">
                  <Percent className="w-4 h-4" />
                </span>
              </div>
              <h3 className="text-2xl font-black text-emerald-800 dark:text-amber-300 mt-1">{formatPrice(grossProfit)}</h3>
              <p className="text-[11px] text-emerald-700 dark:text-emerald-400 mt-1 font-extrabold">
                {grossProfitMarginPct}% Gross Profit Margin
              </p>
            </div>

            <div className="bg-white dark:bg-emerald-950 p-5 rounded-3xl border border-emerald-100 dark:border-emerald-800 shadow-sm">
              <div className="flex justify-between items-start">
                <p className="text-xs font-bold text-gray-500 dark:text-emerald-300">Net Operating Margin</p>
                <span className="p-2 bg-emerald-50 dark:bg-emerald-900 rounded-xl text-emerald-700 dark:text-amber-400">
                  <DollarSign className="w-4 h-4" />
                </span>
              </div>
              <h3 className={`text-2xl font-black mt-1 ${netOperatingProfit >= 0 ? 'text-emerald-800 dark:text-amber-400' : 'text-rose-600'}`}>
                {formatPrice(netOperatingProfit)}
              </h3>
              <p className="text-[11px] text-gray-500 dark:text-emerald-400 mt-1 font-medium">
                {netMarginPct}% Net Operating Margin
              </p>
            </div>

            <div className="bg-white dark:bg-emerald-950 p-5 rounded-3xl border border-emerald-100 dark:border-emerald-800 shadow-sm">
              <div className="flex justify-between items-start">
                <p className="text-xs font-bold text-gray-500 dark:text-emerald-300">Average Order Value (AOV)</p>
                <span className="p-2 bg-emerald-50 dark:bg-emerald-900 rounded-xl text-emerald-700 dark:text-amber-400">
                  <BarChart3 className="w-4 h-4" />
                </span>
              </div>
              <h3 className="text-2xl font-black text-emerald-950 dark:text-emerald-100 mt-1">{formatPrice(avgOrderValue)}</h3>
              <p className="text-[11px] text-emerald-700 dark:text-emerald-300 mt-1 font-medium">
                Across {filteredOrders.length} processed transactions
              </p>
            </div>
          </div>

          {/* Business Health Summary Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Sales Channel Breakdown Card */}
            <div className="bg-white dark:bg-emerald-950 p-6 rounded-3xl border border-emerald-100 dark:border-emerald-800 shadow-sm space-y-4">
              <h3 className="text-sm font-extrabold text-emerald-950 dark:text-emerald-100 flex items-center gap-2">
                <Layers className="w-4 h-4 text-emerald-600 dark:text-amber-400" />
                Channel Revenue Breakdown
              </h3>
              <div className="space-y-3">
                <div>
                  <div className="flex justify-between text-xs font-bold mb-1">
                    <span className="text-emerald-800 dark:text-emerald-300">WhatsApp Commerce</span>
                    <span className="font-mono text-emerald-950 dark:text-amber-300">{formatPrice(whatsappSales)} ({totalSales > 0 ? Math.round((whatsappSales / totalSales) * 100) : 0}%)</span>
                  </div>
                  <div className="w-full bg-emerald-100 dark:bg-emerald-900 h-2 rounded-full overflow-hidden">
                    <div style={{ width: `${totalSales > 0 ? (whatsappSales / totalSales) * 100 : 0}%` }} className="bg-emerald-600 h-full rounded-full" />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-xs font-bold mb-1">
                    <span className="text-blue-800 dark:text-blue-300">Counter POS</span>
                    <span className="font-mono text-emerald-950 dark:text-amber-300">{formatPrice(posSales)} ({totalSales > 0 ? Math.round((posSales / totalSales) * 100) : 0}%)</span>
                  </div>
                  <div className="w-full bg-blue-100 dark:bg-blue-950 h-2 rounded-full overflow-hidden">
                    <div style={{ width: `${totalSales > 0 ? (posSales / totalSales) * 100 : 0}%` }} className="bg-blue-600 h-full rounded-full" />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-xs font-bold mb-1">
                    <span className="text-purple-800 dark:text-purple-300">Website Storefront</span>
                    <span className="font-mono text-emerald-950 dark:text-amber-300">{formatPrice(websiteSales)} ({totalSales > 0 ? Math.round((websiteSales / totalSales) * 100) : 0}%)</span>
                  </div>
                  <div className="w-full bg-purple-100 dark:bg-purple-950 h-2 rounded-full overflow-hidden">
                    <div style={{ width: `${totalSales > 0 ? (websiteSales / totalSales) * 100 : 0}%` }} className="bg-purple-600 h-full rounded-full" />
                  </div>
                </div>
              </div>
            </div>

            {/* Past 7 Days Revenue Trend */}
            <div className="md:col-span-2 bg-white dark:bg-emerald-950 p-6 rounded-3xl border border-emerald-100 dark:border-emerald-800 shadow-sm">
              <h3 className="text-sm font-extrabold text-emerald-950 dark:text-emerald-100 mb-6 flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-emerald-600 dark:text-amber-400" />
                Past 7 Days Revenue Trend (₹)
              </h3>
              <div className="h-44 flex items-end justify-between gap-3 pt-6 pb-2 px-2 bg-emerald-50/50 dark:bg-emerald-900/40 rounded-2xl">
                {last7DaysTrend.map((item, idx) => {
                  const maxVal = Math.max(...last7DaysTrend.map(t => t.total), 1);
                  const heightPct = item.total > 0 ? Math.max(18, Math.round((item.total / maxVal) * 100)) : 8;
                  return (
                    <div key={idx} className="flex-1 flex flex-col items-center h-full justify-end group">
                      <div className="text-[10px] font-mono font-bold text-emerald-800 dark:text-amber-300 mb-1 opacity-90">
                        ₹{item.total}
                      </div>
                      <div
                        style={{ height: `${heightPct}%` }}
                        className={`w-full rounded-t-xl transition ${
                          item.total > 0
                            ? 'bg-gradient-to-t from-emerald-700 to-emerald-500 dark:from-emerald-600 dark:to-amber-400 group-hover:from-emerald-600 group-hover:to-amber-300'
                            : 'bg-gray-200 dark:bg-emerald-800/40'
                        }`}
                      />
                      <span className="text-[10px] font-extrabold text-gray-600 dark:text-emerald-300 mt-2">
                        {item.label}
                      </span>
                      <span className="text-[9px] text-gray-400 dark:text-emerald-400">
                        {item.dateStr}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 2. SALES TAB */}
      {activeTab === 'SALES' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white dark:bg-emerald-950 p-5 rounded-3xl border border-emerald-100 dark:border-emerald-800 shadow-sm">
              <p className="text-xs font-bold text-gray-500 dark:text-emerald-300">Filtered Sales Revenue</p>
              <h3 className="text-2xl font-black text-emerald-950 dark:text-emerald-100 mt-1">{formatPrice(totalSales)}</h3>
              <p className="text-[11px] text-emerald-700 dark:text-amber-300 mt-1 font-semibold flex items-center gap-1">
                <ArrowUpRight className="w-3.5 h-3.5" /> Calculated for {timeRange} ({filteredOrders.length} orders)
              </p>
            </div>

            <div className="bg-white dark:bg-emerald-950 p-5 rounded-3xl border border-emerald-100 dark:border-emerald-800 shadow-sm">
              <p className="text-xs font-bold text-emerald-700 dark:text-emerald-300">WhatsApp Channel Revenue</p>
              <h3 className="text-2xl font-black text-emerald-800 dark:text-emerald-200 mt-1">{formatPrice(whatsappSales)}</h3>
              <p className="text-[11px] text-gray-500 dark:text-emerald-400 mt-1 font-medium">
                {totalSales > 0 ? Math.round((whatsappSales / totalSales) * 100) : 0}% of period sales
              </p>
            </div>

            <div className="bg-white dark:bg-emerald-950 p-5 rounded-3xl border border-emerald-100 dark:border-emerald-800 shadow-sm">
              <p className="text-xs font-bold text-blue-700 dark:text-blue-300">Counter POS Channel Revenue</p>
              <h3 className="text-2xl font-black text-blue-800 dark:text-blue-200 mt-1">{formatPrice(posSales)}</h3>
              <p className="text-[11px] text-gray-500 dark:text-emerald-400 mt-1 font-medium">
                {totalSales > 0 ? Math.round((posSales / totalSales) * 100) : 0}% of period sales
              </p>
            </div>

            <div className="bg-white dark:bg-emerald-950 p-5 rounded-3xl border border-emerald-100 dark:border-emerald-800 shadow-sm">
              <p className="text-xs font-bold text-gray-500 dark:text-emerald-300">Average Order Value (AOV)</p>
              <h3 className="text-2xl font-black text-emerald-950 dark:text-emerald-100 mt-1">{formatPrice(avgOrderValue)}</h3>
              <p className="text-[11px] text-emerald-700 dark:text-emerald-300 mt-1 font-medium">
                Across {filteredOrders.length} period orders
              </p>
            </div>
          </div>

          {/* Orders Table */}
          <div className="bg-white dark:bg-emerald-950 rounded-3xl border border-emerald-100 dark:border-emerald-800 p-5 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-emerald-100 dark:border-emerald-900 pb-3">
              <h3 className="text-sm font-bold text-emerald-950 dark:text-emerald-100 flex items-center gap-2">
                <FileText className="w-4 h-4 text-emerald-600 dark:text-amber-400" />
                Sales Orders Revenue Ledger ({timeRange} filter: {sortedFilteredOrders.length} orders)
              </h3>
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-emerald-100 dark:bg-emerald-900 text-emerald-800 dark:text-emerald-200 border border-emerald-300 dark:border-emerald-700">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Recent Orders First
              </span>
            </div>
            {sortedFilteredOrders.length === 0 ? (
              <div className="text-center py-10 text-gray-400 dark:text-emerald-500 text-xs font-semibold">
                No orders recorded for the selected time range ({timeRange}). Select another time range or "ALL".
              </div>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-emerald-50 dark:bg-emerald-900 text-emerald-900 dark:text-emerald-200 uppercase text-[10px] font-bold">
                      <tr>
                        <th className="p-3">Order #</th>
                        <th className="p-3">Date</th>
                        <th className="p-3">Source Channel</th>
                        <th className="p-3">Customer</th>
                        <th className="p-3">Payment</th>
                        <th className="p-3 text-right">Total Amount</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-emerald-100 dark:divide-emerald-800 text-gray-700 dark:text-emerald-200">
                      {pagedOrders.map(o => (
                        <tr key={o.id} className="hover:bg-emerald-50/50 dark:hover:bg-emerald-900/30 transition">
                          <td className="p-3">
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-xs font-mono font-black bg-gradient-to-b from-white to-gray-100 dark:from-emerald-900 dark:to-emerald-950 text-emerald-950 dark:text-emerald-100 border border-gray-200 dark:border-emerald-700 shadow-[0_2px_4px_rgba(0,0,0,0.08),inset_0_1px_0_rgba(255,255,255,0.9)] dark:shadow-[0_2px_4px_rgba(0,0,0,0.3),inset_0_1px_0_rgba(255,255,255,0.15)]">
                              {o.order_number}
                            </span>
                          </td>
                          <td className="p-3 font-mono text-gray-500 text-[11px]">
                            {o.created_at ? new Date(o.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '-'}
                          </td>
                          <td className="p-3">
                            {o.source === 'WHATSAPP' ? (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-black tracking-wider uppercase bg-gradient-to-b from-emerald-50 to-emerald-100 dark:from-emerald-900 dark:to-emerald-950 text-emerald-800 dark:text-emerald-200 border border-emerald-300 dark:border-emerald-700 shadow-[0_2px_4px_rgba(16,185,129,0.15),inset_0_1px_0_rgba(255,255,255,0.8)]">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
                                WhatsApp
                              </span>
                            ) : o.source === 'WEBSITE' ? (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-black tracking-wider uppercase bg-gradient-to-b from-purple-50 to-purple-100 dark:from-purple-900 dark:to-purple-950 text-purple-800 dark:text-purple-200 border border-purple-300 dark:border-purple-700 shadow-[0_2px_4px_rgba(168,85,247,0.15),inset_0_1px_0_rgba(255,255,255,0.8)]">
                                <span className="w-1.5 h-1.5 rounded-full bg-purple-500 animate-ping" />
                                Online Web
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-black tracking-wider uppercase bg-gradient-to-b from-blue-50 to-blue-100 dark:from-blue-900 dark:to-blue-950 text-blue-800 dark:text-blue-200 border border-blue-300 dark:border-blue-700 shadow-[0_2px_4px_rgba(59,130,246,0.15),inset_0_1px_0_rgba(255,255,255,0.8)]">
                                <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
                                Counter POS
                              </span>
                            )}
                          </td>
                          <td className="p-3 text-gray-700 dark:text-emerald-200 font-medium">
                            {o.customer_name_snapshot || 'Walk-in Customer'}
                          </td>
                          <td className="p-3">
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-gradient-to-b from-amber-50 to-amber-100 dark:from-amber-950/70 dark:to-emerald-950 text-amber-900 dark:text-amber-200 border border-amber-300 dark:border-amber-700 shadow-[0_2px_4px_rgba(245,158,11,0.12),inset_0_1px_0_rgba(255,255,255,0.8)]">
                              {o.payment_method || 'CASH'}
                            </span>
                          </td>
                          <td className="p-3 text-right">
                            <span className="inline-flex items-center px-2.5 py-1 rounded-xl text-xs font-mono font-black text-emerald-950 dark:text-amber-300 bg-emerald-50 dark:bg-emerald-900/60 border border-emerald-200 dark:border-emerald-700 shadow-sm">
                              {formatPrice(o.total || 0)}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <PaginationBar
                  currentPage={salesPage}
                  pageSize={salesPageSize}
                  totalItems={sortedFilteredOrders.length}
                  onPageChange={setSalesPage}
                  onPageSizeChange={setSalesPageSize}
                  label="orders"
                />
              </>
            )}
          </div>
        </div>
      )}

      {/* 3. INVENTORY TAB */}
      {activeTab === 'INVENTORY' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-white dark:bg-emerald-950 p-5 rounded-3xl border border-emerald-100 dark:border-emerald-800 shadow-sm">
              <p className="text-xs font-bold text-gray-500 dark:text-emerald-300">Stock Holding Landed Cost</p>
              <h3 className="text-2xl font-black text-emerald-950 dark:text-emerald-100 mt-1">{formatPrice(inventoryStockLandedCost)}</h3>
              <p className="text-[10px] text-gray-500 dark:text-emerald-400 mt-1 font-medium">Computed from purchase landed costs</p>
            </div>

            <div className="bg-white dark:bg-emerald-950 p-5 rounded-3xl border border-emerald-100 dark:border-emerald-800 shadow-sm">
              <p className="text-xs font-bold text-emerald-700 dark:text-emerald-300">Catalog Retail Selling Value</p>
              <h3 className="text-2xl font-black text-emerald-800 dark:text-amber-300 mt-1">{formatPrice(inventoryRetailValue)}</h3>
              <p className="text-[10px] text-emerald-700 dark:text-emerald-400 mt-1 font-medium">Potential gross revenue at retail prices</p>
            </div>

            <div className="bg-white dark:bg-emerald-950 p-5 rounded-3xl border border-emerald-100 dark:border-emerald-800 shadow-sm">
              <p className="text-xs font-bold text-amber-700 dark:text-amber-300">Potential Gross Margin</p>
              <h3 className="text-2xl font-black text-amber-600 dark:text-amber-400 mt-1">{formatPrice(potentialInventoryMargin)}</h3>
              <p className="text-[10px] text-gray-500 dark:text-emerald-400 mt-1 font-medium">Stock retail value minus landed cost</p>
            </div>

            <div className="bg-white dark:bg-emerald-950 p-5 rounded-3xl border border-amber-200 dark:border-amber-900/50 shadow-sm">
              <p className="text-xs font-bold text-amber-700 dark:text-amber-300">Low Stock Reorder Items</p>
              <h3 className="text-2xl font-black text-amber-700 dark:text-amber-400 mt-1">{lowStockCount} Products</h3>
              <p className="text-[10px] text-gray-500 dark:text-emerald-400 mt-1 font-medium">Below specified minimum reorder level</p>
            </div>
          </div>

          <div className="bg-white dark:bg-emerald-950 rounded-3xl border border-emerald-100 dark:border-emerald-800 p-5 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-emerald-100 dark:border-emerald-900 pb-3">
              <h3 className="text-sm font-bold text-emerald-950 dark:text-emerald-100 flex items-center gap-2">
                <Package className="w-4 h-4 text-emerald-600 dark:text-amber-400" />
                Stock Valuation Breakdown by Product ({products.length} catalog items)
              </h3>
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-emerald-100 dark:bg-emerald-900 text-emerald-800 dark:text-emerald-200 border border-emerald-300 dark:border-emerald-700">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Live Valuation Engine
              </span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-emerald-50 dark:bg-emerald-900 text-emerald-900 dark:text-emerald-200 uppercase text-[10px] font-bold">
                  <tr>
                    <th className="p-3">SKU</th>
                    <th className="p-3">Product Name</th>
                    <th className="p-3 text-right">In Stock</th>
                    <th className="p-3 text-right">Landed Cost</th>
                    <th className="p-3 text-right">Selling Price</th>
                    <th className="p-3 text-right">Gross Margin</th>
                    <th className="p-3 text-right">Total Stock Value</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-emerald-100 dark:divide-emerald-800 text-gray-700 dark:text-emerald-200">
                  {pagedProducts.map((p: Product) => {
                    const cost = p.landed_cost || p.purchase_price || 0;
                    const price = p.selling_price || 0;
                    const val = (p.current_stock || 0) * cost;
                    const margin = price > 0 ? Math.round(((price - cost) / price) * 100) : 0;
                    const isLow = (p.current_stock || 0) <= (p.reorder_level || 5);
                    const isOut = (p.current_stock || 0) <= 0;

                    return (
                      <tr key={p.id} className="hover:bg-emerald-50/50 dark:hover:bg-emerald-900/30 transition">
                        <td className="p-3">
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-xs font-mono font-black bg-gradient-to-b from-white to-gray-100 dark:from-emerald-900 dark:to-emerald-950 text-emerald-950 dark:text-emerald-100 border border-gray-200 dark:border-emerald-700 shadow-[0_2px_4px_rgba(0,0,0,0.08),inset_0_1px_0_rgba(255,255,255,0.9)] dark:shadow-[0_2px_4px_rgba(0,0,0,0.3),inset_0_1px_0_rgba(255,255,255,0.15)]">
                            {p.sku}
                          </span>
                        </td>
                        <td className="p-3 font-semibold text-emerald-950 dark:text-emerald-100">
                          {p.name}
                        </td>
                        <td className="p-3 text-right">
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-black tracking-wider uppercase border shadow-[0_2px_4px_rgba(0,0,0,0.06),inset_0_1px_0_rgba(255,255,255,0.8)] ${
                            isOut
                              ? 'bg-gradient-to-b from-rose-50 to-rose-100 dark:from-rose-950 dark:to-emerald-950 text-rose-800 dark:text-rose-200 border-rose-300 dark:border-rose-700'
                              : isLow
                              ? 'bg-gradient-to-b from-amber-50 to-amber-100 dark:from-amber-950 dark:to-emerald-950 text-amber-800 dark:text-amber-200 border-amber-300 dark:border-amber-700'
                              : 'bg-gradient-to-b from-emerald-50 to-emerald-100 dark:from-emerald-900 dark:to-emerald-950 text-emerald-800 dark:text-emerald-200 border-emerald-300 dark:border-emerald-700'
                          }`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${
                              isOut ? 'bg-rose-500 animate-ping' : isLow ? 'bg-amber-500 animate-pulse' : 'bg-emerald-500 animate-ping'
                            }`} />
                            {p.current_stock} {p.unit}
                          </span>
                        </td>
                        <td className="p-3 text-right font-mono text-gray-500">
                          {formatPrice(cost)}
                        </td>
                        <td className="p-3 text-right font-mono text-emerald-700 dark:text-emerald-300 font-bold">
                          {formatPrice(price)}
                        </td>
                        <td className="p-3 text-right">
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-black tracking-wider bg-teal-50 dark:bg-teal-950/60 text-teal-800 dark:text-teal-300 border border-teal-200 dark:border-teal-800">
                            +{margin}%
                          </span>
                        </td>
                        <td className="p-3 text-right">
                          <span className="inline-flex items-center px-2.5 py-1 rounded-xl text-xs font-mono font-black text-emerald-950 dark:text-amber-300 bg-emerald-50 dark:bg-emerald-900/60 border border-emerald-200 dark:border-emerald-700 shadow-sm">
                            {formatPrice(val)}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <PaginationBar
              currentPage={invPage}
              pageSize={invPageSize}
              totalItems={products.length}
              onPageChange={setInvPage}
              onPageSizeChange={setInvPageSize}
              label="products"
            />
          </div>
        </div>
      )}

      {/* 4. FINANCIAL P&L TAB */}
      {activeTab === 'FINANCIAL' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white dark:bg-emerald-950 p-5 rounded-3xl border border-emerald-100 dark:border-emerald-800 shadow-sm">
              <p className="text-xs font-bold text-gray-500 dark:text-emerald-300">Gross Sales Revenue</p>
              <h3 className="text-2xl font-black text-emerald-950 dark:text-emerald-100 mt-1">{formatPrice(totalSales)}</h3>
            </div>

            <div className="bg-white dark:bg-emerald-950 p-5 rounded-3xl border border-emerald-100 dark:border-emerald-800 shadow-sm">
              <p className="text-xs font-bold text-emerald-700 dark:text-emerald-300">Cost of Goods Sold (COGS)</p>
              <h3 className="text-2xl font-black text-emerald-800 dark:text-amber-300 mt-1">{formatPrice(calculatedCOGS)}</h3>
              <p className="text-[10px] text-gray-500 dark:text-emerald-400 mt-1 font-medium">Exact landed cost of sold product items</p>
            </div>

            <div className="bg-white dark:bg-emerald-950 p-5 rounded-3xl border border-rose-200 dark:border-rose-900/50 shadow-sm">
              <p className="text-xs font-bold text-rose-700 dark:text-rose-300">Operating Expenses</p>
              <h3 className="text-2xl font-black text-rose-600 dark:text-rose-400 mt-1">{formatPrice(totalOperatingExpenses)}</h3>
            </div>

            <div className="bg-white dark:bg-emerald-950 p-5 rounded-3xl border border-emerald-200 dark:border-emerald-800 shadow-sm">
              <p className="text-xs font-bold text-emerald-700 dark:text-amber-300">Net Profit Margin</p>
              <h3 className={`text-2xl font-black mt-1 ${netOperatingProfit >= 0 ? 'text-emerald-700 dark:text-amber-400' : 'text-rose-600'}`}>
                {formatPrice(netOperatingProfit)}
              </h3>
              <p className="text-[10px] text-emerald-700 dark:text-emerald-300 mt-1 font-extrabold">{netMarginPct}% Net Margin</p>
            </div>
          </div>

          <div className="bg-white dark:bg-emerald-950 rounded-3xl border border-emerald-100 dark:border-emerald-800 p-5 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-emerald-100 dark:border-emerald-900 pb-3">
              <div>
                <h3 className="text-sm font-bold text-emerald-950 dark:text-emerald-100 flex items-center gap-2">
                  <DollarSign className="w-4 h-4 text-emerald-600 dark:text-amber-400" />
                  Recorded Operating Expenses Log ({timeRange} filter: {sortedFilteredExpenses.length} entries)
                </h3>
                <p className="text-xs text-gray-500 dark:text-emerald-400 mt-0.5">
                  Overhead accounts for store lease, staff payroll, utilities, packing & transport
                </p>
              </div>
              <button
                onClick={handleOpenAddExpense}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 hover:from-emerald-700 hover:to-teal-800 text-white shadow-md shadow-emerald-500/20 flex items-center gap-1.5 transition active:scale-95 self-start sm:self-auto"
              >
                <Plus className="w-4 h-4" />
                <span>Add Operating Expense</span>
              </button>
            </div>

            {sortedFilteredExpenses.length === 0 ? (
              <div className="text-center py-10 text-gray-400 dark:text-emerald-500 text-xs font-semibold space-y-3">
                <p>No expense entries recorded for the selected time range ({timeRange}).</p>
                <button
                  onClick={handleOpenAddExpense}
                  className="px-3.5 py-1.5 rounded-xl text-xs font-bold bg-emerald-100 dark:bg-emerald-900 text-emerald-800 dark:text-emerald-200 border border-emerald-300 dark:border-emerald-700 hover:bg-emerald-200 transition"
                >
                  + Record First Expense
                </button>
              </div>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-emerald-50 dark:bg-emerald-900 text-emerald-900 dark:text-emerald-200 uppercase text-[10px] font-bold">
                      <tr>
                        <th className="p-3">Date</th>
                        <th className="p-3">Category</th>
                        <th className="p-3">Description / Purpose</th>
                        <th className="p-3">Payment Method</th>
                        <th className="p-3 text-right">Amount</th>
                        <th className="p-3 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-emerald-100 dark:divide-emerald-800 text-gray-700 dark:text-emerald-200">
                      {pagedExpenses.map((e: Expense) => (
                        <tr key={e.id} className="hover:bg-emerald-50/50 dark:hover:bg-emerald-900/30 transition">
                          <td className="p-3 font-mono text-gray-500 text-[11px]">
                            {e.expense_date}
                          </td>
                          <td className="p-3">
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-black tracking-wider uppercase bg-gradient-to-b from-emerald-50 to-emerald-100 dark:from-emerald-900 dark:to-emerald-950 text-emerald-900 dark:text-emerald-200 border border-emerald-300 dark:border-emerald-700 shadow-[0_2px_4px_rgba(0,0,0,0.06),inset_0_1px_0_rgba(255,255,255,0.8)]">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                              {e.category_name}
                            </span>
                          </td>
                          <td className="p-3 text-gray-700 dark:text-emerald-200 font-medium max-w-xs truncate">
                            {e.description || '-'}
                          </td>
                          <td className="p-3">
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-gradient-to-b from-blue-50 to-blue-100 dark:from-blue-950 dark:to-emerald-950 text-blue-900 dark:text-blue-200 border border-blue-200 dark:border-blue-800">
                              {e.payment_method}
                            </span>
                          </td>
                          <td className="p-3 text-right">
                            <span className="inline-flex items-center px-2.5 py-1 rounded-xl text-xs font-mono font-black text-rose-700 dark:text-rose-300 bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 shadow-sm">
                              {formatPrice(e.amount)}
                            </span>
                          </td>
                          <td className="p-3 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                onClick={() => handleOpenEditExpense(e)}
                                className="p-1.5 rounded-lg border border-amber-200 dark:border-amber-800 bg-amber-50 hover:bg-amber-100 dark:bg-amber-950/60 dark:hover:bg-amber-900/60 text-amber-700 dark:text-amber-300 shadow-[0_1px_3px_rgba(0,0,0,0.06)] hover:-translate-y-0.5 transition"
                                title="Edit Operating Expense"
                              >
                                <Pencil className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => handleDeleteExpense(e)}
                                className="p-1.5 rounded-lg border border-rose-200 dark:border-rose-800 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/60 dark:hover:bg-rose-900/60 text-rose-700 dark:text-rose-300 shadow-[0_1px_3px_rgba(0,0,0,0.06)] hover:-translate-y-0.5 transition"
                                title="Delete Operating Expense (Asks Yes/No)"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <PaginationBar
                  currentPage={expPage}
                  pageSize={expPageSize}
                  totalItems={sortedFilteredExpenses.length}
                  onPageChange={setExpPage}
                  onPageSizeChange={setExpPageSize}
                  label="expenses"
                />
              </>
            )}
          </div>
        </div>
      )}

      {/* 5. CUSTOMERS TAB */}
      {activeTab === 'CUSTOMERS' && (
        <div className="bg-white dark:bg-emerald-950 rounded-3xl border border-emerald-100 dark:border-emerald-800 p-5 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-emerald-100 dark:border-emerald-900 pb-3">
            <h3 className="text-sm font-bold text-emerald-950 dark:text-emerald-100 flex items-center gap-2">
              <Users className="w-4 h-4 text-emerald-600 dark:text-amber-400" />
              Top Customers by Lifetime Spent (LTV Analytics • {sortedCustomers.length} total)
            </h3>
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-emerald-100 dark:bg-emerald-900 text-emerald-800 dark:text-emerald-200 border border-emerald-300 dark:border-emerald-700">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Highest Value First
            </span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-emerald-50 dark:bg-emerald-900 text-emerald-900 dark:text-emerald-200 uppercase text-[10px] font-bold">
                <tr>
                  <th className="p-3">Customer Name</th>
                  <th className="p-3">Phone</th>
                  <th className="p-3">Location / Area</th>
                  <th className="p-3 text-center">Patron Tier</th>
                  <th className="p-3 text-center">Total Orders</th>
                  <th className="p-3 text-right">Lifetime Spent</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-emerald-100 dark:divide-emerald-800 text-gray-700 dark:text-emerald-200">
                {pagedCustomers.map((c: Customer) => (
                  <tr key={c.id} className="hover:bg-emerald-50/50 dark:hover:bg-emerald-900/30 transition">
                    <td className="p-3 font-bold text-emerald-950 dark:text-emerald-100">
                      {c.name}
                    </td>
                    <td className="p-3 font-mono text-gray-500">
                      {c.phone || c.whatsapp_number || '-'}
                    </td>
                    <td className="p-3 text-gray-500">
                      {c.area || c.city || 'Madurai'}
                    </td>
                    <td className="p-3 text-center">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-black tracking-wider uppercase border shadow-[0_2px_4px_rgba(0,0,0,0.06),inset_0_1px_0_rgba(255,255,255,0.8)] ${
                        (c.total_spent || 0) >= 5000
                          ? 'bg-gradient-to-b from-amber-100 to-amber-200 dark:from-amber-900 dark:to-emerald-950 text-amber-950 dark:text-amber-200 border-amber-400 dark:border-amber-600'
                          : (c.total_spent || 0) >= 2000
                          ? 'bg-gradient-to-b from-teal-50 to-teal-100 dark:from-teal-900 dark:to-emerald-950 text-teal-900 dark:text-teal-200 border-teal-300 dark:border-teal-700'
                          : 'bg-gradient-to-b from-gray-50 to-gray-100 dark:from-emerald-900 dark:to-emerald-950 text-gray-800 dark:text-emerald-200 border-gray-200 dark:border-emerald-700'
                      }`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${
                          (c.total_spent || 0) >= 5000 ? 'bg-amber-500 animate-ping' : (c.total_spent || 0) >= 2000 ? 'bg-teal-500 animate-pulse' : 'bg-emerald-500'
                        }`} />
                        {(c.total_spent || 0) >= 5000 ? '👑 VIP Platinum' : (c.total_spent || 0) >= 2000 ? '⭐ Gold Patron' : '🌱 Valued Patron'}
                      </span>
                    </td>
                    <td className="p-3 text-center">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-50 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-200 border border-emerald-200 dark:border-emerald-700">
                        {c.total_orders || 1} orders
                      </span>
                    </td>
                    <td className="p-3 text-right">
                      <span className="inline-flex items-center px-2.5 py-1 rounded-xl text-xs font-mono font-black text-emerald-900 dark:text-amber-300 bg-emerald-50 dark:bg-emerald-900/60 border border-emerald-200 dark:border-emerald-700 shadow-sm">
                        {formatPrice(c.total_spent || 0)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <PaginationBar
            currentPage={custPage}
            pageSize={custPageSize}
            totalItems={sortedCustomers.length}
            onPageChange={setCustPage}
            onPageSizeChange={setCustPageSize}
            label="customers"
          />
        </div>
      )}

      {/* Add / Edit Operating Expense Modal */}
      {showExpenseModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white dark:bg-emerald-950 border border-emerald-300 dark:border-emerald-700 rounded-3xl shadow-2xl max-w-lg w-full p-6 space-y-5">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-emerald-100 dark:border-emerald-800 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-emerald-100 dark:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300 rounded-xl">
                  <DollarSign className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-emerald-950 dark:text-emerald-100">
                    {editingExpense ? 'Edit Operating Expense' : 'Add New Operating Expense'}
                  </h3>
                  <p className="text-xs text-gray-500 dark:text-emerald-400">
                    Ledger tracking for store rent, staff wages, utilities & opex
                  </p>
                </div>
              </div>
              <button
                onClick={() => { setShowExpenseModal(false); setEditingExpense(null); }}
                className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-emerald-200 rounded-lg transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSaveExpense} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-emerald-900 dark:text-emerald-200 mb-1">
                  Expense Category *
                </label>
                <select
                  value={expenseForm.category_name}
                  onChange={e => setExpenseForm(prev => ({ ...prev, category_name: e.target.value }))}
                  className="w-full px-3 py-2 bg-emerald-50/50 dark:bg-emerald-900/40 border border-emerald-200 dark:border-emerald-700 rounded-xl text-xs font-semibold text-emerald-950 dark:text-emerald-100 outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer"
                >
                  {EXPENSE_CATEGORIES.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-emerald-900 dark:text-emerald-200 mb-1">
                    Amount (₹ INR) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="1"
                    required
                    placeholder="e.g. 5000"
                    value={expenseForm.amount}
                    onChange={e => setExpenseForm(prev => ({ ...prev, amount: e.target.value }))}
                    className="w-full px-3 py-2 bg-emerald-50/50 dark:bg-emerald-900/40 border border-emerald-200 dark:border-emerald-700 rounded-xl font-mono text-sm font-bold text-emerald-950 dark:text-emerald-100 outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="block font-bold text-emerald-900 dark:text-emerald-200 mb-1">
                    Transaction Date *
                  </label>
                  <input
                    type="date"
                    required
                    value={expenseForm.expense_date}
                    onChange={e => setExpenseForm(prev => ({ ...prev, expense_date: e.target.value }))}
                    className="w-full px-3 py-2 bg-emerald-50/50 dark:bg-emerald-900/40 border border-emerald-200 dark:border-emerald-700 rounded-xl text-xs font-semibold text-emerald-950 dark:text-emerald-100 outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-emerald-900 dark:text-emerald-200 mb-1">
                  Payment Method *
                </label>
                <select
                  value={expenseForm.payment_method}
                  onChange={e => setExpenseForm(prev => ({ ...prev, payment_method: e.target.value as any }))}
                  className="w-full px-3 py-2 bg-emerald-50/50 dark:bg-emerald-900/40 border border-emerald-200 dark:border-emerald-700 rounded-xl text-xs font-semibold text-emerald-950 dark:text-emerald-100 outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer"
                >
                  <option value="CASH">CASH (Counter Drawer Cash)</option>
                  <option value="UPI">UPI (Google Pay / PhonePe / Paytm)</option>
                  <option value="BANK_TRANSFER">Bank Transfer (NEFT / IMPS / RTGS)</option>
                  <option value="CHEQUE">Cheque Issue</option>
                  <option value="CARD">Debit / Credit Card</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-emerald-900 dark:text-emerald-200 mb-1">
                  Description / Purpose *
                </label>
                <textarea
                  required
                  rows={2}
                  placeholder="e.g. Monthly shop electrical billing payment for main storefront"
                  value={expenseForm.description}
                  onChange={e => setExpenseForm(prev => ({ ...prev, description: e.target.value }))}
                  className="w-full px-3 py-2 bg-emerald-50/50 dark:bg-emerald-900/40 border border-emerald-200 dark:border-emerald-700 rounded-xl text-xs text-emerald-950 dark:text-emerald-100 outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-emerald-100 dark:border-emerald-800">
                <button
                  type="button"
                  onClick={() => { setShowExpenseModal(false); setEditingExpense(null); }}
                  className="px-4 py-2 rounded-xl border border-gray-200 dark:border-emerald-700 bg-white dark:bg-emerald-900/50 text-gray-700 dark:text-emerald-200 font-bold hover:bg-gray-50 dark:hover:bg-emerald-800 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl text-xs font-bold bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-700 hover:to-teal-800 text-white shadow-md shadow-emerald-500/20 transition active:scale-95 flex items-center gap-1.5"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>{editingExpense ? 'Save & Update' : 'Record Expense'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
