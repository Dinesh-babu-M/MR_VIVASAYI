import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ChevronLeft, ChevronRight, ShoppingBag, Eye, Leaf, 
  Sparkles, Check, CheckCircle2, AlertCircle, Award
} from 'lucide-react';
import { formatPrice } from '../../lib/utils';
import { useCart } from '../../contexts/CartContext';
import type { Product, Category } from '../../types';

interface ProductCoverflow3DProps {
  products: Product[];
  categories?: Category[];
  onQuickView?: (product: Product) => void;
}

export const ProductCoverflow3D: React.FC<ProductCoverflow3DProps> = ({
  products,
  categories = [],
  onQuickView
}) => {
  const navigate = useNavigate();
  const { addItem, getItem } = useCart();
  const [activeIndex, setActiveIndex] = useState(0);
  const [addedItemState, setAddedItemState] = useState<{ [key: string]: boolean }>({});
  const [isMobile, setIsMobile] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 640);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);
  
  // Touch swipe support
  const touchStartXRef = useRef<number | null>(null);

  const displayProducts = products.filter(p => p.is_visible !== false);
  const total = displayProducts.length;

  // Auto-scroll when total is valid (every 3s, paused when hovered)
  useEffect(() => {
    if (isHovered || total <= 1) return;
    const timer = setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % total);
    }, 3000);
    return () => clearInterval(timer);
  }, [isHovered, total]);

  const goToNext = useCallback(() => {
    setActiveIndex((prev) => (prev + 1) % total);
  }, [total]);

  const goToPrev = useCallback(() => {
    setActiveIndex((prev) => (prev - 1 + total) % total);
  }, [total]);

  // Touch handlers
  const handleTouchStart = (e: React.TouchEvent) => {
    setIsHovered(true);
    touchStartXRef.current = e.touches[0].clientX;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    setIsHovered(false);
    if (touchStartXRef.current === null) return;
    const diff = e.changedTouches[0].clientX - touchStartXRef.current;
    if (Math.abs(diff) > 40) {
      if (diff > 0) goToPrev();
      else goToNext();
    }
    touchStartXRef.current = null;
  };

  if (total === 0) return null;

  return (
    <div 
      className="relative w-full py-4 sm:py-8 overflow-hidden select-none"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {/* 3D Perspective Stage */}
      <div className="relative min-h-[380px] sm:min-h-[450px] flex items-center justify-center perspective-1500 preserve-3d">
        
        {/* Soft Ambient Radial Backdrop */}
        <div className="absolute inset-0 bg-radial-gradient pointer-events-none blur-3xl opacity-30" />

        {/* 3D Cards Stack */}
        <div className="relative w-full max-w-sm h-[380px] sm:h-[430px] flex items-center justify-center preserve-3d">
          {displayProducts.map((product, index) => {
            // Calculate relative offset from active index
            let offset = index - activeIndex;
            // Handle wrap-around for nearest visual distance
            if (offset > total / 2) offset -= total;
            if (offset < -total / 2) offset += total;

            const isCenter = offset === 0;
            const isVisible = Math.abs(offset) <= (isMobile ? 1 : 2); // Show active + 1 on mobile, + 2 on desktop

            if (!isVisible) return null;

            // 3D positioning metrics
            const translateX = offset * (isMobile ? 130 : 210); // Horizontal spread
            const translateZ = -Math.abs(offset) * (isMobile ? 65 : 110); // Recede in 3D depth
            const rotateY = offset * (isMobile ? -18 : -26); // 3D Angled tilt towards center
            const scale = Math.max(0.75, 1 - Math.abs(offset) * 0.12);
            const opacity = Math.max(0.35, 1 - Math.abs(offset) * 0.32);
            const zIndex = 20 - Math.abs(offset);

            const cat = categories.find(c => c.id === product.category_id);
            const basePrice = product.offer_price || product.selling_price;
            const hasOffer = Boolean(product.offer_price && product.offer_price > 0 && product.offer_price < product.selling_price);
            const discountPercent = product.mrp && product.mrp > basePrice
              ? Math.round(((product.mrp - basePrice) / product.mrp) * 100)
              : 0;

            const isOutOfStock = product.current_stock <= 0;

            return (
              <div
                key={product.id}
                onClick={() => {
                  if (isCenter) {
                    navigate(`/products/${product.id}`);
                  } else {
                    setActiveIndex(index);
                  }
                }}
                style={{
                  transform: `translateX(${translateX}px) translateZ(${translateZ}px) rotateY(${rotateY}deg) scale(${scale})`,
                  opacity,
                  zIndex,
                  transition: 'all 0.45s cubic-bezier(0.25, 1, 0.5, 1)',
                  transformOrigin: 'center center'
                }}
                className={`absolute w-64 xs:w-72 sm:w-80 h-[370px] sm:h-[410px] rounded-2xl sm:rounded-3xl overflow-hidden cursor-pointer preserve-3d border-2 transition-shadow duration-300 ${
                  isCenter
                    ? 'border-amber-400 shadow-[0_15px_40px_rgba(27,77,62,0.3)] dark:shadow-[0_15px_40px_rgba(0,0,0,0.6)] bg-white dark:bg-emerald-950'
                    : 'border-emerald-200/60 dark:border-emerald-800/60 shadow-md bg-white/90 dark:bg-emerald-950/80 backdrop-blur-xs hover:opacity-90'
                }`}
              >
                {/* Product Image */}
                <div className="relative h-44 sm:h-52 w-full overflow-hidden bg-emerald-50 dark:bg-emerald-900">
                  <img
                    src={product.image_url || 'https://images.unsplash.com/photo-1586201375761-83865001e31c?auto=format&fit=crop&w=600&q=80'}
                    alt={product.name}
                    className="w-full h-full object-cover transition-transform duration-500 hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-60" />

                  {/* Top Badges */}
                  <div className="absolute top-2.5 left-2.5 sm:top-3 sm:left-3 flex flex-col gap-1 z-10">
                    {product.is_organic && (
                      <span className="bg-emerald-700/95 text-white text-[9px] sm:text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 shadow-md border border-emerald-400/40">
                        <Leaf className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-emerald-300" />
                        <span>Organic</span>
                      </span>
                    )}
                    {product.is_featured && (
                      <span className="bg-amber-400 text-emerald-950 text-[9px] sm:text-[10px] font-black px-2 py-0.5 rounded-full flex items-center gap-1 shadow-md border border-amber-300">
                        <Sparkles className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                        <span>Bestseller</span>
                      </span>
                    )}
                  </div>

                  {discountPercent > 0 && (
                    <div className="absolute top-2.5 right-2.5 sm:top-3 sm:right-3 bg-amber-400 text-emerald-950 font-black text-[10px] sm:text-[11px] px-2 py-0.5 rounded-md shadow-md border border-amber-300">
                      {discountPercent}% OFF
                    </div>
                  )}

                  {/* Stock tag */}
                  <div className="absolute bottom-2 left-2.5 sm:left-3">
                    {isOutOfStock ? (
                      <span className="text-[9px] sm:text-[10px] font-bold px-2 py-0.5 bg-rose-600/90 text-white rounded-full">
                        Out of Stock
                      </span>
                    ) : (
                      <span className="text-[9px] sm:text-[10px] font-bold px-2 py-0.5 bg-emerald-700/90 text-white rounded-full flex items-center gap-1">
                        <CheckCircle2 className="w-2.5 h-2.5 text-emerald-300" /> In Stock
                      </span>
                    )}
                  </div>
                </div>

                {/* Card Content */}
                <div className="p-3 sm:p-4 flex flex-col justify-between h-[190px] sm:h-[200px]">
                  <div>
                    <span className="text-[9px] sm:text-[10px] font-black uppercase tracking-wider text-emerald-700 dark:text-amber-400">
                      {cat?.name || 'Traditional Harvest'}
                    </span>
                    <h3 className="font-serif font-black text-sm sm:text-base text-gray-900 dark:text-white line-clamp-1 mt-0.5">
                      {product.name}
                    </h3>
                    {product.tamil_name && (
                      <p className="text-[11px] sm:text-xs font-semibold text-emerald-600 dark:text-emerald-300 line-clamp-1">
                        {product.tamil_name}
                      </p>
                    )}
                    <p className="text-[11px] sm:text-xs text-gray-500 dark:text-gray-400 line-clamp-1 sm:line-clamp-2 mt-0.5">
                      {product.short_description || product.description || 'Pure traditional harvest direct from Tamil Nadu farmers.'}
                    </p>
                  </div>

                  {/* Bottom Price & Button */}
                  <div className="pt-2 border-t border-emerald-100 dark:border-emerald-800 flex items-center justify-between">
                    <div>
                      <div className="font-extrabold text-sm sm:text-base text-emerald-800 dark:text-amber-300">
                        {formatPrice(basePrice)}
                        <span className="text-[10px] sm:text-xs text-gray-400 font-normal ml-0.5">/{product.unit || 'kg'}</span>
                      </div>
                      {product.mrp && product.mrp > basePrice && (
                        <span className="text-[10px] sm:text-xs text-gray-400 line-through">
                          {formatPrice(product.mrp)}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-1.5">
                      {onQuickView && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onQuickView(product);
                          }}
                          className="p-1.5 sm:p-2 bg-emerald-50 dark:bg-emerald-900/60 hover:bg-emerald-100 text-emerald-800 dark:text-emerald-200 rounded-lg sm:rounded-xl transition"
                          title="Quick View"
                        >
                          <Eye className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          addItem(product);
                          setAddedItemState(prev => ({ ...prev, [product.id]: true }));
                          setTimeout(() => {
                            setAddedItemState(prev => ({ ...prev, [product.id]: false }));
                          }, 1500);
                        }}
                        className={`px-2.5 py-1 sm:px-3 sm:py-1.5 rounded-lg sm:rounded-xl text-[11px] sm:text-xs font-bold shadow-md transition-all flex items-center gap-1 ${
                          addedItemState[product.id]
                            ? 'bg-emerald-600 text-white'
                            : 'bg-emerald-700 hover:bg-emerald-800 text-white dark:bg-amber-400 dark:text-emerald-950 dark:hover:bg-amber-300'
                        }`}
                      >
                        {addedItemState[product.id] ? (
                          <>
                            <Check className="w-3 h-3 stroke-[3]" />
                            <span>Added</span>
                          </>
                        ) : (
                          <>
                            <ShoppingBag className="w-3 h-3" />
                            <span>+ Add</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </div>

              </div>
            );
          })}
        </div>

      </div>

      {/* 3D Navigation Controls */}
      <div className="flex items-center justify-center gap-4 mt-2 sm:mt-4">
        <button
          type="button"
          onClick={goToPrev}
          className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-white dark:bg-emerald-900 text-gray-800 dark:text-emerald-200 hover:bg-amber-400 hover:text-emerald-950 shadow-md border border-emerald-200 dark:border-emerald-700 flex items-center justify-center transition"
          title="Previous Product"
        >
          <ChevronLeft className="w-4 h-4 sm:w-5 sm:h-5" />
        </button>

        {/* Dots */}
        <div className="flex items-center gap-1.5">
          {displayProducts.map((p, idx) => (
            <button
              key={p.id}
              onClick={() => setActiveIndex(idx)}
              className={`transition-all rounded-full ${
                idx === activeIndex
                  ? 'w-5 sm:w-6 h-1.5 sm:h-2 bg-amber-400'
                  : 'w-1.5 sm:w-2 h-1.5 sm:h-2 bg-gray-300 dark:bg-emerald-800 hover:bg-emerald-600'
              }`}
              title={p.name}
            />
          ))}
        </div>

        <button
          type="button"
          onClick={goToNext}
          className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-white dark:bg-emerald-900 text-gray-800 dark:text-emerald-200 hover:bg-amber-400 hover:text-emerald-950 shadow-md border border-emerald-200 dark:border-emerald-700 flex items-center justify-center transition"
          title="Next Product"
        >
          <ChevronRight className="w-4 h-4 sm:w-5 sm:h-5" />
        </button>
      </div>

    </div>
  );
};

export default ProductCoverflow3D;
