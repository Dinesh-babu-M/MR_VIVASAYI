import React from 'react';
import { AlertTriangle, Trash2, CheckCircle2, Info, HelpCircle, X } from 'lucide-react';

export interface ConfirmModalOptions {
  title?: string;
  message: string;
  description?: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'danger' | 'warning' | 'info' | 'success';
  icon?: React.ReactNode;
  onConfirm: () => void | Promise<void>;
  onCancel?: () => void;
}

interface ConfirmationModalProps {
  isOpen: boolean;
  options: ConfirmModalOptions | null;
  onClose: () => void;
}

export const ConfirmationModal: React.FC<ConfirmationModalProps> = ({
  isOpen,
  options,
  onClose
}) => {
  if (!isOpen || !options) return null;

  const {
    title = 'Are you sure?',
    message,
    description,
    confirmText = 'Yes, Confirm',
    cancelText = 'Cancel',
    variant = 'warning',
    icon,
    onConfirm,
    onCancel
  } = options;

  const handleCancel = () => {
    if (onCancel) onCancel();
    onClose();
  };

  const handleConfirm = async () => {
    onClose();
    await onConfirm();
  };

  // Color schemes based on variant
  const getVariantStyles = () => {
    switch (variant) {
      case 'danger':
        return {
          iconBg: 'bg-rose-100 dark:bg-rose-950/70 border-rose-200 dark:border-rose-900',
          iconColor: 'text-rose-600 dark:text-rose-400',
          defaultIcon: <Trash2 className="w-7 h-7" />,
          confirmBtn: 'bg-rose-600 hover:bg-rose-700 text-white focus:ring-rose-400 shadow-rose-600/20',
          titleColor: 'text-rose-950 dark:text-rose-200',
          badgeColor: 'bg-rose-100 dark:bg-rose-950/80 text-rose-700 dark:text-rose-300'
        };
      case 'info':
        return {
          iconBg: 'bg-blue-100 dark:bg-blue-950/70 border-blue-200 dark:border-blue-900',
          iconColor: 'text-blue-600 dark:text-blue-400',
          defaultIcon: <Info className="w-7 h-7" />,
          confirmBtn: 'bg-blue-600 hover:bg-blue-700 text-white focus:ring-blue-400 shadow-blue-600/20',
          titleColor: 'text-blue-950 dark:text-blue-200',
          badgeColor: 'bg-blue-100 dark:bg-blue-950/80 text-blue-700 dark:text-blue-300'
        };
      case 'success':
        return {
          iconBg: 'bg-emerald-100 dark:bg-emerald-950/70 border-emerald-200 dark:border-emerald-900',
          iconColor: 'text-emerald-600 dark:text-emerald-400',
          defaultIcon: <CheckCircle2 className="w-7 h-7" />,
          confirmBtn: 'bg-emerald-600 hover:bg-emerald-700 text-white focus:ring-emerald-400 shadow-emerald-600/20',
          titleColor: 'text-emerald-950 dark:text-emerald-200',
          badgeColor: 'bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300'
        };
      case 'warning':
      default:
        return {
          iconBg: 'bg-amber-100 dark:bg-amber-950/70 border-amber-200 dark:border-amber-900',
          iconColor: 'text-amber-600 dark:text-amber-400',
          defaultIcon: <AlertTriangle className="w-7 h-7" />,
          confirmBtn: 'bg-amber-600 hover:bg-amber-700 text-white focus:ring-amber-400 shadow-amber-600/20',
          titleColor: 'text-amber-950 dark:text-amber-200',
          badgeColor: 'bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-300'
        };
    }
  };

  const styles = getVariantStyles();

  return (
    <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-fadeIn">
      <div 
        className="bg-white dark:bg-emerald-950 rounded-3xl max-w-md w-full p-6 sm:p-7 shadow-2xl border border-slate-200 dark:border-emerald-800 text-center space-y-4 relative overflow-hidden transform scale-100 transition-all animate-scaleUp"
        role="dialog"
        aria-modal="true"
      >
        {/* Subtle decorative background blob */}
        <div className="absolute -top-12 -right-12 w-32 h-32 bg-amber-400/10 rounded-full blur-2xl pointer-events-none" />

        {/* Close button top right */}
        <button
          type="button"
          onClick={handleCancel}
          className="absolute top-4 right-4 p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-emerald-200 rounded-xl hover:bg-slate-100 dark:hover:bg-emerald-900 transition"
          aria-label="Close dialog"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Hero Icon */}
        <div className={`w-16 h-16 rounded-2xl mx-auto flex items-center justify-center border-2 ${styles.iconBg} ${styles.iconColor} shadow-md`}>
          {icon || styles.defaultIcon}
        </div>

        {/* Header & Prompt */}
        <div className="space-y-1.5">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider mb-1 bg-slate-100 dark:bg-emerald-900/60 text-slate-700 dark:text-emerald-200">
            <HelpCircle className="w-3 h-3" />
            <span>Confirmation Required</span>
          </div>

          <h3 className={`font-serif text-lg sm:text-xl font-black ${styles.titleColor}`}>
            {title}
          </h3>

          <p className="text-sm font-semibold text-slate-700 dark:text-emerald-100 px-2 leading-relaxed">
            {message}
          </p>

          {description && (
            <p className="text-xs text-slate-500 dark:text-emerald-300/80 px-2 pt-1 leading-relaxed">
              {description}
            </p>
          )}
        </div>

        {/* Action Buttons */}
        <div className="grid grid-cols-2 gap-3 pt-3">
          <button
            type="button"
            onClick={handleCancel}
            className="py-2.5 px-4 rounded-xl border border-slate-300 dark:border-emerald-800 bg-slate-100 hover:bg-slate-200 dark:bg-emerald-900/60 dark:hover:bg-emerald-900 text-slate-700 dark:text-emerald-200 font-bold text-xs transition cursor-pointer"
          >
            {cancelText}
          </button>

          <button
            type="button"
            onClick={handleConfirm}
            className={`py-2.5 px-4 rounded-xl font-black text-xs shadow-lg hover:shadow-xl transition flex items-center justify-center gap-1.5 cursor-pointer ${styles.confirmBtn}`}
          >
            <span>{confirmText}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
