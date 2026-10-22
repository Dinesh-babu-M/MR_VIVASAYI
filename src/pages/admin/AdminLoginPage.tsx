import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  Shield,
  Lock,
  Mail,
  Sparkles,
  UserCheck,
  UserX,
  ArrowRight,
  Eye,
  EyeOff,
  AlertTriangle,
  HelpCircle,
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  ArrowLeft,
  ShieldAlert,
  Cpu,
  Layers,
  Check,
  Copy,
  Info,
  X
} from 'lucide-react';
import Logo from '../../components/common/Logo';
import { useAuth } from '../../contexts/AuthContext';
import { useActionModal } from '../../contexts/ActionModalContext';
import { getJSONStore } from '../../lib/dbManager';
import { DEFAULT_CMS_TEMPLATES, type LoginPageTemplate } from '../../lib/cmsTemplates';
import type { UserRole, UserProfile } from '../../types';
import toast from 'react-hot-toast';

// DEMO STAFF ROLES (Includes Super Admin and Admin as requested)
const DEMO_STAFF_ACCOUNTS: UserProfile[] = [
  {
    id: 'usr-001',
    full_name: 'Dinesh (Super Admin)',
    email: 'superadmin@mrvivasayi.in',
    role: 'SUPER_ADMIN',
    designation: 'General Manager / Owner',
    department: 'Executive Management',
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'usr-002',
    full_name: 'Store Admin',
    email: 'admin@mrvivasayi.in',
    role: 'ADMIN',
    designation: 'Operations Lead',
    department: 'Store Operations',
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'usr-004',
    full_name: 'Farm Inventory Specialist',
    email: 'inventory@mrvivasayi.in',
    role: 'INVENTORY_MANAGER',
    designation: 'Stock & Harvest Tracker',
    department: 'Warehouse & Fulfillment',
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'usr-003',
    full_name: 'Store Billing Assistant',
    email: 'staff@mrvivasayi.in',
    role: 'STAFF',
    designation: 'Billing & POS Operator',
    department: 'Store Front Counter',
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'usr-005',
    full_name: 'Counter Sales Staff',
    email: 'sales@mrvivasayi.in',
    role: 'SALES_STAFF',
    designation: 'Retail Sales Counter',
    department: 'Customer Delivery',
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }
];

