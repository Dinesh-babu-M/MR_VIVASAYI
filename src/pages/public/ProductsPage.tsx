import React, { useState, useMemo, useRef, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { 
  Filter, Search, Leaf, ShoppingBag, ArrowUpDown, Check, X, 
  ChevronRight, ChevronLeft, ChevronUp, ChevronDown, Sparkles, RotateCcw,
  Eye, EyeOff, SlidersHorizontal, Columns2, LayoutGrid, Grid3X3, List
} from 'lucide-react';
import { formatPrice } from '../../lib/utils';
import { useCart } from '../../contexts/CartContext';
import QuickViewModal from '../../components/common/QuickViewModal';
import type { Product, Category } from '../../types';
import { getJSONStore } from '../../lib/dbManager';
import { CardGridSkeleton } from '../../components/common/Skeleton';
import ProductCard from '../../components/public/ProductCard';
import ProductListItem from '../../components/public/ProductListItem';

export type LayoutMode = '1' | '2' | '4' | '6' | 'list';

export const ProductsPage: React.FC = () => {
  const { addItem } = useCart();
  const [searchParams, setSearchParams] = useSearchParams();
  
  const categoryFilter = searchParams.get('category') || 'all';
  const urlSearch = searchParams.get('search') || '';

  const [searchQuery, setSearchQuery] = useState(urlSearch);
  const [organicOnly, setOrganicOnly] = useState(false);
  const [sortBy, setSortBy] = useState<'featured' | 'price-asc' | 'price-desc' | 'name'>('featured');
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  // Mobile filter visibility: Defaults strictly to OPEN (not hidden by default)
  const [mobileToolbarOpen, setMobileToolbarOpen] = useState(true);

  // Persistent Grid Layout Selector (1, 2, 4, 6, List) - Mobile view defaults strictly to 'list' format
  const [layoutMode, setLayoutMode] = useState<LayoutMode>(() => {
    try {
      const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;
      if (isMobile) {
        const savedMobile = localStorage.getItem('products_mobile_layout_mode') as LayoutMode;
        if (savedMobile) return savedMobile;
        return 'list'; // Default list format for mobile view
      }
      const saved = localStorage.getItem('products_layout_mode') as LayoutMode;
      return saved || '4';
    } catch {
      return 'list';
    }
  });

  const handleLayoutChange = (mode: LayoutMode) => {
    setLayoutMode(mode);
    try {
      if (typeof window !== 'undefined' && window.innerWidth < 768) {
        localStorage.setItem('products_mobile_layout_mode', mode);
      } else {
        localStorage.setItem('products_layout_mode', mode);
      }
    } catch {}
  };

  // Sync mobile default on resize if not explicitly saved
  useEffect(() => {
    const handleResize = () => {
      const isMobile = window.innerWidth < 768;
      if (isMobile) {
        const savedMobile = localStorage.getItem('products_mobile_layout_mode') as LayoutMode;
        if (!savedMobile && layoutMode !== 'list') {
          setLayoutMode('list');
        }
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [layoutMode]);

  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  // Auto-hide filter toolbar on mobile/tablet when any category or filter is selected
  const handleSelectCategory = (catKey: string) => {
    setSearchParams({ category: catKey });
    if (typeof window !== 'undefined' && window.innerWidth < 1024) {
      setMobileToolbarOpen(false);
    }
  };

  const handleToggleOrganic = () => {
    setOrganicOnly(prev => !prev);
    if (typeof window !== 'undefined' && window.innerWidth < 1024) {
      setMobileToolbarOpen(false);
    }
  };

  const handleSortChange = (val: any) => {
    setSortBy(val);
    if (typeof window !== 'undefined' && window.innerWidth < 1024) {
      setMobileToolbarOpen(false);
    }
  };

  React.useEffect(() => {
    async function load() {
      try {
        const [p, c] = await Promise.all([
          getJSONStore<Product>('products'),
          getJSONStore<Category>('categories')
        ]);
        setProducts(p);
        setCategories(c);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  // Filter & sort logic
  const filteredProducts = useMemo(() => {
    return products.filter((product: Product) => {
      // Must be visible (Live) on storefront
      if (product.is_visible === false) return false;

      // Category filter
      if (categoryFilter === 'offers') {
        if (!product.offer_price) return false;
      } else if (categoryFilter === 'festival' || categoryFilter === 'festivals') {
        if (!product.festival_offer) return false;
      } else if (categoryFilter !== 'all' && product.category_id !== categoryFilter) {
        return false;
      }
      // Organic filter
      if (organicOnly && !product.is_organic) {
        return false;
      }
      // Search query
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matchesName = product.name.toLowerCase().includes(query);
        const matchesTamil = product.tamil_name ? product.tamil_name.toLowerCase().includes(query) : false;
        const matchesSKU = product.sku.toLowerCase().includes(query);
        const matchesDesc = product.description ? product.description.toLowerCase().includes(query) : false;
        if (!matchesName && !matchesTamil && !matchesSKU && !matchesDesc) {
          return false;
        }
      }
      return true;
    }).sort((a: Product, b: Product) => {
      const priceA = a.offer_price || a.selling_price;
      const priceB = b.offer_price || b.selling_price;
      if (sortBy === 'price-asc') return priceA - priceB;
      if (sortBy === 'price-desc') return priceB - priceA;
      if (sortBy === 'name') return a.name.localeCompare(b.name);
      return (b.is_featured ? 1 : 0) - (a.is_featured ? 1 : 0);
    });
  }, [products, categoryFilter, organicOnly, searchQuery, sortBy]);

  const visibleProducts = useMemo(() => {
    return products.filter((p: Product) => p.is_visible !== false);
  }, [products]);

  const offerProductsCount = useMemo(() => {
    return visibleProducts.filter((p: Product) => Boolean(p.offer_price && p.offer_price > 0 && p.offer_price < p.selling_price)).length;
  }, [visibleProducts]);

  const festivalProductsCount = useMemo(() => {
    return visibleProducts.filter((p: Product) => Boolean(p.festival_offer)).length;
  }, [visibleProducts]);

  const activeCategoryObj = categories.find((c: Category) => c.id === categoryFilter);

  const organicProductsCount = useMemo(() => {
    return visibleProducts.filter((p: Product) => Boolean(p.is_organic)).length;
  }, [visibleProducts]);

  // If there are no organic products in store, auto-reset organicOnly filter
  useEffect(() => {
    if (organicProductsCount === 0 && organicOnly) {
      setOrganicOnly(false);
    }
  }, [organicProductsCount, organicOnly]);

  const categoryScrollRef = useRef<HTMLDivElement>(null);

  const scrollCategories = (direction: 'left' | 'right') => {
    if (categoryScrollRef.current) {
      const offset = direction === 'left' ? -220 : 220;
      categoryScrollRef.current.scrollBy({ left: offset, behavior: 'smooth' });
    }
  };

  // Only show categories that are active, visible, not dummy, and have at least 1 product
  const categoriesWithProducts = useMemo(() => {
    return categories
      .filter((cat: Category) => {
        if (cat.is_visible === false || cat.is_active === false) return false;
        const lowerName = (cat.name || '').toLowerCase().trim();
        if (lowerName === 'testing' || lowerName.startsWith('card ') || lowerName.startsWith('test')) {
          return false;
        }
        return visibleProducts.some((p: Product) => p.category_id === cat.id);
      })
      .sort((a, b) => (a.display_order || 0) - (b.display_order || 0));
  }, [categories, visibleProducts]);

  const hasMultipleCategories = categoriesWithProducts.length > 1;

  // Header height & scroll sticky detection for scrolling fixed effect
  const [headerHeight, setHeaderHeight] = useState(80);
  const [isPinned, setIsPinned] = useState(false);

  useEffect(() => {
    const updateHeader = () => {
      const headerEl = document.querySelector('header');
      if (headerEl) {
        setHeaderHeight(headerEl.offsetHeight);
      }
    };
    updateHeader();
    window.addEventListener('resize', updateHeader);
    return () => window.removeEventListener('resize', updateHeader);
  }, []);

  useEffect(() => {
    const handleScroll = () => {
      setIsPinned(window.scrollY > 200);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      
      {/* Page Header */}
      <div className="bg-gradient-to-r from-emerald-900 via-emerald-925 to-emerald-950 text-white p-8 rounded-3xl shadow-xl border border-emerald-800 space-y-3">
        <div className="flex items-center space-x-2 text-xs font-bold text-amber-300 uppercase tracking-widest">
          <Leaf className="w-4 h-4" />
          <span>FARMER & PRODUCER DIRECT CATALOG</span>
        </div>
        <h1 className="text-3xl sm:text-4xl font-serif font-bold text-white">
          {categoryFilter === 'offers' 
            ? 'Special Offers & Discounts' 
            : (categoryFilter === 'festival' || categoryFilter === 'festivals')
            ? '🪔 Festival Offers & Festive Deals'
            : activeCategoryObj 
            ? `${activeCategoryObj.name} (${activeCategoryObj.tamil_name || ''})` 
            : 'All Traditional Foods & Produce'}
        </h1>
        <p className="text-emerald-200 text-sm max-w-2xl">
          {categoryFilter === 'offers' 
            ? 'Discover discounted prices on premium traditional produce.' 
            : (categoryFilter === 'festival' || categoryFilter === 'festivals')
            ? 'Celebrate the festive season with special discounts, native crop combos, and auspicious organic harvests!'
            : activeCategoryObj 
            ? activeCategoryObj.description 
            : 'Explore traditional heritage rice, native millets, chekku cold-pressed oils, natural sweeteners, and unpolished pulses sourced directly from certified organic & natural farmers.'}
        </p>
      </div>

      {/* Filter Toolbar (Scrolling Fixed Effect for Mobile & Desktop) */}
      <div 
        style={{ top: `${headerHeight}px` }}
        className={`sticky z-30 transition-all duration-300 bg-white/95 dark:bg-emerald-950/95 backdrop-blur-md rounded-2xl sm:rounded-3xl border border-emerald-100 dark:border-emerald-800 ${
          isPinned 
            ? 'shadow-xl py-2.5 px-3.5 sm:px-5 ring-1 ring-emerald-500/20 border-emerald-300/80 dark:border-emerald-700' 
            : 'shadow-sm p-3.5 sm:p-5'
        } space-y-2.5 sm:space-y-3.5`}
      >
        
        {/* Mobile & Tablet View Toggle Bar with Filter Button (Smooth Expand/Collapse Animation) */}
        <div className="flex lg:hidden flex-col gap-2 pb-0.5 pt-0.5">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5 text-xs font-black text-emerald-950 dark:text-emerald-100 min-w-0">
              <SlidersHorizontal className="w-4 h-4 text-emerald-600 dark:text-amber-400 shrink-0" />
              <span className="truncate max-w-[150px]">
                {categoryFilter === 'all' 
                  ? 'All Categories' 
                  : categoryFilter === 'offers' 
                  ? 'Special Offers' 
                  : categoryFilter === 'festival' 
                  ? 'Festival Deals' 
                  : activeCategoryObj?.name || 'Catalog'}
              </span>
              {(searchQuery || organicOnly || categoryFilter !== 'all') && (
                <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping shrink-0" />
              )}
            </div>

            <button
              type="button"
              onClick={() => setMobileToolbarOpen(!mobileToolbarOpen)}
              className={`px-3 py-1.5 rounded-full text-xs font-black flex items-center gap-1.5 transition-all shadow-md cursor-pointer select-none shrink-0 ${
                mobileToolbarOpen
                  ? 'bg-emerald-800 text-white hover:bg-emerald-900 border border-emerald-600 ring-2 ring-emerald-400/40'
                  : 'bg-gradient-to-r from-amber-500 via-rose-500 to-amber-600 text-white animate-pulse border-2 border-amber-300 ring-2 ring-amber-400/60 shadow-lg scale-105'
              }`}
            >
              {mobileToolbarOpen ? (
                <>
                  <EyeOff className="w-3.5 h-3.5" />
                  <span>Hide Filters ▴</span>
                </>
              ) : (
                <>
                  <Eye className="w-3.5 h-3.5" />
                  <span>Filter & Categories ▾</span>
                  {(searchQuery || organicOnly || categoryFilter !== 'all') && (
                    <span className="bg-amber-300 text-emerald-950 text-[10px] font-black px-1.5 py-0.2 rounded-full ml-0.5">
                      Active
                    </span>
                  )}
                </>
              )}
            </button>
          </div>

          {/* Dedicated Mobile & Tablet Grid Layout Bar */}
          <div className="flex items-center justify-between gap-2 pt-1.5 border-t border-emerald-100 dark:border-emerald-800/60">
            <div className="flex items-center gap-1.5 text-[11px] font-extrabold text-emerald-900 dark:text-emerald-200">
              <LayoutGrid className="w-3.5 h-3.5 text-emerald-600 dark:text-amber-400" />
              <span>Grid Layout:</span>
            </div>

            <div className="flex items-center bg-emerald-100/90 dark:bg-emerald-900/80 p-0.5 rounded-xl border border-emerald-200 dark:border-emerald-700 shadow-2xs">
              {/* 1 Col */}
              <button
                type="button"
                onClick={() => handleLayoutChange('1')}
                className={`px-2 py-1 rounded-lg text-xs font-black transition-all cursor-pointer ${
                  layoutMode === '1'
                    ? 'bg-emerald-700 text-white shadow-sm ring-1 ring-emerald-400'
                    : 'text-gray-700 dark:text-emerald-200 hover:bg-emerald-200/60'
                }`}
                title="1 Column (Single Large Card)"
              >
                1 Col
              </button>

              {/* 2 Cols */}
              <button
                type="button"
                onClick={() => handleLayoutChange('2')}
                className={`px-2 py-1 rounded-lg text-xs font-black transition-all cursor-pointer ${
                  layoutMode === '2' || layoutMode === '4'
                    ? 'bg-emerald-700 text-white shadow-sm ring-1 ring-emerald-400'
                    : 'text-gray-700 dark:text-emerald-200 hover:bg-emerald-200/60'
                }`}
                title="2 Columns (Double Grid)"
              >
                2 Cols
              </button>

              {/* Compact 6-Col */}
              <button
                type="button"
                onClick={() => handleLayoutChange('6')}
                className={`px-2 py-1 rounded-lg text-xs font-black transition-all cursor-pointer ${
                  layoutMode === '6'
                    ? 'bg-emerald-700 text-white shadow-sm ring-1 ring-emerald-400'
                    : 'text-gray-700 dark:text-emerald-200 hover:bg-emerald-200/60'
                }`}
                title="Compact 2-Col Grid"
              >
                Compact
              </button>

              {/* List View */}
              <button
                type="button"
                onClick={() => handleLayoutChange('list')}
                className={`px-2 py-1 rounded-lg text-xs font-black flex items-center gap-1 transition-all cursor-pointer ${
                  layoutMode === 'list'
                    ? 'bg-emerald-700 text-white shadow-sm ring-1 ring-emerald-400'
                    : 'text-gray-700 dark:text-emerald-200 hover:bg-emerald-200/60'
                }`}
                title="List View"
              >
                <List className="w-3.5 h-3.5" />
                <span>List</span>
              </button>
            </div>
          </div>
        </div>

        {/* Animated Expandable Filter Body (Always visible on Desktop lg:block, compact size on mobile/tablet) */}
        <div
          className={`space-y-2.5 sm:space-y-3 transition-all duration-300 ease-in-out overflow-hidden lg:overflow-visible ${
            mobileToolbarOpen 
              ? 'max-h-[850px] opacity-100' 
              : 'max-h-0 opacity-0 lg:max-h-none lg:opacity-100 pointer-events-none lg:pointer-events-auto'
          }`}
        >

          {/* Row 1: Search Bar & Filter Controls (Mobile: stacked & balanced, Desktop: row) */}
          <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
          
          {/* Search Bar */}
          <div className="relative flex-1 max-w-full md:max-w-md">
            <Search className="w-4 h-4 absolute left-3.5 top-3.5 text-gray-400 dark:text-emerald-400" />
            <input
              type="text"
              placeholder="Search by name, Tamil name, or SKU..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-9 py-2.5 bg-emerald-50/60 dark:bg-emerald-950 border border-emerald-200 dark:border-emerald-700 rounded-xl text-xs sm:text-sm font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500 dark:text-emerald-100 transition-all placeholder:text-gray-400"
            />
            {searchQuery && (
              <button 
                type="button"
                onClick={() => setSearchQuery('')} 
                className="absolute right-3 top-3 text-gray-400 hover:text-gray-600 dark:hover:text-emerald-200 p-0.5 rounded-full hover:bg-emerald-100 dark:hover:bg-emerald-900 transition cursor-pointer"
                title="Clear search"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Controls: 100% Organic, Sort Selector, and Grid Layout Filter (2, 4, 6, List) */}
          <div className="flex flex-wrap items-center gap-2 sm:gap-2.5 w-full md:w-auto justify-between md:justify-end">
            
            {/* 100% Organic Toggle: ONLY DISPLAYED IF ORGANIC PRODUCE EXISTS (> 0) */}
            {organicProductsCount > 0 && (
              <button
                type="button"
                onClick={handleToggleOrganic}
                className={`flex-1 sm:flex-initial flex items-center justify-center space-x-1.5 px-3 py-2 sm:py-2.5 rounded-xl border text-xs font-bold transition-all cursor-pointer whitespace-nowrap shadow-2xs select-none ${
                  organicOnly
                    ? 'bg-emerald-700 text-white border-emerald-700 shadow-sm ring-2 ring-emerald-500/40'
                    : 'bg-emerald-50 dark:bg-emerald-950 text-emerald-900 dark:text-emerald-200 border-emerald-200 dark:border-emerald-700 hover:bg-emerald-100 dark:hover:bg-emerald-900'
                }`}
              >
                <Leaf className={`w-3.5 h-3.5 ${organicOnly ? 'text-white' : 'text-emerald-600 dark:text-emerald-400'}`} />
                <span>100% Organic</span>
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-black ${
                  organicOnly ? 'bg-emerald-900 text-emerald-100' : 'bg-emerald-200 dark:bg-emerald-800 text-emerald-950 dark:text-emerald-200'
                }`}>
                  {organicProductsCount}
                </span>
              </button>
            )}

            {/* Sort Dropdown */}
            <div className="flex-1 sm:flex-initial flex items-center space-x-2 bg-emerald-50 dark:bg-emerald-950 px-2.5 sm:px-3 py-2 sm:py-2.5 rounded-xl border border-emerald-200 dark:border-emerald-700 text-xs font-bold shadow-2xs">
              <ArrowUpDown className="w-3.5 h-3.5 text-gray-500 dark:text-emerald-400 shrink-0" />
              <select
                value={sortBy}
                onChange={(e) => handleSortChange(e.target.value as any)}
                className="bg-transparent text-gray-800 dark:text-emerald-100 font-bold focus:outline-none w-full sm:w-auto cursor-pointer"
              >
                <option value="featured" className="dark:bg-emerald-950">Featured & Bestsellers</option>
                <option value="price-asc" className="dark:bg-emerald-950">Price: Low to High</option>
                <option value="price-desc" className="dark:bg-emerald-950">Price: High to Low</option>
                <option value="name" className="dark:bg-emerald-950">Alphabetical (A-Z)</option>
              </select>
            </div>

            {/* Layout Filter Controls (1, 2, 4, 6, List) */}
            <div className="flex items-center bg-emerald-50 dark:bg-emerald-950 p-1 rounded-xl border border-emerald-200 dark:border-emerald-700 shadow-2xs">
              <span className="text-[10px] font-black uppercase tracking-wider text-emerald-800 dark:text-emerald-300 px-1.5 hidden lg:inline">
                Layout:
              </span>

              {/* 1 Column */}
              <button
                type="button"
                onClick={() => handleLayoutChange('1')}
                className={`px-2 py-1.5 rounded-lg text-xs font-black flex items-center gap-1 transition-all cursor-pointer ${
                  layoutMode === '1'
                    ? 'bg-emerald-700 text-white shadow-sm ring-1 ring-emerald-500'
                    : 'text-gray-600 dark:text-emerald-300 hover:bg-emerald-100 dark:hover:bg-emerald-900'
                }`}
                title="1 Column (Single Large Card)"
              >
                <span>1</span>
              </button>

              {/* 2 Columns */}
              <button
                type="button"
                onClick={() => handleLayoutChange('2')}
                className={`px-2 py-1.5 rounded-lg text-xs font-black flex items-center gap-1 transition-all cursor-pointer ${
                  layoutMode === '2'
                    ? 'bg-emerald-700 text-white shadow-sm ring-1 ring-emerald-500'
                    : 'text-gray-600 dark:text-emerald-300 hover:bg-emerald-100 dark:hover:bg-emerald-900'
                }`}
                title="2 Columns (Large Cards)"
              >
                <Columns2 className="w-3.5 h-3.5" />
                <span>2</span>
              </button>

              {/* 4 Columns */}
              <button
                type="button"
                onClick={() => handleLayoutChange('4')}
                className={`px-2 py-1.5 rounded-lg text-xs font-black flex items-center gap-1 transition-all cursor-pointer ${
                  layoutMode === '4'
                    ? 'bg-emerald-700 text-white shadow-sm ring-1 ring-emerald-500'
                    : 'text-gray-600 dark:text-emerald-300 hover:bg-emerald-100 dark:hover:bg-emerald-900'
                }`}
                title="4 Columns (Standard Grid)"
              >
                <LayoutGrid className="w-3.5 h-3.5" />
                <span>4</span>
              </button>

              {/* 6 Columns */}
              <button
                type="button"
                onClick={() => handleLayoutChange('6')}
                className={`px-2 py-1.5 rounded-lg text-xs font-black flex items-center gap-1 transition-all cursor-pointer ${
                  layoutMode === '6'
                    ? 'bg-emerald-700 text-white shadow-sm ring-1 ring-emerald-500'
                    : 'text-gray-600 dark:text-emerald-300 hover:bg-emerald-100 dark:hover:bg-emerald-900'
                }`}
                title="6 Columns (Compact Quick-Find)"
              >
                <Grid3X3 className="w-3.5 h-3.5" />
                <span>6</span>
              </button>

              {/* List View */}
              <button
                type="button"
                onClick={() => handleLayoutChange('list')}
                className={`px-2 py-1.5 rounded-lg text-xs font-black flex items-center gap-1 transition-all cursor-pointer ${
                  layoutMode === 'list'
                    ? 'bg-emerald-700 text-white shadow-sm ring-1 ring-emerald-500'
                    : 'text-gray-600 dark:text-emerald-300 hover:bg-emerald-100 dark:hover:bg-emerald-900'
                }`}
                title="List View (Easy Scan Order Sheet)"
              >
                <List className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">List</span>
              </button>
            </div>

          </div>

        </div>

        {/* Row 2: Category Navigation Strip with Left/Right Scroll Controls */}
        <div className="relative group">
          {/* Left Scroll Button (Desktop) */}
          <button
            type="button"
            onClick={() => scrollCategories('left')}
            className="hidden md:flex absolute -left-2 top-1/2 -translate-y-1/2 z-10 w-7 h-7 rounded-full bg-white dark:bg-emerald-900 shadow-md border border-emerald-200 dark:border-emerald-700 items-center justify-center text-emerald-800 dark:text-emerald-200 hover:scale-110 transition cursor-pointer"
            title="Scroll categories left"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          {/* Scrollable Category Pills */}
          <div 
            ref={categoryScrollRef}
            className="flex items-center gap-1.5 sm:gap-2 overflow-x-auto pb-1 text-xs font-semibold scrollbar-none overscroll-x-contain touch-pan-x"
          >
            {/* 1. All Categories */}
            <button
              onClick={() => handleSelectCategory('all')}
              className={`px-3 sm:px-3.5 py-1.5 sm:py-2 rounded-xl transition-all shrink-0 font-extrabold flex items-center gap-1.5 cursor-pointer text-xs ${
                categoryFilter === 'all'
                  ? 'bg-emerald-700 text-white shadow ring-2 ring-emerald-500'
                  : 'bg-emerald-50 dark:bg-emerald-950 text-gray-700 dark:text-emerald-200 hover:bg-emerald-100 dark:hover:bg-emerald-800 border border-emerald-200 dark:border-emerald-800'
              }`}
            >
              <span>🌾</span>
              <span>All Categories</span>
              <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ml-0.5 ${
                categoryFilter === 'all' ? 'bg-emerald-900 text-emerald-100' : 'bg-emerald-200/80 dark:bg-emerald-800 text-emerald-900 dark:text-emerald-100'
              }`}>
                {visibleProducts.length}
              </span>
            </button>
            
            {/* 2. Special Offers - Only displayed if active offers exist */}
            {(offerProductsCount > 0 || categoryFilter === 'offers') && (
              <button
                onClick={() => handleSelectCategory('offers')}
                className={`px-3 sm:px-3.5 py-1.5 sm:py-2 rounded-xl transition-all shrink-0 flex items-center gap-1.5 font-extrabold cursor-pointer text-xs ${
                  categoryFilter === 'offers'
                    ? 'bg-amber-600 text-white shadow ring-2 ring-amber-400'
                    : 'bg-amber-50 dark:bg-amber-950/70 text-amber-800 dark:text-amber-300 hover:bg-amber-100 dark:hover:bg-amber-900 border border-amber-200 dark:border-amber-800'
                }`}
              >
                <span>🔥</span>
                <span>Special Offers</span>
                <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ml-0.5 ${
                  categoryFilter === 'offers' ? 'bg-amber-950 text-amber-200' : 'bg-amber-200 text-amber-900'
                }`}>
                  {offerProductsCount}
                </span>
              </button>
            )}

            {/* 3. Festival Offers - ONLY DISPLAYED IF FESTIVAL DEALS EXIST (> 0) */}
            {festivalProductsCount > 0 && (
              <button
                onClick={() => handleSelectCategory('festival')}
                className={`px-3 sm:px-3.5 py-1.5 sm:py-2 rounded-xl transition-all shrink-0 flex items-center gap-1.5 font-extrabold cursor-pointer text-xs ${
                  categoryFilter === 'festival' || categoryFilter === 'festivals'
                    ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow ring-2 ring-amber-300'
                    : 'bg-amber-50 dark:bg-amber-950/70 text-amber-800 dark:text-amber-300 hover:bg-amber-100 dark:hover:bg-amber-900 border border-amber-200 dark:border-amber-800'
                }`}
              >
                <span>🪔</span>
                <span>Festival Deals</span>
                <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ml-0.5 ${
                  categoryFilter === 'festival' || categoryFilter === 'festivals' ? 'bg-amber-950 text-amber-200' : 'bg-amber-200 text-amber-900'
                }`}>
                  {festivalProductsCount}
                </span>
              </button>
            )}

            {/* 4. Other Produce Categories */}
            {categoriesWithProducts.map((cat: Category) => {
              const countInCat = visibleProducts.filter((p: Product) => p.category_id === cat.id).length;
              return (
                <button
                  key={cat.id}
                  onClick={() => handleSelectCategory(cat.id)}
                  className={`px-3 sm:px-3.5 py-1.5 sm:py-2 rounded-xl transition-all shrink-0 flex items-center gap-1.5 cursor-pointer text-xs ${
                    categoryFilter === cat.id
                      ? 'bg-emerald-700 text-white shadow'
                      : 'bg-emerald-50 dark:bg-emerald-950 text-gray-700 dark:text-emerald-200 hover:bg-emerald-100 dark:hover:bg-emerald-800 border border-emerald-200 dark:border-emerald-800'
                  }`}
                >
                  <span>{cat.icon || '🌾'}</span>
                  <span>{cat.name}</span>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ml-0.5 ${
                    categoryFilter === cat.id ? 'bg-emerald-950 text-amber-300' : 'bg-emerald-200/80 dark:bg-emerald-800 text-emerald-950 dark:text-emerald-100'
                  }`}>
                    {countInCat}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Right Scroll Button (Desktop) */}
          <button
            type="button"
            onClick={() => scrollCategories('right')}
            className="hidden md:flex absolute -right-2 top-1/2 -translate-y-1/2 z-10 w-7 h-7 rounded-full bg-white dark:bg-emerald-900 shadow-md border border-emerald-200 dark:border-emerald-700 items-center justify-center text-emerald-800 dark:text-emerald-200 hover:scale-110 transition cursor-pointer"
            title="Scroll categories right"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {/* Row 3: Active Filters Summary & Produce Counter (Only show "Showing X of Y" if multiple categories exist) */}
        {(hasMultipleCategories || searchQuery || organicOnly || (categoryFilter !== 'all')) && (
          <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-emerald-100 dark:border-emerald-800/60 text-xs">
            <div className="flex flex-wrap items-center gap-1.5">
              {/* Only show "Showing X of Y produce" IF multiple categories exist; otherwise do not show */}
              {hasMultipleCategories && (
                <span className="text-gray-700 dark:text-emerald-200 text-[11px] font-extrabold bg-emerald-100/80 dark:bg-emerald-900/80 px-2.5 py-0.5 rounded-lg border border-emerald-200 dark:border-emerald-800 shadow-2xs">
                  Showing {filteredProducts.length} of {visibleProducts.length} produce
                </span>
              )}

              {categoryFilter !== 'all' && (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg bg-emerald-100 dark:bg-emerald-900 text-emerald-900 dark:text-emerald-200 font-bold text-[11px]">
                  <span>Category: {
                    categoryFilter === 'offers' 
                      ? 'Special Offers' 
                      : categoryFilter === 'festival' 
                      ? 'Festival Deals' 
                      : activeCategoryObj?.name || categoryFilter
                  }</span>
                  <button onClick={() => setSearchParams({ category: 'all' })} className="hover:text-rose-600 font-black cursor-pointer">✕</button>
                </span>
              )}

              {organicOnly && (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg bg-emerald-100 dark:bg-emerald-900 text-emerald-900 dark:text-emerald-200 font-bold text-[11px]">
                  <span>100% Organic Only</span>
                  <button onClick={() => setOrganicOnly(false)} className="hover:text-rose-600 font-black cursor-pointer">✕</button>
                </span>
              )}

              {searchQuery && (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg bg-emerald-100 dark:bg-emerald-900 text-emerald-900 dark:text-emerald-200 font-bold text-[11px]">
                  <span>Query: "{searchQuery}"</span>
                  <button onClick={() => setSearchQuery('')} className="hover:text-rose-600 font-black cursor-pointer">✕</button>
                </span>
              )}

              {/* Active Layout Mode Indicator */}
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-emerald-100/80 dark:bg-emerald-900/60 text-emerald-900 dark:text-emerald-200 font-extrabold text-[11px] border border-emerald-200/80 dark:border-emerald-800">
                <span>Layout: {layoutMode === '1' ? '1-Col Detailed' : layoutMode === '2' ? '2-Cols Grid' : layoutMode === '4' ? '4-Cols Standard' : layoutMode === '6' ? '6-Cols Compact' : 'List Sheet'}</span>
              </span>
            </div>

            {(searchQuery || organicOnly || (categoryFilter !== 'all')) && (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery('');
                  setOrganicOnly(false);
                  setSearchParams({ category: 'all' });
                }}
                className="text-[11px] font-bold text-rose-600 dark:text-rose-400 hover:underline flex items-center gap-1 cursor-pointer shrink-0"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Reset Filters</span>
              </button>
            )}
          </div>
        )}

        </div>
      </div>

      {/* Product Grid / List Section */}
      {loading ? (
        <CardGridSkeleton count={8} />
      ) : filteredProducts.length === 0 ? (
        <div className="text-center py-20 bg-white dark:bg-emerald-900/20 rounded-3xl border border-emerald-100 dark:border-emerald-800 space-y-4">
          <div className="w-16 h-16 bg-emerald-100 dark:bg-emerald-900 rounded-full flex items-center justify-center mx-auto text-emerald-600 dark:text-emerald-400">
            <Filter className="w-8 h-8" />
          </div>
          <h3 className="text-xl font-bold text-gray-800 dark:text-emerald-100">
            No products match your current filters
          </h3>
          <p className="text-sm text-gray-500 dark:text-emerald-300 max-w-sm mx-auto">
            Try resetting your search query or selecting a different category.
          </p>
          <button
            onClick={() => {
              setSearchQuery('');
              setOrganicOnly(false);
              setSearchParams({ category: 'all' });
            }}
            className="px-6 py-2.5 bg-emerald-700 text-white text-xs font-bold rounded-xl shadow hover:bg-emerald-800"
          >
            Reset All Filters
          </button>
        </div>
      ) : (
        <div className="space-y-4 sm:space-y-6">
          {/* Produce Count & Quick Layout Bar (Prominently visible directly above products) */}
          <div className="flex flex-wrap items-center justify-between gap-2.5 bg-white/90 dark:bg-emerald-950/70 backdrop-blur-xs p-3 sm:p-3.5 rounded-2xl border border-emerald-100 dark:border-emerald-800/80 shadow-2xs">
            <div className="flex items-center gap-2 text-xs font-bold text-gray-700 dark:text-emerald-200">
              <span className="font-extrabold text-emerald-950 dark:text-emerald-100 text-xs sm:text-sm">
                🌾 {filteredProducts.length} {filteredProducts.length === 1 ? 'Produce' : 'Produces'} Available
              </span>
              <span className="text-gray-300 dark:text-emerald-700">•</span>
              <span className="text-emerald-700 dark:text-amber-400 font-extrabold text-[11px] sm:text-xs">
                {layoutMode === '1' ? '1-Column Detailed' : layoutMode === '2' ? '2-Column Grid' : layoutMode === '4' ? '4-Column Standard' : layoutMode === '6' ? '6-Column Compact' : 'List Order Sheet'}
              </span>
            </div>

            {/* Layout Options Group */}
            <div className="flex items-center bg-emerald-50 dark:bg-emerald-950 p-1 rounded-xl border border-emerald-200 dark:border-emerald-700 shadow-2xs">
              <span className="text-[10px] font-black uppercase tracking-wider text-emerald-800 dark:text-emerald-300 px-1.5 hidden sm:inline">
                View:
              </span>

              {/* 1 Col (Single) */}
              <button
                type="button"
                onClick={() => handleLayoutChange('1')}
                className={`px-2.5 py-1 rounded-lg text-xs font-black transition-all cursor-pointer ${
                  layoutMode === '1'
                    ? 'bg-emerald-700 text-white shadow-sm ring-1 ring-emerald-500'
                    : 'text-gray-600 dark:text-emerald-300 hover:bg-emerald-100 dark:hover:bg-emerald-900'
                }`}
                title="1 Column (Single Large Card)"
              >
                1 Col
              </button>

              {/* 2 Cols */}
              <button
                type="button"
                onClick={() => handleLayoutChange('2')}
                className={`px-2.5 py-1 rounded-lg text-xs font-black transition-all cursor-pointer ${
                  layoutMode === '2'
                    ? 'bg-emerald-700 text-white shadow-sm ring-1 ring-emerald-500'
                    : 'text-gray-600 dark:text-emerald-300 hover:bg-emerald-100 dark:hover:bg-emerald-900'
                }`}
                title="2 Columns (Double Grid)"
              >
                2 Cols
              </button>

              {/* 4 Cols */}
              <button
                type="button"
                onClick={() => handleLayoutChange('4')}
                className={`px-2.5 py-1 rounded-lg text-xs font-black transition-all cursor-pointer hidden sm:block ${
                  layoutMode === '4'
                    ? 'bg-emerald-700 text-white shadow-sm ring-1 ring-emerald-500'
                    : 'text-gray-600 dark:text-emerald-300 hover:bg-emerald-100 dark:hover:bg-emerald-900'
                }`}
                title="4 Columns (Standard Grid View)"
              >
                4 Cols
              </button>

              {/* 6 Cols Compact */}
              <button
                type="button"
                onClick={() => handleLayoutChange('6')}
                className={`px-2.5 py-1 rounded-lg text-xs font-black transition-all cursor-pointer ${
                  layoutMode === '6'
                    ? 'bg-emerald-700 text-white shadow-sm ring-1 ring-emerald-500'
                    : 'text-gray-600 dark:text-emerald-300 hover:bg-emerald-100 dark:hover:bg-emerald-900'
                }`}
                title="6 Columns (Compact Quick-Find)"
              >
                Compact
              </button>

              {/* List View */}
              <button
                type="button"
                onClick={() => handleLayoutChange('list')}
                className={`px-2.5 py-1 rounded-lg text-xs font-black flex items-center gap-1 transition-all cursor-pointer ${
                  layoutMode === 'list'
                    ? 'bg-emerald-700 text-white shadow-sm ring-1 ring-emerald-500'
                    : 'text-gray-600 dark:text-emerald-300 hover:bg-emerald-100 dark:hover:bg-emerald-900'
                }`}
                title="List View (Horizontal Order Sheet)"
              >
                <List className="w-3.5 h-3.5" />
                <span>List</span>
              </button>
            </div>
          </div>

          {/* Product Items: List or Grid */}
          {layoutMode === 'list' ? (
            <div className="flex flex-col space-y-2.5 sm:space-y-3">
              {filteredProducts.map((product) => (
                <ProductListItem
                  key={product.id}
                  product={product}
                  categories={categories}
                  onQuickView={setSelectedProduct}
                />
              ))}
            </div>
          ) : (
            <div className={`grid ${
              layoutMode === '1'
                ? 'grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6'
                : layoutMode === '2' 
                ? 'grid-cols-2 sm:grid-cols-2 md:grid-cols-3 gap-2.5 sm:gap-5' 
                : layoutMode === '6' 
                ? 'grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-6 gap-2 sm:gap-3.5' 
                : 'grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2.5 sm:gap-5 sm:gap-6'
            }`}>
              {filteredProducts.map((product) => (
                <ProductCard
                  key={product.id}
                  product={product}
                  categories={categories}
                  onQuickView={setSelectedProduct}
                  compact={layoutMode === '6'}
                />
              ))}
            </div>
          )}
        </div>
      )}

      <QuickViewModal 
        product={selectedProduct} 
        onClose={() => setSelectedProduct(null)} 
      />

    </div>
  );
};

export default ProductsPage;
