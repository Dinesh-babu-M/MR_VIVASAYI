import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import toast from 'react-hot-toast';

export type NotificationType = 'info' | 'success' | 'warning' | 'error';

export interface SystemNotification {
  id: string;
  title: string;
  message: string;
  type: NotificationType;
  timestamp: string;
  read: boolean;
  actionUrl?: string;
  sourceModule?: string;
}

interface NotificationContextValue {
  notifications: SystemNotification[];
  unreadCount: number;
  addNotification: (notification: Omit<SystemNotification, 'id' | 'timestamp' | 'read'>) => void;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  removeNotification: (id: string) => void;
  clearAll: () => void;
  playSound: () => void;
}

const NotificationContext = createContext<NotificationContextValue | undefined>(undefined);

// Web Audio API Sound Synthesizer for notifications
const playChimeSound = () => {
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    
    // Create soft double chime
    const now = ctx.currentTime;
    
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(587.33, now); // D5
    gain1.gain.setValueAtTime(0.15, now);
    gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.start(now);
    osc1.stop(now + 0.3);

    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(880, now + 0.12); // A5
    gain2.gain.setValueAtTime(0.2, now + 0.12);
    gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.45);
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.start(now + 0.12);
    osc2.stop(now + 0.45);
  } catch (err) {
    // Audio context may be blocked before user interaction
    console.debug('Audio chime playback omitted', err);
  }
};

const INITIAL_NOTIFICATIONS: SystemNotification[] = [
  {
    id: 'notif-1',
    title: 'Welcome to MR. VIVASAYI Admin',
    message: 'System initialization complete. All services and databases operational.',
    type: 'success',
    timestamp: new Date(Date.now() - 1000 * 60 * 15).toISOString(),
    read: false,
    sourceModule: 'System',
  },
  {
    id: 'notif-2',
    title: 'Low Stock Alert',
    message: 'Mappillai Samba Rice (1kg) is below reorder threshold (8 units remaining).',
    type: 'warning',
    timestamp: new Date(Date.now() - 1000 * 60 * 45).toISOString(),
    read: false,
    actionUrl: '/admin/inventory',
    sourceModule: 'Inventory',
  },
  {
    id: 'notif-3',
    title: 'New POS Order Placed',
    message: 'Order #POS-1049 (₹1,450.00) completed successfully by Sales Staff.',
    type: 'info',
    timestamp: new Date(Date.now() - 1000 * 60 * 120).toISOString(),
    read: true,
    actionUrl: '/admin/orders',
    sourceModule: 'POS',
  },
];

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const [notifications, setNotifications] = useState<SystemNotification[]>(() => {
    const saved = localStorage.getItem('mrvivasayi-notifications');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        return INITIAL_NOTIFICATIONS;
      }
    }
    return INITIAL_NOTIFICATIONS;
  });

  useEffect(() => {
    localStorage.setItem('mrvivasayi-notifications', JSON.stringify(notifications));
  }, [notifications]);

  const playSound = useCallback(() => {
    playChimeSound();
  }, []);

  const addNotification = useCallback(
    (item: Omit<SystemNotification, 'id' | 'timestamp' | 'read'>) => {
      const newNotif: SystemNotification = {
        ...item,
        id: `notif-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        timestamp: new Date().toISOString(),
        read: false,
      };

      setNotifications((prev) => [newNotif, ...prev]);
      playSound();

      // Also trigger toast pop-up message
      if (item.type === 'success') {
        toast.success(`${item.title}: ${item.message}`, { duration: 4000 });
      } else if (item.type === 'error') {
        toast.error(`${item.title}: ${item.message}`, { duration: 4000 });
      } else if (item.type === 'warning') {
        toast(`${item.title}: ${item.message}`, { icon: '⚠️', duration: 4000 });
      } else {
        toast(`${item.title}: ${item.message}`, { icon: '🔔', duration: 4000 });
      }
    },
    [playSound]
  );

  const markAsRead = useCallback((id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
  }, []);

  const markAllAsRead = useCallback(() => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    toast.success('All notifications marked as read');
  }, []);

  const removeNotification = useCallback((id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
    toast('Notification removed', { icon: '🗑️' });
  }, []);

  const clearAll = useCallback(() => {
    setNotifications([]);
    toast.success('Cleared all notifications');
  }, []);

  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        unreadCount,
        addNotification,
        markAsRead,
        markAllAsRead,
        removeNotification,
        clearAll,
        playSound,
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  const ctx = useContext(NotificationContext);
  if (!ctx) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return ctx;
}
