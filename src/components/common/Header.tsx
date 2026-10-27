import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { 
  ShoppingBag, Search, Sun, Moon, Menu, X, Phone, Shield, 
  ChevronDown, ExternalLink, Leaf, Sparkles, ArrowRight, User, Edit, Flame, Truck
} from 'lucide-react';
import Logo from './Logo';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import { useCart } from '../../contexts/CartContext';
import { getJSONStore } from '../../lib/dbManager';
import type { Category, Product, Review } from '../../types';

interface HeaderProps {
  onOpenCart: () => void;
  onSearchOpen: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onOpenCart, onSearchOpen }) => {
  const { user } = useAuth();
  const { theme, setTheme } = useTheme();
  const { itemCount } = useCart();
  const location = useLocation();
  const navigate = useNavigate();

  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [announcement, setAnnouncement] = useState<any>({
    text: '🌿 Free delivery on orders above ₹499 — Limited time offer!',
    link: '/products',
    bg_color: '#065f46',
    text_color: '#fde047',
    position_align: 'center',
    animation_type: 'scroll_right_to_left',
    items: [],
    is_active: true,
    approved: true
  });
  const [customNav, setCustomNav] = useState<{ text: string; url: string }>({
    text: 'Farmer Network',
    url: '/about'
  });

  React.useEffect(() => {
    async function load() {
      const [c, p, r] = await Promise.all([
        getJSONStore<Category>('categories'),
        getJSONStore<Product>('products'),
        getJSONStore<Review>('reviews')
      ]);
      setCategories(c);
      setProducts(p);
      setReviews(r || []);
      try {
        const cms = await getJSONStore<any>('cms_settings');
        if (cms && cms.length) {
          const cmsData = cms[0];
          if (cmsData.announcement) {
            const parsed = cmsData.announcement;
            const isScheduledFuture = parsed.scheduled_at && new Date(parsed.scheduled_at).getTime() > Date.now();
            if (!isScheduledFuture) {
              setAnnouncement((prev: any) => ({
                ...prev,
                ...parsed
              }));
            }
          }
          const hf = cmsData.headerFooter || cmsData.header_footer;
          if (hf && hf.nav_custom_link_text) {
            setCustomNav({
              text: hf.nav_custom_link_text,
              url: hf.nav_custom_link_url || '/about'
            });
          }
        }
      } catch (e) {
        console.error('Failed to parse announcement bar', e);
      }
    }
    load();
  }, []);

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [categoriesDropdownOpen, setCategoriesDropdownOpen] = useState(false);

  const isActive = (path: string) => location.pathname === path;
  const activeItems = (announcement.items || []).filter((it: any) => it.is_active);

  const specialOffersCount = React.useMemo(() => {
    return products.filter((p: Product) => p.is_visible !== false && Boolean(p.offer_price && p.offer_price > 0 && p.offer_price < p.selling_price)).length;
  }, [products]);

  const isSpecialOffersActive = location.pathname === '/products' && (location.search.includes('category=offers') || location.search.includes('offers'));
  const isProductsActive = location.pathname === '/products' && !isSpecialOffersActive;
  const isAboutActive = location.pathname === '/about';

  // Prevent duplicate navigation items (e.g. if customNav was set to "Special Offers" or points to offers/about)
  const showCustomNav = Boolean(
    customNav.text &&
    customNav.url &&
    customNav.url !== '/about' &&
    customNav.url !== '/' &&
    !customNav.text.toLowerCase().includes('offer') &&
    !customNav.text.toLowerCase().includes('about') &&
    !customNav.url.includes('offers') &&
    !customNav.url.includes('featured=true')
  );

  const approvedReviews = reviews.filter((r) => r.status === 'APPROVED' || !r.status);
  const hasReviews = approvedReviews.length > 0;
  const avgRating = hasReviews 
    ? (approvedReviews.reduce((sum, r) => sum + (r.rating || 5), 0) / approvedReviews.length).toFixed(1)
    : '4.9';

  // Only active product categories that have visible products and are marked active
  const activeProductCategories = categories.filter((cat: Category) => {
    if (cat.is_active === false || cat.is_visible === false) return false;
    const nameLower = (cat.name || '').toLowerCase();
    if (nameLower.includes('test') || nameLower.includes('dummy') || nameLower.includes('sample')) return false;
    if (cat.id === 'offers' || nameLower.includes('offer')) return false;
    return products.some(p => p.category_id === cat.id && p.is_visible !== false);
  });

  return (
    <header className="sticky top-0 z-40 bg-white/95 dark:bg-emerald-950/95 backdrop-blur-md border-b border-emerald-100 dark:border-emerald-800/50 shadow-sm transition-colors duration-200">
      {/* Dynamic Announcement Top Banner Bar */}
      {announcement.is_active && announcement.approved !== false && (
        <div 
          className="px-2.5 sm:px-4 py-1.5 sm:py-2 text-[11px] sm:text-xs font-semibold transition-all border-b border-black/15 dark:border-white/10 shadow-sm relative overflow-hidden select-none"
          style={{ 
            backgroundColor: announcement.bg_color || '#065f46',
            color: announcement.text_color || '#ffffff'
          }}
        >
          {/* Subtle Shimmer Overlay */}
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent pointer-events-none" />

          <div className="max-w-7xl mx-auto flex items-center justify-between gap-2 sm:gap-4 relative z-10">
            
            {/* Left/Center Announcement ticker text with alignment & animation */}
            <div 
              className={`min-w-0 flex-1 overflow-hidden flex items-center pr-2 ${
                announcement.position_align === 'center'
                  ? 'justify-center text-center'
                  : announcement.position_align === 'right'
                  ? 'justify-end text-right'
                  : 'justify-start text-left'
              }`}
            >
              {announcement.animation_type === 'scroll_right_to_left' || announcement.animation_type === 'scroll_left_to_right' ? (
                /* Seamless continuous loop container with hover pause */
                <div 
                  className={`flex items-center gap-8 py-0.5 ${
                    announcement.animation_type === 'scroll_right_to_left'
                      ? 'animate-marquee-left'
                      : 'animate-marquee-right'
                  }`}
                >
                  {/* Track 1 */}
                  <div className="flex items-center gap-8 shrink-0">
                    {activeItems.length > 0 ? (
                      activeItems.map((item: any) => (
                        <span key={item.id} className="inline-flex items-center gap-2 whitespace-nowrap text-[11px] sm:text-xs font-semibold tracking-wide">
                          <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping shrink-0" />
                          <Leaf className="w-3.5 h-3.5 shrink-0 text-amber-300 drop-shadow-xs" />
                          <span>{item.text}</span>
                          {item.link && (
                            <Link 
                              to={item.link} 
                              className="inline-flex items-center gap-1 ml-1.5 px-2.5 py-0.5 rounded-full bg-gradient-to-r from-amber-400 via-amber-300 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-emerald-950 font-black text-[10px] sm:text-[11px] shadow-sm hover:shadow transition-all hover:scale-105 active:scale-95 no-underline shrink-0"
                            >
                              <span>Learn More</span>
                              <ArrowRight className="w-3 h-3 text-emerald-950 inline-block" />
                            </Link>
                          )}
                        </span>
                      ))
                    ) : (
                      <span className="inline-flex items-center gap-2 whitespace-nowrap text-[11px] sm:text-xs font-semibold tracking-wide">
                        <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping shrink-0" />
                        <Leaf className="w-3.5 h-3.5 shrink-0 text-amber-300 drop-shadow-xs" />
                        <span>{announcement.text || '🌿 Free delivery on orders above ₹499 — Limited time offer!'}</span>
                        {announcement.link && (
                          <Link 
                            to={announcement.link} 
                            className="inline-flex items-center gap-1 ml-1.5 px-2.5 py-0.5 rounded-full bg-gradient-to-r from-amber-400 via-amber-300 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-emerald-950 font-black text-[10px] sm:text-[11px] shadow-sm hover:shadow transition-all hover:scale-105 active:scale-95 no-underline shrink-0"
                          >
                            <span>Learn More</span>
                            <ArrowRight className="w-3 h-3 text-emerald-950 inline-block" />
                          </Link>
                        )}
                      </span>
                    )}
                  </div>

                  {/* Track 2 (Seamless loop copy) */}
                  <div className="flex items-center gap-8 shrink-0" aria-hidden="true">
                    {activeItems.length > 0 ? (
                      activeItems.map((item: any) => (
                        <span key={`dup_${item.id}`} className="inline-flex items-center gap-2 whitespace-nowrap text-[11px] sm:text-xs font-semibold tracking-wide">
                          <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping shrink-0" />
                          <Leaf className="w-3.5 h-3.5 shrink-0 text-amber-300 drop-shadow-xs" />
                          <span>{item.text}</span>
                          {item.link && (
                            <Link 
                              to={item.link} 
                              className="inline-flex items-center gap-1 ml-1.5 px-2.5 py-0.5 rounded-full bg-gradient-to-r from-amber-400 via-amber-300 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-emerald-950 font-black text-[10px] sm:text-[11px] shadow-sm hover:shadow transition-all hover:scale-105 active:scale-95 no-underline shrink-0"
                            >
                              <span>Learn More</span>
                              <ArrowRight className="w-3 h-3 text-emerald-950 inline-block" />
                            </Link>
                          )}
                        </span>
                      ))
                    ) : (
                      <span className="inline-flex items-center gap-2 whitespace-nowrap text-[11px] sm:text-xs font-semibold tracking-wide">
                        <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping shrink-0" />
                        <Leaf className="w-3.5 h-3.5 shrink-0 text-amber-300 drop-shadow-xs" />
                        <span>{announcement.text || '🌿 Free delivery on orders above ₹499 — Limited time offer!'}</span>
                        {announcement.link && (
                          <Link 
                            to={announcement.link} 
                            className="inline-flex items-center gap-1 ml-1.5 px-2.5 py-0.5 rounded-full bg-gradient-to-r from-amber-400 via-amber-300 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-emerald-950 font-black text-[10px] sm:text-[11px] shadow-sm hover:shadow transition-all hover:scale-105 active:scale-95 no-underline shrink-0"
                          >
                            <span>Learn More</span>
                            <ArrowRight className="w-3 h-3 text-emerald-950 inline-block" />
                          </Link>
                        )}
                      </span>
                    )}
                  </div>
                </div>
              ) : (
                /* Static Announcement Display */
                <div className="flex items-center gap-4 flex-wrap justify-center py-0.5">
                  {activeItems.length > 0 ? (
                    activeItems.map((item: any) => (
                      <span key={item.id} className="inline-flex items-center gap-2 whitespace-nowrap text-[11px] sm:text-xs font-semibold tracking-wide">
                        <Leaf className="w-3.5 h-3.5 shrink-0 text-amber-300 drop-shadow-xs" />
                        <span>{item.text}</span>
                        {item.link && (
                          <Link 
                            to={item.link} 
                            className="inline-flex items-center gap-1 ml-1.5 px-2.5 py-0.5 rounded-full bg-gradient-to-r from-amber-400 via-amber-300 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-emerald-950 font-black text-[10px] sm:text-[11px] shadow-sm hover:shadow transition-all hover:scale-105 active:scale-95 no-underline shrink-0"
                          >
                            <span>Learn More</span>
                            <ArrowRight className="w-3 h-3 text-emerald-950 inline-block" />
                          </Link>
                        )}
                      </span>
                    ))
                  ) : (
                    <span className="inline-flex items-center gap-2 whitespace-nowrap text-[11px] sm:text-xs font-semibold tracking-wide">
                      <Leaf className="w-3.5 h-3.5 shrink-0 text-amber-300 drop-shadow-xs" />
                      <span>{announcement.text || '🌿 Free delivery on orders above ₹499 — Limited time offer!'}</span>
                      {announcement.link && (
                        <Link 
                          to={announcement.link} 
                          className="inline-flex items-center gap-1 ml-1.5 px-2.5 py-0.5 rounded-full bg-gradient-to-r from-amber-400 via-amber-300 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-emerald-950 font-black text-[10px] sm:text-[11px] shadow-sm hover:shadow transition-all hover:scale-105 active:scale-95 no-underline shrink-0"
                        >
                          <span>Learn More</span>
                          <ArrowRight className="w-3 h-3 text-emerald-950 inline-block" />
                        </Link>
                      )}
                    </span>
                  )}
                </div>
              )}
            </div>

            {/* Right side: Only show if an authenticated staff/admin user is logged in. Never show 'Admin Workspace' to public visitors. */}
            {user && user.role && user.role !== 'CUSTOMER' && (
              <div className="hidden sm:flex items-center gap-2 shrink-0 text-[11px] font-bold">
                {/* 1-Click CMS Announcement Shortcut */}
                <Link
                  to="/admin/cms/announcements"
                  title="Edit notification bar in CMS"
                  className="flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-black/25 hover:bg-black/40 text-amber-300 hover:text-amber-200 border border-amber-400/40 text-[10px] font-bold transition-all shadow-2xs"
                >
                  <Edit className="w-3 h-3" />
                  <span>CMS Editor</span>
                </Link>

                {/* Logged in Staff Identity */}
                <Link
                  to="/admin"
                  title={`Logged in as ${user.full_name} (${user.role})`}
                  className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-white/20 hover:bg-white/30 text-white border border-white/25 transition-all shadow-2xs"
                >
                  <User className="w-3 h-3 text-amber-300" />
                  <span className="truncate max-w-[100px]">{user.full_name?.split(' ')[0] || user.role}</span>
                  <span className="bg-amber-400 text-emerald-950 font-black text-[9px] px-1.5 py-0.2 rounded font-mono uppercase">
                    {user.role}
                  </span>
                </Link>
              </div>
            )}

          </div>
        </div>
      )}

      {/* Main Header Bar */}
      <div className="max-w-7xl 2xl:max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20 gap-2 sm:gap-4 lg:gap-6">
          
          {/* Brand Logo */}
          <Link to="/" className="flex items-center focus:outline-none shrink-0 pr-2 lg:pr-4">
            <Logo variant="full" size="md" showTagline={true} />
          </Link>

          {/* Desktop Navigation Links */}
          <nav className="hidden lg:flex items-center h-full gap-1 xl:gap-2 2xl:gap-3 text-[13px] xl:text-sm font-semibold whitespace-nowrap">
            {/* Home */}
            <Link 
              to="/" 
              className={`relative h-full flex items-center px-2.5 xl:px-3 text-gray-700 dark:text-gray-200 hover:text-emerald-700 dark:hover:text-emerald-400 transition-colors whitespace-nowrap ${
                isActive('/') ? 'text-emerald-700 dark:text-emerald-400 font-bold' : ''
              }`}
            >
              <span>Home</span>
              {isActive('/') && (
                <span className="absolute bottom-0 left-2.5 right-2.5 h-0.75 bg-emerald-600 dark:bg-emerald-400 rounded-t-full" />
              )}
            </Link>

            {/* Categories Dropdown */}
            <div 
              className="relative h-full flex items-center"
              onMouseEnter={() => setCategoriesDropdownOpen(true)}
              onMouseLeave={() => setCategoriesDropdownOpen(false)}
            >
              <button 
                onClick={() => navigate('/products')}
                className="flex items-center gap-1 px-2.5 xl:px-3 h-full text-gray-700 dark:text-gray-200 hover:text-emerald-700 dark:hover:text-emerald-400 transition-colors whitespace-nowrap"
              >
                <span>Products &amp; Produce</span>
                <ChevronDown className={`w-3.5 h-3.5 text-gray-400 transition-transform duration-200 shrink-0 ${categoriesDropdownOpen ? 'rotate-180 text-emerald-600' : ''}`} />
              </button>

              {categoriesDropdownOpen && (
                <div className="absolute top-full left-0 w-64 bg-white dark:bg-emerald-900 shadow-xl rounded-xl border border-emerald-100 dark:border-emerald-800 py-2 z-50 animate-fadeIn">
                  <div className="px-3 py-1 text-xs font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 border-b border-gray-100 dark:border-emerald-800/60 mb-1">
                    Traditional Categories
                  </div>
                  {activeProductCategories.map((cat: Category) => (
                    <Link
                      key={cat.id}
                      to={`/products?category=${cat.id}`}
                      className="flex items-center px-4 py-2.5 text-sm text-gray-700 dark:text-emerald-100 hover:bg-emerald-50 dark:hover:bg-emerald-800/50 hover:text-emerald-700 dark:hover:text-amber-300 transition-colors"
                      onClick={() => setCategoriesDropdownOpen(false)}
                    >
                      <span className="mr-2 text-base">{cat.icon || '🌾'}</span>
                      <div>
                        <div className="font-medium">{cat.name}</div>
                        {cat.tamil_name && <div className="text-xs text-gray-400 dark:text-emerald-300/60">{cat.tamil_name}</div>}
                      </div>
                    </Link>
                  ))}
                  <div className="border-t border-gray-100 dark:border-emerald-800/60 mt-1 pt-1">
                    <Link 
                      to="/products"
                      className="block px-4 py-2 text-xs font-semibold text-center text-emerald-600 dark:text-amber-300 hover:underline"
                    >
                      Browse All Categories &rarr;
                    </Link>
                  </div>
                </div>
              )}
            </div>

            {/* Track Order */}
            <Link 
              to="/track-order" 
              className={`relative h-full flex items-center gap-1.5 px-2.5 xl:px-3 text-gray-700 dark:text-gray-200 hover:text-emerald-700 dark:hover:text-emerald-400 transition-colors whitespace-nowrap ${
                isActive('/track-order') ? 'text-emerald-700 dark:text-emerald-400 font-bold' : ''
              }`}
            >
              <Truck className="w-4 h-4 text-emerald-600 dark:text-amber-400" />
              <span>Track Order</span>
              {isActive('/track-order') && (
                <span className="absolute bottom-0 left-2.5 right-2.5 h-0.75 bg-emerald-600 dark:bg-emerald-400 rounded-t-full" />
              )}
            </Link>

            {/* Special Offers - Sleek, Compact Highlighted Nav Pill */}
            {specialOffersCount > 0 && (
              <div className="h-full flex items-center px-1">
                <Link
                  to="/products?category=offers"
                  className={`inline-flex items-center gap-1.5 px-2.5 xl:px-3 py-1 rounded-full text-xs font-bold transition-all shrink-0 whitespace-nowrap ${
                    isSpecialOffersActive
                      ? 'bg-amber-500 text-white shadow-xs ring-2 ring-amber-400 ring-offset-1 scale-[1.02]'
                      : 'bg-amber-50 dark:bg-amber-950/70 text-amber-800 dark:text-amber-300 border border-amber-300/80 dark:border-amber-700/60 hover:bg-amber-100 dark:hover:bg-amber-900/50 hover:text-amber-900 shadow-2xs'
                  }`}
                >
                  <Flame className={`w-3.5 h-3.5 shrink-0 ${isSpecialOffersActive ? 'text-yellow-100' : 'text-amber-500 animate-pulse'}`} />
                  <span>Special Offers</span>
                  <span className={`text-[10px] font-extrabold px-1.5 py-0.2 rounded-full leading-tight shrink-0 ${
                    isSpecialOffersActive 
                      ? 'bg-amber-950/80 text-amber-200' 
                      : 'bg-amber-200/90 dark:bg-amber-800 text-amber-950 dark:text-amber-100'
                  }`}>
                    {specialOffersCount}
                  </span>
                </Link>
              </div>
            )}

            {/* Reviews */}
            {hasReviews && (
              <Link 
                to="/reviews" 
                className={`relative h-full flex items-center gap-1.5 px-2.5 xl:px-3 text-gray-700 dark:text-gray-200 hover:text-emerald-700 dark:hover:text-emerald-400 transition-colors whitespace-nowrap ${
                  isActive('/reviews') ? 'text-emerald-700 dark:text-emerald-400 font-bold' : ''
                }`}
              >
                <span>Reviews</span>
                <span className="inline-flex items-center gap-0.5 bg-amber-50 dark:bg-amber-950/70 text-amber-800 dark:text-amber-300 text-[11px] font-bold px-1.5 py-0.5 rounded-md border border-amber-300/70 dark:border-amber-700/60 leading-none shrink-0 whitespace-nowrap">
                  ★ {avgRating}
                </span>
                {isActive('/reviews') && (
                  <span className="absolute bottom-0 left-2.5 right-2.5 h-0.75 bg-emerald-600 dark:bg-emerald-400 rounded-t-full" />
                )}
              </Link>
            )}

            {/* About */}
            <Link 
              to="/about" 
              className={`relative h-full flex items-center px-2.5 xl:px-3 text-gray-700 dark:text-gray-200 hover:text-emerald-700 dark:hover:text-emerald-400 transition-colors whitespace-nowrap ${
                isAboutActive ? 'text-emerald-700 dark:text-emerald-400 font-bold' : ''
              }`}
            >
              <span>About</span>
              {isAboutActive && (
                <span className="absolute bottom-0 left-2.5 right-2.5 h-0.75 bg-emerald-600 dark:bg-emerald-400 rounded-t-full" />
              )}
            </Link>

            {/* Custom Nav Link if set, distinct from About & Offers */}
            {showCustomNav && (
              <Link 
                to={customNav.url} 
                className={`relative h-full flex items-center px-2.5 xl:px-3 text-gray-700 dark:text-gray-200 hover:text-emerald-700 dark:hover:text-emerald-400 transition-colors whitespace-nowrap ${
                  isActive(customNav.url) ? 'text-emerald-700 dark:text-emerald-400 font-bold' : ''
                }`}
              >
                <span>{customNav.text}</span>
                {isActive(customNav.url) && (
                  <span className="absolute bottom-0 left-2.5 right-2.5 h-0.75 bg-emerald-600 dark:bg-emerald-400 rounded-t-full" />
                )}
              </Link>
            )}

            {/* Contact Us */}
            <Link 
              to="/contact" 
              className={`relative h-full flex items-center px-2.5 xl:px-3 text-gray-700 dark:text-gray-200 hover:text-emerald-700 dark:hover:text-emerald-400 transition-colors whitespace-nowrap ${
                isActive('/contact') ? 'text-emerald-700 dark:text-emerald-400 font-bold' : ''
              }`}
            >
              <span>Contact Us</span>
              {isActive('/contact') && (
                <span className="absolute bottom-0 left-2.5 right-2.5 h-0.75 bg-emerald-600 dark:bg-emerald-400 rounded-t-full" />
              )}
            </Link>
          </nav>

          {/* Action Tools */}
          <div className="flex items-center space-x-2 sm:space-x-3 shrink-0">
            {/* Search Trigger */}
            <button
              onClick={onSearchOpen}
              aria-label="Search products"
              className="p-2 sm:p-2.5 rounded-full text-gray-700 dark:text-gray-200 hover:bg-emerald-50 dark:hover:bg-emerald-900 transition-colors"
              title="Search traditional products"
            >
              <Search className="w-5 h-5" />
            </button>

            {/* Cart Drawer Trigger */}
            <button
              onClick={onOpenCart}
              aria-label="Open WhatsApp cart"
              className="relative flex items-center gap-2 bg-emerald-700 hover:bg-emerald-800 text-white px-3.5 sm:px-4 py-2 sm:py-2.5 rounded-full shadow-md transition-all hover:shadow-lg font-medium text-xs sm:text-sm whitespace-nowrap shrink-0"
            >
              <ShoppingBag className="w-4 h-4" />
              <span className="hidden sm:inline font-semibold">Order List</span>
              {itemCount > 0 && (
                <span className="bg-amber-400 text-emerald-950 font-bold text-xs w-5 h-5 rounded-full flex items-center justify-center animate-bounce">
                  {itemCount}
                </span>
              )}
            </button>

            {/* Mobile Hamburger Toggle */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="lg:hidden p-2 rounded-lg text-gray-600 dark:text-emerald-200 hover:bg-emerald-50 dark:hover:bg-emerald-900"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>

        </div>
      </div>

      {/* Mobile Drawer Menu */}
      {mobileMenuOpen && (
        <div className="lg:hidden bg-white dark:bg-emerald-950 border-b border-emerald-100 dark:border-emerald-800 px-4 pt-3 pb-6 space-y-3">
          {/* Highlighted Special Offers Mobile Pill/Banner (ONLY shown if active special offers exist) */}
          {specialOffersCount > 0 && (
            <Link
              to="/products?category=offers"
              onClick={() => setMobileMenuOpen(false)}
              className="flex items-center justify-between p-3 rounded-xl bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 text-white font-bold shadow-md shadow-amber-500/20 active:scale-[0.99] transition-transform"
            >
              <div className="flex items-center gap-2">
                <Flame className="w-5 h-5 text-yellow-200 animate-pulse" />
                <span className="font-extrabold tracking-wide">🔥 Special Offers &amp; Deals</span>
              </div>
              <span className="bg-amber-950/80 text-yellow-200 text-xs px-2.5 py-0.5 rounded-full font-black border border-amber-300/40">
                {specialOffersCount} Deals
              </span>
            </Link>
          )}

          <Link
            to="/"
            onClick={() => setMobileMenuOpen(false)}
            className={`block py-2 text-base font-medium ${isActive('/') ? 'text-emerald-700 dark:text-emerald-400 font-bold' : 'text-gray-800 dark:text-emerald-100 hover:text-emerald-600'}`}
          >
            Home
          </Link>
          <Link
            to="/products"
            onClick={() => setMobileMenuOpen(false)}
            className={`block py-2 text-base font-medium ${isProductsActive ? 'text-emerald-700 dark:text-emerald-400 font-bold' : 'text-gray-800 dark:text-emerald-100 hover:text-emerald-600'}`}
          >
            Shop Products
          </Link>
          <div className="pl-4 space-y-2 border-l-2 border-emerald-200 dark:border-emerald-800 my-1">
            <span className="text-xs uppercase font-bold text-emerald-600 dark:text-emerald-400">Categories</span>
            {activeProductCategories.map((cat: Category) => (
              <Link
                key={cat.id}
                to={`/products?category=${cat.id}`}
                onClick={() => setMobileMenuOpen(false)}
                className="block py-1 text-sm text-gray-600 dark:text-emerald-200 hover:text-emerald-600"
              >
                {cat.icon} {cat.name}
              </Link>
            ))}
          </div>
          {hasReviews && (
            <Link
              to="/reviews"
              onClick={() => setMobileMenuOpen(false)}
              className="block py-2.5 text-base font-medium text-gray-800 dark:text-emerald-100 hover:text-emerald-600 flex items-center justify-between"
            >
              <span>Customer Reviews</span>
              <span className="bg-amber-100 text-amber-900 text-xs font-bold px-2 py-0.5 rounded-full border border-amber-300">★ {avgRating}</span>
            </Link>
          )}
          <Link
            to="/track-order"
            onClick={() => setMobileMenuOpen(false)}
            className={`block py-2.5 text-base font-medium flex items-center gap-2 ${isActive('/track-order') ? 'text-emerald-700 dark:text-emerald-400 font-bold' : 'text-gray-800 dark:text-emerald-100 hover:text-emerald-600'}`}
          >
            <Truck className="w-4 h-4 text-emerald-600 dark:text-amber-400" />
            <span>Track Order</span>
          </Link>
          <Link
            to="/about"
            onClick={() => setMobileMenuOpen(false)}
            className={`block py-2.5 text-base font-medium ${isAboutActive ? 'text-emerald-700 dark:text-emerald-400 font-bold' : 'text-gray-800 dark:text-emerald-100 hover:text-emerald-600'}`}
          >
            About Us
          </Link>
          {showCustomNav && (
            <Link
              to={customNav.url}
              onClick={() => setMobileMenuOpen(false)}
              className="block py-2.5 text-base font-medium text-gray-800 dark:text-emerald-100 hover:text-emerald-600"
            >
              {customNav.text}
            </Link>
          )}
          <Link
            to="/contact"
            onClick={() => setMobileMenuOpen(false)}
            className="block py-2.5 text-base font-medium text-gray-800 dark:text-emerald-100 hover:text-emerald-600"
          >
            Contact Us
          </Link>
          {user && user.role && user.role !== 'CUSTOMER' && (
            <Link
              to="/admin"
              onClick={() => setMobileMenuOpen(false)}
              className="block py-2.5 text-sm font-bold text-emerald-800 dark:text-amber-400 border-t border-emerald-100 dark:border-emerald-800/80 pt-3"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <User className="w-4 h-4 text-emerald-600 dark:text-amber-400" />
                  <span>Staff Portal ({user.full_name?.split(' ')[0] || user.role})</span>
                </div>
                <span className="bg-amber-400 text-emerald-950 text-[10px] font-mono px-2 py-0.5 rounded font-black uppercase">
                  {user.role}
                </span>
              </div>
            </Link>
          )}
        </div>
      )}
    </header>
  );
};

export default Header;
