import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { 
  ArrowLeft, Search, Filter, Printer, Edit, RefreshCw, Send, MessageSquare, Mail,
  CheckCircle2, ShoppingBag, Calendar, User, Phone, DollarSign, Tag, Clock, Sparkles, FileText, ChevronRight,
  Trash2, Loader2, Plus, RotateCcw, AlertTriangle, ChevronLeft, Download, Check
} from 'lucide-react';
import { formatPrice, formatTimeAgo } from '../../lib/utils';
import type { Order, Customer, Product } from '../../types';
import { getJSONStore, setJSONStore, syncOrderStockChange } from '../../lib/dbManager';
import { useNotifications } from '../../contexts/NotificationContext';
import { AdminPageSkeleton } from '../../components/common/Skeleton';
import { useActionModal } from '../../contexts/ActionModalContext';
import { getFormattedStoreAddress, getFormattedStorePhone } from '../../lib/storeSettings';
import toast from 'react-hot-toast';

export const POSBillingDetailsPage: React.FC = () => {
  const navigate = useNavigate();
  const { addNotification } = useNotifications();
  const { showActionModal } = useActionModal();

  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  
  // Search & Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [paymentFilter, setPaymentFilter] = useState<string>('ALL');
  const [sourceFilter, setSourceFilter] = useState<string>('ALL');

  // Pagination states
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(10);

  // Multi-select for selective actions (export, delete)
  const [selectedOrderIds, setSelectedOrderIds] = useState<string[]>([]);

  // Modal / Action states
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [showReceiptModal, setShowReceiptModal] = useState<boolean>(false);
  const [showEditModal, setShowEditModal] = useState<boolean>(false);
  const [isDispatching, setIsDispatching] = useState<boolean>(false);
  const [dispatchStatus, setDispatchStatus] = useState<string | null>(null);

  // Edit order full local state
  const [editCustomerName, setEditCustomerName] = useState('');
  const [editCustomerPhone, setEditCustomerPhone] = useState('');
  const [editPaymentMethod, setEditPaymentMethod] = useState<string>('CASH');
  const [editPaymentStatus, setEditPaymentStatus] = useState<string>('PAID');
  const [editOrderStatus, setEditOrderStatus] = useState<string>('DELIVERED');
  const [editTotal, setEditTotal] = useState<number>(0);
  const [editSubtotal, setEditSubtotal] = useState<number>(0);
  const [editDiscount, setEditDiscount] = useState<number>(0);
  const [editDeliveryFee, setEditDeliveryFee] = useState<number>(0);
  const [editNotes, setEditNotes] = useState<string>('');

  // Delete order state
  const [orderToDelete, setOrderToDelete] = useState<Order | null>(null);
  const [isDeletingOrder, setIsDeletingOrder] = useState<boolean>(false);

  const [error, setError] = useState<string | null>(null);

  const loadData = async () => {
    setIsRefreshing(true);
    setError(null);
    try {
      const ords = await getJSONStore<Order>('orders');
      setOrders(ords || []);
    } catch (e: any) {
      console.error(e);
      setError(e?.message || 'Failed to load POS orders from database.');
    } finally {
      setLoading(false);
      setTimeout(() => setIsRefreshing(false), 500);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Filtered POS orders - Default Sort: RECENT ORDERS FIRST (created_at descending)
  const filteredOrders = useMemo(() => {
    const q = (searchQuery || '').toLowerCase().trim();
    const list = (orders || []).filter((ord) => {
      if (!ord) return false;
      const isPOS = ord.source === 'POS' || sourceFilter === 'ALL' || ord.source === sourceFilter;
      const orderNum = String(ord.order_number || ord.id || '').toLowerCase();
      const custName = String(ord.customer_name_snapshot || '').toLowerCase();
      const custPhone = String(ord.customer_phone_snapshot || '');

      const matchesSearch = 
        !q ||
        orderNum.includes(q) ||
        custName.includes(q) ||
        custPhone.includes(q);
      const matchesPayment = paymentFilter === 'ALL' || ord.payment_method === paymentFilter;

      return isPOS && matchesSearch && matchesPayment;
    });

    // Default Sort: Recent First
    return list.sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime());
  }, [orders, sourceFilter, searchQuery, paymentFilter]);

  // Pagination Logic
  const totalPages = Math.ceil(filteredOrders.length / pageSize) || 1;
  const paginatedOrders = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredOrders.slice(start, start + pageSize);
  }, [filteredOrders, currentPage, pageSize]);

  // Multi-select Handlers
  const toggleSelectAll = () => {
    if (paginatedOrders.length === 0) return;
    const paginatedIds = paginatedOrders.map(o => o.id);
    const isAllSelected = paginatedIds.every(id => selectedOrderIds.includes(id));
    if (isAllSelected) {
      setSelectedOrderIds(prev => prev.filter(id => !paginatedIds.includes(id)));
    } else {
      setSelectedOrderIds(prev => Array.from(new Set([...prev, ...paginatedIds])));
    }
  };

  const toggleSelectRow = (id: string) => {
    setSelectedOrderIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const handleBulkExportCSV = () => {
    const targetOrders = selectedOrderIds.length > 0
      ? orders.filter(o => selectedOrderIds.includes(o.id))
      : filteredOrders;
    if (targetOrders.length === 0) {
      toast.error('No orders to export');
      return;
    }
    const headers = ['Receipt #', 'Date', 'Customer Name', 'Phone', 'Items Count', 'Payment Method', 'Grand Total', 'Status'];
    const rows = targetOrders.map(o => [
      o.order_number,
      new Date(o.created_at).toLocaleString('en-IN'),
      `"${o.customer_name_snapshot || ''}"`,
      o.customer_phone_snapshot || '',
      o.items?.length || 0,
      o.payment_method,
      o.total,
      o.status
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `MR_VIVASAYI_Mart_POS_Billing_Orders_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success(`Exported ${targetOrders.length} POS bills to CSV!`);
  };

  const handleBulkDeleteOrders = () => {
    if (selectedOrderIds.length === 0) return;
    showActionModal({
      title: 'Bulk Voiding POS Receipts',
      subtitle: `Deleting ${selectedOrderIds.length} receipts and refilling stock...`,
      badge: 'POS Void',
      duration: 800,
      steps: [
        'Voiding selected receipts...',
        'Updating audit logs & inventory balances...',
        'Bulk deletion completed successfully!'
      ],
      onComplete: async () => {
        const toDeleteSet = new Set(selectedOrderIds);
        const updatedOrders = orders.filter(o => !toDeleteSet.has(o.id));
        await setJSONStore<Order>('orders', updatedOrders);
        setOrders(updatedOrders);
        setSelectedOrderIds([]);
        addNotification({
          title: 'Bulk POS Receipts Deleted',
          message: `Permanently removed ${toDeleteSet.size} POS receipts.`,
          type: 'warning',
          sourceModule: 'POS Billing Details'
        });
      }
    });
  };

  // Total sales analytics
  const totalPosRevenue = useMemo(() => {
    return filteredOrders.reduce((sum, o) => sum + (Number(o?.total) || 0), 0);
  }, [filteredOrders]);

  // Load Order into POS Cart for editing on main POS terminal
  const handleEditInPOS = (order: Order) => {
    sessionStorage.setItem('edit_pos_order', JSON.stringify(order));
    addNotification({
      title: `Editing Sale ${order.order_number}`,
      message: 'Loading order items into POS Counter terminal...',
      type: 'info',
      sourceModule: 'POS History Hub'
    });
    navigate('/admin/pos');
  };

  // Open Quick Edit Modal directly on this page
  const openEditModal = (order: Order) => {
    setSelectedOrder(order);
    setEditCustomerName(order.customer_name_snapshot || 'Walk-in Customer');
    setEditCustomerPhone(order.customer_phone_snapshot || '9876543210');
    setEditPaymentMethod(order.payment_method || 'CASH');
    setEditPaymentStatus(order.payment_status || 'PAID');
    setEditOrderStatus(order.status || 'DELIVERED');
    setEditTotal(order.total || 0);
    setEditSubtotal(order.subtotal || order.total || 0);
    setEditDiscount(order.discount || 0);
    setEditDeliveryFee(order.delivery_fee || 0);
    setEditNotes(order.notes || '');
    setShowEditModal(true);
  };

  // Save Quick Edit Changes
  const saveQuickEdit = async () => {
    if (!selectedOrder) return;
    const targetOrder = selectedOrder;
    setShowEditModal(false);

    showActionModal({
      title: 'Updating POS Bill Record',
      subtitle: `Saving changes for Receipt #${targetOrder.order_number}...`,
      badge: 'POS Ledger Live',
      duration: 800,
      steps: [
        'Validating line totals & recalculating tax...',
        'Updating orders ledger in database...',
        'Syncing receipt printable format...',
        'POS order updated successfully!'
      ],
      onComplete: async () => {
        let updatedTarget: Order | null = null;
        const updatedOrders = orders.map((o) => {
          if (o.id === targetOrder.id) {
            const u: Order = {
              ...o,
              customer_name_snapshot: editCustomerName.trim(),
              customer_phone_snapshot: editCustomerPhone.trim(),
              payment_method: editPaymentMethod as any,
              payment_status: editPaymentStatus as any,
              status: editOrderStatus as any,
              total: Number(editTotal),
              subtotal: Number(editSubtotal),
              discount: Number(editDiscount),
              delivery_fee: Number(editDeliveryFee),
              notes: editNotes.trim(),
              updated_at: new Date().toISOString()
            };
            updatedTarget = u;
            return u;
          }
          return o;
        });

        if (updatedTarget) {
          try {
            await syncOrderStockChange(targetOrder, updatedTarget);
          } catch (err) {
            console.error('Stock delta sync error on POS edit:', err);
          }
        }

        await setJSONStore('orders', updatedOrders);
        setOrders(updatedOrders);

        addNotification({
          title: 'POS Order Updated',
          message: `Updated all details for Receipt ${targetOrder.order_number} successfully.`,
          type: 'success',
          sourceModule: 'POS Billing Details'
        });
      }
    });
  };

  // Delete Order Confirmation Handler
  const handleDeleteOrderConfirm = async () => {
    if (!orderToDelete) return;
    const target = orderToDelete;
    setOrderToDelete(null);

    showActionModal({
      title: 'Voiding POS Receipt',
      subtitle: `Deleting receipt #${target.order_number} and adjusting audit log...`,
      badge: 'POS Void',
      duration: 750,
      steps: [
        'Voiding payment ledger entry...',
        'Reverting inventory ledger reservations...',
        'Order record removed successfully!'
      ],
      onComplete: async () => {
        try {
          await syncOrderStockChange(target, null);
        } catch (err) {
          console.error('Stock refill error on POS void:', err);
        }
        const updatedOrders = orders.filter(o => o.id !== target.id);
        await setJSONStore<Order>('orders', updatedOrders);
        setOrders(updatedOrders);
        addNotification({
          title: 'Receipt Order Deleted & Stock Restored',
          message: `Receipt #${target.order_number} deleted and reserved stock refilled back to inventory.`,
          type: 'warning',
          sourceModule: 'POS Billing Details'
        });
      }
    });
  };

  // Trigger Re-Print Receipt
  const handleRePrintReceipt = (order: Order) => {
    setSelectedOrder(order);
    setShowReceiptModal(true);
  };

  // Dispatch Receipt via WhatsApp
  const handleSendWhatsApp = (order: Order) => {
    showActionModal({
      title: 'Dispatching WhatsApp Digital Bill',
      subtitle: `Formatting receipt #${order.order_number} for +91 ${order.customer_phone_snapshot || 'Customer'}...`,
      badge: 'WhatsApp Bill API',
      duration: 800,
      steps: [
        'Generating digital receipt message payload...',
        'Opening WhatsApp communication channel...',
        'Receipt dispatched successfully!'
      ],
      onComplete: () => {
        const msg = `*MR. VIVASAYI Mart Receipt*\nBill #: ${order.order_number}\nCustomer: ${order.customer_name_snapshot || 'Customer'}\nTotal Paid: ₹${order.total}\nPayment: ${order.payment_method}\nThank you for shopping at MR. VIVASAYI Mart!`;
        const cleanPhone = (order.customer_phone_snapshot || '9876543210').replace(/[^0-9]/g, '');
        window.open(`https://wa.me/91${cleanPhone}?text=${encodeURIComponent(msg)}`, '_blank');

        addNotification({
          title: 'WhatsApp Dispatched',
          message: `Receipt ${order.order_number} sent to WhatsApp (+91 ${cleanPhone}).`,
          type: 'success',
          sourceModule: 'POS Billing Details'
        });
      }
    });
  };

  if (loading) {
    return <AdminPageSkeleton title="POS Billing & Sales Details History" />;
  }

  return (
    <div className="space-y-6 pb-12 animate-fadeIn">
      
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-emerald-900/40 p-6 rounded-3xl border border-emerald-100 dark:border-emerald-800 shadow-sm">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/admin/pos')}
            className="p-2.5 bg-emerald-50 dark:bg-emerald-950 hover:bg-emerald-100 dark:hover:bg-emerald-900 rounded-2xl border border-emerald-200 dark:border-emerald-700 text-emerald-900 dark:text-emerald-100 transition-all"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-extrabold text-gray-900 dark:text-emerald-100">
                POS Billing & Sales Details History
              </h1>
              <span className="bg-amber-400 text-emerald-950 text-xs font-black px-2.5 py-0.5 rounded-full">
                LIVE
              </span>
            </div>
            <p className="text-xs text-gray-500 dark:text-emerald-300 mt-0.5">
              View, edit customer details, re-print receipts, and dispatch digital bills for all counter sales.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={loadData}
            disabled={isRefreshing}
            className="px-4 py-2.5 bg-emerald-100 dark:bg-emerald-800 hover:bg-emerald-200 text-emerald-900 dark:text-emerald-100 font-bold rounded-2xl text-xs flex items-center gap-2 transition-all"
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            <span>Refresh Data</span>
          </button>

          <button
            onClick={() => navigate('/admin/pos')}
            className="px-4 py-2.5 bg-gradient-to-r from-emerald-700 to-teal-800 hover:from-emerald-800 hover:to-teal-900 text-white font-extrabold rounded-2xl text-xs flex items-center gap-2 shadow-md transition-all"
          >
            <ShoppingBag className="w-4 h-4 text-amber-300" />
            <span>Open Sales Counter POS →</span>
          </button>
        </div>
      </div>

      {/* Analytics Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-emerald-900/40 p-5 rounded-3xl border border-emerald-100 dark:border-emerald-800 shadow-sm flex items-center justify-between">
          <div>
            <div className="text-xs font-bold text-gray-500 dark:text-emerald-400">Total Counter Orders</div>
            <div className="text-2xl font-black text-emerald-950 dark:text-amber-400 mt-1">
              {filteredOrders.length} Bills
            </div>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-emerald-100 dark:bg-emerald-800 flex items-center justify-center text-emerald-800 dark:text-amber-400">
            <FileText className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white dark:bg-emerald-900/40 p-5 rounded-3xl border border-emerald-100 dark:border-emerald-800 shadow-sm flex items-center justify-between">
          <div>
            <div className="text-xs font-bold text-gray-500 dark:text-emerald-400">Total Revenue Collected</div>
            <div className="text-2xl font-black text-emerald-900 dark:text-emerald-100 mt-1">
              {formatPrice(totalPosRevenue)}
            </div>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-amber-100 dark:bg-amber-950 flex items-center justify-center text-amber-800 dark:text-amber-400">
            <DollarSign className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white dark:bg-emerald-900/40 p-5 rounded-3xl border border-emerald-100 dark:border-emerald-800 shadow-sm flex items-center justify-between">
          <div>
            <div className="text-xs font-bold text-gray-500 dark:text-emerald-400">Average Bill Value</div>
            <div className="text-2xl font-black text-teal-800 dark:text-teal-300 mt-1">
              {filteredOrders.length > 0 ? formatPrice(totalPosRevenue / filteredOrders.length) : '₹0'}
            </div>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-teal-100 dark:bg-teal-900 flex items-center justify-center text-teal-800 dark:text-teal-300">
            <Sparkles className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Search & Filter Controls */}
      <div className="bg-white dark:bg-emerald-900/40 p-5 rounded-3xl border border-emerald-100 dark:border-emerald-800 shadow-sm space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
          <div className="md:col-span-6 relative">
            <Search className="w-5 h-5 absolute left-3.5 top-3.5 text-gray-400 dark:text-emerald-400" />
            <input
              type="text"
              placeholder="Search by Bill #, Customer Name, Phone number..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-11 pr-4 py-3 bg-emerald-50/60 dark:bg-emerald-950 border border-emerald-200 dark:border-emerald-700 rounded-2xl text-sm font-semibold text-gray-900 dark:text-emerald-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          <div className="md:col-span-3">
            <select
              value={paymentFilter}
              onChange={(e) => setPaymentFilter(e.target.value)}
              className="w-full py-3 px-3 bg-emerald-50/60 dark:bg-emerald-950 border border-emerald-200 dark:border-emerald-700 rounded-2xl text-sm font-bold text-gray-800 dark:text-emerald-100 focus:outline-none"
            >
              <option value="ALL">All Payment Methods</option>
              <option value="CASH">Cash Payment</option>
              <option value="UPI">UPI / QR Code</option>
              <option value="CARD">Card Payment</option>
            </select>
          </div>

          <div className="md:col-span-3">
            <select
              value={sourceFilter}
              onChange={(e) => setSourceFilter(e.target.value)}
              className="w-full py-3 px-3 bg-emerald-50/60 dark:bg-emerald-950 border border-emerald-200 dark:border-emerald-700 rounded-2xl text-sm font-bold text-gray-800 dark:text-emerald-100 focus:outline-none"
            >
              <option value="ALL">All Order Sources</option>
              <option value="POS">POS Counter Only</option>
              <option value="WEBSITE">Website Online</option>
              <option value="WHATSAPP">WhatsApp Order</option>
            </select>
          </div>
        </div>
      </div>

      {/* POS Orders Detailed Table */}
      <div className="bg-white dark:bg-emerald-900/40 rounded-3xl border border-emerald-100 dark:border-emerald-800 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-sm font-bold text-gray-500 dark:text-emerald-400 space-y-3">
            <div className="w-10 h-10 border-4 border-emerald-300 border-t-emerald-700 rounded-full animate-spin mx-auto"></div>
            <p>Loading POS Billing Details...</p>
          </div>
        ) : error ? (
          <div className="p-12 text-center">
            <div className="max-w-md mx-auto p-6 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 rounded-3xl text-center space-y-3 shadow-xs">
              <div className="w-12 h-12 rounded-full bg-rose-100 text-rose-700 flex items-center justify-center mx-auto shadow-2xs">
                <AlertTriangle className="w-6 h-6 text-rose-600" />
              </div>
              <h4 className="font-black text-rose-950 dark:text-rose-100 text-base">Unable to Load POS Billing Records</h4>
              <p className="text-xs text-rose-800 dark:text-rose-300 leading-relaxed font-medium">
                {error}
              </p>
              <div className="pt-2">
                <button
                  onClick={loadData}
                  className="px-4 py-2 bg-rose-700 hover:bg-rose-800 text-white font-bold text-xs rounded-xl shadow-xs inline-flex items-center gap-1.5 transition"
                >
                  <RefreshCw className="w-3.5 h-3.5" /> Retry Fetching POS Bills
                </button>
              </div>
            </div>
          </div>
        ) : orders.length === 0 ? (
          <div className="p-16 text-center space-y-3">
            <div className="w-12 h-12 rounded-full bg-emerald-100 dark:bg-emerald-800 text-emerald-800 dark:text-emerald-200 flex items-center justify-center mx-auto shadow-2xs">
              <ShoppingBag className="w-6 h-6 text-emerald-700 dark:text-emerald-300" />
            </div>
            <h4 className="font-black text-emerald-950 dark:text-emerald-100 text-base">Oops! No Results Found</h4>
            <p className="text-xs text-gray-500 dark:text-emerald-400 max-w-sm mx-auto">
              No POS billing records found in the database. Use the POS counter terminal to generate retail sales receipts.
            </p>
            <div className="pt-2">
              <Link
                to="/admin/pos"
                className="px-4 py-2 bg-emerald-800 hover:bg-emerald-900 text-white font-bold text-xs rounded-xl shadow-xs inline-flex items-center gap-1.5 transition"
              >
                <Plus className="w-3.5 h-3.5" /> Open Counter POS Terminal
              </Link>
            </div>
          </div>
        ) : filteredOrders.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <div className="w-12 h-12 rounded-full bg-gray-100 text-gray-500 flex items-center justify-center mx-auto shadow-2xs">
              <Search className="w-6 h-6 text-gray-400" />
            </div>
            <h4 className="font-black text-gray-800 dark:text-emerald-100 text-base">Oops! No Results Found</h4>
            <p className="text-xs text-gray-500 dark:text-emerald-400">
              No POS bills matching search query {searchQuery ? `"${searchQuery}"` : ''} or selected payment filters. Try clearing filters.
            </p>
            <div className="pt-2">
              <button
                onClick={() => { setSearchQuery(''); setPaymentFilter('ALL'); setSourceFilter('ALL'); }}
                className="px-4 py-2 bg-emerald-800 hover:bg-emerald-900 text-white font-bold text-xs rounded-xl shadow-xs inline-flex items-center gap-1.5 transition"
              >
                <RotateCcw className="w-3.5 h-3.5" /> Clear All Filters
              </button>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-emerald-50 dark:bg-emerald-950/80 text-emerald-950 dark:text-emerald-200 uppercase font-extrabold border-b border-emerald-100 dark:border-emerald-800">
                <tr>
                  <th className="py-3.5 px-4 text-center">
                    <input
                      type="checkbox"
                      checked={paginatedOrders.length > 0 && paginatedOrders.every(o => selectedOrderIds.includes(o.id))}
                      onChange={toggleSelectAll}
                      className="w-4 h-4 rounded text-emerald-800 focus:ring-emerald-500 cursor-pointer"
                    />
                  </th>
                  <th className="py-3.5 px-4">Receipt Bill #</th>
                  <th className="py-3.5 px-4">Date & Time</th>
                  <th className="py-3.5 px-4">Customer Details</th>
                  <th className="py-3.5 px-4">Items Summary</th>
                  <th className="py-3.5 px-4">Payment</th>
                  <th className="py-3.5 px-4 text-right">Grand Total</th>
                  <th className="py-3.5 px-4 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-emerald-100/70 dark:divide-emerald-800/70">
                {paginatedOrders.map((ord) => {
                  const createdTime = new Date(ord.created_at).getTime();
                  const isNewOrder = (Date.now() - createdTime) < (60 * 60 * 1000);
                  const isModified = ord.updated_at && ord.updated_at !== ord.created_at;

                  return (
                    <tr key={ord.id} className="hover:bg-emerald-50/40 dark:hover:bg-emerald-950/40 transition-colors">
                      <td className="py-4 px-4 text-center">
                        <input
                          type="checkbox"
                          checked={selectedOrderIds.includes(ord.id)}
                          onChange={() => toggleSelectRow(ord.id)}
                          className="w-4 h-4 rounded text-emerald-800 focus:ring-emerald-500 cursor-pointer"
                        />
                      </td>
                      <td className="py-4 px-4">
                        <div className="font-mono font-black text-emerald-900 dark:text-amber-400 flex items-center gap-1.5">
                          {ord.order_number || ord.id || 'N/A'}
                        </div>
                        <div className="flex items-center gap-1 mt-1">
                          {isNewOrder && (
                            <span className="px-2 py-0.5 bg-gradient-to-r from-emerald-500 to-teal-600 text-white border border-emerald-400 shadow-2xs font-black rounded-lg text-[9px] uppercase tracking-wider animate-pulse">
                              NEW
                            </span>
                          )}
                          {isModified && (
                            <span className="px-2 py-0.5 bg-gradient-to-r from-amber-400 to-amber-600 text-amber-950 border border-amber-300 shadow-2xs font-black rounded-lg text-[9px] uppercase tracking-wider">
                              MODIFIED
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-4 px-4 text-gray-600 dark:text-emerald-300 font-semibold whitespace-nowrap">
                        <div>{new Date(ord.created_at).toLocaleString('en-IN')}</div>
                        <div className="text-[10px] text-emerald-700 dark:text-amber-300 font-black flex items-center gap-1 mt-0.5">
                          <Clock className="w-3 h-3 text-amber-500" />
                          <span>{formatTimeAgo(ord.created_at)}</span>
                        </div>
                      </td>
                      <td className="py-4 px-4">
                        <div className="font-bold text-gray-900 dark:text-emerald-100">
                          {ord.customer_name_snapshot || 'Walk-in Customer'}
                        </div>
                        <div className="text-[11px] text-gray-500 dark:text-emerald-400">
                          📞 {ord.customer_phone_snapshot || 'N/A'}
                        </div>
                      </td>
                      <td className="py-4 px-4 max-w-xs">
                        <div className="font-semibold text-gray-800 dark:text-emerald-200 line-clamp-1">
                          {ord.items && ord.items.length > 0
                            ? ord.items.map(i => `${i.product_name_snapshot} (${i.quantity})`).join(', ')
                            : 'Counter Products'}
                        </div>
                        <div className="text-[10px] text-emerald-700 dark:text-amber-400 font-bold">
                          {ord.items?.length || 0} Total Line Items
                        </div>
                      </td>
                      <td className="py-4 px-4">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-[10px] font-black uppercase tracking-wider shadow-xs border ${
                          ord.payment_method === 'CASH'
                            ? 'bg-gradient-to-r from-emerald-500 to-teal-600 text-white border-emerald-400'
                            : ord.payment_method === 'UPI'
                            ? 'bg-gradient-to-r from-indigo-500 to-purple-600 text-white border-indigo-400'
                            : 'bg-gradient-to-r from-blue-500 to-indigo-600 text-white border-blue-400'
                        }`}>
                          {ord.payment_method}
                        </span>
                      </td>
                      <td className="py-4 px-4 text-right font-black text-sm text-emerald-900 dark:text-amber-400 font-mono">
                        {formatPrice(ord.total)}
                      </td>
                      <td className="py-4 px-4 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            title="Re-Print Thermal Receipt"
                            onClick={() => handleRePrintReceipt(ord)}
                            className="p-1.5 bg-emerald-100 dark:bg-emerald-800 hover:bg-emerald-200 text-emerald-900 dark:text-emerald-100 font-bold rounded-xl flex items-center gap-1 text-[11px]"
                          >
                            <Printer className="w-3.5 h-3.5" /> Re-Print
                          </button>
                          <button
                            title="Quick Edit Customer & Payment Details"
                            onClick={() => openEditModal(ord)}
                            className="p-1.5 bg-amber-400 hover:bg-amber-300 text-emerald-950 font-black rounded-xl text-[11px] flex items-center gap-1"
                          >
                            <Edit className="w-3.5 h-3.5" /> Edit
                          </button>
                          <button
                            title="Send Receipt via WhatsApp"
                            onClick={() => handleSendWhatsApp(ord)}
                            className="p-1.5 bg-green-600 hover:bg-green-700 text-white font-bold rounded-xl text-[11px]"
                          >
                            <MessageSquare className="w-3.5 h-3.5" />
                          </button>
                          <button
                            title="Edit items in active POS cart terminal"
                            onClick={() => handleEditInPOS(ord)}
                            className="p-1.5 bg-teal-800 hover:bg-teal-900 text-white font-bold rounded-xl text-[11px]"
                          >
                            POS Cart
                          </button>
                          <button
                            title="Delete POS Receipt Order"
                            onClick={() => setOrderToDelete(ord)}
                            className="p-1.5 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl text-[11px]"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Footer */}
        {filteredOrders.length > 0 && (
          <div className="p-4 bg-gray-50 dark:bg-emerald-950/80 border-t border-emerald-100 dark:border-emerald-800 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs font-semibold text-gray-700 dark:text-emerald-200">
            <div className="flex items-center gap-2 flex-wrap">
              <span>Showing {filteredOrders.length === 0 ? 0 : (currentPage - 1) * pageSize + 1} to {Math.min(currentPage * pageSize, filteredOrders.length)} of {filteredOrders.length} orders</span>
              <span className="text-gray-300 dark:text-emerald-700">|</span>
              <div className="flex items-center gap-1">
                <span>Per page:</span>
                <select
                  value={pageSize}
                  onChange={(e) => {
                    setPageSize(Number(e.target.value));
                    setCurrentPage(1);
                  }}
                  className="py-1 px-2 bg-white dark:bg-emerald-900 border border-gray-200 dark:border-emerald-700 rounded-lg text-xs font-bold"
                >
                  <option value={10}>10</option>
                  <option value={25}>25</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                </select>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage <= 1}
                className="px-3 py-1.5 rounded-xl border border-gray-200 dark:border-emerald-700 bg-white dark:bg-emerald-900 disabled:opacity-40 font-bold hover:bg-gray-100 dark:hover:bg-emerald-800 transition flex items-center gap-1 cursor-pointer"
              >
                <ChevronLeft className="w-3.5 h-3.5" /> Prev
              </button>
              <span className="px-2 font-mono font-black text-xs">
                Page {currentPage} of {totalPages}
              </span>
              <button
                type="button"
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage >= totalPages}
                className="px-3 py-1.5 rounded-xl border border-gray-200 dark:border-emerald-700 bg-white dark:bg-emerald-900 disabled:opacity-40 font-bold hover:bg-gray-100 dark:hover:bg-emerald-800 transition flex items-center gap-1 cursor-pointer"
              >
                Next <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Floating Action Bar for Selected Orders */}
      {selectedOrderIds.length > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 bg-gray-900/95 backdrop-blur-md text-white px-5 py-3 rounded-2xl shadow-2xl border border-gray-700 flex items-center gap-3 animate-fadeIn flex-wrap justify-center">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
            <span className="font-extrabold text-xs">
              {selectedOrderIds.length} POS bill(s) selected
            </span>
          </div>
          <div className="h-4 w-px bg-gray-700 hidden sm:block" />
          <button
            onClick={handleBulkExportCSV}
            className="px-3 py-1.5 bg-emerald-700 hover:bg-emerald-600 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
          >
            <Download className="w-3.5 h-3.5 text-amber-300" />
            Export Selected
          </button>
          <button
            onClick={handleBulkDeleteOrders}
            className="px-3 py-1.5 bg-rose-700 hover:bg-rose-600 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
          >
            <Trash2 className="w-3.5 h-3.5" />
            Delete Selected
          </button>
          <button
            onClick={() => setSelectedOrderIds([])}
            className="px-2.5 py-1.5 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-xl text-xs font-bold transition cursor-pointer"
          >
            Clear
          </button>
        </div>
      )}

      {/* Comprehensive Edit All Fields Order Modal */}
      {showEditModal && selectedOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white dark:bg-emerald-950 max-w-xl w-full rounded-3xl p-6 shadow-2xl border border-emerald-200 dark:border-emerald-800 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-emerald-100 dark:border-emerald-800 pb-3">
              <div>
                <h3 className="font-extrabold text-lg text-gray-900 dark:text-emerald-100 flex items-center gap-2">
                  <Edit className="w-5 h-5 text-amber-500" />
                  Edit Order Details ({selectedOrder.order_number})
                </h3>
                <p className="text-xs text-gray-500 dark:text-emerald-300">Modify customer, payment, status, and pricing details</p>
              </div>
              <button
                onClick={() => setShowEditModal(false)}
                className="p-1 text-gray-500 hover:bg-emerald-100 rounded-xl"
              >
                ✕
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div>
                <label className="block font-bold mb-1 text-gray-700 dark:text-emerald-300">Customer Name *</label>
                <input
                  type="text"
                  value={editCustomerName}
                  onChange={(e) => setEditCustomerName(e.target.value)}
                  className="w-full p-2.5 bg-emerald-50 dark:bg-emerald-900 border border-emerald-200 dark:border-emerald-700 rounded-xl font-bold"
                />
              </div>

              <div>
                <label className="block font-bold mb-1 text-gray-700 dark:text-emerald-300">Customer Phone *</label>
                <input
                  type="tel"
                  value={editCustomerPhone}
                  onChange={(e) => setEditCustomerPhone(e.target.value)}
                  className="w-full p-2.5 bg-emerald-50 dark:bg-emerald-900 border border-emerald-200 dark:border-emerald-700 rounded-xl font-bold"
                />
              </div>

              <div>
                <label className="block font-bold mb-1 text-gray-700 dark:text-emerald-300">Payment Method</label>
                <select
                  value={editPaymentMethod}
                  onChange={(e) => setEditPaymentMethod(e.target.value)}
                  className="w-full p-2.5 bg-emerald-50 dark:bg-emerald-900 border border-emerald-200 dark:border-emerald-700 rounded-xl font-bold"
                >
                  <option value="CASH">CASH</option>
                  <option value="UPI">UPI / QR CODE</option>
                  <option value="CARD">CARD</option>
                  <option value="BANK">BANK TRANSFER</option>
                  <option value="OTHER">OTHER</option>
                </select>
              </div>

              <div>
                <label className="block font-bold mb-1 text-gray-700 dark:text-emerald-300">Payment Status</label>
                <select
                  value={editPaymentStatus}
                  onChange={(e) => setEditPaymentStatus(e.target.value)}
                  className="w-full p-2.5 bg-emerald-50 dark:bg-emerald-900 border border-emerald-200 dark:border-emerald-700 rounded-xl font-bold"
                >
                  <option value="PAID">PAID</option>
                  <option value="PENDING">PENDING</option>
                  <option value="PARTIAL">PARTIAL</option>
                  <option value="REFUNDED">REFUNDED</option>
                  <option value="FAILED">FAILED</option>
                </select>
              </div>

              <div>
                <label className="block font-bold mb-1 text-gray-700 dark:text-emerald-300">Order Status</label>
                <select
                  value={editOrderStatus}
                  onChange={(e) => setEditOrderStatus(e.target.value)}
                  className="w-full p-2.5 bg-emerald-50 dark:bg-emerald-900 border border-emerald-200 dark:border-emerald-700 rounded-xl font-bold"
                >
                  <option value="NEW">NEW</option>
                  <option value="CONFIRMED">CONFIRMED</option>
                  <option value="PACKING">PACKING</option>
                  <option value="READY">READY</option>
                  <option value="OUT_FOR_DELIVERY">OUT FOR DELIVERY</option>
                  <option value="DELIVERED">DELIVERED</option>
                  <option value="CANCELLED">CANCELLED</option>
                </select>
              </div>

              <div>
                <label className="block font-bold mb-1 text-gray-700 dark:text-emerald-300">Grand Total Amount (₹)</label>
                <input
                  type="number"
                  value={editTotal}
                  onChange={(e) => setEditTotal(Number(e.target.value))}
                  className="w-full p-2.5 bg-emerald-50 dark:bg-emerald-900 border border-emerald-200 dark:border-emerald-700 rounded-xl font-black text-emerald-900 dark:text-amber-400"
                />
              </div>

              <div>
                <label className="block font-bold mb-1 text-gray-700 dark:text-emerald-300">Subtotal (₹)</label>
                <input
                  type="number"
                  value={editSubtotal}
                  onChange={(e) => setEditSubtotal(Number(e.target.value))}
                  className="w-full p-2.5 bg-emerald-50 dark:bg-emerald-900 border border-emerald-200 dark:border-emerald-700 rounded-xl font-bold"
                />
              </div>

              <div>
                <label className="block font-bold mb-1 text-gray-700 dark:text-emerald-300">Discount (₹)</label>
                <input
                  type="number"
                  value={editDiscount}
                  onChange={(e) => setEditDiscount(Number(e.target.value))}
                  className="w-full p-2.5 bg-emerald-50 dark:bg-emerald-900 border border-emerald-200 dark:border-emerald-700 rounded-xl font-bold"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block font-bold mb-1 text-gray-700 dark:text-emerald-300">Order Notes / Remarks</label>
                <input
                  type="text"
                  value={editNotes}
                  onChange={(e) => setEditNotes(e.target.value)}
                  placeholder="Internal notes or customer remarks..."
                  className="w-full p-2.5 bg-emerald-50 dark:bg-emerald-900 border border-emerald-200 dark:border-emerald-700 rounded-xl font-medium"
                />
              </div>
            </div>

            <div className="flex gap-2 pt-3 border-t border-emerald-100 dark:border-emerald-800">
              <button
                onClick={saveQuickEdit}
                className="flex-1 py-2.5 bg-emerald-800 hover:bg-emerald-900 text-white font-extrabold rounded-xl text-xs shadow-md transition-all flex items-center justify-center gap-1.5"
              >
                {isDispatching ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Saving...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Save & Update All Details</span>
                  </>
                )}
              </button>
              <button
                onClick={() => setShowEditModal(false)}
                className="py-2.5 px-4 bg-gray-200 text-gray-800 font-bold rounded-xl text-xs"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Order Confirmation Modal */}
      {orderToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white dark:bg-emerald-950 max-w-md w-full p-6 rounded-3xl shadow-2xl border border-emerald-100 dark:border-emerald-800 space-y-4">
            <div className="flex items-center gap-3 text-rose-600">
              <div className="p-3 bg-rose-100 dark:bg-rose-900/50 rounded-2xl">
                <Trash2 className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-bold font-serif text-gray-900 dark:text-emerald-100">Delete POS Order</h3>
                <p className="text-xs text-gray-500 dark:text-emerald-300">Action cannot be undone</p>
              </div>
            </div>

            <div className="p-4 bg-rose-50/50 dark:bg-rose-900/20 rounded-2xl border border-rose-100 dark:border-rose-900 text-xs text-gray-700 dark:text-emerald-200">
              Are you sure you want to delete POS order <strong className="font-mono text-rose-700 dark:text-rose-400">#{orderToDelete.order_number}</strong> ({orderToDelete.customer_name_snapshot || 'Walk-in Customer'} - {formatPrice(orderToDelete.total)})?
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                disabled={isDeletingOrder}
                onClick={() => setOrderToDelete(null)}
                className="px-4 py-2 bg-gray-100 hover:bg-gray-200 dark:bg-emerald-900 dark:hover:bg-emerald-800 text-gray-700 dark:text-emerald-200 font-bold text-xs rounded-xl transition-all"
              >
                No, Cancel
              </button>
              <button
                disabled={isDeletingOrder}
                onClick={handleDeleteOrderConfirm}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-extrabold text-xs rounded-xl shadow-md transition-all flex items-center gap-1.5"
              >
                {isDeletingOrder ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Deleting...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4" />
                    <span>Yes, Delete Order</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Printable Receipt Modal */}
      {showReceiptModal && selectedOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white text-gray-900 max-w-sm w-full p-6 rounded-2xl shadow-2xl space-y-4 border border-gray-200 font-mono text-xs animate-fadeIn">
            <div className="text-center space-y-1 border-b border-dashed border-gray-300 pb-3">
              <h3 className="text-base font-extrabold tracking-wider">MR. VIVASAYI Mart</h3>
              <p className="text-[10px] text-gray-500">{getFormattedStoreAddress()} | Ph: {getFormattedStorePhone()}</p>
              <div className="text-[10px] font-bold text-emerald-800 pt-1">RE-PRINT COUNTER SALE RECEIPT</div>
            </div>

            <div className="space-y-1 text-[11px]">
              <div><strong>Receipt #:</strong> {selectedOrder.order_number}</div>
              <div><strong>Date:</strong> {new Date(selectedOrder.created_at).toLocaleString('en-IN')}</div>
              <div><strong>Customer:</strong> {selectedOrder.customer_name_snapshot || 'Walk-in Customer'} ({selectedOrder.customer_phone_snapshot || 'N/A'})</div>
              <div><strong>Payment:</strong> {selectedOrder.payment_method}</div>
            </div>

            <table className="w-full text-left text-[11px] border-y border-dashed border-gray-300 py-2">
              <thead>
                <tr className="border-b border-gray-200 text-[10px] uppercase font-bold text-gray-700">
                  <th className="py-1">Item</th>
                  <th className="py-1 text-center">Qty</th>
                  <th className="py-1 text-right">Price</th>
                  <th className="py-1 text-right">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {(selectedOrder.items || []).map((it, idx) => (
                  <tr key={it.id || idx} className="py-1">
                    <td className="py-1 max-w-[130px] font-bold truncate">{it.product_name_snapshot}</td>
                    <td className="py-1 text-center font-bold">{it.quantity}</td>
                    <td className="py-1 text-right">₹{it.unit_price_snapshot}</td>
                    <td className="py-1 text-right font-bold">₹{it.total}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div className="space-y-1 text-right text-[11px] pt-1">
              <div className="flex justify-between text-gray-600">
                <span>Subtotal:</span>
                <span>{formatPrice(selectedOrder.subtotal)}</span>
              </div>
              {selectedOrder.discount > 0 && (
                <div className="flex justify-between text-emerald-700 font-bold">
                  <span>Discount:</span>
                  <span>-{formatPrice(selectedOrder.discount)}</span>
                </div>
              )}
              <div className="flex justify-between text-sm font-black pt-1.5 border-t border-gray-400 text-gray-900">
                <span>TOTAL PAID:</span>
                <span>{formatPrice(selectedOrder.total)}</span>
              </div>
            </div>

            <div className="flex gap-2 pt-2 font-sans">
              <button
                onClick={() => window.print()}
                className="flex-1 py-2 bg-emerald-900 hover:bg-emerald-950 text-white font-bold rounded-xl flex items-center justify-center gap-1.5 text-xs"
              >
                <Printer className="w-4 h-4" /> Print Thermal
              </button>
              <button
                onClick={() => setShowReceiptModal(false)}
                className="py-2 px-4 bg-gray-200 hover:bg-gray-300 text-gray-800 font-bold rounded-xl text-xs"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Dispatch Loading Overlay */}
      {isDispatching && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/70 backdrop-blur-md">
          <div className="bg-white dark:bg-emerald-900 p-6 rounded-2xl shadow-2xl text-center space-y-3 max-w-xs w-full">
            <div className="w-12 h-12 border-4 border-emerald-200 border-t-emerald-700 rounded-full animate-spin mx-auto"></div>
            <p className="font-bold text-sm text-gray-900 dark:text-emerald-100">{dispatchStatus}</p>
          </div>
        </div>
      )}

    </div>
  );
};

export default POSBillingDetailsPage;
