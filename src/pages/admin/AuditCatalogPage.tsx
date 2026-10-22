import React, { useState, useMemo, useEffect } from 'react';
import { RefreshSpinnerModal } from '../../components/common/RefreshSpinnerModal';
import {
  Boxes,
  Shield,
  AlertCircle,
  Clock,
  Filter,
  Download,
  Eye,
  X,
  RefreshCw,
  Package,
  Layers,
  Truck,
  DollarSign
} from 'lucide-react';
import { formatDateTime } from '../../lib/utils';
import { useAuth } from '../../contexts/AuthContext';
import { AdminPageSkeleton } from '../../components/common/Skeleton';
import type { AuditLog } from '../../types';

interface MockAuditLog extends AuditLog {
  user_name?: string;
  user_role?: string;
  description?: string;
  action: 'CREATE' | 'UPDATE' | 'DELETE' | 'LOGIN' | 'LOGOUT' | 'VIEW';
}

const PAGE_SIZE = 20;

function getActionStyle(action: string): string {
  switch (action) {
    case 'CREATE': return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300';
    case 'UPDATE': return 'bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300';
    case 'DELETE': return 'bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300';
    default: return 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400';
  }
}

export function AuditCatalogPage() {
  const { isSuperAdmin } = useAuth();
  const [logs, setLogs] = useState<MockAuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [selectedLog, setSelectedLog] = useState<MockAuditLog | null>(null);
  const [dateRange, setDateRange] = useState<string>('all');
  const [actionFilter, setActionFilter] = useState<string>('');
  const [currentPage, setCurrentPage] = useState(1);

  const loadLogs = async () => {
    setIsRefreshing(true);
    try {
      const { getJSONStore } = await import('../../lib/dbManager');
      const loaded = await getJSONStore<MockAuditLog>('audit_logs');
      if (loaded && loaded.length) {
        const catalogOnly = loaded.filter(l => 
          ['PRODUCTS', 'INVENTORY', 'CATEGORIES', 'SUPPLIERS'].includes((l.object_type || '').toUpperCase())
        );
        setLogs(catalogOnly);
      }
    } catch (err) {
      console.warn('Failed to load catalog audit logs:', err);
    } finally {
      setLoading(false);
      setTimeout(() => setIsRefreshing(false), 300);
    }
  };

  useEffect(() => {
    loadLogs();
  }, []);

  const filteredLogs = useMemo(() => {
    return logs.filter(l => {
      if (actionFilter && l.action !== actionFilter) return false;
      return true;
    });
  }, [logs, actionFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredLogs.length / PAGE_SIZE));
  const paginated = filteredLogs.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  if (!isSuperAdmin) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <AlertCircle className="w-10 h-10 text-red-500" />
        <h2 className="text-xl font-bold">Access Restricted</h2>
      </div>
    );
  }

  if (loading) {
    return <AdminPageSkeleton title="Catalog & Inventory Audit Trail" />;
  }

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-2xl bg-emerald-700 text-white shadow">
            <Boxes className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-emerald-100">📦 Catalog & Inventory Audit Trail</h1>
            <p className="text-sm text-gray-500 dark:text-emerald-400">
              Dedicated audit trail for product creations, price edits, stock movements & category changes
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={loadLogs}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white dark:bg-emerald-900 border border-emerald-200 dark:border-emerald-700 text-emerald-800 dark:text-emerald-200 text-sm font-bold shadow-xs cursor-pointer"
          >
            <RefreshCw className={`w-4 h-4 text-emerald-600 ${isRefreshing ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* Stats Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-emerald-950 p-4 rounded-2xl border border-emerald-100 dark:border-emerald-800 flex items-center gap-3">
          <div className="p-3 bg-emerald-100 dark:bg-emerald-900 rounded-xl">
            <Package className="w-5 h-5 text-emerald-700 dark:text-amber-400" />
          </div>
          <div>
            <p className="text-xs text-gray-500 dark:text-emerald-400 font-medium">Catalog Events</p>
            <p className="text-xl font-black text-gray-900 dark:text-emerald-100">{logs.length}</p>
          </div>
        </div>

        <div className="bg-white dark:bg-emerald-950 p-4 rounded-2xl border border-emerald-100 dark:border-emerald-800 flex items-center gap-3">
          <div className="p-3 bg-blue-100 dark:bg-blue-900/50 rounded-xl">
            <DollarSign className="w-5 h-5 text-blue-700 dark:text-blue-300" />
          </div>
          <div>
            <p className="text-xs text-gray-500 dark:text-emerald-400 font-medium">Product / Price Updates</p>
            <p className="text-xl font-black text-gray-900 dark:text-emerald-100">
              {logs.filter(l => l.action === 'UPDATE').length}
            </p>
          </div>
        </div>

        <div className="bg-white dark:bg-emerald-950 p-4 rounded-2xl border border-emerald-100 dark:border-emerald-800 flex items-center gap-3">
          <div className="p-3 bg-amber-100 dark:bg-amber-900/50 rounded-xl">
            <Layers className="w-5 h-5 text-amber-700 dark:text-amber-300" />
          </div>
          <div>
            <p className="text-xs text-gray-500 dark:text-emerald-400 font-medium">New SKU Additions</p>
            <p className="text-xl font-black text-gray-900 dark:text-emerald-100">
              {logs.filter(l => l.action === 'CREATE').length}
            </p>
          </div>
        </div>
      </div>

      {/* Logs Table */}
      <div className="bg-white dark:bg-emerald-950 rounded-3xl border border-emerald-100 dark:border-emerald-800 shadow-sm overflow-hidden">
        <table className="w-full text-left text-xs">
          <thead className="bg-emerald-50 dark:bg-emerald-900/60 text-emerald-900 dark:text-emerald-100 font-bold border-b border-emerald-100 dark:border-emerald-800">
            <tr>
              <th className="p-3.5">Timestamp</th>
              <th className="p-3.5">Action</th>
              <th className="p-3.5">Target SKU / Object</th>
              <th className="p-3.5">Description</th>
              <th className="p-3.5 text-right">View Diff</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-emerald-100 dark:divide-emerald-800/60">
            {paginated.map(log => (
              <tr key={log.id} className="hover:bg-emerald-50/50 dark:hover:bg-emerald-900/30 transition">
                <td className="p-3.5 font-mono text-gray-600 dark:text-emerald-300">{formatDateTime(log.created_at)}</td>
                <td className="p-3.5">
                  <span className={`px-2 py-0.5 rounded-md font-bold text-[10px] ${getActionStyle(log.action)}`}>
                    {log.action}
                  </span>
                </td>
                <td className="p-3.5 font-mono font-bold text-gray-800 dark:text-emerald-100">{log.object_id || log.object_type}</td>
                <td className="p-3.5 text-gray-700 dark:text-emerald-200">{log.description || 'N/A'}</td>
                <td className="p-3.5 text-right">
                  <button
                    onClick={() => setSelectedLog(log)}
                    className="p-1.5 bg-emerald-100 dark:bg-emerald-900 text-emerald-800 dark:text-emerald-200 rounded-lg hover:bg-emerald-200 cursor-pointer"
                  >
                    <Eye className="w-4 h-4" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Detail Modal */}
      {selectedLog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-emerald-950 p-6 rounded-3xl max-w-xl w-full border border-emerald-800 space-y-4">
            <div className="flex justify-between items-center border-b border-emerald-800 pb-3">
              <h3 className="font-bold text-sm text-emerald-800 dark:text-amber-300">Catalog Audit Detail ({selectedLog.id})</h3>
              <button onClick={() => setSelectedLog(null)} className="p-1 text-gray-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>
            <p className="text-xs text-gray-700 dark:text-emerald-200">{selectedLog.description}</p>
            <div className="bg-emerald-900 p-3 rounded-2xl text-xs font-mono text-amber-200 max-h-48 overflow-y-auto">
              <pre>{JSON.stringify(selectedLog.new_data || selectedLog, null, 2)}</pre>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