export const AdminLoginPage: React.FC = () => {
  const navigate = useNavigate();
  const { switchDemoUser, loginWithSupabase } = useAuth();
  const { showActionModal } = useActionModal();

  // Dynamic CMS Settings State
  const [settings, setSettings] = useState<LoginPageTemplate>({
    ...DEFAULT_CMS_TEMPLATES.login_page!
  });

  // User input states
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);

  // In-card error message state that replaces the welcome message
  const [loginError, setLoginError] = useState<string | null>(null);

  // Toggle for Demo Accounts: DEFAULT IS FALSE
  const [showDemoUsers, setShowDemoUsers] = useState<boolean>(false);

  // Live staff accounts synced from DB (ensures active / suspended statuses are 100% live)
  const [liveStaffAccounts, setLiveStaffAccounts] = useState<UserProfile[]>(DEMO_STAFF_ACCOUNTS);

  // Confirmation pop modal state for 1-click launch session
  const [confirmLoginUser, setConfirmLoginUser] = useState<UserProfile | null>(null);

  // 3D Parallax Tilt & Glare State
  const cardRef = useRef<HTMLDivElement>(null);
  const [tilt, setTilt] = useState({ x: 0, y: 0, glareX: 50, glareY: 50 });
  const [isHovered, setIsHovered] = useState(false);

  // Modal States for Every Action and Error
  const [authProgressModal, setAuthProgressModal] = useState<{
    isOpen: boolean;
    progress: number;
    stepIndex: number;
    stepTitle: string;
    stepDescription: string;
  }>({
    isOpen: false,
    progress: 0,
    stepIndex: 0,
    stepTitle: '',
    stepDescription: ''
  });

  const [authErrorModal, setAuthErrorModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    details?: string;
  }>({
    isOpen: false,
    title: '',
    message: ''
  });

  const [validationModal, setValidationModal] = useState<{
    isOpen: boolean;
    missingField: string;
  }>({
    isOpen: false,
    missingField: ''
  });

  const [helpModalOpen, setHelpModalOpen] = useState(false);
  const [copiedEmail, setCopiedEmail] = useState<string | null>(null);

  // Sync live staff accounts from DB
  const syncLiveStaffAccounts = async () => {
    try {
      const dbUsers = await getJSONStore<UserProfile>('users');
      if (dbUsers && dbUsers.length > 0) {
        const merged: UserProfile[] = DEMO_STAFF_ACCOUNTS.map(demo => {
          const match = dbUsers.find(u => u.email?.toLowerCase() === demo.email.toLowerCase() || u.role === demo.role);
          if (match) {
            const isSuspended = match.status === 'SUSPENDED' || match.is_active === false || (match as any).status === 'DELETED';
            return {
              ...demo,
              ...match,
              is_active: !isSuspended,
              status: isSuspended ? ('SUSPENDED' as const) : ('ACTIVE' as const)
            };
          }
          return demo;
        });
        setLiveStaffAccounts(merged);
      }
    } catch (e) {
      console.warn('Could not sync live staff accounts:', e);
    }
  };

  // Load CMS Settings and Live Staff Accounts
  useEffect(() => {
    async function initData() {
      try {
        const cmsData = await getJSONStore<any>('cms_settings');

        if (cmsData && cmsData.length > 0 && cmsData[0].login_page) {
          const merged: LoginPageTemplate = {
            ...DEFAULT_CMS_TEMPLATES.login_page!,
            ...cmsData[0].login_page
          };
          setSettings(merged);
          setShowDemoUsers(Boolean(merged.show_demo_users_default));
        }
      } catch (err) {
        console.warn('Could not load login settings from cms_settings:', err);
      }
      await syncLiveStaffAccounts();
    }

    initData();

    // Listen for live updates from CMS Login Page Editor & Database
    const handleCmsUpdate = () => {
      getJSONStore<any>('cms_settings').then((data) => {
        if (data && data.length > 0 && data[0].login_page) {
          setSettings({
            ...DEFAULT_CMS_TEMPLATES.login_page!,
            ...data[0].login_page
          });
        }
      });
      syncLiveStaffAccounts();
    };

    window.addEventListener('mrvivasayi_login_cms_updated', handleCmsUpdate);
    window.addEventListener('storage', handleCmsUpdate);
    window.addEventListener('focus', syncLiveStaffAccounts);

    return () => {
      window.removeEventListener('mrvivasayi_login_cms_updated', handleCmsUpdate);
      window.removeEventListener('storage', handleCmsUpdate);
      window.removeEventListener('focus', syncLiveStaffAccounts);
    };
  }, []);

  // 3D Mouse Parallax Movement
  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!settings.enable_3d_tilt || !cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;

    const rotateX = ((y - centerY) / centerY) * -8;
    const rotateY = ((x - centerX) / centerX) * 8;
    const glareX = Math.round((x / rect.width) * 100);
    const glareY = Math.round((y / rect.height) * 100);

    setTilt({ x: rotateX, y: rotateY, glareX, glareY });
  };

  const handleMouseLeave = () => {
    setIsHovered(false);
    setTilt({ x: 0, y: 0, glareX: 50, glareY: 50 });
  };

  const handleMouseEnter = () => {
    setIsHovered(true);
  };

  // Demo user login action modal (Does NOT expose or write any password)
  const handleDemoLogin = async (role: UserRole, userItem: UserProfile) => {
    // 1. Check if user is suspended in live DB first
    try {
      const dbUsers = await getJSONStore<UserProfile>('users');
      const liveUser = (dbUsers || []).find(u => u.email?.toLowerCase() === userItem.email.toLowerCase() || u.role === role);
      if (liveUser && (liveUser.status === 'SUSPENDED' || (liveUser as any).status === 'DELETED' || liveUser.is_active === false)) {
        const errorMsg = `Account Suspended: The staff account for ${userItem.full_name} (${userItem.email}) has been suspended by the administrator. Login access is denied.`;
        setLoginError(errorMsg);
        setAuthErrorModal({
          isOpen: true,
          title: 'Account Suspended',
          message: errorMsg,
          details: `This staff account (${userItem.email}) has been placed on administrative suspension. All system access, billing counter permissions, and dashboard credentials are locked. Contact your store administrator to reinstate your account.`
        });
        toast.error(`Account Suspended: ${userItem.full_name} is suspended. Access denied.`);
        return;
      }
    } catch {
      // ignore
    }

    showActionModal({
      title: `Authorizing Staff Session`,
      subtitle: `Signing in as ${userItem.full_name} (${role})...`,
      durationMs: 800,
      steps: [
        'Generating RSA cryptographic authentication token',
        `Injecting scope permissions for role: ${role}`,
        'Validating live Supabase session signature',
        'Session established successfully'
      ],
      onComplete: async () => {
        try {
          await switchDemoUser(role);
          toast.success(`Welcome back, ${userItem.full_name}!`);
          navigate('/admin');
        } catch (err: any) {
          const msg = err?.message || 'Login failed.';
          setLoginError(msg);
          const isSusp = msg.toLowerCase().includes('suspend');
          setAuthErrorModal({
            isOpen: true,
            title: isSusp ? 'Account Suspended' : 'Authentication Failed',
            message: msg,
            details: isSusp
              ? 'This staff account has been placed on administrative suspension. All system access is locked. Contact your administrator.'
              : 'Could not complete demo authentication.'
          });
          toast.error(msg);
        }
      }
    });
  };

  // Quick select demo staff email (Does NOT expose or fill password!)
  const handleQuickFill = (userItem: UserProfile) => {
    setEmail(userItem.email);
    setCopiedEmail(userItem.email);
    if (loginError) setLoginError(null);
    setTimeout(() => setCopiedEmail(null), 2000);
    toast.success(`Selected staff email: ${userItem.email}`);
  };

  // Supabase Credentials Submit with Multi-Step Animated Pop Modal
  const handleSupabaseSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // 1. Validation Pop Modal if fields are empty
    if (!email.trim() && !password.trim()) {
      const msg = 'Please enter both your staff email address and authorized password.';
      setLoginError(msg);
      setValidationModal({
        isOpen: true,
        missingField: 'Staff Email & Password'
      });
      toast.error(msg);
      return;
    }
    if (!email.trim()) {
      const msg = 'Staff email address is required to authenticate.';
      setLoginError(msg);
      setValidationModal({
        isOpen: true,
        missingField: 'Staff Email Address'
      });
      toast.error(msg);
      return;
    }
    if (!password.trim()) {
      const msg = 'Authorized password is required to authenticate.';
      setLoginError(msg);
      setValidationModal({
        isOpen: true,
        missingField: 'Account Password'
      });
      toast.error(msg);
      return;
    }

    // Clear any previous error before attempting
    setLoginError(null);

    // 2. Launch Multi-Step Progress Modal
    setAuthProgressModal({
      isOpen: true,
      progress: 20,
      stepIndex: 1,
      stepTitle: 'Sanitizing Input & Syntax',
      stepDescription: 'Verifying cryptographic security envelope and email formatting...'
    });

    await new Promise((r) => setTimeout(r, 250));
    setAuthProgressModal((prev) => ({
      ...prev,
      progress: 50,
      stepIndex: 2,
      stepTitle: 'Generating SHA-256 Digest',
      stepDescription: 'Hashing input credentials and preparing authentication request...'
    }));

    await new Promise((r) => setTimeout(r, 300));
    setAuthProgressModal((prev) => ({
      ...prev,
      progress: 80,
      stepIndex: 3,
      stepTitle: 'Querying PostgreSQL Database',
      stepDescription: 'Checking user account status, permissions, and suspension locks...'
    }));

    try {
      await loginWithSupabase(email.trim(), password);

      setAuthProgressModal((prev) => ({
        ...prev,
        progress: 100,
        stepIndex: 4,
        stepTitle: 'Access Granted ✓',
        stepDescription: 'Redirecting to MR. VIVASAYI Admin Dashboard...'
      }));

      await new Promise((r) => setTimeout(r, 450));
      setAuthProgressModal((prev) => ({ ...prev, isOpen: false }));
      toast.success('Authentication verified! Welcome back.');
      navigate('/admin');
    } catch (err: any) {
      // 3. Error Pop Modal AND In-Card Banner Replacement on failure
      setAuthProgressModal((prev) => ({ ...prev, isOpen: false }));
      const msg: string = err?.message || 'Login failed. Please verify your email and password.';
      
      // Update in-card error message which replaces the welcome banner
      setLoginError(msg);

      // Determine specific error categories
      const isSuspended = msg.toLowerCase().includes('suspend');
      const isArchived = msg.toLowerCase().includes('archive') || msg.toLowerCase().includes('deleted');
      const isIncorrectPass = msg.toLowerCase().includes('password') || msg.toLowerCase().includes('incorrect');
      const isNotFound = msg.toLowerCase().includes('not found');

      let modalTitle = 'Authentication Failed';
      let modalDetails = 'The credentials provided could not be matched with an active authorized staff profile in the database. Ensure caps lock is off, or contact our administrator.';

      if (isSuspended) {
        modalTitle = 'Account Suspended';
        modalDetails = 'This staff account has been placed on administrative suspension. All system access, billing counter permissions, and dashboard credentials are locked. Contact your store administrator to reinstate your account.';
      } else if (isArchived) {
        modalTitle = 'Account Inactive / Archived';
        modalDetails = 'This staff account has been moved to the deleted archive table. Please ask a system administrator to restore your account from the Staff Archive tab.';
      } else if (isIncorrectPass) {
        modalTitle = 'Incorrect Password';
        modalDetails = 'The password you entered does not match our records. Please verify caps lock is off, or contact our administrator.';
      } else if (isNotFound) {
        modalTitle = 'Account Not Found';
        modalDetails = `No registered staff profile was found for "${email.trim()}". Please verify the email address or ask your administrator to create a staff profile.`;
      }

      // Also trigger pop modal
      setAuthErrorModal({
        isOpen: true,
        title: modalTitle,
        message: msg,
        details: modalDetails
      });

      toast.error(msg);
    }
  };

  // Ambient Themes
  const getAmbientThemeBg = () => {
    switch (settings.ambient_theme) {
      case 'golden_harvest':
        return 'from-stone-950 via-amber-950/80 to-stone-950 text-amber-100';
      case 'midnight_dark':
        return 'from-slate-950 via-indigo-950/80 to-slate-950 text-slate-100';
      case 'cosmic_teal':
        return 'from-[#022c22] via-[#042f2e] to-[#022c22] text-teal-100';
      case 'emerald_aurora':
      default:
        return 'from-emerald-950 via-[#064e3b] to-emerald-950 text-emerald-100';
    }
  };

  const getElevationStyles = () => {
    switch (settings.elevation_depth) {
      case 'subtle':
        return 'shadow-xl shadow-black/40 border border-emerald-500/30';
      case 'medium':
        return 'shadow-2xl shadow-emerald-950/70 border border-emerald-500/50';
      case 'high':
        return 'shadow-[0_25px_60px_-15px_rgba(0,0,0,0.8),0_0_35px_rgba(16,185,129,0.3)] border border-emerald-400/60';
      case 'ultra_3d':
      default:
        return 'shadow-[0_35px_90px_-15px_rgba(0,0,0,0.95),0_0_50px_rgba(245,158,11,0.25),0_0_35px_rgba(16,185,129,0.35)] border-2 border-amber-400/60';
    }
  };

  const displayUsers = liveStaffAccounts;

  return (
    <div
      className={`min-h-screen bg-gradient-to-br ${getAmbientThemeBg()} flex flex-col justify-center py-10 px-4 sm:px-6 lg:px-8 font-sans relative overflow-x-hidden transition-colors duration-700`}
      style={{
        perspective: '1200px'
      }}
    >
      {/* 3D Ambient Glowing Mesh Spheres */}
      <div className="absolute top-1/4 -left-32 w-96 h-96 bg-emerald-500/15 rounded-full blur-3xl pointer-events-none animate-pulse" />
      <div className="absolute bottom-1/4 -right-32 w-96 h-96 bg-amber-500/15 rounded-full blur-3xl pointer-events-none animate-pulse" />
      <div className="absolute top-10 right-1/4 w-64 h-64 bg-teal-400/10 rounded-full blur-2xl pointer-events-none" />

      {/* Top Bar Navigation */}
      <div className="sm:mx-auto sm:w-full sm:max-w-2xl flex items-center justify-between mb-6 z-10 px-2">
        <Link
          to="/"
          className="inline-flex items-center space-x-2 text-xs font-bold text-emerald-300/80 hover:text-amber-300 bg-white/5 hover:bg-white/10 backdrop-blur-md px-3.5 py-2 rounded-xl border border-white/10 transition-all hover:scale-105 active:scale-95 shadow-md"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Storefront</span>
        </Link>

        <div className="flex items-center space-x-2">
          <Link
            to="/admin/cms/login-page"
            className="inline-flex items-center space-x-1.5 text-[11px] font-bold text-amber-400 hover:text-amber-300 bg-amber-400/10 hover:bg-amber-400/20 px-3 py-1.5 rounded-xl border border-amber-400/30 transition-all hover:scale-105 active:scale-95 shadow-md"
            title="Open Login Page Studio in CMS"
          >
            <Layers className="w-3.5 h-3.5" />
            <span>CMS Studio</span>
          </Link>
        </div>
      </div>

      {/* Brand Header */}
      <div className="sm:mx-auto sm:w-full sm:max-w-xl text-center space-y-3 z-10 mb-6">
        <div className="flex justify-center transform transition-transform duration-300 hover:scale-105">
          <Logo variant="full" theme="dark" size="xl" showTagline={true} />
        </div>
        <h1 className="text-2xl sm:text-3xl font-serif font-black text-white tracking-tight drop-shadow-md">
          {settings.portal_title}
        </h1>
        <p className="text-xs sm:text-sm text-emerald-300/90 font-medium max-w-lg mx-auto">
          {settings.portal_subtitle}
        </p>
      </div>

      {/* Main 3D Card Container with Mouse Parallax & Specular Glare */}
      <div
        className="sm:mx-auto sm:w-full sm:max-w-xl relative z-10"
        onMouseMove={handleMouseMove}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        {/* Floating 3D Security Badge Pill - USER REQUIREMENT: "Hardware Encrypted Session chnage to Login Page" */}
        {settings.show_floating_badges && (
          <div className="flex justify-center -mb-4 relative z-20">
            <div className="inline-flex items-center space-x-2 px-4 py-1.5 rounded-full bg-gradient-to-r from-emerald-950 via-emerald-900 to-emerald-950 border border-amber-400/60 shadow-[0_8px_20px_rgba(0,0,0,0.6)] backdrop-blur-xl text-[11px] font-extrabold text-amber-300 tracking-wide uppercase">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping inline-block" />
              <Shield className="w-3.5 h-3.5 text-amber-400" />
              <span>
                {settings.floating_badge_text === 'Hardware Encrypted Session'
                  ? 'Login Page'
                  : settings.floating_badge_text || 'Login Page'}
              </span>
            </div>
          </div>
        )}

        {/* 3D Elevated Shell */}
        <div
          ref={cardRef}
          style={{
            transform: settings.enable_3d_tilt
              ? `rotateX(${tilt.x}deg) rotateY(${tilt.y}deg)`
              : 'none',
            transformStyle: 'preserve-3d',
            transition: isHovered ? 'transform 0.08s ease-out' : 'transform 0.5s ease-out'
          }}
          className={`relative rounded-3xl bg-emerald-950/85 backdrop-blur-2xl p-6 sm:p-8 space-y-6 text-white overflow-hidden transition-shadow duration-500 ${getElevationStyles()}`}
        >
          {/* Specular Glare Overlay */}
          {settings.enable_3d_tilt && isHovered && (
            <div
              className="absolute inset-0 pointer-events-none z-30 transition-opacity duration-300"
              style={{
                background: `radial-gradient(circle 320px at ${tilt.glareX}% ${tilt.glareY}%, rgba(255,255,255,0.12), transparent 70%)`
              }}
            />
          )}

          {/* ========================================================================= */}
          {/* USER REQUIREMENT: "erro messaeg not only pop asloe welocome message        */}
          {/* replace error message show"                                               */}
          {/* ========================================================================= */}
          {loginError ? (
            <div
              className={`p-4 rounded-2xl border-2 shadow-lg flex items-start justify-between space-x-3 text-xs animate-fadeIn ${
                loginError.toLowerCase().includes('suspend')
                  ? 'bg-rose-950/95 border-rose-500 shadow-[0_10px_35px_rgba(244,63,94,0.45)] ring-2 ring-rose-500/30'
                  : 'bg-red-950/90 border-red-500/80 shadow-[0_10px_30px_rgba(239,68,68,0.35)]'
              }`}
            >
              <div className="flex items-start space-x-3">
                <div
                  className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 mt-0.5 border ${
                    loginError.toLowerCase().includes('suspend')
                      ? 'bg-rose-900/90 border-rose-400 text-rose-300'
                      : 'bg-red-900/80 border-red-500/60 text-red-300'
                  }`}
                >
                  {loginError.toLowerCase().includes('suspend') ? (
                    <UserX className="w-5 h-5 text-rose-300 animate-pulse" />
                  ) : (
                    <AlertTriangle className="w-4 h-4 text-red-400 animate-pulse" />
                  )}
                </div>
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span
                      className={`font-black uppercase tracking-wider text-[10px] px-2 py-0.5 rounded-md ${
                        loginError.toLowerCase().includes('suspend')
                          ? 'bg-rose-500/30 text-rose-200 border border-rose-400/60'
                          : 'bg-red-500/30 text-red-200 border border-red-400/60'
                      }`}
                    >
                      {loginError.toLowerCase().includes('suspend')
                        ? 'ACCOUNT SUSPENDED'
                        : 'AUTHENTICATION ERROR'}
                    </span>
                    <span className="text-[10px] text-rose-300/80 font-mono">
                      {loginError.toLowerCase().includes('suspend') ? 'Status: Locked' : 'Access Denied'}
                    </span>
                  </div>
                  <p className="leading-relaxed text-white font-medium text-xs">
                    {loginError}
                  </p>
                  {loginError.toLowerCase().includes('suspend') && (
                    <p className="text-[11px] text-rose-200/90 pt-1 border-t border-rose-800/60">
                      ⚠️ Administrative access, store operations, and billing counter privileges are locked for this staff account. Contact help desk: <span className="font-bold underline text-amber-300">{settings.help_desk_contact}</span>
                    </p>
                  )}
                </div>
              </div>
              <button
                type="button"
                onClick={() => setLoginError(null)}
                className="text-red-400 hover:text-white p-1 rounded-lg hover:bg-red-900/60 transition-colors shrink-0 cursor-pointer"
                title="Dismiss error and restore welcome notice"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div className="p-3.5 rounded-2xl bg-emerald-900/50 border border-emerald-700/60 flex items-start space-x-3 text-xs">
              <Info className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              <p className="leading-relaxed text-white font-medium">
                {settings.welcome_message}
              </p>
            </div>
          )}

          {/* Authentication Credentials Form */}
          <form onSubmit={handleSupabaseSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-emerald-200 uppercase tracking-wider mb-1.5">
                Staff Email Address
              </label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-emerald-400 group-focus-within:text-amber-400 transition-colors">
                  <Mail className="w-4 h-4" />
                </div>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (loginError) setLoginError(null);
                  }}
                  placeholder="name@mrvivasayi.in"
                  className="w-full pl-10 pr-4 py-3 bg-emerald-950/90 border border-emerald-700/80 rounded-2xl text-white placeholder-emerald-600 focus:outline-none focus:border-amber-400 focus:ring-4 focus:ring-amber-400/20 transition-all text-xs font-medium shadow-inner"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-bold text-emerald-200 uppercase tracking-wider">
                  Secret Passphrase
                </label>
                <button
                  type="button"
                  onClick={() => setHelpModalOpen(true)}
                  className="text-[11px] font-semibold text-amber-400 hover:text-amber-300 hover:underline transition-colors flex items-center space-x-1"
                >
                  <HelpCircle className="w-3 h-3" />
                  <span>Forgot or Need Help?</span>
                </button>
              </div>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-emerald-400 group-focus-within:text-amber-400 transition-colors">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (loginError) setLoginError(null);
                  }}
                  placeholder="Enter authorized password"
                  className="w-full pl-10 pr-11 py-3 bg-emerald-950/90 border border-emerald-700/80 rounded-2xl text-white placeholder-emerald-600 focus:outline-none focus:border-amber-400 focus:ring-4 focus:ring-amber-400/20 transition-all text-xs font-medium shadow-inner"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-emerald-400 hover:text-amber-400 transition-colors"
                  title={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between text-xs pt-1">
              <label className="flex items-center space-x-2 text-emerald-300 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="w-4 h-4 rounded border-emerald-700 bg-emerald-950 text-amber-500 focus:ring-amber-400 focus:ring-offset-emerald-900"
                />
                <span>Keep hardware session active (14 days)</span>
              </label>
            </div>

            {/* 3D Glossy Submit Button */}
            <button
              type="submit"
              className="w-full relative group overflow-hidden bg-gradient-to-r from-amber-400 via-amber-300 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-emerald-950 font-extrabold py-3.5 px-6 rounded-2xl shadow-[0_10px_25px_rgba(245,158,11,0.35)] transition-all transform hover:-translate-y-0.5 active:translate-y-0.5 text-xs sm:text-sm flex items-center justify-center space-x-2 cursor-pointer"
            >
              <div className="absolute inset-0 bg-white/20 transform -skew-x-12 -translate-x-full group-hover:translate-x-full transition-transform duration-700 ease-out" />
              <UserCheck className="w-4 h-4 text-emerald-950" />
              <span className="tracking-wide">Authorize & Enter Management Portal</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </button>
          </form>

          {/* Security Notice */}
          <p className="text-[10px] text-center text-emerald-400/80 leading-relaxed pt-1 border-t border-emerald-800/60">
            {settings.security_notice}
          </p>

          {/* ========================================================================= */}
          {/* USER REQUIREMENT: DEFAULT IS OFF!                                          */}
          {/* "⚡ Click to Show Demo Staff Accounts don't show if cms page true          */}
          {/*  after show deaflut off"                                                   */}
          {/* ========================================================================= */}
          {Boolean(settings.allow_demo_toggle) === true && (
            <div className="pt-2 border-t border-emerald-800/80 space-y-3">
              <button
                type="button"
                onClick={() => {
                  const nextState = !showDemoUsers;
                  setShowDemoUsers(nextState);
                  if (nextState) {
                    toast.success('Staff Accounts Expanded');
                  }
                }}
                className={`w-full flex items-center justify-between p-3.5 rounded-2xl border transition-all duration-300 font-bold text-xs shadow-md cursor-pointer ${
                  showDemoUsers
                    ? 'bg-amber-400/15 border-amber-400/60 text-amber-300'
                    : 'bg-emerald-900/60 hover:bg-emerald-900 border-emerald-700/80 text-emerald-200 hover:text-white'
                }`}
              >
                <div className="flex items-center space-x-2.5">
                  <div
                    className={`w-7 h-7 rounded-xl flex items-center justify-center transition-colors ${
                      showDemoUsers
                        ? 'bg-amber-400 text-emerald-950 shadow-md'
                        : 'bg-emerald-800 text-amber-300'
                    }`}
                  >
                    <Sparkles className="w-4 h-4" />
                  </div>
                  <div className="text-left">
                    <div className="font-extrabold text-xs tracking-wide">
                      {showDemoUsers
                        ? '⚡ Hide Staff Accounts'
                        : '⚡ Click to Show Demo Staff Accounts'}
                    </div>
                    <div className="text-[10px] opacity-75 font-normal">
                      {showDemoUsers
                        ? 'Showing 5 authorized staff roles (Super Admin, Admin, Inventory, Staff, Sales)'
                        : 'Default is off. Click to view authorized staff roles'}
                    </div>
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <span
                    className={`text-[9px] uppercase px-2 py-0.5 rounded-full font-mono font-bold ${
                      showDemoUsers
                        ? 'bg-amber-400/20 text-amber-300 border border-amber-400/40'
                        : 'bg-emerald-950 text-emerald-400 border border-emerald-700'
                    }`}
                  >
                    {showDemoUsers ? 'Expanded' : '5 Roles'}
                  </span>
                  {showDemoUsers ? (
                    <ChevronUp className="w-4 h-4 text-amber-400" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-emerald-400" />
                  )}
                </div>
              </button>

              {/* Accordion List of Demo Users (Admin and Super Admin Included) */}
              {showDemoUsers && (
                <div className="animate-fadeIn space-y-2.5 pt-1">
                  <div className="flex items-center justify-between text-[11px] text-emerald-300/80 px-1 font-semibold">
                    <span>{settings.demo_users_title}</span>
                    <span className="text-[10px] text-amber-400 font-mono">1-Click Fast Auth</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-80 overflow-y-auto pr-1 custom-scrollbar">
                    {displayUsers.map((u: UserProfile) => {
                      const isSuper = u.role === 'SUPER_ADMIN' || u.role === 'OWNER';
                      const isAdmin = u.role === 'ADMIN';
                      const isInventory = u.role === 'INVENTORY_MANAGER' || u.role === 'PRODUCT_MANAGER';
                      const isSuspended = u.status === 'SUSPENDED' || u.is_active === false;

                      return (
                        <div
                          key={u.id || u.email}
                          className={`group relative p-3 rounded-2xl transition-all duration-200 shadow-md flex flex-col justify-between space-y-2 border ${
                            isSuspended
                              ? 'bg-rose-950/70 hover:bg-rose-950/90 border-rose-500/60 hover:border-rose-400 ring-1 ring-rose-500/20'
                              : 'bg-emerald-950/90 hover:bg-emerald-900 border-emerald-700/70 hover:border-amber-400/70'
                          }`}
                        >
                          <div>
                            <div className="flex items-center justify-between gap-1 flex-wrap">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span
                                  className={`text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md ${
                                    isSuper
                                      ? 'bg-amber-400/25 text-amber-300 border border-amber-400/50'
                                      : isAdmin
                                      ? 'bg-indigo-400/25 text-indigo-300 border border-indigo-400/50'
                                      : isInventory
                                      ? 'bg-teal-400/20 text-teal-300 border border-teal-400/40'
                                      : 'bg-emerald-400/20 text-emerald-300 border border-emerald-400/40'
                                  }`}
                                >
                                  {u.role}
                                </span>
                                {isSuspended && (
                                  <span className="text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded-md bg-rose-500/30 text-rose-300 border border-rose-400/50 flex items-center gap-0.5">
                                    <UserX className="w-2.5 h-2.5 text-rose-300" />
                                    SUSPENDED
                                  </span>
                                )}
                              </div>

                              {/* USER REQUIREMENT: "dont expose passwrod on click to login" */}
                              <button
                                type="button"
                                onClick={() => handleQuickFill(u)}
                                className="text-[10px] text-emerald-400 hover:text-amber-300 flex items-center space-x-1 opacity-70 group-hover:opacity-100 transition-opacity cursor-pointer shrink-0"
                                title="Copy email address into login box (Password is never exposed)"
                              >
                                {copiedEmail === u.email ? (
                                  <Check className="w-3 h-3 text-emerald-400" />
                                ) : (
                                  <Copy className="w-3 h-3" />
                                )}
                                <span>Select Email</span>
                              </button>
                            </div>

                            <div className="font-bold text-xs text-white group-hover:text-amber-300 transition-colors mt-1.5 flex items-center justify-between">
                              <span>{u.full_name}</span>
                              {isSuspended && (
                                <span className="text-[9px] font-mono text-rose-400 font-semibold">Locked</span>
                              )}
                            </div>
                            <div className="text-[10px] text-emerald-400 font-mono truncate">
                              {u.email}
                            </div>
                          </div>

                          {/* USER REQUIREMENT: "1-click lauch session clikc are u sue what login pop show" */}
                          <button
                            type="button"
                            onClick={() => {
                              if (isSuspended) {
                                const errorMsg = `Account Suspended: The account for ${u.full_name} (${u.email}) has been suspended by the administrator. Login access is denied.`;
                                setLoginError(errorMsg);
                                setAuthErrorModal({
                                  isOpen: true,
                                  title: 'Account Suspended',
                                  message: errorMsg,
                                  details: 'This staff account has been placed on administrative suspension. All system access, billing counter permissions, and dashboard credentials are locked. Contact your store administrator to reinstate your account.'
                                });
                                toast.error(`Account Suspended: ${u.full_name} is suspended.`);
                                return;
                              }
                              setConfirmLoginUser(u);
                            }}
                            className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-xl font-bold text-[10px] border transition-all cursor-pointer ${
                              isSuspended
                                ? 'bg-rose-950/80 hover:bg-rose-900 text-rose-300 border-rose-700/80'
                                : 'bg-emerald-900/80 hover:bg-amber-400 hover:text-emerald-950 text-emerald-200 border-emerald-700/60'
                            }`}
                          >
                            {isSuspended ? (
                              <>
                                <span className="flex items-center gap-1 text-rose-300">
                                  <UserX className="w-3 h-3 text-rose-400" />
                                  <span>Account Suspended (Locked)</span>
                                </span>
                                <Lock className="w-3 h-3 text-rose-400" />
                              </>
                            ) : (
                              <>
                                <span>1-Click Launch Session</span>
                                <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
                              </>
                            )}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Footer Support Info - USER REQUIREMENT: CMS controlled, NO REDIRECT TO ANY PAGE */}
      <div className="mt-8 text-center text-xs text-emerald-300/80 space-y-1 relative z-10">
        <div>
          <span>Administrative Support Contact: </span>
          <span className="text-white font-bold">{settings.help_desk_contact}</span>
        </div>
        <p className="text-[10px] text-emerald-400/60">
          MR. VIVASAYI Enterprise Agri-Commerce ERP &copy; {new Date().getFullYear()}
        </p>
      </div>

      {/* ========================================================================= */}
      {/* POP MODAL: Confirm 1-Click Demo Login Modal                                */}
      {/* USER REQUIREMENT: "1-click lauch session clikc are u sue what login pop"  */}
      {/* ========================================================================= */}
      {confirmLoginUser && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[130] flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-emerald-950 border-2 border-amber-400/80 rounded-3xl max-w-sm w-full p-6 space-y-5 shadow-[0_25px_60px_rgba(245,158,11,0.4)] text-white text-center relative overflow-hidden">
            <div className="w-14 h-14 rounded-2xl bg-amber-400/20 border border-amber-400/50 flex items-center justify-center mx-auto text-amber-300">
              <Sparkles className="w-7 h-7" />
            </div>

            <div className="space-y-1">
              <span className="text-[10px] font-extrabold uppercase tracking-widest text-amber-300 bg-amber-400/10 border border-amber-400/30 px-3 py-1 rounded-full inline-block">
                Staff Authentication Confirmation
              </span>
              <h3 className="text-lg font-black text-white mt-1">
                Are you sure you want to log in?
              </h3>
              <p className="text-xs text-emerald-200">
                You are about to establish an authenticated role session as:
              </p>
            </div>

            <div className="p-3.5 rounded-2xl bg-emerald-900/60 border border-emerald-700 text-left space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="font-bold text-white text-xs">{confirmLoginUser.full_name}</span>
                <span className="text-[9px] font-mono font-black uppercase px-2 py-0.5 rounded bg-amber-400/20 text-amber-300 border border-amber-400/40">
                  {confirmLoginUser.role}
                </span>
              </div>
              <div className="text-[11px] text-emerald-300 font-mono truncate">
                {confirmLoginUser.email}
              </div>
              <div className="text-[10px] text-emerald-400/80 pt-0.5">
                Department: {confirmLoginUser.department}
              </div>
              {(confirmLoginUser.status === 'SUSPENDED' || confirmLoginUser.is_active === false) && (
                <div className="p-2 rounded-xl bg-rose-950/80 border border-rose-500/80 text-[11px] text-rose-200 flex items-center gap-2 mt-2">
                  <UserX className="w-4 h-4 text-rose-400 shrink-0" />
                  <span>Warning: This staff account is currently suspended. Login access will be rejected.</span>
                </div>
              )}
            </div>

            <div className="flex items-center gap-2 pt-1">
              <button
                type="button"
                onClick={() => {
                  const target = confirmLoginUser;
                  setConfirmLoginUser(null);
                  handleDemoLogin(target.role as UserRole, target);
                }}
                className="flex-1 py-3 px-4 rounded-xl bg-amber-400 hover:bg-amber-300 text-emerald-950 font-bold text-xs transition-all shadow-md cursor-pointer flex items-center justify-center space-x-1.5"
              >
                <UserCheck className="w-4 h-4" />
                <span>Yes, Log In</span>
              </button>

              <button
                type="button"
                onClick={() => setConfirmLoginUser(null)}
                className="py-3 px-4 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs transition-colors cursor-pointer"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* POP MODAL 1: Multi-Step Percentage Authentication Progress Modal          */}
      {/* ========================================================================= */}
      {authProgressModal.isOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[120] flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-emerald-950 border-2 border-amber-400/60 rounded-3xl max-w-sm w-full p-7 text-center space-y-5 shadow-[0_25px_60px_rgba(0,0,0,0.9)] text-white relative overflow-hidden">
            {/* Ambient Background Glow */}
            <div className="absolute -top-12 -left-12 w-32 h-32 bg-amber-500/20 rounded-full blur-2xl pointer-events-none" />
            <div className="absolute -bottom-12 -right-12 w-32 h-32 bg-emerald-500/20 rounded-full blur-2xl pointer-events-none" />

            {/* Circular Spinner with Percentage */}
            <div className="relative w-24 h-24 mx-auto flex items-center justify-center">
              <div className="absolute inset-0 rounded-full border-4 border-emerald-900" />
              <div className="absolute inset-0 rounded-full border-4 border-amber-400 border-t-transparent animate-spin" />
              <div className="flex flex-col items-center justify-center relative z-10">
                <span className="text-xl font-black text-amber-300 font-mono tracking-tighter">
                  {authProgressModal.progress}%
                </span>
                <span className="text-[8px] uppercase tracking-wider font-extrabold text-emerald-400">
                  AUTH
                </span>
              </div>
            </div>

            <div className="space-y-1">
              <span className="text-[10px] font-extrabold uppercase tracking-widest text-amber-300 bg-amber-400/10 border border-amber-400/30 px-3 py-1 rounded-full inline-flex items-center gap-1.5 shadow-sm">
                <Cpu className="w-3 h-3 text-amber-400" />
                Step {authProgressModal.stepIndex} of 4
              </span>
              <h3 className="text-lg font-black text-white mt-2">
                {authProgressModal.stepTitle}
              </h3>
              <p className="text-xs text-emerald-300/80 font-medium">
                {authProgressModal.stepDescription}
              </p>
            </div>

            {/* Step Checkpoints */}
            <div className="space-y-1.5 text-left bg-emerald-900/40 p-3 rounded-2xl border border-emerald-800 text-[11px]">
              <div
                className={`flex items-center space-x-2 ${
                  authProgressModal.progress >= 20 ? 'text-amber-300 font-bold' : 'text-emerald-500'
                }`}
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>1. Verify input syntax & sanitation</span>
              </div>
              <div
                className={`flex items-center space-x-2 ${
                  authProgressModal.progress >= 50 ? 'text-amber-300 font-bold' : 'text-emerald-500'
                }`}
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>2. Compute cryptographic SHA-256 hash</span>
              </div>
              <div
                className={`flex items-center space-x-2 ${
                  authProgressModal.progress >= 80 ? 'text-amber-300 font-bold' : 'text-emerald-500'
                }`}
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>3. Query live PostgreSQL database</span>
              </div>
              <div
                className={`flex items-center space-x-2 ${
                  authProgressModal.progress >= 100 ? 'text-amber-300 font-bold' : 'text-emerald-500'
                }`}
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>4. Verify cryptographic session & tokens</span>
              </div>
            </div>

            {/* Progress Bar */}
            <div className="w-full bg-emerald-900 rounded-full h-2 overflow-hidden border border-emerald-700/60">
              <div
                className="bg-gradient-to-r from-amber-400 to-emerald-400 h-full transition-all duration-300 ease-out"
                style={{ width: `${authProgressModal.progress}%` }}
              />
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* POP MODAL 2: High-Impact Authentication Error Pop Modal                    */}
      {/* USER REQUIREMENT: No WhatsApp redirect; shows contact admin message from   */}
      {/* CMS without redirecting to external pages; No Default Passwords shown     */}
      {/* ========================================================================= */}
      {authErrorModal.isOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[120] flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-emerald-950 border-2 border-red-500/80 rounded-3xl max-w-md w-full p-6 sm:p-7 space-y-5 shadow-[0_25px_60px_rgba(239,68,68,0.3)] text-white relative overflow-hidden">
            <div className="absolute -top-12 -right-12 w-32 h-32 bg-red-500/20 rounded-full blur-2xl pointer-events-none" />

            <div className="flex items-center space-x-3 text-red-400">
              <div
                className={`w-12 h-12 rounded-2xl border flex items-center justify-center shrink-0 ${
                  authErrorModal.title.toLowerCase().includes('suspend')
                    ? 'bg-rose-900/80 border-rose-500 text-rose-300'
                    : 'bg-red-900/60 border-red-500/60 text-red-400'
                }`}
              >
                {authErrorModal.title.toLowerCase().includes('suspend') ? (
                  <UserX className="w-6 h-6 text-rose-300 animate-pulse" />
                ) : (
                  <ShieldAlert className="w-6 h-6 text-red-400 animate-pulse" />
                )}
              </div>
              <div>
                <h3 className="text-lg font-black text-white">{authErrorModal.title}</h3>
                <span
                  className={`text-[10px] uppercase tracking-wider font-extrabold px-2 py-0.5 rounded-full inline-block mt-0.5 ${
                    authErrorModal.title.toLowerCase().includes('suspend')
                      ? 'bg-rose-500/30 text-rose-200 border border-rose-400/50'
                      : 'bg-red-500/30 text-red-300 border border-red-400/40'
                  }`}
                >
                  {authErrorModal.title.toLowerCase().includes('suspend')
                    ? 'Status: Suspended'
                    : 'Access Denied'}
                </span>
              </div>
            </div>

            <div
              className={`p-3.5 rounded-2xl border text-xs leading-relaxed ${
                authErrorModal.title.toLowerCase().includes('suspend')
                  ? 'bg-rose-950/80 border-rose-800 text-rose-200'
                  : 'bg-red-950/60 border-red-800 text-red-200'
              }`}
            >
              <div className="font-bold text-white mb-1">{authErrorModal.message}</div>
              <p className="text-[11px] opacity-90">{authErrorModal.details}</p>
            </div>

            {/* Contact Our Admin Message - Controlled by CMS (No external redirect) */}
            <div className="p-3.5 rounded-2xl bg-emerald-900/50 border border-emerald-700/60 text-xs space-y-1.5">
              <div className="font-bold text-amber-300 flex items-center gap-1.5 text-xs">
                <Info className="w-3.5 h-3.5 text-amber-400" />
                <span>Contact System Administrator</span>
              </div>
              <p className="text-white text-[11px] leading-relaxed">
                {settings.contact_admin_message ||
                  'Please contact our system administrator or operations management desk to request access authorization or password reset.'}
              </p>
              <div className="text-[11px] text-emerald-300 font-semibold pt-0.5">
                Designated Help Desk: <span className="font-mono text-white">{settings.help_desk_contact}</span>
              </div>
            </div>

            <div className="flex items-center gap-2.5 pt-1">
              {Boolean(settings.allow_demo_toggle) === true && (
                <button
                  type="button"
                  onClick={() => {
                    setAuthErrorModal({ isOpen: false, title: '', message: '' });
                    setShowDemoUsers(true);
                  }}
                  className="flex-1 py-2.5 px-4 rounded-xl bg-amber-400 hover:bg-amber-300 text-emerald-950 font-bold text-xs transition-colors flex items-center justify-center space-x-1.5 shadow-md cursor-pointer"
                >
                  <Sparkles className="w-3.5 h-3.5 text-emerald-950" />
                  <span>Show Staff Accounts</span>
                </button>
              )}

              <button
                type="button"
                onClick={() => setAuthErrorModal({ isOpen: false, title: '', message: '' })}
                className="flex-1 py-2.5 px-4 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs transition-colors cursor-pointer text-center"
              >
                Try Again
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* POP MODAL 3: Validation Warning Pop Modal (Missing Inputs)                 */}
      {/* ========================================================================= */}
      {validationModal.isOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[120] flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-emerald-950 border-2 border-amber-400/80 rounded-3xl max-w-sm w-full p-6 space-y-4 shadow-[0_25px_60px_rgba(245,158,11,0.3)] text-white text-center relative overflow-hidden">
            <div className="w-12 h-12 rounded-2xl bg-amber-400/20 border border-amber-400/50 flex items-center justify-center mx-auto text-amber-300">
              <AlertTriangle className="w-6 h-6" />
            </div>

            <div className="space-y-1">
              <h3 className="text-lg font-black text-white">Missing Required Field</h3>
              <p className="text-xs text-amber-200">
                Please enter your{' '}
                <span className="font-bold underline text-white">
                  {validationModal.missingField}
                </span>{' '}
                before initiating authentication.
              </p>
            </div>

            <button
              type="button"
              onClick={() => setValidationModal({ isOpen: false, missingField: '' })}
              className="w-full py-2.5 px-4 rounded-xl bg-amber-400 hover:bg-amber-300 text-emerald-950 font-bold text-xs transition-all shadow-md cursor-pointer"
            >
              Acknowledge & Complete Field
            </button>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* POP MODAL 4: Help & Password Recovery Pop Modal                           */}
      {/* USER REQUIREMENT: "Default Test Password: remove Message Admin on         */}
      {/* WhatsApp remove add conatc our admin message not redirect any page"       */}
      {/* ========================================================================= */}
      {helpModalOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[120] flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-emerald-950 border-2 border-emerald-500/80 rounded-3xl max-w-md w-full p-6 sm:p-7 space-y-5 shadow-2xl text-white relative overflow-hidden">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-2xl bg-emerald-900 border border-emerald-600 flex items-center justify-center text-amber-300 shrink-0">
                <HelpCircle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-lg font-black text-white">Staff Support & Recovery</h3>
                <span className="text-[10px] text-emerald-400 uppercase font-mono font-bold">
                  Security Operations Desk
                </span>
              </div>
            </div>

            <p className="text-xs text-white leading-relaxed">
              For security compliance, admin passwords cannot be reset via public email links. All
              credential resets must be verified through the authorized administrator.
            </p>

            {/* Contact Our Admin Message - Controlled by CMS (No external redirect) */}
            <div className="space-y-2 bg-emerald-900/50 p-4 rounded-2xl border border-emerald-800 text-xs">
              <div className="flex items-center space-x-2 text-amber-300 font-bold text-xs">
                <Shield className="w-4 h-4" />
                <span>Contact Administrator Instructions</span>
              </div>
              <p className="text-white text-xs leading-relaxed">
                {settings.contact_admin_message ||
                  'Please contact our system administrator or operations management desk to request access authorization or password reset.'}
              </p>
              <div className="flex items-center justify-between pt-1 border-t border-emerald-800/60">
                <span className="text-emerald-400 font-semibold">Assigned Help Desk:</span>
                <span className="font-mono text-amber-300 font-bold">{settings.help_desk_contact}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-emerald-400 font-semibold">Verification Method:</span>
                <span className="text-white">Internal Staff Identity Verification</span>
              </div>
            </div>

            <div className="flex items-center justify-end pt-2">
              <button
                type="button"
                onClick={() => setHelpModalOpen(false)}
                className="w-full py-3 px-4 rounded-xl bg-amber-400 hover:bg-amber-300 text-emerald-950 font-bold text-xs transition-colors shadow-md text-center cursor-pointer"
              >
                Understood / Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminLoginPage;
