import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { 
  Leaf, ShoppingBag, MessageSquare, ShieldCheck, HeartHandshake, 
  Sparkles, ArrowRight, Star, ChevronRight, CheckCircle2, Truck, RefreshCw, Award,
  Layers, LayoutGrid, Flame
} from 'lucide-react';
import { formatPrice } from '../../lib/utils';
import { useCart } from '../../contexts/CartContext';
import QuickViewModal from '../../components/common/QuickViewModal';
import type { Product, Category, Review } from '../../types';
import { getJSONStore, getWhatsAppOrdersNumber } from '../../lib/dbManager';
import { PublicPageSkeleton } from '../../components/common/Skeleton';
import ProductCard from '../../components/public/ProductCard';
import { HeroProductCarousel3D } from '../../components/public/HeroProductCarousel3D';
import { ProductCoverflow3D } from '../../components/public/ProductCoverflow3D';
import { ReviewCoverflow3D } from '../../components/public/ReviewCoverflow3D';

export const HomePage: React.FC = () => {
  const { addItem } = useCart();
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [bestsellerViewMode, setBestsellerViewMode] = useState<'carousel' | 'grid'>('carousel');

  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [hero, setHero] = useState<{
    headline: string;
    subheadline: string;
    cta_text: string;
    cta_link: string;
    bg_image_url: string;
    bg_image_animation?: 'none' | 'float' | 'pulse' | 'zoom' | 'bounce';
    is_published: boolean;
    guarantee_badges?: string[];
  }>({
    headline: 'Pure. Traditional. Straight from the Farm.',
    subheadline: 'Experience authentic South Indian flavours — cold-pressed oils, heritage rice, artisan spices and more. Grown with love, delivered to your door.',
    cta_text: 'Shop Now',
    cta_link: '/products',
    bg_image_url: 'https://images.unsplash.com/photo-1586201375761-83865001e31c?auto=format&fit=crop&w=800&q=80',
    bg_image_animation: 'float',
    is_published: true,
    guarantee_badges: ['100% Unprocessed', 'Farmer Sourced', 'Zero Preservatives']
  });

  const [loading, setLoading] = useState(true);

  React.useEffect(() => {
    async function load() {
      try {
        const [p, c, r] = await Promise.all([
          getJSONStore<Product>('products'),
          getJSONStore<Category>('categories'),
          getJSONStore<Review>('reviews')
        ]);
        setProducts(p);
        setCategories(c);
        setReviews(r);
        try {
          const cms = await getJSONStore<any>('cms_settings');
          if (cms && cms.length && cms[0].hero) {
            setHero(cms[0].hero);
          }
        } catch (e) {
          console.error('Failed to parse hero banner state', e);
        }
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const featuredProducts = products.filter((p: Product) => p.is_featured && p.is_visible !== false).slice(0, 8);
  const organicProducts = products.filter((p: Product) => p.is_organic && p.is_visible !== false).slice(0, 4);

  // Hierarchy for Hero Carousel Products:
  // 1. If any products have a Festival Offer -> show ONLY Festival Offer products
  // 2. If NO festival offer -> show Special Offer products (discounted / offer price)
  // 3. If NO special offer -> show all visible products across categories
  const festivalProducts = products.filter(
    (p: Product) => p.is_visible !== false && Boolean(p.festival_offer && p.festival_offer.trim() !== '')
  );

  const specialOfferProducts = products.filter(
    (p: Product) => p.is_visible !== false && (
      (p.offer_price && p.offer_price > 0 && p.offer_price < p.selling_price) ||
      (p.mrp && p.mrp > p.selling_price)
    )
  );

  const allVisibleProducts = products.filter((p: Product) => p.is_visible !== false);

  const heroCarouselProducts = festivalProducts.length > 0
    ? festivalProducts
    : specialOfferProducts.length > 0
    ? specialOfferProducts
    : allVisibleProducts;

  const approvedReviews = reviews.filter((r: Review) => r.status === 'APPROVED' || !r.status);

  if (loading) {
    return <PublicPageSkeleton />;
  }

  return (
    <div className="space-y-16 pb-16">
      
      {/* Hero Section */}
      {hero.is_published && (
        <section className="relative bg-gradient-to-br from-emerald-900 via-emerald-950 to-emerald-900 text-white overflow-hidden py-20 lg:py-28">
          {/* Subtle background decoration */}
          <div className="absolute inset-0 opacity-10 bg-[radial-gradient(#fbbf24_1px,transparent_1px)] [background-size:24px_24px]" />
          
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
              
              <div className="space-y-6 text-center lg:text-left">
                
                <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-emerald-800/80 border border-emerald-600/50 text-amber-300 text-xs sm:text-sm font-semibold shadow-inner">
                  <Sparkles className="w-4 h-4 text-amber-400 animate-spin" />
                  <span>DIRECT FROM TAMIL NADU FARMERS & PRODUCERS</span>
                </div>

                <h1 className="text-4xl sm:text-5xl lg:text-6xl font-serif font-bold tracking-tight text-white leading-tight">
                  {hero.headline}
                </h1>

                <p className="text-emerald-100 text-base sm:text-lg max-w-xl leading-relaxed mx-auto lg:mx-0">
                  {hero.subheadline}
                </p>

                {/* CTAs */}
                <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-4 pt-2">
                  <Link
                    to={hero.cta_link || '/products'}
                    className="w-full sm:w-auto px-8 py-4 bg-amber-400 hover:bg-amber-300 text-emerald-950 font-black text-base rounded-full shadow-xl hover:shadow-amber-400/20 transition-all transform hover:-translate-y-0.5 flex items-center justify-center gap-2"
                  >
                    <ShoppingBag className="w-5 h-5" />
                    <span>{hero.cta_text || 'Shop Now'}</span>
                  </Link>

                  {specialOfferProducts.length > 0 ? (
                    <Link
                      to="/products?category=offers"
                      className="w-full sm:w-auto px-7 py-4 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-white font-extrabold text-base rounded-full shadow-lg hover:shadow-amber-500/30 transition-all flex items-center justify-center gap-2 group"
                    >
                      <Flame className="w-5 h-5 text-yellow-200 animate-pulse" />
                      <span>Special Offers ({specialOfferProducts.length})</span>
                    </Link>
                  ) : (
                    <Link
                      to="/reviews"
                      className="w-full sm:w-auto px-7 py-4 bg-emerald-800/80 hover:bg-emerald-700 text-white font-bold text-base rounded-full border border-emerald-600/80 shadow transition-all flex items-center justify-center gap-2"
                    >
                      <Star className="w-5 h-5 text-amber-400 fill-amber-400" />
                      <span>Customer Reviews</span>
                    </Link>
                  )}
                </div>

                {/* Guarantees */}
                {((hero.guarantee_badges && hero.guarantee_badges.length > 0) ? hero.guarantee_badges : ['100% Unprocessed', 'Farmer Sourced', 'Zero Preservatives']).length > 0 && (
                  <div className="flex flex-wrap items-center gap-x-6 gap-y-3 pt-6 border-t border-emerald-800/80 text-xs text-emerald-200 font-medium">
                    {((hero.guarantee_badges && hero.guarantee_badges.length > 0) ? hero.guarantee_badges : ['100% Unprocessed', 'Farmer Sourced', 'Zero Preservatives']).map((badge, idx) => (
                      <div key={idx} className="flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-amber-400 shrink-0" />
                        <span>{badge}</span>
                      </div>
                    ))}
                  </div>
                )}

              </div>

              {/* Visual Showcase: Interactive 3D Product Carousel (Desktop only - Hidden on Mobile) */}
              <div className="relative hidden lg:block">
                <HeroProductCarousel3D
                  products={heroCarouselProducts}
                  categories={categories}
                  onQuickView={setSelectedProduct}
                />
              </div>

            </div>
          </div>
        </section>
      )}

      {/* Feature Value Props: 3D Responsive Card Layout (Compact 2x2 on Mobile, 4-col on Desktop) */}
      <section className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-6">
          {/* Card 1: Native Seeds */}
          <div className="group relative bg-gradient-to-br from-white via-emerald-50/40 to-amber-50/20 dark:from-emerald-950 dark:via-emerald-900/60 dark:to-emerald-950 p-3 sm:p-6 rounded-2xl sm:rounded-3xl border-2 border-emerald-100 dark:border-emerald-800/80 shadow-xs sm:shadow-md hover:shadow-xl hover:shadow-emerald-900/15 dark:hover:shadow-black/50 transition-all duration-300 transform-gpu hover:-translate-y-1 sm:hover:-translate-y-2 active:scale-95 hover:border-amber-400/80 preserve-3d">
            <div className="w-9 h-9 sm:w-14 sm:h-14 bg-gradient-to-br from-emerald-600 to-emerald-800 text-amber-300 rounded-xl sm:rounded-2xl flex items-center justify-center mb-2.5 sm:mb-4 shadow-md sm:shadow-lg shadow-emerald-900/20 group-hover:scale-110 group-hover:rotate-3 transition-transform duration-300 border border-emerald-400/40 shrink-0">
              <Leaf className="w-4.5 h-4.5 sm:w-7 sm:h-7" />
            </div>
            <h4 className="font-bold text-xs sm:text-base text-gray-900 dark:text-emerald-100 group-hover:text-emerald-700 dark:group-hover:text-amber-300 transition-colors">
              Native Seeds
            </h4>
            <p className="text-[10px] sm:text-xs text-gray-500 dark:text-emerald-300/90 mt-0.5 sm:mt-1 leading-tight sm:leading-relaxed">
              Non-hybrid traditional varieties preserved across generations
            </p>
            <div className="mt-2.5 sm:mt-4 h-0.5 sm:h-1 w-5 sm:w-8 rounded-full bg-emerald-200 dark:bg-emerald-700 group-hover:w-10 sm:group-hover:w-16 group-hover:bg-amber-400 transition-all duration-300" />
          </div>

          {/* Card 2: Farmer Direct */}
          <div className="group relative bg-gradient-to-br from-white via-emerald-50/40 to-amber-50/20 dark:from-emerald-950 dark:via-emerald-900/60 dark:to-emerald-950 p-3 sm:p-6 rounded-2xl sm:rounded-3xl border-2 border-emerald-100 dark:border-emerald-800/80 shadow-xs sm:shadow-md hover:shadow-xl hover:shadow-emerald-900/15 dark:hover:shadow-black/50 transition-all duration-300 transform-gpu hover:-translate-y-1 sm:hover:-translate-y-2 active:scale-95 hover:border-amber-400/80 preserve-3d">
            <div className="w-9 h-9 sm:w-14 sm:h-14 bg-gradient-to-br from-emerald-600 to-emerald-800 text-amber-300 rounded-xl sm:rounded-2xl flex items-center justify-center mb-2.5 sm:mb-4 shadow-md sm:shadow-lg shadow-emerald-900/20 group-hover:scale-110 group-hover:rotate-3 transition-transform duration-300 border border-emerald-400/40 shrink-0">
              <HeartHandshake className="w-4.5 h-4.5 sm:w-7 sm:h-7" />
            </div>
            <h4 className="font-bold text-xs sm:text-base text-gray-900 dark:text-emerald-100 group-hover:text-emerald-700 dark:group-hover:text-amber-300 transition-colors">
              Farmer Direct
            </h4>
            <p className="text-[10px] sm:text-xs text-gray-500 dark:text-emerald-300/90 mt-0.5 sm:mt-1 leading-tight sm:leading-relaxed">
              Fair prices directly empowering Tamil Nadu producer families
            </p>
            <div className="mt-2.5 sm:mt-4 h-0.5 sm:h-1 w-5 sm:w-8 rounded-full bg-emerald-200 dark:bg-emerald-700 group-hover:w-10 sm:group-hover:w-16 group-hover:bg-amber-400 transition-all duration-300" />
          </div>

          {/* Card 3: Quick Store Dispatch */}
          <div className="group relative bg-gradient-to-br from-white via-emerald-50/40 to-amber-50/20 dark:from-emerald-950 dark:via-emerald-900/60 dark:to-emerald-950 p-3 sm:p-6 rounded-2xl sm:rounded-3xl border-2 border-emerald-100 dark:border-emerald-800/80 shadow-xs sm:shadow-md hover:shadow-xl hover:shadow-emerald-900/15 dark:hover:shadow-black/50 transition-all duration-300 transform-gpu hover:-translate-y-1 sm:hover:-translate-y-2 active:scale-95 hover:border-amber-400/80 preserve-3d">
            <div className="w-9 h-9 sm:w-14 sm:h-14 bg-gradient-to-br from-emerald-600 to-emerald-800 text-amber-300 rounded-xl sm:rounded-2xl flex items-center justify-center mb-2.5 sm:mb-4 shadow-md sm:shadow-lg shadow-emerald-900/20 group-hover:scale-110 group-hover:rotate-3 transition-transform duration-300 border border-emerald-400/40 shrink-0">
              <Truck className="w-4.5 h-4.5 sm:w-7 sm:h-7" />
            </div>
            <h4 className="font-bold text-xs sm:text-base text-gray-900 dark:text-emerald-100 group-hover:text-emerald-700 dark:group-hover:text-amber-300 transition-colors">
              Quick Store Dispatch
            </h4>
            <p className="text-[10px] sm:text-xs text-gray-500 dark:text-emerald-300/90 mt-0.5 sm:mt-1 leading-tight sm:leading-relaxed">
              Same-day packing, local home delivery & express counter pickup
            </p>
            <div className="mt-2.5 sm:mt-4 h-0.5 sm:h-1 w-5 sm:w-8 rounded-full bg-emerald-200 dark:bg-emerald-700 group-hover:w-10 sm:group-hover:w-16 group-hover:bg-amber-400 transition-all duration-300" />
          </div>

          {/* Card 4: Fresh Small Batches */}
          <div className="group relative bg-gradient-to-br from-white via-emerald-50/40 to-amber-50/20 dark:from-emerald-950 dark:via-emerald-900/60 dark:to-emerald-950 p-3 sm:p-6 rounded-2xl sm:rounded-3xl border-2 border-emerald-100 dark:border-emerald-800/80 shadow-xs sm:shadow-md hover:shadow-xl hover:shadow-emerald-900/15 dark:hover:shadow-black/50 transition-all duration-300 transform-gpu hover:-translate-y-1 sm:hover:-translate-y-2 active:scale-95 hover:border-amber-400/80 preserve-3d">
            <div className="w-9 h-9 sm:w-14 sm:h-14 bg-gradient-to-br from-emerald-600 to-emerald-800 text-amber-300 rounded-xl sm:rounded-2xl flex items-center justify-center mb-2.5 sm:mb-4 shadow-md sm:shadow-lg shadow-emerald-900/20 group-hover:scale-110 group-hover:rotate-3 transition-transform duration-300 border border-emerald-400/40 shrink-0">
              <RefreshCw className="w-4.5 h-4.5 sm:w-7 sm:h-7" />
            </div>
            <h4 className="font-bold text-xs sm:text-base text-gray-900 dark:text-emerald-100 group-hover:text-emerald-700 dark:group-hover:text-amber-300 transition-colors">
              Fresh Small Batches
            </h4>
            <p className="text-[10px] sm:text-xs text-gray-500 dark:text-emerald-300/90 mt-0.5 sm:mt-1 leading-tight sm:leading-relaxed">
              Freshly milled grains & wood cold-pressed oils on demand
            </p>
            <div className="mt-2.5 sm:mt-4 h-0.5 sm:h-1 w-5 sm:w-8 rounded-full bg-emerald-200 dark:bg-emerald-700 group-hover:w-10 sm:group-hover:w-16 group-hover:bg-amber-400 transition-all duration-300" />
          </div>
        </div>
      </section>

      {/* Traditional Categories Section: 3D Card Layout */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end">
          <div>
            <span className="text-xs font-bold text-emerald-600 dark:text-amber-400 uppercase tracking-widest">
              COLLECTION BY CATEGORY
            </span>
            <h2 className="text-3xl font-serif font-bold text-gray-900 dark:text-emerald-100 mt-1">
              Explore Our Natural Food Range
            </h2>
          </div>
          <Link
            to="/products"
            className="text-sm font-bold text-emerald-700 dark:text-amber-400 hover:underline flex items-center gap-1 mt-2 md:mt-0"
          >
            View All Categories <ChevronRight className="w-4 h-4" />
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {categories.filter((cat: Category) => {
            if (cat.is_visible === false || cat.is_active === false) return false;
            const nameLower = (cat.name || '').toLowerCase();
            if (nameLower.includes('test') || nameLower.includes('dummy') || nameLower.includes('sample')) return false;
            return products.some(p => p.category_id === cat.id && p.is_visible !== false);
          }).map((cat: Category) => {
            const catProductCount = products.filter(p => p.category_id === cat.id && p.is_visible !== false).length;
            return (
            <Link
              key={cat.id}
              to={`/products?category=${cat.id}`}
              className="group relative bg-white dark:bg-emerald-950 p-6 rounded-3xl border-2 border-emerald-100 dark:border-emerald-800/70 hover:border-amber-400 dark:hover:border-amber-400 shadow-md hover:shadow-2xl hover:shadow-emerald-900/15 dark:hover:shadow-black/60 transition-all duration-300 transform-gpu hover:-translate-y-2 flex flex-col items-center justify-between text-center preserve-3d"
            >
              {/* Top 3D Floating Icon Box */}
              <div className="w-20 h-20 bg-gradient-to-br from-emerald-50 to-amber-50 dark:from-emerald-900 dark:to-emerald-950 rounded-3xl flex items-center justify-center text-4xl mb-4 group-hover:scale-110 group-hover:rotate-3 transition-transform duration-300 relative border-2 border-emerald-200/80 dark:border-emerald-700/80 shadow-md">
                <span>{cat.icon || '🌾'}</span>
                <span className="absolute -top-2 -right-2 bg-gradient-to-r from-amber-400 to-amber-500 text-emerald-950 text-[11px] font-black px-2 py-0.5 rounded-full shadow border border-amber-300">
                  {catProductCount}
                </span>
              </div>

              {/* Title & Tamil */}
              <div>
                <h3 className="font-serif font-black text-lg text-gray-900 dark:text-emerald-100 group-hover:text-emerald-600 dark:group-hover:text-amber-300 transition-colors">
                  {cat.name}
                </h3>
                {cat.tamil_name && (
                  <p className="text-xs text-emerald-700 dark:text-emerald-400 font-semibold mt-1">
                    {cat.tamil_name}
                  </p>
                )}
                <p className="text-xs text-gray-500 dark:text-emerald-300/70 mt-2 line-clamp-2">
                  {cat.description || 'Natural farm-harvested products'}
                </p>
              </div>

              {/* 3D Action Pill */}
              <span className="mt-5 px-4 py-2 rounded-xl text-xs font-black bg-emerald-50 dark:bg-emerald-900/60 text-emerald-800 dark:text-amber-300 group-hover:bg-amber-400 group-hover:text-emerald-950 transition-all duration-300 flex items-center gap-1.5 shadow-xs">
                <span>Shop {catProductCount} Items</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </span>
            </Link>
            );
          })}
        </div>
      </section>

      {/* Featured Products Section: 3D Coverflow Carousel (Customer Favorite Traditional Foods) */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-emerald-600 dark:text-amber-400 uppercase tracking-widest">
                BESTSELLER HARVESTS
              </span>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-amber-400 text-emerald-950 flex items-center gap-1 shadow-sm">
                <Sparkles className="w-3 h-3" /> Customer Favorite
              </span>
            </div>
            <h2 className="text-3xl font-serif font-bold text-gray-900 dark:text-emerald-100 mt-1">
              Customer Favorite Traditional Foods
            </h2>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* View Mode Toggle: 3D Carousel vs Grid View */}
            <div className="flex items-center bg-emerald-100/80 dark:bg-emerald-900/60 p-1 rounded-2xl border border-emerald-200 dark:border-emerald-800">
              <button
                type="button"
                onClick={() => setBestsellerViewMode('carousel')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                  bestsellerViewMode === 'carousel'
                    ? 'bg-emerald-800 text-white shadow-sm'
                    : 'text-emerald-700 dark:text-emerald-300 hover:text-emerald-900'
                }`}
                title="3D Coverflow Carousel View"
              >
                <Layers className="w-3.5 h-3.5" />
                <span>Carousel</span>
              </button>

              <button
                type="button"
                onClick={() => setBestsellerViewMode('grid')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                  bestsellerViewMode === 'grid'
                    ? 'bg-emerald-800 text-white shadow-sm'
                    : 'text-emerald-700 dark:text-emerald-300 hover:text-emerald-900'
                }`}
                title="4-Column Grid View"
              >
                <LayoutGrid className="w-3.5 h-3.5" />
                <span>Grid View</span>
              </button>
            </div>

            <Link
              to="/products"
              className="text-sm font-bold text-emerald-700 dark:text-amber-400 hover:underline flex items-center gap-1"
            >
              Browse Full Catalog ({products.length}) <ChevronRight className="w-4 h-4" />
            </Link>
          </div>
        </div>

        {bestsellerViewMode === 'carousel' ? (
          <ProductCoverflow3D
            products={featuredProducts.length > 0 ? featuredProducts : products.slice(0, 8)}
            categories={categories}
            onQuickView={setSelectedProduct}
          />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 animate-fadeIn">
            {featuredProducts.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                categories={categories}
                onQuickView={setSelectedProduct}
              />
            ))}
          </div>
        )}
      </section>

      {/* Brand Story Banner */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="relative rounded-3xl bg-gradient-to-r from-emerald-900 to-emerald-950 text-white p-8 sm:p-12 overflow-hidden border border-emerald-800">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center relative z-10">
            <div className="space-y-4">
              <span className="text-xs font-bold text-amber-400 uppercase tracking-wider">
                OUR PHILOSOPHY & PROMISE
              </span>
              <h2 className="text-3xl sm:text-4xl font-serif font-bold text-white leading-snug">
                Why Traditional Native Foods Matter For Your Family
              </h2>
              <p className="text-emerald-200 text-sm leading-relaxed">
                Modern polished rice and refined oils strip away essential minerals, fiber, and natural immunity boosters. MR. VIVASAYI brings back ancient native grains like Mapillai Samba, Karunguruvai, and cold-pressed chekku oils that nourish life naturally.
              </p>
              <div className="pt-2">
                <Link
                  to="/about"
                  className="inline-flex items-center gap-2 px-6 py-3 bg-amber-400 hover:bg-amber-300 text-emerald-950 font-bold text-sm rounded-full shadow transition-all"
                >
                  <span>Read Our Farmer Sourcing Story</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="bg-emerald-800/50 backdrop-blur p-5 rounded-2xl border border-emerald-700/60 space-y-2">
                <div className="text-2xl font-black text-amber-300">500+</div>
                <div className="font-bold text-sm text-white">Farmer Families Supported</div>
                <div className="text-xs text-emerald-200">Across Madurai, Tanjore & Erode districts</div>
              </div>

              <div className="bg-emerald-800/50 backdrop-blur p-5 rounded-2xl border border-emerald-700/60 space-y-2">
                <div className="text-2xl font-black text-amber-300">100%</div>
                <div className="font-bold text-sm text-white">Wood Chekku Cold Pressed</div>
                <div className="text-xs text-emerald-200">Zero chemical bleaching or heat treating</div>
              </div>

              <div className="bg-emerald-800/50 backdrop-blur p-5 rounded-2xl border border-emerald-700/60 space-y-2">
                <div className="text-2xl font-black text-amber-300">12+</div>
                <div className="font-bold text-sm text-white">Native Rice Varieties</div>
                <div className="text-xs text-emerald-200">Ancient paddy seeds preserved & grown</div>
              </div>

              <div className="bg-emerald-800/50 backdrop-blur p-5 rounded-2xl border border-emerald-700/60 space-y-2">
                <div className="text-2xl font-black text-amber-300">4.9/5</div>
                <div className="font-bold text-sm text-white">Customer Rating</div>
                <div className="text-xs text-emerald-200">Over 1,200+ direct WhatsApp orders</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Verified Customer Reviews - 3D Coverflow Carousel (Hidden if no approved reviews) */}
      {approvedReviews.length > 0 && (
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="text-center sm:text-left max-w-2xl">
              <div className="flex items-center justify-center sm:justify-start gap-2">
                <span className="text-xs font-bold text-emerald-600 dark:text-amber-400 uppercase tracking-widest flex items-center gap-1">
                  <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-500" />
                  <span>TESTIMONIALS &amp; RATINGS</span>
                </span>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-amber-400 text-emerald-950 flex items-center gap-1 shadow-sm">
                  <Sparkles className="w-3 h-3" /> Customer Reviews
                </span>
              </div>
              <h2 className="text-3xl font-serif font-bold text-gray-900 dark:text-emerald-100 mt-1">
                Loved By Families Across Tamil Nadu
              </h2>
              <p className="text-sm text-gray-600 dark:text-emerald-300 mt-1">
                Genuine feedback from customers ordering wood cold-pressed oils &amp; native traditional rice.
              </p>
            </div>

            <Link
              to="/reviews"
              className="px-5 py-2.5 rounded-2xl bg-emerald-700 hover:bg-emerald-800 text-white font-extrabold text-xs shadow-md transition flex items-center gap-1.5 shrink-0 hover:scale-105"
            >
              <span>View All Reviews ({approvedReviews.length})</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {/* Exclusively 3D Coverflow Carousel */}
          <ReviewCoverflow3D
            reviews={approvedReviews}
            products={products}
          />
        </section>
      )}

      {/* Quick View Modal */}
      <QuickViewModal 
        product={selectedProduct} 
        onClose={() => setSelectedProduct(null)} 
      />

    </div>
  );
};

export default HomePage;
