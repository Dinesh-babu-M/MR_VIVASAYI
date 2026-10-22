import React, { useState } from 'react';
import {
  Send, Megaphone, MessageSquare, Mail, Plus, Edit2, Eye,
  Archive, Calendar, Percent, X, CheckCircle2, Sparkles, Globe,
  Layout, Smartphone
} from 'lucide-react';
import { Promotion } from '../../types';
import { useNotifications } from '../../contexts/NotificationContext';
import { getJSONStore, setJSONStore } from '../../lib/dbManager';
import { RefreshSpinnerModal } from '../../components/common/RefreshSpinnerModal';
import { AdminPageSkeleton } from '../../components/common/Skeleton';
import { useActionModal } from '../../contexts/ActionModalContext';
import { RefreshCw } from 'lucide-react';

interface PromotionsPageProps {
  initialSubTab?: 'ALL' | 'WEBSITE' | 'WHATSAPP';
}

export default function PromotionsPage({ initialSubTab = 'ALL' }: PromotionsPageProps) {
  const { addNotification } = useNotifications();
  const { showActionModal } = useActionModal();
  const [promotions, setPromotions] = useState<Promotion[]>([]);
  const [loading, setLoading] = useState(true);

  React.useEffect(() => {
    async function load() {
      setLoading(true);
      const p = await getJSONStore<Promotion>('promotions');
      setPromotions(p);
      setLoading(false);
    }
    load();
  }, []);
  const [activeSubTab, setActiveSubTab] = useState<'ALL' | 'WEBSITE' | 'WHATSAPP'>(initialSubTab);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedPromo, setSelectedPromo] = useState<Promotion | null>(null);

  const [newPromo, setNewPromo] = useState({
    name: '',
    description: '',
    discount_type: 'PERCENTAGE' as 'PERCENTAGE' | 'FIXED',
    discount_value: 10,
    status: 'ACTIVE' as Promotion['status'],
    send_whatsapp: true,
    send_email: true,
    frequency: 'ONE_TIME' as 'ONE_TIME' | 'EVERY_15_DAYS' | 'MONTHLY'
  });

  const filteredPromotions = promotions.filter(p => {
    if (activeSubTab === 'WEBSITE') return p.send_email || p.status === 'ACTIVE';
    if (activeSubTab === 'WHATSAPP') return p.send_whatsapp;
    return true;
  });

  const handleCreatePromo = async (e: React.FormEvent) => {
    e.preventDefault();
    const created: Promotion = {
      id: `promo-${Date.now()}`,
      name: newPromo.name,
      description: newPromo.description,
      discount_type: newPromo.discount_type,
      discount_value: newPromo.discount_value,
      status: newPromo.status,
      frequency: newPromo.frequency,
      send_whatsapp: newPromo.send_whatsapp,
      send_email: newPromo.send_email,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    setShowCreateModal(false);

    showActionModal({
      title: 'Launching Marketing Campaign',
      subtitle: `Configuring ${created.name} across channels...`,
      badge: 'Marketing Live',
      duration: 850,
      steps: [
        'Validating discount rules & channel targets...',
        'Broadcasting promotion to website & WhatsApp engines...',
        'Synchronizing promotional database...',
        'Campaign launched live!'
      ],
      onComplete: async () => {
        const updated = [created, ...promotions];
        setPromotions(updated);
        await setJSONStore('promotions', updated);
        setNewPromo({
          name: '', description: '', discount_type: 'PERCENTAGE',
          discount_value: 10, status: 'ACTIVE', send_whatsapp: true,
          send_email: true, frequency: 'ONE_TIME'
        });

        addNotification({
          title: 'Campaign Created',
          message: `Launched new promotion campaign: ${created.name}`,
          type: 'success',
          sourceModule: 'Promotions'
        });
      }
    });
  };

  const [isRefreshing, setIsRefreshing] = useState(false);

  if (loading) {
    return <AdminPageSkeleton title="Promotions & Campaign Marketing" />;
  }

  return (
    <div className="space-y-6 font-sans text-gray-900 bg-gray-50 min-h-screen p-4 sm:p-6 rounded-2xl animate-fadeIn">
      <RefreshSpinnerModal
        isOpen={isRefreshing}
        moduleName="Promotions & Marketing"
        title="Syncing Marketing Campaigns..."
        subtitle="Updating website banners & WhatsApp broadcast schedules..."
        onComplete={() => setIsRefreshing(false)}
      />
      
      {/* Header */}
      <div className="bg-white p-6 rounded-3xl shadow-sm border border-emerald-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold font-serif text-emerald-950 flex items-center gap-2">
            <Megaphone className="w-7 h-7 text-emerald-600" />
            Promotions & Campaign Marketing
          </h1>
          <p className="text-xs text-gray-500 mt-1">
            Separate campaign views for Website banners and WhatsApp broadcast messages.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsRefreshing(true)}
            className="px-3.5 py-2.5 bg-white border border-emerald-200 text-emerald-900 hover:bg-emerald-50 font-bold text-xs rounded-xl shadow-xs flex items-center gap-1.5 transition-all"
          >
            <RefreshCw className={`w-4 h-4 text-emerald-600 ${isRefreshing ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
          <button
            onClick={() => setShowCreateModal(true)}
            className="px-4 py-2.5 bg-emerald-800 hover:bg-emerald-900 text-white font-bold text-xs rounded-xl shadow flex items-center gap-1.5 justify-center"
          >
            <Plus className="w-4 h-4" /> Create New Campaign
          </button>
        </div>
      </div>

      {/* Separate Submenus: Website & WhatsApp */}
      <div className="flex bg-white p-2 rounded-2xl border border-emerald-100 shadow-sm gap-2">
        <button
          onClick={() => setActiveSubTab('ALL')}
          className={`flex-1 py-2.5 text-xs font-extrabold rounded-xl transition flex items-center justify-center gap-2 ${
            activeSubTab === 'ALL'
              ? 'bg-emerald-800 text-white shadow-md'
              : 'text-gray-600 hover:bg-emerald-50 hover:text-emerald-950'
          }`}
        >
          <Layout className="w-4 h-4" />
          <span>All Marketing Campaigns ({promotions.length})</span>
        </button>

        <button
          onClick={() => setActiveSubTab('WEBSITE')}
          className={`flex-1 py-2.5 text-xs font-extrabold rounded-xl transition flex items-center justify-center gap-2 ${
            activeSubTab === 'WEBSITE'
              ? 'bg-emerald-800 text-white shadow-md'
              : 'text-gray-600 hover:bg-emerald-50 hover:text-emerald-950'
          }`}
        >
          <Globe className="w-4 h-4" />
          <span>Website Banners & Email</span>
        </button>

        <button
          onClick={() => setActiveSubTab('WHATSAPP')}
          className={`flex-1 py-2.5 text-xs font-extrabold rounded-xl transition flex items-center justify-center gap-2 ${
            activeSubTab === 'WHATSAPP'
              ? 'bg-emerald-800 text-white shadow-md'
              : 'text-gray-600 hover:bg-emerald-50 hover:text-emerald-950'
          }`}
        >
          <MessageSquare className="w-4 h-4 text-emerald-400" />
          <span>WhatsApp Broadcast Campaigns</span>
        </button>
      </div>

      {/* Campaign Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {filteredPromotions.map(promo => (
          <div key={promo.id} className="bg-white rounded-3xl p-5 shadow-sm border border-emerald-100 flex flex-col justify-between">
            <div>
              <div className="flex justify-between items-start mb-3">
                <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                  promo.status === 'ACTIVE'
                    ? 'bg-emerald-100 text-emerald-800'
                    : promo.status === 'SCHEDULED'
                    ? 'bg-blue-100 text-blue-800'
                    : 'bg-gray-100 text-gray-700'
                }`}>
                  {promo.status}
                </span>

                <div className="flex gap-1">
                  {promo.send_whatsapp && (
                    <span className="p-1.5 bg-emerald-50 text-emerald-700 rounded-lg" title="WhatsApp Channel">
                      <MessageSquare className="w-3.5 h-3.5" />
                    </span>
                  )}
                  {promo.send_email && (
                    <span className="p-1.5 bg-blue-50 text-blue-700 rounded-lg" title="Website / Email Channel">
                      <Globe className="w-3.5 h-3.5" />
                    </span>
                  )}
                </div>
              </div>

              <h3 className="font-bold text-emerald-950 text-sm mb-1">{promo.name}</h3>
              <p className="text-xs text-gray-500 mb-4 line-clamp-2">{promo.description}</p>

              <div className="p-3 bg-amber-50/60 rounded-xl border border-amber-200/50 mb-4 flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-xs text-amber-900 font-bold">
                  <Percent className="w-4 h-4 text-amber-600" />
                  <span>Discount Offer</span>
                </div>
                <span className="text-sm font-extrabold text-amber-700">
                  {promo.discount_type === 'PERCENTAGE' ? `${promo.discount_value}% OFF` : `₹${promo.discount_value} OFF`}
                </span>
              </div>
            </div>

            <div className="pt-2 border-t border-gray-100 flex justify-between items-center text-xs">
              <span className="text-[10px] text-gray-400 font-mono">Freq: {promo.frequency}</span>
              <button
                onClick={() => setSelectedPromo(promo)}
                className="px-3 py-1 bg-emerald-800 text-white font-semibold text-[11px] rounded-lg hover:bg-emerald-900 shadow-sm flex items-center gap-1"
              >
                <Eye className="w-3 h-3" /> Preview Campaign
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Create Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-emerald-100 space-y-4 animate-fadeIn">
            <div className="flex justify-between items-center border-b border-gray-100 pb-3">
              <h3 className="font-extrabold text-emerald-950 text-base">Create New Promotion Campaign</h3>
              <button onClick={() => setShowCreateModal(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreatePromo} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold mb-1 text-emerald-950">Campaign Name *</label>
                <input
                  type="text"
                  required
                  value={newPromo.name}
                  onChange={e => setNewPromo({ ...newPromo, name: e.target.value })}
                  placeholder="e.g. Harvest Festival 10% Off Traditional Rice"
                  className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl"
                />
              </div>

              <div>
                <label className="block font-semibold mb-1 text-emerald-950">Campaign Description</label>
                <textarea
                  rows={2}
                  value={newPromo.description}
                  onChange={e => setNewPromo({ ...newPromo, description: e.target.value })}
                  placeholder="Details sent to WhatsApp & Website users..."
                  className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold mb-1 text-emerald-950">Discount Type</label>
                  <select
                    value={newPromo.discount_type}
                    onChange={e => setNewPromo({ ...newPromo, discount_type: e.target.value as any })}
                    className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl font-bold"
                  >
                    <option value="PERCENTAGE">Percentage (%)</option>
                    <option value="FIXED">Fixed Amount (₹)</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold mb-1 text-emerald-950">Discount Value</label>
                  <input
                    type="number"
                    min="1"
                    value={newPromo.discount_value}
                    onChange={e => setNewPromo({ ...newPromo, discount_value: Number(e.target.value) })}
                    className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl font-bold"
                  />
                </div>
              </div>

              <div className="flex gap-4 pt-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={newPromo.send_whatsapp}
                    onChange={e => setNewPromo({ ...newPromo, send_whatsapp: e.target.checked })}
                    className="w-4 h-4 text-emerald-600 rounded"
                  />
                  <span className="font-bold text-emerald-950">WhatsApp Broadcast</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={newPromo.send_email}
                    onChange={e => setNewPromo({ ...newPromo, send_email: e.target.checked })}
                    className="w-4 h-4 text-emerald-600 rounded"
                  />
                  <span className="font-bold text-emerald-950">Website Banners & Email</span>
                </label>
              </div>

              <div className="pt-4 flex gap-2">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="flex-1 py-2.5 bg-gray-100 text-gray-700 rounded-xl font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-emerald-800 text-white rounded-xl font-bold hover:bg-emerald-900 shadow"
                >
                  Save & Launch Campaign
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Preview Modal */}
      {selectedPromo && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-emerald-100 space-y-4 animate-fadeIn">
            <div className="flex justify-between items-center border-b border-gray-100 pb-3">
              <h3 className="font-extrabold text-emerald-950 text-base flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-amber-500" /> Campaign Preview
              </h3>
              <button onClick={() => setSelectedPromo(null)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-200 space-y-2 text-xs text-emerald-950">
              <p className="font-bold">🌿 MR. VIVASAYI — Good Food. Good Life.</p>
              <p className="font-semibold text-emerald-800">📢 Special Offer: {selectedPromo.name}</p>
              <p>{selectedPromo.description}</p>
              <div className="p-2 bg-white rounded-xl font-bold text-center text-amber-700 border border-amber-200">
                Get {selectedPromo.discount_type === 'PERCENTAGE' ? `${selectedPromo.discount_value}% OFF` : `₹${selectedPromo.discount_value} OFF`} on your order!
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                onClick={() => setSelectedPromo(null)}
                className="px-5 py-2 bg-emerald-800 text-white text-xs font-bold rounded-xl shadow"
              >
                Close Preview
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
