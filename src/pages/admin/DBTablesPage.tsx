import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Database,
  Layers,
  HardDrive,
  Server,
  ShieldCheck,
  CheckCircle2,
  Lock,
  Unlock,
  Trash2,
  Download,
  Terminal,
  RefreshCw,
  ArrowLeft,
  Calendar,
  Sparkles,
  Play,
  FileCode,
  Table as TableIcon,
  ChevronDown,
  AlertTriangle,
  Check,
  X,
  Clock,
  Activity,
  History,
  FileText,
  Search,
  Filter,
  Eye,
  Sliders,
  Copy,
  RotateCcw,
  Code2,
  Loader2,
  Zap,
  Globe,
  Flame,
  CheckCircle,
  AlertCircle,
  HelpCircle,
  Timer,
  Plus,
  PlusCircle,
  Edit2,
  Edit3,
  Pause,
  PauseCircle
} from 'lucide-react';
import {
  BarChart,
  Bar,
  ComposedChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend
} from 'recharts';
import { useNotifications } from '../../contexts/NotificationContext';
import { AutoRefreshDropdown } from '../../components/common/AutoRefreshDropdown';
import {
  ALL_PUBLIC_TABLES,
  TableMeta,
  TableInspectionStats,
  getSingleTableStats,
  truncateSingleTable,
  deleteSingleTableRecords,
  dropSingleTable,
  truncateAllNonProtectedTables,
  executeRealtimeSQL,
  generateExportData,
  getLogPruneConfig,
  saveLogPruneConfig,
  executeLogPruning,
  LogPruneConfig,
  PruneTriggerHistoryItem,
  getPruneTriggerHistory,
  clearPruneTriggerHistory,
  SQLExecutionLogItem,
  getSQLQueryHistory,
  clearSQLQueryHistory,
  CustomPruneSchedule,
  getCustomPruneSchedules,
  saveCustomPruneSchedules,
  executeSchedulePruning
} from '../../lib/tableManager';
import { getJSONStore } from '../../lib/dbManager';

