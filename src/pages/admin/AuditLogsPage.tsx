import React, { useState, useMemo, useEffect } from 'react';
import { RefreshSpinnerModal } from '../../components/common/RefreshSpinnerModal';
import { AdminPageSkeleton } from '../../components/common/Skeleton';
import { useActionModal } from '../../contexts/ActionModalContext';
import {
  Shield,
  AlertCircle,
  Clock,
  User,
  Filter,
  Download,
  Eye,
  X,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  Boxes,
  ShoppingCart,
  Key,
  UserCheck,
  FileText,
  Sparkles,
  Database
} from 'lucide-react';
import { formatDateTime } from '../../lib/utils';
import { useAuth } from '../../contexts/AuthContext';
import type { AuditLog } from '../../types';

// ─── Local mock data ──────────────────────────────────────────────────────────

type AuditAction = 'CREATE' | 'UPDATE' | 'DELETE' | 'LOGIN' | 'LOGOUT' | 'VIEW';

interface MockAuditLog extends AuditLog {
  user_name?: string;
  user_role?: string;
  description?: string;
  action: AuditAction;
}



// ─── Constants ────────────────────────────────────────────────────────────────

const ACTION_OPTIONS: AuditAction[] = ['CREATE', 'UPDATE', 'DELETE', 'LOGIN', 'LOGOUT', 'VIEW'];

const DATE_RANGE_OPTIONS = [
  { value: 'today', label: 'Today' },
  { value: 'week', label: 'This Week' },
  { value: 'month', label: 'This Month' },
  { value: 'all', label: 'All Time' },
];

const PAGE_SIZE = 20;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getActionStyle(action: AuditAction): string {
  switch (action) {
    case 'CREATE': return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300';
    case 'UPDATE': return 'bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300';
    case 'DELETE': return 'bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300';
    case 'LOGIN': return 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400';
    case 'LOGOUT': return 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400';
    case 'VIEW': return 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300';
    default: return 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400';
  }
}

function getRoleStyle(role: string): string {
  switch (role) {
    case 'SUPER_ADMIN': return 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300';
    case 'ADMIN': return 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300';
    case 'STAFF': return 'bg-teal-100 text-teal-700 dark:bg-teal-900/40 dark:text-teal-300';
    case 'INVENTORY_MANAGER': return 'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300';
    case 'SALES_STAFF': return 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/40 dark:text-cyan-300';
    case 'DELIVERY_STAFF': return 'bg-lime-100 text-lime-700 dark:bg-lime-900/40 dark:text-lime-300';
    default: return 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300';
  }
}

function filterByDateRange(log: MockAuditLog, range: string): boolean {
  if (range === 'all') return true;
  const now = new Date();
  const logDate = new Date(log.created_at);
  if (range === 'today') {
    return logDate.toDateString() === now.toDateString();
  }
  if (range === 'week') {
    const weekAgo = new Date(now);
    weekAgo.setDate(now.getDate() - 7);
    return logDate >= weekAgo;
  }
  if (range === 'month') {
    const monthAgo = new Date(now);
    monthAgo.setDate(now.getDate() - 30);
    return logDate >= monthAgo;
  }
  return true;
}

