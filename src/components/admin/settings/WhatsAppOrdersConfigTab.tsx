import React, { useState } from 'react';
import {
  MessageSquare,
  Phone,
  Send,
  CheckCircle2,
  AlertCircle,
  Copy,
  ExternalLink,
  Sparkles,
  ShoppingBag,
  UserCheck,
  ShieldCheck,
  RefreshCw,
  Bell,
  Smartphone,
  Check,
  HelpCircle,
  Info
} from 'lucide-react';
import { formatPrice } from '../../../lib/utils';
import toast from 'react-hot-toast';

interface WhatsAppOrdersConfigTabProps {
  configForm: {
    whatsapp_orders_number?: string;
    whatsapp_support_number?: string;
    whatsapp_order_alerts_enabled?: boolean;
    whatsapp_pos_alerts_enabled?: boolean;
    whatsapp_customer_confirmation_enabled?: boolean;
    whatsapp_cms_routing_enabled?: boolean;
    whatsapp_order_template?: string;
    whatsapp_customer_template?: string;
    [key: string]: any;
  };
  setConfigForm: React.Dispatch<React.SetStateAction<any>>;
}

export const WhatsAppOrdersConfigTab: React.FC<WhatsAppOrdersConfigTabProps> = ({
  configForm,
  setConfigForm
}) => {
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [activeTemplateTab, setActiveTemplateTab] = useState<'admin_alert' | 'customer_receipt'>('admin_alert');

  // Clean numbers (digits only)
  const cleanOrderPhone = (configForm.whatsapp_orders_number || '919876543210').replace(/\D/g, '');
  const cleanSupportPhone = (configForm.whatsapp_support_number || '919876543210').replace(/\D/g, '');

  const defaultAdminTemplate = `📦 *NEW WEBSITE ORDER - MR. VIVASAYI*
----------------------------------------
Ref: #{order_id}
👤 Customer: {customer_name} ({customer_phone})
📍 Delivery Address: {delivery_address}

🛒 Order Items:
{items_list}

💰 Billing Summary:
• Subtotal: {subtotal}
• Delivery: {delivery_fee}
• Grand Total: {total_amount}
• Payment Method: {payment_method}
• Placed At: {date}

Status: NEW ORDER ✓ - Please confirm dispatch! 🌿`;

  const defaultCustomerTemplate = `🌿 *Vanakkam {customer_name}!*
Thank you for your order with MR. VIVASAYI Traditional Organics!

Your order #{order_id} has been successfully recorded.
💰 Total Amount: {total_amount}
📍 Delivering To: {delivery_address}

We are preparing your fresh farm produce & cold-pressed oils. Our team will notify you once dispatched!

For queries, reply directly to this chat. Thank you! 🙏`;

  const currentAdminTemplate = configForm.whatsapp_order_template || defaultAdminTemplate;
  const currentCustomerTemplate = configForm.whatsapp_customer_template || defaultCustomerTemplate;

  const handleCopy = (text: string, fieldName: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(fieldName);
    toast.success(`Copied ${fieldName} to clipboard!`);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const handleSameAsOrderNumber = () => {
    setConfigForm((prev: any) => ({
      ...prev,
      whatsapp_support_number: prev.whatsapp_orders_number || '919876543210'
    }));
    toast.success('CMS & Customer support number matched to Order Alert number');
  };

  // Test WhatsApp order alert dispatch
  const handleTestOrderAlert = () => {
    if (!cleanOrderPhone) {
      toast.error('Please enter a valid WhatsApp Order Alert number first');
      return;
    }
    const sampleMsg = `📦 *TEST ORDER ALERT - MR. VIVASAYI*
----------------------------------------
Ref: #ORD-TEST-${Math.floor(1000 + Math.random() * 9000)}
👤 Customer: Selvakumar Pandian (+91 98421 98765)
📍 Delivery Address: No. 14, Gandhi Road, Cumbum, Theni, Tamil Nadu - 625516

🛒 Order Items:
1. Vaagai Marachekku Sesame Oil (1L) × 2 = ₹720
2. Traditional Mapillai Samba Rice (2kg) × 1 = ₹280

💰 Billing Summary:
• Subtotal: ₹1,000
• Delivery: FREE DELIVERY ✓
• Grand Total: ₹1,000
• Payment Method: Cash on Delivery (COD)
• Placed At: ${new Date().toLocaleTimeString()}

Status: TEST DISPATCH ✓ (WhatsApp Orders Conf verified)`;

    const url = `https://api.whatsapp.com/send?phone=${cleanOrderPhone}&text=${encodeURIComponent(sampleMsg)}`;
    window.open(url, '_blank');
  };

  // Test CMS customer inquiry message dispatch
  const handleTestCustomerInquiry = () => {
    if (!cleanSupportPhone) {
      toast.error('Please enter a valid WhatsApp Support number first');
      return;
    }
    const sampleMsg = `🌿 *CUSTOMER INQUIRY - MR. VIVASAYI STORE*
----------------------------------------
👤 Name: Meenakshi Sundaram
📞 Phone: +91 97893 25262
✉️ Email: meenakshi@example.com
📍 Location: Madurai, Tamil Nadu

💬 Message:
"Vanakkam! I want to enquire about bulk purchase of Karunguruvai rice and pure wood-pressed coconut oil for my family monthly supply. Do you offer door delivery in Madurai?"

----------------------------------------
Sent via MR. VIVASAYI Online Contact Desk`;

    const url = `https://api.whatsapp.com/send?phone=${cleanSupportPhone}&text=${encodeURIComponent(sampleMsg)}`;
    window.open(url, '_blank');
  };

  // Insert placeholder tag into active template
  const insertTag = (tag: string) => {
    if (activeTemplateTab === 'admin_alert') {
      const updated = currentAdminTemplate + ' ' + tag;
      setConfigForm((prev: any) => ({ ...prev, whatsapp_order_template: updated }));
    } else {
      const updated = currentCustomerTemplate + ' ' + tag;
      setConfigForm((prev: any) => ({ ...prev, whatsapp_customer_template: updated }));
    }
    toast.success(`Inserted ${tag}`);
  };

  // Format sample message for preview
  const generatePreviewMessage = () => {
    const isCustomer = activeTemplateTab === 'customer_receipt';
    let text = isCustomer ? currentCustomerTemplate : currentAdminTemplate;

    const sampleData: Record<string, string> = {
      '{order_id}': 'ORD-9428',
      '{customer_name}': 'Ayya Ramanathan',
      '{customer_phone}': '+91 98421 54321',
      '{delivery_address}': '12 Bazaar St, Cumbum, TN - 625516',
      '{items_list}': '1. Marachekku Gingelly Oil (1L) × 2\n2. Mappillai Samba Rice (1kg) × 1',
      '{subtotal}': '₹850',
      '{discount}': '₹50',
      '{delivery_fee}': 'FREE',
      '{total_amount}': '₹800',
      '{payment_method}': 'UPI (Paid)',
      '{date}': new Date().toLocaleDateString('en-IN'),
      '{store_name}': 'MR. VIVASAYI Mart'
    };

    for (const [key, val] of Object.entries(sampleData)) {
      text = text.split(key).join(val);
    }
    return text;
  };

  return (
    <div className="space-y-6 text-xs animate-fadeIn">
      
      {/* ─── Hero Overview Card ─── */}
      <div className="bg-gradient-to-r from-emerald-950 via-emerald-900 to-teal-950 text-white p-6 rounded-3xl shadow-lg border border-emerald-800 flex flex-col md:flex-row md:items-center justify-between gap-6 relative overflow-hidden">
        <div className="space-y-2 max-w-2xl relative z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-800/80 border border-emerald-600/50 text-amber-300 text-[10px] font-black uppercase tracking-wider">
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span>CENTRALIZED WHATSAPP DISPATCH ENGINE</span>
          </div>
          <h3 className="text-xl sm:text-2xl font-serif font-bold text-white">
            WhatsApp Order Alerts & Customer Inquiries Hub
          </h3>
          <p className="text-emerald-200 text-xs leading-relaxed">
            Configure the central WhatsApp phone numbers that power order notifications across your entire website: public storefront cart checkouts, POS retail counter billing, CMS customer contact inquiries, and automated customer order confirmations.
          </p>
        </div>

        {/* Live Badges Matrix */}
        <div className="grid grid-cols-2 gap-3 shrink-0 relative z-10">
          <div className="bg-emerald-900/90 border border-emerald-700/80 p-3.5 rounded-2xl space-y-1">
            <div className="text-[10px] font-bold text-amber-300 uppercase tracking-wider flex items-center gap-1.5">
              <ShoppingBag className="w-3.5 h-3.5 text-amber-400" />
              <span>Order Alerts Target</span>
            </div>
            <div className="font-mono font-black text-sm text-white">
              +{cleanOrderPhone || '919876543210'}
            </div>
            <div className="text-[10px] text-emerald-300 flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              <span>All Web Orders Active</span>
            </div>
          </div>

          <div className="bg-emerald-900/90 border border-emerald-700/80 p-3.5 rounded-2xl space-y-1">
            <div className="text-[10px] font-bold text-teal-300 uppercase tracking-wider flex items-center gap-1.5">
              <MessageSquare className="w-3.5 h-3.5 text-teal-300" />
              <span>CMS Inquiries Target</span>
            </div>
            <div className="font-mono font-black text-sm text-white">
              +{cleanSupportPhone || '919876543210'}
            </div>
            <div className="text-[10px] text-emerald-300 flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-teal-400"></span>
              <span>Contact Desk Synced</span>
            </div>
          </div>
        </div>
      </div>

      {/* ─── Two-Column Configuration Grid ─── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* CARD 1: STORE OWNER WHATSAPP ORDER ALERT NUMBER */}
        <div className="bg-white rounded-3xl p-6 shadow-sm border border-emerald-100 dark:border-emerald-800 space-y-5 flex flex-col justify-between">
          <div className="space-y-4">
            
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold">
                  <ShoppingBag className="w-5 h-5 text-emerald-700" />
                </div>
                <div>
                  <h4 className="font-extrabold text-gray-900 text-sm">
                    Whole Website Order Alert WhatsApp Number
                  </h4>
                  <p className="text-gray-500 text-[11px]">
                    Receives all store orders placed online & via POS counter
                  </p>
                </div>
              </div>
              <span className="bg-emerald-100 text-emerald-800 text-[10px] font-black uppercase px-2 py-0.5 rounded-md">
                Admin Alert
              </span>
            </div>

            {/* Input Field */}
            <div className="space-y-1.5">
              <label className="block font-extrabold text-gray-800 text-xs">
                WhatsApp Phone Number for Store Order Alerts *
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-emerald-700 font-bold font-mono">
                  +
                </div>
                <input
                  type="text"
                  required
                  placeholder="919876543210 (Country code + 10 digits)"
                  value={configForm.whatsapp_orders_number || ''}
                  onChange={(e) =>
                    setConfigForm({
                      ...configForm,
                      whatsapp_orders_number: e.target.value.replace(/[^0-9]/g, '')
                    })
                  }
                  className="w-full pl-8 pr-28 py-3 bg-emerald-50/50 border border-emerald-200 rounded-xl font-mono text-sm text-gray-900 font-bold focus:ring-2 focus:ring-emerald-500 focus:bg-white transition"
                />
                <button
                  type="button"
                  onClick={() => handleCopy(cleanOrderPhone, 'Order Alert Number')}
                  className="absolute inset-y-1.5 right-1.5 px-3 bg-white hover:bg-emerald-50 text-emerald-800 font-bold rounded-lg border border-emerald-200 flex items-center gap-1 text-[11px] transition cursor-pointer"
                >
                  {copiedField === 'Order Alert Number' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5 text-gray-500" />}
                  <span>{copiedField === 'Order Alert Number' ? 'Copied' : 'Copy'}</span>
                </button>
              </div>
              <p className="text-[11px] text-gray-500">
                Enter international digits format without spaces or symbols (e.g. <code>919876543210</code> for India).
              </p>
            </div>

            {/* Feature Toggles */}
            <div className="space-y-2.5 pt-2">
              <label className="flex items-start gap-3 p-3 bg-gray-50 rounded-2xl hover:bg-emerald-50/60 transition cursor-pointer border border-gray-100">
                <input
                  type="checkbox"
                  checked={configForm.whatsapp_order_alerts_enabled !== false}
                  onChange={(e) =>
                    setConfigForm({ ...configForm, whatsapp_order_alerts_enabled: e.target.checked })
                  }
                  className="mt-0.5 w-4 h-4 text-emerald-600 rounded focus:ring-emerald-500"
                />
                <div className="space-y-0.5">
                  <span className="font-extrabold text-gray-900 text-xs block">
                    Online Storefront Order Dispatch
                  </span>
                  <span className="text-[11px] text-gray-500 block">
                    When customer checks out from cart, send instant structured message with customer name, items & address to this WhatsApp.
                  </span>
                </div>
              </label>

              <label className="flex items-start gap-3 p-3 bg-gray-50 rounded-2xl hover:bg-emerald-50/60 transition cursor-pointer border border-gray-100">
                <input
                  type="checkbox"
                  checked={configForm.whatsapp_pos_alerts_enabled !== false}
                  onChange={(e) =>
                    setConfigForm({ ...configForm, whatsapp_pos_alerts_enabled: e.target.checked })
                  }
                  className="mt-0.5 w-4 h-4 text-emerald-600 rounded focus:ring-emerald-500"
                />
                <div className="space-y-0.5">
                  <span className="font-extrabold text-gray-900 text-xs block">
                    Retail POS Counter Billing Dispatch
                  </span>
                  <span className="text-[11px] text-gray-500 block">
                    Allow cashiers on <code>/admin/pos</code> to dispatch bill receipts to this store audit number and customer.
                  </span>
                </div>
              </label>
            </div>

          </div>

          {/* Test Button Footer */}
          <div className="pt-4 border-t border-gray-100 flex items-center justify-between gap-3">
            <span className="text-[11px] text-emerald-700 font-bold flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              <span>Target: wa.me/{cleanOrderPhone}</span>
            </span>

            <button
              type="button"
              onClick={handleTestOrderAlert}
              className="px-4 py-2.5 bg-emerald-800 hover:bg-emerald-900 text-white font-extrabold rounded-xl shadow flex items-center gap-1.5 transition transform hover:scale-[1.02] cursor-pointer"
            >
              <Send className="w-3.5 h-3.5 text-amber-300" />
              <span>Send Test Order Alert</span>
            </button>
          </div>
        </div>

        {/* CARD 2: CMS ORDERS & CUSTOMER INQUIRIES WHATSAPP NUMBER */}
        <div className="bg-white rounded-3xl p-6 shadow-sm border border-emerald-100 dark:border-emerald-800 space-y-5 flex flex-col justify-between">
          <div className="space-y-4">
            
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-teal-100 text-teal-800 flex items-center justify-center font-bold">
                  <MessageSquare className="w-5 h-5 text-teal-700" />
                </div>
                <div>
                  <h4 className="font-extrabold text-gray-900 text-sm">
                    CMS Customer Messages & Inquiries Number
                  </h4>
                  <p className="text-gray-500 text-[11px]">
                    Routes Contact Us page, footer chat, and product inquiries
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={handleSameAsOrderNumber}
                className="px-2.5 py-1 bg-gray-100 hover:bg-emerald-100 text-emerald-800 text-[10px] font-extrabold rounded-lg transition border border-gray-200"
                title="Copy order alert phone to customer support"
              >
                Same as Order #
              </button>
            </div>

            {/* Input Field */}
            <div className="space-y-1.5">
              <label className="block font-extrabold text-gray-800 text-xs">
                WhatsApp Phone Number for Customer Support & CMS *
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-teal-700 font-bold font-mono">
                  +
                </div>
                <input
                  type="text"
                  required
                  placeholder="919876543210 (Country code + 10 digits)"
                  value={configForm.whatsapp_support_number || ''}
                  onChange={(e) =>
                    setConfigForm({
                      ...configForm,
                      whatsapp_support_number: e.target.value.replace(/[^0-9]/g, '')
                    })
                  }
                  className="w-full pl-8 pr-28 py-3 bg-teal-50/50 border border-teal-200 rounded-xl font-mono text-sm text-gray-900 font-bold focus:ring-2 focus:ring-teal-500 focus:bg-white transition"
                />
                <button
                  type="button"
                  onClick={() => handleCopy(cleanSupportPhone, 'Support Number')}
                  className="absolute inset-y-1.5 right-1.5 px-3 bg-white hover:bg-teal-50 text-teal-800 font-bold rounded-lg border border-teal-200 flex items-center gap-1 text-[11px] transition cursor-pointer"
                >
                  {copiedField === 'Support Number' ? <Check className="w-3.5 h-3.5 text-teal-600" /> : <Copy className="w-3.5 h-3.5 text-gray-500" />}
                  <span>{copiedField === 'Support Number' ? 'Copied' : 'Copy'}</span>
                </button>
              </div>
              <p className="text-[11px] text-gray-500">
                Customers clicking "Chat on WhatsApp" across the storefront will connect directly to this number.
              </p>
            </div>

            {/* Feature Toggles */}
            <div className="space-y-2.5 pt-2">
              <label className="flex items-start gap-3 p-3 bg-gray-50 rounded-2xl hover:bg-teal-50/60 transition cursor-pointer border border-gray-100">
                <input
                  type="checkbox"
                  checked={configForm.whatsapp_cms_routing_enabled !== false}
                  onChange={(e) =>
                    setConfigForm({ ...configForm, whatsapp_cms_routing_enabled: e.target.checked })
                  }
                  className="mt-0.5 w-4 h-4 text-teal-600 rounded focus:ring-teal-500"
                />
                <div className="space-y-0.5">
                  <span className="font-extrabold text-gray-900 text-xs block">
                    Route Contact Page Enquiries to WhatsApp
                  </span>
                  <span className="text-[11px] text-gray-500 block">
                    When visitors submit the Contact Us enquiry form, provide immediate one-click WhatsApp chat option.
                  </span>
                </div>
              </label>

              <label className="flex items-start gap-3 p-3 bg-gray-50 rounded-2xl hover:bg-teal-50/60 transition cursor-pointer border border-gray-100">
                <input
                  type="checkbox"
                  checked={configForm.whatsapp_customer_confirmation_enabled !== false}
                  onChange={(e) =>
                    setConfigForm({ ...configForm, whatsapp_customer_confirmation_enabled: e.target.checked })
                  }
                  className="mt-0.5 w-4 h-4 text-teal-600 rounded focus:ring-teal-500"
                />
                <div className="space-y-0.5">
                  <span className="font-extrabold text-gray-900 text-xs block">
                    Customer WhatsApp Order Confirmation Links
                  </span>
                  <span className="text-[11px] text-gray-500 block">
                    Allow store staff to send branded harvest order confirmation receipts directly to the buyer's mobile.
                  </span>
                </div>
              </label>
            </div>

          </div>

          {/* Test Button Footer */}
          <div className="pt-4 border-t border-gray-100 flex items-center justify-between gap-3">
            <span className="text-[11px] text-teal-700 font-bold flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5 text-teal-600" />
              <span>Target: wa.me/{cleanSupportPhone}</span>
            </span>

            <button
              type="button"
              onClick={handleTestCustomerInquiry}
              className="px-4 py-2.5 bg-teal-800 hover:bg-teal-900 text-white font-extrabold rounded-xl shadow flex items-center gap-1.5 transition transform hover:scale-[1.02] cursor-pointer"
            >
              <MessageSquare className="w-3.5 h-3.5 text-amber-300" />
              <span>Test Customer Inquiry</span>
            </button>
          </div>
        </div>

      </div>

      {/* ─── Message Template Customizer & Live Mobile Chat Simulator ─── */}
      <div className="bg-white rounded-3xl p-6 shadow-sm border border-emerald-100 space-y-6">
        
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-100 pb-4">
          <div>
            <h4 className="font-extrabold text-emerald-950 text-sm flex items-center gap-2">
              <Smartphone className="w-4 h-4 text-emerald-700" />
              <span>WhatsApp Message Templates & Live Mobile Chat Simulator</span>
            </h4>
            <p className="text-gray-500 text-[11px] mt-0.5">
              Customize the structured messages dispatched to the store owner and customer. Click placeholder chips to insert dynamic data.
            </p>
          </div>

          {/* Template Switcher Tabs */}
          <div className="flex items-center gap-1.5 bg-gray-100 p-1 rounded-xl">
            <button
              type="button"
              onClick={() => setActiveTemplateTab('admin_alert')}
              className={`px-3 py-1.5 rounded-lg font-bold text-xs transition cursor-pointer ${
                activeTemplateTab === 'admin_alert'
                  ? 'bg-emerald-800 text-white shadow-xs'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Store Order Alert
            </button>
            <button
              type="button"
              onClick={() => setActiveTemplateTab('customer_receipt')}
              className={`px-3 py-1.5 rounded-lg font-bold text-xs transition cursor-pointer ${
                activeTemplateTab === 'customer_receipt'
                  ? 'bg-emerald-800 text-white shadow-xs'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Customer Receipt
            </button>
          </div>
        </div>

        {/* Dynamic Placeholder Tag Chips */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-gray-700">
              Click to insert dynamic placeholder tag into template:
            </span>
            <button
              type="button"
              onClick={() => {
                if (activeTemplateTab === 'admin_alert') {
                  setConfigForm((prev: any) => ({ ...prev, whatsapp_order_template: defaultAdminTemplate }));
                } else {
                  setConfigForm((prev: any) => ({ ...prev, whatsapp_customer_template: defaultCustomerTemplate }));
                }
                toast.success('Reset template to baseline default');
              }}
              className="text-[10px] font-bold text-emerald-700 hover:underline flex items-center gap-1 cursor-pointer"
            >
              <RefreshCw className="w-3 h-3" />
              <span>Restore Baseline Default</span>
            </button>
          </div>

          <div className="flex flex-wrap gap-1.5">
            {[
              '{order_id}',
              '{customer_name}',
              '{customer_phone}',
              '{delivery_address}',
              '{items_list}',
              '{subtotal}',
              '{discount}',
              '{delivery_fee}',
              '{total_amount}',
              '{payment_method}',
              '{date}',
              '{store_name}'
            ].map((tag) => (
              <button
                key={tag}
                type="button"
                onClick={() => insertTag(tag)}
                className="px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-900 font-mono text-[10px] font-bold rounded-lg border border-emerald-200 transition cursor-pointer flex items-center gap-1"
              >
                <span>{tag}</span>
                <span className="text-emerald-500 font-bold">+</span>
              </button>
            ))}
          </div>
        </div>

        {/* Split Grid: Editor (Left) & Mobile Simulator (Right) */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
          
          {/* Left: Template Textarea */}
          <div className="space-y-2">
            <label className="block font-bold text-gray-700 text-xs">
              {activeTemplateTab === 'admin_alert'
                ? 'Store Admin WhatsApp Order Alert Message Format'
                : 'Customer Order Confirmation Receipt Message Format'}
            </label>
            <textarea
              rows={14}
              value={activeTemplateTab === 'admin_alert' ? currentAdminTemplate : currentCustomerTemplate}
              onChange={(e) => {
                if (activeTemplateTab === 'admin_alert') {
                  setConfigForm({ ...configForm, whatsapp_order_template: e.target.value });
                } else {
                  setConfigForm({ ...configForm, whatsapp_customer_template: e.target.value });
                }
              }}
              className="w-full p-4 bg-gray-50 border border-gray-200 rounded-2xl font-mono text-xs text-gray-800 leading-relaxed focus:bg-white focus:ring-2 focus:ring-emerald-500 transition"
              placeholder="Enter message template..."
            />
            <p className="text-[11px] text-gray-400 italic">
              Supports WhatsApp formatting: <code>*bold*</code>, <code>_italic_</code>, <code>~strikethrough~</code>.
            </p>
          </div>

          {/* Right: WhatsApp Mobile Phone Mockup Simulator */}
          <div className="bg-[#efeae2] dark:bg-emerald-950/80 rounded-3xl p-4 sm:p-5 border-4 border-gray-800 shadow-2xl relative overflow-hidden flex flex-col max-w-sm mx-auto w-full">
            
            {/* Phone Top Speaker & Camera Notch */}
            <div className="w-24 h-4 bg-gray-800 rounded-b-xl mx-auto -mt-5 mb-2"></div>

            {/* WhatsApp App Header */}
            <div className="bg-[#075e54] text-white p-3 rounded-2xl flex items-center justify-between shadow-md mb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-900 font-black flex items-center justify-center text-xs border border-white">
                  MV
                </div>
                <div>
                  <div className="font-bold text-xs leading-none">
                    {activeTemplateTab === 'admin_alert' ? 'Store Counter Bot' : 'MR. VIVASAYI Official'}
                  </div>
                  <div className="text-[9px] text-emerald-200 mt-0.5">
                    +{activeTemplateTab === 'admin_alert' ? cleanOrderPhone : cleanSupportPhone}
                  </div>
                </div>
              </div>
              <span className="text-[9px] bg-emerald-700/80 px-2 py-0.5 rounded-full text-emerald-100 font-bold">
                Online
              </span>
            </div>

            {/* Chat Body Mockup */}
            <div className="space-y-3 py-2 flex-1 min-h-[280px]">
              <div className="text-center">
                <span className="text-[9px] bg-white/70 dark:bg-emerald-900/80 text-gray-500 dark:text-emerald-200 px-2 py-0.5 rounded-full shadow-xs uppercase tracking-wider font-bold">
                  Today
                </span>
              </div>

              {/* Chat Bubble */}
              <div className="bg-[#dcf8c6] dark:bg-emerald-900 text-gray-900 dark:text-emerald-100 p-3 rounded-2xl rounded-tr-none shadow-md max-w-[95%] ml-auto text-[11px] leading-relaxed relative">
                <pre className="font-sans whitespace-pre-wrap break-words">
                  {generatePreviewMessage()}
                </pre>
                
                <div className="text-right mt-1 text-[9px] text-gray-500 dark:text-emerald-300 flex items-center justify-end gap-1 font-mono">
                  <span>{new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                  <span className="text-teal-600 font-bold">✓✓</span>
                </div>
              </div>
            </div>

            {/* Phone Bottom Input Bar Mockup */}
            <div className="bg-white dark:bg-emerald-900 p-2 rounded-2xl shadow flex items-center justify-between gap-2 mt-2">
              <span className="text-gray-400 text-[10px] pl-2">Type a message...</span>
              <div className="w-6 h-6 rounded-full bg-[#075e54] text-white flex items-center justify-center">
                <Send className="w-3 h-3" />
              </div>
            </div>

          </div>

        </div>

      </div>

    </div>
  );
};

export default WhatsAppOrdersConfigTab;
