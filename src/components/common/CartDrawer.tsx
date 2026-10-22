import React, { useState, useEffect } from 'react';
import {
  X, Trash2, Plus, Minus, MessageSquare, ShoppingBag, ArrowRight,
  ShieldCheck, ArrowLeft, User, Phone, Mail, MapPin, Building,
  FileText, CheckCircle2, Scale, Truck, Ticket, Timer, ExternalLink,
  ChevronDown, ChevronUp, AlertCircle, Sparkles, Loader2
} from 'lucide-react';
import { useCart } from '../../contexts/CartContext';
import { formatPrice } from '../../lib/utils';
import { getJSONStore, setJSONStore, syncOrderStockChange, getWhatsAppOrdersNumber } from '../../lib/dbManager';
import type { Order, OrderItem, Coupon, Customer } from '../../types';
import { useNotifications } from '../../contexts/NotificationContext';
import { useActionModal } from '../../contexts/ActionModalContext';
import { CountrySelector } from './CountrySelector';
import { findCustomerByPhoneAndCountry, generateUniqueCustomerId } from '../../lib/countryCodes';
import { generateOriginalOrderId } from '../../lib/sequentialIdUtils';

interface CartDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

const WHATSAPP_NUMBER = import.meta.env.VITE_WHATSAPP_NUMBER || '919876543210';

