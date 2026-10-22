import React, { useState, useEffect } from 'react';
import { ShieldCheck, Lock, FileText, CheckCircle2, RefreshCw, Truck, HelpCircle } from 'lucide-react';
import { PublicPageSkeleton } from '../../components/common/Skeleton';

export const PrivacyPolicyPage: React.FC = () => {
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const t = setTimeout(() => setLoading(false), 70);
    return () => clearTimeout(t);
  }, []);

  if (loading) {
    return <PublicPageSkeleton />;
  }
  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-14 space-y-10 text-gray-800 dark:text-emerald-100 font-sans">
      
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-emerald-900 to-emerald-950 text-white p-8 sm:p-10 rounded-3xl shadow-xl border border-emerald-800 space-y-3">
        <div className="flex items-center gap-2 text-amber-300 text-xs font-bold uppercase tracking-wider">
          <ShieldCheck className="w-4 h-4" />
          <span>MR. VIVASAYI — LEGAL & TRANSPARENCY</span>
        </div>
        <h1 className="text-3xl sm:text-4xl font-serif font-bold text-white">
          Privacy Policy
        </h1>
        <p className="text-emerald-200 text-xs sm:text-sm max-w-2xl leading-relaxed">
          Last updated: October 4, 2026. Your privacy is paramount to MR. VIVASAYI. Learn how we handle customer information for doorstep delivery and WhatsApp orders.
        </p>
      </div>

      <div className="bg-white dark:bg-emerald-900/40 p-8 sm:p-10 rounded-3xl border border-emerald-100 dark:border-emerald-800/80 shadow-sm space-y-8 text-sm leading-relaxed">
        
        {/* Section 1 */}
        <section className="space-y-3">
          <h2 className="text-xl font-serif font-bold text-gray-900 dark:text-emerald-100 flex items-center gap-2 border-b border-emerald-100 dark:border-emerald-800 pb-2">
            <Lock className="w-5 h-5 text-emerald-600 dark:text-amber-400" />
            1. Information We Collect
          </h2>
          <p className="text-gray-600 dark:text-emerald-200">
            When you place an order on the MR. VIVASAYI platform, counter POS billing, or via WhatsApp, we collect minimal necessary details to process your order efficiently:
          </p>
          <ul className="list-disc pl-5 space-y-1.5 text-gray-700 dark:text-emerald-200">
            <li><strong>Personal Contact Information:</strong> Full name, delivery address, phone number, and WhatsApp contact number.</li>
            <li><strong>Order History:</strong> Specific traditional rice, cold-pressed oils, millets, and quantities ordered.</li>
            <li><strong>Payment Verification Details:</strong> Payment mode (UPI reference numbers, cash on delivery status, or bank transfer confirmation). We <em>never</em> store raw credit card credentials or banking passwords.</li>
          </ul>
        </section>

        {/* Section 2 */}
        <section className="space-y-3">
          <h2 className="text-xl font-serif font-bold text-gray-900 dark:text-emerald-100 flex items-center gap-2 border-b border-emerald-100 dark:border-emerald-800 pb-2">
            <Truck className="w-5 h-5 text-emerald-600 dark:text-amber-400" />
            2. How We Use Your Information
          </h2>
          <p className="text-gray-600 dark:text-emerald-200">
            Your data is strictly utilized for fulfilling direct farm-fresh food product requests:
          </p>
          <ul className="list-disc pl-5 space-y-1.5 text-gray-700 dark:text-emerald-200">
            <li>Processing counter invoices, shipping, and delivery of organic products.</li>
            <li>Dispatching order confirmations and delivery updates via WhatsApp and SMS messages.</li>
            <li>Responding directly to customer service queries regarding native paddy health benefits and usage instructions.</li>
            <li>Improving inventory availability based on customer regional demand across Tamil Nadu.</li>
          </ul>
        </section>

        {/* Section 3 */}
        <section className="space-y-3">
          <h2 className="text-xl font-serif font-bold text-gray-900 dark:text-emerald-100 flex items-center gap-2 border-b border-emerald-100 dark:border-emerald-800 pb-2">
            <ShieldCheck className="w-5 h-5 text-emerald-600 dark:text-amber-400" />
            3. Data Sharing & Zero Third-Party Selling
          </h2>
          <p className="text-gray-600 dark:text-emerald-200">
            MR. VIVASAYI maintains radical transparency. <strong>We never rent, trade, or sell your personal customer phone numbers or addresses to third-party advertisers or external marketing data brokers.</strong> Data is shared only with verified local delivery partners solely for completing your shipment.
          </p>
        </section>

        {/* Section 4 */}
        <section className="space-y-3">
          <h2 className="text-xl font-serif font-bold text-gray-900 dark:text-emerald-100 flex items-center gap-2 border-b border-emerald-100 dark:border-emerald-800 pb-2">
            <RefreshCw className="w-5 h-5 text-emerald-600 dark:text-amber-400" />
            4. Data Security & Storage
          </h2>
          <p className="text-gray-600 dark:text-emerald-200">
            Customer records are stored securely in encrypted databases. Access is restricted strictly to authorized staff members (billing operators, delivery coordinators, and store administrators).
          </p>
        </section>

        {/* Section 5 */}
        <section className="space-y-3">
          <h2 className="text-xl font-serif font-bold text-gray-900 dark:text-emerald-100 flex items-center gap-2 border-b border-emerald-100 dark:border-emerald-800 pb-2">
            <HelpCircle className="w-5 h-5 text-emerald-600 dark:text-amber-400" />
            5. Contacting Privacy Support
          </h2>
          <p className="text-gray-600 dark:text-emerald-200">
            If you wish to update your delivery profile, request data deletion, or ask any privacy-related questions, please contact our team directly:
          </p>
          <div className="p-4 bg-emerald-50 dark:bg-emerald-950 rounded-2xl border border-emerald-100 dark:border-emerald-800 text-xs space-y-1">
            <div><strong>MR. VIVASAYI Store Outlet</strong></div>
            <div>Address: #Cumbum Valley, Theni, Tamil Nadu - 625516</div>
            <div>Email: <a href="mailto:support@mrvivasayi.com" className="text-emerald-700 dark:text-amber-400 underline">support@mrvivasayi.com</a></div>
            <div>WhatsApp Support: +91 9876543210</div>
          </div>
        </section>

      </div>

    </div>
  );
};

export default PrivacyPolicyPage;
