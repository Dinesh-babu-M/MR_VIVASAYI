import React, { useState } from 'react';
import { 
  Search, ShoppingCart, Trash2, Plus, Minus, CreditCard, 
  DollarSign, QrCode, Printer, CheckCircle2, X, User, Phone, Leaf,
  Tag, Percent, Sparkles, UserPlus, Filter, Mail, Send, MessageSquare, Save,
  Boxes, BarChart2, AlertCircle, AlertTriangle, Package, Info
} from 'lucide-react';
import { formatPrice } from '../../lib/utils';
import type { Product, PaymentMethod, Customer, Order, Category } from '../../types';
import { useNotifications } from '../../contexts/NotificationContext';
import { getJSONStore, setJSONStore, syncOrderStockChange } from '../../lib/dbManager';
import { RefreshSpinnerModal } from '../../components/common/RefreshSpinnerModal';
import { POSSkeleton } from '../../components/common/Skeleton';
import { useActionModal } from '../../contexts/ActionModalContext';
import { RefreshCw, FileText } from 'lucide-react';
import { CountrySelector } from '../../components/common/CountrySelector';
import { findCustomerByPhoneAndCountry, generateUniqueCustomerId } from '../../lib/countryCodes';
import { generateOriginalOrderId } from '../../lib/sequentialIdUtils';
import { getFormattedStoreAddress, getFormattedStorePhone } from '../../lib/storeSettings';

interface POSItem {
  product: Product;
  quantity: number;
  customPrice?: number;
  itemDiscountPercent: number;
}

