import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  Leaf, ShoppingBag, Eye, Plus, Minus, CheckCircle2, 
  AlertCircle, Package, Sparkles, Tag, ArrowRight 
} from 'lucide-react';
import { formatPrice } from '../../lib/utils';
import { useCart } from '../../contexts/CartContext';
import type { Product, Category } from '../../types';
import { getJSONStore } from '../../lib/dbManager';

interface ProductListItemProps {
  product: Product;
  categories?: Category[];
  onQuickView?: (product: Product) => void;
  className?: string;
}

export const ProductListItem: React.FC<ProductListItemProps> = ({
  product,
  categories,
  onQuickView,
  className = ''
}) => {
  const navigate = useNavigate();
  const { addItem, updateQuantity, getItem } = useCart();
  const cartItem = getItem(product.id);
  const isInCart = Boolean(cartItem && cartItem.quantity > 0);

  const [internalCats, setInternalCats] = React.useState<Category[]>(categories || []);

  React.useEffect(() => {
    if (!categories || categories.length === 0) {
      getJSONStore<Category>('categories').then((cats) => {
        if (cats && cats.length > 0) setInternalCats(cats);
      });
    } else {
      setInternalCats(categories);
    }
  }, [categories]);

  const categoryObj = (categories || internalCats).find((c) => c.id === product.category_id) || product.category;

  const basePrice = product.offer_price || product.selling_price;
  const hasOffer = Boolean(product.offer_price && product.offer_price > 0 && product.offer_price < product.selling_price);
  const hasMrpDiscount = Boolean(product.mrp && product.mrp > basePrice);

  const discountPercent = hasMrpDiscount && product.mrp
    ? Math.round(((product.mrp - basePrice) / product.mrp) * 100)
    : hasOffer
    ? Math.round(((product.selling_price - product.offer_price!) / product.selling_price) * 100)
    : 0;

  const isOutOfStock = product.current_stock <= 0;
  const isBelow20 = product.current_stock > 0 && product.current_stock < 20;

  const handleCardClick = () => {
    navigate(`/products/${product.id}`);
  };

  return (
    <div
      className={`group bg-white dark:bg-emerald-950/70 rounded-2xl border border-emerald-100 dark:border-emerald-800/80 p-2.5 sm:p-3.5 hover:shadow-lg transition-all duration-300 flex items-center justify-between gap-2.5 sm:gap-4 hover:border-emerald-400 dark:hover:border-amber-400/80 ${className}`}
    >
      {/* 1. Thumbnail Image */}
      <div 
        onClick={handleCardClick}
        className="relative w-18 h-18 sm:w-24 sm:h-24 rounded-xl overflow-hidden shrink-0 bg-emerald-50 dark:bg-emerald-950 cursor-pointer border border-emerald-100 dark:border-emerald-800 select-none"
      >
        <img
          src={product.image_url || 'https://images.unsplash.com/photo-1586201375761-83865001e31c?auto=format&fit=crop&w=600&q=80'}
          alt={product.name}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          loading="lazy"
        />

        {/* Quick View Button on Hover (Tablet & Desktop) */}
        {onQuickView && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onQuickView(product);
            }}
            className="hidden sm:flex absolute inset-0 bg-emerald-950/40 backdrop-blur-2xs opacity-0 group-hover:opacity-100 transition-opacity items-center justify-center text-white"
            title="Quick view"
          >
            <Eye className="w-5 h-5 text-amber-300" />
          </button>
        )}

        {/* Festival Deal or Discount Tag on Image */}
        {product.festival_offer ? (
          <span className="absolute top-1 left-1 bg-gradient-to-r from-amber-500 to-rose-500 text-white text-[8px] sm:text-[9px] font-black px-1.5 py-0.2 rounded-full shadow border border-amber-200">
            🪔 Deal
          </span>
        ) : discountPercent > 0 ? (
          <span className="absolute top-1 left-1 bg-amber-400 text-emerald-950 text-[8px] sm:text-[9px] font-black px-1 py-0.2 rounded shadow border border-amber-300">
            {discountPercent}%
          </span>
        ) : null}
      </div>

      {/* 2. Middle: Product Details (Single Row on Mobile, spacious on Desktop) */}
      <div className="flex-1 min-w-0 space-y-0.5 sm:space-y-1">
        {/* Meta badges: Category, Pack size, Organic */}
        <div className="flex flex-wrap items-center gap-1 text-[10px] sm:text-[11px]">
          <span className="bg-emerald-100/90 dark:bg-emerald-900/80 text-emerald-950 dark:text-emerald-100 font-extrabold px-1.5 py-0.2 rounded text-[10px] flex items-center gap-1 border border-emerald-200/80 dark:border-emerald-800 shadow-2xs truncate max-w-[130px]">
            <span>{categoryObj?.icon || '🌾'}</span>
            <span className="truncate">{categoryObj?.name || 'Produce'}</span>
          </span>

          {product.pack_size && (
            <span className="text-[10px] font-bold text-gray-600 dark:text-emerald-300 bg-gray-100 dark:bg-emerald-950 px-1.5 py-0.2 rounded font-mono border border-gray-200 dark:border-emerald-800">
              {product.pack_size}
            </span>
          )}

          {product.is_organic && (
            <span className="bg-emerald-700 text-white text-[9px] sm:text-[10px] font-black px-1.5 py-0.2 rounded-full flex items-center gap-0.5 shadow-xs">
              <Leaf className="w-2.5 h-2.5 text-emerald-300" />
              <span>Organic</span>
            </span>
          )}

          {product.is_featured && (
            <span className="hidden sm:inline-flex bg-amber-400 text-emerald-950 text-[9px] font-black px-1.5 py-0.2 rounded-full items-center gap-0.5 shadow-xs">
              <Sparkles className="w-2.5 h-2.5" />
              <span>Featured</span>
            </span>
          )}
        </div>

        {/* Tamil Name */}
        {product.tamil_name && (
          <div className="text-[10px] sm:text-xs font-semibold text-emerald-700 dark:text-emerald-400 line-clamp-1">
            {product.tamil_name}
          </div>
        )}

        {/* Product Title */}
        <Link
          to={`/products/${product.id}`}
          className="font-serif font-bold text-xs sm:text-base text-gray-900 dark:text-emerald-50 hover:text-emerald-700 dark:hover:text-amber-400 transition-colors line-clamp-1 leading-snug block"
        >
          {product.name}
        </Link>

        {/* Stock Status Indicator */}
        <div className="flex items-center gap-2 pt-0.5">
          {isOutOfStock ? (
            <span className="text-rose-600 dark:text-rose-400 text-[10px] font-bold flex items-center gap-1">
              <AlertCircle className="w-2.5 h-2.5" /> Out of Stock
            </span>
          ) : isBelow20 ? (
            <span className="text-amber-600 dark:text-amber-400 font-extrabold text-[10px] flex items-center gap-0.5 animate-pulse">
              ⚡ Only {product.current_stock} left!
            </span>
          ) : (
            <span className="text-emerald-600 dark:text-emerald-400 text-[10px] font-bold flex items-center gap-0.5">
              <CheckCircle2 className="w-2.5 h-2.5 text-emerald-500" /> In Stock
            </span>
          )}

          {/* Desktop short description */}
          {product.short_description && (
            <span className="hidden md:inline text-xs text-gray-500 dark:text-emerald-300/70 truncate max-w-sm">
              • {product.short_description}
            </span>
          )}
        </div>
      </div>

      {/* 3. Right: Pricing & Quick Add to Cart Controls (Compact on Mobile) */}
      <div className="flex flex-col items-end justify-center gap-1 sm:gap-1.5 shrink-0 min-w-[90px] sm:min-w-[130px] pl-1">
        {/* Price & MRP Strikethrough */}
        <div className="text-right space-y-0">
          {product.mrp && product.mrp > basePrice && (
            <div className="text-[10px] sm:text-xs text-rose-500/90 dark:text-rose-400/90 line-through font-mono font-semibold">
              MRP: {formatPrice(product.mrp)}
            </div>
          )}

          <div className="flex items-baseline justify-end gap-1">
            <span className="text-sm sm:text-xl font-black font-sans text-emerald-800 dark:text-amber-400">
              {formatPrice(basePrice)}
            </span>
          </div>
        </div>

        {/* Action Controls: Add to Cart OR Quantity Stepper */}
        <div>
          {isInCart ? (
            <div className="flex items-center bg-emerald-700 dark:bg-emerald-800 text-white rounded-lg shadow-md border border-emerald-600 overflow-hidden">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  updateQuantity(product.id, (cartItem?.quantity || 1) - 1);
                }}
                className="px-2 py-1 hover:bg-emerald-800 dark:hover:bg-emerald-700 text-white font-black text-xs transition-colors active:scale-90 cursor-pointer"
                title="Decrease quantity"
              >
                <Minus className="w-3 h-3" />
              </button>

              <span className="px-1.5 py-0.5 font-mono font-black text-xs text-amber-300 min-w-[18px] text-center select-none">
                {cartItem?.quantity}
              </span>

              <button
                type="button"
                disabled={isOutOfStock}
                onClick={(e) => {
                  e.stopPropagation();
                  updateQuantity(product.id, (cartItem?.quantity || 0) + 1);
                }}
                className="px-2 py-1 hover:bg-emerald-800 dark:hover:bg-emerald-700 text-white font-black text-xs transition-colors active:scale-90 disabled:opacity-50 cursor-pointer"
                title="Increase quantity"
              >
                <Plus className="w-3 h-3" />
              </button>
            </div>
          ) : (
            <button
              type="button"
              disabled={isOutOfStock}
              onClick={(e) => {
                e.stopPropagation();
                addItem(product, 1);
              }}
              className="flex items-center gap-1 px-2.5 sm:px-3.5 py-1 sm:py-1.5 bg-emerald-700 hover:bg-emerald-800 active:scale-95 text-white font-bold text-xs rounded-lg shadow-xs transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
              title={isOutOfStock ? 'Item out of stock' : 'Add to WhatsApp list'}
            >
              <ShoppingBag className="w-3 h-3 text-amber-300" />
              <span>{isOutOfStock ? 'Sold Out' : '+ Add'}</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProductListItem;
