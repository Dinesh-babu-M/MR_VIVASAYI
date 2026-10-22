import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  FileText,
  Plus,
  Search,
  Filter,
  Download,
  Trash2,
  Edit,
  Eye,
  CheckCircle2,
  X,
  AlertTriangle,
  Sparkles,
  ArrowUpRight,
  Printer,
  ChevronLeft,
  ChevronRight,
  ShieldAlert,
  ShoppingCart,
  User,
  Phone,
  Calendar,
  Layers,
  RotateCcw,
  RefreshCw,
  Copy,
  ExternalLink,
  Tag,
  Percent,
  DollarSign,
  Minus,
  ShoppingBag
} from 'lucide-react';
import { getJSONStore, setJSONStore } from '../../lib/dbManager';
import { useNotifications } from '../../contexts/NotificationContext';
import { generateSampleOrderId, generateOriginalOrderId } from '../../lib/sequentialIdUtils';
import { ExportFormatModal, type ExportFormat } from '../../components/common/ExportFormatModal';
import { RefreshSpinnerModal } from '../../components/common/RefreshSpinnerModal';
import { formatPrice } from '../../lib/utils';
import { getFormattedStoreAddress, getFormattedStorePhone } from '../../lib/storeSettings';
import type { SampleBillingOrder, Order, OrderItem, Product, PaymentMethod } from '../../types';
import toast from 'react-hot-toast';

