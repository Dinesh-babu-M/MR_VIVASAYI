import React, { useState, useEffect, useMemo } from 'react';
import {
  Plus, Archive, Ticket, Tag, RefreshCw, BarChart2, TrendingUp,
  CheckCircle2, Trash2, Edit2, Download, ShieldAlert, Eye, Search,
  Filter, CheckSquare, Square, ChevronLeft, ChevronRight, Check, X, SlidersHorizontal
} from 'lucide-react';
import type { Coupon } from '../../types';
import { getJSONStore, setJSONStore } from '../../lib/dbManager';
import { useNotifications } from '../../contexts/NotificationContext';
import { formatPrice } from '../../lib/utils';
import { RefreshSpinnerModal } from '../../components/common/RefreshSpinnerModal';
import { ExportFormatModal, ExportFormat } from '../../components/common/ExportFormatModal';
import { AdminPageSkeleton } from '../../components/common/Skeleton';
import { useActionModal } from '../../contexts/ActionModalContext';
import { generateCouponId } from '../../lib/sequentialIdUtils';

export default function CouponsPage() {
  const { addNotification } = useNotifications();
  const { showActionModal } = useActionModal();
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [editingCoupon, setEditingCoupon] = useState<Coupon | null>(null);
  const [previewCoupon, setPreviewCoupon] = useState<Coupon | null>(null);

  // Search, Filter, Sort & Pagination State
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'DISABLED'>('ALL');
  const [typeFilter, setTypeFilter] = useState<'ALL' | 'PERCENTAGE' | 'FIXED'>('ALL');
  const [sortBy, setSortBy] = useState<'recent' | 'code' | 'usage' | 'discount'>('recent');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(6);
  const [selectedCouponIds, setSelectedCouponIds] = useState<string[]>([]);
  
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    isDanger: boolean;
    onConfirm: () => void;
  }>({ isOpen: false, title: '', message: '', isDanger: false, onConfirm: () => {} });

  // Stats
  const totalCoupons = coupons.length;
  const activeCoupons = coupons.filter(c => c.is_active).length;
  const totalUses = coupons.reduce((sum, c) => sum + c.times_used, 0);
  const bestCoupon = [...coupons].sort((a, b) => b.times_used - a.times_used)[0];

  const [newCoupon, setNewCoupon] = useState({
    code: '',
    description: '',
    discount_type: 'PERCENTAGE' as 'PERCENTAGE' | 'FIXED',
    discount_value: 10,
    min_order_value: 0,
    max_discount_value: 0,
    usage_limit: 0,
    is_active: true
  });

  const load = async () => {
    setIsRefreshing(true);
    const c = await getJSONStore<Coupon>('coupons');
    let hasChanged = false;
    const normalized = (c || []).map((item, idx) => {
      if (!item.coupon_id) {
        hasChanged = true;
        const codeNum = String(idx + 1).padStart(4, '0');
        return {
          ...item,
          coupon_id: codeNum,
          coupons_ids: codeNum,
          id: item.id?.startsWith('coup-') ? item.id : `coup-${codeNum}`
        };
      }
      return item;
    });

    if (hasChanged) {
      await setJSONStore('coupons', normalized);
    }
    setCoupons(normalized);
    setLoading(false);
    setIsRefreshing(false);
  };

  useEffect(() => {
    load();
  }, []);

  const handleExportCSV = (targetCoupons: Coupon[] = coupons) => {
    if (targetCoupons.length === 0) return;
    showActionModal({
      title: 'Compiling Coupons Export',
      subtitle: `Exporting ${targetCoupons.length} promotional coupons to CSV...`,
      badge: 'Promotions Engine',
      duration: 800,
      steps: [
        'Formatting discount rules & usage thresholds...',
        'Compiling CSV records...',
        'Downloading promotional coupons file...',
        'Export completed successfully!'
      ],
      onComplete: () => {
        const headers = ['Code', 'ID', 'Description', 'Discount Type', 'Value', 'Min Order', 'Max Discount', 'Usage Limit', 'Times Used', 'Status', 'Created At'];
        const rows = targetCoupons.map(c => [
          c.code,
          `#${c.coupon_id || c.coupons_ids || ''}`,
          `"${(c.description || '').replace(/"/g, '""')}"`,
          c.discount_type,
          c.discount_value,
          c.min_order_value || 'N/A',
          c.max_discount_value || 'N/A',
          c.usage_limit || 'Unlimited',
          c.times_used,
          c.is_active ? 'Active' : 'Disabled',
          new Date(c.created_at).toLocaleDateString()
        ]);
        const csvContent = "data:text/csv;charset=utf-8," + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `mrvivasayi_coupons_${new Date().toISOString().split('T')[0]}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }
    });
  };

  const handleCreateOrUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    const formData = editingCoupon || newCoupon;
    if (!formData.code) return;
    
    if (editingCoupon) {
      // UPDATE
      const targetCoupon = { ...editingCoupon };
      setEditingCoupon(null);

      showActionModal({
        title: 'Updating Coupon Rules',
        subtitle: `Saving changes for coupon ${targetCoupon.code}...`,
        badge: 'Discounts Live',
        duration: 850,
        steps: [
          'Validating discount rules and minimum order thresholds...',
          'Updating coupon ledger in database...',
          'Refreshing storefront discount validators...',
          'Coupon updated successfully!'
        ],
        onComplete: async () => {
          const updatedList = coupons.map(c => c.id === targetCoupon.id ? targetCoupon : c);
          setCoupons(updatedList);
          await setJSONStore('coupons', updatedList);
          addNotification({
            title: 'Coupon Updated',
            message: `Coupon ${targetCoupon.code} has been successfully updated.`,
            type: 'success',
            sourceModule: 'Promotions'
          });
        }
      });
    } else {
      // CREATE
      const couponIdObj = generateCouponId(coupons);
      const created: Coupon = {
        id: couponIdObj.id,
        coupon_id: couponIdObj.coupon_number,
        coupons_ids: couponIdObj.coupon_number,
        code: newCoupon.code.toUpperCase(),
        description: newCoupon.description,
        discount_type: newCoupon.discount_type,
        discount_value: newCoupon.discount_value,
        min_order_value: newCoupon.min_order_value || undefined,
        max_discount_value: newCoupon.max_discount_value || undefined,
        usage_limit: newCoupon.usage_limit || undefined,
        is_active: newCoupon.is_active,
        times_used: 0,
        created_at: new Date().toISOString()
      };

      setShowCreateModal(false);

      showActionModal({
        title: 'Publishing New Coupon',
        subtitle: `Configuring ${created.code} (${created.discount_type === 'PERCENTAGE' ? `${created.discount_value}%` : `₹${created.discount_value}`}) across store...`,
        badge: 'Coupon Engine',
        duration: 850,
        steps: [
          'Validating coupon unique code format...',
          'Registering coupon in checkout discount engine...',
          'Updating active promotion schedules...',
          'Coupon published live!'
        ],
        onComplete: async () => {
          const updated = [created, ...coupons];
          setCoupons(updated);
          await setJSONStore('coupons', updated);
          setNewCoupon({
            code: '', description: '', discount_type: 'PERCENTAGE', discount_value: 10, min_order_value: 0, max_discount_value: 0, usage_limit: 0, is_active: true
          });
          addNotification({
            title: 'Coupon Created',
            message: `Coupon ${created.code} is now live!`,
            type: 'success',
            sourceModule: 'Promotions'
          });
        }
      });
    }
  };

  const toggleStatus = async (id: string, code: string, currentStatus: boolean) => {
    const action = currentStatus ? "DISABLE" : "ACTIVATE";
    setConfirmModal({
      isOpen: true,
      title: `${currentStatus ? 'Disable' : 'Activate'} Coupon`,
      message: `Are you sure you want to ${action} the coupon '${code}'?`,
      isDanger: currentStatus,
      onConfirm: async () => {
        setConfirmModal(prev => ({ ...prev, isOpen: false }));
        showActionModal({
          title: `${currentStatus ? 'Disabling' : 'Activating'} Coupon`,
          subtitle: `Updating live status for ${code}...`,
          badge: 'Status Toggle',
          duration: 750,
          steps: [
            'Updating checkout coupon validator...',
            'Persisting changes to database...',
            `Coupon ${code} successfully ${currentStatus ? 'disabled' : 'activated'}!`
          ],
          onComplete: async () => {
            const updated = coupons.map(c => c.id === id ? { ...c, is_active: !c.is_active } : c);
            setCoupons(updated);
            await setJSONStore('coupons', updated);
            addNotification({
              title: 'Status Updated',
              message: `Coupon ${code} has been successfully ${currentStatus ? 'disabled' : 'activated'}.`,
              type: 'success',
              sourceModule: 'Promotions'
            });
          }
        });
      }
    });
  };

  const handleDelete = async (id: string, code: string) => {
    setConfirmModal({
      isOpen: true,
      title: 'Delete Coupon',
      message: `Are you sure you want to completely DELETE the coupon '${code}'? This action cannot be undone.`,
      isDanger: true,
      onConfirm: async () => {
        setConfirmModal(prev => ({ ...prev, isOpen: false }));
        showActionModal({
          title: 'Deleting Promotional Coupon',
          subtitle: `Permanently removing ${code} from database...`,
          badge: 'Coupon Engine',
          duration: 800,
          steps: [
            'Removing coupon usage records...',
            'Invalidating coupon tokens from cart sessions...',
            'Database synchronized successfully!',
            'Coupon deleted'
          ],
          onComplete: async () => {
            const updated = coupons.filter(c => c.id !== id);
            setCoupons(updated);
            await setJSONStore('coupons', updated);
            addNotification({
              title: 'Coupon Deleted',
              message: `The coupon ${code} was permanently removed.`,
              type: 'warning',
              sourceModule: 'Promotions'
            });
          }
        });
      }
    });
  };

  // Memoized Filtered and Sorted Coupons
  const filteredCoupons = useMemo(() => {
    return coupons.filter(c => {
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch = !q ||
        c.code.toLowerCase().includes(q) ||
        (c.description || '').toLowerCase().includes(q) ||
        (c.coupon_id && c.coupon_id.includes(q)) ||
        (c.coupons_ids && c.coupons_ids.includes(q));

      const matchesStatus =
        statusFilter === 'ALL' ||
        (statusFilter === 'ACTIVE' && c.is_active) ||
        (statusFilter === 'DISABLED' && !c.is_active);

      const matchesType =
        typeFilter === 'ALL' ||
        c.discount_type === typeFilter;

      return matchesSearch && matchesStatus && matchesType;
    }).sort((a, b) => {
      if (sortBy === 'recent') {
        const timeA = new Date(a.created_at || '').getTime() || 0;
        const timeB = new Date(b.created_at || '').getTime() || 0;
        if (timeB !== timeA) return timeB - timeA;
        return (b.coupon_id || '').localeCompare(a.coupon_id || '');
      }
      if (sortBy === 'code') return a.code.localeCompare(b.code);
      if (sortBy === 'usage') return (b.times_used || 0) - (a.times_used || 0);
      if (sortBy === 'discount') return (b.discount_value || 0) - (a.discount_value || 0);
      return 0;
    });
  }, [coupons, searchQuery, statusFilter, typeFilter, sortBy]);

  // Pagination Calculations
  const totalPages = Math.ceil(filteredCoupons.length / pageSize) || 1;
  const paginatedCoupons = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredCoupons.slice(start, start + pageSize);
  }, [filteredCoupons, currentPage, pageSize]);

  // Multi-Selection Logic
  const handleToggleSelectCoupon = (id: string) => {
    setSelectedCouponIds(prev =>
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  const handleToggleSelectAll = () => {
    if (paginatedCoupons.length === 0) return;
    const paginatedIds = paginatedCoupons.map(c => c.id);
    const allSelected = paginatedIds.every(id => selectedCouponIds.includes(id));
    if (allSelected) {
      setSelectedCouponIds(prev => prev.filter(id => !paginatedIds.includes(id)));
    } else {
      setSelectedCouponIds(prev => Array.from(new Set([...prev, ...paginatedIds])));
    }
  };

  const isAllPaginatedSelected = paginatedCoupons.length > 0 && paginatedCoupons.every(c => selectedCouponIds.includes(c.id));

  // Bulk Status Toggle
  const handleBulkToggleStatus = async (newActive: boolean) => {
    if (selectedCouponIds.length === 0) return;
    const count = selectedCouponIds.length;
    const actionText = newActive ? 'Activating' : 'Disabling';

    showActionModal({
      title: `${actionText} Selected Coupons`,
      subtitle: `Updating status for ${count} promotional codes...`,
      badge: 'Bulk Promotions',
      duration: 800,
      steps: [
        `Targeting ${count} selected coupons...`,
        'Updating discount engine configuration...',
        'Persisting changes to database...',
        `Successfully ${newActive ? 'activated' : 'disabled'} ${count} coupons!`
      ],
      onComplete: async () => {
        const updated = coupons.map(c => selectedCouponIds.includes(c.id) ? { ...c, is_active: newActive } : c);
        setCoupons(updated);
        await setJSONStore('coupons', updated);
        setSelectedCouponIds([]);
        addNotification({
          title: 'Coupons Updated',
          message: `Successfully ${newActive ? 'activated' : 'disabled'} ${count} coupons.`,
          type: 'success',
          sourceModule: 'Promotions'
        });
      }
    });
  };

  // Bulk Delete
  const handleBulkDeleteSelected = () => {
    if (selectedCouponIds.length === 0) return;
    const count = selectedCouponIds.length;

    setConfirmModal({
      isOpen: true,
      title: `Delete ${count} Coupons`,
      message: `Are you sure you want to permanently delete the ${count} selected coupons? This action cannot be undone.`,
      isDanger: true,
      onConfirm: async () => {
        setConfirmModal(prev => ({ ...prev, isOpen: false }));
        showActionModal({
          title: 'Deleting Selected Coupons',
          subtitle: `Permanently removing ${count} coupons from system...`,
          badge: 'Bulk Delete',
          duration: 850,
          steps: [
            `Invalidating ${count} coupons in cart sessions...`,
            'Purging promotional discount records...',
            'Database synchronized successfully!',
            `${count} coupons deleted`
          ],
          onComplete: async () => {
            const updated = coupons.filter(c => !selectedCouponIds.includes(c.id));
            setCoupons(updated);
            await setJSONStore('coupons', updated);
            setSelectedCouponIds([]);
            addNotification({
              title: 'Coupons Deleted',
              message: `Permanently deleted ${count} promotional coupons.`,
              type: 'warning',
              sourceModule: 'Promotions'
            });
          }
        });
      }
    });
  };

  // Selective Export
  const handleExportSelected = () => {
    const selectedList = coupons.filter(c => selectedCouponIds.includes(c.id));
    if (selectedList.length === 0) return;
    handleExportCSV(selectedList);
  };

  if (loading) {
    return <AdminPageSkeleton title="Coupons & Discount Engine" />;
  }

  return (
    <div className="space-y-6 font-sans text-gray-900 bg-gray-50 min-h-screen p-4 sm:p-6 rounded-2xl animate-fadeIn">
      <RefreshSpinnerModal
        isOpen={isRefreshing}
        moduleName="Discount Coupons"
        title="Loading Coupons..."
        subtitle="Fetching latest discount codes and analytics..."
        onComplete={() => setIsRefreshing(false)}
      />

      {/* Header */}
      <div className="bg-white p-6 rounded-3xl shadow-sm border border-emerald-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold font-serif text-emerald-950 flex items-center gap-2">
            <Ticket className="w-7 h-7 text-emerald-600" />
            Discount Coupons
          </h1>
          <p className="text-xs text-gray-500 mt-1">
            Manage your store's promotional codes, set minimum order requirements, and view usage statistics.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowExportModal(true)}
            title="Export"
            className="p-2.5 bg-blue-50 text-blue-700 hover:bg-blue-100 rounded-xl transition font-bold"
          >
            <Download className="w-5 h-5" />
          </button>
          <button
            onClick={load}
            title="Refresh"
            className="p-2.5 bg-gray-100 text-gray-600 hover:bg-gray-200 rounded-xl transition"
          >
            <RefreshCw className="w-5 h-5" />
          </button>
          <button
            onClick={() => setShowCreateModal(true)}
            className="bg-emerald-700 hover:bg-emerald-800 text-white px-5 py-2.5 rounded-xl text-sm font-bold transition flex items-center gap-2 shadow"
          >
            <Plus className="w-4 h-4" />
            Create New Code
          </button>
        </div>
      </div>

      {/* 4 Stats Boxes */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-emerald-100 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
            <Tag className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Total Codes</p>
            <p className="text-2xl font-black text-emerald-950">{totalCoupons}</p>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-emerald-100 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center shrink-0">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Active Codes</p>
            <p className="text-2xl font-black text-blue-950">{activeCoupons}</p>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-emerald-100 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center shrink-0">
            <BarChart2 className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Total Uses</p>
            <p className="text-2xl font-black text-purple-950">{totalUses}</p>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-emerald-100 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
            <TrendingUp className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Top Code</p>
            <p className="text-lg font-black text-amber-950 line-clamp-1">{bestCoupon && bestCoupon.times_used > 0 ? bestCoupon.code : 'N/A'}</p>
          </div>
        </div>
      </div>

      {/* Multi-Criteria Search, Filters & Controls Bar */}
      <div className="bg-white p-4 rounded-3xl shadow-sm border border-emerald-100 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 text-xs">
        <div className="flex flex-1 flex-wrap items-center gap-3">
          {/* Search */}
          <div className="relative min-w-[200px] flex-1">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-gray-400" />
            <input
              type="text"
              placeholder="Search code, description, #0001..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full pl-9 pr-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 font-medium focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value as any);
              setCurrentPage(1);
            }}
            className="p-2 bg-gray-50 border border-gray-200 rounded-xl font-bold text-gray-800 focus:ring-2 focus:ring-emerald-500"
          >
            <option value="ALL">All Status</option>
            <option value="ACTIVE">✅ Active Only</option>
            <option value="DISABLED">⏸️ Disabled Only</option>
          </select>

          {/* Discount Type Filter */}
          <select
            value={typeFilter}
            onChange={(e) => {
              setTypeFilter(e.target.value as any);
              setCurrentPage(1);
            }}
            className="p-2 bg-gray-50 border border-gray-200 rounded-xl font-bold text-gray-800 focus:ring-2 focus:ring-emerald-500"
          >
            <option value="ALL">All Discount Types</option>
            <option value="PERCENTAGE">Percentage (%)</option>
            <option value="FIXED">Fixed (₹)</option>
          </select>

          {/* Sort By (Default: Recent First) */}
          <select
            value={sortBy}
            onChange={(e) => {
              setSortBy(e.target.value as any);
              setCurrentPage(1);
            }}
            className="p-2 bg-amber-50 border border-amber-300 rounded-xl font-extrabold text-amber-950 focus:ring-2 focus:ring-emerald-500"
          >
            <option value="recent">⚡ Recent First (Default)</option>
            <option value="code">🔤 Code (A-Z)</option>
            <option value="usage">📈 Most Used</option>
            <option value="discount">💰 Highest Value</option>
          </select>
        </div>

        {/* Select All Toggle & Items per page */}
        <div className="flex items-center gap-3 shrink-0">
          <button
            onClick={handleToggleSelectAll}
            className={`px-3 py-2 rounded-xl text-xs font-bold border transition flex items-center gap-2 ${
              isAllPaginatedSelected
                ? 'bg-emerald-800 text-white border-emerald-900 shadow-sm'
                : 'bg-emerald-50 text-emerald-900 border-emerald-200 hover:bg-emerald-100'
            }`}
          >
            {isAllPaginatedSelected ? <CheckSquare className="w-4 h-4 text-amber-300" /> : <Square className="w-4 h-4 text-emerald-700" />}
            <span>Select Page ({paginatedCoupons.length})</span>
          </button>

          <div className="flex items-center gap-1.5 font-bold text-gray-600">
            <span>Per page:</span>
            <select
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value));
                setCurrentPage(1);
              }}
              className="p-1.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-black text-gray-800"
            >
              <option value={6}>6</option>
              <option value={12}>12</option>
              <option value={24}>24</option>
              <option value={48}>48</option>
            </select>
          </div>
        </div>
      </div>

      {/* Coupons List */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {paginatedCoupons.map(coupon => {
          const isSelected = selectedCouponIds.includes(coupon.id);
          return (
            <div
              key={coupon.id}
              className={`p-5 rounded-3xl border transition-all duration-200 shadow-sm flex flex-col justify-between ${
                isSelected
                  ? 'bg-emerald-50/60 border-emerald-400 ring-2 ring-emerald-500 shadow-md'
                  : coupon.is_active
                  ? 'bg-white border-emerald-100 hover:shadow-md hover:border-emerald-200'
                  : 'bg-gray-50 border-gray-200 opacity-80'
              }`}
            >
              <div>
                <div className="flex justify-between items-start mb-3 gap-2">
                  <div className="flex items-center gap-2.5 flex-wrap">
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => handleToggleSelectCoupon(coupon.id)}
                      className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 border-gray-300 cursor-pointer"
                    />
                    {/* 3D Badge: Coupon Code */}
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-black font-mono tracking-wider bg-gradient-to-r from-amber-200 via-amber-100 to-amber-200 text-amber-950 border border-amber-300 shadow-[0_2px_4px_rgba(217,119,6,0.2),inset_0_1px_0_rgba(255,255,255,0.8)]">
                      <Tag className="w-3.5 h-3.5 text-amber-700" />
                      {coupon.code}
                    </span>
                    {/* 3D Badge: Sequential ID */}
                    <span className="inline-flex items-center px-2 py-0.5 rounded-lg text-[10px] font-mono font-black bg-gradient-to-r from-emerald-100 to-teal-100 text-emerald-950 border border-emerald-300 shadow-[0_2px_4px_rgba(5,150,105,0.15),inset_0_1px_0_rgba(255,255,255,0.8)]">
                      #{coupon.coupon_id || coupon.coupons_ids || String(coupon.id).replace('coup-', '') || '0001'}
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      onClick={() => setPreviewCoupon(coupon)}
                      className="text-gray-500 hover:text-emerald-600 p-1.5 bg-white rounded-lg border hover:bg-emerald-50 transition shadow-2xs"
                      title="Preview Customer View"
                    >
                      <Eye className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => setEditingCoupon(coupon)}
                      className="text-gray-500 hover:text-blue-600 p-1.5 bg-white rounded-lg border hover:bg-blue-50 transition shadow-2xs"
                      title="Edit Coupon"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button 
                      onClick={() => handleDelete(coupon.id, coupon.code)} 
                      className="text-gray-500 hover:text-red-600 p-1.5 bg-white rounded-lg border hover:bg-red-50 transition shadow-2xs"
                      title="Delete Coupon"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                <p className="text-xs text-gray-500 font-medium h-8 line-clamp-2">{coupon.description || 'General store promotional discount.'}</p>
                
                <div className="mt-4 space-y-1.5">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-gray-500 font-bold">Discount:</span>
                    {/* 3D Badge: Discount Value */}
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-lg text-xs font-black bg-gradient-to-r from-emerald-600 to-teal-700 text-white shadow-[0_2px_4px_rgba(5,150,105,0.3),inset_0_1px_0_rgba(255,255,255,0.3)]">
                      {coupon.discount_type === 'PERCENTAGE' ? `${coupon.discount_value}% OFF` : formatPrice(coupon.discount_value)}
                    </span>
                  </div>
                  {coupon.min_order_value ? (
                    <div className="flex justify-between text-[10px]">
                      <span className="text-gray-400 font-semibold">Min Order:</span>
                      <span className="font-extrabold text-gray-700">{formatPrice(coupon.min_order_value)}</span>
                    </div>
                  ) : null}
                  {coupon.max_discount_value && coupon.discount_type === 'PERCENTAGE' ? (
                    <div className="flex justify-between text-[10px]">
                      <span className="text-gray-400 font-semibold">Max Cap:</span>
                      <span className="font-extrabold text-gray-700">{formatPrice(coupon.max_discount_value)}</span>
                    </div>
                  ) : null}
                  {coupon.usage_limit ? (
                    <div className="flex justify-between text-[10px]">
                      <span className="text-gray-400 font-semibold">Usage Limit:</span>
                      <span className="font-extrabold text-amber-700">{coupon.times_used} / {coupon.usage_limit} uses</span>
                    </div>
                  ) : null}
                </div>
              </div>
              
              <div className="mt-4 pt-3 border-t border-gray-100 flex justify-between items-center">
                {/* 3D Badge Button: Status Toggle */}
                <button
                  onClick={() => toggleStatus(coupon.id, coupon.code, coupon.is_active)}
                  className={`text-[10px] font-black px-3 py-1.5 rounded-xl transition shadow-[0_2px_4px_rgba(0,0,0,0.08),inset_0_1px_0_rgba(255,255,255,0.7)] border ${
                    coupon.is_active
                      ? 'bg-gradient-to-r from-emerald-100 via-emerald-50 to-emerald-100 text-emerald-900 border-emerald-300 hover:from-emerald-200 hover:to-emerald-200'
                      : 'bg-gradient-to-r from-amber-100 via-amber-50 to-amber-100 text-amber-900 border-amber-300 hover:from-amber-200 hover:to-amber-200'
                  }`}
                >
                  {coupon.is_active ? '✅ Active' : '⏸️ Disabled'}
                </button>
                <span className="text-[9px] text-gray-400 font-bold">Added: {new Date(coupon.created_at).toLocaleDateString()}</span>
              </div>
            </div>
          );
        })}

        {filteredCoupons.length === 0 && (
          <div className="col-span-full py-16 text-center text-gray-400 text-sm font-medium border-2 border-dashed border-gray-200 rounded-3xl bg-gray-50">
            <Ticket className="w-12 h-12 mx-auto text-gray-300 mb-2" />
            {searchQuery || statusFilter !== 'ALL' || typeFilter !== 'ALL'
              ? 'No promotional codes match your search criteria.'
              : 'No coupon codes found. Click "Create New Code" to get started!'}
          </div>
        )}
      </div>

      {/* Pagination Footer */}
      {filteredCoupons.length > 0 && (
        <div className="bg-white p-4 rounded-3xl shadow-sm border border-emerald-100 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs font-semibold text-gray-700">
          <div className="text-gray-500">
            Showing <span className="font-extrabold text-emerald-900">{(currentPage - 1) * pageSize + 1}</span> to{' '}
            <span className="font-extrabold text-emerald-900">{Math.min(currentPage * pageSize, filteredCoupons.length)}</span> of{' '}
            <span className="font-extrabold text-emerald-900">{filteredCoupons.length}</span> coupons
          </div>

          <div className="flex items-center gap-1.5">
            <button
              disabled={currentPage === 1}
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              className="p-2 bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-xl disabled:opacity-40 font-bold transition flex items-center gap-1"
            >
              <ChevronLeft className="w-4 h-4" />
              <span>Previous</span>
            </button>
            <span className="px-3 py-1.5 bg-gradient-to-r from-emerald-700 to-emerald-900 text-white font-black rounded-xl shadow-xs">
              Page {currentPage} of {totalPages}
            </span>
            <button
              disabled={currentPage >= totalPages}
              onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
              className="p-2 bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-xl disabled:opacity-40 font-bold transition flex items-center gap-1"
            >
              <span>Next</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Floating Bottom Action Bar for Selected Coupons */}
      {selectedCouponIds.length > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-emerald-950/95 backdrop-blur-md text-white px-5 py-3 rounded-2xl shadow-2xl border border-emerald-700 flex items-center gap-4 z-40 animate-fadeIn text-xs">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-ping" />
            <span className="font-black text-amber-300">{selectedCouponIds.length} Selected</span>
          </div>

          <div className="h-4 w-px bg-emerald-800" />

          <button
            onClick={() => handleBulkToggleStatus(true)}
            className="px-3 py-1.5 bg-emerald-700 hover:bg-emerald-600 font-extrabold rounded-xl transition flex items-center gap-1.5 shadow-xs"
            title="Activate all selected coupons"
          >
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-300" />
            <span>Activate</span>
          </button>

          <button
            onClick={() => handleBulkToggleStatus(false)}
            className="px-3 py-1.5 bg-amber-600 hover:bg-amber-500 font-extrabold rounded-xl transition flex items-center gap-1.5 shadow-xs"
            title="Disable all selected coupons"
          >
            <ShieldAlert className="w-3.5 h-3.5 text-amber-200" />
            <span>Disable</span>
          </button>

          <button
            onClick={handleExportSelected}
            className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 font-extrabold rounded-xl transition flex items-center gap-1.5 shadow-xs"
            title="Export only selected coupons to CSV"
          >
            <Download className="w-3.5 h-3.5 text-blue-200" />
            <span>Export ({selectedCouponIds.length})</span>
          </button>

          <button
            onClick={handleBulkDeleteSelected}
            className="px-3 py-1.5 bg-rose-600 hover:bg-rose-500 font-extrabold rounded-xl transition flex items-center gap-1.5 shadow-xs"
            title="Delete all selected coupons"
          >
            <Trash2 className="w-3.5 h-3.5 text-rose-200" />
            <span>Delete</span>
          </button>

          <button
            onClick={() => setSelectedCouponIds([])}
            className="p-1.5 text-emerald-400 hover:text-white transition rounded-lg hover:bg-emerald-900"
            title="Clear selection"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {(showCreateModal || editingCoupon) && (
        <div className="fixed inset-0 bg-emerald-950/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-emerald-50/50">
              <h3 className="text-lg font-bold text-emerald-950 flex items-center gap-2">
                {editingCoupon ? <Edit2 className="w-5 h-5 text-blue-600" /> : <Tag className="w-5 h-5 text-emerald-600" />}
                {editingCoupon ? `Edit Coupon: ${editingCoupon.code}` : 'New Coupon Code'}
              </h3>
              <button onClick={() => {setShowCreateModal(false); setEditingCoupon(null);}} className="text-gray-400 hover:text-gray-600 transition">
                <Archive className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateOrUpdate} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Coupon Code *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. WELCOME10"
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl font-mono uppercase font-bold text-gray-900"
                  value={editingCoupon ? editingCoupon.code : newCoupon.code}
                  onChange={e => editingCoupon ? setEditingCoupon({...editingCoupon, code: e.target.value.toUpperCase()}) : setNewCoupon({...newCoupon, code: e.target.value.toUpperCase()})}
                  readOnly={!!editingCoupon} // Usually code isn't modified, but we could allow it. Let's make it readOnly for safety if editing.
                />
                {editingCoupon && <p className="text-[10px] text-gray-400 mt-0.5">Coupon code cannot be changed once created.</p>}
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Description</label>
                <input
                  type="text"
                  placeholder="e.g. 10% off for new customers"
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm"
                  value={editingCoupon ? editingCoupon.description : newCoupon.description}
                  onChange={e => editingCoupon ? setEditingCoupon({...editingCoupon, description: e.target.value}) : setNewCoupon({...newCoupon, description: e.target.value})}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Discount Type</label>
                  <select
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium"
                    value={editingCoupon ? editingCoupon.discount_type : newCoupon.discount_type}
                    onChange={e => editingCoupon ? setEditingCoupon({...editingCoupon, discount_type: e.target.value as any}) : setNewCoupon({...newCoupon, discount_type: e.target.value as any})}
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
                    value={editingCoupon ? editingCoupon.discount_value : newCoupon.discount_value}
                    onChange={e => editingCoupon ? setEditingCoupon({...editingCoupon, discount_value: Number(e.target.value)}) : setNewCoupon({...newCoupon, discount_value: Number(e.target.value)})}
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-gray-500 mb-1">Min. Order (₹)</label>
                  <input
                    type="number"
                    min="0"
                    placeholder="0"
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm"
                    value={(editingCoupon ? editingCoupon.min_order_value : newCoupon.min_order_value) || ''}
                    onChange={e => editingCoupon ? setEditingCoupon({...editingCoupon, min_order_value: Number(e.target.value)}) : setNewCoupon({...newCoupon, min_order_value: Number(e.target.value)})}
                  />
                </div>
                
                <div>
                  <label className="block text-[11px] font-bold text-gray-500 mb-1">Max Cap (₹)</label>
                  <input
                    type="number"
                    min="0"
                    placeholder="0"
                    disabled={editingCoupon ? editingCoupon.discount_type === 'FIXED' : newCoupon.discount_type === 'FIXED'}
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm disabled:opacity-50"
                    value={(editingCoupon ? editingCoupon.max_discount_value : newCoupon.max_discount_value) || ''}
                    onChange={e => editingCoupon ? setEditingCoupon({...editingCoupon, max_discount_value: Number(e.target.value)}) : setNewCoupon({...newCoupon, max_discount_value: Number(e.target.value)})}
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-amber-600 mb-1">Usage Limit</label>
                  <input
                    type="number"
                    min="0"
                    placeholder="No Limit"
                    className="w-full px-3 py-2 bg-amber-50/50 border border-amber-200 rounded-xl text-sm focus:ring-amber-500"
                    value={(editingCoupon ? editingCoupon.usage_limit : newCoupon.usage_limit) || ''}
                    onChange={e => editingCoupon ? setEditingCoupon({...editingCoupon, usage_limit: Number(e.target.value)}) : setNewCoupon({...newCoupon, usage_limit: Number(e.target.value)})}
                  />
                </div>
              </div>

              <div className="pt-4 border-t border-gray-100 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => {setShowCreateModal(false); setEditingCoupon(null);}}
                  className="px-4 py-2 text-gray-600 font-medium text-sm hover:bg-gray-100 rounded-xl transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 bg-emerald-700 text-white font-bold text-sm rounded-xl hover:bg-emerald-800 shadow transition"
                >
                  {editingCoupon ? 'Save Changes' : 'Create Coupon'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Confirmation Modal */}
      {confirmModal.isOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl">
            <h3 className={`text-lg font-bold flex items-center gap-2 mb-2 ${confirmModal.isDanger ? 'text-rose-600' : 'text-emerald-700'}`}>
              <ShieldAlert className="w-5 h-5" />
              {confirmModal.title}
            </h3>
            <p className="text-sm text-gray-600 mb-6">{confirmModal.message}</p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
                className="px-4 py-2 text-gray-600 font-bold hover:bg-gray-100 rounded-xl"
              >
                No, Cancel
              </button>
              <button
                onClick={confirmModal.onConfirm}
                className={`px-4 py-2 font-bold rounded-xl text-white shadow-sm ${confirmModal.isDanger ? 'bg-rose-600 hover:bg-rose-700' : 'bg-emerald-600 hover:bg-emerald-700'}`}
              >
                Yes, I'm sure
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Customer Cart Preview Modal */}
      {previewCoupon && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fadeIn" onClick={() => setPreviewCoupon(null)}>
          <div className="bg-white rounded-3xl max-w-sm w-full shadow-2xl overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="bg-gray-100 p-4 border-b border-gray-200">
              <h3 className="text-sm font-bold text-gray-700 text-center uppercase tracking-widest flex items-center justify-center gap-2">
                <Eye className="w-4 h-4 text-emerald-600" />
                Customer Cart Preview
              </h3>
            </div>
            <div className="p-8 bg-gray-50 flex justify-center items-center">
              <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-2 text-left min-w-[140px] max-w-[180px] shadow-sm transform hover:scale-105 transition duration-300">
                <div className="flex justify-between items-center mb-1 gap-2">
                  <span className="font-mono text-xs font-black text-emerald-900">{previewCoupon.code}</span>
                  {previewCoupon.discount_type === 'PERCENTAGE' ? (
                    <span className="text-[10px] font-bold text-amber-700 bg-amber-100 px-1.5 rounded">{previewCoupon.discount_value}%</span>
                  ) : (
                    <span className="text-[10px] font-bold text-amber-700 bg-amber-100 px-1.5 rounded">₹{previewCoupon.discount_value}</span>
                  )}
                </div>
                {previewCoupon.min_order_value ? (
                  <p className="text-[9px] text-emerald-700 font-bold leading-tight">
                    Valid on orders above ₹{previewCoupon.min_order_value}
                  </p>
                ) : (
                  <p className="text-[9px] text-emerald-700 leading-tight line-clamp-1">
                    {previewCoupon.description || 'Special Offer'}
                  </p>
                )}
              </div>
            </div>
            <div className="p-4 border-t border-gray-100 flex justify-center">
              <button
                onClick={() => setPreviewCoupon(null)}
                className="px-6 py-2 bg-emerald-600 text-white font-bold rounded-xl hover:bg-emerald-700 transition w-full"
              >
                Close Preview
              </button>
            </div>
          </div>
        </div>
      )}

      <ExportFormatModal
        isOpen={showExportModal}
        title="Export Coupons"
        totalRecords={coupons.length}
        onClose={() => setShowExportModal(false)}
        onExport={(format) => {
          handleExportCSV();
        }}
      />
    </div>
  );
}
