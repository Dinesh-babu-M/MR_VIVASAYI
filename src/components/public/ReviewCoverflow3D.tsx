import React, { useState, useRef, useEffect, useCallback } from 'react';
import { 
  ChevronLeft, ChevronRight, Star, Sparkles, CheckCircle2, 
  Quote, MapPin, Eye, X, MessageSquare, Package, Clock, ShieldCheck, Heart
} from 'lucide-react';
import type { Review, Product } from '../../types';

interface ReviewCoverflow3DProps {
  reviews: Review[];
  products?: Product[];
  onViewPhoto?: (url: string) => void;
}

// Relative time helper
function formatRelativeTime(dateString?: string): string {
  if (!dateString) return 'Recent purchase';
  try {
    const d = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMins < 5) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 30) return `${diffDays}d ago`;
    return d.toLocaleDateString('en-IN', { month: 'short', day: 'numeric' });
  } catch {
    return 'Recent purchase';
  }
}

export const ReviewCoverflow3D: React.FC<ReviewCoverflow3DProps> = ({
  reviews,
  products = [],
  onViewPhoto
}) => {
  const [activeIndex, setActiveIndex] = useState(0);
  const [windowWidth, setWindowWidth] = useState(typeof window !== 'undefined' ? window.innerWidth : 1024);
  const [isHovered, setIsHovered] = useState(false);
  const [previewPhoto, setPreviewPhoto] = useState<{ url: string; title?: string; author?: string } | null>(null);

  useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const isNarrow = windowWidth < 420;
  const isMobile = windowWidth < 640;
  const isTablet = windowWidth >= 640 && windowWidth < 1024;

  const touchStartXRef = useRef<number | null>(null);

  // Filter approved or active reviews
  const displayReviews = reviews.filter(r => r.status === 'APPROVED' || !r.status);
  const total = displayReviews.length;

  // Auto-advance every 3.5s when not hovered
  useEffect(() => {
    if (isHovered || total <= 1) return;
    const timer = setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % total);
    }, 3500);
    return () => clearInterval(timer);
  }, [isHovered, total]);

  const goToNext = useCallback(() => {
    setActiveIndex((prev) => (prev + 1) % total);
  }, [total]);

  const goToPrev = useCallback(() => {
    setActiveIndex((prev) => (prev - 1 + total) % total);
  }, [total]);

  // Touch handlers for mobile swipe
  const handleTouchStart = (e: React.TouchEvent) => {
    setIsHovered(true);
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
      <div className="relative min-h-[440px] sm:min-h-[490px] flex items-center justify-center perspective-1500 preserve-3d">
        
        {/* Soft Ambient Radial Backdrop */}
        <div className="absolute inset-0 bg-radial-gradient pointer-events-none blur-3xl opacity-35" />

        {/* 3D Cards Stack */}
        <div className="relative w-full max-w-sm sm:max-w-md h-[430px] sm:h-[470px] flex items-center justify-center preserve-3d">
          {displayReviews.map((review, index) => {
            // Calculate relative offset from active index
            let offset = index - activeIndex;
            // Handle wrap-around for nearest visual distance
            if (offset > total / 2) offset -= total;
            if (offset < -total / 2) offset += total;

            const isCenter = offset === 0;
            const isVisible = Math.abs(offset) <= (isMobile ? 1 : 2); // Show active + 1 on mobile, + 2 on desktop

            if (!isVisible) return null;

            // Adaptive 3D positioning metrics for mobile, tablet, and desktop
            const translateX = offset * (isNarrow ? 120 : isMobile ? 145 : isTablet ? 200 : 255);
            const translateZ = -Math.abs(offset) * (isMobile ? 65 : 115);
            const rotateY = offset * (isMobile ? -16 : -24);
            const scale = Math.max(0.72, 1 - Math.abs(offset) * 0.12);
            const opacity = Math.max(0.3, 1 - Math.abs(offset) * 0.35);
            const zIndex = 20 - Math.abs(offset);

            // Matched product if any
            const matchedProduct = review.product_id 
              ? products.find(p => p.id === review.product_id) 
              : review.product;

            return (
              <div
                key={review.id}
                onClick={() => {
                  if (!isCenter) {
                    setActiveIndex(index);
                  }
                }}
                style={{
                  transform: `translateX(${translateX}px) translateZ(${translateZ}px) rotateY(${rotateY}deg) scale(${scale})`,
                  opacity,
                  zIndex,
                  filter: isCenter ? 'none' : 'blur(2.5px)',
                  transition: 'all 0.45s cubic-bezier(0.25, 1, 0.5, 1)',
                  transformOrigin: 'center center'
                }}
                className={`absolute w-[280px] xs:w-[310px] sm:w-[380px] h-[420px] sm:h-[455px] rounded-3xl p-5 sm:p-6 overflow-hidden cursor-pointer preserve-3d border-2 transition-all duration-300 flex flex-col justify-between ${
                  isCenter
                    ? 'border-amber-400 shadow-[0_20px_50px_rgba(27,77,62,0.35)] dark:shadow-[0_20px_50px_rgba(0,0,0,0.7)] bg-gradient-to-b from-white via-emerald-50/30 to-amber-50/15 dark:from-emerald-950 dark:via-emerald-900/60 dark:to-emerald-950 ring-2 ring-amber-400/30 blur-none'
                    : 'border-emerald-200/60 dark:border-emerald-800/60 shadow-md bg-white/95 dark:bg-emerald-950/85 backdrop-blur-md blur-[2.5px] hover:blur-[1px] hover:opacity-95'
                }`}
              >
                {/* Decorative 3D Watermark & Corner Sheen */}
                <div className="absolute top-2 right-3 pointer-events-none text-emerald-100 dark:text-emerald-900/40 select-none">
                  <Quote className="w-20 h-20 opacity-30 rotate-12" />
                </div>
                {isCenter && (
                  <div className="absolute top-0 right-0 w-28 h-28 bg-gradient-to-br from-amber-400/10 via-transparent to-transparent pointer-events-none rounded-tr-3xl" />
                )}

                {/* Card Top: Stars, Rating Score, Verified Buyer Badge */}
                <div className="relative z-10 space-y-2.5">
                  <div className="flex items-center justify-between gap-2">
                    {/* Star Rating with glowing effect */}
                    <div className="flex items-center gap-1.5">
                      <div className="flex items-center text-amber-400">
                        {Array.from({ length: 5 }).map((_, i) => (
                          <Star
                            key={i}
                            className={`w-4 h-4 ${
                              i < review.rating 
                                ? 'fill-amber-400 text-amber-400 drop-shadow-[0_1px_3px_rgba(251,191,36,0.5)]' 
                                : 'text-gray-300 dark:text-emerald-800'
                            }`}
                          />
                        ))}
                      </div>
                      <span className="text-xs font-black text-amber-600 dark:text-amber-400">
                        {review.rating}.0
                      </span>
                    </div>

                    {/* Verified Buyer Pill */}
                    {review.is_verified_purchase !== false ? (
                      <span className="bg-emerald-100 dark:bg-emerald-900/90 text-emerald-800 dark:text-emerald-300 text-[10px] font-black px-2.5 py-0.5 rounded-full border border-emerald-300 dark:border-emerald-700 flex items-center gap-1 shadow-xs">
                        <CheckCircle2 className="w-2.5 h-2.5 text-emerald-600 dark:text-emerald-400" />
                        <span>Verified Buyer</span>
                      </span>
                    ) : (
                      <span className="bg-amber-100 dark:bg-amber-950/90 text-amber-800 dark:text-amber-300 text-[10px] font-bold px-2.5 py-0.5 rounded-full border border-amber-300 dark:border-amber-700">
                        Family Review
                      </span>
                    )}
                  </div>

                  {/* Matched Product Tag (if available) */}
                  {matchedProduct && (
                    <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-emerald-50 dark:bg-emerald-900/60 border border-emerald-200 dark:border-emerald-800 text-[11px] font-bold text-emerald-800 dark:text-emerald-200 line-clamp-1 max-w-full">
                      <Package className="w-3 h-3 text-emerald-600 dark:text-amber-400 shrink-0" />
                      <span className="truncate">{matchedProduct.name}</span>
                    </div>
                  )}

                  {/* Review Title */}
                  {review.title && (
                    <h4 className="font-serif font-black text-sm sm:text-base text-gray-900 dark:text-emerald-100 line-clamp-1 leading-snug">
                      &ldquo;{review.title}&rdquo;
                    </h4>
                  )}

                  {/* Customer Attached Photo */}
                  {review.image_url && (
                    <div 
                      onClick={(e) => {
                        e.stopPropagation();
                        if (onViewPhoto) {
                          onViewPhoto(review.image_url!);
                        } else {
                          setPreviewPhoto({
                            url: review.image_url!,
                            title: review.title,
                            author: review.customer_name
                          });
                        }
                      }}
                      className="group/img relative h-24 sm:h-28 w-full rounded-2xl overflow-hidden border border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-900/80 cursor-zoom-in shadow-xs"
                      title="Click to zoom customer photo"
                    >
                      <img
                        src={review.image_url}
                        alt="Customer delivered order"
                        className="w-full h-full object-cover transition-transform duration-500 group-hover/img:scale-105"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover/img:opacity-100 transition-opacity flex items-end p-2">
                        <span className="text-[10px] font-bold text-white bg-black/60 px-2 py-0.5 rounded-md flex items-center gap-1 backdrop-blur-xs">
                          <Eye className="w-3 h-3 text-amber-300" />
                          <span>View Photo</span>
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Review Body */}
                  <p className="text-xs sm:text-[13px] text-gray-600 dark:text-emerald-200/90 leading-relaxed italic line-clamp-3 sm:line-clamp-4">
                    &ldquo;{review.body}&rdquo;
                  </p>

                  {/* Store Response (if present) */}
                  {review.admin_reply && (
                    <div className="p-2 sm:p-2.5 rounded-xl bg-amber-50/80 dark:bg-amber-950/40 border border-amber-200/80 dark:border-amber-800/60 text-[11px] text-amber-950 dark:text-amber-200 flex items-start gap-1.5 line-clamp-2">
                      <MessageSquare className="w-3 h-3 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                      <span className="leading-tight">
                        <strong className="font-bold">Store Response:</strong> {review.admin_reply}
                      </span>
                    </div>
                  )}
                </div>

                {/* Card Footer: Customer Avatar, Name, Location, Order Badge */}
                <div className="relative z-10 pt-3 border-t border-emerald-100 dark:border-emerald-800/60 flex items-center justify-between text-xs mt-2">
                  <div className="flex items-center space-x-2.5 min-w-0">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-emerald-600 to-emerald-800 text-amber-300 font-black flex items-center justify-center text-xs shadow-sm border border-emerald-400/30 shrink-0">
                      {review.customer_name.charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <div className="font-extrabold text-gray-900 dark:text-emerald-100 truncate text-xs sm:text-sm">
                        {review.customer_name}
                      </div>
                      <div className="flex items-center gap-1 text-[10px] sm:text-[11px] text-emerald-700 dark:text-emerald-400 font-medium truncate">
                        {review.customer_location ? (
                          <>
                            <MapPin className="w-2.5 h-2.5 shrink-0" />
                            <span className="truncate">{review.customer_location}</span>
                          </>
                        ) : (
                          <>
                            <Clock className="w-2.5 h-2.5 shrink-0" />
                            <span>{formatRelativeTime(review.created_at)}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  {review.order_id && (
                    <span className="font-mono text-[10px] font-bold text-amber-800 dark:text-amber-200 bg-amber-50 dark:bg-amber-950/80 px-2 py-0.5 rounded-md border border-amber-200 dark:border-amber-800 shrink-0">
                      #{review.order_id}
                    </span>
                  )}
                </div>

              </div>
            );
          })}
        </div>

      </div>

      {/* 3D Navigation Controls with Floating Progress Pill */}
      <div className="flex items-center justify-center gap-3 sm:gap-4 mt-3 sm:mt-5">
        <button
          type="button"
          onClick={goToPrev}
          className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-white dark:bg-emerald-900 text-gray-800 dark:text-emerald-200 hover:bg-amber-400 hover:text-emerald-950 shadow-md border border-emerald-200 dark:border-emerald-700 flex items-center justify-center transition active:scale-95"
          title="Previous Review"
        >
          <ChevronLeft className="w-4 h-4 sm:w-5 sm:h-5" />
        </button>

        {/* Floating Indicator Dots & Counter Pill */}
        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-50 dark:bg-emerald-900/60 border border-emerald-200 dark:border-emerald-800 shadow-xs">
          {displayReviews.map((r, idx) => (
            <button
              key={r.id}
              onClick={() => setActiveIndex(idx)}
              className={`transition-all rounded-full ${
                idx === activeIndex
                  ? 'w-5 sm:w-6 h-1.5 sm:h-2 bg-amber-400 shadow-xs'
                  : 'w-1.5 sm:w-2 h-1.5 sm:h-2 bg-gray-300 dark:bg-emerald-800 hover:bg-emerald-600'
              }`}
              title={`Review by ${r.customer_name}`}
            />
          ))}
          <span className="text-[10px] font-mono font-bold text-emerald-800 dark:text-emerald-300 ml-1.5 border-l border-emerald-200 dark:border-emerald-700 pl-1.5">
            {String(activeIndex + 1).padStart(2, '0')}/{String(total).padStart(2, '0')}
          </span>
        </div>

        <button
          type="button"
          onClick={goToNext}
          className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-white dark:bg-emerald-900 text-gray-800 dark:text-emerald-200 hover:bg-amber-400 hover:text-emerald-950 shadow-md border border-emerald-200 dark:border-emerald-700 flex items-center justify-center transition active:scale-95"
          title="Next Review"
        >
          <ChevronRight className="w-4 h-4 sm:w-5 sm:h-5" />
        </button>
      </div>

      {/* Photo Lightbox Preview Modal */}
      {previewPhoto && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn"
          onClick={() => setPreviewPhoto(null)}
        >
          <div 
            className="relative max-w-2xl w-full bg-white dark:bg-emerald-950 rounded-3xl overflow-hidden shadow-2xl border-2 border-emerald-400/40 p-4"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setPreviewPhoto(null)}
              className="absolute top-4 right-4 z-10 w-9 h-9 rounded-full bg-black/60 text-white hover:bg-black flex items-center justify-center transition"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="rounded-2xl overflow-hidden bg-black max-h-[70vh] flex items-center justify-center">
              <img
                src={previewPhoto.url}
                alt="Customer review attachment"
                className="w-full h-auto max-h-[70vh] object-contain"
              />
            </div>

            <div className="mt-3 flex items-center justify-between text-xs text-gray-700 dark:text-emerald-200">
              <span className="font-bold">
                Customer Photo by {previewPhoto.author || 'Verified Buyer'}
              </span>
              {previewPhoto.title && (
                <span className="italic truncate max-w-xs text-emerald-600 dark:text-amber-300">
                  &ldquo;{previewPhoto.title}&rdquo;
                </span>
              )}
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default ReviewCoverflow3D;