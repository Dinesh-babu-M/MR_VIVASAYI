import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  ArrowLeft,
  Package,
  Truck,
  CheckCircle2,
  Clock,
  Printer,
  FileText,
  MessageSquare,
  Trash2,
  Edit2,
  Edit3,
  Save,
  ExternalLink,
  MapPin,
  User,
  Phone,
  AlertTriangle,
  RotateCcw,
  RefreshCw,
  Send,
  Calendar,
  DollarSign,
  Tag,
  Check,
  X,
  Sparkles,
  Scale,
  Share2,
  Copy,
  Plus,
  ChevronDown
} from 'lucide-react';
import type { Order, OrderStatus, OrderItem, Product, PaymentMethod, PaymentStatus } from '../../types';
import { getJSONStore, setJSONStore, syncOrderStockChange, deleteRecordFromDB } from '../../lib/dbManager';
import { AdminPageSkeleton } from '../../components/common/Skeleton';
import { formatPrice, formatDateTime } from '../../lib/utils';
import { COURIER_PARTNERS, getCourierPartner } from '../../lib/deliveryRulesEngine';
import {
  printAmazonFlipkartCourierLabels,
  printAmazonFlipkartInvoices,
  STORE_NAME,
  STORE_FULL_ADDRESS,
  STORE_PHONE
} from '../../lib/ecomPrintTemplates';
import toast from 'react-hot-toast';

const STATUS_STEPS: { key: OrderStatus; label: string; icon: string }[] = [
  { key: 'NEW', label: 'New Order', icon: '📝' },
  { key: 'CONFIRMED', label: 'Confirmed', icon: '✅' },
  { key: 'PACKING', label: 'Packing', icon: '📦' },
  { key: 'READY', label: 'Ready', icon: '🏷️' },
  { key: 'DISPATCHED', label: 'Dispatched', icon: '🚚' },
  { key: 'OUT_FOR_DELIVERY', label: 'Out for Delivery', icon: '🛵' },
  { key: 'DELIVERED', label: 'Delivered', icon: '🎉' },
];

const STATUS_BADGE_STYLE: Record<OrderStatus, string> = {
  NEW: 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-500/20',
  CONFIRMED: 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-md shadow-indigo-500/20',
  PACKING: 'bg-gradient-to-r from-amber-500 to-amber-600 text-stone-950 font-black shadow-md shadow-amber-500/20',
  READY: 'bg-gradient-to-r from-yellow-500 to-amber-500 text-stone-950 font-black shadow-md shadow-yellow-500/20',
  DISPATCHED: 'bg-gradient-to-r from-cyan-600 to-blue-700 text-white shadow-md shadow-cyan-500/20',
  OUT_FOR_DELIVERY: 'bg-gradient-to-r from-orange-500 to-amber-600 text-white shadow-md shadow-orange-500/20',
  DELIVERED: 'bg-gradient-to-r from-emerald-600 to-teal-700 text-white shadow-md shadow-emerald-500/20',
  CANCELLED: 'bg-gradient-to-r from-rose-600 to-red-700 text-white shadow-md shadow-rose-500/20',
  RETURNED: 'bg-gradient-to-r from-purple-600 to-rose-700 text-white shadow-md shadow-purple-500/20',
};

const ALL_ORDER_STATUSES: OrderStatus[] = [
  'NEW', 'CONFIRMED', 'PACKING', 'READY', 'DISPATCHED', 'OUT_FOR_DELIVERY', 'DELIVERED', 'CANCELLED', 'RETURNED'
];