function exportLogsToCSV(logs: MockAuditLog[]): void {
  if (!logs.length) return;
  const headers = ['ID', 'Timestamp', 'User Email', 'User Name', 'Role', 'Action', 'Module', 'Object ID', 'Description', 'IP Address'];
  const rows = logs.map((l) => [
    l.id,
    l.created_at,
    l.user_email ?? '',
    l.user_name ?? '',
    l.user_role ?? '',
    l.action,
    l.object_type ?? '',
    l.object_id ?? '',
    l.description ?? '',
    l.ip_address ?? '',
  ]);

  const escape = (v: string) => (v.includes(',') || v.includes('"') || v.includes('\n') ? `"${v.replace(/"/g, '""')}"` : v);
  const csv = [headers.map(escape).join(','), ...rows.map((r) => r.map(escape).join(','))].join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `mrvivasayi-audit-logs-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function JsonBlock({ data, label, color }: { data: Record<string, unknown> | undefined; label: string; color: 'gray' | 'green' | 'red' }) {
  const borderCls =
    color === 'green'
      ? 'border-emerald-300 dark:border-emerald-700'
      : color === 'red'
      ? 'border-red-300 dark:border-red-700'
      : 'border-gray-200 dark:border-emerald-800';
  const labelCls =
    color === 'green'
      ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300'
      : color === 'red'
      ? 'bg-red-50 text-red-700 dark:bg-red-900/40 dark:text-red-300'
      : 'bg-gray-50 text-gray-500 dark:bg-emerald-950 dark:text-emerald-400';

  return (
    <div className={`flex-1 min-w-0 rounded-xl border ${borderCls} overflow-hidden`}>
      <div className={`px-3 py-1.5 text-xs font-semibold ${labelCls}`}>{label}</div>
      <pre className="p-3 text-xs leading-relaxed overflow-auto max-h-64 font-mono text-gray-700 dark:text-emerald-200 bg-white dark:bg-emerald-950/60">
        {data ? JSON.stringify(data, null, 2) : 'null'}
      </pre>
    </div>
  );
}

function DetailModal({ log, onClose }: { log: MockAuditLog; onClose: () => void }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-fadeIn"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="relative w-full max-w-3xl bg-white dark:bg-emerald-950 rounded-3xl shadow-2xl border border-emerald-100 dark:border-emerald-800 overflow-hidden">
        {/* Modal header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-emerald-100 dark:border-emerald-800">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-emerald-100 dark:bg-emerald-900/60">
              <Eye className="w-4 h-4 text-emerald-700 dark:text-emerald-300" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 dark:text-emerald-100 text-sm">Audit Log Detail</h3>
              <p className="text-xs text-gray-400 dark:text-emerald-400 font-mono">{log.id}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-emerald-900/60 text-gray-400 dark:text-emerald-400 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Meta row */}
        <div className="px-6 py-4 grid grid-cols-2 sm:grid-cols-4 gap-3 border-b border-emerald-100 dark:border-emerald-800">
          <div>
            <p className="text-xs text-gray-400 dark:text-emerald-400 mb-1">Timestamp</p>
            <p className="text-xs font-medium text-gray-900 dark:text-emerald-100">{formatDateTime(log.created_at)}</p>
          </div>
          <div>
            <p className="text-xs text-gray-400 dark:text-emerald-400 mb-1">User</p>
            <p className="text-xs font-medium text-gray-900 dark:text-emerald-100 truncate">{log.user_email}</p>
          </div>
          <div>
            <p className="text-xs text-gray-400 dark:text-emerald-400 mb-1">Action</p>
            <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ${getActionStyle(log.action)}`}>
              {log.action}
            </span>
          </div>
          <div>
            <p className="text-xs text-gray-400 dark:text-emerald-400 mb-1">IP Address</p>
            <p className="text-xs font-medium font-mono text-gray-900 dark:text-emerald-100">{log.ip_address ?? '—'}</p>
          </div>
          <div className="col-span-2 sm:col-span-4">
            <p className="text-xs text-gray-400 dark:text-emerald-400 mb-1">Description</p>
            <p className="text-xs text-gray-700 dark:text-emerald-200">{log.description ?? '—'}</p>
          </div>
          {log.user_agent && (
            <div className="col-span-2 sm:col-span-4">
              <p className="text-xs text-gray-400 dark:text-emerald-400 mb-1">User Agent</p>
              <p className="text-xs font-mono text-gray-500 dark:text-emerald-400 truncate">{log.user_agent}</p>
            </div>
          )}
        </div>

        {/* Before / After JSON */}
        <div className="px-6 py-4 space-y-3">
          <p className="text-xs font-semibold text-gray-500 dark:text-emerald-400 uppercase tracking-wide">Data Changes</p>
          <div className="flex gap-3 flex-col sm:flex-row">
            <JsonBlock data={log.old_data} label="Before (old_data)" color="red" />
            <JsonBlock data={log.new_data} label="After (new_data)" color="green" />
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export function AuditLogsPage({ initialTab = 'audit' }: { initialTab?: 'audit' | 'catalog' | 'sales' | 'activity' | 'security' }) {
  const { isSuperAdmin } = useAuth();
  const [activeTab, setActiveTab] = useState<'audit' | 'catalog' | 'sales' | 'security' | 'activity'>(initialTab as any);

  useEffect(() => {
    setActiveTab(initialTab as any);
  }, [initialTab]);

  const [logs, setLogs] = useState<MockAuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const { showActionModal } = useActionModal();

  const loadAuditLogs = async () => {
    setIsRefreshing(true);
    try {
      const { getJSONStore } = await import('../../lib/dbManager');
      const loaded = await getJSONStore<MockAuditLog>('audit_logs');
      if (loaded && loaded.length) setLogs(loaded);
    } catch (err) {
      console.warn('Failed to load audit logs:', err);
    } finally {
      setLoading(false);
      setTimeout(() => setIsRefreshing(false), 300);
    }
  };

  useEffect(() => {
    loadAuditLogs();
  }, []);

  const [dateRange, setDateRange] = useState<string>('all');
  const [userFilter, setUserFilter] = useState<string>('');
  const [actionFilter, setActionFilter] = useState<string>('');
  const [objectTypeFilter, setObjectTypeFilter] = useState<string>('');
  const [selectedLog, setSelectedLog] = useState<MockAuditLog | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Live KPI counts
  const catalogCount = useMemo(() => logs.filter(l => ['PRODUCTS', 'INVENTORY', 'CATEGORIES', 'SUPPLIERS'].includes((l.object_type || '').toUpperCase())).length, [logs]);
  const salesCount = useMemo(() => logs.filter(l => ['ORDERS', 'POS', 'COUPONS', 'CUSTOMERS'].includes((l.object_type || '').toUpperCase())).length, [logs]);
  const securityCount = useMemo(() => logs.filter(l => ['AUTH', 'PERMISSIONS'].includes((l.object_type || '').toUpperCase()) || l.action === 'LOGIN' || l.action === 'LOGOUT').length, [logs]);
  const activityCount = useMemo(() => logs.filter(l => ['LOGIN', 'LOGOUT', 'UPDATE'].includes(l.action)).length, [logs]);

  // Filtered logs based on active submenu tab
  const filtered = useMemo(() => {
    return logs.filter((log) => {
      if (activeTab === 'catalog') {
        const objType = (log.object_type || '').toUpperCase();
        if (objType !== 'PRODUCTS' && objType !== 'INVENTORY' && objType !== 'CATEGORIES' && objType !== 'SUPPLIERS') return false;
      } else if (activeTab === 'sales') {
        const objType = (log.object_type || '').toUpperCase();
        if (objType !== 'ORDERS' && objType !== 'POS' && objType !== 'COUPONS' && objType !== 'CUSTOMERS') return false;
      } else if (activeTab === 'security') {
        const objType = (log.object_type || '').toUpperCase();
        if (objType !== 'AUTH' && objType !== 'PERMISSIONS' && log.action !== 'LOGIN' && log.action !== 'LOGOUT') return false;
      } else if (activeTab === 'activity') {
        if (log.action !== 'LOGIN' && log.action !== 'LOGOUT' && log.action !== 'UPDATE') return false;
      }

      if (!filterByDateRange(log, dateRange)) return false;
      if (userFilter && log.user_email !== userFilter) return false;
      if (actionFilter && log.action !== actionFilter) return false;
      if (objectTypeFilter && log.object_type !== objectTypeFilter) return false;
      return true;
    });
  }, [logs, activeTab, dateRange, userFilter, actionFilter, objectTypeFilter]);

  // Derived unique options
  const uniqueObjectTypes = useMemo(
    () => Array.from(new Set(logs.map((l) => l.object_type).filter(Boolean))) as string[],
    [logs]
  );
  const uniqueEmails = useMemo(
    () => Array.from(new Set(logs.map((l) => l.user_email).filter(Boolean))) as string[],
    [logs]
  );

  // Pagination
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  function handlePageChange(page: number) {
    setCurrentPage(Math.min(Math.max(1, page), totalPages));
  }

  function clearFilters() {
    setDateRange('all');
    setUserFilter('');
    setActionFilter('');
    setObjectTypeFilter('');
    setCurrentPage(1);
  }

  const hasActiveFilters = dateRange !== 'all' || userFilter || actionFilter || objectTypeFilter;

  // Access guard
  if (!isSuperAdmin) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <div className="p-4 rounded-full bg-red-100 dark:bg-red-900/30">
          <AlertCircle className="w-10 h-10 text-red-500" />
        </div>
        <h2 className="text-xl font-bold text-gray-900 dark:text-emerald-100">Access Restricted</h2>
        <p className="text-gray-500 dark:text-emerald-400 text-center max-w-xs">
          The Audit Trail is only accessible to Super Administrators.
        </p>
      </div>
    );
  }

  if (loading) {
    return <AdminPageSkeleton title="System Audit Trail & Compliance" />;
  }

  const handleExportCSV = () => {
    showActionModal({
      title: 'Generating Audit Compliance Export',
      subtitle: `Exporting ${filtered.length} compliance trail entries to CSV...`,
      badge: 'Audit Trail Engine',
      duration: 800,
      steps: [
        'Querying immutable ledger security timestamps...',
        'Formatting cryptographic log rows...',
        'Compiling CSV export file...',
        'Export completed successfully!'
      ],
      onComplete: () => {
        exportLogsToCSV(filtered);
      }
    });
  };

  return (
    <div className="space-y-6">
      {/* ── Page Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-2xl bg-emerald-700 dark:bg-emerald-800 shadow">
            <Shield className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold text-gray-900 dark:text-emerald-100">System Audit Trail</h1>
              <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300 border border-purple-200 dark:border-purple-800">
                <Shield className="w-3 h-3" />
                SUPER_ADMIN only
              </span>
            </div>
            <p className="text-sm text-gray-500 dark:text-emerald-400 mt-0.5">
              Complete record of all system actions and data changes
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={loadAuditLogs}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white dark:bg-emerald-900 border border-emerald-200 dark:border-emerald-700 text-emerald-800 dark:text-emerald-200 text-sm font-bold hover:bg-emerald-50 dark:hover:bg-emerald-800 transition-all shadow-xs cursor-pointer"
          >
            <RefreshCw className={`w-4 h-4 text-emerald-600 dark:text-amber-400 ${isRefreshing ? 'animate-spin' : ''}`} />
            Refresh Logs
          </button>
          <button
            onClick={handleExportCSV}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-sm font-extrabold transition-all shadow cursor-pointer"
          >
            <Download className="w-4 h-4" />
            Export CSV
          </button>
        </div>
      </div>

      {/* ── Submenu Navigation Bar ── */}
      <div className="flex flex-wrap items-center gap-2 bg-white dark:bg-emerald-950 p-2.5 rounded-3xl border border-emerald-100 dark:border-emerald-800 shadow-sm">
        <button
          onClick={() => { setActiveTab('audit'); setCurrentPage(1); }}
          className={`px-4 py-2 rounded-2xl text-xs font-extrabold transition-all flex items-center gap-2 cursor-pointer ${
            activeTab === 'audit'
              ? 'bg-emerald-700 text-white shadow-md'
              : 'bg-emerald-50/70 dark:bg-emerald-900/40 text-gray-700 dark:text-emerald-200 hover:bg-emerald-100'
          }`}
        >
          <Shield className="w-4 h-4 text-amber-300" />
          <span>📋 All System Trail Logs</span>
          <span className="px-2 py-0.5 rounded-full text-[10px] bg-emerald-950/60 text-amber-300 font-mono font-bold">{logs.length}</span>
        </button>

        <button
          onClick={() => { setActiveTab('catalog'); setCurrentPage(1); }}
          className={`px-4 py-2 rounded-2xl text-xs font-extrabold transition-all flex items-center gap-2 cursor-pointer ${
            activeTab === 'catalog'
              ? 'bg-emerald-700 text-white shadow-md'
              : 'bg-emerald-50/70 dark:bg-emerald-900/40 text-gray-700 dark:text-emerald-200 hover:bg-emerald-100'
          }`}
        >
          <Boxes className="w-4 h-4 text-emerald-400" />
          <span>📦 Catalog & Inventory Logs</span>
          <span className="px-2 py-0.5 rounded-full text-[10px] bg-emerald-950/60 text-amber-300 font-mono font-bold">{catalogCount}</span>
        </button>

        <button
          onClick={() => { setActiveTab('sales'); setCurrentPage(1); }}
          className={`px-4 py-2 rounded-2xl text-xs font-extrabold transition-all flex items-center gap-2 cursor-pointer ${
            activeTab === 'sales'
              ? 'bg-emerald-700 text-white shadow-md'
              : 'bg-emerald-50/70 dark:bg-emerald-900/40 text-gray-700 dark:text-emerald-200 hover:bg-emerald-100'
          }`}
        >
          <ShoppingCart className="w-4 h-4 text-blue-400" />
          <span>🛍️ Sales & POS Order Logs</span>
          <span className="px-2 py-0.5 rounded-full text-[10px] bg-emerald-950/60 text-amber-300 font-mono font-bold">{salesCount}</span>
        </button>

        <button
          onClick={() => { setActiveTab('security'); setCurrentPage(1); }}
          className={`px-4 py-2 rounded-2xl text-xs font-extrabold transition-all flex items-center gap-2 cursor-pointer ${
            activeTab === 'security'
              ? 'bg-emerald-700 text-white shadow-md'
              : 'bg-emerald-50/70 dark:bg-emerald-900/40 text-gray-700 dark:text-emerald-200 hover:bg-emerald-100'
          }`}
        >
          <Key className="w-4 h-4 text-purple-400" />
          <span>🔑 Auth & Security Event Logs</span>
          <span className="px-2 py-0.5 rounded-full text-[10px] bg-emerald-950/60 text-amber-300 font-mono font-bold">{securityCount}</span>
        </button>

        <button
          onClick={() => { setActiveTab('activity'); setCurrentPage(1); }}
          className={`px-4 py-2 rounded-2xl text-xs font-extrabold transition-all flex items-center gap-2 cursor-pointer ${
            activeTab === 'activity'
              ? 'bg-emerald-700 text-white shadow-md'
              : 'bg-emerald-50/70 dark:bg-emerald-900/40 text-gray-700 dark:text-emerald-200 hover:bg-emerald-100'
          }`}
        >
          <UserCheck className="w-4 h-4 text-teal-400" />
          <span>👤 User Activity Logs</span>
          <span className="px-2 py-0.5 rounded-full text-[10px] bg-emerald-950/60 text-amber-300 font-mono font-bold">{activityCount}</span>
        </button>
      </div>

      <RefreshSpinnerModal
        isOpen={isRefreshing}
        moduleName="Audit Trail Logs"
        title="Syncing System Audit Trail..."
        subtitle="Refreshing security logs & admin activity trace from database..."
        onComplete={() => setIsRefreshing(false)}
      />

      {/* ── Filter Bar ── */}
      <div className="bg-white dark:bg-emerald-900/40 rounded-2xl border border-emerald-100 dark:border-emerald-800 p-4">
        <div className="flex items-center gap-2 mb-3">
          <Filter className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
          <span className="text-sm font-semibold text-gray-700 dark:text-emerald-200">Filters</span>
          {hasActiveFilters && (
            <button
              onClick={clearFilters}
              className="ml-auto text-xs text-emerald-600 dark:text-emerald-400 hover:text-emerald-800 dark:hover:text-emerald-200 font-medium transition-colors"
            >
              Clear all
            </button>
          )}
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Date Range */}
          <div>
            <label className="block text-xs text-gray-400 dark:text-emerald-400 mb-1">Date Range</label>
            <select
              value={dateRange}
              onChange={(e) => { setDateRange(e.target.value); setCurrentPage(1); }}
              className="w-full px-3 py-2 rounded-xl border border-emerald-200 dark:border-emerald-700 bg-white dark:bg-emerald-950/60 text-sm text-gray-700 dark:text-emerald-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              {DATE_RANGE_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>

          {/* User filter */}
          <div>
            <label className="block text-xs text-gray-400 dark:text-emerald-400 mb-1">User</label>
            <select
              value={userFilter}
              onChange={(e) => { setUserFilter(e.target.value); setCurrentPage(1); }}
              className="w-full px-3 py-2 rounded-xl border border-emerald-200 dark:border-emerald-700 bg-white dark:bg-emerald-950/60 text-sm text-gray-700 dark:text-emerald-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              <option value="">All Users</option>
              {uniqueEmails.map((email) => (
                <option key={email} value={email}>{email}</option>
              ))}
            </select>
          </div>

          {/* Action filter */}
          <div>
            <label className="block text-xs text-gray-400 dark:text-emerald-400 mb-1">Action Type</label>
            <select
              value={actionFilter}
              onChange={(e) => { setActionFilter(e.target.value); setCurrentPage(1); }}
              className="w-full px-3 py-2 rounded-xl border border-emerald-200 dark:border-emerald-700 bg-white dark:bg-emerald-950/60 text-sm text-gray-700 dark:text-emerald-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              <option value="">All Actions</option>
              {ACTION_OPTIONS.map((a) => (
                <option key={a} value={a}>{a}</option>
              ))}
            </select>
          </div>

          {/* Object type filter */}
          <div>
            <label className="block text-xs text-gray-400 dark:text-emerald-400 mb-1">Module / Object Type</label>
            <select
              value={objectTypeFilter}
              onChange={(e) => { setObjectTypeFilter(e.target.value); setCurrentPage(1); }}
              className="w-full px-3 py-2 rounded-xl border border-emerald-200 dark:border-emerald-700 bg-white dark:bg-emerald-950/60 text-sm text-gray-700 dark:text-emerald-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              <option value="">All Modules</option>
              {uniqueObjectTypes.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* ── Stats row ── */}
      <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-emerald-400">
        <Clock className="w-4 h-4" />
        <span>
          Showing <span className="font-semibold text-gray-900 dark:text-emerald-100">{filtered.length}</span> log{filtered.length !== 1 ? 's' : ''}
          {hasActiveFilters ? ' matching current filters' : ' total'}
        </span>
      </div>

      {/* ── Table ── */}
      <div className="bg-white dark:bg-emerald-900/40 rounded-2xl border border-emerald-100 dark:border-emerald-800 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-emerald-50 dark:bg-emerald-950 border-b border-emerald-100 dark:border-emerald-800">
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-emerald-400 uppercase tracking-wide whitespace-nowrap">
                  Timestamp
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-emerald-400 uppercase tracking-wide whitespace-nowrap">
                  User
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-emerald-400 uppercase tracking-wide">
                  Action
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-emerald-400 uppercase tracking-wide whitespace-nowrap">
                  Module
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-emerald-400 uppercase tracking-wide whitespace-nowrap">
                  Object ID
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-emerald-400 uppercase tracking-wide">
                  Description
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-emerald-400 uppercase tracking-wide whitespace-nowrap">
                  IP Address
                </th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 dark:text-emerald-400 uppercase tracking-wide">
                  Detail
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-emerald-50 dark:divide-emerald-800">
              {logs.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-16 text-center">
                    <div className="flex flex-col items-center gap-3">
                      <div className="p-3.5 rounded-full bg-emerald-100 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-300 shadow-2xs">
                        <Shield className="w-8 h-8 text-emerald-600 dark:text-emerald-400" />
                      </div>
                      <h4 className="font-black text-sm text-gray-800 dark:text-emerald-100">No Audit Logs Recorded in Table</h4>
                      <p className="text-xs text-gray-500 dark:text-emerald-400 max-w-sm">No activity trail, catalog changes, or security audit events recorded in database yet.</p>
                    </div>
                  </td>
                </tr>
              ) : paginated.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center">
                    <div className="flex flex-col items-center gap-3">
                      <div className="p-3 rounded-full bg-gray-100 dark:bg-emerald-900/60">
                        <Shield className="w-6 h-6 text-gray-400 dark:text-emerald-500" />
                      </div>
                      <p className="text-sm font-bold text-gray-700 dark:text-emerald-300">No Results Found</p>
                      <p className="text-xs text-gray-500 dark:text-emerald-400">No audit logs match the selected filter criteria.</p>
                      {hasActiveFilters && (
                        <button onClick={clearFilters} className="text-xs text-emerald-600 dark:text-emerald-400 font-bold hover:underline">
                          Clear all filters
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ) : (
                paginated.map((log) => (
                  <tr
                    key={log.id}
                    onClick={() => setSelectedLog(log)}
                    className="hover:bg-emerald-50/60 dark:hover:bg-emerald-900/30 cursor-pointer transition-colors group"
                  >
                    {/* Timestamp */}
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-gray-300 dark:text-emerald-700 flex-shrink-0" />
                        <span className="text-xs text-gray-600 dark:text-emerald-300 font-mono">
                          {formatDateTime(log.created_at)}
                        </span>
                      </div>
                    </td>

                    {/* User */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full bg-emerald-100 dark:bg-emerald-800 flex items-center justify-center flex-shrink-0">
                          <User className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-medium text-gray-900 dark:text-emerald-100 truncate max-w-[140px]">
                            {log.user_name ?? log.user_email}
                          </p>
                          <div className="mt-0.5">
                            <span className={`inline-flex items-center rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${getRoleStyle(log.user_role ?? '')}`}>
                              {log.user_role}
                            </span>
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Action */}
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ${getActionStyle(log.action)}`}>
                        {log.action}
                      </span>
                    </td>

                    {/* Module */}
                    <td className="px-4 py-3">
                      <span className="text-xs text-gray-700 dark:text-emerald-200 font-medium">
                        {log.object_type ?? '—'}
                      </span>
                    </td>

                    {/* Object ID */}
                    <td className="px-4 py-3">
                      {log.object_id ? (
                        <span className="text-xs font-mono text-gray-500 dark:text-emerald-400 bg-gray-100 dark:bg-emerald-950/60 px-1.5 py-0.5 rounded">
                          {log.object_id}
                        </span>
                      ) : (
                        <span className="text-gray-300 dark:text-emerald-700">—</span>
                      )}
                    </td>

                    {/* Description */}
                    <td className="px-4 py-3 max-w-[220px]">
                      <p className="text-xs text-gray-600 dark:text-emerald-300 line-clamp-2">
                        {log.description ?? '—'}
                      </p>
                    </td>

                    {/* IP */}
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className="text-xs font-mono text-gray-400 dark:text-emerald-500">
                        {log.ip_address ?? '—'}
                      </span>
                    </td>

                    {/* Detail button */}
                    <td className="px-4 py-3 text-center">
                      <button
                        onClick={(e) => { e.stopPropagation(); setSelectedLog(log); }}
                        className="inline-flex items-center justify-center w-7 h-7 rounded-lg bg-gray-100 dark:bg-emerald-900/60 text-gray-400 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-800 hover:text-emerald-700 dark:hover:text-emerald-200 transition-colors group-hover:bg-emerald-100 dark:group-hover:bg-emerald-800"
                        title="View details"
                      >
                        <Eye className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* ── Pagination ── */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-emerald-100 dark:border-emerald-800">
            <p className="text-xs text-gray-500 dark:text-emerald-400">
              Page <span className="font-semibold text-gray-700 dark:text-emerald-200">{currentPage}</span> of{' '}
              <span className="font-semibold text-gray-700 dark:text-emerald-200">{totalPages}</span>
              {' · '}
              <span className="font-semibold text-gray-700 dark:text-emerald-200">{filtered.length}</span> total entries
            </p>
            <div className="flex items-center gap-1">
              <button
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage === 1}
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium border border-emerald-200 dark:border-emerald-700 text-gray-600 dark:text-emerald-300 hover:bg-emerald-50 dark:hover:bg-emerald-900/60 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
                Prev
              </button>
              {Array.from({ length: totalPages }, (_, i) => i + 1)
                .filter((p) => p === 1 || p === totalPages || Math.abs(p - currentPage) <= 1)
                .reduce<(number | '...')[]>((acc, p, i, arr) => {
                  if (i > 0 && (p as number) - (arr[i - 1] as number) > 1) acc.push('...');
                  acc.push(p);
                  return acc;
                }, [])
                .map((p, idx) =>
                  p === '...' ? (
                    <span key={`ellipsis-${idx}`} className="px-2 text-gray-400 dark:text-emerald-600 text-xs">…</span>
                  ) : (
                    <button
                      key={p}
                      onClick={() => handlePageChange(p as number)}
                      className={`w-7 h-7 rounded-lg text-xs font-medium transition-colors ${
                        currentPage === p
                          ? 'bg-emerald-700 text-white dark:bg-emerald-600'
                          : 'border border-emerald-200 dark:border-emerald-700 text-gray-600 dark:text-emerald-300 hover:bg-emerald-50 dark:hover:bg-emerald-900/60'
                      }`}
                    >
                      {p}
                    </button>
                  )
                )}
              <button
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage === totalPages}
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium border border-emerald-200 dark:border-emerald-700 text-gray-600 dark:text-emerald-300 hover:bg-emerald-50 dark:hover:bg-emerald-900/60 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                Next
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ── Detail Modal ── */}
      {selectedLog && (
        <DetailModal log={selectedLog} onClose={() => setSelectedLog(null)} />
      )}
    </div>
  );
}

export default AuditLogsPage;
