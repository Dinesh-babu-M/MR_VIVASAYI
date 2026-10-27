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

interface ProductCardProps {
  product: Product;
  categories?: Category[];
  onQuickView?: (product: Product) => void;
  className?: string;
  compact?: boolean;
}

export const ProductCard: React.FC<ProductCardProps> = ({ 
  product, 
  categories,
  onQuickView,
  className = '',
  compact = false 
}) => {
  const navigate = useNavigate();
  const { addItem, updateQuantity, getItem } = useCart();
  const cartItem = getItem(product.id);
  const isInCart = Boolean(cartItem && cartItem.quantity > 0);
  const [isAdding, setIsAdding] = React.useState(false);

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

  const handleAddToCart = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isOutOfStock) return;
    setIsAdding(true);
    addItem(product, 1);
    setTimeout(() => {
      setIsAdding(false);
    }, 850);
  };

  return (
    <div 
      className={`group bg-white dark:bg-emerald-950/60 ${compact ? 'rounded-2xl' : 'rounded-3xl'} border overflow-hidden shadow-xs hover:shadow-2xl hover:shadow-emerald-950/20 transition-all duration-300 flex flex-col justify-between hover:border-emerald-400 dark:hover:border-amber-400/80 hover:-translate-y-1.5 transform-gpu relative ${
        isAdding 
          ? 'ring-2 ring-emerald-500 shadow-xl scale-[1.02] border-emerald-500' 
          : 'border-emerald-100 dark:border-emerald-800/80'
      } ${className}`}
    >
      {/* Dynamic Pop Animation Overlay when Added to Cart */}
      {isAdding && (
        <div className="absolute inset-0 bg-emerald-900/25 backdrop-blur-[1px] flex items-center justify-center z-30 pointer-events-none animate-fadeIn">
          <div className="bg-emerald-800 text-white font-black text-xs px-3.5 py-1.5 rounded-full shadow-2xl flex items-center gap-1.5 border border-emerald-400 animate-scaleUp">
            <CheckCircle2 className="w-4 h-4 text-amber-300 animate-pulse" />
            <span>Added to Cart ✓</span>
          </div>
        </div>
      )}

      {/* Product Image & Badges */}
      <div className="relative aspect-square overflow-hidden bg-emerald-50/50 dark:bg-emerald-950 cursor-pointer" onClick={handleCardClick}>
        <img
          src={product.image_url || 'https://images.unsplash.com/photo-1586201375761-83865001e31c?auto=format&fit=crop&w=600&q=80'}
          alt={product.name}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          loading="lazy"
        />

        {/* Floating Badges (Organic, Featured, Festival, Labels) */}
        <div className={`absolute ${compact ? 'top-1.5 left-1.5 gap-0.5' : 'top-3 left-3 gap-1'} flex flex-col items-start z-10`}>
          {product.festival_offer && (
            <span className={`bg-gradient-to-r from-amber-500 via-rose-500 to-amber-600 text-white ${compact ? 'text-[9px] px-1.5 py-0.5' : 'text-[10px] px-2.5 py-1'} font-black rounded-full flex items-center gap-1 shadow-lg border border-amber-200 animate-pulse uppercase tracking-wider`}>
              <span>🪔</span>
              <span className="truncate max-w-[90px]">{product.festival_offer}</span>
            </span>
          )}
          {product.is_organic && (
            <span className={`bg-emerald-700/95 backdrop-blur-xs text-white ${compact ? 'text-[9px] px-1.5 py-0.5' : 'text-[11px] px-2.5 py-1'} font-extrabold rounded-full flex items-center gap-1 shadow-md border border-emerald-500/30`}>
              <Leaf className={`${compact ? 'w-2.5 h-2.5' : 'w-3.5 h-3.5'} text-emerald-300`} />
              <span>Organic</span>
            </span>
          )}
          {product.is_featured && !compact && (
            <span className="bg-amber-500/95 backdrop-blur-xs text-emerald-950 text-[10px] font-black px-2.5 py-0.5 rounded-full flex items-center gap-1 shadow-md border border-amber-300">
              <Sparkles className="w-3 h-3 text-emerald-950" />
              <span>Featured</span>
            </span>
          )}
          {product.labels && product.labels[0] && !compact && (
            <span className="bg-teal-700/90 backdrop-blur-xs text-white text-[10px] font-black px-2 py-0.5 rounded-full shadow-md border border-teal-400/40">
              {product.labels[0]}
            </span>
          )}
        </div>

        {/* Offer & Discount Badges */}
        <div className={`absolute ${compact ? 'top-1.5 right-1.5 gap-0.5' : 'top-3 right-3 gap-1'} flex flex-col items-end z-10`}>
          {hasOffer && (
            <span className={`bg-gradient-to-r from-rose-600 to-amber-600 text-white ${compact ? 'text-[9px] px-1.5 py-0.2' : 'text-[10px] px-2 py-0.5'} font-black rounded-full shadow-md flex items-center gap-1 uppercase tracking-wider animate-pulse border border-rose-400/40`}>
              <Sparkles className="w-2.5 h-2.5" /> Offer
            </span>
          )}
          {discountPercent > 0 && (
            <span className={`bg-amber-400 text-emerald-950 font-black ${compact ? 'text-[9px] px-1.5 py-0.2' : 'text-[11px] px-2 py-0.5'} rounded-md shadow-md border border-amber-300`}>
              {discountPercent}% OFF
            </span>
          )}
        </div>

        {/* Stock Status Badge (Exact count shown ONLY if below 20; otherwise 'In Stock' badge only) */}
        <div className={`absolute ${compact ? 'bottom-1.5 left-1.5' : 'bottom-3 left-3'} z-10`}>
          {isOutOfStock ? (
            <span className={`bg-rose-600/90 backdrop-blur-xs text-white ${compact ? 'text-[9px] px-1.5 py-0.2' : 'text-[11px] font-bold px-2.5 py-0.5'} rounded-full shadow flex items-center gap-1 border border-rose-400/50`}>
              <AlertCircle className="w-3 h-3" /> Out of Stock
            </span>
          ) : isBelow20 ? (
            <span className={`bg-amber-500/95 backdrop-blur-xs text-emerald-950 font-extrabold ${compact ? 'text-[9px] px-1.5 py-0.2' : 'text-[11px] px-2.5 py-0.5'} rounded-full shadow flex items-center gap-1 border border-amber-300 animate-pulse`}>
              ⚡ {compact ? `${product.current_stock} left!` : `Only ${product.current_stock} left!`}
            </span>
          ) : (
            <span className={`bg-emerald-600/90 backdrop-blur-xs text-white ${compact ? 'text-[9px] px-1.5 py-0.2' : 'text-[11px] font-bold px-2.5 py-0.5'} rounded-full shadow flex items-center gap-1 border border-emerald-400/50`}>
              <CheckCircle2 className={`${compact ? 'w-2.5 h-2.5' : 'w-3 h-3'} text-emerald-200`} /> In Stock
            </span>
          )}
        </div>

        {/* Quick View Button on Hover */}
        {onQuickView && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onQuickView(product);
            }}
            className={`absolute ${compact ? 'right-1.5 bottom-1.5 p-1' : 'right-3 bottom-3 p-2'} bg-white/95 dark:bg-emerald-900/95 text-gray-800 dark:text-emerald-100 rounded-xl shadow-lg opacity-0 group-hover:opacity-100 transition-all duration-200 hover:scale-110 flex items-center gap-1 text-xs font-bold border border-emerald-100 dark:border-emerald-700`}
            title="Quick View Details"
          >
            <Eye className="w-4 h-4 text-emerald-700 dark:text-amber-400" />
            <span className="hidden sm:inline">Quick View</span>
          </button>
        )}
      </div>

      {/* Product Content Details */}
      <div className={`${compact ? 'p-2.5 sm:p-3 space-y-1.5' : 'p-3 sm:p-4 lg:p-5 space-y-2 sm:space-y-3'} flex-1 flex flex-col justify-between`}>
        <div>
          {/* Category Tag & Pack Size */}
          <div className="flex items-center justify-between gap-1 mb-1 text-[11px]">
            <span className={`bg-emerald-100/90 dark:bg-emerald-900/80 text-emerald-950 dark:text-emerald-100 font-extrabold ${compact ? 'px-1.5 py-0.2 text-[10px]' : 'px-2 py-0.5'} rounded-md flex items-center gap-1 border border-emerald-200/80 dark:border-emerald-800 shadow-2xs truncate max-w-[170px]`}>
              <span>{categoryObj?.icon || '🌾'}</span>
              <span className="truncate">{compact ? (categoryObj?.name?.split(' ')[0] || 'Produce') : (categoryObj?.name || 'Organic Produce')}</span>
            </span>
            {product.pack_size && (
              <span className={`${compact ? 'text-[9px] px-1 py-0.2' : 'text-[10px] px-1.5 py-0.5'} font-bold text-gray-500 dark:text-emerald-300/80 bg-gray-100 dark:bg-emerald-950 rounded font-mono border border-gray-200 dark:border-emerald-800`}>
                {product.pack_size}
              </span>
            )}
          </div>

          {/* Tamil Name / Sourcing Subtitle */}
          {product.tamil_name && (
            <div className={`${compact ? 'text-[10px]' : 'text-xs'} font-semibold text-emerald-700 dark:text-emerald-400 mb-0.5 line-clamp-1`}>
              {product.tamil_name}
            </div>
          )}

          {/* Product Title */}
          <Link 
            to={`/products/${product.id}`}
            className={`font-serif font-bold ${compact ? 'text-xs sm:text-sm line-clamp-1' : 'text-base sm:text-lg line-clamp-2 leading-snug'} text-gray-900 dark:text-emerald-50 hover:text-emerald-700 dark:hover:text-amber-400 transition-colors`}
          >
            {product.name}
          </Link>

          {/* Short Description */}
          {!compact && product.short_description && (
            <p className="text-xs text-gray-500 dark:text-emerald-300/70 mt-1 line-clamp-2">
              {product.short_description}
            </p>
          )}

          {/* Grouped Product Badges & Labels */}
          {!compact && (product.is_featured || product.is_organic || (product.labels && product.labels.length > 0)) && (
            <div className="flex flex-wrap gap-1 mt-2">
              {product.is_organic && (
                <span className="text-[10px] font-black px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 dark:bg-emerald-900/80 dark:text-emerald-200 border border-emerald-300 dark:border-emerald-700 flex items-center gap-1">
                  <Leaf className="w-2.5 h-2.5 text-emerald-600 dark:text-emerald-400" /> Organic
                </span>
              )}
              {product.is_featured && (
                <span className="text-[10px] font-black px-2 py-0.5 rounded-md bg-amber-100 text-amber-800 dark:bg-amber-900/80 dark:text-amber-200 border border-amber-300 dark:border-amber-700 flex items-center gap-1">
                  <Sparkles className="w-2.5 h-2.5 text-amber-600 dark:text-amber-400" /> Featured
                </span>
              )}
              {product.labels && product.labels.map((lbl, idx) => (
                <span
                  key={idx}
                  className="text-[10px] font-black px-2 py-0.5 rounded-md bg-teal-50 text-teal-800 dark:bg-teal-950/80 dark:text-teal-200 border border-teal-200 dark:border-teal-800 flex items-center gap-1"
                >
                  <Tag className="w-2.5 h-2.5 text-teal-600 dark:text-teal-400" /> {lbl}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Pricing & Pack Information Section */}
        <div className={`${compact ? 'space-y-1 pt-1.5' : 'space-y-2 pt-2'} border-t border-emerald-100 dark:border-emerald-800/60`}>
          {!compact && (
            <div className="flex items-center justify-between text-xs">
              <span className="inline-flex items-center gap-1.5 font-bold text-xs text-emerald-900 dark:text-emerald-200 bg-emerald-50 dark:bg-emerald-900/60 px-2.5 py-1 rounded-lg border border-emerald-200/70 dark:border-emerald-700/60">
                <Package className="w-3.5 h-3.5 text-emerald-600 dark:text-amber-400" />
                <span>Pack: <strong className="font-extrabold text-emerald-950 dark:text-white">{product.pack_size || `1 ${product.unit}`}</strong></span>
              </span>

              {product.sku && (
                <span className="text-[10px] font-mono text-gray-400 dark:text-emerald-400/60 uppercase">
                  #{product.sku}
                </span>
              )}
            </div>
          )}

          {/* High-Contrast MRP and Our/Offer Price */}
          <div className="space-y-0.5">
            {/* MRP and Strikethrough Regular */}
            <div className="flex flex-wrap items-center gap-2 text-xs">
              {product.mrp && product.mrp > basePrice && (
                <span className={`${compact ? 'text-[10px]' : 'text-xs'} text-rose-500/90 dark:text-rose-400/90 line-through font-mono font-semibold`}>
                  MRP: {formatPrice(product.mrp)}
                </span>
              )}
              {hasOffer && !compact && (
                <span className="text-xs text-gray-400 line-through font-mono">
                  Regular: {formatPrice(product.selling_price)}
                </span>
              )}
            </div>

            {/* Our / Offer Price with large font and high-contrast color */}
            <div className="flex items-baseline justify-between gap-1">
              <div className="flex items-baseline gap-1.5">
                <span className={`${compact ? 'text-[10px]' : 'text-xs'} font-bold text-gray-500 dark:text-emerald-300 uppercase tracking-tight`}>
                  {hasOffer ? 'Offer:' : 'Our:'}
                </span>
                <span className={`${compact ? 'text-base sm:text-lg' : 'text-xl sm:text-2xl'} font-black font-sans ${hasOffer ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-800 dark:text-amber-400'}`}>
                  {formatPrice(basePrice)}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Card Action Controls: Add to Cart OR Interactive Quantity Selector */}
        <div className={`${compact ? 'pt-1.5' : 'pt-2'} flex items-center justify-between gap-1.5`}>
          {!compact && (
            <Link
              to={`/products/${product.id}`}
              className="hidden sm:flex text-xs font-bold text-emerald-700 dark:text-emerald-300 hover:text-emerald-900 dark:hover:text-amber-300 hover:underline items-center gap-0.5 transition-colors"
            >
              <span>Details</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          )}

          {isInCart ? (
            /* Interactive In-Card Quantity Buttons */
            <div className={`flex items-center bg-emerald-700 dark:bg-emerald-800 text-white ${compact ? 'rounded-lg w-full justify-between' : 'rounded-xl w-full sm:w-auto justify-between'} shadow-md border border-emerald-600 overflow-hidden`}>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  updateQuantity(product.id, (cartItem?.quantity || 1) - 1);
                }}
                className={`${compact ? 'px-2 py-1' : 'px-2.5 py-1.5'} hover:bg-emerald-800 dark:hover:bg-emerald-700 text-white font-black text-sm transition-colors active:scale-90 cursor-pointer`}
                title="Decrease quantity"
              >
                <Minus className="w-3.5 h-3.5" />
              </button>
              
              <span className={`${compact ? 'px-1' : 'px-2.5'} py-1 font-mono font-black text-xs text-amber-300 min-w-[20px] text-center select-none`}>
                {cartItem?.quantity}
              </span>

              <button
                type="button"
                disabled={isOutOfStock}
                onClick={(e) => {
                  e.stopPropagation();
                  updateQuantity(product.id, (cartItem?.quantity || 0) + 1);
                }}
                className={`${compact ? 'px-2 py-1' : 'px-2.5 py-1.5'} hover:bg-emerald-800 dark:hover:bg-emerald-700 text-white font-black text-sm transition-colors active:scale-90 disabled:opacity-50 cursor-pointer`}
                title="Increase quantity"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            /* Initial Add to Cart Button with Micro-Animation */
            <button
              type="button"
              disabled={isOutOfStock}
              onClick={handleAddToCart}
              className={`flex items-center justify-center gap-1.5 ${compact ? 'w-full px-2.5 py-1.5 text-xs rounded-lg' : 'w-full sm:w-auto px-3.5 py-2 text-xs rounded-xl'} ${
                isAdding 
                  ? 'bg-amber-500 text-stone-950 scale-105 shadow-lg' 
                  : 'bg-emerald-700 hover:bg-emerald-800 text-white'
              } active:scale-95 font-bold shadow-md transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer`}
              title={isOutOfStock ? 'Item currently out of stock' : 'Add to cart'}
            >
              {isAdding ? (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-950 animate-bounce" />
                  <span>Added!</span>
                </>
              ) : (
                <>
                  <ShoppingBag className="w-3.5 h-3.5 text-amber-300" />
                  <span>{isOutOfStock ? 'Sold Out' : '+ Add'}</span>
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProductCard;
