import React, { useEffect, useState } from 'react';
import { RefreshCw, CheckCircle2, Sparkles, Database } from 'lucide-react';

interface RefreshSpinnerModalProps {
  isOpen: boolean;
  title?: string;
  subtitle?: string;
  moduleName?: string;
  progressPercent?: number;
  stepText?: string;
  onComplete?: () => void;
}

export const RefreshSpinnerModal: React.FC<RefreshSpinnerModalProps> = ({
  isOpen,
  title = 'Refreshing Page & Data...',
  subtitle = 'Syncing latest MR. VIVASAYI records from database...',
  moduleName = 'System Sync',
  progressPercent,
  stepText,
  onComplete,
}) => {
  const [internalProgress, setInternalProgress] = useState(15);
  const [isDone, setIsDone] = useState(false);

  const progress = progressPercent !== undefined ? progressPercent : internalProgress;

  useEffect(() => {
    if (!isOpen) {
      setInternalProgress(15);
      setIsDone(false);
      return;
    }

    if (progressPercent !== undefined) {
      if (progressPercent >= 100) {
        setIsDone(true);
        const closeTimer = setTimeout(() => {
          if (onComplete) onComplete();
        }, 600);
        return () => clearTimeout(closeTimer);
      } else {
        setIsDone(false);
      }
      return;
    }

    setInternalProgress(20);
    setIsDone(false);

    const interval = setInterval(() => {
      setInternalProgress((prev) => {
        if (prev >= 90) {
          clearInterval(interval);
          return 90;
        }
        return prev + 25;
      });
    }, 150);

    const timer = setTimeout(() => {
      clearInterval(interval);
      setInternalProgress(100);
      setIsDone(true);

      const closeTimer = setTimeout(() => {
        if (onComplete) onComplete();
      }, 600);

      return () => clearTimeout(closeTimer);
    }, 900);

    return () => {
      clearInterval(interval);
      clearTimeout(timer);
    };
  }, [isOpen, onComplete, progressPercent]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-md z-[100] flex items-center justify-center p-4 animate-fadeIn font-sans">
      <div className="bg-white dark:bg-emerald-950 rounded-3xl max-w-sm w-full p-8 shadow-2xl border border-emerald-100 dark:border-emerald-800 text-center space-y-5 relative overflow-hidden">
        
        {/* Glow Background Effect */}
        <div className="absolute -top-12 -left-12 w-32 h-32 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none" />
        <div className="absolute -bottom-12 -right-12 w-32 h-32 bg-amber-500/10 rounded-full blur-2xl pointer-events-none" />

        {!isDone ? (
          <>
            {/* Spinning Animation Emblem with Live Percentage */}
            <div className="relative w-24 h-24 mx-auto flex items-center justify-center">
              <div className="absolute inset-0 rounded-full border-4 border-emerald-100 dark:border-emerald-900/60" />
              <div className="absolute inset-0 rounded-full border-4 border-emerald-600 dark:border-amber-400 border-t-transparent animate-spin" />
              <div className="flex flex-col items-center justify-center relative z-10">
                <span className="text-xl font-black text-emerald-950 dark:text-emerald-100 font-mono tracking-tighter">
                  {progress}%
                </span>
                <span className="text-[8px] uppercase tracking-wider font-extrabold text-emerald-600 dark:text-amber-400">
                  LIVE
                </span>
              </div>
            </div>

            {/* Titles & Status */}
            <div>
              <span className="text-[10px] font-extrabold uppercase tracking-widest text-emerald-800 dark:text-amber-300 bg-emerald-100 dark:bg-emerald-900/80 px-3 py-1 rounded-full inline-flex items-center gap-1 shadow-xs">
                <Database className="w-3 h-3" /> {moduleName}
              </span>
              <h3 className="text-xl font-black text-gray-900 dark:text-emerald-100 mt-2">
                {title}
              </h3>
              <p className="text-xs text-gray-500 dark:text-emerald-300 font-medium mt-1">
                {subtitle}
              </p>
              {stepText && (
                <p className="text-[11px] text-amber-600 dark:text-amber-300 font-semibold mt-1 bg-amber-50 dark:bg-amber-950/40 py-1 px-2.5 rounded-lg border border-amber-200 dark:border-amber-800/60 inline-block">
                  {stepText}
                </p>
              )}
            </div>

            {/* Real Progress Bar */}
            <div className="space-y-1.5 pt-1">
              <div className="flex justify-between text-[11px] font-bold text-gray-500 dark:text-emerald-300">
                <span>Syncing Database</span>
                <span className="text-emerald-800 dark:text-amber-400 font-mono">{progress}%</span>
              </div>
              <div className="w-full bg-gray-100 dark:bg-emerald-900/80 rounded-full h-2.5 overflow-hidden p-0.5 border border-emerald-100 dark:border-emerald-800">
                <div
                  className="bg-gradient-to-r from-emerald-600 via-emerald-500 to-amber-400 h-full rounded-full transition-all duration-300 shadow-sm"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          </>
        ) : (
          /* Done State Animation */
          <div className="space-y-4 py-2 animate-scaleUp">
            <div className="w-20 h-20 rounded-full bg-emerald-100 dark:bg-emerald-900/80 text-emerald-600 dark:text-amber-400 flex items-center justify-center mx-auto border-4 border-emerald-200 dark:border-emerald-700 shadow-lg">
              <CheckCircle2 className="w-10 h-10 animate-bounce" />
            </div>
            <div>
              <h3 className="text-xl font-black text-gray-900 dark:text-emerald-100">
                Refreshed Successfully!
              </h3>
              <p className="text-xs text-emerald-700 dark:text-emerald-300 font-bold mt-1 flex items-center justify-center gap-1">
                <Sparkles className="w-4 h-4 text-amber-400" /> Recent orders & items sorted on top
              </p>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};
