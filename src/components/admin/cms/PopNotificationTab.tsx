import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Bell,
  Smartphone,
  Monitor,
  Tablet,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  Eye,
  MousePointerClick,
  XCircle,
  UserCheck,
  Save,
  RotateCcw,
  Sparkles,
  ExternalLink,
  Zap,
  Image as ImageIcon,
  Play,
  Layers,
  Settings2,
  Sliders,
  Check,
  TrendingUp,
  BarChart3,
  PieChart as PieChartIcon,
  Clock,
  Trash2,
  Send,
  Plus,
  Search,
  Filter,
  ShieldCheck,
  Activity,
  Flame,
  Sun,
  Moon,
  RefreshCw,
  X,
  ChevronDown,
  Calendar
} from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import { getJSONStore, setJSONStore } from '../../../lib/dbManager';
import { DEFAULT_CMS_TEMPLATES, PopNotificationTemplate } from '../../../lib/cmsTemplates';
import { AutoRefreshDropdown } from '../../common/AutoRefreshDropdown';
import { useNotifications } from '../../../contexts/NotificationContext';
import { RefreshSpinnerModal } from '../../common/RefreshSpinnerModal';
import {
  getPopNotificationMetrics,
  recordPopNotificationEvent,
  clearPopNotificationTelemetry,
  seedSampleTelemetry,
  PopNotificationMetrics,
  PopNotificationEvent
} from '../../../lib/popNotificationAnalytics';

// Campaign preset templates for quick verification & setup
const CAMPAIGN_PRESETS = [
  {
    id: 'harvest_alert',
    label: '🌾 Fresh Farm Harvest (Default)',
    title: 'Enable Live Harvest Notifications?',
    message: 'Get instant alerts for Fresh Wood-Pressed Oils, Native Rice Batch Arrivals & WhatsApp Exclusive Coupons directly on your mobile phone or laptop browser.',
    features: [
      'Works on Mobile, Tablet & Laptop Browsers',
      'Zero Spam — Only Fresh Farm Harvest Updates',
      'Opt-out anytime with 1-click browser settings'
    ],
    cta_text: 'Allow Live Harvest Notifications',
    secondary_cta_text: 'Maybe Later',
    image_url: 'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&q=80&w=800'
  },
  {
    id: 'flash_sale',
    label: '⚡ Weekend Flash Sale (20% OFF)',
    title: '🌾 Weekend Organic Flash Sale — 20% OFF!',
    message: 'Get notified the moment our farm flash sales and weekend native combo discounts go live before limited harvest stock runs out!',
    features: [
      'Instant access to 20% OFF secret promo codes',
      'Priority delivery on early harvest morning orders',
      'Zero spam guarantee — easily disable anytime'
    ],
    cta_text: 'Activate VIP Harvest Alerts',
    secondary_cta_text: 'No Thanks, I Will Pay Full Price',
    image_url: 'https://images.unsplash.com/photo-1610832958506-aa56368176cf?auto=format&fit=crop&q=80&w=800'
  },
  {
    id: 'cold_pressed',
    label: '🥥 Wood Cold-Pressed Oil Special',
    title: '🌿 Marachekku Cold-Pressed Oil Batch Alert',
    message: 'Receive immediate notifications when pure Mara Chekku Groundnut, Sesame & Coconut oils are freshly pressed and bottled at our farm.',
    features: [
      'Freshly wood-pressed in small authentic batches',
      'Chemical-free, zero palm oil, 100% cold filtered',
      'Exclusive subscriber discounts on 5L family cans'
    ],
    cta_text: 'Notify Me On Fresh Oil Batches',
    secondary_cta_text: 'Maybe Later',
    image_url: 'https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?auto=format&fit=crop&q=80&w=800'
  },
  {
    id: 'weekly_basket',
    label: '🥗 Organic Farm Basket Subscription',
    title: '🧺 Weekly 100% Organic Veggie Basket',
    message: 'Never miss our Monday organic vegetable harvesting cycle. Get notified to book your pesticide-free weekly kitchen basket.',
    features: [
      'Harvested early morning, delivered same day',
      'Certified organic native heirloom varieties',
      'Free home delivery on weekly orders above ₹499'
    ],
    cta_text: 'Subscribe To Weekly Basket Alerts',
    secondary_cta_text: 'Not Right Now',
    image_url: 'https://images.unsplash.com/photo-1540420773420-3366772f4999?auto=format&fit=crop&q=80&w=800'
  }
];

// Unified Time Range Filter Options (Default is Lifetime / ALL)
const TIME_RANGE_OPTIONS: Array<{
  id: 'today' | 'week' | 'month' | 'year' | 'all';
  label: string;
  sublabel: string;
  badge: string;
}> = [
  { id: 'today', label: 'TODAY', sublabel: 'Last 24 Hours', badge: '24h' },
  { id: 'week', label: 'WEEK', sublabel: 'Last 7 Days', badge: '7d' },
  { id: 'month', label: 'MONTH', sublabel: 'Last 30 Days', badge: '30d' },
  { id: 'year', label: 'YEAR', sublabel: 'Last 365 Days', badge: '1y' },
  { id: 'all', label: 'ALL', sublabel: 'Lifetime History (Default)', badge: 'Lifetime' },
];

