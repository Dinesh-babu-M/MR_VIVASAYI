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
  Scale
} from 'lucide-react';
import type { Order, OrderStatus, Product, Customer } from '../../types';
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

export default function AdminOrderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [savingCourier, setSavingCourier] = useState(false);

  // Courier Form State
  const [courierPartner, setCourierPartner] = useState('ST Courier');
  const [trackingNumber, setTrackingNumber] = useState('');
  const [trackingUrl, setTrackingUrl] = useState('');
  const [weightGrams, setWeightGrams] = useState<number>(1000);
  const [expectedDate, setExpectedDate] = useState('');

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

  const loadOrder = async () => {
    if (!id) return;
    setLoading(true);
    try {
      const orders = await getJSONStore<Order>('orders');
      const found = orders.find(o => o.id === id || o.order_number === id);
      if (found) {
        setOrder(found);
        setCourierPartner(found.courier_partner || 'ST Courier');
        setTrackingNumber(found.tracking_number || '');
        setTrackingUrl(found.tracking_url || '');
        setWeightGrams(found.weight_grams || 1000);
        setExpectedDate(found.expected_delivery_date || '');
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
    loadOrder();
  }, [id]);

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

  // Save Courier Details
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
          // If active order, restore stock
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
      `🌿 *MR. VIVASAYI Mart - Order Update*\n\n` +
      `Hello ${order.customer_name_snapshot || 'Valued Customer'},\n` +
      `Your Order *#${order.order_number}* is now *${order.status}*!\n\n` +
      `📦 *Courier Partner:* ${partner}\n` +
      `🏷️ *AWB Docket:* ${tracking}\n` +
      `💰 *Total Amount:* ${formatPrice(order.total)} (${order.payment_status})\n\n` +
      `🚚 *Live Website Tracking Link:*\n${storeLink}\n\n` +
      `Thank you for choosing pure, natural agro produce!\n` +
      `*MR. VIVASAYI Mart* - Ph: ${STORE_PHONE}`
    );

    window.open(`https://wa.me/${cleanPhone}?text=${text}`, '_blank');
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
          </div>

          <div className="text-xs text-emerald-200 flex flex-wrap items-center gap-3">
            <span className="flex items-center gap-1">
              <Clock className="w-3.5 h-3.5 text-amber-300" /> Placed {formatDateTime(order.created_at)}
            </span>
            <span>•</span>
            <span className="text-amber-200 font-bold">Total: {formatPrice(order.total)}</span>
          </div>
        </div>

        {/* Top Action Buttons (Amazon Invoice, Courier Label, WhatsApp) */}
        <div className="flex flex-wrap items-center gap-2 relative z-10 w-full sm:w-auto">
          {/* Print Amazon / Flipkart Standard Invoice */}
          <button
            onClick={() => printAmazonFlipkartInvoices(order)}
            className="flex-1 sm:flex-none px-4 py-2.5 bg-white text-emerald-950 hover:bg-emerald-50 rounded-2xl font-black text-xs shadow-md flex items-center justify-center gap-1.5 transition-all transform hover:-translate-y-0.5 active:translate-y-0"
            title="Print eCommerce Tax Invoice (Amazon / Flipkart Format)"
          >
            <Printer className="w-4 h-4 text-emerald-800" /> Print Tax Invoice
          </button>

          {/* Print Courier Parcel Shipping Label */}
          <button
            onClick={() => printAmazonFlipkartCourierLabels(order, courierPartner)}
            className="flex-1 sm:flex-none px-4 py-2.5 bg-amber-400 hover:bg-amber-300 text-stone-950 rounded-2xl font-black text-xs shadow-md shadow-amber-400/30 flex items-center justify-center gap-1.5 transition-all transform hover:-translate-y-0.5 active:translate-y-0"
            title="Print Courier Shipping Parcel Label (Amazon / Flipkart Box Sticker)"
          >
            <Truck className="w-4 h-4 text-stone-950" /> Print Courier Label
          </button>

          {/* WhatsApp Update */}
          <button
            onClick={handleSendWhatsAppUpdate}
            className="p-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-2xl shadow-md transition-all flex items-center justify-center"
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
            className="p-2.5 bg-rose-900/60 hover:bg-rose-800 text-rose-200 rounded-2xl border border-rose-700/50 shadow-md transition-all flex items-center justify-center"
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
                  className="flex-1 py-3 bg-emerald-800 hover:bg-emerald-900 text-white rounded-2xl font-black text-xs shadow-md shadow-emerald-900/20 flex items-center justify-center gap-1.5 transition disabled:opacity-50"
                >
                  <Save className="w-4 h-4" /> {savingCourier ? 'Saving...' : 'Save Logistics Docket'}
                </button>
                <button
                  type="button"
                  onClick={() => printAmazonFlipkartCourierLabels(order, courierPartner)}
                  className="px-4 py-3 bg-amber-400 hover:bg-amber-300 text-stone-950 rounded-2xl font-black text-xs shadow-md shadow-amber-400/20 flex items-center gap-1.5 transition"
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
              <Link
                to={order.customer_id ? `/admin/customers/${order.customer_id}` : `/admin/customers/${order.customer_phone_snapshot || ''}`}
                className="text-xs font-black text-emerald-700 dark:text-amber-400 hover:underline flex items-center gap-1"
              >
                View Full Profile ↗
              </Link>
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
                    className="p-2.5 rounded-xl border border-stone-200 dark:border-stone-700 text-stone-700 dark:text-stone-300 font-bold flex items-center justify-center gap-1.5 hover:bg-stone-50 transition"
                  >
                    <Phone className="w-3.5 h-3.5 text-emerald-600" /> Call Customer
                  </a>
                  <button
                    onClick={handleSendWhatsAppUpdate}
                    className="p-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold flex items-center justify-center gap-1.5 transition"
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
              {order.delivery_address && (
                <a
                  href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(order.delivery_address)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs font-bold text-emerald-700 dark:text-amber-400 hover:underline flex items-center gap-1"
                >
                  Google Maps ↗
                </a>
              )}
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
              <span className="text-xs font-bold text-stone-500">
                {(order.items || []).reduce((acc, i) => acc + (i.quantity || 1), 0)} total units
              </span>
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
              <span className={`px-2.5 py-1 rounded-full text-xs font-black uppercase ${
                order.payment_status === 'PAID'
                  ? 'bg-emerald-100 text-emerald-900 border border-emerald-300'
                  : 'bg-amber-100 text-amber-900 border border-amber-300'
              }`}>
                {order.payment_method} • {order.payment_status}
              </span>
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
                  <div className="text-[10px] text-stone-400">Inclusive of all farm taxes & delivery</div>
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
                className="flex-1 py-3 bg-emerald-800 hover:bg-emerald-900 text-white font-black text-xs rounded-2xl shadow-md shadow-emerald-900/20 flex items-center justify-center gap-1.5 transition"
              >
                <FileText className="w-4 h-4" /> Print Amazon / Flipkart Invoice
              </button>
              <button
                onClick={() => printAmazonFlipkartCourierLabels(order, courierPartner)}
                className="flex-1 py-3 bg-amber-400 hover:bg-amber-300 text-stone-950 font-black text-xs rounded-2xl shadow-md shadow-amber-400/20 flex items-center justify-center gap-1.5 transition"
              >
                <Printer className="w-4 h-4" /> Print Courier Shipping Sticker
              </button>
            </div>
          </div>
        </div>
      </div>

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
                className="px-5 py-2.5 rounded-2xl border border-stone-200 dark:border-stone-700 font-bold text-xs text-stone-700 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800 transition"
              >
                No, Cancel
              </button>
              <button
                type="button"
                onClick={async () => {
                  setConfirmModal(prev => ({ ...prev, isOpen: false }));
                  await confirmModal.action();
                }}
                className={`px-5 py-2.5 rounded-2xl font-black text-xs text-white shadow-md transition flex items-center gap-1.5 ${
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
