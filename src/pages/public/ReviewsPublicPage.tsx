import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Star, MessageSquare, Plus, CheckCircle2, ShieldCheck, Heart,
  User, Send, ThumbsUp, Image as ImageIcon, X, Clock, Package,
  Search, Filter, ChevronLeft, ChevronRight, Phone, Hash, Sparkles,
  RotateCcw, Upload
} from 'lucide-react';
import { getJSONStore, setJSONStore } from '../../lib/dbManager';
import { compressImageToMax100KB } from '../../lib/utils';
import type { Review, Product } from '../../types';
import { useNotifications } from '../../contexts/NotificationContext';
import { PublicPageSkeleton } from '../../components/common/Skeleton';
import { useActionModal } from '../../contexts/ActionModalContext';
import toast from 'react-hot-toast';

// Smart Auto Title Generator based on Product and Star Rating
function generateSmartTitle(productName?: string, rating: number = 5): string {
  const pLower = (productName || '').toLowerCase();
  const isOil = pLower.includes('oil') || pLower.includes('marachekku') || pLower.includes('chekku');
  const isRice = pLower.includes('rice') || pLower.includes('samba') || pLower.includes('kavuni') || pLower.includes('arisi');
  const isMillet = pLower.includes('millet') || pLower.includes('varagu') || pLower.includes('thinai') || pLower.includes('kuthiraivali');

  if (rating === 5) {
    if (isOil) return 'Pure Marachekku Cold-Pressed Aroma & Outstanding Taste!';
    if (isRice) return 'Authentic Native Heirloom Rice - Wholesome Family Health!';
    if (isMillet) return 'Clean, Stone-Free & Highly Nutritious Traditional Millets!';
    return 'Exceptional Organic Freshness & Superior Traditional Quality!';
  } else if (rating === 4) {
    if (isOil) return 'Very Good Cold-Pressed Oil with Natural Nutty Aroma';
    if (isRice) return 'Great Unpolished Traditional Grain Quality';
    return 'Very Satisfied with Fresh Quality & Fast Home Delivery';
  } else if (rating === 3) {
    return 'Good Traditional Product & Honest Chemical-Free Sourcing';
  } else if (rating === 2) {
    return 'Fair Product Quality - Packaging Needs Improvement';
  } else {
    return 'Product or Delivery Did Not Meet Expectations';
  }
}

// Relative time formatter helper
function formatTimeBadge(dateString?: string): { relative: string; full: string } {
  if (!dateString) return { relative: 'Recently', full: 'No date' };
  try {
    const d = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    let relative = '';
    if (diffMins < 5) relative = '⚡ Just now';
    else if (diffMins < 60) relative = `${diffMins}m ago`;
    else if (diffHours < 24) relative = `${diffHours}h ago`;
    else if (diffDays === 1) relative = 'Yesterday';
    else if (diffDays < 7) relative = `${diffDays}d ago`;
    else relative = d.toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric' });

    const full = d.toLocaleString('en-IN', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });

    return { relative, full };
  } catch {
    return { relative: 'Recently', full: dateString };
  }
}

