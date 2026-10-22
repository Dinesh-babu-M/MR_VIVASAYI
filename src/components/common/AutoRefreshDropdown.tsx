import React, { useState, useRef, useEffect } from 'react';
import { Activity, ChevronDown, Check, Clock, RefreshCw, Sparkles, X } from 'lucide-react';

export interface AutoRefreshDropdownProps {
  intervalSec: number;
  onIntervalChange: (sec: number) => void;
  onRefresh?: () => void;
  variant?: 'emerald' | 'cyan' | 'indigo' | 'rose' | 'default';
  className?: string;
  buttonSize?: 'sm' | 'md';
}

const PRESET_OPTIONS: Array<{ label: string; sublabel?: string; sec: number }> = [
  { label: 'Off', sublabel: 'Disable auto-refresh', sec: 0 },
  { label: '1s', sublabel: 'Ultra-fast live (1 sec)', sec: 1 },
  { label: '2s', sublabel: 'Fast live stream (2 sec)', sec: 2 },
  { label: '3s', sublabel: 'Smooth sync (3 sec)', sec: 3 },
  { label: '5s', sublabel: 'Balanced polling (5 sec)', sec: 5 },
  { label: '10s', sublabel: 'Relaxed updates (10 sec)', sec: 10 },
  { label: '30s', sublabel: 'Half-minute poll (30 sec)', sec: 30 },
  { label: '1 min', sublabel: 'Standard poll (60 sec)', sec: 60 },
  { label: '5 mins', sublabel: 'Background poll (300 sec)', sec: 300 },
];