export const PopNotificationTab: React.FC = () => {
  const { addNotification } = useNotifications();

  // Load existing or default settings
  const [settings, setSettings] = useState<PopNotificationTemplate>(DEFAULT_CMS_TEMPLATES.pop_notification!);
  const [autoRefreshSec, setAutoRefreshSec] = useState<number>(0);
  // Default filter is Lifetime (all)
  const [timeRangeFilter, setTimeRangeFilter] = useState<'today' | 'week' | 'month' | 'year' | 'all'>('all');
  const [showTimeDropdown, setShowTimeDropdown] = useState(false);
  const [deviceFilter, setDeviceFilter] = useState<string>('all');
  const [streamFilter, setStreamFilter] = useState<'ALL' | 'ALLOW' | 'DISMISS' | 'IMPRESSION'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const timeDropdownRef = React.useRef<HTMLDivElement>(null);

  // Close time dropdown on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (timeDropdownRef.current && !timeDropdownRef.current.contains(e.target as Node)) {
        setShowTimeDropdown(false);
      }
    }
    if (showTimeDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showTimeDropdown]);

  // Real-time metrics from actual database telemetry (NO dummy/fake multipliers!)
  const [metrics, setMetrics] = useState<PopNotificationMetrics>({
    totalImpressions: 0,
    totalAllows: 0,
    totalDismissals: 0,
    conversionRate: 0,
    totalSubscribers: 0,
    deviceBreakdown: [],
    dailyTrends: [],
    hourlyTrends: [],
    recentEvents: []
  });

  const [loadingMetrics, setLoadingMetrics] = useState(true);
  const [previewDevice, setPreviewDevice] = useState<'desktop' | 'mobile'>('desktop');
  const [previewTheme, setPreviewTheme] = useState<'light' | 'dark'>('dark');

  // Confirmation Modals State
  const [showConfirmResetModal, setShowConfirmResetModal] = useState(false);
  const [showClearLogsModal, setShowClearLogsModal] = useState(false);
  const [isClearingLogs, setIsClearingLogs] = useState(false);

  const [actionSpinner, setActionSpinner] = useState<{
    isOpen: boolean;
    title: string;
    subtitle: string;
  }>({
    isOpen: false,
    title: '',
    subtitle: '',
  });

  // Load CMS configuration & real telemetry
  const loadData = useCallback(async () => {
    try {
      const cmsData = await getJSONStore<any>('cms_settings');
      const base = (cmsData && cmsData.length > 0 && typeof cmsData[0] === 'object') ? cmsData[0] : (cmsData || {});
      if (base.pop_notification) {
        setSettings(base.pop_notification);
      }

      const realMetrics = await getPopNotificationMetrics({
        timeRange: timeRangeFilter,
        device: deviceFilter
      });
      setMetrics(realMetrics);
      setLoadingMetrics(false);
    } catch (e) {
      console.warn('Error loading pop notification data:', e);
      setLoadingMetrics(false);
    }
  }, [timeRangeFilter, deviceFilter]);

  useEffect(() => {
    loadData();

    // Listen for analytics updates from website interactions
    const handleAnalyticsUpdate = () => {
      loadData();
    };
    window.addEventListener('pop_notification_analytics_updated', handleAnalyticsUpdate);
    return () => window.removeEventListener('pop_notification_analytics_updated', handleAnalyticsUpdate);
  }, [loadData]);

  // Live Auto-Refresh Interval with animated header loading line
  useEffect(() => {
    if (!autoRefreshSec || autoRefreshSec <= 0) return;
    const interval = setInterval(async () => {
      setIsRefreshing(true);
      await loadData();
      setTimeout(() => setIsRefreshing(false), 800);
    }, autoRefreshSec * 1000);
    return () => clearInterval(interval);
  }, [autoRefreshSec, loadData]);

  // Dedicated manual refresh with loading pop modal
  const handleManualRefresh = async () => {
    setIsRefreshing(true);
    setActionSpinner({
      isOpen: true,
      title: 'Refreshing Real-Time Telemetry & CMS',
      subtitle: 'Querying live database for impressions, opt-ins, and audience metrics...',
    });
    try {
      await new Promise(r => setTimeout(r, 450));
      await loadData();
      await new Promise(r => setTimeout(r, 200));
      addNotification({
        title: 'Telemetry Refreshed ✓',
        message: 'Pop notification analytics and storefront settings reloaded from live database.',
        type: 'success',
      });
    } finally {
      setIsRefreshing(false);
      setActionSpinner(prev => ({ ...prev, isOpen: false }));
    }
  };

  const handleSave = async () => {
    setActionSpinner({
      isOpen: true,
      title: 'Publishing Pop Notification Settings',
      subtitle: 'Updating website modal parameters and live sync cache...',
    });

    try {
      const existing = await getJSONStore<any>('cms_settings');
      const base = (existing && existing.length > 0 && typeof existing[0] === 'object') ? existing[0] : (existing || {});
      const updated = {
        ...base,
        pop_notification: settings,
      };
      await setJSONStore('cms_settings', [updated]);

      // Dispatch cross-tab storage event
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new StorageEvent('storage', {
          key: 'mrvivasayi_db_cms_settings',
          newValue: JSON.stringify([updated])
        }));
      }

      setTimeout(() => {
        setActionSpinner({ isOpen: false, title: '', subtitle: '' });
        addNotification({
          title: 'Pop Notification Published',
          message: 'Website popup notification has been updated and is live on the storefront.',
          type: 'success',
        });
      }, 400);
    } catch {
      setActionSpinner({ isOpen: false, title: '', subtitle: '' });
    }
  };

  const handleResetDefaults = async () => {
    setShowConfirmResetModal(false);
    setActionSpinner({
      isOpen: true,
      title: 'Restoring Pop Notification Defaults',
      subtitle: 'Restoring default harvest notification template...',
    });

    try {
      const def = DEFAULT_CMS_TEMPLATES.pop_notification!;
      setSettings(def);
      const existing = await getJSONStore<any>('cms_settings');
      const base = (existing && existing.length > 0 && typeof existing[0] === 'object') ? existing[0] : (existing || {});
      const updated = {
        ...base,
        pop_notification: def,
      };
      await setJSONStore('cms_settings', [updated]);

      setTimeout(() => {
        setActionSpinner({ isOpen: false, title: '', subtitle: '' });
        addNotification({
          title: 'Defaults Restored',
          message: 'Pop notification settings restored to factory defaults.',
          type: 'info',
        });
      }, 400);
    } catch {
      setActionSpinner({ isOpen: false, title: '', subtitle: '' });
    }
  };

  // Test trigger on website: clear dismissal flags so admin can test live
  const handleTestOnWebsite = () => {
    localStorage.removeItem('mrvivasayi_push_dismissed');
    localStorage.removeItem('mrvivasayi_push_granted');
    window.dispatchEvent(new Event('trigger_pop_notification_test'));
    window.open('/', '_blank');
    addNotification({
      title: 'Live Storefront Opened',
      message: 'Dismissal flag cleared. Storefront opened in new tab to test popup notification live.',
      type: 'info'
    });
  };

  // Reset dismissal cookie for admin browser without opening new tab
  const handleResetBrowserDismissal = () => {
    localStorage.removeItem('mrvivasayi_push_dismissed');
    localStorage.removeItem('mrvivasayi_push_granted');
    addNotification({
      title: 'Browser Test Flag Reset',
      message: 'Notification dismissal cookies have been cleared for this browser. The popup will reappear on your next storefront visit.',
      type: 'success'
    });
  };

  // Record a simulated live test interaction to test real-time numbers & charts
  const handleSimulateEvent = async (type: 'ALLOW' | 'DISMISS' | 'IMPRESSION') => {
    await recordPopNotificationEvent({
      type,
      device: previewDevice,
      browser: 'Chrome (Simulated)',
      path: '/',
      timestamp: new Date().toISOString()
    });
    await loadData();
    addNotification({
      title: `Simulated ${type} Event`,
      message: `Recorded a real ${type} interaction into the analytics database.`,
      type: 'success'
    });
  };

  // Clear analytics log with verified YES / NO modal
  const handleConfirmClearLogs = async () => {
    setIsClearingLogs(true);
    try {
      await clearPopNotificationTelemetry();
      await loadData();
      setShowClearLogsModal(false);
      addNotification({
        title: 'All Telemetry Logs Cleared',
        message: 'All real-time interaction logs, impressions, and analytics counters have been successfully removed.',
        type: 'info'
      });
    } catch (e) {
      console.error(e);
      addNotification({
        title: 'Clear Failed',
        message: 'Unable to clear telemetry logs. Please try again.',
        type: 'error'
      });
    } finally {
      setIsClearingLogs(false);
    }
  };

  // Seed sample telemetry if admin wants to see realistic charts
  const handleSeedSampleData = async () => {
    setActionSpinner({
      isOpen: true,
      title: 'Generating Sample Telemetry',
      subtitle: 'Populating realistic baseline trend data for testing...',
    });
    try {
      await seedSampleTelemetry();
      await loadData();
      setTimeout(() => {
        setActionSpinner({ isOpen: false, title: '', subtitle: '' });
        addNotification({
          title: 'Sample Data Loaded',
          message: 'Baseline trend data loaded successfully into real-time analytics.',
          type: 'success'
        });
      }, 400);
    } catch {
      setActionSpinner({ isOpen: false, title: '', subtitle: '' });
    }
  };

  // Apply a campaign preset
  const handleApplyPreset = (preset: typeof CAMPAIGN_PRESETS[0]) => {
    setSettings((s) => ({
      ...s,
      title: preset.title,
      message: preset.message,
      features: preset.features,
      cta_text: preset.cta_text,
      secondary_cta_text: preset.secondary_cta_text,
      image_url: preset.image_url
    }));
    addNotification({
      title: 'Campaign Preset Applied',
      message: `Loaded template: "${preset.label}". You can further edit copy and click Save & Publish.`,
      type: 'info'
    });
  };

  const handleAddFeature = () => {
    const current = settings.features || [];
    setSettings({
      ...settings,
      features: [...current, '🌱 100% Organically Farmed — Zero Chemicals']
    });
  };

  const handleUpdateFeature = (idx: number, val: string) => {
    const current = [...(settings.features || [])];
    current[idx] = val;
    setSettings({ ...settings, features: current });
  };

  const handleRemoveFeature = (idx: number) => {
    const current = [...(settings.features || [])];
    current.splice(idx, 1);
    setSettings({ ...settings, features: current });
  };

  const features = settings.features && settings.features.length > 0 ? settings.features : [
    'Works on Mobile, Tablet & Laptop Browsers',
    'Zero Spam — Only Fresh Farm Harvest Updates',
    'Opt-out anytime with 1-click browser settings'
  ];

  // Filtered recent events for the stream
  const filteredEvents = useMemo(() => {
    return metrics.recentEvents.filter((ev) => {
      if (streamFilter !== 'ALL' && ev.type !== streamFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (
          ev.browser.toLowerCase().includes(q) ||
          ev.device.toLowerCase().includes(q) ||
          ev.type.toLowerCase().includes(q) ||
          ev.path.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [metrics.recentEvents, streamFilter, searchQuery]);

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* ─── Top Header Card ─── */}
      <div className="bg-gradient-to-r from-emerald-950 via-teal-950 to-emerald-900 text-white p-6 sm:p-8 rounded-3xl shadow-xl border border-emerald-800/80 flex flex-col md:flex-row justify-between items-start md:items-center gap-5 relative overflow-hidden">
        {/* Animated Loading Bar along page header */}
        {isRefreshing && (
          <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-amber-400 via-emerald-400 to-teal-300 animate-pulse z-30 shadow-md shadow-emerald-400/50" />
        )}
        <div className="absolute -right-16 -top-16 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10">
          <div className="flex items-center gap-2 text-amber-300 text-xs font-black uppercase tracking-wider mb-1">
            <Bell className="w-4 h-4 text-amber-400 animate-bounce" />
            <span>WEBSITE POP NOTIFICATION MANAGER • VERIFIED CMS STUDIO</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-serif font-black text-white flex items-center flex-wrap gap-3">
            Pop Notification & Harvest Alerts
            <span className={`px-3 py-0.5 text-xs rounded-full font-sans font-bold border flex items-center gap-1.5 ${
              settings.is_published 
                ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40' 
                : 'bg-amber-500/20 text-amber-300 border-amber-500/40'
            }`}>
              <span className={`w-2 h-2 rounded-full ${settings.is_published ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`} />
              {settings.is_published ? 'Live on Storefront' : 'Draft Mode (Disabled)'}
            </span>
          </h2>
          <p className="text-emerald-200/90 text-xs sm:text-sm mt-1 max-w-2xl">
            Design, verify, and broadcast real-time popup notifications to website visitors. Monitor verified impressions, subscriber opt-ins, and analytics.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 relative z-10">
          {/* Real-time Manual Refresh Button with Pop Loading Modal */}
          <button
            type="button"
            onClick={handleManualRefresh}
            disabled={isRefreshing}
            className="flex items-center gap-1.5 px-3.5 py-2.5 bg-emerald-800/90 hover:bg-emerald-700/90 border border-emerald-600/70 text-white rounded-xl text-xs font-bold transition shadow-sm cursor-pointer active:scale-95 disabled:opacity-60"
            title="Refresh real-time data immediately from database"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-amber-300' : 'text-emerald-300'}`} />
            <span>Refresh</span>
          </button>

          <AutoRefreshDropdown
            intervalSec={autoRefreshSec}
            onIntervalChange={setAutoRefreshSec}
            onRefresh={handleManualRefresh}
            variant="emerald"
          />

          <button
            type="button"
            onClick={handleTestOnWebsite}
            className="flex items-center gap-1.5 px-3.5 py-2.5 bg-amber-400 hover:bg-amber-300 text-emerald-950 font-black rounded-xl text-xs shadow-md transition-all cursor-pointer active:scale-95"
            title="Reset dismissal flag and test live on storefront"
          >
            <ExternalLink className="w-3.5 h-3.5" /> Test Live on Website
          </button>

          <button
            type="button"
            onClick={() => setShowConfirmResetModal(true)}
            className="flex items-center gap-1.5 px-3 py-2.5 bg-white/10 hover:bg-white/20 border border-white/20 text-white rounded-xl text-xs font-bold transition-all cursor-pointer"
            title="Reset to factory harvest notification"
          >
            <RotateCcw className="w-3.5 h-3.5" /> Defaults
          </button>

          <button
            type="button"
            onClick={handleSave}
            className="flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-extrabold shadow-lg shadow-emerald-950/40 transition-all cursor-pointer active:scale-95"
          >
            <Save className="w-4 h-4 text-amber-300" /> Save & Publish
          </button>
        </div>
      </div>

      {/* ─── STOREFRONT VERIFICATION & HEALTH HUB ─── */}
      <div className="bg-gradient-to-br from-emerald-50 via-teal-50 to-white dark:from-emerald-950/80 dark:via-teal-950/50 dark:to-emerald-900/60 p-5 rounded-3xl border border-emerald-200/80 dark:border-emerald-800 shadow-sm">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-emerald-600 text-white rounded-2xl shadow-md shrink-0">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-sm text-emerald-950 dark:text-white">
                  Storefront Integration & Verification Details
                </span>
                <span className="px-2 py-0.5 bg-emerald-100 dark:bg-emerald-900 text-emerald-800 dark:text-emerald-200 text-[10px] font-mono font-bold rounded-full">
                  ROUTE: /
                </span>
              </div>
              <p className="text-xs text-stone-600 dark:text-emerald-300/80 mt-0.5">
                Connected to <span className="font-mono font-bold text-emerald-700 dark:text-emerald-300">WebPushNotificationModal</span> • Displays after <span className="font-bold">{settings.delay_seconds ?? 2.5}s</span> delay • Target screens:{' '}
                <span className="font-bold">
                  {settings.mobile_enabled && settings.desktop_enabled
                    ? 'Mobile & Desktop'
                    : settings.mobile_enabled
                    ? 'Mobile Only'
                    : settings.desktop_enabled
                    ? 'Desktop Only'
                    : 'Disabled'}
                </span>
              </p>
            </div>
          </div>

          {/* Quick verification tools */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handleResetBrowserDismissal}
              className="px-3 py-1.5 bg-white dark:bg-emerald-900 border border-emerald-200 dark:border-emerald-700 text-emerald-900 dark:text-emerald-100 rounded-xl text-xs font-bold hover:bg-emerald-50 dark:hover:bg-emerald-800 transition cursor-pointer flex items-center gap-1.5 shadow-2xs"
              title="Allows the current browser session to view the popup again"
            >
              <RefreshCw className="w-3.5 h-3.5 text-emerald-600" /> Reset Browser Flag
            </button>

            <button
              type="button"
              onClick={handleTestOnWebsite}
              className="px-3.5 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-extrabold shadow-sm transition cursor-pointer flex items-center gap-1.5"
            >
              <ExternalLink className="w-3.5 h-3.5 text-amber-300" /> Verify Live Storefront
            </button>
          </div>
        </div>

        {/* 1-Click Campaign Presets Bar */}
        <div className="mt-4 pt-3 border-t border-emerald-200/60 dark:border-emerald-800/80 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5 text-xs">
          <span className="font-bold text-emerald-950 dark:text-emerald-200 flex items-center gap-1.5 shrink-0">
            <Sparkles className="w-4 h-4 text-amber-500" /> Quick Campaign Presets:
          </span>
          <div className="flex flex-wrap gap-2">
            {CAMPAIGN_PRESETS.map((preset) => (
              <button
                key={preset.id}
                type="button"
                onClick={() => handleApplyPreset(preset)}
                className="px-2.5 py-1 bg-white dark:bg-emerald-900/70 hover:bg-emerald-100 dark:hover:bg-emerald-800 border border-emerald-200 dark:border-emerald-700 rounded-lg text-emerald-900 dark:text-emerald-200 font-bold transition cursor-pointer text-[11px] shadow-2xs"
              >
                {preset.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ─── REAL-TIME STATS SUMMARY CARDS (NO DUMMY MULTIPLIERS!) ─── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Box 1: Real Impressions */}
        <div className="bg-white dark:bg-emerald-950/60 p-5 rounded-3xl border border-emerald-100 dark:border-emerald-800 shadow-sm relative overflow-hidden group hover:shadow-md transition">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-extrabold text-emerald-800 dark:text-emerald-300 uppercase tracking-wider">Total Impressions</span>
            <div className="p-2.5 bg-emerald-50 dark:bg-emerald-900/60 text-emerald-600 dark:text-emerald-300 rounded-2xl">
              <Eye className="w-5 h-5" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-black text-emerald-950 dark:text-white">
              {metrics.totalImpressions.toLocaleString()}
            </span>
            <span className="text-[11px] font-bold text-emerald-600 bg-emerald-100 dark:bg-emerald-900 px-2 py-0.5 rounded-full">
              Real telemetry
            </span>
          </div>
          <p className="text-[11px] text-gray-500 dark:text-emerald-300/70 mt-1">Verified modal renders on shopper screens</p>
        </div>

        {/* Box 2: Real Allows / Conversions */}
        <div className="bg-white dark:bg-emerald-950/60 p-5 rounded-3xl border border-emerald-100 dark:border-emerald-800 shadow-sm relative overflow-hidden group hover:shadow-md transition">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-extrabold text-teal-800 dark:text-teal-300 uppercase tracking-wider">Subscribed / Allowed</span>
            <div className="p-2.5 bg-teal-50 dark:bg-teal-900/60 text-teal-600 dark:text-teal-300 rounded-2xl">
              <CheckCircle2 className="w-5 h-5" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-black text-emerald-950 dark:text-white">
              {metrics.totalAllows.toLocaleString()}
            </span>
            <span className="text-xs font-bold text-amber-600 dark:text-amber-400 bg-amber-100 dark:bg-amber-950 px-2 py-0.5 rounded-full font-mono">
              {metrics.conversionRate}% Rate
            </span>
          </div>
          <p className="text-[11px] text-gray-500 dark:text-emerald-300/70 mt-1">Users who clicked Allow Live Notifications</p>
        </div>

        {/* Box 3: Real Dismissals */}
        <div className="bg-white dark:bg-emerald-950/60 p-5 rounded-3xl border border-rose-100 dark:border-rose-900/60 shadow-sm relative overflow-hidden group hover:shadow-md transition">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-extrabold text-rose-800 dark:text-rose-300 uppercase tracking-wider">Dismissed / Maybe Later</span>
            <div className="p-2.5 bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 rounded-2xl">
              <XCircle className="w-5 h-5" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-black text-slate-900 dark:text-white">
              {metrics.totalDismissals.toLocaleString()}
            </span>
            <span className="text-xs font-bold text-gray-500">
              ({metrics.totalImpressions > 0 ? ((metrics.totalDismissals / metrics.totalImpressions) * 100).toFixed(1) : 0}%)
            </span>
          </div>
          <p className="text-[11px] text-gray-500 dark:text-rose-300/70 mt-1">Users who closed or clicked Maybe Later</p>
        </div>

        {/* Box 4: Active Registered Subscribers */}
        <div className="bg-white dark:bg-emerald-950/60 p-5 rounded-3xl border border-emerald-100 dark:border-emerald-800 shadow-sm relative overflow-hidden group hover:shadow-md transition">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-extrabold text-emerald-800 dark:text-emerald-300 uppercase tracking-wider">Active Device Audience</span>
            <div className="p-2.5 bg-emerald-50 dark:bg-emerald-900/60 text-emerald-600 dark:text-emerald-300 rounded-2xl">
              <UserCheck className="w-5 h-5" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-black text-emerald-950 dark:text-white">
              {metrics.totalSubscribers.toLocaleString()}
            </span>
            <span className="text-xs font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-900 px-2 py-0.5 rounded-full">
              Opted-In
            </span>
          </div>
          <p className="text-[11px] text-gray-500 dark:text-emerald-300/70 mt-1">Verified devices ready to receive web push</p>
        </div>
      </div>

      {/* ─── INTERACTIVE FILTER & SIMULATION TOOLBAR ─── */}
      <div className="bg-white dark:bg-emerald-950/70 p-4 rounded-2xl border border-emerald-100 dark:border-emerald-800 shadow-sm flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex flex-wrap items-center gap-3">
          {/* Unified Single Button Dropdown for Time Range (Default Lifetime) */}
          <div className="relative inline-block text-left" ref={timeDropdownRef}>
            <button
              type="button"
              onClick={() => setShowTimeDropdown((prev) => !prev)}
              className="flex items-center gap-2 px-3.5 py-2 bg-emerald-50 dark:bg-emerald-900/70 hover:bg-emerald-100 dark:hover:bg-emerald-800 border border-emerald-300 dark:border-emerald-700 rounded-xl text-emerald-950 dark:text-emerald-100 font-extrabold text-xs shadow-xs transition cursor-pointer"
            >
              <Calendar className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              <span>Range:</span>
              <span className="font-mono bg-emerald-700 text-white px-2 py-0.5 rounded-lg text-[11px] font-bold uppercase tracking-wider">
                {timeRangeFilter === 'all' ? 'ALL (Lifetime)' : timeRangeFilter.toUpperCase()}
              </span>
              <ChevronDown className={`w-3.5 h-3.5 text-emerald-700 dark:text-emerald-300 transition-transform ${showTimeDropdown ? 'rotate-180' : ''}`} />
            </button>

            {/* Dropdown Menu */}
            {showTimeDropdown && (
              <div className="absolute left-0 mt-2 w-64 origin-top-left rounded-2xl bg-white dark:bg-emerald-950 border border-emerald-200 dark:border-emerald-800 shadow-2xl p-2 z-50 animate-in fade-in zoom-in-95 duration-150">
                <div className="px-2 py-1.5 text-[10px] font-black uppercase text-gray-400 dark:text-emerald-400 tracking-wider border-b border-gray-100 dark:border-emerald-900 mb-1 flex items-center justify-between">
                  <span>Filter Telemetry Window</span>
                  <span className="text-[9px] text-amber-500 font-bold">5 Options</span>
                </div>
                <div className="space-y-1">
                  {TIME_RANGE_OPTIONS.map((opt) => {
                    const isSelected = timeRangeFilter === opt.id;
                    return (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => {
                          setTimeRangeFilter(opt.id);
                          setShowTimeDropdown(false);
                        }}
                        className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-left text-xs transition cursor-pointer ${
                          isSelected
                            ? 'bg-emerald-700 text-white font-extrabold shadow-sm'
                            : 'text-gray-700 dark:text-emerald-200 hover:bg-emerald-50 dark:hover:bg-emerald-900/60'
                        }`}
                      >
                        <div>
                          <div className="font-black flex items-center gap-1.5">
                            <span>{opt.label}</span>
                            {opt.id === 'all' && (
                              <span className={`text-[9px] px-1.5 py-0.5 rounded-sm font-bold ${
                                isSelected ? 'bg-amber-300 text-emerald-950' : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200'
                              }`}>
                                DEFAULT
                              </span>
                            )}
                          </div>
                          <div className={`text-[10px] ${isSelected ? 'text-emerald-100' : 'text-gray-400 dark:text-emerald-400'}`}>
                            {opt.sublabel}
                          </div>
                        </div>
                        {isSelected ? (
                          <Check className="w-4 h-4 text-amber-300 shrink-0" />
                        ) : (
                          <span className="text-[10px] font-mono text-gray-400">{opt.badge}</span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Device Type Selector */}
          <div className="flex items-center gap-1 bg-emerald-50 dark:bg-emerald-900/60 p-1 rounded-xl border border-emerald-200 dark:border-emerald-800">
            {(['all', 'mobile', 'desktop', 'tablet'] as const).map((dev) => (
              <button
                key={dev}
                onClick={() => setDeviceFilter(dev)}
                className={`px-2.5 py-1 rounded-lg font-bold text-xs capitalize transition cursor-pointer ${
                  deviceFilter === dev
                    ? 'bg-emerald-700 text-white shadow'
                    : 'text-emerald-900 dark:text-emerald-200 hover:bg-emerald-100 dark:hover:bg-emerald-800'
                }`}
              >
                {dev === 'all' ? 'All Devices' : dev}
              </button>
            ))}
          </div>
        </div>

        {/* Live Simulation & Clear Buttons */}
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-bold text-gray-500 dark:text-emerald-400">Quick Test Simulation:</span>
          <button
            type="button"
            onClick={() => handleSimulateEvent('ALLOW')}
            className="px-2.5 py-1 bg-emerald-100 dark:bg-emerald-900 text-emerald-800 dark:text-emerald-200 rounded-lg font-bold text-[11px] hover:bg-emerald-200 transition cursor-pointer flex items-center gap-1"
          >
            <Plus className="w-3 h-3" /> Allow
          </button>
          <button
            type="button"
            onClick={() => handleSimulateEvent('DISMISS')}
            className="px-2.5 py-1 bg-rose-100 dark:bg-rose-950 text-rose-800 dark:text-rose-200 rounded-lg font-bold text-[11px] hover:bg-rose-200 transition cursor-pointer flex items-center gap-1"
          >
            <Plus className="w-3 h-3" /> Dismiss
          </button>
          <button
            type="button"
            onClick={() => handleSimulateEvent('IMPRESSION')}
            className="px-2.5 py-1 bg-blue-100 dark:bg-blue-950 text-blue-800 dark:text-blue-200 rounded-lg font-bold text-[11px] hover:bg-blue-200 transition cursor-pointer flex items-center gap-1"
          >
            <Plus className="w-3 h-3" /> Impression
          </button>

          {/* Prompt Clear Real-Time Logs Modal */}
          <button
            type="button"
            onClick={() => setShowClearLogsModal(true)}
            className="ml-2 px-3 py-1 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/60 dark:hover:bg-rose-900 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 rounded-lg font-bold text-[11px] transition cursor-pointer flex items-center gap-1.5"
            title="Open Clear Logs Confirmation Dialog"
          >
            <Trash2 className="w-3.5 h-3.5 text-rose-600" /> Remove All Logs
          </button>
        </div>
      </div>

      {/* ─── REAL ANALYTICS CHARTS SECTION ─── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Chart 1: Daily Interaction Trends (Area Chart - 8 Cols) */}
        <div className="lg:col-span-8 bg-white dark:bg-emerald-950/60 p-5 rounded-3xl border border-emerald-100 dark:border-emerald-800 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-gray-100 dark:border-emerald-800/80 pb-3">
            <div>
              <h3 className="font-extrabold text-emerald-950 dark:text-white text-sm flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-emerald-600" />
                Notification Performance Timeline
              </h3>
              <p className="text-xs text-gray-500 dark:text-emerald-300/70">
                Daily breakdown of impressions, allows (opt-ins), and dismissals
              </p>
            </div>
            <span className="text-xs font-mono font-bold bg-emerald-100 dark:bg-emerald-900 text-emerald-900 dark:text-emerald-200 px-2.5 py-1 rounded-lg">
              Live DB Telemetry
            </span>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={metrics.dailyTrends} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorImp" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.35}/>
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorAllow" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.45}/>
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorDismiss" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#f43f5e" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" opacity={0.6} />
                <XAxis dataKey="displayDate" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#064e3b',
                    borderRadius: '12px',
                    border: '1px solid #047857',
                    color: '#fff',
                    fontSize: '12px'
                  }}
                />
                <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />
                <Area type="monotone" dataKey="impressions" name="Impressions" stroke="#3b82f6" fillOpacity={1} fill="url(#colorImp)" strokeWidth={2} />
                <Area type="monotone" dataKey="allows" name="Allowed (Opt-In)" stroke="#10b981" fillOpacity={1} fill="url(#colorAllow)" strokeWidth={2.5} />
                <Area type="monotone" dataKey="dismissals" name="Dismissed" stroke="#f43f5e" fillOpacity={1} fill="url(#colorDismiss)" strokeWidth={1.5} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart 2: Device Breakdown (Donut Chart - 4 Cols) */}
        <div className="lg:col-span-4 bg-white dark:bg-emerald-950/60 p-5 rounded-3xl border border-emerald-100 dark:border-emerald-800 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-gray-100 dark:border-emerald-800/80 pb-3">
            <div>
              <h3 className="font-extrabold text-emerald-950 dark:text-white text-sm flex items-center gap-2">
                <PieChartIcon className="w-4 h-4 text-teal-600" />
                Device Distribution
              </h3>
              <p className="text-xs text-gray-500 dark:text-emerald-300/70">Interactions by device type</p>
            </div>
          </div>

          <div className="h-44 w-full flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={metrics.deviceBreakdown}
                  dataKey="count"
                  nameKey="device"
                  cx="50%"
                  cy="50%"
                  innerRadius={45}
                  outerRadius={70}
                  paddingAngle={4}
                >
                  {metrics.deviceBreakdown.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#064e3b',
                    borderRadius: '12px',
                    border: '1px solid #047857',
                    color: '#fff',
                    fontSize: '12px'
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>

          {/* Device Breakdown Legend */}
          <div className="space-y-2 pt-1 border-t border-gray-100 dark:border-emerald-800">
            {metrics.deviceBreakdown.map((dev) => (
              <div key={dev.device} className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full" style={{ backgroundColor: dev.color }} />
                  <span className="font-bold text-gray-700 dark:text-emerald-200">{dev.device}</span>
                </div>
                <div className="flex items-center gap-2 font-mono">
                  <span className="font-extrabold text-emerald-950 dark:text-white">{dev.count}</span>
                  <span className="text-gray-400">({dev.percentage}%)</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ─── HOURLY ENGAGEMENT & RECENT EVENTS LOG ─── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Hourly Engagement Analysis (5 Cols) */}
        <div className="lg:col-span-5 bg-white dark:bg-emerald-950/60 p-5 rounded-3xl border border-emerald-100 dark:border-emerald-800 shadow-sm space-y-3">
          <div className="flex items-center justify-between border-b border-gray-100 dark:border-emerald-800/80 pb-3">
            <div>
              <h3 className="font-extrabold text-emerald-950 dark:text-white text-sm flex items-center gap-2">
                <Clock className="w-4 h-4 text-amber-500" />
                Hourly Peak Activity (24 Hours)
              </h3>
              <p className="text-xs text-gray-500 dark:text-emerald-300/70">
                Customer interactions and opt-in activity throughout the day
              </p>
            </div>
          </div>

          <div className="h-56 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={metrics.hourlyTrends.filter((_, idx) => idx % 2 === 0)} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" opacity={0.6} />
                <XAxis dataKey="hour" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#064e3b',
                    borderRadius: '12px',
                    border: '1px solid #047857',
                    color: '#fff',
                    fontSize: '11px'
                  }}
                />
                <Bar dataKey="count" name="Total Interactions" fill="#10b981" radius={[4, 4, 0, 0]} />
                <Bar dataKey="allows" name="Allowed" fill="#f59e0b" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Real-time Interaction Audit Stream (7 Cols) */}
        <div className="lg:col-span-7 bg-white dark:bg-emerald-950/60 p-5 rounded-3xl border border-emerald-100 dark:border-emerald-800 shadow-sm space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-gray-100 dark:border-emerald-800/80 pb-3 gap-2">
            <div>
              <h3 className="font-extrabold text-emerald-950 dark:text-white text-sm flex items-center gap-2">
                <Zap className="w-4 h-4 text-emerald-600 animate-pulse" />
                Live Real-Time Activity Stream
              </h3>
              <p className="text-xs text-gray-500 dark:text-emerald-300/70">
                Verified shopper events logged in database ({filteredEvents.length} shown)
              </p>
            </div>

            {/* Clear All Logs Button directly on the stream header */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setShowClearLogsModal(true)}
                className="px-3 py-1.5 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-bold transition-all shadow-sm flex items-center gap-1.5 cursor-pointer active:scale-95"
                title="Remove all real-time logs (asks confirmation)"
              >
                <Trash2 className="w-3.5 h-3.5" /> Remove All Logs ({metrics.recentEvents.length})
              </button>
            </div>
          </div>

          {/* Stream Filter Bar & Search */}
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs pt-1">
            <div className="flex items-center gap-1 bg-gray-100 dark:bg-emerald-900/60 p-1 rounded-xl">
              {(['ALL', 'ALLOW', 'DISMISS', 'IMPRESSION'] as const).map((type) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => setStreamFilter(type)}
                  className={`px-2.5 py-1 rounded-lg font-bold text-[11px] transition cursor-pointer ${
                    streamFilter === type
                      ? 'bg-emerald-700 text-white shadow-xs'
                      : 'text-gray-600 dark:text-emerald-200 hover:text-emerald-900'
                  }`}
                >
                  {type === 'ALL' ? 'All Events' : type}
                </button>
              ))}
            </div>

            <div className="relative">
              <Search className="w-3.5 h-3.5 text-gray-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search device, browser..."
                className="pl-8 pr-3 py-1 bg-gray-50 dark:bg-emerald-900/40 border border-gray-200 dark:border-emerald-800 rounded-xl text-xs font-medium w-44 focus:ring-1 focus:ring-emerald-500"
              />
            </div>
          </div>

          {/* Events List */}
          <div className="max-h-56 overflow-y-auto space-y-2 pr-1 pt-1">
            {filteredEvents.length === 0 ? (
              <div className="text-center py-10 px-4 rounded-2xl bg-gray-50 dark:bg-emerald-900/20 border border-dashed border-gray-200 dark:border-emerald-800 space-y-2">
                <div className="w-10 h-10 bg-emerald-100 dark:bg-emerald-900 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
                  <Activity className="w-5 h-5" />
                </div>
                <div className="font-extrabold text-xs text-emerald-950 dark:text-emerald-100">
                  {metrics.recentEvents.length === 0
                    ? 'No Real-Time Telemetry Logs Recorded'
                    : 'No matching events found for current filter.'}
                </div>
                <p className="text-[11px] text-gray-500 dark:text-emerald-300/70 max-w-sm mx-auto">
                  {metrics.recentEvents.length === 0
                    ? 'Logs were cleared or none have occurred yet. Open the live storefront or use the Quick Simulation buttons above to record real interactions.'
                    : 'Try clearing your search query or switching event filters.'}
                </p>
                {metrics.recentEvents.length === 0 && (
                  <div className="flex justify-center gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => handleSimulateEvent('ALLOW')}
                      className="px-3 py-1 bg-emerald-700 text-white rounded-lg font-bold text-xs hover:bg-emerald-600 transition cursor-pointer"
                    >
                      + Record Test Event
                    </button>
                    <button
                      type="button"
                      onClick={handleSeedSampleData}
                      className="px-3 py-1 bg-gray-200 dark:bg-emerald-800 text-gray-800 dark:text-emerald-100 rounded-lg font-bold text-xs hover:bg-gray-300 transition cursor-pointer"
                    >
                      Load Sample Demo Data
                    </button>
                  </div>
                )}
              </div>
            ) : (
              filteredEvents.map((ev) => (
                <div
                  key={ev.id}
                  className="flex items-center justify-between p-2.5 rounded-xl bg-gray-50 dark:bg-emerald-900/40 border border-gray-100 dark:border-emerald-800 text-xs hover:border-emerald-300 transition"
                >
                  <div className="flex items-center gap-2">
                    <span
                      className={`px-2 py-0.5 rounded-md font-black text-[10px] uppercase font-mono border ${
                        ev.type === 'ALLOW'
                          ? 'bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-900 dark:text-emerald-200 dark:border-emerald-700'
                          : ev.type === 'DISMISS'
                          ? 'bg-rose-100 text-rose-800 border-rose-300 dark:bg-rose-950 dark:text-rose-200 dark:border-rose-800'
                          : 'bg-blue-100 text-blue-800 border-blue-300 dark:bg-blue-950 dark:text-blue-200 dark:border-blue-800'
                      }`}
                    >
                      {ev.type}
                    </span>
                    <span className="font-bold text-gray-800 dark:text-emerald-100 flex items-center gap-1">
                      {ev.device === 'mobile' ? (
                        <>
                          <Smartphone className="w-3.5 h-3.5 text-emerald-600" /> Mobile
                        </>
                      ) : ev.device === 'tablet' ? (
                        <>
                          <Tablet className="w-3.5 h-3.5 text-amber-500" /> Tablet
                        </>
                      ) : (
                        <>
                          <Monitor className="w-3.5 h-3.5 text-blue-500" /> Desktop
                        </>
                      )}
                    </span>
                    <span className="text-gray-400 text-[11px] font-mono">({ev.browser})</span>
                  </div>

                  <div className="text-[11px] text-gray-500 dark:text-emerald-300 font-mono">
                    {new Date(ev.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* ─── MAIN EDITOR & LIVE PREVIEW SPLIT ─── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* LEFT COLUMN: Controls & Settings Form (7 Cols) */}
        <div className="lg:col-span-7 space-y-6">
          {/* DEVICE VISIBILITY TOGGLES */}
          <div className="bg-white dark:bg-emerald-950/60 p-6 rounded-3xl border border-emerald-100 dark:border-emerald-800 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-gray-100 dark:border-emerald-800 pb-3">
              <div>
                <h3 className="font-extrabold text-emerald-950 dark:text-white text-sm flex items-center gap-2">
                  <Sliders className="w-4 h-4 text-emerald-600" />
                  Screen Visibility & Trigger Switches
                </h3>
                <p className="text-xs text-gray-500 dark:text-emerald-300/70">
                  Target shoppers by device type (Smartphone, Laptop/Desktop, or Both)
                </p>
              </div>
              <span className="px-2.5 py-1 bg-emerald-50 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200 rounded-lg text-xs font-extrabold">
                {settings.mobile_enabled && settings.desktop_enabled
                  ? 'Both Screens Active'
                  : settings.mobile_enabled
                  ? 'Mobile Only'
                  : settings.desktop_enabled
                  ? 'Desktop Only'
                  : 'Disabled'}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Mobile Toggle Box */}
              <div
                onClick={() => setSettings((s) => ({ ...s, mobile_enabled: !s.mobile_enabled }))}
                className={`p-4 rounded-2xl border-2 cursor-pointer transition-all flex items-center justify-between ${
                  settings.mobile_enabled
                    ? 'border-emerald-500 bg-emerald-50/50 dark:bg-emerald-900/40 shadow-xs'
                    : 'border-gray-200 dark:border-emerald-800 bg-gray-50 dark:bg-emerald-950 opacity-60'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`p-2.5 rounded-xl ${settings.mobile_enabled ? 'bg-emerald-600 text-white' : 'bg-gray-200 text-gray-500'}`}>
                    <Smartphone className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-extrabold text-emerald-950 dark:text-white text-xs">Mobile Smartphone</h4>
                    <p className="text-[11px] text-gray-500 dark:text-emerald-300/70">
                      {settings.mobile_enabled ? '✓ Enabled on Mobile' : '✗ Disabled on Mobile'}
                    </p>
                  </div>
                </div>
                <div className={`w-12 h-6 rounded-full transition-colors relative flex items-center px-1 ${
                  settings.mobile_enabled ? 'bg-emerald-600' : 'bg-gray-300 dark:bg-emerald-900'
                }`}>
                  <div className={`w-4 h-4 rounded-full bg-white transition-transform ${
                    settings.mobile_enabled ? 'translate-x-6' : 'translate-x-0'
                  }`} />
                </div>
              </div>

              {/* Desktop Toggle Box */}
              <div
                onClick={() => setSettings((s) => ({ ...s, desktop_enabled: !s.desktop_enabled }))}
                className={`p-4 rounded-2xl border-2 cursor-pointer transition-all flex items-center justify-between ${
                  settings.desktop_enabled
                    ? 'border-blue-500 bg-blue-50/50 dark:bg-blue-950/40 shadow-xs'
                    : 'border-gray-200 dark:border-emerald-800 bg-gray-50 dark:bg-emerald-950 opacity-60'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`p-2.5 rounded-xl ${settings.desktop_enabled ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-500'}`}>
                    <Monitor className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-extrabold text-emerald-950 dark:text-white text-xs">Desktop & Laptop</h4>
                    <p className="text-[11px] text-gray-500 dark:text-emerald-300/70">
                      {settings.desktop_enabled ? '✓ Enabled on Desktop' : '✗ Disabled on Desktop'}
                    </p>
                  </div>
                </div>
                <div className={`w-12 h-6 rounded-full transition-colors relative flex items-center px-1 ${
                  settings.desktop_enabled ? 'bg-blue-600' : 'bg-gray-300 dark:bg-emerald-900'
                }`}>
                  <div className={`w-4 h-4 rounded-full bg-white transition-transform ${
                    settings.desktop_enabled ? 'translate-x-6' : 'translate-x-0'
                  }`} />
                </div>
              </div>
            </div>
          </div>

          {/* CONTENT SETTINGS */}
          <div className="bg-white dark:bg-emerald-950/60 p-6 rounded-3xl border border-emerald-100 dark:border-emerald-800 shadow-sm space-y-4">
            <h3 className="font-extrabold text-emerald-950 dark:text-white text-sm flex items-center gap-2 border-b border-gray-100 dark:border-emerald-800 pb-3">
              <Zap className="w-4 h-4 text-amber-500" />
              Pop Message Details, Copy & Actions
            </h3>

            <div className="space-y-4 text-xs">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="font-bold text-gray-700 dark:text-emerald-200">
                    Modal Headline Title
                  </label>
                  <span className="text-[11px] text-gray-400 font-mono">
                    {settings.title?.length || 0}/65 chars
                  </span>
                </div>
                <input
                  type="text"
                  value={settings.title}
                  onChange={(e) => setSettings((s) => ({ ...s, title: e.target.value }))}
                  placeholder="e.g. Enable Live Harvest Notifications?"
                  className="w-full px-3.5 py-2.5 bg-gray-50 dark:bg-emerald-900/50 border border-gray-200 dark:border-emerald-700 rounded-xl font-medium focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="font-bold text-gray-700 dark:text-emerald-200">
                    Message Description Body
                  </label>
                  <span className="text-[11px] text-gray-400 font-mono">
                    {settings.message?.length || 0}/220 chars
                  </span>
                </div>
                <textarea
                  rows={3}
                  value={settings.message}
                  onChange={(e) => setSettings((s) => ({ ...s, message: e.target.value }))}
                  placeholder="Body copy explaining benefits of allowing notifications..."
                  className="w-full px-3.5 py-2.5 bg-gray-50 dark:bg-emerald-900/50 border border-gray-200 dark:border-emerald-700 rounded-xl font-medium focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              {/* Dynamic Feature Bullets Editor */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block font-bold text-gray-700 dark:text-emerald-200">
                    Feature Bullet Highlights ({features.length})
                  </label>
                  <button
                    type="button"
                    onClick={handleAddFeature}
                    className="px-2.5 py-0.5 bg-emerald-100 dark:bg-emerald-900 text-emerald-800 dark:text-emerald-200 rounded-lg font-bold text-[11px] flex items-center gap-1 cursor-pointer hover:bg-emerald-200 transition"
                  >
                    <Plus className="w-3 h-3" /> Add Bullet
                  </button>
                </div>
                <div className="space-y-2">
                  {features.map((feat, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                      <input
                        type="text"
                        value={feat}
                        onChange={(e) => handleUpdateFeature(idx, e.target.value)}
                        className="flex-1 px-3 py-1.5 bg-gray-50 dark:bg-emerald-900/50 border border-gray-200 dark:border-emerald-700 rounded-xl text-xs font-medium"
                      />
                      <button
                        type="button"
                        onClick={() => handleRemoveFeature(idx)}
                        className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg cursor-pointer transition"
                        title="Delete highlight"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-bold text-gray-700 dark:text-emerald-200 mb-1">
                    Primary CTA Button Text
                  </label>
                  <input
                    type="text"
                    value={settings.cta_text}
                    onChange={(e) => setSettings((s) => ({ ...s, cta_text: e.target.value }))}
                    placeholder="Allow Live Harvest Notifications"
                    className="w-full px-3.5 py-2.5 bg-gray-50 dark:bg-emerald-900/50 border border-gray-200 dark:border-emerald-700 rounded-xl font-medium"
                  />
                </div>

                <div>
                  <label className="block font-bold text-gray-700 dark:text-emerald-200 mb-1">
                    Secondary CTA Button Text
                  </label>
                  <input
                    type="text"
                    value={settings.secondary_cta_text || 'Maybe Later'}
                    onChange={(e) => setSettings((s) => ({ ...s, secondary_cta_text: e.target.value }))}
                    placeholder="Maybe Later"
                    className="w-full px-3.5 py-2.5 bg-gray-50 dark:bg-emerald-900/50 border border-gray-200 dark:border-emerald-700 rounded-xl font-medium"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-gray-700 dark:text-emerald-200 mb-1">
                  Optional Header Banner Image URL
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={settings.image_url}
                    onChange={(e) => setSettings((s) => ({ ...s, image_url: e.target.value }))}
                    placeholder="https://... (Leave blank for default animated emblem)"
                    className="flex-1 px-3.5 py-2.5 bg-gray-50 dark:bg-emerald-900/50 border border-gray-200 dark:border-emerald-700 rounded-xl font-medium"
                  />
                  {settings.image_url && (
                    <button
                      type="button"
                      onClick={() => setSettings((s) => ({ ...s, image_url: '' }))}
                      className="px-3 py-2 bg-gray-100 hover:bg-gray-200 dark:bg-emerald-900 text-gray-600 dark:text-emerald-200 rounded-xl font-bold text-xs"
                      title="Clear image"
                    >
                      Clear
                    </button>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-1">
                <div>
                  <label className="block font-bold text-gray-700 dark:text-emerald-200 mb-1">
                    Display Delay (Seconds)
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="60"
                    step="0.5"
                    value={settings.delay_seconds}
                    onChange={(e) => setSettings((s) => ({ ...s, delay_seconds: parseFloat(e.target.value) || 2.5 }))}
                    className="w-full px-3.5 py-2 bg-gray-50 dark:bg-emerald-900/50 border border-gray-200 dark:border-emerald-700 rounded-xl font-bold font-mono"
                  />
                </div>

                <div>
                  <label className="block font-bold text-gray-700 dark:text-emerald-200 mb-1">
                    Auto-Close (0 = Off)
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="120"
                    value={settings.auto_close_seconds || 0}
                    onChange={(e) => setSettings((s) => ({ ...s, auto_close_seconds: parseInt(e.target.value) || 0 }))}
                    className="w-full px-3.5 py-2 bg-gray-50 dark:bg-emerald-900/50 border border-gray-200 dark:border-emerald-700 rounded-xl font-bold font-mono"
                  />
                </div>

                <div>
                  <label className="block font-bold text-gray-700 dark:text-emerald-200 mb-1">
                    Animation Style
                  </label>
                  <select
                    value={settings.animation_style}
                    onChange={(e) => setSettings((s) => ({ ...s, animation_style: e.target.value as any }))}
                    className="w-full px-3.5 py-2 bg-gray-50 dark:bg-emerald-900/50 border border-gray-200 dark:border-emerald-700 rounded-xl font-bold"
                  >
                    <option value="center-modal">Center Modal</option>
                    <option value="bounce">Gentle Bounce</option>
                    <option value="slide-up">Slide Up</option>
                    <option value="fade-in">Fade In</option>
                    <option value="pulse-glow">Pulse Glow</option>
                  </select>
                </div>
              </div>

              {/* Published Toggle */}
              <div className="pt-3 border-t border-gray-100 dark:border-emerald-800 flex items-center justify-between">
                <div>
                  <div className="font-extrabold text-sm text-emerald-950 dark:text-white">Active Status on Live Website</div>
                  <div className="text-[11px] text-gray-500">
                    {settings.is_published ? 'Modal is currently live and firing on the storefront.' : 'Modal is paused (draft mode). Visitors will not see it.'}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setSettings((s) => ({ ...s, is_published: !s.is_published }))}
                  className={`px-4 py-2 rounded-xl font-extrabold text-xs transition cursor-pointer flex items-center gap-1.5 ${
                    settings.is_published
                      ? 'bg-emerald-700 hover:bg-emerald-800 text-white shadow-md'
                      : 'bg-gray-200 hover:bg-gray-300 text-gray-700'
                  }`}
                >
                  <span className={`w-2 h-2 rounded-full ${settings.is_published ? 'bg-emerald-300 animate-ping' : 'bg-gray-400'}`} />
                  {settings.is_published ? 'Live on Storefront' : 'Disabled (Draft)'}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: Realistic Live Device Previews (5 Cols) */}
        <div className="lg:col-span-5 space-y-4 sticky top-24">
          <div className="bg-white dark:bg-emerald-950/60 p-5 rounded-3xl border border-emerald-100 dark:border-emerald-800 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-gray-100 dark:border-emerald-800 pb-3">
              <div className="flex items-center gap-2">
                <Eye className="w-4 h-4 text-emerald-600" />
                <h3 className="font-extrabold text-emerald-950 dark:text-white text-sm">
                  Interactive Live Verification Preview
                </h3>
              </div>

              <div className="flex items-center gap-2">
                {/* Theme toggle for preview */}
                <button
                  type="button"
                  onClick={() => setPreviewTheme(previewTheme === 'dark' ? 'light' : 'dark')}
                  className="p-1.5 bg-gray-100 dark:bg-emerald-900 text-gray-600 dark:text-emerald-200 rounded-lg hover:bg-gray-200 transition cursor-pointer"
                  title="Toggle preview light/dark theme"
                >
                  {previewTheme === 'dark' ? <Sun className="w-3.5 h-3.5 text-amber-400" /> : <Moon className="w-3.5 h-3.5 text-stone-600" />}
                </button>

                {/* Device toggle */}
                <div className="flex items-center gap-1 bg-gray-100 dark:bg-emerald-900 p-1 rounded-xl">
                  <button
                    type="button"
                    onClick={() => setPreviewDevice('desktop')}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold flex items-center gap-1 transition cursor-pointer ${
                      previewDevice === 'desktop'
                        ? 'bg-white dark:bg-emerald-800 text-emerald-950 dark:text-white shadow-sm'
                        : 'text-gray-500 hover:text-gray-800'
                    }`}
                  >
                    <Monitor className="w-3.5 h-3.5" /> Desktop
                  </button>

                  <button
                    type="button"
                    onClick={() => setPreviewDevice('mobile')}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold flex items-center gap-1 transition cursor-pointer ${
                      previewDevice === 'mobile'
                        ? 'bg-white dark:bg-emerald-800 text-emerald-950 dark:text-white shadow-sm'
                        : 'text-gray-500 hover:text-gray-800'
                    }`}
                  >
                    <Smartphone className="w-3.5 h-3.5" /> Mobile
                  </button>
                </div>
              </div>
            </div>

            {/* Preview Frame */}
            <div className="bg-slate-950 rounded-3xl p-4 sm:p-6 flex flex-col items-center justify-center min-h-[460px] relative overflow-hidden">
              <div className="absolute inset-0 opacity-15 bg-[radial-gradient(#fff_1px,transparent_1px)] [background-size:20px_20px]" />
              
              <div className="text-[10px] text-emerald-400 font-mono uppercase tracking-wider mb-2 z-10 flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-amber-400" /> Click buttons below to simulate & verify live
              </div>

              {/* The Modal Render (Simulates Website) */}
              <div
                className={`rounded-3xl shadow-2xl border-2 border-emerald-500/40 overflow-hidden relative transition-all duration-300 z-10 ${
                  previewTheme === 'dark' ? 'bg-emerald-950 text-emerald-50' : 'bg-white text-gray-900'
                } ${
                  previewDevice === 'mobile' ? 'max-w-[310px] text-xs' : 'max-w-[370px]'
                }`}
              >
                {/* Close Button simulation */}
                <button
                  type="button"
                  onClick={() => handleSimulateEvent('DISMISS')}
                  className="absolute top-3 right-3 p-1.5 text-gray-400 hover:text-white bg-black/30 rounded-full transition z-20 cursor-pointer"
                  title="Click to test Dismiss"
                >
                  <X className="w-3.5 h-3.5" />
                </button>

                {/* Header */}
                {settings.image_url ? (
                  <div className="relative h-32 w-full overflow-hidden bg-emerald-950">
                    <img src={settings.image_url} alt="Banner" className="w-full h-full object-cover opacity-80" />
                    <div className="absolute inset-0 bg-gradient-to-t from-emerald-950 via-emerald-950/40 to-transparent flex flex-col justify-end p-3.5 text-white">
                      <div className="flex items-center gap-1.5 text-[10px] text-amber-300 font-bold mb-0.5">
                        <Bell className="w-3 h-3 text-amber-400" /> MR. VIVASAYI
                      </div>
                      <h4 className="font-serif font-black text-amber-100 text-sm leading-snug">
                        {settings.title}
                      </h4>
                    </div>
                  </div>
                ) : (
                  <div className="bg-gradient-to-br from-emerald-900 via-emerald-950 to-emerald-900 p-4 text-center text-white relative">
                    <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center mx-auto mb-2 text-amber-300 shadow-md">
                      <Bell className="w-6 h-6 animate-bounce" />
                    </div>
                    <div className="text-[10px] text-amber-300 font-bold uppercase tracking-wider">MR. VIVASAYI</div>
                    <h4 className="text-sm font-serif font-black text-amber-100 mt-1">
                      {settings.title}
                    </h4>
                  </div>
                )}

                {/* Body */}
                <div className="p-4 space-y-3">
                  <p className={`text-[11px] text-center leading-relaxed ${
                    previewTheme === 'dark' ? 'text-emerald-200/90' : 'text-stone-600'
                  }`}>
                    {settings.message}
                  </p>

                  <div className={`space-y-1.5 p-2.5 rounded-xl border text-[10px] ${
                    previewTheme === 'dark'
                      ? 'bg-emerald-900/40 border-emerald-800 text-emerald-200'
                      : 'bg-emerald-50/70 border-emerald-100 text-emerald-900'
                  }`}>
                    {features.map((feat, i) => (
                      <div key={i} className="flex items-center gap-1.5">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                        <span>{feat}</span>
                      </div>
                    ))}
                  </div>

                  <div className="flex justify-center gap-3 text-[10px] font-semibold text-stone-400">
                    <span className="flex items-center gap-1"><Smartphone className="w-3 h-3 text-amber-500" /> Mobile Alert</span>
                    <span className="flex items-center gap-1"><Monitor className="w-3 h-3 text-amber-500" /> Web Laptop Push</span>
                  </div>

                  <div className="flex flex-col gap-1.5 pt-1">
                    <button
                      type="button"
                      onClick={() => handleSimulateEvent('ALLOW')}
                      className="w-full py-2 bg-emerald-700 hover:bg-emerald-600 text-white font-extrabold text-xs rounded-xl shadow-md flex items-center justify-center gap-1.5 cursor-pointer active:scale-95 transition"
                      title="Click to simulate ALLOW action"
                    >
                      <Send className="w-3 h-3 text-amber-300" />
                      <span>{settings.cta_text}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSimulateEvent('DISMISS')}
                      className={`w-full py-1.5 font-bold text-[10px] rounded-xl cursor-pointer active:scale-95 transition ${
                        previewTheme === 'dark'
                          ? 'bg-emerald-900/60 hover:bg-emerald-900 text-emerald-300'
                          : 'bg-stone-100 hover:bg-stone-200 text-stone-600'
                      }`}
                      title="Click to simulate DISMISS action"
                    >
                      {settings.secondary_cta_text || 'Maybe Later'}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ─── MODERN YES / NO CONFIRMATION MODAL FOR REMOVING ALL LOGS ─── */}
      {showClearLogsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-fadeIn">
          <div className="bg-white dark:bg-emerald-950 p-6 sm:p-7 rounded-3xl max-w-md w-full shadow-2xl border-2 border-rose-500/30 text-center space-y-4 animate-scaleUp">
            {/* Warning Icon Badge */}
            <div className="w-14 h-14 rounded-2xl bg-rose-100 dark:bg-rose-950 text-rose-600 mx-auto flex items-center justify-center shadow-lg border border-rose-200 dark:border-rose-800">
              <AlertTriangle className="w-8 h-8 animate-pulse" />
            </div>

            <div>
              <h3 className="text-xl font-serif font-black text-rose-950 dark:text-white">
                Remove All Real-Time Logs?
              </h3>
              <p className="text-xs text-stone-600 dark:text-emerald-300/80 mt-1.5 leading-relaxed">
                Are you sure you want to permanently clear all real-time analytics data? This will reset all telemetry logs and reset interaction counters back to 0.
              </p>
            </div>

            {/* Impact Details Box */}
            <div className="bg-rose-50/70 dark:bg-rose-950/40 p-3.5 rounded-2xl border border-rose-200/80 dark:border-rose-900 text-xs text-left space-y-1.5">
              <div className="font-extrabold text-rose-950 dark:text-rose-200 text-[11px] uppercase tracking-wider mb-1 flex items-center gap-1.5">
                <Trash2 className="w-3.5 h-3.5 text-rose-600" /> Data that will be cleared:
              </div>
              <div className="grid grid-cols-2 gap-2 text-stone-700 dark:text-emerald-200 font-mono text-[11px]">
                <div className="bg-white dark:bg-emerald-900/60 p-2 rounded-xl border border-rose-100 dark:border-rose-950">
                  <span className="text-gray-400 block text-[10px]">Impressions:</span>
                  <span className="font-bold text-rose-600 dark:text-rose-400 text-sm">{metrics.totalImpressions}</span>
                </div>
                <div className="bg-white dark:bg-emerald-900/60 p-2 rounded-xl border border-rose-100 dark:border-rose-950">
                  <span className="text-gray-400 block text-[10px]">Subscribers/Allowed:</span>
                  <span className="font-bold text-emerald-600 dark:text-emerald-400 text-sm">{metrics.totalAllows}</span>
                </div>
                <div className="bg-white dark:bg-emerald-900/60 p-2 rounded-xl border border-rose-100 dark:border-rose-950">
                  <span className="text-gray-400 block text-[10px]">Dismissals:</span>
                  <span className="font-bold text-stone-700 dark:text-white text-sm">{metrics.totalDismissals}</span>
                </div>
                <div className="bg-white dark:bg-emerald-900/60 p-2 rounded-xl border border-rose-100 dark:border-rose-950">
                  <span className="text-gray-400 block text-[10px]">Total Event Logs:</span>
                  <span className="font-bold text-rose-600 dark:text-rose-400 text-sm">{metrics.recentEvents.length}</span>
                </div>
              </div>
              <p className="text-[10px] text-rose-700 dark:text-rose-300/80 pt-1">
                ⚠️ This action is irreversible. All live analytics charts, counters, and activity streams will immediately reset.
              </p>
            </div>

            {/* Yes / No Action Buttons */}
            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowClearLogsModal(false)}
                disabled={isClearingLogs}
                className="flex-1 py-3 bg-gray-100 hover:bg-gray-200 dark:bg-emerald-900 dark:hover:bg-emerald-800 text-gray-800 dark:text-emerald-200 rounded-xl font-bold text-xs transition cursor-pointer"
              >
                No, Keep Logs
              </button>

              <button
                type="button"
                onClick={handleConfirmClearLogs}
                disabled={isClearingLogs}
                className="flex-1 py-3 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-extrabold text-xs shadow-lg shadow-rose-900/30 transition flex items-center justify-center gap-2 cursor-pointer active:scale-95"
              >
                <Trash2 className="w-4 h-4" />
                {isClearingLogs ? 'Clearing All...' : 'Yes, Remove All'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── CONFIRMATION RESET MODAL (Factory Defaults) ─── */}
      {showConfirmResetModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white dark:bg-emerald-950 p-6 rounded-3xl max-w-md w-full shadow-2xl border border-emerald-100 dark:border-emerald-800 text-center space-y-4">
            <div className="w-12 h-12 rounded-full bg-amber-100 dark:bg-amber-900 text-amber-600 mx-auto flex items-center justify-center">
              <RotateCcw className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-black text-emerald-950 dark:text-white">
              Reset Pop Notification to Factory Defaults?
            </h3>
            <p className="text-xs text-gray-500 dark:text-emerald-300">
              This will restore the standard harvest notification title, copy, and opt-in settings. Telemetry event history will be preserved.
            </p>
            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowConfirmResetModal(false)}
                className="flex-1 py-2.5 bg-gray-100 dark:bg-emerald-900 text-gray-700 dark:text-emerald-200 rounded-xl font-bold text-xs cursor-pointer"
              >
                No, Cancel
              </button>
              <button
                type="button"
                onClick={handleResetDefaults}
                className="flex-1 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl font-bold text-xs shadow-md cursor-pointer"
              >
                Yes, Restore Defaults
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Action Spinner Modal */}
      <RefreshSpinnerModal
        isOpen={actionSpinner.isOpen}
        title={actionSpinner.title}
        subtitle={actionSpinner.subtitle}
        moduleName="Website CMS • Pop Notification"
      />
    </div>
  );
};

export default PopNotificationTab;
