import React, { useState, useMemo, useRef, useEffect } from 'react';
import { useParams, Link, useNavigate, useLocation } from 'react-router-dom';
import { 
  Leaf, ShoppingBag, MessageSquare, ShieldCheck, Check, ChevronLeft, 
  ChevronRight, Share2, Heart, Award, HelpCircle, Truck, Package, 
  Sparkles, AlertCircle, CheckCircle2, Plus, Minus, ArrowLeft,
  Copy, Utensils, BookOpen, HeartPulse, Info, FileText, Tag,
  Star, Send, Clock, Image as ImageIcon, X, Upload, ExternalLink,
  Filter, Search, Camera, ThumbsUp
} from 'lucide-react';
import toast from 'react-hot-toast';
import { formatPrice, compressImageToMax100KB } from '../../lib/utils';
import { useCart } from '../../contexts/CartContext';
import type { Product, Category, Review } from '../../types';
import { getJSONStore, setJSONStore, getWhatsAppOrdersNumber } from '../../lib/dbManager';
import { DEFAULT_DATABASE_SEEDS } from '../../lib/initialData';
import { ProductDetailSkeleton } from '../../components/common/Skeleton';
import ProductCard from '../../components/public/ProductCard';
import ReviewCoverflow3D from '../../components/public/ReviewCoverflow3D';

