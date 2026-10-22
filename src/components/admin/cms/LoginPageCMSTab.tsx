import React, { useState, useEffect } from 'react';
import {
  Lock,
  Sparkles,
  Shield,
  Eye,
  EyeOff,
  Sliders,
  CheckCircle2,
  RefreshCw,
  Save,
  HelpCircle,
  Smartphone,
  Layers,
  Palette,
  ExternalLink,
  Users,
  Key,
  Mail,
  ArrowRight,
  UserCheck,
  AlertTriangle
} from 'lucide-react';
import { getJSONStore, setJSONStore } from '../../../lib/dbManager';
import { DEFAULT_CMS_TEMPLATES, type LoginPageTemplate } from '../../../lib/cmsTemplates';
import { useNotifications } from '../../../contexts/NotificationContext';
import { useActionModal } from '../../../contexts/ActionModalContext';
import { RefreshSpinnerModal } from '../../common/RefreshSpinnerModal';
import toast from 'react-hot-toast';

export const LoginPageCMSTab: React.FC = () => {
  const { addNotification } = useNotifications();
  const { showActionModal } = useActionModal();

  const [settings, setSettings] = useState<LoginPageTemplate>({
    ...DEFAULT_CMS_TEMPLATES.login_page!
  });

  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saveProgress, setSaveProgress] = useState(0);
  const [saveStepText, setSaveStepText] = useState('');
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [isResetModalOpen, setIsResetModalOpen] = useState(false);

  // Live preview interactive state
  const [previewShowDemoUsers, setPreviewShowDemoUsers] = useState(false);
  const [previewTilt, setPreviewTilt] = useState({ x: 0, y: 0 });
  const [previewPasswordVisible, setPreviewPasswordVisible] = useState(false);

  useEffect(() => {
    async function loadCMS() {
      try {
        const data = await getJSONStore<any>('cms_settings');
        if (data && data.length > 0 && data[0].login_page) {
          const merged: LoginPageTemplate = {
            ...DEFAULT_CMS_TEMPLATES.login_page!,
            ...data[0].login_page
          };
          setSettings(merged);
          setPreviewShowDemoUsers(merged.show_demo_users_default);
        } else {
          setPreviewShowDemoUsers(DEFAULT_CMS_TEMPLATES.login_page!.show_demo_users_default);
        }
      } catch (err) {
        console.warn('Could not load login_page from cms_settings:', err);
      } finally {
        setLoading(false);
      }
    }
    loadCMS();
  }, []);

  const handleUpdate = <K extends keyof LoginPageTemplate>(field: K, value: LoginPageTemplate[K]) => {
    setSettings((prev) => ({
      ...prev,
      [field]: value
    }));
    if (field === 'show_demo_users_default') {
      setPreviewShowDemoUsers(value as boolean);
    }
  };

  const handleSave = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setShowSaveModal(true);
    setSaveProgress(0);
    setSaveStepText('Validating login portal styling and security policies...');

    await new Promise((r) => setTimeout(r, 400));
    setSaveProgress(35);
    setSaveStepText('Compiling 3D elevation parameters & lighting matrices...');

    await new Promise((r) => setTimeout(r, 450));
    setSaveProgress(70);
    setSaveStepText('Persisting configuration to cms_settings store...');

    try {
      const existing = await getJSONStore<any>('cms_settings');
      const base = existing && existing.length > 0 ? existing[0] : {};
      const updated = {
        ...base,
        login_page: settings
      };
      await setJSONStore('cms_settings', [updated]);

      // Broadcast update event so any open login tab reflects immediately
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new Event('mrvivasayi_login_cms_updated'));
      }

      setSaveProgress(100);
      setSaveStepText('Login page design & 3D configuration updated successfully!');
      await new Promise((r) => setTimeout(r, 400));
      setShowSaveModal(false);

      addNotification({
        title: 'Login Portal CMS Updated ✓',
        message: 'Portal typography, 3D elevation, and default demo user visibility rules updated.',
        type: 'success',
        sourceModule: 'Login Portal CMS'
      });
      toast.success('Login page design saved successfully!');
    } catch (err) {
      console.error(err);
      setShowSaveModal(false);
      toast.error('Failed to save login page settings.');
    }
  };

  const handleResetDefaults = async () => {
    setIsResetModalOpen(false);
    showActionModal({
      title: 'Restoring Baseline Login Design',
      subtitle: 'Resetting all typography, 3D depths, and visibility flags to system defaults...',
      badge: 'CMS Reset',
      duration: 650,
      steps: [
        'Reverting 3D elevation matrices to Ultra-3D...',
        'Resetting default user toggle visibility...',
        'Restoring brand gradients & security notices...',
        'Baseline restored successfully'
      ],
      onComplete: async () => {
        const defaults = { ...DEFAULT_CMS_TEMPLATES.login_page! };
        setSettings(defaults);
        setPreviewShowDemoUsers(defaults.show_demo_users_default);

        const existing = await getJSONStore<any>('cms_settings');
        const base = existing && existing.length > 0 ? existing[0] : {};
        const updated = {
          ...base,
          login_page: defaults
        };
        await setJSONStore('cms_settings', [updated]);
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new Event('mrvivasayi_login_cms_updated'));
        }
        toast.success('Restored default login portal design!');
      }
    });
  };

  // Parallax tilt simulation for preview
  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!settings.enable_3d_tilt) {
      setPreviewTilt({ x: 0, y: 0 });
      return;
    }
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    const rotateX = ((y - centerY) / centerY) * -10;
    const rotateY = ((x - centerX) / centerX) * 10;
    setPreviewTilt({ x: rotateX, y: rotateY });
  };

  const handleMouseLeave = () => {
    setPreviewTilt({ x: 0, y: 0 });
  };

  return (
    <div className="space-y-6 text-xs animate-fadeIn">
      {/* ─── Hero Overview Card ─── */}
      <div className="bg-gradient-to-r from-violet-950 via-purple-900 to-emerald-950 text-white p-6 sm:p-7 rounded-3xl shadow-xl border border-purple-800/80 flex flex-col md:flex-row md:items-center justify-between gap-6 relative overflow-hidden">
        <div className="space-y-2 max-w-2xl relative z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-violet-800/80 border border-violet-500/50 text-amber-300 text-[10px] font-black uppercase tracking-wider">
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span>3D PORTAL ENGINE & CMS CUSTOMIZER</span>
          </div>
          <h3 className="text-xl sm:text-2xl font-serif font-bold text-white">
            Admin Login Page Design & 3D Elevation Studio
          </h3>
          <p className="text-purple-200 text-xs leading-relaxed">
            Customize the complete visual experience of your staff authentication portal: 3D perspective elevation, interactive ambient lighting, security trust badges, and configure whether default demo staff accounts are hidden by default or toggleable.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 shrink-0 relative z-10">
          <a
            href="/admin/login"
            target="_blank"
            rel="noopener noreferrer"
            className="px-4 py-2.5 bg-white/10 hover:bg-white/20 text-white font-extrabold rounded-2xl border border-white/20 transition flex items-center justify-center gap-2 shadow-sm text-xs"
          >
            <span>Open Live Portal</span>
            <ExternalLink className="w-4 h-4 text-amber-300" />
          </a>

          <button
            type="button"
            onClick={() => handleSave()}
            disabled={isSaving}
            className="px-5 py-2.5 bg-amber-400 hover:bg-amber-300 text-emerald-950 font-black rounded-2xl shadow-lg transition transform hover:scale-[1.02] flex items-center justify-center gap-2 text-xs cursor-pointer"
          >
            <Save className="w-4 h-4 text-emerald-950" />
            <span>Save Login Design</span>
          </button>
        </div>
      </div>

      {/* ─── Two-Column Layout: Controls (Left) & Real-Time 3D Simulator (Right) ─── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* LEFT COLUMN: SETTINGS FORM (7 Cols) */}
        <div className="lg:col-span-7 space-y-5">

          {/* CARD 1: PORTAL BRANDING & MESSAGING */}
          <div className="bg-white rounded-3xl p-6 shadow-sm border border-emerald-100 dark:border-emerald-800 space-y-4">
            <div className="flex items-center gap-2.5 border-b border-gray-100 pb-3">
              <div className="w-9 h-9 rounded-2xl bg-violet-100 text-violet-800 flex items-center justify-center font-bold">
                <Lock className="w-4 h-4 text-violet-700" />
              </div>
              <div>
                <h4 className="font-extrabold text-gray-900 text-sm">
                  Portal Header Typography & Notice
                </h4>
                <p className="text-gray-500 text-[11px]">
                  Branding and welcome notice displayed above the login card
                </p>
              </div>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block font-bold text-gray-800 mb-1">
                  Portal Main Headline *
                </label>
                <input
                  type="text"
                  value={settings.portal_title}
                  onChange={(e) => handleUpdate('portal_title', e.target.value)}
                  className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl font-bold text-gray-900 text-xs focus:ring-2 focus:ring-violet-500"
                  placeholder="e.g. MR. VIVASAYI Business Operations & Admin Portal"
                />
              </div>

              <div>
                <label className="block font-bold text-gray-800 mb-1">
                  Portal Subheadline / Enterprise Tagline
                </label>
                <input
                  type="text"
                  value={settings.portal_subtitle}
                  onChange={(e) => handleUpdate('portal_subtitle', e.target.value)}
                  className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl text-gray-800 text-xs focus:ring-2 focus:ring-violet-500"
                  placeholder="e.g. Enterprise Organic Supply Chain & Retail ERP"
                />
              </div>

              <div>
                <label className="block font-bold text-white-800 mb-1">
                  Welcome Notice / Announcement Text
                </label>
                <textarea
                  rows={2}
                  value={settings.welcome_message}
                  onChange={(e) => handleUpdate('welcome_message', e.target.value)}
                  className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl text-gray-800 text-xs focus:ring-2 focus:ring-violet-500 leading-relaxed"
                  placeholder="Welcome message displayed at the top of the portal..."
                />
              </div>
            </div>
          </div>

          {/* CARD 2: DEFAULT DEMO USERS CONTROLLER (CORE REQUEST) */}
          <div className="bg-white rounded-3xl p-6 shadow-sm border border-emerald-100 dark:border-emerald-800 space-y-4">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-2xl bg-amber-100 text-amber-800 flex items-center justify-center font-bold">
                  <Users className="w-4 h-4 text-amber-700" />
                </div>
                <div>
                  <h4 className="font-extrabold text-gray-900 text-sm">
                    Default Users & Quick Demo Accounts Controller
                  </h4>
                  <p className="text-gray-500 text-[11px]">
                    Configure the 1-click role accounts accordion on the login page
                  </p>
                </div>
              </div>
              <span className="bg-amber-100 text-amber-900 text-[10px] font-black uppercase px-2 py-0.5 rounded-md">
                Role Access
              </span>
            </div>

            <div className="space-y-3.5">
              {/* Toggle 1: Allow Toggle Button */}
              <label className="flex items-start gap-3 p-3.5 bg-gray-50 hover:bg-amber-50/50 rounded-2xl transition cursor-pointer border border-gray-100">
                <input
                  type="checkbox"
                  checked={settings.allow_demo_toggle}
                  onChange={(e) => handleUpdate('allow_demo_toggle', e.target.checked)}
                  className="mt-0.5 w-4 h-4 text-amber-600 rounded focus:ring-amber-500"
                />
                <div className="space-y-0.5">
                  <span className="font-extrabold text-gray-900 text-xs block">
                    Enable &quot;Show Quick Demo Users&quot; Button on Login Page
                  </span>
                  <span className="text-[11px] text-gray-500 block">
                    Displays an interactive button allowing staff to expand or collapse default role accounts.
                  </span>
                </div>
              </label>

              {/* Toggle 2: Show by Default or Require Click */}
              <label className="flex items-start gap-3 p-3.5 bg-gray-50 hover:bg-emerald-50/50 rounded-2xl transition cursor-pointer border border-gray-100">
                <input
                  type="checkbox"
                  checked={settings.show_demo_users_default}
                  onChange={(e) => handleUpdate('show_demo_users_default', e.target.checked)}
                  className="mt-0.5 w-4 h-4 text-emerald-600 rounded focus:ring-emerald-500"
                />
                <div className="space-y-0.5">
                  <span className="font-extrabold text-gray-900 text-xs block">
                    Show Default Users Automatically on Page Load
                  </span>
                  <span className="text-[11px] text-gray-500 block">
                    If unchecked (recommended for production security), demo users remain hidden until staff clicks the toggle button.
                  </span>
                </div>
              </label>

              <div>
                <label className="block font-bold text-gray-800 mb-1">
                  Default Users Section Label
                </label>
                <input
                  type="text"
                  value={settings.demo_users_title}
                  onChange={(e) => handleUpdate('demo_users_title', e.target.value)}
                  className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl text-gray-800 text-xs focus:ring-2 focus:ring-amber-500 font-medium"
                  placeholder="e.g. ⚡ Quick Staff Roles & One-Click Demo Access"
                />
              </div>
            </div>
          </div>

          {/* CARD 3: 3D ELEVATION, TILT & LIGHTING EFFECTS */}
          <div className="bg-white rounded-3xl p-6 shadow-sm border border-emerald-100 dark:border-emerald-800 space-y-4">
            <div className="flex items-center gap-2.5 border-b border-gray-100 pb-3">
              <div className="w-9 h-9 rounded-2xl bg-teal-100 text-teal-800 flex items-center justify-center font-bold">
                <Layers className="w-4 h-4 text-teal-700" />
              </div>
              <div>
                <h4 className="font-extrabold text-gray-900 text-sm">
                  3D Elevation, Parallax Tilt & Visual Atmosphere
                </h4>
                <p className="text-gray-500 text-[11px]">
                  Multi-layer perspective depth, specular light glare, and ambient themes
                </p>
              </div>
            </div>

            <div className="space-y-4">
              {/* Enable 3D Tilt Parallax */}
              <label className="flex items-start gap-3 p-3 bg-teal-50/50 rounded-2xl transition cursor-pointer border border-teal-200/60">
                <input
                  type="checkbox"
                  checked={settings.enable_3d_tilt}
                  onChange={(e) => handleUpdate('enable_3d_tilt', e.target.checked)}
                  className="mt-0.5 w-4 h-4 text-teal-600 rounded focus:ring-teal-500"
                />
                <div className="space-y-0.5">
                  <span className="font-extrabold text-gray-900 text-xs block">
                    Enable Interactive Mouse-Tracking 3D Parallax Tilt
                  </span>
                  <span className="text-[11px] text-teal-900 block">
                    The login card tilts in 3D perspective space (rotateX, rotateY) as cursor glides across the screen.
                  </span>
                </div>
              </label>

              {/* Elevation Depth Selector */}
              <div>
                <label className="block font-bold text-gray-800 mb-1.5">
                  3D Card Elevation Depth
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {[
                    { id: 'subtle', label: 'Subtle', desc: 'Flat 2D Card' },
                    { id: 'medium', label: 'Medium', desc: 'Light Shadow' },
                    { id: 'high', label: 'High 3D', desc: 'Depth & Tilt' },
                    { id: 'ultra_3d', label: 'Ultra 3D', desc: 'Z-Layers & Glare' }
                  ].map((lvl) => (
                    <button
                      key={lvl.id}
                      type="button"
                      onClick={() => handleUpdate('elevation_depth', lvl.id as any)}
                      className={`p-2.5 rounded-xl border text-center transition cursor-pointer ${
                        settings.elevation_depth === lvl.id
                          ? 'bg-violet-900 text-white border-violet-700 shadow-md ring-2 ring-violet-500/30'
                          : 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100'
                      }`}
                    >
                      <div className="font-black text-xs">{lvl.label}</div>
                      <div className="text-[10px] opacity-80">{lvl.desc}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Ambient Theme Selector */}
              <div>
                <label className="block font-bold text-gray-800 mb-1.5">
                  Background Ambient Glow Theme
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { id: 'emerald_aurora', label: 'Emerald Aurora', desc: 'Farm Green & Gold Lights' },
                    { id: 'golden_harvest', label: 'Golden Harvest', desc: 'Amber Honey Glow' },
                    { id: 'midnight_dark', label: 'Midnight Obsidian', desc: 'Dark Graphite Stealth' },
                    { id: 'cosmic_teal', label: 'Cosmic Teal', desc: 'Cyan & Aquamarine' }
                  ].map((thm) => (
                    <button
                      key={thm.id}
                      type="button"
                      onClick={() => handleUpdate('ambient_theme', thm.id as any)}
                      className={`p-2.5 rounded-xl border text-left transition cursor-pointer ${
                        settings.ambient_theme === thm.id
                          ? 'bg-emerald-950 text-white border-emerald-600 shadow-md ring-2 ring-emerald-500/30'
                          : 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100'
                      }`}
                    >
                      <div className="font-bold text-xs">{thm.label}</div>
                      <div className="text-[10px] text-gray-500">{thm.desc}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Floating Badges */}
              <div className="space-y-2 pt-1">
                <label className="flex items-center gap-2 cursor-pointer font-bold text-gray-800 text-xs">
                  <input
                    type="checkbox"
                    checked={settings.show_floating_badges}
                    onChange={(e) => handleUpdate('show_floating_badges', e.target.checked)}
                    className="w-4 h-4 text-emerald-600 rounded"
                  />
                  <span>Show Floating Orbital 3D Security Pill</span>
                </label>

                {settings.show_floating_badges && (
                  <input
                    type="text"
                    value={settings.floating_badge_text}
                    onChange={(e) => handleUpdate('floating_badge_text', e.target.value)}
                    className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl text-gray-800 text-xs focus:ring-2 focus:ring-emerald-500"
                    placeholder="Login"
                  />
                )}
              </div>
            </div>
          </div>

          {/* CARD 4: SECURITY NOTICE & HELP CONTACT */}
          <div className="bg-white rounded-3xl p-6 shadow-sm border border-emerald-100 dark:border-emerald-800 space-y-4">
            <div className="flex items-center gap-2.5 border-b border-gray-100 pb-3">
              <div className="w-9 h-9 rounded-2xl bg-blue-100 text-blue-800 flex items-center justify-center font-bold">
                <Shield className="w-4 h-4 text-blue-700" />
              </div>
              <div>
                <h4 className="font-extrabold text-gray-900 text-sm">
                  Footer Security Assurance & Support
                </h4>
                <p className="text-gray-500 text-[11px]">
                  Assurance copy and support contact shown at the bottom
                </p>
              </div>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block font-bold text-gray-800 mb-1">
                  Security Assurance Note
                </label>
                <input
                  type="text"
                  value={settings.security_notice}
                  onChange={(e) => handleUpdate('security_notice', e.target.value)}
                  className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl text-gray-800 text-xs focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block font-bold text-gray-800 mb-1">
                  Emergency Help Desk Contact
                </label>
                <input
                  type="text"
                  value={settings.help_desk_contact}
                  onChange={(e) => handleUpdate('help_desk_contact', e.target.value)}
                  className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl text-gray-800 text-xs focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g. Internal IT Admin / Operations Desk"
                />
              </div>

              <div>
                <label className="block font-bold text-gray-800 mb-1">
                  Contact Our Administrator Notice (No External Redirects)
                </label>
                <textarea
                  rows={2}
                  value={settings.contact_admin_message || ''}
                  onChange={(e) => handleUpdate('contact_admin_message', e.target.value)}
                  className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl text-gray-800 text-xs focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g. Please contact our system administrator or operations management desk to request access authorization or password reset."
                />
              </div>
            </div>
          </div>

          {/* RESET DEFAULTS FOOTER */}
          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl border border-gray-200">
            <div className="space-y-0.5">
              <span className="font-extrabold text-gray-800 text-xs block">
                Reset Login Design to Factory Baseline
              </span>
              <span className="text-[11px] text-gray-500 block">
                Reverts titles, 3D elevation, and default user settings to defaults.
              </span>
            </div>

            <button
              type="button"
              onClick={() => setIsResetModalOpen(true)}
              className="px-4 py-2 bg-white hover:bg-rose-50 text-rose-700 font-extrabold rounded-xl border border-rose-200 shadow-xs transition flex items-center gap-1.5 cursor-pointer text-xs shrink-0"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Reset Defaults</span>
            </button>
          </div>

        </div>

        {/* RIGHT COLUMN: INTERACTIVE 3D LIVE SIMULATOR (5 Cols) */}
        <div className="lg:col-span-5 sticky top-6 space-y-4">
          <div className="flex items-center justify-between bg-white px-4 py-2.5 rounded-2xl border border-gray-200 shadow-xs">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
              <span className="font-extrabold text-xs text-gray-900">Live 3D Portal Simulator</span>
            </div>
            <span className="text-[10px] text-gray-400 font-mono">Move cursor to tilt in 3D</span>
          </div>

          {/* 3D Perspective Box */}
          <div
            className={`p-6 rounded-3xl shadow-2xl border relative overflow-hidden transition-all duration-300 ${
              settings.ambient_theme === 'golden_harvest'
                ? 'bg-gradient-to-br from-amber-950 via-amber-900 to-emerald-950 border-amber-500/40'
                : settings.ambient_theme === 'midnight_dark'
                ? 'bg-gradient-to-br from-gray-950 via-zinc-900 to-gray-950 border-zinc-700/50'
                : settings.ambient_theme === 'cosmic_teal'
                ? 'bg-gradient-to-br from-teal-950 via-emerald-950 to-cyan-950 border-cyan-500/40'
                : 'bg-gradient-to-br from-emerald-950 via-emerald-900 to-emerald-950 border-emerald-600/40'
            }`}
            style={{ perspective: '1000px' }}
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
          >
            {/* Background Ambient Radial Glow */}
            <div className="absolute inset-0 pointer-events-none opacity-20 bg-[radial-gradient(#fbbf24_1px,transparent_1px)] [background-size:20px_20px]" />
            <div className="absolute -top-12 -right-12 w-48 h-48 bg-amber-400/20 rounded-full blur-3xl pointer-events-none animate-pulse" />

            {/* Simulated 3D Tilt Card */}
            <div
              className={`rounded-3xl p-5 border transition-transform duration-150 ease-out relative ${
                settings.elevation_depth === 'ultra_3d'
                  ? 'bg-white/95 dark:bg-emerald-900/90 shadow-[0_30px_60px_-15px_rgba(0,0,0,0.7)] border-amber-400/50 backdrop-blur-xl'
                  : settings.elevation_depth === 'high'
                  ? 'bg-white/95 dark:bg-emerald-900/90 shadow-2xl border-emerald-500/40 backdrop-blur-lg'
                  : 'bg-white dark:bg-emerald-900 shadow-lg border-gray-200 dark:border-emerald-700'
              }`}
              style={{
                transform: settings.enable_3d_tilt
                  ? `rotateX(${previewTilt.x}deg) rotateY(${previewTilt.y}deg) translateZ(${settings.elevation_depth === 'ultra_3d' ? '30px' : '15px'})`
                  : 'none',
                transformStyle: 'preserve-3d'
              }}
            >
              {/* Floating 3D Badge on Card */}
              {settings.show_floating_badges && settings.floating_badge_text && (
                <div
                  className="absolute -top-3.5 right-4 z-20 bg-amber-400 text-emerald-950 px-3 py-1 rounded-full text-[10px] font-black shadow-lg border border-amber-300 flex items-center gap-1 animate-bounce"
                  style={{ transform: 'translateZ(25px)' }}
                >
                  <Shield className="w-3 h-3" />
                  <span>{settings.floating_badge_text}</span>
                </div>
              )}

              {/* Portal Header */}
              <div className="space-y-1 mb-4 text-center">
                <div className="inline-block px-2.5 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-amber-300 text-[10px] font-black uppercase">
                  {settings.portal_subtitle || 'Enterprise Access'}
                </div>
                <h4 className="font-serif font-bold text-gray-900 dark:text-white text-base leading-tight">
                  {settings.portal_title || 'MR. VIVASAYI Admin Portal'}
                </h4>
                {settings.welcome_message && (
                  <p className="text-[10px] text-gray-500 dark:text-emerald-200/80 line-clamp-2">
                    {settings.welcome_message}
                  </p>
                )}
              </div>

              {/* CORE REQUIREMENT SIMULATOR: Default Users Show/Hide Button */}
              {settings.allow_demo_toggle && (
                <div className="mb-4">
                  <button
                    type="button"
                    onClick={() => setPreviewShowDemoUsers(!previewShowDemoUsers)}
                    className="w-full py-2 px-3 rounded-xl bg-amber-50 dark:bg-emerald-950/80 hover:bg-amber-100 border border-amber-300 dark:border-emerald-700 text-amber-900 dark:text-amber-300 text-[11px] font-extrabold flex items-center justify-between transition shadow-xs cursor-pointer"
                  >
                    <div className="flex items-center gap-1.5">
                      <Users className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                      <span>{settings.demo_users_title || 'Quick Staff Role Accounts'}</span>
                    </div>
                    <span className="bg-amber-400 text-emerald-950 text-[9px] font-black px-1.5 py-0.5 rounded-full">
                      {previewShowDemoUsers ? 'Hide ✕' : 'Show 5 Users ▼'}
                    </span>
                  </button>

                  {/* Accordion Demo Users List */}
                  {previewShowDemoUsers && (
                    <div className="mt-2 space-y-1.5 p-2 bg-gray-50 dark:bg-emerald-950/60 rounded-xl border border-gray-200 dark:border-emerald-800 animate-fadeIn">
                      <div className="text-[9px] font-bold text-gray-400 dark:text-emerald-300 uppercase px-1">
                        1-Click Instant Demo Login:
                      </div>
                      {[
                        { role: 'STAFF', name: 'Store Billing Assistant', email: 'staff@mrvivasayi.in' },
                        { role: 'INVENTORY_MANAGER', name: 'Farm Inventory Staff', email: 'inventory@mrvivasayi.in' },
                        { role: 'SALES_STAFF', name: 'Counter Sales Staff', email: 'sales@mrvivasayi.in' }
                      ].map((u) => (
                        <div
                          key={u.role}
                          className="flex items-center justify-between p-1.5 bg-white dark:bg-emerald-900/60 rounded-lg border border-gray-100 dark:border-emerald-800 text-[10px]"
                        >
                          <div>
                            <span className="font-bold text-gray-800 dark:text-white block">{u.name}</span>
                            <span className="text-[9px] font-mono text-emerald-600 dark:text-emerald-400">{u.role}</span>
                          </div>
                          <span className="text-[9px] bg-emerald-100 dark:bg-emerald-800 text-emerald-800 dark:text-amber-300 px-2 py-0.5 rounded font-bold">
                            Select ✓
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Form Simulator */}
              <div className="space-y-3">
                <div>
                  <label className="block text-[10px] font-bold text-gray-700 dark:text-emerald-200 mb-0.5">
                    Admin Email Address
                  </label>
                  <div className="relative">
                    <Mail className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-gray-400" />
                    <input
                      type="text"
                      readOnly
                      value="admin@mrvivasayi.in"
                      className="w-full pl-8 pr-2 py-2 bg-gray-50 dark:bg-emerald-950 border border-gray-200 dark:border-emerald-700 rounded-xl text-xs text-gray-800 dark:text-white"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-gray-700 dark:text-emerald-200 mb-0.5">
                    Password
                  </label>
                  <div className="relative">
                    <Lock className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-gray-400" />
                    <input
                      type={previewPasswordVisible ? 'text' : 'password'}
                      readOnly
                      value="••••••••••••"
                      className="w-full pl-8 pr-8 py-2 bg-gray-50 dark:bg-emerald-950 border border-gray-200 dark:border-emerald-700 rounded-xl text-xs text-gray-800 dark:text-white"
                    />
                    <button
                      type="button"
                      onClick={() => setPreviewPasswordVisible(!previewPasswordVisible)}
                      className="absolute right-2.5 top-2.5 text-gray-400 hover:text-gray-600"
                    >
                      {previewPasswordVisible ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>

                <button
                  type="button"
                  className="w-full py-2.5 bg-amber-400 text-emerald-950 font-black rounded-xl shadow-md text-xs flex items-center justify-center gap-1.5 hover:bg-amber-300 transition"
                >
                  <UserCheck className="w-3.5 h-3.5" />
                  <span>Log In With Credentials</span>
                </button>
              </div>

              {/* Security Footer Notice */}
              {settings.security_notice && (
                <div className="mt-4 pt-3 border-t border-gray-100 dark:border-emerald-800/60 text-center">
                  <p className="text-[9px] text-gray-400 dark:text-emerald-300/70">
                    {settings.security_notice}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

      </div>

      {/* ─── Save Progress Modal ─── */}
      <RefreshSpinnerModal
        isOpen={showSaveModal}
        progressPercent={saveProgress}
        stepText={saveStepText}
        title="Updating Login Portal Design"
        subtitle="Compiling 3D visual parameters & synchronizing CMS catalog..."
      />

      {/* ─── Reset Confirmation Modal ─── */}
      {isResetModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl border border-gray-200 space-y-4 animate-scaleUp">
            <div className="w-12 h-12 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center mx-auto">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div className="text-center space-y-1">
              <h4 className="font-extrabold text-gray-900 text-base">
                Reset Login Portal to Factory Defaults?
              </h4>
              <p className="text-xs text-gray-500">
                This will reset all typography, 3D elevation depth, and restore default demo user settings.
              </p>
            </div>
            <div className="flex gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setIsResetModalOpen(false)}
                className="flex-1 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-xl text-xs transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleResetDefaults}
                className="flex-1 py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl text-xs shadow-md transition"
              >
                Yes, Reset
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LoginPageCMSTab;
