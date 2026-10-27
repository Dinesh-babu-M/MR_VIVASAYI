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
  RefreshCw
} from 'lucide-react';
import { getJSONStore } from '../../lib/dbManager';
import type { Order } from '../../types';
import { getCourierPartner } from '../../lib/deliveryRulesEngine';
import toast from 'react-hot-toast';

export default function TrackOrderPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialOrderId = searchParams.get('orderId') || searchParams.get('track') || '';
  
  const [searchInput, setSearchInput] = useState(initialOrderId);
  const [searchedKey, setSearchedKey] = useState(initialOrderId);
  const [loading, setLoading] = useState(false);
  const [order, setOrder] = useState<Order | null>(null);
  const [hasSearched, setHasSearched] = useState(false);
  const [copied, setCopied] = useState(false);

  const fetchOrder = async (query: string) => {
    const cleanQuery = query.trim().toUpperCase();
    if (!cleanQuery) return;
    
    setLoading(true);
    setHasSearched(true);
    setSearchedKey(cleanQuery);

    try {
      const orders = await getJSONStore<Order>('orders');
      // match order_number, id, or tracking_number, or phone snapshot
      const found = orders.find(o => 
        (o.order_number && o.order_number.toUpperCase() === cleanQuery) ||
        (o.id && o.id.toUpperCase() === cleanQuery) ||
        (o.tracking_number && o.tracking_number.toUpperCase() === cleanQuery) ||
        (o.customer_phone_snapshot && o.customer_phone_snapshot.includes(cleanQuery.replace(/\D/g, '')))
      );

      setOrder(found || null);
    } catch (err) {
      console.error('Error fetching order for tracking:', err);
      toast.error('Unable to fetch tracking data right now. Please try again.');
      setOrder(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (initialOrderId) {
      fetchOrder(initialOrderId);
    }
  }, [initialOrderId]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchInput.trim()) {
      toast.error('Please enter your Order ID or Courier Tracking Number');
      return;
    }
    setSearchParams({ orderId: searchInput.trim() });
    fetchOrder(searchInput);
  };

  const copyTracking = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    toast.success('Tracking number copied!');
    setTimeout(() => setCopied(false), 2000);
  };

  // Timeline steps calculation
  const getTimelineStepIndex = (status?: string): number => {
    if (!status) return 0;
    const s = status.toUpperCase();
    if (s === 'DELIVERED') return 4;
    if (s === 'OUT_FOR_DELIVERY') return 3;
    if (s === 'DISPATCHED' || s === 'SHIPPED') return 2;
    if (s === 'CONFIRMED' || s === 'PROCESSING' || s === 'PACKED') return 1;
    if (s === 'CANCELLED' || s === 'RETURNED') return -1;
    return 0; // PENDING / PLACED
  };

  const currentStep = order ? getTimelineStepIndex(order.status) : 0;
  const courierInfo = order?.courier_partner ? getCourierPartner(order.courier_partner) : null;
  const trackingLink = order?.tracking_url || (order?.tracking_number && courierInfo ? courierInfo.generateTrackingUrl(order.tracking_number) : '');

  const timelineSteps = [
    { title: 'Order Placed', desc: 'Order received & logged in system', date: order?.created_at },
    { title: 'Confirmed & Packed', desc: 'Organic harvest packed with care', date: order?.updated_at },
    { title: 'Dispatched', desc: order?.courier_partner ? `Handed over to ${order.courier_partner}` : 'Handed to courier partner', date: order?.dispatched_at },
    { title: 'Out for Delivery', desc: 'Courier agent out on route' },
    { title: 'Delivered', desc: 'Handed over to recipient', date: order?.delivered_at }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-stone-50 via-emerald-50/20 to-stone-100 py-8 sm:py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto space-y-8">
        
        {/* Page Header */}
        <div className="text-center space-y-3">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-100/80 border border-emerald-200 text-emerald-800 text-xs font-semibold uppercase tracking-wider shadow-xs">
            <Truck className="w-3.5 h-3.5 text-emerald-600 animate-pulse" />
            Live Shipment Tracker
          </div>
          <h1 className="text-2xl sm:text-4xl font-serif font-black text-stone-900 tracking-tight">
            Track Your Fresh Farm Order
          </h1>
          <p className="text-sm sm:text-base text-stone-600 max-w-xl mx-auto">
            Enter your Order ID (e.g. <span className="font-mono font-semibold text-emerald-800">ORD-20261022-001</span>) or courier tracking number to check dispatch status in real-time.
          </p>
        </div>

        {/* Tracking Search Form */}
        <div className="bg-white rounded-2xl shadow-xl shadow-stone-200/50 border border-stone-200/80 p-3 sm:p-5 transition-all">
          <form onSubmit={handleSearchSubmit} className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-stone-400" />
              <input
                type="text"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="Enter Order ID / Tracking Number / Mobile"
                className="w-full pl-11 pr-4 py-3.5 text-sm sm:text-base rounded-xl border border-stone-300 focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:border-emerald-600 font-medium placeholder:text-stone-400 shadow-inner"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-gradient-to-r from-emerald-700 to-emerald-800 hover:from-emerald-800 hover:to-emerald-900 text-white font-bold text-sm sm:text-base shadow-md hover:shadow-lg transition-all active:scale-98 disabled:opacity-50"
            >
              {loading ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Checking...</span>
                </>
              ) : (
                <>
                  <span>Track Status</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
        </div>

        {/* Tracking Results View */}
        {hasSearched && !loading && (
          <>
            {order ? (
              <div className="bg-white rounded-2xl shadow-xl shadow-stone-200/60 border border-stone-200/90 overflow-hidden divide-y divide-stone-100 transition-all">
                
                {/* Header status bar */}
                <div className="p-5 sm:p-6 bg-gradient-to-r from-emerald-900 via-emerald-800 to-stone-900 text-white">
                  <div className="flex flex-wrap items-center justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs uppercase tracking-widest text-emerald-300 font-mono font-bold">Order Details</span>
                        <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-500/30 text-emerald-200 border border-emerald-400/30 font-semibold uppercase">
                          {order.status || 'PENDING'}
                        </span>
                      </div>
                      <h2 className="text-xl sm:text-2xl font-mono font-black text-amber-300 mt-1">
                        #{order.order_number}
                      </h2>
                      <div className="flex items-center gap-2 text-xs text-emerald-200/90 mt-1">
                        <Clock className="w-3.5 h-3.5" />
                        <span>Placed on: {new Date(order.created_at).toLocaleString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="text-xs text-emerald-200 font-medium">Grand Total</div>
                      <div className="text-2xl font-black text-white">
                        ₹{order.total?.toFixed(2) || '0.00'}
                      </div>
                      <span className={`inline-block text-[11px] px-2 py-0.5 rounded-full font-bold mt-1 ${order.payment_status === 'PAID' ? 'bg-emerald-400/20 text-emerald-300 border border-emerald-400/40' : 'bg-amber-400/20 text-amber-300 border border-amber-400/40'}`}>
                        {order.payment_status || 'PENDING'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Courier / Shipping Tracking Box */}
                <div className="p-5 sm:p-6 bg-stone-50/70">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 rounded-xl bg-white border border-stone-200 shadow-sm">
                    <div className="flex items-center gap-3.5">
                      <div className="w-12 h-12 rounded-xl bg-emerald-100 flex items-center justify-center text-emerald-700 shrink-0 shadow-inner">
                        <Truck className="w-6 h-6" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-semibold text-stone-500 uppercase tracking-wide">Courier Partner:</span>
                          <span className="text-sm font-black text-stone-900">
                            {order.courier_partner || 'MR. VIVASAYI Store Express'}
                          </span>
                        </div>
                        
                        {order.tracking_number ? (
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-xs text-stone-500">Waybill / Docket:</span>
                            <span className="text-xs font-mono font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                              {order.tracking_number}
                            </span>
                            <button
                              type="button"
                              onClick={() => copyTracking(order.tracking_number || '')}
                              className="text-stone-400 hover:text-emerald-700 transition"
                              title="Copy Tracking ID"
                            >
                              {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                            </button>
                          </div>
                        ) : (
                          <p className="text-xs text-amber-700 mt-1 font-medium">
                            Docket number will be updated once courier pickup is completed.
                          </p>
                        )}
                      </div>
                    </div>

                    {trackingLink && (
                      <a
                        href={trackingLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold shadow-sm transition active:scale-98 whitespace-nowrap"
                      >
                        <span>Track on Courier Portal</span>
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    )}
                  </div>
                </div>

                {/* Stepper Timeline */}
                <div className="p-5 sm:p-8">
                  <h3 className="text-xs font-bold text-stone-400 uppercase tracking-wider mb-6">
                    Live Shipment Timeline
                  </h3>

                  {currentStep === -1 ? (
                    <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 flex items-center gap-3">
                      <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
                      <div className="text-sm">
                        <strong className="block font-bold">Order Cancelled</strong>
                        This order has been cancelled. Please contact customer care for queries or refunds.
                      </div>
                    </div>
                  ) : (
                    <div className="relative">
                      {/* Timeline bar for desktop */}
                      <div className="hidden sm:block absolute top-4 left-6 right-6 h-1 bg-stone-200 -z-0">
                        <div 
                          className="h-full bg-emerald-600 transition-all duration-700" 
                          style={{ width: `${Math.min(100, Math.max(0, (currentStep / (timelineSteps.length - 1)) * 100))}%` }}
                        />
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-5 gap-6 sm:gap-2 relative z-10">
                        {timelineSteps.map((step, idx) => {
                          const isDone = idx <= currentStep;
                          const isCurrent = idx === currentStep;

                          return (
                            <div key={idx} className="flex sm:flex-col items-start sm:items-center text-left sm:text-center gap-3 sm:gap-2">
                              {/* Circle icon */}
                              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-black shrink-0 transition-all duration-300 ${
                                isDone 
                                  ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/30 ring-4 ring-emerald-100' 
                                  : 'bg-white border-2 border-stone-300 text-stone-400'
                              }`}>
                                {isDone ? <Check className="w-4 h-4 stroke-[3]" /> : idx + 1}
                              </div>

                              {/* Text details */}
                              <div>
                                <h4 className={`text-xs sm:text-sm font-bold ${isCurrent ? 'text-emerald-800 font-black' : isDone ? 'text-stone-900' : 'text-stone-400'}`}>
                                  {step.title}
                                </h4>
                                <p className="text-[11px] text-stone-500 mt-0.5 max-w-[130px] sm:mx-auto">
                                  {step.desc}
                                </p>
                                {step.date && isDone && (
                                  <span className="inline-block text-[10px] text-emerald-700 font-semibold bg-emerald-50 px-1.5 py-0.5 rounded mt-1">
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

                {/* Items & Shipping Address */}
                <div className="p-5 sm:p-6 grid grid-cols-1 md:grid-cols-2 gap-6 bg-stone-50/50">
                  {/* Delivery destination */}
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 text-stone-900 font-bold text-sm">
                      <MapPin className="w-4 h-4 text-emerald-700" />
                      <span>Delivery Destination</span>
                    </div>
                    <div className="bg-white p-4 rounded-xl border border-stone-200 text-xs sm:text-sm text-stone-700 space-y-1">
                      <div className="font-bold text-stone-900">{order.customer_name_snapshot || 'Customer'}</div>
                      <div className="text-stone-600">{order.customer_phone_snapshot}</div>
                      <p className="text-stone-600 whitespace-pre-line leading-relaxed pt-1">
                        {order.delivery_address || 'Address provided during WhatsApp / Counter order.'}
                      </p>
                    </div>
                  </div>

                  {/* Order items snapshot */}
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 text-stone-900 font-bold text-sm">
                      <ShoppingBag className="w-4 h-4 text-emerald-700" />
                      <span>Order Items ({order.items?.length || 0})</span>
                    </div>
                    <div className="bg-white p-4 rounded-xl border border-stone-200 text-xs space-y-2 max-h-48 overflow-y-auto">
                      {order.items && order.items.length > 0 ? (
                        order.items.map((item, idx) => (
                          <div key={idx} className="flex items-center justify-between py-1.5 border-b border-stone-100 last:border-0">
                            <div>
                              <div className="font-bold text-stone-800">
                                {item.product_name_snapshot || (item as any).product_name}
                              </div>
                              <div className="text-[11px] text-stone-500">
                                {item.pack_size_snapshot || (item as any).pack_size || 'Standard pack'} × {item.quantity}
                              </div>
                            </div>
                            <div className="font-mono font-bold text-stone-900">
                              ₹{(item.total ?? ((item as any).total_price || (item.unit_price_snapshot || 0) * item.quantity)).toFixed(2)}
                            </div>
                          </div>
                        ))
                      ) : (
                        <p className="text-stone-500 italic">No item list snapshot available for this order.</p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Footer Assistance CTA */}
                <div className="p-4 sm:p-5 bg-emerald-950 text-white flex flex-col sm:flex-row items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <ShieldCheck className="w-5 h-5 text-amber-400 shrink-0" />
                    <span className="text-xs sm:text-sm text-stone-200">
                      Need urgent help with your parcel delivery? Contact farm support directly:
                    </span>
                  </div>
                  <a
                    href={`https://wa.me/919789325262?text=${encodeURIComponent(`Hi MR. VIVASAYI team, I would like to check on my order #${order.order_number}`)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition whitespace-nowrap"
                  >
                    <Phone className="w-3.5 h-3.5" />
                    <span>WhatsApp Order Support</span>
                  </a>
                </div>

              </div>
            ) : (
              <div className="bg-white rounded-2xl shadow-xl shadow-stone-200/50 border border-stone-200 p-8 sm:p-12 text-center max-w-lg mx-auto space-y-4">
                <div className="w-14 h-14 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center mx-auto">
                  <AlertCircle className="w-7 h-7" />
                </div>
                <h3 className="text-lg font-bold text-stone-900">Order Not Found</h3>
                <p className="text-sm text-stone-600 leading-relaxed">
                  We couldn't find any order matching <strong className="font-mono text-emerald-800">"{searchedKey}"</strong>.
                </p>
                <div className="p-3 bg-stone-50 rounded-xl text-xs text-stone-500 text-left space-y-1">
                  <div>✓ Make sure your Order ID looks like <strong className="font-mono">ORD-20261022-001</strong>.</div>
                  <div>✓ You can also try searching by your 10-digit WhatsApp phone number.</div>
                  <div>✓ If you recently placed the order via WhatsApp, please allow a few minutes for synchronization.</div>
                </div>
                <div className="pt-2">
                  <a
                    href="https://wa.me/919789325262?text=Hi%20MR.%20VIVASAYI,%20I%20need%20help%20tracking%20my%20recent%20order."
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold transition shadow-sm"
                  >
                    <Phone className="w-4 h-4" />
                    <span>Contact WhatsApp Support</span>
                  </a>
                </div>
              </div>
            )}
          </>
        )}

      </div>
    </div>
  );
}