export const ProductDetailPage: React.FC = () => {
  const { id, slug } = useParams<{ id: string; slug?: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { addItem, updateQuantity, getItem } = useCart();
  const [copied, setCopied] = useState(false);
  const [showShareDropdown, setShowShareDropdown] = useState(false);
  const shareDropdownRef = useRef<HTMLDivElement>(null);

  // Initialize with synchronous default catalog & local storage so page renders INSTANTLY (0 ms)
  const [products, setProducts] = useState<Product[]>(() => {
    const defaultProds = (DEFAULT_DATABASE_SEEDS['products'] || []) as Product[];
    if (typeof window !== 'undefined') {
      try {
        const cached = localStorage.getItem('mrvivasayi_db_products');
        if (cached) {
          const parsed = JSON.parse(cached);
          if (Array.isArray(parsed) && parsed.length > 0) {
            const map = new Map<string, Product>();
            defaultProds.forEach(p => map.set(p.id, p));
            parsed.forEach((p: Product) => {
              if (p?.id) map.set(p.id, { ...(map.get(p.id) || {}), ...p });
            });
            return Array.from(map.values());
          }
        }
      } catch {}
    }
    return defaultProds;
  });

  const [categories, setCategories] = useState<Category[]>(() => {
    const defaultCats = (DEFAULT_DATABASE_SEEDS['categories'] || []) as Category[];
    if (typeof window !== 'undefined') {
      try {
        const cached = localStorage.getItem('mrvivasayi_db_categories');
        if (cached) {
          const parsed = JSON.parse(cached);
          if (Array.isArray(parsed) && parsed.length > 0) return parsed;
        }
      } catch {}
    }
    return defaultCats;
  });

  const [reviews, setReviews] = useState<Review[]>(() => {
    const defaultRevs = (DEFAULT_DATABASE_SEEDS['reviews'] || []) as Review[];
    if (typeof window !== 'undefined') {
      try {
        const cached = localStorage.getItem('mrvivasayi_db_reviews');
        if (cached) {
          const parsed = JSON.parse(cached);
          if (Array.isArray(parsed) && parsed.length > 0) return parsed;
        }
      } catch {}
    }
    return defaultRevs;
  });

  // Start with loading = false so product details render immediately without hanging on skeletons
  const [loading, setLoading] = useState<boolean>(false);
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [buyQuantity, setBuyQuantity] = useState(1);

  // Review Submission Modal State
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [showAllReviewsModal, setShowAllReviewsModal] = useState(false);
  const [modalStarFilter, setModalStarFilter] = useState<'ALL' | number>('ALL');
  const [modalSearch, setModalSearch] = useState('');
  const [modalOnlyPhotos, setModalOnlyPhotos] = useState(false);
  const [modalTab, setModalTab] = useState<'PRODUCT' | 'ALL'>('PRODUCT');

  const [reviewFormData, setReviewFormData] = useState({
    customer_name: '',
    customer_phone: '',
    customer_location: '',
    order_id: '',
    rating: 5,
    title: '',
    body: '',
    image_url: ''
  });

  // Product Review Image Upload & Client Compression (<= 100 KB)
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isCompressingImage, setIsCompressingImage] = useState(false);
  const [imageSizeKB, setImageSizeKB] = useState<number | null>(null);

  // Lightbox Zoom Image
  const [lightboxImg, setLightboxImg] = useState<string | null>(null);

  // Background cloud catalog sync with timeout (never freezes the page)
  React.useEffect(() => {
    let isMounted = true;
    async function load() {
      try {
        const timeoutPromise = new Promise<null>((r) => setTimeout(() => r(null), 3500));
        const fetchPromise = Promise.all([
          getJSONStore<Product>('products'),
          getJSONStore<Category>('categories'),
          getJSONStore<Review>('reviews')
        ]);
        const res = await Promise.race([fetchPromise, timeoutPromise]);
        if (!isMounted || !res) return;

        const [p, c, r] = res;
        const defaultProds = (DEFAULT_DATABASE_SEEDS['products'] || []) as Product[];
        const defaultCats = (DEFAULT_DATABASE_SEEDS['categories'] || []) as Category[];

        // Always preserve all default catalog items while merging live updates
        const prodMap = new Map<string, Product>();
        defaultProds.forEach(dp => prodMap.set(dp.id, dp));
        (p || []).forEach(lp => {
          if (lp?.id) prodMap.set(lp.id, { ...(prodMap.get(lp.id) || {}), ...lp });
        });
        setProducts(Array.from(prodMap.values()));

        const catMap = new Map<string, Category>();
        defaultCats.forEach(dc => catMap.set(dc.id, dc));
        (c || []).forEach(lc => {
          if (lc?.id) catMap.set(lc.id, { ...(catMap.get(lc.id) || {}), ...lc });
        });
        setCategories(Array.from(catMap.values()));

        if (r && r.length > 0) setReviews(r);
      } catch (err) {
        console.error('Failed to sync products in background:', err);
      }
    }
    load();
    return () => { isMounted = false; };
  }, []);

  // Multi-tier resilient product resolver
  const product = useMemo(() => {
    if (!products || products.length === 0) return null;

    // Collect all tokens from URL params & pathname
    const pathSegments = location.pathname.split('/').map(s => s.trim()).filter(Boolean);
    const rawTokens: string[] = [];
    if (id) rawTokens.push(id);
    if (slug) rawTokens.push(slug);
    pathSegments.forEach(seg => {
      if (seg !== 'products' && seg !== 'product') rawTokens.push(seg);
    });

    const candidates: string[] = [];
    rawTokens.forEach(t => {
      try {
        const decoded = decodeURIComponent(t).trim().toLowerCase();
        if (decoded && !candidates.includes(decoded)) candidates.push(decoded);
      } catch {
        const raw = t.trim().toLowerCase();
        if (raw && !candidates.includes(raw)) candidates.push(raw);
      }
    });

    if (candidates.length === 0) return null;

    // 1. Exact match on id, slug, sku, tamil name, or parameterized name
    for (const token of candidates) {
      const found = products.find(
        (p: Product) =>
          p.id?.toLowerCase() === token ||
          p.slug?.toLowerCase() === token ||
          p.sku?.toLowerCase() === token ||
          p.tamil_name?.toLowerCase().trim() === token ||
          p.name?.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-') === token
      );
      if (found) return found;
    }

    // 2. Hyphen-agnostic match (e.g. 'p019' matches 'p-019', 'lif019' matches 'LIF-019')
    for (const token of candidates) {
      const noHyphen = token.replace(/[-_]/g, '');
      if (noHyphen.length >= 3) {
        const found = products.find(
          (p: Product) =>
            (p.id && p.id.toLowerCase().replace(/[-_]/g, '') === noHyphen) ||
            (p.sku && p.sku.toLowerCase().replace(/[-_]/g, '') === noHyphen)
        );
        if (found) return found;
      }
    }

    // 3. Leading zero agnostic match (e.g. 'p-19' or 'p19' matches 'p-019')
    for (const token of candidates) {
      const stripped = token.replace(/[-_]0+/, '-').replace(/^0+/, '');
      const found = products.find((p: Product) => {
        const pIdStripped = p.id?.toLowerCase().replace(/[-_]0+/, '-').replace(/^0+/, '');
        const pSkuStripped = p.sku?.toLowerCase().replace(/[-_]0+/, '-').replace(/^0+/, '');
        return (pIdStripped && pIdStripped === stripped) || (pSkuStripped && pSkuStripped === stripped);
      });
      if (found) return found;
    }

    // 4. Token starts with product id or slug (e.g. 'p-019-palm-jaggery' or 'p-019dummy')
    for (const token of candidates) {
      const found = products.find(
        (p: Product) =>
          (p.id && token.startsWith(p.id.toLowerCase())) ||
          (p.slug && token.startsWith(p.slug.toLowerCase()))
      );
      if (found) return found;
    }

    // 5. Short-code & prefix matching (e.g. 'karupa' matches Karupatti, 'pjaggr' matches Palm Jaggery)
    for (const token of candidates) {
      if (token.length >= 4) {
        const found = products.find(
          (p: Product) =>
            p.id?.toLowerCase().startsWith(token) ||
            p.slug?.toLowerCase().startsWith(token) ||
            p.name?.toLowerCase().startsWith(token) ||
            (p.tamil_name && p.tamil_name.toLowerCase().includes(token))
        );
        if (found) return found;
      }
    }

    return null;
  }, [products, id, slug, location.pathname]);

  // Reset active image index and quantity when product or route changes
  React.useEffect(() => {
    setActiveImageIndex(0);
    setBuyQuantity(1);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [id, slug, location.pathname]);

  // Prepare images array strictly from catalog data with deduplication
  const productImages = useMemo(() => {
    if (!product) return [];
    const list: string[] = [];
    if (Array.isArray(product.images) && product.images.length > 0) {
      product.images.forEach(img => {
        if (typeof img === 'string' && img.trim().length > 0) list.push(img.trim());
      });
    }
    if (product.image_url && typeof product.image_url === 'string' && product.image_url.trim().length > 0) {
      const trimmed = product.image_url.trim();
      if (!list.includes(trimmed)) {
        list.unshift(trimmed);
      }
    }
    if (list.length === 0) {
      list.push('https://images.unsplash.com/photo-1586201375761-83865001e31c?auto=format&fit=crop&w=800&q=80');
    }
    return list;
  }, [product]);

  const safeActiveIndex = (activeImageIndex >= 0 && activeImageIndex < productImages.length)
    ? activeImageIndex
    : 0;

  // Similar products recommendation from the same category
  const similarProducts = useMemo(() => {
    if (!product) return [];
    const fromCategory = products.filter(
      (p: Product) => p.id !== product.id && p.is_visible !== false && p.category_id === product.category_id
    );
    if (fromCategory.length >= 4) return fromCategory.slice(0, 4);
    
    // Fill up to 4 with other live catalog items
    const others = products.filter(
      (p: Product) => p.id !== product.id && p.is_visible !== false && p.category_id !== product.category_id
    );
    return [...fromCategory, ...others].slice(0, 4);
  }, [products, product]);

  const cartItem = product ? getItem(product.id) : undefined;
  const isInCart = Boolean(cartItem && cartItem.quantity > 0);
  const cartQty = cartItem?.quantity || 0;

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (shareDropdownRef.current && !shareDropdownRef.current.contains(e.target as Node)) {
        setShowShareDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleCopyLink = () => {
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(window.location.href);
      } else {
        const textArea = document.createElement('textarea');
        textArea.value = window.location.href;
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
      }
      setCopied(true);
      toast.success('Product link copied to clipboard!');
      setTimeout(() => setCopied(false), 2500);
    } catch {
      toast.error('Could not copy link');
    }
    setShowShareDropdown(false);
  };

  const handleShareWhatsApp = () => {
    if (!product) return;
    const text = `Take a look at *${product.name}* (${product.pack_size || '1 unit'}) at MR. VIVASAYI Traditional Organic Store:\n${window.location.href}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
    setShowShareDropdown(false);
  };

  const handleNativeShare = async () => {
    if (!product) return;
    if (navigator.share) {
      try {
        await navigator.share({
          title: product.name,
          text: `Check out ${product.name} at MR. VIVASAYI Traditional Organic Store`,
          url: window.location.href
        });
        setShowShareDropdown(false);
      } catch (e) {
        handleCopyLink();
      }
    } else {
      handleCopyLink();
    }
  };

  const nextImage = () => {
    setActiveImageIndex((prev) => (prev + 1) % productImages.length);
  };

  const prevImage = () => {
    setActiveImageIndex((prev) => (prev - 1 + productImages.length) % productImages.length);
  };

  const handleBack = () => {
    if (window.history.length > 2) {
      navigate(-1);
    } else {
      navigate('/products');
    }
  };

  // 1. Loading State (rarely shown because synchronous seeds are pre-populated)
  if (loading) {
    return <ProductDetailSkeleton />;
  }

  // 2. Product Not Found State (Graceful fallback with suggested products)
  if (!product) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-16 sm:py-24 text-center space-y-8">
        <div className="w-20 h-20 bg-amber-100 dark:bg-amber-950/80 text-amber-600 dark:text-amber-400 rounded-3xl flex items-center justify-center mx-auto shadow-inner border border-amber-200 dark:border-amber-800">
          <AlertCircle className="w-10 h-10" />
        </div>
        <div className="space-y-2">
          <h2 className="text-2xl sm:text-3xl font-serif font-bold text-gray-900 dark:text-emerald-100">
            Product Not Found
          </h2>
          <p className="text-sm text-gray-600 dark:text-emerald-300 max-w-md mx-auto leading-relaxed">
            The traditional food produce you requested may have been moved or updated. Explore our full catalog of heritage organic foods below!
          </p>
        </div>
        <div className="flex flex-wrap justify-center gap-3 pt-2">
          <Link
            to="/products"
            className="inline-flex items-center gap-2 bg-emerald-700 hover:bg-emerald-800 text-white font-bold px-6 py-3 rounded-2xl transition-all shadow-md active:scale-95 text-sm"
          >
            <ShoppingBag className="w-4 h-4 text-amber-300" />
            <span>Browse Full Product Catalog</span>
          </Link>
          <Link
            to="/"
            className="inline-flex items-center gap-2 bg-emerald-50 dark:bg-emerald-950 hover:bg-emerald-100 dark:hover:bg-emerald-900 text-emerald-800 dark:text-emerald-200 font-bold px-6 py-3 rounded-2xl border border-emerald-300 dark:border-emerald-800 transition-all text-sm"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Return to Home</span>
          </Link>
        </div>

        {/* Suggested popular products grid */}
        {products.length > 0 && (
          <div className="pt-10 border-t border-emerald-100 dark:border-emerald-800/80 text-left">
            <h3 className="font-serif font-bold text-lg text-gray-900 dark:text-emerald-100 mb-4 text-center">
              Popular Traditional Produce You Might Like
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {products.slice(0, 4).map((p) => (
                <ProductCard key={p.id} product={p} />
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  // Safe pricing calculations with strict numeric normalization
  const basePrice = Number(product.offer_price) > 0 && Number(product.offer_price) < Number(product.selling_price)
    ? Number(product.offer_price)
    : Number(product.selling_price) || 0;
  const sellingPrice = Number(product.selling_price) || 0;
  const mrp = Number(product.mrp) || 0;
  const hasOffer = Boolean(product.offer_price && Number(product.offer_price) > 0 && Number(product.offer_price) < sellingPrice);
  const hasMrpDiscount = Boolean(mrp > basePrice);
  const discountPercent = hasMrpDiscount && mrp > 0
    ? Math.round(((mrp - basePrice) / mrp) * 100)
    : hasOffer && sellingPrice > 0
    ? Math.round(((sellingPrice - basePrice) / sellingPrice) * 100)
    : 0;

  const currentStock = Math.max(0, Number(product.current_stock) || 0);
  const isOutOfStock = currentStock <= 0 || product.stock_status === 'OUT_OF_STOCK';
  const isBelow20 = currentStock > 0 && currentStock < 20;

  const activeCategoryObj = categories.find((c: Category) => c.id === product.category_id);

  // Collect dynamic product specifications based ONLY on real catalog fields
  const dynamicSpecs = [
    { label: 'SKU Code', value: product.sku },
    { label: 'Net Quantity', value: product.pack_size || (product.unit ? `1 ${product.unit}` : null) },
    { label: 'Product Category', value: activeCategoryObj?.name },
    { label: 'Farming Method', value: product.is_organic ? '100% Certified Organic' : 'Traditional Natural Farming' },
    product.organic_certification ? { label: 'Organic Certification', value: product.organic_certification } : null,
    product.source_description ? { label: 'Sourcing & Soil Heritage', value: product.source_description } : null,
    product.tax_percent !== undefined ? { label: 'GST Tax Rate', value: product.tax_percent > 0 ? `${product.tax_percent}% GST Included` : '0% (Exempt Traditional Produce)' } : null,
    product.expiry_tracking ? { label: 'Batch Freshness', value: 'Fresh Batch Tracking Monitored' } : null,
    { 
      label: 'Store Availability', 
      value: product.stock_status === 'IN_STOCK' ? 'Ready for Immediate Express Dispatch' : product.stock_status === 'LOW_STOCK' ? 'Limited Batch Remaining' : 'Temporarily Out of Stock' 
    }
  ].filter((item): item is { label: string; value: string } => Boolean(item && item.value));

  // Approved reviews
  const approvedReviews = useMemo(() => {
    return reviews.filter(r => r.status === 'APPROVED' || !r.status);
  }, [reviews]);

  // Reviews specifically matching this product
  const thisProductReviews = useMemo(() => {
    return approvedReviews.filter(r => r.product_id === product?.id);
  }, [approvedReviews, product?.id]);

  // General reviews (store-level reviews or general reviews without product_id)
  const generalReviews = useMemo(() => {
    return approvedReviews.filter(r => !r.product_id || r.product_id === '');
  }, [approvedReviews]);

  // Combined prioritized reviews for 3D coverflow:
  // Shows reviews for selected product first, followed by general reviews!
  const coverflowReviews = useMemo(() => {
    const list: Review[] = [];
    const seenIds = new Set<string>();

    // 1. This product reviews first
    thisProductReviews.forEach(r => {
      if (!seenIds.has(r.id)) {
        seenIds.add(r.id);
        list.push(r);
      }
    });

    // 2. General reviews next
    generalReviews.forEach(r => {
      if (!seenIds.has(r.id)) {
        seenIds.add(r.id);
        list.push(r);
      }
    });

    // 3. Fallback to other approved reviews if total < 3 to ensure rich 3D carousel experience
    if (list.length < 3) {
      approvedReviews.forEach(r => {
        if (!seenIds.has(r.id)) {
          seenIds.add(r.id);
          list.push(r);
        }
      });
    }

    return list;
  }, [approvedReviews, thisProductReviews, generalReviews]);

  // Reviews for this product (or all approved reviews if none specifically for this SKU)
  const productSpecificReviews = useMemo(() => {
    return thisProductReviews.length > 0 ? thisProductReviews : coverflowReviews;
  }, [thisProductReviews, coverflowReviews]);

  const avgProductRating = useMemo(() => {
    const targetList = thisProductReviews.length > 0 ? thisProductReviews : coverflowReviews;
    if (targetList.length === 0) return '5.0';
    const sum = targetList.reduce((acc, r) => acc + (Number(r.rating) || 5), 0);
    return (sum / targetList.length).toFixed(1);
  }, [thisProductReviews, coverflowReviews]);

  // Star ratings breakdown for modal
  const ratingDistribution = useMemo(() => {
    const source = modalTab === 'PRODUCT' && thisProductReviews.length > 0 ? thisProductReviews : approvedReviews;
    const counts = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
    source.forEach(r => {
      const star = Math.min(5, Math.max(1, Math.round(Number(r.rating) || 5))) as 1 | 2 | 3 | 4 | 5;
      counts[star] = (counts[star] || 0) + 1;
    });
    const total = source.length || 1;
    return {
      counts,
      percentages: {
        5: Math.round((counts[5] / total) * 100),
        4: Math.round((counts[4] / total) * 100),
        3: Math.round((counts[3] / total) * 100),
        2: Math.round((counts[2] / total) * 100),
        1: Math.round((counts[1] / total) * 100),
      },
      total: source.length
    };
  }, [modalTab, thisProductReviews, approvedReviews]);

  // Filtered reviews inside the modal
  const modalFilteredReviews = useMemo(() => {
    const source = modalTab === 'PRODUCT' && thisProductReviews.length > 0 ? thisProductReviews : (modalTab === 'PRODUCT' ? coverflowReviews : approvedReviews);
    return source.filter(r => {
      if (modalStarFilter !== 'ALL' && r.rating !== modalStarFilter) return false;
      if (modalOnlyPhotos && !r.image_url && (!r.images || r.images.length === 0)) return false;
      if (modalSearch.trim()) {
        const q = modalSearch.toLowerCase();
        const n = (r.customer_name || '').toLowerCase();
        const t = (r.title || '').toLowerCase();
        const b = (r.body || '').toLowerCase();
        const l = (r.customer_location || '').toLowerCase();
        const o = (r.order_id || '').toLowerCase();
        if (!n.includes(q) && !t.includes(q) && !b.includes(q) && !l.includes(q) && !o.includes(q)) return false;
      }
      return true;
    });
  }, [modalTab, thisProductReviews, coverflowReviews, approvedReviews, modalStarFilter, modalOnlyPhotos, modalSearch]);

  const handleImageFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsCompressingImage(true);
      toast.loading('Compressing photo to ≤ 100 KB...', { id: 'prod-rev-compress' });
      const { dataUrl, sizeKB } = await compressImageToMax100KB(file);
      setReviewFormData(prev => ({
        ...prev,
        image_url: dataUrl
      }));
      setImageSizeKB(sizeKB);
      toast.success(`Photo compressed to ${sizeKB} KB (Strictly ≤ 100 KB)!`, { id: 'prod-rev-compress' });
    } catch (err: any) {
      console.error('Photo compression error:', err);
      toast.error(err?.message || 'Failed to compress photo', { id: 'prod-rev-compress' });
    } finally {
      setIsCompressingImage(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleOpenProductReviewModal = () => {
    setImageSizeKB(null);
    const pName = product?.name || '';
    const suggested = pName.toLowerCase().includes('oil')
      ? 'Pure Marachekku Cold-Pressed Aroma & Outstanding Taste!'
      : pName.toLowerCase().includes('rice')
      ? 'Authentic Native Heirloom Rice - Wholesome Family Health!'
      : 'Exceptional Organic Freshness & Superior Traditional Quality!';

    setReviewFormData({
      customer_name: '',
      customer_phone: '',
      customer_location: '',
      order_id: '',
      rating: 5,
      title: suggested,
      body: '',
      image_url: ''
    });
    setShowReviewModal(true);
  };

  const handleSubmitProductReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reviewFormData.customer_name.trim() || !reviewFormData.body.trim()) {
      toast.error('Please enter your name and review message');
      return;
    }

    const newRev: Review = {
      id: `rev-${Date.now().toString().slice(-6)}`,
      customer_name: reviewFormData.customer_name.trim(),
      customer_phone: reviewFormData.customer_phone.trim() || undefined,
      customer_location: reviewFormData.customer_location.trim() || 'Tamil Nadu',
      order_id: reviewFormData.order_id.trim() || undefined,
      product_id: product?.id,
      rating: Number(reviewFormData.rating) || 5,
      title: reviewFormData.title.trim() || 'Verified Traditional Organic Experience',
      body: reviewFormData.body.trim(),
      image_url: reviewFormData.image_url.trim() || undefined,
      images: reviewFormData.image_url.trim() ? [reviewFormData.image_url.trim()] : undefined,
      is_verified_purchase: true,
      is_featured: true,
      status: 'APPROVED', // Automatically approved and live!
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    const updated = [newRev, ...reviews];
    setReviews(updated);
    await setJSONStore('reviews', updated);

    setShowReviewModal(false);
    toast.success('Thank you! Your review is now LIVE on this product page!');
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 space-y-8 sm:space-y-12">
      
      {/* Top Navigation & Breadcrumbs */}
      <div className="flex flex-wrap items-center justify-between gap-4 text-xs font-semibold text-gray-500 dark:text-emerald-300">
        <div className="flex items-center space-x-2">
          <Link to="/" className="hover:text-emerald-600 transition-colors">Home</Link>
          <span>/</span>
          <Link to="/products" className="hover:text-emerald-600 transition-colors">Shop Catalog</Link>
          {activeCategoryObj && (
            <>
              <span>/</span>
              <Link to={`/products?category=${activeCategoryObj.id}`} className="hover:text-emerald-600 transition-colors">
                {activeCategoryObj.name}
              </Link>
            </>
          )}
          <span>/</span>
          <span className="text-emerald-800 dark:text-amber-400 font-bold truncate max-w-[200px]">{product.name}</span>
        </div>

        <button
          onClick={handleBack}
          className="inline-flex items-center gap-1 text-emerald-700 dark:text-emerald-300 hover:text-emerald-900 font-bold bg-emerald-50 dark:bg-emerald-950 px-3 py-1.5 rounded-xl border border-emerald-200 dark:border-emerald-800 transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Back
        </button>
      </div>

      {/* Main Product Showcase Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-14 items-start">
        
        {/* Left Column: Multi-Image Carousel & Thumbnail Selector */}
        <div className="space-y-4">
          <div className="relative aspect-square rounded-3xl overflow-hidden shadow-2xl border border-emerald-100 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950 group">
            {/* Main Active Image with Zoom on click */}
            <img
              src={productImages[safeActiveIndex] || product.image_url || 'https://images.unsplash.com/photo-1586201375761-83865001e31c?auto=format&fit=crop&w=800&q=80'}
              alt={`${product.name} - Angle ${safeActiveIndex + 1}`}
              className="w-full h-full object-cover transition-all duration-500 cursor-zoom-in"
              onClick={() => setLightboxImg(productImages[safeActiveIndex] || product.image_url || null)}
              onError={(e) => {
                (e.currentTarget as HTMLImageElement).src = 'https://images.unsplash.com/photo-1586201375761-83865001e31c?auto=format&fit=crop&w=800&q=80';
              }}
            />

            {/* Carousel Previous Button (Only shown if multiple real images exist) */}
            {productImages.length > 1 && (
              <button
                type="button"
                onClick={prevImage}
                className="absolute left-4 top-1/2 -translate-y-1/2 p-2.5 rounded-full bg-white/80 dark:bg-emerald-900/80 backdrop-blur-md text-emerald-900 dark:text-white shadow-xl opacity-90 group-hover:opacity-100 hover:scale-110 transition-all border border-emerald-100 dark:border-emerald-700 cursor-pointer"
                title="Previous Image"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
            )}

            {/* Carousel Next Button (Only shown if multiple real images exist) */}
            {productImages.length > 1 && (
              <button
                type="button"
                onClick={nextImage}
                className="absolute right-4 top-1/2 -translate-y-1/2 p-2.5 rounded-full bg-white/80 dark:bg-emerald-900/80 backdrop-blur-md text-emerald-900 dark:text-white shadow-xl opacity-90 group-hover:opacity-100 hover:scale-110 transition-all border border-emerald-100 dark:border-emerald-700 cursor-pointer"
                title="Next Image"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            )}

            {/* Organic Sourced Badge (Only if is_organic is checked in catalog) */}
            {product.is_organic && (
              <span className="absolute top-4 left-4 bg-emerald-700/95 backdrop-blur-sm text-white text-xs font-extrabold px-3.5 py-1.5 rounded-full flex items-center gap-1.5 shadow-lg border border-emerald-500/40">
                <Leaf className="w-4 h-4 text-emerald-300" /> 100% Traditional Organic
              </span>
            )}

            {/* Interactive Share Button & Dropdown Menu */}
            <div className="absolute top-4 right-4 z-20" ref={shareDropdownRef}>
              <button
                type="button"
                onClick={() => setShowShareDropdown(prev => !prev)}
                className="p-2.5 rounded-full bg-white/90 dark:bg-emerald-900/90 backdrop-blur-sm text-gray-700 dark:text-emerald-200 hover:bg-white dark:hover:bg-emerald-800 transition-colors shadow-lg border border-emerald-100 dark:border-emerald-700 cursor-pointer flex items-center justify-center hover:scale-105"
                title="Share product"
              >
                <Share2 className="w-4 h-4 text-emerald-700 dark:text-amber-400" />
              </button>

              {/* Share Options Dropdown Menu */}
              {showShareDropdown && (
                <div className="absolute right-0 top-11 w-56 bg-white dark:bg-emerald-950 rounded-2xl shadow-2xl border border-emerald-200 dark:border-emerald-800 py-1.5 z-30 animate-fadeIn text-xs">
                  <div className="px-3 py-1.5 text-[10px] font-black uppercase tracking-wider text-emerald-800 dark:text-amber-400 border-b border-emerald-100 dark:border-emerald-800 flex items-center gap-1.5">
                    <Share2 className="w-3 h-3" />
                    <span>Share This Produce</span>
                  </div>
                  
                  <button
                    type="button"
                    onClick={handleCopyLink}
                    className="w-full px-3 py-2 text-left font-bold text-gray-800 dark:text-emerald-100 hover:bg-emerald-50 dark:hover:bg-emerald-900 flex items-center gap-2 transition-colors cursor-pointer"
                  >
                    <Copy className="w-3.5 h-3.5 text-emerald-600 dark:text-amber-400" />
                    <span>Copy Product Link</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleShareWhatsApp}
                    className="w-full px-3 py-2 text-left font-bold text-emerald-700 dark:text-emerald-300 hover:bg-emerald-50 dark:hover:bg-emerald-900 flex items-center gap-2 transition-colors cursor-pointer"
                  >
                    <MessageSquare className="w-3.5 h-3.5 text-emerald-600 dark:text-amber-400" />
                    <span>Share via WhatsApp</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleNativeShare}
                    className="w-full px-3 py-2 text-left font-bold text-gray-800 dark:text-emerald-100 hover:bg-emerald-50 dark:hover:bg-emerald-900 flex items-center gap-2 transition-colors cursor-pointer"
                  >
                    <Share2 className="w-3.5 h-3.5 text-emerald-600 dark:text-amber-400" />
                    <span>More Share Options...</span>
                  </button>
                </div>
              )}

              {copied && (
                <span className="absolute top-12 right-0 bg-emerald-950 text-amber-300 text-xs font-bold px-3 py-1.5 rounded-xl shadow-xl border border-emerald-700 animate-fadeIn whitespace-nowrap z-30">
                  ✓ Link copied to clipboard!
                </span>
              )}
            </div>

            {/* Stock status indicator pill */}
            <div className="absolute bottom-4 left-4">
              {isOutOfStock ? (
                <span className="bg-rose-600/95 backdrop-blur-sm text-white text-xs font-bold px-3 py-1 rounded-full shadow-lg flex items-center gap-1.5 border border-rose-400">
                  <AlertCircle className="w-3.5 h-3.5" /> Out of Stock
                </span>
              ) : isBelow20 ? (
                <span className="bg-amber-500/95 backdrop-blur-sm text-emerald-950 font-black text-xs px-3.5 py-1 rounded-full shadow-lg flex items-center gap-1.5 border border-amber-300 animate-pulse">
                  ⚡ Only {product.current_stock} left in stock!
                </span>
              ) : (
                <span className="bg-emerald-600/95 backdrop-blur-sm text-white text-xs font-bold px-3 py-1 rounded-full shadow-lg flex items-center gap-1.5 border border-emerald-400">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-200" /> In Stock
                </span>
              )}
            </div>

            {/* Image counter indicator (Only if multiple real images exist) */}
            {productImages.length > 1 && (
              <div className="absolute bottom-4 right-4 bg-black/60 backdrop-blur-xs text-white text-[11px] font-mono font-bold px-2.5 py-1 rounded-lg">
                {activeImageIndex + 1} / {productImages.length}
              </div>
            )}
          </div>

          {/* Thumbnail Carousel Selector (Only if multiple real images exist) */}
          {productImages.length > 1 && (
            <div className="flex items-center gap-3 overflow-x-auto pb-2 scrollbar-none">
              {productImages.map((imgUrl, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setActiveImageIndex(idx)}
                  className={`relative w-20 h-20 rounded-2xl overflow-hidden shrink-0 border-2 transition-all cursor-pointer ${
                    activeImageIndex === idx 
                      ? 'border-emerald-600 dark:border-amber-400 scale-105 shadow-md ring-2 ring-emerald-400/50' 
                      : 'border-emerald-100 dark:border-emerald-800 opacity-70 hover:opacity-100'
                  }`}
                >
                  <img 
                    src={imgUrl} 
                    alt={`Thumbnail ${idx + 1}`} 
                    className="w-full h-full object-cover" 
                    onError={(e) => {
                      (e.currentTarget as HTMLImageElement).src = 'https://images.unsplash.com/photo-1586201375761-83865001e31c?auto=format&fit=crop&w=200&q=80';
                    }}
                  />
                </button>
              ))}
            </div>
          )}

          {/* Sourcing Guarantee Badges */}
          <div className="grid grid-cols-3 gap-3 pt-2">
            <div className="bg-emerald-50/80 dark:bg-emerald-950/60 p-3.5 rounded-2xl border border-emerald-100 dark:border-emerald-800 text-center">
              <ShieldCheck className="w-5 h-5 text-emerald-600 dark:text-amber-400 mx-auto mb-1" />
              <div className="text-xs font-bold text-gray-800 dark:text-emerald-100">Zero Chemical</div>
              <div className="text-[10px] text-gray-500 dark:text-emerald-300">Unpolished & Pure</div>
            </div>
            <div className="bg-emerald-50/80 dark:bg-emerald-950/60 p-3.5 rounded-2xl border border-emerald-100 dark:border-emerald-800 text-center">
              <Award className="w-5 h-5 text-emerald-600 dark:text-amber-400 mx-auto mb-1" />
              <div className="text-xs font-bold text-gray-800 dark:text-emerald-100">Heritage Produce</div>
              <div className="text-[10px] text-gray-500 dark:text-emerald-300">Native Quality Variety</div>
            </div>
            <div className="bg-emerald-50/80 dark:bg-emerald-950/60 p-3.5 rounded-2xl border border-emerald-100 dark:border-emerald-800 text-center">
              <Truck className="w-5 h-5 text-emerald-600 dark:text-amber-400 mx-auto mb-1" />
              <div className="text-xs font-bold text-gray-800 dark:text-emerald-100">Store Direct</div>
              <div className="text-[10px] text-gray-500 dark:text-emerald-300">Fresh Batch Harvest</div>
            </div>
          </div>
        </div>

        {/* Right Column: Pricing, Pack, Specifications & Ordering CTAs */}
        <div className="space-y-6">
          
          <div>
            {/* Category Pill, SKU and Tamil Name Header */}
            <div className="flex flex-wrap items-center justify-between gap-2 text-xs font-bold text-emerald-700 dark:text-amber-400 uppercase tracking-wider mb-2">
              <div className="flex items-center gap-2">
                {activeCategoryObj && (
                  <Link
                    to={`/products?category=${activeCategoryObj.id}`}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-100 dark:bg-emerald-900 text-emerald-950 dark:text-emerald-100 font-extrabold normal-case border border-emerald-200 dark:border-emerald-800 hover:scale-105 transition-all shadow-2xs"
                  >
                    <span>{activeCategoryObj.icon || '🌾'}</span>
                    <span>{activeCategoryObj.name}</span>
                  </Link>
                )}
                <span className="font-mono bg-gray-100 dark:bg-emerald-950 px-2 py-0.5 rounded text-gray-600 dark:text-emerald-300">
                  SKU: {product.sku}
                </span>
              </div>
              {product.tamil_name && (
                <span className="text-base font-bold text-emerald-800 dark:text-emerald-300 font-sans normal-case">
                  {product.tamil_name}
                </span>
              )}
            </div>

            {/* Product Title */}
            <h1 className="text-3xl sm:text-4xl font-serif font-bold text-gray-900 dark:text-emerald-100 leading-tight">
              {product.name}
            </h1>

            {/* Short Description Teaser (Only if added in catalog) */}
            {product.short_description && (
              <p className="mt-2 text-sm text-gray-600 dark:text-emerald-200/90 italic leading-relaxed">
                "{product.short_description}"
              </p>
            )}

            {/* Grouped Product Badges & Labels (Strictly dynamic based on Catalog) */}
            <div className="flex flex-wrap items-center gap-2 mt-3">
              {/* Festival Offer Badge (Only if festival_offer is populated) */}
              {product.festival_offer && (
                <span className="bg-gradient-to-r from-amber-500 via-rose-500 to-amber-600 text-white text-xs font-black px-3.5 py-1 rounded-full flex items-center gap-1.5 shadow-md border border-amber-300 animate-pulse uppercase tracking-wider">
                  <Sparkles className="w-3.5 h-3.5 text-amber-200" />
                  <span>{product.festival_offer}</span>
                </span>
              )}
              {/* Certified Organic Badge */}
              {product.is_organic && (
                <span className="bg-emerald-700 text-white text-xs font-black px-3 py-1 rounded-full flex items-center gap-1.5 shadow-xs">
                  <Leaf className="w-3.5 h-3.5 text-emerald-300" />
                  <span>100% Certified Organic</span>
                </span>
              )}
              {/* Featured Badge */}
              {product.is_featured && (
                <span className="bg-amber-400 text-emerald-950 text-xs font-black px-3 py-1 rounded-full flex items-center gap-1.5 shadow-xs">
                  <Sparkles className="w-3.5 h-3.5 text-emerald-950" />
                  <span>Featured Produce</span>
                </span>
              )}
              {/* Dynamic Labels added in Catalog Manager */}
              {product.labels && product.labels.map((lbl, idx) => (
                <span
                  key={idx}
                  className="bg-teal-100 dark:bg-teal-900/60 text-teal-900 dark:text-teal-200 border border-teal-300 dark:border-teal-700 text-xs font-black px-3 py-1 rounded-full flex items-center gap-1 shadow-2xs"
                >
                  <Tag className="w-3 h-3 text-teal-600 dark:text-teal-300" />
                  <span>{lbl}</span>
                </span>
              ))}
              {/* Special Offer Tag */}
              {hasOffer && (
                <span className="bg-gradient-to-r from-rose-600 to-amber-600 text-white text-xs font-extrabold px-3 py-1 rounded-full uppercase tracking-wider animate-pulse shadow-md flex items-center gap-1">
                  <span>⏱️ Special Offer</span>
                  {discountPercent > 0 && <span className="text-[10px] bg-white/20 px-1.5 py-0.2 rounded">({discountPercent}% OFF)</span>}
                </span>
              )}
            </div>

            {/* High-Contrast Large Pricing Display (Pack: MRP: Our:) */}
            <div className="mt-5 p-5 bg-emerald-50/70 dark:bg-emerald-950/60 rounded-3xl border border-emerald-200/80 dark:border-emerald-800 space-y-3">
              
              {/* Pack Size */}
              <div className="flex items-center justify-between">
                <div className="inline-flex items-center gap-2 font-bold text-sm text-emerald-950 dark:text-emerald-100 bg-white dark:bg-emerald-900/80 px-3.5 py-1.5 rounded-xl border border-emerald-200 dark:border-emerald-700 shadow-xs">
                  <Package className="w-4 h-4 text-emerald-600 dark:text-amber-400" />
                  <span>Pack Size: <strong className="font-black text-base text-emerald-800 dark:text-amber-300">{product.pack_size || `1 ${product.unit}`}</strong> ({product.unit})</span>
                </div>

                {discountPercent > 0 && (
                  <span className="bg-amber-400 text-emerald-950 font-black text-xs px-2.5 py-1 rounded-lg shadow-xs">
                    Save {discountPercent}%
                  </span>
                )}
              </div>

              {/* Price Breakdown */}
              <div className="pt-2 flex items-baseline gap-4 flex-wrap">
                <div className="flex items-baseline gap-2">
                  <span className="text-sm font-extrabold text-gray-500 dark:text-emerald-300 uppercase tracking-wider">
                    {hasOffer ? 'Offer Price:' : 'Our Price:'}
                  </span>
                  <span className={`text-3xl sm:text-4xl font-black ${hasOffer ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-800 dark:text-amber-400'}`}>
                    {formatPrice(basePrice)}
                  </span>
                </div>

                {hasOffer && (
                  <span className="text-base text-gray-400 line-through font-mono">
                    Regular: {formatPrice(product.selling_price)}
                  </span>
                )}

                {product.mrp && product.mrp > basePrice && (
                  <span className="text-sm text-rose-500/90 dark:text-rose-400 line-through font-mono font-bold">
                    MRP: {formatPrice(product.mrp)}
                  </span>
                )}
              </div>

              <div className="text-[11px] text-gray-500 dark:text-emerald-300/80">
                Inclusive of all taxes • Guaranteed chemical-free & fresh store-counter inventory
              </div>
            </div>
          </div>

          {/* Sourcing & Stock Status Info Panel */}
          <div className="bg-white dark:bg-emerald-900/30 p-5 rounded-2xl border border-emerald-100 dark:border-emerald-800 space-y-2.5 text-xs sm:text-sm">
            <div className="flex justify-between items-center">
              <span className="text-gray-600 dark:text-emerald-300 font-medium">Availability:</span>
              <div>
                {isOutOfStock ? (
                  <span className="font-bold text-rose-600 flex items-center gap-1">
                    <AlertCircle className="w-4 h-4" /> Currently Out of Stock
                  </span>
                ) : isBelow20 ? (
                  <span className="font-black text-amber-600 dark:text-amber-400 flex items-center gap-1 animate-pulse">
                    ⚡ Only {product.current_stock} left in stock!
                  </span>
                ) : (
                  <span className="font-bold text-emerald-700 dark:text-emerald-300 flex items-center gap-1">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500" /> In Stock & Ready for Store Dispatch
                  </span>
                )}
              </div>
            </div>

            {/* Organic Certification (Only if set in Catalog) */}
            {product.organic_certification && (
              <div className="flex justify-between items-center pt-1 border-t border-emerald-100 dark:border-emerald-800/60">
                <span className="text-gray-600 dark:text-emerald-300 font-medium">Organic Certification:</span>
                <span className="font-bold text-emerald-800 dark:text-amber-300">{product.organic_certification}</span>
              </div>
            )}
          </div>

          {/* Interactive In-Page Quantity Selector & Add to Cart Controls */}
          <div className="space-y-4 pt-2">
            
            {/* Quantity Selector */}
            <div className="flex items-center gap-4">
              <span className="font-bold text-xs uppercase tracking-wider text-gray-600 dark:text-emerald-300">
                Quantity:
              </span>

              {isInCart ? (
                /* Item is already in cart: sync direct with cart quantity */
                <div className="flex items-center bg-emerald-700 dark:bg-emerald-800 text-white rounded-2xl shadow-lg border border-emerald-600 overflow-hidden">
                  <button
                    type="button"
                    onClick={() => updateQuantity(product.id, (cartItem?.quantity || 1) - 1)}
                    className="p-3 hover:bg-emerald-800 dark:hover:bg-emerald-700 text-white font-black transition-colors active:scale-95 cursor-pointer"
                    title="Decrease quantity"
                  >
                    <Minus className="w-4 h-4" />
                  </button>
                  <span className="px-5 font-mono font-black text-base text-amber-300">
                    {cartItem?.quantity} in cart
                  </span>
                  <button
                    type="button"
                    disabled={isOutOfStock}
                    onClick={() => updateQuantity(product.id, (cartItem?.quantity || 0) + 1)}
                    className="p-3 hover:bg-emerald-800 dark:hover:bg-emerald-700 text-white font-black transition-colors active:scale-95 disabled:opacity-50 cursor-pointer"
                    title="Increase quantity"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                /* Pre-add quantity selector */
                <div className="flex items-center bg-emerald-50 dark:bg-emerald-950 border border-emerald-300 dark:border-emerald-700 rounded-2xl overflow-hidden">
                  <button
                    type="button"
                    onClick={() => setBuyQuantity((q) => Math.max(1, q - 1))}
                    className="p-3 hover:bg-emerald-100 dark:hover:bg-emerald-900 text-gray-800 dark:text-emerald-200 font-black transition-colors cursor-pointer"
                  >
                    <Minus className="w-4 h-4" />
                  </button>
                  <span className="px-5 font-mono font-black text-sm text-gray-900 dark:text-emerald-100">
                    {buyQuantity}
                  </span>
                  <button
                    type="button"
                    onClick={() => setBuyQuantity((q) => q + 1)}
                    className="p-3 hover:bg-emerald-100 dark:hover:bg-emerald-900 text-gray-800 dark:text-emerald-200 font-black transition-colors cursor-pointer"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>

            {/* Main Action CTAs */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                disabled={isOutOfStock}
                onClick={() => {
                  if (isInCart) {
                    updateQuantity(product.id, (cartItem?.quantity || 1) + 1);
                    toast.success(`Updated cart quantity to ${(cartItem?.quantity || 1) + 1}`);
                  } else {
                    addItem(product, buyQuantity);
                    toast.success(`Added ${buyQuantity} pack(s) to order!`);
                  }
                }}
                className="w-full flex items-center justify-center space-x-2 bg-emerald-700 hover:bg-emerald-800 disabled:opacity-50 text-white font-black py-4 px-6 rounded-2xl shadow-lg hover:shadow-xl transition-all text-sm active:scale-95 cursor-pointer"
              >
                <ShoppingBag className="w-5 h-5 text-amber-300" />
                <span>{isInCart ? 'Add Another Pack To Order' : 'Add To WhatsApp Order List'}</span>
              </button>

              <a
                href={`https://wa.me/${getWhatsAppOrdersNumber()}?text=${encodeURIComponent(
                  `Hello MR. VIVASAYI,\nI want to order: *${product.name}*\nPack Size: ${product.pack_size || `1 ${product.unit}`}\nPrice: ${formatPrice(basePrice)}\nQuantity: ${isInCart ? cartItem?.quantity : buyQuantity}\nTotal: ${formatPrice(basePrice * (isInCart ? (cartItem?.quantity || 1) : buyQuantity))}\n\nProduct Link: ${window.location.href}`
                )}`}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full flex items-center justify-center space-x-2 bg-emerald-100 dark:bg-emerald-900 hover:bg-emerald-200 dark:hover:bg-emerald-800 text-emerald-950 dark:text-amber-300 font-bold py-4 px-6 rounded-2xl transition-all border border-emerald-300 dark:border-emerald-700 text-sm shadow-xs cursor-pointer"
              >
                <MessageSquare className="w-5 h-5 text-emerald-600 dark:text-amber-400" />
                <span>Direct WhatsApp Chat</span>
              </a>
            </div>

          </div>

          {/* Product Description & Narrative (Only shown if description is entered in Catalog Manager) */}
          {product.description && (
            <div className="space-y-3 pt-3 border-t border-emerald-100 dark:border-emerald-800/80">
              <h3 className="font-serif font-bold text-base text-gray-900 dark:text-emerald-100 uppercase tracking-wider flex items-center gap-2">
                <Leaf className="w-4 h-4 text-emerald-600 dark:text-amber-400" />
                <span>Traditional Benefits & Heritage</span>
              </h3>
              <div className="text-sm text-gray-700 dark:text-emerald-200/90 leading-relaxed bg-emerald-50/50 dark:bg-emerald-950/40 p-4 rounded-2xl border border-emerald-100 dark:border-emerald-800 whitespace-pre-line">
                {product.description}
              </div>
            </div>
          )}

          {/* Farm Sourcing & Soil Origin (Only shown if source_description is entered in Catalog Manager) */}
          {product.source_description && (
            <div className="space-y-2 p-4 bg-emerald-50/60 dark:bg-emerald-950/60 rounded-2xl border border-emerald-200 dark:border-emerald-800 text-xs sm:text-sm">
              <div className="font-bold flex items-center gap-1.5 text-emerald-900 dark:text-amber-300">
                <Leaf className="w-4 h-4 text-emerald-600 dark:text-amber-400" />
                <span>Farm Sourcing & Soil Heritage:</span>
              </div>
              <p className="text-gray-700 dark:text-emerald-200/90 leading-relaxed">
                {product.source_description}
              </p>
            </div>
          )}

          {/* Itemized Product Specifications Table (Only rendered with actual existing values) */}
          {dynamicSpecs.length > 0 && (
            <div className="space-y-3 pt-2">
              <h3 className="font-serif font-bold text-sm text-gray-900 dark:text-emerald-100 uppercase tracking-wider flex items-center gap-2">
                <FileText className="w-4 h-4 text-emerald-600 dark:text-amber-400" />
                <span>Product Specifications & Details</span>
              </h3>
              <div className="bg-white dark:bg-emerald-950/60 rounded-2xl border border-emerald-100 dark:border-emerald-800 overflow-hidden text-xs divide-y divide-emerald-100 dark:divide-emerald-800/60">
                {dynamicSpecs.map((spec, sIdx) => (
                  <div key={sIdx} className="grid grid-cols-2 p-3 hover:bg-emerald-50/50 dark:hover:bg-emerald-900/30 transition-colors">
                    <span className="font-bold text-gray-500 dark:text-emerald-300">{spec.label}:</span>
                    <span className="font-semibold text-gray-900 dark:text-emerald-100 break-words">{spec.value}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Storage Guidelines (Only shown if storage_info is entered in Catalog Manager) */}
          {product.storage_info && (
            <div className="text-xs bg-amber-50 dark:bg-amber-950/60 p-4 rounded-2xl border border-amber-200 dark:border-amber-800 text-amber-900 dark:text-amber-200 space-y-1">
              <div className="font-bold flex items-center gap-1.5">
                <HelpCircle className="w-3.5 h-3.5 text-amber-600" />
                <span>Storage & Shelf Preservation Guidelines:</span>
              </div>
              <p className="leading-relaxed">{product.storage_info}</p>
            </div>
          )}

          {/* Additional Culinary / Chef Notes (Only shown if notes exist on the product) */}
          {product.notes && (
            <div className="text-xs bg-emerald-50/80 dark:bg-emerald-950/70 p-4 rounded-2xl border border-emerald-200 dark:border-emerald-800 text-emerald-950 dark:text-emerald-200 space-y-2">
              <div className="font-bold flex items-center gap-1.5 text-emerald-900 dark:text-amber-300 text-sm">
                <Utensils className="w-4 h-4 text-emerald-600 dark:text-amber-400" />
                <span>Culinary & Handling Notes:</span>
              </div>
              <p className="text-gray-700 dark:text-emerald-200/90 leading-relaxed whitespace-pre-line">
                {product.notes}
              </p>
            </div>
          )}

        </div>

      </div>

      {/* Customer Reviews & Ratings Section */}
      <section className="pt-12 border-t border-emerald-100 dark:border-emerald-800 space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4">
          <div>
            <span className="text-xs font-bold text-emerald-600 dark:text-amber-400 uppercase tracking-widest flex items-center gap-1.5">
              <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-500" />
              <span>VERIFIED CUSTOMER REVIEWS &amp; RATINGS</span>
            </span>
            <div className="flex items-center gap-3 mt-1">
              <h2 className="text-2xl sm:text-3xl font-serif font-bold text-gray-900 dark:text-emerald-100">
                Customer Experiences
              </h2>
              <div className="flex items-center gap-1 bg-amber-50 dark:bg-amber-950/70 border border-amber-300 dark:border-amber-700 px-2.5 py-1 rounded-xl text-xs font-black text-amber-900 dark:text-amber-200">
                <span>{avgProductRating}</span>
                <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-500" />
                <span className="text-[10px] text-gray-500 dark:text-emerald-300 font-normal">
                  ({thisProductReviews.length > 0 ? thisProductReviews.length : coverflowReviews.length})
                </span>
              </div>
            </div>
            <p className="text-xs sm:text-sm text-gray-600 dark:text-emerald-300 mt-1">
              Real feedback from Tamil Nadu families who ordered this traditional produce.
            </p>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap">
            <button
              type="button"
              onClick={() => {
                setModalTab('PRODUCT');
                setShowAllReviewsModal(true);
              }}
              className="px-4 py-2.5 bg-emerald-100 hover:bg-emerald-200 dark:bg-emerald-900/90 dark:hover:bg-emerald-800 text-emerald-900 dark:text-emerald-100 font-extrabold text-xs sm:text-sm rounded-2xl border border-emerald-300 dark:border-emerald-700 shadow-sm transition flex items-center gap-1.5 cursor-pointer hover:scale-105 active:scale-95"
            >
              <BookOpen className="w-4 h-4 text-emerald-700 dark:text-amber-400" />
              <span>View All Reviews ({thisProductReviews.length > 0 ? thisProductReviews.length : coverflowReviews.length})</span>
            </button>

            <button
              type="button"
              onClick={handleOpenProductReviewModal}
              className="px-5 py-2.5 bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-500 hover:to-amber-600 text-slate-950 font-black text-xs sm:text-sm rounded-2xl shadow-md transition flex items-center gap-1.5 shrink-0 cursor-pointer hover:scale-105 active:scale-95"
            >
              <Plus className="w-4 h-4" />
              <span>Write a Review</span>
            </button>
          </div>
        </div>

        {coverflowReviews.length === 0 ? (
          <div className="p-8 text-center bg-white dark:bg-emerald-950/60 rounded-3xl border border-dashed border-emerald-200 dark:border-emerald-800 space-y-2">
            <Star className="w-8 h-8 text-amber-400 mx-auto" />
            <p className="font-bold text-sm text-gray-800 dark:text-emerald-100">No customer reviews yet for this item</p>
            <p className="text-xs text-gray-500">Be the first to share your cooking and health experience!</p>
            <button
              type="button"
              onClick={handleOpenProductReviewModal}
              className="mt-2 px-4 py-2 bg-emerald-700 text-white font-bold text-xs rounded-xl shadow cursor-pointer"
            >
              Write First Review
            </button>
          </div>
        ) : (
          <div className="w-full space-y-3">
            {/* 3D Coverflow Card View (Prioritizes this product, then general reviews) */}
            <ReviewCoverflow3D
              reviews={coverflowReviews}
              products={products}
              onViewPhoto={(url) => setLightboxImg(url)}
            />

            {/* Bottom quick navigation strip */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 border-t border-emerald-100/80 dark:border-emerald-800/60 text-xs">
              <span className="text-gray-500 dark:text-emerald-300 font-medium flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                <span>Drag, swipe or tap side cards to flip through 3D reviews</span>
              </span>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setModalTab('PRODUCT');
                    setShowAllReviewsModal(true);
                  }}
                  className="font-bold text-emerald-700 dark:text-amber-400 hover:underline flex items-center gap-1 cursor-pointer"
                >
                  <span>See all detailed reviews &amp; photos ({thisProductReviews.length > 0 ? thisProductReviews.length : coverflowReviews.length}) &rarr;</span>
                </button>
                <Link
                  to={`/reviews?productId=${product.id}`}
                  className="text-gray-500 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-amber-300 flex items-center gap-1 font-semibold"
                >
                  <span>Open full page</span>
                  <ExternalLink className="w-3 h-3" />
                </Link>
              </div>
            </div>
          </div>
        )}
      </section>

      {/* View All Reviews Popup Modal */}
      {showAllReviewsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/75 backdrop-blur-md animate-in fade-in duration-200">
          <div className="bg-white dark:bg-emerald-950 max-w-4xl w-full rounded-3xl border-2 border-emerald-300 dark:border-emerald-700 shadow-2xl overflow-hidden flex flex-col max-h-[92vh] animate-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="p-5 sm:p-6 border-b border-emerald-100 dark:border-emerald-800 bg-gradient-to-r from-emerald-50/70 via-white to-amber-50/30 dark:from-emerald-900/40 dark:via-emerald-950 dark:to-emerald-900/30 flex items-start justify-between gap-4">
              <div className="flex items-start gap-3.5">
                {product?.image_url && (
                  <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl overflow-hidden border border-emerald-200 dark:border-emerald-700 bg-emerald-50 dark:bg-emerald-900 shrink-0 shadow-xs">
                    <img src={product.image_url} alt={product.name} className="w-full h-full object-cover" />
                  </div>
                )}
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-700">
                      Product Reviews
                    </span>
                    <span className="text-xs text-gray-500 dark:text-emerald-300 font-mono">
                      SKU: {product?.sku}
                    </span>
                  </div>
                  <h3 className="text-lg sm:text-xl font-bold font-serif text-gray-900 dark:text-emerald-100 mt-0.5">
                    {product?.name}
                  </h3>
                  <div className="flex items-center gap-2.5 mt-1 text-xs text-gray-600 dark:text-emerald-300">
                    <div className="flex items-center text-amber-400">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <Star key={i} className="w-3.5 h-3.5 fill-current" />
                      ))}
                    </div>
                    <span className="font-extrabold text-amber-700 dark:text-amber-300">
                      {avgProductRating} / 5.0
                    </span>
                    <span>&bull;</span>
                    <span className="font-semibold">
                      {thisProductReviews.length} direct reviews ({approvedReviews.length} total store reviews)
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <Link
                  to={`/reviews?productId=${product.id}`}
                  className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-700 text-white font-bold text-xs hover:bg-emerald-800 transition shadow-xs"
                  title="Open on dedicated full reviews page"
                >
                  <span>Open Full Reviews Page</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </Link>
                <button
                  type="button"
                  onClick={() => setShowAllReviewsModal(false)}
                  className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 p-1.5 rounded-xl hover:bg-gray-100 dark:hover:bg-emerald-900 transition cursor-pointer"
                  title="Close modal"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Ratings Breakdown Summary */}
            <div className="p-4 sm:p-5 bg-emerald-50/40 dark:bg-emerald-900/20 border-b border-emerald-100 dark:border-emerald-800/60 grid grid-cols-1 sm:grid-cols-12 gap-4 items-center">
              {/* Overall Score Box */}
              <div className="sm:col-span-4 flex flex-col items-center justify-center p-3 bg-white dark:bg-emerald-950/70 rounded-2xl border border-emerald-100 dark:border-emerald-800 text-center shadow-xs">
                <div className="text-3xl sm:text-4xl font-serif font-black text-amber-500">
                  {avgProductRating}
                </div>
                <div className="flex items-center gap-1 text-amber-400 my-1">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star key={i} className="w-4 h-4 fill-current" />
                  ))}
                </div>
                <span className="text-[11px] font-bold text-gray-500 dark:text-emerald-300">
                  Based on {ratingDistribution.total} customer feedback{ratingDistribution.total === 1 ? '' : 's'}
                </span>
              </div>

              {/* Star Distribution Progress Bars */}
              <div className="sm:col-span-8 space-y-1.5 text-xs">
                {[5, 4, 3, 2, 1].map((star) => {
                  const s = star as 1 | 2 | 3 | 4 | 5;
                  const count = ratingDistribution.counts[s] || 0;
                  const pct = ratingDistribution.percentages[s] || 0;
                  const isActive = modalStarFilter === star;

                  return (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setModalStarFilter(prev => prev === star ? 'ALL' : star)}
                      className={`w-full flex items-center gap-2 px-2 py-1 rounded-lg transition text-left cursor-pointer ${
                        isActive
                          ? 'bg-amber-100/80 dark:bg-amber-950/60 font-bold'
                          : 'hover:bg-emerald-100/40 dark:hover:bg-emerald-900/40'
                      }`}
                    >
                      <span className="w-12 font-bold flex items-center gap-1 text-gray-700 dark:text-emerald-200 shrink-0">
                        <span>{star}</span>
                        <Star className="w-3 h-3 fill-amber-400 text-amber-500" />
                      </span>
                      <div className="flex-1 h-2.5 bg-gray-200 dark:bg-emerald-900 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-amber-400 to-amber-500 rounded-full transition-all duration-500"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <span className="w-12 text-right font-mono text-[11px] text-gray-500 dark:text-emerald-300 shrink-0">
                        {count} ({pct}%)
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Filter and Search Bar */}
            <div className="p-3 sm:p-4 border-b border-emerald-100 dark:border-emerald-800 bg-white dark:bg-emerald-950 flex flex-wrap items-center justify-between gap-3 text-xs">
              {/* Scope Tab (This Product vs All Reviews) */}
              <div className="flex items-center bg-gray-100 dark:bg-emerald-900/60 p-1 rounded-xl">
                <button
                  type="button"
                  onClick={() => setModalTab('PRODUCT')}
                  className={`px-3 py-1.5 rounded-lg font-bold transition cursor-pointer ${
                    modalTab === 'PRODUCT'
                      ? 'bg-white dark:bg-emerald-800 text-emerald-900 dark:text-emerald-100 shadow-xs'
                      : 'text-gray-600 dark:text-emerald-300 hover:text-gray-900'
                  }`}
                >
                  This Product ({thisProductReviews.length})
                </button>
                <button
                  type="button"
                  onClick={() => setModalTab('ALL')}
                  className={`px-3 py-1.5 rounded-lg font-bold transition cursor-pointer ${
                    modalTab === 'ALL'
                      ? 'bg-white dark:bg-emerald-800 text-emerald-900 dark:text-emerald-100 shadow-xs'
                      : 'text-gray-600 dark:text-emerald-300 hover:text-gray-900'
                  }`}
                >
                  All Store Reviews ({approvedReviews.length})
                </button>
              </div>

              {/* Star Rating Pills */}
              <div className="flex items-center gap-1.5 flex-wrap">
                <button
                  type="button"
                  onClick={() => setModalStarFilter('ALL')}
                  className={`px-2.5 py-1 rounded-lg font-bold text-xs transition cursor-pointer ${
                    modalStarFilter === 'ALL'
                      ? 'bg-emerald-700 text-white shadow-xs'
                      : 'bg-gray-100 dark:bg-emerald-900/60 text-gray-700 dark:text-emerald-200 hover:bg-gray-200'
                  }`}
                >
                  All Stars
                </button>
                {[5, 4, 3, 2, 1].map(num => (
                  <button
                    key={num}
                    type="button"
                    onClick={() => setModalStarFilter(prev => prev === num ? 'ALL' : num)}
                    className={`px-2 py-1 rounded-lg font-bold text-xs flex items-center gap-1 transition cursor-pointer ${
                      modalStarFilter === num
                        ? 'bg-amber-400 text-slate-950 font-black shadow-xs'
                        : 'bg-gray-100 dark:bg-emerald-900/60 text-gray-700 dark:text-emerald-200 hover:bg-gray-200'
                    }`}
                  >
                    <span>{num}</span>
                    <Star className="w-2.5 h-2.5 fill-current" />
                  </button>
                ))}

                {/* Photo filter toggle */}
                <button
                  type="button"
                  onClick={() => setModalOnlyPhotos(prev => !prev)}
                  className={`px-2.5 py-1 rounded-lg font-bold text-xs flex items-center gap-1 transition cursor-pointer ${
                    modalOnlyPhotos
                      ? 'bg-emerald-700 text-white shadow-xs'
                      : 'bg-gray-100 dark:bg-emerald-900/60 text-gray-700 dark:text-emerald-200 hover:bg-gray-200'
                  }`}
                >
                  <Camera className="w-3 h-3" />
                  <span>With Photos</span>
                </button>
              </div>

              {/* Search input */}
              <div className="relative w-full sm:w-56">
                <Search className="w-3.5 h-3.5 text-gray-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  value={modalSearch}
                  onChange={e => setModalSearch(e.target.value)}
                  placeholder="Search reviews..."
                  className="w-full pl-8 pr-3 py-1.5 bg-gray-50 dark:bg-emerald-900/60 border border-gray-200 dark:border-emerald-700 rounded-xl text-xs text-gray-900 dark:text-emerald-100 placeholder-gray-400 focus:ring-1 focus:ring-emerald-500"
                />
                {modalSearch && (
                  <button
                    type="button"
                    onClick={() => setModalSearch('')}
                    className="absolute right-2 top-2 text-gray-400 hover:text-gray-600"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>

            {/* Modal Reviews Scrollable List */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 max-h-[55vh]">
              {modalFilteredReviews.length === 0 ? (
                <div className="p-8 text-center bg-gray-50 dark:bg-emerald-900/30 rounded-2xl border border-dashed border-gray-200 dark:border-emerald-800 space-y-2">
                  <Star className="w-8 h-8 text-amber-400 mx-auto" />
                  <p className="font-bold text-sm text-gray-800 dark:text-emerald-100">
                    No matching reviews found
                  </p>
                  <p className="text-xs text-gray-500 dark:text-emerald-300">
                    Try resetting your filters or be the first to share your experience with this item!
                  </p>
                  <div className="flex items-center justify-center gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => {
                        setModalStarFilter('ALL');
                        setModalSearch('');
                        setModalOnlyPhotos(false);
                      }}
                      className="px-3.5 py-1.5 bg-gray-200 dark:bg-emerald-800 text-gray-800 dark:text-emerald-100 font-bold text-xs rounded-xl cursor-pointer"
                    >
                      Clear Filters
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setShowAllReviewsModal(false);
                        handleOpenProductReviewModal();
                      }}
                      className="px-4 py-1.5 bg-amber-400 text-slate-950 font-bold text-xs rounded-xl shadow cursor-pointer"
                    >
                      Write a Review
                    </button>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {modalFilteredReviews.map((rev) => {
                    const revImg = rev.image_url || rev.images?.[0];
                    const d = rev.created_at ? new Date(rev.created_at) : new Date();
                    const formattedDate = d.toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric' });

                    return (
                      <div
                        key={rev.id}
                        className="bg-white dark:bg-emerald-950 p-5 rounded-2xl border border-emerald-100 dark:border-emerald-800 shadow-xs flex flex-col justify-between space-y-3 hover:border-amber-400/80 transition"
                      >
                        <div className="space-y-2.5">
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center space-x-1 text-amber-400">
                              {Array.from({ length: rev.rating }).map((_, i) => (
                                <Star key={i} className="w-3.5 h-3.5 fill-current" />
                              ))}
                              <span className="text-xs font-black text-amber-700 dark:text-amber-300 ml-1">
                                {rev.rating}.0
                              </span>
                            </div>
                            <span className="text-[10px] font-bold text-gray-400 flex items-center gap-1">
                              <Clock className="w-3 h-3" /> {formattedDate}
                            </span>
                          </div>

                          {rev.title && (
                            <h4 className="font-extrabold text-sm text-gray-900 dark:text-emerald-100 leading-snug">
                              &ldquo;{rev.title}&rdquo;
                            </h4>
                          )}

                          {revImg && (
                            <div
                              onClick={() => setLightboxImg(revImg)}
                              className="relative aspect-video rounded-xl overflow-hidden border border-emerald-100 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-900 cursor-pointer group"
                            >
                              <img
                                src={revImg}
                                alt="Customer product feedback"
                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                              />
                              <span className="absolute bottom-1.5 right-1.5 bg-black/70 backdrop-blur-xs text-white text-[10px] font-bold px-2 py-0.5 rounded flex items-center gap-1">
                                <ImageIcon className="w-3 h-3 text-amber-400" /> Zoom
                              </span>
                            </div>
                          )}

                          <p className="text-xs text-gray-600 dark:text-emerald-200/90 leading-relaxed italic">
                            &ldquo;{rev.body}&rdquo;
                          </p>

                          {rev.admin_reply && (
                            <div className="bg-amber-50/90 dark:bg-amber-950/40 p-2.5 rounded-xl border border-amber-200 dark:border-amber-800 text-[11px] space-y-0.5">
                              <strong className="font-bold text-amber-900 dark:text-amber-300 block text-[10px]">
                                💬 Store Reply:
                              </strong>
                              <p className="text-amber-950 dark:text-amber-200 italic">{rev.admin_reply}</p>
                            </div>
                          )}
                        </div>

                        <div className="pt-2.5 border-t border-emerald-100 dark:border-emerald-800/60 flex items-center justify-between text-xs">
                          <div className="flex items-center space-x-2">
                            <div className="w-7 h-7 rounded-full bg-emerald-700 text-white font-bold flex items-center justify-center text-xs">
                              {(rev.customer_name || 'Customer').charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <div className="font-bold text-gray-900 dark:text-emerald-100 text-xs">
                                {rev.customer_name || 'Verified Customer'}
                              </div>
                              <div className="text-emerald-700 dark:text-emerald-400 text-[10.5px] font-medium">
                                {rev.customer_location || 'Tamil Nadu'}
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-1.5">
                            {rev.order_id && (
                              <span className="font-mono text-[9.5px] font-bold text-amber-800 dark:text-amber-200 bg-amber-50 dark:bg-amber-950 px-1.5 py-0.5 rounded border border-amber-200 dark:border-amber-800">
                                #{rev.order_id}
                              </span>
                            )}
                            {rev.is_verified_purchase && (
                              <span className="bg-emerald-100 dark:bg-emerald-900 text-emerald-900 dark:text-emerald-200 text-[9.5px] font-extrabold px-1.5 py-0.5 rounded border border-emerald-200 dark:border-emerald-700">
                                ✓ Verified
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Modal Bottom Footer */}
            <div className="p-4 bg-gray-50 dark:bg-emerald-900/40 border-t border-emerald-100 dark:border-emerald-800 flex items-center justify-between flex-wrap gap-2 text-xs">
              <div className="flex items-center gap-3">
                <span className="font-bold text-gray-700 dark:text-emerald-200">
                  Showing {modalFilteredReviews.length} of {ratingDistribution.total} reviews
                </span>
                <Link
                  to={`/reviews?productId=${product.id}`}
                  className="text-emerald-700 dark:text-amber-400 font-bold hover:underline inline-flex items-center gap-1"
                >
                  <span>Open in Separate Page</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </Link>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowAllReviewsModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-gray-600 dark:text-emerald-300 hover:bg-gray-200 dark:hover:bg-emerald-800 cursor-pointer"
                >
                  Close
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowAllReviewsModal(false);
                    handleOpenProductReviewModal();
                  }}
                  className="px-4 py-2 bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-500 hover:to-amber-600 text-slate-950 font-black rounded-xl shadow-sm transition flex items-center gap-1.5 cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>Write a Review</span>
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* Write a Review Modal */}
      {showReviewModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-in fade-in duration-200">
          <div className="bg-white dark:bg-emerald-950 max-w-lg w-full rounded-3xl p-6 sm:p-8 border-2 border-emerald-300 dark:border-emerald-700 shadow-2xl space-y-4 max-h-[92vh] overflow-y-auto animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-emerald-100 dark:border-emerald-800 pb-3">
              <div>
                <h3 className="text-lg font-bold font-serif text-gray-900 dark:text-emerald-100 flex items-center gap-2">
                  <Star className="w-5 h-5 text-amber-500 fill-amber-400" />
                  <span>Review {product.name}</span>
                </h3>
                <p className="text-xs text-gray-500 dark:text-emerald-300 mt-0.5">
                  Your feedback helps native farming families across Tamil Nadu
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowReviewModal(false)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 p-1 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitProductReview} className="space-y-3.5 text-xs">
              {/* Star Rating Interactive Selector */}
              <div>
                <label className="block font-bold text-gray-700 dark:text-emerald-200 mb-1">
                  Your Rating *
                </label>
                <div className="flex items-center gap-2 p-2.5 bg-amber-50/70 dark:bg-amber-950/40 rounded-2xl border border-amber-200 dark:border-amber-800">
                  <div className="flex items-center gap-1.5">
                    {[1, 2, 3, 4, 5].map(starNum => (
                      <button
                        key={starNum}
                        type="button"
                        onClick={() => {
                          const suggested = (product?.name || '').toLowerCase().includes('oil')
                            ? (starNum === 5 ? 'Pure Marachekku Cold-Pressed Aroma & Outstanding Taste!' : 'Very Good Cold-Pressed Oil')
                            : (starNum === 5 ? 'Authentic Native Heirloom Rice - Wholesome Family Health!' : 'Great Traditional Quality');
                          setReviewFormData({
                            ...reviewFormData,
                            rating: starNum,
                            title: suggested
                          });
                        }}
                        className="p-1 text-amber-400 hover:scale-125 transition-transform cursor-pointer"
                        title={`${starNum} Stars`}
                      >
                        <Star
                          className={`w-6 h-6 ${
                            starNum <= reviewFormData.rating ? 'fill-amber-400 text-amber-500' : 'text-gray-300'
                          }`}
                        />
                      </button>
                    ))}
                  </div>
                  <span className="font-extrabold text-amber-900 dark:text-amber-200 text-xs ml-2">
                    {reviewFormData.rating === 5 ? '5 Stars (Exceptional!)' : `${reviewFormData.rating} Stars`}
                  </span>
                </div>
              </div>

              {/* Review Title */}
              <div>
                <label className="block font-bold text-gray-700 dark:text-emerald-200 mb-1">
                  Review Title
                </label>
                <input
                  type="text"
                  value={reviewFormData.title}
                  onChange={e => setReviewFormData({ ...reviewFormData, title: e.target.value })}
                  placeholder="e.g. Pure authentic cold-pressed aroma!"
                  className="w-full px-3 py-2 rounded-xl border border-gray-300 dark:border-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-100 text-xs font-bold focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              {/* Customer Name & City */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-gray-700 dark:text-emerald-200 mb-1">
                    Your Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={reviewFormData.customer_name}
                    onChange={e => setReviewFormData({ ...reviewFormData, customer_name: e.target.value })}
                    placeholder="e.g. Anand Kumar"
                    className="w-full px-3 py-2 rounded-xl border border-gray-300 dark:border-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-100 text-xs"
                  />
                </div>

                <div>
                  <label className="block font-bold text-gray-700 dark:text-emerald-200 mb-1">
                    City / Town
                  </label>
                  <input
                    type="text"
                    value={reviewFormData.customer_location}
                    onChange={e => setReviewFormData({ ...reviewFormData, customer_location: e.target.value })}
                    placeholder="e.g. Cumbum, Tamil Nadu"
                    className="w-full px-3 py-2 rounded-xl border border-gray-300 dark:border-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-100 text-xs"
                  />
                </div>
              </div>

              {/* Mobile / Order ID */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-gray-700 dark:text-emerald-200 mb-1">
                    Mobile Number (Optional)
                  </label>
                  <input
                    type="tel"
                    value={reviewFormData.customer_phone}
                    onChange={e => setReviewFormData({ ...reviewFormData, customer_phone: e.target.value })}
                    placeholder="e.g. +91 98421 56789"
                    className="w-full px-3 py-2 rounded-xl border border-gray-300 dark:border-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-100 text-xs font-mono"
                  />
                </div>

                <div>
                  <label className="block font-bold text-gray-700 dark:text-emerald-200 mb-1">
                    Order ID (Optional)
                  </label>
                  <input
                    type="text"
                    value={reviewFormData.order_id}
                    onChange={e => setReviewFormData({ ...reviewFormData, order_id: e.target.value })}
                    placeholder="e.g. ORD-1042"
                    className="w-full px-3 py-2 rounded-xl border border-gray-300 dark:border-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-100 text-xs font-mono"
                  />
                </div>
              </div>

              {/* Review Body */}
              <div>
                <label className="block font-bold text-gray-700 dark:text-emerald-200 mb-1">
                  Your Review Message *
                </label>
                <textarea
                  required
                  rows={3}
                  value={reviewFormData.body}
                  onChange={e => setReviewFormData({ ...reviewFormData, body: e.target.value })}
                  placeholder="Tell us about the aroma, taste, purity, and your cooking experience..."
                  className="w-full px-3 py-2 rounded-xl border border-gray-300 dark:border-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-100 text-xs"
                />
              </div>

              {/* Photo Attachment URL & File Upload with <= 100 KB Client Compression */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="font-bold text-gray-700 dark:text-emerald-200 flex items-center gap-1.5 text-xs">
                    <ImageIcon className="w-4 h-4 text-emerald-600 dark:text-amber-400" />
                    <span>Attach Photo of Order (Max 100 KB Auto-Compressed)</span>
                  </label>
                  {imageSizeKB ? (
                    <span className="text-[10px] font-extrabold text-emerald-800 dark:text-emerald-200 bg-emerald-100 dark:bg-emerald-900/80 px-2 py-0.5 rounded-md border border-emerald-300 dark:border-emerald-700">
                      &check; {imageSizeKB} KB (&le; 100 KB)
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
                      className="px-3.5 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-extrabold text-xs flex items-center gap-1.5 transition cursor-pointer shadow-xs disabled:opacity-50"
                    >
                      <Upload className="w-3.5 h-3.5 text-amber-300" />
                      <span>{isCompressingImage ? 'Compressing &le; 100 KB...' : 'Upload Photo (Auto-Compress &le; 100 KB)'}</span>
                    </button>

                    <span className="text-gray-400 dark:text-emerald-400 text-xs font-bold">OR</span>

                    <input
                      type="url"
                      value={reviewFormData.image_url}
                      onChange={e => {
                        setReviewFormData({ ...reviewFormData, image_url: e.target.value });
                        setImageSizeKB(null);
                      }}
                      placeholder="Paste image URL (https://...)"
                      className="flex-1 min-w-[160px] px-3 py-2 rounded-xl border border-gray-300 dark:border-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-100 text-[11px] font-mono"
                    />

                    {reviewFormData.image_url && (
                      <button
                        type="button"
                        onClick={() => {
                          setReviewFormData({ ...reviewFormData, image_url: '' });
                          setImageSizeKB(null);
                        }}
                        className="p-1.5 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950 rounded-lg cursor-pointer"
                        title="Remove photo"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </div>

                  {reviewFormData.image_url && (
                    <div className="flex items-center gap-2.5 p-2 bg-emerald-50/60 dark:bg-emerald-900/30 rounded-xl border border-emerald-200 dark:border-emerald-800">
                      <div className="w-12 h-12 rounded-lg overflow-hidden border border-emerald-200 dark:border-emerald-700 shadow-xs shrink-0 bg-emerald-100">
                        <img src={reviewFormData.image_url} alt="Review attachment preview" className="w-full h-full object-cover" />
                      </div>
                      <div className="space-y-0.5 text-xs">
                        <span className="font-bold text-emerald-900 dark:text-emerald-100 block text-[11px]">
                          Photo Attached
                        </span>
                        <p className="text-[10px] text-gray-500 dark:text-emerald-300">
                          {imageSizeKB
                            ? `Compressed size: ${imageSizeKB} KB (Strictly &le; 100 KB limit).`
                            : 'Direct URL attached to review.'}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Buttons */}
              <div className="flex items-center justify-between pt-3 border-t border-emerald-100 dark:border-emerald-800">
                <span className="text-[10.5px] font-bold text-emerald-700 dark:text-emerald-300 flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Approved &amp; Live Immediately
                </span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setShowReviewModal(false)}
                    className="px-4 py-2 rounded-xl text-xs font-bold text-gray-600 dark:text-emerald-300 hover:bg-gray-100 dark:hover:bg-emerald-900 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="bg-emerald-700 hover:bg-emerald-800 text-white px-5 py-2 rounded-xl font-bold text-xs shadow-md transition flex items-center space-x-1.5 cursor-pointer"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>Submit &amp; Publish</span>
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Lightbox Zoom Modal */}
      {lightboxImg && (
        <div
          onClick={() => setLightboxImg(null)}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md cursor-pointer animate-in fade-in duration-200"
        >
          <div
            onClick={e => e.stopPropagation()}
            className="relative max-w-3xl w-full bg-slate-900 rounded-3xl overflow-hidden shadow-2xl border-2 border-amber-400"
          >
            <img src={lightboxImg} alt="Review attachment zoom" className="w-full max-h-[80vh] object-contain" />
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

      {/* Similar Products Recommended Section */}
      {similarProducts.length > 0 && (
        <section className="pt-12 border-t border-emerald-100 dark:border-emerald-800 space-y-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-2">
            <div>
              <span className="text-xs font-bold text-emerald-600 dark:text-amber-400 uppercase tracking-widest">
                RECOMMENDED FOR YOU
              </span>
              <h2 className="text-2xl sm:text-3xl font-serif font-bold text-gray-900 dark:text-emerald-100 mt-1">
                Similar Traditional Foods You May Like
              </h2>
            </div>
            <Link
              to="/products"
              className="text-xs font-bold text-emerald-700 dark:text-amber-400 hover:underline flex items-center gap-1"
            >
              Browse All Products ({products.length}) &rarr;
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {similarProducts.map((rec) => (
              <ProductCard
                key={rec.id}
                product={rec}
              />
            ))}
          </div>
        </section>
      )}

    </div>
  );
};

export default ProductDetailPage;