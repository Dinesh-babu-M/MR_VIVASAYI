import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  ShoppingCart,
  Plus,
  Minus,
  Trash2,
  Printer,
  Sparkles,
  ArrowRight,
  Search,
  User,
  Phone,
  CreditCard,
  Banknote,
  QrCode,
  CheckCircle2,
  X,
  FileText,
  AlertTriangle,
  RotateCcw,
  Eye,
  ShieldAlert,
  ArrowUpRight,
  ExternalLink,
  Layers,
  Copy,
  Tag,
  Percent,
  DollarSign,
  Leaf,
  Package,
  RefreshCw,
  Info
} from 'lucide-react';
import { getJSONStore, setJSONStore } from '../../lib/dbManager';
import { useNotifications } from '../../contexts/NotificationContext';
import { useActionModal } from '../../contexts/ActionModalContext';
import { generateSampleOrderId, generateOriginalOrderId } from '../../lib/sequentialIdUtils';
import { CountrySelector } from '../../components/common/CountrySelector';
import { findCustomerByPhoneAndCountry } from '../../lib/countryCodes';
import { formatPrice } from '../../lib/utils';
import { getFormattedStoreAddress, getFormattedStorePhone } from '../../lib/storeSettings';
import type { Product, Customer, Order, SampleBillingOrder, PaymentMethod, Category } from '../../types';
import toast from 'react-hot-toast';

interface SampleCartItem {
  product: Product;
  quantity: number;
  itemDiscountPercent?: number;
}