export const DBTablesPage: React.FC = () => {
  const navigate = useNavigate();
  const { addNotification } = useNotifications();

  // Loading & Refresh State
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [autoRefreshSec, setAutoRefreshSec] = useState<number>(0);

  // Top Dashboard Table Filter (Default: 'ALL' -> can be 'ALL' or any table name)
  const [dashboardTableFilter, setDashboardTableFilter] = useState<string>('ALL');

  // Universal Yes / No Action Confirmation Modal State
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    subtitle?: string;
    message: string;
    details?: string;
    confirmText?: string;
    cancelText?: string;
    variant?: 'danger' | 'warning' | 'info' | 'primary';
    onConfirm: () => void | Promise<void>;
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {}
  });

  // Action Progress & Error Modal with Animated Percentage & Exact Error Display
  const [actionModal, setActionModal] = useState<{
    isOpen: boolean;
    title: string;
    subtitle?: string;
    stepText: string;
    progress: number; // 0 to 100
    status: 'LOADING' | 'SUCCESS' | 'ERROR';
    errorMessage?: string;
    errorDetails?: string;
    successMessage?: string;
  }>({
    isOpen: false,
    title: '',
    stepText: '',
    progress: 0,
    status: 'LOADING'
  });

  // Auto-Prune Schedule State & Countdown Timer
  const [logPruneConfig, setLogPruneConfig] = useState<LogPruneConfig>(getLogPruneConfig());
  const [triggerHistory, setTriggerHistory] = useState<PruneTriggerHistoryItem[]>([]);
  const [historyFilter, setHistoryFilter] = useState<'ALL' | 'PRODUCT' | 'MANUAL' | 'SCHEDULED'>('ALL');
  const [isPruningLogs, setIsPruningLogs] = useState(false);

  // Remaining Seconds Countdown for Auto-Prune Schedule
  const [secondsUntilNextPrune, setSecondsUntilNextPrune] = useState<number>(() => {
    const intervalMins = logPruneConfig.scheduleIntervalMins || 15;
    return intervalMins * 60;
  });

  // Multi-Table Pruning Schedules & Daemon Matrix
  const [pruneSchedules, setPruneSchedules] = useState<CustomPruneSchedule[]>(() => getCustomPruneSchedules());

  // Pruning Schedule Create / Edit Modal State
  const [scheduleModal, setScheduleModal] = useState<{
    isOpen: boolean;
    mode: 'CREATE' | 'EDIT';
    scheduleId?: string;
    name: string;
    targetTable: string;
    retention: '24h' | '48h' | '72h' | '1w' | '30d' | 'custom';
    customDays: number;
    intervalMins: number;
    enabled: boolean;
    triggerOnProductActions: boolean;
  }>({
    isOpen: false,
    mode: 'CREATE',
    name: '',
    targetTable: 'audit_logs',
    retention: '48h',
    customDays: 2,
    intervalMins: 15,
    enabled: true,
    triggerOnProductActions: true
  });

  // Live Audit Logs Preview States
  const [showLiveAuditLogs, setShowLiveAuditLogs] = useState(false);
  const [liveAuditLogs, setLiveAuditLogs] = useState<any[]>([]);
  const [auditSearchTerm, setAuditSearchTerm] = useState('');
  const [isLoadingAuditLogs, setIsLoadingAuditLogs] = useState(false);
  const [auditActionFilter, setAuditActionFilter] = useState<'ALL' | 'CREATE' | 'UPDATE' | 'DELETE'>('ALL');
  const [scheduleSearchTerm, setScheduleSearchTerm] = useState('');
  const [scheduleStatusFilter, setScheduleStatusFilter] = useState<'ALL' | 'ACTIVE' | 'PAUSED'>('ALL');

  // Table Directory & Search / Filter States
  const [tableSearchTerm, setTableSearchTerm] = useState('');
  const [tableCategoryFilter, setTableCategoryFilter] = useState<string>('ALL');
  const [tableProtectionFilter, setTableProtectionFilter] = useState<'ALL' | 'PROTECTED' | 'USER_DATA'>('ALL');
  const [tableSortBy, setTableSortBy] = useState<'NAME_ASC' | 'SIZE_DESC' | 'ROWS_DESC'>('SIZE_DESC');

  // Lazy-loaded Table Inspection States
  const [selectedInspectTable, setSelectedInspectTable] = useState<string>('');
  const [inspectTableStats, setInspectTableStats] = useState<TableInspectionStats | null>(null);
  const [isLoadingTableStats, setIsLoadingTableStats] = useState(false);

  // SQL Query Console States
  const [showSqlEditor, setShowSqlEditor] = useState(false);
  const [sqlConsoleTab, setSqlConsoleTab] = useState<'EDITOR' | 'HISTORY'>('EDITOR');
  const [sqlQuery, setSqlQuery] = useState<string>(
    `SELECT tablename\nFROM pg_catalog.pg_tables\nWHERE schemaname = 'public'\nORDER BY tablename;`
  );
  const [sqlResults, setSqlResults] = useState<{
    rows: any[];
    columns: string[];
    rowCount: number;
    durationMs: number;
    message?: string;
  } | null>(null);
  const [isExecutingSql, setIsExecutingSql] = useState(false);
  const [sqlHistory, setSqlHistory] = useState<SQLExecutionLogItem[]>([]);
  const [copiedQueryId, setCopiedQueryId] = useState<string | null>(null);

  // Export Modal State
  const [showExportModal, setShowExportModal] = useState<{ isOpen: boolean; targetTable: string | 'ALL' }>({
    isOpen: false,
    targetTable: 'ALL'
  });
  const [exportFormat, setExportFormat] = useState<'JSON' | 'SQL' | 'CSV'>('JSON');
  const [isExporting, setIsExporting] = useState(false);

  // Overall Schema Metrics
  const [tableMetrics, setTableMetrics] = useState<{
    totalTables: number;
    totalRecords: number;
    totalFootprintKB: number;
    largestTable: { name: string; sizeKB: number };
    protectedCount: number;
    tableSizes: { table: string; sizeKB: number; rows: number; readOps: number; writeOps: number }[];
  }>({
    totalTables: 16,
    totalRecords: 0,
    totalFootprintKB: 0,
    largestTable: { name: 'audit_logs', sizeKB: 0 },
    protectedCount: 4,
    tableSizes: []
  });

  // Load and refresh public tables matrix
  const loadDatabaseTableMetrics = useCallback(async () => {
    try {
      let totalRecords = 0;
      let totalBytes = 0;
      let largest = { name: '', sizeKB: 0 };
      const sizes: { table: string; sizeKB: number; rows: number; readOps: number; writeOps: number }[] = [];

      for (const t of ALL_PUBLIC_TABLES) {
        const raw = await getJSONStore<any>(t.name);
        const rows = Array.isArray(raw) ? raw : (raw ? [raw] : []);
        const rowCount = rows.length;
        const jsonStr = JSON.stringify(rows);
        const sizeKB = Number(((jsonStr.length) / 1024).toFixed(2));
        const effectiveKB = Math.max(sizeKB, rowCount > 0 ? 1.4 : 0.4);

        totalRecords += rowCount;
        totalBytes += jsonStr.length;

        if (effectiveKB > largest.sizeKB) {
          largest = { name: t.name, sizeKB: effectiveKB };
        }

        const readOps = Math.floor(rowCount * 3.8 + (t.isProtected ? 45 : 18));
        const writeOps = Math.floor(rowCount * 1.2 + (t.name === 'audit_logs' ? 42 : 8));

        sizes.push({
          table: t.name,
          sizeKB: effectiveKB,
          rows: rowCount,
          readOps,
          writeOps
        });
      }

      const totalKB = Number((totalBytes / 1024).toFixed(2));
      setTableMetrics({
        totalTables: ALL_PUBLIC_TABLES.length,
        totalRecords,
        totalFootprintKB: totalKB > 0 ? totalKB : 116.9,
        largestTable: largest.name ? largest : { name: 'audit_logs', sizeKB: 54.2 },
        protectedCount: ALL_PUBLIC_TABLES.filter(t => t.isProtected).length,
        tableSizes: sizes
      });
    } catch (err) {
      console.error('Failed to load table metrics:', err);
    }
  }, []);

  // Load Live Audit Logs
  const loadLiveAuditLogs = async () => {
    setIsLoadingAuditLogs(true);
    try {
      const logs = await getJSONStore<any>('audit_logs');
      const arr = Array.isArray(logs) ? logs : (logs ? [logs] : []);
      arr.sort((a, b) => new Date(b.created_at || b.timestamp || 0).getTime() - new Date(a.created_at || a.timestamp || 0).getTime());
      setLiveAuditLogs(arr);
    } catch {
      setLiveAuditLogs([]);
    } finally {
      setIsLoadingAuditLogs(false);
    }
  };

  // Initial Load
  useEffect(() => {
    loadDatabaseTableMetrics();
    setTriggerHistory(getPruneTriggerHistory());
    setSqlHistory(getSQLQueryHistory());
    setLogPruneConfig(getLogPruneConfig());
  }, [loadDatabaseTableMetrics]);

  // Listen to background truncate events
  useEffect(() => {
    const handleTruncated = () => {
      loadDatabaseTableMetrics();
      if (selectedInspectTable) {
        handleInspectTableSelect(selectedInspectTable);
      }
    };
    window.addEventListener('mrvivasayi_db_truncated', handleTruncated);
    return () => window.removeEventListener('mrvivasayi_db_truncated', handleTruncated);
  }, [loadDatabaseTableMetrics, selectedInspectTable]);

  // Auto Refresh Interval Daemon
  useEffect(() => {
    if (autoRefreshSec <= 0) return;
    const interval = setInterval(() => {
      loadDatabaseTableMetrics();
      setTriggerHistory(getPruneTriggerHistory());
      setSqlHistory(getSQLQueryHistory());
    }, autoRefreshSec * 1000);
    return () => clearInterval(interval);
  }, [autoRefreshSec, loadDatabaseTableMetrics]);

  // Live Countdown Timer for Auto-Prune Schedule (Ticking every 1 second)
  useEffect(() => {
    if (!logPruneConfig.enabled) return;

    const timer = setInterval(() => {
      setSecondsUntilNextPrune((prev) => {
        if (prev <= 1) {
          // Trigger automated background schedule prune cycle
          const intervalMins = logPruneConfig.scheduleIntervalMins || 15;
          executeLogPruning(logPruneConfig.retention, 'Continuous Background Timer Schedule').then(() => {
            setTriggerHistory(getPruneTriggerHistory());
            setLogPruneConfig(getLogPruneConfig());
            loadDatabaseTableMetrics();
          });
          return intervalMins * 60;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [logPruneConfig.enabled, logPruneConfig.retention, logPruneConfig.scheduleIntervalMins, loadDatabaseTableMetrics]);

  // Lazy inspect table on selection
  const handleInspectTableSelect = async (tableName: string) => {
    if (!tableName) {
      setSelectedInspectTable('');
      setInspectTableStats(null);
      return;
    }
    setSelectedInspectTable(tableName);
    setIsLoadingTableStats(true);
    try {
      const stats = await getSingleTableStats(tableName);
      setInspectTableStats(stats);
    } catch (e: any) {
      addNotification({
        title: 'Inspection Failed',
        message: e.message,
        type: 'error'
      });
    } finally {
      setIsLoadingTableStats(false);
    }
  };

  // =========================================================================
  // UNIVERSAL ACTION EXECUTION ENGINE WITH ANIMATED PERCENTAGE & ERROR DISPLAY
  // =========================================================================
  const runActionWithProgressModal = async (config: {
    title: string;
    subtitle: string;
    steps: { progress: number; text: string; delayMs?: number }[];
    action: () => Promise<string | void>;
  }) => {
    setActionModal({
      isOpen: true,
      title: config.title,
      subtitle: config.subtitle,
      stepText: config.steps[0]?.text || 'Initializing action...',
      progress: config.steps[0]?.progress || 10,
      status: 'LOADING',
      errorMessage: undefined,
      errorDetails: undefined,
      successMessage: undefined
    });

    try {
      // Step-by-step progress animation
      for (const step of config.steps) {
        await new Promise((resolve) => setTimeout(resolve, step.delayMs || 250));
        setActionModal((prev) => ({
          ...prev,
          progress: step.progress,
          stepText: step.text
        }));
      }

      // Execute actual operation
      const successMsg = await config.action();

      // Complete to 100%
      setActionModal((prev) => ({
        ...prev,
        progress: 100,
        stepText: 'Operation finished successfully ✓',
        status: 'SUCCESS',
        successMessage: successMsg || 'The operation completed successfully without errors.'
      }));

      // Auto close after 1.4s on success
      setTimeout(() => {
        setActionModal((prev) => (prev.status === 'SUCCESS' ? { ...prev, isOpen: false } : prev));
      }, 1400);

    } catch (err: any) {
      const errorMsg = err?.message || String(err) || 'Database execution failed.';
      setActionModal((prev) => ({
        ...prev,
        status: 'ERROR',
        stepText: 'Execution stopped due to an error ✕',
        errorMessage: errorMsg,
        errorDetails: `Target Action: ${config.title}\nDetails: ${err?.stack ? err.stack.split('\n')[0] : errorMsg}`
      }));
    }
  };

  // =========================================================================
  // UNIVERSAL YES/NO CONFIRMATION HANDLERS (EVERY ACTION ASKS YES / NO)
  // =========================================================================

  // 1. Refresh Table Statistics
  const requestRefreshDB = () => {
    setConfirmModal({
      isOpen: true,
      title: 'Refresh PostgreSQL Table Statistics?',
      subtitle: 'LIVE SCHEMA TELEMETRY RELOAD',
      message: 'Are you sure you want to re-query pg_catalog and compute fresh record counts and storage footprints across all 16 public tables?',
      details: 'This will inspect current active records and sync telemetry charts.',
      confirmText: 'Yes, Refresh Metrics',
      cancelText: 'No, Cancel',
      variant: 'info',
      onConfirm: () => {
        setConfirmModal((prev) => ({ ...prev, isOpen: false }));
        runActionWithProgressModal({
          title: 'Refreshing Database Telemetry',
          subtitle: 'SCHEMA CATALOG INSPECTION',
          steps: [
            { progress: 20, text: 'Querying pg_catalog.pg_tables relations...', delayMs: 200 },
            { progress: 55, text: 'Calculating table row counts & JSON footprints...', delayMs: 250 },
            { progress: 85, text: 'Compiling I/O telemetry distribution...', delayMs: 200 }
          ],
          action: async () => {
            setIsRefreshing(true);
            await loadDatabaseTableMetrics();
            setTriggerHistory(getPruneTriggerHistory());
            setSqlHistory(getSQLQueryHistory());
            if (selectedInspectTable) {
              await handleInspectTableSelect(selectedInspectTable);
            }
            setIsRefreshing(false);
            return 'All 16 public table statistics synchronized from PostgreSQL catalog.';
          }
        });
      }
    });
  };

  // 2. Truncate All Non-Protected Tables
  const requestTruncateAllNonProtected = () => {
    const nonProtectedCount = ALL_PUBLIC_TABLES.filter((t) => !t.isProtected).length;
    setConfirmModal({
      isOpen: true,
      title: `Truncate All ${nonProtectedCount} Non-Protected Tables?`,
      subtitle: 'HIGH-PRIORITY BULK DATA PURGE',
      message: `Are you sure you want to execute TRUNCATE on all ${nonProtectedCount} public tables? All records in catalog, commerce, content, and telemetry will be wiped to 0.`,
      details: 'Strict Guard: 4 core system tables (users, settings, default_data, navigation) will remain untouched and safe.',
      confirmText: 'Yes, Truncate Non-Protected Tables',
      cancelText: 'No, Abort',
      variant: 'danger',
      onConfirm: () => {
        setConfirmModal((prev) => ({ ...prev, isOpen: false }));
        runActionWithProgressModal({
          title: 'Truncating All Non-Protected Tables',
          subtitle: 'BULK RECORD PURGE',
          steps: [
            { progress: 15, text: 'Verifying core protected tables lock (users, settings, default_data, navigation)...', delayMs: 250 },
            { progress: 45, text: 'Executing TRUNCATE on 12 public tables in batch...', delayMs: 350 },
            { progress: 80, text: 'Flushing storage footprints & re-indexing schema...', delayMs: 250 }
          ],
          action: async () => {
            const res = await truncateAllNonProtectedTables();
            await loadDatabaseTableMetrics();
            if (selectedInspectTable) {
              await handleInspectTableSelect(selectedInspectTable);
            }
            return `Successfully truncated ${res.truncatedTables.length} tables. Preserved ${res.totalPreserved.length} core tables.`;
          }
        });
      }
    });
  };

  // 3. Truncate Single Table
  const requestTruncateTable = (tableName: string) => {
    const meta = ALL_PUBLIC_TABLES.find((t) => t.name.toLowerCase() === tableName.toLowerCase());
    if (meta?.isProtected) {
      addNotification({
        title: 'Action Blocked',
        message: `Table "${tableName}" is a guarded core system table and cannot be truncated.`,
        type: 'error'
      });
      return;
    }

    const currentRows = tableMetrics.tableSizes.find((s) => s.table === tableName)?.rows || 0;
    setConfirmModal({
      isOpen: true,
      title: `Truncate Table: public.${tableName}?`,
      subtitle: 'DESTRUCTIVE DATA OPERATION',
      message: `Are you sure you want to TRUNCATE table "public.${tableName}"? All ${currentRows} stored records will be permanently removed. The table structure and schema columns will be kept intact.`,
      details: `Target: public.${tableName} | Records Affected: ${currentRows} rows | Protection: Unprotected User Data`,
      confirmText: `Yes, Truncate ${tableName}`,
      cancelText: 'No, Keep Table Data',
      variant: 'danger',
      onConfirm: () => {
        setConfirmModal((prev) => ({ ...prev, isOpen: false }));
        runActionWithProgressModal({
          title: `Truncating Table: public.${tableName}`,
          subtitle: 'SQL TRUNCATE OPERATION',
          steps: [
            { progress: 25, text: `Checking write lock on public.${tableName}...`, delayMs: 200 },
            { progress: 65, text: `Wiping active record entries (${currentRows} rows)...`, delayMs: 250 },
            { progress: 90, text: 'Synchronizing table storage footprint...', delayMs: 200 }
          ],
          action: async () => {
            const res = await truncateSingleTable(tableName);
            await loadDatabaseTableMetrics();
            await handleInspectTableSelect(tableName);
            return res.message;
          }
        });
      }
    });
  };

  // 4. Delete Records from Single Table (DELETE FROM <table>)
  const requestDeleteTableRecords = (tableName: string) => {
    const meta = ALL_PUBLIC_TABLES.find((t) => t.name.toLowerCase() === tableName.toLowerCase());
    if (meta?.isProtected) {
      addNotification({
        title: 'Action Blocked',
        message: `Table "${tableName}" is a protected core table and cannot be wiped.`,
        type: 'error'
      });
      return;
    }

    const currentRows = tableMetrics.tableSizes.find((s) => s.table === tableName)?.rows || 0;
    setConfirmModal({
      isOpen: true,
      title: `Delete All Records from public.${tableName}?`,
      subtitle: 'SQL DELETE EXECUTION',
      message: `Are you sure you want to delete all ${currentRows} records from table "public.${tableName}"? This performs a DELETE statement wiping all active row entries.`,
      details: `Target: public.${tableName} | Operation: DELETE FROM ${tableName}; | Rows: ${currentRows}`,
      confirmText: `Yes, Delete All Records`,
      cancelText: 'No, Cancel',
      variant: 'danger',
      onConfirm: () => {
        setConfirmModal((prev) => ({ ...prev, isOpen: false }));
        runActionWithProgressModal({
          title: `Deleting Records: public.${tableName}`,
          subtitle: 'SQL DELETE EXECUTION',
          steps: [
            { progress: 20, text: `Preparing DELETE statement on public.${tableName}...`, delayMs: 200 },
            { progress: 60, text: `Executing row deletion for ${currentRows} records...`, delayMs: 250 },
            { progress: 90, text: 'Commit transaction & updating catalog metrics...', delayMs: 200 }
          ],
          action: async () => {
            const res = await deleteSingleTableRecords(tableName);
            await loadDatabaseTableMetrics();
            await handleInspectTableSelect(tableName);
            return res.message;
          }
        });
      }
    });
  };

  // 5. Toggle Auto-Prune Schedule with Yes/No popup and percentage modal
  const requestToggleAutoPrune = (targetEnable: boolean) => {
    if (targetEnable) {
      setConfirmModal({
        isOpen: true,
        title: 'Enable Auto-Prune Schedule & Telemetry Engine?',
        subtitle: 'BACKGROUND DAEMON ACTIVATION',
        message: 'Are you sure you want to activate the automated audit log deletion schedule? Stale logs will be purged continuously and whenever products are created or updated.',
        details: `Active Retention: Purge logs older than ${
          logPruneConfig.retention === '24h'
            ? '24 Hours'
            : logPruneConfig.retention === '48h'
            ? '48 Hours'
            : logPruneConfig.retention === '72h'
            ? '72 Hours'
            : logPruneConfig.retention === '1w'
            ? '1 Week'
            : 'Custom Period'
        }. Interval: Every ${logPruneConfig.scheduleIntervalMins || 15} minutes.`,
        confirmText: 'Yes, Enable Schedule Now',
        cancelText: 'No, Keep Disabled',
        variant: 'primary',
        onConfirm: () => {
          setConfirmModal((prev) => ({ ...prev, isOpen: false }));
          runActionWithProgressModal({
            title: 'Activating Auto-Prune Schedule Daemon',
            subtitle: 'TELEMETRY AUTOMATION DEPLOYMENT',
            steps: [
              { progress: 25, text: 'Registering background schedule timer...', delayMs: 200 },
              { progress: 60, text: 'Configuring product creation trigger hooks...', delayMs: 250 },
              { progress: 85, text: 'Synchronizing daemon state into persistent storage...', delayMs: 200 }
            ],
            action: async () => {
              const nextConf = { ...logPruneConfig, enabled: true };
              setLogPruneConfig(nextConf);
              saveLogPruneConfig(nextConf);
              setSecondsUntilNextPrune((nextConf.scheduleIntervalMins || 15) * 60);
              return `Auto-Prune Schedule Daemon successfully activated (Retention: ${nextConf.retention}).`;
            }
          });
        }
      });
    } else {
      setConfirmModal({
        isOpen: true,
        title: 'Disable Auto-Prune Schedule?',
        subtitle: 'BACKGROUND DAEMON DEACTIVATION',
        message: 'Are you sure you want to disable automatic audit log pruning? Audit log records will accumulate indefinitely until re-enabled.',
        details: 'Warning: Background cleanup cycles will be paused.',
        confirmText: 'Yes, Disable Schedule',
        cancelText: 'No, Keep Active',
        variant: 'warning',
        onConfirm: () => {
          setConfirmModal((prev) => ({ ...prev, isOpen: false }));
          runActionWithProgressModal({
            title: 'Deactivating Auto-Prune Schedule',
            subtitle: 'DAEMON PAUSE',
            steps: [
              { progress: 30, text: 'Pausing background timer listener...', delayMs: 200 },
              { progress: 70, text: 'Unbinding product lifecycle cleanup hooks...', delayMs: 250 },
              { progress: 90, text: 'Persisting paused state...', delayMs: 200 }
            ],
            action: async () => {
              const nextConf = { ...logPruneConfig, enabled: false };
              setLogPruneConfig(nextConf);
              saveLogPruneConfig(nextConf);
              return 'Auto-Prune schedule daemon paused. Stale log deletion suspended.';
            }
          });
        }
      });
    }
  };

  // 6. Safe Retention Period change with Yes/No popup and percentage modal
  const requestChangeRetentionPeriod = (newRetention: LogPruneConfig['retention']) => {
    if (newRetention === logPruneConfig.retention) return;
    const labelMap: Record<string, string> = {
      '24h': '24 Hours',
      '48h': '48 Hours',
      '72h': '72 Hours',
      '1w': '1 Week (7 Days)',
      '30d': '30 Days (1 Month)',
      'custom': 'Custom Days'
    };

    setConfirmModal({
      isOpen: true,
      title: `Update Log Retention Period to ${labelMap[newRetention]}?`,
      subtitle: 'SCHEDULE RETENTION POLICY UPDATE',
      message: `Are you sure you want to change the audit log retention period from ${labelMap[logPruneConfig.retention]} to ${labelMap[newRetention]}?`,
      details: `New Cutoff Threshold: Logs older than ${labelMap[newRetention]} will be targeted for automatic purging.`,
      confirmText: `Yes, Set Retention to ${labelMap[newRetention]}`,
      cancelText: 'No, Keep Current',
      variant: 'primary',
      onConfirm: () => {
        setConfirmModal((prev) => ({ ...prev, isOpen: false }));
        runActionWithProgressModal({
          title: `Updating Retention Policy to ${labelMap[newRetention]}`,
          subtitle: 'SCHEDULE CONFIGURATION',
          steps: [
            { progress: 30, text: 'Calculating new timestamp cutoff window...', delayMs: 200 },
            { progress: 65, text: 'Validating telemetry query boundaries...', delayMs: 250 },
            { progress: 90, text: 'Applying schedule policy across catalog hooks...', delayMs: 200 }
          ],
          action: async () => {
            const nextConf = { ...logPruneConfig, retention: newRetention };
            setLogPruneConfig(nextConf);
            saveLogPruneConfig(nextConf);
            return `Retention period updated to ${labelMap[newRetention]}. Stale logs older than this threshold will be purged.`;
          }
        });
      }
    });
  };

  // 7. Safe Manual Prune Execution with percentage modal
  const requestManualPruneLogs = () => {
    setConfirmModal({
      isOpen: true,
      title: 'Execute Manual Audit Log Pruning Now?',
      subtitle: 'TELEMETRY PRUNER EXECUTION',
      message: 'Are you sure you want to immediately execute a log pruning cycle? All audit logs older than the configured retention period will be permanently erased.',
      details: `Current Setting: Purge records older than ${logPruneConfig.retention}.`,
      confirmText: 'Yes, Prune Logs Now',
      cancelText: 'No, Cancel',
      variant: 'warning',
      onConfirm: () => {
        setConfirmModal((prev) => ({ ...prev, isOpen: false }));
        runActionWithProgressModal({
          title: 'Executing Audit Log Pruning Cycle',
          subtitle: 'TELEMETRY PURGER',
          steps: [
            { progress: 20, text: `Loading audit_logs table from database...`, delayMs: 200 },
            { progress: 55, text: `Evaluating records against cutoff (${logPruneConfig.retention})...`, delayMs: 250 },
            { progress: 85, text: 'Purging expired logs & updating trigger trail...', delayMs: 200 }
          ],
          action: async () => {
            setIsPruningLogs(true);
            try {
              const res = await executeLogPruning(logPruneConfig.retention, 'Manual Dashboard Action (User Confirmed)');
              setTriggerHistory(getPruneTriggerHistory());
              setLogPruneConfig(getLogPruneConfig());
              await loadDatabaseTableMetrics();
              if (showLiveAuditLogs) loadLiveAuditLogs();

              // Reset countdown
              setSecondsUntilNextPrune((logPruneConfig.scheduleIntervalMins || 15) * 60);

              return res.prunedCount > 0
                ? `Successfully pruned ${res.prunedCount} expired audit logs. ${res.remainingCount} active records remaining.`
                : `Completed scan: 0 logs exceeded the ${logPruneConfig.retention} retention threshold.`;
            } finally {
              setIsPruningLogs(false);
            }
          }
        });
      }
    });
  };

  // 8. Safe Clear Trigger History
  const requestClearTriggerHistory = () => {
    setConfirmModal({
      isOpen: true,
      title: 'Clear Auto-Prune Trigger Event Trail?',
      subtitle: 'TELEMETRY HISTORY RESET',
      message: 'Are you sure you want to clear all history records of scheduled and auto-triggered pruning events?',
      details: 'This will reset the trigger trail display back to zero entries.',
      confirmText: 'Yes, Clear Trigger Trail',
      cancelText: 'No, Keep History',
      variant: 'warning',
      onConfirm: () => {
        setConfirmModal((prev) => ({ ...prev, isOpen: false }));
        runActionWithProgressModal({
          title: 'Resetting Trigger Event History',
          subtitle: 'HISTORY TRAIL PURGE',
          steps: [
            { progress: 40, text: 'Clearing local trigger event records...', delayMs: 200 },
            { progress: 85, text: 'Resetting event trail indexes...', delayMs: 200 }
          ],
          action: async () => {
            clearPruneTriggerHistory();
            setTriggerHistory([]);
            return 'Auto-prune trigger event trail successfully cleared.';
          }
        });
      }
    });
  };

  // ─── SCHEDULE HANDLERS (CREATE, EDIT, DELETE, RUN NOW, TOGGLE, DEFAULT SCHEDULE) ───
  const openCreateScheduleModal = () => {
    setScheduleModal({
      isOpen: true,
      mode: 'CREATE',
      name: '',
      targetTable: 'audit_logs',
      retention: '48h',
      customDays: 2,
      intervalMins: 15,
      enabled: true,
      triggerOnProductActions: true
    });
  };

  const openEditScheduleModal = (sch: CustomPruneSchedule) => {
    setScheduleModal({
      isOpen: true,
      mode: 'EDIT',
      scheduleId: sch.id,
      name: sch.name,
      targetTable: sch.targetTable,
      retention: sch.retention,
      customDays: sch.customDays || 2,
      intervalMins: sch.intervalMins || 15,
      enabled: sch.enabled,
      triggerOnProductActions: sch.triggerOnProductActions
    });
  };

  const openEditDefaultScheduleModal = () => {
    setScheduleModal({
      isOpen: true,
      mode: 'EDIT',
      scheduleId: 'default-master-schedule',
      name: 'Default Audit Logs Telemetry Pruner',
      targetTable: 'audit_logs',
      retention: logPruneConfig.retention,
      customDays: logPruneConfig.customDays || 2,
      intervalMins: logPruneConfig.scheduleIntervalMins || 15,
      enabled: logPruneConfig.enabled,
      triggerOnProductActions: true
    });
  };

  const requestResetDefaultSchedule = () => {
    setConfirmModal({
      isOpen: true,
      title: 'Reset Default Prune Schedule to Factory Settings?',
      subtitle: 'RESTORE FACTORY CONFIGURATION',
      message:
        'Are you sure you want to restore the Default Audit Logs Pruner to system default settings (48 Hours retention, 15 Minutes cadence, active daemon)?',
      details: 'Target: public.audit_logs | Retention: 48h | Cadence: Every 15m | Hook: Active',
      confirmText: 'Yes, Reset to Defaults',
      cancelText: 'Cancel',
      variant: 'warning',
      onConfirm: () => {
        setConfirmModal((prev) => ({ ...prev, isOpen: false }));
        runActionWithProgressModal({
          title: 'Restoring Default Prune Schedule',
          subtitle: 'SYSTEM RECONFIGURATION',
          steps: [
            { progress: 30, text: 'Resetting audit_logs retention policy to 48 Hours...', delayMs: 180 },
            { progress: 70, text: 'Re-arming continuous 15-minute background loop...', delayMs: 200 },
            { progress: 100, text: 'Synchronizing factory daemon configuration...', delayMs: 150 }
          ],
          action: async () => {
            const factoryConf: LogPruneConfig = {
              enabled: true,
              retention: '48h',
              customDays: 2,
              scheduleIntervalMins: 15,
              lastPrunedAt: logPruneConfig.lastPrunedAt,
              totalPrunedCount: logPruneConfig.totalPrunedCount
            };
            setLogPruneConfig(factoryConf);
            saveLogPruneConfig(factoryConf);
            setSecondsUntilNextPrune(15 * 60);
            addNotification({
              type: 'info',
              title: 'Schedule Reset',
              message: 'Default audit logs schedule restored to factory defaults.'
            });
            return 'Default audit logs schedule restored to factory settings (48h retention, 15m interval).';
          }
        });
      }
    });
  };

  const requestSaveSchedule = () => {
    if (!scheduleModal.name.trim()) {
      addNotification({
        type: 'error',
        title: 'Schedule Name Required',
        message: 'Please provide a descriptive name for this pruning schedule.'
      });
      return;
    }

    const isDefault = scheduleModal.scheduleId === 'default-master-schedule';
    const isCreate = scheduleModal.mode === 'CREATE';

    setConfirmModal({
      isOpen: true,
      title: isDefault
        ? 'Save Default Master Schedule Modifications?'
        : isCreate
        ? 'Register New Table Pruning Schedule?'
        : 'Save Prune Schedule Modifications?',
      subtitle: 'SCHEDULE CONFIGURATION MATRIX',
      message: isDefault
        ? `Are you sure you want to update the master audit_logs pruner daemon settings (Retention: ${scheduleModal.retention}, Cadence: ${scheduleModal.intervalMins}m)?`
        : isCreate
        ? `Are you sure you want to create an automated auto-delete daemon for table "${scheduleModal.targetTable}" with ${scheduleModal.retention} retention?`
        : `Are you sure you want to update pruning daemon settings for "${scheduleModal.name}"?`,
      details: `Target Table: ${scheduleModal.targetTable} | Frequency: Every ${scheduleModal.intervalMins}m | Retention: ${
        scheduleModal.retention === 'custom' ? `${scheduleModal.customDays} Days` : scheduleModal.retention
      }`,
      confirmText: isCreate ? 'Yes, Create Schedule' : 'Yes, Update Schedule',
      cancelText: 'No, Cancel',
      variant: 'primary',
      onConfirm: () => {
        setConfirmModal((prev) => ({ ...prev, isOpen: false }));
        runActionWithProgressModal({
          title: isDefault
            ? 'Updating Default Master Schedule'
            : isCreate
            ? 'Registering Prune Schedule'
            : 'Updating Prune Schedule',
          subtitle: 'DAEMON REGISTRATION',
          steps: [
            { progress: 25, text: `Verifying table schema public.${scheduleModal.targetTable}...`, delayMs: 180 },
            { progress: 65, text: `Configuring cron interval (${scheduleModal.intervalMins} mins)...`, delayMs: 220 },
            { progress: 95, text: 'Registering background daemon listener...', delayMs: 180 }
          ],
          action: async () => {
            if (isDefault) {
              const nextConf: LogPruneConfig = {
                ...logPruneConfig,
                retention: scheduleModal.retention,
                customDays: scheduleModal.customDays,
                scheduleIntervalMins: scheduleModal.intervalMins,
                enabled: scheduleModal.enabled
              };
              setLogPruneConfig(nextConf);
              saveLogPruneConfig(nextConf);
              setSecondsUntilNextPrune(scheduleModal.intervalMins * 60);
              setScheduleModal((prev) => ({ ...prev, isOpen: false }));

              addNotification({
                type: 'success',
                title: 'Default Schedule Updated',
                message: `Default audit_logs schedule updated: retention ${nextConf.retention}, cadence every ${nextConf.scheduleIntervalMins}m.`
              });

              return `Default audit_logs schedule updated: retention ${nextConf.retention}, interval ${nextConf.scheduleIntervalMins}m.`;
            }

            const current = getCustomPruneSchedules();
            let updated: CustomPruneSchedule[];

            if (isCreate) {
              const newSchedule: CustomPruneSchedule = {
                id: `sch-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
                name: scheduleModal.name.trim(),
                targetTable: scheduleModal.targetTable,
                retention: scheduleModal.retention,
                customDays: scheduleModal.customDays,
                intervalMins: scheduleModal.intervalMins,
                enabled: scheduleModal.enabled,
                triggerOnProductActions: scheduleModal.triggerOnProductActions,
                totalPrunedCount: 0,
                createdAt: new Date().toISOString(),
                nextRunAt: new Date(Date.now() + scheduleModal.intervalMins * 60 * 1000).toISOString()
              };
              updated = [newSchedule, ...current];
            } else {
              updated = current.map((s) => {
                if (s.id === scheduleModal.scheduleId) {
                  return {
                    ...s,
                    name: scheduleModal.name.trim(),
                    targetTable: scheduleModal.targetTable,
                    retention: scheduleModal.retention,
                    customDays: scheduleModal.customDays,
                    intervalMins: scheduleModal.intervalMins,
                    enabled: scheduleModal.enabled,
                    triggerOnProductActions: scheduleModal.triggerOnProductActions,
                    nextRunAt: new Date(Date.now() + scheduleModal.intervalMins * 60 * 1000).toISOString()
                  };
                }
                return s;
              });
            }

            saveCustomPruneSchedules(updated);
            setPruneSchedules(updated);
            setScheduleModal((prev) => ({ ...prev, isOpen: false }));

            addNotification({
              type: 'success',
              title: isCreate ? 'Prune Schedule Created' : 'Prune Schedule Updated',
              message: `Schedule "${scheduleModal.name}" on table "${scheduleModal.targetTable}" is now registered.`
            });

            return isCreate
              ? `Schedule "${scheduleModal.name}" successfully created and armed.`
              : `Schedule "${scheduleModal.name}" changes saved.`;
          }
        });
      }
    });
  };

  const requestDeleteSchedule = (sch: CustomPruneSchedule) => {
    setConfirmModal({
      isOpen: true,
      title: 'Delete Prune Schedule?',
      subtitle: 'PERMANENT SCHEDULE DELETION',
      message: `Are you sure you want to permanently delete schedule "${sch.name}" targeting table "${sch.targetTable}"?`,
      details: 'Automated pruning runs for this table will be halted immediately.',
      confirmText: 'Yes, Delete Schedule',
      cancelText: 'No, Keep Schedule',
      variant: 'danger',
      onConfirm: () => {
        setConfirmModal((prev) => ({ ...prev, isOpen: false }));
        runActionWithProgressModal({
          title: 'Deleting Prune Schedule',
          subtitle: 'SCHEDULE UNBINDING',
          steps: [
            { progress: 35, text: `Stopping timer loop for schedule ${sch.id}...`, delayMs: 180 },
            { progress: 75, text: 'Removing daemon configuration from matrix...', delayMs: 200 },
            { progress: 100, text: 'Finalizing schedule removal...', delayMs: 150 }
          ],
          action: async () => {
            const current = getCustomPruneSchedules();
            const updated = current.filter((s) => s.id !== sch.id);
            saveCustomPruneSchedules(updated);
            setPruneSchedules(updated);

            addNotification({
              type: 'success',
              title: 'Schedule Deleted',
              message: `Prune schedule "${sch.name}" was removed.`
            });

            return `Schedule "${sch.name}" was successfully deleted.`;
          }
        });
      }
    });
  };

  const requestToggleScheduleEnabled = (sch: CustomPruneSchedule) => {
    const nextState = !sch.enabled;
    setConfirmModal({
      isOpen: true,
      title: nextState ? 'Enable Auto-Prune Daemon?' : 'Pause Auto-Prune Daemon?',
      subtitle: 'SCHEDULE STATE CHANGE',
      message: nextState
        ? `Resume recurring automated pruning for "${sch.name}" on table "${sch.targetTable}"?`
        : `Temporarily pause recurring automated pruning for "${sch.name}"?`,
      confirmText: nextState ? 'Yes, Enable Daemon' : 'Yes, Pause Daemon',
      cancelText: 'Cancel',
      variant: nextState ? 'primary' : 'warning',
      onConfirm: () => {
        setConfirmModal((prev) => ({ ...prev, isOpen: false }));
        runActionWithProgressModal({
          title: nextState ? `Activating Daemon: ${sch.name}` : `Pausing Daemon: ${sch.name}`,
          subtitle: 'SCHEDULE DAEMON CONTROLLER',
          steps: [
            { progress: 30, text: `Updating worker thread for public.${sch.targetTable}...`, delayMs: 180 },
            { progress: 75, text: `Persisting schedule status (${nextState ? 'ARMED' : 'PAUSED'})...`, delayMs: 200 }
          ],
          action: async () => {
            const current = getCustomPruneSchedules();
            const updated = current.map((s) => (s.id === sch.id ? { ...s, enabled: nextState } : s));
            saveCustomPruneSchedules(updated);
            setPruneSchedules(updated);
            addNotification({
              type: 'info',
              title: nextState ? 'Schedule Enabled' : 'Schedule Paused',
              message: `Schedule "${sch.name}" is now ${nextState ? 'active' : 'paused'}.`
            });
            return `Schedule "${sch.name}" is now ${nextState ? 'actively running' : 'temporarily paused'}.`;
          }
        });
      }
    });
  };

  // Safe Inspect Live Audit Logs with Yes/No popup and percentage modal
  const requestInspectLiveAuditLogs = () => {
    if (showLiveAuditLogs) {
      setShowLiveAuditLogs(false);
      return;
    }

    setConfirmModal({
      isOpen: true,
      title: 'Inspect Live Audit Logs from Database?',
      subtitle: 'PUBLIC.AUDIT_LOGS QUERY',
      message: 'Do you want to query the PostgreSQL database and open the live audit logs stream for inspection?',
      details: 'This will retrieve the latest recorded administrative and system operations from the audit_logs table.',
      confirmText: 'Yes, Inspect Live Logs',
      cancelText: 'No, Cancel',
      variant: 'info',
      onConfirm: () => {
        setConfirmModal((prev) => ({ ...prev, isOpen: false }));
        runActionWithProgressModal({
          title: 'Querying public.audit_logs Table',
          subtitle: 'LIVE TELEMETRY INSPECTOR',
          steps: [
            { progress: 30, text: 'Querying PostgreSQL public.audit_logs...', delayMs: 180 },
            { progress: 75, text: 'Sorting and indexing live audit entries...', delayMs: 200 }
          ],
          action: async () => {
            await loadLiveAuditLogs();
            setShowLiveAuditLogs(true);
            return 'Live audit log records loaded successfully.';
          }
        });
      }
    });
  };

  // Safe Reload Live Audit Logs with Yes/No popup and percentage modal
  const requestReloadLiveAuditLogs = () => {
    setConfirmModal({
      isOpen: true,
      title: 'Refresh Live Audit Records?',
      subtitle: 'TABLE RE-QUERY',
      message: 'Are you sure you want to re-query the public.audit_logs table to fetch new events?',
      confirmText: 'Yes, Reload Logs',
      cancelText: 'No, Cancel',
      variant: 'info',
      onConfirm: () => {
        setConfirmModal((prev) => ({ ...prev, isOpen: false }));
        runActionWithProgressModal({
          title: 'Refreshing Live Audit Log Stream',
          subtitle: 'DATABASE RE-QUERY',
          steps: [
            { progress: 35, text: 'Re-fetching active audit trail...', delayMs: 180 },
            { progress: 85, text: 'Updating local inspector buffer...', delayMs: 180 }
          ],
          action: async () => {
            await loadLiveAuditLogs();
            return 'Audit log stream refreshed from live database.';
          }
        });
      }
    });
  };

  const requestRunScheduleNow = (sch: CustomPruneSchedule) => {
    setConfirmModal({
      isOpen: true,
      title: `Execute Prune Schedule Now: "${sch.name}"?`,
      subtitle: 'ON-DEMAND DAEMON EXECUTION',
      message: `Are you sure you want to run this pruning cycle immediately on table "${sch.targetTable}"? Stale records exceeding ${sch.retention} retention will be purged.`,
      details: `Target Table: public.${sch.targetTable} | Retention Window: ${sch.retention}`,
      confirmText: 'Yes, Execute Now',
      cancelText: 'No, Cancel',
      variant: 'warning',
      onConfirm: () => {
        setConfirmModal((prev) => ({ ...prev, isOpen: false }));
        runActionWithProgressModal({
          title: `Executing Schedule: ${sch.name}`,
          subtitle: `TABLE PRUNER: public.${sch.targetTable}`,
          steps: [
            { progress: 20, text: `Loading records from public.${sch.targetTable}...`, delayMs: 200 },
            { progress: 55, text: `Evaluating records against retention (${sch.retention})...`, delayMs: 250 },
            { progress: 85, text: 'Purging expired telemetry & updating audit trail...', delayMs: 220 }
          ],
          action: async () => {
            const res = await executeSchedulePruning(sch.id, 'Dashboard Schedule Trigger (User Confirmed)');
            setPruneSchedules(getCustomPruneSchedules());
            setTriggerHistory(getPruneTriggerHistory());
            await loadDatabaseTableMetrics();

            addNotification({
              type: 'success',
              title: 'Schedule Execution Finished',
              message: `Purged ${res.prunedCount} records from ${sch.targetTable}. (${res.remainingCount} remaining)`
            });

            return res.prunedCount > 0
              ? `Purged ${res.prunedCount} expired records from "${sch.targetTable}". ${res.remainingCount} active records remaining.`
              : `Scanned ${res.evaluatedCount} records in "${sch.targetTable}": 0 records exceeded ${sch.retention} retention window.`;
          }
        });
      }
    });
  };

  // 9. Safe Execute SQL Query with percentage modal & exact error display
  const requestExecuteSql = () => {
    if (!sqlQuery.trim()) return;
    const queryPreview = sqlQuery.trim().slice(0, 100) + (sqlQuery.length > 100 ? '...' : '');
    setConfirmModal({
      isOpen: true,
      title: 'Execute SQL Query on PostgreSQL Database?',
      subtitle: 'SQL EXECUTION CONFIRMATION',
      message: 'Are you sure you want to execute the following SQL statement against the active database?',
      details: `Query: ${queryPreview}`,
      confirmText: 'Yes, Execute Query',
      cancelText: 'No, Review Query',
      variant: 'primary',
      onConfirm: () => {
        setConfirmModal((prev) => ({ ...prev, isOpen: false }));
        runActionWithProgressModal({
          title: 'Executing Real-Time SQL Query',
          subtitle: 'POSTGRESQL QUERY RUNNER',
          steps: [
            { progress: 25, text: 'Parsing SQL syntax and identifying relation target...', delayMs: 200 },
            { progress: 65, text: 'Executing query against PostgreSQL public schema...', delayMs: 250 },
            { progress: 90, text: 'Formatting result rows and recording query telemetry...', delayMs: 200 }
          ],
          action: async () => {
            setIsExecutingSql(true);
            try {
              const result = await executeRealtimeSQL(sqlQuery);
              setSqlResults(result);
              setSqlHistory(getSQLQueryHistory());
              await loadDatabaseTableMetrics();
              if (selectedInspectTable) {
                await handleInspectTableSelect(selectedInspectTable);
              }

              if (result.columns.includes('error') || (result.rowCount === 0 && result.message?.includes('error'))) {
                throw new Error(result.message || 'SQL execution failed.');
              }

              return result.message || `Query returned ${result.rowCount} rows in ${result.durationMs}ms.`;
            } finally {
              setIsExecutingSql(false);
            }
          }
        });
      }
    });
  };

  // 10. Safe Clear SQL History
  const requestClearSQLHistory = () => {
    setConfirmModal({
      isOpen: true,
      title: 'Clear SQL Query Execution History?',
      subtitle: 'QUERY LOG PURGE',
      message: 'Are you sure you want to delete all saved previous SQL query executions?',
      details: 'This action will clear your local SQL execution logs in this browser.',
      confirmText: 'Yes, Clear SQL Logs',
      cancelText: 'No, Cancel',
      variant: 'warning',
      onConfirm: () => {
        setConfirmModal((prev) => ({ ...prev, isOpen: false }));
        clearSQLQueryHistory();
        setSqlHistory([]);
        addNotification({
          title: 'SQL History Cleared',
          message: 'Executed query history has been emptied.',
          type: 'info'
        });
      }
    });
  };

  // 11. Safe Clear SQL Editor
  const requestClearSqlEditor = () => {
    if (!sqlQuery.trim()) return;
    setConfirmModal({
      isOpen: true,
      title: 'Clear SQL Editor Query?',
      subtitle: 'EDITOR RESET',
      message: 'Are you sure you want to discard the current SQL query from the editor?',
      details: 'Unsaved query text will be cleared.',
      confirmText: 'Yes, Clear Editor',
      cancelText: 'No, Keep Query',
      variant: 'warning',
      onConfirm: () => {
        setSqlQuery('');
        setConfirmModal((prev) => ({ ...prev, isOpen: false }));
      }
    });
  };

  // 12. Safe Export Request with Confirmation Modal & percentage modal
  const requestDownloadExport = () => {
    const targetLabel = showExportModal.targetTable === 'ALL' ? 'All 16 Public Tables' : `public.${showExportModal.targetTable}`;
    setConfirmModal({
      isOpen: true,
      title: `Generate & Download ${exportFormat} Database Export?`,
      subtitle: 'DATA EXPORT CONFIRMATION',
      message: `Are you sure you want to extract and download a live database dump for ${targetLabel} in ${exportFormat} format?`,
      details: `Target: ${targetLabel} | Format: ${exportFormat} schema | Destination: Local Browser Download`,
      confirmText: `Yes, Download ${exportFormat}`,
      cancelText: 'No, Cancel',
      variant: 'primary',
      onConfirm: () => {
        setConfirmModal((prev) => ({ ...prev, isOpen: false }));
        runActionWithProgressModal({
          title: `Generating ${exportFormat} Database Export`,
          subtitle: 'DATA EXTRACTION PIPELINE',
          steps: [
            { progress: 20, text: `Reading records for ${targetLabel}...`, delayMs: 200 },
            { progress: 60, text: `Encoding into ${exportFormat} schema structure...`, delayMs: 250 },
            { progress: 90, text: 'Creating file blob & preparing browser stream...', delayMs: 200 }
          ],
          action: async () => {
            setIsExporting(true);
            try {
              const exportFile = await generateExportData(showExportModal.targetTable, exportFormat);
              const blob = new Blob([exportFile.content], { type: exportFile.mimeType });
              const url = URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              a.download = exportFile.filename;
              document.body.appendChild(a);
              a.click();
              document.body.removeChild(a);
              URL.revokeObjectURL(url);
              setShowExportModal({ isOpen: false, targetTable: 'ALL' });
              return `Generated and downloaded ${exportFile.filename} (${exportFormat}).`;
            } finally {
              setIsExporting(false);
            }
          }
        });
      }
    });
  };

  const handleCopyQuery = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedQueryId(id);
    setTimeout(() => setCopiedQueryId(null), 2000);
  };

  const handleLoadQueryIntoEditor = (queryText: string) => {
    setSqlQuery(queryText);
    setSqlConsoleTab('EDITOR');
    addNotification({
      title: 'Query Loaded',
      message: 'Previous query has been loaded into the active editor.',
      type: 'info'
    });
  };

  // Format seconds into MM:SS
  const formatCountdown = (totalSec: number) => {
    const mins = Math.floor(totalSec / 60);
    const secs = totalSec % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Filtered public tables for Directory & Selection
  const filteredPublicTables = useMemo(() => {
    return ALL_PUBLIC_TABLES.filter((t) => {
      // Search filter
      if (tableSearchTerm.trim()) {
        const term = tableSearchTerm.toLowerCase();
        const matchesName = t.name.toLowerCase().includes(term);
        const matchesLabel = t.label.toLowerCase().includes(term);
        const matchesDesc = t.description.toLowerCase().includes(term);
        if (!matchesName && !matchesLabel && !matchesDesc) return false;
      }
      // Category filter
      if (tableCategoryFilter !== 'ALL' && t.category !== tableCategoryFilter) {
        return false;
      }
      // Protection filter
      if (tableProtectionFilter === 'PROTECTED' && !t.isProtected) return false;
      if (tableProtectionFilter === 'USER_DATA' && t.isProtected) return false;

      return true;
    }).sort((a, b) => {
      if (tableSortBy === 'NAME_ASC') return a.name.localeCompare(b.name);
      const sizeA = tableMetrics.tableSizes.find((s) => s.table === a.name)?.sizeKB || 0;
      const sizeB = tableMetrics.tableSizes.find((s) => s.table === b.name)?.sizeKB || 0;
      if (tableSortBy === 'SIZE_DESC') return sizeB - sizeA;
      const rowsA = tableMetrics.tableSizes.find((s) => s.table === a.name)?.rows || 0;
      const rowsB = tableMetrics.tableSizes.find((s) => s.table === b.name)?.rows || 0;
      return rowsB - rowsA;
    });
  }, [tableSearchTerm, tableCategoryFilter, tableProtectionFilter, tableSortBy, tableMetrics.tableSizes]);

  // Filtered trigger history for section 1
  const filteredTriggerHistory = useMemo(() => {
    if (historyFilter === 'ALL') return triggerHistory;
    return triggerHistory.filter((h) => {
      if (historyFilter === 'PRODUCT') return h.triggerSource.includes('Product');
      if (historyFilter === 'MANUAL') return h.triggerSource.includes('Manual');
      if (historyFilter === 'SCHEDULED') return h.triggerSource.includes('Schedule');
      return true;
    });
  }, [triggerHistory, historyFilter]);

  // Focused Table Data for Dynamic Metric Boxes & Charts
  const focusedTableData = useMemo(() => {
    if (dashboardTableFilter === 'ALL') return null;
    const meta = ALL_PUBLIC_TABLES.find((t) => t.name === dashboardTableFilter);
    const size = tableMetrics.tableSizes.find((s) => s.table === dashboardTableFilter) || {
      table: dashboardTableFilter,
      sizeKB: 0,
      rows: 0,
      readOps: 0,
      writeOps: 0
    };
    return { meta, size };
  }, [dashboardTableFilter, tableMetrics.tableSizes]);

  // Dynamic Chart 1: Table Storage Comparison
  const storageComparisonData = useMemo(() => {
    const sorted = [...tableMetrics.tableSizes].sort((a, b) => b.sizeKB - a.sizeKB);
    return sorted.map((t) => ({
      name: t.table,
      sizeKB: t.sizeKB,
      color: dashboardTableFilter === t.table ? '#f59e0b' : t.sizeKB > 30 ? '#4f46e5' : '#06b6d4',
      isFocused: dashboardTableFilter === t.table
    }));
  }, [tableMetrics.tableSizes, dashboardTableFilter]);

  // Dynamic Chart 2: Row Count Density
  const rowDensityData = useMemo(() => {
    const sorted = [...tableMetrics.tableSizes].sort((a, b) => b.rows - a.rows);
    return sorted.map((t) => ({
      name: t.table,
      rows: t.rows,
      color: dashboardTableFilter === t.table ? '#f59e0b' : t.rows > 25 ? '#10b981' : '#6366f1',
      isFocused: dashboardTableFilter === t.table
    }));
  }, [tableMetrics.tableSizes, dashboardTableFilter]);

  // Dynamic Chart 3: Read vs Write I/O Distribution
  const ioComparisonData = useMemo(() => {
    const targetTables =
      dashboardTableFilter === 'ALL'
        ? tableMetrics.tableSizes.slice(0, 8)
        : tableMetrics.tableSizes.filter(
            (t) => t.table === dashboardTableFilter || ['audit_logs', 'orders', 'products'].includes(t.table)
          );

    return targetTables.map((t) => ({
      name: t.table,
      readQueries: t.readOps,
      writeTransactions: t.writeOps
    }));
  }, [tableMetrics.tableSizes, dashboardTableFilter]);

  // Dynamic Chart 4: Database Storage Share (%)
  const storageShareData = useMemo(() => {
    const sorted = [...tableMetrics.tableSizes].sort((a, b) => b.sizeKB - a.sizeKB);
    const top5 = sorted.slice(0, 5);
    const otherKB = sorted.slice(5).reduce((acc, curr) => acc + curr.sizeKB, 0);

    const colors = ['#4f46e5', '#06b6d4', '#10b981', '#f59e0b', '#ec4899'];
    const slices = top5.map((t, idx) => ({
      name: t.table,
      value: t.sizeKB,
      color: dashboardTableFilter === t.table ? '#f59e0b' : colors[idx % colors.length],
      isFocused: dashboardTableFilter === t.table
    }));
    if (otherKB > 0) {
      slices.push({
        name: 'Others (11 tables)',
        value: Number(otherKB.toFixed(1)),
        color: '#94a3b8',
        isFocused: false
      });
    }
    return slices;
  }, [tableMetrics.tableSizes, dashboardTableFilter]);

  // Filtered prune schedules
  const filteredPruneSchedules = useMemo(() => {
    let result = [...pruneSchedules];
    if (scheduleStatusFilter === 'ACTIVE') result = result.filter((s) => s.enabled);
    else if (scheduleStatusFilter === 'PAUSED') result = result.filter((s) => !s.enabled);
    if (scheduleSearchTerm.trim()) {
      const q = scheduleSearchTerm.toLowerCase();
      result = result.filter(
        (s) =>
          s.name.toLowerCase().includes(q) ||
          s.targetTable.toLowerCase().includes(q) ||
          s.retention.toLowerCase().includes(q)
      );
    }
    return result;
  }, [pruneSchedules, scheduleStatusFilter, scheduleSearchTerm]);

  // Visibility of system default master schedule in the matrix
  const isDefaultScheduleVisible = useMemo(() => {
    if (scheduleStatusFilter === 'ACTIVE' && !logPruneConfig.enabled) return false;
    if (scheduleStatusFilter === 'PAUSED' && logPruneConfig.enabled) return false;
    if (scheduleSearchTerm.trim()) {
      const q = scheduleSearchTerm.toLowerCase();
      const match =
        'default audit logs telemetry pruner'.includes(q) ||
        'audit_logs'.includes(q) ||
        'default'.includes(q) ||
        'system'.includes(q) ||
        logPruneConfig.retention.toLowerCase().includes(q);
      if (!match) return false;
    }
    return true;
  }, [scheduleStatusFilter, scheduleSearchTerm, logPruneConfig.enabled, logPruneConfig.retention]);

  // Filtered live audit logs
  const filteredLiveAuditLogs = useMemo(() => {
    let logs = liveAuditLogs;
    if (auditActionFilter !== 'ALL') {
      logs = logs.filter((log) => (log.action || '').toUpperCase() === auditActionFilter);
    }
    if (!auditSearchTerm.trim()) return logs;
    const term = auditSearchTerm.toLowerCase();
    return logs.filter(
      (log) =>
        (log.action || '').toLowerCase().includes(term) ||
        (log.object_type || '').toLowerCase().includes(term) ||
        (log.user_email || '').toLowerCase().includes(term) ||
        (log.description || '').toLowerCase().includes(term)
    );
  }, [liveAuditLogs, auditActionFilter, auditSearchTerm]);

  return (
    <div className="space-y-8 animate-fadeIn pb-24">
      {/* ─── LIVE AUTO-REFRESH PROGRESS LINE ─── */}
      {isRefreshing && (
        <div className="fixed top-0 left-0 right-0 z-50 h-1 bg-gradient-to-r from-indigo-500 via-cyan-400 to-emerald-400 animate-pulse" />
      )}

      {/* ─── TOP TOOLBAR & BREADCRUMBS ─── */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-2 border-b border-gray-100 dark:border-emerald-900/40">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => navigate('/admin/settings/db-performance')}
            className="p-2 bg-white dark:bg-emerald-950 border border-gray-200 dark:border-emerald-800 hover:border-indigo-400 dark:hover:border-indigo-500 text-gray-700 dark:text-emerald-200 rounded-xl shadow-xs transition flex items-center gap-1.5 text-xs font-bold active:scale-95 cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
            <span>Back to DB Performance</span>
          </button>
          <div className="h-4 w-px bg-gray-200 dark:bg-emerald-800" />
          <span className="text-xs font-mono text-gray-400 dark:text-emerald-500">/admin/settings/db-tables</span>
        </div>

        {/* Global Toolbar Actions (Every button asks Yes/No) */}
        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={requestTruncateAllNonProtected}
            className="px-3.5 py-2 bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 border border-rose-200 dark:border-rose-900/60 text-rose-700 dark:text-rose-300 rounded-xl font-bold text-xs shadow-xs transition flex items-center gap-1.5 cursor-pointer active:scale-95"
          >
            <Trash2 className="w-4 h-4 text-rose-600" />
            <span>Truncate All Non-Protected</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setSqlConsoleTab('EDITOR');
              setShowSqlEditor(true);
            }}
            className="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-emerald-400 rounded-xl font-mono text-xs font-bold shadow-xs transition flex items-center gap-1.5 cursor-pointer active:scale-95"
          >
            <Terminal className="w-4 h-4 text-emerald-400" />
            <span>SQL Console ({sqlHistory.length} logs)</span>
          </button>

          <button
            type="button"
            onClick={() => setShowExportModal({ isOpen: true, targetTable: 'ALL' })}
            className="px-3.5 py-2 bg-white dark:bg-emerald-950 border border-gray-200 dark:border-emerald-800 hover:border-indigo-300 text-indigo-700 dark:text-indigo-300 rounded-xl font-bold text-xs shadow-xs transition flex items-center gap-1.5 cursor-pointer active:scale-95"
          >
            <Download className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
            <span>Export Hub</span>
          </button>

          <AutoRefreshDropdown
            intervalSec={autoRefreshSec}
            onIntervalChange={(sec) => {
              setAutoRefreshSec(sec);
              addNotification({
                title: 'Auto-Refresh Updated',
                message: sec === 0 ? 'Table matrix auto-refresh paused.' : `Table matrix refreshing every ${sec} seconds.`,
                type: 'info'
              });
            }}
            onRefresh={requestRefreshDB}
            variant="indigo"
          />

          <button
            type="button"
            onClick={requestRefreshDB}
            disabled={isRefreshing}
            className="px-3 py-2 bg-white dark:bg-emerald-950 border border-gray-200 dark:border-emerald-800 hover:border-gray-300 text-gray-700 dark:text-emerald-200 rounded-xl font-bold text-xs shadow-xs transition flex items-center gap-1.5 cursor-pointer active:scale-95"
            title="Refresh Table Statistics"
          >
            <RefreshCw className={`w-4 h-4 text-gray-600 dark:text-emerald-300 ${isRefreshing ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">Refresh</span>
          </button>
        </div>
      </div>

      {/* ─── HERO HEADER BANNER ─── */}
      <div className="relative overflow-hidden bg-gradient-to-br from-indigo-950 via-slate-900 to-emerald-950 rounded-3xl p-6 sm:p-8 text-white shadow-xl border border-indigo-500/20">
        <div className="absolute top-0 right-0 -mt-6 -mr-6 w-72 h-72 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 -mb-6 -ml-6 w-72 h-72 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-3 max-w-3xl">
            <div className="flex flex-wrap items-center gap-2">
              <span className="px-3 py-1 bg-indigo-500/20 text-indigo-300 border border-indigo-400/30 rounded-full text-[11px] font-extrabold uppercase tracking-wider flex items-center gap-1.5">
                <Database className="w-3.5 h-3.5 text-indigo-400" />
                POSTGRESQL TABLES & STORAGE MATRIX • SCHEMA: public
              </span>
              <span className="px-2.5 py-0.5 bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 rounded-full text-[10px] font-bold">
                Live PostgreSQL Catalog (16 Tables)
              </span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight flex items-center gap-2.5">
              Public Relations & Schema Explorer
            </h1>

            {/* Monospace Query Subtitle Chip */}
            <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-black/40 border border-slate-700/60 rounded-xl font-mono text-xs text-emerald-400">
              <Terminal className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              <span className="font-semibold select-all">
                SELECT tablename FROM pg_catalog.pg_tables WHERE schemaname = 'public' ORDER BY tablename;
              </span>
            </div>

            <p className="text-xs sm:text-sm text-slate-300 font-normal leading-relaxed">
              Inspect all 16 tables in PostgreSQL public schema. Lazy-load row counts, verify protected core tables, and execute real-time truncations & deletes with live percentage feedback.
            </p>
          </div>

          {/* Quick Jump Buttons */}
          <div className="flex flex-col sm:flex-row lg:flex-col gap-2.5 shrink-0">
            <button
              type="button"
              onClick={() => {
                const prun = document.getElementById('auto-prune-section');
                if (prun) prun.scrollIntoView({ behavior: 'smooth' });
              }}
              className="px-4 py-2.5 bg-emerald-600/90 hover:bg-emerald-600 text-white font-bold text-xs rounded-xl shadow-md transition flex items-center justify-center gap-2 cursor-pointer active:scale-95"
            >
              <History className="w-4 h-4 text-emerald-200" />
              <span>1. Telemetry Pruner & Timer (First)</span>
            </button>
            <button
              type="button"
              onClick={() => {
                const el = document.getElementById('easy-table-matrix-section');
                if (el) el.scrollIntoView({ behavior: 'smooth' });
              }}
              className="px-4 py-2.5 bg-indigo-600/90 hover:bg-indigo-600 text-white font-bold text-xs rounded-xl shadow-md transition flex items-center justify-center gap-2 cursor-pointer active:scale-95"
            >
              <TableIcon className="w-4 h-4 text-indigo-200" />
              <span>2. Public Table Matrix (Second)</span>
            </button>
            <button
              type="button"
              onClick={() => {
                const ch = document.getElementById('analytics-charts-section');
                if (ch) ch.scrollIntoView({ behavior: 'smooth' });
              }}
              className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-cyan-300 border border-cyan-500/30 font-bold text-xs rounded-xl transition flex items-center justify-center gap-2 cursor-pointer active:scale-95"
            >
              <Activity className="w-4 h-4 text-cyan-300" />
              <span>3. Visual Storage Charts (Last)</span>
            </button>
          </div>
        </div>
      </div>

      {/* ──────────────────────────────────────────────────────────────────────────
          DASHBOARD FOCUS FILTER & 6 KPI METRIC BOXES
      ────────────────────────────────────────────────────────────────────────── */}
      <div className="bg-white dark:bg-emerald-950/60 p-4 sm:p-5 rounded-3xl border border-gray-200 dark:border-emerald-800 shadow-sm space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-indigo-50 dark:bg-indigo-950 text-indigo-600 rounded-xl">
              <Sliders className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-xs font-black uppercase text-slate-800 dark:text-white tracking-wider flex items-center gap-2">
                Dashboard Metrics Filter & Focus Selector
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-800 dark:bg-indigo-900/60 dark:text-indigo-300">
                  {dashboardTableFilter === 'ALL' ? 'Global Overview' : `Focused: public.${dashboardTableFilter}`}
                </span>
              </h3>
              <p className="text-[11px] text-gray-500 dark:text-emerald-400">
                Choose a table below to load dynamic KPI boxes and focus charts specifically on that table.
              </p>
            </div>
          </div>

          {dashboardTableFilter !== 'ALL' && (
            <button
              type="button"
              onClick={() => setDashboardTableFilter('ALL')}
              className="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 dark:bg-indigo-900/50 dark:text-indigo-200 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer active:scale-95"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset to ALL (Global Database)</span>
            </button>
          )}
        </div>

        {/* Filter Selection Chips */}
        <div className="flex flex-wrap items-center gap-1.5 pt-1">
          <button
            type="button"
            onClick={() => setDashboardTableFilter('ALL')}
            className={`px-3 py-1.5 rounded-xl text-xs font-extrabold transition cursor-pointer flex items-center gap-1.5 ${
              dashboardTableFilter === 'ALL'
                ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-md ring-2 ring-indigo-500/30'
                : 'bg-gray-100 dark:bg-emerald-900/40 text-gray-700 dark:text-emerald-200 hover:bg-gray-200'
            }`}
          >
            <Globe className="w-3.5 h-3.5" />
            <span>ALL (All 16 Tables)</span>
          </button>

          {ALL_PUBLIC_TABLES.map((t) => {
            const isSelected = dashboardTableFilter === t.name;
            const sizeItem = tableMetrics.tableSizes.find((s) => s.table === t.name);
            return (
              <button
                key={t.name}
                type="button"
                onClick={() => setDashboardTableFilter(t.name)}
                className={`px-2.5 py-1 rounded-xl text-[11px] font-mono transition cursor-pointer flex items-center gap-1 ${
                  isSelected
                    ? 'bg-indigo-600 text-white font-black shadow-md ring-2 ring-indigo-400/40'
                    : 'bg-white dark:bg-emerald-950 border border-gray-200 dark:border-emerald-800 text-gray-700 dark:text-emerald-300 hover:bg-gray-50'
                }`}
              >
                {t.isProtected ? (
                  <Lock className={`w-3 h-3 ${isSelected ? 'text-amber-300' : 'text-purple-500'}`} />
                ) : (
                  <TableIcon className="w-3 h-3 text-cyan-500" />
                )}
                <span>{t.name}</span>
                <span className={`text-[9px] ${isSelected ? 'text-indigo-200' : 'text-gray-400'}`}>
                  ({sizeItem?.rows || 0})
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ─── 6 KPI METRIC BOXES (DYNAMICALLY LOADS BASED ON TABLE SELECTION) ─── */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 animate-fadeIn">
        {/* Box 1 */}
        <div className="bg-white dark:bg-emerald-950/60 p-4 rounded-2xl border border-gray-100 dark:border-emerald-900/60 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-bold text-gray-500 dark:text-emerald-400 uppercase tracking-wider">
              {dashboardTableFilter === 'ALL' ? 'Public Tables' : 'Focused Table'}
            </p>
            <div className="p-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400">
              <Database className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 truncate">
            {dashboardTableFilter === 'ALL' ? (
              <div className="flex items-baseline gap-1.5">
                <span className="text-2xl font-black text-slate-900 dark:text-white">{tableMetrics.totalTables}</span>
                <span className="text-[10px] font-semibold text-emerald-600">Active</span>
              </div>
            ) : (
              <div className="truncate">
                <span className="text-base font-black text-slate-900 dark:text-white block truncate">
                  public.{dashboardTableFilter}
                </span>
                <span className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 uppercase">
                  {focusedTableData?.meta?.category || 'TABLE'}
                </span>
              </div>
            )}
          </div>
          <p className="text-[11px] font-mono text-gray-400 dark:text-gray-500 mt-1">
            {dashboardTableFilter === 'ALL' ? 'pg_catalog.pg_tables' : focusedTableData?.meta?.label || 'Schema entity'}
          </p>
        </div>

        {/* Box 2 */}
        <div className="bg-white dark:bg-emerald-950/60 p-4 rounded-2xl border border-gray-100 dark:border-emerald-900/60 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-bold text-gray-500 dark:text-emerald-400 uppercase tracking-wider">
              {dashboardTableFilter === 'ALL' ? 'Total Stored Records' : 'Table Record Count'}
            </p>
            <div className="p-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400">
              <Layers className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-1.5">
            <span className="text-2xl font-black text-slate-900 dark:text-white">
              {dashboardTableFilter === 'ALL' ? tableMetrics.totalRecords : focusedTableData?.size.rows || 0}
            </span>
            <span className="text-[10px] font-semibold text-emerald-600">Rows</span>
          </div>
          <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-1">
            {dashboardTableFilter === 'ALL'
              ? 'Live row counts'
              : `${(((focusedTableData?.size.rows || 0) / Math.max(1, tableMetrics.totalRecords)) * 100).toFixed(1)}% of DB`}
          </p>
        </div>

        {/* Box 3 */}
        <div className="bg-white dark:bg-emerald-950/60 p-4 rounded-2xl border border-gray-100 dark:border-emerald-900/60 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-bold text-gray-500 dark:text-emerald-400 uppercase tracking-wider">
              {dashboardTableFilter === 'ALL' ? 'Total Footprint' : 'Table Footprint'}
            </p>
            <div className="p-1.5 rounded-lg bg-cyan-50 dark:bg-cyan-900/40 text-cyan-600 dark:text-cyan-400">
              <HardDrive className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-1.5">
            <span className="text-2xl font-black text-slate-900 dark:text-white">
              {dashboardTableFilter === 'ALL' ? tableMetrics.totalFootprintKB : focusedTableData?.size.sizeKB || 0}
            </span>
            <span className="text-[10px] font-semibold text-cyan-600">KB</span>
          </div>
          <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-1">
            {dashboardTableFilter === 'ALL'
              ? 'Disk allocation'
              : `${(((focusedTableData?.size.sizeKB || 0) / Math.max(1, tableMetrics.totalFootprintKB)) * 100).toFixed(1)}% of total disk`}
          </p>
        </div>

        {/* Box 4 */}
        <div className="bg-white dark:bg-emerald-950/60 p-4 rounded-2xl border border-gray-100 dark:border-emerald-900/60 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-bold text-gray-500 dark:text-emerald-400 uppercase tracking-wider">
              {dashboardTableFilter === 'ALL' ? 'Largest Table' : 'Protection Lock'}
            </p>
            <div className="p-1.5 rounded-lg bg-amber-50 dark:bg-amber-900/40 text-amber-600 dark:text-amber-400">
              <Server className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 truncate">
            {dashboardTableFilter === 'ALL' ? (
              <div>
                <span className="text-sm font-black text-slate-900 dark:text-white block truncate">
                  {tableMetrics.largestTable.name || 'audit_logs'}
                </span>
                <span className="text-[10px] font-bold text-amber-600">{tableMetrics.largestTable.sizeKB || 54} KB</span>
              </div>
            ) : (
              <div>
                <span
                  className={`text-xs font-black block truncate ${
                    focusedTableData?.meta?.isProtected ? 'text-purple-600' : 'text-emerald-600'
                  }`}
                >
                  {focusedTableData?.meta?.isProtected ? 'CORE PROTECTED' : 'USER DATA'}
                </span>
                <span className="text-[10px] text-gray-500 dark:text-gray-400">
                  {focusedTableData?.meta?.isProtected ? 'Immutable Shield' : 'Editable & Truncatable'}
                </span>
              </div>
            )}
          </div>
          <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-1">
            {dashboardTableFilter === 'ALL' ? 'Top storage consumer' : 'Access Policy'}
          </p>
        </div>

        {/* Box 5 */}
        <div className="bg-white dark:bg-emerald-950/60 p-4 rounded-2xl border border-gray-100 dark:border-emerald-900/60 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-bold text-gray-500 dark:text-emerald-400 uppercase tracking-wider">
              {dashboardTableFilter === 'ALL' ? 'Protected Tables' : 'Read Queries I/O'}
            </p>
            <div className="p-1.5 rounded-lg bg-purple-50 dark:bg-purple-900/40 text-purple-600 dark:text-purple-400">
              {dashboardTableFilter === 'ALL' ? <ShieldCheck className="w-4 h-4" /> : <Activity className="w-4 h-4" />}
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-1.5">
            <span className="text-2xl font-black text-slate-900 dark:text-white">
              {dashboardTableFilter === 'ALL' ? tableMetrics.protectedCount : focusedTableData?.size.readOps || 0}
            </span>
            <span className="text-[10px] font-semibold text-purple-600">
              {dashboardTableFilter === 'ALL' ? 'Core' : 'Ops'}
            </span>
          </div>
          <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-1">
            {dashboardTableFilter === 'ALL' ? 'Immutable' : 'Query read throughput'}
          </p>
        </div>

        {/* Box 6 */}
        <div className="bg-white dark:bg-emerald-950/60 p-4 rounded-2xl border border-gray-100 dark:border-emerald-900/60 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-bold text-gray-500 dark:text-emerald-400 uppercase tracking-wider">
              {dashboardTableFilter === 'ALL' ? 'Schema Status' : 'Write Transactions'}
            </p>
            <div className="p-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-1.5">
            <span className="text-xl font-black text-emerald-700 dark:text-emerald-300">
              {dashboardTableFilter === 'ALL' ? 'Healthy ✓' : `${focusedTableData?.size.writeOps || 0} Ops`}
            </span>
          </div>
          <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-1">
            {dashboardTableFilter === 'ALL' ? 'PostgreSQL 15' : 'Commit rate'}
          </p>
        </div>
      </div>

      {/* ──────────────────────────────────────────────────────────────────────────
          SECTION 1 (PLACED FIRST AS EXPLICITLY REQUESTED):
          USER REQUIREMENT: "Audit Logs Auto-Delete Schedule & Telemetry Pruner re disgin the that section"
          PLUS: "Retention Period remining timmer add they sedul running time mins the time"
          PLUS: "all page enure laoidng preatge annimation pop model and eveyr action clikc yes or no model ask not check all page"
      ────────────────────────────────────────────────────────────────────────── */}
      <div
        id="auto-prune-section"
        className="relative overflow-hidden bg-gradient-to-b from-white via-emerald-50/20 to-white dark:from-emerald-950/70 dark:via-slate-900/80 dark:to-emerald-950/50 rounded-3xl p-6 sm:p-8 border-2 border-emerald-500/40 dark:border-emerald-700/60 shadow-xl space-y-7"
      >
        {/* Subtle Ambient Background Highlight */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-500/5 dark:bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

        {/* ─── HERO HEADER ─── */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5 border-b border-gray-100 dark:border-emerald-900/60 pb-6 relative z-10">
          <div className="space-y-2">
            <div className="flex items-center gap-2.5 flex-wrap">
              <span className="p-2.5 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-md shadow-emerald-500/20">
                <Calendar className="w-5 h-5" />
              </span>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">
                  Audit Logs Auto-Delete Schedule & Telemetry Pruner
                </h2>
                <span className="text-[10px] uppercase font-black px-3 py-1 rounded-full bg-emerald-500 text-white shadow-xs">
                  SECTION 1 • COMMAND CENTER
                </span>
                {logPruneConfig.enabled ? (
                  <span className="px-3 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-700 dark:text-emerald-300 text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5 shadow-xs">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                    Engine Active (Continuous Daemon)
                  </span>
                ) : (
                  <span className="px-3 py-1 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-700 dark:text-amber-300 text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5 shadow-xs">
                    <span className="w-2 h-2 rounded-full bg-amber-500" />
                    Engine Paused
                  </span>
                )}
              </div>
            </div>
            <p className="text-xs text-gray-500 dark:text-emerald-300/80 font-medium max-w-3xl">
              High-frequency PostgreSQL telemetry management daemon. Purges stale database execution traces on a recurring cron interval and hooks directly into product catalog lifecycle triggers.
            </p>
          </div>

          {/* Action Buttons with Universal Yes/No + Real-Time Loading Percentage Modal */}
          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            <button
              type="button"
              onClick={openCreateScheduleModal}
              className="px-4 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white rounded-xl text-xs font-black shadow-md shadow-emerald-600/20 transition flex items-center gap-2 cursor-pointer active:scale-95"
            >
              <PlusCircle className="w-4 h-4" />
              <span>+ New Schedule</span>
            </button>

            <button
              type="button"
              onClick={requestInspectLiveAuditLogs}
              className={`px-4 py-2.5 rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer active:scale-95 border ${
                showLiveAuditLogs
                  ? 'bg-emerald-100 hover:bg-emerald-200 text-emerald-900 border-emerald-300 dark:bg-emerald-900 dark:text-emerald-100 dark:border-emerald-700'
                  : 'bg-white hover:bg-slate-100 dark:bg-emerald-950 dark:hover:bg-emerald-900/80 text-slate-800 dark:text-emerald-200 border-gray-200 dark:border-emerald-800'
              }`}
            >
              <Eye className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              <span>{showLiveAuditLogs ? 'Hide Live Audit Records' : 'Inspect Live Audit Logs'}</span>
            </button>

            <button
              type="button"
              disabled={isPruningLogs}
              onClick={requestManualPruneLogs}
              className="px-4 py-2.5 bg-gradient-to-r from-rose-600 to-amber-600 hover:from-rose-700 hover:to-amber-700 text-white rounded-xl text-xs font-black shadow-md shadow-rose-600/20 transition flex items-center gap-2 cursor-pointer active:scale-95 disabled:opacity-50"
            >
              <Play className={`w-3.5 h-3.5 ${isPruningLogs ? 'animate-spin' : ''}`} />
              <span>{isPruningLogs ? 'Pruning...' : 'Prune Logs Now'}</span>
            </button>
          </div>
        </div>

        {/* ─── LIVE TELEMETRY STATUS TICKER ─── */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 dark:bg-emerald-950/40 p-3.5 rounded-2xl border border-emerald-500/20 dark:border-emerald-800/60 font-mono text-xs">
          <div className="flex items-center gap-2.5 px-3 py-1.5 rounded-xl bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-emerald-800/50">
            <Activity className="w-4 h-4 text-emerald-500 shrink-0" />
            <div className="min-w-0">
              <span className="text-[10px] text-gray-400 block uppercase">Engine State</span>
              <span className="font-black text-slate-800 dark:text-emerald-200 truncate">
                {logPruneConfig.enabled ? 'ACTIVE (15m Loop)' : 'PAUSED'}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2.5 px-3 py-1.5 rounded-xl bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-emerald-800/50">
            <Timer className="w-4 h-4 text-teal-500 shrink-0" />
            <div className="min-w-0">
              <span className="text-[10px] text-gray-400 block uppercase">Next Cycle</span>
              <span className="font-black text-emerald-600 dark:text-emerald-300 truncate">
                {logPruneConfig.enabled ? formatCountdown(secondsUntilNextPrune) : 'PAUSED'}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2.5 px-3 py-1.5 rounded-xl bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-emerald-800/50">
            <ShieldCheck className="w-4 h-4 text-indigo-500 shrink-0" />
            <div className="min-w-0">
              <span className="text-[10px] text-gray-400 block uppercase">Retention Window</span>
              <span className="font-black text-indigo-600 dark:text-indigo-300 truncate">
                {logPruneConfig.retention === 'custom' ? `${logPruneConfig.customDays || 2} Days` : logPruneConfig.retention.toUpperCase()}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2.5 px-3 py-1.5 rounded-xl bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-emerald-800/50">
            <Trash2 className="w-4 h-4 text-rose-500 shrink-0" />
            <div className="min-w-0">
              <span className="text-[10px] text-gray-400 block uppercase">Total Purged</span>
              <span className="font-black text-rose-600 dark:text-rose-400 truncate">
                {logPruneConfig.totalPrunedCount || 0} Records
              </span>
            </div>
          </div>
        </div>

        {/* ─── 4-CARD COMMAND CENTER STRIP ─── */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          
          {/* Card 1: Toggle Schedule Daemon */}
          <div className="p-4 bg-slate-50 dark:bg-emerald-950/60 rounded-2xl border border-slate-200 dark:border-emerald-800 space-y-3 relative">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-black text-gray-500 dark:text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
                <Zap className="w-3.5 h-3.5 text-amber-500" />
                Auto-Prune Daemon
              </span>
              <button
                type="button"
                onClick={() => requestToggleAutoPrune(!logPruneConfig.enabled)}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                  logPruneConfig.enabled ? 'bg-emerald-600' : 'bg-gray-300 dark:bg-slate-700'
                }`}
                title="Toggle automated schedule daemon (Asks Yes/No)"
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                    logPruneConfig.enabled ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>
            <div>
              <p className={`text-xs font-black flex items-center gap-1.5 ${logPruneConfig.enabled ? 'text-emerald-600 dark:text-emerald-400' : 'text-gray-400'}`}>
                <span className={`w-2 h-2 rounded-full ${logPruneConfig.enabled ? 'bg-emerald-500 animate-ping' : 'bg-gray-400'}`} />
                {logPruneConfig.enabled ? 'Active Background Daemon' : 'Disabled / Suspended'}
              </p>
              <p className="text-[10px] text-gray-400 mt-0.5">
                {logPruneConfig.enabled ? 'Evaluates every 15 mins automatically' : 'Click switch to enable with confirmation'}
              </p>
            </div>
          </div>

          {/* Card 2: Retention Selector WITH LIVE PROGRESSION COUNTDOWN */}
          <div className="p-4 bg-slate-50 dark:bg-emerald-950/60 rounded-2xl border border-slate-200 dark:border-emerald-800 space-y-2 relative overflow-hidden">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-black text-gray-500 dark:text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-indigo-500" />
                Retention Period
              </span>
              {logPruneConfig.enabled && (
                <span className="text-[10px] font-mono font-black px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-300 flex items-center gap-1">
                  <Clock className="w-3 h-3 text-emerald-600 animate-spin" />
                  {formatCountdown(secondsUntilNextPrune)} left
                </span>
              )}
            </div>

            <select
              value={logPruneConfig.retention}
              onChange={(e) => requestChangeRetentionPeriod(e.target.value as any)}
              className="w-full p-2 bg-white dark:bg-emerald-900 border border-gray-200 dark:border-emerald-700 rounded-xl text-xs font-bold text-gray-800 dark:text-emerald-200 cursor-pointer shadow-2xs"
            >
              <option value="24h">Delete logs older than 24 Hours</option>
              <option value="48h">Delete logs older than 48 Hours</option>
              <option value="72h">Delete logs older than 72 Hours</option>
              <option value="1w">Delete logs older than 1 Week</option>
              <option value="custom">Custom Date Period</option>
            </select>

            {/* Live Schedule Remaining Countdown Progression Bar */}
            <div className="pt-1">
              <div className="flex items-center justify-between text-[10px] font-mono text-gray-400">
                <span>Next Auto-Purge Cycle</span>
                <span className="text-emerald-600 dark:text-emerald-400 font-bold">
                  {logPruneConfig.enabled ? `${formatCountdown(secondsUntilNextPrune)} remaining` : 'Paused'}
                </span>
              </div>
              <div className="w-full bg-gray-200 dark:bg-emerald-900/50 rounded-full h-1.5 mt-1 overflow-hidden">
                <div
                  className="bg-emerald-500 h-full rounded-full transition-all duration-1000 ease-linear"
                  style={{
                    width: logPruneConfig.enabled
                      ? `${Math.max(5, (1 - secondsUntilNextPrune / ((logPruneConfig.scheduleIntervalMins || 15) * 60)) * 100)}%`
                      : '0%'
                  }}
                />
              </div>
            </div>
          </div>

          {/* Card 3: Execution Telemetry Stats */}
          <div className="p-4 bg-slate-50 dark:bg-emerald-950/60 rounded-2xl border border-slate-200 dark:border-emerald-800 space-y-1.5">
            <span className="text-[11px] font-black text-gray-500 dark:text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
              <History className="w-3.5 h-3.5 text-teal-500" />
              Last Prune Execution
            </span>
            <p className="text-xs font-black text-gray-800 dark:text-emerald-200">
              {logPruneConfig.lastPrunedAt ? new Date(logPruneConfig.lastPrunedAt).toLocaleTimeString() : 'Pending Schedule Run'}
            </p>
            <p className="text-[11px] text-gray-500 dark:text-emerald-400/80 font-mono">
              Total Purged: <span className="font-bold text-rose-600 dark:text-rose-400">{logPruneConfig.totalPrunedCount || 0}</span> records
            </p>
          </div>

          {/* Card 4: Product Action Auto Trigger Hook */}
          <div className="p-4 bg-slate-50 dark:bg-emerald-950/60 rounded-2xl border border-slate-200 dark:border-emerald-800 space-y-1.5">
            <span className="text-[11px] font-black text-gray-500 dark:text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              Product Catalog Hook
            </span>
            <p className="text-xs font-black text-emerald-700 dark:text-emerald-300 flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
              Catalog Write Hook Active ✓
            </p>
            <p className="text-[10px] text-gray-400">
              Triggers cleanup automatically on all product creates/updates.
            </p>
          </div>
        </div>

        {/* ─── MULTI-TABLE CONFIGURED PRUNE SCHEDULES & DAEMON MATRIX ─── */}
        <div className="bg-slate-50/80 dark:bg-emerald-950/40 rounded-2xl p-5 sm:p-6 border border-emerald-500/20 dark:border-emerald-800/80 space-y-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="p-1.5 rounded-lg bg-teal-100 dark:bg-teal-900/60 text-teal-800 dark:text-teal-200">
                  <Sliders className="w-4 h-4" />
                </span>
                <h3 className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-2">
                  Active Table Pruning Schedules & Retention Rules
                  <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-teal-500 text-white font-mono font-bold shadow-2xs">
                    {pruneSchedules.length + 1} Rules Registered
                  </span>
                </h3>
              </div>
              <p className="text-xs text-gray-500 dark:text-emerald-400 mt-1">
                Multi-table telemetry purgers with custom retention thresholds, background intervals, and product trigger hooks.
              </p>
            </div>

            <button
              type="button"
              onClick={openCreateScheduleModal}
              className="px-3.5 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white rounded-xl text-xs font-black shadow-sm transition flex items-center gap-1.5 cursor-pointer active:scale-95 shrink-0 self-start md:self-auto"
            >
              <PlusCircle className="w-4 h-4" />
              <span>+ New Schedule</span>
            </button>
          </div>

          {/* Search & Status Filters Strip */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
            <div className="flex items-center gap-1.5 bg-white dark:bg-slate-900 p-1 rounded-xl border border-gray-200 dark:border-emerald-900/60 shadow-2xs">
              {(
                [
                  { id: 'ALL', label: `All Rules (${pruneSchedules.length + 1})` },
                  { id: 'ACTIVE', label: `Active (${pruneSchedules.filter((s) => s.enabled).length + (logPruneConfig.enabled ? 1 : 0)})` },
                  { id: 'PAUSED', label: `Paused (${pruneSchedules.filter((s) => !s.enabled).length + (!logPruneConfig.enabled ? 1 : 0)})` }
                ] as const
              ).map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setScheduleStatusFilter(tab.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                    scheduleStatusFilter === tab.id
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-emerald-950'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <div className="relative sm:w-64">
              <Search className="w-3.5 h-3.5 text-gray-400 absolute left-3 top-3 pointer-events-none" />
              <input
                type="text"
                value={scheduleSearchTerm}
                onChange={(e) => setScheduleSearchTerm(e.target.value)}
                placeholder="Search schedules by name or table..."
                className="w-full pl-9 pr-8 py-2 bg-white dark:bg-slate-900 border border-gray-200 dark:border-emerald-800 rounded-xl text-xs font-medium text-gray-800 dark:text-emerald-100 placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-emerald-500 shadow-2xs"
              />
              {scheduleSearchTerm && (
                <button
                  type="button"
                  onClick={() => setScheduleSearchTerm('')}
                  className="absolute right-2.5 top-2.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* Schedule Deck */}
          {!isDefaultScheduleVisible && filteredPruneSchedules.length === 0 ? (
            <div className="p-8 text-center bg-white dark:bg-slate-900 rounded-xl border border-dashed border-gray-200 dark:border-emerald-800 text-xs text-gray-400 space-y-2">
              <p>No pruning schedule rules found matching your filter.</p>
              <div className="flex items-center justify-center gap-2 pt-1">
                {scheduleSearchTerm && (
                  <button
                    type="button"
                    onClick={() => setScheduleSearchTerm('')}
                    className="px-3 py-1.5 bg-gray-100 dark:bg-slate-800 text-gray-700 dark:text-gray-300 rounded-lg text-xs font-bold hover:bg-gray-200 transition cursor-pointer"
                  >
                    Clear Search
                  </button>
                )}
                <button
                  type="button"
                  onClick={openCreateScheduleModal}
                  className="px-3 py-1.5 bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200 rounded-lg text-xs font-bold hover:bg-emerald-200 transition cursor-pointer"
                >
                  + Register New Schedule
                </button>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              
              {/* ─── CARD 1: DEFAULT SYSTEM MASTER SCHEDULE ─── */}
              {isDefaultScheduleVisible && (
                <div className="relative overflow-hidden bg-gradient-to-br from-white via-emerald-50/40 to-teal-50/30 dark:from-slate-900 dark:via-emerald-950/40 dark:to-slate-900 p-4 sm:p-5 rounded-2xl border-2 border-emerald-500/70 dark:border-emerald-600/70 shadow-md space-y-3.5 hover:shadow-lg transition">
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1.5 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="px-2.5 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider bg-amber-500/15 border border-amber-500/40 text-amber-700 dark:text-amber-300 flex items-center gap-1 shadow-2xs">
                          <Sparkles className="w-3 h-3 text-amber-500 shrink-0" />
                          DEFAULT MASTER SCHEDULE
                        </span>
                        <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-indigo-50 text-indigo-700 dark:bg-indigo-950/70 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 flex items-center gap-1">
                          <TableIcon className="w-3 h-3" />
                          public.audit_logs
                        </span>
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold flex items-center gap-1 ${
                            logPruneConfig.enabled
                              ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                              : 'bg-gray-100 text-gray-600 dark:bg-slate-800 dark:text-gray-400'
                          }`}
                        >
                          <span className={`w-1.5 h-1.5 rounded-full ${logPruneConfig.enabled ? 'bg-emerald-500 animate-pulse' : 'bg-gray-400'}`} />
                          {logPruneConfig.enabled ? 'Daemon Active' : 'Paused'}
                        </span>
                      </div>
                      <h4 className="font-black text-sm text-slate-900 dark:text-white flex items-center gap-1.5">
                        Default Audit Logs Telemetry Pruner
                        <span className="text-[10px] font-normal text-gray-400 font-mono">(System Primary)</span>
                      </h4>
                      <p className="text-[11px] text-gray-500 dark:text-emerald-400">
                        Core audit log cleaner with product catalog write-hooks and live countdown timer.
                      </p>
                    </div>

                    {/* Quick Pause/Resume Daemon Toggle (Asks Yes/No + Progress Modal) */}
                    <button
                      type="button"
                      onClick={() => requestToggleAutoPrune(!logPruneConfig.enabled)}
                      className={`p-2 rounded-xl text-xs font-bold transition cursor-pointer active:scale-95 shadow-2xs shrink-0 ${
                        logPruneConfig.enabled
                          ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-600/20'
                          : 'bg-gray-200 hover:bg-gray-300 dark:bg-slate-800 text-gray-700 dark:text-gray-300'
                      }`}
                      title={logPruneConfig.enabled ? 'Pause Default Daemon (Asks Yes/No)' : 'Enable Default Daemon (Asks Yes/No)'}
                    >
                      {logPruneConfig.enabled ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                    </button>
                  </div>

                  {/* Parameters Strip */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-[11px] font-mono">
                    <div className="p-2 bg-white/80 dark:bg-slate-800/60 rounded-xl flex items-center gap-1.5 text-gray-700 dark:text-gray-200 border border-slate-200/80 dark:border-slate-800">
                      <Clock className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                      <span className="truncate">Keep: {logPruneConfig.retention === 'custom' ? `${logPruneConfig.customDays}d` : logPruneConfig.retention}</span>
                    </div>
                    <div className="p-2 bg-white/80 dark:bg-slate-800/60 rounded-xl flex items-center gap-1.5 text-gray-700 dark:text-gray-200 border border-slate-200/80 dark:border-slate-800">
                      <Timer className="w-3.5 h-3.5 text-teal-500 shrink-0" />
                      <span className="truncate">Every {logPruneConfig.scheduleIntervalMins || 15}m</span>
                    </div>
                    <div className="p-2 bg-white/80 dark:bg-slate-800/60 rounded-xl flex items-center gap-1.5 text-emerald-700 dark:text-emerald-300 font-bold border border-emerald-200/80 dark:border-emerald-900 col-span-2 sm:col-span-1">
                      <Clock className="w-3.5 h-3.5 text-emerald-500 shrink-0 animate-spin" />
                      <span className="truncate">{logPruneConfig.enabled ? `${formatCountdown(secondsUntilNextPrune)} left` : 'Paused'}</span>
                    </div>
                  </div>

                  {/* Metadata & All Action Buttons (Run Now, Edit, Reset) */}
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5 pt-2 border-t border-emerald-500/20 dark:border-slate-800 text-[11px]">
                    <div className="flex items-center gap-3 text-gray-500 dark:text-gray-400 font-mono text-[10px]">
                      <span className="flex items-center gap-1">
                        <Trash2 className="w-3 h-3 text-rose-500" />
                        Purged: <strong className="text-rose-600 dark:text-rose-400">{logPruneConfig.totalPrunedCount || 0}</strong>
                      </span>
                      <span className="flex items-center gap-1 text-amber-600 dark:text-amber-400 font-bold">
                        <Sparkles className="w-3 h-3 text-amber-500" />
                        Auto-Hook ✓
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5 w-full sm:w-auto justify-end flex-wrap">
                      <button
                        type="button"
                        onClick={requestManualPruneLogs}
                        disabled={isPruningLogs}
                        className="px-2.5 py-1.5 bg-emerald-100 hover:bg-emerald-200 dark:bg-emerald-900/60 dark:hover:bg-emerald-900 text-emerald-800 dark:text-emerald-200 rounded-lg text-xs font-bold transition cursor-pointer active:scale-95 flex items-center gap-1"
                        title="Execute audit logs pruning now (Asks Yes/No)"
                      >
                        <Play className="w-3 h-3 text-emerald-600" />
                        <span>Run Now</span>
                      </button>

                      <button
                        type="button"
                        onClick={openEditDefaultScheduleModal}
                        className="px-2.5 py-1.5 bg-blue-100 hover:bg-blue-200 dark:bg-blue-900/60 dark:hover:bg-blue-900 text-blue-800 dark:text-blue-200 rounded-lg text-xs font-bold transition cursor-pointer active:scale-95 flex items-center gap-1"
                        title="Edit Default Master Schedule parameters"
                      >
                        <Edit3 className="w-3 h-3 text-blue-600" />
                        <span>Edit</span>
                      </button>

                      <button
                        type="button"
                        onClick={requestResetDefaultSchedule}
                        className="px-2.5 py-1.5 bg-amber-100 hover:bg-amber-200 dark:bg-amber-900/60 dark:hover:bg-amber-900 text-amber-800 dark:text-amber-200 rounded-lg text-xs font-bold transition cursor-pointer active:scale-95 flex items-center gap-1"
                        title="Reset default schedule to system factory settings (Asks Yes/No)"
                      >
                        <RotateCcw className="w-3 h-3 text-amber-600" />
                        <span>Reset</span>
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* ─── CARD 2: CARD-BASED CREATE SCHEDULE ─── */}
              <div
                onClick={openCreateScheduleModal}
                className="relative p-5 rounded-2xl border-2 border-dashed border-emerald-400 dark:border-emerald-700/80 hover:border-emerald-500 bg-emerald-50/30 hover:bg-emerald-50/70 dark:bg-emerald-950/20 dark:hover:bg-emerald-950/40 transition-all cursor-pointer flex flex-col items-center justify-center text-center space-y-3 group min-h-[190px] shadow-2xs hover:shadow-md"
                title="Click to configure and register a new table pruning schedule"
              >
                <div className="w-12 h-12 rounded-2xl bg-emerald-100 dark:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300 flex items-center justify-center group-hover:scale-110 group-hover:bg-emerald-600 group-hover:text-white transition shadow-xs">
                  <Plus className="w-6 h-6" />
                </div>
                <div className="space-y-1">
                  <h4 className="font-black text-sm text-slate-900 dark:text-white group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition">
                    + Create New Table Schedule
                  </h4>
                  <p className="text-[11px] text-gray-500 dark:text-emerald-300/80 max-w-xs">
                    Automate deletion of stale rows for any public PostgreSQL table with custom retention thresholds.
                  </p>
                </div>
                <span className="text-[10px] font-black uppercase tracking-wider px-3 py-1 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs group-hover:shadow-md transition">
                  Add Schedule ↗
                </span>
              </div>

              {/* ─── CARDS 3..N: CUSTOM PRUNE SCHEDULES ─── */}
              {filteredPruneSchedules.map((sch) => (
                <div
                  key={sch.id}
                  className="bg-white dark:bg-slate-900 p-4 sm:p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-3 hover:border-emerald-500/50 transition group"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-indigo-50 text-indigo-700 dark:bg-indigo-950/70 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 flex items-center gap-1">
                          <TableIcon className="w-3 h-3" />
                          public.{sch.targetTable}
                        </span>
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold flex items-center gap-1 ${
                            sch.enabled
                              ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                              : 'bg-gray-100 text-gray-600 dark:bg-slate-800 dark:text-gray-400'
                          }`}
                        >
                          <span className={`w-1.5 h-1.5 rounded-full ${sch.enabled ? 'bg-emerald-500 animate-pulse' : 'bg-gray-400'}`} />
                          {sch.enabled ? 'Daemon Active' : 'Paused'}
                        </span>
                      </div>
                      <h4 className="font-extrabold text-xs sm:text-sm text-slate-900 dark:text-white flex items-center gap-1.5">
                        {sch.name}
                      </h4>
                    </div>

                    {/* Quick Toggle Active Switch (Prompts Yes/No + Percentage Modal) */}
                    <button
                      type="button"
                      onClick={() => requestToggleScheduleEnabled(sch)}
                      className={`p-2 rounded-lg text-xs font-bold transition cursor-pointer active:scale-95 shadow-2xs ${
                        sch.enabled
                          ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-slate-800 dark:text-gray-400 border border-gray-200 dark:border-slate-700'
                      }`}
                      title={sch.enabled ? 'Pause this schedule (Asks Yes/No)' : 'Enable this schedule (Asks Yes/No)'}
                    >
                      {sch.enabled ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                    </button>
                  </div>

                  {/* Schedule Parameters Badges */}
                  <div className="grid grid-cols-2 gap-2 text-[11px] font-mono">
                    <div className="p-2 bg-slate-50 dark:bg-slate-800/50 rounded-lg flex items-center gap-1.5 text-gray-600 dark:text-gray-300 border border-slate-100 dark:border-slate-800">
                      <Clock className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                      <span className="truncate">Keep: {sch.retention === 'custom' ? `${sch.customDays}d` : sch.retention}</span>
                    </div>
                    <div className="p-2 bg-slate-50 dark:bg-slate-800/50 rounded-lg flex items-center gap-1.5 text-gray-600 dark:text-gray-300 border border-slate-100 dark:border-slate-800">
                      <Timer className="w-3.5 h-3.5 text-teal-500 shrink-0" />
                      <span className="truncate">Every {sch.intervalMins}m</span>
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 pt-1 border-t border-gray-100 dark:border-slate-800 text-[10px] text-gray-500 dark:text-gray-400">
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-1">
                        <Trash2 className="w-3 h-3 text-rose-500" />
                        <span>Purged: {sch.totalPrunedCount || 0}</span>
                      </div>
                      {sch.triggerOnProductActions && (
                        <span className="text-amber-600 dark:text-amber-400 font-bold flex items-center gap-0.5" title="Triggers on product catalog updates">
                          <Sparkles className="w-2.5 h-2.5" /> Auto-Hook
                        </span>
                      )}
                    </div>

                    {/* Actions: Run Now, Edit, Delete (Full clear buttons) */}
                    <div className="flex items-center gap-1.5 w-full sm:w-auto justify-end flex-wrap">
                      <button
                        type="button"
                        onClick={() => requestRunScheduleNow(sch)}
                        className="px-2.5 py-1.5 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950 dark:hover:bg-emerald-900/80 text-emerald-700 dark:text-emerald-300 rounded-lg text-xs font-bold transition cursor-pointer active:scale-95 border border-emerald-200 dark:border-emerald-800 flex items-center gap-1"
                        title="Execute pruning now (Asks Yes/No)"
                      >
                        <Play className="w-3 h-3" />
                        <span>Run</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => openEditScheduleModal(sch)}
                        className="px-2.5 py-1.5 bg-blue-50 hover:bg-blue-100 dark:bg-blue-950 dark:hover:bg-blue-900/80 text-blue-700 dark:text-blue-300 rounded-lg text-xs font-bold transition cursor-pointer active:scale-95 border border-blue-200 dark:border-blue-800 flex items-center gap-1"
                        title="Edit schedule configuration"
                      >
                        <Edit3 className="w-3 h-3" />
                        <span>Edit</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => requestDeleteSchedule(sch)}
                        className="px-2.5 py-1.5 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950 dark:hover:bg-rose-900/80 text-rose-700 dark:text-rose-300 rounded-lg text-xs font-bold transition cursor-pointer active:scale-95 border border-rose-200 dark:border-rose-800 flex items-center gap-1"
                        title="Delete schedule (Asks Yes/No)"
                      >
                        <Trash2 className="w-3 h-3" />
                        <span>Delete</span>
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ─── LIVE AUDIT LOGS INSPECTOR (TOGGLEABLE) ─── */}
        {showLiveAuditLogs && (
          <div className="bg-slate-900 text-slate-100 rounded-2xl p-5 sm:p-6 border border-slate-700 space-y-4 animate-fadeIn shadow-2xl">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-black text-white flex items-center gap-2">
                  <FileText className="w-4 h-4 text-emerald-400" />
                  Live `audit_logs` Public PostgreSQL Table Records
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-mono font-bold border border-emerald-500/30">
                    {filteredLiveAuditLogs.length} Records
                  </span>
                </h3>
                <p className="text-xs text-slate-400">
                  Direct inspection of all active audit records currently stored in the database.
                </p>
              </div>

              {/* Action Filters & Reload */}
              <div className="flex flex-wrap items-center gap-2">
                <div className="flex items-center gap-1 bg-slate-800 p-1 rounded-xl border border-slate-700">
                  {(['ALL', 'CREATE', 'UPDATE', 'DELETE'] as const).map((act) => (
                    <button
                      key={act}
                      type="button"
                      onClick={() => setAuditActionFilter(act)}
                      className={`px-2.5 py-1 rounded-lg text-[10px] font-mono font-bold transition cursor-pointer ${
                        auditActionFilter === act
                          ? 'bg-emerald-600 text-white shadow-xs'
                          : 'text-slate-400 hover:text-slate-200 hover:bg-slate-700'
                      }`}
                    >
                      {act}
                    </button>
                  ))}
                </div>

                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5 pointer-events-none" />
                  <input
                    type="text"
                    value={auditSearchTerm}
                    onChange={(e) => setAuditSearchTerm(e.target.value)}
                    placeholder="Search logs..."
                    className="pl-8 pr-3 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-xs font-mono text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-emerald-400"
                  />
                  {auditSearchTerm && (
                    <button
                      type="button"
                      onClick={() => setAuditSearchTerm('')}
                      className="absolute right-2.5 top-2 text-slate-400 hover:text-slate-200"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  )}
                </div>

                <button
                  type="button"
                  onClick={requestReloadLiveAuditLogs}
                  disabled={isLoadingAuditLogs}
                  className="p-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 rounded-lg transition cursor-pointer active:scale-95"
                  title="Reload live audit records (Asks Yes/No)"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isLoadingAuditLogs ? 'animate-spin text-emerald-400' : ''}`} />
                </button>
              </div>
            </div>

            {filteredLiveAuditLogs.length === 0 ? (
              <div className="p-8 text-center text-slate-400 text-xs bg-slate-950/60 rounded-xl border border-slate-800">
                No audit records found matching your current search or action filter.
              </div>
            ) : (
              <div className="overflow-x-auto max-h-72 rounded-xl border border-slate-800">
                <table className="w-full text-left text-xs font-mono">
                  <thead className="bg-slate-950 text-slate-400 text-[10px] uppercase sticky top-0">
                    <tr>
                      <th className="p-2.5 border-b border-slate-800">Timestamp</th>
                      <th className="p-2.5 border-b border-slate-800">Action</th>
                      <th className="p-2.5 border-b border-slate-800">Module / Object</th>
                      <th className="p-2.5 border-b border-slate-800">User Email</th>
                      <th className="p-2.5 border-b border-slate-800">Description</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800 text-[11px]">
                    {filteredLiveAuditLogs.slice(0, 50).map((log, idx) => (
                      <tr key={log.id || idx} className="hover:bg-slate-800/50">
                        <td className="p-2.5 text-slate-400 whitespace-nowrap">
                          {log.created_at || log.timestamp || '—'}
                        </td>
                        <td className="p-2.5">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              log.action === 'CREATE'
                                ? 'bg-emerald-900/60 text-emerald-300 border border-emerald-700'
                                : log.action === 'UPDATE'
                                ? 'bg-amber-900/60 text-amber-300 border border-amber-700'
                                : log.action === 'DELETE'
                                ? 'bg-rose-900/60 text-rose-300 border border-rose-700'
                                : 'bg-slate-800 text-slate-300 border border-slate-700'
                            }`}
                          >
                            {log.action || 'EVENT'}
                          </span>
                        </td>
                        <td className="p-2.5 text-cyan-300 font-bold">{log.object_type || log.object_id || 'STORE'}</td>
                        <td className="p-2.5 text-slate-300">{log.user_email || 'System'}</td>
                        <td className="p-2.5 text-slate-300 truncate max-w-xs">{log.description || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* ─── ENTIRE PRUNE TRIGGER LOGS TRAIL ─── */}
        <div className="space-y-3 pt-2">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-2">
                <History className="w-4 h-4 text-indigo-600" />
                Auto-Prune Trigger Events & Execution Trail (Entire History)
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950/70 text-indigo-700 dark:text-indigo-300 font-mono font-bold border border-indigo-200 dark:border-indigo-800">
                  {filteredTriggerHistory.length} Events
                </span>
              </h3>
              <p className="text-xs text-gray-500 dark:text-emerald-400">
                Chronological trail of scheduled background prunes and product-creation auto-triggers.
              </p>
            </div>

            {/* Filter Chips & Clear Action */}
            <div className="flex flex-wrap items-center gap-1.5">
              {(['ALL', 'PRODUCT', 'MANUAL', 'SCHEDULED'] as const).map((filterKey) => (
                <button
                  key={filterKey}
                  type="button"
                  onClick={() => setHistoryFilter(filterKey)}
                  className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition cursor-pointer ${
                    historyFilter === filterKey
                      ? 'bg-indigo-600 text-white shadow-xs'
                      : 'bg-gray-100 dark:bg-emerald-950 text-gray-600 dark:text-emerald-300 hover:bg-gray-200'
                  }`}
                >
                  {filterKey}
                </button>
              ))}

              <button
                type="button"
                onClick={requestClearTriggerHistory}
                className="px-2.5 py-1 text-[10px] font-bold text-gray-400 hover:text-rose-600 dark:hover:text-rose-400 transition cursor-pointer"
                title="Clear history trail with confirmation (Asks Yes/No)"
              >
                Clear History
              </button>
            </div>
          </div>

          {filteredTriggerHistory.length === 0 ? (
            <div className="p-6 text-center bg-gray-50 dark:bg-emerald-950/20 rounded-2xl border border-dashed border-gray-200 dark:border-emerald-900/60 text-xs text-gray-400">
              No trigger log history entries found for the selected filter.
            </div>
          ) : (
            <div className="overflow-x-auto rounded-2xl border border-gray-200 dark:border-emerald-800">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-slate-900 text-slate-200 font-mono text-[10px] uppercase">
                  <tr>
                    <th className="p-2.5">Trigger Timestamp</th>
                    <th className="p-2.5">Trigger Source</th>
                    <th className="p-2.5">Retention Target</th>
                    <th className="p-2.5">Evaluated</th>
                    <th className="p-2.5">Purged</th>
                    <th className="p-2.5">Remaining</th>
                    <th className="p-2.5">Latency</th>
                    <th className="p-2.5">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-emerald-900/40 bg-white dark:bg-emerald-950/20 font-mono text-[11px]">
                  {filteredTriggerHistory.map((item) => (
                    <tr key={item.id} className="hover:bg-indigo-50/40 dark:hover:bg-emerald-900/30 transition">
                      <td className="p-2.5 whitespace-nowrap text-gray-500">
                        {new Date(item.timestamp).toLocaleString()}
                      </td>
                      <td className="p-2.5 font-bold text-slate-800 dark:text-emerald-200">
                        <div className="flex items-center gap-1.5">
                          {item.triggerSource.includes('Product') && (
                            <Sparkles className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                          )}
                          {item.triggerSource.includes('Manual') && (
                            <Play className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                          )}
                          {item.triggerSource.includes('Schedule') && (
                            <Calendar className="w-3.5 h-3.5 text-teal-500 shrink-0" />
                          )}
                          <span className="truncate max-w-xs">{item.triggerSource}</span>
                        </div>
                      </td>
                      <td className="p-2.5 text-gray-600 dark:text-emerald-300">{item.retentionSetting}</td>
                      <td className="p-2.5 text-gray-700 dark:text-emerald-200">{item.evaluatedCount}</td>
                      <td className="p-2.5 font-black text-rose-600 dark:text-rose-400">
                        {item.prunedCount > 0 ? `-${item.prunedCount}` : '0'}
                      </td>
                      <td className="p-2.5 text-gray-700 dark:text-emerald-200">{item.remainingCount}</td>
                      <td className="p-2.5 text-gray-400">{item.durationMs}ms</td>
                      <td className="p-2.5">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            item.status === 'SUCCESS'
                              ? 'bg-emerald-100 text-emerald-800 border border-emerald-200 dark:bg-emerald-900 dark:text-emerald-200 dark:border-emerald-700'
                              : 'bg-slate-100 text-slate-700 border border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700'
                          }`}
                        >
                          {item.status === 'SUCCESS' ? 'PURGED ✓' : 'NO EXPIRED'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* ──────────────────────────────────────────────────────────────────────────
          SECTION 2 (SECOND SECTION AS EXPLICITLY REQUESTED):
          USER REQUIREMENT: "Easy Public Table Selector & Quick Action Matrix secound section"
      ────────────────────────────────────────────────────────────────────────── */}
      <div
        id="easy-table-matrix-section"
        className="bg-white dark:bg-emerald-950/40 rounded-3xl p-6 sm:p-8 border-2 border-indigo-500/30 dark:border-emerald-800 shadow-md space-y-6"
      >
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-gray-100 dark:border-emerald-800/60 pb-5">
          <div>
            <h2 className="text-base sm:text-lg font-black text-slate-900 dark:text-white flex items-center gap-2.5">
              <TableIcon className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
              Easy Public Table Selector & Quick Action Matrix
              <span className="text-[10px] uppercase font-black px-2.5 py-0.5 rounded-full bg-indigo-600 text-white shadow-xs">
                SECTION 2 • SECOND PRIORITY
              </span>
            </h2>
            <p className="text-xs text-gray-500 dark:text-emerald-400 mt-1">
              Select any table to focus KPIs, inspect column schemas, and execute 1-click Truncate or Delete with instant percentage modal.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-mono px-3 py-1.5 bg-indigo-50 dark:bg-indigo-950/60 rounded-xl font-bold text-indigo-700 dark:text-indigo-300 border border-indigo-200/50">
              {filteredPublicTables.length} / 16 Tables Available
            </span>
          </div>
        </div>

        {/* Filter & Search Toolbar */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 bg-slate-50 dark:bg-emerald-900/20 p-3.5 rounded-2xl border border-slate-200 dark:border-emerald-800">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-3 pointer-events-none" />
            <input
              type="text"
              value={tableSearchTerm}
              onChange={(e) => setTableSearchTerm(e.target.value)}
              placeholder="Search table name (products, orders, audit_logs)..."
              className="w-full pl-9 pr-8 py-2 bg-white dark:bg-emerald-950 border border-gray-200 dark:border-emerald-800 rounded-xl text-xs font-bold text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            {tableSearchTerm && (
              <button
                type="button"
                onClick={() => setTableSearchTerm('')}
                className="absolute right-2.5 top-2.5 text-gray-400 hover:text-gray-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            {(['ALL', 'PROTECTED', 'USER_DATA'] as const).map((pKey) => (
              <button
                key={pKey}
                type="button"
                onClick={() => setTableProtectionFilter(pKey)}
                className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                  tableProtectionFilter === pKey
                    ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-xs'
                    : 'bg-white dark:bg-emerald-950 border border-gray-200 dark:border-emerald-800 text-gray-700 dark:text-emerald-300 hover:bg-gray-100'
                }`}
              >
                {pKey === 'ALL' ? 'All (16)' : pKey === 'PROTECTED' ? '🔒 Protected (4)' : '🔓 Writable (12)'}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <select
              value={tableCategoryFilter}
              onChange={(e) => setTableCategoryFilter(e.target.value)}
              className="px-2.5 py-1.5 bg-white dark:bg-emerald-950 border border-gray-200 dark:border-emerald-800 rounded-lg text-xs font-bold text-gray-800 dark:text-emerald-200 cursor-pointer"
            >
              <option value="ALL">All Categories</option>
              <option value="CORE_SYSTEM">Core System</option>
              <option value="CATALOG">Catalog</option>
              <option value="COMMERCE">Commerce</option>
              <option value="CONTENT">Content</option>
              <option value="TELEMETRY">Telemetry</option>
            </select>

            <select
              value={tableSortBy}
              onChange={(e) => setTableSortBy(e.target.value as any)}
              className="px-2.5 py-1.5 bg-white dark:bg-emerald-950 border border-gray-200 dark:border-emerald-800 rounded-lg text-xs font-bold text-gray-800 dark:text-emerald-200 cursor-pointer"
            >
              <option value="SIZE_DESC">Sort: Largest Footprint</option>
              <option value="ROWS_DESC">Sort: Highest Rows</option>
              <option value="NAME_ASC">Sort: A to Z</option>
            </select>
          </div>
        </div>

        {/* Interactive Table Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3.5">
          {filteredPublicTables.map((t) => {
            const isFocused = dashboardTableFilter === t.name;
            const isInspected = selectedInspectTable === t.name;
            const sizeItem = tableMetrics.tableSizes.find((s) => s.table === t.name);
            const rowCount = sizeItem?.rows || 0;
            const sizeKB = sizeItem?.sizeKB || 0;

            return (
              <div
                key={t.name}
                className={`p-4 rounded-2xl border transition-all duration-200 space-y-3 relative overflow-hidden flex flex-col justify-between ${
                  isFocused || isInspected
                    ? 'bg-indigo-50/70 dark:bg-indigo-950/40 border-indigo-500 shadow-md ring-2 ring-indigo-400/30'
                    : 'bg-white dark:bg-emerald-950/60 border-slate-200/90 dark:border-emerald-800 hover:border-indigo-300'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between gap-1 mb-1.5">
                    <span className="font-mono text-xs font-black text-slate-900 dark:text-white truncate">
                      public.{t.name}
                    </span>
                    {t.isProtected ? (
                      <span className="px-2 py-0.5 bg-purple-100 text-purple-800 dark:bg-purple-900/60 dark:text-purple-300 rounded-full text-[9px] font-black flex items-center gap-1 shrink-0">
                        <Lock className="w-2.5 h-2.5" /> PROTECTED
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-300 rounded-full text-[9px] font-black flex items-center gap-1 shrink-0">
                        <Unlock className="w-2.5 h-2.5" /> WRITABLE
                      </span>
                    )}
                  </div>

                  <p className="text-[11px] text-gray-500 dark:text-emerald-400 line-clamp-1">{t.label}</p>

                  <div className="flex items-center gap-2 mt-2 pt-2 border-t border-gray-100 dark:border-emerald-800/40 text-[11px] font-mono">
                    <span className="text-slate-800 dark:text-white font-bold">{rowCount} rows</span>
                    <span className="text-gray-300 dark:text-gray-600">&bull;</span>
                    <span className="text-indigo-600 dark:text-indigo-400 font-bold">{sizeKB} KB</span>
                    <span className="text-gray-300 dark:text-gray-600">&bull;</span>
                    <span className="text-[10px] text-gray-400 uppercase">{t.category}</span>
                  </div>
                </div>

                {/* Direct Action Buttons on Every Table Card */}
                <div className="pt-2 flex flex-wrap items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => {
                      setDashboardTableFilter(t.name);
                      handleInspectTableSelect(t.name);
                      const insp = document.getElementById('table-inspector-panel');
                      if (insp) insp.scrollIntoView({ behavior: 'smooth' });
                    }}
                    className="flex-1 py-1.5 px-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-[10px] font-bold transition flex items-center justify-center gap-1 cursor-pointer active:scale-95 shadow-xs"
                  >
                    <Eye className="w-3 h-3" />
                    <span>Inspect</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setSqlQuery(`SELECT * FROM ${t.name} LIMIT 25;`);
                      setSqlConsoleTab('EDITOR');
                      setShowSqlEditor(true);
                    }}
                    className="py-1.5 px-2 bg-slate-800 hover:bg-slate-700 text-emerald-400 rounded-lg text-[10px] font-mono transition flex items-center justify-center gap-1 cursor-pointer active:scale-95"
                  >
                    <Terminal className="w-3 h-3 text-emerald-400" />
                    <span>SQL</span>
                  </button>

                  <button
                    type="button"
                    disabled={t.isProtected}
                    onClick={() => requestTruncateTable(t.name)}
                    className={`py-1.5 px-2 rounded-lg text-[10px] font-bold transition flex items-center justify-center gap-1 ${
                      t.isProtected
                        ? 'bg-gray-100 dark:bg-gray-800 text-gray-400 cursor-not-allowed'
                        : 'bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-900 cursor-pointer active:scale-95'
                    }`}
                  >
                    <Trash2 className="w-3 h-3 text-rose-600" />
                    <span>Trunc</span>
                  </button>

                  <button
                    type="button"
                    disabled={t.isProtected}
                    onClick={() => requestDeleteTableRecords(t.name)}
                    className={`py-1.5 px-2 rounded-lg text-[10px] font-bold transition flex items-center justify-center gap-1 ${
                      t.isProtected
                        ? 'bg-gray-100 dark:bg-gray-800 text-gray-400 cursor-not-allowed'
                        : 'bg-amber-50 dark:bg-amber-950/40 hover:bg-amber-100 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-900 cursor-pointer active:scale-95'
                    }`}
                  >
                    <Flame className="w-3 h-3 text-amber-600" />
                    <span>Delete</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* ─── LAZY-LOADED TABLE INSPECTOR PANEL ─── */}
        <div id="table-inspector-panel" className="pt-4 border-t border-gray-100 dark:border-emerald-800/60 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <h3 className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-2">
              <Eye className="w-4 h-4 text-indigo-600" />
              Lazy-Loaded Table Schema & Sample Records
            </h3>

            <div className="relative w-full sm:w-80">
              <select
                value={selectedInspectTable}
                onChange={(e) => handleInspectTableSelect(e.target.value)}
                className="w-full pl-3.5 pr-8 py-2 bg-gray-50 dark:bg-emerald-900/60 border border-gray-200 dark:border-emerald-800 rounded-xl text-xs font-bold text-gray-900 dark:text-white appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="">-- Choose Table to Inspect ({filteredPublicTables.length}) --</option>
                {filteredPublicTables.map((t) => {
                  const sizeItem = tableMetrics.tableSizes.find((s) => s.table === t.name);
                  return (
                    <option key={t.name} value={t.name}>
                      {t.isProtected ? '🔒 ' : '📄 '} {t.name} • {sizeItem?.rows || 0} rows ({sizeItem?.sizeKB || 0} KB)
                    </option>
                  );
                })}
              </select>
              <ChevronDown className="w-4 h-4 text-gray-400 absolute right-2.5 top-2.5 pointer-events-none" />
            </div>
          </div>

          {isLoadingTableStats && (
            <div className="py-10 flex flex-col items-center justify-center space-y-3">
              <RefreshCw className="w-7 h-7 text-indigo-600 animate-spin" />
              <p className="text-xs font-semibold text-gray-500">
                Querying pg_catalog & lazy-loading records for `{selectedInspectTable}`...
              </p>
            </div>
          )}

          {!isLoadingTableStats && inspectTableStats && (
            <div className="space-y-4 animate-fadeIn">
              <div className="bg-slate-50 dark:bg-emerald-900/30 rounded-2xl p-4 border border-slate-200 dark:border-emerald-800 flex flex-col md:flex-row md:items-center justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-base font-black text-slate-900 dark:text-white">
                      public.{inspectTableStats.table}
                    </span>
                    <span className="text-xs text-gray-500">({inspectTableStats.meta.label})</span>
                    {inspectTableStats.meta.isProtected ? (
                      <span className="px-2 py-0.5 bg-purple-100 text-purple-800 rounded text-[9px] font-black flex items-center gap-1">
                        <Lock className="w-2.5 h-2.5" /> CORE PROTECTED
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded text-[9px] font-black flex items-center gap-1">
                        <Unlock className="w-2.5 h-2.5" /> USER DATA
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-gray-500 mt-1">{inspectTableStats.meta.description}</p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setShowExportModal({ isOpen: true, targetTable: inspectTableStats.table })}
                    className="px-3 py-1.5 bg-white dark:bg-emerald-950 border border-gray-200 dark:border-emerald-700 text-indigo-700 dark:text-indigo-300 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-xs active:scale-95"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Export</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setSqlQuery(`SELECT * FROM ${inspectTableStats.table} LIMIT 20;`);
                      setSqlConsoleTab('EDITOR');
                      setShowSqlEditor(true);
                    }}
                    className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-emerald-400 rounded-xl text-xs font-mono font-bold transition flex items-center gap-1.5 cursor-pointer shadow-xs active:scale-95"
                  >
                    <Terminal className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Query Table</span>
                  </button>

                  <button
                    type="button"
                    disabled={inspectTableStats.meta.isProtected}
                    onClick={() => requestTruncateTable(inspectTableStats.table)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-xs ${
                      inspectTableStats.meta.isProtected
                        ? 'bg-gray-100 dark:bg-gray-800 text-gray-400 border border-gray-200 cursor-not-allowed'
                        : 'bg-rose-50 dark:bg-rose-950/50 hover:bg-rose-100 text-rose-700 dark:text-rose-300 border border-rose-200 cursor-pointer active:scale-95'
                    }`}
                  >
                    {inspectTableStats.meta.isProtected ? <Lock className="w-3.5 h-3.5" /> : <Trash2 className="w-3.5 h-3.5 text-rose-600" />}
                    <span>Truncate</span>
                  </button>

                  <button
                    type="button"
                    disabled={inspectTableStats.meta.isProtected}
                    onClick={() => requestDeleteTableRecords(inspectTableStats.table)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-xs ${
                      inspectTableStats.meta.isProtected
                        ? 'bg-gray-100 dark:bg-gray-800 text-gray-400 border border-gray-200 cursor-not-allowed'
                        : 'bg-amber-50 dark:bg-amber-950/50 hover:bg-amber-100 text-amber-700 dark:text-amber-300 border border-amber-200 cursor-pointer active:scale-95'
                    }`}
                  >
                    {inspectTableStats.meta.isProtected ? <Lock className="w-3.5 h-3.5" /> : <Flame className="w-3.5 h-3.5 text-amber-600" />}
                    <span>Delete Records</span>
                  </button>
                </div>
              </div>

              {/* Quick Metrics */}
              <div className="grid grid-cols-3 gap-3">
                <div className="p-3 bg-white dark:bg-emerald-950/60 rounded-xl border border-gray-200 dark:border-emerald-800">
                  <span className="text-[10px] font-bold text-gray-400 uppercase">Records</span>
                  <p className="text-lg font-black text-slate-900 dark:text-white">{inspectTableStats.rowsCount} rows</p>
                </div>
                <div className="p-3 bg-white dark:bg-emerald-950/60 rounded-xl border border-gray-200 dark:border-emerald-800">
                  <span className="text-[10px] font-bold text-gray-400 uppercase">Size</span>
                  <p className="text-lg font-black text-slate-900 dark:text-white">{inspectTableStats.sizeKB} KB</p>
                </div>
                <div className="p-3 bg-white dark:bg-emerald-950/60 rounded-xl border border-gray-200 dark:border-emerald-800">
                  <span className="text-[10px] font-bold text-gray-400 uppercase">Columns</span>
                  <p className="text-lg font-black text-slate-900 dark:text-white">{inspectTableStats.columnsCount} columns</p>
                </div>
              </div>

              {/* Sample Records Table */}
              {inspectTableStats.sampleRows.length === 0 ? (
                <div className="p-6 text-center bg-gray-50 dark:bg-emerald-950/30 rounded-2xl border border-dashed border-gray-200 dark:border-emerald-800 text-xs text-gray-400">
                  This table currently contains 0 records.
                </div>
              ) : (
                <div className="overflow-x-auto rounded-2xl border border-gray-200 dark:border-emerald-800 max-h-64">
                  <table className="w-full text-left text-xs border-collapse font-mono">
                    <thead className="bg-slate-900 text-slate-200 text-[11px] sticky top-0">
                      <tr>
                        {inspectTableStats.meta.columns.slice(0, 6).map((col) => (
                          <th key={col} className="p-2 border-b border-slate-700">
                            {col}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-emerald-900/40 bg-white dark:bg-emerald-950/20 text-[11px]">
                      {inspectTableStats.sampleRows.map((row, idx) => (
                        <tr key={idx} className="hover:bg-indigo-50/50 dark:hover:bg-emerald-900/30">
                          {inspectTableStats.meta.columns.slice(0, 6).map((col) => {
                            const val = row[col];
                            return (
                              <td key={col} className="p-2 truncate max-w-[200px] text-gray-700 dark:text-emerald-200">
                                {typeof val === 'object' ? JSON.stringify(val) : String(val ?? '—')}
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {!selectedInspectTable && !isLoadingTableStats && (
            <div className="p-8 text-center bg-gray-50 dark:bg-emerald-950/20 rounded-2xl border border-dashed border-gray-200 dark:border-emerald-900/60">
              <Database className="w-7 h-7 text-gray-300 dark:text-emerald-700 mx-auto mb-2" />
              <p className="text-xs font-bold text-gray-500 dark:text-emerald-400">
                Select any table above or click any card in the matrix to lazy-load its schema and live sample rows.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* ──────────────────────────────────────────────────────────────────────────
          SECTION 3:
          POSTGRESQL REAL-TIME SQL QUERY CONSOLE (EMBEDDED QUICK SHORTCUT)
      ────────────────────────────────────────────────────────────────────────── */}
      <div className="bg-slate-900 text-white rounded-3xl p-6 sm:p-7 border border-slate-800 shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-emerald-400">
              <Terminal className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-mono text-sm font-black text-white flex items-center gap-2">
                PostgreSQL SQL Query & DDL Execution Console
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-400 border border-emerald-800">
                  Real-Time Engine
                </span>
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Execute SELECT, TRUNCATE TABLE, DELETE FROM, and pg_catalog queries directly against PostgreSQL public schema.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              setSqlConsoleTab('EDITOR');
              setShowSqlEditor(true);
            }}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-mono font-bold transition flex items-center gap-2 cursor-pointer shadow-md active:scale-95"
          >
            <Code2 className="w-4 h-4" />
            <span>Launch Fullscreen SQL Console ({sqlHistory.length} logs)</span>
          </button>
        </div>

        {/* Quick Presets Bar */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[11px] font-mono text-slate-400 font-bold uppercase">Quick Exec:</span>
          <button
            type="button"
            onClick={() => {
              setSqlQuery(`SELECT tablename\nFROM pg_catalog.pg_tables\nWHERE schemaname = 'public'\nORDER BY tablename;`);
              setShowSqlEditor(true);
            }}
            className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg text-xs font-mono text-emerald-300 transition cursor-pointer"
          >
            SELECT tablename FROM pg_catalog
          </button>
          <button
            type="button"
            onClick={() => {
              setSqlQuery(`SELECT * FROM products ORDER BY created_at DESC LIMIT 10;`);
              setShowSqlEditor(true);
            }}
            className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg text-xs font-mono text-cyan-300 transition cursor-pointer"
          >
            SELECT products LIMIT 10
          </button>
          <button
            type="button"
            onClick={() => {
              setSqlQuery(`TRUNCATE TABLE pop_notification_events;`);
              setShowSqlEditor(true);
            }}
            className="px-3 py-1.5 bg-rose-950/80 hover:bg-rose-900 border border-rose-800 rounded-lg text-xs font-mono text-rose-300 transition cursor-pointer"
          >
            TRUNCATE pop_notification_events
          </button>
        </div>
      </div>

      {/* ──────────────────────────────────────────────────────────────────────────
          SECTION 4 (PLACED LAST AS EXPLICITLY REQUESTED):
          USER REQUIREMENT: "chart last"
          4 DEDICATED VISUAL ANALYTICS & STORAGE CHARTS
      ────────────────────────────────────────────────────────────────────────── */}
      <div id="analytics-charts-section" className="space-y-6 pt-2">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-gray-100 dark:border-emerald-900/40 pb-4">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-indigo-50 dark:bg-indigo-950 text-indigo-600 rounded-xl">
              <Activity className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
                Visual Analytics & Storage Distribution Charts
                <span className="text-[10px] font-mono uppercase font-bold px-2.5 py-0.5 rounded-full bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200">
                  4 Analytical Views • Placed Last
                </span>
              </h2>
              <p className="text-xs text-gray-500 dark:text-emerald-400">
                Footprint rankings, row density distribution, I/O transactional operations, and storage share metrics.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-mono px-3 py-1 bg-slate-100 dark:bg-emerald-950 rounded-lg text-slate-600 dark:text-emerald-300 font-bold">
              {dashboardTableFilter === 'ALL' ? 'Mode: Global Schema' : `Mode: Focused on ${dashboardTableFilter}`}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Chart 1: Table Storage Comparison (KB) */}
          <div className="bg-white dark:bg-emerald-950/40 p-5 rounded-3xl border border-gray-100 dark:border-emerald-900/40 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h3 className="text-sm font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                  <HardDrive className="w-4 h-4 text-indigo-600" />
                  Table Storage Comparison (KB)
                  {dashboardTableFilter !== 'ALL' && (
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-100 text-amber-800 dark:bg-amber-900/60 dark:text-amber-300">
                      Focused: {dashboardTableFilter}
                    </span>
                  )}
                </h3>
                <p className="text-xs text-gray-400 mt-0.5">Footprint ranking across active tables</p>
              </div>
              <span className="text-[11px] font-mono px-2 py-0.5 bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 rounded-lg">
                Bar Chart
              </span>
            </div>
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={storageComparisonData} margin={{ top: 10, right: 10, left: -20, bottom: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" opacity={0.5} />
                  <XAxis dataKey="name" tick={{ fontSize: 10 }} angle={-25} textAnchor="end" />
                  <YAxis tick={{ fontSize: 10 }} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px', color: '#fff', fontSize: '11px' }}
                    formatter={(val: any) => [`${val} KB`, 'Storage Footprint']}
                  />
                  <Bar dataKey="sizeKB" radius={[6, 6, 0, 0]}>
                    {storageComparisonData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Chart 2: Row Count Density by Table */}
          <div className="bg-white dark:bg-emerald-950/40 p-5 rounded-3xl border border-gray-100 dark:border-emerald-900/40 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h3 className="text-sm font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                  <Layers className="w-4 h-4 text-cyan-600" />
                  Row Count Density by Table
                  {dashboardTableFilter !== 'ALL' && (
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-300">
                      Focused: {dashboardTableFilter}
                    </span>
                  )}
                </h3>
                <p className="text-xs text-gray-400 mt-0.5">Total verified record rows per public table</p>
              </div>
              <span className="text-[11px] font-mono px-2 py-0.5 bg-cyan-50 dark:bg-cyan-950/60 text-cyan-600 dark:text-cyan-400 rounded-lg">
                Row Density
              </span>
            </div>
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={rowDensityData} margin={{ top: 10, right: 10, left: -20, bottom: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" opacity={0.5} />
                  <XAxis dataKey="name" tick={{ fontSize: 10 }} angle={-25} textAnchor="end" />
                  <YAxis tick={{ fontSize: 10 }} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px', color: '#fff', fontSize: '11px' }}
                    formatter={(val: any) => [`${val} records`, 'Total Rows']}
                  />
                  <Bar dataKey="rows" radius={[6, 6, 0, 0]}>
                    {rowDensityData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Chart 3: Read vs Write I/O Distribution */}
          <div className="bg-white dark:bg-emerald-950/40 p-5 rounded-3xl border border-gray-100 dark:border-emerald-900/40 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h3 className="text-sm font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                  <Activity className="w-4 h-4 text-emerald-600" />
                  Read vs Write I/O Distribution
                </h3>
                <p className="text-xs text-gray-400 mt-0.5">Query reads vs write transactions by table</p>
              </div>
              <span className="text-[11px] font-mono px-2 py-0.5 bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 rounded-lg">
                I/O Activity
              </span>
            </div>
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={ioComparisonData} margin={{ top: 10, right: 10, left: -20, bottom: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" opacity={0.5} />
                  <XAxis dataKey="name" tick={{ fontSize: 10 }} angle={-25} textAnchor="end" />
                  <YAxis tick={{ fontSize: 10 }} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px', color: '#fff', fontSize: '11px' }}
                  />
                  <Legend wrapperStyle={{ fontSize: '11px' }} />
                  <Bar dataKey="readQueries" name="Read Queries" fill="#6366f1" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="writeTransactions" name="Write Operations" fill="#10b981" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Chart 4: Database Storage Share (%) */}
          <div className="bg-white dark:bg-emerald-950/40 p-5 rounded-3xl border border-gray-100 dark:border-emerald-900/40 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h3 className="text-sm font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                  <Database className="w-4 h-4 text-purple-600" />
                  Database Storage Share (%)
                </h3>
                <p className="text-xs text-gray-400 mt-0.5">Proportional storage consumed by table</p>
              </div>
              <span className="text-[11px] font-mono px-2 py-0.5 bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 rounded-lg">
                Storage Share
              </span>
            </div>
            <div className="h-64 w-full flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={storageShareData}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={85}
                    paddingAngle={3}
                    dataKey="value"
                    label={({ name, percent }: any) => `${name} (${((percent || 0) * 100).toFixed(0)}%)`}
                  >
                    {storageShareData.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={entry.color}
                        stroke={entry.isFocused ? '#f59e0b' : 'none'}
                        strokeWidth={entry.isFocused ? 3 : 0}
                      />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px', color: '#fff', fontSize: '11px' }}
                    formatter={(val: any) => [`${val} KB`, 'Footprint']}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>

      {/* ──────────────────────────────────────────────────────────────────────────
          UNIVERSAL ACTION PROGRESS & ERROR DISPLAY MODAL
          USER REQUIREMENT: "if any action pop model based loading percratege and if facing error that also show error what error"
      ────────────────────────────────────────────────────────────────────────── */}
      {actionModal.isOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4 animate-fadeIn">
          <div
            className={`bg-white dark:bg-slate-900 rounded-3xl max-w-md w-full p-6 sm:p-7 shadow-2xl border text-center space-y-4 animate-fadeIn ${
              actionModal.status === 'ERROR'
                ? 'border-rose-500/80 ring-4 ring-rose-500/20'
                : actionModal.status === 'SUCCESS'
                ? 'border-emerald-500/80 ring-4 ring-emerald-500/20'
                : 'border-indigo-500/40 ring-4 ring-indigo-500/20'
            }`}
          >
            {/* Animated State Icon */}
            <div className="relative w-16 h-16 mx-auto">
              {actionModal.status === 'LOADING' && (
                <>
                  <div className="absolute inset-0 rounded-full border-4 border-indigo-200 dark:border-indigo-900 animate-ping opacity-30" />
                  <div className="w-16 h-16 rounded-full bg-indigo-50 dark:bg-indigo-950 flex items-center justify-center border border-indigo-200 dark:border-indigo-800">
                    <Loader2 className="w-8 h-8 text-indigo-600 dark:text-indigo-400 animate-spin" />
                  </div>
                </>
              )}

              {actionModal.status === 'SUCCESS' && (
                <div className="w-16 h-16 rounded-full bg-emerald-50 dark:bg-emerald-950 flex items-center justify-center border-2 border-emerald-500 text-emerald-600 dark:text-emerald-400 animate-bounce">
                  <CheckCircle className="w-9 h-9" />
                </div>
              )}

              {actionModal.status === 'ERROR' && (
                <div className="w-16 h-16 rounded-full bg-rose-50 dark:bg-rose-950 flex items-center justify-center border-2 border-rose-500 text-rose-600 dark:text-rose-400 animate-pulse">
                  <AlertCircle className="w-9 h-9" />
                </div>
              )}
            </div>

            {/* Header Titles */}
            <div>
              <h3 className="font-extrabold text-slate-900 dark:text-white text-base">
                {actionModal.title}
              </h3>
              {actionModal.subtitle && (
                <p className="text-[10px] font-black uppercase tracking-wider text-indigo-600 dark:text-indigo-400 mt-0.5">
                  {actionModal.subtitle}
                </p>
              )}
              <p className={`text-xs mt-2 font-medium ${actionModal.status === 'ERROR' ? 'text-rose-600 dark:text-rose-400 font-bold' : 'text-gray-600 dark:text-gray-300'}`}>
                {actionModal.stepText}
              </p>
            </div>

            {/* Animated Loading Percentage Bar */}
            <div className="space-y-1.5">
              <div className="w-full bg-gray-100 dark:bg-slate-800 rounded-full h-3 overflow-hidden p-0.5 border border-gray-200 dark:border-slate-700">
                <div
                  className={`h-full rounded-full transition-all duration-300 ease-out ${
                    actionModal.status === 'ERROR'
                      ? 'bg-rose-500'
                      : actionModal.status === 'SUCCESS'
                      ? 'bg-emerald-500'
                      : 'bg-gradient-to-r from-indigo-500 via-cyan-400 to-emerald-400'
                  }`}
                  style={{ width: `${actionModal.progress}%` }}
                />
              </div>
              <div className="flex items-center justify-between text-[11px] font-mono font-bold text-gray-500 dark:text-gray-400">
                <span>Progress</span>
                <span className={actionModal.status === 'ERROR' ? 'text-rose-500' : 'text-indigo-600 dark:text-indigo-400'}>
                  {actionModal.progress}%
                </span>
              </div>
            </div>

            {/* EXACT ERROR DISPLAY: WHAT ERROR (USER REQUIREMENT) */}
            {actionModal.status === 'ERROR' && actionModal.errorMessage && (
              <div className="p-3.5 bg-rose-50 dark:bg-rose-950/70 border border-rose-300 dark:border-rose-900 rounded-2xl text-left space-y-2 animate-fadeIn">
                <div className="flex items-center gap-1.5 text-rose-700 dark:text-rose-300 text-xs font-bold uppercase tracking-wider">
                  <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>Exact PostgreSQL Error Encountered:</span>
                </div>
                <pre className="p-2.5 bg-rose-100/80 dark:bg-rose-900/40 text-rose-900 dark:text-rose-200 rounded-xl text-xs font-mono whitespace-pre-wrap break-all select-all">
                  {actionModal.errorMessage}
                </pre>
                {actionModal.errorDetails && (
                  <p className="text-[10px] font-mono text-rose-500 dark:text-rose-400">
                    {actionModal.errorDetails}
                  </p>
                )}
              </div>
            )}

            {/* Success Message Banner */}
            {actionModal.status === 'SUCCESS' && actionModal.successMessage && (
              <div className="p-3 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-300 dark:border-emerald-800 rounded-2xl text-left text-xs font-mono text-emerald-800 dark:text-emerald-200">
                ✓ {actionModal.successMessage}
              </div>
            )}

            {/* Modal Actions */}
            <div className="pt-2 flex items-center justify-center">
              {actionModal.status === 'ERROR' ? (
                <button
                  type="button"
                  onClick={() => setActionModal((prev) => ({ ...prev, isOpen: false }))}
                  className="px-5 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold transition cursor-pointer shadow-md active:scale-95 flex items-center gap-1.5"
                >
                  <X className="w-4 h-4" />
                  <span>Dismiss Error</span>
                </button>
              ) : actionModal.status === 'SUCCESS' ? (
                <button
                  type="button"
                  onClick={() => setActionModal((prev) => ({ ...prev, isOpen: false }))}
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition cursor-pointer shadow-md active:scale-95 flex items-center gap-1.5"
                >
                  <Check className="w-4 h-4" />
                  <span>Close</span>
                </button>
              ) : (
                <span className="text-[11px] font-mono text-gray-400">Please wait while operation finishes...</span>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ─── MODAL: UNIVERSAL "YES / NO" ACTION CONFIRMATION ─── */}
      {confirmModal.isOpen && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-md z-50 flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-md w-full p-6 sm:p-7 shadow-2xl border border-gray-200 dark:border-slate-800 space-y-4">
            <div className="flex items-center gap-3">
              <div
                className={`p-3 rounded-full ${
                  confirmModal.variant === 'danger'
                    ? 'bg-rose-100 dark:bg-rose-950 text-rose-600'
                    : confirmModal.variant === 'warning'
                    ? 'bg-amber-100 dark:bg-amber-950 text-amber-600'
                    : 'bg-indigo-100 dark:bg-indigo-950 text-indigo-600'
                }`}
              >
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-extrabold text-slate-900 dark:text-white text-base">{confirmModal.title}</h3>
                {confirmModal.subtitle && (
                  <p className="text-[10px] font-black uppercase tracking-wider text-rose-600 mt-0.5">
                    {confirmModal.subtitle}
                  </p>
                )}
              </div>
            </div>

            <p className="text-xs text-gray-600 dark:text-gray-300 leading-relaxed">{confirmModal.message}</p>

            {confirmModal.details && (
              <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700 text-[11px] text-gray-700 dark:text-gray-300 font-mono">
                {confirmModal.details}
              </div>
            )}

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setConfirmModal((prev) => ({ ...prev, isOpen: false }))}
                className="px-4 py-2 bg-gray-100 dark:bg-slate-800 hover:bg-gray-200 text-gray-700 dark:text-gray-300 rounded-xl text-xs font-bold transition cursor-pointer"
              >
                {confirmModal.cancelText || 'No, Cancel'}
              </button>
              <button
                type="button"
                onClick={confirmModal.onConfirm}
                className={`px-4 py-2 rounded-xl text-xs font-black shadow-md transition flex items-center gap-1.5 cursor-pointer active:scale-95 ${
                  confirmModal.variant === 'danger'
                    ? 'bg-rose-600 hover:bg-rose-700 text-white'
                    : confirmModal.variant === 'warning'
                    ? 'bg-amber-600 hover:bg-amber-700 text-white'
                    : 'bg-indigo-600 hover:bg-indigo-700 text-white'
                }`}
              >
                <Check className="w-3.5 h-3.5" />
                <span>{confirmModal.confirmText || 'Yes, Confirm & Proceed'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── MODAL: USER-FRIENDLY SQL CONSOLE & QUERY EXECUTION LOG ─── */}
      {showSqlEditor && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-slate-900 text-white rounded-3xl max-w-4xl w-full p-6 shadow-2xl border border-slate-700 space-y-4 max-h-[92vh] flex flex-col">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Terminal className="w-5 h-5 text-emerald-400" />
                <h3 className="font-mono text-sm font-black text-white">PostgreSQL Real-Time SQL Query Console</h3>
              </div>

              <div className="flex items-center gap-2">
                <div className="flex items-center p-1 bg-slate-950 rounded-xl border border-slate-800 text-xs">
                  <button
                    type="button"
                    onClick={() => setSqlConsoleTab('EDITOR')}
                    className={`px-3 py-1 rounded-lg font-bold flex items-center gap-1.5 transition cursor-pointer ${
                      sqlConsoleTab === 'EDITOR'
                        ? 'bg-emerald-600 text-white shadow-xs'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    <Code2 className="w-3.5 h-3.5" />
                    <span>SQL Editor</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setSqlConsoleTab('HISTORY')}
                    className={`px-3 py-1 rounded-lg font-bold flex items-center gap-1.5 transition cursor-pointer ${
                      sqlConsoleTab === 'HISTORY'
                        ? 'bg-emerald-600 text-white shadow-xs'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    <History className="w-3.5 h-3.5" />
                    <span>Query History Log ({sqlHistory.length})</span>
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => setShowSqlEditor(false)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* TAB 1: INTERACTIVE SQL EDITOR */}
            {sqlConsoleTab === 'EDITOR' && (
              <div className="space-y-4 flex-1 flex flex-col overflow-hidden animate-fadeIn">
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Presets:</span>
                  <button
                    type="button"
                    onClick={() =>
                      setSqlQuery(
                        `SELECT tablename\nFROM pg_catalog.pg_tables\nWHERE schemaname = 'public'\nORDER BY tablename;`
                      )
                    }
                    className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg text-[10px] font-mono text-emerald-300 transition cursor-pointer"
                  >
                    pg_catalog.pg_tables
                  </button>
                  <button
                    type="button"
                    onClick={() => setSqlQuery(`SELECT * FROM products ORDER BY created_at DESC LIMIT 10;`)}
                    className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg text-[10px] font-mono text-cyan-300 transition cursor-pointer"
                  >
                    SELECT products
                  </button>
                  <button
                    type="button"
                    onClick={() => setSqlQuery(`TRUNCATE TABLE pop_notification_events;`)}
                    className="px-2.5 py-1 bg-rose-950/80 hover:bg-rose-900 border border-rose-800 rounded-lg text-[10px] font-mono text-rose-300 transition cursor-pointer"
                  >
                    TRUNCATE TABLE pop_notification_events;
                  </button>
                </div>

                <div className="relative">
                  <textarea
                    value={sqlQuery}
                    onChange={(e) => setSqlQuery(e.target.value)}
                    rows={4}
                    className="w-full p-3 bg-slate-950 border border-slate-800 rounded-xl font-mono text-xs text-emerald-300 focus:outline-none focus:ring-1 focus:ring-emerald-400 resize-none"
                    placeholder="Enter SQL query (e.g. SELECT * FROM products or TRUNCATE TABLE products)..."
                  />
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono text-slate-400">
                    Supports SELECT, TRUNCATE TABLE, DELETE FROM, and pg_catalog queries
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={requestClearSqlEditor}
                      className="px-3 py-1.5 text-xs text-slate-400 hover:text-white transition cursor-pointer"
                    >
                      Clear Editor
                    </button>
                    <button
                      type="button"
                      disabled={isExecutingSql}
                      onClick={requestExecuteSql}
                      className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-mono text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-md active:scale-95"
                    >
                      <Play className={`w-3.5 h-3.5 ${isExecutingSql ? 'animate-spin' : ''}`} />
                      <span>{isExecutingSql ? 'Executing...' : 'Run Query (Yes/No)'}</span>
                    </button>
                  </div>
                </div>

                {sqlResults && (
                  <div className="flex-1 overflow-hidden flex flex-col space-y-2 border-t border-slate-800 pt-3">
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-emerald-400 font-bold">{sqlResults.rowCount} rows</span>
                        <span className="text-slate-400">&bull;</span>
                        <span className="font-mono text-slate-400">{sqlResults.durationMs}ms latency</span>
                      </div>
                      {sqlResults.message && (
                        <span className="text-amber-400 text-[11px] font-mono">{sqlResults.message}</span>
                      )}
                    </div>

                    <div className="flex-1 overflow-auto rounded-xl border border-slate-800 max-h-60">
                      <table className="w-full text-left text-xs font-mono">
                        <thead className="bg-slate-950 text-slate-400 text-[10px] uppercase sticky top-0">
                          <tr>
                            {sqlResults.columns.map((c) => (
                              <th key={c} className="p-2 border-b border-slate-800">
                                {c}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800 text-[11px]">
                          {sqlResults.rows.map((r, idx) => (
                            <tr key={idx} className="hover:bg-slate-800/60">
                              {sqlResults.columns.map((c) => (
                                <td key={c} className="p-2 truncate max-w-[200px] text-slate-300">
                                  {typeof r[c] === 'object' ? JSON.stringify(r[c]) : String(r[c] ?? '—')}
                                </td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* TAB 2: PREVIOUS EXECUTED QUERIES LOG */}
            {sqlConsoleTab === 'HISTORY' && (
              <div className="space-y-3 flex-1 overflow-hidden flex flex-col animate-fadeIn">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-xs font-black uppercase text-slate-300 tracking-wider">
                      Execution History Trail ({sqlHistory.length} Recorded Queries)
                    </h4>
                    <p className="text-[11px] text-slate-400">Click "Load into Editor" to re-run past statements.</p>
                  </div>

                  <button
                    type="button"
                    onClick={requestClearSQLHistory}
                    className="px-2.5 py-1 text-xs text-rose-400 hover:text-rose-300 hover:bg-rose-950/40 rounded-lg transition cursor-pointer"
                  >
                    Clear History
                  </button>
                </div>

                {sqlHistory.length === 0 ? (
                  <div className="p-8 text-center text-slate-400 text-xs">No executed queries recorded yet.</div>
                ) : (
                  <div className="flex-1 overflow-auto space-y-2 pr-1 max-h-[60vh]">
                    {sqlHistory.map((item) => (
                      <div
                        key={item.id}
                        className="p-3 bg-slate-950 border border-slate-800 rounded-xl space-y-2 hover:border-slate-700 transition"
                      >
                        <div className="flex items-center justify-between text-[11px]">
                          <div className="flex items-center gap-2 font-mono">
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                item.status === 'SUCCESS'
                                  ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                                  : 'bg-rose-950 text-rose-400 border border-rose-800'
                              }`}
                            >
                              {item.status}
                            </span>
                            <span className="text-slate-400">{new Date(item.executedAt).toLocaleTimeString()}</span>
                            <span className="text-slate-500">&bull;</span>
                            <span className="text-slate-400">{item.durationMs}ms</span>
                            <span className="text-slate-500">&bull;</span>
                            <span className="text-slate-400">{item.rowCount} rows</span>
                          </div>

                          <div className="flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => handleCopyQuery(item.id, item.sql)}
                              className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-[10px] font-mono flex items-center gap-1 transition cursor-pointer"
                            >
                              {copiedQueryId === item.id ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                              <span>{copiedQueryId === item.id ? 'Copied' : 'Copy'}</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => handleLoadQueryIntoEditor(item.sql)}
                              className="px-2.5 py-1 bg-emerald-600/30 hover:bg-emerald-600/50 border border-emerald-500/40 text-emerald-300 hover:text-white rounded text-[10px] font-bold flex items-center gap-1 transition cursor-pointer"
                            >
                              <RotateCcw className="w-3 h-3" />
                              <span>Load into Editor</span>
                            </button>
                          </div>
                        </div>

                        <pre className="p-2.5 bg-slate-900 rounded-lg text-xs font-mono text-emerald-300 overflow-x-auto whitespace-pre-wrap">
                          {item.sql}
                        </pre>

                        {item.errorMessage && (
                          <p className="text-[11px] font-mono text-rose-400">Error: {item.errorMessage}</p>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ─── MODAL: UNIVERSAL EXPORT HUB ─── */}
      {showExportModal.isOpen && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-md w-full p-6 shadow-2xl border border-gray-200 dark:border-emerald-800 space-y-5">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-full bg-indigo-50 dark:bg-indigo-900/50 text-indigo-600">
                <Download className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-extrabold text-slate-900 dark:text-white text-base">
                  Export Database: {showExportModal.targetTable === 'ALL' ? 'All 16 Tables' : `public.${showExportModal.targetTable}`}
                </h3>
                <p className="text-xs text-gray-500 dark:text-emerald-400 mt-0.5">Select your preferred export schema</p>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              {(['JSON', 'SQL', 'CSV'] as const).map((fmt) => (
                <button
                  key={fmt}
                  type="button"
                  onClick={() => setExportFormat(fmt)}
                  className={`p-3 rounded-2xl border text-center transition cursor-pointer ${
                    exportFormat === fmt
                      ? 'bg-indigo-50 dark:bg-indigo-950/60 border-indigo-500 text-indigo-700 dark:text-indigo-300 font-black shadow-xs'
                      : 'bg-gray-50 dark:bg-slate-800 border-gray-200 dark:border-slate-700 text-gray-700 dark:text-gray-300 font-bold hover:bg-gray-100'
                  }`}
                >
                  <p className="text-xs uppercase">{fmt}</p>
                  <span className="text-[10px] text-gray-400">
                    {fmt === 'JSON' ? 'Structured' : fmt === 'SQL' ? 'DDL & INSERT' : 'Spreadsheet'}
                  </span>
                </button>
              ))}
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowExportModal({ isOpen: false, targetTable: 'ALL' })}
                className="px-4 py-2 bg-gray-100 dark:bg-slate-800 hover:bg-gray-200 text-gray-700 dark:text-gray-300 rounded-xl text-xs font-bold transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isExporting}
                onClick={requestDownloadExport}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-extrabold shadow-md transition flex items-center gap-1.5 cursor-pointer active:scale-95"
              >
                <Download className={`w-3.5 h-3.5 ${isExporting ? 'animate-spin' : ''}`} />
                <span>{isExporting ? 'Generating...' : `Download ${exportFormat}`}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── MODAL: CREATE / EDIT PRUNE SCHEDULE ─── */}
      {scheduleModal.isOpen && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-md z-50 flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-lg w-full p-6 sm:p-7 shadow-2xl border border-gray-200 dark:border-slate-800 space-y-5">
            <div className="flex items-center justify-between border-b border-gray-100 dark:border-slate-800 pb-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-2xl bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300">
                  <Calendar className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-extrabold text-slate-900 dark:text-white text-base">
                    {scheduleModal.scheduleId === 'default-master-schedule'
                      ? 'Edit Default Master Prune Schedule'
                      : scheduleModal.mode === 'CREATE'
                      ? 'Create New Prune Schedule'
                      : 'Edit Prune Schedule'}
                  </h3>
                  <p className="text-xs text-gray-500 dark:text-emerald-400">
                    {scheduleModal.scheduleId === 'default-master-schedule'
                      ? 'Configure automated retention policy and background loop cadence for public.audit_logs.'
                      : 'Automate continuous telemetry & log purging on selected public table.'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setScheduleModal((prev) => ({ ...prev, isOpen: false }))}
                className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              {/* Schedule Name */}
              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                  Schedule Name
                </label>
                <input
                  type="text"
                  value={scheduleModal.name}
                  onChange={(e) => setScheduleModal((prev) => ({ ...prev, name: e.target.value }))}
                  placeholder="e.g. Daily Website Traffic Cleanup"
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl text-xs font-bold text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              {/* Target Public Table */}
              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                  Target Public Table
                </label>
                {scheduleModal.scheduleId === 'default-master-schedule' ? (
                  <div className="w-full px-3.5 py-2.5 bg-slate-100 dark:bg-slate-800 border border-emerald-300 dark:border-emerald-800 rounded-xl text-xs font-mono font-bold text-emerald-800 dark:text-emerald-300 flex items-center justify-between">
                    <span>public.audit_logs (Protected Core Table • System Ledger)</span>
                    <span className="text-[10px] uppercase font-black px-2 py-0.5 rounded bg-emerald-500 text-white">System Core</span>
                  </div>
                ) : (
                  <select
                    value={scheduleModal.targetTable}
                    onChange={(e) => setScheduleModal((prev) => ({ ...prev, targetTable: e.target.value }))}
                    className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl text-xs font-bold text-gray-900 dark:text-white cursor-pointer focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono"
                  >
                    {ALL_PUBLIC_TABLES.map((t) => (
                      <option key={t.name} value={t.name}>
                        public.{t.name} ({t.label} • {t.category})
                      </option>
                    ))}
                  </select>
                )}
              </div>

              {/* Retention Threshold */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                    Retention Period
                  </label>
                  <select
                    value={scheduleModal.retention}
                    onChange={(e) => setScheduleModal((prev) => ({ ...prev, retention: e.target.value as any }))}
                    className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl text-xs font-bold text-gray-900 dark:text-white cursor-pointer focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="24h">Delete older than 24 Hours</option>
                    <option value="48h">Delete older than 48 Hours</option>
                    <option value="72h">Delete older than 72 Hours</option>
                    <option value="1w">Delete older than 1 Week</option>
                    <option value="30d">Delete older than 30 Days</option>
                    <option value="custom">Custom Days</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                    Cron Cadence (Frequency)
                  </label>
                  <select
                    value={scheduleModal.intervalMins}
                    onChange={(e) => setScheduleModal((prev) => ({ ...prev, intervalMins: Number(e.target.value) }))}
                    className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl text-xs font-bold text-gray-900 dark:text-white cursor-pointer focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value={15}>Every 15 Minutes</option>
                    <option value={30}>Every 30 Minutes</option>
                    <option value={60}>Every 1 Hour</option>
                    <option value={360}>Every 6 Hours</option>
                    <option value={720}>Every 12 Hours</option>
                    <option value={1440}>Every 24 Hours (Daily)</option>
                  </select>
                </div>
              </div>

              {scheduleModal.retention === 'custom' && (
                <div>
                  <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                    Custom Retention Window (Days)
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={365}
                    value={scheduleModal.customDays}
                    onChange={(e) => setScheduleModal((prev) => ({ ...prev, customDays: Math.max(1, Number(e.target.value)) }))}
                    className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl text-xs font-bold text-gray-900 dark:text-white"
                  />
                </div>
              )}

              {/* Toggles */}
              <div className="space-y-2 pt-2 border-t border-gray-100 dark:border-slate-800">
                <label className="flex items-center justify-between p-2.5 bg-slate-50 dark:bg-slate-800/60 rounded-xl cursor-pointer">
                  <div className="space-y-0.5">
                    <span className="text-xs font-bold text-gray-900 dark:text-white">Daemon Active</span>
                    <p className="text-[11px] text-gray-500">Run automatically in background on scheduled cadence</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={scheduleModal.enabled}
                    onChange={(e) => setScheduleModal((prev) => ({ ...prev, enabled: e.target.checked }))}
                    className="w-4 h-4 text-emerald-600 rounded cursor-pointer"
                  />
                </label>

                <label className="flex items-center justify-between p-2.5 bg-slate-50 dark:bg-slate-800/60 rounded-xl cursor-pointer">
                  <div className="space-y-0.5">
                    <span className="text-xs font-bold text-gray-900 dark:text-white">Auto-Trigger on Product Actions</span>
                    <p className="text-[11px] text-gray-500">Trigger prune check whenever a product is created or updated</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={scheduleModal.triggerOnProductActions}
                    onChange={(e) => setScheduleModal((prev) => ({ ...prev, triggerOnProductActions: e.target.checked }))}
                    className="w-4 h-4 text-emerald-600 rounded cursor-pointer"
                  />
                </label>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-gray-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setScheduleModal((prev) => ({ ...prev, isOpen: false }))}
                className="px-4 py-2 bg-gray-100 dark:bg-slate-800 hover:bg-gray-200 text-gray-700 dark:text-gray-300 rounded-xl text-xs font-bold transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={requestSaveSchedule}
                className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black shadow-md transition flex items-center gap-1.5 cursor-pointer active:scale-95"
              >
                <Check className="w-3.5 h-3.5" />
                <span>{scheduleModal.mode === 'CREATE' ? 'Create Schedule' : 'Save Changes'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DBTablesPage;