export const CartDrawer: React.FC<CartDrawerProps> = ({ isOpen, onClose }) => {
  const { items, updateQuantity, removeItem, clearCart, totalAmount, itemCount, subTotal, appliedCoupon, discountAmount, applyCoupon, removeCoupon } = useCart();
  const { addNotification } = useNotifications();
  const { showActionModal } = useActionModal();

  // Step State: 'CART' | 'CHECKOUT_FORM' | 'ORDER_PREVIEW' | 'SUCCESS'
  const [drawerStep, setDrawerStep] = useState<'CART' | 'CHECKOUT_FORM' | 'ORDER_PREVIEW' | 'SUCCESS'>('CART');

  // Customer Delivery Details Form State
  const [formData, setFormData] = useState({
    fullName: '',
    phone: '',
    country_code: 'IN',
    calling_code: '+91',
    email: '',
    address: '',
    city: 'Cumbum',
    state: 'Tamil Nadu',
    pincode: '625516',
    notes: ''
  });

  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  // Customer auto-fetch by WhatsApp Phone Number
  const [isLookingUpCustomer, setIsLookingUpCustomer] = useState(false);
  const [customerLookupStatus, setCustomerLookupStatus] = useState<{
    type: 'found' | 'new';
    customerName?: string;
    message: string;
  } | null>(null);

  // Pincode auto-fetch for City & State
  const [isLookingUpPincode, setIsLookingUpPincode] = useState(false);
  const [pincodeFeedback, setPincodeFeedback] = useState<{
    type: 'loading' | 'success' | 'warning';
    message: string;
  } | null>(null);

  // Auto-fetch customer details when WhatsApp phone number reaches 10 digits
  useEffect(() => {
    const rawDigits = formData.phone.replace(/\D/g, '');
    if (rawDigits.length < 10) {
      setCustomerLookupStatus(null);
      return;
    }

    let isMounted = true;
    const timer = setTimeout(async () => {
      setIsLookingUpCustomer(true);
      try {
        const customers = await getJSONStore<Customer>('customers');
        if (!isMounted) return;

        const matched = findCustomerByPhoneAndCountry(customers, rawDigits, formData.calling_code);
        if (matched && matched.name) {
          // Customer exists in DB! Auto-fetch name and address fields if they are blank or default
          setFormData(prev => ({
            ...prev,
            fullName: prev.fullName.trim() ? prev.fullName : matched.name,
            address: prev.address.trim() ? prev.address : (matched.address || prev.address),
            city: (prev.city && prev.city !== 'Cumbum') ? prev.city : (matched.city || prev.city),
            pincode: (prev.pincode && prev.pincode !== '625516') ? prev.pincode : (matched.pincode || prev.pincode),
            email: prev.email.trim() ? prev.email : (matched.email || prev.email),
            state: matched.state ? (
              ['Cumbum Store / Local', 'Theni District', 'Tamil Nadu', 'Other States'].includes(matched.state)
                ? matched.state
                : prev.state
            ) : prev.state
          }));

          setCustomerLookupStatus({
            type: 'found',
            customerName: matched.name,
            message: `Welcome back, ${matched.name}! ✨ We've auto-filled your details from your customer profile.`
          });

          // Clear any validation errors
          setFormErrors(prev => {
            const next = { ...prev };
            delete next.fullName;
            delete next.phone;
            return next;
          });
        } else {
          // Customer not found in DB -> friendly message
          setCustomerLookupStatus({
            type: 'new',
            message: "Welcome to MR. VIVASAYI! 👋 We're delighted to serve you. Please enter your name and delivery address below."
          });
        }
      } catch (err) {
        console.warn('Customer lookup error:', err);
      } finally {
        if (isMounted) setIsLookingUpCustomer(false);
      }
    }, 350);

    return () => {
      isMounted = false;
      clearTimeout(timer);
    };
  }, [formData.phone, formData.calling_code]);

  // Auto-fetch City and State when 6-digit Pincode is entered
  useEffect(() => {
    const cleanPin = formData.pincode.replace(/\D/g, '');
    if (cleanPin.length !== 6) {
      if (cleanPin.length < 6) {
        setPincodeFeedback(null);
      }
      return;
    }

    // Only lookup for Indian pincodes
    if (formData.country_code && formData.country_code !== 'IN') {
      return;
    }

    let isMounted = true;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 4000);

    const lookupPincode = async () => {
      setIsLookingUpPincode(true);
      setPincodeFeedback({
        type: 'loading',
        message: `Detecting city & state for ${cleanPin}...`
      });

      try {
        const res = await fetch(`https://api.postalpincode.in/pincode/${cleanPin}`, {
          signal: controller.signal
        });
        clearTimeout(timeoutId);

        if (!res.ok) throw new Error('Network error');
        const data = await res.json();
        if (!isMounted) return;

        if (
          Array.isArray(data) &&
          data[0]?.Status === 'Success' &&
          Array.isArray(data[0]?.PostOffice) &&
          data[0].PostOffice.length > 0
        ) {
          const po = data[0].PostOffice[0];
          const detectedCity = po.District || po.Name || po.Block || '';
          const detectedState = po.State || '';

          // Determine appropriate state category for delivery fee
          let mappedState = 'Other States';
          const stateLower = (detectedState || '').toLowerCase();
          const districtLower = (po.District || '').toLowerCase();
          const nameLower = (po.Name || '').toLowerCase();

          if (stateLower.includes('tamil nadu') || stateLower.includes('tamilnadu')) {
            if (districtLower.includes('theni') && (nameLower.includes('cumbum') || cleanPin === '625516')) {
              mappedState = 'Cumbum Store / Local';
            } else if (districtLower.includes('theni')) {
              mappedState = 'Theni District';
            } else {
              mappedState = 'Tamil Nadu';
            }
          } else {
            mappedState = 'Other States';
          }

          setFormData(prev => ({
            ...prev,
            city: detectedCity || prev.city,
            state: mappedState
          }));

          setPincodeFeedback({
            type: 'success',
            message: `Auto-detected: ${detectedCity}, ${detectedState} ✓`
          });

          // Clear errors on pincode and city
          setFormErrors(prev => {
            const next = { ...prev };
            delete next.pincode;
            delete next.city;
            return next;
          });
        } else {
          setPincodeFeedback({
            type: 'warning',
            message: 'Could not auto-fetch city & state for this pincode. Please enter manually.'
          });
        }
      } catch (err) {
        if (!isMounted) return;
        setPincodeFeedback({
          type: 'warning',
          message: 'Could not auto-fetch city & state. Please enter manually below.'
        });
      } finally {
        if (isMounted) setIsLookingUpPincode(false);
      }
    };

    const debounceTimer = setTimeout(lookupPincode, 400);

    return () => {
      isMounted = false;
      clearTimeout(debounceTimer);
      clearTimeout(timeoutId);
      controller.abort();
    };
  }, [formData.pincode, formData.country_code]);

  const [couponInput, setCouponInput] = useState('');
  const [couponError, setCouponError] = useState('');
  const [activeCoupons, setActiveCoupons] = useState<Coupon[]>([]);
  const [showCouponList, setShowCouponList] = useState(false);
  const [isLoadingCoupons, setIsLoadingCoupons] = useState(false);

  // Success 5-Second WhatsApp Redirect State
  const [whatsappRedirectUrl, setWhatsappRedirectUrl] = useState('');
  const [placedOrderNumber, setPlacedOrderNumber] = useState('');
  const [countdown, setCountdown] = useState<number>(5);
  const [hasRedirected, setHasRedirected] = useState(false);

  // Order Processing Popup Modal State
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingStep, setProcessingStep] = useState(1);
  const [processingStatusText, setProcessingStatusText] = useState('Validating order & customer shipping details...');

  const fetchActiveCoupons = async () => {
    setIsLoadingCoupons(true);
    try {
      const data = await getJSONStore<Coupon>('coupons');
      setActiveCoupons(data.filter(c => c.is_active));
    } catch (err) {
      console.warn('Could not fetch coupons:', err);
    } finally {
      setIsLoadingCoupons(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchActiveCoupons();
    }
  }, [isOpen]);

  const handleToggleShowCoupons = () => {
    if (!showCouponList && activeCoupons.length === 0) {
      fetchActiveCoupons();
    }
    setShowCouponList(prev => !prev);
  };

  const handleApplyCoupon = async (codeToApply?: string | React.MouseEvent) => {
    const code = typeof codeToApply === 'string' ? codeToApply : couponInput;
    setCouponError('');
    if (!code || !code.trim()) return;
    const coupons = await getJSONStore<Coupon>('coupons');
    const cleanCode = code.trim().toUpperCase();
    const found = coupons.find(c => c.code.toUpperCase() === cleanCode && c.is_active);
    if (!found) {
      setCouponError(`Coupon "${code}" is invalid or expired.`);
      return;
    }
    const minRequired = Number(found.min_order_value ?? (found as any).min_order_amount ?? 0);
    if (minRequired > 0 && subTotal < minRequired) {
      setCouponError(`Minimum order value of ₹${minRequired} required. Add ₹${minRequired - subTotal} more produce.`);
      return;
    }
    const applied = applyCoupon(found);
    if (!applied) {
      setCouponError(`Minimum order value of ₹${minRequired} required.`);
      return;
    }
    setCouponInput('');
    addNotification({
      title: 'Coupon Applied',
      message: `${found.code} applied successfully!`,
      type: 'success',
      sourceModule: 'Cart'
    });
  };

  // 5-Second WhatsApp Redirection Timer Effect
  const triggerWhatsAppRedirect = () => {
    if (!whatsappRedirectUrl) return;
    setHasRedirected(true);
    const win = window.open(whatsappRedirectUrl, '_blank');
    if (!win) {
      window.location.href = whatsappRedirectUrl;
    }
  };

  useEffect(() => {
    let intervalId: NodeJS.Timeout | null = null;
    if (drawerStep === 'SUCCESS' && whatsappRedirectUrl) {
      setCountdown(5);
      setHasRedirected(false);

      intervalId = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            if (intervalId) clearInterval(intervalId);
            triggerWhatsAppRedirect();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }

    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [drawerStep, whatsappRedirectUrl]);

  // Reusable Coupon Section with "Have trouble? Show coupon codes" toggle
  const renderCouponSection = () => (
    <div className="pt-2 pb-3 border-b border-gray-100 dark:border-emerald-800">
      {!appliedCoupon ? (
        <div className="flex flex-col space-y-2">
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="Enter Promo Code"
              value={couponInput}
              onChange={(e) => setCouponInput(e.target.value.toUpperCase())}
              className="flex-1 px-3 py-2 bg-gray-50 border border-gray-200 dark:bg-emerald-900/50 dark:border-emerald-700 rounded-lg text-sm font-mono uppercase font-bold text-gray-900 dark:text-emerald-100 placeholder:text-gray-400"
            />
            <button
              type="button"
              onClick={() => handleApplyCoupon()}
              className="px-4 py-2 bg-emerald-800 text-white font-extrabold text-xs rounded-lg hover:bg-emerald-900 transition shadow-xs shrink-0 cursor-pointer"
            >
              Apply
            </button>
          </div>
          {couponError && <p className="text-[10px] text-rose-500 font-bold pl-1">{couponError}</p>}

          {/* "Have trouble? Show coupon codes" Clickable Accordion Link */}
          <div className="flex items-center justify-between pt-0.5">
            <button
              type="button"
              onClick={handleToggleShowCoupons}
              className="text-[11px] font-extrabold text-emerald-700 dark:text-amber-400 hover:text-emerald-900 dark:hover:text-amber-300 hover:underline flex items-center gap-1.5 group cursor-pointer"
            >
              <Ticket className="w-3.5 h-3.5 text-emerald-600 dark:text-amber-400 shrink-0" />
              <span>Have trouble? Show coupon codes</span>
              <span className="text-[10px] text-emerald-600 dark:text-amber-300 group-hover:translate-y-0.5 transition-transform">
                {showCouponList ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
              </span>
            </button>

            {showCouponList && (
              <span className="text-[10px] text-gray-400 font-bold">
                {activeCoupons.length} offer{activeCoupons.length === 1 ? '' : 's'}
              </span>
            )}
          </div>

          {/* Active Coupons List - ONLY displayed when clicked! */}
          {showCouponList && (
            <div className="mt-2 space-y-2 animate-fadeIn">
              {isLoadingCoupons ? (
                <div className="p-3 text-center text-xs text-gray-500 bg-gray-50 dark:bg-emerald-900/30 rounded-xl border border-gray-200 dark:border-emerald-800">
                  Checking available coupons...
                </div>
              ) : activeCoupons.length > 0 ? (
                <div className="flex flex-col gap-2 max-h-52 overflow-y-auto pr-1">
                  {activeCoupons.map((c) => {
                    const minRequired = Number(c.min_order_value ?? (c as any).min_order_amount ?? 0);
                    const isEligible = minRequired === 0 || subTotal >= minRequired;
                    return (
                      <div
                        key={c.code}
                        className={`p-2.5 rounded-xl border transition flex items-center justify-between gap-2 ${
                          isEligible
                            ? 'bg-emerald-50/90 dark:bg-emerald-900/40 border-emerald-200 dark:border-emerald-700'
                            : 'bg-gray-50 dark:bg-gray-900/40 border-gray-200 dark:border-gray-800 opacity-75'
                        }`}
                      >
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="font-mono text-xs font-black text-emerald-950 dark:text-emerald-100">
                              {c.code}
                            </span>
                            <span className="text-[9px] font-black uppercase px-1.5 py-0.5 rounded bg-amber-100 text-amber-900 dark:bg-amber-900/50 dark:text-amber-300">
                              {c.discount_type === 'PERCENTAGE' ? `${c.discount_value}% OFF` : `₹${c.discount_value} OFF`}
                            </span>
                            {!isEligible && (
                              <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-rose-100 text-rose-800 dark:bg-rose-900/60 dark:text-rose-300">
                                Locked
                              </span>
                            )}
                          </div>
                          <p className="text-[10px] text-gray-600 dark:text-emerald-300 mt-0.5 line-clamp-1">
                            {c.description || (minRequired ? `Min cart ₹${minRequired}` : 'Active promotion')}
                          </p>
                          {!isEligible && minRequired > 0 && (
                            <p className="text-[9px] text-rose-600 dark:text-rose-400 font-bold mt-0.5">
                              Add ₹{minRequired - subTotal} more to unlock discount
                            </p>
                          )}
                        </div>

                        <button
                          type="button"
                          onClick={() => {
                            if (isEligible) {
                              setCouponInput(c.code);
                              handleApplyCoupon(c.code);
                            } else {
                              setCouponError(`Add ₹${minRequired - subTotal} more to your cart to use ${c.code}!`);
                            }
                          }}
                          className={`px-3 py-1.5 rounded-lg text-xs font-extrabold shrink-0 transition shadow-xs cursor-pointer ${
                            isEligible
                              ? 'bg-emerald-700 hover:bg-emerald-800 text-white active:scale-95'
                              : 'bg-gray-100 dark:bg-gray-800 text-gray-400 dark:text-gray-500 border border-gray-200 dark:border-gray-700 hover:border-amber-400'
                          }`}
                          title={isEligible ? 'Apply coupon code' : `Minimum order of ₹${minRequired} required`}
                        >
                          {isEligible ? 'Apply Code' : `Min ₹${minRequired}`}
                        </button>
                      </div>
                    );
                  })}
                </div>
              ) : (
                /* No active coupons currently available */
                <div className="p-3 text-center bg-gray-50 dark:bg-emerald-900/30 rounded-xl border border-gray-200 dark:border-emerald-800 space-y-1">
                  <p className="text-xs font-bold text-gray-700 dark:text-emerald-200 flex items-center justify-center gap-1">
                    <AlertCircle className="w-3.5 h-3.5 text-amber-500" />
                    <span>No active coupons currently available</span>
                  </p>
                  <p className="text-[10px] text-gray-500 dark:text-emerald-400">
                    Check back later for seasonal farm harvest offers & discount codes.
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      ) : (
        /* Applied Coupon Badge */
        <div className="flex items-center justify-between bg-emerald-50 dark:bg-emerald-900/50 p-2.5 rounded-xl border border-emerald-200 dark:border-emerald-700">
          <div className="flex items-center gap-2">
            <span className="text-lg">🏷️</span>
            <div>
              <div className="font-mono font-black text-emerald-800 dark:text-amber-400 text-xs tracking-wider flex items-center gap-1.5">
                <span>{appliedCoupon.code}</span>
                <span className="text-[9px] font-sans font-bold bg-emerald-200/80 text-emerald-900 px-1.5 py-0.5 rounded">
                  {appliedCoupon.discount_type === 'PERCENTAGE' ? `${appliedCoupon.discount_value}% OFF` : `₹${appliedCoupon.discount_value} OFF`}
                </span>
              </div>
              <div className="text-[10px] text-emerald-600 dark:text-emerald-300 font-medium">
                {appliedCoupon.description || 'Coupon applied to order'}
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={removeCoupon}
            className="text-xs text-rose-600 dark:text-rose-400 font-bold hover:underline px-2 py-1 cursor-pointer"
          >
            Remove
          </button>
        </div>
      )}
    </div>
  );

  // Dynamic Total Weight Calculation (Grams)
  const totalWeightGrams = items.reduce((sum, item) => {
    const packStr = (item.product.pack_size || '').toLowerCase();
    let weightPerUnit = 1000; // default 1kg
    if (packStr.includes('kg')) {
      const num = parseFloat(packStr.replace('kg', '').trim()) || 1;
      weightPerUnit = num * 1000;
    } else if (packStr.includes('g') || packStr.includes('gram')) {
      const num = parseFloat(packStr.replace(/g|gram|grams/, '').trim()) || 500;
      weightPerUnit = num;
    }
    return sum + (weightPerUnit * item.quantity);
  }, 0);

  // Dynamic Delivery Charge Calculation based on Order Amount & State
  const deliveryFee = totalAmount >= 1000 ? 0 : (formData.state === 'Cumbum Store / Local' ? 25 : (formData.state === 'Tamil Nadu' || formData.state === 'Theni District') ? 50 : 90);
  const grandTotal = totalAmount + deliveryFee;

  if (!isOpen) return null;

  const validateForm = () => {
    const errors: Record<string, string> = {};
    if (!formData.fullName.trim()) errors.fullName = 'Customer Full Name is required';
    if (!formData.phone.trim() || formData.phone.length < 10) errors.phone = 'Valid 10-digit WhatsApp/Phone required';
    if (!formData.address.trim()) errors.address = 'Street / Delivery Address is required';
    if (!formData.city.trim()) errors.city = 'City / Town is required';
    if (!formData.pincode.trim() || formData.pincode.length < 6) errors.pincode = 'Valid 6-digit Pincode is required';
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleProceedToPreview = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;
    setDrawerStep('ORDER_PREVIEW');
  };

  const handleConfirmAndSendOrder = async (e?: React.FormEvent | React.MouseEvent) => {
    if (e) e.preventDefault();
    if (isProcessing) return;
    if (!validateForm()) {
      setDrawerStep('CHECKOUT_FORM');
      return;
    }

    setIsProcessing(true);
    setProcessingStep(1);
    setProcessingStatusText('Validating customer shipping details & organic items...');

    const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

    try {
      // 1. Create New Order Entry for System Store Database (Orders Hub)
      const existingOrders = await getJSONStore<Order>('orders');
      const liveIdObj = generateOriginalOrderId(existingOrders);
      const newOrderNumber = liveIdObj.order_number;

      showActionModal({
        title: 'Placing Farm Order & Generating Invoice...',
        subtitle: `Writing order ${newOrderNumber} to database & syncing batch inventory...`,
        moduleName: 'Storefront Checkout',
        badge: 'Order Processing',
        duration: 900,
        steps: [
          'Validating customer shipping address...',
          'Allocating fresh warehouse stock...',
          'Creating verified order record in database...',
          'Order confirmed & placed successfully!'
        ]
      });

      await delay(450);
      setProcessingStep(2);
      setProcessingStatusText('Allocating organic stock & saving order to database...');

      const newOrderItems: OrderItem[] = items.map((it, idx) => ({
        id: `item-${Date.now()}-${idx}`,
        order_id: liveIdObj.id,
        product_id: it.product.id,
        product_name_snapshot: it.product.name,
        tamil_name_snapshot: it.product.tamil_name,
        pack_size_snapshot: it.product.pack_size,
        sku_snapshot: it.product.sku,
        quantity: it.quantity,
        unit_price_snapshot: it.product.offer_price || it.product.selling_price,
        discount: 0,
        total: (it.product.offer_price || it.product.selling_price) * it.quantity,
        created_at: new Date().toISOString()
      }));

      // Customer Auto-linking: Find existing customer or create new customer with unique customer_id
      const existingCustomers = await getJSONStore<Customer>('customers');
      let linkedCustomerId = '';
      let matchedCustomer = findCustomerByPhoneAndCountry(existingCustomers, formData.phone, formData.calling_code);

      if (matchedCustomer) {
        linkedCustomerId = matchedCustomer.id;
        matchedCustomer.name = formData.fullName || matchedCustomer.name;
        if (formData.email) matchedCustomer.email = formData.email;
        matchedCustomer.address = formData.address || matchedCustomer.address;
        matchedCustomer.city = formData.city || matchedCustomer.city;
        matchedCustomer.state = formData.state || matchedCustomer.state;
        matchedCustomer.pincode = formData.pincode || matchedCustomer.pincode;
        matchedCustomer.country_code = matchedCustomer.country_code || formData.country_code;
        matchedCustomer.calling_code = matchedCustomer.calling_code || formData.calling_code;
        matchedCustomer.total_orders = (matchedCustomer.total_orders || 0) + 1;
        matchedCustomer.total_spent = (matchedCustomer.total_spent || 0) + grandTotal;
        matchedCustomer.last_order_at = new Date().toISOString().split('T')[0];
        await setJSONStore('customers', existingCustomers);
      } else {
        const newUniqueCustId = generateUniqueCustomerId(existingCustomers);
        const newCust: Customer = {
          id: `cust-${newUniqueCustId}`,
          customer_id: newUniqueCustId,
          name: formData.fullName,
          phone: formData.phone,
          whatsapp_number: formData.phone,
          country_code: formData.country_code,
          calling_code: formData.calling_code,
          email: formData.email || '',
          address: formData.address,
          area: formData.city,
          city: formData.city,
          state: formData.state,
          pincode: formData.pincode,
          source_channel: 'WHATSAPP',
          total_orders: 1,
          total_spent: grandTotal,
          is_active: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };
        linkedCustomerId = newCust.id;
        await setJSONStore('customers', [newCust, ...existingCustomers]);
      }

      const createdOrder: Order = {
        id: liveIdObj.id,
        order_number: newOrderNumber,
        source: 'WHATSAPP',
        customer_id: linkedCustomerId,
        customer_name_snapshot: formData.fullName,
        customer_phone_snapshot: formData.phone,
        country_code: formData.country_code,
        calling_code: formData.calling_code,
        whatsapp_message_status: 'SENT',
        status: 'NEW',
        subtotal: subTotal,
        discount: discountAmount,
        delivery_fee: deliveryFee,
        tax_amount: 0,
        total: grandTotal,
        payment_method: 'PENDING',
        payment_status: 'PENDING',
        delivery_address: `${formData.address}, ${formData.city}, ${formData.state} - ${formData.pincode}`,
        notes: formData.notes ? `Customer Note: ${formData.notes}` : undefined,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        items: newOrderItems
      };

      const currentOrders = await getJSONStore<Order>('orders');
      await setJSONStore('orders', [createdOrder, ...currentOrders]);

      // Synchronize product stock decrement reliably across catalog & database
      try {
        await syncOrderStockChange(null, createdOrder);
      } catch (err) {
        console.error('Failed to update product stock:', err);
      }

      setProcessingStep(3);
      setProcessingStatusText('Finalizing invoice & preparing WhatsApp dispatch...');
      await delay(450);

      // 2. Format Structured WhatsApp Message
      const productLines = items.map((it, i) => {
        const price = it.product.offer_price ?? it.product.selling_price;
        const tamilName = it.product.tamil_name ? ` (${it.product.tamil_name})` : '';
        const pack = it.product.pack_size ? ` [${it.product.pack_size}]` : '';
        return `${i + 1}. *${it.product.name}*${tamilName}${pack} × ${it.quantity} = ${formatPrice(price * it.quantity)}`;
      }).join('\n');

      const formattedMessageText =
`📦 *NEW DIRECT ORDER - MR. VIVASAYI ORGANIC FOODS*
----------------------------------------
👤 *CUSTOMER DETAILS:*
• *Name:* ${formData.fullName}
• *Phone:* ${formData.calling_code} ${formData.phone}
${formData.email ? `• *Email:* ${formData.email}\n` : ''}• *Delivery Address:* ${formData.address}, ${formData.city}, ${formData.state} - ${formData.pincode}
${formData.notes ? `• *Customer Note:* ${formData.notes}\n` : ''}
----------------------------------------
🛒 *ORDER ITEMS (${items.length}):*
${productLines}

----------------------------------------
💰 *BILLING SUMMARY:*
• *Items Subtotal:* ${formatPrice(subTotal)}
${discountAmount > 0 ? `• *Coupon Discount (${appliedCoupon?.code}):* -${formatPrice(discountAmount)}\n` : ''}• *Delivery Charge:* ${deliveryFee === 0 ? 'FREE DELIVERY ✓' : formatPrice(deliveryFee)}
• *GRAND TOTAL:* ${formatPrice(grandTotal)}
• *Order Ref:* #${newOrderNumber}

----------------------------------------
Please confirm order availability and share UPI QR / payment details. Thank you! 🌿`;

      const targetWhatsAppNumber = getWhatsAppOrdersNumber() || WHATSAPP_NUMBER;
      const whatsappUrl = `https://api.whatsapp.com/send?phone=${targetWhatsAppNumber}&text=${encodeURIComponent(formattedMessageText)}`;

      // 3. Dispatch Notification & Set Success State with 5s Redirect Timer
      addNotification({
        title: `Order Placed (#${newOrderNumber})`,
        message: `Direct WhatsApp order created for ${formData.fullName}. Dispatched to store counter!`,
        type: 'success',
        sourceModule: 'WhatsApp Checkout'
      });

      setPlacedOrderNumber(newOrderNumber);
      setWhatsappRedirectUrl(whatsappUrl);
      setIsProcessing(false);
      setDrawerStep('SUCCESS');
    } catch (err) {
      console.error('Error placing order:', err);
      setIsProcessing(false);
      addNotification({
        title: 'Order Placement Error',
        message: 'Could not complete order placement. Please check your connection and try again.',
        type: 'error',
        sourceModule: 'WhatsApp Checkout'
      });
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden font-sans">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/65 backdrop-blur-sm transition-opacity duration-300"
        onClick={onClose}
      />

      <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
        <div className="w-screen max-w-md bg-white dark:bg-emerald-950 shadow-2xl flex flex-col border-l border-emerald-100 dark:border-emerald-800">
          
          {/* Header */}
          <div className="px-6 py-5 bg-gradient-to-r from-emerald-950 to-emerald-900 text-white flex items-center justify-between shadow-sm">
            <div className="flex items-center space-x-2">
              {drawerStep === 'ORDER_PREVIEW' ? (
                <button
                  type="button"
                  onClick={() => setDrawerStep('CHECKOUT_FORM')}
                  className="p-1 rounded-lg text-amber-300 hover:bg-emerald-800 transition cursor-pointer"
                  title="Back to delivery details"
                >
                  <ArrowLeft className="w-5 h-5" />
                </button>
              ) : drawerStep === 'CHECKOUT_FORM' ? (
                <button
                  type="button"
                  onClick={() => setDrawerStep('CART')}
                  className="p-1 rounded-lg text-amber-300 hover:bg-emerald-800 transition cursor-pointer"
                  title="Back to cart"
                >
                  <ArrowLeft className="w-5 h-5" />
                </button>
              ) : (
                <ShoppingBag className="w-5 h-5 text-amber-400" />
              )}
              <h2 className="text-base font-extrabold">
                {drawerStep === 'ORDER_PREVIEW'
                  ? 'Review & Preview Order 📋'
                  : drawerStep === 'CHECKOUT_FORM'
                  ? 'Enter Delivery Details'
                  : drawerStep === 'SUCCESS'
                  ? 'Order Dispatched ✓'
                  : 'Your Direct WhatsApp Order'}
              </h2>
              {drawerStep === 'CART' && (
                <span className="bg-amber-400 text-emerald-950 font-extrabold text-xs px-2.5 py-0.5 rounded-full">
                  {itemCount}
                </span>
              )}
            </div>
            <button
              onClick={onClose}
              className="p-1 rounded-full text-emerald-200 hover:text-white hover:bg-emerald-800 transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          {/* Subheader Notice */}
          <div className="bg-amber-50 dark:bg-emerald-900/50 px-6 py-2 border-b border-amber-200 dark:border-emerald-800 text-xs text-amber-900 dark:text-amber-200 flex items-center justify-between">
            <div className="flex items-center space-x-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
              <span>Direct WhatsApp store order — zero gateway fees</span>
            </div>
            {items.length > 0 && drawerStep === 'CART' && (
              <button 
                onClick={clearCart} 
                className="text-red-600 dark:text-red-400 hover:underline font-extrabold text-xs shrink-0"
              >
                Clear all
              </button>
            )}
          </div>

          {/* ================= STEP 1: CART ITEMS LIST ================= */}
          {drawerStep === 'CART' && (
            <>
              <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
                {items.length === 0 ? (
                  <div className="text-center py-16 space-y-4">
                    <div className="w-20 h-20 bg-emerald-100 dark:bg-emerald-900 rounded-full flex items-center justify-center mx-auto text-emerald-600 dark:text-emerald-400">
                      <ShoppingBag className="w-10 h-10" />
                    </div>
                    <h3 className="text-lg font-bold text-gray-800 dark:text-emerald-100">
                      Your Order List is Empty
                    </h3>
                    <p className="text-sm text-gray-500 dark:text-emerald-300/70 max-w-xs mx-auto">
                      Explore our traditional rice, native millets, and cold-pressed oils to add items to your WhatsApp order list.
                    </p>
                    <button
                      onClick={onClose}
                      className="mt-4 px-6 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white text-sm font-semibold rounded-full shadow transition-all"
                    >
                      Browse Traditional Products
                    </button>
                  </div>
                ) : (
                  items.map(({ product, quantity }) => (
                    <div 
                      key={product.id} 
                      className="flex items-center space-x-4 p-3 bg-emerald-50/50 dark:bg-emerald-900/30 rounded-xl border border-emerald-100 dark:border-emerald-800/60"
                    >
                      <img
                        src={product.image_url || 'https://images.unsplash.com/photo-1586201375761-83865001e31c?auto=format&fit=crop&w=150&q=80'}
                        alt={product.name}
                        className="w-16 h-16 object-cover rounded-lg border border-emerald-200 dark:border-emerald-700 shrink-0"
                      />
                      <div className="flex-1 min-w-0">
                        <h4 className="font-semibold text-sm text-gray-900 dark:text-emerald-100 truncate">
                          {product.name}
                        </h4>
                        {product.tamil_name && (
                          <p className="text-xs text-emerald-700 dark:text-emerald-400 font-medium">
                            {product.tamil_name}
                          </p>
                        )}
                        <div className="text-xs text-gray-500 dark:text-emerald-300/80 mt-0.5">
                          Pack: {product.pack_size || '1 unit'} ({product.unit})
                        </div>
                        <div className="font-bold text-sm text-emerald-800 dark:text-amber-400 mt-1">
                          {formatPrice(product.offer_price || product.selling_price)}
                        </div>
                      </div>

                      {/* Quantity controls */}
                      <div className="flex flex-col items-end space-y-2">
                        <button
                          onClick={() => removeItem(product.id)}
                          className="text-gray-400 hover:text-red-500 transition-colors p-1"
                          title="Remove item"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                        <div className="flex items-center border border-emerald-300 dark:border-emerald-700 rounded-lg bg-white dark:bg-emerald-950 overflow-hidden">
                          <button
                            onClick={() => updateQuantity(product.id, quantity - 1)}
                            className="px-2 py-1 text-gray-600 dark:text-emerald-200 hover:bg-emerald-100 dark:hover:bg-emerald-800"
                          >
                            <Minus className="w-3 h-3" />
                          </button>
                          <span className="px-2 text-xs font-bold text-gray-800 dark:text-emerald-100 min-w-[20px] text-center">
                            {quantity}
                          </span>
                          <button
                            onClick={() => updateQuantity(product.id, quantity + 1)}
                            className="px-2 py-1 text-gray-600 dark:text-emerald-200 hover:bg-emerald-100 dark:hover:bg-emerald-800"
                          >
                            <Plus className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Footer & Proceed Button */}
              {items.length > 0 && (
                <div className="p-6 bg-white dark:bg-emerald-950 border-t border-emerald-100 dark:border-emerald-800 space-y-4">
                  {renderCouponSection()}

                  <div className="space-y-1.5 text-sm">
                    <div className="flex justify-between text-gray-600 dark:text-emerald-300">
                      <span>Subtotal ({itemCount} items)</span>
                      <span>{formatPrice(subTotal)}</span>
                    </div>
                    {discountAmount > 0 && (
                      <div className="flex justify-between text-rose-600 font-medium">
                        <span>Discount ({appliedCoupon?.code})</span>
                        <span>-{formatPrice(discountAmount)}</span>
                      </div>
                    )}
                    <div className="flex justify-between text-emerald-700 dark:text-emerald-400 font-medium">
                      <span>Total Weight</span>
                      <span className="font-mono font-bold">
                        {totalWeightGrams >= 1000 ? `${(totalWeightGrams/1000).toFixed(2)} kg` : `${totalWeightGrams} g`}
                      </span>
                    </div>
                    <div className="flex justify-between text-lg font-bold text-gray-900 dark:text-amber-400 pt-2 border-t border-emerald-100 dark:border-emerald-800">
                      <span>Estimated Subtotal</span>
                      <span>{formatPrice(totalAmount)}</span>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => setDrawerStep('CHECKOUT_FORM')}
                    className="w-full flex items-center justify-center space-x-2 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold py-3.5 px-4 rounded-xl shadow-lg hover:shadow-xl transition-all text-base group"
                  >
                    <MessageSquare className="w-5 h-5 text-amber-300" />
                    <span>Proceed to WhatsApp Checkout</span>
                    <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                  </button>

                  <p className="text-center text-xs text-gray-400 dark:text-emerald-400/60">
                    Next: Enter your Name, Phone, and Delivery Address to format message.
                  </p>
                </div>
              )}
            </>
          )}

          {/* ================= STEP 2: CUSTOMER DELIVERY DETAILS FORM ================= */}
          {drawerStep === 'CHECKOUT_FORM' && (
            <form onSubmit={handleProceedToPreview} className="flex-1 flex flex-col justify-between overflow-y-auto">
              <div className="px-6 py-4 space-y-3.5 text-xs">
                
                <div className="bg-emerald-50/70 dark:bg-emerald-900/40 p-3 rounded-xl border border-emerald-200 dark:border-emerald-800">
                  <span className="font-extrabold text-emerald-950 dark:text-emerald-100 flex items-center gap-1.5 text-xs mb-0.5">
                    <User className="w-4 h-4 text-emerald-700 dark:text-amber-300" /> Customer & Delivery Address
                  </span>
                  <p className="text-[11px] text-gray-600 dark:text-emerald-300">
                    Fill in your details below. Your order will be stored in our store database and formatted directly for WhatsApp!
                  </p>
                </div>

                {/* Full Name */}
                <div>
                  <label className="block font-bold text-gray-700 dark:text-emerald-200 mb-1">
                    Customer Full Name *
                  </label>
                  <div className="relative">
                    <User className="w-4 h-4 text-gray-400 absolute left-3 top-3" />
                    <input
                      type="text"
                      placeholder="e.g. Ramesh Kumar"
                      value={formData.fullName}
                      onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                      className={`w-full pl-9 pr-3 py-2 bg-gray-50 dark:bg-emerald-900/60 border rounded-xl font-bold text-gray-900 dark:text-emerald-100 ${
                        formErrors.fullName ? 'border-rose-500 bg-rose-50' : 'border-gray-200 dark:border-emerald-700'
                      }`}
                    />
                  </div>
                  {formErrors.fullName && <p className="text-[10px] text-rose-600 font-bold mt-0.5">{formErrors.fullName}</p>}
                </div>

                {/* Phone Number with Country Selector & Auto-Fetch */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block font-bold text-gray-700 dark:text-emerald-200 text-xs">
                      WhatsApp Phone Number *
                    </label>
                    {isLookingUpCustomer && (
                      <span className="text-[10.5px] text-emerald-600 dark:text-amber-400 font-bold flex items-center gap-1">
                        <Loader2 className="w-3 h-3 animate-spin" />
                        <span>Checking customer history...</span>
                      </span>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <CountrySelector
                      value={formData.country_code}
                      onChange={(country) => {
                        setFormData(prev => ({
                          ...prev,
                          country_code: country.code,
                          calling_code: country.callingCode
                        }));
                      }}
                      className="w-32 shrink-0 text-xs"
                    />
                    <div className="relative flex-1">
                      <Phone className="w-4 h-4 text-gray-400 absolute left-3 top-3" />
                      <input
                        type="tel"
                        placeholder="e.g. 9876543210"
                        value={formData.phone}
                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                        className={`w-full pl-9 pr-3 py-2 bg-gray-50 dark:bg-emerald-900/60 border rounded-xl font-mono font-bold text-gray-900 dark:text-emerald-100 ${
                          formErrors.phone ? 'border-rose-500 bg-rose-50' : 'border-gray-200 dark:border-emerald-700'
                        }`}
                      />
                    </div>
                  </div>
                  {formErrors.phone && <p className="text-[10px] text-rose-600 font-bold mt-0.5">{formErrors.phone}</p>}

                  {/* Customer Status Message: Welcome back vs Friendly new customer greeting */}
                  {customerLookupStatus && (
                    <div
                      className={`mt-1.5 p-2.5 rounded-xl text-[11px] leading-snug flex items-start gap-2 transition-all animate-fadeIn ${
                        customerLookupStatus.type === 'found'
                          ? 'bg-emerald-50 dark:bg-emerald-900/60 border border-emerald-300 dark:border-emerald-700 text-emerald-900 dark:text-emerald-100 shadow-xs'
                          : 'bg-amber-50 dark:bg-amber-950/60 border border-amber-300 dark:border-amber-700 text-amber-900 dark:text-amber-200'
                      }`}
                    >
                      {customerLookupStatus.type === 'found' ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                      ) : (
                        <Sparkles className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                      )}
                      <div>
                        <span className="font-semibold">{customerLookupStatus.message}</span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Email Address */}
                <div>
                  <label className="block font-bold text-gray-700 dark:text-emerald-200 mb-1">
                    Email Address (Optional)
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-gray-400 absolute left-3 top-3" />
                    <input
                      type="email"
                      placeholder="e.g. name@mail.com"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      className="w-full pl-9 pr-2 py-2 bg-gray-50 dark:bg-emerald-900/60 border border-gray-200 dark:border-emerald-700 rounded-xl font-bold text-gray-900 dark:text-emerald-100"
                    />
                  </div>
                </div>

                {/* Delivery Address */}
                <div>
                  <label className="block font-bold text-gray-700 dark:text-emerald-200 mb-1">
                    Street / House / Delivery Address *
                  </label>
                  <div className="relative">
                    <MapPin className="w-4 h-4 text-gray-400 absolute left-3 top-3" />
                    <input
                      type="text"
                      placeholder="e.g. Door 45, Main Bazaar Street"
                      value={formData.address}
                      onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                      className={`w-full pl-9 pr-3 py-2 bg-gray-50 dark:bg-emerald-900/60 border rounded-xl font-bold text-gray-900 dark:text-emerald-100 ${
                        formErrors.address ? 'border-rose-500 bg-rose-50' : 'border-gray-200 dark:border-emerald-700'
                      }`}
                    />
                  </div>
                  {formErrors.address && <p className="text-[10px] text-rose-600 font-bold mt-0.5">{formErrors.address}</p>}
                </div>

                {/* City, State & Pincode with Postal Auto-Fetch */}
                <div className="space-y-2">
                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <label className="block font-bold text-gray-700 dark:text-emerald-200 mb-1">
                        City / Town *
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. Cumbum"
                        value={formData.city}
                        onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                        className={`w-full px-2.5 py-2 bg-gray-50 dark:bg-emerald-900/60 border rounded-xl font-bold text-gray-900 dark:text-emerald-100 ${
                          formErrors.city ? 'border-rose-500 bg-rose-50' : 'border-gray-200 dark:border-emerald-700'
                        }`}
                      />
                    </div>

                    <div>
                      <label className="block font-bold text-gray-700 dark:text-emerald-200 mb-1">
                        State / Region
                      </label>
                      <select
                        value={formData.state}
                        onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                        className="w-full px-2 py-2 bg-gray-50 dark:bg-emerald-900/60 border border-gray-200 dark:border-emerald-700 rounded-xl font-bold text-emerald-950 dark:text-emerald-100 text-xs"
                      >
                        <option value="Cumbum Store / Local">Cumbum (Local Store)</option>
                        <option value="Theni District">Theni District</option>
                        <option value="Tamil Nadu">Tamil Nadu State</option>
                        <option value="Other States">Other States (Pan-India)</option>
                      </select>
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="block font-bold text-gray-700 dark:text-emerald-200">
                          Pincode *
                        </label>
                        {isLookingUpPincode && (
                          <Loader2 className="w-3 h-3 text-emerald-600 dark:text-amber-400 animate-spin" />
                        )}
                      </div>
                      <input
                        type="text"
                        maxLength={6}
                        placeholder="625516"
                        value={formData.pincode}
                        onChange={(e) => setFormData({ ...formData, pincode: e.target.value })}
                        className={`w-full px-2.5 py-2 bg-gray-50 dark:bg-emerald-900/60 border rounded-xl font-mono font-bold text-gray-900 dark:text-emerald-100 ${
                          formErrors.pincode ? 'border-rose-500 bg-rose-50' : 'border-gray-200 dark:border-emerald-700'
                        }`}
                      />
                    </div>
                  </div>

                  {/* Pincode Auto-fetch Feedback Banner */}
                  {pincodeFeedback && (
                    <div
                      className={`p-2 rounded-xl text-[11px] flex items-center justify-between gap-2 transition-all animate-fadeIn ${
                        pincodeFeedback.type === 'success'
                          ? 'bg-emerald-50 dark:bg-emerald-900/60 border border-emerald-300 dark:border-emerald-700 text-emerald-900 dark:text-emerald-200'
                          : pincodeFeedback.type === 'warning'
                          ? 'bg-amber-50 dark:bg-amber-950/60 border border-amber-300 dark:border-amber-700 text-amber-900 dark:text-amber-200'
                          : 'bg-emerald-50/70 dark:bg-emerald-900/40 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300'
                      }`}
                    >
                      <div className="flex items-center gap-1.5">
                        {pincodeFeedback.type === 'success' ? (
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                        ) : pincodeFeedback.type === 'warning' ? (
                          <AlertCircle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                        ) : (
                          <Loader2 className="w-3.5 h-3.5 text-emerald-600 animate-spin shrink-0" />
                        )}
                        <span className="font-semibold">{pincodeFeedback.message}</span>
                      </div>
                      {pincodeFeedback.type === 'warning' && (
                        <span className="text-[10px] font-black uppercase text-amber-800 dark:text-amber-200 bg-amber-100 dark:bg-amber-900 px-2 py-0.5 rounded shrink-0">
                          Manual Entry
                        </span>
                      )}
                    </div>
                  )}

                  {formErrors.city && <p className="text-[10px] text-rose-600 font-bold">{formErrors.city}</p>}
                  {formErrors.pincode && <p className="text-[10px] text-rose-600 font-bold">{formErrors.pincode}</p>}
                </div>

                {/* Optional Notes */}
                <div>
                  <label className="block font-bold text-gray-700 dark:text-emerald-200 mb-1">
                    Special Delivery Note (Optional)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Call before delivery / Leave with neighbor"
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    className="w-full px-3 py-2 bg-gray-50 dark:bg-emerald-900/60 border border-gray-200 dark:border-emerald-700 rounded-xl font-medium text-gray-900 dark:text-emerald-100"
                  />
                </div>

                {/* Coupon Apply Section in Checkout Form */}
                {renderCouponSection()}

                {/* Price Breakdown Box */}
                <div className="bg-emerald-950 text-white p-3.5 rounded-2xl space-y-1.5 shadow">
                  <div className="flex justify-between text-emerald-200 text-xs">
                    <span>Items Subtotal ({itemCount}):</span>
                    <span>{formatPrice(subTotal)}</span>
                  </div>
                  {discountAmount > 0 && (
                    <div className="flex justify-between text-rose-300 text-xs font-bold">
                      <span>Coupon Discount ({appliedCoupon?.code}):</span>
                      <span>-{formatPrice(discountAmount)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-emerald-200 text-xs">
                    <span>Delivery Charge ({formData.state}):</span>
                    <span className="font-mono font-bold text-amber-300">
                      {deliveryFee === 0 ? 'FREE DELIVERY ✓' : `+${formatPrice(deliveryFee)}`}
                    </span>
                  </div>
                  <div className="flex justify-between font-black text-sm text-amber-300 pt-1.5 border-t border-emerald-800">
                    <span>Grand Total:</span>
                    <span className="text-base">{formatPrice(grandTotal)}</span>
                  </div>
                </div>

              </div>

              {/* Preview Order Button */}
              <div className="p-5 bg-white dark:bg-emerald-950 border-t border-emerald-100 dark:border-emerald-800 space-y-2">
                <button
                  type="submit"
                  className="w-full flex items-center justify-center space-x-2 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold py-3.5 px-4 rounded-xl shadow-lg hover:shadow-xl transition-all text-base group cursor-pointer active:scale-98"
                >
                  <span>Preview & Review Order (Step 2 of 3) 📋</span>
                  <ArrowRight className="w-5 h-5 text-amber-300 group-hover:translate-x-1 transition-transform" />
                </button>
                <p className="text-center text-[11px] text-gray-500 dark:text-emerald-400/80">
                  Step 2 of 3: Check your items, address, and bill breakdown before final confirmation.
                </p>
              </div>
            </form>
          )}

          {/* ================= STEP 3: ORDER PREVIEW BEFORE FINAL SUBMIT ================= */}
          {drawerStep === 'ORDER_PREVIEW' && (
            <div className="flex-1 flex flex-col justify-between overflow-hidden animate-fadeIn">
              <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3.5 text-xs">
                
                {/* Step Banner */}
                <div className="bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-900/40 dark:to-teal-900/30 p-3 rounded-2xl border border-emerald-200 dark:border-emerald-700 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-xl">📋</span>
                    <div>
                      <h4 className="text-xs font-black text-emerald-950 dark:text-emerald-100 uppercase tracking-wide">
                        Order Preview (Step 3 of 3)
                      </h4>
                      <p className="text-[10px] text-emerald-700 dark:text-emerald-300">
                        Review your address and harvest basket before final submit
                      </p>
                    </div>
                  </div>
                  <span className="text-[10px] font-extrabold bg-amber-400 text-emerald-950 px-2.5 py-0.5 rounded-full shadow-xs">
                    Pre-Submit
                  </span>
                </div>

                {/* Card 1: Delivery Destination Details */}
                <div className="bg-white dark:bg-emerald-900/30 rounded-2xl border border-gray-200 dark:border-emerald-800 p-3.5 space-y-2 shadow-xs">
                  <div className="flex items-center justify-between border-b border-gray-100 dark:border-emerald-800 pb-2">
                    <div className="flex items-center gap-1.5 text-xs font-extrabold text-gray-800 dark:text-emerald-200">
                      <User className="w-4 h-4 text-emerald-600 dark:text-amber-400" />
                      <span>Delivery Contact & Destination</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setDrawerStep('CHECKOUT_FORM')}
                      className="text-[11px] font-extrabold text-emerald-700 dark:text-amber-400 hover:underline cursor-pointer"
                    >
                      Edit Details ✏️
                    </button>
                  </div>

                  <div className="space-y-1">
                    <p className="font-extrabold text-gray-900 dark:text-white flex items-center gap-1.5">
                      <span>{formData.fullName}</span>
                      <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-emerald-100 dark:bg-emerald-950 text-emerald-900 dark:text-emerald-300 font-bold">
                        {formData.calling_code} {formData.phone}
                      </span>
                    </p>
                    <p className="text-gray-600 dark:text-emerald-300 text-[11px] leading-relaxed">
                      {formData.address}, {formData.city}, {formData.state} - {formData.pincode}
                    </p>
                    {formData.email && (
                      <p className="text-gray-500 dark:text-emerald-400 text-[10px]">
                        Email: {formData.email}
                      </p>
                    )}
                    {formData.notes && (
                      <div className="mt-1.5 p-2 bg-amber-50/80 dark:bg-emerald-950/80 rounded-lg border border-amber-200/80 dark:border-emerald-800 text-[10px] text-amber-900 dark:text-amber-300">
                        <span className="font-bold">Instructions:</span> {formData.notes}
                      </div>
                    )}
                  </div>
                </div>

                {/* Card 2: Items in Order */}
                <div className="bg-white dark:bg-emerald-900/30 rounded-2xl border border-gray-200 dark:border-emerald-800 p-3.5 space-y-2 shadow-xs">
                  <div className="flex items-center justify-between border-b border-gray-100 dark:border-emerald-800 pb-2">
                    <div className="flex items-center gap-1.5 text-xs font-extrabold text-gray-800 dark:text-emerald-200">
                      <ShoppingBag className="w-4 h-4 text-emerald-600 dark:text-amber-400" />
                      <span>Items in Basket ({itemCount})</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setDrawerStep('CART')}
                      className="text-[11px] font-extrabold text-emerald-700 dark:text-amber-400 hover:underline cursor-pointer"
                    >
                      Edit Cart 🛒
                    </button>
                  </div>

                  <div className="divide-y divide-gray-100 dark:divide-emerald-800/60 max-h-44 overflow-y-auto pr-1">
                    {items.map((it) => {
                      const price = it.product.offer_price ?? it.product.selling_price;
                      return (
                        <div key={it.product.id} className="py-2 flex items-center justify-between text-xs gap-2">
                          <div className="min-w-0 flex-1">
                            <p className="font-bold text-gray-900 dark:text-emerald-100 truncate">
                              {it.product.name}
                            </p>
                            <p className="text-[10px] text-gray-500 dark:text-emerald-400">
                              {it.product.pack_size || 'Unit'} × {it.quantity}
                            </p>
                          </div>
                          <div className="text-right shrink-0">
                            <p className="font-mono font-bold text-gray-900 dark:text-amber-300">
                              {formatPrice(price * it.quantity)}
                            </p>
                            <p className="text-[9px] text-gray-400">
                              {formatPrice(price)} each
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Card 3: Final Billing Breakdown */}
                <div className="bg-emerald-950 text-white p-3.5 rounded-2xl space-y-1.5 shadow-md">
                  <h5 className="text-[11px] font-mono uppercase tracking-wider text-emerald-400 font-bold border-b border-emerald-800 pb-1 flex justify-between">
                    <span>Summary of Charges</span>
                    <span>Total Weight: {totalWeightGrams >= 1000 ? `${(totalWeightGrams/1000).toFixed(2)} kg` : `${totalWeightGrams} g`}</span>
                  </h5>
                  <div className="space-y-1 text-xs text-emerald-200">
                    <div className="flex justify-between">
                      <span>Items Subtotal:</span>
                      <span className="font-mono">{formatPrice(subTotal)}</span>
                    </div>
                    {discountAmount > 0 && (
                      <div className="flex justify-between text-rose-300 font-bold">
                        <span>Coupon Savings ({appliedCoupon?.code}):</span>
                        <span className="font-mono">-{formatPrice(discountAmount)}</span>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span>Delivery Fee ({formData.state}):</span>
                      <span className="font-mono font-bold text-amber-300">
                        {deliveryFee === 0 ? 'FREE DELIVERY ✓' : `+${formatPrice(deliveryFee)}`}
                      </span>
                    </div>
                    <div className="flex justify-between font-black text-sm text-amber-300 pt-1.5 border-t border-emerald-800">
                      <span>Grand Total:</span>
                      <span className="text-base font-mono">{formatPrice(grandTotal)}</span>
                    </div>
                  </div>
                </div>

                {/* Card 4: WhatsApp Destination Preview */}
                <div className="p-3 bg-gray-50 dark:bg-emerald-900/20 rounded-xl border border-gray-200 dark:border-emerald-800 text-[11px]">
                  <p className="text-gray-600 dark:text-emerald-300 leading-snug">
                    📲 Clicking confirm will register your order in the store system and immediately open WhatsApp to dispatch your order bill to store counter.
                  </p>
                </div>
              </div>

              {/* Bottom Confirmation Action Buttons */}
              <div className="p-4 sm:p-5 bg-white dark:bg-emerald-950 border-t border-emerald-100 dark:border-emerald-800 space-y-2 shrink-0">
                <button
                  type="button"
                  onClick={() => handleConfirmAndSendOrder()}
                  disabled={isProcessing}
                  className={`w-full flex items-center justify-center space-x-2 font-extrabold py-3.5 px-4 rounded-xl shadow-lg transition-all text-base group cursor-pointer ${
                    isProcessing
                      ? 'bg-emerald-800/80 text-emerald-200 cursor-not-allowed opacity-90'
                      : 'bg-emerald-600 hover:bg-emerald-700 text-white hover:shadow-xl active:scale-98'
                  }`}
                >
                  {isProcessing ? (
                    <>
                      <Loader2 className="w-5 h-5 text-amber-300 animate-spin" />
                      <span>Please wait, order is processing...</span>
                    </>
                  ) : (
                    <>
                      <MessageSquare className="w-5 h-5 text-amber-300" />
                      <span>Confirm & Send Order via WhatsApp 📲</span>
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => setDrawerStep('CHECKOUT_FORM')}
                  className="w-full py-1.5 text-center text-xs font-bold text-gray-500 dark:text-emerald-400 hover:text-emerald-700 hover:underline cursor-pointer"
                >
                  ← Back to Edit Delivery Details
                </button>
              </div>
            </div>
          )}

          {/* ================= STEP 3: SUCCESS CONFIRMATION WITH 5s COUNTDOWN ================= */}
          {drawerStep === 'SUCCESS' && (
            <div className="flex-1 flex flex-col justify-between p-6 sm:p-8 animate-fadeIn overflow-y-auto">
              <div className="space-y-6 text-center my-auto">
                {/* Animated Pulsating Icon */}
                <div className="relative w-20 h-20 mx-auto">
                  <div className="absolute inset-0 rounded-full bg-emerald-400/30 animate-ping" />
                  <div className="relative w-20 h-20 rounded-full bg-gradient-to-tr from-emerald-600 to-teal-500 text-white flex items-center justify-center shadow-xl border-4 border-white dark:border-emerald-800">
                    <CheckCircle2 className="w-10 h-10" />
                  </div>
                </div>

                {/* Title & Order ID */}
                <div className="space-y-1.5">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-black uppercase tracking-wider bg-emerald-100 text-emerald-900 border border-emerald-300">
                    ✓ Order Recorded in Database
                  </span>
                  <h3 className="text-2xl font-serif font-black text-emerald-950 dark:text-emerald-100">
                    Order Placed Successfully!
                  </h3>
                  <p className="text-xs text-gray-500 dark:text-emerald-300">
                    Order Ref: <span className="font-mono font-black text-emerald-800 dark:text-amber-300">#{placedOrderNumber}</span>
                  </p>
                </div>

                {/* Order Summary Snapshot */}
                <div className="bg-emerald-50/70 dark:bg-emerald-900/40 p-4 rounded-2xl border border-emerald-200 dark:border-emerald-800 text-left text-xs space-y-2">
                  <div className="flex justify-between text-gray-600 dark:text-emerald-200">
                    <span>Customer Name:</span>
                    <span className="font-bold text-gray-900 dark:text-white">{formData.fullName}</span>
                  </div>
                  <div className="flex justify-between text-gray-600 dark:text-emerald-200">
                    <span>Items Count:</span>
                    <span className="font-bold text-gray-900 dark:text-white">{itemCount} items</span>
                  </div>
                  {discountAmount > 0 && (
                    <div className="flex justify-between text-rose-600 dark:text-rose-400 font-bold">
                      <span>Discount Saved:</span>
                      <span>-{formatPrice(discountAmount)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-gray-600 dark:text-emerald-200">
                    <span>Grand Total:</span>
                    <span className="font-black text-emerald-800 dark:text-amber-300 text-sm">{formatPrice(grandTotal)}</span>
                  </div>
                </div>

                {/* 5-Second Countdown Timer Card */}
                <div className="p-4 bg-amber-50 dark:bg-emerald-900/60 rounded-2xl border border-amber-200 dark:border-emerald-700 space-y-2.5">
                  <div className="flex items-center justify-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-amber-400 text-emerald-950 font-black text-xs flex items-center justify-center animate-pulse shadow-sm">
                      {countdown}s
                    </div>
                    <span className="font-extrabold text-amber-950 dark:text-amber-200 text-xs">
                      {countdown > 0
                        ? `Redirecting to WhatsApp in ${countdown} second${countdown === 1 ? '' : 's'}...`
                        : 'Launching WhatsApp...'}
                    </span>
                  </div>

                  {/* Progress bar */}
                  <div className="w-full bg-amber-200/80 dark:bg-emerald-950 h-2 rounded-full overflow-hidden">
                    <div
                      className="bg-emerald-600 h-full transition-all duration-1000 ease-linear rounded-full"
                      style={{ width: `${((5 - countdown) / 5) * 100}%` }}
                    />
                  </div>

                  <p className="text-[11px] text-gray-600 dark:text-emerald-300 leading-relaxed">
                    Your pre-formatted bill will open in WhatsApp to confirm order dispatch with our store team.
                  </p>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="space-y-2.5 pt-4 border-t border-gray-100 dark:border-emerald-800">
                <button
                  type="button"
                  onClick={triggerWhatsAppRedirect}
                  className="w-full flex items-center justify-center space-x-2 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold py-3.5 px-4 rounded-xl shadow-lg hover:shadow-xl transition-all text-sm group transform active:scale-95 cursor-pointer"
                >
                  <MessageSquare className="w-5 h-5 text-amber-300" />
                  <span>
                    {hasRedirected ? 'Open WhatsApp Again 📲' : 'Open WhatsApp Now (Click if not redirected) 📲'}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    clearCart();
                    setDrawerStep('CART');
                    onClose();
                  }}
                  className="w-full py-2 text-center text-xs font-bold text-gray-500 dark:text-emerald-400 hover:text-emerald-700 hover:underline cursor-pointer"
                >
                  Close & Continue Shopping 🌿
                </button>
              </div>
            </div>
          )}

        </div>
      </div>

      {/* ================= ORDER PROCESSING POPUP MODAL (MOBILE FRIENDLY) ================= */}
      {isProcessing && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-sm animate-fadeIn touch-none select-none">
          <div className="bg-white dark:bg-emerald-950 border border-emerald-500/40 rounded-3xl p-5 sm:p-7 max-w-[340px] sm:max-w-sm w-[92vw] shadow-2xl text-center space-y-4 sm:space-y-5 animate-scaleUp">
            {/* Animated Spinner & Icon */}
            <div className="relative w-16 h-16 sm:w-20 sm:h-20 mx-auto flex items-center justify-center">
              <div className="absolute inset-0 rounded-full bg-emerald-500/20 animate-ping" />
              <div className="relative w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-emerald-100 dark:bg-emerald-900/60 border-2 border-emerald-500/50 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shadow-sm">
                <Loader2 className="w-7 h-7 sm:w-8 sm:h-8 animate-spin" />
              </div>
            </div>

            {/* Main Message */}
            <div className="space-y-1.5 sm:space-y-2">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] sm:text-[11px] font-black uppercase tracking-wider bg-amber-100 dark:bg-amber-900/60 text-amber-900 dark:text-amber-300 border border-amber-300 dark:border-amber-700">
                <Sparkles className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                <span>Processing Order</span>
              </div>
              <h3 className="text-lg sm:text-xl font-serif font-black text-emerald-950 dark:text-emerald-100 leading-snug">
                Please wait, your order is processing...
              </h3>
              <p className="text-xs sm:text-sm text-gray-600 dark:text-emerald-300 font-medium px-1 leading-normal">
                {processingStatusText}
              </p>
            </div>

            {/* Visual Step Progress Bar */}
            <div className="space-y-1.5">
              <div className="w-full bg-emerald-100 dark:bg-emerald-900/60 h-2 rounded-full overflow-hidden">
                <div
                  className="bg-emerald-600 h-full transition-all duration-300 rounded-full"
                  style={{ width: `${(processingStep / 3) * 100}%` }}
                />
              </div>
              <div className="flex justify-between text-[10px] sm:text-[11px] text-gray-400 dark:text-emerald-400/70 font-semibold px-1">
                <span>1. Validate</span>
                <span>2. Save Order</span>
                <span>3. WhatsApp</span>
              </div>
            </div>

            {/* Reassurance banner */}
            <div className="p-2.5 sm:p-3 bg-emerald-50 dark:bg-emerald-900/30 rounded-xl border border-emerald-200 dark:border-emerald-800 text-[11px] sm:text-xs text-emerald-800 dark:text-emerald-300 leading-relaxed">
              🌿 Do not close or refresh this window. Your order is being securely registered!
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CartDrawer;
