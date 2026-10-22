import React, { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  Globe,
  Edit2,
  Eye,
  Save,
  CheckCircle2,
  Layout,
  Type,
  Image,
  Search,
  Settings,
  Megaphone,
  Star,
  BarChart3,
  ChevronRight,
  ExternalLink,
  ToggleLeft,
  ToggleRight,
  Info,
  Leaf,
  Heart,
  Zap,
  Trash2,
  RotateCcw,
  Phone,
  MapPin,
  Mail,
  Clock,
  Plus,
  AlertTriangle,
  Award,
  Bell,
  LineChart as LineChartIcon,
  Sparkles,
  RefreshCw,
  BookOpen,
  Lock,
} from 'lucide-react';
import { getJSONStore, setJSONStore, getWhatsAppSupportNumber } from '../../lib/dbManager';
import { RefreshSpinnerModal } from '../../components/common/RefreshSpinnerModal';
import { AutoRefreshDropdown } from '../../components/common/AutoRefreshDropdown';
import { AdminPageSkeleton } from '../../components/common/Skeleton';
import { useActionModal } from '../../contexts/ActionModalContext';
import { useNotifications } from '../../contexts/NotificationContext';
import { DEFAULT_CMS_TEMPLATES } from '../../lib/cmsTemplates';
import { WebsiteAnalyzerTab } from '../../components/admin/cms/WebsiteAnalyzerTab';
import { PopNotificationTab } from '../../components/admin/cms/PopNotificationTab';
import { SEOGrowthGuideView } from '../../components/admin/cms/SEOGrowthGuideView';
import { LoginPageCMSTab } from '../../components/admin/cms/LoginPageCMSTab';

// ─── Types ────────────────────────────────────────────────────────────────────

export type TabId = 'website_analyzer' | 'seo_guide' | 'login_page' | 'hero' | 'pop_notification' | 'announcements' | 'header_footer' | 'about' | 'seo' | 'contact';

export interface HeaderFooterSettings {
  top_bar_enabled: boolean;
  announcement_text: string;
  announcement_link: string;
  announcement_bg_color: string;
  nav_custom_link_text: string;
  nav_custom_link_url: string;
  footer_brand_tagline: string;
  footer_phone: string;
  footer_email: string;
  footer_address: string;
  footer_hours: string;
  show_farmer_badge: boolean;
  show_zero_chemical_badge: boolean;
  copyright_text: string;
}

interface HeroBanner {
  headline: string;
  subheadline: string;
  cta_text: string;
  cta_link: string;
  bg_image_url: string;
  bg_image_animation?: 'none' | 'float' | 'pulse' | 'zoom' | 'bounce';
  is_published: boolean;
  guarantee_badges?: string[];
  floating_pill_text?: string;
}

export interface AnnouncementItem {
  id: string;
  text: string;
  link: string;
  is_active: boolean;
}

export interface AnnouncementBar {
  items: AnnouncementItem[];
  text: string;
  link: string;
  bg_color: string;
  text_color: string;
  position_align: 'center' | 'left' | 'right';
  animation_type: 'none' | 'scroll_right_to_left' | 'scroll_left_to_right';
  is_active: boolean;
  scheduled_at?: string;
  approved?: boolean;
}

interface FeatureBadge {
  id: string;
  text: string;
}

interface StatBox {
  id: string;
  label: string;
  value: string;
}

interface CoreValue {
  id: string;
  title: string;
  description: string;
}

interface AboutSection {
  brand_story: string;
  stats: StatBox[];
  core_values: CoreValue[];
}

interface PageSEO {
  page: string;
  title: string;
  description: string;
  keywords: string;
  og_image: string;
}

// ─── Initial Data ─────────────────────────────────────────────────────────────



const ANNOUNCEMENT_COLORS = [
  { label: 'Emerald', value: '#065f46' },
  { label: 'Amber', value: '#92400e' },
  { label: 'Slate', value: '#1e293b' },
  { label: 'Rose', value: '#881337' },
  { label: 'Indigo', value: '#312e81' },
  { label: 'Teal', value: '#134e4a' },
];

const ANNOUNCEMENT_TEXT_COLORS = [
  { label: 'Amber Yellow', value: '#fde047' },
  { label: 'Pure White', value: '#ffffff' },
  { label: 'Soft Gold', value: '#fef08a' },
  { label: 'Mint Light', value: '#a7f3d0' },
  { label: 'Cyan Glow', value: '#cffafe' },
];

const ANNOUNCEMENT_SUGGESTIONS = [
  { text: '🌿 Free delivery on orders above ₹499 — Limited time offer!', link: '/products', color: '#065f46' },
  { text: '🌾 Fresh Harvest Alert: Mapillai Samba & Seeraga Samba Rice In Stock!', link: '/products', color: '#92400e' },
  { text: '🚜 100% Wood Cold-Pressed Chekku Oils — Direct From Local Farmers', link: '/about', color: '#134e4a' },
  { text: '✨ Festival Offer: Get 10% Extra Discount On Organic Millet Combos!', link: '/products', color: '#312e81' },
  { text: '⚡ Instant Counter Billing & WhatsApp Direct Order Available', link: '/contact', color: '#881337' },
];







const SEO_PAGES = ['Home', 'Products', 'About', 'Contact'];



// ─── Reusable sub-components ──────────────────────────────────────────────────

const SectionCard: React.FC<{ title: string; icon: React.ReactNode; children: React.ReactNode }> = ({
  title,
  icon,
  children,
}) => (
  <div className="bg-white dark:bg-emerald-900/40 border border-emerald-100 dark:border-emerald-800 rounded-2xl shadow-sm overflow-hidden">
    <div className="flex items-center gap-2.5 px-6 py-4 border-b border-emerald-100 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950">
      <span className="text-emerald-700 dark:text-amber-400">{icon}</span>
      <h3 className="font-bold text-sm text-gray-900 dark:text-emerald-100 uppercase tracking-wide">
        {title}
      </h3>
    </div>
    <div className="p-6 space-y-5">{children}</div>
  </div>
);

const FormLabel: React.FC<{ children: React.ReactNode; hint?: string }> = ({ children, hint }) => (
  <label className="block text-xs font-bold text-gray-700 dark:text-emerald-300 uppercase tracking-wide mb-1.5">
    {children}
    {hint && <span className="ml-2 font-normal text-gray-400 normal-case tracking-normal">{hint}</span>}
  </label>
);

const TextInput: React.FC<{
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  className?: string;
}> = ({ value, onChange, placeholder, className = '' }) => (
  <input
    type="text"
    value={value}
    onChange={(e) => onChange(e.target.value)}
    placeholder={placeholder}
    className={`w-full px-3.5 py-2.5 text-sm bg-white dark:bg-emerald-950 border border-emerald-200 dark:border-emerald-700 rounded-xl text-gray-900 dark:text-emerald-100 placeholder-gray-400 dark:placeholder-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition ${className}`}
  />
);

const TextAreaInput: React.FC<{
  value: string;
  onChange: (v: string) => void;
  rows?: number;
  placeholder?: string;
}> = ({ value, onChange, rows = 4, placeholder }) => (
  <textarea
    value={value}
    onChange={(e) => onChange(e.target.value)}
    rows={rows}
    placeholder={placeholder}
    className="w-full px-3.5 py-2.5 text-sm bg-white dark:bg-emerald-950 border border-emerald-200 dark:border-emerald-700 rounded-xl text-gray-900 dark:text-emerald-100 placeholder-gray-400 dark:placeholder-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition resize-y"
  />
);

const Toggle: React.FC<{ checked: boolean; onChange: (v: boolean) => void; label: string }> = ({
  checked,
  onChange,
  label,
}) => (
  <button
    type="button"
    onClick={() => onChange(!checked)}
    className={`flex items-center gap-3 px-4 py-2.5 rounded-xl border text-sm font-semibold transition-all w-full ${
      checked
        ? 'bg-emerald-50 dark:bg-emerald-900/60 border-emerald-400 dark:border-emerald-600 text-emerald-800 dark:text-emerald-300'
        : 'bg-gray-50 dark:bg-emerald-950 border-gray-200 dark:border-emerald-800 text-gray-500 dark:text-emerald-500'
    }`}
  >
    {checked ? (
      <ToggleRight className="w-5 h-5 text-emerald-600 dark:text-amber-400 shrink-0" />
    ) : (
      <ToggleLeft className="w-5 h-5 text-gray-400 shrink-0" />
    )}
    <span className="flex-1 text-left">{label}</span>
    <span
      className={`text-xs font-bold px-2 py-0.5 rounded-full shrink-0 ${
        checked
          ? 'bg-emerald-600 text-white'
          : 'bg-gray-200 dark:bg-emerald-800 text-gray-500 dark:text-emerald-400'
      }`}
    >
      {checked ? 'ON' : 'OFF'}
    </span>
  </button>
);

