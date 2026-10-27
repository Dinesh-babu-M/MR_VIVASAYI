import React from 'react';
import { X, Check, Leaf, ShoppingBag, ShieldCheck, MessageSquare, AlertCircle } from 'lucide-react';
import type { Product } from '../../types';
import { formatPrice } from '../../lib/utils';
import { useCart } from '../../contexts/CartContext';
import { getWhatsAppOrdersNumber } from '../../lib/dbManager';

interface QuickViewModalProps {
  product: Product | null;
  onClose: () => void;
}

export const QuickViewModal: React.FC<QuickViewModalProps> = ({ product, onClose }) => {
  const { addItem, getWhatsAppOrderUrl } = useCart();

  if (!product) return null;

  const isLowStock = product.current_stock > 0 && product.current_stock <= product.reorder_level;
  const isOutOfStock = product.current_stock <= 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm overflow-y-auto">
      <div 
        className="relative bg-white dark:bg-emerald-950 max-w-2xl w-full rounded-2xl shadow-2xl border border-emerald-100 dark:border-emerald-800 overflow-hidden animate-fadeIn my-8"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-10 p-2 rounded-full bg-gray-100 dark:bg-emerald-900 text-gray-600 dark:text-emerald-200 hover:bg-gray-200 dark:hover:bg-emerald-800 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="grid grid-cols-1 md:grid-cols-2">
          {/* Product Image section */}
          <div className="relative bg-emerald-50 dark:bg-emerald-900/40 p-6 flex flex-col justify-between">
            <div className="relative aspect-square rounded-xl overflow-hidden shadow-inner border border-emerald-100 dark:border-emerald-800">
              <img
                src={product.image_url || 'https://images.unsplash.com/photo-1586201375761-83865001e31c?auto=format&fit=crop&w=600&q=80'}
                alt={product.name}
                className="w-full h-full object-cover"
              />
              <div className="absolute top-3 left-3 flex flex-col gap-1 z-10">
                {product.festival_offer && (
                  <span className="bg-gradient-to-r from-amber-500 via-rose-500 to-amber-600 text-white text-[11px] font-black px-2.5 py-1 rounded-full flex items-center gap-1 shadow-md border border-amber-300 animate-pulse">
                    <span>🪔</span>
                    <span>{product.festival_offer}</span>
                  </span>
                )}
                {product.is_organic && (
                  <span className="bg-emerald-600 text-white text-xs font-bold px-2.5 py-1 rounded-full flex items-center gap-1 shadow">
                    <Leaf className="w-3.5 h-3.5" /> 100% Organic
                  </span>
                )}
              </div>
            </div>

            {/* Badges */}
            <div className="mt-4 space-y-2 text-xs">
              <div className="flex items-center text-emerald-800 dark:text-emerald-300 font-medium gap-1.5">
                <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                <span>Source: {product.source_description || 'Direct Tamil Nadu Farmer Network'}</span>
              </div>
              <div className="text-gray-500 dark:text-emerald-300/70">
                Storage: {product.storage_info || 'Store in a cool, dry airtight container'}
              </div>
            </div>
          </div>

          {/* Product Details section */}
          <div className="p-6 flex flex-col justify-between space-y-4">
            <div>
              {/* Category & Tamil Name */}
              <div className="flex items-center justify-between text-xs font-semibold text-emerald-600 dark:text-amber-400 mb-1">
                <span>SKU: {product.sku}</span>
                {product.tamil_name && <span className="text-sm font-medium">{product.tamil_name}</span>}
              </div>

              <h2 className="text-xl font-bold text-gray-900 dark:text-emerald-100 leading-snug">
                {product.name}
              </h2>

              {/* Price section */}
              {product.offer_price && (
                <div className="mt-2 inline-flex items-center gap-2">
                  <span className="bg-gradient-to-r from-rose-600 to-amber-600 text-white text-[10px] font-extrabold px-2.5 py-0.5 rounded-full uppercase tracking-wider animate-pulse">
                    ⏱️ Limited Time Offer
                  </span>
                  {product.mrp && product.mrp > product.offer_price && (
                    <span className="bg-amber-400 text-emerald-950 font-black text-[10px] px-2 py-0.5 rounded-md">
                      {Math.round(((product.mrp - product.offer_price) / product.mrp) * 100)}% OFF MRP
                    </span>
                  )}
                </div>
              )}

              <div className="mt-3 flex items-baseline gap-3 flex-wrap">
                <div className="flex items-baseline gap-1.5">
                  <span className="text-xs font-bold text-gray-500 dark:text-emerald-300 uppercase">
                    {product.offer_price ? 'Offer:' : 'Our:'}
                  </span>
                  <span className="text-3xl font-black text-emerald-800 dark:text-amber-400">
                    {formatPrice(product.offer_price || product.selling_price)}
                  </span>
                </div>
                {product.offer_price && (
                  <span className="text-sm text-gray-400 line-through font-mono">
                    Regular: {formatPrice(product.selling_price)}
                  </span>
                )}
                {product.mrp && product.mrp > (product.offer_price || product.selling_price) && (
                  <span className="text-xs text-rose-500 dark:text-rose-400 line-through font-mono font-bold">
                    MRP: {formatPrice(product.mrp)}
                  </span>
                )}
              </div>

              {/* Pack size & Stock Status */}
              <div className="mt-4 flex items-center justify-between text-xs py-2.5 border-y border-emerald-100 dark:border-emerald-800 bg-emerald-50/50 dark:bg-emerald-950/40 px-3 rounded-xl">
                <span className="font-bold text-xs text-emerald-950 dark:text-emerald-100">
                  Pack: <span className="font-extrabold text-emerald-700 dark:text-amber-300">{product.pack_size || '1 unit'} ({product.unit})</span>
                </span>
                <div>
                  {product.current_stock <= 0 ? (
                    <span className="bg-rose-100 text-rose-800 dark:bg-rose-900/50 dark:text-rose-300 font-bold px-2.5 py-1 rounded-full flex items-center gap-1">
                      <AlertCircle className="w-3.5 h-3.5" /> Out of Stock
                    </span>
                  ) : product.current_stock < 20 ? (
                    <span className="bg-amber-100 text-amber-900 dark:bg-amber-900/50 dark:text-amber-300 font-extrabold px-2.5 py-1 rounded-full flex items-center gap-1 animate-pulse">
                      ⚡ Only {product.current_stock} left!
                    </span>
                  ) : (
                    <span className="bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-300 font-bold px-2.5 py-1 rounded-full flex items-center gap-1">
                      <Check className="w-3.5 h-3.5" /> In Stock
                    </span>
                  )}
                </div>
              </div>

              {/* Short description */}
              <p className="mt-3 text-sm text-gray-600 dark:text-emerald-200/80 leading-relaxed">
                {product.short_description || product.description}
              </p>
            </div>

            {/* Actions */}
            <div className="space-y-2 pt-2">
              <button
                disabled={isOutOfStock}
                onClick={() => {
                  addItem(product);
                  onClose();
                }}
                className="w-full flex items-center justify-center space-x-2 bg-emerald-700 hover:bg-emerald-800 disabled:opacity-50 text-white font-bold py-3 px-4 rounded-xl shadow transition-all text-sm"
              >
                <ShoppingBag className="w-4 h-4" />
                <span>Add to Cart</span>
              </button>

              <a
                href={`https://wa.me/${getWhatsAppOrdersNumber()}?text=${encodeURIComponent(`Hello MR. VIVASAYI, I want to order 1 pack of ${product.name} (${product.pack_size || '1 unit'}). Price: ${formatPrice(product.offer_price || product.selling_price)}.`)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full flex items-center justify-center space-x-2 bg-emerald-100 dark:bg-emerald-900 hover:bg-emerald-200 dark:hover:bg-emerald-800 text-emerald-900 dark:text-amber-300 font-semibold py-2.5 px-4 rounded-xl transition-colors text-sm border border-emerald-300 dark:border-emerald-700"
              >
                <MessageSquare className="w-4 h-4 text-emerald-600 dark:text-amber-400" />
                <span>Order Single Item Immediately</span>
              </a>
            </div>

          </div>
        </div>

      </div>
    </div>
  );
};

export default QuickViewModal;
