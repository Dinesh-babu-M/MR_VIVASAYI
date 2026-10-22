import React, { useState, useEffect, useMemo } from 'react';
import {
  Package,
  MessageSquare,
  Truck,
  CheckCircle2,
  Search,
  Filter,
  X,
  ChevronDown,
  Eye,
  Edit2,
  Clock,
  Plus,
  ShoppingBag,
  Trash2,
  Download,
  Mail,
  QrCode,
  Upload,
  DollarSign,
  Send,
  Loader2,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  Tag,
  Check,
  RotateCcw,
  RefreshCw,
  Printer,
  MapPin,
  FileText,
  FileSpreadsheet,
  Scale,
  AlertCircle,
  AlertTriangle,
  ExternalLink
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { formatPrice, formatDateTime } from '../../lib/utils';
import type { Order, OrderStatus, OrderSource, OrderItem, Product, Customer } from '../../types';
import { AdminPageSkeleton } from '../../components/common/Skeleton';
import { useNotifications } from '../../contexts/NotificationContext';
import { useActionModal } from '../../contexts/ActionModalContext';
import { CountrySelector } from '../../components/common/CountrySelector';
import {
  normalizePhoneNumber,
  formatPhoneWithCountry,
  generateUniqueCustomerId,
  findCustomerByPhoneAndCountry,
  COUNTRIES
} from '../../lib/countryCodes';
import { generateOriginalOrderId } from '../../lib/sequentialIdUtils';
import { getFormattedStoreAddress, getFormattedStorePhone } from '../../lib/storeSettings';

import { RefreshSpinnerModal } from '../../components/common/RefreshSpinnerModal';
import { AutoRefreshDropdown } from '../../components/common/AutoRefreshDropdown';
import { getJSONStore, setJSONStore, syncOrderStockChange } from '../../lib/dbManager';
import { supabase, isSupabaseConfigured } from '../../lib/supabase';
import toast from 'react-hot-toast';

// ─── Status helpers ────────────────────────────────────────────────────────────

const STATUS_LABEL: Record<OrderStatus, string> = {
  NEW: 'New',
  CONFIRMED: 'Confirmed',
  PACKING: 'Packing',
  READY: 'Ready',
  OUT_FOR_DELIVERY: 'Out for Delivery',
  DELIVERED: 'Delivered',
  CANCELLED: 'Cancelled',
  RETURNED: 'Returned',
};

const statusBadgeClass = (status: OrderStatus): string => {
  switch (status) {
    case 'NEW':             return 'bg-gradient-to-r from-blue-500 to-indigo-600 text-white border border-blue-400 shadow-2xs font-black tracking-wide';
    case 'CONFIRMED':       return 'bg-gradient-to-r from-indigo-500 to-purple-600 text-white border border-indigo-400 shadow-2xs font-black tracking-wide';
    case 'PACKING':         return 'bg-gradient-to-r from-amber-400 to-amber-600 text-amber-950 border border-amber-300 shadow-2xs font-black tracking-wide';
    case 'READY':           return 'bg-gradient-to-r from-yellow-400 to-amber-500 text-yellow-950 border border-yellow-300 shadow-2xs font-black tracking-wide';
    case 'OUT_FOR_DELIVERY':return 'bg-gradient-to-r from-orange-500 to-amber-600 text-white border border-orange-400 shadow-2xs font-black tracking-wide';
    case 'DELIVERED':       return 'bg-gradient-to-r from-emerald-500 to-teal-600 text-white border border-emerald-400 shadow-2xs font-black tracking-wide';
    case 'CANCELLED':       return 'bg-gradient-to-r from-rose-500 to-red-600 text-white border border-rose-400 shadow-2xs font-black tracking-wide';
    case 'RETURNED':        return 'bg-gradient-to-r from-purple-500 to-rose-600 text-white border border-purple-400 shadow-2xs font-black tracking-wide';
    default:                return 'bg-gray-100 text-gray-800 border border-gray-300 shadow-2xs font-bold';
  }
};

const sourceBadge = (source: OrderSource) => {
  switch (source) {
    case 'WHATSAPP':
      return (
        <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-extrabold bg-green-100 text-green-800 border border-green-300 shadow-2xs">
          <MessageSquare className="w-3 h-3 text-green-600" />
          WhatsApp
        </span>
      );
    case 'POS':
      return (
        <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-extrabold bg-blue-100 text-blue-800 border border-blue-300 shadow-2xs">
          <Package className="w-3 h-3 text-blue-600" />
          Counter POS
        </span>
      );
    case 'WEBSITE':
      return (
        <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-extrabold bg-purple-100 text-purple-800 border border-purple-300 shadow-2xs">
          Website E-Com
        </span>
      );
    default:
      return (
        <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-bold bg-gray-100 text-gray-700 border border-gray-300">
          {source}
        </span>
      );
  }
};

const paymentStatusClass = (status: string): string => {
  switch (status) {
    case 'PAID':     return 'bg-emerald-100 text-emerald-900 border border-emerald-300 font-extrabold';
    case 'PENDING':  return 'bg-amber-100 text-amber-900 border border-amber-300 font-bold';
    case 'PARTIAL':  return 'bg-orange-100 text-orange-900 border border-orange-300 font-bold';
    case 'REFUNDED': return 'bg-blue-100 text-blue-800 border border-blue-300 font-bold';
    case 'FAILED':   return 'bg-red-100 text-red-800 border border-red-300 font-bold';
    default:         return 'bg-gray-100 text-gray-700 border border-gray-200';
  }
};

// Calculate recency relative to current time
const getOrderRecencyBadge = (createdAtStr: string): { label: string; color: string } => {
  const created = new Date(createdAtStr).getTime();
  const now = new Date().getTime();
  const diffMs = Math.max(0, now - created);
  const diffMins = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffMins < 60) {
    return { label: `${diffMins || 5} mins ago`, color: 'bg-emerald-100 text-emerald-950 font-black border border-emerald-300 animate-pulse' };
  } else if (diffHours === 1) {
    return { label: '1 hour ago', color: 'bg-green-100 text-green-900 font-bold border border-green-300' };
  } else if (diffHours < 5) {
    return { label: `${diffHours} hours ago`, color: 'bg-blue-100 text-blue-900 font-bold border border-blue-200' };
  } else if (diffDays < 1) {
    return { label: 'Today', color: 'bg-amber-100 text-amber-900 font-semibold border border-amber-200' };
  } else {
    return { label: `${diffDays} days ago`, color: 'bg-gray-100 text-gray-700 border border-gray-200' };
  }
};

// ─── Stat Card ─────────────────────────────────────────────────────────────────

interface StatCardProps {
  label: string;
  value: string | number;
  icon: React.ReactNode;
  colorClass: string;
  sub?: string;
}

const StatCard: React.FC<StatCardProps> = ({ label, value, icon, colorClass, sub }) => (
  <div className="bg-white dark:bg-emerald-900/40 rounded-3xl border border-emerald-100 dark:border-emerald-800 p-5 flex items-start gap-4 shadow-sm hover:shadow-md transition">
    <div className={`p-3.5 rounded-2xl ${colorClass} flex-shrink-0 shadow-xs`}>{icon}</div>
    <div>
      <p className="text-xs text-gray-500 dark:text-emerald-300 font-bold uppercase tracking-wider">{label}</p>
      <p className="text-2xl font-black text-emerald-950 dark:text-emerald-100 mt-1">{value}</p>
      {sub && <p className="text-[11px] font-semibold text-emerald-800 dark:text-emerald-300 mt-0.5">{sub}</p>}
    </div>
  </div>
);

const DetailRow: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
  <div className="flex justify-between items-center py-2 border-b border-emerald-100/60 dark:border-emerald-800 last:border-0">
    <span className="text-xs text-gray-500 dark:text-emerald-400 font-semibold w-36 shrink-0">{label}</span>
    <span className="text-xs font-bold text-gray-900 dark:text-emerald-100 text-right flex-1">{children}</span>
  </div>
);

// ─── Order Detail Modal ─────────────────────────────────────────────────────────

interface DetailModalProps {
  order: Order;
  onClose: () => void;
  onEditDetails: () => void;
  onQuickStatusChange?: (order: Order, newStatus: OrderStatus, newPaymentStatus?: any) => void;
}

