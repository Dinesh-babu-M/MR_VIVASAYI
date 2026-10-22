import React, { useState, useEffect } from 'react';
import { Phone, Mail, MapPin, Clock, MessageSquare, Send, CheckCircle2 } from 'lucide-react';
import { useActionModal } from '../../contexts/ActionModalContext';
import { PublicPageSkeleton } from '../../components/common/Skeleton';
import { getWhatsAppSupportNumber } from '../../lib/dbManager';

export const ContactPage: React.FC = () => {
  const { showActionModal } = useActionModal();
  const supportPhone = getWhatsAppSupportNumber();
  const [loading, setLoading] = useState(true);
  const [submitted, setSubmitted] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    message: ''
  });

  useEffect(() => {
    const t = setTimeout(() => setLoading(false), 80);
    return () => clearTimeout(t);
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    showActionModal({
      title: 'Transmitting Customer Enquiry',
      subtitle: `Sending message from ${formData.name || 'Customer'} to support desk...`,
      badge: 'Enquiry Gateway',
      duration: 800,
      steps: [
        'Formatting enquiry payload & details...',
        'Connecting to store customer service desk...',
        'Enquiry submitted successfully!'
      ],
      onComplete: () => {
        setSubmitted(true);
      }
    });
  };

  if (loading) {
    return <PublicPageSkeleton />;
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-12">
      
      {/* Header */}
      <div className="text-center max-w-2xl mx-auto space-y-3">
        <span className="text-xs font-bold text-emerald-600 dark:text-amber-400 uppercase tracking-widest">
          GET IN TOUCH WITH MR. VIVASAYI
        </span>
        <h1 className="text-4xl font-serif font-bold text-gray-900 dark:text-emerald-100">
          Visit Our Store & Counter
        </h1>
        <p className="text-sm text-gray-600 dark:text-emerald-300">
          Have questions about traditional rice health benefits, custom bulk orders, or farmer sourcing? Reach out to our team directly.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
        
        {/* Contact Info Card */}
        <div className="bg-gradient-to-br from-emerald-900 to-emerald-950 text-white p-8 sm:p-10 rounded-3xl border border-emerald-800 shadow-xl space-y-8">
          <div>
            <h2 className="text-2xl font-serif font-bold text-white mb-2">Store Outlet & Counter</h2>
            <p className="text-emerald-200 text-sm">
              Visit our physical store to inspect fresh chekku oils, native paddy varieties, and unpolished pulses in person.
            </p>
          </div>

          <div className="space-y-6 text-sm text-emerald-100">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 bg-emerald-800 rounded-xl flex items-center justify-center text-amber-300 shrink-0">
                <MapPin className="w-5 h-5" />
              </div>
              <div>
                <div className="font-bold text-white">Main Retail Outlet</div>
                <div className="text-emerald-200 text-xs mt-0.5">
                  #42 Heritage Way, Gandhi Nagar, Madurai, Tamil Nadu - 625020
                </div>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <div className="w-10 h-10 bg-emerald-800 rounded-xl flex items-center justify-center text-amber-300 shrink-0">
                <Phone className="w-5 h-5" />
              </div>
              <div>
                <div className="font-bold text-white">Direct Phone & WhatsApp Order</div>
                <div className="text-emerald-200 text-xs mt-0.5">
                  +91 9789325262 / +91 98765 43211
                </div>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <div className="w-10 h-10 bg-emerald-800 rounded-xl flex items-center justify-center text-amber-300 shrink-0">
                <Mail className="w-5 h-5" />
              </div>
              <div>
                <div className="font-bold text-white">Email Inquiries</div>
                <div className="text-emerald-200 text-xs mt-0.5">
                  orders@mrvivasayi.com / support@mrvivasayi.com
                </div>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <div className="w-10 h-10 bg-emerald-800 rounded-xl flex items-center justify-center text-amber-300 shrink-0">
                <Clock className="w-5 h-5" />
              </div>
              <div>
                <div className="font-bold text-white">Operating Hours</div>
                <div className="text-emerald-200 text-xs mt-0.5">
                  Monday to Saturday: 8:00 AM - 8:30 PM<br />
                  Sunday: 9:00 AM - 2:00 PM
                </div>
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-emerald-800">
            <a
              href={`https://wa.me/${supportPhone}?text=${encodeURIComponent('Hello MR. VIVASAYI Team, I want to inquire about your organic traditional foods.')}`}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full flex items-center justify-center space-x-2 bg-amber-400 hover:bg-amber-300 text-emerald-950 font-extrabold py-3.5 px-4 rounded-xl shadow-lg transition-all"
            >
              <MessageSquare className="w-5 h-5" />
              <span>Chat Immediately On WhatsApp</span>
            </a>
          </div>
        </div>

        {/* Contact Form */}
        <div className="bg-white dark:bg-emerald-900/40 p-8 rounded-3xl border border-emerald-100 dark:border-emerald-800 shadow-sm">
          {submitted ? (
            <div className="text-center py-16 space-y-4">
              <div className="w-16 h-16 bg-emerald-100 dark:bg-emerald-900 rounded-full flex items-center justify-center mx-auto text-emerald-600 dark:text-emerald-400">
                <CheckCircle2 className="w-10 h-10" />
              </div>
              <h3 className="text-2xl font-bold text-gray-900 dark:text-emerald-100">
                Message Sent Successfully!
              </h3>
              <p className="text-sm text-gray-600 dark:text-emerald-300 max-w-sm mx-auto">
                Thank you for contacting MR. VIVASAYI. Our store team will respond to your query shortly.
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
                <a
                  href={`https://wa.me/${supportPhone}?text=${encodeURIComponent(`Vanakkam MR. VIVASAYI team, I submitted an enquiry on your website.\n\n👤 Name: ${formData.name}\n📞 Phone: ${formData.phone}\n💬 Message: ${formData.message}`)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-5 py-2.5 bg-emerald-800 hover:bg-emerald-900 text-white font-bold text-xs rounded-xl shadow flex items-center gap-1.5"
                >
                  <MessageSquare className="w-4 h-4 text-amber-300" />
                  <span>Open Inquiry In WhatsApp</span>
                </a>
                <button
                  onClick={() => setSubmitted(false)}
                  className="px-5 py-2.5 bg-gray-100 dark:bg-emerald-800 hover:bg-gray-200 text-gray-800 dark:text-emerald-100 font-bold text-xs rounded-xl shadow transition"
                >
                  Send Another Message
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <h3 className="text-xl font-bold text-gray-900 dark:text-emerald-100">
                Send Us A Direct Message
              </h3>

              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-emerald-200 mb-1">
                  Your Full Name
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Anbu Selvan"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-4 py-2.5 bg-emerald-50/50 dark:bg-emerald-950 border border-emerald-200 dark:border-emerald-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 dark:text-emerald-100"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-700 dark:text-emerald-200 mb-1">
                    Phone Number
                  </label>
                  <input
                    type="tel"
                    required
                    placeholder="+91 9789325262"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full px-4 py-2.5 bg-emerald-50/50 dark:bg-emerald-950 border border-emerald-200 dark:border-emerald-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 dark:text-emerald-100"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 dark:text-emerald-200 mb-1">
                    Email Address (Optional)
                  </label>
                  <input
                    type="email"
                    placeholder="name@example.com"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full px-4 py-2.5 bg-emerald-50/50 dark:bg-emerald-950 border border-emerald-200 dark:border-emerald-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 dark:text-emerald-100"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-emerald-200 mb-1">
                  Message / Inquiry
                </label>
                <textarea
                  rows={4}
                  required
                  placeholder="Ask about product availability, bulk ordering, health benefits..."
                  value={formData.message}
                  onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                  className="w-full px-4 py-2.5 bg-emerald-50/50 dark:bg-emerald-950 border border-emerald-200 dark:border-emerald-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 dark:text-emerald-100"
                />
              </div>

              <button
                type="submit"
                className="w-full flex items-center justify-center space-x-2 bg-emerald-700 hover:bg-emerald-800 text-white font-bold py-3.5 px-4 rounded-xl shadow transition-all text-sm"
              >
                <Send className="w-4 h-4" />
                <span>Submit Message</span>
              </button>
            </form>
          )}
        </div>

      </div>

    </div>
  );
};

export default ContactPage;
