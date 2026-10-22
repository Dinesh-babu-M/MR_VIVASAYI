import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ShoppingBag, Eye, ChevronLeft, ChevronRight, 
  Play, Pause, Check, Leaf, Sparkles
} from 'lucide-react';
import { formatPrice } from '../../lib/utils';
import { useCart } from '../../contexts/CartContext';
import type { Product, Category } from '../../types';

export interface HeroCarouselItem {
  id: string;
  name: string;
  tamil_name: string;
  tagline: string;
  category_name: string;
  pack_size: string;
  unit: string;
  selling_price: number;
  mrp: number;
  image_url: string;
  is_organic: boolean;
  festival_offer?: string;
  stock_status: string;
  originalProduct?: Product;
}

const FALLBACK_HERO_ITEMS: HeroCarouselItem[] = [
  {
    id: 'prod-hero-1',
    name: 'Mapillai Samba Rice',
    tamil_name: 'மாப்பிள்ளை சம்பா அரிசி',
    tagline: 'Traditional Immunity & Stamina Native Red Rice',
    category_name: 'Heritage Rice',
    pack_size: '1 kg',
    unit: 'kg',
    selling_price: 140,
    mrp: 180,
    image_url: 'https://images.unsplash.com/photo-1586201375761-83865001e31c?auto=format&fit=crop&w=800&q=80',
    is_organic: true,
    festival_offer: 'Traditional Harvest',
    stock_status: 'IN_STOCK'
  },
  {
    id: 'prod-hero-2',
    name: 'Wood Pressed Sesame Oil',
    tamil_name: 'மரச்செக்கு நல்லெண்ணெய்',
    tagline: 'Vaagai Wood Cold-Pressed with Pure Palm Jaggery',
    category_name: 'Cold-Pressed Oils',
    pack_size: '1 L',
    unit: 'L',
    selling_price: 380,
    mrp: 450,
    image_url: 'https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?auto=format&fit=crop&w=800&q=80',
    is_organic: true,
    festival_offer: 'Cold-Pressed Raw',
    stock_status: 'IN_STOCK'
  },
  {
    id: 'prod-hero-3',
    name: 'Karuppu Kavuni Black Rice',
    tamil_name: 'கருப்பு கவுனி அரிசி',
    tagline: 'Ancient Forbidden Emperor Rice Packed with Anthocyanins',
    category_name: 'Heritage Rice',
    pack_size: '1 kg',
    unit: 'kg',
    selling_price: 190,
    mrp: 240,
    image_url: 'https://images.unsplash.com/photo-1627483262268-9c2b5b2834b5?auto=format&fit=crop&w=800&q=80',
    is_organic: true,
    festival_offer: 'Ancient Superfood',
    stock_status: 'IN_STOCK'
  },
  {
    id: 'prod-hero-4',
    name: 'Pure Wild Forest Honey',
    tamil_name: 'நாட்டு மலைத்தேன்',
    tagline: 'Raw Unheated Honey Collected from Western Ghats Sanctuaries',
    category_name: 'Wild Forest Honey',
    pack_size: '500 g',
    unit: 'g',
    selling_price: 420,
    mrp: 490,
    image_url: 'https://images.unsplash.com/photo-1587049352846-4a222e784d38?auto=format&fit=crop&w=800&q=80',
    is_organic: true,
    festival_offer: 'Raw Tribal Harvest',
    stock_status: 'IN_STOCK'
  },
  {
    id: 'prod-hero-5',
    name: 'Traditional A2 Desi Cow Ghee',
    tamil_name: 'நாட்டுப்பசு நெய்',
    tagline: 'Bilona Churned Curd Ghee from Kangayam Native Cows',
    category_name: 'Country Dairy',
    pack_size: '500 ml',
    unit: 'ml',
    selling_price: 650,
    mrp: 750,
    image_url: 'https://images.unsplash.com/photo-1631451095765-2c91616fc9e6?auto=format&fit=crop&w=800&q=80',
    is_organic: true,
    festival_offer: 'A2 Native Grass-Fed',
    stock_status: 'IN_STOCK'
  }
];