export const POSPage: React.FC = () => {
  const { addNotification } = useNotifications();
  const { showActionModal, showConfirmModal } = useActionModal();
  const [cart, setCart] = useState<POSItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');

  const [products, setProducts] = useState<Product[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [recentPOSOrders, setRecentPOSOrders] = useState<Order[]>([]);
  const [editingOrder, setEditingOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);

  React.useEffect(() => {
    async function load() {
      try {
        const [p, c, cat, ord] = await Promise.all([
          getJSONStore<Product>('products'),
          getJSONStore<Customer>('customers'),
          getJSONStore<Category>('categories'),
          getJSONStore<Order>('orders'),
        ]);
        setProducts(p);
        setCustomers(c);
        setCategories(cat);
        setRecentPOSOrders(ord);

        // Check if routed from POS Billing & Sales Details History for editing
        const editPosOrderStr = sessionStorage.getItem('edit_pos_order');
        if (editPosOrderStr) {
          try {
            const parsedOrder: Order = JSON.parse(editPosOrderStr);
            sessionStorage.removeItem('edit_pos_order');
            handleEditOrderInPOS(parsedOrder, p);
          } catch (e) {
            console.error("Failed to parse edit_pos_order", e);
          }
        }
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  // Customer Form State (Walk-in Customer mode toggle, Name compulsory, Phone required unless Walk-in, Email optional)
  const [isWalkinCustomer, setIsWalkinCustomer] = useState<boolean>(true);
  const [customerName, setCustomerName] = useState('Walk-in Customer');
  const [customerPhone, setCustomerPhone] = useState('9876543210');
  const [countryCode, setCountryCode] = useState<string>('IN');
  const [callingCode, setCallingCode] = useState<string>('+91');
  const [customerEmail, setCustomerEmail] = useState('');
  const [saveCustomerToCRM, setSaveCustomerToCRM] = useState(true);

  // Billing calculation states
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('CASH');
  const [gstPercent, setGstPercent] = useState<number>(0); // Default 0%, editable
  const [extraDiscountMode, setExtraDiscountMode] = useState<'PERCENT' | 'AMOUNT'>('PERCENT');
  const [extraDiscountValue, setExtraDiscountValue] = useState<number>(0);
  
  // Receipt modal & dispatch loading state
  const [showReceipt, setShowReceipt] = useState(false);
  const [lastCompletedOrder, setLastCompletedOrder] = useState<any>(null);
  const [isDispatching, setIsDispatching] = useState<boolean>(false);
  const [dispatchStatus, setDispatchStatus] = useState<string | null>(null);
  const [showAllOrdersModal, setShowAllOrdersModal] = useState<boolean>(false);
  
  // Customer Phone Auto-fetch State
  const [customerLookupStatus, setCustomerLookupStatus] = useState<{
    found: boolean;
    customer?: Customer;
    searchedPhone?: string;
  } | null>(null);

  // Stock Quick View & Order Processing loading modal states
  const [stockViewProduct, setStockViewProduct] = useState<Product | null>(null);
  const [isOrderProcessing, setIsOrderProcessing] = useState<boolean>(false);
  const [processingStep, setProcessingStep] = useState<string>('Please wait, your order is processing...');

  // Time ago helper for timestamps
  const formatTimeAgo = (dateStr: string) => {
    if (!dateStr) return 'Just now';
    const diffMs = Date.now() - new Date(dateStr).getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} ${diffMins === 1 ? 'min' : 'mins'} ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours} ${diffHours === 1 ? 'hour' : 'hours'} ago`;
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays} ${diffDays === 1 ? 'day' : 'days'} ago`;
  };

  // Edit / reload order into active POS cart helper
  const handleEditOrderInPOS = (ord: Order, currentProducts?: Product[]) => {
    if ((ord.items || []).length === 0) {
      addNotification({
        title: 'Empty Order',
        message: 'This order has no items to edit',
        type: 'warning',
        sourceModule: 'Counter POS'
      });
      return;
    }
    const targetProducts = currentProducts || products;
    const newCart: POSItem[] = (ord.items || []).map(i => {
      const pMatch = targetProducts.find(p => p.id === i.product_id || p.name === i.product_name_snapshot);
      const product: Product = pMatch || {
        id: i.product_id || `p-${Date.now()}`,
        sku: i.sku_snapshot || 'SKU-001',
        name: i.product_name_snapshot,
        tamil_name: i.tamil_name_snapshot,
        slug: i.product_name_snapshot.toLowerCase().replace(/\s+/g, '-'),
        pack_size: i.pack_size_snapshot || '1kg',
        unit: 'kg',
        purchase_price: i.unit_price_snapshot,
        landed_cost: i.unit_price_snapshot,
        mrp: i.unit_price_snapshot,
        selling_price: i.unit_price_snapshot,
        tax_percent: 5,
        reorder_level: 5,
        opening_stock: 50,
        current_stock: 50,
        stock_status: 'IN_STOCK',
        is_featured: false,
        is_visible: true,
        is_organic: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      return {
        product,
        quantity: i.quantity,
        itemDiscountPercent: i.discount || 0
      };
    });

    setCart(newCart);
    setEditingOrder(ord);
    if (ord.customer_name_snapshot) {
      setCustomerName(ord.customer_name_snapshot);
      setIsWalkinCustomer(ord.customer_name_snapshot === 'Walk-in Customer');
    }
    if (ord.customer_phone_snapshot) {
      setCustomerPhone(ord.customer_phone_snapshot);
    }
    if (ord.payment_method) {
      setPaymentMethod(ord.payment_method);
    }
    setShowAllOrdersModal(false);
    setShowReceipt(false);
    addNotification({
      title: 'Order Loaded for Editing',
      message: `Loaded Sale ${ord.order_number} into POS terminal. Completing will update the existing sale in-place.`,
      type: 'info',
      sourceModule: 'Counter POS'
    });
  };

  // Safe wrapper for loading an order to edit with confirmation if current cart has items
  const promptEditOrderInPOS = (ord: Order, currentProducts?: Product[]) => {
    if (cart.length > 0) {
      showConfirmModal({
        title: 'Load Order for Editing?',
        message: `Loading order ${ord.order_number} will replace the ${cart.length} item(s) currently in the active POS bill. Are you sure?`,
        description: 'Any unsaved items in the current transaction will be cleared.',
        confirmText: 'Yes, Load Order',
        variant: 'warning',
        onConfirm: () => {
          handleEditOrderInPOS(ord, currentProducts);
        }
      });
    } else {
      handleEditOrderInPOS(ord, currentProducts);
    }
  };

  // Customer Phone Auto-fetch Handler
  const handleLookupCustomerByPhone = (phoneToSearch: string) => {
    const clean = phoneToSearch.trim().replace(/\D/g, '');
    if (clean.length < 10) {
      setCustomerLookupStatus(null);
      return;
    }
    const matched = findCustomerByPhoneAndCountry(customers, clean, callingCode);
    if (matched) {
      setCustomerName(matched.name);
      if (matched.email) setCustomerEmail(matched.email);
      setCustomerLookupStatus({ found: true, customer: matched, searchedPhone: clean });
      addNotification({
        title: 'Customer Profile Located',
        message: `Linked customer "${matched.name}" (ID: ${matched.customer_id || matched.id}) with phone +${callingCode.replace(/\D/g, '')} ${clean}`,
        type: 'success',
        sourceModule: 'Counter POS'
      });
    } else {
      setCustomerLookupStatus({ found: false, searchedPhone: clean });
      addNotification({
        title: 'New Customer',
        message: `No existing user for +${callingCode.replace(/\D/g, '')} ${clean}. Enter customer name to auto-register.`,
        type: 'info',
        sourceModule: 'Counter POS'
      });
    }
  };

  // Dynamically compute current active categories that HAVE products
  const activeCategories = React.useMemo(() => {
    const standardCategoryNames: Record<string, { name: string; tamil?: string; icon: string }> = {
      'cat-1': { name: 'Traditional Rice', tamil: 'பாரம்பரிய அரிசி', icon: '🌾' },
      'cat-2': { name: 'Millets', tamil: 'சிறுதானியம்', icon: '🌿' },
      'cat-3': { name: 'Pulses & Legumes', tamil: 'பயறு & பருப்பு', icon: '🫘' },
      'cat-4': { name: 'Cold-Pressed Oils', tamil: 'மரச்செக்கு எண்ணெய்', icon: '🫒' },
      'cat-5': { name: 'Natural Sweeteners & Honey', tamil: 'கருப்பட்டி & சர்க்கரை', icon: '🍯' },
      'cat-7': { name: 'Spices & Masalas', tamil: 'மசாலா & மஞ்சள்', icon: '🌶️' }
    };

    const explicit = categories.filter(c => {
      if (c.is_active === false || c.is_visible === false) return false;
      const lower = (c.name || '').toLowerCase().trim();
      if (lower === 'testing' || lower.startsWith('test') || lower.startsWith('card ') || lower.startsWith('cat ') || /^cat[-_\s]?\d+$/i.test(c.name)) {
        return false;
      }
      return true;
    });

    const existingIds = new Set(explicit.map(c => c.id));
    const synthetic: Category[] = [];

    products.forEach(p => {
      if (p.category_id && !existingIds.has(p.category_id)) {
        existingIds.add(p.category_id);
        const std = standardCategoryNames[p.category_id];
        if (std) {
          synthetic.push({
            id: p.category_id,
            name: std.name,
            tamil_name: std.tamil,
            slug: std.name.toLowerCase().replace(/\s+/g, '-'),
            icon: std.icon,
            display_order: 10,
            is_active: true,
            is_visible: true,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          });
        }
      }
    });

    // ONLY show active categories that have at least 1 product
    return [...explicit, ...synthetic]
      .filter(cat => products.some(p => p.category_id === cat.id))
      .sort((a, b) => (a.display_order || 0) - (b.display_order || 0));
  }, [categories, products]);

  // Special offers count
  const offerProductsCount = React.useMemo(() => {
    return products.filter(p => Boolean(p.offer_price && p.offer_price > 0 && p.offer_price < p.selling_price)).length;
  }, [products]);

  // Festival deals count
  const festivalProductsCount = React.useMemo(() => {
    return products.filter(p => Boolean(p.festival_offer)).length;
  }, [products]);

  // Filtered products by category & search query
  const filteredProducts = products.filter((p: Product) => {
    const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (p.tamil_name && p.tamil_name.toLowerCase().includes(searchQuery.toLowerCase())) ||
      p.sku.toLowerCase().includes(searchQuery.toLowerCase());
    
    let matchesCategory = true;
    if (selectedCategory === 'OFFERS') {
      matchesCategory = Boolean(p.offer_price && p.offer_price > 0 && p.offer_price < p.selling_price);
    } else if (selectedCategory === 'FESTIVAL') {
      matchesCategory = Boolean(p.festival_offer);
    } else if (selectedCategory !== 'ALL') {
      matchesCategory = p.category_id === selectedCategory;
    }

    return matchesSearch && matchesCategory;
  });

  const addToCart = (product: Product) => {
    setCart(prev => {
      const existing = prev.find(item => item.product.id === product.id);
      if (existing) {
        return prev.map(item => item.product.id === product.id ? { ...item, quantity: item.quantity + 1 } : item);
      }
      return [...prev, { product, quantity: 1, itemDiscountPercent: 0 }];
    });
  };

  const updateQuantity = (productId: string, qty: number) => {
    if (qty <= 0) {
      setCart(prev => prev.filter(item => item.product.id !== productId));
    } else {
      setCart(prev => prev.map(item => item.product.id === productId ? { ...item, quantity: qty } : item));
    }
  };

  const updateItemDiscount = (productId: string, discountPct: number) => {
    setCart(prev => prev.map(item => item.product.id === productId ? { ...item, itemDiscountPercent: Math.max(0, Math.min(100, discountPct)) } : item));
  };

  // Subtotal calculations: MRP savings vs Selling Price
  const totalMRP = cart.reduce((sum, item) => sum + (item.product.mrp || item.product.selling_price) * item.quantity, 0);

  // Price after MRP discount & item level extra discount
  const itemsSubtotal = cart.reduce((sum, item) => {
    const basePrice = item.product.offer_price || item.product.selling_price;
    const discountedPrice = basePrice * (1 - (item.itemDiscountPercent || 0) / 100);
    return sum + discountedPrice * item.quantity;
  }, 0);

  const mrpSavings = Math.max(0, totalMRP - itemsSubtotal);
  const mrpSavingsPercent = totalMRP > 0 ? Math.round((mrpSavings / totalMRP) * 100) : 0;

  // Dual Extra Bill Discount Calculation (Percentage or Flat Amount)
  const extraDiscountAmount = extraDiscountMode === 'PERCENT'
    ? (itemsSubtotal * extraDiscountValue) / 100
    : Math.min(itemsSubtotal, extraDiscountValue);

  const calculatedDiscountPercent = itemsSubtotal > 0
    ? Math.round((extraDiscountAmount / itemsSubtotal) * 100)
    : 0;

  const taxAmount = (itemsSubtotal - extraDiscountAmount) * (gstPercent / 100);
  const grandTotal = Math.max(0, itemsSubtotal - extraDiscountAmount + taxAmount);

  const handleCheckout = () => {
    if (cart.length === 0) {
      addNotification({
        title: 'Empty Cart',
        message: 'Please add at least one product item to the POS bill.',
        type: 'warning',
        sourceModule: 'Counter POS'
      });
      return;
    }

    // Validate Customer Name (Compulsory)
    if (!customerName.trim()) {
      addNotification({
        title: 'Customer Name Required',
        message: 'Please enter Customer Name (Compulsory for POS billing).',
        type: 'warning',
        sourceModule: 'Counter POS'
      });
      return;
    }

    // Validate Phone Number (Required unless Walk-in Customer mode is selected)
    if (!isWalkinCustomer && (!customerPhone.trim() || customerPhone.trim().replace(/\D/g, '').length < 10)) {
      addNotification({
        title: 'Phone Number Required',
        message: 'Please enter a valid 10-digit Phone Number for named registered customer.',
        type: 'warning',
        sourceModule: 'Counter POS'
      });
      return;
    }

    const isEditing = Boolean(editingOrder);
    const initialLiveObj = isEditing ? { id: editingOrder!.id, order_number: editingOrder!.order_number } : generateOriginalOrderId(recentPOSOrders);
    const orderId = initialLiveObj.id;
    const orderNumber = initialLiveObj.order_number;
    
    // Smart Walk-in resolution: If cashier entered an actual name or real phone, do NOT declare them as generic Walk-in
    const cleanEnteredName = customerName.trim();
    const cleanEnteredPhone = customerPhone.trim();
    const hasRealName = cleanEnteredName !== '' && cleanEnteredName.toLowerCase() !== 'walk-in customer' && cleanEnteredName.toLowerCase() !== 'walk-in';
    const hasRealPhone = cleanEnteredPhone !== '' && cleanEnteredPhone !== '9876543210';

    const finalCustomerName = hasRealName ? cleanEnteredName : (hasRealPhone ? (cleanEnteredName || 'Customer') : 'Walk-in Customer');
    const finalCustomerPhone = hasRealPhone ? cleanEnteredPhone : '9876543210';
    const finalCustomerEmail = customerEmail.trim();

    const orderData = {
      orderNumber,
      date: isEditing && editingOrder?.created_at ? new Date(editingOrder.created_at).toLocaleString('en-IN') : new Date().toLocaleString('en-IN'),
      customerName: finalCustomerName,
      customerPhone: finalCustomerPhone,
      countryCode,
      callingCode,
      customerEmail: finalCustomerEmail,
      items: cart,
      totalMRP,
      subtotal: itemsSubtotal,
      mrpSavings,
      mrpSavingsPercent,
      extraDiscountMode,
      extraDiscountValue,
      extraDiscountPercent: calculatedDiscountPercent,
      extraDiscountAmount,
      gstPercent,
      taxAmount,
      grandTotal,
      paymentMethod
    };

    showConfirmModal({
      title: isEditing ? 'Update POS Transaction?' : 'Confirm POS Sale & Print?',
      message: `Are you sure you want to complete this sale of ${formatPrice(grandTotal)} for ${finalCustomerName}?`,
      description: `${cart.length} produce pack${cart.length > 1 ? 's' : ''} in bill • Payment via ${paymentMethod.toUpperCase()} • GST: ${gstPercent}%`,
      confirmText: '🧾 Yes, Complete Sale & Print',
      variant: 'success',
      onConfirm: () => {
        setIsOrderProcessing(true);
        setProcessingStep('Please wait, your order is processing...');

        showActionModal({
      title: isEditing ? 'Updating POS Transaction' : 'Finalizing Counter Sale',
      subtitle: `${finalCustomerName} • Receipt #${orderNumber} • ₹${grandTotal}`,
      badge: 'POS Terminal Live',
      duration: 950,
      steps: [
        'Please wait, your order is processing...',
        'Calculating inventory reductions & GST tax...',
        'Recording counter sale to orders ledger...',
        'Generating printable thermal bill receipt...',
        'Sale completed successfully!'
      ],
      onComplete: async () => {
        setProcessingStep('Recording counter sale & saving customer profile...');
        // Customer Auto-linking: Find existing customer or create new customer with unique customer_id
        const existingCustomers = await getJSONStore<Customer>('customers');
        let linkedCustomerId = '';
        let matchedCustomer = findCustomerByPhoneAndCountry(existingCustomers, finalCustomerPhone, callingCode);
        let isNewCustomer = false;

        if (matchedCustomer) {
          linkedCustomerId = matchedCustomer.id;
          matchedCustomer.name = finalCustomerName || matchedCustomer.name;
          if (finalCustomerEmail) matchedCustomer.email = finalCustomerEmail;
          matchedCustomer.country_code = matchedCustomer.country_code || countryCode;
          matchedCustomer.calling_code = matchedCustomer.calling_code || callingCode;
          matchedCustomer.total_orders = (matchedCustomer.total_orders || 0) + 1;
          matchedCustomer.total_spent = (matchedCustomer.total_spent || 0) + grandTotal;
          matchedCustomer.last_order_at = new Date().toISOString().split('T')[0];
          await setJSONStore('customers', existingCustomers);
          setCustomers(existingCustomers);
        } else {
          isNewCustomer = true;
          const newUniqueId = generateUniqueCustomerId(existingCustomers);
          const newCust: Customer = {
            id: `cust-${newUniqueId}`,
            customer_id: newUniqueId,
            name: finalCustomerName,
            phone: finalCustomerPhone,
            whatsapp_number: finalCustomerPhone,
            country_code: countryCode,
            calling_code: callingCode,
            email: finalCustomerEmail || '',
            address: 'Counter Walk-in',
            area: 'Store Counter',
            city: 'Cumbum',
            state: 'Tamil Nadu',
            pincode: '625516',
            source_channel: 'OFFLINE_POS',
            total_orders: 1,
            total_spent: grandTotal,
            is_active: true,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          };
          linkedCustomerId = newCust.id;
          const updatedCustList = [newCust, ...existingCustomers];
          await setJSONStore('customers', updatedCustList);
          setCustomers(updatedCustList);
        }

        const existingOrders = await getJSONStore<Order>('orders');
        const finalIdObj = isEditing
          ? { id: orderId, order_number: orderNumber }
          : generateOriginalOrderId(existingOrders);
        const finalOrderId = finalIdObj.id;
        const finalOrderNumber = finalIdObj.order_number;

        // Save / Update Order in Orders Hub
        const newOrUpdatedOrder: Order = {
          id: finalOrderId,
          order_number: finalOrderNumber,
          customer_id: linkedCustomerId,
          country_code: countryCode,
          calling_code: callingCode,
          source: isEditing ? (editingOrder?.source || 'POS') : 'POS',
          customer_name_snapshot: finalCustomerName,
          customer_phone_snapshot: finalCustomerPhone,
          whatsapp_message_status: 'PENDING',
          status: isEditing ? (editingOrder?.status || 'DELIVERED') : 'DELIVERED',
          subtotal: itemsSubtotal,
          discount: extraDiscountAmount,
          delivery_fee: 0,
          tax_amount: taxAmount,
          total: grandTotal,
          payment_method: paymentMethod,
          payment_status: 'PAID',
          created_at: isEditing ? (editingOrder?.created_at || new Date().toISOString()) : new Date().toISOString(),
          updated_at: new Date().toISOString(),
          items: cart.map(it => ({
            id: `oi-${Date.now()}-${Math.random()}`,
            order_id: finalOrderId,
            product_id: it.product.id,
            product_name_snapshot: it.product.name,
            tamil_name_snapshot: it.product.tamil_name,
            pack_size_snapshot: it.product.pack_size,
            sku_snapshot: it.product.sku,
            quantity: it.quantity,
            unit_price_snapshot: it.product.offer_price || it.product.selling_price,
            discount: it.itemDiscountPercent,
            total: (it.product.offer_price || it.product.selling_price) * (1 - it.itemDiscountPercent / 100) * it.quantity,
            created_at: new Date().toISOString()
          }))
        };

        let updatedOrders: Order[];
        if (isEditing) {
          updatedOrders = existingOrders.map(o => (o.id === finalOrderId || o.order_number === finalOrderNumber) ? newOrUpdatedOrder : o);
        } else {
          updatedOrders = [newOrUpdatedOrder, ...existingOrders];
        }
        await setJSONStore('orders', updatedOrders);

        // Synchronize product stock decrement or delta reliably
        try {
          await syncOrderStockChange(isEditing ? editingOrder : null, newOrUpdatedOrder);
          const freshProducts = await getJSONStore<Product>('products');
          setProducts(freshProducts);
        } catch (err) {
          console.error('Failed to update product stock:', err);
        }

        setRecentPOSOrders(updatedOrders);
        setEditingOrder(null);

        addNotification({
          title: isNewCustomer ? 'New Customer Registered & Saved' : 'Customer Profile Updated',
          message: `POS Sale Receipt ${orderNumber} generated successfully for ${finalCustomerName}. Customer linked to CRM directory.`,
          type: 'success',
          sourceModule: 'Counter POS'
        });

        setIsOrderProcessing(false);
        setLastCompletedOrder(orderData);
        setShowReceipt(true);
      }
    });
  }
});
};

  // Dispatch Receipt via WhatsApp with Confirmation & Loading Animation
  const handleSendWhatsAppBill = () => {
    if (!lastCompletedOrder) return;
    const cleanPhone = (lastCompletedOrder.customerPhone || '').replace(/\D/g, '');
    const cleanCalling = (lastCompletedOrder.callingCode || callingCode || '+91').replace(/\D/g, '');
    const fullPhone = cleanPhone.startsWith(cleanCalling) ? cleanPhone : `${cleanCalling}${cleanPhone}`;

    showConfirmModal({
      title: 'Send Receipt via WhatsApp?',
      message: `Are you sure you want to send the digital receipt to +${cleanCalling} ${lastCompletedOrder.customerPhone} (${lastCompletedOrder.customerName})?`,
      description: `Order #${lastCompletedOrder.orderNumber} • Amount: ₹${lastCompletedOrder.grandTotal}`,
      confirmText: '💬 Yes, Send WhatsApp Bill',
      variant: 'success',
      onConfirm: () => {
        showActionModal({
          title: 'Dispatching WhatsApp Bill',
          subtitle: `Sending receipt #${lastCompletedOrder.orderNumber} to +${cleanCalling} ${lastCompletedOrder.customerPhone}...`,
          badge: 'WhatsApp Receipt',
          duration: 750,
          steps: [
            'Preparing WhatsApp receipt payload...',
            'Opening customer chat channel...',
            'Receipt dispatched successfully!'
          ],
          onComplete: async () => {
            const msg = `*MR. VIVASAYI Mart Receipt*\nBill #: ${lastCompletedOrder.orderNumber}\nCustomer: ${lastCompletedOrder.customerName}\nTotal Paid: ₹${lastCompletedOrder.grandTotal}\nThank you for shopping at MR. VIVASAYI Mart!`;
            const whatsappUrl = `https://wa.me/${fullPhone}?text=${encodeURIComponent(msg)}`;
            const win = window.open(whatsappUrl, '_blank');
            
            try {
              const allOrders = await getJSONStore<Order>('orders');
              const target = allOrders.find(o => o.order_number === lastCompletedOrder.orderNumber);
              if (target) {
                target.whatsapp_message_status = win ? 'SENT' : 'FAILED';
                await setJSONStore('orders', allOrders);
                setRecentPOSOrders(allOrders);
              }
            } catch (e) {
              console.error(e);
            }

            addNotification({
              title: 'WhatsApp Receipt Dispatched',
              message: `Order receipt template sent to WhatsApp for ${lastCompletedOrder.customerPhone}.`,
              type: 'success',
              sourceModule: 'Counter POS'
            });
          }
        });
      }
    });
  };

  // Dispatch Receipt via Email with Confirmation & Loading Animation
  const handleSendEmailBill = () => {
    if (!lastCompletedOrder) return;
    const recipient = lastCompletedOrder.customerEmail || lastCompletedOrder.customerName;

    showConfirmModal({
      title: 'Send Invoice via Email?',
      message: `Are you sure you want to send the digital invoice to ${recipient}?`,
      description: `Order #${lastCompletedOrder.orderNumber} • Total: ₹${lastCompletedOrder.grandTotal}`,
      confirmText: '✉️ Yes, Send Email Invoice',
      variant: 'info',
      onConfirm: () => {
        showActionModal({
          title: 'Sending Email Invoice',
          subtitle: `Dispatching receipt to ${recipient}...`,
          badge: 'Email Receipt',
          duration: 750,
          steps: [
            'Formatting HTML thermal invoice...',
            'Transmitting email via SMTP gateway...',
            'Email sent successfully!'
          ],
          onComplete: () => {
            addNotification({
              title: 'Email Receipt Sent',
              message: `Digital invoice email template sent to ${recipient}.`,
              type: 'success',
              sourceModule: 'Counter POS'
            });
          }
        });
      }
    });
  };

  // Dispatch Receipt via Both WhatsApp & Email Bulk with Confirmation & Loading Animation
  const handleSendBothBill = () => {
    if (!lastCompletedOrder) return;

    showConfirmModal({
      title: 'Send Receipt to Both Channels?',
      message: `Are you sure you want to send the receipt via both WhatsApp and Email to ${lastCompletedOrder.customerName}?`,
      description: `Phone: ${lastCompletedOrder.customerPhone} • Email: ${lastCompletedOrder.customerEmail || 'N/A'} • Total: ₹${lastCompletedOrder.grandTotal}`,
      confirmText: '🚀 Yes, Send to Both',
      variant: 'success',
      onConfirm: () => {
        showActionModal({
          title: 'Dispatching Multi-Channel Bills',
          subtitle: `Sending via WhatsApp and Email for #${lastCompletedOrder.orderNumber}...`,
          badge: 'Multi-Channel Live',
          duration: 800,
          steps: [
            'Formatting WhatsApp message...',
            'Preparing transactional email...',
            'Dispatched to both channels successfully!'
          ],
          onComplete: () => {
            const msg = `*MR. VIVASAYI Mart Receipt*\nBill #: ${lastCompletedOrder.orderNumber}\nCustomer: ${lastCompletedOrder.customerName}\nTotal Paid: ₹${lastCompletedOrder.grandTotal}\nThank you for shopping at MR. VIVASAYI Mart!`;
            const cleanPhone = lastCompletedOrder.customerPhone.replace(/[^0-9]/g, '');
            window.open(`https://wa.me/91${cleanPhone}?text=${encodeURIComponent(msg)}`, '_blank');

            addNotification({
              title: 'Multi-Channel Bills Sent',
              message: `Dispatched bill via WhatsApp and Email for ${lastCompletedOrder.customerName}.`,
              type: 'success',
              sourceModule: 'Counter POS'
            });
          }
        });
      }
    });
  };

  // Reset POS Terminal on New Sale with Default Store Customer Landing
  const resetPOS = () => {
    setCart([]);
    setEditingOrder(null);
    setCustomerName('Walk-in Customer');
    setCustomerPhone('9876543210');
    setCustomerEmail('');
    setExtraDiscountValue(0);
    setShowReceipt(false);
    setIsDispatching(false);
    setDispatchStatus(null);
  };

  // Start New Sale with Confirmation if cart is active
  const handleNewSaleWithConfirm = () => {
    if (cart.length > 0) {
      showConfirmModal({
        title: 'Start New Sale?',
        message: 'Are you sure you want to start a new sale? Any items currently in this bill will be discarded.',
        description: `${cart.length} item(s) in active cart with total ₹${grandTotal}`,
        confirmText: 'Yes, Start New Sale',
        variant: 'warning',
        onConfirm: () => {
          resetPOS();
        }
      });
    } else {
      resetPOS();
    }
  };

  // Clear entire cart with Confirmation & Percentage Loading
  const handleClearCart = () => {
    if (cart.length === 0) return;
    showConfirmModal({
      title: 'Clear Current Bill?',
      message: `Are you sure you want to clear all ${cart.length} item(s) from the bill?`,
      description: 'This will reset all cart items, discounts, and customer details back to default.',
      confirmText: 'Yes, Clear Entire Bill',
      variant: 'danger',
      onConfirm: () => {
        showActionModal({
          title: 'Clearing POS Cart',
          subtitle: 'Resetting produce items & discounts...',
          badge: 'POS Terminal',
          duration: 500,
          steps: [
            'Removing cart produce items...',
            'Resetting tax & discount calculations...',
            'POS Terminal ready for new items!'
          ],
          onComplete: () => {
            resetPOS();
          }
        });
      }
    });
  };

  // Remove single item from cart with confirmation
  const handleRemoveCartItem = (productId: string, productName: string) => {
    showConfirmModal({
      title: 'Remove Item from Bill?',
      message: `Are you sure you want to remove "${productName}" from the current bill?`,
      confirmText: 'Yes, Remove Item',
      variant: 'warning',
      onConfirm: () => {
        updateQuantity(productId, 0);
      }
    });
  };

  const [isRefreshing, setIsRefreshing] = useState(false);

  if (loading) {
    return <POSSkeleton />;
  }

  return (
    <div className="h-[calc(100vh-6rem)] grid grid-cols-1 lg:grid-cols-12 gap-6 overflow-hidden">
      <RefreshSpinnerModal
        isOpen={isRefreshing}
        moduleName="Counter POS"
        title="Refreshing POS Terminal..."
        subtitle="Syncing product stock counts & customer profiles from database..."
        onComplete={() => setIsRefreshing(false)}
      />
      
      {/* Left 7 Columns: Product Selection Grid */}
      <div className="lg:col-span-7 flex flex-col space-y-4 bg-white dark:bg-emerald-900/40 p-5 rounded-3xl border border-emerald-100 dark:border-emerald-800 shadow-sm overflow-hidden">
        
        {/* Search Bar & Category Filter */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="w-5 h-5 absolute left-3.5 top-3.5 text-gray-400 dark:text-emerald-400" />
              <input
                type="text"
                placeholder="Scan barcode or type product name, SKU, Tamil name..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-11 pr-4 py-3 bg-emerald-50/60 dark:bg-emerald-950 border border-emerald-200 dark:border-emerald-700 rounded-2xl text-sm font-semibold text-gray-900 dark:text-emerald-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                autoFocus
              />
            </div>
            <button
              type="button"
              onClick={() => {
                if (filteredProducts.length > 0) {
                  setStockViewProduct(filteredProducts[0]);
                } else if (products.length > 0) {
                  setStockViewProduct(products[0]);
                }
              }}
              className="px-3.5 py-3 bg-emerald-50 dark:bg-emerald-950 border border-emerald-200 dark:border-emerald-700 hover:bg-emerald-100 dark:hover:bg-emerald-900 text-emerald-900 dark:text-emerald-200 rounded-2xl text-xs font-extrabold flex items-center gap-1.5 transition-all"
              title="Quick View Stock Information"
            >
              <Boxes className="w-4 h-4 text-emerald-600 dark:text-amber-400" />
              <span className="hidden sm:inline">Stock View</span>
            </button>
            <button
              onClick={() => setIsRefreshing(true)}
              className="px-3.5 py-3 bg-emerald-50 dark:bg-emerald-950 border border-emerald-200 dark:border-emerald-700 hover:bg-emerald-100 dark:hover:bg-emerald-900 text-emerald-900 dark:text-emerald-200 rounded-2xl text-xs font-extrabold flex items-center gap-1.5 transition-all"
              title="Refresh POS Products & Inventory"
            >
              <RefreshCw className={`w-4 h-4 text-emerald-600 dark:text-amber-400 ${isRefreshing ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">Refresh</span>
            </button>
          </div>

          {/* Category Filter Pills (Priority: 1. All -> 2. Special Offers -> 3. Festival Offers -> 4. Active Categories) */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs sm:text-sm scrollbar-none">
            {/* 1. All Categories */}
            <button
              onClick={() => setSelectedCategory('ALL')}
              className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-black transition whitespace-nowrap shadow-xs cursor-pointer ${
                selectedCategory === 'ALL'
                  ? 'bg-emerald-800 text-white shadow-md ring-2 ring-emerald-600'
                  : 'bg-emerald-50 dark:bg-emerald-950 text-gray-700 dark:text-emerald-300 hover:bg-emerald-100 dark:hover:bg-emerald-900 border border-emerald-200 dark:border-emerald-800'
              }`}
            >
              All Categories ({products.length})
            </button>

            {/* 2. Special Offers - Only displayed if active offers exist */}
            {(offerProductsCount > 0 || selectedCategory === 'OFFERS') && (
              <button
                onClick={() => setSelectedCategory('OFFERS')}
                className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-black transition whitespace-nowrap flex items-center gap-1.5 border shadow-xs cursor-pointer ${
                  selectedCategory === 'OFFERS'
                    ? 'bg-rose-600 text-white border-rose-600 shadow-md ring-2 ring-rose-400'
                    : 'bg-rose-50 dark:bg-rose-950/70 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800 hover:bg-rose-100'
                }`}
              >
                <span>🔥 Special Offers</span>
                <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-black ml-0.5 ${
                  selectedCategory === 'OFFERS' ? 'bg-rose-950 text-rose-200' : 'bg-rose-200 dark:bg-rose-900 text-rose-900 dark:text-rose-100'
                }`}>
                  {offerProductsCount}
                </span>
              </button>
            )}

            {/* 3. Festival Offers - ONLY DISPLAYED IF FESTIVAL DEALS EXIST (> 0) */}
            {festivalProductsCount > 0 && (
              <button
                onClick={() => setSelectedCategory('FESTIVAL')}
                className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-black transition whitespace-nowrap flex items-center gap-1.5 border shadow-xs cursor-pointer ${
                  selectedCategory === 'FESTIVAL'
                    ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white border-amber-500 shadow-md ring-2 ring-amber-300'
                    : 'bg-amber-50 dark:bg-amber-950/70 text-amber-800 dark:text-amber-300 border-amber-200 dark:border-amber-800 hover:bg-amber-100'
                }`}
              >
                <span>🪔 Festival Deals</span>
                <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-black ml-0.5 ${
                  selectedCategory === 'FESTIVAL' ? 'bg-amber-950 text-amber-200' : 'bg-amber-200 dark:bg-amber-900 text-amber-900 dark:text-amber-100'
                }`}>
                  {festivalProductsCount}
                </span>
              </button>
            )}

            {/* 4. Other Active Categories */}
            {activeCategories.map((cat: Category) => {
              const count = products.filter(p => p.category_id === cat.id).length;
              return (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategory(cat.id)}
                  className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-black transition whitespace-nowrap flex items-center gap-1.5 border shadow-xs cursor-pointer ${
                    selectedCategory === cat.id
                      ? 'bg-emerald-800 text-white border-emerald-800 shadow-md ring-2 ring-emerald-600'
                      : 'bg-emerald-50 dark:bg-emerald-950 text-gray-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800 hover:bg-emerald-100 dark:hover:bg-emerald-900'
                  }`}
                >
                  <span className="text-sm">{cat.icon || '🌾'}</span>
                  <span>{cat.name}</span>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ml-0.5 ${
                    selectedCategory === cat.id ? 'bg-emerald-950 text-amber-300' : 'bg-emerald-200/80 dark:bg-emerald-800 text-emerald-950 dark:text-emerald-100'
                  }`}>
                    {count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Product Catalog Grid */}
        <div className="flex-1 overflow-y-auto grid grid-cols-2 sm:grid-cols-3 gap-3 pr-1">
          {filteredProducts.map((p) => {
            const hasOffer = Boolean(p.offer_price && p.offer_price > 0 && p.offer_price < p.selling_price);
            const basePrice = p.offer_price || p.selling_price;
            const hasMrpDiscount = Boolean(p.mrp && p.mrp > basePrice);
            const discountPct = hasMrpDiscount && p.mrp
              ? Math.round(((p.mrp - basePrice) / p.mrp) * 100)
              : hasOffer
              ? Math.round(((p.selling_price - p.offer_price!) / p.selling_price) * 100)
              : 0;

            const isOutOfStock = p.current_stock <= 0;
            const isLowStock = p.current_stock > 0 && p.current_stock <= (p.reorder_level || 10);
            const cat = activeCategories.find(c => c.id === p.category_id) || categories.find(c => c.id === p.category_id);

            return (
              <div
                key={p.id}
                onClick={() => addToCart(p)}
                className="bg-emerald-50/50 dark:bg-emerald-950/60 p-3 rounded-2xl border border-emerald-100 dark:border-emerald-800 hover:border-emerald-500 dark:hover:border-amber-400 cursor-pointer transition-all hover:shadow-md flex flex-col justify-between relative group"
              >
                {p.festival_offer && (
                  <span className="absolute top-2 left-2 z-10 bg-gradient-to-r from-amber-500 via-orange-500 to-rose-500 text-white font-black text-[9px] px-2.5 py-0.5 rounded-full shadow-md flex items-center gap-1 border border-amber-200/50">
                    <span>🪔</span>
                    <span className="truncate max-w-[85px]">{p.festival_offer}</span>
                  </span>
                )}

                {discountPct > 0 && (
                  <span className="absolute top-2 right-2 bg-rose-600 text-white font-black text-[9px] px-2 py-0.5 rounded-full shadow z-10 border border-rose-400/40">
                    {discountPct}% OFF
                  </span>
                )}

                <div>
                  <div className="relative">
                    <img
                      src={p.image_url}
                      alt={p.name}
                      className="w-full h-24 object-cover rounded-xl border border-emerald-100 dark:border-emerald-800 mb-2"
                    />

                    {/* Stock Quick View Action Button */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setStockViewProduct(p);
                      }}
                      className="absolute bottom-3 right-1.5 bg-white/95 dark:bg-emerald-900/95 text-emerald-950 dark:text-emerald-100 text-[10px] font-extrabold px-2 py-1 rounded-lg shadow-md border border-emerald-200 dark:border-emerald-700 hover:scale-105 transition-all flex items-center gap-1 hover:bg-amber-300 dark:hover:bg-amber-500 hover:text-black cursor-pointer"
                      title="Quick View Stock Information"
                    >
                      <Boxes className="w-3 h-3 text-emerald-600 dark:text-amber-400" />
                      <span>Stock Info</span>
                    </button>
                  </div>

                  {/* Category Tag & SKU */}
                  <div className="flex items-center justify-between gap-1 mb-1 text-[10px]">
                    <span className="bg-emerald-100/90 dark:bg-emerald-900/90 text-emerald-950 dark:text-emerald-100 font-extrabold px-1.5 py-0.5 rounded flex items-center gap-1 truncate max-w-[125px] border border-emerald-200/80 dark:border-emerald-800 shadow-2xs">
                      <span>{cat?.icon || '🌾'}</span>
                      <span className="truncate">{cat?.name || 'Produce'}</span>
                    </span>
                    <span className="font-mono text-gray-400 dark:text-emerald-300/70 text-[9px] font-bold">
                      #{p.sku}
                    </span>
                  </div>

                  <div className="font-bold text-xs text-gray-900 dark:text-emerald-100 line-clamp-1">{p.name}</div>
                  {p.tamil_name && <div className="text-[10px] text-emerald-700 dark:text-emerald-400 line-clamp-1">{p.tamil_name}</div>}

                  <div className="mt-1 flex items-center justify-between text-[10px]">
                    <span className="font-bold text-emerald-900 dark:text-emerald-200 bg-white dark:bg-emerald-950 px-1.5 py-0.5 rounded border border-emerald-200 dark:border-emerald-800 font-mono">
                      Pack: {p.pack_size || `1 ${p.unit}`}
                    </span>
                    {p.festival_offer && (
                      <span className="text-[9px] font-black text-amber-800 dark:text-amber-300 flex items-center gap-0.5 bg-amber-100 dark:bg-amber-950/80 px-1.5 py-0.5 rounded border border-amber-300 dark:border-amber-700 truncate max-w-[85px]">
                        🪔 {p.festival_offer}
                      </span>
                    )}
                  </div>
                </div>

                {/* High-Contrast Clear Pricing & Stock Block */}
                <div className="mt-2.5 pt-2 border-t border-emerald-200/80 dark:border-emerald-800/80 space-y-1.5 bg-emerald-100/40 dark:bg-emerald-900/40 -mx-3 -mb-3 p-2.5 rounded-b-2xl">
                  {/* Row 1: MRP with strikethrough & Discount Tag */}
                  <div className="flex items-center justify-between text-[11px]">
                    {p.mrp && p.mrp > basePrice ? (
                      <div className="flex items-center gap-1 font-mono">
                        <span className="text-gray-500 dark:text-gray-400 font-bold">MRP:</span>
                        <span className="text-rose-600 dark:text-rose-400 line-through font-bold">₹{p.mrp}</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1 font-mono text-gray-500 dark:text-gray-400">
                        <span>MRP:</span>
                        <span className="font-semibold">₹{p.mrp || p.selling_price}</span>
                      </div>
                    )}

                    {discountPct > 0 ? (
                      <span className="px-1.5 py-0.2 rounded font-black text-[9px] bg-rose-600 text-white shadow-xs">
                        SAVE {discountPct}%
                      </span>
                    ) : (
                      <span className="text-[10px] text-emerald-800 dark:text-emerald-300 font-bold font-mono">
                        Pack: {p.pack_size || `1 ${p.unit}`}
                      </span>
                    )}
                  </div>

                  {/* Row 2: Prominent Selling / Offer Price */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-baseline gap-1">
                      <span className="text-[10px] font-black uppercase tracking-wider text-gray-600 dark:text-emerald-300">
                        {hasOffer ? '🔥 Offer:' : '💰 Store:'}
                      </span>
                      <span className={`text-base font-black ${
                        hasOffer ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-950 dark:text-amber-300'
                      }`}>
                        {formatPrice(basePrice)}
                      </span>
                      {hasOffer && (
                        <span className="text-[10px] text-gray-400 line-through font-mono">
                          (₹{p.selling_price})
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Row 3: Current Stock Indicator */}
                  <div className="flex items-center justify-between pt-1 border-t border-emerald-200/50 dark:border-emerald-800/50">
                    <span className={`text-[10px] font-black px-2 py-0.5 rounded-full flex items-center gap-1 ${
                      isOutOfStock
                        ? 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300 border border-rose-300'
                        : isLowStock
                        ? 'bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-300 border border-amber-300 animate-pulse'
                        : 'bg-emerald-200 dark:bg-emerald-800 text-emerald-950 dark:text-emerald-100 border border-emerald-300'
                    }`}>
                      <Package className="w-3 h-3" />
                      <span>{isOutOfStock ? '0 (Out of Stock)' : `${p.current_stock} in stock`}</span>
                    </span>

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setStockViewProduct(p);
                      }}
                      className="text-[10px] text-emerald-800 dark:text-amber-300 font-extrabold hover:underline flex items-center gap-0.5 bg-white dark:bg-emerald-900 px-2 py-0.5 rounded border border-emerald-200 dark:border-emerald-700 shadow-xs"
                    >
                      <Boxes className="w-3 h-3 text-emerald-600 dark:text-amber-400" />
                      <span>Quick View</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Recent POS Sales History (Click to re-open bill or print receipt) */}
        {recentPOSOrders.length > 0 && (
          <div className="pt-2 border-t border-emerald-100 dark:border-emerald-800">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-extrabold uppercase tracking-wider text-emerald-900 dark:text-emerald-300 flex items-center gap-1">
                <FileText className="w-3.5 h-3.5 text-amber-400" /> Recent POS Orders ({recentPOSOrders.length})
              </span>
              <button
                type="button"
                onClick={() => setShowAllOrdersModal(true)}
                className="text-[11px] text-emerald-700 dark:text-amber-300 font-extrabold hover:underline flex items-center gap-1 bg-emerald-50 dark:bg-emerald-950 px-2 py-0.5 rounded-md border border-emerald-200 dark:border-emerald-700"
              >
                <span>View All Orders &rarr;</span>
              </button>
            </div>
            <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs">
              {recentPOSOrders.slice(0, 10).map((ord: Order) => (
                <button
                  key={ord.id}
                  onClick={() => {
                    const orderData = {
                      orderNumber: ord.order_number,
                      date: new Date(ord.created_at).toLocaleString(),
                      customerName: ord.customer_name_snapshot || 'Walk-in Customer',
                      customerPhone: ord.customer_phone_snapshot || '9876543210',
                      customerEmail: '',
                      paymentMethod: ord.payment_method,
                      items: (ord.items || []).map(i => ({
                        product: {
                          id: i.product_id || `p-${Math.random()}`,
                          name: i.product_name_snapshot,
                          pack_size: i.pack_size_snapshot,
                          selling_price: i.unit_price_snapshot,
                          mrp: i.unit_price_snapshot
                        },
                        quantity: i.quantity,
                        itemDiscountPercent: i.discount || 0
                      })),
                      totalMRP: ord.subtotal || ord.total,
                      subtotal: ord.subtotal || ord.total,
                      mrpSavings: ord.discount || 0,
                      mrpSavingsPercent: 0,
                      extraDiscountAmount: 0,
                      extraDiscountPercent: 0,
                      gstPercent: 5,
                      taxAmount: ord.tax_amount || 0,
                      grandTotal: ord.total
                    };
                    setLastCompletedOrder(orderData);
                    setShowReceipt(true);
                  }}
                  className="px-3 py-2 bg-emerald-50 dark:bg-emerald-950 border border-emerald-200 dark:border-emerald-700 hover:border-emerald-500 rounded-xl text-left flex-shrink-0 transition-all hover:shadow-xs group"
                >
                  <div className="flex items-center justify-between gap-2 font-mono font-bold text-gray-900 dark:text-emerald-100 text-[11px]">
                    <span>{ord.order_number}</span>
                    <span className="text-emerald-800 dark:text-amber-400">₹{ord.total}</span>
                  </div>
                  <div className="text-[10px] text-gray-500 dark:text-emerald-300 font-sans flex items-center justify-between gap-1 mt-0.5">
                    <span className="truncate max-w-[90px]">{ord.customer_name_snapshot || 'Walk-in'}</span>
                    <span className="text-emerald-700 dark:text-emerald-400 font-bold group-hover:underline">Re-open Bill &rarr;</span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

      </div>

      {/* Right 5 Columns: Active POS Cart & Billing Panel */}
      <div className="lg:col-span-5 flex flex-col bg-white dark:bg-emerald-900/40 p-5 rounded-3xl border border-emerald-100 dark:border-emerald-800 shadow-sm overflow-hidden space-y-4">
        
        {/* Customer Details Form (Walk-in Customer toggle, Name compulsory, Phone required for registered, Email optional) */}
        <div className="space-y-2 text-xs">
          {/* Customer Type Selector Segmented Tabs */}
          <div className="flex bg-emerald-50 dark:bg-emerald-950 p-1 rounded-xl border border-emerald-200 dark:border-emerald-800 text-[11px] font-bold">
            <button
              type="button"
              onClick={() => {
                setIsWalkinCustomer(true);
                setCustomerName('Walk-in Customer');
                setCustomerPhone('9876543210');
              }}
              className={`flex-1 py-1 rounded-lg transition-all ${
                isWalkinCustomer
                  ? 'bg-emerald-700 text-white shadow-xs font-black'
                  : 'text-emerald-900 dark:text-emerald-300 hover:bg-emerald-100 dark:hover:bg-emerald-900'
              }`}
            >
              🚶 Walk-in Customer (No Phone Required)
            </button>
            <button
              type="button"
              onClick={() => {
                setIsWalkinCustomer(false);
                if (customerName === 'Walk-in Customer') setCustomerName('');
                if (customerPhone === '9876543210') setCustomerPhone('');
              }}
              className={`flex-1 py-1 rounded-lg transition-all ${
                !isWalkinCustomer
                  ? 'bg-emerald-700 text-white shadow-xs font-black'
                  : 'text-emerald-900 dark:text-emerald-300 hover:bg-emerald-100 dark:hover:bg-emerald-900'
              }`}
            >
              👤 Registered Customer (Phone Required)
            </button>
          </div>

          {/* Customer Input Fields based on Walk-in vs Registered mode */}
          {isWalkinCustomer ? (
            /* Walk-in Customer Mode */
            <div className="space-y-2">
              <div className="relative">
                <User className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-gray-400" />
                <input
                  type="text"
                  required
                  placeholder="Customer Name * (Default: Walk-in Customer)"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  className="w-full pl-8 pr-2 py-2 bg-emerald-50/50 dark:bg-emerald-950 border border-emerald-200 dark:border-emerald-700 rounded-xl focus:outline-none font-bold dark:text-emerald-100 text-xs"
                />
              </div>
              <div className="flex gap-2">
                <CountrySelector
                  value={countryCode}
                  onChange={(country) => {
                    setCountryCode(country.code);
                    setCallingCode(country.callingCode);
                  }}
                  className="w-28 shrink-0 text-xs"
                />
                <div className="relative flex-1">
                  <Phone className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-gray-400" />
                  <input
                    type="tel"
                    placeholder="Phone (Optional for Walk-in)"
                    value={customerPhone === '9876543210' ? '' : customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                    className="w-full pl-8 pr-2 py-2 bg-emerald-50/50 dark:bg-emerald-950 border border-emerald-200 dark:border-emerald-700 rounded-xl focus:outline-none font-bold dark:text-emerald-100 text-xs font-mono"
                  />
                </div>
              </div>
            </div>
          ) : (
            /* Registered Customer Mode (Phone Lookup + Auto-register) */
            <div className="space-y-2 bg-emerald-50/60 dark:bg-emerald-950/70 p-2.5 rounded-2xl border border-emerald-200 dark:border-emerald-800">
              {/* Row 1: Phone Input + Country + Fetch Name Button */}
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase tracking-wider text-emerald-800 dark:text-emerald-300 flex items-center justify-between">
                  <span>Customer Phone Number *</span>
                  <span className="text-gray-400 font-normal">Auto-fetches on 10 digits</span>
                </label>
                <div className="flex gap-1.5 items-stretch">
                  <CountrySelector
                    value={countryCode}
                    onChange={(country) => {
                      setCountryCode(country.code);
                      setCallingCode(country.callingCode);
                    }}
                    className="w-24 shrink-0 text-xs"
                  />
                  <div className="relative flex-1">
                    <Phone className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-gray-400" />
                    <input
                      type="tel"
                      required
                      placeholder="10-digit mobile number *"
                      value={customerPhone === '9876543210' ? '' : customerPhone}
                      onChange={(e) => {
                        const val = e.target.value;
                        setCustomerPhone(val);
                        const clean = val.replace(/\D/g, '');
                        if (clean.length === 10) {
                          handleLookupCustomerByPhone(clean);
                        } else if (clean.length < 10 && customerLookupStatus) {
                          setCustomerLookupStatus(null);
                        }
                      }}
                      className="w-full pl-8 pr-2 py-2 bg-white dark:bg-emerald-950 border border-emerald-300 dark:border-emerald-700 rounded-xl focus:outline-none font-bold dark:text-emerald-100 text-xs font-mono"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => handleLookupCustomerByPhone(customerPhone)}
                    className="px-3 py-2 bg-emerald-700 hover:bg-emerald-800 text-white font-extrabold text-xs rounded-xl flex items-center gap-1 shadow-xs transition-colors shrink-0 active:scale-95"
                    title="Lookup existing customer in CRM"
                  >
                    <Search className="w-3.5 h-3.5" />
                    <span>Fetch</span>
                  </button>
                </div>
              </div>

              {/* Status Indicator Banners: Found vs Not Found */}
              {customerLookupStatus?.found && (
                <div className="p-2 rounded-xl bg-emerald-100 dark:bg-emerald-900/80 border border-emerald-300 dark:border-emerald-700 text-emerald-950 dark:text-emerald-200 text-xs flex items-center justify-between animate-fadeIn">
                  <div className="flex items-center gap-1.5 font-bold">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                    <span>✓ Existing Customer: <strong className="underline">{customerLookupStatus.customer?.name}</strong></span>
                  </div>
                  <span className="text-[10px] font-mono bg-emerald-200 dark:bg-emerald-800 text-emerald-950 dark:text-emerald-100 px-1.5 py-0.5 rounded font-black">
                    ID: {customerLookupStatus.customer?.customer_id || 'CRM'}
                  </span>
                </div>
              )}

              {customerLookupStatus && !customerLookupStatus.found && (
                <div className="p-2 rounded-xl bg-amber-50 dark:bg-amber-950/80 border border-amber-300 dark:border-amber-700 text-amber-950 dark:text-amber-200 text-xs flex items-start gap-1.5 animate-fadeIn">
                  <Info className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold">No existing customer found with this phone.</span>
                    <p className="text-[11px] text-amber-800 dark:text-amber-300 mt-0.5">
                      Enter the customer's name below — they will be auto-registered and saved into CRM with this bill!
                    </p>
                  </div>
                </div>
              )}

              {/* Row 2: Customer Name (Auto-filled if found, or enter new name) */}
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase tracking-wider text-emerald-800 dark:text-emerald-300 flex items-center justify-between">
                  <span>Customer Name * {customerLookupStatus?.found ? '(Auto-Filled)' : '(Enter New Name)'}</span>
                  {customerLookupStatus?.found && <span className="text-emerald-600 font-bold">Editable</span>}
                </label>
                <div className="relative">
                  <User className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-gray-400" />
                  <input
                    type="text"
                    required
                    placeholder={customerLookupStatus?.found ? "Customer Name (Auto-fetched)" : "Enter customer name *"}
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    className="w-full pl-8 pr-2 py-2 bg-white dark:bg-emerald-950 border border-emerald-300 dark:border-emerald-700 rounded-xl focus:outline-none font-bold dark:text-emerald-100 text-xs"
                  />
                </div>
              </div>
            </div>
          )}

          <div className="flex gap-2 items-center">
            <div className="relative flex-1">
              <Mail className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-gray-400" />
              <input
                type="email"
                placeholder="Email Address (Optional)"
                value={customerEmail}
                onChange={(e) => setCustomerEmail(e.target.value)}
                className="w-full pl-8 pr-2 py-2 bg-emerald-50/30 dark:bg-emerald-950 border border-emerald-200 dark:border-emerald-700 rounded-xl focus:outline-none dark:text-emerald-100 text-[11px]"
              />
            </div>

            {/* <label className="flex items-center gap-1.5 text-[10px] font-bold text-emerald-950 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950 px-2.5 py-2 rounded-xl border border-emerald-200 dark:border-emerald-800 cursor-pointer whitespace-nowrap">
              <input
                type="checkbox"
                checked={true}
                readOnly
                className="rounded border-gray-300 text-emerald-700 focus:ring-emerald-500"
              />
              <Save className="w-3 h-3 text-emerald-600" />
              <span>Auto-Save to CRM</span>
            </label> */}
            
            <label className="flex items-center gap-1.5 text-[10px] font-bold text-emerald-950 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950 px-2.5 py-2 rounded-xl border border-emerald-200 dark:border-emerald-800 cursor-pointer whitespace-nowrap">
              <input
                type="checkbox"
                checked={saveCustomerToCRM}
                onChange={(e) => setSaveCustomerToCRM(e.target.checked)}
                className="rounded border-gray-300 text-emerald-700 focus:ring-emerald-500"
              />
              <Save className="w-3 h-3 text-emerald-600" />
              <span>Auto-Save to CRM</span>
            </label>
          </div>
        </div>

        {/* Active Cart Items Header */}
        <div className="flex items-center justify-between pt-1">
          <span className="text-[11px] font-extrabold uppercase tracking-wider text-emerald-900 dark:text-emerald-300 flex items-center gap-1.5">
            <ShoppingCart className="w-3.5 h-3.5 text-emerald-600 dark:text-amber-400" />
            <span>Active Bill Items ({cart.length})</span>
          </span>
          {cart.length > 0 && (
            <button
              type="button"
              onClick={handleClearCart}
              className="text-[10px] font-bold text-rose-600 dark:text-rose-400 hover:text-rose-700 bg-rose-50 dark:bg-rose-950/60 px-2.5 py-1 rounded-lg border border-rose-200 dark:border-rose-900 flex items-center gap-1 transition shadow-xs cursor-pointer"
            >
              <Trash2 className="w-3 h-3" />
              <span>Clear Bill</span>
            </button>
          )}
        </div>

        {/* Active Cart Items */}
        <div className="flex-1 overflow-y-auto space-y-2 border-y border-emerald-100 dark:border-emerald-800 py-3 pr-1">
          {cart.length === 0 ? (
            <div className="text-center py-10 text-xs text-gray-400 dark:text-emerald-300">
              <ShoppingCart className="w-8 h-8 text-emerald-400 mx-auto mb-2 opacity-50" />
              Scan item or click product grid on the left to add items to bill.
            </div>
          ) : (
            cart.map((item) => {
              const basePrice = item.product.offer_price || item.product.selling_price;
              const itemTotal = basePrice * (1 - (item.itemDiscountPercent || 0) / 100) * item.quantity;
              
              return (
                <div key={item.product.id} className="p-2.5 bg-emerald-50/40 dark:bg-emerald-950/40 rounded-xl border border-emerald-100 dark:border-emerald-800 text-xs space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex-1 min-w-0 pr-2">
                      <div className="font-bold text-gray-900 dark:text-emerald-100 truncate">{item.product.name}</div>
                      <div className="text-[10px] text-emerald-700 dark:text-amber-400 font-bold flex items-center gap-1.5">
                        {item.product.mrp && item.product.mrp > basePrice && (
                          <span className="line-through text-gray-400">MRP ₹{item.product.mrp}</span>
                        )}
                        <span>Our Price: {formatPrice(basePrice)}</span>
                      </div>
                    </div>

                    <div className="flex items-center space-x-2">
                      <div className="flex items-center border border-emerald-300 dark:border-emerald-700 rounded-lg bg-white dark:bg-emerald-900">
                        <button onClick={() => updateQuantity(item.product.id, item.quantity - 1)} className="px-2 py-0.5 hover:bg-emerald-100 dark:hover:bg-emerald-800 text-gray-700 dark:text-emerald-100">-</button>
                        <span className="px-2 font-bold text-gray-800 dark:text-emerald-100">{item.quantity}</span>
                        <button onClick={() => updateQuantity(item.product.id, item.quantity + 1)} className="px-2 py-0.5 hover:bg-emerald-100 dark:hover:bg-emerald-800 text-gray-700 dark:text-emerald-100">+</button>
                      </div>
                      <button 
                        type="button"
                        onClick={() => handleRemoveCartItem(item.product.id, item.product.name)} 
                        className="text-rose-500 hover:text-rose-700 p-1.5 rounded hover:bg-rose-50 dark:hover:bg-rose-950/50 transition cursor-pointer"
                        title="Remove item"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Extra Item Discount Input */}
                  <div className="flex items-center justify-between pt-1 border-t border-emerald-100/60 dark:border-emerald-800/60 text-[11px]">
                    <span className="text-gray-500 font-medium flex items-center gap-1">
                      <Percent className="w-3 h-3 text-emerald-600" /> Extra Item Disc (%):
                    </span>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        min="0"
                        max="100"
                        value={item.itemDiscountPercent || 0}
                        onChange={(e) => updateItemDiscount(item.product.id, parseFloat(e.target.value) || 0)}
                        className="w-12 px-1.5 py-0.5 text-right bg-white dark:bg-emerald-900 border border-emerald-200 dark:border-emerald-700 rounded font-bold text-emerald-900 dark:text-amber-400"
                      />
                      <span className="font-extrabold text-gray-900 dark:text-emerald-100">
                        = {formatPrice(itemTotal)}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Calculation Summary with Editable Default GST */}
        <div className="space-y-1.5 text-xs">
          <div className="flex justify-between text-gray-500 dark:text-emerald-400">
            <span>Total MRP Price</span>
            <span className="line-through font-mono">{formatPrice(totalMRP)}</span>
          </div>

          <div className="flex justify-between text-emerald-700 dark:text-emerald-300 font-bold bg-emerald-50 dark:bg-emerald-950 p-2 rounded-xl border border-emerald-100 dark:border-emerald-800">
            <span className="flex items-center gap-1">
              <Tag className="w-3.5 h-3.5 text-emerald-600" /> MRP Discount Savings ({mrpSavingsPercent}%)
            </span>
            <span>- {formatPrice(mrpSavings)}</span>
          </div>

          {/* Dual Discount Mode: Percentage (%) or Flat Amount (₹) with real-time conversion display */}
          <div className="bg-amber-50/60 dark:bg-amber-950/40 p-2 rounded-xl border border-amber-200 dark:border-amber-800/80 space-y-1.5">
            <div className="flex justify-between items-center text-gray-800 dark:text-emerald-100">
              <span className="font-bold text-xs flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-500 fill-amber-400" /> Extra Bill Discount:
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
                    className="w-20 pl-5 pr-2 py-1 bg-white dark:bg-emerald-950 border border-amber-300 dark:border-amber-700 rounded-lg text-right font-black text-amber-900 dark:text-amber-300 text-xs focus:ring-2 focus:ring-amber-500 focus:outline-none"
                  />
                </div>
              </div>
            </div>

            {/* Live Dual Equivalent Breakdown Bar */}
            <div className="flex justify-between items-center text-[11px] font-bold border-t border-amber-200/60 dark:border-amber-800/60 pt-1 text-amber-900 dark:text-amber-300">
              <span className="text-[10px] text-gray-500 dark:text-amber-400/80">
                Discount Equivalent:
              </span>
              <div className="flex items-center gap-2">
                <span className="px-1.5 py-0.5 bg-amber-100 dark:bg-amber-900/80 rounded text-amber-800 dark:text-amber-200">
                  {calculatedDiscountPercent}% OFF
                </span>
                <span className="font-extrabold text-amber-700 dark:text-amber-400">
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
                className="w-14 px-1.5 py-0.5 bg-white dark:bg-emerald-950 border border-emerald-300 rounded text-right font-bold text-gray-900 dark:text-emerald-100"
              />
              <span className="font-bold text-gray-700 dark:text-emerald-200">% = {formatPrice(taxAmount)}</span>
            </div>
          </div>

          <div className="flex justify-between text-base font-black text-gray-900 dark:text-amber-400 pt-2 border-t border-emerald-100 dark:border-emerald-800">
            <span>Grand Total</span>
            <span>{formatPrice(grandTotal)}</span>
          </div>
        </div>

        {/* Payment Method Selector */}
        <div className="grid grid-cols-3 gap-2 text-xs font-bold">
          <button
            onClick={() => setPaymentMethod('CASH')}
            className={`py-2 rounded-xl border flex items-center justify-center gap-1 ${
              paymentMethod === 'CASH'
                ? 'bg-emerald-700 text-white border-emerald-700 shadow'
                : 'bg-emerald-50 dark:bg-emerald-950 text-gray-700 dark:text-emerald-200 border-emerald-200'
            }`}
          >
            <DollarSign className="w-3.5 h-3.5" /> Cash
          </button>
          <button
            onClick={() => setPaymentMethod('UPI')}
            className={`py-2 rounded-xl border flex items-center justify-center gap-1 ${
              paymentMethod === 'UPI'
                ? 'bg-emerald-700 text-white border-emerald-700 shadow'
                : 'bg-emerald-50 dark:bg-emerald-950 text-gray-700 dark:text-emerald-200 border-emerald-200'
            }`}
          >
            <QrCode className="w-3.5 h-3.5" /> UPI QR
          </button>
          <button
            onClick={() => setPaymentMethod('CARD')}
            className={`py-2 rounded-xl border flex items-center justify-center gap-1 ${
              paymentMethod === 'CARD'
                ? 'bg-emerald-700 text-white border-emerald-700 shadow'
                : 'bg-emerald-50 dark:bg-emerald-950 text-gray-700 dark:text-emerald-200 border-emerald-200'
            }`}
          >
            <CreditCard className="w-3.5 h-3.5" /> Card
          </button>
        </div>

        {/* Checkout Button */}
        <button
          disabled={cart.length === 0}
          onClick={handleCheckout}
          className="w-full py-3.5 bg-amber-400 hover:bg-amber-300 disabled:opacity-50 text-emerald-950 font-black text-sm rounded-2xl shadow-lg transition-all flex items-center justify-center gap-2"
        >
          <Printer className="w-4 h-4" />
          Complete Sale & Print Receipt ({formatPrice(grandTotal)})
        </button>

      </div>

      {/* Order Processing Spinner Pop Modal */}
      {isOrderProcessing && (
        <div className="fixed inset-0 z-[75] flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-fadeIn">
          <div className="bg-white dark:bg-emerald-950 p-6 sm:p-8 rounded-3xl shadow-2xl text-center space-y-4 max-w-sm w-full border border-emerald-200 dark:border-emerald-700 animate-scaleUp">
            {/* Animated Loading Spinner */}
            <div className="relative w-20 h-20 mx-auto">
              <div className="absolute inset-0 rounded-full border-4 border-emerald-200 dark:border-emerald-800 animate-pulse" />
              <div className="w-20 h-20 border-4 border-emerald-600 border-t-amber-400 rounded-full animate-spin" />
              <div className="absolute inset-0 flex items-center justify-center text-2xl">
                🧾
              </div>
            </div>

            <div className="space-y-1.5">
              <h3 className="font-serif font-black text-lg text-gray-900 dark:text-emerald-50">
                Please wait, your order is processing...
              </h3>
              <p className="text-xs text-emerald-700 dark:text-amber-300 font-bold">
                {processingStep}
              </p>
            </div>

            <div className="p-3.5 bg-emerald-50/70 dark:bg-emerald-900/40 rounded-2xl border border-emerald-100 dark:border-emerald-800 text-xs text-left space-y-1.5 font-medium">
              <div className="flex items-center justify-between text-gray-700 dark:text-emerald-200">
                <span className="text-gray-500">Customer:</span>
                <span className="font-bold text-gray-900 dark:text-emerald-100 truncate max-w-[150px]">
                  {customerName || 'Walk-in Customer'}
                </span>
              </div>
              <div className="flex items-center justify-between text-gray-700 dark:text-emerald-200">
                <span className="text-gray-500">Bill Amount:</span>
                <span className="font-black text-emerald-800 dark:text-amber-300 font-mono">
                  {formatPrice(grandTotal)}
                </span>
              </div>
              <div className="flex items-center justify-between text-gray-700 dark:text-emerald-200">
                <span className="text-gray-500">Payment:</span>
                <span className="font-bold text-gray-900 dark:text-emerald-100 uppercase">
                  {paymentMethod}
                </span>
              </div>
            </div>

            <div className="flex items-center justify-center gap-2 text-[11px] text-gray-500 dark:text-emerald-300">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
              <span>Updating live inventory & printing receipt...</span>
            </div>
          </div>
        </div>
      )}

      {/* Stock Quick View Modal */}
      {stockViewProduct && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white dark:bg-emerald-950 rounded-3xl max-w-lg w-full border border-emerald-200 dark:border-emerald-800 shadow-2xl overflow-hidden animate-scaleUp">
            
            {/* Modal Header */}
            <div className="p-5 bg-gradient-to-r from-emerald-800 to-emerald-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-white/10 flex items-center justify-center text-amber-300">
                  <Boxes className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-bold text-base">{stockViewProduct.name}</h3>
                  <div className="flex items-center gap-2 text-xs text-emerald-200">
                    {stockViewProduct.tamil_name && <span>{stockViewProduct.tamil_name} •</span>}
                    <span className="font-mono">SKU: {stockViewProduct.sku}</span>
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setStockViewProduct(null)}
                className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-5 text-xs sm:text-sm max-h-[80vh] overflow-y-auto">
              
              {/* Primary Stock Metric Highlight */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <div className="p-3.5 bg-emerald-50 dark:bg-emerald-900/40 rounded-2xl border border-emerald-200 dark:border-emerald-800 text-center">
                  <span className="text-[11px] font-bold text-gray-500 dark:text-emerald-300">CURRENT AVAILABLE STOCK</span>
                  <div className="text-2xl font-black text-emerald-800 dark:text-amber-300 mt-1">
                    {stockViewProduct.current_stock} <span className="text-xs font-normal text-gray-500">{stockViewProduct.unit}</span>
                  </div>
                  <span className={`inline-block mt-1 text-[10px] font-extrabold px-2 py-0.5 rounded-full ${
                    stockViewProduct.current_stock <= 0
                      ? 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                      : stockViewProduct.current_stock <= (stockViewProduct.reorder_level || 10)
                      ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                      : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200'
                  }`}>
                    {stockViewProduct.current_stock <= 0 ? 'OUT OF STOCK' : stockViewProduct.current_stock <= (stockViewProduct.reorder_level || 10) ? 'LOW STOCK' : 'IN STOCK'}
                  </span>
                </div>

                <div className="p-3.5 bg-emerald-50 dark:bg-emerald-900/40 rounded-2xl border border-emerald-200 dark:border-emerald-800 text-center">
                  <span className="text-[11px] font-bold text-gray-500 dark:text-emerald-300">REORDER THRESHOLD</span>
                  <div className="text-2xl font-black text-gray-800 dark:text-emerald-100 mt-1">
                    {stockViewProduct.reorder_level || 10} <span className="text-xs font-normal text-gray-500">{stockViewProduct.unit}</span>
                  </div>
                  <span className="inline-block mt-1 text-[10px] text-gray-500">
                    Min safety level
                  </span>
                </div>

                <div className="p-3.5 bg-emerald-50 dark:bg-emerald-900/40 rounded-2xl border border-emerald-200 dark:border-emerald-800 text-center col-span-2 sm:col-span-1">
                  <span className="text-[11px] font-bold text-gray-500 dark:text-emerald-300">STOCK ASSET VALUE</span>
                  <div className="text-2xl font-black text-emerald-800 dark:text-amber-400 mt-1 font-mono">
                    {formatPrice(stockViewProduct.current_stock * (stockViewProduct.offer_price || stockViewProduct.selling_price))}
                  </div>
                  <span className="inline-block mt-1 text-[10px] text-emerald-700 dark:text-emerald-400 font-bold">
                    Retail Valuation
                  </span>
                </div>
              </div>

              {/* Pricing & Cost Structure Table */}
              <div className="bg-emerald-50/50 dark:bg-emerald-950 p-4 rounded-2xl border border-emerald-100 dark:border-emerald-800 space-y-2">
                <span className="font-extrabold text-xs uppercase tracking-wider text-emerald-900 dark:text-amber-400 flex items-center gap-1.5">
                  <BarChart2 className="w-4 h-4" /> Pricing & Cost Breakdown
                </span>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 text-xs">
                  <div className="p-2 bg-white dark:bg-emerald-900/60 rounded-xl border border-emerald-100 dark:border-emerald-800">
                    <span className="text-gray-400 text-[10px]">Purchase Cost:</span>
                    <div className="font-bold text-gray-800 dark:text-emerald-100 font-mono">
                      {formatPrice(stockViewProduct.purchase_price || 0)}
                    </div>
                  </div>

                  <div className="p-2 bg-white dark:bg-emerald-900/60 rounded-xl border border-emerald-100 dark:border-emerald-800">
                    <span className="text-gray-400 text-[10px]">Landed Cost:</span>
                    <div className="font-bold text-gray-800 dark:text-emerald-100 font-mono">
                      {formatPrice(stockViewProduct.landed_cost || stockViewProduct.purchase_price || 0)}
                    </div>
                  </div>

                  <div className="p-2 bg-white dark:bg-emerald-900/60 rounded-xl border border-emerald-100 dark:border-emerald-800">
                    <span className="text-gray-400 text-[10px]">Selling Price:</span>
                    <div className="font-bold text-gray-800 dark:text-emerald-100 font-mono">
                      {formatPrice(stockViewProduct.selling_price)}
                    </div>
                  </div>

                  <div className="p-2 bg-white dark:bg-emerald-900/60 rounded-xl border border-emerald-100 dark:border-emerald-800">
                    <span className="text-gray-400 text-[10px]">MRP:</span>
                    <div className="font-bold text-rose-500 dark:text-rose-400 font-mono">
                      {formatPrice(stockViewProduct.mrp || stockViewProduct.selling_price)}
                    </div>
                  </div>
                </div>

                {stockViewProduct.offer_price && (
                  <div className="flex items-center justify-between p-2 bg-rose-50 dark:bg-rose-950/60 rounded-xl border border-rose-200 dark:border-rose-800 text-xs text-rose-800 dark:text-rose-200">
                    <span className="font-bold flex items-center gap-1">
                      <Sparkles className="w-3.5 h-3.5 text-rose-500" /> Active Special Offer Price:
                    </span>
                    <span className="font-black text-sm font-mono text-rose-700 dark:text-rose-300">
                      {formatPrice(stockViewProduct.offer_price)}
                    </span>
                  </div>
                )}
              </div>

              {/* Warehouse & Storage Details */}
              <div className="space-y-1.5 text-xs">
                <div className="flex justify-between py-1 border-b border-emerald-100 dark:border-emerald-800">
                  <span className="text-gray-500 dark:text-emerald-300">Pack Quantity & Unit:</span>
                  <span className="font-bold text-gray-900 dark:text-emerald-100">{stockViewProduct.pack_size || '1 unit'} ({stockViewProduct.unit})</span>
                </div>
                <div className="flex justify-between py-1 border-b border-emerald-100 dark:border-emerald-800">
                  <span className="text-gray-500 dark:text-emerald-300">Opening Stock at Hand:</span>
                  <span className="font-bold text-gray-900 dark:text-emerald-100">{stockViewProduct.opening_stock || 0} {stockViewProduct.unit}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-emerald-100 dark:border-emerald-800">
                  <span className="text-gray-500 dark:text-emerald-300">Storage Information:</span>
                  <span className="font-medium text-gray-800 dark:text-emerald-200">{stockViewProduct.storage_info || 'Airtight storage at store counter'}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-emerald-100 dark:border-emerald-800">
                  <span className="text-gray-500 dark:text-emerald-300">Organic Certification:</span>
                  <span className="font-bold text-emerald-700 dark:text-amber-400">{stockViewProduct.is_organic ? '100% Certified Organic' : 'Conventional Pure Natural'}</span>
                </div>
              </div>

              {/* Modal Actions */}
              <div className="pt-2 flex items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={() => setStockViewProduct(null)}
                  className="px-4 py-2.5 bg-gray-100 dark:bg-emerald-900 hover:bg-gray-200 dark:hover:bg-emerald-800 text-gray-700 dark:text-emerald-200 rounded-xl font-bold transition-all text-xs"
                >
                  Close
                </button>

                <button
                  type="button"
                  onClick={() => {
                    addToCart(stockViewProduct);
                    setStockViewProduct(null);
                    addNotification({
                      title: 'Added to POS Bill',
                      message: `Added 1x ${stockViewProduct.name} to the active bill.`,
                      type: 'success',
                      sourceModule: 'Counter POS'
                    });
                  }}
                  className="px-5 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl font-bold shadow transition-all flex items-center gap-1.5 text-xs"
                >
                  <Plus className="w-4 h-4 text-amber-300" />
                  <span>Add to Active Bill</span>
                </button>
              </div>

            </div>

          </div>
        </div>
      )}

      {/* Dispatching Loading Modal Overlay */}
      {isDispatching && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-fadeIn">
          <div className="bg-white dark:bg-emerald-900 p-6 rounded-2xl shadow-2xl text-center space-y-3 max-w-xs w-full border border-emerald-200 dark:border-emerald-700">
            <div className="w-12 h-12 border-4 border-emerald-200 border-t-emerald-700 rounded-full animate-spin mx-auto"></div>
            <p className="font-bold text-sm text-gray-900 dark:text-emerald-100">{dispatchStatus || 'Processing Order Dispatch...'}</p>
            <p className="text-xs text-gray-500 dark:text-emerald-300">Sending receipt template via WhatsApp & Email gateway...</p>
          </div>
        </div>
      )}

      {/* Printable & Dispatch Receipt Modal */}
      {showReceipt && lastCompletedOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white text-gray-900 max-w-sm w-full p-6 rounded-2xl shadow-2xl space-y-4 border border-gray-200 font-mono text-xs animate-fadeIn">
            <div className="text-center space-y-1 border-b border-dashed border-gray-300 pb-3">
              <h3 className="text-base font-extrabold tracking-wider">MR. VIVASAYI Mart</h3>
              <p className="text-[10px] text-gray-500">{getFormattedStoreAddress()} | Ph: {getFormattedStorePhone()}</p>
              <div className="text-[10px] font-bold text-emerald-800 pt-1">COUNTER SALE RECEIPT</div>
            </div>

            <div className="space-y-1 text-[11px]">
              <div><strong>Receipt #:</strong> {lastCompletedOrder.orderNumber}</div>
              <div><strong>Date:</strong> {lastCompletedOrder.date}</div>
              <div><strong>Customer:</strong> {lastCompletedOrder.customerName} ({lastCompletedOrder.customerPhone})</div>
              {lastCompletedOrder.customerEmail && (
                <div><strong>Email:</strong> {lastCompletedOrder.customerEmail}</div>
              )}
              <div><strong>Payment:</strong> {lastCompletedOrder.paymentMethod}</div>
            </div>

            <table className="w-full text-left text-[11px] border-y border-dashed border-gray-300 py-2">
              <thead>
                <tr className="border-b border-gray-200 text-[10px] uppercase font-bold text-gray-700">
                  <th className="py-1">Item (Pack Size)</th>
                  <th className="py-1 text-center">Qty</th>
                  <th className="py-1 text-center">MRP Rate</th>
                  <th className="py-1 text-center">Our Price</th>
                  <th className="py-1 text-right">Total Amt</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {lastCompletedOrder.items.map((it: any) => {
                  const mrpRate = it.product.mrp || it.product.selling_price;
                  const ourPriceRate = it.product.offer_price || it.product.selling_price;
                  const itemDisc = it.itemDiscountPercent || 0;
                  const finalUnitRate = ourPriceRate * (1 - itemDisc / 100);
                  const lineTotalMrp = mrpRate * it.quantity;
                  const lineFinalAmt = finalUnitRate * it.quantity;
                  const lineSavings = lineTotalMrp - lineFinalAmt;

                  return (
                    <tr key={it.product.id} className="py-1">
                      <td className="py-1 max-w-[130px]">
                        <div className="font-bold truncate">{it.product.name}</div>
                        <div className="text-[9px] text-gray-500 font-sans">{it.product.pack_size || it.product.unit}</div>
                      </td>
                      <td className="py-1 text-center font-bold">{it.quantity}</td>
                      <td className="py-1 text-center line-through text-gray-400">₹{mrpRate}</td>
                      <td className="py-1 text-center font-bold text-emerald-800">₹{finalUnitRate.toFixed(2)}</td>
                      <td className="py-1 text-right font-bold">
                        <div>{formatPrice(lineFinalAmt)}</div>
                        {lineSavings > 0 && (
                          <div className="text-[9px] text-emerald-600 font-medium">Save ₹{lineSavings.toFixed(0)}</div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            <div className="space-y-1 text-right text-[11px] pt-1">
              <div className="flex justify-between text-gray-600">
                <span>Total MRP Rate:</span>
                <span className="line-through">{formatPrice(lastCompletedOrder.totalMRP)}</span>
              </div>
              <div className="flex justify-between text-emerald-700 font-bold">
                <span>Our Price Subtotal:</span>
                <span>{formatPrice(lastCompletedOrder.subtotal)}</span>
              </div>
              <div className="flex justify-between text-emerald-800 font-extrabold bg-emerald-50 px-1.5 py-0.5 rounded">
                <span>Total Savings ({lastCompletedOrder.mrpSavingsPercent}%):</span>
                <span>-{formatPrice(lastCompletedOrder.mrpSavings)}</span>
              </div>
              {lastCompletedOrder.extraDiscountAmount > 0 && (
                <div className="flex justify-between text-amber-700 font-bold">
                  <span>Extra Bill Disc ({lastCompletedOrder.extraDiscountPercent}%):</span>
                  <span>-{formatPrice(lastCompletedOrder.extraDiscountAmount)}</span>
                </div>
              )}
              <div className="flex justify-between text-gray-700">
                <span>GST Tax ({lastCompletedOrder.gstPercent}%):</span>
                <span>{formatPrice(lastCompletedOrder.taxAmount)}</span>
              </div>
              <div className="flex justify-between text-sm font-black pt-1.5 border-t border-gray-400 text-gray-900">
                <span>TOTAL PAID:</span>
                <span>{formatPrice(lastCompletedOrder.grandTotal)}</span>
              </div>
            </div>

            <div className="text-center text-[10px] text-gray-500 pt-3 border-t border-dashed border-gray-300">
              Thank you for buying traditional & natural!
            </div>

            {/* Bill Dispatch Options: WhatsApp, Email, Bulk Send, Print */}
            <div className="space-y-2 pt-2 font-sans">
              {/* <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={handleSendWhatsAppBill}
                  className="py-2 px-3 bg-green-600 hover:bg-green-700 text-white font-bold rounded-xl flex items-center justify-center gap-1.5 text-xs shadow-sm"
                >
                  <MessageSquare className="w-3.5 h-3.5" /> WhatsApp Only
                </button>
                <button
                  onClick={handleSendEmailBill}
                  className="py-2 px-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl flex items-center justify-center gap-1.5 text-xs shadow-sm"
                >
                  <Mail className="w-3.5 h-3.5" /> Email Only
                </button>
              </div> */}

              {/* Bulk Dispatch (WhatsApp + Email) Button */}
              {/* <button
                onClick={handleSendBothBill}
                className="w-full py-2.5 bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-700 hover:to-teal-800 text-white font-extrabold rounded-xl flex items-center justify-center gap-2 text-xs shadow-md"
              >
                <Send className="w-4 h-4" /> Send Bulk (WhatsApp + Email)
              </button> */}

              <div className="flex gap-2 pt-1">
                <button
                  onClick={() => {
                    if (lastCompletedOrder) {
                      const ord: Order = {
                        id: lastCompletedOrder.orderNumber,
                        order_number: lastCompletedOrder.orderNumber,
                        source: 'POS',
                        customer_name_snapshot: lastCompletedOrder.customerName,
                        customer_phone_snapshot: lastCompletedOrder.customerPhone,
                        status: 'DELIVERED',
                        subtotal: lastCompletedOrder.subtotal,
                        discount: lastCompletedOrder.extraDiscountAmount,
                        delivery_fee: 0,
                        tax_amount: lastCompletedOrder.taxAmount,
                        total: lastCompletedOrder.grandTotal,
                        payment_method: lastCompletedOrder.paymentMethod,
                        payment_status: 'PAID',
                        created_at: new Date().toISOString(),
                        updated_at: new Date().toISOString(),
                        items: lastCompletedOrder.items.map((it: any) => ({
                          id: `oi-${Math.random()}`,
                          order_id: lastCompletedOrder.orderNumber,
                          product_id: it.product.id,
                          product_name_snapshot: it.product.name,
                          pack_size_snapshot: it.product.pack_size,
                          quantity: it.quantity,
                          unit_price_snapshot: it.product.offer_price || it.product.selling_price,
                          discount: it.itemDiscountPercent || 0,
                          total: (it.product.offer_price || it.product.selling_price) * it.quantity,
                          created_at: new Date().toISOString()
                        }))
                      };
                      promptEditOrderInPOS(ord);
                    }
                  }}
                  className="py-2 px-3 bg-amber-500 hover:bg-amber-600 text-emerald-950 font-black rounded-xl text-xs flex items-center justify-center gap-1 shadow-xs cursor-pointer"
                >
                  <Tag className="w-3.5 h-3.5" /> Edit Order
                </button>
                <button
                  onClick={() => window.print()}
                  className="flex-1 py-2 bg-emerald-900 hover:bg-emerald-950 text-white font-bold rounded-xl flex items-center justify-center gap-1.5 text-xs cursor-pointer"
                >
                  <Printer className="w-4 h-4" /> Print Receipt
                </button>
                <button
                  onClick={handleNewSaleWithConfirm}
                  className="py-2 px-3 bg-gray-200 hover:bg-gray-300 text-gray-800 font-bold rounded-xl text-xs cursor-pointer"
                >
                  New Sale
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* All POS Sales History Modal (Re-print, Edit, Send Receipt) */}
      {showAllOrdersModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white dark:bg-emerald-950 max-w-3xl w-full p-6 rounded-3xl shadow-2xl space-y-4 border border-emerald-100 dark:border-emerald-800">
            <div className="flex items-center justify-between border-b border-emerald-100 dark:border-emerald-800 pb-3">
              <div>
                <h3 className="text-xl font-bold font-serif text-gray-900 dark:text-emerald-100 flex items-center gap-2">
                  <FileText className="w-5 h-5 text-amber-400" />
                  All Recent POS Orders History ({recentPOSOrders.length})
                </h3>
                <p className="text-xs text-gray-500 dark:text-emerald-300">
                  Select any completed order to re-print receipt, edit items, or re-send WhatsApp bill
                </p>
              </div>
              <button
                onClick={() => setShowAllOrdersModal(false)}
                className="p-1.5 rounded-full hover:bg-gray-100 dark:hover:bg-emerald-900 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
              >
                ✕
              </button>
            </div>

            <div className="max-h-[60vh] overflow-y-auto space-y-2.5 pr-1 font-sans">
              {recentPOSOrders.map((ord: Order) => (
                <div
                  key={ord.id}
                  className="p-4 bg-emerald-50/50 dark:bg-emerald-900/40 rounded-2xl border border-emerald-100 dark:border-emerald-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 hover:border-emerald-400 transition-all"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 font-mono font-bold text-gray-900 dark:text-emerald-100">
                      <span className="text-emerald-800 dark:text-amber-300 text-sm">{ord.order_number}</span>
                      <span className="text-xs bg-emerald-100 dark:bg-emerald-800 text-emerald-900 dark:text-emerald-100 px-2 py-0.5 rounded font-sans">
                        {ord.payment_method} • {ord.payment_status}
                      </span>
                      {ord.updated_at && ord.updated_at !== ord.created_at && (
                        <span className="text-[10px] bg-amber-100 dark:bg-amber-900/60 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-700 px-1.5 py-0.5 rounded font-sans font-bold tracking-wider">
                          MODIFIED
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-gray-600 dark:text-emerald-200 font-medium">
                      Customer: <strong>{ord.customer_name_snapshot || 'Walk-in Customer'}</strong> ({ord.customer_phone_snapshot || '9876543210'})
                    </div>
                    <div className="text-[11px] text-gray-400 dark:text-emerald-400 flex items-center gap-1.5">
                      <span>Placed: {new Date(ord.created_at).toLocaleString()} ({formatTimeAgo(ord.created_at)})</span>
                      <span>|</span>
                      <span>Items: {(ord.items || []).length} products</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                    <div className="text-right mr-2">
                      <div className="text-xs text-gray-400">Total Paid</div>
                      <div className="text-lg font-black text-gray-900 dark:text-amber-400">₹{ord.total}</div>
                    </div>

                    <button
                      onClick={() => {
                        const orderData = {
                          orderNumber: ord.order_number,
                          date: new Date(ord.created_at).toLocaleString(),
                          customerName: ord.customer_name_snapshot || 'Walk-in Customer',
                          customerPhone: ord.customer_phone_snapshot || '9876543210',
                          customerEmail: '',
                          paymentMethod: ord.payment_method,
                          items: (ord.items || []).map(i => ({
                            product: {
                              id: i.product_id || `p-${Math.random()}`,
                              name: i.product_name_snapshot,
                              pack_size: i.pack_size_snapshot,
                              selling_price: i.unit_price_snapshot,
                              mrp: i.unit_price_snapshot
                            },
                            quantity: i.quantity,
                            itemDiscountPercent: i.discount || 0
                          })),
                          totalMRP: ord.subtotal || ord.total,
                          subtotal: ord.subtotal || ord.total,
                          mrpSavings: ord.discount || 0,
                          mrpSavingsPercent: 0,
                          extraDiscountAmount: 0,
                          extraDiscountPercent: 0,
                          gstPercent: 5,
                          taxAmount: ord.tax_amount || 0,
                          grandTotal: ord.total
                        };
                        setShowAllOrdersModal(false);
                        setLastCompletedOrder(orderData);
                        setShowReceipt(true);
                      }}
                      className="px-3 py-2 bg-emerald-800 hover:bg-emerald-900 text-white font-bold text-xs rounded-xl shadow-xs flex items-center gap-1"
                    >
                      <Printer className="w-3.5 h-3.5" />
                      <span>Re-Print</span>
                    </button>

                    <button
                      onClick={() => promptEditOrderInPOS(ord)}
                      className="px-3 py-2 bg-amber-400 hover:bg-amber-300 text-emerald-950 font-black text-xs rounded-xl shadow-xs flex items-center gap-1 cursor-pointer"
                    >
                      <Tag className="w-3.5 h-3.5" />
                      <span>Edit Sale</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <div className="pt-2 border-t border-emerald-100 dark:border-emerald-800 flex justify-end">
              <button
                onClick={() => setShowAllOrdersModal(false)}
                className="px-5 py-2 bg-gray-100 dark:bg-emerald-900 hover:bg-gray-200 text-gray-800 dark:text-emerald-100 font-bold rounded-xl text-xs"
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

export default POSPage;

