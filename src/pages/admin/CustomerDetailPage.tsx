import React, { useState, useMemo, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  ArrowLeft, User, Phone, Mail, MapPin, Calendar, ShoppingBag,
  CreditCard, Edit3, Trash2, MessageSquare, Send, CheckCircle2,
  XCircle, Clock, RotateCcw, AlertTriangle, ShieldCheck, Download, Loader2,
  Eye, FileText, Printer, FileSpreadsheet, Copy, Filter, Search, Check,
  X, ChevronDown, ChevronUp, Sparkles, Tag, Layers, RefreshCw, Ban,
  ExternalLink, Plus, CheckSquare, Square, CheckCheck, Undo2
} from 'lucide-react';
import { formatPrice, formatDate, formatDateTime } from '../../lib/utils';
import type { Customer, Order, OrderItem, Category, Product, OrderStatus, PaymentStatus } from '../../types';
import { useNotifications } from '../../contexts/NotificationContext';
import { RefreshSpinnerModal } from '../../components/common/RefreshSpinnerModal';
import { ExportFormatModal, ExportFormat } from '../../components/common/ExportFormatModal';
import { getJSONStore, setJSONStore, syncOrderStockChange, deleteRecordFromDB } from '../../lib/dbManager';
import { AdminPageSkeleton } from '../../components/common/Skeleton';
import { useActionModal } from '../../contexts/ActionModalContext';
import { CountrySelector } from '../../components/common/CountrySelector';
import { normalizePhoneNumber, COUNTRIES } from '../../lib/countryCodes';
import toast from 'react-hot-toast';