export const SamplePOSPage: React.FC = () => {
  const navigate = useNavigate();
  const { addNotification } = useNotifications();
  const { showActionModal, showConfirmModal } = useActionModal();

  // Data states
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [existingSampleOrders, setExistingSampleOrders] = useState<SampleBillingOrder[]>([]);
  const [existingLiveOrders, setExistingLiveOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  // Cart & checkout states
  const [cart, setCart] = useState<SampleCartItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('CASH');

  // Customer form snapshot
  const [customerName, setCustomerName] = useState('Sample Walk-in Tester');
  const [customerPhone, setCustomerPhone] = useState('9876543210');
  const [customerEmail, setCustomerEmail] = useState('');
  const [countryCode, setCountryCode] = useState('IN');
  const [callingCode, setCallingCode] = useState('+91');
  const [isWalkinCustomer, setIsWalkinCustomer] = useState(true);
  const [orderNotes, setOrderNotes] = useState('Sample billing transaction for counter verification.');

  // Financial & Discount states (Matching Counter POS format)
  const [extraDiscountMode, setExtraDiscountMode] = useState<'PERCENT' | 'AMOUNT'>('PERCENT');
  const [extraDiscountValue, setExtraDiscountValue] = useState<number>(0);
  const [gstPercent, setGstPercent] = useState<number>(5);

  // Watermark Settings (Add / Remove background sample watermark - DEFAULT FALSE to not expose watermark)
  const [showWatermark, setShowWatermark] = useState<boolean>(false);

  // Receipt & preview modal
  const [completedOrder, setCompletedOrder] = useState<SampleBillingOrder | null>(null);
  const [receiptModalOpen, setReceiptModalOpen] = useState(false);

  // Load Initial Store Data
  useEffect(() => {
    async function initData() {
      try {
        setLoading(true);
        const [prodData, catData, custData, sampleOrders, liveOrders] = await Promise.all([
          getJSONStore<Product>('products'),
          getJSONStore<Category>('categories'),
          getJSONStore<Customer>('customers'),
          getJSONStore<SampleBillingOrder>('sample_billing_orders'),
          getJSONStore<Order>('orders')
        ]);
        setProducts(prodData || []);
        setCategories(catData || []);
        setCustomers(custData || []);
        setExistingSampleOrders(sampleOrders || []);
        setExistingLiveOrders(liveOrders || []);
      } catch (err) {
        console.error('Error loading Sample POS data:', err);
      } finally {
        setLoading(false);
      }
    }
    initData();
  }, []);

  // Filtered Products
  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      let matchesCat = true;
      if (selectedCategory === 'OFFERS') {
        matchesCat = Boolean(p.offer_price && p.offer_price > 0 && p.offer_price < p.selling_price);
      } else if (selectedCategory === 'FESTIVAL') {
        matchesCat = Boolean(p.festival_offer);
      } else if (selectedCategory !== 'ALL') {
        matchesCat = p.category_id === selectedCategory;
      }

      const q = searchQuery.toLowerCase().trim();
      const matchSearch =
        !q ||
        p.name.toLowerCase().includes(q) ||
        (p.tamil_name && p.tamil_name.toLowerCase().includes(q)) ||
        (p.sku && p.sku.toLowerCase().includes(q));
      return matchesCat && matchSearch;
    });
  }, [products, selectedCategory, searchQuery]);

  // Customer Phone Auto-fetch Handler
  const handleLookupCustomerByPhone = (phoneToSearch: string) => {
    const clean = phoneToSearch.trim().replace(/\D/g, '');
    if (clean.length < 10) return;
    const matched = findCustomerByPhoneAndCountry(customers, clean, callingCode);
    if (matched) {
      setCustomerName(matched.name);
      if (matched.email) setCustomerEmail(matched.email);
      setIsWalkinCustomer(false);
      toast.success(`Linked customer "${matched.name}" (${matched.customer_id || '0001'})!`);
    }
  };

  // -------------------------------------------------------------------------
  // FINANCIAL CALCULATIONS (Identical to Counter POS format)
  // -------------------------------------------------------------------------
  // 1. Total MRP Price
  const totalMRP = useMemo(() => {
    return cart.reduce(
      (sum, item) => sum + (item.product.mrp || item.product.selling_price) * item.quantity,
      0
    );
  }, [cart]);

  // 2. Price after MRP discount & item-level extra discount
  const itemsSubtotal = useMemo(() => {
    return cart.reduce((sum, item) => {
      const basePrice = item.product.offer_price || item.product.selling_price;
      const discountedPrice = basePrice * (1 - (item.itemDiscountPercent || 0) / 100);
      return sum + discountedPrice * item.quantity;
    }, 0);
  }, [cart]);

  // 3. MRP Savings & Savings %
  const mrpSavings = Math.max(0, totalMRP - itemsSubtotal);
  const mrpSavingsPercent = totalMRP > 0 ? Math.round((mrpSavings / totalMRP) * 100) : 0;

  // 4. Additional Bill Discount (Percentage % or Flat ₹)
  const extraDiscountAmount = extraDiscountMode === 'PERCENT'
    ? (itemsSubtotal * extraDiscountValue) / 100
    : Math.min(itemsSubtotal, extraDiscountValue);

  const calculatedDiscountPercent = itemsSubtotal > 0
    ? Math.round((extraDiscountAmount / itemsSubtotal) * 100)
    : 0;

  // 5. Total Discount Given (MRP Savings + Extra Discount)
  const totalDiscount = mrpSavings + extraDiscountAmount;

  // 6. GST Tax Amount
  const taxAmount = (itemsSubtotal - extraDiscountAmount) * (gstPercent / 100);

  // 7. Grand Total / Net Payable
  const grandTotal = Math.max(0, itemsSubtotal - extraDiscountAmount + taxAmount);

  // Next Sample ID preview
  const nextSampleId = useMemo(() => {
    return generateSampleOrderId(existingSampleOrders);
  }, [existingSampleOrders]);

  // Add Item to Cart
  const handleAddToCart = (product: Product) => {
    setCart((prev) => {
      const idx = prev.findIndex((i) => i.product.id === product.id);
      if (idx !== -1) {
        const copy = [...prev];
        copy[idx].quantity += 1;
        return copy;
      }
      return [...prev, { product, quantity: 1, itemDiscountPercent: 0 }];
    });
    toast.success(`Added ${product.name} to bill`);
  };

  // Adjust Quantity
  const handleAdjustQty = (productId: string, delta: number) => {
    setCart((prev) =>
      prev
        .map((i) => (i.product.id === productId ? { ...i, quantity: i.quantity + delta } : i))
        .filter((i) => i.quantity > 0)
    );
  };

  // Update Item-Level Discount
  const handleUpdateItemDiscount = (productId: string, discountPct: number) => {
    setCart((prev) =>
      prev.map((i) =>
        i.product.id === productId
          ? { ...i, itemDiscountPercent: Math.max(0, Math.min(100, discountPct)) }
          : i
      )
    );
  };

  // Clear Cart
  const handleClearCart = () => {
    if (cart.length === 0) return;
    setCart([]);
    setExtraDiscountValue(0);
    toast.success('Sample cart cleared');
  };

  // Quick preset discount handler
  const handleApplyPresetDiscount = (val: number, mode: 'PERCENT' | 'AMOUNT') => {
    setExtraDiscountMode(mode);
    setExtraDiscountValue(val);
    toast.success(`Applied ${mode === 'PERCENT' ? `${val}%` : `₹${val}`} discount!`);
  };

  // Process & Complete Sample Order
  const handleCompleteSampleBill = async (convertToLiveDirectly = false) => {
    if (cart.length === 0) {
      toast.error('Sample cart is empty. Please add items to the bill.');
      return;
    }

    const assignedSampleId = generateSampleOrderId(existingSampleOrders);
    const nowIso = new Date().toISOString();

    const orderItems = cart.map((item, idx) => {
      const unitPrice = item.product.offer_price || item.product.selling_price || 0;
      const mrp = item.product.mrp || unitPrice;
      const lineTotal = unitPrice * (1 - (item.itemDiscountPercent || 0) / 100) * item.quantity;
      return {
        id: `sitem-${Date.now()}-${idx}`,
        order_id: assignedSampleId,
        product_id: item.product.id,
        product_name_snapshot: item.product.name,
        tamil_name_snapshot: item.product.tamil_name,
        pack_size_snapshot: item.product.pack_size,
        sku_snapshot: item.product.sku,
        quantity: item.quantity,
        unit_price_snapshot: unitPrice,
        mrp_snapshot: mrp,
        discount: item.itemDiscountPercent || 0,
        item_discount_percent: item.itemDiscountPercent || 0,
        total: lineTotal,
        created_at: nowIso
      };
    });

    const newSampleOrder: SampleBillingOrder = {
      id: assignedSampleId,
      order_number: assignedSampleId,
      sample_code: assignedSampleId,
      is_sample: true,
      source: 'POS',
      customer_name_snapshot: isWalkinCustomer ? 'Sample Walk-in Tester' : (customerName.trim() || 'Sample Customer'),
      customer_phone_snapshot: isWalkinCustomer ? '9876543210' : (customerPhone.trim() || '9876543210'),
      country_code: countryCode,
      calling_code: callingCode,
      status: 'DELIVERED',
      subtotal: itemsSubtotal,
      discount: extraDiscountAmount,
      delivery_fee: 0,
      tax_amount: taxAmount,
      total: grandTotal,
      total_mrp: totalMRP,
      mrp_savings: mrpSavings,
      extra_discount_mode: extraDiscountMode,
      extra_discount_value: extraDiscountValue,
      extra_discount_amount: extraDiscountAmount,
      gst_percent: gstPercent,
      payment_method: paymentMethod,
      payment_status: 'PAID',
      notes: orderNotes,
      show_watermark: showWatermark,
      created_at: nowIso,
      updated_at: nowIso,
      items: orderItems,
      converted_to_live: convertToLiveDirectly
    };

    if (convertToLiveDirectly) {
      const liveIdObj = generateOriginalOrderId(existingLiveOrders);
      newSampleOrder.converted_to_live = true;
      newSampleOrder.converted_at = nowIso;
      newSampleOrder.converted_order_id = liveIdObj.order_number;

      const liveOrder: Order = {
        ...newSampleOrder,
        id: liveIdObj.id,
        order_number: liveIdObj.order_number,
        notes: `Converted from Sample Bill ${assignedSampleId}. ${orderNotes}`
      };

      const updatedLive = [liveOrder, ...existingLiveOrders];
      const updatedSample = [newSampleOrder, ...existingSampleOrders];

      await Promise.all([
        setJSONStore('orders', updatedLive),
        setJSONStore('sample_billing_orders', updatedSample)
      ]);

      setExistingLiveOrders(updatedLive);
      setExistingSampleOrders(updatedSample);
      setCompletedOrder(newSampleOrder);
      setReceiptModalOpen(true);

      addNotification({
        title: 'Sample Bill Created & Converted to Live',
        message: `Sample ${assignedSampleId} converted to Live Order #${liveIdObj.order_number} (₹${grandTotal.toFixed(2)}).`,
        type: 'success',
        sourceModule: 'Sample POS'
      });

      toast.success(`Created & converted into Live Order #${liveOrder.order_number}!`);
    } else {
      const updatedSample = [newSampleOrder, ...existingSampleOrders];
      await setJSONStore('sample_billing_orders', updatedSample);
      setExistingSampleOrders(updatedSample);
      setCompletedOrder(newSampleOrder);
      setReceiptModalOpen(true);

      addNotification({
        title: 'Sample Bill Completed',
        message: `Generated Sample Bill #${assignedSampleId} for ₹${grandTotal.toFixed(2)}.`,
        type: 'info',
        sourceModule: 'Sample POS'
      });

      toast.success(`Sample Bill #${assignedSampleId} created!`);
    }

    // Reset Cart
    setCart([]);
    setExtraDiscountValue(0);
  };

  // Convert an already created sample order to live
  const handleConvertExistingToLive = async (sample: SampleBillingOrder) => {
    try {
      const liveIdObj = generateOriginalOrderId(existingLiveOrders);
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

      const updatedSample = existingSampleOrders.map((s) =>
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

      const updatedLive = [liveOrder, ...existingLiveOrders];

      await Promise.all([
        setJSONStore('sample_billing_orders', updatedSample),
        setJSONStore('orders', updatedLive)
      ]);

      setExistingSampleOrders(updatedSample);
      setExistingLiveOrders(updatedLive);

      if (completedOrder && completedOrder.id === sample.id) {
        setCompletedOrder({
          ...completedOrder,
          converted_to_live: true,
          converted_at: nowIso,
          converted_order_id: liveIdObj.order_number
        });
      }

      toast.success(`Sample #${sample.order_number} converted into Live Order #${liveIdObj.order_number}!`);
    } catch (err) {
      console.error(err);
      toast.error('Failed to convert sample order to live.');
    }
  };

  const handlePrintReceipt = () => {
    window.print();
  };

  return (
    <div className="relative min-h-screen bg-gray-50 dark:bg-emerald-950/40 p-4 sm:p-6 space-y-5 animate-fadeIn">
      {/* ========================================================================= */}
      {/* 1. OPTIONAL BACKGROUND WATERMARK                                            */}
      {/* ========================================================================= */}
      {showWatermark && (
        <div className="pointer-events-none fixed inset-0 z-0 flex items-center justify-center overflow-hidden opacity-[0.06] select-none">
          <div className="transform -rotate-25 text-rose-700 dark:text-rose-400 font-black text-6xl sm:text-8xl md:text-9xl tracking-widest text-center uppercase whitespace-nowrap border-8 border-dashed border-rose-700/60 p-8 rounded-3xl">
            SAMPLE BILLING<br />NOT A REAL INVOICE
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 2. PAGE HEADER WITH WATERMARK CONTROLLER & STATS                           */}
      {/* ========================================================================= */}
      <div className="relative z-10 bg-white dark:bg-emerald-900/80 p-5 rounded-3xl border border-emerald-100 dark:border-emerald-800 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5 flex-wrap">
            <span className="p-2.5 bg-gradient-to-br from-indigo-500 to-purple-600 text-white rounded-2xl shadow-md">
              <ShoppingCart className="w-6 h-6" />
            </span>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-xl sm:text-2xl font-black font-serif text-emerald-950 dark:text-white">
                  Sample POS Billing Counter
                </h1>
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-black uppercase tracking-wider bg-indigo-100 dark:bg-indigo-900/70 text-indigo-800 dark:text-indigo-200 border border-indigo-300 dark:border-indigo-700">
                  POS Simulator
                </span>
                <span className="px-2 py-0.5 bg-amber-100 text-amber-900 font-mono font-black text-[11px] rounded-lg border border-amber-300">
                  Next: #{nextSampleId}
                </span>
              </div>
              <p className="text-xs text-gray-500 dark:text-emerald-300 mt-0.5">
                Full-featured Counter POS billing format with MRP savings, extra discount modes, GST tax, and optional watermark.
              </p>
            </div>
          </div>
        </div>

        {/* Header Action Controls */}
        <div className="flex items-center gap-2.5 flex-wrap">
          {/* Watermark Toggle Button */}
          <button
            type="button"
            onClick={() => setShowWatermark(!showWatermark)}
            className={`px-3 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-xs cursor-pointer border ${
              showWatermark
                ? 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/60 dark:text-rose-300 dark:border-rose-800'
                : 'bg-gray-100 text-gray-600 border-gray-200 dark:bg-emerald-950 dark:text-emerald-300'
            }`}
            title="Toggle sample watermark ON/OFF"
          >
            <ShieldAlert className="w-4 h-4" />
            <span>Watermark: {showWatermark ? 'ON (Active)' : 'OFF (Hidden)'}</span>
          </button>

          {/* Ledger Navigation Button */}
          <Link
            to="/admin/sample-invoices"
            className="px-3.5 py-2 rounded-xl text-xs font-bold bg-white dark:bg-emerald-950 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 hover:bg-indigo-50 dark:hover:bg-indigo-900/40 transition flex items-center gap-1.5 shadow-xs"
          >
            <FileText className="w-4 h-4" />
            <span>Invoices Ledger ({existingSampleOrders.length})</span>
          </Link>

          {/* Real POS Switch */}
          <Link
            to="/admin/pos"
            className="px-3 py-2 rounded-xl text-xs font-bold bg-emerald-700 hover:bg-emerald-800 text-white transition flex items-center gap-1 shadow-sm"
          >
            <span>Live POS</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 3. MAIN POS LAYOUT (LEFT: CATALOG / RIGHT: COUNTER BILLING)                 */}
      {/* ========================================================================= */}
      <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* ===================================================================== */}
        {/* LEFT COLUMN: PRODUCT SELECTION & CATEGORIES (COL 7 / 12)              */}
        {/* ===================================================================== */}
        <div className="lg:col-span-7 space-y-4">
          {/* Search & Category Pills */}
          <div className="bg-white dark:bg-emerald-900/80 p-4 rounded-3xl border border-emerald-100 dark:border-emerald-800 shadow-sm space-y-3">
            <div className="relative">
              <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search products by English / Tamil name, SKU or keyword..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2.5 bg-gray-50 dark:bg-emerald-950 border border-emerald-200 dark:border-emerald-700 rounded-2xl text-xs text-gray-800 dark:text-emerald-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-sans"
              />
            </div>

            {/* Category Pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs font-bold no-scrollbar">
              <button
                type="button"
                onClick={() => setSelectedCategory('ALL')}
                className={`px-3 py-1.5 rounded-xl transition cursor-pointer whitespace-nowrap ${
                  selectedCategory === 'ALL'
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'bg-gray-100 dark:bg-emerald-950 text-gray-600 dark:text-emerald-300 hover:bg-gray-200'
                }`}
              >
                All Products ({products.length})
              </button>
              <button
                type="button"
                onClick={() => setSelectedCategory('OFFERS')}
                className={`px-3 py-1.5 rounded-xl transition cursor-pointer whitespace-nowrap flex items-center gap-1 ${
                  selectedCategory === 'OFFERS'
                    ? 'bg-rose-600 text-white shadow-xs'
                    : 'bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100'
                }`}
              >
                🔥 Special Offers
              </button>
              <button
                type="button"
                onClick={() => setSelectedCategory('FESTIVAL')}
                className={`px-3 py-1.5 rounded-xl transition cursor-pointer whitespace-nowrap flex items-center gap-1 ${
                  selectedCategory === 'FESTIVAL'
                    ? 'bg-amber-500 text-emerald-950 shadow-xs'
                    : 'bg-amber-50 text-amber-800 border border-amber-200 hover:bg-amber-100'
                }`}
              >
                🪔 Festival Deals
              </button>
              {categories.map((cat) => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setSelectedCategory(cat.id)}
                  className={`px-3 py-1.5 rounded-xl transition cursor-pointer whitespace-nowrap ${
                    selectedCategory === cat.id
                      ? 'bg-indigo-600 text-white shadow-xs'
                      : 'bg-gray-100 dark:bg-emerald-950 text-gray-600 dark:text-emerald-300 hover:bg-gray-200'
                  }`}
                >
                  {cat.name}
                </button>
              ))}
            </div>
          </div>

          {/* Product Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3.5 max-h-[680px] overflow-y-auto pr-1">
            {filteredProducts.map((p) => {
              const basePrice = p.offer_price || p.selling_price || 0;
              const hasMrpDiscount = p.mrp && p.mrp > basePrice;
              const cartItem = cart.find((i) => i.product.id === p.id);

              return (
                <div
                  key={p.id}
                  onClick={() => handleAddToCart(p)}
                  className={`group p-3 rounded-2xl bg-white dark:bg-emerald-900/80 border transition-all duration-200 hover:shadow-lg hover:border-indigo-400 cursor-pointer flex flex-col justify-between relative ${
                    cartItem ? 'ring-2 ring-indigo-500 border-transparent bg-indigo-50/20' : 'border-emerald-100 dark:border-emerald-800'
                  }`}
                >
                  {/* Badge */}
                  {cartItem && (
                    <span className="absolute top-2 right-2 bg-indigo-600 text-white text-[10px] font-black w-5 h-5 rounded-full flex items-center justify-center shadow">
                      {cartItem.quantity}
                    </span>
                  )}

                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-[10px] text-gray-400 font-mono">
                      <span>{p.sku}</span>
                      <span className="text-emerald-700 dark:text-emerald-400 font-bold">{p.pack_size}</span>
                    </div>

                    <h4 className="font-extrabold text-xs text-gray-900 dark:text-white line-clamp-2 group-hover:text-indigo-600 transition">
                      {p.name}
                    </h4>
                    {p.tamil_name && (
                      <p className="text-[10px] text-gray-500 dark:text-emerald-300/80 truncate">
                        {p.tamil_name}
                      </p>
                    )}
                  </div>

                  <div className="mt-3 pt-2 border-t border-gray-100 dark:border-emerald-800/60 flex items-center justify-between">
                    <div>
                      {hasMrpDiscount && (
                        <div className="text-[10px] text-gray-400 line-through font-mono">
                          MRP ₹{p.mrp}
                        </div>
                      )}
                      <div className="text-xs font-black text-emerald-700 dark:text-amber-400">
                        {formatPrice(basePrice)}
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleAddToCart(p);
                      }}
                      className="p-1.5 rounded-lg bg-indigo-50 hover:bg-indigo-600 text-indigo-700 hover:text-white dark:bg-emerald-950 dark:text-emerald-200 transition"
                      title="Add to Bill"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}

            {filteredProducts.length === 0 && (
              <div className="col-span-full py-16 text-center text-gray-400 dark:text-emerald-300 text-xs border-2 border-dashed border-gray-200 dark:border-emerald-800 rounded-3xl">
                <Package className="w-8 h-8 mx-auto text-gray-300 mb-2" />
                No matching products found. Try another category or search term.
              </div>
            )}
          </div>
        </div>

        {/* ===================================================================== */}
        {/* RIGHT COLUMN: COUNTER POS BILLING CART & CALCULATION (COL 5 / 12)     */}
        {/* ===================================================================== */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-white dark:bg-emerald-900/80 rounded-3xl border border-emerald-100 dark:border-emerald-800 shadow-sm p-5 space-y-4 flex flex-col h-full">
            {/* Customer Information Panel */}
            <div className="p-3.5 bg-gray-50 dark:bg-emerald-950/60 rounded-2xl border border-gray-200 dark:border-emerald-800 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-gray-700 dark:text-emerald-200 flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-indigo-600" />
                  Customer Information
                </span>

                {/* Walk-in Customer switch */}
                <label className="flex items-center gap-1.5 text-[11px] font-bold text-gray-600 dark:text-emerald-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isWalkinCustomer}
                    onChange={(e) => {
                      setIsWalkinCustomer(e.target.checked);
                      if (e.target.checked) {
                        setCustomerName('Sample Walk-in Tester');
                        setCustomerPhone('9876543210');
                      }
                    }}
                    className="w-3.5 h-3.5 rounded text-indigo-600 focus:ring-indigo-500"
                  />
                  <span>Walk-in Customer</span>
                </label>
              </div>

              {!isWalkinCustomer && (
                <div className="space-y-2 pt-1 animate-fadeIn">
                  <div className="grid grid-cols-12 gap-2">
                    <div className="col-span-4">
                      <CountrySelector
                        value={countryCode}
                        onChange={(country) => {
                          setCountryCode(country.code);
                          setCallingCode(country.callingCode);
                        }}
                      />
                    </div>
                    <div className="col-span-8 relative">
                      <Phone className="w-3.5 h-3.5 text-gray-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                      <input
                        type="tel"
                        placeholder="10-digit Phone"
                        value={customerPhone}
                        onChange={(e) => {
                          setCustomerPhone(e.target.value);
                          handleLookupCustomerByPhone(e.target.value);
                        }}
                        className="w-full pl-8 pr-2.5 py-1.5 text-xs bg-white dark:bg-emerald-950 border border-gray-300 dark:border-emerald-700 rounded-xl font-mono"
                      />
                    </div>
                  </div>

                  <input
                    type="text"
                    placeholder="Customer Name"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    className="w-full px-3 py-1.5 text-xs bg-white dark:bg-emerald-950 border border-gray-300 dark:border-emerald-700 rounded-xl"
                  />
                </div>
              )}
            </div>

            {/* Cart Header */}
            <div className="flex items-center justify-between pb-2 border-b border-gray-100 dark:border-emerald-800">
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-sm text-gray-900 dark:text-white">
                  Active Bill Items ({cart.length})
                </span>
                <span className="text-[10px] font-mono text-gray-400">
                  Target: #{nextSampleId}
                </span>
              </div>

              {cart.length > 0 && (
                <button
                  type="button"
                  onClick={handleClearCart}
                  className="text-[11px] font-bold text-rose-600 hover:text-rose-700 bg-rose-50 dark:bg-rose-950/60 px-2.5 py-1 rounded-lg border border-rose-200 dark:border-rose-900 flex items-center gap-1 transition cursor-pointer"
                >
                  <Trash2 className="w-3 h-3" />
                  <span>Clear Bill</span>
                </button>
              )}
            </div>

            {/* Cart Items List */}
            <div className="flex-1 overflow-y-auto space-y-2 border-y border-emerald-100 dark:border-emerald-800 py-3 pr-1 max-h-[260px]">
              {cart.length === 0 ? (
                <div className="text-center py-8 text-xs text-gray-400 dark:text-emerald-300">
                  <ShoppingCart className="w-8 h-8 text-indigo-400 mx-auto mb-2 opacity-50" />
                  Add products from the catalog on the left to start billing.
                </div>
              ) : (
                cart.map((item) => {
                  const basePrice = item.product.offer_price || item.product.selling_price;
                  const itemTotal = basePrice * (1 - (item.itemDiscountPercent || 0) / 100) * item.quantity;

                  return (
                    <div
                      key={item.product.id}
                      className="p-2.5 bg-gray-50/70 dark:bg-emerald-950/40 rounded-xl border border-gray-200 dark:border-emerald-800 text-xs space-y-2"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1 min-w-0 pr-2">
                          <div className="font-bold text-gray-900 dark:text-white truncate">
                            {item.product.name}
                          </div>
                          <div className="text-[10px] text-emerald-700 dark:text-amber-400 font-bold flex items-center gap-1.5">
                            {item.product.mrp && item.product.mrp > basePrice && (
                              <span className="line-through text-gray-400">MRP ₹{item.product.mrp}</span>
                            )}
                            <span>Price: {formatPrice(basePrice)}</span>
                          </div>
                        </div>

                        {/* Qty Controls */}
                        <div className="flex items-center space-x-1.5">
                          <div className="flex items-center border border-gray-300 dark:border-emerald-700 rounded-lg bg-white dark:bg-emerald-900">
                            <button
                              type="button"
                              onClick={() => handleAdjustQty(item.product.id, -1)}
                              className="px-2 py-0.5 hover:bg-gray-100 dark:hover:bg-emerald-800 text-gray-700 dark:text-emerald-100"
                            >
                              -
                            </button>
                            <span className="px-2 font-bold text-gray-800 dark:text-emerald-100">
                              {item.quantity}
                            </span>
                            <button
                              type="button"
                              onClick={() => handleAdjustQty(item.product.id, 1)}
                              className="px-2 py-0.5 hover:bg-gray-100 dark:hover:bg-emerald-800 text-gray-700 dark:text-emerald-100"
                            >
                              +
                            </button>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleAdjustQty(item.product.id, -item.quantity)}
                            className="text-rose-500 hover:text-rose-700 p-1.5 rounded hover:bg-rose-50 transition cursor-pointer"
                            title="Remove item"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      {/* Per-item Extra Discount Input */}
                      <div className="flex items-center justify-between pt-1 border-t border-gray-200 dark:border-emerald-800/60 text-[11px]">
                        <span className="text-gray-500 flex items-center gap-1 font-medium">
                          <Percent className="w-3 h-3 text-indigo-600" />
                          Extra Item Disc (%):
                        </span>
                        <div className="flex items-center gap-2">
                          <input
                            type="number"
                            min="0"
                            max="100"
                            value={item.itemDiscountPercent || 0}
                            onChange={(e) =>
                              handleUpdateItemDiscount(item.product.id, parseFloat(e.target.value) || 0)
                            }
                            className="w-12 px-1.5 py-0.5 text-right bg-white dark:bg-emerald-900 border border-gray-300 dark:border-emerald-700 rounded font-bold text-indigo-900 dark:text-amber-400"
                          />
                          <span className="font-extrabold text-gray-900 dark:text-emerald-100 font-mono">
                            = {formatPrice(itemTotal)}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* ================================================================= */}
            {/* FINANCIAL CALCULATION SUMMARY (Exact Counter POS layout)          */}
            {/* ================================================================= */}
            <div className="space-y-2 text-xs pt-1">
              {/* Total MRP Price */}
              <div className="flex justify-between text-gray-500 dark:text-emerald-400">
                <span>Total MRP Price:</span>
                <span className="line-through font-mono">{formatPrice(totalMRP)}</span>
              </div>

              {/* MRP Discount Savings */}
              <div className="flex justify-between text-emerald-700 dark:text-emerald-300 font-bold bg-emerald-50 dark:bg-emerald-950/70 p-2 rounded-xl border border-emerald-100 dark:border-emerald-800">
                <span className="flex items-center gap-1">
                  <Tag className="w-3.5 h-3.5 text-emerald-600" />
                  MRP Discount Savings ({mrpSavingsPercent}%):
                </span>
                <span className="font-mono">- {formatPrice(mrpSavings)}</span>
              </div>

              {/* Items Subtotal */}
              <div className="flex justify-between text-gray-700 dark:text-emerald-200 font-semibold px-0.5">
                <span>Our Price Subtotal:</span>
                <span className="font-mono">{formatPrice(itemsSubtotal)}</span>
              </div>

              {/* Additional / Extra Bill Discount Card (Dual Mode % or ₹) */}
              <div className="bg-amber-50/70 dark:bg-amber-950/40 p-2.5 rounded-xl border border-amber-200 dark:border-amber-800/80 space-y-2">
                <div className="flex justify-between items-center text-gray-800 dark:text-emerald-100">
                  <span className="font-bold text-xs flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-amber-500 fill-amber-400" />
                    Additional Bill Discount:
                  </span>
                  <div className="flex items-center gap-1.5">
                    {/* Mode Selector Segmented Tabs */}
                    <div className="inline-flex rounded-lg bg-amber-200/70 dark:bg-amber-900/60 p-0.5 border border-amber-300 dark:border-amber-700">
                      <button
                        type="button"
                        onClick={() => {
                          setExtraDiscountMode('PERCENT');
                          setExtraDiscountValue(0);
                        }}
                        className={`px-2 py-0.5 text-[10px] font-extrabold rounded-md transition-all ${
                          extraDiscountMode === 'PERCENT'
                            ? 'bg-amber-500 text-white shadow-xs'
                            : 'text-amber-900 dark:text-amber-200 hover:text-amber-950'
                        }`}
                      >
                        %
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setExtraDiscountMode('AMOUNT');
                          setExtraDiscountValue(0);
                        }}
                        className={`px-2 py-0.5 text-[10px] font-extrabold rounded-md transition-all ${
                          extraDiscountMode === 'AMOUNT'
                            ? 'bg-amber-500 text-white shadow-xs'
                            : 'text-amber-900 dark:text-amber-200 hover:text-amber-950'
                        }`}
                      >
                        ₹
                      </button>
                    </div>

                    {/* Main Input Box */}
                    <div className="relative flex items-center">
                      <span className="absolute left-2 text-xs font-bold text-amber-700 dark:text-amber-400">
                        {extraDiscountMode === 'PERCENT' ? '%' : '₹'}
                      </span>
                      <input
                        type="number"
                        min="0"
                        max={extraDiscountMode === 'PERCENT' ? 100 : itemsSubtotal}
                        value={extraDiscountValue || ''}
                        onChange={(e) => setExtraDiscountValue(Math.max(0, parseFloat(e.target.value) || 0))}
                        placeholder="0"
                        className="w-20 pl-5 pr-2 py-1 bg-white dark:bg-emerald-950 border border-amber-300 dark:border-amber-700 rounded-lg text-right font-black text-amber-900 dark:text-amber-300 text-xs focus:ring-2 focus:ring-amber-500 focus:outline-none font-mono"
                      />
                    </div>
                  </div>
                </div>

                {/* Quick Preset Discount Chips */}
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-[10px] text-gray-500 font-bold">Quick:</span>
                  <button
                    type="button"
                    onClick={() => handleApplyPresetDiscount(5, 'PERCENT')}
                    className="px-1.5 py-0.5 bg-amber-100 hover:bg-amber-200 text-amber-900 rounded text-[10px] font-bold"
                  >
                    +5%
                  </button>
                  <button
                    type="button"
                    onClick={() => handleApplyPresetDiscount(10, 'PERCENT')}
                    className="px-1.5 py-0.5 bg-amber-100 hover:bg-amber-200 text-amber-900 rounded text-[10px] font-bold"
                  >
                    +10%
                  </button>
                  <button
                    type="button"
                    onClick={() => handleApplyPresetDiscount(15, 'PERCENT')}
                    className="px-1.5 py-0.5 bg-amber-100 hover:bg-amber-200 text-amber-900 rounded text-[10px] font-bold"
                  >
                    +15%
                  </button>
                  <button
                    type="button"
                    onClick={() => handleApplyPresetDiscount(50, 'AMOUNT')}
                    className="px-1.5 py-0.5 bg-amber-100 hover:bg-amber-200 text-amber-900 rounded text-[10px] font-bold font-mono"
                  >
                    ₹50
                  </button>
                  <button
                    type="button"
                    onClick={() => handleApplyPresetDiscount(100, 'AMOUNT')}
                    className="px-1.5 py-0.5 bg-amber-100 hover:bg-amber-200 text-amber-900 rounded text-[10px] font-bold font-mono"
                  >
                    ₹100
                  </button>
                </div>

                {/* Live Equivalent Breakdown Bar */}
                <div className="flex justify-between items-center text-[11px] font-bold border-t border-amber-200/60 dark:border-amber-800/60 pt-1 text-amber-900 dark:text-amber-300">
                  <span className="text-[10px] text-gray-500 dark:text-amber-400/80">
                    Discount Equivalent:
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="px-1.5 py-0.5 bg-amber-100 dark:bg-amber-900/80 rounded text-amber-800 dark:text-amber-200">
                      {calculatedDiscountPercent}% OFF
                    </span>
                    <span className="font-extrabold text-amber-700 dark:text-amber-400 font-mono">
                      = -{formatPrice(extraDiscountAmount)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Editable GST Tax Input */}
              <div className="flex justify-between items-center text-gray-600 dark:text-emerald-300">
                <span className="flex items-center gap-1 font-semibold">
                  GST Rate Tax (%):
                </span>
                <div className="flex items-center gap-1">
                  <input
                    type="number"
                    min="0"
                    max="28"
                    value={gstPercent}
                    onChange={(e) => setGstPercent(Math.max(0, parseFloat(e.target.value) || 0))}
                    className="w-14 px-1.5 py-0.5 bg-white dark:bg-emerald-950 border border-gray-300 dark:border-emerald-700 rounded text-right font-bold text-gray-900 dark:text-emerald-100 font-mono"
                  />
                  <span className="font-bold text-gray-700 dark:text-emerald-200 font-mono">
                    % = +{formatPrice(taxAmount)}
                  </span>
                </div>
              </div>

              {/* Grand Total Bar */}
              <div className="p-3 bg-gradient-to-r from-emerald-900 to-indigo-950 text-white rounded-2xl flex justify-between items-center shadow-md">
                <div>
                  <div className="text-[10px] uppercase tracking-wider text-emerald-300 font-bold">
                    Net Payable Total
                  </div>
                  <div className="text-xl sm:text-2xl font-black font-mono text-amber-300">
                    {formatPrice(grandTotal)}
                  </div>
                </div>
                <div className="text-right text-[10px] text-emerald-200">
                  <div>Savings: {formatPrice(totalDiscount)}</div>
                  <div>GST ({gstPercent}%): +{formatPrice(taxAmount)}</div>
                </div>
              </div>
            </div>

            {/* Payment Method Selector */}
            <div className="grid grid-cols-4 gap-2 text-xs font-bold pt-1">
              <button
                type="button"
                onClick={() => setPaymentMethod('CASH')}
                className={`py-2 rounded-xl border flex flex-col items-center justify-center gap-0.5 transition cursor-pointer ${
                  paymentMethod === 'CASH'
                    ? 'bg-emerald-700 text-white border-emerald-700 shadow-sm'
                    : 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100'
                }`}
              >
                <DollarSign className="w-3.5 h-3.5" />
                <span className="text-[10px]">Cash</span>
              </button>
              <button
                type="button"
                onClick={() => setPaymentMethod('UPI')}
                className={`py-2 rounded-xl border flex flex-col items-center justify-center gap-0.5 transition cursor-pointer ${
                  paymentMethod === 'UPI'
                    ? 'bg-indigo-700 text-white border-indigo-700 shadow-sm'
                    : 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100'
                }`}
              >
                <QrCode className="w-3.5 h-3.5" />
                <span className="text-[10px]">UPI</span>
              </button>
              <button
                type="button"
                onClick={() => setPaymentMethod('CARD')}
                className={`py-2 rounded-xl border flex flex-col items-center justify-center gap-0.5 transition cursor-pointer ${
                  paymentMethod === 'CARD'
                    ? 'bg-purple-700 text-white border-purple-700 shadow-sm'
                    : 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100'
                }`}
              >
                <CreditCard className="w-3.5 h-3.5" />
                <span className="text-[10px]">Card</span>
              </button>
              <button
                type="button"
                onClick={() => setPaymentMethod('BANK')}
                className={`py-2 rounded-xl border flex flex-col items-center justify-center gap-0.5 transition cursor-pointer ${
                  paymentMethod === 'BANK'
                    ? 'bg-teal-700 text-white border-teal-700 shadow-sm'
                    : 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100'
                }`}
              >
                <Banknote className="w-3.5 h-3.5" />
                <span className="text-[10px]">Bank</span>
              </button>
            </div>

            {/* Action Buttons */}
            <div className="space-y-2 pt-2">
              <button
                type="button"
                disabled={cart.length === 0}
                onClick={() => handleCompleteSampleBill(false)}
                className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 disabled:opacity-50 text-white font-black text-xs transition shadow-md flex items-center justify-center gap-2 cursor-pointer"
              >
                <Printer className="w-4 h-4" />
                <span>Complete Sample Bill & Print ({formatPrice(grandTotal)})</span>
              </button>

              <button
                type="button"
                disabled={cart.length === 0}
                onClick={() => {
                  showConfirmModal({
                    title: 'Confirm Directly to Live Orders?',
                    message: `Are you sure you want to write this bill directly into the REAL live database orders ledger with an auto-incrementing order ID?`,
                    description: `Total Bill: ${formatPrice(grandTotal)} • ${cart.length} item(s) • Customer: ${isWalkinCustomer ? 'Sample Walk-in Tester' : customerName}`,
                    confirmText: 'Yes, Confirm to Live Orders',
                    variant: 'info',
                    onConfirm: () => handleCompleteSampleBill(true)
                  });
                }}
                className="w-full py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold text-xs transition shadow-xs flex items-center justify-center gap-2 cursor-pointer"
                title="Saves to sample orders AND creates an official live order record"
              >
                <ArrowUpRight className="w-4 h-4" />
                <span>Save & Confirm directly to Live Orders</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 4. SAMPLE RECEIPT PRINT / PREVIEW MODAL (Full Thermal POS Receipt Format) */}
      {/* ========================================================================= */}
      {receiptModalOpen && completedOrder && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl relative overflow-hidden border border-gray-200 max-h-[92vh] overflow-y-auto">
            {/* Watermark Overlay in Receipt Modal if enabled */}
            {completedOrder.show_watermark && (
              <div className="absolute inset-0 pointer-events-none flex items-center justify-center select-none z-10 opacity-15">
                <div className="transform -rotate-45 text-rose-700 font-black text-4xl tracking-widest text-center uppercase border-4 border-dashed border-rose-700 p-4 rounded-2xl">
                  SAMPLE BILLING<br />NOT A REAL INVOICE
                </div>
              </div>
            )}

            {/* Header */}
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <div className="flex items-center gap-2">
                <span className="p-2 bg-indigo-100 text-indigo-700 rounded-xl">
                  <Printer className="w-5 h-5" />
                </span>
                <div>
                  <h3 className="font-black text-base text-gray-900">Sample Store Receipt</h3>
                  <div className="text-[10px] text-gray-400 font-mono">#{completedOrder.order_number}</div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setReceiptModalOpen(false)}
                className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-400 hover:text-gray-700 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Thermal POS Receipt Body */}
            <div className="p-4 bg-gray-50 rounded-2xl border border-gray-200 text-xs space-y-3 font-mono">
              <div className="text-center space-y-0.5 border-b border-dashed border-gray-300 pb-2">
                <div className="font-black text-sm text-emerald-950 font-serif">MR. VIVASAYI Mart</div>
                <div className="text-[10px] text-gray-500">Pure Traditional Foods & Farm Harvest</div>
                <div className="text-[10px] text-gray-500">{getFormattedStoreAddress()} | Ph: {getFormattedStorePhone()}</div>
                <div className="text-[10px] font-bold text-indigo-800">SAMPLE COUNTER BILL (SIMULATOR)</div>
              </div>

              <div className="flex justify-between text-[11px] text-gray-600">
                <span>Bill No: #{completedOrder.order_number}</span>
                <span>{new Date(completedOrder.created_at).toLocaleDateString()}</span>
              </div>
              <div className="text-[11px] text-gray-600">
                Customer: {completedOrder.customer_name_snapshot} ({completedOrder.customer_phone_snapshot})
              </div>

              {/* Items Table */}
              <div className="border-t border-b border-dashed border-gray-300 py-2 space-y-1.5">
                <div className="grid grid-cols-12 text-[10px] font-bold text-gray-500 pb-1 border-b border-gray-200">
                  <div className="col-span-6">Item</div>
                  <div className="col-span-2 text-center">Qty</div>
                  <div className="col-span-4 text-right">Total</div>
                </div>

                {completedOrder.items?.map((item, idx) => (
                  <div key={idx} className="grid grid-cols-12 text-[11px] items-center">
                    <div className="col-span-6 truncate pr-1">
                      <div className="font-bold text-gray-800 truncate">{item.product_name_snapshot}</div>
                      <div className="text-[9px] text-gray-400 font-mono">
                        {item.mrp_snapshot && item.mrp_snapshot > item.unit_price_snapshot && (
                          <span className="line-through mr-1">₹{item.mrp_snapshot}</span>
                        )}
                        ₹{item.unit_price_snapshot} {item.discount ? `(-${item.discount}%)` : ''}
                      </div>
                    </div>
                    <div className="col-span-2 text-center font-bold">{item.quantity}</div>
                    <div className="col-span-4 text-right font-bold">₹{item.total.toFixed(2)}</div>
                  </div>
                ))}
              </div>

              {/* Detailed Financial Summary */}
              <div className="space-y-1 text-right text-xs pt-1">
                {completedOrder.total_mrp && (
                  <div className="flex justify-between text-gray-500">
                    <span>Total MRP Rate:</span>
                    <span className="line-through font-mono">₹{completedOrder.total_mrp.toFixed(2)}</span>
                  </div>
                )}

                <div className="flex justify-between text-gray-700">
                  <span>Our Price Subtotal:</span>
                  <span className="font-mono">₹{completedOrder.subtotal.toFixed(2)}</span>
                </div>

                {completedOrder.mrp_savings ? (
                  <div className="flex justify-between text-emerald-700 font-bold">
                    <span>MRP Discount Savings:</span>
                    <span className="font-mono">- ₹{completedOrder.mrp_savings.toFixed(2)}</span>
                  </div>
                ) : null}

                {completedOrder.extra_discount_amount ? (
                  <div className="flex justify-between text-amber-700 font-bold">
                    <span>
                      Additional Discount ({completedOrder.extra_discount_mode === 'PERCENT' ? `${completedOrder.extra_discount_value}%` : `Flat ₹${completedOrder.extra_discount_value}`}):
                    </span>
                    <span className="font-mono">- ₹{completedOrder.extra_discount_amount.toFixed(2)}</span>
                  </div>
                ) : null}

                <div className="flex justify-between text-gray-600">
                  <span>GST Tax ({completedOrder.gst_percent || 0}%):</span>
                  <span className="font-mono">+ ₹{completedOrder.tax_amount.toFixed(2)}</span>
                </div>

                <div className="flex justify-between font-black text-sm text-gray-900 border-t border-gray-300 pt-1.5">
                  <span>TOTAL PAID:</span>
                  <span className="font-mono text-base">₹{completedOrder.total.toFixed(2)}</span>
                </div>

                <div className="text-[10px] text-gray-500 pt-1">
                  Payment: {completedOrder.payment_method} (PAID • SAMPLE)
                </div>
              </div>

              {completedOrder.converted_to_live && (
                <div className="p-2 rounded-xl bg-emerald-100 border border-emerald-300 text-emerald-900 font-bold text-[11px] text-center">
                  ✓ Converted into Live Order #{completedOrder.converted_order_id}
                </div>
              )}
            </div>

            {/* Receipt Modal Actions */}
            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                onClick={handlePrintReceipt}
                className="flex-1 py-2.5 px-3 rounded-xl bg-gray-900 hover:bg-black text-white font-bold text-xs transition flex items-center justify-center gap-1.5 cursor-pointer shadow-sm"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Print Bill</span>
              </button>

              {!completedOrder.converted_to_live && (
                <button
                  type="button"
                  onClick={() => handleConvertExistingToLive(completedOrder)}
                  className="flex-1 py-2.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs transition flex items-center justify-center gap-1.5 cursor-pointer shadow-sm"
                >
                  <ArrowUpRight className="w-3.5 h-3.5" />
                  <span>Convert to Live</span>
                </button>
              )}

              <button
                type="button"
                onClick={() => setReceiptModalOpen(false)}
                className="py-2.5 px-4 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold text-xs transition cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SamplePOSPage;
