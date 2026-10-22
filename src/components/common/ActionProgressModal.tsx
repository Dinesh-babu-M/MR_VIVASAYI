import React, { useEffect, useState } from 'react';
import { CheckCircle2, Sparkles, Activity, Layers, ArrowUpRight } from 'lucide-react';

export interface ActionModalOptions {
  title?: string;
  subtitle?: string;
  moduleName?: string;
  badge?: string;
  duration?: number; // duration in ms, default ~800-1200ms
  durationMs?: number; // alias for duration in ms
  steps?: string[];
  onComplete?: () => void;
}

interface ActionProgressModalProps {
  isOpen: boolean;
  options: ActionModalOptions;
  onClose: () => void;
}

export const ActionProgressModal: React.FC<ActionProgressModalProps> = ({
  isOpen,
  options,
  onClose
}) => {
  const {
    title = 'Processing Action...',
    subtitle = 'Executing request and synchronizing changes live...',
    moduleName = 'Action in Progress',
    badge,
    duration = options.durationMs || 900,
    steps = [
      'Validating request data...',
      'Processing live action...',
      'Synchronizing with database...',
      'Action completed successfully!'
    ],
    onComplete
  } = options;

  const [percentage, setPercentage] = useState(0);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [isDone, setIsDone] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      setPercentage(0);
      setCurrentStepIndex(0);
      setIsDone(false);
      return;
    }

    setPercentage(12);
    setCurrentStepIndex(0);
    setIsDone(false);

    // Dynamic incremental timer for live percentage counter
    const stepInterval = Math.max(25, Math.floor(duration / 35));
    const interval = setInterval(() => {
      setPercentage((prev) => {
        if (prev >= 94) {
          return 94; // Hold near 94% until completion timeout fires
        }
        const jump = Math.floor(Math.random() * 8) + 3;
        const next = Math.min(94, prev + jump);
        
        // Update step message based on percentage
        if (next < 35) setCurrentStepIndex(0);
        else if (next < 70) setCurrentStepIndex(1);
        else setCurrentStepIndex(2);

        return next;
      });
    }, stepInterval);

    // Complete action
    const completionTimer = setTimeout(() => {
      clearInterval(interval);
      setPercentage(100);
      setCurrentStepIndex(steps.length - 1);
      setIsDone(true);

      const closeTimer = setTimeout(() => {
        if (onComplete) onComplete();
        onClose();
      }, 550);

      return () => clearTimeout(closeTimer);
    }, duration);

    return () => {
      clearInterval(interval);
      clearTimeout(completionTimer);
    };
  }, [isOpen, duration, onClose, onComplete, steps.length]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/75 backdrop-blur-md z-[9999] flex items-center justify-center p-4 animate-fadeIn font-sans">
      <div className="bg-white dark:bg-emerald-950 rounded-3xl max-w-sm w-full p-6 sm:p-7 shadow-2xl border border-emerald-200/80 dark:border-emerald-800 text-center space-y-4 relative overflow-hidden transition-all transform scale-100">
        
        {/* Glow Background Decorative Blobs */}
        <div className="absolute -top-10 -left-10 w-36 h-36 bg-emerald-500/15 rounded-full blur-2xl pointer-events-none" />
        <div className="absolute -bottom-10 -right-10 w-36 h-36 bg-amber-500/15 rounded-full blur-2xl pointer-events-none" />

        {!isDone ? (
          <>
            {/* Spinning Indicator with Live Percentage */}
            <div className="relative w-24 h-24 mx-auto flex items-center justify-center">
              {/* Outer track */}
              <div className="absolute inset-0 rounded-full border-4 border-emerald-100 dark:border-emerald-900/60" />
              {/* Animated Spinner Ring */}
              <div className="absolute inset-0 rounded-full border-4 border-emerald-600 dark:border-amber-400 border-t-transparent animate-spin" />
              {/* Center percentage counter */}
              <div className="flex flex-col items-center justify-center relative z-10">
                <span className="text-2xl font-black text-emerald-950 dark:text-emerald-100 font-mono tracking-tighter">
                  {percentage}%
                </span>
                <span className="text-[9px] uppercase tracking-wider font-extrabold text-emerald-600 dark:text-amber-400">
                  LIVE
                </span>
              </div>
            </div>

            {/* Badge & Title */}
            <div className="space-y-1">
              <span className="text-[10px] font-extrabold uppercase tracking-widest text-emerald-800 dark:text-amber-300 bg-emerald-100 dark:bg-emerald-900/80 px-3 py-1 rounded-full inline-flex items-center gap-1.5 shadow-xs">
                <Activity className="w-3 h-3 text-emerald-600 dark:text-amber-400 animate-pulse" />
                {badge || moduleName}
              </span>
              <h3 className="text-lg font-black text-gray-900 dark:text-emerald-100 pt-1">
                {title}
              </h3>
              <p className="text-xs text-gray-500 dark:text-emerald-300 font-medium">
                {subtitle}
              </p>
            </div>

            {/* Progress Bar with Live Percentage */}
            <div className="space-y-1.5 pt-1 text-left">
              <div className="flex justify-between items-center text-[11px] font-bold text-gray-600 dark:text-emerald-300">
                <span className="truncate pr-2 font-mono text-[10px]">
                  {steps[currentStepIndex] || 'Executing live action...'}
                </span>
                <span className="text-emerald-700 dark:text-amber-400 font-mono font-black shrink-0">
                  {percentage}%
                </span>
              </div>
              <div className="w-full bg-gray-100 dark:bg-emerald-900/80 rounded-full h-3 overflow-hidden p-0.5 border border-emerald-100 dark:border-emerald-800 shadow-inner">
                <div
                  className="bg-gradient-to-r from-emerald-600 via-emerald-500 to-amber-400 h-full rounded-full transition-all duration-150 shadow-sm relative overflow-hidden"
                  style={{ width: `${percentage}%` }}
                >
                  <div className="absolute inset-0 bg-white/20 animate-pulse" />
                </div>
              </div>
            </div>
          </>
        ) : (
          /* 100% Completed Celebration State */
          <div className="space-y-3.5 py-3 animate-scaleUp">
            <div className="w-20 h-20 rounded-full bg-emerald-100 dark:bg-emerald-900/80 text-emerald-600 dark:text-amber-400 flex items-center justify-center mx-auto border-4 border-emerald-300 dark:border-emerald-700 shadow-xl">
              <CheckCircle2 className="w-10 h-10 animate-bounce" />
            </div>
            <div>
              <div className="inline-flex items-center gap-1 text-[11px] font-mono font-black text-emerald-700 dark:text-amber-400 bg-emerald-50 dark:bg-emerald-900/60 px-2.5 py-0.5 rounded-full mb-1">
                <Sparkles className="w-3.5 h-3.5" /> 100% COMPLETE
              </div>
              <h3 className="text-lg font-black text-gray-900 dark:text-emerald-100">
                Action Successful!
              </h3>
              <p className="text-xs text-emerald-700 dark:text-emerald-300 font-bold mt-1">
                Data recorded & synchronized live.
              </p>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};