export function CustomerDetailPage() {
  const { customerId } = useParams<{ customerId: string }>();
  const navigate = useNavigate();
  const { addNotification } = useNotifications();
  const { showActionModal } = useActionModal();

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters & Search for Order History
  const [orderSearchQuery, setOrderSearchQuery] = useState('');
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string>('ALL');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<string>('ALL');
  const [selectedNameFilter, setSelectedNameFilter] = useState<string>('ALL');

  // Batch Selection State
  const [selectedOrderIds, setSelectedOrderIds] = useState<string[]>([]);

  // Modals state
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [formData, setFormData] = useState<Customer>({} as Customer);
  const [showDeleteCustomerModal, setShowDeleteCustomerModal] = useState(false);

  // Single Bill View & Export
  const [selectedOrderForBill, setSelectedOrderForBill] = useState<Order | null>(null);
  const [orderToExport, setOrderToExport] = useState<Order | null>(null);
  const [isBatchExport, setIsBatchExport] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Order Edit Modal
  const [editingOrder, setEditingOrder] = useState<Order | null>(null);
  const [editOrderForm, setEditOrderForm] = useState<Partial<Order>>({});

  // Order Delete Confirmation Modal
  const [orderToDelete, setOrderToDelete] = useState<Order | null>(null);
  const [isPermanentDelete, setIsPermanentDelete] = useState(false);

  // Message dispatch modal
  const [sendConfirmModal, setSendConfirmModal] = useState<{
    isOpen: boolean;
    channel: 'WHATSAPP' | 'EMAIL' | 'BOTH';
    template: 'THANKS_MESSAGE' | 'RESTOCK_ALERT' | 'ORDER_CONFIRMATION' | 'COD_PAYMENT_REQUEST' | 'COD_SCREENSHOT_PENDING';
    templateText: string;
  }>({
    isOpen: false,
    channel: 'WHATSAPP',
    template: 'THANKS_MESSAGE',
    templateText: ''
  });

  const [spinnerModal, setSpinnerModal] = useState<{
    isOpen: boolean;
    title: string;
    description: string;
  }>({
    isOpen: false,
    title: '',
    description: ''
  });

  // Load all initial CRM and Store data
  useEffect(() => {
    async function loadData() {
      setLoading(true);
      try {
        const [c, o, cat, p] = await Promise.all([
          getJSONStore<Customer>('customers'),
          getJSONStore<Order>('orders'),
          getJSONStore<Category>('categories'),
          getJSONStore<Product>('products'),
        ]);
        setCustomers(c || []);
        setOrders(o || []);
        setCategories(cat || []);
        setProducts(p || []);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  // Find targeted customer by id, customer_id, or phone number
  const customer: Customer = useMemo(() => {
    if (!customers || customers.length === 0 || !customerId) return {} as Customer;
    const cleanParam = customerId.trim();
    const cleanPhone = cleanParam.replace(/\D/g, '');
    const found = customers.find(c => 
      c.id === cleanParam || 
      c.customer_id === cleanParam ||
      (cleanPhone.length >= 7 && (
        (c.phone && c.phone.replace(/\D/g, '').includes(cleanPhone)) ||
        (c.whatsapp_number && c.whatsapp_number.replace(/\D/g, '').includes(cleanPhone))
      ))
    );
    return found || ({} as Customer);
  }, [customers, customerId]);

  // Sync profile form data whenever customer loads
  useEffect(() => {
    if (customer && customer.id) {
      setFormData({ ...customer });
    }
  }, [customer]);

  // =========================================================================
  // PHONE & UNIQUE ID BASED ORDER GROUPING LOGIC
  // =========================================================================
  const customerPhoneNorm = useMemo(() => {
    return normalizePhoneNumber(customer.phone || '');
  }, [customer.phone]);

  const customerIdClean = customer.id || '';
  const customerUniqueIdClean = customer.customer_id || '';
  const customerNameClean = (customer.name || '').trim().toLowerCase();

  // All raw orders belonging to this phone / customer
  const allMatchedOrders: Order[] = useMemo(() => {
    if (!customer.id) return [];
    return orders.filter((o: Order) => {
      // 1. Direct ID match
      if (o.customer_id && (o.customer_id === customerIdClean || (customerUniqueIdClean && o.customer_id === customerUniqueIdClean))) {
        return true;
      }
      // 2. Normalized Phone match
      if (customerPhoneNorm && o.customer_phone_snapshot) {
        if (normalizePhoneNumber(o.customer_phone_snapshot) === customerPhoneNorm) {
          return true;
        }
      }
      // 3. Fallback name match if non-generic
      if (customerNameClean && customerNameClean !== 'walk-in customer' && customerNameClean !== 'walk-in') {
        if ((o.customer_name_snapshot || '').trim().toLowerCase() === customerNameClean) {
          return true;
        }
      }
      return false;
    });
  }, [orders, customer.id, customerIdClean, customerUniqueIdClean, customerPhoneNorm, customerNameClean]);

  // Breakdown of all names used on bills under this phone
  const nameBreakdown = useMemo(() => {
    const counts: Record<string, number> = {};
    allMatchedOrders.forEach(o => {
      const nameOnBill = (o.customer_name_snapshot || customer.name || 'Walk-in Customer').trim();
      counts[nameOnBill] = (counts[nameOnBill] || 0) + 1;
    });
    return counts;
  }, [allMatchedOrders, customer.name]);

  // Helper: Get categories present in an order
  const getOrderCategories = (order: Order): Category[] => {
    const matched: Category[] = [];
    (order.items || []).forEach(it => {
      const prod = products.find(p => p.id === it.product_id || (p.name && it.product_name_snapshot && p.name.toLowerCase() === it.product_name_snapshot.toLowerCase()));
      if (prod && prod.category_id) {
        const cat = categories.find(c => c.id === prod.category_id);
        if (cat && !matched.some(c => c.id === cat.id)) {
          matched.push(cat);
        }
      }
    });
    return matched;
  };

  // Filtered orders list based on Search, Category, Status, and Billed Name
  const filteredOrders = useMemo(() => {
    return allMatchedOrders.filter(order => {
      // Search Filter
      if (orderSearchQuery.trim()) {
        const q = orderSearchQuery.toLowerCase().trim();
        const num = (order.order_number || '').toLowerCase();
        const billedName = (order.customer_name_snapshot || '').toLowerCase();
        const itemsStr = (order.items || []).map(i => i.product_name_snapshot || '').join(' ').toLowerCase();
        if (!num.includes(q) && !billedName.includes(q) && !itemsStr.includes(q)) {
          return false;
        }
      }

      // Name on Bill Filter
      if (selectedNameFilter !== 'ALL') {
        const billedName = (order.customer_name_snapshot || customer.name || 'Walk-in Customer').trim();
        if (billedName !== selectedNameFilter) {
          return false;
        }
      }

      // Status & Deleted Filter
      if (selectedStatusFilter === 'ACTIVE') {
        if (order.is_deleted || order.status === 'CANCELLED') return false;
      } else if (selectedStatusFilter === 'DELETED') {
        if (!order.is_deleted && order.status !== 'CANCELLED') return false;
      } else if (selectedStatusFilter !== 'ALL') {
        if (order.status !== selectedStatusFilter) return false;
      }

      // Category Filter: only orders containing products in the selected category
      if (selectedCategoryFilter !== 'ALL') {
        const orderCats = getOrderCategories(order);
        const hasCategory = orderCats.some(c => c.id === selectedCategoryFilter || c.name === selectedCategoryFilter);
        if (!hasCategory) return false;
      }

      return true;
    });
  }, [allMatchedOrders, orderSearchQuery, selectedNameFilter, selectedStatusFilter, selectedCategoryFilter, customer.name, products, categories]);

  // Dynamic Metrics Calculation from actual orders
  const metrics = useMemo(() => {
    const activeOrders = allMatchedOrders.filter(o => !o.is_deleted && o.status !== 'CANCELLED');
    const deletedOrders = allMatchedOrders.filter(o => o.is_deleted || o.status === 'CANCELLED');
    const totalSpent = activeOrders.reduce((sum, o) => sum + (Number(o.total) || 0), 0);
    const returnCount = allMatchedOrders.filter(o => o.status === 'RETURNED' || o.payment_status === 'REFUNDED').length;

    return {
      activeCount: activeOrders.length,
      deletedCount: deletedOrders.length,
      totalSpent,
      returnCount
    };
  }, [allMatchedOrders]);

  // =========================================================================
  // ACTIONS: EDIT CUSTOMER PROFILE
  // =========================================================================
  const handleUpdateProfile = (e: React.FormEvent) => {
    e.preventDefault();
    setIsEditingProfile(false);

    showActionModal({
      title: 'Updating Customer Profile',
      subtitle: `Synchronizing profile data for ${formData.name}...`,
      badge: 'CRM Customer Live',
      duration: 750,
      steps: [
        'Validating contact info & address...',
        'Updating customer records in database...',
        'Syncing lifetime value ledger...',
        'Customer profile updated successfully!'
      ],
      onComplete: async () => {
        const next = customers.map(c => c.id === formData.id ? { ...formData, updated_at: new Date().toISOString() } : c);
        setCustomers(next);
        await setJSONStore('customers', next);
        addNotification({
          title: 'Customer Updated',
          message: `Successfully saved profile updates for ${formData.name}.`,
          type: 'success',
          sourceModule: 'Customer Profile'
        });
        toast.success(`Profile updated for ${formData.name}`);
      }
    });
  };

  const handleDeleteCustomer = () => {
    setShowDeleteCustomerModal(false);

    showActionModal({
      title: 'Deleting Customer Profile',
      subtitle: `Removing profile for ${customer.name}...`,
      badge: 'CRM Customer Live',
      duration: 800,
      steps: [
        'Checking related order history and receipts...',
        'Deleting customer profile record...',
        'Customer record deleted successfully!'
      ],
      onComplete: async () => {
        const next = customers.filter(c => c.id !== customer.id);
        setCustomers(next);
        await setJSONStore('customers', next);
        await deleteRecordFromDB('customers', customer.id);
        addNotification({
          title: 'Customer Deleted',
          message: `Removed customer record for ${customer.name}.`,
          type: 'info',
          sourceModule: 'Customer Profile'
        });
        toast.success(`Customer ${customer.name} deleted`);
        navigate('/admin/customers');
      }
    });
  };

  // =========================================================================
  // ACTIONS: EDIT ORDER & SAVE WITH STOCK SYNC
  // =========================================================================
  const handleOpenEditOrder = (order: Order) => {
    setEditingOrder(order);
    setEditOrderForm({
      ...order,
      customer_name_snapshot: order.customer_name_snapshot || customer.name,
      customer_phone_snapshot: order.customer_phone_snapshot || customer.phone,
    });
  };

  const handleSaveOrderEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingOrder) return;

    const oldOrder = editingOrder;
    const updated: Order = {
      ...oldOrder,
      ...editOrderForm,
      total: Number(editOrderForm.total) || oldOrder.total,
      subtotal: Number(editOrderForm.subtotal) || oldOrder.subtotal,
      discount: Number(editOrderForm.discount) || 0,
      delivery_fee: Number(editOrderForm.delivery_fee) || 0,
      status: (editOrderForm.status || oldOrder.status) as OrderStatus,
      payment_status: (editOrderForm.payment_status || oldOrder.payment_status) as PaymentStatus,
      updated_at: new Date().toISOString()
    };

    try {
      // Synchronize stock changes
      const syncRes = await syncOrderStockChange(oldOrder, updated);
      const freshProducts = await getJSONStore<Product>('products');
      setProducts(freshProducts);

      if (syncRes.changed) {
        if (syncRes.refilledCount > 0) {
          toast.success(`Inventory stock refilled: +${syncRes.refilledCount} item(s) restored!`);
        } else {
          toast.success(`Inventory stock synchronized.`);
        }
      }
    } catch (err) {
      console.error('Stock sync error on edit order:', err);
    }

    const nextOrders = orders.map(o => o.id === updated.id ? updated : o);
    setOrders(nextOrders);
    await setJSONStore('orders', nextOrders);

    addNotification({
      title: 'Order Updated',
      message: `Updated details for order #${updated.order_number}.`,
      type: 'success',
      sourceModule: 'Customer Profile'
    });
    toast.success(`Saved order #${updated.order_number}`);
    setEditingOrder(null);
  };

  // =========================================================================
  // ACTIONS: DELETE ORDER WITH STOCK REFILL & DELETED BADGE
  // =========================================================================
  const handleConfirmDeleteOrder = async () => {
    if (!orderToDelete) return;
    const target = orderToDelete;
    const permanent = isPermanentDelete;
    setOrderToDelete(null);

    if (permanent) {
      // 1. Permanent Removal: restore stock & delete row
      try {
        await syncOrderStockChange(target, null);
        const freshProducts = await getJSONStore<Product>('products');
        setProducts(freshProducts);
      } catch (err) {
        console.error('Failed to sync stock on permanent order delete:', err);
      }

      const nextOrders = orders.filter(o => o.id !== target.id);
      setOrders(nextOrders);
      await setJSONStore('orders', nextOrders);
      await deleteRecordFromDB('orders', target.id);

      toast.success(`Order #${target.order_number} permanently deleted & stock restored.`);
      addNotification({
        title: 'Order Purged',
        message: `Order #${target.order_number} permanently removed from database.`,
        type: 'warning',
        sourceModule: 'Customer Profile'
      });
    } else {
      // 2. Soft Delete: mark as is_deleted = true, status = CANCELLED, show DELETED badge & restore stock!
      const deletedOrder: Order = {
        ...target,
        is_deleted: true,
        status: 'CANCELLED',
        deleted_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      try {
        const syncRes = await syncOrderStockChange(target, deletedOrder);
        const freshProducts = await getJSONStore<Product>('products');
        setProducts(freshProducts);

        if (syncRes.refilledCount > 0) {
          toast.success(`Order #${target.order_number} marked DELETED. Refilled +${syncRes.refilledCount} items to stock!`, { duration: 4500 });
        } else {
          toast.success(`Order #${target.order_number} marked DELETED.`);
        }
      } catch (err) {
        console.error('Failed to sync stock on soft delete:', err);
      }

      const nextOrders = orders.map(o => o.id === target.id ? deletedOrder : o);
      setOrders(nextOrders);
      await setJSONStore('orders', nextOrders);

      addNotification({
        title: 'Order Marked DELETED',
        message: `Order #${target.order_number} marked as DELETED with stock restored to catalog.`,
        type: 'warning',
        sourceModule: 'Customer Profile'
      });
    }
  };

  // Restore a deleted order
  const handleRestoreOrder = async (order: Order) => {
    const restored: Order = {
      ...order,
      is_deleted: false,
      status: 'CONFIRMED',
      deleted_at: undefined,
      updated_at: new Date().toISOString()
    };

    try {
      await syncOrderStockChange(order, restored);
      const freshProducts = await getJSONStore<Product>('products');
      setProducts(freshProducts);
    } catch (err) {
      console.error('Stock sync error on restore:', err);
    }

    const nextOrders = orders.map(o => o.id === order.id ? restored : o);
    setOrders(nextOrders);
    await setJSONStore('orders', nextOrders);
    toast.success(`Order #${order.order_number} restored to active confirmed status.`);
  };

  // =========================================================================
  // ACTIONS: SINGLE & MULTIPLE (BATCH) EXPORT
  // =========================================================================
  const handleOpenSingleExport = (order: Order) => {
    setOrderToExport(order);
    setIsBatchExport(false);
    setShowExportModal(true);
  };

  const handleOpenBatchExport = () => {
    if (selectedOrderIds.length === 0) {
      toast.error('Please select at least one order to export.');
      return;
    }
    setOrderToExport(null);
    setIsBatchExport(true);
    setShowExportModal(true);
  };

  const executeExport = (format: ExportFormat) => {
    setShowExportModal(false);
    setIsRefreshing(true);

    const ordersToExportList = isBatchExport
      ? allMatchedOrders.filter(o => selectedOrderIds.includes(o.id))
      : (orderToExport ? [orderToExport] : []);

    if (ordersToExportList.length === 0) {
      setIsRefreshing(false);
      return;
    }

    setTimeout(() => {
      setIsRefreshing(false);

      if (format === 'CSV' || format === 'EXCEL') {
        const isExcel = format === 'EXCEL';
        const headers = [
          'Order #', 'Order Date', 'Billed Customer Name', 'Phone', 'Source',
          'Status', 'Deleted?', 'Payment Method', 'Payment Status', 'Product SKU',
          'Product Name', 'Category', 'Pack Size', 'Unit Price (₹)', 'Quantity',
          'Item Total (₹)', 'Subtotal (₹)', 'Discount (₹)', 'Delivery Fee (₹)',
          'Grand Total (₹)', 'Delivery Address', 'Notes'
        ];

        const rows: string[] = [];

        ordersToExportList.forEach(ord => {
          const ordCategories = getOrderCategories(ord).map(c => c.name).join(', ') || 'General';
          const items = ord.items && ord.items.length > 0 ? ord.items : [null];

          items.forEach((it) => {
            let catName = ordCategories;
            if (it && it.product_id) {
              const p = products.find(prod => prod.id === it.product_id);
              if (p && p.category_id) {
                const c = categories.find(cat => cat.id === p.category_id);
                if (c) catName = c.name;
              }
            }

            rows.push([
              ord.order_number,
              `"${new Date(ord.created_at).toLocaleString('en-IN')}"`,
              `"${ord.customer_name_snapshot || customer.name || 'Walk-in Customer'}"`,
              ord.customer_phone_snapshot || customer.phone || '',
              ord.source,
              ord.status,
              ord.is_deleted ? 'DELETED' : 'NO',
              ord.payment_method,
              ord.payment_status,
              it ? `"${it.sku_snapshot || ''}"` : '',
              it ? `"${it.product_name_snapshot || ''}"` : 'General Order',
              `"${catName}"`,
              it ? `"${it.pack_size_snapshot || ''}"` : '',
              it ? it.unit_price_snapshot : 0,
              it ? it.quantity : 1,
              it ? it.total : ord.total,
              ord.subtotal,
              ord.discount,
              ord.delivery_fee,
              ord.total,
              `"${(ord.delivery_address || '').replace(/"/g, '""')}"`,
              `"${(ord.notes || '').replace(/"/g, '""')}"`
            ].join(','));
          });
        });

        const bom = isExcel ? '\uFEFF' : '';
        const csvContent = bom + [headers.join(','), ...rows].join('\n');
        const blob = new Blob([csvContent], { type: isExcel ? 'application/vnd.ms-excel;charset=utf-8;' : 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        const prefix = isBatchExport ? `Batch_${ordersToExportList.length}_Orders` : `Order_${ordersToExportList[0].order_number}`;
        const catSuffix = selectedCategoryFilter !== 'ALL' ? `_${selectedCategoryFilter}` : '';
        link.setAttribute('download', `MR_VIVASAYI_${prefix}${catSuffix}_${format}_${new Date().toISOString().split('T')[0]}.${isExcel ? 'csv' : 'csv'}`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);

        toast.success(`Exported ${ordersToExportList.length} bill(s) as ${format}!`);
      } else if (format === 'PDF' || format === 'PRINT') {
        // Multi-order or Single Printable Bill Window
        const printWindow = window.open('', '_blank', 'width=850,height=950');
        if (printWindow) {
          const billsHtml = ordersToExportList.map(ord => {
            const itemsHtml = (ord.items || []).map((it, idx) => `
              <tr>
                <td style="padding: 8px; border-bottom: 1px solid #eee;">${idx + 1}</td>
                <td style="padding: 8px; border-bottom: 1px solid #eee;"><strong>${it.product_name_snapshot}</strong> ${it.pack_size_snapshot ? `(${it.pack_size_snapshot})` : ''}</td>
                <td style="padding: 8px; border-bottom: 1px solid #eee; text-align: center;">${it.quantity}</td>
                <td style="padding: 8px; border-bottom: 1px solid #eee; text-align: right;">₹${it.unit_price_snapshot}</td>
                <td style="padding: 8px; border-bottom: 1px solid #eee; text-align: right; font-weight: bold;">₹${it.total}</td>
              </tr>
            `).join('');

            return `
              <div class="order-page" style="page-break-after: always; padding: 20px; font-family: sans-serif; color: #064e3b;">
                <div style="text-align: center; border-bottom: 2px solid #064e3b; padding-bottom: 10px; margin-bottom: 16px;">
                  <h1 style="margin: 0; color: #064e3b; font-size: 22px;">🌿 MR. VIVASAYI Organic Foods</h1>
                  <p style="margin: 3px 0 0; color: #666; font-size: 11px;">Good Food. Good Life. | Tax Invoice &amp; Customer Bill</p>
                </div>
                
                <div style="display: flex; justify-content: space-between; margin-bottom: 16px; font-size: 12px; gap: 14px;">
                  <div style="flex: 1; background: #f0fdf4; padding: 12px; border-radius: 10px; border: 1px solid #bbf7d0;">
                    <h4 style="margin: 0 0 6px; color: #064e3b; font-size: 11px; text-transform: uppercase;">Order Details</h4>
                    <p style="margin: 2px 0;"><strong>Order Ref:</strong> #${ord.order_number}</p>
                    <p style="margin: 2px 0;"><strong>Date:</strong> ${new Date(ord.created_at).toLocaleString('en-IN')}</p>
                    <p style="margin: 2px 0;"><strong>Channel:</strong> ${ord.source}</p>
                    <p style="margin: 2px 0;"><strong>Status:</strong> ${ord.is_deleted ? 'DELETED' : ord.status}</p>
                  </div>
                  <div style="flex: 1; background: #f0fdf4; padding: 12px; border-radius: 10px; border: 1px solid #bbf7d0;">
                    <h4 style="margin: 0 0 6px; color: #064e3b; font-size: 11px; text-transform: uppercase;">Billed Customer</h4>
                    <p style="margin: 2px 0;"><strong>Name on Bill:</strong> ${ord.customer_name_snapshot || customer.name || 'Walk-in Customer'}</p>
                    <p style="margin: 2px 0;"><strong>Customer ID:</strong> ${customer.customer_id || customer.id}</p>
                    <p style="margin: 2px 0;"><strong>Phone:</strong> ${ord.customer_phone_snapshot || customer.phone || '—'}</p>
                    <p style="margin: 2px 0;"><strong>Delivery:</strong> ${ord.delivery_address || 'Store Counter'}</p>
                  </div>
                </div>

                <table style="width: 100%; border-collapse: collapse; margin-bottom: 16px; font-size: 11px;">
                  <thead>
                    <tr style="background: #064e3b; color: white;">
                      <th style="padding: 8px; width: 30px;">#</th>
                      <th style="padding: 8px; text-align: left;">Product Item</th>
                      <th style="padding: 8px; text-align: center;">Qty</th>
                      <th style="padding: 8px; text-align: right;">Unit Price</th>
                      <th style="padding: 8px; text-align: right;">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${itemsHtml}
                  </tbody>
                </table>

                <div style="margin-left: auto; width: 280px; background: #064e3b; color: white; padding: 12px; border-radius: 10px; font-size: 11px;">
                  <div style="display: flex; justify-content: space-between; margin-bottom: 4px;"><span>Subtotal:</span><span>₹${ord.subtotal}</span></div>
                  <div style="display: flex; justify-content: space-between; margin-bottom: 4px;"><span>Delivery Fee:</span><span>+₹${ord.delivery_fee}</span></div>
                  ${ord.discount > 0 ? `<div style="display: flex; justify-content: space-between; margin-bottom: 4px;"><span>Discount:</span><span>-₹${ord.discount}</span></div>` : ''}
                  <div style="border-top: 1px solid #047857; padding-top: 6px; font-size: 13px; font-weight: bold; color: #fde68a; display: flex; justify-content: space-between;">
                    <span>Grand Total:</span><span>₹${ord.total}</span>
                  </div>
                </div>

                <div style="text-align: center; margin-top: 25px; font-size: 10px; color: #64748b; border-top: 1px dashed #cbd5e1; padding-top: 10px;">
                  <p>Order #${ord.order_number} | Thank you for choosing pure organic food! 🌱</p>
                </div>
              </div>
            `;
          }).join('');

          printWindow.document.write(`
            <!DOCTYPE html>
            <html>
              <head>
                <title>MR. VIVASAYI Order Invoices - ${customer.name}</title>
                <style>
                  body { margin: 0; padding: 0; font-family: sans-serif; }
                  @media print {
                    .order-page { page-break-after: always; }
                  }
                </style>
              </head>
              <body>
                ${billsHtml}
              </body>
            </html>
          `);
          printWindow.document.close();
          printWindow.focus();
          setTimeout(() => printWindow.print(), 350);
        }
      }
    }, 400);
  };

  // Dispatch direct message template
  const promptSendTemplate = (
    channel: 'WHATSAPP' | 'EMAIL' | 'BOTH',
    template: 'THANKS_MESSAGE' | 'RESTOCK_ALERT' | 'ORDER_CONFIRMATION' | 'COD_PAYMENT_REQUEST' | 'COD_SCREENSHOT_PENDING'
  ) => {
    let msg = '';
    if (template === 'THANKS_MESSAGE') {
      msg = `Hello ${customer.name}, Thank you for buying traditional organic products from MR. VIVASAYI! We appreciate your trust in authentic healthy living. Explore more products at mrvivasayi.in`;
    } else if (template === 'RESTOCK_ALERT') {
      msg = `Hello ${customer.name}, Your favorite ${customer.category_preference || 'Traditional Foods'} are now fresh back in stock at MR. VIVASAYI store! Order today before stock runs out.`;
    } else if (template === 'ORDER_CONFIRMATION') {
      msg = `MR. VIVASAYI Order Confirmed for ${customer.name}! Total Bill: ₹${metrics.totalSpent}. Delivery: Tamil Nadu Wide. Status: Verified & Confirmed for Dispatch.`;
    } else if (template === 'COD_PAYMENT_REQUEST') {
      msg = `Hi ${customer.name},\n\nYour COD Order payment for MR. VIVASAYI Traditional Foods is due.\n\n📲 Please complete your payment by scanning our UPI QR Code or transferring to UPI ID mrvivasayi@upi.\n\nReply here with your screenshot for immediate verification!\n\nThank you,\nMR. VIVASAYI Foods`;
    } else if (template === 'COD_SCREENSHOT_PENDING') {
      msg = `Hi ${customer.name},\n\nYour COD order payment is pending verification. Please upload your payment screenshot here.\n\nThank you,\nMR. VIVASAYI Foods`;
    }

    setSendConfirmModal({
      isOpen: true,
      channel,
      template,
      templateText: msg
    });
  };

  const executeSendTemplate = () => {
    const { channel, template, templateText } = sendConfirmModal;
    setSendConfirmModal({ isOpen: false, channel: 'WHATSAPP', template: 'THANKS_MESSAGE', templateText: '' });

    setSpinnerModal({
      isOpen: true,
      title: `Dispatching ${channel} Template...`,
      description: `Please wait while sending ${template} to ${customer.name}...`
    });

    setTimeout(() => {
      if (channel === 'WHATSAPP' || channel === 'BOTH') {
        const cleanPhone = (customer.whatsapp_number || customer.phone || '9876543210').replace(/\D/g, '');
        window.open(`https://wa.me/91${cleanPhone}?text=${encodeURIComponent(templateText)}`, '_blank');
      }

      setCustomers(prev => {
        const next = prev.map(c => c.id === customer.id ? {
          ...c,
          whatsapp_sent_status: (channel === 'WHATSAPP' || channel === 'BOTH') ? 'SENT' : c.whatsapp_sent_status,
          email_sent_status: (channel === 'EMAIL' || channel === 'BOTH') ? 'SENT' : c.email_sent_status,
          last_template_sent: template,
          last_template_sent_at: new Date().toISOString(),
          last_sent_channel: channel
        } : c);
        setJSONStore('customers', next);
        return next;
      });

      setSpinnerModal({ isOpen: false, title: '', description: '' });
      toast.success(`Message dispatched to ${customer.name}!`);
    }, 450);
  };

  if (loading) {
    return <AdminPageSkeleton title="Customer Profile & Order History" />;
  }

  if (!customer || !customer.id) {
    return (
      <div className="max-w-xl mx-auto py-20 px-4 text-center animate-fadeIn">
        <div className="bg-white rounded-3xl p-8 border border-emerald-100 shadow-xl space-y-4">
          <div className="w-16 h-16 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center mx-auto shadow-xs">
            <User className="w-8 h-8 text-amber-600" />
          </div>
          <h2 className="text-xl font-black text-emerald-950">Customer Record Not Found</h2>
          <p className="text-xs text-gray-500 leading-relaxed">
            The customer identifier <code className="bg-gray-100 px-2 py-0.5 rounded font-mono font-bold text-gray-800">{customerId || 'N/A'}</code> does not match any active customer profile in the database.
          </p>
          <div className="pt-2 flex items-center justify-center gap-3">
            <button
              onClick={() => navigate('/admin/customers')}
              className="px-5 py-2.5 bg-emerald-800 hover:bg-emerald-900 text-white font-extrabold text-xs rounded-xl shadow-xs inline-flex items-center gap-2 transition"
            >
              <ArrowLeft className="w-4 h-4" /> Back to Customer Directory
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 font-sans text-gray-900 max-w-6xl mx-auto pb-16 animate-fadeIn">
      
      {/* =========================================================================
          HEADER: BACK BUTTON, CUSTOMER ID & ACTIONS
         ========================================================================= */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-3xl border border-emerald-100 shadow-sm">
        <div className="flex items-center space-x-3.5">
          <button
            onClick={() => navigate('/admin/customers')}
            className="p-2.5 rounded-2xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 transition shadow-2xs"
            title="Back to Customer Directory"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <div className="flex items-center space-x-2 flex-wrap gap-y-1">
              {/* Unique Customer ID with 1-click copy */}
              <span className="text-[11px] bg-emerald-100 text-emerald-950 font-black px-2.5 py-0.5 rounded-full uppercase border border-emerald-300 flex items-center gap-1 font-mono shadow-2xs">
                <span>{customer.customer_id || customer.id}</span>
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(customer.customer_id || customer.id);
                    toast.success('Customer ID copied to clipboard!');
                  }}
                  className="hover:text-emerald-700 ml-0.5"
                  title="Copy Customer ID"
                >
                  <Copy className="w-3 h-3" />
                </button>
              </span>

              {/* Source Channel Badge */}
              <span className="text-[10px] bg-amber-100 text-amber-900 font-extrabold px-2.5 py-0.5 rounded-full border border-amber-200">
                Channel: {customer.source_channel || 'POS'}
              </span>

              {/* Country Flag */}
              <span className="text-xs">
                {COUNTRIES.find(cntry => cntry.code === customer.country_code || cntry.callingCode === customer.calling_code)?.flag || '🇮🇳'}
              </span>
            </div>

            <h1 className="text-2xl font-black font-serif text-emerald-950 mt-1 flex items-center gap-2">
              <span>Customer Profile: {customer.name}</span>
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => setIsEditingProfile(!isEditingProfile)}
            className="px-4 py-2.5 bg-emerald-800 hover:bg-emerald-900 text-white font-extrabold text-xs rounded-xl shadow-xs flex items-center gap-1.5 transition active:scale-95"
          >
            <Edit3 className="w-4 h-4 text-amber-300" />
            <span>{isEditingProfile ? 'Cancel Edit' : 'Edit Profile'}</span>
          </button>

          <button
            onClick={() => setShowDeleteCustomerModal(true)}
            className="px-4 py-2.5 bg-rose-50 hover:bg-rose-100 text-rose-800 font-extrabold text-xs rounded-xl border border-rose-200 shadow-2xs flex items-center gap-1.5 transition active:scale-95"
          >
            <Trash2 className="w-4 h-4 text-rose-600" />
            <span>Delete Profile</span>
          </button>
        </div>
      </div>

      {/* =========================================================================
          DYNAMIC STATS HEADER: ACCURATE TOTALS & LIFETIME VALUE
         ========================================================================= */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-emerald-100 shadow-sm text-center">
          <span className="text-[10px] font-extrabold text-gray-400 uppercase tracking-wider block">Total Active Orders</span>
          <div className="text-2xl font-black text-emerald-950 mt-1">{metrics.activeCount}</div>
          {metrics.deletedCount > 0 && (
            <span className="text-[10px] font-bold text-rose-600 bg-rose-50 px-2 py-0.5 rounded-full border border-rose-200 mt-1 inline-block">
              +{metrics.deletedCount} Deleted / Cancelled
            </span>
          )}
        </div>

        <div className="bg-white p-5 rounded-2xl border border-emerald-100 shadow-sm text-center">
          <span className="text-[10px] font-extrabold text-gray-400 uppercase tracking-wider block">Total Lifetime Spent</span>
          <div className="text-2xl font-black text-emerald-800 mt-1 font-mono">{formatPrice(metrics.totalSpent)}</div>
          <span className="text-[10px] font-medium text-gray-400 block mt-0.5">Excludes cancelled/deleted</span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-emerald-100 shadow-sm text-center">
          <span className="text-[10px] font-extrabold text-rose-500 uppercase tracking-wider block">Product Returns &amp; Refunds</span>
          <div className="text-2xl font-black text-rose-700 mt-1">{metrics.returnCount}</div>
          <span className="text-[10px] font-medium text-gray-400 block mt-0.5">Returned / Refunded bills</span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-emerald-100 shadow-sm text-center">
          <span className="text-[10px] font-extrabold text-purple-600 uppercase tracking-wider block">Assigned Staff</span>
          <div className="text-sm font-black text-purple-950 mt-2">{customer.assigned_staff || 'MR_VIVASAYI_TEAM'}</div>
          <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full inline-block mt-1">
            Active Relationship
          </span>
        </div>
      </div>

      {/* =========================================================================
          MAIN LAYOUT: 1/3 LEFT PROFILE & MESSAGES | 2/3 RIGHT ORDER HISTORY
         ========================================================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* LEFT COLUMN: Customer Personal Details & WhatsApp Dispatcher */}
        <div className="space-y-6">
          <div className="bg-white rounded-3xl p-6 border border-emerald-100 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <h3 className="font-extrabold text-emerald-950 text-sm flex items-center gap-2">
                <User className="w-4 h-4 text-emerald-700" />
                <span>Customer Personal Details</span>
              </h3>
              <span className="text-[10px] bg-emerald-50 text-emerald-800 font-bold px-2 py-0.5 rounded">
                Editable
              </span>
            </div>

            {isEditingProfile ? (
              <form onSubmit={handleUpdateProfile} className="space-y-3 text-xs">
                <div>
                  <label className="block text-gray-600 font-bold mb-1">Customer Full Name *</label>
                  <input
                    type="text"
                    required
                    value={formData.name || ''}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full p-2 bg-emerald-50/50 border border-emerald-200 rounded-xl font-bold"
                  />
                </div>

                <div>
                  <label className="block text-gray-600 font-bold mb-1">Phone Number *</label>
                  <div className="flex gap-2">
                    <CountrySelector
                      value={formData.country_code || 'IN'}
                      onChange={(cntry) => setFormData({ ...formData, country_code: cntry.code, calling_code: cntry.callingCode })}
                      className="w-28 shrink-0 text-xs"
                    />
                    <input
                      type="tel"
                      required
                      value={formData.phone || ''}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      className="flex-1 p-2 bg-emerald-50/50 border border-emerald-200 rounded-xl font-bold font-mono"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-gray-600 font-bold mb-1">Email Address</label>
                  <input
                    type="email"
                    value={formData.email || ''}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full p-2 bg-emerald-50/50 border border-emerald-200 rounded-xl font-bold"
                  />
                </div>

                <div>
                  <label className="block text-gray-600 font-bold mb-1">Delivery Address &amp; Street</label>
                  <textarea
                    rows={2}
                    value={formData.address || ''}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    className="w-full p-2 bg-emerald-50/50 border border-emerald-200 rounded-xl"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-gray-600 font-bold mb-1">City</label>
                    <input
                      type="text"
                      value={formData.city || ''}
                      onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                      className="w-full p-2 bg-emerald-50/50 border border-emerald-200 rounded-xl font-bold"
                    />
                  </div>
                  <div>
                    <label className="block text-gray-600 font-bold mb-1">Pincode</label>
                    <input
                      type="text"
                      value={formData.pincode || ''}
                      onChange={(e) => setFormData({ ...formData, pincode: e.target.value })}
                      className="w-full p-2 bg-emerald-50/50 border border-emerald-200 rounded-xl font-bold"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-gray-600 font-bold mb-1">Category Preference</label>
                  <input
                    type="text"
                    value={formData.category_preference || ''}
                    onChange={(e) => setFormData({ ...formData, category_preference: e.target.value })}
                    placeholder="e.g. Traditional Rice, Wood Pressed Oils"
                    className="w-full p-2 bg-emerald-50/50 border border-emerald-200 rounded-xl"
                  />
                </div>

                <div className="flex gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsEditingProfile(false)}
                    className="flex-1 py-2 bg-gray-100 text-gray-700 font-bold rounded-xl"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-2 bg-emerald-800 text-white font-extrabold rounded-xl shadow-xs"
                  >
                    Save Changes
                  </button>
                </div>
              </form>
            ) : (
              <div className="space-y-2.5 text-xs">
                <div className="flex items-center justify-between py-1 border-b border-gray-50">
                  <span className="text-gray-400 font-bold">Customer ID:</span>
                  <span className="font-extrabold font-mono text-emerald-950 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                    {customer.customer_id || customer.id}
                  </span>
                </div>
                <div className="flex items-center justify-between py-1 border-b border-gray-50">
                  <span className="text-gray-400 font-bold">Phone:</span>
                  <span className="font-extrabold text-gray-900 font-mono flex items-center gap-1">
                    <span>{COUNTRIES.find(cntry => cntry.code === customer.country_code || cntry.callingCode === customer.calling_code)?.flag || '🇮🇳'}</span>
                    <span>{customer.calling_code || '+91'} {customer.phone || 'N/A'}</span>
                  </span>
                </div>
                <div className="flex items-center justify-between py-1 border-b border-gray-50">
                  <span className="text-gray-400 font-bold">WhatsApp:</span>
                  <span className="font-extrabold text-emerald-800 font-mono">
                    {customer.calling_code || '+91'} {customer.whatsapp_number || customer.phone || 'N/A'}
                  </span>
                </div>
                <div className="flex items-center justify-between py-1 border-b border-gray-50">
                  <span className="text-gray-400 font-bold">Email:</span>
                  <span className="font-extrabold text-blue-800">{customer.email || 'N/A'}</span>
                </div>
                <div className="flex items-center justify-between py-1 border-b border-gray-50">
                  <span className="text-gray-400 font-bold">City / Location:</span>
                  <span className="font-extrabold text-gray-800">{customer.city || 'Cumbum'}</span>
                </div>
                <div className="flex items-center justify-between py-1 border-b border-gray-50">
                  <span className="text-gray-400 font-bold">Category Preference:</span>
                  <span className="font-extrabold text-emerald-900 bg-emerald-100 px-2 py-0.5 rounded">
                    {customer.category_preference || 'Traditional Rice'}
                  </span>
                </div>
                <div className="flex items-center justify-between py-1">
                  <span className="text-gray-400 font-bold">Scheduled Promo:</span>
                  <span className="font-extrabold text-amber-900 bg-amber-100 px-2 py-0.5 rounded">
                    {customer.promotion_schedule || 'EVERY_1_WEEK'}
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Quick Message Dispatcher */}
          <div className="bg-white rounded-3xl p-6 border border-emerald-100 shadow-sm space-y-4">
            <h3 className="font-extrabold text-emerald-950 text-sm border-b border-gray-100 pb-3 flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-emerald-700" />
              <span>Dispatch Template Message</span>
            </h3>

            <div className="space-y-2 text-xs">
              <p className="text-[11px] text-gray-500">
                Select a message template to dispatch directly via WhatsApp or Email:
              </p>

              <button
                onClick={() => promptSendTemplate('WHATSAPP', 'COD_PAYMENT_REQUEST')}
                className="w-full text-left p-3 bg-amber-50 hover:bg-amber-100 border border-amber-200 rounded-2xl text-amber-950 font-bold transition flex items-center justify-between"
              >
                <span>WA: COD Payment Request (UPI QR)</span>
                <Send className="w-3.5 h-3.5 text-amber-800" />
              </button>

              <button
                onClick={() => promptSendTemplate('WHATSAPP', 'COD_SCREENSHOT_PENDING')}
                className="w-full text-left p-3 bg-orange-50 hover:bg-orange-100 border border-orange-200 rounded-2xl text-orange-950 font-bold transition flex items-center justify-between"
              >
                <span>WA: COD Pending (Upload Screenshot)</span>
                <Send className="w-3.5 h-3.5 text-orange-800" />
              </button>

              <button
                onClick={() => promptSendTemplate('WHATSAPP', 'ORDER_CONFIRMATION')}
                className="w-full text-left p-3 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-2xl text-emerald-950 font-bold transition flex items-center justify-between"
              >
                <span>WA: Order Confirmed</span>
                <Send className="w-3.5 h-3.5 text-emerald-800" />
              </button>

              <button
                onClick={() => promptSendTemplate('BOTH', 'THANKS_MESSAGE')}
                className="w-full text-left p-3 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-2xl text-blue-950 font-bold transition flex items-center justify-between"
              >
                <span>Both: Shopping Thanks &amp; Website Link</span>
                <Send className="w-3.5 h-3.5 text-blue-800" />
              </button>
            </div>
          </div>
        </div>

        {/* =========================================================================
            RIGHT COLUMN: ORDER HISTORY, PHONE NAME BREAKDOWN, CATEGORY FILTERS,
            BATCH ACTIONS & DELETED LABELS
           ========================================================================= */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-white rounded-3xl p-6 border border-emerald-100 shadow-sm space-y-4">
            
            {/* Order History Header with Count */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-gray-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-900 flex items-center justify-center">
                  <ShoppingBag className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-emerald-950 text-base">
                    Customer Order History ({filteredOrders.length} of {allMatchedOrders.length})
                  </h3>
                  <p className="text-[11px] text-gray-500">
                    Grouped by customer phone &amp; unique ID ({customerPhoneNorm || customer.phone || 'N/A'})
                  </p>
                </div>
              </div>

              {/* Batch Export Button */}
              <button
                type="button"
                onClick={handleOpenBatchExport}
                disabled={selectedOrderIds.length === 0}
                className="px-4 py-2 bg-emerald-800 hover:bg-emerald-900 text-white disabled:opacity-40 disabled:cursor-not-allowed font-extrabold text-xs rounded-xl shadow-xs transition flex items-center gap-1.5"
              >
                <Download className="w-4 h-4 text-amber-300" />
                <span>Export Selected ({selectedOrderIds.length})</span>
              </button>
            </div>

            {/* =========================================================================
                PHONE & NAME BASED BREAKDOWN (Which bill was under which name!)
               ========================================================================= */}
            <div className="bg-emerald-50/60 p-3.5 rounded-2xl border border-emerald-200/80 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-black text-emerald-950 uppercase tracking-wider flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-emerald-700" />
                  <span>Names on Bills for this Phone:</span>
                </span>
                <span className="text-[10px] text-gray-500 font-semibold">
                  Click to filter bills by name
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                <button
                  type="button"
                  onClick={() => setSelectedNameFilter('ALL')}
                  className={`px-2.5 py-1 rounded-xl text-[11px] font-extrabold transition shadow-2xs ${
                    selectedNameFilter === 'ALL'
                      ? 'bg-emerald-900 text-white'
                      : 'bg-white text-emerald-950 border border-emerald-200 hover:bg-emerald-100'
                  }`}
                >
                  All Names ({allMatchedOrders.length})
                </button>

                {Object.entries(nameBreakdown).map(([name, count]) => (
                  <button
                    key={name}
                    type="button"
                    onClick={() => setSelectedNameFilter(name)}
                    className={`px-2.5 py-1 rounded-xl text-[11px] font-extrabold transition shadow-2xs flex items-center gap-1 ${
                      selectedNameFilter === name
                        ? 'bg-emerald-800 text-amber-300 shadow'
                        : 'bg-white text-emerald-950 border border-emerald-200 hover:bg-emerald-100'
                    }`}
                  >
                    <span>{name}</span>
                    <span className="text-[10px] px-1.5 py-0.2 bg-emerald-100 text-emerald-900 rounded-full font-mono font-bold">
                      {count}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* =========================================================================
                SEARCH & CATEGORY FILTERS BAR
               ========================================================================= */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs">
              {/* Search Bar */}
              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-3 top-3 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search order #, items, billed name..."
                  value={orderSearchQuery}
                  onChange={(e) => setOrderSearchQuery(e.target.value)}
                  className="w-full pl-8 pr-3 py-2 bg-gray-50 border border-gray-200 rounded-xl font-medium outline-none focus:ring-1 focus:ring-emerald-500 text-xs"
                />
              </div>

              {/* Category Filter */}
              <div>
                <select
                  value={selectedCategoryFilter}
                  onChange={(e) => setSelectedCategoryFilter(e.target.value)}
                  className="w-full p-2 bg-gray-50 border border-gray-200 rounded-xl font-bold text-gray-800 text-xs outline-none"
                  title="Filter orders containing products from this category"
                >
                  <option value="ALL">All Product Categories</option>
                  {categories.map(cat => (
                    <option key={cat.id} value={cat.id}>
                      {cat.name} {cat.tamil_name ? `(${cat.tamil_name})` : ''}
                    </option>
                  ))}
                </select>
              </div>

              {/* Status & Deleted Filter */}
              <div>
                <select
                  value={selectedStatusFilter}
                  onChange={(e) => setSelectedStatusFilter(e.target.value)}
                  className="w-full p-2 bg-gray-50 border border-gray-200 rounded-xl font-bold text-gray-800 text-xs outline-none"
                >
                  <option value="ALL">All Statuses (Active &amp; Deleted)</option>
                  <option value="ACTIVE">Active Orders Only</option>
                  <option value="NEW">New Orders</option>
                  <option value="CONFIRMED">Confirmed Orders</option>
                  <option value="DELIVERED">Delivered Orders</option>
                  <option value="DELETED">DELETED / Cancelled Only ❌</option>
                </select>
              </div>
            </div>

            {/* =========================================================================
                SELECT ALL & BATCH ACTIONS STRIP
               ========================================================================= */}
            <div className="flex items-center justify-between bg-gray-50 p-2.5 rounded-xl border border-gray-200/60 text-xs">
              <label className="flex items-center gap-2 cursor-pointer font-bold text-gray-700">
                <input
                  type="checkbox"
                  checked={filteredOrders.length > 0 && selectedOrderIds.length === filteredOrders.length}
                  onChange={(e) => {
                    if (e.target.checked) {
                      setSelectedOrderIds(filteredOrders.map(o => o.id));
                    } else {
                      setSelectedOrderIds([]);
                    }
                  }}
                  className="w-4 h-4 rounded text-emerald-800 focus:ring-emerald-500 cursor-pointer"
                />
                <span>Select All Filtered ({filteredOrders.length})</span>
              </label>

              {selectedOrderIds.length > 0 && (
                <div className="flex items-center gap-2">
                  <span className="text-emerald-950 font-black text-[11px]">
                    {selectedOrderIds.length} bills selected
                  </span>
                  <button
                    type="button"
                    onClick={() => setSelectedOrderIds([])}
                    className="text-[11px] text-gray-500 hover:text-gray-700 font-bold underline"
                  >
                    Clear
                  </button>
                </div>
              )}
            </div>

            {/* =========================================================================
                ORDER CARDS LIST WITH BILL INFO, DELETED BADGE & ACTIONS
               ========================================================================= */}
            {allMatchedOrders.length === 0 ? (
              <div className="p-10 text-center space-y-3 bg-emerald-50/40 rounded-2xl border border-emerald-100">
                <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto shadow-2xs">
                  <ShoppingBag className="w-6 h-6 text-emerald-600" />
                </div>
                <h4 className="font-extrabold text-emerald-950 text-sm">No Active Orders for this Customer</h4>
                <p className="text-xs text-gray-500 max-w-sm mx-auto">
                  This customer does not have any purchase orders recorded in the system yet.
                </p>
                <div className="pt-1">
                  <Link
                    to="/admin/pos"
                    className="px-4 py-2 bg-emerald-800 hover:bg-emerald-900 text-white font-bold text-xs rounded-xl shadow-xs inline-flex items-center gap-1.5 transition"
                  >
                    <Plus className="w-3.5 h-3.5" /> Create Order in POS
                  </Link>
                </div>
              </div>
            ) : filteredOrders.length === 0 ? (
              <div className="p-10 text-center space-y-3 bg-gray-50 rounded-2xl border border-gray-200">
                <div className="w-12 h-12 rounded-full bg-gray-200 text-gray-600 flex items-center justify-center mx-auto shadow-2xs">
                  <Search className="w-6 h-6 text-gray-500" />
                </div>
                <h4 className="font-extrabold text-gray-900 text-sm">No Orders Found Matching Filters</h4>
                <p className="text-xs text-gray-500">
                  No orders match your current search query or category/status filters.
                </p>
                <div className="pt-1">
                  <button
                    onClick={() => {
                      setOrderSearchQuery('');
                      setSelectedCategoryFilter('ALL');
                      setSelectedStatusFilter('ALL');
                      setSelectedNameFilter('ALL');
                    }}
                    className="px-4 py-2 bg-gray-800 hover:bg-gray-900 text-white font-bold text-xs rounded-xl shadow-xs inline-flex items-center gap-1.5 transition"
                  >
                    <RotateCcw className="w-3.5 h-3.5" /> Clear Order Filters
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredOrders.map(order => {
                  const isDeleted = Boolean(order.is_deleted || order.status === 'CANCELLED');
                  const isSelected = selectedOrderIds.includes(order.id);
                  const orderCats = getOrderCategories(order);
                  const billedName = order.customer_name_snapshot || customer.name || 'Walk-in Customer';
                  const isDifferentName = billedName.toLowerCase() !== (customer.name || '').toLowerCase();

                  return (
                    <div
                      key={order.id}
                      className={`p-4 rounded-2xl border transition-all text-xs space-y-3 ${
                        isDeleted
                          ? 'bg-rose-50/40 border-rose-200/80'
                          : isSelected
                          ? 'bg-emerald-50/60 border-emerald-400 shadow-xs'
                          : 'bg-white hover:bg-emerald-50/30 border-gray-200'
                      }`}
                    >
                      {/* Top Row: Checkbox, Order Number, Status, DELETED badge, Total */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                        <div className="flex items-center gap-2.5 flex-wrap">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedOrderIds(prev => [...prev, order.id]);
                              } else {
                                setSelectedOrderIds(prev => prev.filter(id => id !== order.id));
                              }
                            }}
                            className="w-4 h-4 rounded text-emerald-800 focus:ring-emerald-500 cursor-pointer"
                          />

                          <span className="font-black text-emerald-950 font-mono text-sm">
                            #{order.order_number}
                          </span>

                          {/* DELETED Label Badge */}
                          {order.is_deleted && (
                            <span className="px-2.5 py-0.5 text-[10px] font-black rounded-full bg-rose-600 text-white flex items-center gap-1 shadow-2xs">
                              <XCircle className="w-3 h-3 text-white" /> DELETED ORDER
                            </span>
                          )}

                          {!order.is_deleted && order.status === 'CANCELLED' && (
                            <span className="px-2.5 py-0.5 text-[10px] font-black rounded-full bg-red-100 text-red-800 border border-red-300 flex items-center gap-1">
                              <Ban className="w-3 h-3 text-red-700" /> CANCELLED
                            </span>
                          )}

                          {!order.is_deleted && order.status !== 'CANCELLED' && (
                            <span className={`px-2.5 py-0.5 text-[10px] font-extrabold rounded-full ${
                              order.status === 'DELIVERED' ? 'bg-green-100 text-green-800 border border-green-300' :
                              order.status === 'CONFIRMED' ? 'bg-emerald-100 text-emerald-800 border border-emerald-300' :
                              'bg-amber-100 text-amber-800 border border-amber-300'
                            }`}>
                              {order.status}
                            </span>
                          )}

                          <span className="text-[10px] bg-blue-100 text-blue-800 font-bold px-2 py-0.5 rounded-full border border-blue-200">
                            {order.source}
                          </span>
                        </div>

                        {/* Grand Total */}
                        <div className="text-right">
                          <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider block">Total Bill</span>
                          <span className={`font-mono font-black text-base ${isDeleted ? 'text-gray-400 line-through' : 'text-emerald-950'}`}>
                            {formatPrice(order.total)}
                          </span>
                        </div>
                      </div>

                      {/* Middle Row: EXACT BILLED NAME & PHONE DETAILS */}
                      <div className="p-2.5 rounded-xl bg-gray-50/80 border border-gray-100 flex flex-wrap items-center justify-between gap-2 text-[11px]">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-gray-500 font-bold">Billed to Customer:</span>
                          <span className="font-black text-gray-900 bg-white px-2 py-0.5 rounded border border-gray-200">
                            {billedName}
                          </span>
                          {isDifferentName && (
                            <span className="text-[10px] font-bold px-1.5 py-0.5 bg-amber-100 text-amber-900 border border-amber-300 rounded flex items-center gap-1">
                              🏷️ Differs from profile ({customer.name})
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-3 text-gray-600">
                          <span>Phone: <strong className="font-mono text-gray-800">{order.customer_phone_snapshot || customer.phone || '—'}</strong></span>
                          <span>•</span>
                          <span>Payment: <strong className="text-purple-900">{order.payment_method} ({order.payment_status})</strong></span>
                        </div>
                      </div>

                      {/* Item Summary & Category Badges */}
                      <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-gray-600">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-gray-400 font-bold">Categories in Bill:</span>
                          {orderCats.length > 0 ? (
                            orderCats.map(c => (
                              <span key={c.id} className="bg-emerald-50 text-emerald-800 border border-emerald-200 px-2 py-0.5 rounded-lg text-[10px] font-bold flex items-center gap-1">
                                <Tag className="w-2.5 h-2.5 text-emerald-600" />
                                {c.name}
                              </span>
                            ))
                          ) : (
                            <span className="text-gray-400 italic">Standard Items</span>
                          )}
                        </div>

                        <div className="text-gray-400 font-medium">
                          Date: <strong className="text-gray-700">{formatDateTime(order.created_at)}</strong>
                        </div>
                      </div>

                      {/* Bottom Action Bar: Open Bill, Edit Order, Delete Order, Export, WA, Hub */}
                      <div className="flex flex-wrap items-center justify-end gap-2 pt-2 border-t border-gray-100">
                        {/* Open Bill Preview */}
                        <button
                          type="button"
                          onClick={() => setSelectedOrderForBill(order)}
                          className="px-3 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200/80 rounded-xl font-extrabold text-[11px] flex items-center gap-1 shadow-2xs transition"
                          title="View Full Itemized Bill Invoice"
                        >
                          <Eye className="w-3.5 h-3.5 text-amber-700" />
                          <span>Open Bill</span>
                        </button>

                        {/* Edit Order Details */}
                        <button
                          type="button"
                          onClick={() => handleOpenEditOrder(order)}
                          className="px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-900 border border-blue-200 rounded-xl font-extrabold text-[11px] flex items-center gap-1 shadow-2xs transition"
                          title="Edit Order Status, Payment, Items, Address & Notes"
                        >
                          <Edit3 className="w-3.5 h-3.5 text-blue-700" />
                          <span>Edit Order</span>
                        </button>

                        {/* Export Bill Button */}
                        <button
                          type="button"
                          onClick={() => handleOpenSingleExport(order)}
                          className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-900 border border-emerald-200 rounded-xl font-extrabold text-[11px] flex items-center gap-1 shadow-2xs transition"
                          title="Export Single Bill to CSV, Excel, PDF, or JSON"
                        >
                          <Download className="w-3.5 h-3.5 text-emerald-700" />
                          <span>Export Bill</span>
                        </button>

                        {/* Restore or Delete Order Button */}
                        {isDeleted ? (
                          <button
                            type="button"
                            onClick={() => handleRestoreOrder(order)}
                            className="px-3 py-1.5 bg-emerald-100 hover:bg-emerald-200 text-emerald-900 border border-emerald-300 rounded-xl font-extrabold text-[11px] flex items-center gap-1 shadow-2xs transition"
                            title="Restore deleted order to active status"
                          >
                            <Undo2 className="w-3.5 h-3.5 text-emerald-800" />
                            <span>Restore Order</span>
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => {
                              setOrderToDelete(order);
                              setIsPermanentDelete(false);
                            }}
                            className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-800 border border-rose-200 rounded-xl font-extrabold text-[11px] flex items-center gap-1 shadow-2xs transition"
                            title="Delete order, add DELETED badge, and re-fill inventory stock"
                          >
                            <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                            <span>Delete Order</span>
                          </button>
                        )}

                        {/* View in Orders Hub */}
                        <Link
                          to={`/admin/orders?search=${encodeURIComponent(order.order_number)}`}
                          className="px-3 py-1.5 bg-emerald-900 hover:bg-emerald-950 text-white rounded-xl font-extrabold text-[11px] flex items-center gap-1 shadow-xs transition"
                          title="View order in central Orders Hub"
                        >
                          <ExternalLink className="w-3.5 h-3.5 text-amber-300" />
                          <span>Orders Hub</span>
                        </Link>
                      </div>

                    </div>
                  );
                })}
              </div>
            )}

          </div>
        </div>

      </div>

      {/* =========================================================================
          VIEW ITEMIZED BILL MODAL
         ========================================================================= */}
      {selectedOrderForBill && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-emerald-100 space-y-4 max-h-[90vh] overflow-y-auto">
            
            <div className="flex justify-between items-center border-b border-gray-100 pb-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] bg-emerald-100 text-emerald-900 font-extrabold px-2.5 py-0.5 rounded-full uppercase">
                    TAX INVOICE BILL
                  </span>
                  {selectedOrderForBill.is_deleted && (
                    <span className="text-[10px] bg-rose-600 text-white font-black px-2 py-0.5 rounded-full uppercase">
                      DELETED
                    </span>
                  )}
                </div>
                <h3 className="font-extrabold text-emerald-950 text-lg mt-1 font-mono">
                  #{selectedOrderForBill.order_number}
                </h3>
              </div>
              <button
                onClick={() => setSelectedOrderForBill(null)}
                className="p-1.5 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Bill Info Grid */}
            <div className="bg-emerald-50/50 p-4 rounded-2xl border border-emerald-100 space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-gray-500 font-bold">Billed Customer Name:</span>
                <span className="font-extrabold text-gray-900">{selectedOrderForBill.customer_name_snapshot || customer.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500 font-bold">Phone Number:</span>
                <span className="font-extrabold text-emerald-900 font-mono">{selectedOrderForBill.customer_phone_snapshot || customer.phone || 'N/A'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500 font-bold">Order Source:</span>
                <span className="font-extrabold text-blue-800">{selectedOrderForBill.source}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500 font-bold">Order Date:</span>
                <span className="font-bold text-gray-700">{formatDateTime(selectedOrderForBill.created_at)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500 font-bold">Delivery Address:</span>
                <span className="font-bold text-gray-800 text-right">{selectedOrderForBill.delivery_address || 'Store Counter / Cumbum'}</span>
              </div>
              <div className="flex justify-between border-t border-emerald-200/60 pt-2">
                <span className="text-gray-500 font-bold">Payment Status:</span>
                <span className="font-extrabold text-purple-900">{selectedOrderForBill.payment_method} ({selectedOrderForBill.payment_status})</span>
              </div>
            </div>

            {/* Order Items Breakdown */}
            <div className="space-y-2 text-xs">
              <div className="font-extrabold text-gray-900 text-xs border-b border-gray-100 pb-1">
                Ordered Produce &amp; Items:
              </div>
              <div className="max-h-52 overflow-y-auto space-y-1.5 pr-1">
                {selectedOrderForBill.items?.map((item, idx) => (
                  <div key={idx} className="flex items-center justify-between p-2.5 bg-gray-50 rounded-xl border border-gray-100 text-xs">
                    <div>
                      <div className="font-bold text-gray-900">{item.product_name_snapshot}</div>
                      {item.tamil_name_snapshot && (
                        <div className="text-[10px] text-emerald-800 font-semibold">{item.tamil_name_snapshot}</div>
                      )}
                      <div className="text-[10px] text-gray-400">Qty: {item.quantity} × {formatPrice(item.unit_price_snapshot)}</div>
                    </div>
                    <div className="font-black text-emerald-950 font-mono">
                      {formatPrice(item.total)}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Total Calculation Breakdown */}
            <div className="border-t border-gray-200 pt-3 space-y-1.5 text-xs">
              <div className="flex justify-between text-gray-600 font-medium">
                <span>Subtotal</span>
                <span className="font-mono">{formatPrice(selectedOrderForBill.subtotal)}</span>
              </div>
              <div className="flex justify-between text-gray-600 font-medium">
                <span>Delivery Charge</span>
                <span className="font-mono">{formatPrice(selectedOrderForBill.delivery_fee)}</span>
              </div>
              {selectedOrderForBill.discount > 0 && (
                <div className="flex justify-between text-emerald-700 font-bold">
                  <span>Discount</span>
                  <span className="font-mono">-{formatPrice(selectedOrderForBill.discount)}</span>
                </div>
              )}
              <div className="flex justify-between text-base font-black text-emerald-950 border-t border-gray-200 pt-2">
                <span>Total Amount</span>
                <span className="font-mono text-emerald-900">{formatPrice(selectedOrderForBill.total)}</span>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => {
                  const currentOrder = selectedOrderForBill;
                  setSelectedOrderForBill(null);
                  handleOpenSingleExport(currentOrder);
                }}
                className="flex-1 py-2.5 bg-emerald-100 hover:bg-emerald-200 text-emerald-900 font-extrabold text-xs rounded-xl flex items-center justify-center gap-1.5 shadow-2xs"
              >
                <Download className="w-4 h-4" /> Export Bill
              </button>
              <button
                type="button"
                onClick={() => setSelectedOrderForBill(null)}
                className="flex-1 py-2.5 bg-emerald-800 hover:bg-emerald-900 text-white font-extrabold text-xs rounded-xl shadow"
              >
                Close Bill Preview
              </button>
            </div>

          </div>
        </div>
      )}

      {/* =========================================================================
          EDIT ORDER MODAL (Status, Payment, Billed Name, Delivery & Stock Sync)
         ========================================================================= */}
      {editingOrder && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-emerald-100 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center border-b border-gray-100 pb-3">
              <div>
                <h3 className="font-extrabold text-emerald-950 text-base flex items-center gap-2">
                  <Edit3 className="w-4 h-4 text-emerald-700" />
                  <span>Edit Order #{editingOrder.order_number}</span>
                </h3>
                <p className="text-[11px] text-gray-500">Updating status &amp; quantities automatically syncs inventory stock.</p>
              </div>
              <button onClick={() => setEditingOrder(null)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveOrderEdit} className="space-y-3.5 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-gray-700 font-bold mb-1">Order Status *</label>
                  <select
                    value={editOrderForm.status || 'NEW'}
                    onChange={(e) => setEditOrderForm({ ...editOrderForm, status: e.target.value as OrderStatus })}
                    className="w-full p-2 bg-gray-50 border border-gray-200 rounded-xl font-bold text-gray-800"
                  >
                    <option value="NEW">New Order</option>
                    <option value="CONFIRMED">Confirmed</option>
                    <option value="PACKING">Packing</option>
                    <option value="READY">Ready for Dispatch</option>
                    <option value="OUT_FOR_DELIVERY">Out for Delivery</option>
                    <option value="DELIVERED">Delivered</option>
                    <option value="CANCELLED">Cancelled (Refills Stock)</option>
                    <option value="RETURNED">Returned (Refills Stock)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-gray-700 font-bold mb-1">Payment Status *</label>
                  <select
                    value={editOrderForm.payment_status || 'PENDING'}
                    onChange={(e) => setEditOrderForm({ ...editOrderForm, payment_status: e.target.value as PaymentStatus })}
                    className="w-full p-2 bg-gray-50 border border-gray-200 rounded-xl font-bold text-gray-800"
                  >
                    <option value="PENDING">Pending Payment</option>
                    <option value="PAID">Paid ✓</option>
                    <option value="PARTIAL">Partial</option>
                    <option value="REFUNDED">Refunded (Refills Stock)</option>
                    <option value="FAILED">Failed</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-gray-700 font-bold mb-1">Billed Customer Name</label>
                  <input
                    type="text"
                    value={editOrderForm.customer_name_snapshot || ''}
                    onChange={(e) => setEditOrderForm({ ...editOrderForm, customer_name_snapshot: e.target.value })}
                    className="w-full p-2 bg-gray-50 border border-gray-200 rounded-xl font-bold"
                  />
                </div>

                <div>
                  <label className="block text-gray-700 font-bold mb-1">Phone on Bill</label>
                  <input
                    type="tel"
                    value={editOrderForm.customer_phone_snapshot || ''}
                    onChange={(e) => setEditOrderForm({ ...editOrderForm, customer_phone_snapshot: e.target.value })}
                    className="w-full p-2 bg-gray-50 border border-gray-200 rounded-xl font-bold font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-gray-700 font-bold mb-1">Subtotal (₹)</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={editOrderForm.subtotal ?? 0}
                    onChange={(e) => {
                      const sub = Number(e.target.value) || 0;
                      const fee = Number(editOrderForm.delivery_fee) || 0;
                      const disc = Number(editOrderForm.discount) || 0;
                      setEditOrderForm({ ...editOrderForm, subtotal: sub, total: Math.max(0, sub + fee - disc) });
                    }}
                    className="w-full p-2 bg-gray-50 border border-gray-200 rounded-xl font-mono font-bold"
                  />
                </div>

                <div>
                  <label className="block text-gray-700 font-bold mb-1">Delivery Fee (₹)</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={editOrderForm.delivery_fee ?? 0}
                    onChange={(e) => {
                      const fee = Number(e.target.value) || 0;
                      const sub = Number(editOrderForm.subtotal) || 0;
                      const disc = Number(editOrderForm.discount) || 0;
                      setEditOrderForm({ ...editOrderForm, delivery_fee: fee, total: Math.max(0, sub + fee - disc) });
                    }}
                    className="w-full p-2 bg-gray-50 border border-gray-200 rounded-xl font-mono font-bold"
                  />
                </div>

                <div>
                  <label className="block text-gray-700 font-bold mb-1">Discount (₹)</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={editOrderForm.discount ?? 0}
                    onChange={(e) => {
                      const disc = Number(e.target.value) || 0;
                      const sub = Number(editOrderForm.subtotal) || 0;
                      const fee = Number(editOrderForm.delivery_fee) || 0;
                      setEditOrderForm({ ...editOrderForm, discount: disc, total: Math.max(0, sub + fee - disc) });
                    }}
                    className="w-full p-2 bg-gray-50 border border-gray-200 rounded-xl font-mono font-bold"
                  />
                </div>
              </div>

              <div>
                <label className="block text-gray-700 font-bold mb-1">Delivery Address</label>
                <textarea
                  rows={2}
                  value={editOrderForm.delivery_address || ''}
                  onChange={(e) => setEditOrderForm({ ...editOrderForm, delivery_address: e.target.value })}
                  className="w-full p-2 bg-gray-50 border border-gray-200 rounded-xl"
                />
              </div>

              <div>
                <label className="block text-gray-700 font-bold mb-1">Notes / Instructions</label>
                <input
                  type="text"
                  value={editOrderForm.notes || ''}
                  onChange={(e) => setEditOrderForm({ ...editOrderForm, notes: e.target.value })}
                  className="w-full p-2 bg-gray-50 border border-gray-200 rounded-xl"
                />
              </div>

              <div className="p-3 bg-emerald-950 text-white rounded-xl flex justify-between items-center">
                <span className="font-extrabold text-amber-300">Grand Total:</span>
                <span className="font-black text-lg text-amber-300 font-mono">
                  {formatPrice(editOrderForm.total || 0)}
                </span>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setEditingOrder(null)}
                  className="px-4 py-2 bg-gray-100 text-gray-700 font-bold rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-800 hover:bg-emerald-900 text-white font-extrabold rounded-xl shadow-xs"
                >
                  Save Order &amp; Sync Stock
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =========================================================================
          ORDER DELETE CONFIRMATION MODAL (Soft Delete with DELETED Badge & Stock Refill)
         ========================================================================= */}
      {orderToDelete && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-rose-100 space-y-4">
            <div className="w-12 h-12 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mx-auto">
              <AlertTriangle className="w-6 h-6" />
            </div>

            <div className="text-center space-y-1">
              <h3 className="font-extrabold text-gray-900 text-base">
                Delete Order #{orderToDelete.order_number}?
              </h3>
              <p className="text-xs text-gray-500">
                Total Bill: <strong>{formatPrice(orderToDelete.total)}</strong> ({orderToDelete.customer_name_snapshot || 'Walk-in Customer'})
              </p>
            </div>

            <div className="bg-amber-50 p-3 rounded-xl border border-amber-200 text-xs text-amber-900 space-y-1">
              <p className="font-bold flex items-center gap-1">
                <span>✓ Automatic Inventory Refill:</span>
              </p>
              <p className="text-[11px] text-amber-800">
                All {(orderToDelete.items || []).length} ordered items will be automatically <strong>re-filled back into store stock</strong>.
              </p>
            </div>

            {/* Permanent vs Soft Delete Toggle */}
            <div className="p-3 bg-gray-50 rounded-xl border border-gray-200 text-xs">
              <label className="flex items-center gap-2 cursor-pointer font-bold text-gray-700">
                <input
                  type="checkbox"
                  checked={isPermanentDelete}
                  onChange={(e) => setIsPermanentDelete(e.target.checked)}
                  className="w-4 h-4 rounded text-rose-600 focus:ring-rose-500 cursor-pointer"
                />
                <span>Permanently purge from database</span>
              </label>
              <p className="text-[10px] text-gray-400 mt-1 pl-6">
                Unchecked: marks order with a visible red <strong>DELETED</strong> badge in history (can be restored later).
              </p>
            </div>

            <div className="flex gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setOrderToDelete(null)}
                className="flex-1 py-2.5 bg-gray-100 text-gray-700 font-bold text-xs rounded-xl"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDeleteOrder}
                className="flex-1 py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-extrabold text-xs rounded-xl shadow-xs"
              >
                {isPermanentDelete ? 'Permanently Delete' : 'Mark as DELETED'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          EXPORT FORMAT MODAL (Supports Single Order or Batch Orders Export)
         ========================================================================= */}
      <ExportFormatModal
        isOpen={showExportModal}
        title={isBatchExport ? `Export ${selectedOrderIds.length} Selected Bills` : `Export Order #${orderToExport?.order_number || ''}`}
        description={
          selectedCategoryFilter !== 'ALL'
            ? `Select export file format. Bills will be filtered by selected category (${categories.find(c => c.id === selectedCategoryFilter)?.name || selectedCategoryFilter}):`
            : "Select export file format for invoice records and customer receipts:"
        }
        totalRecords={isBatchExport ? selectedOrderIds.length : 1}
        onClose={() => {
          setShowExportModal(false);
          setOrderToExport(null);
        }}
        onExport={executeExport}
      />

      {/* =========================================================================
          REFRESH & ACTION SPINNER MODALS
         ========================================================================= */}
      <RefreshSpinnerModal
        isOpen={isRefreshing}
        title="Generating Order Export..."
        subtitle="Formatting invoice datasets and receipts..."
        moduleName="Export Engine"
      />

      {/* DELETE CUSTOMER PROFILE MODAL */}
      {showDeleteCustomerModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-rose-100 space-y-4">
            <div className="w-12 h-12 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mx-auto">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div className="text-center">
              <h3 className="font-extrabold text-gray-900 text-base">Permanently Delete Customer?</h3>
              <p className="text-xs text-gray-500 mt-1">
                Are you sure you want to delete <strong className="text-gray-800">{customer.name}</strong>? This action cannot be undone.
              </p>
            </div>
            <div className="flex gap-3 pt-2">
              <button
                onClick={() => setShowDeleteCustomerModal(false)}
                className="flex-1 py-2.5 bg-gray-100 text-gray-700 font-bold text-xs rounded-xl"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteCustomer}
                className="flex-1 py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-extrabold text-xs rounded-xl shadow-xs"
              >
                Yes, Delete Profile
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SEND MESSAGE CONFIRMATION MODAL */}
      {sendConfirmModal.isOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-emerald-100 space-y-4">
            <h3 className="font-extrabold text-emerald-950 text-base flex items-center gap-2 border-b border-gray-100 pb-3">
              <Send className="w-5 h-5 text-emerald-700" />
              <span>Confirm Template Send ({sendConfirmModal.channel})</span>
            </h3>
            <div className="space-y-2 text-xs">
              <p className="text-gray-600">
                Are you sure you want to dispatch <strong>{sendConfirmModal.template}</strong> to <strong>{customer.name}</strong>?
              </p>
              <div className="p-3 bg-gray-50 border border-gray-200 rounded-xl text-[11px] font-mono text-gray-800 whitespace-pre-wrap">
                {sendConfirmModal.templateText}
              </div>
            </div>
            <div className="flex gap-3 pt-2">
              <button
                onClick={() => setSendConfirmModal({ isOpen: false, channel: 'WHATSAPP', template: 'THANKS_MESSAGE', templateText: '' })}
                className="flex-1 py-2.5 bg-gray-100 text-gray-700 font-bold text-xs rounded-xl"
              >
                Cancel
              </button>
              <button
                onClick={executeSendTemplate}
                className="flex-1 py-2.5 bg-emerald-800 hover:bg-emerald-900 text-white font-extrabold text-xs rounded-xl shadow-xs"
              >
                Yes, Send Message
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SPINNER MODAL */}
      {spinnerModal.isOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white rounded-3xl p-6 max-w-sm w-full text-center space-y-3 shadow-2xl border border-emerald-100">
            <Loader2 className="w-10 h-10 text-emerald-700 animate-spin mx-auto" />
            <h3 className="font-extrabold text-emerald-950 text-sm">{spinnerModal.title}</h3>
            <p className="text-xs text-gray-500">{spinnerModal.description}</p>
          </div>
        </div>
      )}

    </div>
  );
}

export default CustomerDetailPage;
