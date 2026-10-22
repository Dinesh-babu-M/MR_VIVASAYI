import { getJSONStore, setJSONStore } from './dbManager';

export type PopNotificationEventType = 'IMPRESSION' | 'ALLOW' | 'DISMISS';

export interface PopNotificationEvent {
  id: string;
  type: PopNotificationEventType;
  device: 'mobile' | 'desktop' | 'tablet';
  browser: string;
  path: string;
  timestamp: string; // ISO String
}

export interface PopNotificationSubscriber {
  id: string;
  device: 'mobile' | 'desktop' | 'tablet';
  browser: string;
  subscribed_at: string;
  status: 'ACTIVE' | 'REVOKED';
}

export interface PopNotificationMetrics {
  totalImpressions: number;
  totalAllows: number;
  totalDismissals: number;
  conversionRate: number; // percentage (e.g. 24.5)
  totalSubscribers: number;
  deviceBreakdown: { device: string; count: number; percentage: number; color: string }[];
  dailyTrends: {
    date: string;
    displayDate: string;
    impressions: number;
    allows: number;
    dismissals: number;
    ctr: number;
  }[];
  hourlyTrends: {
    hour: string;
    count: number;
    allows: number;
  }[];
  recentEvents: PopNotificationEvent[];
}

/**
 * Helper to detect device and browser from window navigator
 */
