import React from 'react';
import { Link } from 'react-router-dom';
import { Leaf, Phone, Mail, MapPin, Clock, Shield, ArrowRight, Heart, Truck } from 'lucide-react';
import Logo from './Logo';
import type { Category, Product } from '../../types';
import { getJSONStore } from '../../lib/dbManager';

export const Footer: React.FC = () => {
  const [categories, setCategories] = React.useState<Category[]>([]);
  const [footerData, setFooterData] = React.useState({
    footer_brand_tagline: 'MR. VIVASAYI is dedicated to preserving traditional heritage food values by working directly with farmers, native seed growers, and organic producers across South India. Pure, unadulterated food for healthy families.',
    footer_phone: '+91 98765 43210',
    footer_email: 'orders@mrvivasayi.com',
    footer_address: '#42 Heritage Way, Gandhi Nagar, Madurai, Tamil Nadu - 625020',
    footer_hours: 'Mon - Sat: 8:00 AM - 8:30 PM',
    copyright_text: 'MR. VIVASAYI. All rights reserved. Good Food. Good Life.',
  });

  React.useEffect(() => {
    Promise.all([
      getJSONStore<Category>('categories'),
      getJSONStore<Product>('products'),
      getJSONStore<any>('cms_settings')
    ]).then(([cats, prods, cms]) => {
      // Find categories that have active products
      const activeCatIds = new Set((prods || []).filter(p => p.is_visible !== false).map(p => p.category_id));
      const filtered = (cats || []).filter(c => activeCatIds.has(c.id));
      // Sort alphabetically by category name
      const sorted = (filtered.length > 0 ? filtered : cats || []).sort((a, b) => a.name.localeCompare(b.name));
      setCategories(sorted);

      if (cms && cms.length) {
        const parsed = cms[0].headerFooter || cms[0].header_footer;
        if (parsed) {
          setFooterData((prev) => ({
            ...prev,
            footer_brand_tagline: parsed.footer_brand_tagline || prev.footer_brand_tagline,
            footer_phone: parsed.footer_phone || prev.footer_phone,
            footer_email: parsed.footer_email || prev.footer_email,
            footer_address: parsed.footer_address || prev.footer_address,
            footer_hours: parsed.footer_hours || prev.footer_hours,
            copyright_text: parsed.copyright_text || prev.copyright_text,
          }));
        }
      }
    }).catch(e => console.error('Failed to load footer state', e));
  }, []);

  return (
    <footer className="bg-emerald-950 text-white pt-16 pb-12 border-t-4 border-amber-500">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Top Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-10 pb-12 border-b border-emerald-800/80">
          
          {/* Brand Info */}
          <div className="lg:col-span-2 space-y-4">
            <Logo variant="full" theme="dark" size="lg" showTagline={true} />
            <p className="text-white text-sm leading-relaxed max-w-md opacity-95">
              {footerData.footer_brand_tagline}
            </p>
            <div className="flex flex-wrap gap-2.5 pt-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-900 text-amber-300 border border-emerald-700">
                <Leaf className="w-3.5 h-3.5" /> 100% Producer Sourced
              </span>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-900 text-amber-300 border border-emerald-700">
                <Shield className="w-3.5 h-3.5" /> Zero Chemical Processing
              </span>
            </div>
          </div>

          {/* Categories */}
          <div>
            <h3 className="text-amber-400 font-bold text-sm tracking-wider uppercase mb-4">
              Categories
            </h3>
            <ul className="space-y-2.5 text-sm font-medium">
              {categories.slice(0, 5).map(cat => (
                <li key={cat.id}>
                  <Link to={`/products?category=${cat.id}`} className="text-white hover:text-amber-300 transition-colors flex items-center gap-1.5">
                    <ArrowRight className="w-3 h-3 text-amber-400 shrink-0" />
                    <span className="truncate">{cat.name}</span>
                  </Link>
                </li>
              ))}
              <li>
                <Link to="/products" className="text-amber-300 hover:text-amber-200 font-bold transition-colors flex items-center gap-1.5 pt-1 text-xs">
                  <span>See More Categories</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </li>
            </ul>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="text-amber-400 font-bold text-sm tracking-wider uppercase mb-4">
              Navigation
            </h3>
            <ul className="space-y-2.5 text-sm font-medium">
              <li>
                <Link to="/" className="text-white hover:text-amber-300 transition-colors">Home Page</Link>
              </li>
              <li>
                <Link to="/products" className="text-white hover:text-amber-300 transition-colors">Products &amp; Produce</Link>
              </li>
              <li>
                <Link to="/track-order" className="text-white hover:text-amber-300 transition-colors flex items-center gap-1">
                  <Truck className="w-3.5 h-3.5 text-amber-400" />
                  <span>Track Order</span>
                </Link>
              </li>
              <li>
                <Link to="/about" className="text-white hover:text-amber-300 transition-colors">Farmer Network &amp; Philosophy</Link>
              </li>
              <li>
                <Link to="/contact" className="text-white hover:text-amber-300 transition-colors">Contact & Store Location</Link>
              </li>
            </ul>
          </div>

          {/* Store Info & Contact */}
          <div>
            <h3 className="text-amber-400 font-bold text-sm tracking-wider uppercase mb-4">
              Store &amp; WhatsApp
            </h3>
            <div className="space-y-3 text-sm text-white font-medium">
              <div className="flex items-start gap-2.5 text-white">
                <MapPin className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <span className="text-white">{footerData.footer_address}</span>
              </div>
              <div className="flex items-center gap-2.5 text-white">
                <Phone className="w-4 h-4 text-amber-400 shrink-0" />
                <a href={`https://wa.me/${footerData.footer_phone.replace(/[^0-9]/g, '')}`} target="_blank" rel="noreferrer" className="text-white hover:text-amber-300">
                  {footerData.footer_phone} (WhatsApp Order)
                </a>
              </div>
              <div className="flex items-center gap-2.5 text-white">
                <Mail className="w-4 h-4 text-amber-400 shrink-0" />
                <a href={`mailto:${footerData.footer_email}`} className="text-white hover:text-amber-300">
                  {footerData.footer_email}
                </a>
              </div>
              <div className="flex items-center gap-2.5 text-xs text-white">
                <Clock className="w-4 h-4 text-amber-400 shrink-0" />
                <span className="text-white font-semibold">{footerData.footer_hours}</span>
              </div>
            </div>
          </div>

        </div>

        {/* Bottom copyright & policies */}
        <div className="pt-8 flex flex-col md:flex-row justify-between items-center text-xs text-white">
          <p className="font-medium">&copy; {new Date().getFullYear()} {footerData.copyright_text}</p>
          <div className="flex items-center space-x-6 mt-4 md:mt-0 font-medium text-emerald-200">
            <Link to="/privacy" className="hover:text-amber-300 transition-colors">Privacy Policy</Link>
            <span className="text-emerald-700">|</span>
            <Link to="/terms" className="hover:text-amber-300 transition-colors">Terms &amp; Conditions</Link>
          </div>
        </div>

      </div>
    </footer>
  );
};

export default Footer;