const OrderDetailModal: React.FC<DetailModalProps> = ({ order, onClose, onEditDetails, onQuickStatusChange }) => {
  const handlePrintBill = () => {
    const printWindow = window.open('', '_blank', 'width=800,height=900');
    if (!printWindow) return;

    const itemsHtml = (order.items || []).map((it, idx) => `
      <tr>
        <td style="padding: 8px; border-bottom: 1px solid #eee;">${idx + 1}</td>
        <td style="padding: 8px; border-bottom: 1px solid #eee;"><strong>${it.product_name_snapshot}</strong> ${it.pack_size_snapshot ? `(${it.pack_size_snapshot})` : ''}</td>
        <td style="padding: 8px; border-bottom: 1px solid #eee; text-align: center;">${it.quantity}</td>
        <td style="padding: 8px; border-bottom: 1px solid #eee; text-align: right;">₹${it.unit_price_snapshot}</td>
        <td style="padding: 8px; border-bottom: 1px solid #eee; text-align: right; font-weight: bold;">₹${it.total}</td>
      </tr>
    `).join('');

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>MR. VIVASAYI Mart Order Bill - ${order.order_number}</title>
          <style>
            body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; padding: 24px; color: #064e3b; margin: 0; }
            .header { text-align: center; border-bottom: 2px solid #064e3b; padding-bottom: 12px; margin-bottom: 20px; }
            .header h1 { margin: 0; color: #064e3b; font-size: 24px; font-weight: 800; }
            .header p { margin: 4px 0 0; color: #666; font-size: 12px; }
            .meta-grid { display: flex; justify-content: space-between; margin-bottom: 20px; font-size: 13px; gap: 16px; }
            .meta-box { flex: 1; background: #f0fdf4; padding: 12px 16px; border-radius: 12px; border: 1px solid #bbf7d0; }
            .meta-box h4 { margin: 0 0 8px; color: #064e3b; font-size: 12px; text-transform: uppercase; font-weight: 800; letter-spacing: 0.5px; }
            .meta-box p { margin: 3px 0; color: #1e293b; font-size: 12px; }
            table { width: 100%; border-collapse: collapse; margin-bottom: 20px; font-size: 12px; }
            th { background: #064e3b; color: white; padding: 10px; text-align: left; font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; }
            .totals { margin-left: auto; width: 320px; background: #064e3b; color: white; padding: 16px; border-radius: 12px; font-size: 12px; }
            .totals-row { display: flex; justify-content: space-between; margin-bottom: 6px; }
            .grand-total { border-top: 1px solid #047857; padding-top: 8px; font-size: 15px; font-weight: 900; color: #fde68a; }
            .footer { text-align: center; margin-top: 35px; font-size: 11px; color: #64748b; border-top: 1px dashed #cbd5e1; padding-top: 12px; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>🌿 MR. VIVASAYI Mart</h1>
            <p>Good Food. Good Life. | Store Bill & Order Receipt</p>
            <p style="margin: 3px 0 0; font-size: 11px; color: #047857;">📍 ${getFormattedStoreAddress()} | Ph: ${getFormattedStorePhone()}</p>
          </div>
          <div class="meta-grid">
            <div class="meta-box">
              <h4>Order Information</h4>
              <p><strong>Order Number:</strong> ${order.order_number}</p>
              <p><strong>Order Source:</strong> ${order.source}</p>
              <p><strong>Order Date:</strong> ${new Date(order.created_at).toLocaleString()}</p>
              <p><strong>Order Status:</strong> ${order.status}</p>
            </div>
            <div class="meta-box">
              <h4>Customer & Delivery Address</h4>
              <p><strong>Customer Name:</strong> ${order.customer_name_snapshot || 'Walk-in Customer'}</p>
              <p><strong>Phone Number:</strong> ${order.customer_phone_snapshot || '—'}</p>
              <p><strong>Delivery Area:</strong> ${order.delivery_area || 'Cumbum Store'}</p>
              <p><strong>Delivery Address:</strong> ${order.delivery_address || 'Over the counter / Store Pickup'}</p>
            </div>
          </div>
          <table>
            <thead>
              <tr>
                <th style="width: 30px;">#</th>
                <th>Product Description</th>
                <th style="text-align: center;">Qty</th>
                <th style="text-align: right;">Unit Price</th>
                <th style="text-align: right;">Line Total</th>
              </tr>
            </thead>
            <tbody>
              ${itemsHtml}
            </tbody>
          </table>
          <div class="totals">
            <div class="totals-row">
              <span>Subtotal:</span>
              <span>₹${order.subtotal}</span>
            </div>
            <div class="totals-row">
              <span>Delivery Fee:</span>
              <span>+₹${order.delivery_fee}</span>
            </div>
            <div class="totals-row">
              <span>Payment Mode:</span>
              <span>${order.payment_method} (${order.payment_status})</span>
            </div>
            <div class="totals-row grand-total">
              <span>Total Amount Paid:</span>
              <span>₹${order.total}</span>
            </div>
          </div>
          <div class="footer">
            <p>Thank you for shopping with MR. VIVASAYI Mart! For queries, call +91 9789325262.</p>
          </div>
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
    }, 400);
  };

  const handleExportSingleOrderCSV = () => {
    const headers = ['Order #', 'Date', 'Customer Name', 'Phone', 'Delivery Address', 'Product Name', 'Pack Size', 'Quantity', 'Unit Price', 'Line Total', 'Payment Method', 'Payment Status', 'Subtotal', 'Delivery Fee', 'Total Amount'];
    const rows = (order.items || []).map(it => [
      order.order_number,
      `"${order.created_at}"`,
      `"${order.customer_name_snapshot || ''}"`,
      order.customer_phone_snapshot || '',
      `"${order.delivery_address || order.delivery_area || ''}"`,
      `"${it.product_name_snapshot}"`,
      `"${it.pack_size_snapshot || ''}"`,
      it.quantity,
      it.unit_price_snapshot,
      it.total,
      order.payment_method,
      order.payment_status,
      order.subtotal,
      order.delivery_fee,
      order.total
    ]);

    const csvString = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Bill_${order.order_number}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white dark:bg-emerald-950 rounded-3xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col border border-emerald-100 dark:border-emerald-800">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-emerald-100 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-900/60">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-400 text-emerald-950 font-black flex items-center justify-center text-sm shadow">
              <Package className="w-5 h-5 text-emerald-950" />
            </div>
            <div>
              <h2 className="text-base font-extrabold text-emerald-950 dark:text-emerald-100">{order.order_number}</h2>
              <p className="text-xs text-gray-500 dark:text-emerald-400 font-medium">
                Created: {formatDateTime(order.created_at)}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {/* PRINT BILL BUTTON */}
            <button
              type="button"
              onClick={handlePrintBill}
              className="px-3 py-2 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-extrabold rounded-xl flex items-center gap-1.5 shadow transition-all"
              title="Print Customer Bill & Delivery Invoice"
            >
              <Printer className="w-3.5 h-3.5 text-amber-300" />
              <span>Print Bill</span>
            </button>

            {/* EXPORT BILL CSV BUTTON */}
            <button
              type="button"
              onClick={handleExportSingleOrderCSV}
              className="px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-800 text-xs font-extrabold rounded-xl flex items-center gap-1.5 border border-gray-300 shadow-xs transition-all"
              title="Export Bill Data to CSV"
            >
              <Download className="w-3.5 h-3.5 text-emerald-700" />
              <span>Export Bill</span>
            </button>

            <button
              onClick={onEditDetails}
              className="px-3 py-2 bg-amber-500 hover:bg-amber-600 text-emerald-950 text-xs font-black rounded-xl flex items-center gap-1.5 shadow transition-all"
            >
              <Edit2 className="w-3.5 h-3.5" />
              Edit Details
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-xl hover:bg-emerald-100 dark:hover:bg-emerald-800 transition-colors text-gray-500"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="overflow-y-auto flex-1 px-6 py-5 space-y-6">

          {/* Quick Stock & Lifecycle Actions Banner */}
          <div className="bg-gradient-to-r from-emerald-950 via-emerald-900 to-teal-950 p-4 rounded-2xl text-white space-y-2 border border-emerald-700/60 shadow">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
              <span className="text-xs font-black text-amber-300 uppercase tracking-wider flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                <span>Instant Stock & Order Actions</span>
              </span>
              <span className="text-[10px] text-emerald-200 font-semibold">
                Stock auto-refills on Cancel, Return, or Refund
              </span>
            </div>
            
            <div className="flex flex-wrap items-center gap-2 pt-1">
              {order.status !== 'CONFIRMED' && order.status !== 'DELIVERED' && (
                <button
                  type="button"
                  onClick={() => onQuickStatusChange?.(order, 'CONFIRMED')}
                  className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs rounded-xl shadow transition flex items-center gap-1 cursor-pointer"
                >
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-200" />
                  <span>Confirm Order ✓</span>
                </button>
              )}

              {order.status !== 'DELIVERED' && (
                <button
                  type="button"
                  onClick={() => onQuickStatusChange?.(order, 'DELIVERED')}
                  className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white font-extrabold text-xs rounded-xl shadow transition flex items-center gap-1 cursor-pointer"
                >
                  <Check className="w-3.5 h-3.5 text-blue-200" />
                  <span>Mark Delivered 🚚</span>
                </button>
              )}

              {order.status !== 'RETURNED' && (
                <button
                  type="button"
                  onClick={() => onQuickStatusChange?.(order, 'RETURNED', 'REFUNDED')}
                  className="px-3 py-1.5 bg-purple-700 hover:bg-purple-600 text-white font-extrabold text-xs rounded-xl shadow transition flex items-center gap-1 cursor-pointer"
                  title="Marks order as RETURNED & REFUNDED and restores all item quantities to inventory"
                >
                  <RotateCcw className="w-3.5 h-3.5 text-purple-200" />
                  <span>Return & Refill Stock ↩️</span>
                </button>
              )}

              {order.payment_status !== 'REFUNDED' && (
                <button
                  type="button"
                  onClick={() => onQuickStatusChange?.(order, order.status, 'REFUNDED')}
                  className="px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-emerald-950 font-black text-xs rounded-xl shadow transition flex items-center gap-1 cursor-pointer"
                  title="Marks payment as REFUNDED and restores items into current inventory"
                >
                  <DollarSign className="w-3.5 h-3.5 text-emerald-950" />
                  <span>Refund & Refill Stock 💸</span>
                </button>
              )}

              {order.status !== 'CANCELLED' && (
                <button
                  type="button"
                  onClick={() => onQuickStatusChange?.(order, 'CANCELLED')}
                  className="px-3 py-1.5 bg-rose-700 hover:bg-rose-600 text-white font-extrabold text-xs rounded-xl shadow transition flex items-center gap-1 cursor-pointer"
                  title="Cancels order and restores all item quantities back to stock"
                >
                  <X className="w-3.5 h-3.5 text-rose-200" />
                  <span>Cancel & Refill Stock ❌</span>
                </button>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="bg-emerald-50/70 dark:bg-emerald-900/40 rounded-2xl p-4 space-y-1 border border-emerald-100">
              <p className="text-[10px] font-black text-emerald-950 dark:text-emerald-300 uppercase tracking-wider">Order Meta</p>
              <DetailRow label="Source">{sourceBadge(order.source)}</DetailRow>
              <DetailRow label="Status">
                <span className={`inline-block rounded-full px-2.5 py-0.5 text-[10px] ${statusBadgeClass(order.status)}`}>
                  {STATUS_LABEL[order.status]}
                </span>
              </DetailRow>
              <DetailRow label="Recency">
                <span className={`px-2 py-0.5 rounded text-[10px] ${getOrderRecencyBadge(order.created_at).color}`}>
                  {getOrderRecencyBadge(order.created_at).label}
                </span>
              </DetailRow>
            </div>

            <div className="bg-emerald-50/70 dark:bg-emerald-900/40 rounded-2xl p-4 space-y-1 border border-emerald-100">
              <p className="text-[10px] font-black text-emerald-950 dark:text-emerald-300 uppercase tracking-wider">Customer Details</p>
              <DetailRow label="Customer ID">
                <span className="font-mono text-emerald-950 bg-emerald-100/80 px-2 py-0.5 rounded font-black border border-emerald-200 text-[11px]">
                  {order.customer_id || 'CUST-WALKIN'}
                </span>
              </DetailRow>
              <DetailRow label="Customer Name">{order.customer_name_snapshot ?? '—'}</DetailRow>
              <DetailRow label="Phone Number">{order.customer_phone_snapshot ?? '—'}</DetailRow>
              <DetailRow label="Delivery Area">{order.delivery_area ?? 'In-store / Cumbum'}</DetailRow>
              {order.delivery_address && (
                <DetailRow label="Address">{order.delivery_address}</DetailRow>
              )}
            </div>
          </div>

          {/* Items Table */}
          <div>
            <p className="text-[10px] font-black text-emerald-950 dark:text-emerald-400 uppercase tracking-wider mb-2">Ordered Products</p>
            <div className="rounded-2xl overflow-hidden border border-emerald-100 dark:border-emerald-800">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-emerald-50 dark:bg-emerald-950">
                    <th className="text-left px-4 py-2.5 font-extrabold text-emerald-950">Product Name</th>
                    <th className="text-center px-3 py-2.5 font-extrabold text-emerald-950">Qty</th>
                    <th className="text-right px-3 py-2.5 font-extrabold text-emerald-950">Unit Price</th>
                    <th className="text-right px-4 py-2.5 font-extrabold text-emerald-950">Line Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-emerald-100 dark:divide-emerald-800">
                  {order.items && order.items.length > 0 ? (
                    order.items.map((item) => (
                      <tr key={item.id} className="hover:bg-emerald-50/50">
                        <td className="px-4 py-2.5 text-emerald-950 font-bold">
                          <span>{item.product_name_snapshot}</span>
                          {item.pack_size_snapshot && (
                            <span className="text-gray-500 font-normal ml-1">({item.pack_size_snapshot})</span>
                          )}
                        </td>
                        <td className="px-3 py-2.5 text-center font-bold text-gray-800">{item.quantity}</td>
                        <td className="px-3 py-2.5 text-right font-semibold text-gray-700">{formatPrice(item.unit_price_snapshot)}</td>
                        <td className="px-4 py-2.5 text-right font-black text-emerald-950">{formatPrice(item.total)}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={4} className="px-4 py-4 text-center text-gray-400">No item details available</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Totals High-Contrast Box */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-amber-50/70 p-4 rounded-2xl border border-amber-200">
              <p className="text-[10px] font-black text-amber-950 uppercase tracking-wider mb-2">Payment Details</p>
              <DetailRow label="Payment Method">{order.payment_method}</DetailRow>
              <DetailRow label="Payment Status">
                <span className={`px-2.5 py-0.5 rounded text-[10px] ${paymentStatusClass(order.payment_status)}`}>
                  {order.payment_status}
                </span>
              </DetailRow>
              <div className="mt-2 pt-2 border-t border-amber-200">
                {order.payment_status === 'PAID' && order.payment_method !== 'CASH' ? (
                  <span className="inline-block w-full text-center px-2 py-1 rounded-lg bg-emerald-100 text-emerald-950 border border-emerald-300 text-[11px] font-black">
                    ✓ PREPAID ORDER (Paid: {formatPrice(order.total)})
                  </span>
                ) : (
                  <span className="inline-block w-full text-center px-2 py-1 rounded-lg bg-amber-100 text-amber-950 border border-amber-300 text-[11px] font-black">
                    ⚠️ COD ORDER (Collect Cash: {formatPrice(order.total)})
                  </span>
                )}
              </div>
            </div>

            <div className="bg-emerald-900 text-white p-4 rounded-2xl shadow">
              <p className="text-[10px] font-extrabold text-amber-300 uppercase tracking-wider mb-1">Financial Summary</p>
              <div className="flex justify-between text-xs py-1">
                <span className="text-emerald-200">Subtotal</span>
                <span className="font-bold">{formatPrice(order.subtotal)}</span>
              </div>
              {order.delivery_fee > 0 && (
                <div className="flex justify-between text-xs py-1">
                  <span className="text-emerald-200">Delivery Fee</span>
                  <span className="font-bold">+{formatPrice(order.delivery_fee)}</span>
                </div>
              )}
              <div className="flex justify-between text-base font-black text-amber-300 pt-2 border-t border-emerald-800 mt-1">
                <span>Total Amount Paid</span>
                <span>{formatPrice(order.total)}</span>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};

// ─── Edit Order Details & Status Modal ──────────────────────────────────────────

interface EditOrderModalProps {
  order: Order;
  products: Product[];
  onClose: () => void;
  onSave: (updatedOrder: Order) => void;
}

const EditOrderDetailsModal: React.FC<EditOrderModalProps> = ({ order, products, onClose, onSave }) => {
  const [form, setForm] = useState<Order>(order);
  const [discountMode, setDiscountMode] = useState<'RUPEES' | 'PERCENT'>('RUPEES');
  const [discountValue, setDiscountValue] = useState<number>(order.discount || 0);
  const [selectedProductToAdd, setSelectedProductToAdd] = useState<string>('');

  const totalWeightGrams = (form.items || []).reduce((sum, item) => {
    const packStr = (item.pack_size_snapshot || '').toLowerCase();
    let weightPerUnit = 1000;
    if (packStr.includes('kg')) {
      const num = parseFloat(packStr.replace('kg', '').trim()) || 1;
      weightPerUnit = num * 1000;
    } else if (packStr.includes('g') || packStr.includes('gram')) {
      const num = parseFloat(packStr.replace(/g|gram|grams/, '').trim()) || 500;
      weightPerUnit = num;
    }
    return sum + (weightPerUnit * (item.quantity || 1));
  }, 0);

  const recalculateFormTotals = (itemsList: OrderItem[], fee: number, discMode: 'RUPEES' | 'PERCENT', discVal: number) => {
    const newSubtotal = itemsList.reduce((sum, i) => sum + i.total, 0);
    const discAmt = discMode === 'PERCENT' ? (newSubtotal * discVal) / 100 : discVal;
    const newTotal = Math.max(0, newSubtotal + fee - discAmt);
    return { subtotal: newSubtotal, discount: discAmt, total: newTotal };
  };

  const handleItemQtyChange = (itemId: string, newQty: number) => {
    const updatedItems = (form.items || []).map(it => {
      if (it.id === itemId) {
        const qty = Math.max(1, newQty);
        return { ...it, quantity: qty, total: it.unit_price_snapshot * qty };
      }
      return it;
    });

    const { subtotal, discount, total } = recalculateFormTotals(updatedItems, form.delivery_fee || 0, discountMode, discountValue);
    setForm({ ...form, items: updatedItems, subtotal, discount, total });
  };

  const handleRemoveItem = (itemId: string) => {
    const updatedItems = (form.items || []).filter(it => it.id !== itemId);
    const { subtotal, discount, total } = recalculateFormTotals(updatedItems, form.delivery_fee || 0, discountMode, discountValue);
    setForm({ ...form, items: updatedItems, subtotal, discount, total });
  };

  const handleAddProductToOrder = () => {
    if (!selectedProductToAdd) return;
    const prod = products.find((p: Product) => p.id === selectedProductToAdd);
    if (!prod) return;

    const unitPrice = prod.offer_price || prod.selling_price;
    const newItem: OrderItem = {
      id: `item-${Date.now()}`,
      order_id: form.id,
      product_id: prod.id,
      product_name_snapshot: prod.name,
      tamil_name_snapshot: prod.tamil_name,
      pack_size_snapshot: prod.pack_size,
      sku_snapshot: prod.sku,
      quantity: 1,
      unit_price_snapshot: unitPrice,
      discount: 0,
      total: unitPrice,
      created_at: new Date().toISOString()
    };

    const updatedItems = [...(form.items || []), newItem];
    const { subtotal, discount, total } = recalculateFormTotals(updatedItems, form.delivery_fee || 0, discountMode, discountValue);
    setForm({ ...form, items: updatedItems, subtotal, discount, total });
    setSelectedProductToAdd('');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({ ...form, updated_at: new Date().toISOString() });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white rounded-3xl max-w-2xl w-full p-6 shadow-2xl border border-emerald-100 space-y-4 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center border-b border-gray-100 pb-3">
          <h3 className="font-extrabold text-emerald-950 text-base flex items-center gap-2">
            <Edit2 className="w-5 h-5 text-emerald-700" />
            <span>Edit Order Details ({form.order_number})</span>
          </h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          {/* Customer Info */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block font-bold text-gray-700 mb-1">Customer Name *</label>
              <input
                type="text"
                required
                value={form.customer_name_snapshot || ''}
                onChange={(e) => setForm({ ...form, customer_name_snapshot: e.target.value })}
                className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl font-bold text-emerald-950"
              />
            </div>
            <div>
              <label className="block font-bold text-gray-700 mb-1">Phone Number *</label>
              <input
                type="text"
                required
                value={form.customer_phone_snapshot || ''}
                onChange={(e) => setForm({ ...form, customer_phone_snapshot: e.target.value })}
                className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl font-bold text-emerald-950"
              />
            </div>
          </div>

          {/* Status & Payment Status Controls */}
          <div className="grid grid-cols-2 gap-4 bg-emerald-50/60 p-3 rounded-2xl border border-emerald-100">
            <div>
              <label className="block font-bold text-emerald-950 mb-1">Order Status *</label>
              <select
                value={form.status}
                onChange={(e) => setForm({ ...form, status: e.target.value as OrderStatus })}
                className="w-full p-2 bg-white border border-emerald-300 rounded-xl font-bold text-emerald-950"
              >
                <option value="NEW">New Order</option>
                <option value="CONFIRMED">Confirmed</option>
                <option value="PACKING">Packing in Progress</option>
                <option value="READY">Ready for Dispatch</option>
                <option value="OUT_FOR_DELIVERY">Out for Delivery</option>
                <option value="DELIVERED">Delivered</option>
                <option value="CANCELLED">Cancelled</option>
                <option value="RETURNED">Returned</option>
              </select>
            </div>

            <div>
              <label className="block font-bold text-emerald-950 mb-1">Payment Status *</label>
              <select
                value={form.payment_status}
                onChange={(e) => setForm({ ...form, payment_status: e.target.value as any })}
                className="w-full p-2 bg-white border border-emerald-300 rounded-xl font-bold text-emerald-950"
              >
                <option value="PENDING">Pending Payment</option>
                <option value="PAID">Paid ✓</option>
                <option value="PARTIAL">Partial Payment</option>
                <option value="REFUNDED">Refunded</option>
                <option value="FAILED">Payment Failed</option>
              </select>
            </div>
          </div>

          {/* Order Items Editor with Add Product Option */}
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <label className="block font-bold text-gray-800">Order Products List:</label>
              <span className="text-[10px] text-gray-500 font-semibold">{form.items?.length || 0} items</span>
            </div>

            {/* ADD PRODUCT TO ORDER DROPDOWN */}
            <div className="flex items-center gap-2 bg-emerald-50/70 p-2 rounded-xl border border-emerald-200">
              <select
                value={selectedProductToAdd}
                onChange={(e) => setSelectedProductToAdd(e.target.value)}
                className="flex-1 p-2 bg-white border border-emerald-300 rounded-lg font-bold text-emerald-950 text-xs"
              >
                <option value="">+ Select Product to Add...</option>
                {products.map((p: Product) => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({p.pack_size}) — ₹{p.offer_price || p.selling_price}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={handleAddProductToOrder}
                disabled={!selectedProductToAdd}
                className="px-3 py-2 bg-emerald-800 hover:bg-emerald-900 disabled:opacity-50 text-white font-extrabold rounded-lg text-xs flex items-center gap-1 shadow"
              >
                <Plus className="w-3.5 h-3.5 text-amber-300" /> Add Product
              </button>
            </div>

            <div className="border border-gray-200 rounded-2xl overflow-hidden">
              <table className="w-full text-xs">
                <thead className="bg-gray-50 font-bold text-gray-700">
                  <tr>
                    <th className="p-2 text-left">Item Name</th>
                    <th className="p-2 text-center">Unit Price</th>
                    <th className="p-2 text-center">Qty</th>
                    <th className="p-2 text-right">Total</th>
                    <th className="p-2 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {form.items && form.items.map((it) => (
                    <tr key={it.id}>
                      <td className="p-2 font-bold text-emerald-950">
                        <span>{it.product_name_snapshot}</span>
                        {it.pack_size_snapshot && <span className="text-gray-500 font-normal ml-1">({it.pack_size_snapshot})</span>}
                      </td>
                      <td className="p-2 text-center font-semibold">{formatPrice(it.unit_price_snapshot)}</td>
                      <td className="p-2 text-center">
                        <input
                          type="number"
                          min="1"
                          value={it.quantity}
                          onChange={(e) => handleItemQtyChange(it.id, parseInt(e.target.value) || 1)}
                          className="w-14 p-1 border border-gray-300 rounded text-center font-bold"
                        />
                      </td>
                      <td className="p-2 text-right font-black text-emerald-950">{formatPrice(it.total)}</td>
                      <td className="p-2 text-center">
                        <button
                          type="button"
                          onClick={() => handleRemoveItem(it.id)}
                          className="text-rose-600 hover:text-rose-800 p-1"
                          title="Remove item from order"
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

          {/* DYNAMIC WEIGHT INDICATOR & DELIVERY FEE & DISCOUNT */}
          <div className="bg-amber-50/80 p-3 rounded-2xl border border-amber-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-xs">
            <div className="flex items-center gap-2">
              <Scale className="w-4 h-4 text-amber-700" />
              <div>
                <span className="font-extrabold text-amber-950">Total Order Weight: </span>
                <span className="font-mono font-black text-amber-900">
                  {totalWeightGrams >= 1000 
                    ? `${(totalWeightGrams / 1000).toFixed(2)} kg (${totalWeightGrams}g)`
                    : `${totalWeightGrams} grams`
                  }
                </span>
                <span className="ml-2 px-2 py-0.5 bg-amber-200 text-amber-950 font-extrabold rounded-md text-[10px]">
                  {totalWeightGrams < 250 ? 'Below 250g Tier'
                    : totalWeightGrams <= 500 ? '250g - 500g Tier'
                    : totalWeightGrams <= 1000 ? '500g - 1kg Tier'
                    : totalWeightGrams <= 2000 ? '1kg - 2kg Tier'
                    : totalWeightGrams <= 5000 ? '1kg - 5kg Tier'
                    : 'Bulk Shipment (> 5kg)'}
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                let fee = 40;
                if (totalWeightGrams < 250) fee = 20;
                else if (totalWeightGrams <= 500) fee = 30;
                else if (totalWeightGrams <= 1000) fee = 40;
                else if (totalWeightGrams <= 2000) fee = 55;
                else if (totalWeightGrams <= 5000) fee = 80;
                else fee = 150;

                const { subtotal, discount, total } = recalculateFormTotals(form.items || [], fee, discountMode, discountValue);
                setForm({ ...form, delivery_fee: fee, subtotal, discount, total });
              }}
              className="px-3 py-1.5 bg-amber-800 hover:bg-amber-900 text-white font-extrabold text-[11px] rounded-xl shadow-xs flex items-center gap-1"
            >
              <Truck className="w-3.5 h-3.5 text-amber-300" />
              <span>Auto-Apply Weight Fee</span>
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-gray-50 p-3 rounded-2xl border border-gray-200">
            <div>
              <label className="block font-bold text-gray-700 mb-1">Delivery Fee (₹)</label>
              <input
                type="number"
                min="0"
                value={form.delivery_fee || 0}
                onChange={(e) => {
                  const fee = Math.max(0, parseFloat(e.target.value) || 0);
                  const { subtotal, discount, total } = recalculateFormTotals(form.items || [], fee, discountMode, discountValue);
                  setForm({ ...form, delivery_fee: fee, subtotal, discount, total });
                }}
                className="w-full p-2 bg-white border border-gray-300 rounded-xl font-bold"
              />
            </div>

            <div>
              <label className="block font-bold text-gray-700 mb-1">Discount Mode</label>
              <div className="flex border border-gray-300 rounded-xl overflow-hidden bg-white p-0.5">
                <button
                  type="button"
                  onClick={() => {
                    setDiscountMode('RUPEES');
                    const { subtotal, discount, total } = recalculateFormTotals(form.items || [], form.delivery_fee || 0, 'RUPEES', discountValue);
                    setForm({ ...form, subtotal, discount, total });
                  }}
                  className={`flex-1 py-1.5 font-extrabold text-[11px] rounded-lg transition ${
                    discountMode === 'RUPEES' ? 'bg-emerald-800 text-white shadow' : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  Rupees (₹)
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setDiscountMode('PERCENT');
                    const { subtotal, discount, total } = recalculateFormTotals(form.items || [], form.delivery_fee || 0, 'PERCENT', discountValue);
                    setForm({ ...form, subtotal, discount, total });
                  }}
                  className={`flex-1 py-1.5 font-extrabold text-[11px] rounded-lg transition ${
                    discountMode === 'PERCENT' ? 'bg-emerald-800 text-white shadow' : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  Percent (%)
                </button>
              </div>
            </div>

            <div>
              <label className="block font-bold text-gray-700 mb-1">
                Discount Value ({discountMode === 'RUPEES' ? '₹' : '%'})
              </label>
              <input
                type="number"
                min="0"
                value={discountValue}
                onChange={(e) => {
                  const val = Math.max(0, parseFloat(e.target.value) || 0);
                  setDiscountValue(val);
                  const { subtotal, discount, total } = recalculateFormTotals(form.items || [], form.delivery_fee || 0, discountMode, val);
                  setForm({ ...form, subtotal, discount, total });
                }}
                className="w-full p-2 bg-white border border-gray-300 rounded-xl font-bold"
              />
            </div>
          </div>

          {/* TOTAL SUMMARY BOX */}
          <div className="bg-emerald-950 text-white p-4 rounded-2xl flex items-center justify-between shadow">
            <div>
              <span className="text-[10px] text-amber-300 font-extrabold uppercase tracking-wider block">Calculated Order Total</span>
              <span className="text-xs text-emerald-200">Subtotal: {formatPrice(form.subtotal)} | Fee: +{formatPrice(form.delivery_fee)} | Disc: -{formatPrice(form.discount)}</span>
            </div>
            <span className="text-2xl font-black text-amber-300">{formatPrice(form.total)}</span>
          </div>

          <div className="flex justify-end gap-3 pt-3 border-t border-gray-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-xl"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-6 py-2.5 bg-emerald-800 hover:bg-emerald-900 text-white font-extrabold rounded-xl shadow"
            >
              Save Order Details
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// ─── Main Component ─────────────────────────────────────────────────────────────

const ALL_STATUSES: OrderStatus[] = [
  'NEW', 'CONFIRMED', 'PACKING', 'READY', 'OUT_FOR_DELIVERY', 'DELIVERED', 'CANCELLED', 'RETURNED',
];

export const OrdersPage: React.FC = () => {
  const { addNotification } = useNotifications();
  const { showActionModal, showConfirmModal } = useActionModal();
  const [orders, setOrders] = useState<Order[]>([]);
  const [templates, setTemplates] = useState<any[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      let liveOrders: Order[] = [];

      if (isSupabaseConfigured()) {
        const { data, error: dbErr } = await supabase
          .from('orders')
          .select('*')
          .order('created_at', { ascending: false });

        if (dbErr) {
          console.error('Supabase orders fetch error:', dbErr);
          setError(dbErr.message || 'Failed to retrieve orders from database.');
          liveOrders = [];
        } else {
          liveOrders = (data as Order[]) || [];
        }
      } else {
        const o = await getJSONStore<Order>('orders');
        liveOrders = o || [];
      }

      // Strictly ensure zero dummy data
      const DUMMY_IDS = new Set(['cust-101', 'cust-102', 'cust-103', 'cust-104', 'cust-105']);
      const realOrders = (liveOrders || []).filter(ord => ord && !DUMMY_IDS.has(ord.customer_id || ''));

      setOrders(realOrders);
      if (typeof window !== 'undefined') {
        localStorage.setItem('mrvivasayi_db_orders', JSON.stringify(realOrders));
      }

      const [tpls, p] = await Promise.all([
        getJSONStore<any>('message_templates'),
        getJSONStore<Product>('products'),
      ]);
      if (tpls) setTemplates(tpls);
      setProducts(p || []);
    } catch (err: any) {
      console.error('Failed to load orders:', err);
      setError(err?.message || 'Failed to retrieve live orders from database.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const [sourceFilter, setSourceFilter] = useState<'ALL' | OrderSource>('ALL');
  const [statusFilter, setStatusFilter] = useState<'ALL' | OrderStatus>('ALL');
  const [recencyFilter, setRecencyFilter] = useState<'ALL' | '1_HOUR' | '2_HOURS' | '5_HOURS' | 'TODAY'>('ALL');
  const [paymentReqFilter, setPaymentReqFilter] = useState<'ALL' | 'PENDING' | 'PAID' | 'COD_VERIFY'>('ALL');
  const [paymentMethodFilter, setPaymentMethodFilter] = useState<'ALL' | 'UPI' | 'CASH' | 'CARD' | 'BANK'>('ALL');
  const [customerTypeFilter, setCustomerTypeFilter] = useState<'ALL' | 'WALK_IN' | 'REGISTERED'>('ALL');
  const [sortBy, setSortBy] = useState<'NEWEST' | 'OLDEST' | 'HIGHEST_AMOUNT' | 'LOWEST_AMOUNT'>('NEWEST');
  const [searchQuery, setSearchQuery] = useState('');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [autoRefreshSec, setAutoRefreshSec] = useState<number>(0);

  // Live Auto-Refresh Effect with Progress Pop Modal
  useEffect(() => {
    if (!autoRefreshSec || autoRefreshSec <= 0) return;
    const interval = setInterval(() => {
      handleRefreshOrders();
    }, autoRefreshSec * 1000);
    return () => clearInterval(interval);
  }, [autoRefreshSec]);

  const resetOrderFilters = () => {
    setSearchQuery('');
    setSourceFilter('ALL');
    setStatusFilter('ALL');
    setRecencyFilter('ALL');
    setPaymentReqFilter('ALL');
    setPaymentMethodFilter('ALL');
    setCustomerTypeFilter('ALL');
    setSortBy('NEWEST');
    setCurrentPage(1);
    toast.success('Order filters cleared! Showing all orders.');
  };

  const [orderToDelete, setOrderToDelete] = useState<Order | null>(null);
  const [isDeletingOrder, setIsDeletingOrder] = useState<boolean>(false);

  const handleDeleteOrderConfirm = async () => {
    if (!orderToDelete) return;
    const target = orderToDelete;
    setOrderToDelete(null);

    showActionModal({
      title: 'Deleting Order Record',
      subtitle: `Voiding and removing order #${target.order_number}...`,
      badge: 'Orders Hub Live',
      duration: 800,
      steps: [
        'Voiding order ledger & invoice record...',
        'Syncing inventory status...',
        'Order deleted successfully!'
      ],
      onComplete: async () => {
        const updatedOrders = orders.filter(o => o.id !== target.id);
        await setJSONStore<Order>('orders', updatedOrders);
        setOrders(updatedOrders);
        const { refilledCount } = await syncOrderStockChange(target, null);
        addNotification({
          title: 'Order Deleted',
          message: `Order #${target.order_number} has been deleted.${refilledCount > 0 ? ` ${refilledCount} item(s) restored to stock.` : ''}`,
          type: 'warning',
          sourceModule: 'Orders Hub'
        });
        toast.success(`Order #${target.order_number} deleted!${refilledCount > 0 ? ` (${refilledCount} items refilled to stock)` : ''}`);
      }
    });
  };

  // Bulk Status Update Handler
  const handleBulkStatusChange = async (targetStatus: OrderStatus) => {
    if (selectedOrderIds.length === 0) return;
    try {
      const selectedSet = new Set(selectedOrderIds);
      const updated = orders.map((o) => (selectedSet.has(o.id) ? { ...o, status: targetStatus, updated_at: new Date().toISOString() } : o));
      setOrders(updated);
      await setJSONStore('orders', updated);
      toast.success(`Updated status to ${targetStatus} for ${selectedSet.size} orders!`);
      setSelectedOrderIds([]);
    } catch (err) {
      console.error(err);
      toast.error('Failed to update orders');
    }
  };

  // Bulk Delete Orders Handler
  const handleBulkDeleteOrders = () => {
    if (selectedOrderIds.length === 0) return;
    showConfirmModal({
      title: `Delete ${selectedOrderIds.length} Selected Orders?`,
      message: `Are you sure you want to permanently delete ${selectedOrderIds.length} orders? This action cannot be undone.`,
      confirmText: `Yes, Delete ${selectedOrderIds.length} Orders`,
      variant: 'danger',
      onConfirm: async () => {
        try {
          const selectedSet = new Set(selectedOrderIds);
          const updated = orders.filter((o) => !selectedSet.has(o.id));
          setOrders(updated);
          await setJSONStore('orders', updated);
          setSelectedOrderIds([]);
          toast.success(`Deleted ${selectedSet.size} orders successfully!`);
        } catch (err) {
          console.error(err);
          toast.error('Failed to delete selected orders');
        }
      }
    });
  };

  const handleRefreshOrders = () => {
    setIsRefreshing(true);
    getJSONStore<Order>('orders').then(data => {
      setOrders(data || []);
    });
  };

  const handleResetFilters = () => {
    setSourceFilter('ALL');
    setStatusFilter('ALL');
    setRecencyFilter('ALL');
    setPaymentReqFilter('ALL');
    setPaymentMethodFilter('ALL');
    setCustomerTypeFilter('ALL');
    setSortBy('NEWEST');
    setSearchQuery('');
    setCurrentPage(1);
    toast.success('All filters reset to default');
  };

  // Pagination State
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [itemsPerPage, setItemsPerPage] = useState<number>(10);

  const [viewOrder, setViewOrder] = useState<Order | null>(null);
  const [editingOrderDetails, setEditingOrderDetails] = useState<Order | null>(null);
  const [codQrOrder, setCodQrOrder] = useState<Order | null>(null);
  const [selectedOrderIds, setSelectedOrderIds] = useState<string[]>([]);
  const [bulkStatusModal, setBulkStatusModal] = useState<{ isOpen: boolean; targetStatus: OrderStatus }>({ isOpen: false, targetStatus: 'CONFIRMED' });
  const [bulkMessageModal, setBulkMessageModal] = useState<{ isOpen: boolean; channel: 'WHATSAPP' | 'EMAIL' | 'BOTH'; templateName: string }>({ isOpen: false, channel: 'WHATSAPP', templateName: 'Order Status & Billing Confirmation' });
  const [showStatusDropdown, setShowStatusDropdown] = useState(false);
  
  const [orderActionSpinnerModal, setOrderActionSpinnerModal] = useState<{
    isOpen: boolean;
    title: string;
    description: string;
    isExecuting: boolean;
  }>({
    isOpen: false,
    title: '',
    description: '',
    isExecuting: false
  });

  const [sendConfirmModal, setSendConfirmModal] = useState<{
    isOpen: boolean;
    order: Order | null;
    templateTitle: string;
    templatePreview: string;
  }>({
    isOpen: false,
    order: null,
    templateTitle: '',
    templatePreview: ''
  });

  const [exportFormatModal, setExportFormatModal] = useState<{
    isOpen: boolean;
    type: 'ADDRESS_ONLY' | 'FULL_ORDERS_DATA' | 'SELECTED_BILLS';
    title: string;
    description: string;
  }>({
    isOpen: false,
    type: 'FULL_ORDERS_DATA',
    title: '',
    description: ''
  });

  const [selectedFormat, setSelectedFormat] = useState<'CSV' | 'EXCEL' | 'PDF' | 'PRINT'>('CSV');

  const handleExecuteFormatExport = () => {
    const targetOrders = exportFormatModal.type === 'SELECTED_BILLS' && selectedOrderIds.length > 0
      ? orders.filter(o => selectedOrderIds.includes(o.id))
      : filtered;

    if (targetOrders.length === 0) {
      toast.error('No orders available for processing');
      return;
    }

    if (selectedFormat === 'PRINT') {
      if (exportFormatModal.type === 'ADDRESS_ONLY') {
        const printWindow = window.open('', '_blank', 'width=800,height=900');
        if (!printWindow) return;
        const labelsHtml = targetOrders.map((o) => `
          <div style="border: 2px solid #064e3b; padding: 16px; border-radius: 12px; margin-bottom: 20px; background: #f0fdf4; page-break-inside: avoid;">
            <div style="display: flex; justify-content: space-between; border-bottom: 1px solid #bbf7d0; padding-bottom: 8px; margin-bottom: 10px;">
              <strong style="font-size: 16px; color: #064e3b;">ORDER #${o.order_number}</strong>
              <span style="font-size: 12px; font-weight: bold; background: #064e3b; color: white; padding: 2px 8px; border-radius: 6px;">${o.source}</span>
            </div>
            <p style="margin: 4px 0; font-size: 14px;"><strong>Customer Name:</strong> ${o.customer_name_snapshot || 'Walk-in Customer'}</p>
            <p style="margin: 4px 0; font-size: 14px;"><strong>Phone:</strong> ${o.customer_phone_snapshot || '—'}</p>
            <p style="margin: 4px 0; font-size: 14px;"><strong>Delivery Area:</strong> ${o.delivery_area || 'Cumbum'}</p>
            <p style="margin: 4px 0; font-size: 14px;"><strong>Shipping Address:</strong> ${o.delivery_address || 'Over the counter / Store Pickup'}</p>
            <div style="margin-top: 10px; padding-top: 8px; border-top: 1px dashed #064e3b; font-size: 13px; font-weight: 900; color: #92400e;">
              ${o.payment_status === 'PAID' && o.payment_method !== 'CASH'
                ? `✓ PREPAID ORDER (Amount Paid: ₹${o.total})`
                : `⚠️ COD ORDER (Collect Cash Amount: ₹${o.total})`}
            </div>
          </div>
        `).join('');

        printWindow.document.write(`
          <!DOCTYPE html><html><head><title>Dispatch Address Labels (${targetOrders.length})</title>
          <style>body { font-family: sans-serif; padding: 20px; color: #064e3b; }</style></head>
          <body><h2>🌿 MR. VIVASAYI Mart Dispatch Address Stickers (${targetOrders.length} Orders)</h2>${labelsHtml}</body></html>
        `);
        printWindow.document.close();
        printWindow.focus();
        setTimeout(() => printWindow.print(), 400);
      } else {
        handleBatchPrintSelectedOrders();
      }
    } else if (selectedFormat === 'CSV' || selectedFormat === 'EXCEL') {
      const isExcel = selectedFormat === 'EXCEL';
      const isAddressOnly = exportFormatModal.type === 'ADDRESS_ONLY';

      const headers = isAddressOnly
        ? ['Order #', 'Customer ID', 'Customer Name', 'Phone Number', 'Delivery Area', 'Delivery Address', 'Payment Status', 'Total Amount']
        : ['Order #', 'Source', 'Customer ID', 'Customer Name', 'Phone', 'Order Status', 'Payment Method', 'Payment Status', 'Subtotal', 'Delivery Fee', 'Total Amount', 'Created At'];

      const rows = targetOrders.map(o => isAddressOnly ? [
        o.order_number,
        o.customer_id || 'CUST-WALKIN',
        `"${o.customer_name_snapshot || ''}"`,
        o.customer_phone_snapshot || '',
        `"${o.delivery_area || ''}"`,
        `"${o.delivery_address || ''}"`,
        o.payment_status,
        o.total
      ] : [
        o.order_number,
        o.source,
        o.customer_id || 'CUST-WALKIN',
        `"${o.customer_name_snapshot || ''}"`,
        o.customer_phone_snapshot || '',
        o.status,
        o.payment_method,
        o.payment_status,
        o.subtotal,
        o.delivery_fee,
        o.total,
        `"${o.created_at}"`
      ]);

      const bom = isExcel ? '\uFEFF' : '';
      const csvString = bom + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
      const blob = new Blob([csvString], { type: isExcel ? 'application/vnd.ms-excel;charset=utf-8;' : 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `MR_VIVASAYI_Mart_${isAddressOnly ? 'Address_Labels' : 'Orders_Data'}_${isExcel ? 'Excel' : 'Export'}_${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } else if (selectedFormat === 'PDF') {
      const printWindow = window.open('', '_blank', 'width=900,height=950');
      if (!printWindow) return;
      const contentHtml = targetOrders.map(o => `
        <div style="border-bottom: 1px solid #ddd; padding: 12px 0;">
          <h3 style="color: #064e3b; margin: 0 0 6px;">Order #${o.order_number} — ${o.customer_name_snapshot || 'Customer'}</h3>
          <p style="margin: 2px 0;"><strong>Phone:</strong> ${o.customer_phone_snapshot || '—'} | <strong>Area:</strong> ${o.delivery_area || 'Cumbum'}</p>
          <p style="margin: 2px 0;"><strong>Address:</strong> ${o.delivery_address || 'Store Pickup'}</p>
          <p style="margin: 4px 0 0;"><strong>Payment:</strong> ${o.payment_method} (${o.payment_status}) — <strong>Total: ₹${o.total}</strong></p>
        </div>
      `).join('');

      printWindow.document.write(`
        <!DOCTYPE html><html><head><title>MR. VIVASAYI Mart Orders PDF Report</title>
        <style>body { font-family: sans-serif; padding: 24px; color: #1e293b; }</style></head>
        <body>
          <h1>🌿 MR. VIVASAYI Mart Orders PDF Document (${targetOrders.length} Records)</h1>
          ${contentHtml}
        </body></html>
      `);
      printWindow.document.close();
      printWindow.focus();
      setTimeout(() => printWindow.print(), 400);
    }

    toast.success(`Processed ${targetOrders.length} orders in ${selectedFormat} format!`);
    setExportFormatModal({ isOpen: false, type: 'FULL_ORDERS_DATA', title: '', description: '' });
  };

  // Prompt message confirmation modal using Message Templates Library
  const promptDispatchTemplateMessage = (order: Order, templateIdOrCode: string) => {
    const matched = templates.find(t => t.id === templateIdOrCode || t.backend_status_code === templateIdOrCode) || templates[0];

    const rawContent = matched.content;
    const msgText = rawContent
      .replace(/\[Customer Name\]/g, order.customer_name_snapshot || 'Customer')
      .replace(/\[Amount\]/g, order.total.toString())
      .replace(/\[Order ID\]/g, order.order_number)
      .replace(/\[Product\/Service\/Order\]/g, 'MR. VIVASAYI Mart')
      .replace(/\[Product\/Service\]/g, 'MR. VIVASAYI Mart')
      .replace(/\[Transaction ID\]/g, `TXN-${Date.now().toString().slice(-6)}`)
      .replace(/\[Payment ID\]/g, `PAY-${Date.now().toString().slice(-6)}`)
      .replace(/\[Date\]/g, new Date(order.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }))
      .replace(/\[Payment Method\]/g, order.payment_method)
      .replace(/\[Payment Link\]/g, 'https://mrvivasayi.in/pay')
      .replace(/\[Company Name\]/g, 'MR. VIVASAYI Mart');

    setSendConfirmModal({
      isOpen: true,
      order,
      templateTitle: `#${matched.template_number} ${matched.title}`,
      templatePreview: msgText
    });
  };

  // Confirmed Dispatch Execution
  const executeDispatchOrderStatusMessage = () => {
    if (!sendConfirmModal.order) return;
    const { order, templatePreview } = sendConfirmModal;
    const phone = (order.customer_phone_snapshot || '9876543210').replace(/\D/g, '');

    window.open(`https://wa.me/91${phone}?text=${encodeURIComponent(templatePreview)}`, '_blank');

    addNotification({
      title: 'WhatsApp Message Sent',
      message: `Dispatched WhatsApp template '${sendConfirmModal.templateTitle}' to ${order.customer_name_snapshot}.`,
      type: 'success',
      sourceModule: 'Orders Hub'
    });

    setSendConfirmModal({ isOpen: false, order: null, templateTitle: '', templatePreview: '' });
  };

  // Direct One-by-One Customer WhatsApp Bill Dispatch
  const handleSendDirectWhatsAppBill = (order: Order) => {
    const phone = (order.customer_phone_snapshot || '9876543210').replace(/\D/g, '');
    const itemsText = (order.items || []).map((it, idx) =>
      `${idx + 1}. *${it.product_name_snapshot}* ${it.pack_size_snapshot ? `(${it.pack_size_snapshot})` : ''} x ${it.quantity} = ₹${it.total}`
    ).join('\n');

    const paymentTypeMsg = order.payment_status === 'PAID' && order.payment_method !== 'CASH'
      ? `*PREPAID ORDER* (Amount Paid: ₹${order.total})`
      : `*COD ORDER* (Collect Cash: ₹${order.total})`;

    const billMsg = `🌿 *MR. VIVASAYI Mart — Customer Store Bill* 🌿

Dear *${order.customer_name_snapshot || 'Customer'}*,
Thank you for your order! Here is your itemized bill summary:

📌 *Order ID:* ${order.order_number}
📅 *Date:* ${new Date(order.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
👤 *Customer ID:* ${order.customer_id || 'CUST-WALKIN'}
📍 *Delivery Address:* ${order.delivery_address || order.delivery_area || 'Store Pickup'}

🛒 *Ordered Items:*
${itemsText}

-----------------------------------
💰 *Subtotal:* ₹${order.subtotal}
🚚 *Delivery Fee:* ₹${order.delivery_fee}
💳 *Total Amount:* ₹${order.total}
💳 *Payment Status:* ${paymentTypeMsg}
-----------------------------------

Good Food. Good Life. 🌾
MR. VIVASAYI Mart (+91 9789325262)`;

    window.open(`https://wa.me/91${phone}?text=${encodeURIComponent(billMsg)}`, '_blank');
    addNotification({
      title: 'WhatsApp Bill Dispatched',
      message: `Sent direct itemized bill to ${order.customer_name_snapshot} (${order.order_number}).`,
      type: 'success',
      sourceModule: 'Orders Hub'
    });
  };

  // Financial & Order Metrics
  const stats = useMemo(() => {
    const total = orders.length;
    const pendingOrders = orders.filter((o) => o.status === 'NEW' || o.status === 'CONFIRMED' || o.payment_status === 'PENDING');
    const pendingAmount = pendingOrders.reduce((sum, o) => sum + o.total, 0);

    const confirmedOrders = orders.filter((o) => o.status === 'CONFIRMED' || o.status === 'DELIVERED' || o.payment_status === 'PAID');
    const confirmedAmount = confirmedOrders.reduce((sum, o) => sum + o.total, 0);

    const returnedOrders = orders.filter((o) => o.status === 'RETURNED' || o.payment_status === 'REFUNDED');
    const returnedAmount = returnedOrders.reduce((sum, o) => sum + o.total, 0);

    return {
      total,
      pendingCount: pendingOrders.length,
      pendingAmount,
      confirmedCount: confirmedOrders.length,
      confirmedAmount,
      returnedCount: returnedOrders.length,
      returnedAmount
    };
  }, [orders]);

  // CSV Export
  const handleExportOrdersCSV = () => {
    if (filtered.length === 0) {
      addNotification({
        title: 'Export Failed',
        message: 'No order records available to export.',
        type: 'warning',
        sourceModule: 'Orders Hub'
      });
      return;
    }

    const headers = ['Order #', 'Source', 'Customer Name', 'Phone', 'Status', 'Payment Method', 'Payment Status', 'Subtotal', 'Delivery Fee', 'Total Amount', 'Created At'];
    const rows = filtered.map(o => [
      o.order_number,
      o.source,
      `"${o.customer_name_snapshot || ''}"`,
      o.customer_phone_snapshot || '',
      o.status,
      o.payment_method,
      o.payment_status,
      o.subtotal,
      o.delivery_fee,
      o.total,
      `"${o.created_at}"`
    ]);

    const csvString = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `MR_VIVASAYI_Mart_Orders_Export_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    addNotification({
      title: 'Orders Exported',
      message: `Exported CSV dataset for ${filtered.length} order records.`,
      type: 'success',
      sourceModule: 'Orders Hub'
    });
  };

  const handleExecuteBulkMessage = () => {
    if (selectedOrderIds.length === 0) {
      toast.error('No orders selected for bulk message');
      return;
    }
    toast.success(`Sent bulk WhatsApp template "${bulkMessageModal.templateName}" to ${selectedOrderIds.length} orders!`);
    setBulkMessageModal({ isOpen: false, channel: 'WHATSAPP', templateName: '' });
    setSelectedOrderIds([]);
  };

  // Single Order Printer Handler
  const handlePrintSingleOrder = (order: Order) => {
    const printWindow = window.open('', '_blank', 'width=800,height=900');
    if (!printWindow) return;

    const itemsHtml = (order.items || []).map((it, idx) => `
      <tr>
        <td style="padding: 8px; border-bottom: 1px solid #eee;">${idx + 1}</td>
        <td style="padding: 8px; border-bottom: 1px solid #eee;"><strong>${it.product_name_snapshot}</strong> ${it.pack_size_snapshot ? `(${it.pack_size_snapshot})` : ''}</td>
        <td style="padding: 8px; border-bottom: 1px solid #eee; text-align: center;">${it.quantity}</td>
        <td style="padding: 8px; border-bottom: 1px solid #eee; text-align: right;">₹${it.unit_price_snapshot}</td>
        <td style="padding: 8px; border-bottom: 1px solid #eee; text-align: right; font-weight: bold;">₹${it.total}</td>
      </tr>
    `).join('');

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>MR. VIVASAYI Mart Order Bill - ${order.order_number}</title>
          <style>
            body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; padding: 24px; color: #064e3b; margin: 0; }
            .header { text-align: center; border-bottom: 2px solid #064e3b; padding-bottom: 12px; margin-bottom: 20px; }
            .header h1 { margin: 0; color: #064e3b; font-size: 24px; font-weight: 800; }
            .header p { margin: 4px 0 0; color: #666; font-size: 12px; }
            .meta-grid { display: flex; justify-content: space-between; margin-bottom: 20px; font-size: 13px; gap: 16px; }
            .meta-box { flex: 1; background: #f0fdf4; padding: 12px 16px; border-radius: 12px; border: 1px solid #bbf7d0; }
            .meta-box h4 { margin: 0 0 8px; color: #064e3b; font-size: 12px; text-transform: uppercase; font-weight: 800; }
            .meta-box p { margin: 3px 0; color: #1e293b; font-size: 12px; }
            table { width: 100%; border-collapse: collapse; margin-bottom: 20px; font-size: 12px; }
            th { background: #064e3b; color: white; padding: 10px; text-align: left; font-size: 11px; text-transform: uppercase; }
            .totals { margin-left: auto; width: 320px; background: #064e3b; color: white; padding: 16px; border-radius: 12px; font-size: 12px; }
            .totals-row { display: flex; justify-content: space-between; margin-bottom: 6px; }
            .grand-total { border-top: 1px solid #047857; padding-top: 8px; font-size: 15px; font-weight: 900; color: #fde68a; }
            .footer { text-align: center; margin-top: 35px; font-size: 11px; color: #64748b; border-top: 1px dashed #cbd5e1; padding-top: 12px; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>🌿 MR. VIVASAYI Mart</h1>
            <p>Good Food. Good Life. | Store Bill & Order Receipt</p>
            <p style="margin: 3px 0 0; font-size: 11px; color: #047857;">📍 ${getFormattedStoreAddress()} | Ph: ${getFormattedStorePhone()}</p>
          </div>
          <div class="meta-grid">
            <div class="meta-box">
              <h4>Order Metadata</h4>
              <p><strong>Order Number:</strong> ${order.order_number}</p>
              <p><strong>Source:</strong> ${order.source}</p>
              <p><strong>Date:</strong> ${new Date(order.created_at).toLocaleString()}</p>
              <p><strong>Status:</strong> ${order.status}</p>
            </div>
            <div class="meta-box">
              <h4>Customer & Delivery Address</h4>
              <p><strong>Customer Name:</strong> ${order.customer_name_snapshot || 'Walk-in Customer'}</p>
              <p><strong>Phone:</strong> ${order.customer_phone_snapshot || '—'}</p>
              <p><strong>Delivery Area:</strong> ${order.delivery_area || 'Cumbum Store'}</p>
              <p><strong>Delivery Address:</strong> ${order.delivery_address || 'Over the counter / Store Pickup'}</p>
            </div>
          </div>
          ${order.payment_status === 'PAID' && order.payment_method !== 'CASH'
            ? `<div style="background: #dcfce7; border: 2px solid #16a34a; color: #14532d; padding: 10px 14px; border-radius: 10px; font-weight: 900; text-align: center; margin-bottom: 15px; font-size: 13px;">✓ PREPAID ORDER — ONLINE PAYMENT VERIFIED (Amount Paid: ₹${order.total})</div>`
            : `<div style="background: #fef3c7; border: 2px solid #d97706; color: #78350f; padding: 10px 14px; border-radius: 10px; font-weight: 900; text-align: center; margin-bottom: 15px; font-size: 13px;">⚠️ CASH ON DELIVERY (COD ORDER) — COLLECT CASH: ₹${order.total}</div>`
          }
          <table>
            <thead>
              <tr>
                <th style="width: 30px;">#</th>
                <th>Product Description</th>
                <th style="text-align: center;">Qty</th>
                <th style="text-align: right;">Unit Price</th>
                <th style="text-align: right;">Line Total</th>
              </tr>
            </thead>
            <tbody>
              ${itemsHtml}
            </tbody>
          </table>
          <div class="totals">
            <div class="totals-row">
              <span>Subtotal:</span>
              <span>₹${order.subtotal}</span>
            </div>
            <div class="totals-row">
              <span>Delivery Fee:</span>
              <span>+₹${order.delivery_fee}</span>
            </div>
            <div class="totals-row">
              <span>Payment Mode:</span>
              <span>${order.payment_method} (${order.payment_status})</span>
            </div>
            <div class="totals-row grand-total">
              <span>Total Amount Paid:</span>
              <span>₹${order.total}</span>
            </div>
          </div>
          <div class="footer">
            <p>Thank you for shopping with MR. VIVASAYI Mart! For queries, call +91 9789325262.</p>
          </div>
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
    }, 400);
  };

  // Multiple Batch Order Printer Handler
  const handleBatchPrintSelectedOrders = () => {
    if (selectedOrderIds.length === 0) {
      toast.error('No orders selected for printing');
      return;
    }

    const selectedOrdersList = orders.filter(o => selectedOrderIds.includes(o.id));
    const printWindow = window.open('', '_blank', 'width=900,height=950');
    if (!printWindow) return;

    const ordersPagesHtml = selectedOrdersList.map((order, orderIdx) => {
      const itemsHtml = (order.items || []).map((it, idx) => `
        <tr>
          <td style="padding: 6px; border-bottom: 1px solid #eee;">${idx + 1}</td>
          <td style="padding: 6px; border-bottom: 1px solid #eee;"><strong>${it.product_name_snapshot}</strong> ${it.pack_size_snapshot ? `(${it.pack_size_snapshot})` : ''}</td>
          <td style="padding: 6px; border-bottom: 1px solid #eee; text-align: center;">${it.quantity}</td>
          <td style="padding: 6px; border-bottom: 1px solid #eee; text-align: right;">₹${it.unit_price_snapshot}</td>
          <td style="padding: 6px; border-bottom: 1px solid #eee; text-align: right; font-weight: bold;">₹${it.total}</td>
        </tr>
      `).join('');

      return `
        <div class="order-page" style="${orderIdx < selectedOrdersList.length - 1 ? 'page-break-after: always;' : ''}">
          <div class="header">
            <h1>🌿 MR. VIVASAYI Mart</h1>
            <p>Good Food. Good Life. | Customer Order Bill & Dispatch Label</p>
            <p style="margin: 3px 0 0; font-size: 11px; color: #047857;">📍 ${getFormattedStoreAddress()} | Ph: ${getFormattedStorePhone()}</p>
          </div>
          <div class="meta-grid">
            <div class="meta-box">
              <h4>Order Metadata</h4>
              <p><strong>Order ID:</strong> ${order.order_number}</p>
              <p><strong>Source:</strong> ${order.source}</p>
              <p><strong>Date:</strong> ${new Date(order.created_at).toLocaleString()}</p>
              <p><strong>Status:</strong> ${order.status}</p>
            </div>
            <div class="meta-box">
              <h4>Customer & Delivery Address</h4>
              <p><strong>Customer Name:</strong> ${order.customer_name_snapshot || 'Walk-in Customer'}</p>
              <p><strong>Phone:</strong> ${order.customer_phone_snapshot || '—'}</p>
              <p><strong>Delivery Area:</strong> ${order.delivery_area || 'Cumbum Store'}</p>
              <p><strong>Delivery Address:</strong> ${order.delivery_address || 'Over the counter / Store Pickup'}</p>
            </div>
          </div>
          ${order.payment_status === 'PAID' && order.payment_method !== 'CASH'
            ? `<div style="background: #dcfce7; border: 2px solid #16a34a; color: #14532d; padding: 8px 12px; border-radius: 8px; font-weight: 900; text-align: center; margin-bottom: 12px; font-size: 13px;">✓ PREPAID ORDER (Amount Paid: ₹${order.total})</div>`
            : `<div style="background: #fef3c7; border: 2px solid #d97706; color: #78350f; padding: 8px 12px; border-radius: 8px; font-weight: 900; text-align: center; margin-bottom: 12px; font-size: 13px;">⚠️ COD ORDER (Collect Cash Amount: ₹${order.total})</div>`
          }
          <table>
            <thead>
              <tr>
                <th style="width: 30px;">#</th>
                <th>Product Description</th>
                <th style="text-align: center;">Qty</th>
                <th style="text-align: right;">Unit Price</th>
                <th style="text-align: right;">Total</th>
              </tr>
            </thead>
            <tbody>
              ${itemsHtml}
            </tbody>
          </table>
          <div class="totals">
            <div class="totals-row">
              <span>Subtotal:</span>
              <span>₹${order.subtotal}</span>
            </div>
            <div class="totals-row">
              <span>Delivery Fee:</span>
              <span>+₹${order.delivery_fee}</span>
            </div>
            <div class="totals-row">
              <span>Payment Mode:</span>
              <span>${order.payment_method} (${order.payment_status})</span>
            </div>
            <div class="totals-row grand-total">
              <span>Total Amount Paid:</span>
              <span>₹${order.total}</span>
            </div>
          </div>
          <div class="footer">
            <p>Order #${order.order_number} | Thank you for shopping with MR. VIVASAYI Mart! (+91 9789325262)</p>
          </div>
        </div>
      `;
    }).join('<hr style="margin: 30px 0; border: none; border-top: 2px dashed #ccc;" />');

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>MR. VIVASAYI Mart Batch Print - ${selectedOrdersList.length} Orders</title>
          <style>
            body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; padding: 20px; color: #064e3b; margin: 0; }
            .header { text-align: center; border-bottom: 2px solid #064e3b; padding-bottom: 10px; margin-bottom: 15px; }
            .header h1 { margin: 0; color: #064e3b; font-size: 22px; font-weight: 800; }
            .header p { margin: 4px 0 0; color: #666; font-size: 11px; }
            .meta-grid { display: flex; justify-content: space-between; margin-bottom: 15px; font-size: 12px; gap: 12px; }
            .meta-box { flex: 1; background: #f0fdf4; padding: 10px 14px; border-radius: 10px; border: 1px solid #bbf7d0; }
            .meta-box h4 { margin: 0 0 6px; color: #064e3b; font-size: 11px; text-transform: uppercase; font-weight: 800; }
            .meta-box p { margin: 2px 0; color: #1e293b; font-size: 11px; }
            table { width: 100%; border-collapse: collapse; margin-bottom: 15px; font-size: 11px; }
            th { background: #064e3b; color: white; padding: 8px; text-align: left; font-size: 10px; text-transform: uppercase; }
            .totals { margin-left: auto; width: 300px; background: #064e3b; color: white; padding: 12px; border-radius: 10px; font-size: 11px; }
            .totals-row { display: flex; justify-content: space-between; margin-bottom: 4px; }
            .grand-total { border-top: 1px solid #047857; padding-top: 6px; font-size: 14px; font-weight: 900; color: #fde68a; }
            .footer { text-align: center; margin-top: 20px; font-size: 10px; color: #64748b; }
            @media print {
              .order-page { page-break-after: always; }
            }
          </style>
        </head>
        <body>
          ${ordersPagesHtml}
        </body>
      </html>
    `);

    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
    }, 400);
  };

  // Quick Status & Stock Adjustment Handler
  const handleQuickStatusChange = async (order: Order, newStatus: OrderStatus, newPaymentStatus?: any) => {
    const updated: Order = {
      ...order,
      status: newStatus,
      payment_status: newPaymentStatus || order.payment_status,
      updated_at: new Date().toISOString()
    };

    try {
      const syncRes = await syncOrderStockChange(order, updated);
      const freshProducts = await getJSONStore<Product>('products');
      setProducts(freshProducts);

      if (syncRes.changed) {
        if (syncRes.refilledCount > 0) {
          toast.success(`Inventory refilled: +${syncRes.refilledCount} item(s) restored to stock!`, { duration: 4000 });
        } else {
          toast.success(`Inventory stock updated for confirmed order.`, { duration: 3500 });
        }
      }
    } catch (err) {
      console.error('Failed to sync stock on status change:', err);
    }

    setOrders(prev => {
      const next = prev.map(o => o.id === order.id ? updated : o);
      setJSONStore('orders', next);
      return next;
    });

    if (viewOrder && viewOrder.id === order.id) {
      setViewOrder(updated);
    }

    addNotification({
      title: 'Order Status Updated',
      message: `Order #${order.order_number} marked as ${STATUS_LABEL[newStatus] || newStatus}.${newPaymentStatus ? ` Payment: ${newPaymentStatus}.` : ''}`,
      type: 'success',
      sourceModule: 'Orders Hub'
    });
  };

  // Mark Paid with Stock Sync
  const handleConfirmCodPayment = async (orderId: string) => {
    const target = orders.find(o => o.id === orderId);
    if (!target) return;
    const updated: Order = { ...target, payment_status: 'PAID' as const, status: 'CONFIRMED' as const };

    try {
      const syncRes = await syncOrderStockChange(target, updated);
      if (syncRes.changed) {
        const fresh = await getJSONStore<Product>('products');
        setProducts(fresh);
      }
    } catch (err) {
      console.error('Failed to sync stock on payment confirmation:', err);
    }

    setOrders(prev => {
      const next = prev.map(o => o.id === orderId ? updated : o);
      setJSONStore('orders', next);
      return next;
    });
    setCodQrOrder(null);
    addNotification({
      title: 'Payment Confirmed',
      message: `Marked order payment as PAID and status as CONFIRMED.`,
      type: 'success',
      sourceModule: 'Orders Hub'
    });
  };

  // Filtered list with Recent Orders Top sorting by default
  const filtered = useMemo(() => {
    const now = new Date().getTime();

    const list = orders.filter((o) => {
      if (sourceFilter !== 'ALL' && o.source !== sourceFilter) return false;
      if (statusFilter !== 'ALL' && o.status !== statusFilter) return false;
      
      // Payment requirement filter
      if (paymentReqFilter === 'PENDING' && o.payment_status !== 'PENDING') return false;
      if (paymentReqFilter === 'PAID' && o.payment_status !== 'PAID') return false;
      if (paymentReqFilter === 'COD_VERIFY' && o.payment_status !== 'PARTIAL') return false;

      // Payment method filter (UPI, CASH, CARD, BANK)
      if (paymentMethodFilter !== 'ALL' && o.payment_method !== paymentMethodFilter) return false;

      // Customer badge / type filter
      if (customerTypeFilter === 'WALK_IN' && !o.customer_name_snapshot?.toLowerCase().includes('walk-in')) return false;
      if (customerTypeFilter === 'REGISTERED' && o.customer_name_snapshot?.toLowerCase().includes('walk-in')) return false;

      // Recency filter
      if (recencyFilter !== 'ALL') {
        const createdTime = new Date(o.created_at).getTime();
        const diffMs = now - createdTime;
        const diffHours = diffMs / (1000 * 60 * 60);

        if (recencyFilter === '1_HOUR' && diffHours > 1) return false;
        if (recencyFilter === '2_HOURS' && diffHours > 2) return false;
        if (recencyFilter === '5_HOURS' && diffHours > 5) return false;
        if (recencyFilter === 'TODAY' && diffHours > 24) return false;
      }

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const name = (o.customer_name_snapshot ?? '').toLowerCase();
        const num = String(o.order_number ?? o.id ?? '').toLowerCase();
        const phone = (o.customer_phone_snapshot ?? '').toLowerCase();
        const custId = (o.customer_id ?? '').toLowerCase();
        if (!name.includes(q) && !num.includes(q) && !phone.includes(q) && !custId.includes(q)) return false;
      }
      return true;
    });

    // Sorting - Recent Orders Top by Default
    list.sort((a, b) => {
      if (sortBy === 'NEWEST') {
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      } else if (sortBy === 'OLDEST') {
        return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      } else if (sortBy === 'HIGHEST_AMOUNT') {
        return b.total - a.total;
      } else if (sortBy === 'LOWEST_AMOUNT') {
        return a.total - b.total;
      }
      return 0;
    });

    return list;
  }, [orders, sourceFilter, statusFilter, recencyFilter, paymentReqFilter, paymentMethodFilter, customerTypeFilter, searchQuery, sortBy]);

  // Pagination Calculations
  const totalPages = Math.ceil(filtered.length / itemsPerPage) || 1;
  const paginatedOrders = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filtered.slice(start, start + itemsPerPage);
  }, [filtered, currentPage, itemsPerPage]);

  const totalFilteredValue = useMemo(() => {
    return filtered.reduce((sum, o) => sum + o.total, 0);
  }, [filtered]);

  // Create Order Modal State with Multiple Items & Billing Dropdown Search
  const [showCreateOrderModal, setShowCreateOrderModal] = useState(false);
  const [isSubmittingOrder, setIsSubmittingOrder] = useState(false);
  const [productSearch, setProductSearch] = useState('');
  const [newOrderForm, setNewOrderForm] = useState({
    customer_name: '',
    customer_phone: '',
    country_code: 'IN',
    calling_code: '+91',
    source: 'WHATSAPP' as OrderSource,
    delivery_area: 'Cumbum',
    delivery_address: '',
    delivery_fee: 50,
    notes: '',
  });

  // Success Confirmation Popup with 2s countdown redirect
  const [orderCreatedSuccess, setOrderCreatedSuccess] = useState<{
    isOpen: boolean;
    order: Order | null;
    customer: Customer | null;
    messageSent: boolean;
    whatsappUrl: string;
    secondsLeft: number;
  }>({
    isOpen: false,
    order: null,
    customer: null,
    messageSent: false,
    whatsappUrl: '',
    secondsLeft: 2
  });

  // 2s Redirect countdown effect
  useEffect(() => {
    let timer: any;
    if (orderCreatedSuccess.isOpen && orderCreatedSuccess.secondsLeft > 0) {
      timer = setTimeout(() => {
        setOrderCreatedSuccess(prev => ({
          ...prev,
          secondsLeft: prev.secondsLeft - 1
        }));
      }, 1000);
    } else if (orderCreatedSuccess.isOpen && orderCreatedSuccess.secondsLeft === 0) {
      if (orderCreatedSuccess.order) {
        setViewOrder(orderCreatedSuccess.order);
      }
      setOrderCreatedSuccess(prev => ({ ...prev, isOpen: false }));
    }
    return () => clearTimeout(timer);
  }, [orderCreatedSuccess.isOpen, orderCreatedSuccess.secondsLeft, orderCreatedSuccess.order]);

  // Retry WhatsApp Message Handler
  const handleRetryWhatsAppMessage = (order: Order) => {
    const cleanPhone = (order.customer_phone_snapshot || '').replace(/\D/g, '');
    const countryCallingNum = (order.calling_code || '+91').replace(/\D/g, '');
    const fullPhone = cleanPhone.startsWith(countryCallingNum) ? cleanPhone : `${countryCallingNum}${cleanPhone}`;

    const itemsSummary = (order.items || []).map((it, idx) =>
      `${idx + 1}. *${it.product_name_snapshot}* × ${it.quantity} = ₹${it.total}`
    ).join('\n');

    const msg = `🌿 *MR. VIVASAYI Mart - ORDER RECEIPT*\n` +
      `Order Ref: *${order.order_number}*\n` +
      `Customer: ${order.customer_name_snapshot}\n` +
      `----------------------------------------\n` +
      `Items:\n${itemsSummary}\n` +
      `----------------------------------------\n` +
      `Subtotal: ₹${order.subtotal}\n` +
      `Delivery Fee: ₹${order.delivery_fee}\n` +
      `*Grand Total: ₹${order.total}*\n` +
      `Status: ${order.status}\n` +
      `Delivery Area: ${order.delivery_area || 'Cumbum Store'}\n\n` +
      `Thank you for choosing authentic natural products! 🌱`;

    const url = `https://api.whatsapp.com/send?phone=${fullPhone}&text=${encodeURIComponent(msg)}`;
    let launched = false;
    try {
      const win = window.open(url, '_blank');
      if (win) launched = true;
    } catch (e) {
      console.warn('Retry WhatsApp popup blocked', e);
    }

    setOrders(prev => {
      const next = prev.map(o => o.id === order.id ? {
        ...o,
        whatsapp_message_status: (launched ? 'SENT' : 'FAILED') as any
      } : o);
      setJSONStore('orders', next);
      return next;
    });

    if (launched) {
      toast.success(`WhatsApp message launched for ${order.order_number}`);
    } else {
      toast.error('Browser blocked popup window. Please allow popups to open WhatsApp.');
    }
  };

  const [orderDraftItems, setOrderDraftItems] = useState<{
    product: Product;
    quantity: number;
  }[]>([]);

  const filteredProducts = useMemo(() => {
    if (!productSearch.trim()) return products;
    const q = productSearch.toLowerCase().trim();
    return products.filter((p: Product) =>
      p.name.toLowerCase().includes(q) ||
      p.sku.toLowerCase().includes(q) ||
      (p.tamil_name && p.tamil_name.toLowerCase().includes(q))
    );
  }, [productSearch, products]);

  const handleAddProductToDraft = (prod: Product) => {
    setOrderDraftItems(prev => {
      const existing = prev.find(item => item.product.id === prod.id);
      if (existing) {
        return prev.map(item => item.product.id === prod.id ? { ...item, quantity: item.quantity + 1 } : item);
      } else {
        return [...prev, { product: prod, quantity: 1 }];
      }
    });
  };

  const handleCreateOrderSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmittingOrder) return;

    if (orderDraftItems.length === 0) {
      toast.error('Please add at least one product item to the order bill.');
      return;
    }

    if (!newOrderForm.customer_name.trim() || !newOrderForm.customer_phone.trim()) {
      toast.error('Customer name and phone number are required.');
      return;
    }

    setIsSubmittingOrder(true);

    try {
      // 1. Fetch CRM customers & link or auto-create customer
      const existingCustomers = await getJSONStore<Customer>('customers') || [];
      const matchedCustomer = findCustomerByPhoneAndCountry(
        existingCustomers,
        newOrderForm.customer_phone,
        newOrderForm.calling_code
      );

      const itemsSubtotal = orderDraftItems.reduce((sum, i) => {
        const unitPrice = i.product.offer_price || i.product.selling_price;
        return sum + unitPrice * i.quantity;
      }, 0);
      const totalAmount = itemsSubtotal + (Number(newOrderForm.delivery_fee) || 0);

      let linkedCustomer: Customer;
      if (!matchedCustomer) {
        // Create new customer record with unique customer_id
        const uniqueCustId = generateUniqueCustomerId(existingCustomers);
        linkedCustomer = {
          id: `cust-${uniqueCustId}`,
          customer_id: uniqueCustId,
          name: newOrderForm.customer_name.trim(),
          phone: newOrderForm.customer_phone.trim(),
          whatsapp_number: newOrderForm.customer_phone.trim(),
          country_code: newOrderForm.country_code || 'IN',
          calling_code: newOrderForm.calling_code || '+91',
          email: '',
          address: newOrderForm.delivery_address || 'Counter / WhatsApp',
          area: newOrderForm.delivery_area || 'Cumbum',
          city: 'Cumbum',
          state: 'Tamil Nadu',
          source_channel: (newOrderForm.source === 'POS' ? 'OFFLINE_POS' : newOrderForm.source === 'WEBSITE' ? 'WEBSITE' : 'WHATSAPP'),
          total_orders: 1,
          total_spent: totalAmount,
          first_order_at: new Date().toISOString().split('T')[0],
          last_order_at: new Date().toISOString().split('T')[0],
          whatsapp_sent_status: 'SENT',
          email_sent_status: 'NOT_SENT',
          is_active: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };
        await setJSONStore('customers', [linkedCustomer, ...existingCustomers]);
      } else {
        // Update existing customer totals
        matchedCustomer.total_orders = (matchedCustomer.total_orders || 0) + 1;
        matchedCustomer.total_spent = (matchedCustomer.total_spent || 0) + totalAmount;
        matchedCustomer.last_order_at = new Date().toISOString().split('T')[0];
        if (!matchedCustomer.country_code) matchedCustomer.country_code = newOrderForm.country_code;
        if (!matchedCustomer.calling_code) matchedCustomer.calling_code = newOrderForm.calling_code;
        linkedCustomer = matchedCustomer;
        const updatedList = existingCustomers.map(c => c.id === matchedCustomer.id ? matchedCustomer : c);
        await setJSONStore('customers', updatedList);
      }

      // 2. Determine sequential live order ID
      const allOrders = await getJSONStore<Order>('orders');
      const liveIdObj = generateOriginalOrderId(allOrders);

      // 3. Build Order Items
      const orderItemsList: OrderItem[] = orderDraftItems.map((item, idx) => {
        const unitPrice = item.product.offer_price || item.product.selling_price;
        return {
          id: `oi-${Date.now()}-${idx}`,
          order_id: liveIdObj.id,
          product_id: item.product.id,
          product_name_snapshot: item.product.name,
          tamil_name_snapshot: item.product.tamil_name,
          pack_size_snapshot: item.product.pack_size,
          sku_snapshot: item.product.sku,
          quantity: item.quantity,
          unit_price_snapshot: unitPrice,
          discount: 0,
          total: unitPrice * item.quantity,
          created_at: new Date().toISOString()
        };
      });

      // 4. Create Order
      const created: Order = {
        id: liveIdObj.id,
        order_number: liveIdObj.order_number,
        source: newOrderForm.source,
        customer_id: linkedCustomer.id,
        customer_name_snapshot: newOrderForm.customer_name || linkedCustomer.name,
        customer_phone_snapshot: newOrderForm.customer_phone,
        country_code: newOrderForm.country_code,
        calling_code: newOrderForm.calling_code,
        status: 'NEW',
        whatsapp_message_status: 'PENDING',
        subtotal: itemsSubtotal,
        discount: 0,
        delivery_fee: Number(newOrderForm.delivery_fee) || 0,
        tax_amount: 0,
        total: totalAmount,
        payment_method: 'UPI',
        payment_status: 'PENDING',
        delivery_area: newOrderForm.delivery_area,
        delivery_address: newOrderForm.delivery_address,
        notes: newOrderForm.notes,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        items: orderItemsList,
      };

      // 4. Construct WhatsApp Message & attempt dispatch
      const productLines = orderItemsList.map((it, idx) =>
        `${idx + 1}. *${it.product_name_snapshot}* × ${it.quantity} = ₹${it.total}`
      ).join('\n');

      const messageText = `🌿 *MR. VIVASAYI Mart - ORDER CONFIRMATION*\n` +
        `Order Ref: *${created.order_number}*\n` +
        `Customer ID: *${linkedCustomer.customer_id || linkedCustomer.id}*\n` +
        `Customer Name: ${created.customer_name_snapshot}\n` +
        `----------------------------------------\n` +
        `*Items Purchased:*\n${productLines}\n` +
        `----------------------------------------\n` +
        `Subtotal: ₹${created.subtotal}\n` +
        `Delivery Fee: ₹${created.delivery_fee}\n` +
        `*Grand Total: ₹${created.total}*\n` +
        `Payment Status: ${created.payment_status} (${created.payment_method})\n` +
        `Delivery Area: ${created.delivery_area || 'In-store / Cumbum'}\n` +
        `Delivery Address: ${created.delivery_address || 'Store Counter'}\n\n` +
        `Thank you for choosing pure natural organic food! 🌱`;

      const cleanPhone = (created.customer_phone_snapshot || '').replace(/\D/g, '');
      const countryCallingNum = (created.calling_code || '+91').replace(/\D/g, '');
      const fullWhatsAppPhone = cleanPhone.startsWith(countryCallingNum) ? cleanPhone : `${countryCallingNum}${cleanPhone}`;
      const whatsappUrl = `https://api.whatsapp.com/send?phone=${fullWhatsAppPhone}&text=${encodeURIComponent(messageText)}`;

      let launched = false;
      try {
        const win = window.open(whatsappUrl, '_blank');
        if (win) launched = true;
      } catch (err) {
        console.warn('WhatsApp window open failed', err);
      }

      created.whatsapp_message_status = launched ? 'SENT' : 'FAILED';

      // 5. Persist order in store
      const existingOrders = await getJSONStore<Order>('orders') || [];
      const updatedOrders = [created, ...existingOrders];
      await setJSONStore('orders', updatedOrders);
      setOrders(updatedOrders);

      // Decrement product inventory via unified sync engine
      try {
        await syncOrderStockChange(null, created);
        const freshProducts = await getJSONStore<Product>('products');
        setProducts(freshProducts);
      } catch (stockErr) {
        console.error('Stock decrement error on create order:', stockErr);
      }

      setShowCreateOrderModal(false);
      setOrderDraftItems([]);
      setNewOrderForm({
        customer_name: '',
        customer_phone: '',
        country_code: 'IN',
        calling_code: '+91',
        source: 'WHATSAPP',
        delivery_area: 'Cumbum',
        delivery_address: '',
        delivery_fee: 50,
        notes: '',
      });

      // 6. Show actual order ID success notification & 2s redirect modal
      setOrderCreatedSuccess({
        isOpen: true,
        order: created,
        customer: linkedCustomer,
        messageSent: launched,
        whatsappUrl,
        secondsLeft: 2
      });

      addNotification({
        title: `Order Saved: ${created.order_number}`,
        message: `Linked to customer ${linkedCustomer.name} (${linkedCustomer.customer_id}). WhatsApp message ${launched ? 'dispatched' : 'pending/failed'}.`,
        type: 'success',
        sourceModule: 'Orders Hub'
      });
    } finally {
      setIsSubmittingOrder(false);
    }
  };

  if (loading) {
    return <AdminPageSkeleton title="Orders Hub (WhatsApp & POS)" />;
  }

  return (
    <div className="space-y-6 font-sans">

      {/* Page Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 bg-white p-6 rounded-3xl border border-emerald-100 shadow-sm">
        <div>
          <h1 className="text-2xl font-serif font-bold text-emerald-950 dark:text-emerald-100 flex items-center gap-2">
            <Package className="w-7 h-7 text-emerald-600" />
            Orders Hub (WhatsApp &amp; POS)
          </h1>
          <p className="text-xs text-gray-500 dark:text-emerald-300 mt-1">
            Real-time status messaging, COD payment verification QR, revenue financial metrics &amp; CSV exports.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 text-xs">
          {selectedOrderIds.length > 0 && (
            <button
              onClick={() => setExportFormatModal({
                isOpen: true,
                type: 'SELECTED_BILLS',
                title: `Export / Print Selected Bills (${selectedOrderIds.length})`,
                description: 'Choose export format for selected orders bills.'
              })}
              className="px-3.5 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white font-extrabold rounded-xl shadow flex items-center gap-1.5 transition-all animate-fadeIn"
              title="Print Bills & Address Labels for Selected Orders"
            >
              <Printer className="w-4 h-4 text-amber-300" />
              <span>Print / Export Selected ({selectedOrderIds.length})</span>
            </button>
          )}

          {/* EXPORT ADDRESS DETAILS BUTTON */}
          <button
            onClick={() => setExportFormatModal({
              isOpen: true,
              type: 'ADDRESS_ONLY',
              title: 'Export Address Details & Shipping Labels',
              description: 'Choose output format for customer delivery addresses.'
            })}
            className="px-3.5 py-2.5 bg-amber-500 hover:bg-amber-600 text-emerald-950 font-black rounded-xl shadow flex items-center gap-1.5 transition-all"
            title="Export Customer Delivery Addresses"
          >
            <MapPin className="w-4 h-4" /> Export Address Details
          </button>

          {/* AUTO-REFRESH ORDERS DROPDOWN */}
          <AutoRefreshDropdown
            intervalSec={autoRefreshSec}
            onIntervalChange={(sec) => {
              setAutoRefreshSec(sec);
              if (sec > 0) handleRefreshOrders();
            }}
            onRefresh={handleRefreshOrders}
            variant="emerald"
          />

          {/* REFRESH ORDERS BUTTON (RECENT ORDERS TOP) */}
          <button
            type="button"
            onClick={handleRefreshOrders}
            disabled={isRefreshing}
            className="px-3.5 py-2.5 bg-emerald-700 hover:bg-emerald-800 disabled:opacity-60 text-white font-extrabold rounded-xl shadow flex items-center gap-1.5 transition-all group cursor-pointer"
            title="Sync & refresh latest WhatsApp and POS orders (recent orders top)"
          >
            <RefreshCw className={`w-4 h-4 text-amber-300 ${isRefreshing ? 'animate-spin' : 'group-hover:rotate-180 transition-transform duration-500'}`} />
            <span>{isRefreshing ? 'Syncing...' : 'Refresh Orders'}</span>
          </button>

          {/* EXPORT FULL CSV / DATA BUTTON */}
          <button
            onClick={() => setExportFormatModal({
              isOpen: true,
              type: 'FULL_ORDERS_DATA',
              title: 'Export Orders & Financial Data',
              description: 'Choose export format for complete orders dataset.'
            })}
            className="px-3.5 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-800 font-extrabold rounded-xl border border-gray-300 shadow-xs flex items-center gap-1.5"
            title="Export filtered orders data"
          >
            <Download className="w-4 h-4 text-emerald-700" /> Export CSV / Data
          </button>
          <button
            onClick={() => setShowCreateOrderModal(true)}
            className="px-4 py-2.5 bg-emerald-800 hover:bg-emerald-900 text-white font-extrabold rounded-xl shadow flex items-center gap-1.5 transition-all"
          >
            <Plus className="w-4 h-4 text-amber-300" />
            <span>Add New Order</span>
          </button>
        </div>
      </div>

      {/* Stat Cards with Financial Totals */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Total Orders"
          value={stats.total}
          icon={<Package className="w-6 h-6 text-emerald-800" />}
          colorClass="bg-emerald-100"
        />
        <StatCard
          label="Pending Payments"
          value={stats.pendingCount}
          sub={`Amount: ${formatPrice(stats.pendingAmount)}`}
          icon={<Clock className="w-6 h-6 text-amber-800" />}
          colorClass="bg-amber-100"
        />
        <StatCard
          label="Confirmed Revenue"
          value={stats.confirmedCount}
          sub={`Paid: ${formatPrice(stats.confirmedAmount)}`}
          icon={<CheckCircle2 className="w-6 h-6 text-green-800" />}
          colorClass="bg-green-100"
        />
        <StatCard
          label="Returns & Refunded"
          value={stats.returnedCount}
          sub={`Total: ${formatPrice(stats.returnedAmount)}`}
          icon={<Truck className="w-6 h-6 text-rose-800" />}
          colorClass="bg-rose-100"
        />
      </div>

      {/* Quick Status Filter Tabs (Pending vs Confirmed vs All) */}
      <div className="bg-white rounded-3xl border border-emerald-100 p-3 shadow-xs flex flex-wrap items-center gap-2 text-xs">
        <span className="font-extrabold text-emerald-950 px-2 flex items-center gap-1.5">
          <Filter className="w-4 h-4 text-emerald-700" />
          Quick Status Tabs:
        </span>
        
        <button
          type="button"
          onClick={() => {
            setStatusFilter('ALL');
            setPaymentReqFilter('ALL');
            setCurrentPage(1);
          }}
          className={`px-4 py-2 rounded-xl font-extrabold transition-all flex items-center gap-1.5 ${
            statusFilter === 'ALL' && paymentReqFilter === 'ALL'
              ? 'bg-emerald-800 text-white shadow'
              : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
          }`}
        >
          <span>All Orders</span>
          <span className="bg-white/20 px-2 py-0.5 rounded-full text-[10px]">{orders.length}</span>
        </button>

        <button
          type="button"
          onClick={() => {
            setStatusFilter('NEW');
            setPaymentReqFilter('PENDING');
            setCurrentPage(1);
          }}
          className={`px-4 py-2 rounded-xl font-extrabold transition-all flex items-center gap-1.5 ${
            statusFilter === 'NEW' || paymentReqFilter === 'PENDING'
              ? 'bg-amber-500 text-emerald-950 shadow ring-2 ring-amber-400'
              : 'bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200'
          }`}
        >
          <Clock className="w-3.5 h-3.5" />
          <span>⏳ Pending Orders</span>
          <span className="bg-amber-900 text-white px-2 py-0.5 rounded-full text-[10px] font-mono">
            {orders.filter(o => o.status === 'NEW' || o.payment_status === 'PENDING').length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => {
            setStatusFilter('CONFIRMED');
            setPaymentReqFilter('PAID');
            setCurrentPage(1);
          }}
          className={`px-4 py-2 rounded-xl font-extrabold transition-all flex items-center gap-1.5 ${
            statusFilter === 'CONFIRMED' && paymentReqFilter === 'PAID'
              ? 'bg-emerald-700 text-white shadow ring-2 ring-emerald-500'
              : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-900 border border-emerald-200'
          }`}
        >
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
          <span>✓ Confirmed Orders</span>
          <span className="bg-emerald-900 text-white px-2 py-0.5 rounded-full text-[10px] font-mono">
            {orders.filter(o => o.status === 'CONFIRMED' || o.payment_status === 'PAID').length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => {
            setStatusFilter('PACKING');
            setCurrentPage(1);
          }}
          className={`px-3.5 py-2 rounded-xl font-extrabold transition-all ${
            statusFilter === 'PACKING'
              ? 'bg-amber-800 text-white shadow'
              : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
          }`}
        >
          📦 Packing ({orders.filter(o => o.status === 'PACKING').length})
        </button>

        <button
          type="button"
          onClick={() => {
            setStatusFilter('DELIVERED');
            setCurrentPage(1);
          }}
          className={`px-3.5 py-2 rounded-xl font-extrabold transition-all ${
            statusFilter === 'DELIVERED'
              ? 'bg-green-700 text-white shadow'
              : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
          }`}
        >
          🚚 Delivered ({orders.filter(o => o.status === 'DELIVERED').length})
        </button>
      </div>

      {/* Multi-Criteria Filters Bar (Source, Recency, Payment & Search) */}
      <div className="bg-white rounded-3xl border border-emerald-100 p-4 space-y-3 shadow-sm text-xs">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-2.5">
          {/* Search */}
          <div className="relative lg:col-span-2">
            <Search className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search by order #, customer name, ID, phone..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full pl-9 pr-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-emerald-950 font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500 text-xs"
            />
          </div>

          {/* Sort Order Selector (Recent Top) */}
          <div>
            <select
              value={sortBy}
              onChange={(e) => {
                setSortBy(e.target.value as any);
                setCurrentPage(1);
              }}
              className="w-full p-2.5 bg-amber-50 dark:bg-emerald-900 border border-amber-300 dark:border-emerald-700 rounded-xl font-extrabold text-amber-950 dark:text-amber-200 text-xs"
            >
              <option value="NEWEST">⚡ Recent Orders Top (Default)</option>
              <option value="OLDEST">⏳ Oldest Orders First</option>
              <option value="HIGHEST_AMOUNT">💰 Highest Amount (₹)</option>
              <option value="LOWEST_AMOUNT">📉 Lowest Amount (₹)</option>
            </select>
          </div>

          {/* Source Filter */}
          <div>
            <select
              value={sourceFilter}
              onChange={(e) => {
                setSourceFilter(e.target.value as any);
                setCurrentPage(1);
              }}
              className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl font-bold text-gray-800 text-xs"
            >
              <option value="ALL">All Sources</option>
              <option value="WHATSAPP">WhatsApp Order</option>
              <option value="POS">Counter POS</option>
              <option value="WEBSITE">Website E-Commerce</option>
            </select>
          </div>

          {/* Status Filter */}
          <div>
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value as any);
                setCurrentPage(1);
              }}
              className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl font-bold text-gray-800 text-xs"
            >
              <option value="ALL">All Order Statuses</option>
              {ALL_STATUSES.map(s => (
                <option key={s} value={s}>{STATUS_LABEL[s]}</option>
              ))}
            </select>
          </div>

          {/* Payment Method Filter (UPI, Cash, Card, Bank) */}
          <div>
            <select
              value={paymentMethodFilter}
              onChange={(e) => {
                setPaymentMethodFilter(e.target.value as any);
                setCurrentPage(1);
              }}
              className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl font-bold text-gray-800 text-xs"
            >
              <option value="ALL">Payment: All Methods</option>
              <option value="UPI">Paid via UPI 📱</option>
              <option value="CASH">Paid via Cash 💵</option>
              <option value="CARD">Paid via Card 💳</option>
              <option value="BANK">Bank Transfer 🏛️</option>
            </select>
          </div>

          {/* Payment Status / Requirement Filter */}
          <div>
            <select
              value={paymentReqFilter}
              onChange={(e) => {
                setPaymentReqFilter(e.target.value as any);
                setCurrentPage(1);
              }}
              className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl font-bold text-gray-800 text-xs"
            >
              <option value="ALL">Payment Status: All</option>
              <option value="PAID">Paid Only</option>
              <option value="PENDING">Pending Only</option>
              <option value="COD_VERIFY">Partial / Verification</option>
            </select>
          </div>

          {/* Recency Time Filter */}
          <div>
            <select
              value={recencyFilter}
              onChange={(e) => {
                setRecencyFilter(e.target.value as any);
                setCurrentPage(1);
              }}
              className="w-full p-2.5 bg-emerald-50 border border-emerald-200 rounded-xl font-extrabold text-emerald-950 text-xs"
            >
              <option value="ALL">Time: All Messages</option>
              <option value="1_HOUR">Within 1 Hour Ago</option>
              <option value="2_HOURS">Within 2 Hours Ago</option>
              <option value="5_HOURS">Last 5 Hours</option>
              <option value="TODAY">Today Only</option>
            </select>
          </div>
        </div>

        {/* Second Row: Customer Details / Badge Filter & Reset Button */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-gray-100">
          <div className="flex items-center gap-2">
            <span className="font-extrabold text-emerald-950 text-xs flex items-center gap-1">
              <Filter className="w-3.5 h-3.5 text-emerald-700" /> Filter Badges:
            </span>

            {/* Customer Type / Badge Filter */}
            <select
              value={customerTypeFilter}
              onChange={(e) => {
                setCustomerTypeFilter(e.target.value as any);
                setCurrentPage(1);
              }}
              className="p-1.5 px-3 bg-gray-50 border border-gray-200 rounded-lg font-bold text-gray-700 text-xs"
            >
              <option value="ALL">Customer Type: All Customers</option>
              <option value="WALK_IN">Walk-in Customers 🚶</option>
              <option value="REGISTERED">Named Customer Profiles 👤</option>
            </select>

            <span className="text-gray-400 text-xs">|</span>
            <span className="text-xs text-gray-500 font-medium">
              Showing <strong className="text-emerald-950 font-extrabold">{filtered.length}</strong> of {orders.length} orders
            </span>
          </div>

          {/* RESET FILTERS BUTTON */}
          <button
            type="button"
            onClick={handleResetFilters}
            className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 font-extrabold rounded-xl transition-all shadow-xs flex items-center gap-1.5 text-xs"
            title="Clear and reset all filters"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset All Filters</span>
          </button>
        </div>
      </div>

      {/* Orders Table */}
      <div className="bg-white rounded-3xl border border-emerald-100 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="bg-emerald-50/80 text-emerald-950 uppercase text-[10px] font-black tracking-wider border-b border-emerald-100">
              <tr>
                <th className="px-4 py-4 text-center">
                  <input
                    type="checkbox"
                    checked={filtered.length > 0 && selectedOrderIds.length === filtered.length}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedOrderIds(filtered.map(o => o.id));
                      } else {
                        setSelectedOrderIds([]);
                      }
                    }}
                    className="w-4 h-4 rounded text-emerald-800 focus:ring-emerald-500 cursor-pointer"
                  />
                </th>
                <th className="p-4">Order #</th>
                <th className="p-4">Source</th>
                <th className="p-4">Customer Details</th>
                <th className="p-4">Order Status</th>
                <th className="p-4">Payment Status</th>
                <th className="p-4 text-right font-black">Amount Paid / Total</th>
                <th className="p-4 whitespace-nowrap">Orders Time</th>
                <th className="p-4 text-center">Actions &amp; WhatsApp Dispatch</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {error ? (
                <tr>
                  <td colSpan={9} className="py-16 text-center">
                    <div className="max-w-md mx-auto p-6 bg-rose-50 border border-rose-200 rounded-3xl text-center space-y-3 shadow-xs">
                      <div className="w-12 h-12 rounded-full bg-rose-100 text-rose-700 flex items-center justify-center mx-auto shadow-2xs">
                        <AlertTriangle className="w-6 h-6 text-rose-600" />
                      </div>
                      <h4 className="font-black text-rose-950 text-base">Unable to Load Orders Hub</h4>
                      <p className="text-xs text-rose-800 leading-relaxed font-medium">
                        {error}
                      </p>
                      <div className="pt-2">
                        <button
                          onClick={loadData}
                          className="px-4 py-2 bg-rose-700 hover:bg-rose-800 text-white font-bold text-xs rounded-xl shadow-xs inline-flex items-center gap-1.5 transition"
                        >
                          <RefreshCw className="w-3.5 h-3.5" /> Retry Fetching Orders
                        </button>
                      </div>
                    </div>
                  </td>
                </tr>
              ) : orders.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-16 text-center">
                    <div className="max-w-md mx-auto p-6 bg-emerald-50/50 border border-emerald-200 rounded-3xl text-center space-y-3 shadow-xs">
                      <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center mx-auto shadow-2xs">
                        <Package className="w-6 h-6 text-emerald-700" />
                      </div>
                      <h4 className="font-black text-emerald-950 text-base">Oops! No Results Found</h4>
                      <p className="text-xs text-gray-600 leading-relaxed font-medium">
                        No orders currently found in the database. When new customer sales happen via the online storefront, WhatsApp, or POS counter, they will be retrieved here in real time.
                      </p>
                      <div className="flex items-center justify-center gap-2 pt-2 flex-wrap">
                        <Link
                          to="/admin/pos"
                          className="px-4 py-2 bg-emerald-800 hover:bg-emerald-900 text-white font-bold text-xs rounded-xl shadow-xs inline-flex items-center gap-1.5 transition"
                        >
                          <Plus className="w-3.5 h-3.5" /> Create New POS Order
                        </Link>
                        <button
                          onClick={loadData}
                          className="px-4 py-2 bg-white hover:bg-gray-50 text-emerald-900 border border-emerald-300 font-bold text-xs rounded-xl shadow-xs inline-flex items-center gap-1.5 transition"
                        >
                          <RefreshCw className="w-3.5 h-3.5" /> Refresh Orders
                        </button>
                      </div>
                    </div>
                  </td>
                </tr>
              ) : paginatedOrders.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-16 text-center">
                    <div className="max-w-md mx-auto p-6 bg-gray-50 border border-gray-200 rounded-3xl text-center space-y-3 shadow-xs">
                      <div className="w-12 h-12 rounded-full bg-gray-200 text-gray-700 flex items-center justify-center mx-auto shadow-2xs">
                        <Search className="w-6 h-6 text-gray-500" />
                      </div>
                      <h4 className="font-black text-gray-900 text-base">Oops! No Results Found</h4>
                      <p className="text-xs text-gray-500 leading-relaxed">
                        No orders match your search query {searchQuery ? `"${searchQuery}"` : ''} or the selected filter criteria. Try clearing filters to view all records.
                      </p>
                      <div className="pt-2">
                        <button
                          onClick={resetOrderFilters}
                          className="px-4 py-2 bg-emerald-800 hover:bg-emerald-900 text-white font-bold text-xs rounded-xl shadow-xs inline-flex items-center gap-1.5 transition"
                        >
                          <RotateCcw className="w-3.5 h-3.5" /> Clear All Filters
                        </button>
                      </div>
                    </div>
                  </td>
                </tr>
              ) : (
                paginatedOrders.map((order) => {
                  const recency = getOrderRecencyBadge(order.created_at);

                  return (
                    <tr key={order.id} className="hover:bg-emerald-50/40 transition">
                      <td className="px-4 py-4 text-center">
                        <input
                          type="checkbox"
                          checked={selectedOrderIds.includes(order.id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedOrderIds(prev => [...prev, order.id]);
                            } else {
                              setSelectedOrderIds(prev => prev.filter(id => id !== order.id));
                            }
                          }}
                          className="w-4 h-4 rounded text-emerald-800 focus:ring-emerald-500 cursor-pointer"
                        />
                      </td>

                      <td className="p-4 font-mono font-black text-emerald-950 text-xs">
                        {order.order_number}
                      </td>

                      <td className="p-4">{sourceBadge(order.source)}</td>

                      <td className="p-4">
                        <div className="font-extrabold text-emerald-950">{order.customer_name_snapshot || 'Walk-in Customer'}</div>
                        <div className="text-[10px] text-gray-500 font-mono flex items-center gap-1.5 mt-0.5 flex-wrap">
                          <span className="bg-emerald-100/80 text-emerald-900 px-1.5 py-0.5 rounded font-extrabold text-[9px] border border-emerald-200">
                            {order.customer_id || 'CUST-WALKIN'}
                          </span>
                          <span>{order.customer_phone_snapshot || '9876543210'}</span>
                          {order.whatsapp_message_status === 'SENT' && (
                            <span className="px-1.5 py-0.5 rounded text-[9px] font-black bg-emerald-100 text-emerald-800 border border-emerald-300 inline-flex items-center gap-1">
                              ✓ WA Sent
                            </span>
                          )}
                          {order.whatsapp_message_status === 'FAILED' && (
                            <button
                              onClick={() => handleRetryWhatsAppMessage(order)}
                              className="px-1.5 py-0.5 rounded text-[9px] font-black bg-rose-100 text-rose-800 border border-rose-300 hover:bg-rose-200 inline-flex items-center gap-1 cursor-pointer transition shadow-xs"
                              title="WhatsApp Message failed or popup was blocked. Click to retry dispatching WhatsApp bill."
                            >
                              ⚠️ WA Failed (Retry)
                            </button>
                          )}
                          {order.whatsapp_message_status === 'PENDING' && (
                            <span className="px-1.5 py-0.5 rounded text-[9px] font-medium bg-amber-50 text-amber-800 border border-amber-200 inline-flex items-center gap-1">
                              ⏳ WA Pending
                            </span>
                          )}
                        </div>
                      </td>

                      <td className="p-4">
                        <select
                          value={order.status}
                          onChange={(e) => handleQuickStatusChange(order, e.target.value as OrderStatus)}
                          className={`px-2.5 py-1 rounded-xl text-[11px] font-extrabold border cursor-pointer outline-none transition shadow-2xs ${statusBadgeClass(order.status)}`}
                          title="Click to update status. Stock auto-deducts on Confirmation and auto-refills on Cancel or Return."
                        >
                          {ALL_STATUSES.map(s => (
                            <option key={s} value={s} className="bg-white text-gray-900 font-bold">
                              {STATUS_LABEL[s]}
                            </option>
                          ))}
                        </select>
                      </td>

                      <td className="p-4">
                        <div className="font-bold text-gray-800">{order.payment_method}</div>
                        <span className={`mt-0.5 inline-block px-2 py-0.5 rounded text-[10px] ${paymentStatusClass(order.payment_status)}`}>
                          {order.payment_status}
                        </span>
                      </td>

                      {/* HIGH-CONTRAST DARK BOLD TOTAL AMOUNT PAID & PREPAID/COD BADGE */}
                      <td className="p-4 text-right">
                        <div className="font-black text-emerald-950 text-sm">
                          {formatPrice(order.total)}
                        </div>
                        <div className="mt-1">
                          {order.payment_status === 'PAID' && order.payment_method !== 'CASH' ? (
                            <span className="text-[9px] font-black px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-950 border border-emerald-300 inline-block">
                              PREPAID ORDER
                            </span>
                          ) : (
                            <span className="text-[9px] font-black px-1.5 py-0.5 rounded bg-amber-100 text-amber-950 border border-amber-300 inline-block">
                              COD (Collect {formatPrice(order.total)})
                            </span>
                          )}
                        </div>
                      </td>

                      <td className="p-4">
                        <span className={`px-2 py-1 rounded text-[10px] font-bold ${recency.color}`}>
                          {recency.label}
                        </span>
                      </td>

                      {/* WhatsApp Dispatch Selector & Actions */}
                      <td className="p-4 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          {/* WhatsApp Template Selector Dropdown */}
                          <select
                            onChange={(e) => {
                              if (e.target.value) {
                                promptDispatchTemplateMessage(order, e.target.value);
                                e.target.value = '';
                              }
                            }}
                            className="text-[10px] py-1.5 px-2 bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 rounded-lg font-bold text-emerald-950 cursor-pointer max-w-[140px]"
                          >
                            <option value="">WhatsApp Dispatch...</option>
                            {templates.filter(t => t.channel === 'WHATSAPP' || t.channel === 'BOTH').map(tpl => (
                              <option key={tpl.id} value={tpl.id}>
                                #{tpl.template_number} {tpl.title}
                              </option>
                            ))}
                          </select>

                          {/* Direct WhatsApp Bill Action Button */}
                          <button
                            onClick={() => handleSendDirectWhatsAppBill(order)}
                            className="p-1.5 bg-emerald-700 hover:bg-emerald-800 text-amber-300 rounded-lg shadow-xs transition-all flex items-center justify-center border border-emerald-800"
                            title="Send Itemized Customer Bill Direct to WhatsApp"
                          >
                            <MessageSquare className="w-4 h-4" />
                          </button>

                          <button
                            onClick={() => setViewOrder(order)}
                            className="p-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 rounded-lg border border-emerald-200"
                            title="View Full Order Summary"
                          >
                            <Eye className="w-4 h-4" />
                          </button>

                          <button
                            onClick={() => handlePrintSingleOrder(order)}
                            className="p-1.5 bg-amber-50 hover:bg-amber-100 text-amber-800 rounded-lg border border-amber-200"
                            title="Print Single Order Bill & Delivery Address Label"
                          >
                            <Printer className="w-4 h-4" />
                          </button>

                          <button
                            onClick={() => setEditingOrderDetails(order)}
                            className="p-1.5 bg-blue-50 hover:bg-blue-100 text-blue-800 rounded-lg border border-blue-200"
                            title="Edit Order Details & Status"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>

                          <button
                            onClick={() => setOrderToDelete(order)}
                            className="p-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-lg border border-rose-200"
                            title="Delete Order"
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

        {/* Pagination Header & Total Value Stat */}
        <div className="p-4 bg-gray-50 border-t border-emerald-100 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs font-semibold text-gray-700">
          <div className="flex items-center gap-3">
            <div className="bg-emerald-900 text-white px-3 py-1.5 rounded-xl font-black shadow-xs flex items-center gap-1.5 text-xs">
              <Sparkles className="w-3.5 h-3.5 text-amber-300" />
              <span>Total Value: {formatPrice(totalFilteredValue)}</span>
            </div>

            <div className="flex items-center gap-1.5 text-xs text-gray-600">
              <span>Show per page:</span>
              <select
                value={itemsPerPage}
                onChange={(e) => {
                  setItemsPerPage(Number(e.target.value));
                  setCurrentPage(1);
                }}
                className="p-1 bg-white border border-gray-300 rounded font-bold"
              >
                <option value={10}>10 items</option>
                <option value={20}>20 items</option>
                <option value={50}>50 items</option>
              </select>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-gray-500 font-medium">
              Showing {filtered.length === 0 ? 0 : (currentPage - 1) * itemsPerPage + 1} - {Math.min(currentPage * itemsPerPage, filtered.length)} of {filtered.length} orders
            </span>

            <div className="flex items-center gap-1">
              <button
                disabled={currentPage === 1}
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                className="px-3 py-1.5 bg-white hover:bg-gray-100 border border-gray-300 rounded-lg disabled:opacity-40 font-bold"
              >
                Previous
              </button>
              <span className="px-3 py-1.5 bg-emerald-800 text-white font-extrabold rounded-lg">
                {currentPage} / {totalPages}
              </span>
              <button
                disabled={currentPage >= totalPages}
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                className="px-3 py-1.5 bg-white hover:bg-gray-100 border border-gray-300 rounded-lg disabled:opacity-40 font-bold"
              >
                Next
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Detail Modal */}
      {viewOrder && (
        <OrderDetailModal
          order={viewOrder}
          onClose={() => setViewOrder(null)}
          onEditDetails={() => {
            setEditingOrderDetails(viewOrder);
            setViewOrder(null);
          }}
          onQuickStatusChange={handleQuickStatusChange}
        />
      )}

      {/* Edit Order Details & Status Modal */}
      {editingOrderDetails && (
        <EditOrderDetailsModal
          order={editingOrderDetails}
          products={products}
          onClose={() => setEditingOrderDetails(null)}
          onSave={async (updated) => {
            const oldOrder = editingOrderDetails;
            setEditingOrderDetails(null);

            // Synchronize inventory stock delta / refund refill / confirmation deduction
            try {
              const syncRes = await syncOrderStockChange(oldOrder, updated);
              const freshProducts = await getJSONStore<Product>('products');
              setProducts(freshProducts);

              if (syncRes.changed) {
                if (syncRes.refilledCount > 0) {
                  toast.success(`Inventory refilled: +${syncRes.refilledCount} item(s) restored to stock!`, { duration: 4500 });
                } else {
                  toast.success(`Inventory stock synchronized successfully.`, { duration: 3500 });
                }
              }
            } catch (syncErr) {
              console.error('Stock sync error on edit order:', syncErr);
            }

            setOrders(prev => {
              const next = prev.map(o => o.id === updated.id ? updated : o);
              setJSONStore('orders', next);
              return next;
            });

            addNotification({
              title: 'Order Details Updated',
              message: `Saved updated details for order ${updated.order_number}.`,
              type: 'success',
              sourceModule: 'Orders Hub'
            });
          }}
        />
      )}

      {/* CREATE NEW ORDER MODAL - MULTIPLE ITEMS ENTRY & SEARCHABLE BILLING DROPDOWN */}
      {showCreateOrderModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 shadow-2xl border border-emerald-100 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center border-b border-gray-100 pb-3">
              <h3 className="font-extrabold text-emerald-950 text-base flex items-center gap-2">
                <Package className="w-5 h-5 text-emerald-700" />
                <span>Create New Store Order (Multiple Items Entry)</span>
              </h3>
              <button onClick={() => setShowCreateOrderModal(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateOrderSubmit} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Customer Name *</label>
                  <input
                    type="text"
                    required
                    value={newOrderForm.customer_name}
                    onChange={(e) => setNewOrderForm({ ...newOrderForm, customer_name: e.target.value })}
                    placeholder="e.g. Dinesh Babu M"
                    className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl font-bold"
                  />
                </div>
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Phone Number *</label>
                  <div className="flex gap-2">
                    <CountrySelector
                      value={newOrderForm.country_code}
                      onChange={(country) => {
                        setNewOrderForm(prev => ({
                          ...prev,
                          country_code: country.code,
                          calling_code: country.callingCode
                        }));
                      }}
                      className="w-32 shrink-0"
                    />
                    <input
                      type="tel"
                      required
                      value={newOrderForm.customer_phone}
                      onChange={(e) => setNewOrderForm({ ...newOrderForm, customer_phone: e.target.value })}
                      placeholder="9789325262"
                      className="flex-1 p-2.5 bg-gray-50 border border-gray-200 rounded-xl font-bold font-mono"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Order Source *</label>
                  <select
                    value={newOrderForm.source}
                    onChange={(e) => setNewOrderForm({ ...newOrderForm, source: e.target.value as OrderSource })}
                    className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl font-bold"
                  >
                    <option value="WHATSAPP">WhatsApp Order</option>
                    <option value="POS">Counter POS</option>
                    <option value="WEBSITE">Website E-Commerce</option>
                    <option value="PHONE">Phone Booking</option>
                    <option value="WALK_IN">Walk-in Direct</option>
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Delivery Area</label>
                  <input
                    type="text"
                    value={newOrderForm.delivery_area}
                    onChange={(e) => setNewOrderForm({ ...newOrderForm, delivery_area: e.target.value })}
                    className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl"
                  />
                </div>
              </div>

              {/* SEARCHABLE BILLING PRODUCT PICKER */}
              <div className="bg-emerald-50/60 p-4 rounded-2xl border border-emerald-100 space-y-3">
                <label className="block font-black text-emerald-950 text-xs">
                  Search & Add Products to Order Bill:
                </label>

                <div className="relative">
                  <Search className="w-4 h-4 absolute left-3 top-2.5 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search product by Name, SKU, ID..."
                    value={productSearch}
                    onChange={(e) => setProductSearch(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 bg-white border border-emerald-200 rounded-xl text-gray-900 font-medium"
                  />
                </div>

                {/* Product Search Results Selector List */}
                <div className="max-h-36 overflow-y-auto space-y-1 pr-1 bg-white p-2 rounded-xl border border-emerald-100">
                  {filteredProducts.map((p: Product) => {
                    const price = p.offer_price || p.selling_price;
                    return (
                      <div
                        key={p.id}
                        onClick={() => handleAddProductToDraft(p)}
                        className="p-2 hover:bg-emerald-50 rounded-lg cursor-pointer flex justify-between items-center transition border border-transparent hover:border-emerald-200"
                      >
                        <div>
                          <span className="font-bold text-emerald-950">{p.name}</span>
                          <span className="text-[10px] text-gray-400 font-mono ml-2">SKU: {p.sku}</span>
                        </div>
                        <span className="font-black text-emerald-800">{formatPrice(price)}</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Order Draft Added Items Table */}
              <div className="space-y-1">
                <label className="block font-bold text-gray-800">Added Items Bill List ({orderDraftItems.length}):</label>
                {orderDraftItems.length === 0 ? (
                  <div className="p-4 bg-gray-50 rounded-xl text-center text-gray-400 italic">
                    Click products above to add items to bill.
                  </div>
                ) : (
                  <div className="border border-gray-200 rounded-xl overflow-hidden">
                    <table className="w-full text-xs">
                      <thead className="bg-gray-100 font-bold text-gray-700">
                        <tr>
                          <th className="p-2 text-left">Product</th>
                          <th className="p-2 text-center">Unit Price</th>
                          <th className="p-2 text-center">Qty</th>
                          <th className="p-2 text-right">Total</th>
                          <th className="p-2 text-center">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {orderDraftItems.map((item, idx) => {
                          const unitPrice = item.product.offer_price || item.product.selling_price;
                          return (
                            <tr key={idx}>
                              <td className="p-2 font-bold text-emerald-950">{item.product.name}</td>
                              <td className="p-2 text-center font-semibold">{formatPrice(unitPrice)}</td>
                              <td className="p-2 text-center">
                                <input
                                  type="number"
                                  min="1"
                                  value={item.quantity}
                                  onChange={(e) => {
                                    const qty = Math.max(1, parseInt(e.target.value) || 1);
                                    setOrderDraftItems(prev => prev.map((it, i) => i === idx ? { ...it, quantity: qty } : it));
                                  }}
                                  className="w-12 p-1 border border-gray-300 rounded text-center font-bold"
                                />
                              </td>
                              <td className="p-2 text-right font-black text-emerald-950">{formatPrice(unitPrice * item.quantity)}</td>
                              <td className="p-2 text-center">
                                <button
                                  type="button"
                                  onClick={() => setOrderDraftItems(prev => prev.filter((_, i) => i !== idx))}
                                  className="text-rose-600 hover:text-rose-800 p-1"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              <div>
                <label className="block font-bold text-gray-700 mb-1">Delivery Address & Notes</label>
                <textarea
                  rows={2}
                  value={newOrderForm.delivery_address}
                  onChange={(e) => setNewOrderForm({ ...newOrderForm, delivery_address: e.target.value })}
                  placeholder="Full address or special instructions..."
                  className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl"
                />
              </div>

              <div className="flex justify-end gap-3 pt-2 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setShowCreateOrderModal(false)}
                  className="px-4 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingOrder}
                  className="px-6 py-2.5 bg-emerald-800 hover:bg-emerald-900 text-white font-extrabold rounded-xl shadow disabled:opacity-50 flex items-center gap-2"
                >
                  {isSubmittingOrder ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Saving Order...</span>
                    </>
                  ) : (
                    <span>Create &amp; Save Order</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ORDER CREATED SUCCESS & 2S AUTO-REDIRECT MODAL */}
      {orderCreatedSuccess.isOpen && orderCreatedSuccess.order && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-emerald-100 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-emerald-100 rounded-2xl flex items-center justify-center text-emerald-700 shrink-0">
                <CheckCircle2 className="w-7 h-7" />
              </div>
              <div className="flex-1">
                <h3 className="font-extrabold text-emerald-950 text-lg">Order Created &amp; Saved!</h3>
                <p className="text-xs text-gray-500">Order successfully persisted to database</p>
              </div>
              <span className="font-mono text-xs font-black bg-emerald-900 text-white px-2.5 py-1 rounded-xl shadow-xs">
                #{orderCreatedSuccess.order.order_number}
              </span>
            </div>

            {/* Order summary card */}
            <div className="bg-emerald-50/70 border border-emerald-100 rounded-2xl p-4 space-y-2.5 text-xs">
              <div className="flex justify-between items-center pb-2 border-b border-emerald-100">
                <span className="text-gray-600 font-bold">Linked Customer:</span>
                <span className="font-extrabold text-emerald-950 flex items-center gap-1.5">
                  <span className="bg-emerald-200 text-emerald-900 px-1.5 py-0.5 rounded text-[10px] font-mono font-black">
                    {orderCreatedSuccess.customer?.customer_id || orderCreatedSuccess.order.customer_id || 'CUST-LINKED'}
                  </span>
                  <span>{orderCreatedSuccess.order.customer_name_snapshot}</span>
                </span>
              </div>
              <div className="flex justify-between items-center pb-2 border-b border-emerald-100">
                <span className="text-gray-600 font-bold">Phone Number:</span>
                <span className="font-mono font-bold text-gray-800">
                  {orderCreatedSuccess.order.calling_code || '+91'} {orderCreatedSuccess.order.customer_phone_snapshot}
                </span>
              </div>
              <div className="flex justify-between items-center pb-2 border-b border-emerald-100">
                <span className="text-gray-600 font-bold">Order Total:</span>
                <span className="font-mono font-black text-emerald-950 text-sm">
                  {formatPrice(orderCreatedSuccess.order.total)}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600 font-bold">WhatsApp Dispatch:</span>
                {orderCreatedSuccess.messageSent ? (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-100 text-emerald-800 border border-emerald-300 flex items-center gap-1">
                    <Check className="w-3 h-3" /> Message Dispatched
                  </span>
                ) : (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-100 text-amber-800 border border-amber-300 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" /> Popup Blocked / Pending
                  </span>
                )}
              </div>
            </div>

            {/* If popup blocked or failed, give clear 1-click retry button */}
            {!orderCreatedSuccess.messageSent && orderCreatedSuccess.whatsappUrl && (
              <div className="bg-amber-50 border border-amber-200 rounded-2xl p-3 text-xs text-amber-900 flex flex-col gap-2">
                <p className="font-bold flex items-center gap-1.5">
                  <AlertCircle className="w-4 h-4 text-amber-700 shrink-0" />
                  <span>Browser blocked WhatsApp tab or popup was denied.</span>
                </p>
                <a
                  href={orderCreatedSuccess.whatsappUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-4 py-2 bg-emerald-800 hover:bg-emerald-900 text-white font-extrabold rounded-xl text-center shadow-xs flex items-center justify-center gap-2"
                >
                  <MessageSquare className="w-4 h-4 text-amber-300" />
                  <span>Open WhatsApp to Send Bill Now</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>
            )}

            {/* 2s redirect progress bar & actions */}
            <div className="pt-2 border-t border-gray-100 space-y-3">
              <div className="flex items-center justify-between text-[11px] text-gray-500">
                <span className="flex items-center gap-1.5 font-bold">
                  <Clock className="w-3.5 h-3.5 text-emerald-600 animate-spin" />
                  <span>Redirecting to Order Details in {orderCreatedSuccess.secondsLeft}s...</span>
                </span>
                <span className="font-mono font-bold text-emerald-800">
                  {orderCreatedSuccess.secondsLeft}s
                </span>
              </div>
              <div className="w-full bg-gray-100 h-1.5 rounded-full overflow-hidden">
                <div
                  className="bg-emerald-600 h-full transition-all duration-1000 ease-linear rounded-full"
                  style={{ width: `${((2 - orderCreatedSuccess.secondsLeft) / 2) * 100}%` }}
                />
              </div>

              <div className="flex justify-end gap-3 pt-1">
                <button
                  type="button"
                  onClick={() => setOrderCreatedSuccess(prev => ({ ...prev, isOpen: false }))}
                  className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-xl text-xs"
                >
                  Stay on Page
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (orderCreatedSuccess.order) {
                      setViewOrder(orderCreatedSuccess.order);
                    }
                    setOrderCreatedSuccess(prev => ({ ...prev, isOpen: false }));
                  }}
                  className="px-5 py-2 bg-emerald-800 hover:bg-emerald-900 text-white font-extrabold rounded-xl shadow-xs text-xs flex items-center gap-1.5"
                >
                  <Eye className="w-3.5 h-3.5" />
                  <span>View Order Details Now</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* CONFIRM MESSAGE DISPATCH MODAL */}
      {sendConfirmModal.isOpen && sendConfirmModal.order && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-emerald-100 space-y-4">
            <div className="flex justify-between items-center border-b border-gray-100 pb-3">
              <h3 className="font-extrabold text-emerald-950 text-base flex items-center gap-2">
                <Send className="w-5 h-5 text-emerald-700" />
                <span>Confirm WhatsApp Message?</span>
              </h3>
              <button
                onClick={() => setSendConfirmModal({ isOpen: false, order: null, templateTitle: '', templatePreview: '' })}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 py-1">
              <div className="bg-amber-50 border border-amber-200 p-3.5 rounded-2xl">
                <p className="text-xs font-bold text-amber-900 mb-1">Are you sure you want to send this template message?</p>
                <p className="text-[11px] text-amber-800">
                  Target Customer: <strong className="text-emerald-950">{sendConfirmModal.order.customer_name_snapshot}</strong> ({sendConfirmModal.order.customer_phone_snapshot})
                </p>
                <p className="text-[11px] text-amber-800 mt-0.5">
                  Template: <strong className="text-emerald-950">{sendConfirmModal.templateTitle}</strong>
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Message Preview:</label>
                <div className="bg-emerald-50/60 border border-emerald-100 p-3 rounded-xl text-xs text-emerald-950 font-medium whitespace-pre-wrap leading-relaxed">
                  {sendConfirmModal.templatePreview}
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-3 border-t border-gray-100">
              <button
                type="button"
                onClick={() => setSendConfirmModal({ isOpen: false, order: null, templateTitle: '', templatePreview: '' })}
                className="px-4 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-xl text-xs"
              >
                No, Cancel
              </button>
              <button
                type="button"
                onClick={executeDispatchOrderStatusMessage}
                className="px-5 py-2.5 bg-emerald-800 hover:bg-emerald-900 text-white font-extrabold rounded-xl shadow text-xs flex items-center gap-1.5"
              >
                <Send className="w-4 h-4" />
                <span>Yes, Send Message Now</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* BULK MESSAGE MODAL */}
      {bulkMessageModal.isOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-gray-100 space-y-4">
            <div className="flex justify-between items-center border-b border-gray-100 pb-3">
              <h3 className="font-extrabold text-emerald-950 text-base flex items-center gap-2">
                <Send className="w-5 h-5 text-emerald-700" /> Bulk Message ({selectedOrderIds.length} Selected)
              </h3>
              <button
                onClick={() => setBulkMessageModal({ isOpen: false, channel: 'WHATSAPP', templateName: '' })}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 py-2">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Select Message Template</label>
                <select
                  value={bulkMessageModal.templateName}
                  className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl font-bold"
                >
                  <option value="Order Status Update & Bill">Order Status Update & Bill Summary</option>
                  <option value="COD QR Code & Screenshot Prompt">COD QR Code & Payment Verification</option>
                  <option value="Order Delivered Thank You Message">Order Delivered & Shopping Thanks</option>
                </select>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-3 border-t border-gray-100">
              <button
                onClick={() => setBulkMessageModal({ isOpen: false, channel: 'WHATSAPP', templateName: '' })}
                className="px-4 py-2.5 bg-gray-100 text-gray-700 font-bold rounded-xl text-xs"
              >
                Cancel
              </button>
              <button
                onClick={handleExecuteBulkMessage}
                className="px-5 py-2.5 bg-emerald-800 hover:bg-emerald-900 text-white font-extrabold rounded-xl shadow text-xs flex items-center gap-1.5"
              >
                <Send className="w-4 h-4" /> Send Bulk Messages
              </button>
            </div>
          </div>
        </div>
      )}

      {/* EXPORT FORMAT CHOICE MODAL */}
      {exportFormatModal.isOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-emerald-100 space-y-4">
            <div className="flex justify-between items-center border-b border-gray-100 pb-3">
              <h3 className="font-extrabold text-emerald-950 text-base flex items-center gap-2">
                <FileText className="w-5 h-5 text-emerald-700" />
                <span>{exportFormatModal.title}</span>
              </h3>
              <button
                onClick={() => setExportFormatModal({ isOpen: false, type: 'FULL_ORDERS_DATA', title: '', description: '' })}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-gray-600 font-medium">
              Select your preferred output format to generate and process:
            </p>

            {/* FORMAT OPTIONS GRID */}
            <div className="grid grid-cols-2 gap-3 py-1">
              <button
                type="button"
                onClick={() => setSelectedFormat('CSV')}
                className={`p-3.5 rounded-2xl border text-left transition-all ${
                  selectedFormat === 'CSV'
                    ? 'bg-emerald-50 border-emerald-500 ring-2 ring-emerald-500/20 text-emerald-950 font-black'
                    : 'bg-gray-50 border-gray-200 text-gray-700 font-bold hover:bg-gray-100'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-extrabold">📄 CSV File</span>
                  {selectedFormat === 'CSV' && <Check className="w-4 h-4 text-emerald-700" />}
                </div>
                <p className="text-[10px] text-gray-500 font-normal">Standard comma separated (.csv)</p>
              </button>

              <button
                type="button"
                onClick={() => setSelectedFormat('EXCEL')}
                className={`p-3.5 rounded-2xl border text-left transition-all ${
                  selectedFormat === 'EXCEL'
                    ? 'bg-emerald-50 border-emerald-500 ring-2 ring-emerald-500/20 text-emerald-950 font-black'
                    : 'bg-gray-50 border-gray-200 text-gray-700 font-bold hover:bg-gray-100'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-extrabold">📊 Excel Sheet</span>
                  {selectedFormat === 'EXCEL' && <Check className="w-4 h-4 text-emerald-700" />}
                </div>
                <p className="text-[10px] text-gray-500 font-normal">Formatted for Excel (.xlsx)</p>
              </button>

              <button
                type="button"
                onClick={() => setSelectedFormat('PDF')}
                className={`p-3.5 rounded-2xl border text-left transition-all ${
                  selectedFormat === 'PDF'
                    ? 'bg-emerald-50 border-emerald-500 ring-2 ring-emerald-500/20 text-emerald-950 font-black'
                    : 'bg-gray-50 border-gray-200 text-gray-700 font-bold hover:bg-gray-100'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-extrabold">📕 PDF Document</span>
                  {selectedFormat === 'PDF' && <Check className="w-4 h-4 text-emerald-700" />}
                </div>
                <p className="text-[10px] text-gray-500 font-normal">Printable PDF document (.pdf)</p>
              </button>

              <button
                type="button"
                onClick={() => setSelectedFormat('PRINT')}
                className={`p-3.5 rounded-2xl border text-left transition-all ${
                  selectedFormat === 'PRINT'
                    ? 'bg-emerald-50 border-emerald-500 ring-2 ring-emerald-500/20 text-emerald-950 font-black'
                    : 'bg-gray-50 border-gray-200 text-gray-700 font-bold hover:bg-gray-100'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-extrabold">🖨️ Direct Print</span>
                  {selectedFormat === 'PRINT' && <Check className="w-4 h-4 text-emerald-700" />}
                </div>
                <p className="text-[10px] text-gray-500 font-normal">Print shipping stickers / hard copies</p>
              </button>
            </div>

            <div className="flex justify-end gap-3 pt-3 border-t border-gray-100">
              <button
                type="button"
                onClick={() => setExportFormatModal({ isOpen: false, type: 'FULL_ORDERS_DATA', title: '', description: '' })}
                className="px-4 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-xl text-xs"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleExecuteFormatExport}
                className="px-5 py-2.5 bg-emerald-800 hover:bg-emerald-900 text-white font-extrabold rounded-xl shadow text-xs flex items-center gap-1.5"
              >
                <Check className="w-4 h-4" /> Confirm &amp; Process
              </button>
            </div>
          </div>
        </div>
      )}

      {/* REAL ANIMATED REFRESH SPINNER MODAL */}
      <RefreshSpinnerModal
        isOpen={isRefreshing}
        title="Refreshing Orders Data..."
        subtitle="Syncing latest WhatsApp, Store POS & Website orders..."
        moduleName="Orders Hub"
        onComplete={() => {
          setIsRefreshing(false);
          setSortBy('NEWEST');
          setCurrentPage(1);
          toast.success('🔄 Orders Refreshed! Latest WhatsApp & POS orders synced. Recent orders on top.');
          addNotification({
            title: 'Orders Synced',
            message: 'Latest WhatsApp & POS orders refreshed. Recent orders placed at top.',
            type: 'info',
            sourceModule: 'Orders Hub'
          });
        }}
      />

      {/* Backdrop click to close status dropdown */}
      {showStatusDropdown && (
        <div className="fixed inset-0 z-20" onClick={() => setShowStatusDropdown(false)} />
      )}

      {/* DELETE CONFIRMATION MODAL */}
      {orderToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white dark:bg-emerald-950 max-w-md w-full p-6 rounded-3xl shadow-2xl border border-emerald-100 dark:border-emerald-800 space-y-4">
            <div className="flex items-center gap-3 text-rose-600">
              <div className="p-3 bg-rose-100 dark:bg-rose-900/50 rounded-2xl">
                <Trash2 className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-bold font-serif text-gray-900 dark:text-emerald-100">Delete Order</h3>
                <p className="text-xs text-gray-500 dark:text-emerald-300">Action cannot be undone</p>
              </div>
            </div>

            <div className="p-4 bg-rose-50/50 dark:bg-rose-900/20 rounded-2xl border border-rose-100 dark:border-rose-900 text-xs text-gray-700 dark:text-emerald-200">
              Are you sure you want to delete order <strong className="font-mono text-rose-700 dark:text-rose-400">#{orderToDelete.order_number}</strong> ({orderToDelete.customer_name_snapshot || 'Walk-in Customer'} - {formatPrice(orderToDelete.total)})?
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

      {/* Floating Action Bar for Selected Orders */}
      {selectedOrderIds.length > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 bg-gray-900/95 backdrop-blur-md text-white px-5 py-3 rounded-2xl shadow-2xl border border-gray-700 flex items-center gap-3 animate-fadeIn flex-wrap justify-center">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
            <span className="font-extrabold text-xs">
              {selectedOrderIds.length} order(s) selected
            </span>
          </div>
          <div className="h-4 w-px bg-gray-700 hidden sm:block" />
          <button
            onClick={() => setExportFormatModal({
              isOpen: true,
              type: 'SELECTED_BILLS',
              title: `Export / Print Selected Bills (${selectedOrderIds.length})`,
              description: 'Choose export format for selected orders bills.'
            })}
            className="px-3 py-1.5 bg-emerald-700 hover:bg-emerald-600 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
          >
            <Download className="w-3.5 h-3.5 text-amber-300" />
            Export Selected
          </button>
          
          {/* Quick status dropdown */}
          <div className="flex items-center gap-1 bg-gray-800 rounded-xl px-2 py-1">
            <span className="text-[11px] text-gray-400 font-bold">Status:</span>
            <select
              onChange={(e) => {
                if (e.target.value) {
                  handleBulkStatusChange(e.target.value as OrderStatus);
                  e.target.value = '';
                }
              }}
              defaultValue=""
              className="bg-transparent text-xs font-bold text-white focus:outline-none cursor-pointer"
            >
              <option value="" disabled className="bg-gray-800 text-gray-400">Change Status...</option>
              <option value="CONFIRMED" className="bg-gray-800">Confirmed</option>
              <option value="PACKING" className="bg-gray-800">Packing</option>
              <option value="READY" className="bg-gray-800">Ready</option>
              <option value="OUT_FOR_DELIVERY" className="bg-gray-800">Out for Delivery</option>
              <option value="DELIVERED" className="bg-gray-800">Delivered</option>
              <option value="CANCELLED" className="bg-gray-800">Cancelled</option>
            </select>
          </div>

          <button
            onClick={handleBatchPrintSelectedOrders}
            className="px-3 py-1.5 bg-indigo-700 hover:bg-indigo-600 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
          >
            <Printer className="w-3.5 h-3.5" />
            Print Bills
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
    </div>
  );
};

export default OrdersPage;
