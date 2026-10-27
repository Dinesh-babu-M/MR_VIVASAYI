import React, { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { 
  Search, 
  Truck, 
  Package, 
  CheckCircle2, 
  Clock, 
  MapPin, 
  ExternalLink, 
  AlertCircle, 
  Calendar, 
  ShoppingBag, 
  ArrowRight, 
  Phone, 
  Copy, 
  Check, 
  ShieldCheck,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  Eye,
  Lock
} from 'lucide-react';
import { getJSONStore } from '../../lib/dbManager';
import type { Order } from '../../types';
import { getCourierPartner } from '../../lib/deliveryRulesEngine';
import { formatPrice } from '../../lib/utils';
import toast from 'react-hot-toast';

// Privacy masking helper functions (protect sensitive user data)
function maskPhone(phone?: string): string {
  if (!phone) return '—';
  const clean = phone.replace(/\D/g, '');
  if (clean.length >= 10) {
    const visible = clean.slice(-10, -5);
    return `+91 ${visible} •••••`;
  }
  return '••••••' + clean.slice(-3);
}

function maskName(name?: string): string {
  if (!name) return 'Valued Customer';
  const parts = name.trim().split(' ');
  if (parts.length === 1) {
    return parts[0].length > 2 ? parts[0].slice(0, 3) + '***' : parts[0] + '***';
  }
  return `${parts[0]} ${parts[1][0]}***`;
}

function maskAddress(addr?: string, area?: string): string {
  const pinMatch = (addr || '').match(/\b\d{6}\b/);
  const pin = pinMatch ? `${pinMatch[0].slice(0, 3)}***` : '625***';
  if (area) {
    return `${area} (PIN: ${pin})`;
  }
  if (!addr) return 'Over the counter / Store Pickup';
  const parts = addr.split(',');
  const cityOrState = parts.length > 1 ? parts[parts.length - 2].trim() : 'Tamil Nadu';
  return `${cityOrState} (PIN: ${pin})`;
}

export default function TrackOrderPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialOrderId = searchParams.get('orderId') || searchParams.get('track') || searchParams.get('phone') || '';
  
  const [searchInput, setSearchInput] = useState(initialOrderId);
  const [searchedKey, setSearchedKey] = useState(initialOrderId);
  const [loading, setLoading] = useState(false);
  const [orders, setOrders] = useState<Order[]>([]);
  const [hasSearched, setHasSearched] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Set of expanded order IDs (accordion state)
  const [expandedOrderIds, setExpandedOrderIds] = useState<Set<string>>(new Set());

  const toggleOrderExpand = (orderId: string) => {
    setExpandedOrderIds(prev => {
      const next = new Set(prev);
      if (next.has(orderId)) {
        next.delete(orderId);
      } else {
        next.add(orderId);
      }
      return next;
    });
  };

  const fetchOrders = async (query: string) => {
    const cleanQuery = query.trim().toUpperCase();
    if (!cleanQuery) return;
    
    setLoading(true);
    setHasSearched(true);
    setSearchedKey(cleanQuery);

    try {
      const allOrders = await getJSONStore<Order>('orders');
      const cleanDigits = query.replace(/\D/g, '');
      const isPhoneQuery = cleanDigits.length >= 7;

      let matched: Order[] = [];

      if (isPhoneQuery) {
        // Find ALL orders matching this mobile number
        matched = allOrders.filter(o => {
          if (!o.customer_phone_snapshot) return false;
          const phoneDigits = o.customer_phone_snapshot.replace(/\D/g, '');
          return phoneDigits.includes(cleanDigits) || cleanDigits.includes(phoneDigits);
        });
      } else {
        // Match by Order ID or Courier Tracking Number
        matched = allOrders.filter(o => 
          (o.order_number && o.order_number.toUpperCase() === cleanQuery) ||
          (o.id && o.id.toUpperCase() === cleanQuery) ||
          (o.tracking_number && o.tracking_number.toUpperCase() === cleanQuery)
        );
      }

      // Sort by creation date descending (newest order first)
      matched.sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime());

      setOrders(matched);

      // Auto-expand the first order if only one order found
      if (matched.length === 1) {
        setExpandedOrderIds(new Set([matched[0].id]));
      } else {
        setExpandedOrderIds(new Set());
      }
    } catch (err) {
      console.error('Error fetching orders for tracking:', err);
      toast.error('Unable to fetch tracking data right now. Please try again.');
      setOrders([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (initialOrderId) {
      fetchOrders(initialOrderId);
    }
  }, [initialOrderId]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchInput.trim()) {
      toast.error('Please enter your 10-digit mobile number or Order ID');
      return;
    }
    const clean = searchInput.trim();
    if (clean.replace(/\D/g, '').length >= 10) {
      setSearchParams({ phone: clean });
    } else {
      setSearchParams({ orderId: clean });
    }
    fetchOrders(clean);
  };

  const copyTracking = (text: string, orderId: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(orderId);
    toast.success('Tracking number copied!');
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Timeline steps calculation
  const getTimelineStepIndex = (status?: string): number => {
    if (!status) return 0;
    const s = status.toUpperCase();
    if (s === 'DELIVERED') return 4;
    if (s === 'OUT_FOR_DELIVERY') return 3;
    if (s === 'DISPATCHED' || s === 'SHIPPED') return 2;
    if (s === 'CONFIRMED' || s === 'PROCESSING' || s === 'PACKED' || s === 'PACKING' || s === 'READY') return 1;
    if (s === 'CANCELLED' || s === 'RETURNED') return -1;
    return 0; // NEW / PLACED
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'DELIVERED':
        return 'bg-emerald-100 text-emerald-900 border-emerald-300';
      case 'OUT_FOR_DELIVERY':
        return 'bg-amber-100 text-amber-900 border-amber-300';
      case 'DISPATCHED':
        return 'bg-cyan-100 text-cyan-900 border-cyan-300';
      case 'READY':
      case 'PACKING':
      case 'CONFIRMED':
        return 'bg-indigo-100 text-indigo-900 border-indigo-300';
      case 'CANCELLED':
      case 'RETURNED':
        return 'bg-rose-100 text-rose-900 border-rose-300';
      default:
        return 'bg-blue-100 text-blue-900 border-blue-300';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-stone-50 via-emerald-50/20 to-stone-100 py-8 sm:py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto space-y-8">
        
        {/* Page Header */}
        <div className="text-center space-y-3">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-100/80 border border-emerald-200 text-emerald-800 text-xs font-bold uppercase tracking-wider shadow-xs">
            <Truck className="w-3.5 h-3.5 text-emerald-600 animate-pulse" />
            Live Shipment Tracker
          </div>
          <h1 className="text-2xl sm:text-4xl font-serif font-black text-stone-900 tracking-tight">
            Track Your Farm-Direct Orders
          </h1>
          <p className="text-xs sm:text-sm text-stone-600 max-w-xl mx-auto">
            Enter your <strong className="text-emerald-900 font-bold">10-Digit Mobile Number</strong> to view all your orders, or enter your <strong className="text-emerald-900 font-bold">Order ID</strong> (e.g. ORD-20261022-001) for live tracking.
          </p>
        </div>

        {/* Tracking Search Form */}
        <div className="bg-white rounded-3xl shadow-xl shadow-stone-200/60 border border-stone-200/90 p-4 sm:p-5 transition-all">
          <form onSubmit={handleSearchSubmit} className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-stone-400" />
              <input
                type="text"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="Enter 10-Digit Mobile Number (e.g. 9789325262) or Order #"
                className="w-full pl-12 pr-4 py-3.5 text-sm sm:text-base rounded-2xl border border-stone-300 focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:border-emerald-600 font-medium placeholder:text-stone-400 shadow-inner"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="inline-flex items-center justify-center gap-2 px-7 py-3.5 rounded-2xl bg-gradient-to-r from-emerald-800 to-teal-800 hover:from-emerald-900 hover:to-teal-900 text-white font-black text-sm shadow-md hover:shadow-lg transition-all active:scale-98 disabled:opacity-50"
            >
              {loading ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Searching...</span>
                </>
              ) : (
                <>
                  <span>Track Orders</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Privacy Note */}
          <div className="mt-3 pt-3 border-t border-stone-100 flex items-center justify-between text-[11px] text-stone-500">
            <span className="flex items-center gap-1.5">
              <Lock className="w-3 h-3 text-emerald-700" />
              Privacy Protected: Personal contact details are masked.
            </span>
            <span className="text-stone-400 hidden sm:inline">MR. VIVASAYI Mart Support: +91 9789325262</span>
          </div>
        </div>

        {/* Search Results Summary */}
        {hasSearched && !loading && (
          <div className="space-y-4">
            
            {orders.length === 0 ? (
              <div className="bg-white rounded-3xl p-8 border border-stone-200 text-center space-y-4 shadow-sm">
                <div className="w-16 h-16 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center mx-auto shadow-inner">
                  <AlertCircle className="w-8 h-8" />
                </div>
                <h3 className="text-lg font-black text-stone-900">No Orders Found</h3>
                <p className="text-xs sm:text-sm text-stone-600 max-w-md mx-auto leading-relaxed">
                  We couldn't find any orders matching <span className="font-mono font-bold text-stone-900">"{searchedKey}"</span>. Please make sure you entered the correct 10-digit mobile number or Order ID used during checkout.
                </p>
                <div className="pt-2">
                  <a
                    href="https://wa.me/919789325262?text=Hi%20MR.%20VIVASAYI,%20I%20need%20help%20tracking%20my%20order."
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs shadow-md transition"
                  >
                    <span>Need Help? Chat on WhatsApp</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Result header banner */}
                <div className="flex items-center justify-between px-2 text-xs font-bold text-stone-600">
                  <span>
                    Found <strong className="text-emerald-900">{orders.length} order(s)</strong> matching your search
                  </span>
                  <span className="text-[11px] text-stone-400">
                    Click each order to expand tracking & items details
                  </span>
                </div>

                {/* Collapsible Accordion Order Cards List */}
                {orders.map((order) => {
                  const isExpanded = expandedOrderIds.has(order.id);
                  const currentStep = getTimelineStepIndex(order.status);
                  const courierInfo = order.courier_partner ? getCourierPartner(order.courier_partner) : null;
                  const trackingLink = order.tracking_url || (order.tracking_number && courierInfo ? courierInfo.generateTrackingUrl(order.tracking_number) : '');

                  const timelineSteps = [
                    { title: 'Order Placed', desc: 'Received & logged', date: order.created_at },
                    { title: 'Packed', desc: 'Harvest packed with care', date: order.updated_at },
                    { title: 'Dispatched', desc: order.courier_partner ? `Handed to ${order.courier_partner}` : 'Handed to courier', date: order.dispatched_at },
                    { title: 'Out for Delivery', desc: 'On delivery route' },
                    { title: 'Delivered', desc: 'Handed to recipient', date: order.delivered_at }
                  ];

                  const itemCount = (order.items || []).reduce((acc, i) => acc + (i.quantity || 1), 0);

                  return (
                    <div
                      key={order.id}
                      className="bg-white rounded-3xl shadow-md hover:shadow-lg border border-stone-200/90 overflow-hidden transition-all duration-200"
                    >
                      {/* Accordion Header (Summary View - Data Masked for Privacy) */}
                      <button
                        type="button"
                        onClick={() => toggleOrderExpand(order.id)}
                        className="w-full text-left p-5 sm:p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 cursor-pointer hover:bg-stone-50/60 transition group"
                      >
                        <div className="flex items-start gap-4">
                          <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 shadow-sm ${
                            order.status === 'DELIVERED'
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-amber-100 text-amber-800'
                          }`}>
                            <Package className="w-6 h-6" />
                          </div>

                          <div className="space-y-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="font-mono font-black text-stone-900 text-base sm:text-lg group-hover:text-emerald-800 transition">
                                #{order.order_number}
                              </span>
                              <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase border ${getStatusBadge(order.status)}`}>
                                {order.status}
                              </span>
                            </div>

                            <div className="text-xs text-stone-500 flex flex-wrap items-center gap-2">
                              <span>Customer: <strong className="text-stone-700">{maskName(order.customer_name_snapshot)}</strong></span>
                              <span>•</span>
                              <span>Mobile: <strong className="font-mono text-stone-700">{maskPhone(order.customer_phone_snapshot)}</strong></span>
                            </div>

                            <div className="text-xs text-stone-500">
                              <span>Delivery: <strong className="text-stone-700">{maskAddress(order.delivery_address, order.delivery_area)}</strong></span>
                            </div>
                          </div>
                        </div>

                        {/* Right side: Amount & Expand Arrow */}
                        <div className="flex items-center justify-between sm:justify-end w-full sm:w-auto gap-4 pt-2 sm:pt-0 border-t sm:border-t-0 border-stone-100">
                          <div className="text-left sm:text-right">
                            <div className="text-xs text-stone-500">{itemCount} items • {new Date(order.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</div>
                            <div className="text-base sm:text-lg font-black text-stone-900 font-mono">
                              {formatPrice(order.total)}
                            </div>
                            <span className="text-[10px] font-bold text-stone-400 uppercase">
                              {order.payment_method} ({order.payment_status})
                            </span>
                          </div>

                          <div className="p-2 rounded-xl bg-stone-100 text-stone-600 group-hover:bg-emerald-100 group-hover:text-emerald-800 transition shrink-0">
                            {isExpanded ? (
                              <ChevronUp className="w-5 h-5" />
                            ) : (
                              <ChevronDown className="w-5 h-5" />
                            )}
                          </div>
                        </div>
                      </button>

                      {/* Accordion Expanded Details View */}
                      {isExpanded && (
                        <div className="border-t border-stone-200/80 bg-stone-50/30 p-5 sm:p-8 space-y-6 animate-fadeIn">
                          
                          {/* Courier / Shipping Tracking Box */}
                          <div className="p-4 sm:p-5 rounded-2xl bg-white border border-stone-200 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                            <div className="flex items-center gap-3.5">
                              <div className="w-12 h-12 rounded-2xl bg-emerald-100 flex items-center justify-center text-emerald-800 shrink-0 shadow-inner">
                                <Truck className="w-6 h-6" />
                              </div>
                              <div>
                                <div className="flex items-center gap-2">
                                  <span className="text-xs font-semibold text-stone-500 uppercase tracking-wide">Courier Partner:</span>
                                  <span className="text-sm font-black text-stone-900 uppercase">
                                    {order.courier_partner || 'ST Courier'}
                                  </span>
                                </div>
                                
                                {order.tracking_number ? (
                                  <div className="flex items-center gap-2 mt-1">
                                    <span className="text-xs text-stone-500">AWB / Waybill Docket:</span>
                                    <span className="text-xs font-mono font-bold text-emerald-900 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                                      {order.tracking_number}
                                    </span>
                                    <button
                                      type="button"
                                      onClick={() => copyTracking(order.tracking_number || '', order.id)}
                                      className="text-stone-400 hover:text-emerald-700 transition"
                                      title="Copy Tracking ID"
                                    >
                                      {copiedId === order.id ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                                    </button>
                                  </div>
                                ) : (
                                  <p className="text-xs text-amber-700 mt-1 font-medium">
                                    Docket number will be assigned once parcel is dispatched from our warehouse.
                                  </p>
                                )}
                              </div>
                            </div>

                            {trackingLink && (
                              <a
                                href={trackingLink}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-800 hover:bg-emerald-900 text-white text-xs font-black shadow-sm transition active:scale-98 whitespace-nowrap"
                              >
                                <span>Track on Courier Portal</span>
                                <ExternalLink className="w-3.5 h-3.5" />
                              </a>
                            )}
                          </div>

                          {/* Stepper Timeline */}
                          <div className="bg-white p-5 sm:p-6 rounded-2xl border border-stone-200 shadow-sm space-y-4">
                            <h3 className="text-xs font-black text-stone-400 uppercase tracking-wider">
                              Shipment Progress Lifecycle
                            </h3>

                            {currentStep === -1 ? (
                              <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 flex items-center gap-3">
                                <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
                                <div className="text-xs leading-relaxed">
                                  <strong className="block font-bold">Order Cancelled or Returned</strong>
                                  This order has been cancelled. For refunds or reorders, contact store WhatsApp support.
                                </div>
                              </div>
                            ) : (
                              <div className="relative pt-2">
                                {/* Desktop Line */}
                                <div className="hidden sm:block absolute top-7 left-6 right-6 h-1 bg-stone-200 -z-0">
                                  <div 
                                    className="h-full bg-emerald-600 transition-all duration-700" 
                                    style={{ width: `${Math.min(100, Math.max(0, (currentStep / (timelineSteps.length - 1)) * 100))}%` }}
                                  />
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-5 gap-4 sm:gap-2 relative z-10">
                                  {timelineSteps.map((step, idx) => {
                                    const isDone = idx <= currentStep;
                                    const isCurrent = idx === currentStep;

                                    return (
                                      <div key={idx} className="flex sm:flex-col items-start sm:items-center text-left sm:text-center gap-3 sm:gap-2">
                                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-black shrink-0 transition-all duration-300 ${
                                          isDone 
                                            ? 'bg-emerald-700 text-white shadow-md ring-4 ring-emerald-100' 
                                            : 'bg-white border-2 border-stone-300 text-stone-400'
                                        }`}>
                                          {isDone ? <Check className="w-4 h-4 stroke-[3]" /> : idx + 1}
                                        </div>

                                        <div>
                                          <h4 className={`text-xs font-extrabold ${isCurrent ? 'text-emerald-900 font-black' : isDone ? 'text-stone-900' : 'text-stone-400'}`}>
                                            {step.title}
                                          </h4>
                                          <p className="text-[11px] text-stone-500 mt-0.5">
                                            {step.desc}
                                          </p>
                                          {step.date && isDone && (
                                            <span className="inline-block text-[10px] text-emerald-800 font-bold bg-emerald-50 px-1.5 py-0.5 rounded mt-1">
                                              {new Date(step.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                                            </span>
                                          )}
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            )}
                          </div>

                          {/* Items Breakdown */}
                          <div className="bg-white p-5 rounded-2xl border border-stone-200 shadow-sm space-y-3">
                            <div className="flex items-center justify-between text-xs font-bold text-stone-900">
                              <span className="flex items-center gap-1.5">
                                <ShoppingBag className="w-4 h-4 text-emerald-700" />
                                <span>Ordered Items ({order.items?.length || 0})</span>
                              </span>
                              <span className="text-stone-500">Total: {formatPrice(order.total)}</span>
                            </div>

                            <div className="divide-y divide-stone-100 text-xs">
                              {(order.items || []).map((it, idx) => (
                                <div key={idx} className="py-2.5 flex items-center justify-between">
                                  <div>
                                    <div className="font-bold text-stone-900">{it.product_name_snapshot || (it as any).product_name}</div>
                                    <div className="text-[11px] text-stone-500">
                                      {it.pack_size_snapshot || 'Standard'} • Qty: {it.quantity}
                                    </div>
                                  </div>
                                  <div className="font-mono font-bold text-stone-900">
                                    {formatPrice(it.total)}
                                  </div>
                                </div>
                              ))}
                            </div>

                            <div className="pt-3 border-t border-stone-100 flex justify-between items-center text-xs">
                              <span className="text-stone-500">Delivery Charges:</span>
                              <span className="font-bold text-emerald-700">
                                {order.delivery_fee > 0 ? `+${formatPrice(order.delivery_fee)}` : 'FREE'}
                              </span>
                            </div>
                          </div>

                          {/* Collapse button */}
                          <div className="text-center pt-2">
                            <button
                              type="button"
                              onClick={() => toggleOrderExpand(order.id)}
                              className="px-4 py-2 rounded-xl text-xs font-bold text-stone-500 hover:text-stone-800 hover:bg-stone-100 transition inline-flex items-center gap-1"
                            >
                              <ChevronUp className="w-4 h-4" /> Collapse Details
                            </button>
                          </div>

                        </div>
                      )}
                    </div>
                  );
                })}

              </div>
            )}

          </div>
        )}

      </div>
    </div>
  );
}
