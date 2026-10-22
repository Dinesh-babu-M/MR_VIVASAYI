import React, { useState } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import Header from '../common/Header';
import Footer from '../common/Footer';
import CartDrawer from '../common/CartDrawer';
import WebPushNotificationModal from '../common/WebPushNotificationModal';
import { Search, X, Leaf, ArrowRight } from 'lucide-react';
import { formatPrice } from '../../lib/utils';
import type { Product } from '../../types';
import { getJSONStore, getAppConfig } from '../../lib/dbManager';
import Logo from '../common/Logo';
import { Lock } from 'lucide-react';

export const PublicLayout: React.FC = () => {
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [products, setProducts] = useState<Product[]>([]);
  const [isMaintenance, setIsMaintenance] = useState(false);
  const navigate = useNavigate();

  React.useEffect(() => {
    async function load() {
      const config = await getAppConfig();
      setIsMaintenance(!!config.maintenance_mode);
      const p = await getJSONStore<Product>('products');
      setProducts(p);
    }
    load();
  }, []);

  if (isMaintenance) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-950 via-emerald-900 to-emerald-950 text-white flex flex-col items-center justify-center p-6 relative overflow-hidden text-center">
        <div className="absolute inset-0 opacity-10 bg-[radial-gradient(#fff_1px,transparent_1px)] [background-size:20px_20px]" />
        
        <div className="max-w-md w-full bg-emerald-900/90 border border-emerald-700/80 rounded-3xl p-8 shadow-2xl backdrop-blur-md relative z-10 space-y-6">
          <div className="flex justify-center">
            <Logo variant="full" theme="dark" size="xl" showTagline={true} />
          </div>

          <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-amber-400/20 text-amber-300 rounded-full text-xs font-bold uppercase tracking-wider border border-amber-400/30">
            <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
            Store Under Scheduled Maintenance
          </div>

          <div className="space-y-2">
            <h1 className="text-2xl font-serif font-bold text-amber-100">
              We'll Be Right Back!
            </h1>
            <p className="text-xs sm:text-sm text-emerald-200 leading-relaxed">
              Our organic food store is currently undergoing routine maintenance & harvest inventory sync. Please check back shortly for fresh farm produce!
            </p>
          </div>

          <div className="pt-4 border-t border-emerald-800 flex items-center justify-center gap-4">
            <a
              href="https://wa.me/919876543210?text=Hello%20MR.%20VIVASAYI%20Team,%20I%20have%20a%20question%20during%20maintenance"
              target="_blank"
              rel="noopener noreferrer"
              className="px-4 py-2.5 bg-emerald-700 hover:bg-emerald-600 text-white font-bold text-xs rounded-xl shadow transition-colors"
            >
              Contact Support WhatsApp
            </a>
            <a
              href="/admin/login"
              className="px-4 py-2.5 bg-white/10 hover:bg-white/20 text-amber-300 font-bold text-xs rounded-xl border border-amber-300/30 transition-colors flex items-center gap-1.5"
            >
              <Lock className="w-3.5 h-3.5" /> Staff Login
            </a>
          </div>
        </div>

        <p className="text-[11px] text-emerald-400 mt-6 relative z-10">
          © {new Date().getFullYear()} MR. VIVASAYI — Pure Traditional Foods
        </p>
      </div>
    );
  }

  const filteredProducts = searchQuery.trim() === '' ? [] : products.filter((p: Product) => 
    p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (p.tamil_name && p.tamil_name.toLowerCase().includes(searchQuery.toLowerCase())) ||
    p.sku.toLowerCase().includes(searchQuery.toLowerCase())
  ).slice(0, 6);

  const handleSelectProduct = (product: Product) => {
    setIsSearchOpen(false);
    setSearchQuery('');
    navigate(`/products/${product.id}`);
  };

  return (
    <div className="min-h-screen flex flex-col bg-emerald-50/20 dark:bg-emerald-950/40 text-gray-900 dark:text-emerald-50 font-sans transition-colors duration-200">
      <Header 
        onOpenCart={() => setIsCartOpen(true)} 
        onSearchOpen={() => setIsSearchOpen(true)} 
      />

      <main className="flex-1">
        <Outlet />
      </main>

      <Footer />

      <CartDrawer 
        isOpen={isCartOpen} 
        onClose={() => setIsCartOpen(false)} 
      />

      <WebPushNotificationModal />

      {/* Global Search Modal */}
      {isSearchOpen && (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 px-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-emerald-950 w-full max-w-2xl rounded-2xl shadow-2xl border border-emerald-100 dark:border-emerald-800 overflow-hidden animate-fadeIn">
            
            <div className="p-4 border-b border-emerald-100 dark:border-emerald-800 flex items-center space-x-3">
              <Search className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
              <input
                type="text"
                autoFocus
                placeholder="Search traditional rice, millets, chekku oils... (e.g. Mapillai Samba, Foxtail)"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="flex-1 bg-transparent text-gray-900 dark:text-emerald-100 focus:outline-none text-base placeholder-gray-400 dark:placeholder-emerald-400/50"
              />
              <button 
                onClick={() => setIsSearchOpen(false)}
                className="p-1 rounded-full text-gray-400 hover:text-gray-600 dark:hover:text-emerald-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Results dropdown */}
            <div className="max-h-96 overflow-y-auto p-4 space-y-2">
              {searchQuery.trim() === '' ? (
                <div className="text-center py-8 text-xs text-gray-500 dark:text-emerald-300/60">
                  <Leaf className="w-8 h-8 text-emerald-400 mx-auto mb-2 opacity-50" />
                  Type product name, Tamil name (e.g. மாப்பிள்ளை சம்பா), or SKU to search.
                </div>
              ) : filteredProducts.length === 0 ? (
                <div className="text-center py-8 text-sm text-gray-500 dark:text-emerald-300">
                  No matching traditional products found for &quot;{searchQuery}&quot;.
                </div>
              ) : (
                filteredProducts.map((product) => (
                  <div
                    key={product.id}
                    onClick={() => handleSelectProduct(product)}
                    className="flex items-center justify-between p-3 rounded-xl hover:bg-emerald-50 dark:hover:bg-emerald-900/50 cursor-pointer transition-colors border border-transparent hover:border-emerald-200 dark:hover:border-emerald-800"
                  >
                    <div className="flex items-center space-x-3">
                      <img 
                        src={product.image_url} 
                        alt={product.name} 
                        className="w-12 h-12 object-cover rounded-lg border border-emerald-100" 
                      />
                      <div>
                        <div className="font-semibold text-sm text-gray-900 dark:text-emerald-100">
                          {product.name}
                        </div>
                        {product.tamil_name && (
                          <div className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">
                            {product.tamil_name}
                          </div>
                        )}
                        <div className="text-xs text-gray-400">
                          {product.pack_size} ({product.unit})
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-sm text-emerald-800 dark:text-amber-400">
                        {formatPrice(product.offer_price || product.selling_price)}
                      </div>
                      <span className="text-xs text-emerald-600 flex items-center gap-0.5 justify-end">
                        View Details <ArrowRight className="w-3 h-3" />
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>

            {searchQuery.trim() !== '' && filteredProducts.length > 0 && (
              <div className="p-3 bg-emerald-50 dark:bg-emerald-900/30 text-center border-t border-emerald-100 dark:border-emerald-800">
                <button
                  onClick={() => {
                    setIsSearchOpen(false);
                    navigate(`/products?search=${encodeURIComponent(searchQuery)}`);
                  }}
                  className="text-xs font-bold text-emerald-700 dark:text-amber-300 hover:underline"
                >
                  See all matching results in Shop catalog &rarr;
                </button>
              </div>
            )}

          </div>
        </div>
      )}
    </div>
  );
};

export default PublicLayout;