const SaveButton: React.FC<{ onClick: () => void; saved: boolean; label?: string; sectionName?: string }> = ({
  onClick,
  saved,
  label = 'Save Changes',
  sectionName = 'CMS Configuration'
}) => {
  const { showActionModal } = useActionModal();

  const handleClick = () => {
    showActionModal({
      title: `Publishing ${label}`,
      subtitle: `Saving ${sectionName} and syncing changes with storefront...`,
      badge: 'CMS Live Publisher',
      duration: 800,
      steps: [
        'Validating content blocks & markup...',
        'Compiling layout configuration payload...',
        'Updating storefront cache & database...',
        'Published live successfully!'
      ],
      onComplete: () => {
        onClick();
      }
    });
  };

  return (
    <button
      onClick={handleClick}
      className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm shadow transition-all ${
        saved
          ? 'bg-emerald-100 dark:bg-emerald-900 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700'
          : 'bg-emerald-700 hover:bg-emerald-800 text-white border border-emerald-800'
      }`}
    >
      {saved ? (
        <>
          <CheckCircle2 className="w-4 h-4" /> Saved!
        </>
      ) : (
        <>
          <Save className="w-4 h-4" /> {label}
        </>
      )}
    </button>
  );
};

export const ResetConfirmationModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void> | void;
  sectionTitle: string;
}> = ({ isOpen, onClose, onConfirm, sectionTitle }) => {
  const [isProcessing, setIsProcessing] = useState(false);

  if (!isOpen) return null;

  const handleConfirm = async () => {
    try {
      setIsProcessing(true);
      await onConfirm();
    } finally {
      setIsProcessing(false);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div 
        className="relative w-full max-w-md bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-3xl p-6 shadow-2xl space-y-5"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-amber-100 dark:bg-amber-950/60 border border-amber-300 dark:border-amber-700/60 flex items-center justify-center text-amber-600 dark:text-amber-400 shrink-0">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-base font-extrabold text-stone-900 dark:text-stone-100">
              Reset to Defaults?
            </h3>
            <p className="text-xs text-stone-500 dark:text-stone-400">
              {sectionTitle}
            </p>
          </div>
        </div>

        <div className="p-3.5 rounded-2xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/40 text-xs text-amber-800 dark:text-amber-200 leading-relaxed">
          <p className="font-bold text-sm mb-1 text-amber-900 dark:text-amber-100">
            Are you sure you want to reset to defaults?
          </p>
          <p className="opacity-90">
            This will restore the original master template configuration. All current custom edits will be reverted back to default values.
          </p>
        </div>

        <div className="flex items-center justify-end gap-3 pt-2 border-t border-stone-100 dark:border-stone-800">
          <button
            type="button"
            disabled={isProcessing}
            onClick={onClose}
            className="px-5 py-2.5 text-xs font-bold text-stone-700 dark:text-stone-300 bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 dark:hover:bg-stone-700 rounded-xl transition disabled:opacity-50"
          >
            No, Cancel
          </button>
          <button
            type="button"
            disabled={isProcessing}
            onClick={handleConfirm}
            className="flex items-center gap-2 px-5 py-2.5 text-xs font-bold text-white bg-red-600 hover:bg-red-700 rounded-xl shadow transition disabled:opacity-75"
          >
            {isProcessing ? (
              <>
                <RotateCcw className="w-3.5 h-3.5 animate-spin" />
                Processing Reset...
              </>
            ) : (
              <>
                <RotateCcw className="w-3.5 h-3.5" />
                Yes, Reset Defaults
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

// Helper to update and persist CMS settings directly via setJSONStore (no localStorage)
async function updateCMSStore(section: string, value: any): Promise<void> {
  try {
    const existing = await getJSONStore<any>('cms_settings');
    const base = (existing && existing.length > 0 && typeof existing[0] === 'object') ? existing[0] : {};
    const updated = {
      ...base,
      [section]: value
    };
    await setJSONStore('cms_settings', [updated]);
  } catch (err) {
    console.error(`Failed to update CMS section ${section}:`, err);
  }
}

// ─── Tab: Hero Banner ─────────────────────────────────────────────────────────

const HeroBannerTab: React.FC = () => {
  const { addNotification } = useNotifications();

  const [hero, setHero] = useState<HeroBanner>({
    ...DEFAULT_CMS_TEMPLATES.hero
  });
  const [saved, setSaved] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showPreview, setShowPreview] = useState(true);
  const [isResetModalOpen, setIsResetModalOpen] = useState(false);
  const [newBadgeText, setNewBadgeText] = useState('');

  React.useEffect(() => {
    getJSONStore<any>('cms_settings').then(d => {
      if (d && d.length && d[0].hero) {
        setHero({
          ...DEFAULT_CMS_TEMPLATES.hero,
          ...d[0].hero,
          guarantee_badges: Array.isArray(d[0].hero.guarantee_badges)
            ? d[0].hero.guarantee_badges
            : DEFAULT_CMS_TEMPLATES.hero.guarantee_badges
        });
      }
    });
  }, []);

  const update = (key: keyof HeroBanner, value: any) => {
    setHero((prev) => ({ ...prev, [key]: value }));
    setSaved(false);
  };

  const handleAddGuaranteeBadge = () => {
    if (!newBadgeText.trim()) return;
    const currentBadges = hero.guarantee_badges || [];
    update('guarantee_badges', [...currentBadges, newBadgeText.trim()]);
    setNewBadgeText('');
  };

  const handleRemoveGuaranteeBadge = (idx: number) => {
    const currentBadges = hero.guarantee_badges || [];
    update('guarantee_badges', currentBadges.filter((_, i) => i !== idx));
  };

  const handleUpdateGuaranteeBadge = (idx: number, val: string) => {
    const currentBadges = [...(hero.guarantee_badges || [])];
    currentBadges[idx] = val;
    update('guarantee_badges', currentBadges);
  };

  const handleSave = async () => {
    setIsSaving(true);
    await updateCMSStore('hero', hero);
    setIsSaving(false);
    setSaved(true);
    addNotification({
      title: 'Hero Banner Updated',
      message: 'Successfully saved website hero banner modifications.',
      type: 'success',
      sourceModule: 'Website CMS'
    });
    setTimeout(() => setSaved(false), 3000);
  };

  const executeResetDefaults = async () => {
    setIsSaving(true);
    const defaultHero = { ...DEFAULT_CMS_TEMPLATES.hero };
    setHero(defaultHero);
    await updateCMSStore('hero', defaultHero);
    setIsSaving(false);
    setSaved(true);
    addNotification({
      title: 'Hero Banner Reset to Defaults',
      message: 'Restored original default headline, badges, and layout template.',
      type: 'info',
      sourceModule: 'Website CMS'
    });
    setTimeout(() => setSaved(false), 3000);
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* Form */}
        <div className="space-y-6">
          <SectionCard title="Banner Content" icon={<Type className="w-4 h-4" />}>
            <div>
              <FormLabel>Main Headline</FormLabel>
              <TextAreaInput
                value={hero.headline}
                onChange={(v) => update('headline', v)}
                rows={3}
                placeholder="Your hero headline here..."
              />
            </div>

            <div>
              <FormLabel>Sub-Headline</FormLabel>
              <TextAreaInput
                value={hero.subheadline}
                onChange={(v) => update('subheadline', v)}
                rows={3}
                placeholder="Supporting text below headline..."
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <FormLabel>Primary CTA Button Text</FormLabel>
                <TextInput
                  value={hero.cta_text}
                  onChange={(v) => update('cta_text', v)}
                  placeholder="e.g. Shop Now"
                />
              </div>
              <div>
                <FormLabel>Primary CTA Link</FormLabel>
                <TextInput
                  value={hero.cta_link}
                  onChange={(v) => update('cta_link', v)}
                  placeholder="/products"
                />
              </div>
            </div>

            <div>
              <FormLabel hint="(Full URL or relative path)">Background Image URL</FormLabel>
              <TextInput
                value={hero.bg_image_url}
                onChange={(v) => update('bg_image_url', v)}
                placeholder="https://..."
              />
              {hero.bg_image_url && (
                <p className="mt-1.5 text-xs text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                  <Image className="w-3 h-3" /> Image URL set — see preview on the right
                </p>
              )}
            </div>

            <div>
              <FormLabel hint="(Motion animation applied to hero showcase image)">Image Animation Style</FormLabel>
              <select
                value={hero.bg_image_animation || 'float'}
                onChange={(e) => update('bg_image_animation', e.target.value)}
                className="w-full px-3.5 py-2.5 text-sm bg-white dark:bg-emerald-950 border border-emerald-200 dark:border-emerald-700 rounded-xl text-gray-900 dark:text-emerald-100 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition"
              >
                <option value="none">None (Static)</option>
                <option value="float">Smooth Floating Animation (Recommended)</option>
                <option value="pulse">Soft Pulse Glowing Animation</option>
                <option value="zoom">Subtle Zoom on Hover</option>
                <option value="bounce">Gentle Up-Down Bounce</option>
              </select>
            </div>

            <div>
              <FormLabel>Published Status</FormLabel>
              <Toggle
                checked={hero.is_published}
                onChange={(v) => update('is_published', v)}
                label={hero.is_published ? 'Banner is live on website' : 'Banner is hidden (draft)'}
              />
            </div>
          </SectionCard>

          {/* Guarantees & Trust Badges Editor */}
          <SectionCard title="Guarantees & Trust Badges" icon={<CheckCircle2 className="w-4 h-4" />}>
            <p className="text-xs text-stone-500 dark:text-emerald-400">
              Manage the 3-column guarantee icons displayed below the hero CTA buttons and floating trust pill.
            </p>

            <div>
              <FormLabel hint="(e.g. 'Lab Tested & Certified Pure')">Top Floating Trust Pill Text</FormLabel>
              <div className="flex items-center gap-2">
                <TextInput
                  value={hero.floating_pill_text ?? 'Lab Tested & Certified Pure'}
                  onChange={(v) => update('floating_pill_text', v)}
                  placeholder="e.g. Lab Tested & Certified Pure"
                />
                <button
                  type="button"
                  onClick={() => update('floating_pill_text', '')}
                  className="px-3 py-2 text-xs font-bold text-stone-500 hover:text-red-500 bg-stone-100 dark:bg-emerald-950 rounded-xl border border-stone-200 dark:border-emerald-800 transition"
                  title="Clear pill"
                >
                  Clear
                </button>
              </div>
            </div>

            <div className="space-y-3 pt-2">
              <FormLabel>Key Guarantee Badges List</FormLabel>
              {(hero.guarantee_badges || []).map((badge, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-emerald-100 dark:bg-emerald-900 text-emerald-700 dark:text-amber-400 flex items-center justify-center text-xs font-bold shrink-0">
                    {idx + 1}
                  </div>
                  <input
                    type="text"
                    value={badge}
                    onChange={(e) => handleUpdateGuaranteeBadge(idx, e.target.value)}
                    className="flex-1 px-3 py-2 text-xs bg-white dark:bg-emerald-950 border border-emerald-200 dark:border-emerald-700 rounded-xl text-gray-900 dark:text-emerald-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    placeholder="e.g. 100% Unprocessed"
                  />
                  <button
                    type="button"
                    onClick={() => handleRemoveGuaranteeBadge(idx)}
                    className="p-2 text-stone-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-xl transition"
                    title="Remove Badge"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}

              {/* Add New Badge Form */}
              <div className="flex items-center gap-2 pt-2">
                <input
                  type="text"
                  value={newBadgeText}
                  onChange={(e) => setNewBadgeText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddGuaranteeBadge();
                    }
                  }}
                  placeholder="Add new guarantee (e.g. Chemical-Free)..."
                  className="flex-1 px-3.5 py-2 text-xs bg-white dark:bg-emerald-950 border border-dashed border-emerald-300 dark:border-emerald-700 rounded-xl text-gray-900 dark:text-emerald-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
                <button
                  type="button"
                  onClick={handleAddGuaranteeBadge}
                  className="flex items-center gap-1.5 px-3.5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs rounded-xl shadow transition"
                >
                  <Plus className="w-3.5 h-3.5" /> Add Badge
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between pt-4 border-t border-emerald-100 dark:border-emerald-800">
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setShowPreview((p) => !p)}
                  className="flex items-center gap-2 text-sm font-semibold text-emerald-700 dark:text-amber-400 hover:underline"
                >
                  <Eye className="w-4 h-4" />
                  {showPreview ? 'Hide Preview' : 'Show Preview'}
                </button>
                <button
                  type="button"
                  onClick={() => setIsResetModalOpen(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-gray-600 dark:text-emerald-300 hover:text-red-600 bg-gray-100 dark:bg-emerald-950 rounded-lg border border-gray-200 dark:border-emerald-800 transition-colors"
                  title="Reset to Original Default Template"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  Reset Defaults
                </button>
              </div>
              <SaveButton onClick={handleSave} saved={saved} />
            </div>
          </SectionCard>
        </div>

        {/* Live Preview */}
        {showPreview && (
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-xs font-bold text-gray-500 dark:text-emerald-400 uppercase tracking-wider">
              <Eye className="w-4 h-4" /> Live Interactive Preview
            </div>
            <div
              className="relative w-full rounded-2xl overflow-hidden shadow-xl border-2 border-emerald-200 dark:border-emerald-700"
              style={{ minHeight: 380 }}
            >
              <div
                className={`absolute inset-0 bg-cover bg-center ${
                  hero.bg_image_animation === 'float' ? 'animate-float-slow' :
                  hero.bg_image_animation === 'pulse' ? 'animate-pulse-slow' :
                  hero.bg_image_animation === 'zoom' ? 'animate-zoom-subtle' :
                  hero.bg_image_animation === 'bounce' ? 'animate-bounce-gentle' : ''
                }`}
                style={{
                  backgroundImage: hero.bg_image_url ? `url(${hero.bg_image_url})` : undefined,
                  backgroundColor: !hero.bg_image_url ? '#064e3b' : undefined,
                }}
              />
              <div className="absolute inset-0 bg-gradient-to-br from-emerald-950/85 via-emerald-900/70 to-emerald-950/90" />

              <div className="absolute top-3 right-3 z-20 flex items-center gap-2">
                {hero.floating_pill_text && (
                  <span className="text-[10px] font-extrabold px-2.5 py-1 rounded-full bg-amber-400 text-emerald-950 border border-amber-300 shadow flex items-center gap-1 animate-bounce">
                    <Award className="w-3 h-3" /> {hero.floating_pill_text}
                  </span>
                )}
                <span
                  className={`text-[10px] font-bold px-2 py-1 rounded-full border ${
                    hero.is_published
                      ? 'bg-emerald-600 text-white border-emerald-500'
                      : 'bg-gray-600 text-gray-200 border-gray-500'
                  }`}
                >
                  {hero.is_published ? '● PUBLISHED' : '○ DRAFT'}
                </span>
              </div>

              <div className="relative z-10 p-6 sm:p-8 flex flex-col justify-end" style={{ minHeight: 380 }}>
                <div className="mt-12 space-y-3">
                  <h1 className="text-2xl font-serif font-black text-white leading-snug drop-shadow-lg">
                    {hero.headline || (
                      <span className="opacity-40 italic text-lg">Main headline will appear here...</span>
                    )}
                  </h1>
                  <p className="text-xs sm:text-sm text-emerald-100 leading-relaxed max-w-md opacity-90">
                    {hero.subheadline || (
                      <span className="opacity-40 italic">Sub-headline will appear here...</span>
                    )}
                  </p>
                  
                  <div className="flex flex-wrap gap-2.5 items-center pt-1">
                    <span className="inline-flex items-center gap-2 px-4 py-2 bg-amber-400 text-emerald-950 font-extrabold text-xs rounded-xl shadow-lg cursor-pointer">
                      {hero.cta_text || 'CTA Button'}
                      <ChevronRight className="w-3.5 h-3.5" />
                    </span>
                    <span className="inline-flex items-center gap-1.5 px-4 py-2 bg-white/10 border border-white/30 text-white font-bold text-xs rounded-xl cursor-pointer backdrop-blur-sm">
                      <ExternalLink className="w-3.5 h-3.5" /> WhatsApp Order
                    </span>
                  </div>

                  {hero.cta_link && (
                    <p className="text-[10px] text-emerald-300 font-mono opacity-70">
                      Link: {hero.cta_link}
                    </p>
                  )}

                  {/* Guarantees preview */}
                  {(hero.guarantee_badges && hero.guarantee_badges.length > 0) && (
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 pt-3 border-t border-emerald-800/80 text-[11px] text-emerald-200 font-medium">
                      {hero.guarantee_badges.map((b, i) => (
                        <div key={i} className="flex items-center gap-1.5">
                          <CheckCircle2 className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                          <span>{b}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
            <p className="text-[11px] text-gray-400 dark:text-emerald-600 flex items-center gap-1">
              <Info className="w-3 h-3" />
              Live preview reflecting active animation ({hero.bg_image_animation || 'float'}) and guarantee trust badges.
            </p>
          </div>
        )}

        <RefreshSpinnerModal
          isOpen={isSaving}
          title="Saving Hero Banner..."
          subtitle="Updating website headline, background image & CTA links..."
          moduleName="Website CMS"
        />

        <ResetConfirmationModal
          isOpen={isResetModalOpen}
          onClose={() => setIsResetModalOpen(false)}
          onConfirm={executeResetDefaults}
          sectionTitle="Hero Banner & Guarantees"
        />
      </div>
    </div>
  );
};

// ─── Tab: Announcements ───────────────────────────────────────────────────────

const AnnouncementsTab: React.FC = () => {
  const { addNotification } = useNotifications();

  const [bar, setBar] = useState<AnnouncementBar>({
    ...DEFAULT_CMS_TEMPLATES.announcement
  });
  const [badges, setBadges] = useState<FeatureBadge[]>([
    ...DEFAULT_CMS_TEMPLATES.badges
  ]);
  const [saved, setSaved] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isResetModalOpen, setIsResetModalOpen] = useState(false);

  React.useEffect(() => {
    getJSONStore<any>('cms_settings').then(d => {
      if (d && d.length) {
        if (d[0].announcement) {
          const parsed = d[0].announcement;
          setBar({
            ...DEFAULT_CMS_TEMPLATES.announcement,
            ...parsed,
            items: parsed.items && parsed.items.length > 0 ? parsed.items : DEFAULT_CMS_TEMPLATES.announcement.items
          });
        }
        if (d[0].badges && Array.isArray(d[0].badges) && d[0].badges.length > 0) {
          setBadges(d[0].badges);
        }
      }
    });
  }, []);

  const updateBar = (key: keyof AnnouncementBar, value: any) => {
    setBar((prev) => ({ ...prev, [key]: value }));
    setSaved(false);
  };

  const handleAddItem = () => {
    const newItem: AnnouncementItem = {
      id: `ann_${Date.now()}`,
      text: '⚡ New Announcement Message',
      link: '/products',
      is_active: true
    };
    setBar((prev) => ({
      ...prev,
      items: [...(prev.items || []), newItem]
    }));
    setSaved(false);
  };

  const handleUpdateItem = (id: string, key: keyof AnnouncementItem, value: any) => {
    setBar((prev) => ({
      ...prev,
      items: (prev.items || []).map((it) => (it.id === id ? { ...it, [key]: value } : it))
    }));
    setSaved(false);
  };

  const handleDeleteItem = (id: string) => {
    setBar((prev) => ({
      ...prev,
      items: (prev.items || []).filter((it) => it.id !== id)
    }));
    setSaved(false);
  };

  const updateBadge = (id: string, text: string) => {
    setBadges((prev) => prev.map((b) => (b.id === id ? { ...b, text } : b)));
    setSaved(false);
  };

  const handleAddBadge = () => {
    const newBadge: FeatureBadge = {
      id: `b_${Date.now()}`,
      text: '✨ New Feature Badge'
    };
    setBadges((prev) => [...prev, newBadge]);
    setSaved(false);
  };

  const handleDeleteBadge = (id: string) => {
    setBadges((prev) => prev.filter((b) => b.id !== id));
    setSaved(false);
  };

  const handleSave = async (publishImmediately: boolean = false) => {
    setIsSaving(true);
    const updatedBar: AnnouncementBar = {
      ...bar,
      approved: publishImmediately ? true : bar.approved
    };
    setBar(updatedBar);

    await updateCMSStore('announcement', updatedBar);
    await updateCMSStore('badges', badges);

    setIsSaving(false);
    setSaved(true);
    addNotification({
      title: publishImmediately ? 'Announcements Published & Live!' : 'Announcements Saved (Pending Approval)',
      message: publishImmediately
        ? 'Approved and deployed announcement bar & marquee animations live to website.'
        : 'Saved draft changes to announcement bar. Confirm preview to publish.',
      type: publishImmediately ? 'success' : 'info',
      sourceModule: 'Website CMS'
    });
    setTimeout(() => setSaved(false), 3000);
  };

  const executeResetDefaults = async () => {
    setIsSaving(true);
    const defaultBar = { ...DEFAULT_CMS_TEMPLATES.announcement };
    const defaultBadges = [...DEFAULT_CMS_TEMPLATES.badges];
    setBar(defaultBar);
    setBadges(defaultBadges);

    await updateCMSStore('announcement', defaultBar);
    await updateCMSStore('badges', defaultBadges);

    setIsSaving(false);
    setSaved(true);
    addNotification({
      title: 'Announcements Reset to Defaults',
      message: 'Restored original announcement bar & trust badges template.',
      type: 'info',
      sourceModule: 'Website CMS'
    });
    setTimeout(() => setSaved(false), 3000);
  };

  const activeItems = (bar.items || []).filter((it) => it.is_active);

  return (
    <div className="space-y-6">
      {/* Live bar preview with animation */}
      <div className="rounded-2xl overflow-hidden border-2 border-emerald-300 dark:border-emerald-700 shadow-md">
        <div
          className="px-4 py-2.5 text-xs font-semibold flex items-center justify-between overflow-hidden relative"
          style={{
            backgroundColor: bar.is_active ? bar.bg_color : '#6b7280',
            color: bar.text_color || '#ffffff'
          }}
        >
          <div
            className={`w-full overflow-hidden flex items-center ${
              bar.position_align === 'center'
                ? 'justify-center text-center'
                : bar.position_align === 'right'
                ? 'justify-end text-right'
                : 'justify-start text-left'
            }`}
          >
            {bar.animation_type === 'scroll_right_to_left' || bar.animation_type === 'scroll_left_to_right' ? (
              <div
                className={`flex items-center gap-6 py-0.5 ${
                  bar.animation_type === 'scroll_right_to_left'
                    ? 'animate-marquee-left'
                    : 'animate-marquee-right'
                }`}
              >
                {/* Track 1 */}
                <div className="flex items-center gap-6 shrink-0">
                  {activeItems.length > 0 ? (
                    activeItems.map((item) => (
                      <span key={item.id} className="inline-flex items-center gap-1.5 sm:gap-2 whitespace-nowrap text-xs">
                        <Megaphone className="w-3.5 h-3.5 shrink-0 text-amber-300" />
                        <span>{item.text}</span>
                        {item.link && (
                          <span className="inline-flex items-center gap-1 ml-1.5 px-2.5 py-0.5 rounded-full bg-gradient-to-r from-amber-400 via-amber-300 to-amber-500 text-emerald-950 font-black text-[10px] shadow-sm">
                            <span>Learn More</span>
                            <span>&rarr;</span>
                          </span>
                        )}
                      </span>
                    ))
                  ) : (
                    <span className="inline-flex items-center gap-1.5 sm:gap-2 whitespace-nowrap text-xs">
                      <Megaphone className="w-3.5 h-3.5 shrink-0 text-amber-300" />
                      <span>{bar.text || '🌿 Free delivery on orders above ₹499 — Limited time offer!'}</span>
                    </span>
                  )}
                </div>

                {/* Track 2 */}
                <div className="flex items-center gap-6 shrink-0" aria-hidden="true">
                  {activeItems.length > 0 ? (
                    activeItems.map((item) => (
                      <span key={`dup_${item.id}`} className="inline-flex items-center gap-1.5 sm:gap-2 whitespace-nowrap text-xs">
                        <Megaphone className="w-3.5 h-3.5 shrink-0 text-amber-300" />
                        <span>{item.text}</span>
                        {item.link && (
                          <span className="inline-flex items-center gap-1 ml-1.5 px-2.5 py-0.5 rounded-full bg-gradient-to-r from-amber-400 via-amber-300 to-amber-500 text-emerald-950 font-black text-[10px] shadow-sm">
                            <span>Learn More</span>
                            <span>&rarr;</span>
                          </span>
                        )}
                      </span>
                    ))
                  ) : (
                    <span className="inline-flex items-center gap-1.5 sm:gap-2 whitespace-nowrap text-xs">
                      <Megaphone className="w-3.5 h-3.5 shrink-0 text-amber-300" />
                      <span>{bar.text || '🌿 Free delivery on orders above ₹499 — Limited time offer!'}</span>
                    </span>
                  )}
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-4 flex-wrap justify-center py-0.5">
                {activeItems.length > 0 ? (
                  activeItems.map((item) => (
                    <span key={item.id} className="inline-flex items-center gap-1.5 sm:gap-2 whitespace-nowrap text-xs">
                      <Megaphone className="w-3.5 h-3.5 shrink-0 text-amber-300" />
                      <span>{item.text}</span>
                      {item.link && (
                        <span className="inline-flex items-center gap-1 ml-1.5 px-2.5 py-0.5 rounded-full bg-gradient-to-r from-amber-400 via-amber-300 to-amber-500 text-emerald-950 font-black text-[10px] shadow-sm">
                          <span>Learn More</span>
                          <span>&rarr;</span>
                        </span>
                      )}
                    </span>
                  ))
                ) : (
                  <span className="inline-flex items-center gap-1.5 sm:gap-2 whitespace-nowrap text-xs">
                    <Megaphone className="w-3.5 h-3.5 shrink-0 text-amber-300" />
                    <span>{bar.text || 'No active announcement messages...'}</span>
                  </span>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="px-4 py-2 bg-stone-100 dark:bg-emerald-950 text-[11px] text-stone-500 dark:text-emerald-500 flex flex-wrap items-center justify-between gap-2 border-t border-stone-200 dark:border-emerald-900">
          <div className="flex items-center gap-2">
            <Eye className="w-3.5 h-3.5 text-emerald-600" />
            <span className="font-bold">Live Ticker Preview</span>
            <span className="text-[10px] bg-emerald-100 dark:bg-emerald-900 text-emerald-800 dark:text-emerald-300 px-2 py-0.5 rounded-full font-mono">
              Align: {bar.position_align} | Anim: {bar.animation_type}
            </span>
          </div>
          <div>
            {bar.approved ? (
              <span className="text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" /> APPROVED & LIVE
              </span>
            ) : (
              <span className="text-amber-600 dark:text-amber-400 font-bold">
                ⚠️ DRAFT (Requires Approval)
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Multiple Announcement Items Manager */}
        <SectionCard title="Multiple Announcements Ticker List" icon={<Megaphone className="w-4 h-4" />}>
          <div className="flex items-center justify-between">
            <p className="text-xs text-gray-500 dark:text-emerald-400">
              Add multiple announcements that rotate or scroll across the top bar.
            </p>
            <button
              type="button"
              onClick={handleAddItem}
              className="px-3 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold shadow flex items-center gap-1 transition-all"
            >
              + Add Announcement Item
            </button>
          </div>

          <div className="space-y-4 max-h-[380px] overflow-y-auto pr-1">
            {(bar.items || []).map((item, idx) => (
              <div
                key={item.id}
                className="p-3.5 bg-stone-50 dark:bg-emerald-950/80 rounded-2xl border border-stone-200 dark:border-emerald-800 space-y-2.5"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-emerald-900 dark:text-amber-300">
                    Announcement #{idx + 1}
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleUpdateItem(item.id, 'is_active', !item.is_active)}
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        item.is_active
                          ? 'bg-emerald-600 text-white'
                          : 'bg-stone-300 text-stone-700 dark:bg-emerald-900 dark:text-emerald-400'
                      }`}
                    >
                      {item.is_active ? 'ACTIVE' : 'OFF'}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteItem(item.id)}
                      className="p-1 text-red-500 hover:bg-red-100 dark:hover:bg-red-950/40 rounded-lg transition-colors"
                      title="Delete Item"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div>
                  <FormLabel>Message Content</FormLabel>
                  <TextInput
                    value={item.text}
                    onChange={(v) => handleUpdateItem(item.id, 'text', v)}
                    placeholder="Announcement message..."
                  />
                </div>

                <div>
                  <FormLabel hint="(optional)">Action Link</FormLabel>
                  <TextInput
                    value={item.link}
                    onChange={(v) => handleUpdateItem(item.id, 'link', v)}
                    placeholder="/products or https://..."
                  />
                </div>
              </div>
            ))}
          </div>

          {/* Quick Presets */}
          <div className="pt-2 border-t border-emerald-100 dark:border-emerald-800">
            <FormLabel hint="(Click to add ready-made message)">Quick Suggestions</FormLabel>
            <div className="space-y-1 mt-1">
              {ANNOUNCEMENT_SUGGESTIONS.map((s, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => {
                    const newItem: AnnouncementItem = {
                      id: `ann_sug_${Date.now()}_${idx}`,
                      text: s.text,
                      link: s.link,
                      is_active: true
                    };
                    setBar((prev) => ({
                      ...prev,
                      items: [...(prev.items || []), newItem],
                      bg_color: s.color
                    }));
                    setSaved(false);
                  }}
                  className="w-full text-left p-2 rounded-xl bg-emerald-50 dark:bg-emerald-950 border border-emerald-100 dark:border-emerald-800 hover:border-emerald-400 transition-all text-xs font-semibold flex items-center justify-between"
                >
                  <span className="truncate pr-2">{s.text}</span>
                  <span className="text-[10px] bg-emerald-200 dark:bg-emerald-800 text-emerald-900 dark:text-emerald-200 px-2 py-0.5 rounded-full shrink-0">
                    + Add
                  </span>
                </button>
              ))}
            </div>
          </div>
        </SectionCard>

        {/* Styling, Scrolling & Approval Schedule Controls */}
        <SectionCard title="Style, Animation & Schedule" icon={<Settings className="w-4 h-4" />}>
          {/* Text Color Selection */}
          <div>
            <FormLabel>Text Color</FormLabel>
            <div className="flex flex-wrap gap-2.5 items-center mt-1">
              {ANNOUNCEMENT_TEXT_COLORS.map((tc) => (
                <button
                  key={tc.value}
                  type="button"
                  onClick={() => updateBar('text_color', tc.value)}
                  title={tc.label}
                  className={`px-3 py-1.5 rounded-xl border-2 text-xs font-bold transition-all flex items-center gap-1.5 ${
                    bar.text_color === tc.value
                      ? 'border-amber-400 bg-emerald-950 shadow-md'
                      : 'border-stone-200 dark:border-emerald-800 bg-stone-100 dark:bg-emerald-900'
                  }`}
                  style={{ color: tc.value }}
                >
                  <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: tc.value }} />
                  {tc.label}
                </button>
              ))}
            </div>
          </div>

          {/* Background Color Selection */}
          <div>
            <FormLabel>Background Bar Color</FormLabel>
            <div className="flex flex-wrap gap-2 mt-1 items-center">
              {ANNOUNCEMENT_COLORS.map((c) => (
                <button
                  key={c.value}
                  type="button"
                  onClick={() => updateBar('bg_color', c.value)}
                  title={c.label}
                  className={`relative w-8 h-8 rounded-full border-2 transition-all ${
                    bar.bg_color === c.value
                      ? 'border-amber-400 scale-110 shadow-md'
                      : 'border-transparent hover:border-emerald-300'
                  }`}
                  style={{ backgroundColor: c.value }}
                >
                  {bar.bg_color === c.value && (
                    <span className="absolute inset-0 flex items-center justify-center">
                      <CheckCircle2 className="w-4 h-4 text-white" />
                    </span>
                  )}
                </button>
              ))}
              <input
                type="color"
                value={bar.bg_color}
                onChange={(e) => updateBar('bg_color', e.target.value)}
                className="w-8 h-8 rounded-full cursor-pointer border-2 border-dashed border-emerald-300 overflow-hidden p-0"
              />
            </div>
          </div>

          {/* Text Alignment */}
          <div>
            <FormLabel>Position & Alignment</FormLabel>
            <div className="grid grid-cols-3 gap-2 mt-1">
              {(['left', 'center', 'right'] as const).map((pos) => (
                <button
                  key={pos}
                  type="button"
                  onClick={() => updateBar('position_align', pos)}
                  className={`py-2 px-3 rounded-xl border text-xs font-bold uppercase transition-all ${
                    bar.position_align === pos
                      ? 'bg-emerald-700 text-white border-emerald-600 shadow'
                      : 'bg-stone-50 dark:bg-emerald-950 text-stone-600 dark:text-emerald-300 border-stone-200 dark:border-emerald-800'
                  }`}
                >
                  {pos === 'center' ? 'Center (Default)' : pos}
                </button>
              ))}
            </div>
          </div>

          {/* Animation Effect */}
          <div>
            <FormLabel>Scrolling Marquee Animation</FormLabel>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mt-1">
              {[
                { id: 'none', label: 'Static (No Anim)' },
                { id: 'scroll_right_to_left', label: 'Right to Left ◀' },
                { id: 'scroll_left_to_right', label: 'Left to Right ▶' },
              ].map((anim) => (
                <button
                  key={anim.id}
                  type="button"
                  onClick={() => updateBar('animation_type', anim.id)}
                  className={`py-2 px-2.5 rounded-xl border text-xs font-bold transition-all text-center ${
                    bar.animation_type === anim.id
                      ? 'bg-emerald-700 text-white border-emerald-600 shadow'
                      : 'bg-stone-50 dark:bg-emerald-950 text-stone-600 dark:text-emerald-300 border-stone-200 dark:border-emerald-800'
                  }`}
                >
                  {anim.label}
                </button>
              ))}
            </div>
          </div>

          {/* Schedule Date & Time */}
          <div>
            <FormLabel hint="(Optional future date/time to make live)">Schedule Launch Date & Time</FormLabel>
            <input
              type="datetime-local"
              value={bar.scheduled_at || ''}
              onChange={(e) => updateBar('scheduled_at', e.target.value)}
              className="w-full px-3.5 py-2.5 text-sm bg-white dark:bg-emerald-950 border border-emerald-200 dark:border-emerald-700 rounded-xl text-gray-900 dark:text-emerald-100"
            />
          </div>

          {/* Visibility */}
          <div>
            <FormLabel>Top Bar Visibility</FormLabel>
            <Toggle
              checked={bar.is_active}
              onChange={(v) => updateBar('is_active', v)}
              label={bar.is_active ? 'Top Bar Active on Website' : 'Top Bar Disabled'}
            />
          </div>

          {/* Approval & Live Actions */}
          <div className="pt-3 border-t border-emerald-100 dark:border-emerald-800 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => setIsResetModalOpen(true)}
                className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-stone-600 dark:text-emerald-300 hover:text-red-600 bg-stone-100 dark:bg-emerald-950 rounded-xl border border-stone-200 dark:border-emerald-800 transition-colors"
                title="Reset Announcement Bar & Badges"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Reset Defaults
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleSave(false)}
                  className="px-4 py-2.5 bg-stone-200 dark:bg-emerald-900 text-stone-800 dark:text-emerald-200 hover:bg-stone-300 font-bold text-xs rounded-xl transition-all"
                >
                  Save Draft
                </button>
                <button
                  type="button"
                  onClick={() => handleSave(true)}
                  className="px-5 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white font-extrabold text-xs rounded-xl shadow-md transition-all flex items-center gap-1.5"
                >
                  <CheckCircle2 className="w-4 h-4 text-amber-300" />
                  Approve & Make Live
                </button>
              </div>
            </div>
          </div>
        </SectionCard>

        {/* Feature Badges */}
        <SectionCard title="Hero Feature Badges" icon={<Star className="w-4 h-4" />}>
          <div className="flex items-center justify-between">
            <p className="text-xs text-gray-500 dark:text-emerald-400">
              Manage trust badges displayed on the homepage.
            </p>
            <button
              type="button"
              onClick={handleAddBadge}
              className="px-3 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold shadow flex items-center gap-1 transition-all"
            >
              + Add Extra Badge
            </button>
          </div>

          <div className="space-y-3">
            {badges.map((badge, idx) => (
              <div key={badge.id} className="flex items-center gap-2">
                <div className="flex-1">
                  <FormLabel>Badge {idx + 1}</FormLabel>
                  <TextInput
                    value={badge.text}
                    onChange={(v) => updateBadge(badge.id, v)}
                    placeholder={`Feature badge ${idx + 1}...`}
                  />
                </div>
                <button
                  type="button"
                  onClick={() => handleDeleteBadge(badge.id)}
                  className="mt-5 p-2 bg-red-50 hover:bg-red-100 text-red-600 rounded-xl border border-red-200 transition-colors"
                  title="Delete Badge"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>

          <div>
            <FormLabel>Preview Badges</FormLabel>
            <div className="flex flex-wrap gap-2 p-4 bg-emerald-900 rounded-xl">
              {badges.map((badge) => (
                <span
                  key={badge.id}
                  className="text-xs font-semibold px-3 py-1 rounded-full bg-white/10 text-white border border-white/20"
                >
                  {badge.text || '...'}
                </span>
              ))}
            </div>
          </div>

          <div className="pt-2 border-t border-emerald-100 dark:border-emerald-800 flex justify-end">
            <SaveButton onClick={handleSave} saved={saved} />
          </div>
        </SectionCard>
      </div>

      <RefreshSpinnerModal
        isOpen={isSaving}
        title="Saving Announcements & Badges..."
        subtitle="Updating website announcement bar and trust badges..."
        moduleName="Website CMS"
      />

      <ResetConfirmationModal
        isOpen={isResetModalOpen}
        onClose={() => setIsResetModalOpen(false)}
        onConfirm={executeResetDefaults}
        sectionTitle="Announcement Bar & Feature Badges"
      />
    </div>
  );
};

// ─── Tab: Header & Footer CMS ───────────────────────────────────────────────

const HeaderFooterTab: React.FC = () => {
  const { addNotification } = useNotifications();

  const [hf, setHf] = useState<HeaderFooterSettings>({
    ...DEFAULT_CMS_TEMPLATES.headerFooter
  });
  const [saved, setSaved] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isResetModalOpen, setIsResetModalOpen] = useState(false);

  React.useEffect(() => {
    getJSONStore<any>('cms_settings').then(d => {
      if (d && d.length && d[0].headerFooter) {
        setHf({
          ...DEFAULT_CMS_TEMPLATES.headerFooter,
          ...d[0].headerFooter
        });
      } else if (d && d.length && d[0].header_footer) {
        setHf({
          ...DEFAULT_CMS_TEMPLATES.headerFooter,
          ...d[0].header_footer
        });
      }
    });
  }, []);

  const update = (key: keyof HeaderFooterSettings, value: string | boolean) => {
    setHf((prev) => ({ ...prev, [key]: value }));
    setSaved(false);
  };

  const handleSave = async () => {
    setIsSaving(true);
    await updateCMSStore('headerFooter', hf);
    setIsSaving(false);
    setSaved(true);
    addNotification({
      title: 'Header & Footer Settings Saved',
      message: 'Successfully updated header top bar & footer brand info.',
      type: 'success',
      sourceModule: 'Website CMS'
    });
    setTimeout(() => setSaved(false), 3000);
  };

  const executeResetDefaults = async () => {
    setIsSaving(true);
    const defaultHf = { ...DEFAULT_CMS_TEMPLATES.headerFooter };
    setHf(defaultHf);
    await updateCMSStore('headerFooter', defaultHf);
    setIsSaving(false);
    setSaved(true);
    addNotification({
      title: 'Header & Footer Reset to Defaults',
      message: 'Restored original header top bar and footer settings template.',
      type: 'info',
      sourceModule: 'Website CMS'
    });
    setTimeout(() => setSaved(false), 3000);
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* Form Controls */}
        <div className="space-y-6">
          <SectionCard title="Header Bar Configuration" icon={<Layout className="w-4 h-4" />}>
            <div>
              <FormLabel>Top Announcement Bar Visibility</FormLabel>
              <Toggle
                checked={hf.top_bar_enabled}
                onChange={(v) => update('top_bar_enabled', v)}
                label={hf.top_bar_enabled ? 'Show announcement top bar' : 'Hide announcement top bar'}
              />
            </div>

            <div>
              <FormLabel>Announcement Bar Text</FormLabel>
              <TextInput
                value={hf.announcement_text}
                onChange={(v) => update('announcement_text', v)}
                placeholder="e.g. 🌿 Free delivery on orders above ₹499"
              />
            </div>

            <div>
              <FormLabel>Announcement Action Link</FormLabel>
              <TextInput
                value={hf.announcement_link}
                onChange={(v) => update('announcement_link', v)}
                placeholder="/products"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <FormLabel>Custom Navigation Link Text</FormLabel>
                <TextInput
                  value={hf.nav_custom_link_text}
                  onChange={(v) => update('nav_custom_link_text', v)}
                  placeholder="Farmer Network"
                />
              </div>
              <div>
                <FormLabel>Custom Navigation Link URL</FormLabel>
                <TextInput
                  value={hf.nav_custom_link_url}
                  onChange={(v) => update('nav_custom_link_url', v)}
                  placeholder="/about"
                />
              </div>
            </div>
          </SectionCard>

          <SectionCard title="Footer Brand & Details" icon={<Globe className="w-4 h-4" />}>
            <div>
              <FormLabel>Footer Brand Tagline Story</FormLabel>
              <TextAreaInput
                value={hf.footer_brand_tagline}
                onChange={(v) => update('footer_brand_tagline', v)}
                rows={3}
                placeholder="MR. VIVASAYI brand story in footer..."
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <FormLabel>Footer Phone</FormLabel>
                <TextInput
                  value={hf.footer_phone}
                  onChange={(v) => update('footer_phone', v)}
                  placeholder="+91 9789325262"
                />
              </div>
              <div>
                <FormLabel>Footer Orders Email</FormLabel>
                <TextInput
                  value={hf.footer_email}
                  onChange={(v) => update('footer_email', v)}
                  placeholder="orders@mrvivasayi.com"
                />
              </div>
            </div>

            <div>
              <FormLabel>Store Address Snapshot</FormLabel>
              <TextInput
                value={hf.footer_address}
                onChange={(v) => update('footer_address', v)}
                placeholder="Address line for footer..."
              />
            </div>

            <div>
              <FormLabel>Footer Operating Hours</FormLabel>
              <TextInput
                value={hf.footer_hours}
                onChange={(v) => update('footer_hours', v)}
                placeholder="Mon - Sat: 8:00 AM - 8:30 PM"
              />
            </div>

            <div>
              <FormLabel>Footer Copyright Line</FormLabel>
              <TextInput
                value={hf.copyright_text}
                onChange={(v) => update('copyright_text', v)}
                placeholder="MR. VIVASAYI. All rights reserved."
              />
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-emerald-100 dark:border-emerald-800">
              <button
                type="button"
                onClick={() => setIsResetModalOpen(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-gray-600 dark:text-emerald-300 hover:text-red-600 bg-gray-100 dark:bg-emerald-950 rounded-lg border border-gray-200 dark:border-emerald-800 transition-colors"
                title="Reset Header & Footer Settings"
              >
                <RotateCcw className="w-3.5 h-3.5" /> Reset Defaults
              </button>
              <SaveButton onClick={handleSave} saved={saved} />
            </div>
          </SectionCard>
        </div>

        {/* Live Preview Card */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 text-xs font-bold text-gray-500 dark:text-emerald-400 uppercase tracking-wider">
            <Eye className="w-4 h-4" /> Live Header & Footer Preview
          </div>

          {/* Header Preview */}
          <div className="bg-emerald-950 text-white rounded-2xl p-4 border border-emerald-800 shadow-lg space-y-3">
            <div className="text-[10px] font-mono text-amber-300 uppercase tracking-widest">
              [ HEADER BAR PREVIEW ]
            </div>
            {hf.top_bar_enabled ? (
              <div
                className="p-2 rounded-lg text-xs flex justify-between items-center px-3"
                style={{ backgroundColor: hf.announcement_bg_color || '#065f46' }}
              >
                <span className="font-semibold">{hf.announcement_text}</span>
                <span className="underline font-bold text-amber-300">Learn More</span>
              </div>
            ) : (
              <div className="p-2 rounded-lg bg-stone-800 text-stone-400 text-xs italic text-center">
                Top Announcement Bar Hidden (Disabled)
              </div>
            )}
            <div className="flex items-center justify-between pt-2 border-t border-emerald-900 text-xs font-bold">
              <span className="text-amber-400 text-sm font-serif">MR. VIVASAYI</span>
              <div className="flex gap-3 text-emerald-200 text-[11px]">
                <span>Home</span>
                <span>Products</span>
                <span className="text-amber-300 underline">{hf.nav_custom_link_text || 'Link'}</span>
              </div>
            </div>
          </div>

          {/* Footer Preview */}
          <div className="bg-emerald-950 text-white rounded-2xl p-6 border border-emerald-800 shadow-lg space-y-4">
            <div className="text-[10px] font-mono text-amber-300 uppercase tracking-widest">
              [ FOOTER PREVIEW ]
            </div>
            <p className="text-xs text-emerald-100 leading-relaxed">
              {hf.footer_brand_tagline}
            </p>
            <div className="space-y-1.5 text-xs text-emerald-200 font-medium">
              <div>📍 {hf.footer_address}</div>
              <div>📞 {hf.footer_phone}</div>
              <div>✉️ {hf.footer_email}</div>
              <div>🕒 {hf.footer_hours}</div>
            </div>
            <div className="pt-3 border-t border-emerald-900 flex justify-between items-center text-[10px] text-emerald-400">
              <span>© {new Date().getFullYear()} {hf.copyright_text}</span>
              <div className="flex gap-2">
                <span>Privacy</span>
                <span>|</span>
                <span>Terms</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <RefreshSpinnerModal
        isOpen={isSaving}
        title="Saving Header & Footer CMS..."
        subtitle="Updating top bar announcement, links, tagline, and store contact info..."
        moduleName="Website CMS"
      />

      <ResetConfirmationModal
        isOpen={isResetModalOpen}
        onClose={() => setIsResetModalOpen(false)}
        onConfirm={executeResetDefaults}
        sectionTitle="Header & Footer Configuration"
      />
    </div>
  );
};

// ─── Tab: About Section ───────────────────────────────────────────────────────

const coreValueIcons: Record<string, React.ReactNode> = {
  cv1: <Leaf className="w-5 h-5" />,
  cv2: <Heart className="w-5 h-5" />,
  cv3: <Zap className="w-5 h-5" />,
};

const AboutSectionTab: React.FC = () => {
  const { addNotification } = useNotifications();

  const [about, setAbout] = useState<AboutSection>({
    ...DEFAULT_CMS_TEMPLATES.about
  });
  const [saved, setSaved] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isResetModalOpen, setIsResetModalOpen] = useState(false);

  React.useEffect(() => {
    getJSONStore<any>('cms_settings').then(d => {
      if (d && d.length && d[0].about) {
        setAbout({
          brand_story: d[0].about.brand_story || DEFAULT_CMS_TEMPLATES.about.brand_story,
          stats: Array.isArray(d[0].about.stats) && d[0].about.stats.length > 0 ? d[0].about.stats : DEFAULT_CMS_TEMPLATES.about.stats,
          core_values: Array.isArray(d[0].about.core_values) && d[0].about.core_values.length > 0 ? d[0].about.core_values : DEFAULT_CMS_TEMPLATES.about.core_values
        });
      }
    });
  }, []);

  const updateStat = (id: string, key: keyof StatBox, value: string) => {
    setAbout((prev) => ({
      ...prev,
      stats: (prev.stats || []).map((s) => (s.id === id ? { ...s, [key]: value } : s)),
    }));
    setSaved(false);
  };

  const updateCoreValue = (id: string, key: keyof CoreValue, value: string) => {
    setAbout((prev) => ({
      ...prev,
      core_values: (prev.core_values || []).map((cv) => (cv.id === id ? { ...cv, [key]: value } : cv)),
    }));
    setSaved(false);
  };

  const handleSave = async () => {
    setIsSaving(true);
    await updateCMSStore('about', about);
    setIsSaving(false);
    setSaved(true);
    addNotification({
      title: 'About Section Updated',
      message: 'Saved brand story, impact stats, and core company values.',
      type: 'success',
      sourceModule: 'Website CMS'
    });
    setTimeout(() => setSaved(false), 3000);
  };

  return (
    <div className="space-y-6">
      {/* Brand Story */}
      <SectionCard title="Brand Story" icon={<Edit2 className="w-4 h-4" />}>
        <div>
          <FormLabel hint="(shown in About page and footer)">Brand Story Paragraph</FormLabel>
          <TextAreaInput
            value={about.brand_story}
            onChange={(v) => {
              setAbout((p) => ({ ...p, brand_story: v }));
              setSaved(false);
            }}
            rows={5}
            placeholder="Tell MR. VIVASAYI's story..."
          />
          <p className="text-xs text-gray-400 mt-1.5">
            {about.brand_story.length} characters
          </p>
        </div>
      </SectionCard>

      {/* Stats */}
      <SectionCard title="Impact Stats" icon={<BarChart3 className="w-4 h-4" />}>
        <p className="text-xs text-gray-500 dark:text-emerald-400">
          These four statistics appear prominently in the About section.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          {about.stats.map((stat) => (
            <div
              key={stat.id}
              className="p-4 bg-emerald-50 dark:bg-emerald-950 rounded-xl border border-emerald-100 dark:border-emerald-800 space-y-3"
            >
              <div>
                <FormLabel>Label</FormLabel>
                <TextInput
                  value={stat.label}
                  onChange={(v) => updateStat(stat.id, 'label', v)}
                  placeholder="e.g. Farmer Families"
                />
              </div>
              <div>
                <FormLabel>Value</FormLabel>
                <TextInput
                  value={stat.value}
                  onChange={(v) => updateStat(stat.id, 'value', v)}
                  placeholder="e.g. 120+"
                />
              </div>
              <div className="flex items-end gap-2 pt-1 border-t border-emerald-100 dark:border-emerald-800">
                <span className="text-2xl font-black text-emerald-800 dark:text-amber-400">
                  {stat.value || '—'}
                </span>
                <span className="text-xs text-gray-500 dark:text-emerald-400 mb-0.5">
                  {stat.label || 'Label'}
                </span>
              </div>
            </div>
          ))}
        </div>
      </SectionCard>

      {/* Core Values */}
      <SectionCard title="Core Values" icon={<Globe className="w-4 h-4" />}>
        <p className="text-xs text-gray-500 dark:text-emerald-400">
          These values are displayed as feature cards on the About page.
        </p>
        <div className="space-y-5">
          {about.core_values.map((cv, idx) => (
            <div
              key={cv.id}
              className="p-4 rounded-xl border border-emerald-100 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950 space-y-3"
            >
              <div className="flex items-center gap-2 text-emerald-700 dark:text-amber-400 font-bold text-xs uppercase tracking-wide">
                {coreValueIcons[cv.id] ?? <Globe className="w-5 h-5" />}
                Core Value {idx + 1}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <FormLabel>Title</FormLabel>
                  <TextInput
                    value={cv.title}
                    onChange={(v) => updateCoreValue(cv.id, 'title', v)}
                    placeholder="Value title..."
                  />
                </div>
                <div className="sm:col-span-2">
                  <FormLabel>Description</FormLabel>
                  <TextAreaInput
                    value={cv.description}
                    onChange={(v) => updateCoreValue(cv.id, 'description', v)}
                    rows={2}
                    placeholder="Brief description..."
                  />
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="pt-2 border-t border-emerald-100 dark:border-emerald-800 flex items-center justify-between">
          <button
            type="button"
            onClick={() => setIsResetModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-gray-600 dark:text-emerald-300 hover:text-red-600 bg-gray-100 dark:bg-emerald-950 rounded-lg border border-gray-200 dark:border-emerald-800 transition-colors"
            title="Reset to Original Baseline Defaults"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Reset Defaults
          </button>
          <SaveButton onClick={handleSave} saved={saved} />
        </div>
      </SectionCard>

      <RefreshSpinnerModal
        isOpen={isSaving}
        title="Saving About Content..."
        subtitle="Updating brand story, impact stats, and core company values..."
        moduleName="Website CMS"
      />

      <ResetConfirmationModal
        isOpen={isResetModalOpen}
        onClose={() => setIsResetModalOpen(false)}
        onConfirm={async () => {
          setIsSaving(true);
          const defaultAbout = { ...DEFAULT_CMS_TEMPLATES.about };
          setAbout(defaultAbout);
          await updateCMSStore('about', defaultAbout);
          setIsSaving(false);
          setSaved(true);
          addNotification({
            title: 'About Section Reset to Defaults',
            message: 'Restored original brand story, impact statistics, and core values.',
            type: 'info',
            sourceModule: 'Website CMS'
          });
          setTimeout(() => setSaved(false), 3000);
        }}
        sectionTitle="About Us Story & Values"
      />
    </div>
  );
};

// ─── Tab: SEO Settings ────────────────────────────────────────────────────────

const SEOSettingsTab: React.FC = () => {
  const { addNotification } = useNotifications();

  const [seoData, setSeoData] = useState<Record<string, PageSEO>>({
    ...DEFAULT_CMS_TEMPLATES.seo
  });
  const [selectedPage, setSelectedPage] = useState<string>('Home');
  const [saved, setSaved] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isResetModalOpen, setIsResetModalOpen] = useState(false);

  React.useEffect(() => {
    getJSONStore<any>('cms_settings').then(d => {
      if (d && d.length && d[0].seo) {
        setSeoData({
          ...DEFAULT_CMS_TEMPLATES.seo,
          ...d[0].seo
        });
      }
    });
  }, []);

  const current = seoData[selectedPage] || DEFAULT_CMS_TEMPLATES.seo[selectedPage] || {
    page: selectedPage,
    title: '',
    description: '',
    keywords: '',
    og_image: ''
  };

  const updateField = (key: keyof PageSEO, value: string) => {
    setSeoData((prev) => ({
      ...prev,
      [selectedPage]: { ...(prev[selectedPage] || current), [key]: value },
    }));
    setSaved(false);
  };

  const handleSave = async () => {
    setIsSaving(true);
    await updateCMSStore('seo', seoData);
    setIsSaving(false);
    setSaved(true);
    addNotification({
      title: `${selectedPage} SEO Saved`,
      message: `Saved page meta title, description, keywords, and social OG card.`,
      type: 'success',
      sourceModule: 'Website CMS'
    });
    setTimeout(() => setSaved(false), 3000);
  };

  const executeResetDefaults = async () => {
    setIsSaving(true);
    const defaultSeo = { ...DEFAULT_CMS_TEMPLATES.seo };
    setSeoData(defaultSeo);
    await updateCMSStore('seo', defaultSeo);
    setIsSaving(false);
    setSaved(true);
    addNotification({
      title: 'SEO Settings Reset to Defaults',
      message: 'Restored original page titles, descriptions, and OG cards template.',
      type: 'info',
      sourceModule: 'Website CMS'
    });
    setTimeout(() => setSaved(false), 3000);
  };

  const titleLength = current.title.length;
  const descLength = current.description.length;

  return (
    <div className="space-y-6">
      {/* Page selector */}
      <div className="bg-white dark:bg-emerald-900/40 border border-emerald-100 dark:border-emerald-800 rounded-2xl p-5">
        <p className="text-xs font-bold text-gray-500 dark:text-emerald-400 uppercase tracking-wide mb-3 flex items-center gap-1.5">
          <Search className="w-3.5 h-3.5" /> Select Page to Edit SEO
        </p>
        <div className="flex flex-wrap gap-2">
          {SEO_PAGES.map((page) => (
            <button
              key={page}
              onClick={() => {
                setSelectedPage(page);
                setSaved(false);
              }}
              className={`px-4 py-2 rounded-xl text-sm font-bold border transition-all ${
                selectedPage === page
                  ? 'bg-emerald-700 text-white border-emerald-700 shadow-md'
                  : 'bg-emerald-50 dark:bg-emerald-950 text-gray-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-700 hover:border-emerald-400'
              }`}
            >
              {page}
            </button>
          ))}
        </div>
      </div>

      <SectionCard title={`SEO: ${selectedPage} Page`} icon={<Search className="w-4 h-4" />}>
        {/* Google preview */}
        <div className="p-4 bg-white dark:bg-emerald-950 border border-gray-200 dark:border-emerald-800 rounded-xl shadow-inner space-y-1">
          <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider mb-2 flex items-center gap-1">
            <Globe className="w-3 h-3" /> Google Search Preview
          </p>
          <p className="text-[15px] font-semibold text-blue-700 dark:text-blue-400 leading-snug line-clamp-1">
            {current.title || <span className="italic text-gray-300">Page title will appear here</span>}
          </p>
          <p className="text-[12px] text-green-700 dark:text-green-500 font-mono truncate">
            https://mrvivasayi.in/{selectedPage.toLowerCase() === 'home' ? '' : selectedPage.toLowerCase()}
          </p>
          <p className="text-[12px] text-gray-600 dark:text-gray-400 leading-snug line-clamp-2">
            {current.description || (
              <span className="italic text-gray-300">Meta description will appear here...</span>
            )}
          </p>
        </div>

        {/* Title */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <FormLabel>Page Title</FormLabel>
            <span
              className={`text-xs font-mono ${
                titleLength > 60
                  ? 'text-red-400'
                  : titleLength > 50
                  ? 'text-amber-400'
                  : 'text-gray-400'
              }`}
            >
              {titleLength}/60
            </span>
          </div>
          <TextInput
            value={current.title}
            onChange={(v) => updateField('title', v)}
            placeholder="Page Title | Site Name"
          />
          {titleLength > 60 && (
            <p className="text-xs text-red-400 mt-1 flex items-center gap-1">
              <Info className="w-3 h-3" /> Title may get truncated in search results (ideal: ≤60 chars)
            </p>
          )}
        </div>

        {/* Meta Description */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <FormLabel>Meta Description</FormLabel>
            <span
              className={`text-xs font-mono ${
                descLength > 160
                  ? 'text-red-400'
                  : descLength > 140
                  ? 'text-amber-400'
                  : 'text-gray-400'
              }`}
            >
              {descLength}/160
            </span>
          </div>
          <TextAreaInput
            value={current.description}
            onChange={(v) => updateField('description', v)}
            rows={3}
            placeholder="Brief, compelling description for search engines..."
          />
          {descLength > 160 && (
            <p className="text-xs text-red-400 mt-1 flex items-center gap-1">
              <Info className="w-3 h-3" /> Description may get truncated (ideal: ≤160 chars)
            </p>
          )}
        </div>

        {/* Keywords */}
        <div>
          <FormLabel hint="(comma-separated)">Keywords</FormLabel>
          <TextAreaInput
            value={current.keywords}
            onChange={(v) => updateField('keywords', v)}
            rows={2}
            placeholder="organic food, cold pressed oil, farm fresh..."
          />
          {current.keywords && (
            <div className="flex flex-wrap gap-1.5 mt-2">
              {current.keywords
                .split(',')
                .filter((kw) => kw.trim())
                .map((kw, i) => (
                  <span
                    key={i}
                    className="text-[11px] px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-900 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-700"
                  >
                    {kw.trim()}
                  </span>
                ))}
            </div>
          )}
        </div>

        {/* OG Image */}
        <div>
          <FormLabel>OG Image URL</FormLabel>
          <TextInput
            value={current.og_image}
            onChange={(v) => updateField('og_image', v)}
            placeholder="https://mrvivasayi.in/og-image.jpg"
          />
          <p className="text-xs text-gray-400 mt-1">
            Recommended: 1200 × 630 px. Used for social media sharing cards (Facebook, Twitter, etc.)
          </p>
          {current.og_image && (
            <div className="mt-3 rounded-xl overflow-hidden border border-emerald-200 dark:border-emerald-700 shadow-sm">
              <div className="bg-gray-100 dark:bg-emerald-950 px-3 py-2 text-[10px] text-gray-400 font-bold uppercase tracking-wide flex items-center gap-1">
                <Image className="w-3 h-3" /> OG Image Preview
              </div>
              <img
                src={current.og_image}
                alt="OG preview"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = 'none';
                }}
                className="w-full max-h-48 object-cover"
              />
            </div>
          )}
        </div>

        <div className="pt-2 border-t border-emerald-100 dark:border-emerald-800 flex items-center justify-between">
          <button
            type="button"
            onClick={() => setIsResetModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-gray-600 dark:text-emerald-300 hover:text-red-600 bg-gray-100 dark:bg-emerald-950 rounded-lg border border-gray-200 dark:border-emerald-800 transition-colors"
            title="Reset All SEO Defaults"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Reset Defaults
          </button>
          <SaveButton onClick={handleSave} saved={saved} label={`Save ${selectedPage} SEO`} />
        </div>
      </SectionCard>

      <RefreshSpinnerModal
        isOpen={isSaving}
        title={`Saving ${selectedPage} SEO...`}
        subtitle="Updating page title tags, meta description, keywords & OG card..."
        moduleName="Website CMS"
      />

      <ResetConfirmationModal
        isOpen={isResetModalOpen}
        onClose={() => setIsResetModalOpen(false)}
        onConfirm={executeResetDefaults}
        sectionTitle="Meta SEO Tags & Social OG Cards"
      />
    </div>
  );
};

interface ContactDetails {
  store_name: string;
  address: string;
  phone_primary: string;
  phone_secondary: string;
  email_primary: string;
  email_secondary: string;
  operating_hours_weekdays: string;
  operating_hours_sunday: string;
  whatsapp_number: string;
}



// ─── Tab: Contact Details ─────────────────────────────────────────────────────

const ContactDetailsTab: React.FC = () => {
  const { addNotification } = useNotifications();

  const [contact, setContact] = useState<ContactDetails>({
    ...DEFAULT_CMS_TEMPLATES.contact
  });
  const [saved, setSaved] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isResetModalOpen, setIsResetModalOpen] = useState(false);

  React.useEffect(() => {
    getJSONStore<any>('cms_settings').then(d => {
      const defaultSupport = getWhatsAppSupportNumber();
      if (d && d.length && d[0].contact) {
        setContact({
          ...DEFAULT_CMS_TEMPLATES.contact,
          whatsapp_number: d[0].contact.whatsapp_number || defaultSupport,
          ...d[0].contact
        });
      } else {
        setContact(prev => ({
          ...prev,
          whatsapp_number: defaultSupport
        }));
      }
    });
  }, []);

  const update = (key: keyof ContactDetails, value: string) => {
    setContact((prev) => ({ ...prev, [key]: value }));
    setSaved(false);
  };

  const handleSave = async () => {
    setIsSaving(true);
    await updateCMSStore('contact', contact);
    try {
      const confStr = localStorage.getItem('mrvivasayi_conf');
      const conf = confStr ? JSON.parse(confStr) : {};
      conf.whatsapp_support_number = contact.whatsapp_number;
      localStorage.setItem('mrvivasayi_conf', JSON.stringify(conf));
      window.dispatchEvent(new Event('mrvivasayi_whatsapp_order_config_updated'));
    } catch {}
    setIsSaving(false);
    setSaved(true);
    addNotification({
      title: 'Contact Details Updated',
      message: 'Saved store address, phone, WhatsApp order number, and operating hours.',
      type: 'success',
      sourceModule: 'Website CMS'
    });
    setTimeout(() => setSaved(false), 3000);
  };

  const executeResetDefaults = async () => {
    setIsSaving(true);
    const defaultContact = { ...DEFAULT_CMS_TEMPLATES.contact };
    setContact(defaultContact);
    await updateCMSStore('contact', defaultContact);
    setIsSaving(false);
    setSaved(true);
    addNotification({
      title: 'Contact Details Reset to Defaults',
      message: 'Restored original store address, phones, and operating hours template.',
      type: 'info',
      sourceModule: 'Website CMS'
    });
    setTimeout(() => setSaved(false), 3000);
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* Form */}
        <SectionCard title="Store Contact & Address" icon={<MapPin className="w-4 h-4" />}>
          <div>
            <FormLabel>Outlet Name</FormLabel>
            <TextInput
              value={contact.store_name}
              onChange={(v) => update('store_name', v)}
              placeholder="e.g. Main Retail Outlet"
            />
          </div>

          <div>
            <FormLabel>Physical Address</FormLabel>
            <TextAreaInput
              value={contact.address}
              onChange={(v) => update('address', v)}
              rows={3}
              placeholder="Full store address..."
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <FormLabel>Primary Phone</FormLabel>
              <TextInput
                value={contact.phone_primary}
                onChange={(v) => update('phone_primary', v)}
                placeholder="+91 9789325262"
              />
            </div>
            <div>
              <FormLabel>Secondary Phone</FormLabel>
              <TextInput
                value={contact.phone_secondary}
                onChange={(v) => update('phone_secondary', v)}
                placeholder="+91 98765 43211"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <FormLabel>Orders Email</FormLabel>
              <TextInput
                value={contact.email_primary}
                onChange={(v) => update('email_primary', v)}
                placeholder="orders@mrvivasayi.com"
              />
            </div>
            <div>
              <FormLabel>Support Email</FormLabel>
              <TextInput
                value={contact.email_secondary}
                onChange={(v) => update('email_secondary', v)}
                placeholder="support@mrvivasayi.com"
              />
            </div>
          </div>

          <div>
            <FormLabel>Weekday Operating Hours</FormLabel>
            <TextInput
              value={contact.operating_hours_weekdays}
              onChange={(v) => update('operating_hours_weekdays', v)}
              placeholder="Monday to Saturday: 8:00 AM - 8:30 PM"
            />
          </div>

          <div>
            <FormLabel>Sunday Operating Hours</FormLabel>
            <TextInput
              value={contact.operating_hours_sunday}
              onChange={(v) => update('operating_hours_sunday', v)}
              placeholder="Sunday: 9:00 AM - 2:00 PM"
            />
          </div>

          <div>
            <FormLabel hint="(Digits only with country code)">WhatsApp Order Number</FormLabel>
            <TextInput
              value={contact.whatsapp_number}
              onChange={(v) => update('whatsapp_number', v)}
              placeholder="919876543210"
            />
          </div>

          <div className="pt-2 border-t border-emerald-100 dark:border-emerald-800 flex items-center justify-between">
            <button
              type="button"
              onClick={() => setIsResetModalOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-gray-600 dark:text-emerald-300 hover:text-red-600 bg-gray-100 dark:bg-emerald-950 rounded-lg border border-gray-200 dark:border-emerald-800 transition-colors"
              title="Reset to Baseline Defaults"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Reset Defaults
            </button>
            <SaveButton onClick={handleSave} saved={saved} />
          </div>
        </SectionCard>

        {/* Contact Card Live Preview */}
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-xs font-bold text-gray-500 dark:text-emerald-400 uppercase tracking-wider">
            <Eye className="w-4 h-4" /> Live Contact Card Preview
          </div>
          <div className="bg-gradient-to-br from-emerald-900 to-emerald-950 text-white p-8 rounded-3xl border border-emerald-800 shadow-xl space-y-6">
            <div>
              <h2 className="text-2xl font-serif font-bold text-white mb-1">{contact.store_name}</h2>
              <p className="text-emerald-200 text-xs">
                Visit our physical store to inspect fresh chekku oils and native grains.
              </p>
            </div>

            <div className="space-y-5 text-sm text-emerald-100">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 bg-emerald-800 rounded-xl flex items-center justify-center text-amber-300 shrink-0">
                  <MapPin className="w-4 h-4" />
                </div>
                <div>
                  <div className="font-bold text-white text-xs">Store Address</div>
                  <div className="text-emerald-200 text-xs mt-0.5">{contact.address}</div>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-8 h-8 bg-emerald-800 rounded-xl flex items-center justify-center text-amber-300 shrink-0">
                  <Phone className="w-4 h-4" />
                </div>
                <div>
                  <div className="font-bold text-white text-xs">Phone & WhatsApp</div>
                  <div className="text-emerald-200 text-xs mt-0.5">
                    {contact.phone_primary} / {contact.phone_secondary}
                  </div>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-8 h-8 bg-emerald-800 rounded-xl flex items-center justify-center text-amber-300 shrink-0">
                  <Mail className="w-4 h-4" />
                </div>
                <div>
                  <div className="font-bold text-white text-xs">Email Inquiries</div>
                  <div className="text-emerald-200 text-xs mt-0.5">
                    {contact.email_primary} / {contact.email_secondary}
                  </div>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-8 h-8 bg-emerald-800 rounded-xl flex items-center justify-center text-amber-300 shrink-0">
                  <Clock className="w-4 h-4" />
                </div>
                <div>
                  <div className="font-bold text-white text-xs">Operating Hours</div>
                  <div className="text-emerald-200 text-xs mt-0.5">
                    {contact.operating_hours_weekdays}<br />
                    {contact.operating_hours_sunday}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <RefreshSpinnerModal
        isOpen={isSaving}
        title="Saving Contact Details..."
        subtitle="Updating store address, phone numbers, email & operating hours..."
        moduleName="Website CMS"
      />

      <ResetConfirmationModal
        isOpen={isResetModalOpen}
        onClose={() => setIsResetModalOpen(false)}
        onConfirm={executeResetDefaults}
        sectionTitle="Store Contact & Operating Hours"
      />
    </div>
  );
};

// ─── Main Page ────────────────────────────────────────────────────────────────

const TABS: { id: TabId; label: string; icon: React.ReactNode; badge?: string; badgeColor?: string }[] = [
  { id: 'website_analyzer', label: 'Website Analyzer', icon: <LineChartIcon className="w-4 h-4 text-indigo-500" />, badge: 'Live', badgeColor: 'bg-indigo-100 text-indigo-800' },
  { id: 'seo_guide', label: 'SEO & Storefront Growth Guide (20 Pages)', icon: <Sparkles className="w-4 h-4 text-amber-500" />, badge: '20 Pages Guide', badgeColor: 'bg-amber-100 text-amber-900 font-black' },
  { id: 'login_page', label: 'Login Page (3D & Portal)', icon: <Lock className="w-4 h-4 text-violet-500" />, badge: '3D Portal', badgeColor: 'bg-violet-100 text-violet-900 font-black' },
  { id: 'announcements', label: 'Header Notification Bar', icon: <Megaphone className="w-4 h-4 text-emerald-600" />, badge: 'Website Top Bar', badgeColor: 'bg-amber-100 text-amber-900 font-black' },
  { id: 'hero', label: 'Hero Banner', icon: <Layout className="w-4 h-4 text-amber-500" /> },
  { id: 'pop_notification', label: 'Pop Notification', icon: <Bell className="w-4 h-4 text-pink-500" />, badge: 'Live', badgeColor: 'bg-pink-100 text-pink-800' },
  { id: 'header_footer', label: 'Header & Footer CMS', icon: <Globe className="w-4 h-4 text-teal-500" /> },
  { id: 'about', label: 'About Section', icon: <Type className="w-4 h-4 text-emerald-500" /> },
  { id: 'seo', label: 'SEO Settings', icon: <Search className="w-4 h-4 text-blue-500" /> },
  { id: 'contact', label: 'Contact & Store Info', icon: <Phone className="w-4 h-4 text-rose-500" /> },
];

export const CMSPage: React.FC<{ initialTab?: TabId }> = ({ initialTab = 'website_analyzer' }) => {
  const location = useLocation();
  const navigate = useNavigate();

  const getTabFromPath = (path: string): TabId => {
    if (path.includes('/cms/website-analyzer')) return 'website_analyzer';
    if (path.includes('/cms/seo-guide')) return 'seo_guide';
    if (path.includes('/cms/login-page')) return 'login_page';
    if (path.includes('/cms/pop-notification')) return 'pop_notification';
    if (path.includes('/cms/announcements')) return 'announcements';
    if (path.includes('/cms/header-footer')) return 'header_footer';
    if (path.includes('/cms/about')) return 'about';
    if (path.includes('/cms/seo')) return 'seo';
    if (path.includes('/cms/contact')) return 'contact';
    if (path === '/admin/cms') return 'hero';
    return initialTab;
  };

  const [activeTab, setActiveTab] = useState<TabId>(() => getTabFromPath(location.pathname));
  const [loading, setLoading] = useState(true);
  const [isGlobalRefreshing, setIsGlobalRefreshing] = useState(false);
  const [autoRefreshSec, setAutoRefreshSec] = useState<number>(0);

  React.useEffect(() => {
    setActiveTab(getTabFromPath(location.pathname));
  }, [location.pathname, initialTab]);

  React.useEffect(() => {
    const t = setTimeout(() => setLoading(false), 120);
    return () => clearTimeout(t);
  }, []);

  // CMS Auto-Refresh poller
  React.useEffect(() => {
    if (!autoRefreshSec || autoRefreshSec <= 0) return;
    const interval = setInterval(() => {
      setIsGlobalRefreshing(true);
    }, autoRefreshSec * 1000);
    return () => clearInterval(interval);
  }, [autoRefreshSec]);

  if (loading) {
    return <AdminPageSkeleton title="Website Content Manager (CMS)" />;
  }

  const handleTabChange = (tabId: TabId) => {
    setActiveTab(tabId);
    if (tabId === 'hero') navigate('/admin/cms');
    else if (tabId === 'website_analyzer') navigate('/admin/cms/website-analyzer');
    else if (tabId === 'seo_guide') navigate('/admin/cms/seo-guide');
    else if (tabId === 'login_page') navigate('/admin/cms/login-page');
    else if (tabId === 'pop_notification') navigate('/admin/cms/pop-notification');
    else if (tabId === 'header_footer') navigate('/admin/cms/header-footer');
    else navigate(`/admin/cms/${tabId}`);
  };

  return (
    <div className="space-y-6">
      {/* Page Header (Only when not on website_analyzer, which has its own rich audience engine header) */}
      {activeTab !== 'website_analyzer' && (
        <div className="bg-gradient-to-r from-emerald-900 to-emerald-950 text-white p-6 sm:p-8 rounded-3xl shadow-xl border border-emerald-800 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <div className="flex items-center gap-2 text-amber-300 text-xs font-bold uppercase tracking-wider mb-1">
              <Settings className="w-4 h-4" />
              <span>ADMIN — CONTENT MANAGEMENT</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-serif font-bold">
              Website Content Manager{' '}
              <span className="text-amber-400">(CMS)</span>
            </h1>
            <p className="text-emerald-200 text-xs sm:text-sm mt-1">
              Edit hero banners, announcements, header & footer rules, about content, contact details, per-page SEO, website analyzer, and live pop notifications.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2.5 sm:gap-3 shrink-0">
            {/* High-Visibility SEO Improvement Guide Button */}
            <button
              type="button"
              onClick={() => handleTabChange('seo_guide')}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-black text-xs shadow-lg transition-all hover:scale-105 active:scale-95 cursor-pointer ${
                activeTab === 'seo_guide'
                  ? 'bg-amber-400 text-emerald-950 ring-2 ring-amber-300'
                  : 'bg-gradient-to-r from-amber-400 via-amber-300 to-yellow-400 hover:from-amber-300 hover:to-amber-400 text-emerald-950'
              }`}
              title="Open 20-Page SEO Header Improvement Guide"
            >
              <Sparkles className="w-4 h-4 text-emerald-950" />
              <span>✨ SEO Improvement Guide (20 Pages)</span>
            </button>

            {/* Header Auto-Refresh Dropdown */}
            <AutoRefreshDropdown
              intervalSec={autoRefreshSec}
              onIntervalChange={(sec) => {
                setAutoRefreshSec(sec);
                if (sec > 0) {
                  setIsGlobalRefreshing(true);
                }
              }}
              onRefresh={() => setIsGlobalRefreshing(true)}
              variant="emerald"
            />

            {/* Header Manual Refresh Button */}
            <button
              type="button"
              onClick={() => setIsGlobalRefreshing(true)}
              disabled={isGlobalRefreshing}
              className="flex items-center gap-1.5 px-3.5 py-2.5 bg-emerald-800/80 hover:bg-emerald-700/80 border border-emerald-700 text-emerald-100 hover:text-white rounded-xl text-xs font-bold transition-all shadow-sm cursor-pointer disabled:opacity-50"
              title="Refresh CMS Datastores & Templates"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-amber-300 ${isGlobalRefreshing ? 'animate-spin' : ''}`} />
              <span>Sync Live</span>
            </button>

            <a
              href="/"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-3.5 py-2.5 bg-white/10 hover:bg-white/20 border border-white/20 text-white font-bold text-xs rounded-xl transition-all"
            >
              <ExternalLink className="w-4 h-4" /> Preview
            </a>
          </div>
        </div>
      )}

      {/* Modern High-Visibility CMS Tab Navigation Bar */}
      <div className="bg-white dark:bg-emerald-950 p-2 sm:p-2.5 rounded-2xl border border-emerald-100 dark:border-emerald-800 shadow-md">
        <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0 scrollbar-thin">
          {TABS.map((tab) => {
            const isSelected = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => handleTabChange(tab.id)}
                className={`flex items-center gap-2 px-3.5 py-2.5 rounded-xl font-bold text-xs sm:text-sm whitespace-nowrap transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-gradient-to-r from-emerald-700 to-emerald-800 text-white shadow-md ring-2 ring-emerald-500/30'
                    : 'bg-emerald-50/50 dark:bg-emerald-900/40 text-gray-700 dark:text-emerald-100 hover:bg-emerald-100 dark:hover:bg-emerald-900 border border-emerald-200/60 dark:border-emerald-800'
                }`}
              >
                <span>{tab.icon}</span>
                <span>{tab.label}</span>
                {tab.badge && (
                  <span
                    className={`text-[10px] px-2 py-0.5 rounded-full font-mono font-black ${
                      isSelected
                        ? 'bg-amber-400 text-emerald-950'
                        : tab.badgeColor || 'bg-emerald-200 text-emerald-900'
                    }`}
                  >
                    {tab.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Tab Content */}
      <div>
        {activeTab === 'website_analyzer' && <WebsiteAnalyzerTab />}
        {activeTab === 'seo_guide' && <SEOGrowthGuideView />}
        {activeTab === 'login_page' && <LoginPageCMSTab />}
        {activeTab === 'hero' && <HeroBannerTab />}
        {activeTab === 'pop_notification' && <PopNotificationTab />}
        {activeTab === 'announcements' && <AnnouncementsTab />}
        {activeTab === 'header_footer' && <HeaderFooterTab />}
        {activeTab === 'about' && <AboutSectionTab />}
        {activeTab === 'seo' && <SEOSettingsTab />}
        {activeTab === 'contact' && <ContactDetailsTab />}
      </div>

      {/* Global Animated Percentage Loading Modal for Header Auto-Refresh and Manual Refresh */}
      <RefreshSpinnerModal
        isOpen={isGlobalRefreshing}
        title="Refreshing CMS Datastores..."
        subtitle="Syncing hero banners, notification bars, SEO tags, and page templates..."
        moduleName="Website CMS"
        onComplete={() => setIsGlobalRefreshing(false)}
      />
    </div>
  );
};

export default CMSPage;
