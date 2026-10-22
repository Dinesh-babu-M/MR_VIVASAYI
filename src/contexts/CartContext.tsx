import React, { createContext, useContext, useState, useCallback, useMemo } from 'react';
import type { CartItem, Product, Coupon } from '../types';
import { generateWhatsAppMessage } from '../lib/utils';
import { useActionModal } from './ActionModalContext';
import { getWhatsAppOrdersNumber } from '../lib/dbManager';

interface CartContextValue {
  items: CartItem[];
  addItem: (product: Product, quantity?: number) => void;
  removeItem: (productId: string) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  clearCart: () => void;
  totalItems: number;
  subTotal: number;
  totalPrice: number;
  appliedCoupon: Coupon | null;
  discountAmount: number;
  applyCoupon: (coupon: Coupon) => boolean;
  removeCoupon: () => void;
  generateWhatsAppLink: () => string;
  isInCart: (productId: string) => boolean;
  getItem: (productId: string) => CartItem | undefined;
  // Aliases used by newer components
  itemCount: number;
  totalAmount: number;
  getWhatsAppOrderUrl: () => string;
}

const CartContext = createContext<CartContextValue | undefined>(undefined);

const WHATSAPP_NUMBER = import.meta.env.VITE_WHATSAPP_NUMBER || '919876543210';

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [appliedCoupon, setAppliedCoupon] = useState<Coupon | null>(null);
  const { showActionModal } = useActionModal();

  const addItem = useCallback((product: Product, quantity: number = 1) => {
    if (product.stock_status === 'OUT_OF_STOCK' || product.stock_status === 'DISABLED') return;

    setItems((prev) => {
      const existing = prev.find((item) => item.product.id === product.id);
      if (existing) {
        return prev.map((item) =>
          item.product.id === product.id
            ? { ...item, quantity: item.quantity + quantity }
            : item
        );
      }
      return [...prev, { product, quantity }];
    });

    showActionModal({
      title: `Added to Cart: ${product.name}`,
      subtitle: `Allocating farm harvest stock & packing ${quantity} ${product.unit || 'unit(s)'}...`,
      moduleName: 'Storefront Cart',
      badge: 'Organic Store',
      duration: 650,
      steps: [
        'Checking farm stock inventory...',
        'Packaging items into cart basket...',
        'Cart totals updated live!'
      ]
    });
  }, [showActionModal]);

  const removeItem = useCallback((productId: string) => {
    setItems((prev) => prev.filter((item) => item.product.id !== productId));
  }, []);

  const updateQuantity = useCallback((productId: string, quantity: number) => {
    if (quantity <= 0) {
      setItems((prev) => prev.filter((item) => item.product.id !== productId));
      return;
    }
    setItems((prev) =>
      prev.map((item) =>
        item.product.id === productId ? { ...item, quantity } : item
      )
    );
  }, []);

  const clearCart = useCallback(() => {
    setItems([]);
    showActionModal({
      title: 'Cart Basket Cleared',
      subtitle: 'Releasing reserved produce back to farm inventory...',
      moduleName: 'Storefront Cart',
      badge: 'Cart Action',
      duration: 550,
      steps: [
        'Releasing stock units...',
        'Resetting delivery calculation...',
        'Cart cleared successfully!'
      ]
    });
  }, [showActionModal]);

  const totalItems = useMemo(
    () => items.reduce((sum, item) => sum + item.quantity, 0),
    [items]
  );

  const subTotal = useMemo(
    () =>
      items.reduce((sum, item) => {
        const price = item.product.offer_price ?? item.product.selling_price;
        return sum + price * item.quantity;
      }, 0),
    [items]
  );

  const discountAmount = useMemo(() => {
    if (!appliedCoupon) return 0;
    const minRequired = Number(appliedCoupon.min_order_value ?? (appliedCoupon as any).min_order_amount ?? 0);
    if (minRequired > 0 && subTotal < minRequired) {
      return 0; // Invalidated by order size change
    }
    
    let discount = 0;
    if (appliedCoupon.discount_type === 'PERCENTAGE') {
      discount = (subTotal * appliedCoupon.discount_value) / 100;
      const maxDiscount = Number(appliedCoupon.max_discount_value ?? (appliedCoupon as any).max_discount_amount ?? 0);
      if (maxDiscount > 0) {
        discount = Math.min(discount, maxDiscount);
      }
    } else {
      discount = Number(appliedCoupon.discount_value || 0);
    }
    return Math.min(discount, subTotal);
  }, [appliedCoupon, subTotal]);

  const totalPrice = Math.max(0, subTotal - discountAmount);

  // Re-validate coupon if subtotal changes and falls below minimum
  React.useEffect(() => {
    if (appliedCoupon) {
      const minRequired = Number(appliedCoupon.min_order_value ?? (appliedCoupon as any).min_order_amount ?? 0);
      if (minRequired > 0 && subTotal < minRequired) {
        setAppliedCoupon(null);
      }
    }
  }, [subTotal, appliedCoupon]);

  const applyCoupon = useCallback((coupon: Coupon) => {
    const minRequired = Number(coupon.min_order_value ?? (coupon as any).min_order_amount ?? 0);
    if (minRequired > 0 && subTotal < minRequired) {
      return false;
    }
    setAppliedCoupon(coupon);
    showActionModal({
      title: `Applying Coupon: ${coupon.code}`,
      subtitle: 'Verifying discount code eligibility & calculating instant savings...',
      moduleName: 'Promotions',
      badge: 'Discount Code',
      duration: 650,
      steps: [
        'Checking minimum order requirements...',
        'Applying discount value live...',
        'Discount calculated successfully!'
      ]
    });
    return true;
  }, [subTotal, showActionModal]);

  const removeCoupon = useCallback(() => {
    setAppliedCoupon(null);
  }, []);

  const generateWhatsAppLink = useCallback(() => {
    const orderNumber = getWhatsAppOrdersNumber();
    return generateWhatsAppMessage(items, orderNumber, discountAmount, appliedCoupon?.code);
  }, [items, discountAmount, appliedCoupon]);

  const isInCart = useCallback(
    (productId: string) => items.some((item) => item.product.id === productId),
    [items]
  );

  const getItem = useCallback(
    (productId: string) => items.find((item) => item.product.id === productId),
    [items]
  );

  const value: CartContextValue = {
    items,
    addItem,
    removeItem,
    updateQuantity,
    clearCart,
    totalItems,
    subTotal,
    totalPrice,
    appliedCoupon,
    discountAmount,
    applyCoupon,
    removeCoupon,
    generateWhatsAppLink,
    isInCart,
    getItem,
    // Aliases
    itemCount: totalItems,
    totalAmount: totalPrice,
    getWhatsAppOrderUrl: generateWhatsAppLink,
  };

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart(): CartContextValue {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart must be used within CartProvider');
  return ctx;
}