export const AutoRefreshDropdown: React.FC<AutoRefreshDropdownProps> = ({
  intervalSec,
  onIntervalChange,
  onRefresh,
  variant = 'emerald',
  className = '',
  buttonSize = 'sm'
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [customValue, setCustomValue] = useState<string>('');
  const [customUnit, setCustomUnit] = useState<'sec' | 'min'>('sec');
  const [customError, setCustomError] = useState<string>('');
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const formatLabel = (sec: number) => {
    if (!sec || sec <= 0) return 'Off';
    if (sec < 60) return `${sec}s`;
    const mins = Math.floor(sec / 60);
    const remSec = sec % 60;
    return remSec > 0 ? `${mins}m ${remSec}s` : `${mins}m`;
  };

  const handleApplyCustom = (e: React.FormEvent) => {
    e.preventDefault();
    const val = Number(customValue.trim());
    if (isNaN(val) || val <= 0) {
      setCustomError('Enter a valid positive number');
      return;
    }

    const totalSeconds = customUnit === 'min' ? Math.round(val * 60) : Math.round(val);
    if (totalSeconds < 1) {
      setCustomError('Minimum interval is 1 second');
      return;
    }
    if (totalSeconds > 3600) {
      setCustomError('Maximum interval is 60 minutes');
      return;
    }

    setCustomError('');
    onIntervalChange(totalSeconds);
    setIsOpen(false);
  };

  // Color schemes for triggers and active state
  const variantStyles = {
    emerald: {
      activeBadge: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 shadow-emerald-950/40',
      activeDot: 'bg-emerald-400',
      activeItem: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
      btnHover: 'hover:border-emerald-500/50 hover:bg-emerald-950/40',
      applyBtn: 'bg-emerald-600 hover:bg-emerald-500 text-white',
      accentText: 'text-emerald-400'
    },
    cyan: {
      activeBadge: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40 shadow-cyan-950/40',
      activeDot: 'bg-cyan-400',
      activeItem: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30',
      btnHover: 'hover:border-cyan-500/50 hover:bg-cyan-950/40',
      applyBtn: 'bg-cyan-600 hover:bg-cyan-500 text-white',
      accentText: 'text-cyan-400'
    },
    indigo: {
      activeBadge: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/40 shadow-indigo-950/40',
      activeDot: 'bg-indigo-400',
      activeItem: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30',
      btnHover: 'hover:border-indigo-500/50 hover:bg-indigo-950/40',
      applyBtn: 'bg-indigo-600 hover:bg-indigo-500 text-white',
      accentText: 'text-indigo-400'
    },
    rose: {
      activeBadge: 'bg-rose-500/20 text-rose-300 border-rose-500/40 shadow-rose-950/40',
      activeDot: 'bg-rose-400',
      activeItem: 'bg-rose-500/20 text-rose-300 border-rose-500/30',
      btnHover: 'hover:border-rose-500/50 hover:bg-rose-950/40',
      applyBtn: 'bg-rose-600 hover:bg-rose-500 text-white',
      accentText: 'text-rose-400'
    },
    default: {
      activeBadge: 'bg-amber-500/20 text-amber-300 border-amber-500/40 shadow-amber-950/40',
      activeDot: 'bg-amber-400',
      activeItem: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
      btnHover: 'hover:border-amber-500/50 hover:bg-slate-800',
      applyBtn: 'bg-amber-600 hover:bg-amber-500 text-slate-950 font-bold',
      accentText: 'text-amber-400'
    }
  }[variant];

  const isAutoActive = intervalSec > 0;

  return (
    <div className={`relative inline-block text-left ${className}`} ref={dropdownRef}>
      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen(prev => !prev)}
        className={`group flex items-center gap-2 rounded-xl border font-bold transition-all shadow-sm ${
          buttonSize === 'sm' ? 'px-2.5 py-1.5 text-xs' : 'px-3.5 py-2 text-sm'
        } ${
          isAutoActive
            ? `${variantStyles.activeBadge} shadow`
            : 'bg-slate-900/80 text-slate-300 border-slate-700/80 hover:text-white ' + variantStyles.btnHover
        }`}
        title="Change live auto-refresh rate"
      >
        <span className="flex items-center gap-1.5 font-black uppercase text-[10px] tracking-wide">
          {isAutoActive ? (
            <span className="relative flex h-2 w-2">
              <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${variantStyles.activeDot}`} />
              <span className={`relative inline-flex rounded-full h-2 w-2 ${variantStyles.activeDot}`} />
            </span>
          ) : (
            <Activity className="w-3.5 h-3.5 text-slate-400 group-hover:text-slate-200" />
          )}
          Auto:
        </span>
        <span className={`font-mono font-bold ${isAutoActive ? variantStyles.accentText : 'text-slate-400'}`}>
          {formatLabel(intervalSec)}
        </span>
        <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-200 ${isOpen ? 'rotate-180 text-white' : ''}`} />
      </button>

      {/* Floating Dropdown Modal / Menu */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-72 origin-top-right rounded-2xl bg-slate-900 border border-slate-700/80 shadow-2xl shadow-black/80 backdrop-blur-xl z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
          {/* Menu Header */}
          <div className="p-3 bg-slate-950/70 border-b border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Clock className={`w-4 h-4 ${variantStyles.accentText}`} />
              <div>
                <p className="text-xs font-bold text-white leading-none">Auto Refresh Interval</p>
                <p className="text-[10px] text-slate-400 mt-0.5">
                  {isAutoActive ? `Currently updating every ${formatLabel(intervalSec)}` : 'Auto-refresh is currently Off'}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Presets List */}
          <div className="p-2 space-y-1 max-h-56 overflow-y-auto">
            {PRESET_OPTIONS.map((opt) => {
              const isSelected = intervalSec === opt.sec;
              return (
                <button
                  key={opt.sec}
                  type="button"
                  onClick={() => {
                    onIntervalChange(opt.sec);
                    setIsOpen(false);
                  }}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-left text-xs transition-all ${
                    isSelected
                      ? `${variantStyles.activeItem} font-bold border`
                      : 'text-slate-300 hover:bg-slate-800/80 hover:text-white'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <span className={`w-1.5 h-1.5 rounded-full ${isSelected ? variantStyles.activeDot : 'bg-slate-600'}`} />
                    <div>
                      <span className="font-semibold text-white">{opt.label}</span>
                      {opt.sublabel && (
                        <span className="text-[10px] text-slate-400 ml-2 font-normal">
                          {opt.sublabel}
                        </span>
                      )}
                    </div>
                  </div>
                  {isSelected && <Check className="w-4 h-4 text-emerald-400 shrink-0" />}
                </button>
              );
            })}
          </div>

          {/* Custom Duration Input Form */}
          <div className="p-3 bg-slate-950/80 border-t border-slate-800">
            <p className="text-[11px] font-bold text-slate-300 mb-1.5 flex items-center gap-1.5">
              <Sparkles className="w-3 h-3 text-amber-400" />
              Custom Refresh Rate:
            </p>
            <form onSubmit={handleApplyCustom} className="space-y-2">
              <div className="flex items-center gap-1.5">
                <input
                  type="number"
                  min="1"
                  max="3600"
                  step="1"
                  placeholder="e.g. 15"
                  value={customValue}
                  onChange={(e) => {
                    setCustomValue(e.target.value);
                    setCustomError('');
                  }}
                  className="w-20 px-2.5 py-1.5 text-xs bg-slate-900 border border-slate-700 rounded-lg text-white font-mono placeholder:text-slate-500 focus:outline-none focus:border-emerald-500"
                />
                <select
                  value={customUnit}
                  onChange={(e) => setCustomUnit(e.target.value as 'sec' | 'min')}
                  className="px-2 py-1.5 text-xs bg-slate-900 border border-slate-700 rounded-lg text-slate-300 focus:outline-none focus:border-emerald-500 cursor-pointer"
                >
                  <option value="sec">Sec</option>
                  <option value="min">Mins</option>
                </select>
                <button
                  type="submit"
                  className={`flex-1 px-3 py-1.5 rounded-lg text-xs font-bold transition-all shadow ${variantStyles.applyBtn}`}
                >
                  Set Rate
                </button>
              </div>
              {customError && (
                <p className="text-[10px] text-rose-400 font-semibold">{customError}</p>
              )}
            </form>
          </div>

          {/* Quick Manual Refresh button */}
          {onRefresh && (
            <div className="p-2 bg-slate-900 border-t border-slate-800 flex justify-end">
              <button
                type="button"
                onClick={() => {
                  onRefresh();
                  setIsOpen(false);
                }}
                className="w-full py-1.5 px-3 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-semibold flex items-center justify-center gap-2 transition-all"
              >
                <RefreshCw className="w-3 h-3 text-slate-400" />
                Refresh Current Page Now
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
