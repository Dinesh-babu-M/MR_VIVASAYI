import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, Smartphone, Monitor, CheckCircle, X, Sparkles, Send } from 'lucide-react';
import Logo from './Logo';
import { getJSONStore } from '../../lib/dbManager';
import { DEFAULT_CMS_TEMPLATES, PopNotificationTemplate } from '../../lib/cmsTemplates';
import {
  recordPopNotificationEvent,
  detectDeviceAndBrowser
} from '../../lib/popNotificationAnalytics';

export const WebPushNotificationModal: React.FC = () => {
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccessToast, setShowSuccessToast] = useState(false);
  const [cmsConfig, setCmsConfig] = useState<PopNotificationTemplate | null>(null);
  const autoCloseTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Load live CMS settings
  const loadCMSConfiguration = async () => {
    try {
      const cms = await getJSONStore<any>('cms_settings');
      const base = (cms && cms.length > 0 && typeof cms[0] === 'object') ? cms[0] : (cms || {});
      if (base.pop_notification) {
        setCmsConfig(base.pop_notification);
      } else {
        setCmsConfig(DEFAULT_CMS_TEMPLATES.pop_notification!);
      }
    } catch {
      setCmsConfig(DEFAULT_CMS_TEMPLATES.pop_notification!);
    }
  };

  useEffect(() => {
    loadCMSConfiguration();

    // Listen for CMS settings updates in real time
    const handleStorage = (e: StorageEvent) => {
      if (e.key === 'mrvivasayi_db_cms_settings') {
        loadCMSConfiguration();
      }
    };

    // Also support manual test triggers dispatched from CMS
    const handleManualTrigger = () => {
      localStorage.removeItem('mrvivasayi_push_dismissed');
      localStorage.removeItem('mrvivasayi_push_granted');
      loadCMSConfiguration().then(() => setIsOpen(true));
    };

    window.addEventListener('storage', handleStorage);
    window.addEventListener('trigger_pop_notification_test', handleManualTrigger);
    return () => {
      window.removeEventListener('storage', handleStorage);
      window.removeEventListener('trigger_pop_notification_test', handleManualTrigger);
    };
  }, []);

  useEffect(() => {
    if (!cmsConfig) return;

    // If disabled in CMS, do not display
    if (cmsConfig.is_published === false) return;

    const { device } = detectDeviceAndBrowser();
    const isMobile = device === 'mobile' || device === 'tablet';

    // Device specific toggles
    if (isMobile && cmsConfig.mobile_enabled === false) return;
    if (!isMobile && cmsConfig.desktop_enabled === false) return;

    // Check if user has already dismissed or accepted in localStorage
    const dismissed = localStorage.getItem('mrvivasayi_push_dismissed');
    const granted = localStorage.getItem('mrvivasayi_push_granted');

    if (!dismissed && !granted) {
      const delayMs = (cmsConfig.delay_seconds ?? 2.5) * 1000;
      const timer = setTimeout(() => {
        setIsOpen(true);

        // Record real impression event
        const { device: dev, browser } = detectDeviceAndBrowser();
        recordPopNotificationEvent({
          type: 'IMPRESSION',
          device: dev,
          browser,
          path: typeof window !== 'undefined' ? window.location.pathname : '/',
          timestamp: new Date().toISOString(),
        });

        // Optional auto-close timer
        if (cmsConfig.auto_close_seconds && cmsConfig.auto_close_seconds > 0) {
          autoCloseTimerRef.current = setTimeout(() => {
            handleDismiss();
          }, cmsConfig.auto_close_seconds * 1000);
        }
      }, delayMs);

      return () => {
        clearTimeout(timer);
        if (autoCloseTimerRef.current) clearTimeout(autoCloseTimerRef.current);
      };
    }
  }, [cmsConfig]);

  const handleAllowNotifications = async () => {
    setIsSubmitting(true);
    const { device, browser } = detectDeviceAndBrowser();

    try {
      // Record real ALLOW event in analytics
      await recordPopNotificationEvent({
        type: 'ALLOW',
        device,
        browser,
        path: typeof window !== 'undefined' ? window.location.pathname : '/',
        timestamp: new Date().toISOString(),
      });

      // Request actual native browser notification permission if available
      if ('Notification' in window) {
        try {
          const res = await Notification.requestPermission();
          if (res === 'granted') {
            localStorage.setItem('mrvivasayi_push_granted', 'true');
            setShowSuccessToast(true);
            setTimeout(() => setShowSuccessToast(false), 4000);
          } else {
            localStorage.setItem('mrvivasayi_push_dismissed', 'true');
          }
        } catch {
          localStorage.setItem('mrvivasayi_push_granted', 'true');
          setShowSuccessToast(true);
          setTimeout(() => setShowSuccessToast(false), 4000);
        }
      } else {
        localStorage.setItem('mrvivasayi_push_granted', 'true');
        setShowSuccessToast(true);
        setTimeout(() => setShowSuccessToast(false), 4000);
      }

      // If custom CTA link configured in CMS and not default, navigate to it
      if (cmsConfig?.cta_link && cmsConfig.cta_link !== '/products') {
        navigate(cmsConfig.cta_link);
      }
    } catch (e) {
      console.error('Notification permission error', e);
      localStorage.setItem('mrvivasayi_push_granted', 'true');
    } finally {
      setIsSubmitting(false);
      setIsOpen(false);
    }
  };

  const handleDismiss = async () => {
    const { device, browser } = detectDeviceAndBrowser();

    // Record real DISMISS event in analytics
    await recordPopNotificationEvent({
      type: 'DISMISS',
      device,
      browser,
      path: typeof window !== 'undefined' ? window.location.pathname : '/',
      timestamp: new Date().toISOString(),
    });

    localStorage.setItem('mrvivasayi_push_dismissed', 'true');
    setIsOpen(false);
  };

  if (!isOpen || !cmsConfig) return null;

  const features = cmsConfig.features && cmsConfig.features.length > 0 ? cmsConfig.features : [
    'Works on Mobile, Tablet & Laptop Browsers',
    'Zero Spam — Only Fresh Farm Harvest Updates',
    'Opt-out anytime with 1-click browser settings'
  ];

  // Helper for dynamic animation CSS classes
  const getAnimationClass = () => {
    switch (cmsConfig.animation_style) {
      case 'bounce':
        return 'animate-bounce';
      case 'slide-up':
      case 'bottom-toast':
        return 'animate-slideUp';
      case 'pulse-glow':
        return 'animate-pulse';
      case 'fade-in':
      case 'center-modal':
      default:
        return 'animate-fadeIn';
    }
  };

  return (
    <>
      {/* Push Notification Opt-In Modal (Dynamically driven 100% by CMS settings) */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/65 backdrop-blur-sm animate-fadeIn">
        <div className={`bg-white dark:bg-emerald-950 text-gray-900 dark:text-emerald-50 w-full max-w-md rounded-3xl shadow-2xl border-2 border-emerald-500/40 overflow-hidden relative transform transition-all duration-300 ${getAnimationClass()}`}>
          {/* Close Button */}
          <button
            onClick={handleDismiss}
            className="absolute top-4 right-4 p-2 text-gray-400 hover:text-gray-600 dark:hover:text-white bg-gray-100 dark:bg-emerald-900/60 rounded-full transition-colors z-10 cursor-pointer shadow-xs"
            title="Close Prompt"
          >
            <X className="w-4 h-4" />
          </button>

          {/* Header Banner */}
          {cmsConfig.image_url ? (
            <div className="relative h-44 w-full overflow-hidden bg-emerald-950">
              <img
                src={cmsConfig.image_url}
                alt="Harvest Notification"
                className="w-full h-full object-cover opacity-80"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-emerald-950 via-emerald-950/40 to-transparent flex flex-col justify-end p-5 text-white">
                <div className="flex items-center gap-2 mb-1">
                  <div className="w-7 h-7 bg-amber-400 text-emerald-950 rounded-lg flex items-center justify-center font-bold">
                    <Bell className="w-4 h-4" />
                  </div>
                  <Logo variant="wordmark" theme="dark" size="sm" showTagline={false} />
                </div>
                <h3 className="text-lg sm:text-xl font-serif font-extrabold text-amber-100 leading-snug">
                  {cmsConfig.title || 'Enable Live Harvest Notifications?'}
                </h3>
              </div>
            </div>
          ) : (
            <div className="bg-gradient-to-br from-emerald-900 via-emerald-950 to-emerald-900 p-6 text-center text-white relative overflow-hidden">
              <div className="absolute inset-0 opacity-10 bg-[radial-gradient(#fff_1px,transparent_1px)] [background-size:16px_16px]" />
              <div className="relative z-10 space-y-3">
                <div className="w-16 h-16 bg-white/10 backdrop-blur-md rounded-2xl flex items-center justify-center mx-auto border border-white/20 shadow-lg text-amber-300">
                  <Bell className="w-8 h-8 animate-bounce" />
                </div>
                <div className="flex justify-center">
                  <Logo variant="wordmark" theme="dark" size="sm" showTagline={true} />
                </div>
                <h3 className="text-xl font-serif font-extrabold text-amber-100">
                  {cmsConfig.title || 'Enable Live Harvest Notifications?'}
                </h3>
              </div>
            </div>
          )}

          {/* Content Body */}
          <div className="p-6 space-y-4">
            <p className="text-xs sm:text-sm text-stone-600 dark:text-emerald-200 text-center leading-relaxed">
              {cmsConfig.message || 'Get instant alerts for Fresh Wood-Pressed Oils, Harvest Batch Arrivals & WhatsApp Exclusive Coupons directly on your mobile phone or laptop browser.'}
            </p>

            {/* Feature Highlights */}
            <div className="space-y-2.5 bg-emerald-50/70 dark:bg-emerald-900/40 p-3.5 rounded-2xl border border-emerald-100 dark:border-emerald-800 text-xs">
              {features.map((feat, idx) => (
                <div key={idx} className="flex items-center gap-2.5 text-emerald-900 dark:text-emerald-200">
                  <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>{feat}</span>
                </div>
              ))}
            </div>

            {/* Responsive Device Support Indicator */}
            <div className="flex justify-center gap-4 text-xs font-semibold text-stone-500 dark:text-emerald-400">
              <span className="flex items-center gap-1.5">
                <Smartphone className="w-4 h-4 text-amber-500" /> Mobile Alert
              </span>
              <span className="flex items-center gap-1.5">
                <Monitor className="w-4 h-4 text-amber-500" /> Web Laptop Push
              </span>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col gap-2.5 pt-1">
              <button
                onClick={handleAllowNotifications}
                disabled={isSubmitting}
                className="w-full py-3 bg-emerald-700 hover:bg-emerald-800 text-white font-extrabold text-sm rounded-xl shadow-lg transition-all flex items-center justify-center gap-2 border border-emerald-600 active:scale-95 cursor-pointer"
              >
                <Send className="w-4 h-4 text-amber-300" />
                {isSubmitting ? 'Enabling Live Notifications...' : (cmsConfig.cta_text || 'Allow Live Harvest Notifications')}
              </button>

              <button
                onClick={handleDismiss}
                className="w-full py-2.5 bg-stone-100 dark:bg-emerald-900/50 hover:bg-stone-200 dark:hover:bg-emerald-900 text-stone-600 dark:text-emerald-300 font-bold text-xs rounded-xl transition-colors cursor-pointer"
              >
                {cmsConfig.secondary_cta_text || 'Maybe Later'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Success Notification Alert Bar */}
      {showSuccessToast && (
        <div className="fixed bottom-5 right-5 z-50 bg-emerald-950 text-white px-5 py-4 rounded-2xl shadow-2xl border-2 border-amber-400 flex items-center gap-3 animate-fadeIn">
          <div className="w-9 h-9 bg-emerald-800 rounded-xl flex items-center justify-center text-amber-300 shrink-0">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <div className="font-bold text-sm text-amber-300 font-serif">Notifications Enabled!</div>
            <div className="text-xs text-emerald-200">You will receive live harvest & discount updates on your device.</div>
          </div>
        </div>
      )}
    </>
  );
};

export default WebPushNotificationModal;
