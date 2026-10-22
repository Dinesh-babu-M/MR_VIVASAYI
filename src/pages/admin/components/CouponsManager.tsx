import React, { useState, useEffect } from 'react';
import { Plus, Edit2, Archive, Ticket, Tag } from 'lucide-react';
import type { Coupon } from '../../../types';
import { getJSONStore, setJSONStore } from '../../../lib/dbManager';
import { useNotifications } from '../../../contexts/NotificationContext';
import { formatPrice } from '../../../lib/utils';

export function CouponsManager() {
  const { addNotification } = useNotifications();
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newCoupon, setNewCoupon] = useState({
    code: '',
    description: '',
    discount_type: 'PERCENTAGE' as 'PERCENTAGE' | 'FIXED',
    discount_value: 10,
    min_order_value: 0,
    max_discount_value: 0,
    is_active: true
  });

  useEffect(() => {
    async function load() {
      const c = await getJSONStore<Coupon>('coupons');
      setCoupons(c);
    }
    load();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCoupon.code) return;
    
    const created: Coupon = {
      id: `coupon-${Date.now()}`,
      code: newCoupon.code.toUpperCase(),
      description: newCoupon.description,
      discount_type: newCoupon.discount_type,
      discount_value: newCoupon.discount_value,
      min_order_value: newCoupon.min_order_value || undefined,
      max_discount_value: newCoupon.max_discount_value || undefined,
      is_active: newCoupon.is_active,
      times_used: 0,
      created_at: new Date().toISOString()
    };

    const updated = [created, ...coupons];
    setCoupons(updated);
    await setJSONStore('coupons', updated);
    setShowCreateModal(false);
    setNewCoupon({
      code: '', description: '', discount_type: 'PERCENTAGE', discount_value: 10, min_order_value: 0, max_discount_value: 0, is_active: true
    });
    
    addNotification({
      title: 'Coupon Created',
      message: `Coupon ${created.code} is now live!`,
      type: 'success',
      sourceModule: 'Promotions'
    });
  };

  const toggleStatus = async (id: string) => {
    const updated = coupons.map(c => c.id === id ? { ...c, is_active: !c.is_active } : c);
    setCoupons(updated);
    await setJSONStore('coupons', updated);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center bg-white p-4 rounded-2xl border border-emerald-100 shadow-sm">
        <div>
          <h2 className="text-lg font-bold text-emerald-950 flex items-center gap-2">
            <Ticket className="w-5 h-5 text-emerald-600" />
            Discount Coupons
          </h2>
          <p className="text-xs text-gray-500 mt-0.5">Manage promo codes and checkout discounts</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="bg-emerald-700 hover:bg-emerald-800 text-white px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 shadow"
        >
          <Plus className="w-4 h-4" />
          Create Code
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {coupons.map(coupon => (
          <div key={coupon.id} className={`p-5 rounded-2xl border transition-all shadow-sm flex flex-col justify-between ${coupon.is_active ? 'bg-white border-emerald-100 hover:shadow-md' : 'bg-gray-50 border-gray-200 opacity-80'}`}>
            <div>
              <div className="flex justify-between items-start mb-3">
                <span className="bg-amber-100 text-amber-900 px-3 py-1 rounded-full text-sm font-black font-mono tracking-wider border border-amber-200 shadow-sm">
                  {coupon.code}
                </span>
                <button
                  onClick={() => toggleStatus(coupon.id)}
                  className={`text-[10px] font-bold px-2 py-1 rounded-full ${coupon.is_active ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-200 text-gray-600'}`}
                >
                  {coupon.is_active ? 'Active' : 'Disabled'}
                </button>
              </div>
              <p className="text-xs text-gray-500 font-medium h-8 line-clamp-2">{coupon.description}</p>
              
              <div className="mt-4 space-y-1">
                <div className="flex justify-between text-xs">
                  <span className="text-gray-500">Discount:</span>
                  <span className="font-extrabold text-emerald-700">
                    {coupon.discount_type === 'PERCENTAGE' ? `${coupon.discount_value}% OFF` : formatPrice(coupon.discount_value)}
                  </span>
                </div>
                {coupon.min_order_value && (
                  <div className="flex justify-between text-[10px]">
                    <span className="text-gray-400">Min Order:</span>
                    <span className="font-bold text-gray-600">{formatPrice(coupon.min_order_value)}</span>
                  </div>
                )}
                {coupon.max_discount_value && coupon.discount_type === 'PERCENTAGE' && (
                  <div className="flex justify-between text-[10px]">
                    <span className="text-gray-400">Max Cap:</span>
                    <span className="font-bold text-gray-600">{formatPrice(coupon.max_discount_value)}</span>
                  </div>
                )}
              </div>
            </div>
            
            <div className="mt-4 pt-3 border-t border-gray-100 flex justify-between items-center">
              <span className="text-[10px] text-gray-400 font-medium">Used: <strong className="text-gray-700">{coupon.times_used}</strong> times</span>
              <span className="text-[9px] text-gray-300">Added: {new Date(coupon.created_at).toLocaleDateString()}</span>
            </div>
          </div>
        ))}
        {coupons.length === 0 && (
          <div className="col-span-full py-12 text-center text-gray-400 text-sm font-medium border-2 border-dashed border-gray-200 rounded-2xl bg-gray-50">
            No coupon codes active. Click "Create Code" to start running discounts!
          </div>
        )}
      </div>

      {showCreateModal && (
        <div className="fixed inset-0 bg-emerald-950/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-emerald-50/50">
              <h3 className="text-lg font-bold text-emerald-950 flex items-center gap-2">
                <Tag className="w-5 h-5 text-emerald-600" />
                New Coupon Code
              </h3>
              <button onClick={() => setShowCreateModal(false)} className="text-gray-400 hover:text-gray-600 transition">
                <Archive className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreate} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Coupon Code *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. WELCOME10"
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl font-mono uppercase font-bold text-gray-900"
                  value={newCoupon.code}
                  onChange={e => setNewCoupon({...newCoupon, code: e.target.value.toUpperCase()})}
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Description</label>
                <input
                  type="text"
                  placeholder="e.g. 10% off for new customers"
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm"
                  value={newCoupon.description}
                  onChange={e => setNewCoupon({...newCoupon, description: e.target.value})}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Discount Type</label>
                  <select
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium"
                    value={newCoupon.discount_type}
                    onChange={e => setNewCoupon({...newCoupon, discount_type: e.target.value as any})}
                  >
                    <option value="PERCENTAGE">Percentage (%)</option>
                    <option value="FIXED">Fixed Amount (₹)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Value *</label>
                  <input
                    type="number"
                    required min="1"
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm font-bold"
                    value={newCoupon.discount_value}
                    onChange={e => setNewCoupon({...newCoupon, discount_value: Number(e.target.value)})}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-bold text-gray-500 mb-1">Min. Order Value (₹) (Optional)</label>
                  <input
                    type="number"
                    min="0"
                    placeholder="0"
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm"
                    value={newCoupon.min_order_value || ''}
                    onChange={e => setNewCoupon({...newCoupon, min_order_value: Number(e.target.value)})}
                  />
                </div>
                {newCoupon.discount_type === 'PERCENTAGE' && (
                  <div>
                    <label className="block text-[11px] font-bold text-gray-500 mb-1">Max Discount Cap (₹) (Optional)</label>
                    <input
                      type="number"
                      min="0"
                      placeholder="0"
                      className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm"
                      value={newCoupon.max_discount_value || ''}
                      onChange={e => setNewCoupon({...newCoupon, max_discount_value: Number(e.target.value)})}
                    />
                  </div>
                )}
              </div>

              <div className="pt-4 border-t border-gray-100 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 text-gray-600 font-medium text-sm hover:bg-gray-100 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 bg-emerald-700 text-white font-bold text-sm rounded-xl hover:bg-emerald-800 shadow"
                >
                  Save Coupon
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