interface HeroProductCarousel3DProps {
  products: Product[];
  categories?: Category[];
  onQuickView?: (product: Product) => void;
}

export const HeroProductCarousel3D: React.FC<HeroProductCarousel3DProps> = ({
  products,
  categories = [],
  onQuickView
}) => {
  const navigate = useNavigate();
  const { addItem } = useCart();

  // Combine database products with curated fallback items
  const items: HeroCarouselItem[] = React.useMemo(() => {
    if (!products || products.length === 0) {
      return FALLBACK_HERO_ITEMS;
    }

    const visibleProducts = products.filter(p => p.is_visible !== false);
    const featured = visibleProducts.filter(p => p.is_featured);
    const pool = featured.length >= 3 ? featured : visibleProducts;

    const mappedFromDb: HeroCarouselItem[] = pool.slice(0, 6).map((p) => {
      const cat = categories.find(c => c.id === p.category_id);
      return {
        id: p.id,
        name: p.name,
        tamil_name: p.tamil_name || '',
        tagline: p.short_description || p.description?.slice(0, 60) || 'Pure Farm Fresh Produce',
        category_name: cat?.name || 'Traditional Harvest',
        pack_size: p.pack_size || '1 kg',
        unit: p.unit || 'kg',
        selling_price: p.offer_price || p.selling_price || 140,
        mrp: p.mrp || p.selling_price * 1.25,
        image_url: p.image_url || FALLBACK_HERO_ITEMS[0].image_url,
        is_organic: Boolean(p.is_organic),
        festival_offer: p.festival_offer || (p.is_featured ? 'Featured Harvest' : undefined),
        stock_status: p.stock_status || 'IN_STOCK',
        originalProduct: p
      };
    });

    if (mappedFromDb.length < 3) {
      const remainingFallbacks = FALLBACK_HERO_ITEMS.slice(mappedFromDb.length);
      return [...mappedFromDb, ...remainingFallbacks];
    }

    return mappedFromDb;
  }, [products, categories]);

  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const [isHovered, setIsHovered] = useState(false);
  const [addedItemState, setAddedItemState] = useState<{ [key: string]: boolean }>({});

  // Subtle interactive 3D hover physics (gentle and attractive, never disorienting)
  const cardContainerRef = useRef<HTMLDivElement>(null);
  const [tilt, setTilt] = useState({
    rotateX: 0,
    rotateY: 0,
    shineX: 50,
    shineY: 50
  });

  // Touch swipe support for mobile
  const touchStartXRef = useRef<number | null>(null);

  const total = items.length;
  const currentItem = items[currentIndex] || items[0];

  // Auto-scroll every 1 second (1000ms), paused on hover or touch
  useEffect(() => {
    if (!isPlaying || isHovered || total <= 1) return;

    const timer = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % total);
    }, 1000); // Exactly 1 second per user request

    return () => clearInterval(timer);
  }, [isPlaying, isHovered, total]);

  const goToNext = useCallback(() => {
    setCurrentIndex((prev) => (prev + 1) % total);
  }, [total]);

  const goToPrev = useCallback(() => {
    setCurrentIndex((prev) => (prev - 1 + total) % total);
  }, [total]);

  // Gentle, attractive 3D cursor tilt (max 8 deg for clean readability)
  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!cardContainerRef.current) return;
    const rect = cardContainerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const centerX = rect.width / 2;
    const centerY = rect.height / 2;

    // Gentle 3D tilt: max 8 degrees
    const rotateX = ((y - centerY) / centerY) * -8;
    const rotateY = ((x - centerX) / centerX) * 8;

    const shineX = (x / rect.width) * 100;
    const shineY = (y / rect.height) * 100;

    setTilt({ rotateX, rotateY, shineX, shineY });
    setIsHovered(true);
  };

  const handleMouseEnter = () => {
    setIsHovered(true);
  };

  const handleMouseLeave = () => {
    setTilt({ rotateX: 0, rotateY: 0, shineX: 50, shineY: 50 });
    setIsHovered(false);
  };

  // Mobile Touch handlers
  const handleTouchStart = (e: React.TouchEvent) => {
    setIsHovered(true); // Pause on touch
    touchStartXRef.current = e.touches[0].clientX;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    setIsHovered(false);
    if (touchStartXRef.current === null) return;
    const diff = e.changedTouches[0].clientX - touchStartXRef.current;
    if (Math.abs(diff) > 35) {
      if (diff > 0) goToPrev();
      else goToNext();
    }
    touchStartXRef.current = null;
  };

  // Add to cart with visual confirmation
  const handleAddToCart = (e: React.MouseEvent, item: HeroCarouselItem) => {
    e.stopPropagation();
    
    let prodToAdd: Product = item.originalProduct || products.find(p => p.id === item.id) || {
      id: item.id,
      sku: `HERO-${item.id}`,
      name: item.name,
      tamil_name: item.tamil_name,
      slug: item.id,
      category_id: '',
      purchase_price: item.selling_price * 0.7,
      landed_cost: item.selling_price * 0.75,
      mrp: item.mrp,
      selling_price: item.selling_price,
      unit: item.unit,
      pack_size: item.pack_size,
      reorder_level: 10,
      opening_stock: 50,
      current_stock: 50,
      stock_status: 'IN_STOCK',
      is_featured: true,
      is_visible: true,
      image_url: item.image_url,
      is_organic: item.is_organic,
      tax_percent: 5,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    addItem(prodToAdd);
    setAddedItemState(prev => ({ ...prev, [item.id]: true }));
    setTimeout(() => {
      setAddedItemState(prev => ({ ...prev, [item.id]: false }));
    }, 1500);
  };

  // Quick view trigger
  const handleQuickView = (e: React.MouseEvent, item: HeroCarouselItem) => {
    e.stopPropagation();
    if (onQuickView) {
      const prod = item.originalProduct || products.find(p => p.id === item.id);
      if (prod) {
        onQuickView(prod);
        return;
      }
    }
    navigate(`/products?search=${encodeURIComponent(item.name)}`);
  };

  const discountPercent = currentItem.mrp > currentItem.selling_price
    ? Math.round(((currentItem.mrp - currentItem.selling_price) / currentItem.mrp) * 100)
    : 0;

  // Previous and Next indices for Desktop 3D peek previews
  const prevIndex = (currentIndex - 1 + total) % total;
  const nextIndex = (currentIndex + 1) % total;
  const prevItem = items[prevIndex];
  const nextItem = items[nextIndex];

  return (
    <div className="relative w-full max-w-[340px] xs:max-w-[380px] sm:max-w-md lg:max-w-none mx-auto select-none">
      
      {/* 3D Stage Container (Mobile-responsive height & compact padding) */}
      <div 
        className="relative perspective-1200 preserve-3d py-2 sm:py-4"
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        
        {/* Soft Radial Ambient Aura Glow */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="w-[105%] h-[105%] rounded-full bg-gradient-to-tr from-amber-400/25 via-emerald-500/15 to-teal-400/20 blur-2xl pointer-events-none" />
        </div>

        {/* Desktop Previous Slide Peek (Hidden on Mobile) */}
        {total > 1 && prevItem && (
          <div
            onClick={goToPrev}
            style={{
              transform: 'translateX(-36%) translateZ(-70px) rotateY(22deg) scale(0.85)',
              transformOrigin: 'right center'
            }}
            className="absolute top-4 bottom-4 left-0 w-full rounded-2xl overflow-hidden opacity-25 hover:opacity-60 transition-all duration-400 cursor-pointer pointer-events-auto border-2 border-amber-400/20 shadow-xl backdrop-blur-xs z-0 hidden lg:block"
            title={`Previous: ${prevItem.name}`}
          >
            <img 
              src={prevItem.image_url} 
              alt={prevItem.name} 
              className="w-full h-full object-cover filter brightness-70"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-emerald-950/90 to-transparent" />
          </div>
        )}

        {/* Desktop Next Slide Peek (Hidden on Mobile) */}
        {total > 1 && nextItem && (
          <div
            onClick={goToNext}
            style={{
              transform: 'translateX(36%) translateZ(-70px) rotateY(-22deg) scale(0.85)',
              transformOrigin: 'left center'
            }}
            className="absolute top-4 bottom-4 right-0 w-full rounded-2xl overflow-hidden opacity-25 hover:opacity-60 transition-all duration-400 cursor-pointer pointer-events-auto border-2 border-amber-400/20 shadow-xl backdrop-blur-xs z-0 hidden lg:block"
            title={`Next: ${nextItem.name}`}
          >
            <img 
              src={nextItem.image_url} 
              alt={nextItem.name} 
              className="w-full h-full object-cover filter brightness-70"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-emerald-950/90 to-transparent" />
          </div>
        )}

        {/* 3D Contact Shadow */}
        <div 
          className="absolute bottom-1 left-1/2 -translate-x-1/2 w-4/5 h-6 sm:h-8 bg-black/50 rounded-[100%] blur-lg pointer-events-none z-0"
        />

        {/* =========================================================
            ACTIVE USER-ATTRACTIVE 3D PRODUCT CARD
            Mobile height: 260px (mobile) -> 350px (tablet) -> 420px (desktop)
            ========================================================= */}
        <div
          ref={cardContainerRef}
          onMouseMove={handleMouseMove}
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
          style={{
            transform: isHovered
              ? `rotateX(${tilt.rotateX}deg) rotateY(${tilt.rotateY}deg) translateY(-4px) scale3d(1.015, 1.015, 1.015)`
              : 'rotateX(0deg) rotateY(0deg) translateY(0px) scale3d(1, 1, 1)',
            transition: isHovered ? 'transform 0.08s ease-out' : 'transform 0.4s ease-out',
          }}
          className="relative z-10 mx-auto w-full rounded-2xl sm:rounded-3xl overflow-hidden border-2 sm:border-3 border-amber-400/40 shadow-xl hover:shadow-2xl hover:border-amber-400/80 transition-shadow duration-300 preserve-3d cursor-pointer bg-emerald-950"
          onClick={() => {
            if (currentItem.originalProduct) {
              navigate(`/products/${currentItem.originalProduct.id}`);
            } else {
              navigate(`/products?search=${encodeURIComponent(currentItem.name)}`);
            }
          }}
        >
          {/* Product Image Stage (Compact on mobile) */}
          <div className="relative h-[260px] xs:h-[290px] sm:h-[350px] md:h-[390px] lg:h-[420px] w-full overflow-hidden">
            <img
              key={currentItem.id}
              src={currentItem.image_url}
              alt={currentItem.name}
              className="w-full h-full object-cover transition-all duration-400 ease-out hover:scale-105 animate-fadeIn"
            />

            {/* Gradient Scrim & Vignette */}
            <div className="absolute inset-0 bg-gradient-to-t from-emerald-950 via-emerald-950/25 to-transparent opacity-90" />

            {/* Gentle Light Sheen overlay */}
            <div 
              style={{
                background: isHovered
                  ? `radial-gradient(circle at ${tilt.shineX}% ${tilt.shineY}%, rgba(255,255,255,0.2) 0%, transparent 65%)`
                  : undefined,
              }}
              className="absolute inset-0 pointer-events-none"
            />

            {/* Diagonal shimmer glint */}
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full animate-sheen-shine pointer-events-none" />
          </div>

          {/* =========================================================
              CLEAN TOP BADGES (Organic / Harvest Tag ONLY - No Lab Tested pill)
              ========================================================= */}
          <div className="absolute top-2.5 left-2.5 sm:top-3 sm:left-3 z-20 flex flex-wrap gap-1 sm:gap-1.5 pointer-events-auto">
            {currentItem.festival_offer && (
              <span className="bg-gradient-to-r from-amber-500 to-amber-600 text-emerald-950 text-[9px] sm:text-[11px] font-black px-2 sm:px-2.5 py-0.5 rounded-full shadow-md border border-amber-300 flex items-center gap-1">
                <Sparkles className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                <span>{currentItem.festival_offer}</span>
              </span>
            )}
            {currentItem.is_organic && (
              <span className="bg-emerald-800/90 text-amber-300 text-[9px] sm:text-[10px] font-bold px-2 py-0.5 rounded-full shadow-md border border-emerald-500/40 flex items-center gap-1 backdrop-blur-xs">
                <Leaf className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-emerald-300" />
                <span>Organic Farm</span>
              </span>
            )}
          </div>

          {/* Top-Right: Savings Tag */}
          {discountPercent > 0 && (
            <div className="absolute top-2.5 right-2.5 sm:top-3 sm:right-3 z-20 pointer-events-auto">
              <span className="bg-rose-600 text-white font-black text-[10px] sm:text-xs px-2 py-0.5 rounded-lg shadow-md border border-rose-400/40">
                {discountPercent}% OFF
              </span>
            </div>
          )}

          {/* =========================================================
              CLEAN FLOATING BOTTOM PRODUCT CARD (Mobile Compact Sizing)
              ========================================================= */}
          <div 
            className="absolute bottom-2.5 left-2.5 right-2.5 sm:bottom-3.5 sm:left-3.5 sm:right-3.5 z-20 bg-white/95 dark:bg-emerald-950/95 backdrop-blur-md p-2.5 sm:p-4 rounded-xl sm:rounded-2xl shadow-xl border border-emerald-500/30 text-gray-900 dark:text-emerald-100 flex flex-col xs:flex-row xs:items-center justify-between gap-2 pointer-events-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Product Meta */}
            <div className="space-y-0.5 min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="text-[9px] sm:text-[10px] font-extrabold uppercase tracking-wider text-emerald-700 dark:text-amber-400 bg-emerald-100 dark:bg-emerald-900/80 px-1.5 py-0.2 rounded">
                  {currentItem.category_name}
                </span>
                <span className="text-[10px] sm:text-[11px] font-semibold text-gray-500 dark:text-emerald-300">
                  {currentItem.pack_size}
                </span>
              </div>

              <h3 className="font-serif font-black text-sm xs:text-base sm:text-lg text-gray-950 dark:text-white leading-tight truncate">
                {currentItem.name}
              </h3>

              {currentItem.tamil_name && (
                <div className="text-[10px] sm:text-xs font-bold text-emerald-700 dark:text-emerald-300 truncate">
                  {currentItem.tamil_name}
                </div>
              )}

              <p className="hidden xs:block text-[11px] text-gray-500 dark:text-emerald-200/80 line-clamp-1 max-w-xs">
                {currentItem.tagline}
              </p>
            </div>

            {/* Price & Action Buttons */}
            <div className="flex items-center xs:flex-col items-end justify-between xs:justify-center gap-1.5 shrink-0 pt-1 xs:pt-0 border-t xs:border-t-0 border-emerald-100 dark:border-emerald-800">
              <div className="text-left xs:text-right">
                <div className="flex items-baseline gap-1">
                  <span className="font-black text-base sm:text-lg text-emerald-800 dark:text-amber-300">
                    {formatPrice(currentItem.selling_price)}
                  </span>
                  <span className="text-[10px] sm:text-xs text-gray-400 font-normal">
                    /{currentItem.unit}
                  </span>
                </div>

                {currentItem.mrp > currentItem.selling_price && (
                  <span className="text-[10px] text-gray-400 line-through">
                    {formatPrice(currentItem.mrp)}
                  </span>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={(e) => handleQuickView(e, currentItem)}
                  className="p-1.5 sm:p-2 bg-emerald-100 dark:bg-emerald-900/80 hover:bg-emerald-200 text-emerald-800 dark:text-emerald-200 rounded-lg sm:rounded-xl transition shadow text-xs"
                  title="Quick View"
                >
                  <Eye className="w-3.5 h-3.5" />
                </button>

                <button
                  type="button"
                  onClick={(e) => handleAddToCart(e, currentItem)}
                  className={`px-2.5 py-1 sm:px-3.5 sm:py-1.5 rounded-lg sm:rounded-xl text-[11px] sm:text-xs font-black shadow-md transition-all transform active:scale-95 flex items-center gap-1 ${
                    addedItemState[currentItem.id]
                      ? 'bg-emerald-600 text-white'
                      : 'bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-emerald-950'
                  }`}
                >
                  {addedItemState[currentItem.id] ? (
                    <>
                      <Check className="w-3.5 h-3.5 stroke-[3]" />
                      <span>Added!</span>
                    </>
                  ) : (
                    <>
                      <ShoppingBag className="w-3 h-3 text-emerald-950" />
                      <span>+ Add</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* Quick Left / Right Arrows (Compact on mobile) */}
          {total > 1 && (
            <>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  goToPrev();
                }}
                className="absolute left-2 top-1/2 -translate-y-1/2 w-7 h-7 sm:w-9 sm:h-9 rounded-full bg-emerald-950/70 hover:bg-amber-400 hover:text-emerald-950 text-white backdrop-blur-xs border border-white/20 shadow-md flex items-center justify-center transition-all z-30"
                title="Previous"
              >
                <ChevronLeft className="w-4 h-4 sm:w-5 sm:h-5" />
              </button>

              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  goToNext();
                }}
                className="absolute right-2 top-1/2 -translate-y-1/2 w-7 h-7 sm:w-9 sm:h-9 rounded-full bg-emerald-950/70 hover:bg-amber-400 hover:text-emerald-950 text-white backdrop-blur-xs border border-white/20 shadow-md flex items-center justify-center transition-all z-30"
                title="Next"
              >
                <ChevronRight className="w-4 h-4 sm:w-5 sm:h-5" />
              </button>
            </>
          )}

        </div>

      </div>

      {/* =========================================================
          SLICK CAROUSEL BOTTOM CONTROLS & AUTO-SCROLL INDICATOR
          Every 1 second smooth progression
          ========================================================= */}
      <div className="mt-2.5 flex items-center justify-between gap-2 px-1">
        
        {/* Animated Slide Dots */}
        <div className="flex items-center gap-1.5">
          {items.map((item, idx) => (
            <button
              key={item.id}
              onClick={() => setCurrentIndex(idx)}
              className={`transition-all duration-300 rounded-full ${
                idx === currentIndex
                  ? 'w-5 sm:w-6 h-1.5 sm:h-2 bg-amber-400 shadow-sm'
                  : 'w-1.5 sm:w-2 h-1.5 sm:h-2 bg-emerald-700/60 hover:bg-emerald-500'
              }`}
              title={item.name}
            />
          ))}
          <span className="text-[10px] sm:text-xs font-bold text-emerald-200 ml-1.5">
            {currentIndex + 1}/{total}
          </span>
        </div>

        {/* Play/Pause Toggle button (Clean & Minimal) */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setIsPlaying(!isPlaying)}
            className="flex items-center gap-1 px-2.5 py-1 bg-emerald-900/80 hover:bg-emerald-800 text-amber-300 rounded-lg text-[10px] sm:text-xs font-bold border border-emerald-700/60 transition shadow-xs"
            title={isPlaying ? 'Pause 1s Auto-Rotation' : 'Resume 1s Auto-Rotation'}
          >
            {isPlaying ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}
            <span className="hidden xs:inline">{isPlaying ? '1s Live Auto' : 'Paused'}</span>
          </button>
        </div>

      </div>

    </div>
  );
};

export default HeroProductCarousel3D;