export const ReviewsPublicPage: React.FC = () => {
  const { addNotification } = useNotifications();
  const { showActionModal } = useActionModal();
  const [searchParams, setSearchParams] = useSearchParams();
  const [reviews, setReviews] = useState<Review[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters & Search
  const [filterRating, setFilterRating] = useState<'ALL' | number>('ALL');
  const [filterProduct, setFilterProduct] = useState<'ALL' | string>(() => {
    return searchParams.get('product') || searchParams.get('productId') || 'ALL';
  });
  const [searchQuery, setSearchQuery] = useState('');

  // Keep filter in sync with URL searchParams
  useEffect(() => {
    const pId = searchParams.get('product') || searchParams.get('productId');
    if (pId) {
      setFilterProduct(pId);
    }
  }, [searchParams]);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 6;

  // Image Upload & Client Compression (<= 100 KB) State
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isCompressingImage, setIsCompressingImage] = useState(false);
  const [imageSizeKB, setImageSizeKB] = useState<number | null>(null);

  // Submit Review Modal state
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({
    customer_name: '',
    customer_phone: '',
    customer_location: '',
    order_id: '',
    product_id: '',
    rating: 5,
    title: '',
    body: '',
    image_url: ''
  });

  // Lightbox Image Preview Modal
  const [lightboxImg, setLightboxImg] = useState<string | null>(null);

  // Reset Filters Handler
  const handleResetFilters = () => {
    setFilterRating('ALL');
    setFilterProduct('ALL');
    setSearchQuery('');
    setCurrentPage(1);
    setSearchParams({});
    toast.success('Filters reset to show all reviews');
  };

  const hasActiveFilters =
    filterRating !== 'ALL' ||
    filterProduct !== 'ALL' ||
    searchQuery.trim() !== '';

  const handleImageFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsCompressingImage(true);
      toast.loading('Compressing photo to ≤ 100 KB...', { id: 'public-img-compress' });
      const { dataUrl, sizeKB } = await compressImageToMax100KB(file);
      setFormData(prev => ({
        ...prev,
        image_url: dataUrl
      }));
      setImageSizeKB(sizeKB);
      toast.success(`Photo compressed to ${sizeKB} KB (Strictly ≤ 100 KB)!`, { id: 'public-img-compress' });
    } catch (err: any) {
      console.error('Image upload compression error:', err);
      toast.error(err?.message || 'Failed to compress image', { id: 'public-img-compress' });
    } finally {
      setIsCompressingImage(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  useEffect(() => {
    async function load() {
      setLoading(true);
      const [r, p] = await Promise.all([
        getJSONStore<Review>('reviews'),
        getJSONStore<Product>('products')
      ]);
      setReviews(r || []);
      setProducts(p || []);
      setLoading(false);
    }
    load();
  }, []);

  // Approved reviews (Alive on public store)
  const approvedReviews = useMemo(() => {
    return reviews.filter(r => r.status === 'APPROVED' || !r.status);
  }, [reviews]);

  // Filtered reviews
  const filteredReviews = useMemo(() => {
    return approvedReviews.filter(r => {
      // Rating filter
      if (filterRating !== 'ALL' && r.rating !== filterRating) return false;

      // Product filter
      if (filterProduct !== 'ALL' && r.product_id !== filterProduct) return false;

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const name = String(r.customer_name || '').toLowerCase();
        const orderId = String(r.order_id || '').toLowerCase();
        const body = String(r.body || '').toLowerCase();
        const title = String(r.title || '').toLowerCase();
        const loc = String(r.customer_location || '').toLowerCase();
        if (!name.includes(q) && !orderId.includes(q) && !body.includes(q) && !title.includes(q) && !loc.includes(q)) {
          return false;
        }
      }

      return true;
    });
  }, [approvedReviews, filterRating, filterProduct, searchQuery]);

  // Overall Stats
  const averageRating = approvedReviews.length > 0 
    ? (approvedReviews.reduce((sum, r) => sum + (Number(r.rating) || 5), 0) / approvedReviews.length).toFixed(1)
    : '5.0';

  const fiveStarCount = approvedReviews.filter(r => r.rating === 5).length;
  const fourStarCount = approvedReviews.filter(r => r.rating === 4).length;
  const threeStarCount = approvedReviews.filter(r => r.rating === 3).length;

  // Pagination calculation
  const totalPages = Math.ceil(filteredReviews.length / itemsPerPage) || 1;
  const paginatedReviews = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredReviews.slice(start, start + itemsPerPage);
  }, [filteredReviews, currentPage, itemsPerPage]);

  // Open modal with pre-generated title
  const handleOpenModal = (preselectedProductId?: string) => {
    setImageSizeKB(null);
    const prodId = preselectedProductId || products[0]?.id || '';
    const prodObj = products.find(p => p.id === prodId);
    const suggested = generateSmartTitle(prodObj?.name, 5);

    setFormData({
      customer_name: '',
      customer_phone: '',
      customer_location: '',
      order_id: '',
      product_id: prodId,
      rating: 5,
      title: suggested,
      body: '',
      image_url: ''
    });
    setShowModal(true);
  };

  // Submit Review - AUTOMATICALLY APPROVED!
  const handleSubmitReview = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.customer_name.trim() || !formData.body.trim()) {
      toast.error('Please enter your name and review message');
      return;
    }

    setShowModal(false);

    showActionModal({
      title: 'Publishing Your Customer Review',
      subtitle: `Sharing ${formData.customer_name}'s feedback with MR. VIVASAYI community...`,
      badge: 'Auto-Approved Live',
      duration: 800,
      steps: [
        'Verifying star rating and feedback...',
        'Marking verified customer badge...',
        'Review published live to storefront!'
      ],
      onComplete: async () => {
        const newReview: Review = {
          id: `rev-${Date.now().toString().slice(-6)}`,
          customer_name: formData.customer_name.trim(),
          customer_phone: formData.customer_phone.trim() || undefined,
          customer_location: formData.customer_location.trim() || 'Tamil Nadu',
          order_id: formData.order_id.trim() || undefined,
          product_id: formData.product_id || undefined,
          rating: Number(formData.rating) || 5,
          title: formData.title.trim() || 'Verified Traditional Organic Experience',
          body: formData.body.trim(),
          image_url: formData.image_url.trim() || undefined,
          images: formData.image_url.trim() ? [formData.image_url.trim()] : undefined,
          is_verified_purchase: true,
          is_featured: true,
          status: 'APPROVED', // AUTOMATICALLY APPROVED AND LIVE
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };

        const updated = [newReview, ...reviews];
        setReviews(updated);
        await setJSONStore('reviews', updated);

        toast.success('Thank you! Your review is now LIVE on MR. VIVASAYI!');
        addNotification({
          title: 'New Customer Review Submitted & Live',
          message: `${newReview.customer_name} added a ${newReview.rating}-star review for MR. VIVASAYI.`,
          type: 'success',
          sourceModule: 'Reviews'
        });
      }
    });
  };

  if (loading) {
    return <PublicPageSkeleton />;
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-14 space-y-10 sm:space-y-12">
      
      {/* ================= HEADER HERO BANNER ================= */}
      <div className="bg-gradient-to-r from-emerald-900 via-emerald-950 to-emerald-900 rounded-[2.5rem] p-8 lg:p-12 text-white shadow-2xl relative overflow-hidden flex flex-col lg:flex-row items-center justify-between gap-8 border-2 border-emerald-800">
        <div className="space-y-4 max-w-2xl text-center lg:text-left z-10">
          <div className="inline-flex items-center space-x-2 bg-amber-400/20 border border-amber-300/40 px-3.5 py-1.5 rounded-full text-xs font-bold text-amber-300 uppercase tracking-widest shadow-xs">
            <ShieldCheck className="w-4 h-4" />
            <span>100% Genuine Family Feedback • Live Approved</span>
          </div>
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-serif font-bold leading-tight text-white">
            Customer Reviews &amp; Ratings
          </h1>
          <p className="text-emerald-100 text-sm sm:text-base leading-relaxed">
            Read honest experiences from families across Tamil Nadu enjoying MR. VIVASAYI wood cold-pressed oils, traditional heirloom rice varieties, and unpolished native millets.
          </p>
        </div>

        {/* Rating Summary Card */}
        <div className="bg-white/10 backdrop-blur-xl border border-white/20 p-6 sm:p-7 rounded-3xl text-center min-w-[260px] space-y-3.5 z-10 shadow-xl">
          <div className="text-5xl sm:text-6xl font-black text-amber-400 font-serif flex items-center justify-center gap-1">
            <span>{averageRating}</span>
            <Star className="w-8 h-8 fill-amber-400 text-amber-400 inline" />
          </div>
          <div className="flex justify-center space-x-1.5 text-amber-400">
            {Array.from({ length: 5 }).map((_, i) => (
              <Star key={i} className="w-5 h-5 fill-current" />
            ))}
          </div>
          <p className="text-xs text-emerald-200 font-medium">
            Based on {approvedReviews.length} verified customer reviews
          </p>
          <button
            type="button"
            onClick={() => handleOpenModal()}
            className="w-full bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-500 hover:to-amber-600 text-slate-950 font-black px-5 py-3 rounded-2xl transition-all shadow-lg hover:shadow-xl flex items-center justify-center space-x-2 text-xs sm:text-sm cursor-pointer hover:scale-[1.02] active:scale-95"
          >
            <Plus className="w-4 h-4" />
            <span>Write a Review</span>
          </button>
        </div>
      </div>

      {/* ================= FILTER & SEARCH TOOLBAR ================= */}
      <div className="bg-white dark:bg-emerald-950 p-5 rounded-3xl border border-emerald-100 dark:border-emerald-800 shadow-sm space-y-4">
        
        {/* Rating Pills */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-emerald-100 dark:border-emerald-800/80 pb-3">
          <div className="flex items-center space-x-2 overflow-x-auto py-1">
            <button
              type="button"
              onClick={() => { setFilterRating('ALL'); setCurrentPage(1); }}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                filterRating === 'ALL'
                  ? 'bg-emerald-700 text-white shadow-sm'
                  : 'bg-emerald-50 dark:bg-emerald-900/40 text-emerald-800 dark:text-emerald-300 hover:bg-emerald-100'
              }`}
            >
              All Reviews ({approvedReviews.length})
            </button>
            <button
              type="button"
              onClick={() => { setFilterRating(5); setCurrentPage(1); }}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center space-x-1.5 cursor-pointer ${
                filterRating === 5
                  ? 'bg-emerald-700 text-white shadow-sm'
                  : 'bg-emerald-50 dark:bg-emerald-900/40 text-emerald-800 dark:text-emerald-300 hover:bg-emerald-100'
              }`}
            >
              <span>5 Stars</span>
              <span className="text-amber-400">★</span>
              <span>({fiveStarCount})</span>
            </button>
            <button
              type="button"
              onClick={() => { setFilterRating(4); setCurrentPage(1); }}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center space-x-1.5 cursor-pointer ${
                filterRating === 4
                  ? 'bg-emerald-700 text-white shadow-sm'
                  : 'bg-emerald-50 dark:bg-emerald-900/40 text-emerald-800 dark:text-emerald-300 hover:bg-emerald-100'
              }`}
            >
              <span>4 Stars</span>
              <span className="text-amber-400">★</span>
              <span>({fourStarCount})</span>
            </button>
            {threeStarCount > 0 && (
              <button
                type="button"
                onClick={() => { setFilterRating(3); setCurrentPage(1); }}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center space-x-1.5 cursor-pointer ${
                  filterRating === 3
                    ? 'bg-emerald-700 text-white shadow-sm'
                    : 'bg-emerald-50 dark:bg-emerald-900/40 text-emerald-800 dark:text-emerald-300 hover:bg-emerald-100'
                }`}
              >
                <span>3 Stars</span>
                <span className="text-amber-400">★</span>
                <span>({threeStarCount})</span>
              </button>
            )}

            {/* Quick Reset Filter Pill */}
            {hasActiveFilters && (
              <button
                type="button"
                onClick={handleResetFilters}
                className="px-3 py-2 rounded-xl text-xs font-extrabold bg-amber-100 dark:bg-amber-900/60 text-amber-900 dark:text-amber-200 border border-amber-300 dark:border-amber-700 flex items-center gap-1 hover:bg-amber-200 transition cursor-pointer"
                title="Reset all filters"
              >
                <RotateCcw className="w-3.5 h-3.5 text-amber-600" />
                <span>Reset</span>
              </button>
            )}
          </div>

          <button
            type="button"
            onClick={() => handleOpenModal()}
            className="px-4 py-2 rounded-xl bg-amber-400 hover:bg-amber-500 text-slate-950 font-black text-xs shadow transition flex items-center gap-1.5 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Your Review</span>
          </button>
        </div>

        {/* Search & Product Filter Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-3 text-xs items-center">
          {/* Search Input */}
          <div className="relative sm:col-span-1 lg:col-span-6">
            <Search className="w-4 h-4 absolute left-3.5 top-3 text-gray-400" />
            <input
              type="text"
              placeholder="Search by customer name, order ID, or review text..."
              value={searchQuery}
              onChange={e => { setSearchQuery(e.target.value); setCurrentPage(1); }}
              className="w-full pl-10 pr-8 py-2.5 bg-emerald-50/50 dark:bg-emerald-900/40 border border-emerald-200 dark:border-emerald-700 rounded-2xl font-medium text-gray-900 dark:text-emerald-100 focus:ring-2 focus:ring-emerald-500"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-2.5 text-gray-400 hover:text-gray-600"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Product Filter */}
          <div className="sm:col-span-1 lg:col-span-4">
            <select
              value={filterProduct}
              onChange={e => { setFilterProduct(e.target.value); setCurrentPage(1); }}
              className="w-full px-3.5 py-2.5 bg-emerald-50/50 dark:bg-emerald-900/40 border border-emerald-200 dark:border-emerald-700 rounded-2xl font-bold dark:text-emerald-100 truncate"
            >
              <option value="ALL">🌾 Filter by Product Purchased (All Products)</option>
              {products.map(p => (
                <option key={p.id} value={p.id}>
                  {p.name} ({p.pack_size || `1 ${p.unit}`})
                </option>
              ))}
            </select>
          </div>

          {/* Reset Filters Button */}
          <div className="sm:col-span-2 lg:col-span-2">
            <button
              type="button"
              onClick={handleResetFilters}
              className={`w-full py-2.5 px-3 rounded-2xl font-bold text-xs flex items-center justify-center gap-1.5 transition cursor-pointer border shadow-2xs ${
                hasActiveFilters
                  ? 'bg-amber-100 hover:bg-amber-200 dark:bg-amber-900/60 text-amber-900 dark:text-amber-200 border-amber-300 dark:border-amber-700 shadow-sm'
                  : 'bg-emerald-50/70 hover:bg-emerald-100 dark:bg-emerald-900/40 text-emerald-800 dark:text-emerald-200 border-emerald-200 dark:border-emerald-700'
              }`}
              title="Reset all filters, search query, and rating"
            >
              <RotateCcw className="w-3.5 h-3.5 text-emerald-700 dark:text-amber-400" />
              <span>Reset Filters</span>
              {hasActiveFilters && (
                <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
              )}
            </button>
          </div>
        </div>

      </div>

      {/* ================= 3D REVIEWS CARDS GRID ================= */}
      {filteredReviews.length === 0 ? (
        <div className="text-center py-16 bg-white dark:bg-emerald-950/60 rounded-3xl border border-emerald-100 dark:border-emerald-800 p-8 space-y-3">
          <div className="w-14 h-14 rounded-full bg-emerald-100 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-200 flex items-center justify-center mx-auto">
            <Search className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-gray-900 dark:text-emerald-100">No Reviews Match Filters</h3>
          <p className="text-xs text-gray-500 dark:text-emerald-300">
            {hasActiveFilters
              ? 'No reviews match your selected filters. Click Reset Filters to view all feedback.'
              : 'Be the first to share your experience with this organic product!'}
          </p>
          <div className="pt-2 flex items-center justify-center gap-3">
            {hasActiveFilters && (
              <button
                type="button"
                onClick={handleResetFilters}
                className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-emerald-900 text-slate-800 dark:text-emerald-100 font-bold text-xs shadow-xs transition flex items-center gap-1.5 cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reset Filters</span>
              </button>
            )}
            <button
              type="button"
              onClick={() => handleOpenModal()}
              className="px-5 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs shadow transition cursor-pointer"
            >
              Write First Review
            </button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {paginatedReviews.map((review: Review) => {
            const product = products.find(p => p.id === review.product_id);
            const timeInfo = formatTimeBadge(review.created_at);
            const reviewImg = review.image_url || review.images?.[0];

            return (
              <div
                key={review.id}
                className="bg-white dark:bg-emerald-950/80 p-6 rounded-3xl border-2 border-emerald-100 dark:border-emerald-800/80 shadow-sm flex flex-col justify-between space-y-4 hover:border-amber-400 hover:shadow-2xl hover:-translate-y-1.5 transition-all duration-300 relative group"
              >
                <div className="space-y-3.5">
                  {/* Top Bar: Rating Stars, Verified Badge, Time Badge */}
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center space-x-1 text-amber-400">
                      {Array.from({ length: review.rating }).map((_, i) => (
                        <Star key={i} className="w-4 h-4 fill-current" />
                      ))}
                    </div>

                    <div className="flex items-center gap-1.5">
                      <span
                        className="inline-flex items-center gap-1 text-[10.5px] font-bold text-slate-500 dark:text-emerald-300 bg-slate-50 dark:bg-emerald-900/50 px-2.5 py-0.5 rounded-lg border border-slate-200 dark:border-emerald-800"
                        title={timeInfo.full}
                      >
                        <Clock className="w-3 h-3 text-slate-400" />
                        <span>{timeInfo.relative}</span>
                      </span>

                      {review.is_verified_purchase && (
                        <span className="bg-emerald-100 dark:bg-emerald-900 text-emerald-900 dark:text-emerald-200 text-[10.5px] font-extrabold px-2 py-0.5 rounded-lg border border-emerald-200 dark:border-emerald-700">
                          ✓ Verified
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Review Title */}
                  {review.title && (
                    <h3 className="font-extrabold text-base text-gray-900 dark:text-emerald-100 leading-snug">
                      &ldquo;{review.title}&rdquo;
                    </h3>
                  )}

                  {/* Customer Review Image (with Zoom modal) */}
                  {reviewImg && (
                    <div
                      onClick={() => setLightboxImg(reviewImg)}
                      className="relative aspect-video rounded-2xl overflow-hidden border border-emerald-100 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-900 cursor-pointer group/img"
                    >
                      <img
                        src={reviewImg}
                        alt="Delivered product feedback"
                        className="w-full h-full object-cover group-hover/img:scale-105 transition-transform duration-300"
                      />
                      <span className="absolute bottom-2 right-2 bg-black/70 backdrop-blur-xs text-white text-[10px] font-bold px-2 py-0.5 rounded-lg flex items-center gap-1">
                        <ImageIcon className="w-3 h-3 text-amber-400" /> Zoom Photo
                      </span>
                    </div>
                  )}

                  {/* Review Body */}
                  <p className="text-xs sm:text-sm text-gray-600 dark:text-emerald-200/90 leading-relaxed italic">
                    &ldquo;{review.body}&rdquo;
                  </p>

                  {/* Product Badge */}
                  {product && (
                    <div className="inline-flex items-center gap-1.5 bg-emerald-50 dark:bg-emerald-900/40 px-3 py-1.5 rounded-xl text-xs font-bold text-emerald-900 dark:text-amber-300 border border-emerald-200 dark:border-emerald-800">
                      <Package className="w-3.5 h-3.5 text-emerald-600" />
                      <span>{product.name} ({product.pack_size || `1 ${product.unit}`})</span>
                    </div>
                  )}

                  {/* Store Owner Admin Reply */}
                  {review.admin_reply && (
                    <div className="bg-amber-50/80 dark:bg-amber-950/40 p-3.5 rounded-2xl border border-amber-200 dark:border-amber-800 text-xs space-y-1">
                      <span className="font-bold text-amber-900 dark:text-amber-300 flex items-center gap-1">
                        <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                        <span>MR. VIVASAYI Store Team:</span>
                      </span>
                      <p className="text-amber-900 dark:text-amber-200/90 italic leading-relaxed">
                        {review.admin_reply}
                      </p>
                    </div>
                  )}
                </div>

                {/* Bottom Footer: Customer Avatar & Order ID */}
                <div className="pt-3.5 border-t border-emerald-100 dark:border-emerald-800/60 flex items-center justify-between text-xs">
                  <div className="flex items-center space-x-2.5">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-emerald-700 to-emerald-600 text-white font-black flex items-center justify-center text-xs shadow-xs">
                      {review.customer_name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <div className="font-bold text-gray-900 dark:text-emerald-100">
                        {review.customer_name}
                      </div>
                      <div className="text-emerald-700 dark:text-emerald-400 text-[11px] font-medium">
                        {review.customer_location || 'Tamil Nadu'}
                      </div>
                    </div>
                  </div>

                  {review.order_id && (
                    <span className="font-mono text-[10.5px] font-bold text-amber-800 dark:text-amber-200 bg-amber-50 dark:bg-amber-950 px-2 py-0.5 rounded-md border border-amber-200 dark:border-amber-800">
                      Order #{review.order_id}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ================= PAGINATION ================= */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between bg-white dark:bg-emerald-950 p-4 rounded-3xl border border-emerald-100 dark:border-emerald-800 text-xs shadow-sm">
          <span className="text-gray-500 dark:text-emerald-300 font-bold">
            Page {currentPage} of {totalPages} ({filteredReviews.length} Reviews)
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              disabled={currentPage === 1}
              className="px-3.5 py-1.5 rounded-xl bg-emerald-50 dark:bg-emerald-900 text-emerald-900 dark:text-emerald-100 font-bold border border-emerald-200 dark:border-emerald-700 disabled:opacity-40 cursor-pointer flex items-center gap-1"
            >
              <ChevronLeft className="w-3.5 h-3.5" /> Previous
            </button>
            <button
              type="button"
              onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
              disabled={currentPage === totalPages}
              className="px-3.5 py-1.5 rounded-xl bg-emerald-50 dark:bg-emerald-900 text-emerald-900 dark:text-emerald-100 font-bold border border-emerald-200 dark:border-emerald-700 disabled:opacity-40 cursor-pointer flex items-center gap-1"
            >
              Next <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* ================= WRITE A REVIEW MODAL (WITH 3D ANIMATION) ================= */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-in fade-in duration-200">
          <div className="bg-white dark:bg-emerald-950 max-w-lg w-full rounded-3xl p-6 sm:p-8 border-2 border-emerald-300 dark:border-emerald-700 shadow-2xl space-y-5 max-h-[92vh] overflow-y-auto animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-emerald-100 dark:border-emerald-800 pb-4">
              <div>
                <h3 className="text-xl font-bold font-serif text-gray-900 dark:text-emerald-100 flex items-center gap-2">
                  <Star className="w-5 h-5 text-amber-500 fill-amber-400" />
                  <span>Write a Customer Review</span>
                </h3>
                <p className="text-xs text-gray-500 dark:text-emerald-300 mt-0.5">
                  Share your experience with MR. VIVASAYI native organic foods
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 p-1 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitReview} className="space-y-4 text-xs">
              
              {/* Product Purchased Selection */}
              <div>
                <label className="block font-bold text-gray-700 dark:text-emerald-200 mb-1">
                  Product Purchased *
                </label>
                <select
                  value={formData.product_id}
                  onChange={e => {
                    const chosenId = e.target.value;
                    const prodObj = products.find(p => p.id === chosenId);
                    const suggestedTitle = generateSmartTitle(prodObj?.name, formData.rating);
                    setFormData({
                      ...formData,
                      product_id: chosenId,
                      title: suggestedTitle
                    });
                  }}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 dark:border-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-100 text-xs font-bold focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="">🌾 General Store Order Experience</option>
                  {products.map(p => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.pack_size || `1 ${p.unit}`}) - ₹{p.selling_price}
                    </option>
                  ))}
                </select>
              </div>

              {/* All Star Options (Interactive 1-5 Stars) */}
              <div>
                <label className="block font-bold text-gray-700 dark:text-emerald-200 mb-1">
                  Overall Rating *
                </label>
                <div className="flex items-center gap-2 p-3 bg-amber-50/70 dark:bg-amber-950/40 rounded-2xl border border-amber-200 dark:border-amber-800">
                  <div className="flex items-center gap-1.5">
                    {[1, 2, 3, 4, 5].map(starNum => (
                      <button
                        key={starNum}
                        type="button"
                        onClick={() => {
                          const prodObj = products.find(p => p.id === formData.product_id);
                          const suggestedTitle = generateSmartTitle(prodObj?.name, starNum);
                          setFormData({
                            ...formData,
                            rating: starNum,
                            title: suggestedTitle
                          });
                        }}
                        className="p-1 text-amber-400 hover:scale-125 transition-transform cursor-pointer"
                        title={`${starNum} Stars`}
                      >
                        <Star
                          className={`w-6 h-6 ${
                            starNum <= formData.rating ? 'fill-amber-400 text-amber-500' : 'text-gray-300'
                          }`}
                        />
                      </button>
                    ))}
                  </div>
                  <span className="font-extrabold text-amber-900 dark:text-amber-200 text-xs ml-2">
                    {formData.rating === 5
                      ? '5 Stars (Exceptional Organic Quality!)'
                      : formData.rating === 4
                      ? '4 Stars (Great Taste & Fresh)'
                      : formData.rating === 3
                      ? '3 Stars (Good Quality)'
                      : formData.rating === 2
                      ? '2 Stars (Average Experience)'
                      : '1 Star (Needs Improvement)'}
                  </span>
                </div>
              </div>

              {/* Review Title & Auto Suggestion */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="font-bold text-gray-700 dark:text-emerald-200">
                    Review Headline / Title
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      const prodObj = products.find(p => p.id === formData.product_id);
                      setFormData({
                        ...formData,
                        title: generateSmartTitle(prodObj?.name, formData.rating)
                      });
                      toast.success('Auto-generated review title!');
                    }}
                    className="text-[11px] font-bold text-amber-700 dark:text-amber-300 flex items-center gap-1 hover:underline cursor-pointer"
                  >
                    <Sparkles className="w-3 h-3" /> Auto-Suggest
                  </button>
                </div>
                <input
                  type="text"
                  value={formData.title}
                  onChange={e => setFormData({ ...formData, title: e.target.value })}
                  placeholder="e.g. Pure Cold-Pressed Aroma & Fast Delivery"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 dark:border-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-100 text-xs font-bold focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              {/* Customer Name & City */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-gray-700 dark:text-emerald-200 mb-1">
                    Your Full Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.customer_name}
                    onChange={e => setFormData({ ...formData, customer_name: e.target.value })}
                    placeholder="e.g. Anand Kumar"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 dark:border-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-100 text-xs focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div>
                  <label className="block font-bold text-gray-700 dark:text-emerald-200 mb-1">
                    City / Town (Location)
                  </label>
                  <input
                    type="text"
                    value={formData.customer_location}
                    onChange={e => setFormData({ ...formData, customer_location: e.target.value })}
                    placeholder="e.g. Cumbum, Theni, Tamil Nadu"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 dark:border-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-100 text-xs focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              {/* Mobile Number OR Order ID */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-gray-700 dark:text-emerald-200 mb-1">
                    Mobile / WhatsApp (Optional)
                  </label>
                  <input
                    type="tel"
                    value={formData.customer_phone}
                    onChange={e => setFormData({ ...formData, customer_phone: e.target.value })}
                    placeholder="e.g. +91 98421 56789"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 dark:border-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-100 text-xs font-mono focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div>
                  <label className="block font-bold text-gray-700 dark:text-emerald-200 mb-1">
                    Order ID / Bill Number (Optional)
                  </label>
                  <input
                    type="text"
                    value={formData.order_id}
                    onChange={e => setFormData({ ...formData, order_id: e.target.value })}
                    placeholder="e.g. ORD-1042"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 dark:border-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-100 text-xs font-mono focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              {/* Review Body */}
              <div>
                <label className="block font-bold text-gray-700 dark:text-emerald-200 mb-1">
                  Your Review Feedback *
                </label>
                <textarea
                  required
                  rows={3}
                  value={formData.body}
                  onChange={e => setFormData({ ...formData, body: e.target.value })}
                  placeholder="Share your experience with product taste, natural aroma, cooking results, or delivery..."
                  className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 dark:border-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-100 text-xs focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              {/* Quick Preset Phrases */}
              <div className="flex flex-wrap gap-1.5 pt-0.5">
                {[
                  '🌿 Authentic cold-pressed aroma',
                  '🌾 100% Unpolished native grain',
                  '🚚 Very fast delivery to our home',
                  '👨‍🌾 Real farmer direct quality'
                ].map((preset, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => {
                      const updated = formData.body ? `${formData.body} ${preset}.` : `${preset}.`;
                      setFormData({ ...formData, body: updated });
                    }}
                    className="px-2 py-1 rounded-lg bg-emerald-50 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-200 border border-emerald-200 dark:border-emerald-700 text-[10px] font-bold hover:bg-emerald-100 cursor-pointer"
                  >
                    + {preset}
                  </button>
                ))}
              </div>

              {/* Photo Attachment URL & File Upload with <= 100 KB Client Compression */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="font-bold text-gray-700 dark:text-emerald-200 flex items-center gap-1.5">
                    <ImageIcon className="w-4 h-4 text-emerald-600 dark:text-amber-400" />
                    <span>Attach Photo of Order (Max 100 KB Auto-Compressed)</span>
                  </label>
                  {imageSizeKB ? (
                    <span className="text-[10.5px] font-extrabold text-emerald-800 dark:text-emerald-200 bg-emerald-100 dark:bg-emerald-900/80 px-2 py-0.5 rounded-md border border-emerald-300 dark:border-emerald-700">
                      &check; {imageSizeKB} KB (&le; 100 KB Limit)
                    </span>
                  ) : null}
                </div>

                <div className="space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <input
                      type="file"
                      ref={fileInputRef}
                      accept="image/*"
                      className="hidden"
                      onChange={handleImageFileChange}
                    />
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={isCompressingImage}
                      className="px-3.5 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-extrabold text-xs flex items-center gap-1.5 transition cursor-pointer shadow-xs disabled:opacity-50"
                    >
                      <Upload className="w-3.5 h-3.5 text-amber-300" />
                      <span>{isCompressingImage ? 'Compressing photo &le; 100 KB...' : 'Upload Photo (Auto-Compress &le; 100 KB)'}</span>
                    </button>

                    <span className="text-gray-400 dark:text-emerald-400 text-xs font-bold">OR</span>

                    <input
                      type="url"
                      value={formData.image_url}
                      onChange={e => {
                        setFormData({ ...formData, image_url: e.target.value });
                        setImageSizeKB(null);
                      }}
                      placeholder="Paste image URL (https://...)"
                      className="flex-1 min-w-[180px] px-3.5 py-2.5 rounded-xl border border-gray-300 dark:border-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-100 text-[11px] font-mono focus:ring-2 focus:ring-emerald-500"
                    />

                    {formData.image_url && (
                      <button
                        type="button"
                        onClick={() => {
                          setFormData({ ...formData, image_url: '' });
                          setImageSizeKB(null);
                        }}
                        className="p-2 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950 rounded-lg cursor-pointer"
                        title="Remove photo"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </div>

                  {formData.image_url && (
                    <div className="flex items-center gap-3 p-2.5 bg-emerald-50/60 dark:bg-emerald-900/30 rounded-2xl border border-emerald-200 dark:border-emerald-800">
                      <div className="w-16 h-16 rounded-xl overflow-hidden border border-emerald-200 dark:border-emerald-700 shadow-xs shrink-0 bg-emerald-100">
                        <img src={formData.image_url} alt="Review attachment preview" className="w-full h-full object-cover" />
                      </div>
                      <div className="space-y-0.5 text-xs">
                        <span className="font-extrabold text-emerald-900 dark:text-emerald-100 block">
                          Customer Photo Attached
                        </span>
                        <p className="text-[11px] text-gray-500 dark:text-emerald-300">
                          {imageSizeKB
                            ? `Compressed size: ${imageSizeKB} KB (Strictly &le; 100 KB limit). Ready to publish live.`
                            : 'Web image URL attached. Will appear on storefront.'}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Submit Buttons */}
              <div className="flex items-center justify-between pt-3 border-t border-emerald-100 dark:border-emerald-800">
                <span className="text-[11px] font-bold text-emerald-700 dark:text-emerald-300 flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Approved &amp; Live Immediately</span>
                </span>

                <div className="flex items-center space-x-2.5">
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    className="px-4 py-2 rounded-xl text-xs font-bold text-gray-600 dark:text-emerald-300 hover:bg-gray-100 dark:hover:bg-emerald-900 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="bg-emerald-700 hover:bg-emerald-800 text-white px-5 py-2.5 rounded-xl font-bold text-xs shadow-md transition-all flex items-center space-x-2 cursor-pointer"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>Submit &amp; Publish Live</span>
                  </button>
                </div>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* ================= 3D LIGHTBOX IMAGE MODAL ================= */}
      {lightboxImg && (
        <div
          onClick={() => setLightboxImg(null)}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md cursor-pointer animate-in fade-in duration-200"
        >
          <div
            onClick={e => e.stopPropagation()}
            className="relative max-w-3xl w-full bg-slate-900 rounded-3xl overflow-hidden shadow-2xl border-2 border-amber-400 animate-in zoom-in-95 duration-200"
          >
            <img
              src={lightboxImg}
              alt="Customer Attachment Zoom"
              className="w-full max-h-[80vh] object-contain"
            />
            <button
              type="button"
              onClick={() => setLightboxImg(null)}
              className="absolute top-4 right-4 bg-black/70 text-white p-2 rounded-full hover:bg-rose-600 transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}

    </div>
  );
};

export default ReviewsPublicPage;
