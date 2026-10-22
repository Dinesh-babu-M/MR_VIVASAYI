import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Leaf, Heart, ShieldCheck, Award, Users, ShoppingBag, ArrowRight } from 'lucide-react';
import Logo from '../../components/common/Logo';
import { PublicPageSkeleton } from '../../components/common/Skeleton';

export const AboutPage: React.FC = () => {
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const t = setTimeout(() => setLoading(false), 70);
    return () => clearTimeout(t);
  }, []);

  if (loading) {
    return <PublicPageSkeleton />;
  }
  return (
    <div className="space-y-16 pb-16">
      
      {/* Hero Banner */}
      <section className="bg-gradient-to-br from-emerald-900 via-emerald-950 to-emerald-900 text-white py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-6">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-emerald-800/80 text-amber-300 text-xs font-semibold">
            <Leaf className="w-4 h-4" /> OUR HERITAGE & FARMER PARTNERSHIP
          </div>
          <h1 className="text-4xl sm:text-5xl font-serif font-bold text-white max-w-3xl mx-auto leading-tight">
            Reviving Ancient Food Traditions For Modern Well-Being
          </h1>
          <p className="text-emerald-200 text-base sm:text-lg max-w-2xl mx-auto leading-relaxed">
            MR. VIVASAYI was founded on a simple conviction: the food that nourished our ancestors holds the key to long-term health, stamina, and harmony with nature.
          </p>
        </div>
      </section>

      {/* Core Values Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="bg-white dark:bg-emerald-900/40 p-8 rounded-3xl border border-emerald-100 dark:border-emerald-800 shadow-sm space-y-4">
            <div className="w-14 h-14 bg-emerald-100 dark:bg-emerald-800 rounded-2xl flex items-center justify-center text-emerald-700 dark:text-amber-300">
              <Leaf className="w-7 h-7" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 dark:text-emerald-100">
              1. Unadulterated Purity
            </h3>
            <p className="text-sm text-gray-600 dark:text-emerald-200 leading-relaxed">
              We never use chemical preservatives, synthetic bleaching agents, artificial food coloring, or high-heat refining processes. What nature grows is what reaches your kitchen.
            </p>
          </div>

          <div className="bg-white dark:bg-emerald-900/40 p-8 rounded-3xl border border-emerald-100 dark:border-emerald-800 shadow-sm space-y-4">
            <div className="w-14 h-14 bg-emerald-100 dark:bg-emerald-800 rounded-2xl flex items-center justify-center text-emerald-700 dark:text-amber-300">
              <Users className="w-7 h-7" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 dark:text-emerald-100">
              2. Fair Farmer Prosperity
            </h3>
            <p className="text-sm text-gray-600 dark:text-emerald-200 leading-relaxed">
              By eliminating middle brokers, we ensure native grain farmers receive premium prices for cultivating indigenous heritage seeds (மாப்பிள்ளை சம்பா, சீரக சம்பா, பூங்கார்).
            </p>
          </div>

          <div className="bg-white dark:bg-emerald-900/40 p-8 rounded-3xl border border-emerald-100 dark:border-emerald-800 shadow-sm space-y-4">
            <div className="w-14 h-14 bg-emerald-100 dark:bg-emerald-800 rounded-2xl flex items-center justify-center text-emerald-700 dark:text-amber-300">
              <ShieldCheck className="w-7 h-7" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 dark:text-emerald-100">
              3. Traditional Craftsmanship
            </h3>
            <p className="text-sm text-gray-600 dark:text-emerald-200 leading-relaxed">
              Our chekku oils are extracted using traditional wooden cold presses that maintain low friction temperatures, safeguarding natural antioxidants and essential fatty acids.
            </p>
          </div>
        </div>
      </section>

      {/* Sourcing Map & Mission */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-emerald-950 text-white rounded-3xl p-8 sm:p-12 border border-emerald-800 grid grid-cols-1 lg:grid-cols-2 gap-10 items-center">
          <div className="space-y-4">
            <span className="text-xs font-bold text-amber-400 uppercase tracking-widest">
              PRODUCER REGIONS
            </span>
            <h2 className="text-3xl font-serif font-bold text-white">
              Sourced Across Tamil Nadu&apos;s Rich Agricultural Belts
            </h2>
            <p className="text-emerald-200 text-sm leading-relaxed">
              From Tanjore river delta paddy fields to the dryland millet farms of Madurai and Chekku oil mills of Erode, MR. VIVASAYI bridges traditional farming families directly with health-conscious urban households.
            </p>
            <div className="pt-2">
              <Link
                to="/products"
                className="inline-flex items-center gap-2 px-6 py-3 bg-amber-400 hover:bg-amber-300 text-emerald-950 font-bold text-sm rounded-full shadow transition-all"
              >
                <span>Browse Our Sourced Products</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>

          <div className="space-y-4 bg-emerald-900/60 p-6 rounded-2xl border border-emerald-800">
            <h4 className="text-lg font-bold text-amber-300">Key Regional Specialties</h4>
            <ul className="space-y-3 text-sm text-emerald-100">
              <li className="flex items-start gap-2">
                <span className="text-amber-400 font-bold">•</span>
                <div><strong>Tanjore Delta:</strong> Mapillai Samba, Seeraga Samba, Thooyamalli Traditional Paddy</div>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-amber-400 font-bold">•</span>
                <div><strong>Madurai Drylands:</strong> Foxtail Millet, Little Millet, Kodo Millet, Barnyard Millet</div>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-amber-400 font-bold">•</span>
                <div><strong>Erode & Salem:</strong> Cold-Pressed Groundnut Oil, Sesame Oil, Coconut Oil</div>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-amber-400 font-bold">•</span>
                <div><strong>Tirunelveli Palm Belt:</strong> Pure Organic Palm Jaggery & Karupatti</div>
              </li>
            </ul>
          </div>
        </div>
      </section>

    </div>
  );
};

export default AboutPage;