export const SampleBillingInvoicesPage: React.FC = () => {
  const navigate = useNavigate();
  const { addNotification } = useNotifications();

  // Data states
  const [sampleOrders, setSampleOrders] = useState<SampleBillingOrder[]>([]);
  const [liveOrders, setExistingLiveOrders] = useState<Order[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Filter & Search states
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE_SAMPLE' | 'CONVERTED' | 'CANCELLED'>('ALL');
  const [paymentFilter, setPaymentFilter] = useState<string>('ALL');

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState<number>(10);

  // Multi-select state
  const [selectedOrderIds, setSelectedOrderIds] = useState<string[]>([]);

  // Watermark Settings (Default FALSE: Clean original bill format - does NOT expose sample watermark unless explicitly toggled)
  const [showWatermark, setShowWatermark] = useState<boolean>(false);

  // Modals state
  const [viewingOrder, setViewingOrder] = useState<SampleBillingOrder | null>(null);
  const [editingOrder, setEditingOrder] = useState<SampleBillingOrder | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);

  // Multi-product builder state for Sample Bill creation
  interface StagedBillItem {
    id: string;
    product: Product;
    quantity: number;
    item_discount_percent: number;
  }
  const [billItems, setBillItems] = useState<StagedBillItem[]>([]);
  const [selectedProductId, setSelectedProductId] = useState<string>('');
  const [selectedProductQty, setSelectedProductQty] = useState<number>(1);
  const [selectedProductDiscount, setSelectedProductDiscount] = useState<number>(0);

  // Pop Confirmation Modal (Universal Yes / No)
  const [actionConfirmModal, setActionConfirmModal] = useState<{
    isOpen: boolean;
    type: 'delete_single' | 'delete_bulk' | 'convert_single' | 'convert_bulk';
    title: string;
    subtitle: string;
    targetOrder?: SampleBillingOrder;
    confirmButtonText: string;
    confirmButtonColor?: 'rose' | 'emerald' | 'amber';
    onConfirm: () => void | Promise<void>;
  } | null>(null);

  // New Order Form state with MRP, Additional Discount, and Tax
  const [newOrderForm, setNewOrderForm] = useState<{
    customer_name: string;
    customer_phone: string;
    extra_discount_mode: 'PERCENT' | 'AMOUNT';
    extra_discount_value: number;
    gst_percent: number;
    payment_method: PaymentMethod;
    notes: string;
  }>({
    customer_name: 'Walk-in Trial Customer',
    customer_phone: '9876543210',
    extra_discount_mode: 'PERCENT',
    extra_discount_value: 0,
    gst_percent: 5,
    payment_method: 'CASH',
    notes: 'Trial sample billing record'
  });

  // Load Data
  const loadData = async () => {
    try {
      setLoading(true);
      const [samples, live, prods] = await Promise.all([
        getJSONStore<SampleBillingOrder>('sample_billing_orders'),
        getJSONStore<Order>('orders'),
        getJSONStore<Product>('products')
      ]);

      setSampleOrders(samples || []);
      setExistingLiveOrders(live || []);
      setProducts(prods || []);
      if (prods && prods.length > 0 && !selectedProductId) {
        setSelectedProductId(prods[0].id);
      }
    } catch (err) {
      console.error('Error loading sample billing records:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Filtered & Sorted Sample Orders (Default Sort: RECENT TOP FIRST)
  const filteredAndSortedOrders = useMemo(() => {
    let result = [...sampleOrders];

    // Status filter
    if (statusFilter === 'ACTIVE_SAMPLE') {
      result = result.filter((o) => !o.converted_to_live && o.status !== 'CANCELLED');
    } else if (statusFilter === 'CONVERTED') {
      result = result.filter((o) => o.converted_to_live === true);
    } else if (statusFilter === 'CANCELLED') {
      result = result.filter((o) => o.status === 'CANCELLED');
    }

    // Payment filter
    if (paymentFilter !== 'ALL') {
      result = result.filter((o) => o.payment_method === paymentFilter);
    }

    // Search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter((o) => {
        const idMatch = (o.order_number || o.id || '').toLowerCase().includes(q);
        const nameMatch = (o.customer_name_snapshot || '').toLowerCase().includes(q);
        const phoneMatch = (o.customer_phone_snapshot || '').toLowerCase().includes(q);
        const itemMatch = o.items?.some((i) => i.product_name_snapshot.toLowerCase().includes(q));
        return idMatch || nameMatch || phoneMatch || itemMatch;
      });
    }

    // DEFAULT SORT: Recent orders top first (created_at descending)
    return result.sort((a, b) => {
      const timeA = new Date(a.created_at || 0).getTime();
      const timeB = new Date(b.created_at || 0).getTime();
      return timeB - timeA;
    });
  }, [sampleOrders, statusFilter, paymentFilter, searchQuery]);

  // Paginated Orders
  const totalPages = Math.ceil(filteredAndSortedOrders.length / pageSize) || 1;
  const paginatedOrders = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredAndSortedOrders.slice(start, start + pageSize);
  }, [filteredAndSortedOrders, currentPage, pageSize]);

  // Statistics KPI calculation with MRP & Discount breakdowns
  const stats = useMemo(() => {
    const totalCount = sampleOrders.length;
    const totalAmount = sampleOrders.reduce((sum, o) => sum + (o.total || 0), 0);
    const totalMRP = sampleOrders.reduce((sum, o) => sum + (o.total_mrp || o.total || 0), 0);
    const totalDiscounts = sampleOrders.reduce((sum, o) => {
      const mrpSavings = o.mrp_savings || 0;
      const extraDisc = o.extra_discount_amount || o.discount || 0;
      return sum + mrpSavings + extraDisc;
    }, 0);
    const convertedCount = sampleOrders.filter((o) => o.converted_to_live).length;
    const activeCount = sampleOrders.filter((o) => !o.converted_to_live && o.status !== 'CANCELLED').length;
    return {
      totalCount,
      totalAmount,
      totalMRP,
      totalDiscounts,
      convertedCount,
      activeCount
    };
  }, [sampleOrders]);

  // Multi-select Checkboxes
  const isAllPageSelected = useMemo(() => {
    if (paginatedOrders.length === 0) return false;
    return paginatedOrders.every((o) => selectedOrderIds.includes(o.id));
  }, [paginatedOrders, selectedOrderIds]);

  const toggleSelectAllPage = () => {
    if (isAllPageSelected) {
      const currentIds = paginatedOrders.map((o) => o.id);
      setSelectedOrderIds((prev) => prev.filter((id) => !currentIds.includes(id)));
    } else {
      const currentIds = paginatedOrders.map((o) => o.id);
      const combined = Array.from(new Set([...selectedOrderIds, ...currentIds]));
      setSelectedOrderIds(combined);
    }
  };

  const toggleSelectRow = (id: string) => {
    setSelectedOrderIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const clearSelection = () => {
    setSelectedOrderIds([]);
  };

  // Convert Single Sample Order to Real Live Order
  const requestConvertToLive = (order: SampleBillingOrder) => {
    setActionConfirmModal({
      isOpen: true,
      type: 'convert_single',
      title: `Confirm to Live Order #${order.order_number}?`,
      subtitle: `Are you sure you want to convert Sample Bill #${order.order_number} into a REAL live database order? An auto-incrementing order ID (order-000X) will be assigned and saved to the official orders ledger.`,
      targetOrder: order,
      confirmButtonText: 'Yes, Confirm to Live',
      confirmButtonColor: 'emerald',
      onConfirm: async () => {
        setActionConfirmModal(null);
        await executeConvertOrderToLive(order);
      }
    });
  };

  const executeConvertOrderToLive = async (sample: SampleBillingOrder) => {
    try {
      const liveIdObj = generateOriginalOrderId(liveOrders);
      const nowIso = new Date().toISOString();

      const liveOrder: Order = {
        id: liveIdObj.id,
        order_number: liveIdObj.order_number,
        source: sample.source || 'POS',
        customer_id: sample.customer_id,
        customer_name_snapshot: sample.customer_name_snapshot,
        customer_phone_snapshot: sample.customer_phone_snapshot,
        status: 'CONFIRMED',
        subtotal: sample.subtotal,
        discount: sample.discount,
        delivery_fee: sample.delivery_fee,
        tax_amount: sample.tax_amount,
        total: sample.total,
        payment_method: sample.payment_method,
        payment_status: sample.payment_status,
        notes: `Converted from Sample Bill #${sample.order_number}. ${sample.notes || ''}`,
        created_at: nowIso,
        updated_at: nowIso,
        items: sample.items
      };

      const updatedSample = sampleOrders.map((s) =>
        s.id === sample.id
          ? {
              ...s,
              converted_to_live: true,
              converted_at: nowIso,
              converted_order_id: liveIdObj.order_number,
              updated_at: nowIso
            }
          : s
      );

      const updatedLive = [liveOrder, ...liveOrders];

      await Promise.all([
        setJSONStore('sample_billing_orders', updatedSample),
        setJSONStore('orders', updatedLive)
      ]);

      setSampleOrders(updatedSample);
      setExistingLiveOrders(updatedLive);

      addNotification({
        title: 'Sample Bill Converted to Live',
        message: `Sample Bill #${sample.order_number} converted into Live Order #${liveIdObj.order_number} (₹${sample.total.toFixed(2)}).`,
        type: 'success',
        sourceModule: 'Sample Billing'
      });

      toast.success(`Converted to Real Live Order #${liveIdObj.order_number}!`);
    } catch (err) {
      console.error(err);
      toast.error('Failed to convert sample order to live.');
    }
  };

  // Bulk Convert Selected Sample Orders to Live
  const requestBulkConvertToLive = () => {
    const count = selectedOrderIds.length;
    if (count === 0) return;

    setActionConfirmModal({
      isOpen: true,
      type: 'convert_bulk',
      title: `Bulk Confirm ${count} Orders to Live?`,
      subtitle: `Are you sure you want to convert ${count} selected sample bills into REAL live orders? Each will receive a unique sequential order ID (order-000X) and be added to the live catalog ledger.`,
      confirmButtonText: `Yes, Convert All ${count} Orders`,
      confirmButtonColor: 'emerald',
      onConfirm: async () => {
        setActionConfirmModal(null);
        await executeBulkConvertToLive();
      }
    });
  };

  const executeBulkConvertToLive = async () => {
    try {
      const selectedSet = new Set(selectedOrderIds);
      let currentLiveList = [...liveOrders];
      const nowIso = new Date().toISOString();

      const updatedSample = sampleOrders.map((sample) => {
        if (selectedSet.has(sample.id) && !sample.converted_to_live) {
          const liveIdObj = generateOriginalOrderId(currentLiveList);
          const liveOrder: Order = {
            id: liveIdObj.id,
            order_number: liveIdObj.order_number,
            source: sample.source || 'POS',
            customer_name_snapshot: sample.customer_name_snapshot,
            customer_phone_snapshot: sample.customer_phone_snapshot,
            status: 'CONFIRMED',
            subtotal: sample.subtotal,
            discount: sample.discount,
            delivery_fee: sample.delivery_fee,
            tax_amount: sample.tax_amount,
            total: sample.total,
            payment_method: sample.payment_method,
            payment_status: sample.payment_status,
            notes: `Converted in bulk from Sample #${sample.order_number}.`,
            created_at: nowIso,
            updated_at: nowIso,
            items: sample.items
          };
          currentLiveList = [liveOrder, ...currentLiveList];

          return {
            ...sample,
            converted_to_live: true,
            converted_at: nowIso,
            converted_order_id: liveIdObj.order_number,
            updated_at: nowIso
          };
        }
        return sample;
      });

      await Promise.all([
        setJSONStore('sample_billing_orders', updatedSample),
        setJSONStore('orders', currentLiveList)
      ]);

      setSampleOrders(updatedSample);
      setExistingLiveOrders(currentLiveList);
      clearSelection();
      toast.success(`Successfully converted ${selectedOrderIds.length} sample orders to live!`);
    } catch (err) {
      console.error(err);
      toast.error('Bulk live conversion failed.');
    }
  };

  // Delete Single Order
  const requestDeleteSingleOrder = (order: SampleBillingOrder) => {
    setActionConfirmModal({
      isOpen: true,
      type: 'delete_single',
      title: `Delete Sample Order #${order.order_number}?`,
      subtitle: `Are you sure you want to permanently delete Sample Bill #${order.order_number} (${order.customer_name_snapshot} - ₹${order.total.toFixed(2)})? This action cannot be undone.`,
      targetOrder: order,
      confirmButtonText: 'Yes, Delete Order',
      confirmButtonColor: 'rose',
      onConfirm: async () => {
        setActionConfirmModal(null);
        const updated = sampleOrders.filter((o) => o.id !== order.id);
        setSampleOrders(updated);
        await setJSONStore('sample_billing_orders', updated);
        toast.success(`Sample Bill #${order.order_number} deleted.`);
      }
    });
  };

  // Bulk Delete Selected
  const requestBulkDelete = () => {
    const count = selectedOrderIds.length;
    if (count === 0) return;

    setActionConfirmModal({
      isOpen: true,
      type: 'delete_bulk',
      title: `Delete ${count} Selected Sample Bills?`,
      subtitle: `Are you sure you want to delete ${count} sample billing orders from the table? This test data will be permanently removed.`,
      confirmButtonText: `Yes, Delete ${count} Orders`,
      confirmButtonColor: 'rose',
      onConfirm: async () => {
        setActionConfirmModal(null);
        const selectedSet = new Set(selectedOrderIds);
        const updated = sampleOrders.filter((o) => !selectedSet.has(o.id));
        setSampleOrders(updated);
        await setJSONStore('sample_billing_orders', updated);
        clearSelection();
        toast.success(`Deleted ${selectedSet.size} sample orders.`);
      }
    });
  };

  // Helper to open create modal and seed with default item if empty
  const handleOpenCreateModal = () => {
    if (billItems.length === 0 && products.length > 0) {
      const defaultProd = products.find((p) => p.id === selectedProductId) || products[0];
      setBillItems([
        {
          id: `item-${Date.now()}`,
          product: defaultProd,
          quantity: 1,
          item_discount_percent: 0
        }
      ]);
    }
    setShowCreateModal(true);
  };

  // Add Item to Staged Bill
  const handleAddBillItem = () => {
    const prod = products.find((p) => p.id === selectedProductId);
    if (!prod) {
      toast.error('Please select a valid product');
      return;
    }
    const qty = Math.max(1, selectedProductQty);
    const existingIndex = billItems.findIndex((item) => item.product.id === prod.id);
    if (existingIndex >= 0) {
      setBillItems((prev) =>
        prev.map((item, idx) =>
          idx === existingIndex
            ? { ...item, quantity: item.quantity + qty }
            : item
        )
      );
      toast.success(`Updated quantity for ${prod.name}`);
    } else {
      setBillItems((prev) => [
        ...prev,
        {
          id: `item-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
          product: prod,
          quantity: qty,
          item_discount_percent: selectedProductDiscount || 0
        }
      ]);
      toast.success(`Added ${prod.name} to bill`);
    }
    setSelectedProductQty(1);
    setSelectedProductDiscount(0);
  };

  // Update item quantity in bill
  const handleUpdateItemQty = (id: string, newQty: number) => {
    if (newQty <= 0) {
      handleRemoveBillItem(id);
      return;
    }
    setBillItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, quantity: newQty } : item))
    );
  };

  // Remove item from bill
  const handleRemoveBillItem = (id: string) => {
    setBillItems((prev) => prev.filter((item) => item.id !== id));
  };

  // Multi-Product Live Financial Calculations
  const multiBillCalculations = useMemo(() => {
    let totalMRP = 0;
    let itemsSubtotal = 0;

    billItems.forEach((item) => {
      const p = item.product;
      const mrp = p.mrp || p.selling_price || 0;
      const basePrice = p.offer_price || p.selling_price || 0;
      const discPercent = item.item_discount_percent || 0;
      const unitPrice = discPercent > 0 ? basePrice * (1 - discPercent / 100) : basePrice;

      totalMRP += mrp * item.quantity;
      itemsSubtotal += unitPrice * item.quantity;
    });

    const mrpSavings = Math.max(0, totalMRP - itemsSubtotal);

    let extraDiscountAmount = 0;
    if (newOrderForm.extra_discount_mode === 'PERCENT') {
      extraDiscountAmount = itemsSubtotal * ((newOrderForm.extra_discount_value || 0) / 100);
    } else {
      extraDiscountAmount = Math.min(itemsSubtotal, newOrderForm.extra_discount_value || 0);
    }

    const taxableAmount = Math.max(0, itemsSubtotal - extraDiscountAmount);
    const taxAmount = taxableAmount * ((newOrderForm.gst_percent || 0) / 100);
    const grandTotal = Math.max(0, taxableAmount + taxAmount);

    return { totalMRP, itemsSubtotal, mrpSavings, extraDiscountAmount, taxAmount, grandTotal };
  }, [billItems, newOrderForm.extra_discount_mode, newOrderForm.extra_discount_value, newOrderForm.gst_percent]);

  // Create Sample Order with Multiple Products & Full Pricing Breakdown
  const handleCreateQuickSample = async (e: React.FormEvent) => {
    e.preventDefault();
    if (billItems.length === 0) {
      toast.error('Please add at least one product to the sample bill');
      return;
    }

    const assignedSampleId = generateSampleOrderId(sampleOrders);
    const nowIso = new Date().toISOString();
    const { totalMRP, itemsSubtotal, mrpSavings, extraDiscountAmount, taxAmount, grandTotal } = multiBillCalculations;

    const orderItems: OrderItem[] = billItems.map((item) => {
      const p = item.product;
      const mrp = p.mrp || p.selling_price || 0;
      const basePrice = p.offer_price || p.selling_price || 0;
      const discPercent = item.item_discount_percent || 0;
      const unitPrice = discPercent > 0 ? basePrice * (1 - discPercent / 100) : basePrice;

      return {
        id: `sitem-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        order_id: assignedSampleId,
        product_id: p.id,
        product_name_snapshot: p.name,
        tamil_name_snapshot: p.tamil_name,
        pack_size_snapshot: p.pack_size,
        sku_snapshot: p.sku,
        quantity: item.quantity,
        unit_price_snapshot: unitPrice,
        mrp_snapshot: mrp,
        discount: Math.max(0, (mrp - unitPrice) * item.quantity),
        item_discount_percent: discPercent,
        total: unitPrice * item.quantity,
        created_at: nowIso
      };
    });

    const created: SampleBillingOrder = {
      id: assignedSampleId,
      order_number: assignedSampleId,
      sample_code: assignedSampleId,
      is_sample: true,
      source: 'POS',
      customer_name_snapshot: newOrderForm.customer_name || 'Walk-in Trial Customer',
      customer_phone_snapshot: newOrderForm.customer_phone || '9876543210',
      status: 'DELIVERED',
      subtotal: itemsSubtotal,
      discount: extraDiscountAmount,
      delivery_fee: 0,
      tax_amount: taxAmount,
      total: grandTotal,
      total_mrp: totalMRP,
      mrp_savings: mrpSavings,
      extra_discount_mode: newOrderForm.extra_discount_mode,
      extra_discount_value: newOrderForm.extra_discount_value,
      extra_discount_amount: extraDiscountAmount,
      gst_percent: newOrderForm.gst_percent,
      payment_method: newOrderForm.payment_method,
      payment_status: 'PAID',
      notes: newOrderForm.notes,
      show_watermark: showWatermark,
      converted_to_live: false,
      created_at: nowIso,
      updated_at: nowIso,
      items: orderItems
    };

    const updated = [created, ...sampleOrders];
    setSampleOrders(updated);
    await setJSONStore('sample_billing_orders', updated);
    setShowCreateModal(false);
    setBillItems([]);
    toast.success(`Sample Bill #${created.order_number} created with ${orderItems.length} product(s) (₹${grandTotal.toFixed(2)})!`);
  };

  // Update Sample Order
  const handleUpdateSampleOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingOrder) return;
    const target = { ...editingOrder, updated_at: new Date().toISOString() };
    const updated = sampleOrders.map((s) => (s.id === target.id ? target : s));
    setSampleOrders(updated);
    await setJSONStore('sample_billing_orders', updated);
    setEditingOrder(null);
    toast.success(`Updated Sample Bill #${target.order_number}`);
  };

  // Export Sample Orders
  const handleExportSampleOrders = (format: ExportFormat) => {
    const listToExport =
      selectedOrderIds.length > 0
        ? sampleOrders.filter((o) => selectedOrderIds.includes(o.id))
        : filteredAndSortedOrders;

    if (listToExport.length === 0) {
      toast.error('No sample orders to export.');
      return;
    }

    if (format === 'CSV' || format === 'EXCEL') {
      const headers = [
        'Sample ID',
        'Date',
        'Customer Name',
        'Phone',
        'Items Count',
        'Total MRP',
        'MRP Savings',
        'Extra Discount',
        'Net Total',
        'Payment Method',
        'Status',
        'Converted to Live',
        'Converted Order ID'
      ];
      const rows = listToExport.map((o) => [
        o.order_number,
        new Date(o.created_at).toLocaleString(),
        `"${o.customer_name_snapshot || ''}"`,
        o.customer_phone_snapshot || '',
        o.items?.length || 0,
        o.total_mrp || o.total,
        o.mrp_savings || 0,
        o.extra_discount_amount || o.discount || 0,
        o.total,
        o.payment_method,
        o.status,
        o.converted_to_live ? 'YES' : 'NO',
        o.converted_order_id || 'N/A'
      ]);

      const csvContent =
        'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
      const encodedUri = encodeURI(csvContent);
      const link = document.createElement('a');
      link.setAttribute('href', encodedUri);
      link.setAttribute('download', `MR_VIVASAYI_Mart_Sample_Billing_Orders_${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast.success(`Exported ${listToExport.length} sample orders to ${format}`);
    } else if (format === 'PDF' || format === 'PRINT') {
      window.print();
    }
  };

  // 3D Status Badges
  const get3DStatusBadge = (order: SampleBillingOrder) => {
    if (order.converted_to_live) {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-[10px] font-black uppercase tracking-wider bg-gradient-to-r from-emerald-500 to-teal-600 text-white shadow-xs border border-emerald-400">
          <CheckCircle2 className="w-3 h-3" />
          <span>Live: {order.converted_order_id || 'CONFIRMED'}</span>
        </span>
      );
    }
    if (order.status === 'CANCELLED') {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-[10px] font-black uppercase tracking-wider bg-rose-100 text-rose-800 border border-rose-300">
          <X className="w-3 h-3" />
          <span>Cancelled</span>
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-[10px] font-black uppercase tracking-wider bg-amber-100 text-amber-900 border border-amber-300 shadow-2xs">
        <Sparkles className="w-3 h-3 text-amber-600" />
        <span>Sample Bill</span>
      </span>
    );
  };

  return (
    <div className="relative min-h-screen bg-gray-50 dark:bg-emerald-950/40 p-4 sm:p-6 space-y-6 animate-fadeIn font-sans">
      <RefreshSpinnerModal
        isOpen={isRefreshing}
        moduleName="Sample Invoices & Orders"
        title="Refreshing Sample Ledger..."
        subtitle="Loading latest sample transactions and recalculating metrics..."
        onComplete={() => setIsRefreshing(false)}
      />

      {/* ========================================================================= */}
      {/* 1. BACKGROUND SAMPLE WATERMARK                                              */}
      {/* ========================================================================= */}
      {showWatermark && (
        <div className="pointer-events-none fixed inset-0 z-0 flex items-center justify-center overflow-hidden opacity-[0.05] select-none">
          <div className="transform -rotate-25 text-rose-700 dark:text-rose-400 font-black text-6xl sm:text-8xl md:text-9xl tracking-widest text-center uppercase whitespace-nowrap border-8 border-dashed border-rose-700/60 p-8 rounded-3xl">
            SAMPLE BILLING<br />NOT A REAL INVOICE
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 2. HEADER BAR WITH WATERMARK CONTROLLER & ACTION BUTTONS                   */}
      {/* ========================================================================= */}
      <div className="relative z-10 bg-white dark:bg-emerald-900/80 p-5 rounded-3xl border border-emerald-100 dark:border-emerald-800 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5 flex-wrap">
            <span className="p-2.5 bg-gradient-to-br from-indigo-600 to-purple-700 text-white rounded-2xl shadow-md">
              <FileText className="w-6 h-6" />
            </span>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-xl sm:text-2xl font-black font-serif text-emerald-950 dark:text-white">
                  Sample Invoices & Billing Orders
                </h1>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-indigo-100 dark:bg-indigo-900/70 text-indigo-800 dark:text-indigo-200 border border-indigo-300 dark:border-indigo-700">
                  table: sample_billing_orders
                </span>
              </div>
              <p className="text-xs text-gray-500 dark:text-emerald-300 mt-0.5">
                Full invoice ledger with Total MRP, MRP savings, additional discounts, GST rate tax, and 1-click live conversion.
              </p>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2.5 flex-wrap">
          {/* Watermark Toggle */}
          <button
            type="button"
            onClick={() => setShowWatermark(!showWatermark)}
            className={`px-3 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-xs cursor-pointer border ${
              showWatermark
                ? 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/60 dark:text-rose-300 dark:border-rose-800'
                : 'bg-gray-100 text-gray-600 border-gray-200 dark:bg-emerald-950 dark:text-emerald-300'
            }`}
            title="Toggle diagonal watermark ON / OFF"
          >
            <ShieldAlert className="w-4 h-4" />
            <span>Watermark: {showWatermark ? 'ON (Active)' : 'OFF (Hidden)'}</span>
          </button>

          {/* Export Button */}
          <button
            type="button"
            onClick={() => setShowExportModal(true)}
            className="p-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 dark:bg-emerald-950 dark:text-emerald-200 rounded-xl transition cursor-pointer font-bold shadow-xs"
            title="Export Records (CSV, Excel, PDF, JSON)"
          >
            <Download className="w-4 h-4" />
          </button>

          {/* Refresh Button */}
          <button
            type="button"
            onClick={() => {
              setIsRefreshing(true);
              loadData();
            }}
            className="p-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 dark:bg-emerald-950 dark:text-emerald-200 rounded-xl transition cursor-pointer font-bold shadow-xs"
            title="Refresh Ledger"
          >
            <RefreshCw className="w-4 h-4" />
          </button>

          {/* Open Sample POS Counter Simulator */}
          <Link
            to="/admin/sample-pos"
            className="px-3.5 py-2 rounded-xl text-xs font-bold bg-indigo-50 dark:bg-emerald-950 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 hover:bg-indigo-100 transition flex items-center gap-1.5 shadow-xs"
          >
            <ShoppingCart className="w-4 h-4" />
            <span>Open Sample POS</span>
          </Link>

          {/* Quick Create Bill Modal */}
          <button
            type="button"
            onClick={handleOpenCreateModal}
            className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-md cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>New Sample Bill</span>
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 3. METRIC KPI CARDS (WITH MRP & DISCOUNT METRICS)                          */}
      {/* ========================================================================= */}
      <div className="relative z-10 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
        {/* Total Sample Invoices */}
        <div className="bg-white dark:bg-emerald-900/80 p-4 rounded-2xl border border-emerald-100 dark:border-emerald-800 shadow-sm flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-100 text-indigo-700 dark:bg-indigo-950/80 dark:text-indigo-300 flex items-center justify-center shrink-0">
            <FileText className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[10px] uppercase font-bold text-gray-400">Total Sample Bills</div>
            <div className="text-xl font-black text-gray-900 dark:text-white font-mono">{stats.totalCount}</div>
          </div>
        </div>

        {/* Total MRP Value */}
        <div className="bg-white dark:bg-emerald-900/80 p-4 rounded-2xl border border-emerald-100 dark:border-emerald-800 shadow-sm flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gray-100 text-gray-700 dark:bg-emerald-950 dark:text-emerald-300 flex items-center justify-center shrink-0">
            <DollarSign className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[10px] uppercase font-bold text-gray-400">Total MRP Value</div>
            <div className="text-xl font-black text-gray-600 dark:text-gray-300 font-mono line-through">
              {formatPrice(stats.totalMRP)}
            </div>
          </div>
        </div>

        {/* Total Discounts Given */}
        <div className="bg-white dark:bg-emerald-900/80 p-4 rounded-2xl border border-emerald-100 dark:border-emerald-800 shadow-sm flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 flex items-center justify-center shrink-0">
            <Tag className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[10px] uppercase font-bold text-emerald-700 dark:text-emerald-400">Discounts Given</div>
            <div className="text-xl font-black text-emerald-700 dark:text-emerald-300 font-mono">
              -{formatPrice(stats.totalDiscounts)}
            </div>
          </div>
        </div>

        {/* Net Sample Revenue */}
        <div className="bg-white dark:bg-emerald-900/80 p-4 rounded-2xl border border-emerald-100 dark:border-emerald-800 shadow-sm flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-800 dark:bg-amber-950/80 dark:text-amber-300 flex items-center justify-center shrink-0">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[10px] uppercase font-bold text-gray-400">Net Sample Total</div>
            <div className="text-xl font-black text-amber-900 dark:text-amber-400 font-mono">
              {formatPrice(stats.totalAmount)}
            </div>
          </div>
        </div>

        {/* Converted to Live Orders */}
        <div className="bg-white dark:bg-emerald-900/80 p-4 rounded-2xl border border-emerald-100 dark:border-emerald-800 shadow-sm flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-teal-100 text-teal-800 dark:bg-teal-950/80 dark:text-teal-300 flex items-center justify-center shrink-0">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[10px] uppercase font-bold text-gray-400">Converted to Live</div>
            <div className="text-xl font-black text-teal-800 dark:text-teal-300 font-mono">{stats.convertedCount}</div>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 4. SEARCH & FILTER CONTROLS                                                */}
      {/* ========================================================================= */}
      <div className="relative z-10 bg-white dark:bg-emerald-900/80 p-4 rounded-3xl border border-emerald-100 dark:border-emerald-800 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs">
        {/* Search Input */}
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by Bill ID (id-0001), Customer Name, Phone, or Product..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setCurrentPage(1);
            }}
            className="w-full pl-9 pr-4 py-2 bg-gray-50 dark:bg-emerald-950 border border-gray-200 dark:border-emerald-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 font-sans"
          />
        </div>

        {/* Filter Controls */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Status Tabs */}
          <div className="flex rounded-xl bg-gray-100 dark:bg-emerald-950 p-1 border border-gray-200 dark:border-emerald-800">
            <button
              type="button"
              onClick={() => {
                setStatusFilter('ALL');
                setCurrentPage(1);
              }}
              className={`px-3 py-1 rounded-lg font-bold transition ${
                statusFilter === 'ALL'
                  ? 'bg-white dark:bg-emerald-800 text-gray-900 dark:text-white shadow-xs'
                  : 'text-gray-500 hover:text-gray-900'
              }`}
            >
              All
            </button>
            <button
              type="button"
              onClick={() => {
                setStatusFilter('ACTIVE_SAMPLE');
                setCurrentPage(1);
              }}
              className={`px-3 py-1 rounded-lg font-bold transition ${
                statusFilter === 'ACTIVE_SAMPLE'
                  ? 'bg-white dark:bg-emerald-800 text-indigo-700 dark:text-indigo-300 shadow-xs'
                  : 'text-gray-500 hover:text-gray-900'
              }`}
            >
              Active Sample
            </button>
            <button
              type="button"
              onClick={() => {
                setStatusFilter('CONVERTED');
                setCurrentPage(1);
              }}
              className={`px-3 py-1 rounded-lg font-bold transition ${
                statusFilter === 'CONVERTED'
                  ? 'bg-white dark:bg-emerald-800 text-emerald-700 dark:text-emerald-300 shadow-xs'
                  : 'text-gray-500 hover:text-gray-900'
              }`}
            >
              Converted
            </button>
          </div>

          {/* Page Size Selector */}
          <select
            value={pageSize}
            onChange={(e) => {
              setPageSize(Number(e.target.value));
              setCurrentPage(1);
            }}
            className="px-2.5 py-1.5 bg-gray-50 dark:bg-emerald-950 border border-gray-200 dark:border-emerald-700 rounded-xl font-bold text-gray-700 dark:text-emerald-200"
          >
            <option value={10}>10 per page</option>
            <option value={25}>25 per page</option>
            <option value={50}>50 per page</option>
            <option value={100}>100 per page</option>
          </select>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 5. SAMPLE ORDERS TABLE (WITH MRP, DISCOUNT, AND RECENT ORDERS TOP FIRST)   */}
      {/* ========================================================================= */}
      <div className="relative z-10 bg-white dark:bg-emerald-900/80 rounded-3xl border border-emerald-100 dark:border-emerald-800 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-gray-50/80 dark:bg-emerald-950/80 text-gray-500 dark:text-emerald-400 font-bold uppercase tracking-wider text-[10px] border-b border-gray-100 dark:border-emerald-800">
              <tr>
                <th className="p-3.5 pl-4 w-10">
                  <input
                    type="checkbox"
                    checked={isAllPageSelected}
                    onChange={toggleSelectAllPage}
                    className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                  />
                </th>
                <th className="p-3.5">Bill ID</th>
                <th className="p-3.5">Date & Time</th>
                <th className="p-3.5">Customer</th>
                <th className="p-3.5">Items</th>
                <th className="p-3.5 text-right">Total MRP</th>
                <th className="p-3.5 text-right">Discounts</th>
                <th className="p-3.5 text-right">Net Amount</th>
                <th className="p-3.5">Payment</th>
                <th className="p-3.5">Status</th>
                <th className="p-3.5 pr-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-emerald-800/60">
              {paginatedOrders.length === 0 ? (
                <tr>
                  <td colSpan={11} className="text-center py-14 text-gray-400 dark:text-emerald-300">
                    <FileText className="w-10 h-10 mx-auto text-gray-300 mb-2 stroke-1" />
                    <p className="font-bold text-sm">No sample billing orders found</p>
                    <p className="text-xs text-gray-400 mt-1">
                      Click "New Sample Bill" or "Open Sample POS" to simulate a test transaction.
                    </p>
                  </td>
                </tr>
              ) : (
                paginatedOrders.map((order) => {
                  const isSelected = selectedOrderIds.includes(order.id);
                  const mrpVal = order.total_mrp || (order.total + (order.discount || 0));
                  const discountVal = (order.mrp_savings || 0) + (order.extra_discount_amount || order.discount || 0);
                  const discountPct = mrpVal > 0 ? Math.round((discountVal / mrpVal) * 100) : 0;

                  return (
                    <tr
                      key={order.id}
                      className={`hover:bg-indigo-50/40 dark:hover:bg-emerald-950/60 transition-colors ${
                        isSelected ? 'bg-indigo-50/60 dark:bg-emerald-950/80' : ''
                      }`}
                    >
                      <td className="p-3.5 pl-4">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleSelectRow(order.id)}
                          className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                        />
                      </td>

                      <td className="p-3.5">
                        <span className="font-mono font-black text-xs text-indigo-900 dark:text-indigo-200 bg-indigo-50 dark:bg-indigo-950 px-2 py-0.5 rounded-lg border border-indigo-200 dark:border-indigo-800">
                          #{order.order_number}
                        </span>
                      </td>

                      <td className="p-3.5 text-gray-600 dark:text-emerald-300 font-mono text-[11px]">
                        <div>{new Date(order.created_at).toLocaleDateString()}</div>
                        <div className="text-[10px] text-gray-400">
                          {new Date(order.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </td>

                      <td className="p-3.5">
                        <div className="font-bold text-gray-900 dark:text-white">
                          {order.customer_name_snapshot || 'Walk-in Trial Customer'}
                        </div>
                        <div className="text-[10px] text-gray-400 font-mono">{order.customer_phone_snapshot}</div>
                      </td>

                      <td className="p-3.5">
                        <div className="font-bold text-gray-800 dark:text-emerald-200">
                          {order.items?.length || 0} Item(s)
                        </div>
                        <div className="text-[10px] text-gray-500 dark:text-emerald-400/80 truncate max-w-xs">
                          {order.items?.map((i) => `${i.product_name_snapshot} (${i.quantity})`).join(', ') || 'N/A'}
                        </div>
                      </td>

                      {/* Total MRP Column */}
                      <td className="p-3.5 text-right font-mono text-gray-500 line-through">
                        {formatPrice(mrpVal)}
                      </td>

                      {/* Discounts Column */}
                      <td className="p-3.5 text-right">
                        {discountVal > 0 ? (
                          <div className="inline-flex flex-col items-end">
                            <span className="font-mono font-bold text-emerald-700 dark:text-emerald-400">
                              -{formatPrice(discountVal)}
                            </span>
                            <span className="text-[9px] font-black px-1.5 py-0.2 rounded bg-emerald-100 text-emerald-800">
                              {discountPct}% OFF
                            </span>
                          </div>
                        ) : (
                          <span className="text-gray-400 font-mono text-[10px]">₹0</span>
                        )}
                      </td>

                      {/* Net Amount Column */}
                      <td className="p-3.5 text-right font-black text-sm text-gray-900 dark:text-amber-400 font-mono">
                        {formatPrice(order.total)}
                      </td>

                      <td className="p-3.5">
                        <span className="px-2 py-0.5 rounded-md font-bold text-[10px] bg-gray-100 dark:bg-emerald-950 text-gray-700 dark:text-emerald-200 border border-gray-200 dark:border-emerald-800">
                          {order.payment_method}
                        </span>
                      </td>

                      <td className="p-3.5">{get3DStatusBadge(order)}</td>

                      <td className="p-3.5 pr-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* View Invoice */}
                          <button
                            type="button"
                            onClick={() => setViewingOrder(order)}
                            className="p-1.5 hover:bg-gray-100 dark:hover:bg-emerald-800 text-gray-600 dark:text-emerald-200 hover:text-indigo-600 rounded-lg transition cursor-pointer"
                            title="View Itemized Invoice with Watermark"
                          >
                            <Eye className="w-4 h-4" />
                          </button>

                          {/* Edit Sample Order */}
                          <button
                            type="button"
                            onClick={() => setEditingOrder(order)}
                            className="p-1.5 hover:bg-gray-100 dark:hover:bg-emerald-800 text-gray-600 dark:text-emerald-200 hover:text-amber-600 rounded-lg transition cursor-pointer"
                            title="Edit Sample Bill"
                          >
                            <Edit className="w-4 h-4" />
                          </button>

                          {/* Convert to Live Order */}
                          {!order.converted_to_live && (
                            <button
                              type="button"
                              onClick={() => requestConvertToLive(order)}
                              className="p-1.5 hover:bg-emerald-50 dark:hover:bg-emerald-950 text-emerald-600 rounded-lg transition cursor-pointer"
                              title="Confirm to Real Live Order"
                            >
                              <ArrowUpRight className="w-4 h-4" />
                            </button>
                          )}

                          {/* Delete Order */}
                          <button
                            type="button"
                            onClick={() => requestDeleteSingleOrder(order)}
                            className="p-1.5 hover:bg-rose-50 text-rose-500 hover:text-rose-700 rounded-lg transition cursor-pointer"
                            title="Delete Sample Bill"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        <div className="p-4 border-t border-gray-100 dark:border-emerald-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-gray-500 dark:text-emerald-400">
          <div>
            Showing{' '}
            <span className="font-bold text-gray-900 dark:text-white">
              {filteredAndSortedOrders.length === 0 ? 0 : (currentPage - 1) * pageSize + 1}
            </span>{' '}
            to{' '}
            <span className="font-bold text-gray-900 dark:text-white">
              {Math.min(currentPage * pageSize, filteredAndSortedOrders.length)}
            </span>{' '}
            of <span className="font-bold text-gray-900 dark:text-white">{filteredAndSortedOrders.length}</span> sample orders
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              disabled={currentPage <= 1}
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              className="p-1.5 rounded-lg border border-gray-200 dark:border-emerald-700 disabled:opacity-40 hover:bg-gray-100 dark:hover:bg-emerald-950 transition cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="px-2 font-bold text-gray-800 dark:text-emerald-200">
              Page {currentPage} of {totalPages}
            </span>
            <button
              type="button"
              disabled={currentPage >= totalPages}
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              className="p-1.5 rounded-lg border border-gray-200 dark:border-emerald-700 disabled:opacity-40 hover:bg-gray-100 dark:hover:bg-emerald-950 transition cursor-pointer"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* FLOATING BULK ACTION BAR                                                  */}
      {/* ========================================================================= */}
      {selectedOrderIds.length > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 bg-gray-900 text-white px-5 py-3 rounded-2xl shadow-2xl flex items-center gap-3 animate-fadeIn border border-gray-700 text-xs">
          <span className="font-extrabold text-amber-400">{selectedOrderIds.length} Selected</span>

          <button
            type="button"
            onClick={requestBulkConvertToLive}
            className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 transition cursor-pointer shadow-xs"
          >
            <ArrowUpRight className="w-3.5 h-3.5" />
            <span>Confirm to Live</span>
          </button>

          <button
            type="button"
            onClick={() => setShowExportModal(true)}
            className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 transition cursor-pointer shadow-xs"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export</span>
          </button>

          <button
            type="button"
            onClick={requestBulkDelete}
            className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 transition cursor-pointer shadow-xs"
          >
            <Trash2 className="w-3.5 h-3.5" /> Delete
          </button>

          <button
            type="button"
            onClick={clearSelection}
            className="p-1.5 hover:bg-gray-800 text-gray-400 hover:text-white rounded-lg transition cursor-pointer ml-1"
            title="Deselect All"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 1: VIEW ITEMIZED INVOICE WITH WATERMARK & FULL FINANCIAL BREAKDOWN  */}
      {/* ========================================================================= */}
      {viewingOrder && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 space-y-4 shadow-2xl relative overflow-hidden border border-gray-200 max-h-[92vh] overflow-y-auto">
            {/* Watermark Overlay in Invoice View Modal */}
            {showWatermark && (
              <div className="absolute inset-0 pointer-events-none flex items-center justify-center select-none z-10 opacity-15">
                <div className="transform -rotate-45 text-rose-700 font-black text-4xl sm:text-5xl tracking-widest text-center uppercase border-4 border-dashed border-rose-700 p-4 rounded-3xl">
                  SAMPLE BILLING<br />NOT A REAL INVOICE
                </div>
              </div>
            )}

            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <div className="flex items-center gap-2.5">
                <span className="p-2.5 bg-indigo-100 text-indigo-700 rounded-2xl">
                  <FileText className="w-5 h-5" />
                </span>
                <div>
                  <h3 className="font-black text-lg text-gray-900">Sample Invoice & Bill</h3>
                  <div className="text-[11px] font-mono text-gray-500">Bill Ref: #{viewingOrder.order_number}</div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setViewingOrder(null)}
                className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-400 hover:text-gray-700 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Store & Bill Details */}
            <div className="p-4 bg-gray-50 rounded-2xl border border-gray-200 text-xs space-y-3 font-mono">
              <div className="text-center space-y-0.5 border-b border-dashed border-gray-300 pb-2">
                <div className="font-black text-sm text-emerald-950 font-serif">MR. VIVASAYI Mart</div>
                <div className="text-[10px] text-gray-500">Traditional & Natural Farm Produce</div>
                <div className="text-[10px] text-gray-500">{getFormattedStoreAddress()} | Ph: {getFormattedStorePhone()}</div>
                <div className="text-[10px] font-bold text-indigo-700">SAMPLE INVOICE (DEMO / VERIFICATION)</div>
              </div>

              <div className="flex justify-between border-b border-gray-200 pb-2">
                <div>
                  <div className="font-bold text-gray-900">{viewingOrder.customer_name_snapshot}</div>
                  <div className="text-[10px] text-gray-500">{viewingOrder.customer_phone_snapshot}</div>
                </div>
                <div className="text-right">
                  <div>{new Date(viewingOrder.created_at).toLocaleDateString()}</div>
                  <div className="text-[10px] text-gray-500">{viewingOrder.payment_method}</div>
                </div>
              </div>

              {/* Items List */}
              <div className="space-y-1.5 py-1">
                <div className="grid grid-cols-12 text-[10px] font-bold text-gray-500 border-b border-gray-200 pb-1">
                  <div className="col-span-6">Item</div>
                  <div className="col-span-2 text-center">Qty</div>
                  <div className="col-span-4 text-right">Total</div>
                </div>

                {viewingOrder.items?.map((item, idx) => (
                  <div key={idx} className="grid grid-cols-12 items-center text-[11px]">
                    <div className="col-span-6 truncate pr-1">
                      <div className="font-bold text-gray-800 truncate">{item.product_name_snapshot}</div>
                      <div className="text-[9px] text-gray-400">
                        {item.mrp_snapshot && item.mrp_snapshot > item.unit_price_snapshot && (
                          <span className="line-through mr-1">₹{item.mrp_snapshot}</span>
                        )}
                        ₹{item.unit_price_snapshot}
                      </div>
                    </div>
                    <div className="col-span-2 text-center font-bold">{item.quantity}</div>
                    <div className="col-span-4 text-right font-bold">₹{item.total.toFixed(2)}</div>
                  </div>
                ))}
              </div>

              {/* Detailed Financial Breakdown */}
              <div className="border-t border-gray-300 pt-2 space-y-1 text-xs">
                {viewingOrder.total_mrp ? (
                  <div className="flex justify-between text-gray-500">
                    <span>Total MRP Rate:</span>
                    <span className="line-through font-mono">₹{viewingOrder.total_mrp.toFixed(2)}</span>
                  </div>
                ) : null}

                <div className="flex justify-between text-gray-700">
                  <span>Our Price Subtotal:</span>
                  <span className="font-mono">₹{viewingOrder.subtotal.toFixed(2)}</span>
                </div>

                {viewingOrder.mrp_savings ? (
                  <div className="flex justify-between text-emerald-700 font-bold">
                    <span>MRP Discount Savings:</span>
                    <span className="font-mono">- ₹{viewingOrder.mrp_savings.toFixed(2)}</span>
                  </div>
                ) : null}

                {viewingOrder.extra_discount_amount || viewingOrder.discount ? (
                  <div className="flex justify-between text-amber-700 font-bold">
                    <span>Additional Discount:</span>
                    <span className="font-mono">
                      - ₹{(viewingOrder.extra_discount_amount || viewingOrder.discount || 0).toFixed(2)}
                    </span>
                  </div>
                ) : null}

                {viewingOrder.tax_amount ? (
                  <div className="flex justify-between text-gray-600">
                    <span>GST Tax ({viewingOrder.gst_percent || 0}%):</span>
                    <span className="font-mono">+ ₹{viewingOrder.tax_amount.toFixed(2)}</span>
                  </div>
                ) : null}

                <div className="border-t border-gray-300 pt-1.5 flex justify-between font-black text-sm text-gray-900">
                  <span>NET PAYABLE TOTAL:</span>
                  <span className="font-mono text-base font-black">₹{viewingOrder.total.toFixed(2)}</span>
                </div>
              </div>

              {viewingOrder.converted_to_live && (
                <div className="p-2.5 rounded-xl bg-emerald-100 border border-emerald-300 text-emerald-900 font-bold text-center text-xs">
                  ✓ Converted into Official Live Order #{viewingOrder.converted_order_id}
                </div>
              )}
            </div>

            {/* Modal Actions */}
            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => window.print()}
                className="flex-1 py-2.5 px-4 bg-gray-900 hover:bg-black text-white font-bold text-xs rounded-xl transition flex items-center justify-center gap-1.5 cursor-pointer shadow-sm"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Print Invoice</span>
              </button>

              {!viewingOrder.converted_to_live && (
                <button
                  type="button"
                  onClick={() => {
                    const target = viewingOrder;
                    setViewingOrder(null);
                    requestConvertToLive(target);
                  }}
                  className="flex-1 py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl transition flex items-center justify-center gap-1.5 cursor-pointer shadow-sm"
                >
                  <ArrowUpRight className="w-3.5 h-3.5" />
                  <span>Convert to Live</span>
                </button>
              )}

              <button
                type="button"
                onClick={() => setViewingOrder(null)}
                className="py-2.5 px-4 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold text-xs rounded-xl transition cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 2: ADVANCED MULTI-PRODUCT SAMPLE BILL BUILDER                        */}
      {/* ========================================================================= */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-xs z-50 flex items-center justify-center p-3 sm:p-4 animate-fadeIn">
          <form
            onSubmit={handleCreateQuickSample}
            className="bg-white dark:bg-emerald-950 rounded-3xl max-w-2xl w-full p-5 sm:p-6 space-y-4 shadow-2xl relative border border-gray-200 dark:border-emerald-800 max-h-[94vh] overflow-y-auto"
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-gray-100 dark:border-emerald-800 pb-3">
              <div className="flex items-center gap-2.5">
                <span className="p-2 bg-indigo-100 dark:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 rounded-xl">
                  <Plus className="w-5 h-5" />
                </span>
                <div>
                  <h3 className="font-black text-base sm:text-lg text-gray-900 dark:text-white">
                    Create New Sample Bill
                  </h3>
                  <div className="text-[11px] text-gray-400 dark:text-emerald-300">
                    Multi-product line builder • Live MRP savings & discounts • Auto sequential ID
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="p-1.5 hover:bg-gray-100 dark:hover:bg-emerald-900 rounded-lg text-gray-400 hover:text-gray-700 dark:hover:text-emerald-100 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              {/* Customer & Payment Information */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-gray-700 dark:text-emerald-200 uppercase tracking-wider mb-1">
                    Customer Name
                  </label>
                  <input
                    type="text"
                    required
                    value={newOrderForm.customer_name}
                    onChange={(e) => setNewOrderForm((prev) => ({ ...prev, customer_name: e.target.value }))}
                    className="w-full p-2.5 bg-gray-50 dark:bg-emerald-900/60 border border-gray-200 dark:border-emerald-800 rounded-xl text-xs font-medium focus:outline-none focus:border-indigo-500 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-gray-700 dark:text-emerald-200 uppercase tracking-wider mb-1">
                    Phone Number
                  </label>
                  <input
                    type="text"
                    required
                    value={newOrderForm.customer_phone}
                    onChange={(e) => setNewOrderForm((prev) => ({ ...prev, customer_phone: e.target.value }))}
                    className="w-full p-2.5 bg-gray-50 dark:bg-emerald-900/60 border border-gray-200 dark:border-emerald-800 rounded-xl text-xs font-mono focus:outline-none focus:border-indigo-500 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-gray-700 dark:text-emerald-200 uppercase tracking-wider mb-1">
                    Payment Method
                  </label>
                  <select
                    value={newOrderForm.payment_method}
                    onChange={(e) => setNewOrderForm((prev) => ({ ...prev, payment_method: e.target.value as any }))}
                    className="w-full p-2.5 bg-gray-50 dark:bg-emerald-900/60 border border-gray-200 dark:border-emerald-800 rounded-xl text-xs font-bold dark:text-white"
                  >
                    <option value="CASH">Cash</option>
                    <option value="UPI">UPI</option>
                    <option value="CARD">Card</option>
                    <option value="NET_BANKING">Net Banking</option>
                  </select>
                </div>
              </div>

              {/* Multi-Product Builder: Add Product Line */}
              <div className="p-3.5 bg-indigo-50/60 dark:bg-indigo-950/40 rounded-2xl border border-indigo-100 dark:border-indigo-900/60 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="font-extrabold text-xs text-indigo-950 dark:text-indigo-200 flex items-center gap-1.5">
                    <ShoppingBag className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                    Add Product to Bill
                  </span>
                  <span className="text-[10px] text-indigo-600 dark:text-indigo-400 font-medium">
                    Select multiple products to include in this bill
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5 items-end">
                  {/* Product Dropdown */}
                  <div className="sm:col-span-6">
                    <label className="block text-[10px] font-bold text-gray-600 dark:text-indigo-200 uppercase mb-1">
                      Select Item
                    </label>
                    <select
                      value={selectedProductId}
                      onChange={(e) => setSelectedProductId(e.target.value)}
                      className="w-full p-2 bg-white dark:bg-emerald-900 border border-indigo-200 dark:border-indigo-800 rounded-xl text-xs font-medium text-gray-900 dark:text-white"
                    >
                      {products.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name} ({p.pack_size}) - ₹{p.offer_price || p.selling_price} | MRP: ₹{p.mrp || p.selling_price}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Quantity Stepper */}
                  <div className="sm:col-span-3">
                    <label className="block text-[10px] font-bold text-gray-600 dark:text-indigo-200 uppercase mb-1">
                      Quantity
                    </label>
                    <div className="flex items-center border border-indigo-200 dark:border-indigo-800 rounded-xl bg-white dark:bg-emerald-900 overflow-hidden">
                      <button
                        type="button"
                        onClick={() => setSelectedProductQty((q) => Math.max(1, q - 1))}
                        className="px-2.5 py-1.5 hover:bg-indigo-100 dark:hover:bg-indigo-800 text-gray-600 dark:text-gray-200 font-bold transition"
                      >
                        <Minus className="w-3 h-3" />
                      </button>
                      <input
                        type="number"
                        min={1}
                        value={selectedProductQty}
                        onChange={(e) => setSelectedProductQty(Math.max(1, parseInt(e.target.value) || 1))}
                        className="w-full text-center py-1 font-bold text-xs bg-transparent dark:text-white focus:outline-none"
                      />
                      <button
                        type="button"
                        onClick={() => setSelectedProductQty((q) => q + 1)}
                        className="px-2.5 py-1.5 hover:bg-indigo-100 dark:hover:bg-indigo-800 text-gray-600 dark:text-gray-200 font-bold transition"
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                    </div>
                  </div>

                  {/* Add Button */}
                  <div className="sm:col-span-3">
                    <button
                      type="button"
                      onClick={handleAddBillItem}
                      className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-xs transition flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Add to Bill</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Bill Items List / Table */}
              <div className="border border-gray-200 dark:border-emerald-800 rounded-2xl overflow-hidden">
                <div className="bg-gray-50 dark:bg-emerald-900/70 px-3.5 py-2 border-b border-gray-200 dark:border-emerald-800 flex items-center justify-between">
                  <span className="font-extrabold text-xs text-gray-700 dark:text-emerald-200">
                    Items in Bill ({billItems.length})
                  </span>
                  <span className="text-[10px] text-gray-500 dark:text-emerald-300">
                    Adjust quantity with + / - or click delete
                  </span>
                </div>

                {billItems.length === 0 ? (
                  <div className="p-6 text-center text-gray-400 dark:text-emerald-400 space-y-1">
                    <ShoppingBag className="w-8 h-8 mx-auto opacity-40 text-gray-400" />
                    <div className="font-bold text-xs">No items added to this bill yet</div>
                    <div className="text-[11px]">Select a product above and click '+ Add to Bill'</div>
                  </div>
                ) : (
                  <div className="max-h-52 overflow-y-auto divide-y divide-gray-100 dark:divide-emerald-800/60">
                    {billItems.map((item) => {
                      const p = item.product;
                      const price = p.offer_price || p.selling_price || 0;
                      const mrp = p.mrp || price;
                      const itemTotal = price * item.quantity;

                      return (
                        <div
                          key={item.id}
                          className="p-3 flex items-center justify-between gap-3 hover:bg-gray-50/50 dark:hover:bg-emerald-900/40 transition"
                        >
                          <div className="min-w-0 flex-1">
                            <div className="font-bold text-gray-900 dark:text-white truncate">
                              {p.name}
                            </div>
                            <div className="flex items-center gap-2 text-[10px] text-gray-500 dark:text-emerald-300 mt-0.5">
                              <span className="px-1.5 py-0.2 bg-gray-100 dark:bg-emerald-800 text-gray-600 dark:text-emerald-200 rounded font-mono">
                                {p.pack_size}
                              </span>
                              <span>Price: {formatPrice(price)}</span>
                              {mrp > price && (
                                <span className="line-through text-gray-400">MRP: {formatPrice(mrp)}</span>
                              )}
                            </div>
                          </div>

                          {/* Stepper in row */}
                          <div className="flex items-center border border-gray-200 dark:border-emerald-700 rounded-lg overflow-hidden bg-white dark:bg-emerald-950">
                            <button
                              type="button"
                              onClick={() => handleUpdateItemQty(item.id, item.quantity - 1)}
                              className="px-2 py-1 hover:bg-gray-100 dark:hover:bg-emerald-800 text-gray-600 dark:text-emerald-200"
                            >
                              <Minus className="w-3 h-3" />
                            </button>
                            <span className="px-2 text-xs font-black font-mono dark:text-white">
                              {item.quantity}
                            </span>
                            <button
                              type="button"
                              onClick={() => handleUpdateItemQty(item.id, item.quantity + 1)}
                              className="px-2 py-1 hover:bg-gray-100 dark:hover:bg-emerald-800 text-gray-600 dark:text-emerald-200"
                            >
                              <Plus className="w-3 h-3" />
                            </button>
                          </div>

                          {/* Line Total */}
                          <div className="text-right min-w-[70px]">
                            <div className="font-black text-xs font-mono text-gray-900 dark:text-white">
                              {formatPrice(itemTotal)}
                            </div>
                          </div>

                          {/* Remove button */}
                          <button
                            type="button"
                            onClick={() => handleRemoveBillItem(item.id)}
                            className="p-1 text-gray-400 hover:text-rose-600 dark:hover:text-rose-400 rounded transition cursor-pointer"
                            title="Remove product"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Bill Discounts & Tax Configuration */}
              <div className="p-3 bg-amber-50/80 dark:bg-amber-950/30 rounded-2xl border border-amber-200 dark:border-amber-800 space-y-2">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <span className="font-bold text-xs text-amber-950 dark:text-amber-200 flex items-center gap-1">
                    <Sparkles className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                    Additional Bill Discount:
                  </span>
                  <div className="flex items-center gap-2">
                    <div className="inline-flex rounded-lg bg-amber-200/70 dark:bg-amber-900/60 p-0.5 border border-amber-300 dark:border-amber-700">
                      <button
                        type="button"
                        onClick={() => setNewOrderForm((prev) => ({ ...prev, extra_discount_mode: 'PERCENT' }))}
                        className={`px-2 py-0.5 text-[10px] font-extrabold rounded-md transition ${
                          newOrderForm.extra_discount_mode === 'PERCENT'
                            ? 'bg-amber-600 text-white shadow-xs'
                            : 'text-amber-900 dark:text-amber-200'
                        }`}
                      >
                        %
                      </button>
                      <button
                        type="button"
                        onClick={() => setNewOrderForm((prev) => ({ ...prev, extra_discount_mode: 'AMOUNT' }))}
                        className={`px-2 py-0.5 text-[10px] font-extrabold rounded-md transition ${
                          newOrderForm.extra_discount_mode === 'AMOUNT'
                            ? 'bg-amber-600 text-white shadow-xs'
                            : 'text-amber-900 dark:text-amber-200'
                        }`}
                      >
                        ₹
                      </button>
                    </div>

                    <input
                      type="number"
                      min={0}
                      value={newOrderForm.extra_discount_value || ''}
                      onChange={(e) =>
                        setNewOrderForm((prev) => ({
                          ...prev,
                          extra_discount_value: Math.max(0, parseFloat(e.target.value) || 0)
                        }))
                      }
                      placeholder="0"
                      className="w-20 px-2 py-1 bg-white dark:bg-emerald-900 border border-amber-300 dark:border-amber-700 rounded-lg text-right font-black text-amber-950 dark:text-white font-mono text-xs"
                    />
                  </div>
                </div>

                {/* GST Rate (%) */}
                <div className="flex justify-between items-center text-[11px] text-gray-700 dark:text-emerald-200 pt-1 border-t border-amber-200 dark:border-amber-800">
                  <span className="font-semibold">GST Rate Tax (%):</span>
                  <div className="flex items-center gap-1">
                    <input
                      type="number"
                      min={0}
                      max={28}
                      value={newOrderForm.gst_percent}
                      onChange={(e) =>
                        setNewOrderForm((prev) => ({
                          ...prev,
                          gst_percent: Math.max(0, parseFloat(e.target.value) || 0)
                        }))
                      }
                      className="w-14 px-1.5 py-0.5 bg-white dark:bg-emerald-900 border border-amber-300 dark:border-amber-700 rounded text-right font-bold font-mono dark:text-white"
                    />
                    <span>%</span>
                  </div>
                </div>
              </div>

              {/* Real-time Calculation Summary Card */}
              <div className="p-4 bg-gray-900 text-white rounded-2xl space-y-1.5 font-mono text-xs shadow-inner">
                <div className="flex justify-between text-gray-400">
                  <span>Total MRP Rate:</span>
                  <span className="line-through">{formatPrice(multiBillCalculations.totalMRP)}</span>
                </div>
                <div className="flex justify-between text-emerald-400 font-bold">
                  <span>Our Price Subtotal:</span>
                  <span>{formatPrice(multiBillCalculations.itemsSubtotal)}</span>
                </div>
                <div className="flex justify-between text-emerald-300">
                  <span>Total MRP Savings:</span>
                  <span>-{formatPrice(multiBillCalculations.mrpSavings)}</span>
                </div>
                {multiBillCalculations.extraDiscountAmount > 0 && (
                  <div className="flex justify-between text-amber-300 font-bold">
                    <span>Additional Bill Discount:</span>
                    <span>-{formatPrice(multiBillCalculations.extraDiscountAmount)}</span>
                  </div>
                )}
                <div className="flex justify-between text-gray-300">
                  <span>GST Tax ({newOrderForm.gst_percent}%):</span>
                  <span>+{formatPrice(multiBillCalculations.taxAmount)}</span>
                </div>
                <div className="flex justify-between font-black text-sm text-amber-300 pt-2 border-t border-gray-700">
                  <span>Net Payable Total:</span>
                  <span>{formatPrice(multiBillCalculations.grandTotal)}</span>
                </div>
              </div>

              {/* Watermark Toggle Inside Modal */}
              <div className="p-3 bg-gray-50 dark:bg-emerald-900/40 rounded-xl border border-gray-200 dark:border-emerald-800 flex items-center justify-between">
                <div>
                  <div className="font-bold text-[11px] text-gray-800 dark:text-emerald-100 flex items-center gap-1.5">
                    <ShieldAlert className="w-3.5 h-3.5 text-rose-500" />
                    Watermark on Invoice / Receipt
                  </div>
                  <div className="text-[10px] text-gray-500 dark:text-emerald-300">
                    {showWatermark
                      ? 'Watermark is ON: "SAMPLE BILLING" watermark will appear.'
                      : 'Watermark is OFF (Clean Original): Looks identical to original store bill.'}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowWatermark(!showWatermark)}
                  className={`px-2.5 py-1 text-[10px] font-black uppercase rounded-lg border transition cursor-pointer ${
                    showWatermark
                      ? 'bg-rose-100 text-rose-700 border-rose-300 dark:bg-rose-950 dark:text-rose-300'
                      : 'bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-900 dark:text-emerald-200'
                  }`}
                >
                  {showWatermark ? 'Watermark: ON' : 'Watermark: OFF (Clean)'}
                </button>
              </div>
            </div>

            <div className="flex items-center gap-2 pt-2 border-t border-gray-100 dark:border-emerald-800">
              <button
                type="submit"
                disabled={billItems.length === 0}
                className="flex-1 py-2.5 px-4 bg-gradient-to-r from-indigo-600 to-emerald-600 hover:from-indigo-700 hover:to-emerald-700 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow-xs transition cursor-pointer flex items-center justify-center gap-1.5"
              >
                <Plus className="w-4 h-4" />
                <span>
                  Create Sample Bill ({formatPrice(multiBillCalculations.grandTotal)}) • {billItems.length} Product(s)
                </span>
              </button>
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="py-2.5 px-4 bg-gray-100 hover:bg-gray-200 dark:bg-emerald-900 dark:hover:bg-emerald-800 text-gray-700 dark:text-emerald-200 font-bold text-xs rounded-xl transition cursor-pointer"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 3: EDIT SAMPLE BILL                                                  */}
      {/* ========================================================================= */}
      {editingOrder && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-fadeIn">
          <form
            onSubmit={handleUpdateSampleOrder}
            className="bg-white rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl relative border border-gray-200"
          >
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <div className="flex items-center gap-2">
                <span className="p-2 bg-amber-100 text-amber-800 rounded-xl">
                  <Edit className="w-5 h-5" />
                </span>
                <div>
                  <h3 className="font-black text-base text-gray-900">Edit Sample Bill</h3>
                  <div className="text-[10px] text-gray-400 font-mono">#{editingOrder.order_number}</div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setEditingOrder(null)}
                className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-400 hover:text-gray-700 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-[11px] font-bold text-gray-700 uppercase tracking-wider mb-1">
                  Customer Name
                </label>
                <input
                  type="text"
                  required
                  value={editingOrder.customer_name_snapshot || ''}
                  onChange={(e) =>
                    setEditingOrder((prev) => (prev ? { ...prev, customer_name_snapshot: e.target.value } : null))
                  }
                  className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-medium focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-gray-700 uppercase tracking-wider mb-1">
                  Customer Phone
                </label>
                <input
                  type="text"
                  required
                  value={editingOrder.customer_phone_snapshot || ''}
                  onChange={(e) =>
                    setEditingOrder((prev) => (prev ? { ...prev, customer_phone_snapshot: e.target.value } : null))
                  }
                  className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-mono focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-gray-700 uppercase tracking-wider mb-1">
                    Additional Discount (₹)
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={editingOrder.extra_discount_amount || editingOrder.discount || 0}
                    onChange={(e) => {
                      const newDisc = Math.max(0, parseFloat(e.target.value) || 0);
                      setEditingOrder((prev) => {
                        if (!prev) return null;
                        const sub = prev.subtotal || 0;
                        const tax = prev.tax_amount || 0;
                        return {
                          ...prev,
                          discount: newDisc,
                          extra_discount_amount: newDisc,
                          total: Math.max(0, sub - newDisc + tax)
                        };
                      });
                    }}
                    className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-mono font-bold"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-gray-700 uppercase tracking-wider mb-1">
                    Net Total Amount (₹)
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={editingOrder.total || 0}
                    onChange={(e) =>
                      setEditingOrder((prev) => (prev ? { ...prev, total: parseFloat(e.target.value) || 0 } : null))
                    }
                    className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-mono font-bold"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-gray-700 uppercase tracking-wider mb-1">
                  Payment Method
                </label>
                <select
                  value={editingOrder.payment_method}
                  onChange={(e) =>
                    setEditingOrder((prev) => (prev ? { ...prev, payment_method: e.target.value as any } : null))
                  }
                  className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold"
                >
                  <option value="CASH">Cash</option>
                  <option value="UPI">UPI</option>
                  <option value="CARD">Card</option>
                  <option value="NET_BANKING">Net Banking</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-gray-700 uppercase tracking-wider mb-1">
                  Notes
                </label>
                <input
                  type="text"
                  value={editingOrder.notes || ''}
                  onChange={(e) => setEditingOrder((prev) => (prev ? { ...prev, notes: e.target.value } : null))}
                  className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs"
                />
              </div>
            </div>

            <div className="flex items-center gap-2 pt-2 border-t border-gray-100">
              <button
                type="submit"
                className="flex-1 py-2.5 px-4 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-xs transition cursor-pointer"
              >
                Save Changes
              </button>
              <button
                type="button"
                onClick={() => setEditingOrder(null)}
                className="py-2.5 px-4 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold text-xs rounded-xl transition cursor-pointer"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ========================================================================= */}
      {/* POP MODAL 4: CONFIRMATION MODAL (Yes / No for Delete & Convert)            */}
      {/* ========================================================================= */}
      {actionConfirmModal && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-xs z-[100] flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 text-center space-y-4 shadow-2xl border border-gray-200 relative overflow-hidden">
            <div
              className={`w-12 h-12 rounded-2xl mx-auto flex items-center justify-center ${
                actionConfirmModal.confirmButtonColor === 'emerald'
                  ? 'bg-emerald-100 text-emerald-600'
                  : actionConfirmModal.confirmButtonColor === 'rose'
                  ? 'bg-rose-100 text-rose-600'
                  : 'bg-amber-100 text-amber-600'
              }`}
            >
              <AlertTriangle className="w-6 h-6" />
            </div>

            <div className="space-y-1">
              <h3 className="font-black text-base text-gray-900">{actionConfirmModal.title}</h3>
              <p className="text-xs text-gray-500 leading-relaxed">{actionConfirmModal.subtitle}</p>
            </div>

            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                onClick={actionConfirmModal.onConfirm}
                className={`flex-1 py-2.5 px-3 rounded-xl font-bold text-xs text-white transition shadow-sm cursor-pointer ${
                  actionConfirmModal.confirmButtonColor === 'emerald'
                    ? 'bg-emerald-600 hover:bg-emerald-700'
                    : actionConfirmModal.confirmButtonColor === 'rose'
                    ? 'bg-rose-600 hover:bg-rose-700'
                    : 'bg-amber-500 hover:bg-amber-600'
                }`}
              >
                {actionConfirmModal.confirmButtonText}
              </button>

              <button
                type="button"
                onClick={() => setActionConfirmModal(null)}
                className="py-2.5 px-4 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold text-xs rounded-xl transition cursor-pointer"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Export Format Modal */}
      <ExportFormatModal
        isOpen={showExportModal}
        title="Export Sample Billing Ledger Records"
        description="Select format to download sample billing records:"
        totalRecords={selectedOrderIds.length > 0 ? selectedOrderIds.length : filteredAndSortedOrders.length}
        onClose={() => setShowExportModal(false)}
        onExport={handleExportSampleOrders}
      />
    </div>
  );
};

export default SampleBillingInvoicesPage;