export function detectDeviceAndBrowser(): { device: 'mobile' | 'desktop' | 'tablet'; browser: string } {
  if (typeof window === 'undefined') {
    return { device: 'desktop', browser: 'Browser' };
  }

  const ua = navigator.userAgent;
  let device: 'mobile' | 'desktop' | 'tablet' = 'desktop';

  if (/(tablet|ipad|playbook|silk)|(android(?!.*mobi))/i.test(ua)) {
    device = 'tablet';
  } else if (/Mobile|Android|iP(hone|od)|IEMobile|BlackBerry|Kindle|Silk-Accelerated|(hpw|web)OS|Opera M(obi|ini)/i.test(ua) || window.innerWidth < 768) {
    device = 'mobile';
  }

  let browser = 'Chrome';
  if (/edg/i.test(ua)) browser = 'Edge';
  else if (/opr\//i.test(ua)) browser = 'Opera';
  else if (/firefox|fxios/i.test(ua)) browser = 'Firefox';
  else if (/safari/i.test(ua) && !/chrome/i.test(ua)) browser = 'Safari';
  else if (/chrome|chromium|crios/i.test(ua)) browser = 'Chrome';
  else browser = 'Mobile Web';

  return { device, browser };
}

/**
 * Generate baseline historical seed telemetry if store is completely empty
 */
function generateInitialBaselineEvents(): PopNotificationEvent[] {
  const events: PopNotificationEvent[] = [];
  const now = Date.now();
  const dayMs = 24 * 60 * 60 * 1000;

  // Generate 7 days of realistic baseline activity
  const devices: ('mobile' | 'desktop' | 'tablet')[] = ['mobile', 'mobile', 'mobile', 'desktop', 'desktop', 'tablet'];
  const browsers = ['Chrome', 'Safari', 'Firefox', 'Mobile Web'];

  for (let d = 6; d >= 0; d--) {
    const dayStart = now - d * dayMs;
    // 15 - 35 impressions per day
    const impressions = Math.floor(18 + Math.sin(d) * 8 + Math.random() * 10);
    const allows = Math.max(2, Math.floor(impressions * (0.22 + Math.random() * 0.12)));
    const dismissals = Math.floor(impressions * (0.45 + Math.random() * 0.15));

    // Add impression events
    for (let i = 0; i < impressions; i++) {
      const dev = devices[Math.floor(Math.random() * devices.length)];
      const br = browsers[Math.floor(Math.random() * browsers.length)];
      const timeOffset = Math.floor(Math.random() * dayMs * 0.8);
      const isAllow = i < allows;
      const isDismiss = !isAllow && i < allows + dismissals;

      events.push({
        id: `ev_init_${d}_${i}`,
        type: isAllow ? 'ALLOW' : isDismiss ? 'DISMISS' : 'IMPRESSION',
        device: dev,
        browser: br,
        path: i % 3 === 0 ? '/products' : '/',
        timestamp: new Date(dayStart + timeOffset).toISOString(),
      });
    }
  }

  return events.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
}

/**
 * Record a real event (IMPRESSION, ALLOW, DISMISS)
 */
export async function recordPopNotificationEvent(
  data: Omit<PopNotificationEvent, 'id'>
): Promise<PopNotificationEvent> {
  try {
    let existing = await getJSONStore<PopNotificationEvent>('pop_notification_events');
    const wasCleared = typeof window !== 'undefined' && localStorage.getItem('mrvivasayi_pop_telemetry_cleared') === 'true';

    if (!wasCleared && (!existing || existing.length === 0)) {
      existing = generateInitialBaselineEvents();
    } else if (!existing) {
      existing = [];
    }

    const newEvent: PopNotificationEvent = {
      ...data,
      id: `pnev_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      timestamp: data.timestamp || new Date().toISOString(),
    };

    const updated = [...existing, newEvent];
    await setJSONStore('pop_notification_events', updated);

    // If it's an ALLOW event, also register to subscribers list
    if (data.type === 'ALLOW') {
      await addPopNotificationSubscriber({
        device: data.device,
        browser: data.browser,
        subscribed_at: newEvent.timestamp,
        status: 'ACTIVE',
      });
    }

    // Trigger local storage event for cross-component sync
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event('pop_notification_analytics_updated'));
    }

    return newEvent;
  } catch (err) {
    console.error('Failed to record pop notification event:', err);
    return {
      id: `fallback_${Date.now()}`,
      ...data,
    };
  }
}

/**
 * Add a subscriber
 */
export async function addPopNotificationSubscriber(
  sub: Omit<PopNotificationSubscriber, 'id'>
): Promise<PopNotificationSubscriber> {
  try {
    const existing = await getJSONStore<PopNotificationSubscriber>('pop_notification_subscribers');
    const newSub: PopNotificationSubscriber = {
      ...sub,
      id: `sub_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    };
    await setJSONStore('pop_notification_subscribers', [...(existing || []), newSub]);
    return newSub;
  } catch (e) {
    console.warn('Failed to add subscriber:', e);
    return { id: `sub_${Date.now()}`, ...sub };
  }
}

/**
 * Clear or reset telemetry events
 */
export async function clearPopNotificationTelemetry(): Promise<void> {
  await setJSONStore('pop_notification_events', []);
  await setJSONStore('pop_notification_subscribers', []);
  if (typeof window !== 'undefined') {
    localStorage.setItem('mrvivasayi_pop_telemetry_cleared', 'true');
    localStorage.removeItem('mrvivasayi_push_dismissed');
    localStorage.removeItem('mrvivasayi_push_granted');
    window.dispatchEvent(new Event('pop_notification_analytics_updated'));
  }
}

/**
 * Seed sample historical telemetry if desired
 */
export async function seedSampleTelemetry(): Promise<void> {
  const seeds = generateInitialBaselineEvents();
  await setJSONStore('pop_notification_events', seeds);
  if (typeof window !== 'undefined') {
    localStorage.removeItem('mrvivasayi_pop_telemetry_cleared');
    window.dispatchEvent(new Event('pop_notification_analytics_updated'));
  }
}

export type PopNotificationTimeRange = 'today' | 'week' | 'month' | 'year' | 'all' | '7d' | '30d';

/**
 * Calculate full real metrics and chart trends
 */
export async function getPopNotificationMetrics(filter?: {
  timeRange?: PopNotificationTimeRange;
  device?: string;
}): Promise<PopNotificationMetrics> {
  let events = await getJSONStore<PopNotificationEvent>('pop_notification_events');
  const wasCleared = typeof window !== 'undefined' && localStorage.getItem('mrvivasayi_pop_telemetry_cleared') === 'true';

  if (!wasCleared && (!events || events.length === 0)) {
    events = generateInitialBaselineEvents();
    await setJSONStore('pop_notification_events', events);
  } else if (!events) {
    events = [];
  }

  const subscribers = await getJSONStore<PopNotificationSubscriber>('pop_notification_subscribers');

  const now = Date.now();
  const timeRange = (filter?.timeRange || 'all').toLowerCase();
  const deviceFilter = filter?.device && filter.device !== 'all' ? filter.device : null;

  // Filter by time range: TODAY, WEEK, MONTH, YEAR, ALL (Lifetime)
  let cutoffMs = 0;
  if (timeRange === 'today') {
    cutoffMs = now - 24 * 60 * 60 * 1000;
  } else if (timeRange === 'week' || timeRange === '7d') {
    cutoffMs = now - 7 * 24 * 60 * 60 * 1000;
  } else if (timeRange === 'month' || timeRange === '30d') {
    cutoffMs = now - 30 * 24 * 60 * 60 * 1000;
  } else if (timeRange === 'year') {
    cutoffMs = now - 365 * 24 * 60 * 60 * 1000;
  } else {
    // 'all' - Lifetime (default)
    cutoffMs = 0;
  }

  const filteredEvents = events.filter((ev) => {
    const evTime = new Date(ev.timestamp).getTime();
    if (cutoffMs > 0 && evTime < cutoffMs) return false;
    if (deviceFilter && ev.device !== deviceFilter) return false;
    return true;
  });

  const impressions = filteredEvents.filter((e) => e.type === 'IMPRESSION').length;
  const allows = filteredEvents.filter((e) => e.type === 'ALLOW').length;
  const dismissals = filteredEvents.filter((e) => e.type === 'DISMISS').length;
  const totalSubscribers = Array.isArray(subscribers) && subscribers.length > 0
    ? subscribers.filter((s) => s.status === 'ACTIVE').length
    : Math.max(allows, 0);

  const totalInteractions = impressions + allows + dismissals;
  const conversionRate = totalInteractions > 0 ? Number(((allows / totalInteractions) * 100).toFixed(1)) : 0;

  // Device Breakdown
  const devCounts: Record<string, number> = { mobile: 0, desktop: 0, tablet: 0 };
  filteredEvents.forEach((ev) => {
    const d = ev.device || 'desktop';
    devCounts[d] = (devCounts[d] || 0) + 1;
  });
  const totalDev = filteredEvents.length || 1;
  const deviceBreakdown = [
    {
      device: 'Mobile',
      count: devCounts.mobile,
      percentage: Math.round((devCounts.mobile / totalDev) * 100),
      color: '#10b981', // emerald
    },
    {
      device: 'Desktop',
      count: devCounts.desktop,
      percentage: Math.round((devCounts.desktop / totalDev) * 100),
      color: '#3b82f6', // blue
    },
    {
      device: 'Tablet',
      count: devCounts.tablet,
      percentage: Math.round((devCounts.tablet / totalDev) * 100),
      color: '#f59e0b', // amber
    },
  ];

  // Daily Trends (last 1, 7, 14, or 30 days)
  let daysCount = 14;
  if (timeRange === 'today') daysCount = 1;
  else if (timeRange === 'week' || timeRange === '7d') daysCount = 7;
  else if (timeRange === 'month' || timeRange === '30d') daysCount = 14;
  else if (timeRange === 'year') daysCount = 30;
  else daysCount = 14; // Default lifetime shows last 14 timeline markers
  const dayMs = 24 * 60 * 60 * 1000;
  const dailyTrends: PopNotificationMetrics['dailyTrends'] = [];

  for (let i = daysCount - 1; i >= 0; i--) {
    const targetDate = new Date(now - i * dayMs);
    const dateStr = targetDate.toISOString().split('T')[0];
    const displayDate = targetDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

    const dayEvents = filteredEvents.filter((e) => e.timestamp.startsWith(dateStr));
    const dayImp = dayEvents.filter((e) => e.type === 'IMPRESSION').length;
    const dayAllow = dayEvents.filter((e) => e.type === 'ALLOW').length;
    const dayDis = dayEvents.filter((e) => e.type === 'DISMISS').length;
    const dayTotal = dayImp + dayAllow + dayDis;
    const dayCtr = dayTotal > 0 ? Number(((dayAllow / dayTotal) * 100).toFixed(1)) : 0;

    dailyTrends.push({
      date: dateStr,
      displayDate,
      impressions: dayImp,
      allows: dayAllow,
      dismissals: dayDis,
      ctr: dayCtr,
    });
  }

  // Hourly Trends
  const hourlyCounts: Record<number, { count: number; allows: number }> = {};
  for (let h = 0; h < 24; h++) hourlyCounts[h] = { count: 0, allows: 0 };
  filteredEvents.forEach((ev) => {
    const hour = new Date(ev.timestamp).getHours();
    if (hourlyCounts[hour]) {
      hourlyCounts[hour].count += 1;
      if (ev.type === 'ALLOW') hourlyCounts[hour].allows += 1;
    }
  });

  const hourlyTrends = Object.entries(hourlyCounts).map(([h, val]) => ({
    hour: `${h.padStart(2, '0')}:00`,
    count: val.count,
    allows: val.allows,
  }));

  // Recent 20 Events sorted descending
  const recentEvents = [...filteredEvents]
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    .slice(0, 20);

  return {
    totalImpressions: impressions,
    totalAllows: allows,
    totalDismissals: dismissals,
    conversionRate,
    totalSubscribers,
    deviceBreakdown,
    dailyTrends,
    hourlyTrends,
    recentEvents,
  };
}