export default function AdminOrderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [order, setOrder] = useState<Order | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingCourier, setSavingCourier] = useState(false);

  // Courier Quick Form State
  const [courierPartner, setCourierPartner] = useState('ST Courier');
  const [trackingNumber, setTrackingNumber] = useState('');
  const [trackingUrl, setTrackingUrl] = useState('');
  const [weightGrams, setWeightGrams] = useState<number>(1000);
  const [expectedDate, setExpectedDate] = useState('');

  // Modals state
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  // Full Edit Form State
  const [editForm, setEditForm] = useState<{
    customer_name_snapshot: string;
    customer_phone_snapshot: string;
    delivery_address: string;
    delivery_area: string;
    status: OrderStatus;
    payment_method: PaymentMethod;
    payment_status: PaymentStatus;
    courier_partner: string;
    tracking_number: string;
    weight_grams: number;
    expected_delivery_date: string;
    subtotal: number;
    delivery_fee: number;
    discount: number;
    total: number;
    items: OrderItem[];
  }>({
    customer_name_snapshot: '',
    customer_phone_snapshot: '',
    delivery_address: '',
    delivery_area: '',
    status: 'NEW',
    payment_method: 'CASH',
    payment_status: 'PENDING',
    courier_partner: 'ST Courier',
    tracking_number: '',
    weight_grams: 1000,
    expected_delivery_date: '',
    subtotal: 0,
    delivery_fee: 0,
    discount: 0,
    total: 0,
    items: []
  });

  // Product addition state inside Edit modal
  const [selectedProductToAdd, setSelectedProductToAdd] = useState<string>('');
  const [customItemName, setCustomItemName] = useState('');
  const [customItemPrice, setCustomItemPrice] = useState<number>(0);
  const [customItemQty, setCustomItemQty] = useState<number>(1);
  const [customItemPack, setCustomItemPack] = useState('1 Kg');

  // 3D Confirmation Popup Modal State
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    confirmText: string;
    variant: 'danger' | 'warning' | 'primary';
    action: () => Promise<void>;
  }>({
    isOpen: false,
    title: '',
    message: '',
    confirmText: 'Yes, Confirm',
    variant: 'primary',
    action: async () => {}
  });

  const loadData = async () => {
    if (!id) return;
    setLoading(true);
    try {
      const [ordersList, prodsList] = await Promise.all([
        getJSONStore<Order>('orders'),
        getJSONStore<Product>('products')
      ]);

      setProducts(prodsList || []);

      const found = (ordersList || []).find(o => o.id === id || o.order_number === id);
      if (found) {
        setOrder(found);
        setCourierPartner(found.courier_partner || 'ST Courier');
        setTrackingNumber(found.tracking_number || '');
        setTrackingUrl(found.tracking_url || '');
        setWeightGrams(found.weight_grams || 1000);
        setExpectedDate(found.expected_delivery_date || '');

        // Populate Edit Form
        setEditForm({
          customer_name_snapshot: found.customer_name_snapshot || '',
          customer_phone_snapshot: found.customer_phone_snapshot || '',
          delivery_address: found.delivery_address || '',
          delivery_area: found.delivery_area || '',
          status: found.status,
          payment_method: found.payment_method || 'CASH',
          payment_status: found.payment_status || 'PENDING',
          courier_partner: found.courier_partner || 'ST Courier',
          tracking_number: found.tracking_number || '',
          weight_grams: found.weight_grams || 1000,
          expected_delivery_date: found.expected_delivery_date || '',
          subtotal: Number(found.subtotal || 0),
          delivery_fee: Number(found.delivery_fee || 0),
          discount: Number(found.discount || 0),
          total: Number(found.total || 0),
          items: found.items ? [...found.items] : []
        });
      } else {
        toast.error(`Order #${id} not found in database`);
      }
    } catch (err) {
      console.error('Failed to load order:', err);
      toast.error('Failed to load order details');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [id]);

  // Open Full Edit Modal
  const openEditModal = () => {
    if (!order) return;
    setEditForm({
      customer_name_snapshot: order.customer_name_snapshot || '',
      customer_phone_snapshot: order.customer_phone_snapshot || '',
      delivery_address: order.delivery_address || '',
      delivery_area: order.delivery_area || '',
      status: order.status,
      payment_method: order.payment_method || 'CASH',
      payment_status: order.payment_status || 'PENDING',
      courier_partner: order.courier_partner || courierPartner || 'ST Courier',
      tracking_number: order.tracking_number || trackingNumber || '',
      weight_grams: order.weight_grams || weightGrams || 1000,
      expected_delivery_date: order.expected_delivery_date || expectedDate || '',
      subtotal: Number(order.subtotal || 0),
      delivery_fee: Number(order.delivery_fee || 0),
      discount: Number(order.discount || 0),
      total: Number(order.total || 0),
      items: order.items ? JSON.parse(JSON.stringify(order.items)) : []
    });
    setIsEditModalOpen(true);
  };

  // Recalculate Totals in Edit Form
  const recalcTotals = (items: OrderItem[], fee: number, disc: number) => {
    const sub = items.reduce((acc, it) => acc + (Number(it.total) || (Number(it.unit_price_snapshot) * Number(it.quantity))), 0);
    const tot = Math.max(0, sub + Number(fee || 0) - Number(disc || 0));
    return { subtotal: sub, total: tot };
  };

  // Edit item quantity
  const handleItemQtyChange = (idx: number, newQty: number) => {
    if (newQty < 1) return;
    const nextItems = [...editForm.items];
    const item = nextItems[idx];
    item.quantity = newQty;
    item.total = Number(item.unit_price_snapshot || 0) * newQty;
    const { subtotal, total } = recalcTotals(nextItems, editForm.delivery_fee, editForm.discount);
    setEditForm(prev => ({ ...prev, items: nextItems, subtotal, total }));
  };

  // Edit item unit price
  const handleItemPriceChange = (idx: number, newPrice: number) => {
    const nextItems = [...editForm.items];
    const item = nextItems[idx];
    item.unit_price_snapshot = Number(newPrice || 0);
    item.total = Number(newPrice || 0) * (item.quantity || 1);
    const { subtotal, total } = recalcTotals(nextItems, editForm.delivery_fee, editForm.discount);
    setEditForm(prev => ({ ...prev, items: nextItems, subtotal, total }));
  };

  // Delete line item
  const handleRemoveItem = (idx: number) => {
    const nextItems = editForm.items.filter((_, i) => i !== idx);
    const { subtotal, total } = recalcTotals(nextItems, editForm.delivery_fee, editForm.discount);
    setEditForm(prev => ({ ...prev, items: nextItems, subtotal, total }));
  };

  // Add Product to Edit Form Items
  const handleAddProductItem = () => {
    if (!selectedProductToAdd && !customItemName.trim()) {
      toast.error('Select a product or enter custom item name');
      return;
    }

    let newItem: OrderItem;

    if (selectedProductToAdd) {
      const p = products.find(prod => prod.id === selectedProductToAdd);
      if (!p) return;
      const unitPrice = p.offer_price || p.selling_price || 0;
      const qty = customItemQty || 1;
      newItem = {
        id: `item-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
        order_id: order?.id || '',
        product_id: p.id,
        product_name_snapshot: p.name,
        tamil_name_snapshot: p.tamil_name,
        pack_size_snapshot: p.pack_size || customItemPack,
        quantity: qty,
        unit_price_snapshot: unitPrice,
        discount: 0,
        total: unitPrice * qty,
        created_at: new Date().toISOString()
      };
    } else {
      const qty = customItemQty || 1;
      const price = customItemPrice || 0;
      newItem = {
        id: `item-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
        order_id: order?.id || '',
        product_name_snapshot: customItemName.trim(),
        pack_size_snapshot: customItemPack.trim(),
        quantity: qty,
        unit_price_snapshot: price,
        discount: 0,
        total: price * qty,
        created_at: new Date().toISOString()
      };
    }

    const nextItems = [...editForm.items, newItem];
    const { subtotal, total } = recalcTotals(nextItems, editForm.delivery_fee, editForm.discount);
    setEditForm(prev => ({
      ...prev,
      items: nextItems,
      subtotal,
      total
    }));

    // Reset picker
    setSelectedProductToAdd('');
    setCustomItemName('');
    setCustomItemPrice(0);
    setCustomItemQty(1);
    toast.success('Item added to order!');
  };

  // Save All Order Edits
  const handleSaveAllOrderEdits = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!order) return;

    try {
      const updated: Order = {
        ...order,
        customer_name_snapshot: editForm.customer_name_snapshot.trim(),
        customer_phone_snapshot: editForm.customer_phone_snapshot.trim(),
        delivery_address: editForm.delivery_address.trim(),
        delivery_area: editForm.delivery_area.trim(),
        status: editForm.status,
        payment_method: editForm.payment_method,
        payment_status: editForm.payment_status,
        courier_partner: editForm.courier_partner.trim(),
        tracking_number: editForm.tracking_number.trim(),
        weight_grams: Number(editForm.weight_grams) || 1000,
        expected_delivery_date: editForm.expected_delivery_date || undefined,
        subtotal: Number(editForm.subtotal) || 0,
        delivery_fee: Number(editForm.delivery_fee) || 0,
        discount: Number(editForm.discount) || 0,
        total: Number(editForm.total) || 0,
        items: editForm.items,
        updated_at: new Date().toISOString()
      };

      // Sync stock adjustments
      await syncOrderStockChange(order, updated);

      const allOrders = await getJSONStore<Order>('orders');
      const nextOrders = (allOrders || []).map(o => o.id === updated.id ? updated : o);
      await setJSONStore<Order>('orders', nextOrders);

      setOrder(updated);
      setCourierPartner(updated.courier_partner || 'ST Courier');
      setTrackingNumber(updated.tracking_number || '');
      setWeightGrams(updated.weight_grams || 1000);
      setExpectedDate(updated.expected_delivery_date || '');

      setIsEditModalOpen(false);
      toast.success('Order and Invoice details updated successfully!');
    } catch (err) {
      console.error(err);
      toast.error('Failed to save order updates');
    }
  };

  // Handle Quick Status Change with Confirmation
  const requestStatusChange = (newStatus: OrderStatus) => {
    if (!order) return;
    if (order.status === newStatus) return;

    setConfirmModal({
      isOpen: true,
      title: 'Update Order Status?',
      message: `Are you sure you want to change order #${order.order_number} status from "${order.status}" to "${newStatus}"? Stock and audit history will be updated automatically.`,
      confirmText: `Yes, Set to ${newStatus}`,
      variant: newStatus === 'CANCELLED' || newStatus === 'RETURNED' ? 'danger' : 'primary',
      action: async () => {
        try {
          const updated: Order = {
            ...order,
            status: newStatus,
            dispatched_at: newStatus === 'DISPATCHED' ? (order.dispatched_at || new Date().toISOString()) : order.dispatched_at,
            delivered_at: newStatus === 'DELIVERED' ? (order.delivered_at || new Date().toISOString()) : order.delivered_at,
            updated_at: new Date().toISOString()
          };

          const syncRes = await syncOrderStockChange(order, updated);
          const allOrders = await getJSONStore<Order>('orders');
          const nextOrders = (allOrders || []).map(o => o.id === updated.id ? updated : o);
          await setJSONStore<Order>('orders', nextOrders);
          setOrder(updated);

          if (syncRes.changed) {
            if (syncRes.refilledCount > 0) {
              toast.success(`Restored +${syncRes.refilledCount} item(s) to stock.`);
            } else if (syncRes.updatedCount > 0) {
              toast.success(`Updated ${syncRes.updatedCount} item(s) in inventory.`);
            }
          }
          toast.success(`Order status updated to ${newStatus}!`);
        } catch (e) {
          console.error(e);
          toast.error('Failed to update status');
        }
      }
    });
  };

  // Save Courier Details Quick Form
  const handleSaveCourierDocket = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!order) return;

    setSavingCourier(true);
    try {
      const partnerObj = getCourierPartner(courierPartner);
      const generatedUrl = trackingNumber ? (partnerObj ? partnerObj.generateTrackingUrl(trackingNumber) : '') : '';
      
      const updated: Order = {
        ...order,
        courier_partner: courierPartner,
        tracking_number: trackingNumber.trim(),
        tracking_url: trackingUrl.trim() || generatedUrl,
        weight_grams: Number(weightGrams) || 1000,
        expected_delivery_date: expectedDate || undefined,
        updated_at: new Date().toISOString()
      };

      const allOrders = await getJSONStore<Order>('orders');
      const nextOrders = (allOrders || []).map(o => o.id === updated.id ? updated : o);
      await setJSONStore<Order>('orders', nextOrders);
      setOrder(updated);
      toast.success('Courier partner and tracking docket saved successfully!');
    } catch (err) {
      console.error(err);
      toast.error('Failed to update courier details');
    } finally {
      setSavingCourier(false);
    }
  };

  // Delete Order with Confirmation
  const requestDeleteOrder = () => {
    if (!order) return;
    setConfirmModal({
      isOpen: true,
      title: 'Delete Order Record?',
      message: `Are you sure you want to permanently delete order #${order.order_number}? This action cannot be reversed and inventory will be restored if applicable.`,
      confirmText: 'Yes, Delete Order',
      variant: 'danger',
      action: async () => {
        try {
          if (['NEW', 'CONFIRMED', 'PACKING', 'READY', 'DISPATCHED'].includes(order.status)) {
            await syncOrderStockChange(order, { ...order, status: 'CANCELLED' });
          }
          await deleteRecordFromDB('orders', order.id);
          toast.success(`Order #${order.order_number} deleted successfully.`);
          navigate('/admin/orders');
        } catch (e) {
          console.error(e);
          toast.error('Failed to delete order');
        }
      }
    });
  };

  // WhatsApp Message Dispatch
  const handleSendWhatsAppUpdate = () => {
    if (!order) return;
    const phone = (order.customer_phone_snapshot || '').replace(/\D/g, '');
    if (!phone) {
      toast.error('No phone number recorded for this customer.');
      return;
    }

    const cleanPhone = phone.length === 10 ? `91${phone}` : phone;
    const partner = order.courier_partner || courierPartner || 'ST Courier';
    const tracking = order.tracking_number || trackingNumber || 'N/A';
    const storeLink = `${window.location.origin}/track-order?orderId=${order.order_number}`;

    const text = encodeURIComponent(
      `MR. VIVASAYI Mart - Order & Shipping Update\n\n` +
      `Hello ${order.customer_name_snapshot || 'Valued Customer'},\n` +
      `Your Order *#${order.order_number}* is now *${order.status}*!\n\n` +
      `📦 Courier Partner: ${partner}\n` +
      `🏷️ AWB Docket: ${tracking}\n` +
      `💰 Total Amount: ${formatPrice(order.total)} (${order.payment_status})\n\n` +
      `🚚 Live Website Tracking Link:\n${storeLink}\n\n` +
      `Thank you for ordering with MR. VIVASAYI Mart! (Ph: ${STORE_PHONE})`
    );

    window.open(`https://wa.me/${cleanPhone}?text=${text}`, '_blank');
  };

  // Share Invoice via System Sheet or Clipboard
  const handleCopyInvoiceLink = () => {
    if (!order) return;
    const link = `${window.location.origin}/track-order?orderId=${order.order_number}`;
    navigator.clipboard.writeText(link);
    setCopiedLink(true);
    toast.success('Invoice & Order link copied to clipboard!');
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const handleNativeShare = async () => {
    if (!order) return;
    const link = `${window.location.origin}/track-order?orderId=${order.order_number}`;
    if (navigator.share) {
      try {
        await navigator.share({
          title: `MR. VIVASAYI Mart Invoice #${order.order_number}`,
          text: `Invoice #${order.order_number} from MR. VIVASAYI Mart for ${order.customer_name_snapshot || 'Customer'}. Amount: ${formatPrice(order.total)} (${order.payment_status})`,
          url: link
        });
        toast.success('Invoice shared successfully!');
      } catch (e) {
        console.error('Share cancelled or failed', e);
      }
    } else {
      handleCopyInvoiceLink();
    }
  };

  if (loading) {
    return <AdminPageSkeleton />;
  }

  if (!order) {
    return (
      <div className="p-8 text-center max-w-lg mx-auto space-y-4">
        <div className="w-16 h-16 rounded-3xl bg-rose-100 text-rose-600 flex items-center justify-center mx-auto shadow-md">
          <AlertTriangle className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-black text-stone-900">Order Not Found</h2>
        <p className="text-sm text-stone-600">The requested order was not found or may have been deleted.</p>
        <Link
          to="/admin/orders"
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-emerald-800 text-white font-bold text-sm hover:bg-emerald-900 shadow-md transition"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Orders Hub
        </Link>
      </div>
    );
  }

  const currentStepIdx = STATUS_STEPS.findIndex(s => s.key === order.status);
  const activeCourierInfo = getCourierPartner(order.courier_partner || courierPartner);
  const testTrackUrl = order.tracking_url || (order.tracking_number && activeCourierInfo ? activeCourierInfo.generateTrackingUrl(order.tracking_number) : '');

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      
      {/* 3D Top Header & Navigation Breadcrumb */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-gradient-to-r from-emerald-900 via-emerald-800 to-teal-900 text-white p-6 rounded-3xl shadow-xl shadow-emerald-950/20 border border-emerald-700/50 relative overflow-hidden">
        <div className="absolute right-0 top-0 w-96 h-96 bg-amber-400/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />

        <div className="space-y-2 relative z-10">
          <div className="flex items-center gap-2 text-xs font-bold text-emerald-200">
            <Link to="/admin/orders" className="hover:text-amber-300 transition flex items-center gap-1">
              <ArrowLeft className="w-3.5 h-3.5" /> Orders Hub
            </Link>
            <span>/</span>
            <span className="text-amber-300 font-mono font-black">#{order.order_number}</span>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white flex items-center gap-2">
              Order #{order.order_number}
            </h1>
            <span className={`px-3.5 py-1 rounded-xl text-xs font-black tracking-wide ${STATUS_BADGE_STYLE[order.status]}`}>
              {order.status}
            </span>
            <span className="px-2.5 py-1 rounded-xl text-xs font-extrabold bg-emerald-950/60 text-amber-300 border border-amber-400/30">
              {order.source}
            </span>
            <span className={`px-2.5 py-1 rounded-xl text-xs font-black uppercase ${
              order.payment_status === 'PAID'
                ? 'bg-emerald-400/30 text-emerald-200 border border-emerald-400/40'
                : 'bg-amber-400/30 text-amber-200 border border-amber-400/40'
            }`}>
              {order.payment_status === 'PAID' ? '✓ PAID' : 'UNPAID'}
            </span>
          </div>

          <div className="text-xs text-emerald-200 flex flex-wrap items-center gap-3">
            <span className="flex items-center gap-1">
              <Clock className="w-3.5 h-3.5 text-amber-300" /> Placed {formatDateTime(order.created_at)}
            </span>
            <span>•</span>
            <span className="text-amber-200 font-bold">Total: {formatPrice(order.total)}</span>
          </div>
        </div>

        {/* Top Action Buttons (Edit All, Share Invoice, Print Amazon Invoice, Courier Label) */}
        <div className="flex flex-wrap items-center gap-2 relative z-10 w-full sm:w-auto">
          
          {/* EDIT ALL ORDER & INVOICE DETAILS BUTTON */}
          <button
            onClick={openEditModal}
            className="flex-1 sm:flex-none px-4 py-2.5 bg-amber-400 hover:bg-amber-300 text-stone-950 rounded-2xl font-black text-xs shadow-md shadow-amber-400/30 flex items-center justify-center gap-1.5 transition-all transform hover:-translate-y-0.5 active:translate-y-0 cursor-pointer"
            title="Edit Order, Customer, Courier & Invoice Details"
          >
            <Edit3 className="w-4 h-4 text-stone-950" /> Edit Order Details
          </button>

          {/* SHARE INVOICE BUTTON */}
          <button
            onClick={() => setIsShareModalOpen(true)}
            className="flex-1 sm:flex-none px-4 py-2.5 bg-emerald-700 hover:bg-emerald-600 text-white rounded-2xl font-black text-xs shadow-md flex items-center justify-center gap-1.5 transition-all transform hover:-translate-y-0.5 active:translate-y-0 cursor-pointer"
            title="Share Tax Invoice via WhatsApp or Link"
          >
            <Share2 className="w-4 h-4 text-amber-300" /> Share Invoice
          </button>

          {/* Print Amazon / Flipkart Standard Invoice */}
          <button
            onClick={() => printAmazonFlipkartInvoices(order)}
            className="flex-1 sm:flex-none px-4 py-2.5 bg-white text-emerald-950 hover:bg-emerald-50 rounded-2xl font-black text-xs shadow-md flex items-center justify-center gap-1.5 transition-all transform hover:-translate-y-0.5 active:translate-y-0 cursor-pointer"
            title="Print eCommerce Tax Invoice with Logo Watermark & Paid/Unpaid Stamp"
          >
            <Printer className="w-4 h-4 text-emerald-800" /> Print Tax Invoice
          </button>

          {/* Print Courier Parcel Shipping Label */}
          <button
            onClick={() => printAmazonFlipkartCourierLabels(order, courierPartner)}
            className="flex-1 sm:flex-none px-4 py-2.5 bg-stone-900 hover:bg-black text-amber-300 rounded-2xl font-black text-xs border border-amber-400/40 shadow-md flex items-center justify-center gap-1.5 transition-all transform hover:-translate-y-0.5 active:translate-y-0 cursor-pointer"
            title="Print Courier Shipping Parcel Label (Amazon / Flipkart Box Sticker)"
          >
            <Truck className="w-4 h-4 text-amber-300" /> Print Courier Label
          </button>

          {/* WhatsApp Direct */}
          <button
            onClick={handleSendWhatsAppUpdate}
            className="p-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-2xl shadow-md transition-all flex items-center justify-center cursor-pointer"
            title="Send WhatsApp Order & Shipping Update"
          >
            <MessageSquare className="w-4 h-4" />
          </button>

          {/* Live Website Tracking Link */}
          <Link
            to={`/track-order?orderId=${order.order_number}`}
            target="_blank"
            rel="noopener noreferrer"
            className="p-2.5 bg-teal-800/80 hover:bg-teal-700 text-emerald-200 rounded-2xl border border-teal-600/50 shadow-md transition-all flex items-center justify-center"
            title="View Live Public Customer Tracking Page"
          >
            <ExternalLink className="w-4 h-4" />
          </Link>

          {/* Delete Order */}
          <button
            onClick={requestDeleteOrder}
            className="p-2.5 bg-rose-900/60 hover:bg-rose-800 text-rose-200 rounded-2xl border border-rose-700/50 shadow-md transition-all flex items-center justify-center cursor-pointer"
            title="Delete this order"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* 3D Order Status Lifecycle Stepper Card */}
      <div className="bg-white dark:bg-stone-900 rounded-3xl p-6 border border-stone-200 dark:border-stone-800 shadow-xl shadow-stone-200/50 dark:shadow-none space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-emerald-500 animate-ping" />
            <h3 className="text-base font-black text-stone-900 dark:text-white uppercase tracking-wider">
              Order Lifecycle Stepper
            </h3>
          </div>
          <span className="text-xs font-bold text-stone-500">
            Click any step to update status (with confirmation)
          </span>
        </div>

        {/* Stepper Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2 pt-2">
          {STATUS_STEPS.map((step, idx) => {
            const isCompleted = currentStepIdx >= idx && order.status !== 'CANCELLED' && order.status !== 'RETURNED';
            const isCurrent = order.status === step.key;

            return (
              <button
                key={step.key}
                type="button"
                onClick={() => requestStatusChange(step.key)}
                className={`p-3 rounded-2xl border text-center transition-all flex flex-col items-center justify-center gap-1.5 cursor-pointer relative group ${
                  isCurrent
                    ? 'bg-emerald-800 text-white border-emerald-900 shadow-lg shadow-emerald-800/30 scale-105 z-10'
                    : isCompleted
                    ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-900 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800 hover:bg-emerald-100'
                    : 'bg-stone-50 dark:bg-stone-800/50 text-stone-600 dark:text-stone-400 border-stone-200 dark:border-stone-700 hover:bg-stone-100 dark:hover:bg-stone-800'
                }`}
              >
                <span className="text-xl group-hover:scale-125 transition-transform">{step.icon}</span>
                <span className="text-xs font-extrabold leading-tight">{step.label}</span>
                {isCurrent && (
                  <span className="absolute -top-2 bg-amber-400 text-stone-950 font-black text-[9px] px-2 py-0.5 rounded-full shadow-xs uppercase">
                    Current
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Cancel / Return Quick Triggers */}
        <div className="pt-2 flex items-center justify-end gap-2 border-t border-stone-100 dark:border-stone-800">
          <button
            type="button"
            onClick={() => requestStatusChange('CANCELLED')}
            className={`px-3 py-1.5 text-xs font-extrabold rounded-xl border transition ${
              order.status === 'CANCELLED'
                ? 'bg-rose-600 text-white border-rose-700'
                : 'text-rose-600 hover:bg-rose-50 border-rose-200 dark:border-rose-900/50'
            }`}
          >
            Mark Cancelled ✕
          </button>
          <button
            type="button"
            onClick={() => requestStatusChange('RETURNED')}
            className={`px-3 py-1.5 text-xs font-extrabold rounded-xl border transition ${
              order.status === 'RETURNED'
                ? 'bg-purple-600 text-white border-purple-700'
                : 'text-purple-600 hover:bg-purple-50 border-purple-200 dark:border-purple-900/50'
            }`}
          >
            Mark Returned ↩
          </button>
        </div>
      </div>

      {/* Main Grid: Left Column (Logistics & Customer) + Right Column (Items & Bill) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Column (5 Cols): Courier Logistics & Customer Info */}
        <div className="lg:col-span-5 space-y-6">
          
          {/* 1. Courier Logistics Partner & Tracking Manager */}
          <div className="bg-white dark:bg-stone-900 rounded-3xl p-6 border border-stone-200 dark:border-stone-800 shadow-xl shadow-stone-200/50 dark:shadow-none space-y-4">
            <div className="flex items-center justify-between border-b border-stone-100 dark:border-stone-800 pb-3">
              <div className="flex items-center gap-2 text-emerald-800 dark:text-emerald-400">
                <Truck className="w-5 h-5" />
                <h3 className="font-black text-stone-900 dark:text-white text-base uppercase tracking-wider">
                  Courier Logistics & AWB
                </h3>
              </div>
              <span className="text-[10px] font-black uppercase px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-900 dark:bg-emerald-950 dark:text-emerald-300">
                {courierPartner}
              </span>
            </div>

            <form onSubmit={handleSaveCourierDocket} className="space-y-4">
              {/* Courier Partner Selection */}
              <div>
                <label className="block text-xs font-extrabold text-stone-700 dark:text-stone-300 mb-1">
                  Courier Partner
                </label>
                <select
                  value={courierPartner}
                  onChange={(e) => setCourierPartner(e.target.value)}
                  className="w-full p-3 bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-2xl font-bold text-stone-900 dark:text-white text-xs outline-none focus:ring-2 focus:ring-emerald-600"
                >
                  {COURIER_PARTNERS.map(cp => (
                    <option key={cp.name} value={cp.name}>
                      {cp.name} ({cp.badge})
                    </option>
                  ))}
                  <option value="Direct Express Runner">Local Store Runner (Same Day)</option>
                </select>
              </div>

              {/* Tracking Number / AWB */}
              <div>
                <label className="block text-xs font-extrabold text-stone-700 dark:text-stone-300 mb-1">
                  AWB / Tracking Docket Number
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={trackingNumber}
                    onChange={(e) => setTrackingNumber(e.target.value)}
                    placeholder="e.g. STC9876543210 or 123456789"
                    className="w-full p-3 pr-24 bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-2xl font-mono font-bold text-stone-900 dark:text-white text-xs outline-none focus:ring-2 focus:ring-emerald-600"
                  />
                  {testTrackUrl && (
                    <a
                      href={testTrackUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="absolute right-2 top-2 px-2.5 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-[10px] font-black inline-flex items-center gap-1 shadow-xs"
                      title="Open courier website live tracking"
                    >
                      Track ↗
                    </a>
                  )}
                </div>
              </div>

              {/* Package Weight & Expected Date */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-extrabold text-stone-700 dark:text-stone-300 mb-1">
                    Weight (Grams)
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      value={weightGrams}
                      onChange={(e) => setWeightGrams(Number(e.target.value))}
                      className="w-full p-3 bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-2xl font-mono font-bold text-stone-900 dark:text-white text-xs outline-none focus:ring-2 focus:ring-emerald-600"
                    />
                    <span className="absolute right-3 top-3 text-[10px] font-black text-stone-400">
                      {(weightGrams / 1000).toFixed(2)} KG
                    </span>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-extrabold text-stone-700 dark:text-stone-300 mb-1">
                    Expected Delivery Date
                  </label>
                  <input
                    type="date"
                    value={expectedDate}
                    onChange={(e) => setExpectedDate(e.target.value)}
                    className="w-full p-3 bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-2xl font-bold text-stone-900 dark:text-white text-xs outline-none focus:ring-2 focus:ring-emerald-600"
                  />
                </div>
              </div>

              <div className="pt-2 flex items-center gap-2">
                <button
                  type="submit"
                  disabled={savingCourier}
                  className="flex-1 py-3 bg-emerald-800 hover:bg-emerald-900 text-white rounded-2xl font-black text-xs shadow-md shadow-emerald-900/20 flex items-center justify-center gap-1.5 transition disabled:opacity-50 cursor-pointer"
                >
                  <Save className="w-4 h-4" /> {savingCourier ? 'Saving...' : 'Save Logistics Docket'}
                </button>
                <button
                  type="button"
                  onClick={() => printAmazonFlipkartCourierLabels(order, courierPartner)}
                  className="px-4 py-3 bg-amber-400 hover:bg-amber-300 text-stone-950 rounded-2xl font-black text-xs shadow-md shadow-amber-400/20 flex items-center gap-1.5 transition cursor-pointer"
                  title="Print Courier Parcel Label"
                >
                  <Printer className="w-4 h-4" /> Sticker
                </button>
              </div>
            </form>
          </div>

          {/* 2. Customer Details Card (with direct link to customer profile) */}
          <div className="bg-white dark:bg-stone-900 rounded-3xl p-6 border border-stone-200 dark:border-stone-800 shadow-xl shadow-stone-200/50 dark:shadow-none space-y-4">
            <div className="flex items-center justify-between border-b border-stone-100 dark:border-stone-800 pb-3">
              <div className="flex items-center gap-2 text-emerald-800 dark:text-emerald-400">
                <User className="w-5 h-5" />
                <h3 className="font-black text-stone-900 dark:text-white text-base uppercase tracking-wider">
                  Customer Profile
                </h3>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={openEditModal}
                  className="text-xs font-bold text-stone-500 hover:text-emerald-700 flex items-center gap-1 cursor-pointer"
                  title="Edit Customer Info"
                >
                  <Edit2 className="w-3 h-3" /> Edit
                </button>
                <Link
                  to={order.customer_id ? `/admin/customers/${order.customer_id}` : `/admin/customers/${order.customer_phone_snapshot || ''}`}
                  className="text-xs font-black text-emerald-700 dark:text-amber-400 hover:underline flex items-center gap-1"
                >
                  Profile ↗
                </Link>
              </div>
            </div>

            <div className="space-y-3 text-xs">
              <div className="p-4 bg-stone-50 dark:bg-stone-800/60 rounded-2xl border border-stone-200 dark:border-stone-700">
                <div className="text-sm font-black text-stone-900 dark:text-white">
                  {order.customer_name_snapshot || 'Walk-in Customer'}
                </div>
                <div className="mt-1 flex items-center gap-2 text-stone-600 dark:text-stone-300">
                  <Phone className="w-3.5 h-3.5 text-emerald-600" />
                  <span className="font-mono font-bold">{order.customer_phone_snapshot || 'No phone provided'}</span>
                </div>
                {order.customer_id && (
                  <div className="mt-2 text-[10px] font-mono text-stone-400">
                    Customer ID: <span className="font-bold text-stone-700 dark:text-stone-300">{order.customer_id}</span>
                  </div>
                )}
              </div>

              {/* Direct WhatsApp Call & Chat */}
              {order.customer_phone_snapshot && (
                <div className="grid grid-cols-2 gap-2">
                  <a
                    href={`tel:${order.customer_phone_snapshot}`}
                    className="p-2.5 rounded-xl border border-stone-200 dark:border-stone-700 text-stone-700 dark:text-stone-300 font-bold flex items-center justify-center gap-1.5 hover:bg-stone-50 transition cursor-pointer"
                  >
                    <Phone className="w-3.5 h-3.5 text-emerald-600" /> Call Customer
                  </a>
                  <button
                    onClick={handleSendWhatsAppUpdate}
                    className="p-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold flex items-center justify-center gap-1.5 transition cursor-pointer"
                  >
                    <MessageSquare className="w-3.5 h-3.5" /> WhatsApp Bill
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* 3. Delivery Address Card */}
          <div className="bg-white dark:bg-stone-900 rounded-3xl p-6 border border-stone-200 dark:border-stone-800 shadow-xl shadow-stone-200/50 dark:shadow-none space-y-3">
            <div className="flex items-center justify-between border-b border-stone-100 dark:border-stone-800 pb-3">
              <div className="flex items-center gap-2 text-emerald-800 dark:text-emerald-400">
                <MapPin className="w-5 h-5" />
                <h3 className="font-black text-stone-900 dark:text-white text-base uppercase tracking-wider">
                  Shipping Destination
                </h3>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={openEditModal}
                  className="text-xs font-bold text-stone-500 hover:text-emerald-700 flex items-center gap-1 cursor-pointer"
                  title="Edit Address"
                >
                  <Edit2 className="w-3 h-3" /> Edit
                </button>
                {order.delivery_address && (
                  <a
                    href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(order.delivery_address)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs font-bold text-emerald-700 dark:text-amber-400 hover:underline flex items-center gap-1"
                  >
                    Maps ↗
                  </a>
                )}
              </div>
            </div>

            <div className="p-4 bg-stone-50 dark:bg-stone-800/60 rounded-2xl border border-stone-200 dark:border-stone-700 space-y-2 text-xs">
              <div className="font-semibold text-stone-800 dark:text-stone-200 leading-relaxed">
                {order.delivery_address || 'Store Pickup / Counter Sale'}
              </div>
              {order.delivery_area && (
                <div className="text-[11px] text-stone-500">
                  Area: <strong className="text-stone-700 dark:text-stone-300">{order.delivery_area}</strong>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Column (7 Cols): Items Manifest & Payment Totals */}
        <div className="lg:col-span-7 space-y-6">
          
          {/* Order Items Manifest Table */}
          <div className="bg-white dark:bg-stone-900 rounded-3xl p-6 border border-stone-200 dark:border-stone-800 shadow-xl shadow-stone-200/50 dark:shadow-none space-y-4">
            <div className="flex items-center justify-between border-b border-stone-100 dark:border-stone-800 pb-3">
              <div className="flex items-center gap-2 text-emerald-800 dark:text-emerald-400">
                <Package className="w-5 h-5" />
                <h3 className="font-black text-stone-900 dark:text-white text-base uppercase tracking-wider">
                  Ordered Items ({(order.items || []).length})
                </h3>
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={openEditModal}
                  className="px-3 py-1 rounded-xl bg-amber-100 hover:bg-amber-200 text-stone-950 font-black text-xs inline-flex items-center gap-1 transition cursor-pointer"
                  title="Edit or Add Order Items"
                >
                  <Edit2 className="w-3 h-3" /> Edit Items
                </button>
                <span className="text-xs font-bold text-stone-500">
                  {(order.items || []).reduce((acc, i) => acc + (i.quantity || 1), 0)} total units
                </span>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-stone-200 dark:border-stone-800 text-stone-400 uppercase text-[10px] font-black">
                    <th className="pb-3 pl-2">Product</th>
                    <th className="pb-3 text-center">Qty</th>
                    <th className="pb-3 text-right">Price</th>
                    <th className="pb-3 text-right pr-2">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100 dark:divide-stone-800">
                  {(order.items || []).map((item, idx) => (
                    <tr key={item.id || idx} className="hover:bg-stone-50 dark:hover:bg-stone-800/40 transition">
                      <td className="py-3 pl-2">
                        <div className="font-black text-stone-900 dark:text-white">
                          {item.product_name_snapshot}
                        </div>
                        {item.tamil_name_snapshot && (
                          <div className="text-[10px] text-emerald-600 font-bold">
                            {item.tamil_name_snapshot}
                          </div>
                        )}
                        {item.pack_size_snapshot && (
                          <div className="text-[10px] text-stone-400">
                            Size: {item.pack_size_snapshot}
                          </div>
                        )}
                      </td>
                      <td className="py-3 text-center font-bold font-mono text-stone-800 dark:text-stone-200">
                        x{item.quantity}
                      </td>
                      <td className="py-3 text-right font-mono text-stone-600 dark:text-stone-300">
                        {formatPrice(item.unit_price_snapshot)}
                      </td>
                      <td className="py-3 text-right pr-2 font-black font-mono text-emerald-950 dark:text-emerald-300">
                        {formatPrice(item.total)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Payment & Invoice Breakdown */}
          <div className="bg-white dark:bg-stone-900 rounded-3xl p-6 border border-stone-200 dark:border-stone-800 shadow-xl shadow-stone-200/50 dark:shadow-none space-y-4">
            <div className="flex items-center justify-between border-b border-stone-100 dark:border-stone-800 pb-3">
              <div className="flex items-center gap-2 text-emerald-800 dark:text-emerald-400">
                <DollarSign className="w-5 h-5" />
                <h3 className="font-black text-stone-900 dark:text-white text-base uppercase tracking-wider">
                  Payment & Invoice Breakdown
                </h3>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={openEditModal}
                  className="text-xs font-bold text-stone-500 hover:text-emerald-700 flex items-center gap-1 cursor-pointer"
                  title="Edit Payment & Pricing"
                >
                  <Edit2 className="w-3 h-3" /> Edit
                </button>
                <span className={`px-2.5 py-1 rounded-full text-xs font-black uppercase ${
                  order.payment_status === 'PAID'
                    ? 'bg-emerald-100 text-emerald-900 border border-emerald-300'
                    : 'bg-amber-100 text-amber-900 border border-amber-300'
                }`}>
                  {order.payment_method} • {order.payment_status}
                </span>
              </div>
            </div>

            <div className="space-y-2 text-xs">
              <div className="flex justify-between py-1 text-stone-600 dark:text-stone-400">
                <span>Items Subtotal:</span>
                <span className="font-bold text-stone-900 dark:text-white">{formatPrice(order.subtotal)}</span>
              </div>

              <div className="flex justify-between py-1 text-stone-600 dark:text-stone-400">
                <span>Courier Delivery Fee:</span>
                <span className="font-bold text-stone-900 dark:text-white">
                  {order.delivery_fee > 0 ? `+${formatPrice(order.delivery_fee)}` : 'FREE ₹0'}
                </span>
              </div>

              {order.discount > 0 && (
                <div className="flex justify-between py-1 text-emerald-600 font-bold">
                  <span>Promotional Discount:</span>
                  <span>-{formatPrice(order.discount)}</span>
                </div>
              )}

              <div className="pt-3 border-t border-stone-200 dark:border-stone-800 flex justify-between items-center">
                <div>
                  <span className="text-sm font-black text-stone-900 dark:text-white uppercase">Grand Total:</span>
                  <div className="text-[10px] text-stone-400">Inclusive of delivery & taxes</div>
                </div>
                <span className="text-2xl font-black font-mono text-emerald-700 dark:text-amber-400">
                  {formatPrice(order.total)}
                </span>
              </div>
            </div>

            {/* Quick Invoice & Print Action Bar */}
            <div className="pt-4 border-t border-stone-100 dark:border-stone-800 flex flex-wrap gap-2">
              <button
                onClick={() => printAmazonFlipkartInvoices(order)}
                className="flex-1 py-3 bg-emerald-800 hover:bg-emerald-900 text-white font-black text-xs rounded-2xl shadow-md shadow-emerald-900/20 flex items-center justify-center gap-1.5 transition cursor-pointer"
              >
                <FileText className="w-4 h-4" /> Print Tax Invoice (Amazon Format)
              </button>
              <button
                onClick={() => printAmazonFlipkartCourierLabels(order, courierPartner)}
                className="flex-1 py-3 bg-amber-400 hover:bg-amber-300 text-stone-950 font-black text-xs rounded-2xl shadow-md shadow-amber-400/20 flex items-center justify-center gap-1.5 transition cursor-pointer"
              >
                <Printer className="w-4 h-4" /> Print Courier Shipping Sticker
              </button>
              <button
                onClick={() => setIsShareModalOpen(true)}
                className="px-4 py-3 bg-stone-100 hover:bg-stone-200 dark:bg-stone-800 dark:hover:bg-stone-700 text-stone-800 dark:text-stone-200 font-black text-xs rounded-2xl border border-stone-300 dark:border-stone-700 flex items-center justify-center gap-1.5 transition cursor-pointer"
                title="Share Invoice"
              >
                <Share2 className="w-4 h-4 text-emerald-700" /> Share
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* SHARE INVOICE MODAL */}
      {isShareModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-950/70 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white dark:bg-stone-900 rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl border border-stone-200 dark:border-stone-800 space-y-5 animate-scaleUp">
            <div className="flex items-center justify-between border-b border-stone-100 dark:border-stone-800 pb-3">
              <div className="flex items-center gap-2">
                <Share2 className="w-5 h-5 text-emerald-700 dark:text-emerald-400" />
                <h3 className="text-lg font-black text-stone-900 dark:text-white">
                  Share Order Tax Invoice
                </h3>
              </div>
              <button
                onClick={() => setIsShareModalOpen(false)}
                className="text-stone-400 hover:text-stone-600 dark:hover:text-stone-200 p-1 rounded-xl"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 bg-stone-50 dark:bg-stone-800/60 rounded-2xl border border-stone-200 dark:border-stone-700 text-xs space-y-1">
              <div className="font-bold text-stone-900 dark:text-white">
                Invoice #INV-{order.order_number}
              </div>
              <div className="text-stone-500">
                Customer: <strong className="text-stone-700 dark:text-stone-300">{order.customer_name_snapshot || 'Customer'}</strong> ({order.customer_phone_snapshot || 'N/A'})
              </div>
              <div className="text-stone-500">
                Amount: <strong className="text-emerald-700 dark:text-amber-400">{formatPrice(order.total)}</strong> ({order.payment_status})
              </div>
            </div>

            <div className="space-y-2">
              {/* WhatsApp Share Button */}
              <button
                type="button"
                onClick={handleSendWhatsAppUpdate}
                className="w-full py-3 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs rounded-2xl shadow-md flex items-center justify-center gap-2 transition cursor-pointer"
              >
                <MessageSquare className="w-4 h-4" /> Share Direct to Customer WhatsApp
              </button>

              {/* Copy Link Button */}
              <button
                type="button"
                onClick={handleCopyInvoiceLink}
                className="w-full py-3 px-4 bg-stone-100 hover:bg-stone-200 dark:bg-stone-800 dark:hover:bg-stone-700 text-stone-800 dark:text-white font-bold text-xs rounded-2xl border border-stone-300 dark:border-stone-700 flex items-center justify-center gap-2 transition cursor-pointer"
              >
                {copiedLink ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                <span>{copiedLink ? 'Invoice Link Copied!' : 'Copy Customer Tracking & Invoice Link'}</span>
              </button>

              {/* Native System Share */}
              {typeof navigator !== 'undefined' && !!navigator.share && (
                <button
                  type="button"
                  onClick={handleNativeShare}
                  className="w-full py-3 px-4 bg-teal-800 hover:bg-teal-900 text-white font-bold text-xs rounded-2xl flex items-center justify-center gap-2 transition cursor-pointer"
                >
                  <Share2 className="w-4 h-4" /> System Share Sheet
                </button>
              )}
            </div>

            <div className="pt-2 text-center">
              <button
                type="button"
                onClick={() => setIsShareModalOpen(false)}
                className="px-5 py-2 text-xs font-bold text-stone-500 hover:text-stone-800 dark:hover:text-stone-300"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* COMPREHENSIVE EDIT ORDER, INVOICE & COURIER MODAL */}
      {isEditModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-950/75 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white dark:bg-stone-900 rounded-3xl max-w-4xl w-full max-h-[92vh] overflow-y-auto shadow-2xl border border-stone-200 dark:border-stone-800 p-6 sm:p-8 space-y-6 animate-scaleUp">
            
            <div className="flex items-center justify-between border-b border-stone-100 dark:border-stone-800 pb-4">
              <div>
                <h3 className="text-xl font-black text-stone-900 dark:text-white flex items-center gap-2">
                  <Edit3 className="w-5 h-5 text-emerald-700 dark:text-emerald-400" />
                  Edit Order, Courier & Invoice (#INV-{order.order_number})
                </h3>
                <p className="text-xs text-stone-500 font-bold mt-0.5">
                  Update customer details, items, pricing, payment status (Paid/Unpaid stamp), or courier tracking
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsEditModalOpen(false)}
                className="text-stone-400 hover:text-stone-600 dark:hover:text-stone-200 p-1 rounded-xl"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <form onSubmit={handleSaveAllOrderEdits} className="space-y-6">
              
              {/* SECTION 1: CUSTOMER & DESTINATION */}
              <div className="space-y-3">
                <h4 className="text-xs font-black uppercase tracking-wider text-emerald-900 dark:text-emerald-400 flex items-center gap-1.5">
                  <User className="w-4 h-4" /> 1. Customer & Delivery Destination
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-stone-700 dark:text-stone-300 mb-1">
                      Customer Full Name
                    </label>
                    <input
                      type="text"
                      value={editForm.customer_name_snapshot}
                      onChange={(e) => setEditForm(prev => ({ ...prev, customer_name_snapshot: e.target.value }))}
                      className="w-full p-3 bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-2xl font-bold text-xs text-stone-900 dark:text-white outline-none focus:ring-2 focus:ring-emerald-600"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-stone-700 dark:text-stone-300 mb-1">
                      Customer Phone Number
                    </label>
                    <input
                      type="text"
                      value={editForm.customer_phone_snapshot}
                      onChange={(e) => setEditForm(prev => ({ ...prev, customer_phone_snapshot: e.target.value }))}
                      className="w-full p-3 bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-2xl font-mono font-bold text-xs text-stone-900 dark:text-white outline-none focus:ring-2 focus:ring-emerald-600"
                      required
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-xs font-bold text-stone-700 dark:text-stone-300 mb-1">
                      Delivery Full Address
                    </label>
                    <textarea
                      rows={2}
                      value={editForm.delivery_address}
                      onChange={(e) => setEditForm(prev => ({ ...prev, delivery_address: e.target.value }))}
                      className="w-full p-3 bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-2xl font-medium text-xs text-stone-900 dark:text-white outline-none focus:ring-2 focus:ring-emerald-600"
                      placeholder="Door No, Street Name, Area, City, State - PINCODE"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-stone-700 dark:text-stone-300 mb-1">
                      City / Area / Town
                    </label>
                    <input
                      type="text"
                      value={editForm.delivery_area}
                      onChange={(e) => setEditForm(prev => ({ ...prev, delivery_area: e.target.value }))}
                      className="w-full p-3 bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-2xl font-bold text-xs text-stone-900 dark:text-white outline-none focus:ring-2 focus:ring-emerald-600"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-stone-700 dark:text-stone-300 mb-1">
                      Order Lifecycle Status
                    </label>
                    <select
                      value={editForm.status}
                      onChange={(e) => setEditForm(prev => ({ ...prev, status: e.target.value as OrderStatus }))}
                      className="w-full p-3 bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-2xl font-bold text-xs text-stone-900 dark:text-white outline-none focus:ring-2 focus:ring-emerald-600"
                    >
                      {ALL_ORDER_STATUSES.map(s => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* SECTION 2: PAYMENT & INVOICE STAMP TOGGLE */}
              <div className="space-y-3 pt-3 border-t border-stone-100 dark:border-stone-800">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-black uppercase tracking-wider text-emerald-900 dark:text-emerald-400 flex items-center gap-1.5">
                    <DollarSign className="w-4 h-4" /> 2. Payment & Invoice Stamp
                  </h4>
                  <span className={`text-[11px] font-black uppercase px-2.5 py-0.5 rounded-full ${
                    editForm.payment_status === 'PAID'
                      ? 'bg-emerald-100 text-emerald-900 border border-emerald-300'
                      : 'bg-rose-100 text-rose-900 border border-rose-300'
                  }`}>
                    Stamp on Bill: {editForm.payment_status === 'PAID' ? '✓ PAID (Green Stamp)' : 'UNPAID (Red Stamp)'}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-stone-700 dark:text-stone-300 mb-1">
                      Payment Method
                    </label>
                    <select
                      value={editForm.payment_method}
                      onChange={(e) => setEditForm(prev => ({ ...prev, payment_method: e.target.value as PaymentMethod }))}
                      className="w-full p-3 bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-2xl font-bold text-xs text-stone-900 dark:text-white outline-none focus:ring-2 focus:ring-emerald-600"
                    >
                      <option value="UPI">UPI / GPay / PhonePe</option>
                      <option value="CASH">Cash on Delivery (COD)</option>
                      <option value="CARD">Debit / Credit Card</option>
                      <option value="BANK">Direct Bank Transfer</option>
                      <option value="OTHER">Other Mode</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-stone-700 dark:text-stone-300 mb-1">
                      Payment Status (Controls PAID/UNPAID Rubber Stamp)
                    </label>
                    <select
                      value={editForm.payment_status}
                      onChange={(e) => setEditForm(prev => ({ ...prev, payment_status: e.target.value as PaymentStatus }))}
                      className="w-full p-3 bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-2xl font-bold text-xs text-stone-900 dark:text-white outline-none focus:ring-2 focus:ring-emerald-600"
                    >
                      <option value="PAID">PAID (Displays Official Green PAID Stamp)</option>
                      <option value="PENDING">PENDING (Displays Red UNPAID Stamp)</option>
                      <option value="PARTIAL">PARTIAL (Displays Red UNPAID Stamp)</option>
                      <option value="REFUNDED">REFUNDED</option>
                      <option value="FAILED">FAILED</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* SECTION 3: COURIER & AWB INFO */}
              <div className="space-y-3 pt-3 border-t border-stone-100 dark:border-stone-800">
                <h4 className="text-xs font-black uppercase tracking-wider text-emerald-900 dark:text-emerald-400 flex items-center gap-1.5">
                  <Truck className="w-4 h-4" /> 3. Courier Logistics & Parcel Weight
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-bold text-stone-700 dark:text-stone-300 mb-1">
                      Courier Partner
                    </label>
                    <select
                      value={editForm.courier_partner}
                      onChange={(e) => setEditForm(prev => ({ ...prev, courier_partner: e.target.value }))}
                      className="w-full p-3 bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-2xl font-bold text-xs text-stone-900 dark:text-white outline-none focus:ring-2 focus:ring-emerald-600"
                    >
                      {COURIER_PARTNERS.map(cp => (
                        <option key={cp.name} value={cp.name}>
                          {cp.name} ({cp.badge})
                        </option>
                      ))}
                      <option value="Direct Express Runner">Local Store Runner (Same Day)</option>
                    </select>
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-xs font-bold text-stone-700 dark:text-stone-300 mb-1">
                      AWB / Tracking Docket Number
                    </label>
                    <input
                      type="text"
                      value={editForm.tracking_number}
                      onChange={(e) => setEditForm(prev => ({ ...prev, tracking_number: e.target.value }))}
                      placeholder="e.g. STC123456789"
                      className="w-full p-3 bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-2xl font-mono font-bold text-xs text-stone-900 dark:text-white outline-none focus:ring-2 focus:ring-emerald-600"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-stone-700 dark:text-stone-300 mb-1">
                      Weight (Grams)
                    </label>
                    <input
                      type="number"
                      value={editForm.weight_grams}
                      onChange={(e) => setEditForm(prev => ({ ...prev, weight_grams: Number(e.target.value) }))}
                      className="w-full p-3 bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-2xl font-mono font-bold text-xs text-stone-900 dark:text-white outline-none focus:ring-2 focus:ring-emerald-600"
                    />
                  </div>

                  <div className="sm:col-span-3">
                    <label className="block text-xs font-bold text-stone-700 dark:text-stone-300 mb-1">
                      Expected Delivery Date
                    </label>
                    <input
                      type="date"
                      value={editForm.expected_delivery_date}
                      onChange={(e) => setEditForm(prev => ({ ...prev, expected_delivery_date: e.target.value }))}
                      className="w-full p-3 bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-2xl font-bold text-xs text-stone-900 dark:text-white outline-none focus:ring-2 focus:ring-emerald-600"
                    />
                  </div>
                </div>
              </div>

              {/* SECTION 4: LINE ITEMS & ADD NEW PRODUCTS */}
              <div className="space-y-3 pt-3 border-t border-stone-100 dark:border-stone-800">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-black uppercase tracking-wider text-emerald-900 dark:text-emerald-400 flex items-center gap-1.5">
                    <Package className="w-4 h-4" /> 4. Order Line Items ({editForm.items.length})
                  </h4>
                  <span className="text-xs text-stone-500 font-bold">
                    Adjust quantity, rate, or add products
                  </span>
                </div>

                {/* Items Table in Modal */}
                <div className="border border-stone-200 dark:border-stone-700 rounded-2xl overflow-hidden">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-300 font-black uppercase text-[10px]">
                      <tr>
                        <th className="p-2.5">Item Description</th>
                        <th className="p-2.5 text-center w-24">Qty</th>
                        <th className="p-2.5 text-right w-28">Rate (₹)</th>
                        <th className="p-2.5 text-right w-28">Total (₹)</th>
                        <th className="p-2.5 text-center w-12">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-stone-100 dark:divide-stone-800">
                      {editForm.items.map((it, idx) => (
                        <tr key={it.id || idx}>
                          <td className="p-2.5 font-bold text-stone-900 dark:text-white">
                            <div>{it.product_name_snapshot}</div>
                            {it.pack_size_snapshot && (
                              <div className="text-[10px] text-stone-400 font-normal">Pack: {it.pack_size_snapshot}</div>
                            )}
                          </td>
                          <td className="p-2.5 text-center">
                            <input
                              type="number"
                              min={1}
                              value={it.quantity}
                              onChange={(e) => handleItemQtyChange(idx, Number(e.target.value))}
                              className="w-16 p-1.5 text-center font-bold font-mono border border-stone-300 dark:border-stone-600 rounded-lg bg-white dark:bg-stone-800 text-stone-900 dark:text-white text-xs"
                            />
                          </td>
                          <td className="p-2.5 text-right">
                            <input
                              type="number"
                              value={it.unit_price_snapshot}
                              onChange={(e) => handleItemPriceChange(idx, Number(e.target.value))}
                              className="w-20 p-1.5 text-right font-bold font-mono border border-stone-300 dark:border-stone-600 rounded-lg bg-white dark:bg-stone-800 text-stone-900 dark:text-white text-xs"
                            />
                          </td>
                          <td className="p-2.5 text-right font-black font-mono text-emerald-800 dark:text-emerald-300">
                            {formatPrice(it.total)}
                          </td>
                          <td className="p-2.5 text-center">
                            <button
                              type="button"
                              onClick={() => handleRemoveItem(idx)}
                              className="p-1 rounded-lg hover:bg-rose-100 text-rose-600 transition cursor-pointer"
                              title="Delete Item"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Add New Item Panel */}
                <div className="p-3 bg-stone-50 dark:bg-stone-800/60 rounded-2xl border border-stone-200 dark:border-stone-700 space-y-2">
                  <div className="text-xs font-black text-stone-700 dark:text-stone-300">
                    + Add Product from Catalog or Custom Item
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-12 gap-2">
                    <div className="sm:col-span-6">
                      <select
                        value={selectedProductToAdd}
                        onChange={(e) => setSelectedProductToAdd(e.target.value)}
                        className="w-full p-2.5 bg-white dark:bg-stone-800 border border-stone-300 dark:border-stone-600 rounded-xl font-bold text-xs text-stone-900 dark:text-white"
                      >
                        <option value="">Select from catalog...</option>
                        {products.map(p => (
                          <option key={p.id} value={p.id}>
                            {p.name} — {formatPrice(p.offer_price || p.selling_price)} ({p.pack_size || '1 Kg'})
                          </option>
                        ))}
                      </select>
                    </div>

                    {!selectedProductToAdd && (
                      <div className="sm:col-span-3">
                        <input
                          type="text"
                          value={customItemName}
                          onChange={(e) => setCustomItemName(e.target.value)}
                          placeholder="Or Custom Item Name"
                          className="w-full p-2.5 bg-white dark:bg-stone-800 border border-stone-300 dark:border-stone-600 rounded-xl font-bold text-xs"
                        />
                      </div>
                    )}

                    {!selectedProductToAdd && (
                      <div className="sm:col-span-3">
                        <input
                          type="number"
                          value={customItemPrice || ''}
                          onChange={(e) => setCustomItemPrice(Number(e.target.value))}
                          placeholder="Price ₹"
                          className="w-full p-2.5 bg-white dark:bg-stone-800 border border-stone-300 dark:border-stone-600 rounded-xl font-mono font-bold text-xs"
                        />
                      </div>
                    )}

                    <div className="sm:col-span-2">
                      <input
                        type="number"
                        min={1}
                        value={customItemQty}
                        onChange={(e) => setCustomItemQty(Number(e.target.value))}
                        placeholder="Qty"
                        className="w-full p-2.5 bg-white dark:bg-stone-800 border border-stone-300 dark:border-stone-600 rounded-xl font-mono font-bold text-xs text-center"
                      />
                    </div>

                    <div className="sm:col-span-4">
                      <button
                        type="button"
                        onClick={handleAddProductItem}
                        className="w-full py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs rounded-xl transition cursor-pointer flex items-center justify-center gap-1"
                      >
                        <Plus className="w-4 h-4" /> Add Item to Order
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* SECTION 5: DELIVERY FEE, DISCOUNT & GRAND TOTAL */}
              <div className="space-y-3 pt-3 border-t border-stone-100 dark:border-stone-800">
                <h4 className="text-xs font-black uppercase tracking-wider text-emerald-900 dark:text-emerald-400 flex items-center gap-1.5">
                  <DollarSign className="w-4 h-4" /> 5. Delivery Fee, Discounts & Grand Total
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-stone-700 dark:text-stone-300 mb-1">
                      Subtotal (₹)
                    </label>
                    <input
                      type="number"
                      value={editForm.subtotal}
                      readOnly
                      className="w-full p-3 bg-stone-100 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-2xl font-mono font-bold text-xs text-stone-700 dark:text-stone-300 cursor-not-allowed"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-stone-700 dark:text-stone-300 mb-1">
                      Courier Delivery Fee (₹)
                    </label>
                    <input
                      type="number"
                      value={editForm.delivery_fee}
                      onChange={(e) => {
                        const fee = Number(e.target.value || 0);
                        const { subtotal, total } = recalcTotals(editForm.items, fee, editForm.discount);
                        setEditForm(prev => ({ ...prev, delivery_fee: fee, subtotal, total }));
                      }}
                      className="w-full p-3 bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-2xl font-mono font-bold text-xs text-stone-900 dark:text-white outline-none focus:ring-2 focus:ring-emerald-600"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-stone-700 dark:text-stone-300 mb-1">
                      Discount (₹)
                    </label>
                    <input
                      type="number"
                      value={editForm.discount}
                      onChange={(e) => {
                        const disc = Number(e.target.value || 0);
                        const { subtotal, total } = recalcTotals(editForm.items, editForm.delivery_fee, disc);
                        setEditForm(prev => ({ ...prev, discount: disc, subtotal, total }));
                      }}
                      className="w-full p-3 bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-2xl font-mono font-bold text-xs text-stone-900 dark:text-white outline-none focus:ring-2 focus:ring-emerald-600"
                    />
                  </div>
                </div>

                <div className="p-4 bg-emerald-900 text-white rounded-2xl flex items-center justify-between">
                  <span className="font-black text-sm uppercase">Calculated Grand Total:</span>
                  <span className="font-mono font-black text-2xl text-amber-300">
                    {formatPrice(editForm.total)}
                  </span>
                </div>
              </div>

              {/* SAVE OR CANCEL BUTTONS */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-stone-200 dark:border-stone-800">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="px-6 py-3 rounded-2xl border border-stone-200 dark:border-stone-700 font-bold text-xs text-stone-700 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800 transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-7 py-3 bg-emerald-800 hover:bg-emerald-900 text-white font-black text-xs rounded-2xl shadow-lg shadow-emerald-900/30 flex items-center gap-2 transition cursor-pointer"
                >
                  <Save className="w-4 h-4" /> Save All Changes to Order & Invoice
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* 3D Animated "Are you sure? (Yes / No)" Confirmation Popup Modal */}
      {confirmModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-950/70 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white dark:bg-stone-900 rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl border border-stone-200 dark:border-stone-800 space-y-5 animate-scaleUp">
            <div className="flex items-center gap-3">
              <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${
                confirmModal.variant === 'danger'
                  ? 'bg-rose-100 text-rose-600 dark:bg-rose-950/60 dark:text-rose-400'
                  : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400'
              }`}>
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-black text-stone-900 dark:text-white">
                  {confirmModal.title}
                </h3>
                <p className="text-xs text-stone-500 font-bold uppercase tracking-wider">
                  Confirmation Required
                </p>
              </div>
            </div>

            <p className="text-xs text-stone-600 dark:text-stone-300 leading-relaxed font-medium">
              {confirmModal.message}
            </p>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
                className="px-5 py-2.5 rounded-2xl border border-stone-200 dark:border-stone-700 font-bold text-xs text-stone-700 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800 transition cursor-pointer"
              >
                No, Cancel
              </button>
              <button
                type="button"
                onClick={async () => {
                  setConfirmModal(prev => ({ ...prev, isOpen: false }));
                  await confirmModal.action();
                }}
                className={`px-5 py-2.5 rounded-2xl font-black text-xs text-white shadow-md transition flex items-center gap-1.5 cursor-pointer ${
                  confirmModal.variant === 'danger'
                    ? 'bg-rose-600 hover:bg-rose-700 shadow-rose-600/30'
                    : 'bg-emerald-700 hover:bg-emerald-800 shadow-emerald-700/30'
                }`}
              >
                <Check className="w-4 h-4" /> {confirmModal.confirmText}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
