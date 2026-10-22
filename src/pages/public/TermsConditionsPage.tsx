import React, { useState, useEffect } from 'react';
import { Shield, Lock, Eye, FileText, CheckCircle2, UserCheck, PhoneCall, HelpCircle } from 'lucide-react';
import { PublicPageSkeleton } from '../../components/common/Skeleton';

export default function TermsConditionsPage() {
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const t = setTimeout(() => setLoading(false), 70);
    return () => clearTimeout(t);
  }, []);

  if (loading) {
    return <PublicPageSkeleton />;
  }
  return (
    <div className="bg-stone-50 min-h-screen py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto bg-white rounded-2xl shadow-xl border border-stone-200/60 overflow-hidden">
        {/* Header Banner */}
        <div className="bg-emerald-900 text-white px-8 py-10 text-center relative overflow-hidden">
          <div className="absolute inset-0 opacity-10 bg-[radial-gradient(#fff_1px,transparent_1px)] [background-size:16px_16px]"></div>
          <div className="relative z-10">
            <span className="inline-block px-3 py-1 bg-emerald-800 text-emerald-200 text-xs font-semibold uppercase tracking-wider rounded-full mb-3">
              Legal & Service Agreement
            </span>
            <h1 className="text-3xl sm:text-4xl font-serif font-bold text-amber-100 mb-2">
              Terms & Conditions
            </h1>
            <p className="text-emerald-100 text-sm max-w-xl mx-auto">
              Please read these terms carefully before placing an order or using MR. VIVASAYI services online or at our stores.
            </p>
            <p className="text-emerald-300 text-xs mt-3">
              Last Updated: October 2026 • Applies to Web, WhatsApp & Direct Store Purchases
            </p>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-6 sm:p-10 space-y-8 text-stone-700 leading-relaxed text-sm sm:text-base">
          
          {/* Section 1 */}
          <section className="space-y-3">
            <div className="flex items-center gap-3 border-b border-stone-200 pb-2">
              <div className="p-2 bg-emerald-100 text-emerald-800 rounded-lg">
                <FileText className="w-5 h-5" />
              </div>
              <h2 className="text-xl font-bold text-emerald-950 font-serif">1. Overview & Acceptance of Terms</h2>
            </div>
            <p>
              Welcome to <strong>MR. VIVASAYI</strong> (“Store”, “We”, “Our”, or “Us”). By accessing our website, purchasing products through our online store, ordering via WhatsApp (+91 9876543210), or visiting our physical counter store in Tamil Nadu, you agree to be bound by these Terms & Conditions.
            </p>
            <p>
              Our primary mission is to promote traditional organic farming and bring authentic, unadulterated cold-pressed oils, native rice varieties, pulses, traditional millets, and unrefined sugars directly from local farmers to your home.
            </p>
          </section>

          {/* Section 2 */}
          <section className="space-y-3">
            <div className="flex items-center gap-3 border-b border-stone-200 pb-2">
              <div className="p-2 bg-emerald-100 text-emerald-800 rounded-lg">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <h2 className="text-xl font-bold text-emerald-950 font-serif">2. Product Quality & Natural Variations</h2>
            </div>
            <p>
              Because our food items are naturally harvested, wood-pressed (Marachekku), and packaged without chemical additives or artificial bleaching agents:
            </p>
            <ul className="list-disc pl-6 space-y-2 text-stone-600">
              <li><strong>Native Crop Variations:</strong> Color, aroma, texture, and grain size of native rice, millets, and raw sugar may slightly vary according to season and harvest batches.</li>
              <li><strong>Unrefined Oils:</strong> Sedimentation at the bottom of Marachekku oil bottles is natural and authentic evidence of cold-pressed extraction without chemical filtration.</li>
              <li><strong>Shelf Life & Storage:</strong> Customers must follow storage guidelines provided on product labels (e.g., storing in dry airtight containers or refrigerating cold-pressed pastes) to maintain freshness.</li>
            </ul>
          </section>

          {/* Section 3 */}
          <section className="space-y-3">
            <div className="flex items-center gap-3 border-b border-stone-200 pb-2">
              <div className="p-2 bg-emerald-100 text-emerald-800 rounded-lg">
                <Lock className="w-5 h-5" />
              </div>
              <h2 className="text-xl font-bold text-emerald-950 font-serif">3. Orders, Pricing & Payments</h2>
            </div>
            <div className="grid sm:grid-cols-2 gap-4 my-2">
              <div className="p-4 bg-stone-50 rounded-xl border border-stone-200">
                <h3 className="font-semibold text-emerald-900 mb-1">Pricing Policy</h3>
                <p className="text-xs text-stone-600">
                  All prices listed are in Indian Rupees (INR) and inclusive of applicable taxes. MR. VIVASAYI reserves the right to modify prices based on seasonal harvest availability without prior notice.
                </p>
              </div>
              <div className="p-4 bg-stone-50 rounded-xl border border-stone-200">
                <h3 className="font-semibold text-emerald-900 mb-1">Payment Methods</h3>
                <p className="text-xs text-stone-600">
                  We accept Unified Payments Interface (UPI - Google Pay, PhonePe, Paytm), Credit/Debit Cards, Net Banking, and Cash on Delivery (COD) for eligible local delivery pin codes.
                </p>
              </div>
            </div>
            <p className="text-stone-600 text-xs">
              Orders placed online or via WhatsApp are confirmed only after payment verification (for prepaid orders) or order verification through SMS/WhatsApp (for COD orders).
            </p>
          </section>

          {/* Section 4 */}
          <section className="space-y-3">
            <div className="flex items-center gap-3 border-b border-stone-200 pb-2">
              <div className="p-2 bg-emerald-100 text-emerald-800 rounded-lg">
                <Shield className="w-5 h-5" />
              </div>
              <h2 className="text-xl font-bold text-emerald-950 font-serif">4. Doorstep Shipping & Delivery</h2>
            </div>
            <p>
              We deliver traditional food products across Tamil Nadu and rest of India through reliable courier partners and local delivery agents.
            </p>
            <ul className="list-disc pl-6 space-y-2 text-stone-600">
              <li><strong>Local Doorstep Delivery:</strong> Orders within municipal store limits are typically delivered within 24 - 48 working hours.</li>
              <li><strong>Standard Courier Delivery:</strong> Statewide shipments take 2 to 4 business days. Standard shipping charges apply based on order weight and destination pin code unless eligible for free shipping promotions.</li>
              <li><strong>Address Accuracy:</strong> Customers are responsible for providing correct contact details and delivery addresses. Re-routing charges due to invalid address information will be borne by the buyer.</li>
            </ul>
          </section>

          {/* Section 5 */}
          <section className="space-y-3">
            <div className="flex items-center gap-3 border-b border-stone-200 pb-2">
              <div className="p-2 bg-emerald-100 text-emerald-800 rounded-lg">
                <UserCheck className="w-5 h-5" />
              </div>
              <h2 className="text-xl font-bold text-emerald-950 font-serif">5. Replacement, Cancellation & Refunds</h2>
            </div>
            <p>
              Given the perishable nature of food items, our return policy strictly operates under the following criteria:
            </p>
            <div className="bg-amber-50/70 border border-amber-200 rounded-xl p-4 space-y-2 text-stone-700 text-sm">
              <p className="font-semibold text-amber-900">Eligible Return & Replacement Conditions:</p>
              <ul className="list-disc pl-5 space-y-1 text-xs sm:text-sm text-stone-600">
                <li>Package delivered in a damaged or leaking condition (must share unboxing photo/video within 24 hours of delivery).</li>
                <li>Expired or incorrect item delivered compared to the invoice.</li>
              </ul>
              <p className="text-xs text-stone-500 pt-2 border-t border-amber-200/60">
                * Note: Returns are not accepted for opened food packages or taste preferences due to natural seasonal crop variations. Refund processed will be credited back to original payment mode within 5-7 business days upon approval.
              </p>
            </div>
          </section>

          {/* Section 6 */}
          <section className="space-y-3">
            <div className="flex items-center gap-3 border-b border-stone-200 pb-2">
              <div className="p-2 bg-emerald-100 text-emerald-800 rounded-lg">
                <Eye className="w-5 h-5" />
              </div>
              <h2 className="text-xl font-bold text-emerald-950 font-serif">6. Intellectual Property & Brand Rights</h2>
            </div>
            <p>
              All trademarks, product names, logos, farmer story media, website design, text content, and graphics associated with <strong>MR. VIVASAYI</strong> are exclusive property of our store. Unauthorized reproduction or commercial distribution without written consent is strictly prohibited.
            </p>
          </section>

          {/* Section 7 - Customer Support */}
          <div className="bg-emerald-950 text-white rounded-xl p-6 flex flex-col sm:flex-row items-center justify-between gap-4 mt-8">
            <div className="space-y-1 text-center sm:text-left">
              <h3 className="font-serif font-bold text-lg text-amber-100 flex items-center justify-center sm:justify-start gap-2">
                <HelpCircle className="w-5 h-5 text-emerald-400" /> Have Questions Regarding Terms?
              </h3>
              <p className="text-xs text-emerald-200">
                Contact our customer support team for clarification on any service term or order policy.
              </p>
            </div>
            <a
              href="https://wa.me/919876543210?text=Hello%20MR.%20VIVASAYI%20Team,%20I%20have%20a%20question%20regarding%20Terms%20%26%20Conditions"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-sm rounded-lg transition-colors shadow-md whitespace-nowrap"
            >
              <PhoneCall className="w-4 h-4" /> Support WhatsApp
            </a>
          </div>

        </div>
      </div>
    </div>
  );
}
