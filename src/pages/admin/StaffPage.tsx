import React, { useState, useEffect, useMemo } from 'react';
import {
  Users, UserPlus, ShieldCheck, Key, Search, Plus, CheckCircle2,
  XCircle, Edit2, Lock, Mail, Phone, Shield, Check, X, AlertCircle,
  FileText, Eye, EyeOff, Trash2, Calendar, Briefcase, Building, Sparkles,
  RefreshCw, RotateCcw, UserX, UserCheck, ShieldAlert, LogIn, Download, Dices,
  ChevronDown, ChevronRight, Copy, CheckSquare, Square, Sliders, Layers, ArrowUpDown
} from 'lucide-react';
import { getJSONStore, setJSONStore } from '../../lib/dbManager';
import { UserRole, UserProfile } from '../../types';
import { useAuth } from '../../contexts/AuthContext';
import { useNotifications } from '../../contexts/NotificationContext';
import { RefreshSpinnerModal } from '../../components/common/RefreshSpinnerModal';
import { AutoRefreshDropdown } from '../../components/common/AutoRefreshDropdown';
import { ExportFormatModal, ExportFormat } from '../../components/common/ExportFormatModal';
import { hashPassword } from '../../lib/security';
import { AdminPageSkeleton } from '../../components/common/Skeleton';
import toast from 'react-hot-toast';
import {
  PermissionAction,
  ALL_PERMISSION_ACTIONS,
  HIERARCHICAL_PERMISSION_TREE,
  DEFAULT_SYSTEM_ROLES,
  USER_GROUPS,
  DEPARTMENTS,
  duplicateRole,
  buildDefaultRolePermissions,
  RoleDefinition,
  RolePermissionsMap
} from '../../lib/permissionsConfig';

interface StaffPageProps {
  initialTab?: 'all' | 'create' | 'deleted' | 'permissions' | 'roles';
}

export interface ExtendedStaffMember extends UserProfile {
  bio: string;
  designation: string;
  department: string;
  user_group: string;
  emergency_contact: string;
  joining_date: string;
  password?: string;
  status: 'ACTIVE' | 'SUSPENDED' | 'DELETED';
  deleted_at?: string;
  deleted_by?: string;
}

// ─── USER ID & FORMATTING HELPERS ──────────────────────────────────────────────
export const formatUserId = (id: string | number): string => {
  if (!id) return '0001';
  const str = String(id).trim();
  const digits = str.replace(/\D/g, '');
  if (digits) {
    if (digits.length > 5) {
      const parsed = parseInt(digits.slice(-4), 10);
      return String(parsed || 1).padStart(4, '0');
    }
    return digits.padStart(4, '0');
  }
  return str;
};

export const getNextUserId = (active: ExtendedStaffMember[], deleted: ExtendedStaffMember[]): string => {
  const all = [...active, ...deleted];
  let maxId = 0;
  for (const u of all) {
    if (!u.id) continue;
    const digits = String(u.id).replace(/\D/g, '');
    if (digits) {
      const num = parseInt(digits, 10);
      if (!isNaN(num) && num < 10000 && num > maxId) {
        maxId = num;
      }
    }
  }
  return String(maxId + 1).padStart(4, '0');
};

export const getDisplayPassword = (staff: ExtendedStaffMember): string => {
  if (staff.password && !staff.password.startsWith('sha256:')) {
    return staff.password;
  }
  return '@@12345678@@';
};

export const formatTimestamp = (dateStr?: string | null): string => {
  if (!dateStr) return 'Never logged in';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  } catch {
    return dateStr;
  }
};

// ─── 3D ROLE BADGES ─────────────────────────────────────────────────────────────
export const get3DRoleBadge = (role: string, customTitle?: string) => {
  const roleUpper = (role || '').toUpperCase();
  let gradient = 'from-slate-700 via-gray-700 to-zinc-800 text-white shadow-slate-900/30 ring-slate-400/30';
  let dotColor = 'bg-slate-300';
  let defaultTitle = role;

  if (roleUpper === 'SUPER_ADMIN') {
    gradient = 'from-rose-600 via-pink-600 to-red-600 text-white shadow-rose-500/40 ring-rose-400/50';
    dotColor = 'bg-rose-200';
    defaultTitle = 'Super Administrator';
  } else if (roleUpper === 'OWNER') {
    gradient = 'from-amber-500 via-yellow-500 to-orange-500 text-slate-950 shadow-amber-500/40 ring-amber-400/50';
    dotColor = 'bg-slate-950';
    defaultTitle = 'Business Owner';
  } else if (roleUpper === 'ADMIN') {
    gradient = 'from-emerald-600 via-teal-600 to-green-700 text-white shadow-emerald-500/40 ring-emerald-400/50';
    dotColor = 'bg-emerald-200';
    defaultTitle = 'Store Administrator';
  } else if (roleUpper === 'STORE_MANAGER') {
    gradient = 'from-teal-500 via-emerald-600 to-cyan-600 text-white shadow-teal-500/40 ring-teal-400/50';
    dotColor = 'bg-teal-200';
    defaultTitle = 'Store Manager';
  } else if (roleUpper === 'BILLING_MANAGER') {
    gradient = 'from-blue-600 via-indigo-600 to-sky-600 text-white shadow-blue-500/40 ring-blue-400/50';
    dotColor = 'bg-blue-200';
    defaultTitle = 'Billing & POS Lead';
  } else if (roleUpper === 'PRODUCT_MANAGER') {
    gradient = 'from-purple-600 via-fuchsia-600 to-pink-600 text-white shadow-purple-500/40 ring-purple-400/50';
    dotColor = 'bg-purple-200';
    defaultTitle = 'Product & Catalog';
  } else if (roleUpper === 'INVENTORY_MANAGER') {
    gradient = 'from-orange-500 via-amber-600 to-red-500 text-white shadow-orange-500/40 ring-orange-400/50';
    dotColor = 'bg-orange-200';
    defaultTitle = 'Inventory Lead';
  } else if (roleUpper === 'SALES_STAFF') {
    gradient = 'from-cyan-600 via-teal-600 to-blue-600 text-white shadow-cyan-500/40 ring-cyan-400/50';
    dotColor = 'bg-cyan-200';
    defaultTitle = 'Sales & POS Cashier';
  } else if (roleUpper === 'DELIVERY_STAFF') {
    gradient = 'from-indigo-600 via-violet-600 to-blue-700 text-white shadow-indigo-500/40 ring-indigo-400/50';
    dotColor = 'bg-indigo-200';
    defaultTitle = 'Delivery Agent';
  } else if (roleUpper === 'STAFF') {
    gradient = 'from-gray-700 via-slate-700 to-zinc-800 text-white shadow-gray-600/30 ring-gray-400/40';
    dotColor = 'bg-gray-300';
    defaultTitle = 'General Staff';
  } else if (roleUpper === 'VIEWER') {
    gradient = 'from-slate-600 via-slate-700 to-gray-700 text-white shadow-slate-600/30 ring-slate-400/40';
    dotColor = 'bg-slate-300';
    defaultTitle = 'Read-Only Auditor';
  }

  const title = customTitle || defaultTitle;

  return (
    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-[10px] font-black uppercase tracking-wider bg-gradient-to-r ${gradient} shadow-md border border-white/25 ring-1 transform hover:scale-105 transition-all select-none`}>
      <span className={`w-1.5 h-1.5 rounded-full ${dotColor} shadow-xs`}></span>
      <span>{title}</span>
    </span>
  );
};

export interface ActionConfirmModalState {
  isOpen: boolean;
  type: 'suspend' | 'activate' | 'delete' | 'restore' | 'reset_password' | 'bulk_suspend' | 'bulk_activate' | 'bulk_delete';
  title: string;
  subtitle: string;
  targetStaff?: ExtendedStaffMember;
  selectedCount?: number;
  confirmButtonText: string;
  confirmButtonColor: 'rose' | 'amber' | 'emerald' | 'blue' | 'purple';
  onConfirm: () => void | Promise<void>;
}

export default function StaffPage({ initialTab = 'all' }: StaffPageProps) {
  const { user: currentUser, switchDemoUser } = useAuth();
  const { addNotification } = useNotifications();
  const [activeTab, setActiveTab] = useState<'all' | 'create' | 'deleted' | 'permissions' | 'roles'>(initialTab);

  useEffect(() => {
    setActiveTab(initialTab);
  }, [initialTab]);

  // Check if current authenticated user has Super Admin or Owner privileges
  const isSuperAdmin = currentUser?.role === 'SUPER_ADMIN' || currentUser?.role === 'OWNER';

  // Main State with LocalStorage & Supabase Persistence
  const [staffList, setStaffList] = useState<ExtendedStaffMember[]>([]);
  const [deletedStaffList, setDeletedStaffList] = useState<ExtendedStaffMember[]>([]);
  const [rolesInfo, setRolesInfo] = useState<RoleDefinition[]>(DEFAULT_SYSTEM_ROLES);
  const [loading, setLoading] = useState(true);

  // Pagination state: 10 per page default
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(10);

  // Multi-select state
  const [selectedStaffIds, setSelectedStaffIds] = useState<string[]>([]);

  // Pop modal confirmation state
  const [actionConfirmModal, setActionConfirmModal] = useState<ActionConfirmModalState | null>(null);

  // 15-second countdown timer for switching user modal
  const [switchCountdown, setSwitchCountdown] = useState<number>(15);

  // Password visibility state in modals
  const [showAllPasswords, setShowAllPasswords] = useState<boolean>(true);
  const [rowPasswordVisible, setRowPasswordVisible] = useState<Record<string, boolean>>({});
  const [viewModalPasswordVisible, setViewModalPasswordVisible] = useState<boolean>(true);

  const toggleRowPassword = (id: string) => {
    setRowPasswordVisible(prev => ({
      ...prev,
      [id]: prev[id] !== undefined ? !prev[id] : !showAllPasswords
    }));
  };

  // Sorting state: default is recent login first
  const [sortBy, setSortBy] = useState<'recent_login' | 'newest' | 'id_asc' | 'id_desc' | 'name_asc'>('recent_login');

  useEffect(() => {
    Promise.all([
      getJSONStore<ExtendedStaffMember>('users'),
      getJSONStore<ExtendedStaffMember>('deleted_users'),
      getJSONStore<RoleDefinition>('roles')
    ]).then(([l, del, r]) => {
      // Clean and normalize all users to guarantee proper ACTIVE vs SUSPENDED status
      const normalizedUsers = (l || []).map(u => {
        const isDeleted = u.status === 'DELETED';
        const isSuspended = u.status === 'SUSPENDED' || u.is_active === false;
        const resolvedStatus: 'ACTIVE' | 'SUSPENDED' | 'DELETED' = isDeleted ? 'DELETED' : (isSuspended ? 'SUSPENDED' : 'ACTIVE');
        return {
          ...u,
          status: resolvedStatus,
          is_active: resolvedStatus === 'ACTIVE'
        };
      });

      const activeOnly = normalizedUsers.filter(u => u.status !== 'DELETED');
      const legacyDeleted = normalizedUsers.filter(u => u.status === 'DELETED');
      const allDeleted = [...(del || []), ...legacyDeleted].map(d => ({
        ...d,
        status: 'DELETED' as const,
        is_active: false
      }));

      // Deduplicate deleted list
      const dedupMap = new Map<string, ExtendedStaffMember>();
      allDeleted.forEach(d => dedupMap.set(d.id, d));
      const cleanDeleted = Array.from(dedupMap.values());

      setStaffList(activeOnly);
      setDeletedStaffList(cleanDeleted);

      if (legacyDeleted.length > 0) {
        setJSONStore('users', activeOnly).catch(() => {});
        setJSONStore('deleted_users', cleanDeleted).catch(() => {});
      }

      if (r && r.length) {
        // Ensure every loaded role has complete permissions structure
        const hydrated = r.map(role => ({
          ...role,
          permissions: role.permissions || buildDefaultRolePermissions(role.role)
        }));
        setRolesInfo(hydrated);
      } else {
        // Initialize default system roles with permissions
        const defaultRoles = DEFAULT_SYSTEM_ROLES.map(role => ({
          ...role,
          permissions: role.permissions || buildDefaultRolePermissions(role.role)
        }));
        setRolesInfo(defaultRoles);
        setJSONStore('roles', defaultRoles);
      }
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (staffList.length > 0) {
      try {
        setJSONStore('users', staffList);
      } catch (e) {
        console.error('Failed to save staff list to users store', e);
      }
    }
  }, [staffList]);

  useEffect(() => {
    if (deletedStaffList.length > 0) {
      try {
        setJSONStore('deleted_users', deletedStaffList);
      } catch (e) {
        console.error('Failed to save deleted_users store', e);
      }
    }
  }, [deletedStaffList]);

  useEffect(() => {
    if (rolesInfo.length > 0) {
      try {
        setJSONStore('roles', rolesInfo);
      } catch (e) {
        console.error('Failed to save roles info to store', e);
      }
    }
  }, [rolesInfo]);

  // Filters state
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRoleFilter, setSelectedRoleFilter] = useState<string>('ALL');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<string>('ALL');
  const [selectedDeptFilter, setSelectedDeptFilter] = useState<string>('ALL');

  // Modals state
  const [viewingStaff, setViewingStaff] = useState<ExtendedStaffMember | null>(null);
  const [editingStaff, setEditingStaff] = useState<ExtendedStaffMember | null>(null);
  const [deletingStaff, setDeletingStaff] = useState<ExtendedStaffMember | null>(null);
  const [switchingUser, setSwitchingUser] = useState<ExtendedStaffMember | null>(null);
  const [showExportModal, setShowExportModal] = useState(false);

  // Role Modals
  const [showCreateRoleModal, setShowCreateRoleModal] = useState(false);
  const [editingRole, setEditingRole] = useState<RoleDefinition | null>(null);
  const [duplicatingRole, setDuplicatingRole] = useState<RoleDefinition | null>(null);
  const [deletingRole, setDeletingRole] = useState<RoleDefinition | null>(null);

  const [duplicateForm, setDuplicateForm] = useState({
    title: '',
    code: '',
  });

  const [newCustomRole, setNewCustomRole] = useState({
    title: '',
    code: '',
    level: 3,
    department: DEPARTMENTS[0],
    desc: '',
    badgeColor: 'bg-indigo-100 text-indigo-800 border-indigo-200'
  });

  // Create Staff Form state
  const [newStaff, setNewStaff] = useState({
    full_name: '',
    email: '',
    phone: '',
    role: 'STAFF' as UserRole | string,
    user_group: USER_GROUPS[0],
    department: DEPARTMENTS[0],
    designation: 'Operations Assistant',
    joining_date: new Date().toISOString().split('T')[0],
    bio: 'Dedicated MR. VIVASAYI team member.',
    emergency_contact: '+91 98765 00000',
    password: '@@12345678@@',
    status: 'ACTIVE' as 'ACTIVE' | 'SUSPENDED' | 'DELETED'
  });

  // Helper: Generate Random Password
  const generateRandomPassword = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
    let result = '';
    for (let i = 0; i < 10; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  };

  // Refresh Spinner state
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [autoRefreshSec, setAutoRefreshSec] = useState<number>(0);

  // Live Auto-Refresh Interval
  useEffect(() => {
    if (!autoRefreshSec || autoRefreshSec <= 0) return;
    const interval = setInterval(() => {
      setIsRefreshing(true);
    }, autoRefreshSec * 1000);
    return () => clearInterval(interval);
  }, [autoRefreshSec]);

  const [actionLoading, setActionLoading] = useState<{ isOpen: boolean; title: string; subtitle: string } | null>(null);

  // Password visibility toggle states
  const [showPasswordInEdit, setShowPasswordInEdit] = useState(false);
  const [showPasswordInCreate, setShowPasswordInCreate] = useState(false);
  const [editPasswordInput, setEditPasswordInput] = useState('');

  // ─── PERMISSION MATRIX STATE ────────────────────────────────────────────────
  const [permissionTargetType, setPermissionTargetType] = useState<'ROLE' | 'STAFF'>('ROLE');
  const [selectedRoleMatrix, setSelectedRoleMatrix] = useState<string>('STAFF');
  const [selectedStaffMatrix, setSelectedStaffMatrix] = useState<string>('');

  // Hierarchical expand/collapse for tree
  const [expandedModules, setExpandedModules] = useState<Record<string, boolean>>(() => {
    const init: Record<string, boolean> = {};
    HIERARCHICAL_PERMISSION_TREE.forEach(m => {
      init[m.id] = true; // default expand all
    });
    return init;
  });
  const [permissionSearch, setPermissionSearch] = useState('');

  // Ensure selectedStaffMatrix is initialized
  useEffect(() => {
    if (!selectedStaffMatrix && staffList.length > 0) {
      setSelectedStaffMatrix(staffList[0].id);
    }
  }, [staffList, selectedStaffMatrix]);

  // Current active permissions map depending on whether target is Role or Staff
  const activeTargetPermissions = useMemo<RolePermissionsMap>(() => {
    if (permissionTargetType === 'ROLE') {
      const r = rolesInfo.find(role => role.role === selectedRoleMatrix);
      return r?.permissions || buildDefaultRolePermissions(selectedRoleMatrix);
    } else {
      const s = staffList.find(staff => staff.id === selectedStaffMatrix);
      const roleDefaults = s ? (rolesInfo.find(r => r.role === s.role)?.permissions || buildDefaultRolePermissions(s.role)) : {};
      const customOverrides = (s?.custom_permissions as RolePermissionsMap) || {};

      // Merge role defaults with staff custom overrides
      const merged: RolePermissionsMap = JSON.parse(JSON.stringify(roleDefaults));
      Object.keys(customOverrides).forEach(subId => {
        if (!merged[subId]) {
          merged[subId] = { view: false, create: false, edit: false, delete: false, approve: false, export: false };
        }
        ALL_PERMISSION_ACTIONS.forEach(action => {
          if (customOverrides[subId]?.[action] !== undefined) {
            merged[subId][action] = customOverrides[subId][action];
          }
        });
      });
      return merged;
    }
  }, [permissionTargetType, selectedRoleMatrix, selectedStaffMatrix, rolesInfo, staffList]);

  // Toggle single permission action
  const togglePermission = (submenuId: string, action: PermissionAction) => {
    if (permissionTargetType === 'ROLE') {
      setRolesInfo(prev => prev.map(role => {
        if (role.role !== selectedRoleMatrix) return role;
        const currentPerms = role.permissions || buildDefaultRolePermissions(role.role);
        const subPerm = currentPerms[submenuId] || { view: false, create: false, edit: false, delete: false, approve: false, export: false };
        const updated = {
          ...currentPerms,
          [submenuId]: {
            ...subPerm,
            [action]: !subPerm[action]
          }
        };
        return { ...role, permissions: updated };
      }));
    } else {
      setStaffList(prev => prev.map(staff => {
        if (staff.id !== selectedStaffMatrix) return staff;
        const currentCustom = (staff.custom_permissions as RolePermissionsMap) || {};
        const activeVal = activeTargetPermissions[submenuId]?.[action] ?? false;
        const subPerm = currentCustom[submenuId] || { ...activeTargetPermissions[submenuId] } || { view: false, create: false, edit: false, delete: false, approve: false, export: false };

        const updated = {
          ...currentCustom,
          [submenuId]: {
            ...subPerm,
            [action]: !activeVal
          }
        };
        return { ...staff, custom_permissions: updated };
      }));
    }
  };

  // Toggle all available actions for a module
  const toggleAllInModule = (moduleId: string, enable: boolean) => {
    const mod = HIERARCHICAL_PERMISSION_TREE.find(m => m.id === moduleId);
    if (!mod) return;

    if (permissionTargetType === 'ROLE') {
      setRolesInfo(prev => prev.map(role => {
        if (role.role !== selectedRoleMatrix) return role;
        const currentPerms = { ...(role.permissions || buildDefaultRolePermissions(role.role)) };
        mod.submenus.forEach(sub => {
          currentPerms[sub.id] = {
            view: sub.availableActions.includes('view') ? enable : false,
            create: sub.availableActions.includes('create') ? enable : false,
            edit: sub.availableActions.includes('edit') ? enable : false,
            delete: sub.availableActions.includes('delete') ? enable : false,
            approve: sub.availableActions.includes('approve') ? enable : false,
            export: sub.availableActions.includes('export') ? enable : false,
          };
        });
        return { ...role, permissions: currentPerms };
      }));
    } else {
      setStaffList(prev => prev.map(staff => {
        if (staff.id !== selectedStaffMatrix) return staff;
        const currentCustom = { ...((staff.custom_permissions as RolePermissionsMap) || {}) };
        mod.submenus.forEach(sub => {
          currentCustom[sub.id] = {
            view: sub.availableActions.includes('view') ? enable : false,
            create: sub.availableActions.includes('create') ? enable : false,
            edit: sub.availableActions.includes('edit') ? enable : false,
            delete: sub.availableActions.includes('delete') ? enable : false,
            approve: sub.availableActions.includes('approve') ? enable : false,
            export: sub.availableActions.includes('export') ? enable : false,
          };
        });
        return { ...staff, custom_permissions: currentCustom };
      }));
    }
  };

  // Global Grant All / Clear All
  const setAllGlobalPermissions = (enable: boolean) => {
    if (permissionTargetType === 'ROLE') {
      setRolesInfo(prev => prev.map(role => {
        if (role.role !== selectedRoleMatrix) return role;
        const newMap: RolePermissionsMap = {};
        HIERARCHICAL_PERMISSION_TREE.forEach(m => {
          m.submenus.forEach(sub => {
            newMap[sub.id] = {
              view: sub.availableActions.includes('view') ? enable : false,
              create: sub.availableActions.includes('create') ? enable : false,
              edit: sub.availableActions.includes('edit') ? enable : false,
              delete: sub.availableActions.includes('delete') ? enable : false,
              approve: sub.availableActions.includes('approve') ? enable : false,
              export: sub.availableActions.includes('export') ? enable : false,
            };
          });
        });
        return { ...role, permissions: newMap };
      }));
    } else {
      setStaffList(prev => prev.map(staff => {
        if (staff.id !== selectedStaffMatrix) return staff;
        const newMap: RolePermissionsMap = {};
        HIERARCHICAL_PERMISSION_TREE.forEach(m => {
          m.submenus.forEach(sub => {
            newMap[sub.id] = {
              view: sub.availableActions.includes('view') ? enable : false,
              create: sub.availableActions.includes('create') ? enable : false,
              edit: sub.availableActions.includes('edit') ? enable : false,
              delete: sub.availableActions.includes('delete') ? enable : false,
              approve: sub.availableActions.includes('approve') ? enable : false,
              export: sub.availableActions.includes('export') ? enable : false,
            };
          });
        });
        return { ...staff, custom_permissions: newMap };
      }));
    }

    toast.success(enable ? 'Granted all available permissions' : 'Cleared all permissions');
  };

  // Save Permissions Matrix Handler
  const handleSavePermissions = async () => {
    setActionLoading({
      isOpen: true,
      title: 'Saving Permissions Matrix...',
      subtitle: permissionTargetType === 'ROLE'
        ? `Updating authorization rules for role ${selectedRoleMatrix}...`
        : `Synchronizing custom permissions for staff member...`
    });

    try {
      if (permissionTargetType === 'ROLE') {
        await setJSONStore('roles', rolesInfo);
        addNotification({
          title: 'Role Permissions Saved',
          message: `Permissions matrix for role "${selectedRoleMatrix}" has been persisted to the database.`,
          type: 'success',
          sourceModule: 'Role Management'
        });
      } else {
        await setJSONStore('users', staffList);
        const targetStaff = staffList.find(s => s.id === selectedStaffMatrix);
        addNotification({
          title: 'Staff Permissions Saved',
          message: `Custom permission overrides for ${targetStaff?.full_name || 'staff member'} saved successfully.`,
          type: 'success',
          sourceModule: 'Access Control'
        });
      }
      setActionLoading(null);
      toast.success('Permissions saved and synced successfully!');
    } catch (err: any) {
      setActionLoading(null);
      toast.error('Failed to save permissions: ' + err.message);
    }
  };

  // ─── SUPER ADMIN ROLE & STAFF VISIBILITY FILTERING ────────────────────────────
  // When logged in as regular Admin (or lower), hide SUPER_ADMIN and OWNER records
  const visibleStaff = useMemo(() => {
    return staffList.filter(s => {
      if (!isSuperAdmin && (s.role === 'SUPER_ADMIN' || s.role === 'OWNER')) {
        return false;
      }
      return true;
    });
  }, [staffList, isSuperAdmin]);

  const visibleDeletedStaff = useMemo(() => {
    return deletedStaffList.filter(s => {
      if (!isSuperAdmin && (s.role === 'SUPER_ADMIN' || s.role === 'OWNER')) {
        return false;
      }
      return true;
    });
  }, [deletedStaffList, isSuperAdmin]);

  // Restrict selectable roles for non-superadmin users
  const availableRoles = useMemo(() => {
    return rolesInfo.filter(r => {
      if (!isSuperAdmin && (r.role === 'SUPER_ADMIN' || r.role === 'OWNER')) {
        return false;
      }
      return true;
    });
  }, [rolesInfo, isSuperAdmin]);

  // Computed Statistics (based on visible staff)
  const totalStaffCount = visibleStaff.length;
  const activeStaffCount = visibleStaff.filter(s => s.status === 'ACTIVE' && s.is_active !== false).length;
  const suspendedStaffCount = visibleStaff.filter(s => s.status === 'SUSPENDED' || s.is_active === false).length;
  const deletedStaffCount = visibleDeletedStaff.length;

  // Filtered & Sorted Staff Listing
  const filteredStaff = useMemo(() => {
    const list = visibleStaff.filter(s => {
      const q = (searchQuery || '').toLowerCase().trim();
      const name = String(s.full_name || (s as any).name || '').toLowerCase();
      const email = String(s.email || '').toLowerCase();
      const phone = String(s.phone || '');
      const desig = String(s.designation || '').toLowerCase();
      const dept = String(s.department || '').toLowerCase();
      const group = String(s.user_group || '').toLowerCase();
      const idFormatted = formatUserId(s.id);

      const matchesSearch = !q ||
        name.includes(q) ||
        email.includes(q) ||
        phone.includes(q) ||
        desig.includes(q) ||
        dept.includes(q) ||
        group.includes(q) ||
        idFormatted.includes(q) ||
        String(s.id).toLowerCase().includes(q);
      const matchesRole = selectedRoleFilter === 'ALL' || s.role === selectedRoleFilter;
      const matchesDept = selectedDeptFilter === 'ALL' || s.department === selectedDeptFilter;
      const isStaffActive = s.status === 'ACTIVE' && s.is_active !== false;
      const matchesStatus = selectedStatusFilter === 'ALL' ||
        (selectedStatusFilter === 'ACTIVE' && isStaffActive) ||
        (selectedStatusFilter === 'SUSPENDED' && !isStaffActive);
      return matchesSearch && matchesRole && matchesDept && matchesStatus;
    });

    // Default Sorting: Recent login first, followed by recent new users
    return [...list].sort((a, b) => {
      if (sortBy === 'recent_login') {
        const aTime = a.last_login_at ? new Date(a.last_login_at).getTime() : 0;
        const bTime = b.last_login_at ? new Date(b.last_login_at).getTime() : 0;
        if (bTime !== aTime) return bTime - aTime;
        const aCreated = a.created_at ? new Date(a.created_at).getTime() : 0;
        const bCreated = b.created_at ? new Date(b.created_at).getTime() : 0;
        return bCreated - aCreated;
      }
      if (sortBy === 'newest') {
        const aCreated = a.created_at ? new Date(a.created_at).getTime() : 0;
        const bCreated = b.created_at ? new Date(b.created_at).getTime() : 0;
        return bCreated - aCreated;
      }
      if (sortBy === 'id_asc') {
        return parseInt(formatUserId(a.id), 10) - parseInt(formatUserId(b.id), 10);
      }
      if (sortBy === 'id_desc') {
        return parseInt(formatUserId(b.id), 10) - parseInt(formatUserId(a.id), 10);
      }
      if (sortBy === 'name_asc') {
        return (a.full_name || '').localeCompare(b.full_name || '');
      }
      return 0;
    });
  }, [visibleStaff, searchQuery, selectedRoleFilter, selectedDeptFilter, selectedStatusFilter, sortBy]);

  // Reset pagination on filter or search changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, selectedRoleFilter, selectedDeptFilter, selectedStatusFilter, sortBy]);

  // Pagination calculation
  const totalPages = Math.max(1, Math.ceil(filteredStaff.length / pageSize));
  const paginatedStaff = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredStaff.slice(start, start + pageSize);
  }, [filteredStaff, currentPage, pageSize]);

  // Multi-select helper functions
  const toggleSelectStaff = (id: string) => {
    setSelectedStaffIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const toggleSelectCurrentPage = () => {
    const pageIds = paginatedStaff.map(s => s.id);
    const allSelected = pageIds.length > 0 && pageIds.every(id => selectedStaffIds.includes(id));
    if (allSelected) {
      setSelectedStaffIds(prev => prev.filter(id => !pageIds.includes(id)));
    } else {
      setSelectedStaffIds(prev => Array.from(new Set([...prev, ...pageIds])));
    }
  };

  const clearSelection = () => {
    setSelectedStaffIds([]);
  };

  // Export Staff Data (supports selected staff or all filtered)
  const handleExportStaff = (format: ExportFormat) => {
    const listToExport = selectedStaffIds.length > 0
      ? filteredStaff.filter(s => selectedStaffIds.includes(s.id))
      : filteredStaff;

    setActionLoading({
      isOpen: true,
      title: `Exporting Staff Data (${format})...`,
      subtitle: `Preparing downloadable spreadsheet for ${listToExport.length} staff records...`
    });

    setTimeout(() => {
      const headers = ['Staff ID', 'Formatted ID', 'Full Name', 'Role', 'Status', 'Last Login', 'User Group', 'Department', 'Designation', 'Email', 'Phone', 'Joining Date', 'Emergency Contact'];
      const rows = listToExport.map(s => [
        s.id,
        formatUserId(s.id),
        `"${s.full_name}"`,
        s.role,
        s.status,
        `"${s.last_login_at ? formatTimestamp(s.last_login_at) : 'Never'}"`,
        `"${s.user_group || ''}"`,
        `"${s.department || ''}"`,
        `"${s.designation || ''}"`,
        s.email,
        s.phone,
        s.joining_date || s.created_at,
        `"${s.emergency_contact}"`
      ]);

      const csvContent = "data:text/csv;charset=utf-8," + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
      const encodedUri = encodeURI(csvContent);
      const link = document.createElement('a');
      link.setAttribute('href', encodedUri);
      link.setAttribute('download', `MR_VIVASAYI_Staff_Directory_${new Date().toISOString().split('T')[0]}.${format === 'EXCEL' ? 'csv' : format.toLowerCase()}`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      setActionLoading(null);
      addNotification({
        title: 'Staff Directory Exported',
        message: `Successfully downloaded ${listToExport.length} staff records in ${format} format.`,
        type: 'success',
        sourceModule: 'Staff Export'
      });
    }, 600);
  };

  // Switch Active Session with Full Page Reload
  const confirmSwitchUser = () => {
    if (!switchingUser) return;
    const target = switchingUser;
    switchDemoUser(target.role as UserRole);
    localStorage.setItem('mrvivasayi_active_user_email', target.email);
    addNotification({
      title: 'Switched Active Staff User',
      message: `Successfully logged in as ${target.full_name} (${target.role}).`,
      type: 'success',
      sourceModule: 'Staff Authentication'
    });
    setSwitchingUser(null);
    toast.success(`Session switched to ${target.full_name}. Reloading...`);
    setTimeout(() => {
      window.location.reload();
    }, 400);
  };

  // ─── POP MODAL CONFIRMATION REQUEST HANDLERS ─────────────────────────────────
  const requestSuspendStaff = (staff: ExtendedStaffMember) => {
    setActionConfirmModal({
      isOpen: true,
      type: 'suspend',
      title: 'Suspend Staff Account Access?',
      subtitle: `Are you sure you want to suspend access for ${staff.full_name || staff.email}? Login credentials will be locked immediately until re-activated.`,
      targetStaff: staff,
      confirmButtonText: 'Yes, Suspend Account',
      confirmButtonColor: 'amber',
      onConfirm: async () => {
        setActionConfirmModal(null);
        await confirmSuspendStaff(staff);
      }
    });
  };

  const requestRestoreStaff = (staff: ExtendedStaffMember) => {
    setActionConfirmModal({
      isOpen: true,
      type: 'activate',
      title: 'Re-activate Staff Account Access?',
      subtitle: `Are you sure you want to restore active access for ${staff.full_name || staff.email}? Login credentials will be unlocked immediately.`,
      targetStaff: staff,
      confirmButtonText: 'Yes, Activate Account',
      confirmButtonColor: 'emerald',
      onConfirm: async () => {
        setActionConfirmModal(null);
        await confirmRestoreStaff(staff);
      }
    });
  };

  const requestResetPassword = (staff: ExtendedStaffMember) => {
    setActionConfirmModal({
      isOpen: true,
      type: 'reset_password',
      title: 'Reset Staff Password?',
      subtitle: `Are you sure you want to reset the login password for ${staff.full_name || staff.email} to default @@12345678@@?`,
      targetStaff: staff,
      confirmButtonText: 'Yes, Reset Password',
      confirmButtonColor: 'blue',
      onConfirm: async () => {
        setActionConfirmModal(null);
        await handleResetPassword(staff);
      }
    });
  };

  const requestBulkSuspend = () => {
    if (selectedStaffIds.length === 0) return;
    setActionConfirmModal({
      isOpen: true,
      type: 'bulk_suspend',
      title: `Suspend ${selectedStaffIds.length} Staff Accounts?`,
      subtitle: `Are you sure you want to suspend access for all ${selectedStaffIds.length} selected staff members? Login credentials will be locked.`,
      selectedCount: selectedStaffIds.length,
      confirmButtonText: `Yes, Suspend (${selectedStaffIds.length}) Staff`,
      confirmButtonColor: 'amber',
      onConfirm: async () => {
        setActionConfirmModal(null);
        setActionLoading({ isOpen: true, title: 'Bulk Suspending Staff...', subtitle: `Locking ${selectedStaffIds.length} accounts...` });
        try {
          const idsSet = new Set(selectedStaffIds);
          const updated = staffList.map(s => idsSet.has(s.id) ? { ...s, status: 'SUSPENDED' as const, is_active: false, updated_at: new Date().toISOString() } : s);
          setStaffList(updated);
          await setJSONStore('users', updated);
          setActionLoading(null);
          clearSelection();
          toast.success(`Suspended ${idsSet.size} staff accounts.`);
        } catch (err: any) {
          setActionLoading(null);
          toast.error('Failed to bulk suspend: ' + err.message);
        }
      }
    });
  };

  const requestBulkActivate = () => {
    if (selectedStaffIds.length === 0) return;
    setActionConfirmModal({
      isOpen: true,
      type: 'bulk_activate',
      title: `Activate ${selectedStaffIds.length} Staff Accounts?`,
      subtitle: `Are you sure you want to restore active login access for all ${selectedStaffIds.length} selected staff members?`,
      selectedCount: selectedStaffIds.length,
      confirmButtonText: `Yes, Activate (${selectedStaffIds.length}) Staff`,
      confirmButtonColor: 'emerald',
      onConfirm: async () => {
        setActionConfirmModal(null);
        setActionLoading({ isOpen: true, title: 'Bulk Activating Staff...', subtitle: `Restoring ${selectedStaffIds.length} accounts...` });
        try {
          const idsSet = new Set(selectedStaffIds);
          const updated = staffList.map(s => idsSet.has(s.id) ? { ...s, status: 'ACTIVE' as const, is_active: true, updated_at: new Date().toISOString() } : s);
          setStaffList(updated);
          await setJSONStore('users', updated);
          setActionLoading(null);
          clearSelection();
          toast.success(`Re-activated ${idsSet.size} staff accounts.`);
        } catch (err: any) {
          setActionLoading(null);
          toast.error('Failed to bulk activate: ' + err.message);
        }
      }
    });
  };

  const requestBulkDelete = () => {
    if (selectedStaffIds.length === 0) return;
    setActionConfirmModal({
      isOpen: true,
      type: 'bulk_delete',
      title: `Move ${selectedStaffIds.length} Staff to deleted_users Table?`,
      subtitle: `Are you sure you want to move all ${selectedStaffIds.length} selected staff members to the deleted_users archive table? You can restore them anytime.`,
      selectedCount: selectedStaffIds.length,
      confirmButtonText: `Yes, Move (${selectedStaffIds.length}) to Archive`,
      confirmButtonColor: 'rose',
      onConfirm: async () => {
        setActionConfirmModal(null);
        setActionLoading({ isOpen: true, title: 'Archiving Selected Staff...', subtitle: `Moving ${selectedStaffIds.length} accounts to deleted_users...` });
        try {
          const idsSet = new Set(selectedStaffIds);
          const toDelete = staffList.filter(s => idsSet.has(s.id));
          const deletedRecords: ExtendedStaffMember[] = toDelete.map(s => ({
            ...s,
            status: 'DELETED',
            is_active: false,
            deleted_at: new Date().toISOString(),
            deleted_by: currentUser?.full_name || 'Admin',
            updated_at: new Date().toISOString()
          }));

          const updatedActive = staffList.filter(s => !idsSet.has(s.id));
          const updatedDeleted = [...deletedRecords, ...deletedStaffList.filter(s => !idsSet.has(s.id))];

          setStaffList(updatedActive);
          setDeletedStaffList(updatedDeleted);

          await Promise.all([
            setJSONStore('users', updatedActive),
            setJSONStore('deleted_users', updatedDeleted)
          ]);

          setActionLoading(null);
          clearSelection();
          toast.success(`Moved ${toDelete.length} staff accounts to deleted_users.`);
        } catch (err: any) {
          setActionLoading(null);
          toast.error('Failed to bulk archive: ' + err.message);
        }
      }
    });
  };

  const handleBulkExport = () => {
    setShowExportModal(true);
  };

  // Create Staff Submit with sequential 4-digit ID (0001, 0002, 0003...)
  const handleCreateStaffSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStaff.full_name?.trim()) {
      toast.error('Full Name is required');
      return;
    }
    if (!newStaff.email?.trim()) {
      toast.error('Email Address is required');
      return;
    }

    setActionLoading({ isOpen: true, title: 'Creating New Staff Account...', subtitle: 'Writing staff profile & setting security credentials...' });

    try {
      const nextId = getNextUserId(staffList, deletedStaffList);
      const rawPassword = newStaff.password?.trim() || '@@12345678@@';
      const created: ExtendedStaffMember = {
        id: nextId,
        full_name: newStaff.full_name.trim(),
        email: newStaff.email.trim(),
        phone: newStaff.phone || '',
        role: newStaff.role,
        user_group: newStaff.user_group,
        department: newStaff.department,
        designation: newStaff.designation || 'Staff',
        joining_date: newStaff.joining_date || new Date().toISOString().split('T')[0],
        bio: newStaff.bio || 'MR. VIVASAYI team member.',
        emergency_contact: newStaff.emergency_contact || '',
        password: hashPassword(rawPassword),
        is_active: newStaff.status === 'ACTIVE',
        status: newStaff.status === 'DELETED' ? 'ACTIVE' : newStaff.status,
        custom_permissions: {},
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      const updatedList = [created, ...staffList];
      setStaffList(updatedList);
      await setJSONStore('users', updatedList);

      setNewStaff({
        full_name: '', email: '', phone: '', role: availableRoles[0]?.role || 'STAFF',
        user_group: USER_GROUPS[0], department: DEPARTMENTS[0],
        designation: 'Operations Assistant',
        joining_date: new Date().toISOString().split('T')[0],
        bio: 'Dedicated MR. VIVASAYI team member.', emergency_contact: '+91 98765 00000',
        password: '@@12345678@@', status: 'ACTIVE'
      });
      setActiveTab('all');
      setActionLoading(null);

      toast.success(`Staff account #${formatUserId(created.id)} for ${created.full_name} created successfully!`);
      addNotification({
        title: 'New Staff Account Created',
        message: `Staff #${formatUserId(created.id)}: ${created.full_name} (${created.role}) assigned to ${created.department}.`,
        type: 'success',
        sourceModule: 'Staff Section'
      });
    } catch (err: any) {
      setActionLoading(null);
      toast.error('Failed to create staff account: ' + err.message);
    }
  };

  // Update Staff Submit
  const handleUpdateStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingStaff) return;
    const targetStaff = editingStaff;

    setActionLoading({ isOpen: true, title: 'Updating Staff Profile...', subtitle: `Saving modifications for ${targetStaff.full_name}...` });

    try {
      const updatedStatus = targetStaff.status;
      const isActive = updatedStatus === 'ACTIVE';

      let finalPassword = targetStaff.password;
      if (editPasswordInput && editPasswordInput.trim()) {
        finalPassword = hashPassword(editPasswordInput.trim());
      } else if (finalPassword && !finalPassword.startsWith('sha256:')) {
        finalPassword = hashPassword(finalPassword);
      }

      const updatedObj: ExtendedStaffMember = {
        ...targetStaff,
        password: finalPassword,
        is_active: isActive,
        updated_at: new Date().toISOString()
      };

      const updatedList = staffList.map(s => s.id === targetStaff.id ? updatedObj : s);
      setStaffList(updatedList);
      await setJSONStore('users', updatedList);

      setEditingStaff(null);
      setEditPasswordInput('');
      if (viewingStaff?.id === targetStaff.id) {
        setViewingStaff(updatedObj);
      }
      setActionLoading(null);

      toast.success(`Staff profile for ${updatedObj.full_name} updated.`);
      addNotification({
        title: 'Staff Profile Updated',
        message: `Updated profile details, department & role for ${updatedObj.full_name}.`,
        type: 'success',
        sourceModule: 'Staff Section'
      });
    } catch (err: any) {
      setActionLoading(null);
      toast.error('Failed to update staff profile: ' + err.message);
    }
  };

  // 1-Click Reset Staff Password to Default @@12345678@@
  const handleResetPassword = async (staff: ExtendedStaffMember) => {
    setActionLoading({
      isOpen: true,
      title: 'Resetting Password...',
      subtitle: `Setting default password @@12345678@@ for ${staff.full_name}...`
    });
    try {
      const updatedList = staffList.map(s =>
        s.id === staff.id
          ? { ...s, password: hashPassword('@@12345678@@'), updated_at: new Date().toISOString() }
          : s
      );
      setStaffList(updatedList);
      await setJSONStore('users', updatedList);
      setActionLoading(null);
      toast.success(`Password for ${staff.full_name} reset to: @@12345678@@`);
      addNotification({
        title: 'Staff Password Reset',
        message: `Password for ${staff.full_name} was reset to system default @@12345678@@.`,
        type: 'info',
        sourceModule: 'Staff Security'
      });
    } catch (err: any) {
      setActionLoading(null);
      toast.error('Failed to reset password: ' + err.message);
    }
  };

  // Soft Suspend / Lock Access
  const confirmSuspendStaff = async (staff: ExtendedStaffMember) => {
    setActionLoading({ isOpen: true, title: 'Suspending Staff Account...', subtitle: `Locking login access for ${staff.full_name}...` });
    try {
      const updatedList = staffList.map(s => s.id === staff.id ? { ...s, status: 'SUSPENDED' as const, is_active: false, updated_at: new Date().toISOString() } : s);
      setStaffList(updatedList);
      await setJSONStore('users', updatedList);
      setActionLoading(null);
      setDeletingStaff(null);
      toast.success(`Staff account for ${staff.full_name} has been suspended.`);
      addNotification({
        title: 'Staff Account Suspended',
        message: `Login access for ${staff.full_name} is now locked.`,
        type: 'warning',
        sourceModule: 'Staff Section'
      });
    } catch (err: any) {
      setActionLoading(null);
      toast.error('Failed to suspend staff: ' + err.message);
    }
  };

  // Restore / Re-activate Staff from Suspended
  const confirmRestoreStaff = async (staff: ExtendedStaffMember) => {
    setActionLoading({ isOpen: true, title: 'Restoring Staff Account...', subtitle: `Re-activating ${staff.full_name}...` });
    try {
      const updatedList = staffList.map(s => s.id === staff.id ? { ...s, status: 'ACTIVE' as const, is_active: true, updated_at: new Date().toISOString() } : s);
      setStaffList(updatedList);
      await setJSONStore('users', updatedList);
      setActionLoading(null);
      setDeletingStaff(null);
      toast.success(`Staff account for ${staff.full_name} has been restored to Active.`);
      addNotification({
        title: 'Staff Account Restored',
        message: `Account for ${staff.full_name} is now active with normal access.`,
        type: 'success',
        sourceModule: 'Staff Section'
      });
    } catch (err: any) {
      setActionLoading(null);
      toast.error('Failed to restore staff: ' + err.message);
    }
  };

  // Delete Staff: Move from users to deleted_users Table
  const confirmDeleteStaff = async () => {
    if (!deletingStaff) return;
    const targetStaff = deletingStaff;

    setActionLoading({
      isOpen: true,
      title: 'Moving to deleted_users Table...',
      subtitle: `Archiving ${targetStaff.full_name} into deleted_users...`
    });

    try {
      const deletedRecord: ExtendedStaffMember = {
        ...targetStaff,
        status: 'DELETED',
        is_active: false,
        deleted_at: new Date().toISOString(),
        deleted_by: currentUser?.full_name || 'Admin',
        updated_at: new Date().toISOString()
      };

      const updatedStaffList = staffList.filter(s => s.id !== targetStaff.id);
      const updatedDeletedList = [deletedRecord, ...deletedStaffList.filter(s => s.id !== targetStaff.id)];

      setStaffList(updatedStaffList);
      setDeletedStaffList(updatedDeletedList);

      await Promise.all([
        setJSONStore('users', updatedStaffList),
        setJSONStore('deleted_users', updatedDeletedList)
      ]);

      setActionLoading(null);
      setDeletingStaff(null);

      toast.success(`${targetStaff.full_name} moved to deleted_users table.`);
      addNotification({
        title: 'Staff Moved to deleted_users',
        message: `Staff member ${targetStaff.full_name} (${targetStaff.role}) removed from active directory and stored in deleted_users archive.`,
        type: 'warning',
        sourceModule: 'Staff Directory'
      });
    } catch (err: any) {
      setActionLoading(null);
      toast.error('Failed to move user to deleted_users: ' + err.message);
    }
  };

  // Restore Staff from deleted_users archive back to active users directory
  const handleRestoreFromDeletedArchive = async (staff: ExtendedStaffMember) => {
    setActionLoading({
      isOpen: true,
      title: 'Restoring Staff Account...',
      subtitle: `Reinstating ${staff.full_name} into active directory...`
    });

    try {
      const restoredRecord: ExtendedStaffMember = {
        ...staff,
        status: 'ACTIVE',
        is_active: true,
        updated_at: new Date().toISOString()
      };
      delete restoredRecord.deleted_at;
      delete restoredRecord.deleted_by;

      const updatedDeletedList = deletedStaffList.filter(s => s.id !== staff.id);
      const updatedStaffList = [restoredRecord, ...staffList.filter(s => s.id !== staff.id)];

      setDeletedStaffList(updatedDeletedList);
      setStaffList(updatedStaffList);

      await Promise.all([
        setJSONStore('users', updatedStaffList),
        setJSONStore('deleted_users', updatedDeletedList)
      ]);

      setActionLoading(null);
      toast.success(`${staff.full_name} restored to active staff directory!`);
      addNotification({
        title: 'Staff Restored',
        message: `${staff.full_name} has been reinstated as active staff member.`,
        type: 'success',
        sourceModule: 'Staff Directory'
      });
    } catch (err: any) {
      setActionLoading(null);
      toast.error('Failed to restore staff: ' + err.message);
    }
  };

  // Permanently Purge Staff from deleted_users table
  const handlePurgeFromDeletedArchive = async (staff: ExtendedStaffMember) => {
    setActionLoading({
      isOpen: true,
      title: 'Purging Staff Record...',
      subtitle: `Permanently removing ${staff.full_name} from deleted_users...`
    });

    try {
      const updatedDeletedList = deletedStaffList.filter(s => s.id !== staff.id);
      setDeletedStaffList(updatedDeletedList);
      await setJSONStore('deleted_users', updatedDeletedList);

      setActionLoading(null);
      toast.success(`${staff.full_name} permanently purged from deleted_users.`);
      addNotification({
        title: 'Staff Record Purged',
        message: `${staff.full_name} permanently removed from deleted_users archive.`,
        type: 'warning',
        sourceModule: 'Staff Archive'
      });
    } catch (err: any) {
      setActionLoading(null);
      toast.error('Failed to purge staff: ' + err.message);
    }
  };

  const requestRestoreFromDeletedArchive = (staff: ExtendedStaffMember) => {
    setActionConfirmModal({
      isOpen: true,
      type: 'restore',
      title: 'Restore Staff to Active Directory?',
      subtitle: `Are you sure you want to restore ${staff.full_name} back into the active staff directory?`,
      targetStaff: staff,
      confirmButtonText: 'Yes, Restore Staff',
      confirmButtonColor: 'emerald',
      onConfirm: async () => {
        setActionConfirmModal(null);
        await handleRestoreFromDeletedArchive(staff);
      }
    });
  };

  const requestPurgeFromDeletedArchive = (staff: ExtendedStaffMember) => {
    setActionConfirmModal({
      isOpen: true,
      type: 'delete',
      title: 'Permanently Purge Record from DB?',
      subtitle: `Are you sure you want to permanently purge ${staff.full_name}? All account records will be permanently erased. This cannot be undone.`,
      targetStaff: staff,
      confirmButtonText: 'Yes, Permanently Purge',
      confirmButtonColor: 'rose',
      onConfirm: async () => {
        setActionConfirmModal(null);
        await handlePurgeFromDeletedArchive(staff);
      }
    });
  };

  // Permanent Delete Staff directly from modal
  const confirmPermanentDeleteStaff = async () => {
    if (!deletingStaff) return;
    const targetStaff = deletingStaff;

    setActionLoading({ isOpen: true, title: 'Permanently Deleting Staff...', subtitle: `Purging ${targetStaff.full_name} from database table...` });

    try {
      const updatedList = staffList.filter(s => s.id !== targetStaff.id);
      const updatedDeleted = deletedStaffList.filter(s => s.id !== targetStaff.id);
      setStaffList(updatedList);
      setDeletedStaffList(updatedDeleted);
      await Promise.all([
        setJSONStore('users', updatedList),
        setJSONStore('deleted_users', updatedDeleted)
      ]);
      setActionLoading(null);
      setDeletingStaff(null);

      toast.success(`Staff account ${targetStaff.full_name} permanently removed from database.`);
      addNotification({
        title: 'Staff Account Permanently Deleted',
        message: `Staff member ${targetStaff.full_name} was removed from the users table.`,
        type: 'warning',
        sourceModule: 'Staff Section'
      });
    } catch (err: any) {
      setActionLoading(null);
      toast.error('Failed to permanently delete staff: ' + err.message);
    }
  };

  // Create Custom Role
  const handleCreateCustomRoleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCustomRole.title || !newCustomRole.code) return;
    const roleCode = newCustomRole.code.toUpperCase().replace(/\s+/g, '_');

    // Check if code already exists
    if (rolesInfo.some(r => r.role === roleCode)) {
      toast.error(`A role with code "${roleCode}" already exists!`);
      return;
    }

    const createdRole: RoleDefinition = {
      role: roleCode,
      title: newCustomRole.title,
      level: Number(newCustomRole.level),
      desc: newCustomRole.desc || 'Custom store role configured for operations.',
      badgeColor: newCustomRole.badgeColor,
      isCustom: true,
      department: newCustomRole.department,
      permissions: buildDefaultRolePermissions(roleCode)
    };

    setRolesInfo(prev => [...prev, createdRole]);
    setShowCreateRoleModal(false);
    setNewCustomRole({
      title: '',
      code: '',
      level: 3,
      department: DEPARTMENTS[0],
      desc: '',
      badgeColor: 'bg-indigo-100 text-indigo-800 border-indigo-200'
    });

    toast.success(`Custom role "${createdRole.title}" created successfully!`);
    addNotification({
      title: 'Custom Role Created',
      message: `Role "${createdRole.title}" (${createdRole.role}) created with default permissions matrix.`,
      type: 'success',
      sourceModule: 'Role Management'
    });
  };

  // Duplicate Role
  const handleDuplicateRoleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!duplicatingRole || !duplicateForm.title || !duplicateForm.code) return;
    const cleanCode = duplicateForm.code.toUpperCase().replace(/\s+/g, '_');

    if (rolesInfo.some(r => r.role === cleanCode)) {
      toast.error(`A role with code "${cleanCode}" already exists!`);
      return;
    }

    const cloned = duplicateRole(duplicatingRole, duplicateForm.title, cleanCode);
    setRolesInfo(prev => [...prev, cloned]);
    setDuplicatingRole(null);
    setDuplicateForm({ title: '', code: '' });

    toast.success(`Duplicated role as "${cloned.title}"!`);
    addNotification({
      title: 'Role Duplicated',
      message: `Created "${cloned.title}" (${cloned.role}) with copied permission tree from ${duplicatingRole.title}.`,
      type: 'success',
      sourceModule: 'Role Management'
    });
  };

  // Update Existing Role
  const handleUpdateRoleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingRole) return;
    setRolesInfo(prev => prev.map(r => r.role === editingRole.role ? editingRole : r));
    setEditingRole(null);
    toast.success('Role details updated successfully.');
  };

  // Delete Custom Role
  const confirmDeleteRole = () => {
    if (!deletingRole) return;
    if (!deletingRole.isCustom) {
      toast.error('System default roles cannot be deleted.');
      setDeletingRole(null);
      return;
    }

    // Check if any staff member is assigned to this role
    const assignedCount = staffList.filter(s => s.role === deletingRole.role && s.status !== 'DELETED').length;
    if (assignedCount > 0) {
      toast.error(`Cannot delete role: ${assignedCount} active staff member(s) are assigned to it. Reassign them first.`);
      setDeletingRole(null);
      return;
    }

    setRolesInfo(prev => prev.filter(r => r.role !== deletingRole.role));
    toast.success(`Role "${deletingRole.title}" deleted.`);
    setDeletingRole(null);
  };

  // Filtered permission tree modules
  const filteredPermissionModules = useMemo(() => {
    if (!permissionSearch.trim()) return HIERARCHICAL_PERMISSION_TREE;
    const q = permissionSearch.toLowerCase().trim();
    return HIERARCHICAL_PERMISSION_TREE.filter(mod => {
      const matchMod = mod.title.toLowerCase().includes(q) || mod.description.toLowerCase().includes(q);
      const matchSub = mod.submenus.some(sub => sub.label.toLowerCase().includes(q) || sub.description.toLowerCase().includes(q));
      return matchMod || matchSub;
    });
  }, [permissionSearch]);

  if (loading) {
    return <AdminPageSkeleton title="Staff & Role Management" />;
  }

  return (
    <div className="space-y-6 font-sans text-gray-900 bg-gray-50 min-h-screen p-4 sm:p-6 rounded-2xl animate-fadeIn">

      {/* Global Refresh Popup Modal */}
      <RefreshSpinnerModal
        isOpen={isRefreshing}
        title="Refreshing Staff & Access Records..."
        subtitle="Sorting latest staff profiles, active roles, and permission matrices..."
        moduleName="Staff & Access Control"
        onComplete={() => setIsRefreshing(false)}
      />

      {/* Real-Time Action Loading Spinner Popup */}
      {actionLoading && (
        <RefreshSpinnerModal
          isOpen={actionLoading.isOpen}
          title={actionLoading.title}
          subtitle={actionLoading.subtitle}
          moduleName="Staff Management"
        />
      )}

      {/* Export Format Selection Modal */}
      <ExportFormatModal
        isOpen={showExportModal}
        title={selectedStaffIds.length > 0 ? `Export ${selectedStaffIds.length} Selected Staff Records` : "Export Staff Directory Records"}
        description={selectedStaffIds.length > 0 ? `Choose preferred file format to download the ${selectedStaffIds.length} selected staff records:` : "Choose preferred file format to download staff directory information:"}
        totalRecords={selectedStaffIds.length > 0 ? selectedStaffIds.length : filteredStaff.length}
        onClose={() => setShowExportModal(false)}
        onExport={handleExportStaff}
      />

      {/* Top Header */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-emerald-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold font-serif text-emerald-950 flex items-center gap-2">
            <Users className="w-7 h-7 text-emerald-600 animate-pulse" />
            Staff Management & Access Control
          </h1>
          <p className="text-xs text-gray-500 mt-1">
            Manage store staff accounts, customize hierarchical role permissions, configure groups & departments, and audit security access.
          </p>
        </div>

        {/* Action Controls & Navigation Tabs */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setShowExportModal(true)}
            className="px-3.5 py-2 bg-amber-100 hover:bg-amber-200 text-amber-950 font-bold text-xs rounded-xl shadow-xs flex items-center gap-1.5 transition active:scale-95 border border-amber-300"
            title="Export Staff Directory"
          >
            <Download className="w-4 h-4 text-amber-800" />
            <span>Export</span>
          </button>

          {/* Auto-Refresh Dropdown */}
          <AutoRefreshDropdown
            intervalSec={autoRefreshSec}
            onIntervalChange={(sec) => {
              setAutoRefreshSec(sec);
              if (sec > 0) setIsRefreshing(true);
            }}
            onRefresh={() => setIsRefreshing(true)}
            variant="emerald"
          />

          <button
            onClick={() => setIsRefreshing(true)}
            className="px-3.5 py-2 bg-emerald-100 hover:bg-emerald-200 text-emerald-950 font-bold text-xs rounded-xl shadow-xs flex items-center gap-1.5 transition active:scale-95 cursor-pointer"
            title="Refresh Records"
          >
            <RefreshCw className="w-4 h-4 text-emerald-700 animate-spin-slow" />
            <span>Refresh</span>
          </button>

          <div className="flex bg-gray-100 p-1 rounded-xl gap-1 overflow-x-auto">
            <button
              onClick={() => setActiveTab('all')}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition whitespace-nowrap ${
                activeTab === 'all' ? 'bg-white text-emerald-950 shadow-xs' : 'text-gray-600 hover:text-emerald-900'
              }`}
            >
              All Staff ({visibleStaff.length})
            </button>
            <button
              onClick={() => setActiveTab('create')}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition whitespace-nowrap ${
                activeTab === 'create' ? 'bg-white text-emerald-950 shadow-xs' : 'text-gray-600 hover:text-emerald-900'
              }`}
            >
              + Add Staff
            </button>
            <button
              onClick={() => setActiveTab('deleted')}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition whitespace-nowrap flex items-center gap-1.5 ${
                activeTab === 'deleted' ? 'bg-white text-rose-950 shadow-xs' : 'text-gray-600 hover:text-rose-900'
              }`}
            >
              <Trash2 className="w-3.5 h-3.5 text-rose-600" />
              <span>Deleted Archive ({visibleDeletedStaff.length})</span>
            </button>
            <button
              onClick={() => setActiveTab('permissions')}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition whitespace-nowrap ${
                activeTab === 'permissions' ? 'bg-white text-emerald-950 shadow-xs' : 'text-gray-600 hover:text-emerald-900'
              }`}
            >
              Permissions Matrix
            </button>
            <button
              onClick={() => setActiveTab('roles')}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition whitespace-nowrap ${
                activeTab === 'roles' ? 'bg-white text-emerald-950 shadow-xs' : 'text-gray-600 hover:text-emerald-900'
              }`}
            >
              Role Management ({availableRoles.length})
            </button>
          </div>
        </div>
      </div>

      {/* 4 SUMMARY STAT BOXES */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div
          onClick={() => { setSelectedStatusFilter('ALL'); setActiveTab('all'); }}
          className="bg-white p-5 rounded-2xl border border-emerald-100 shadow-sm hover:shadow-md transition cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Total Staff</p>
              <h3 className="text-2xl font-black text-emerald-950 mt-1 group-hover:scale-105 transition-transform">{totalStaffCount}</h3>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-100 shadow-xs">
              <Users className="w-6 h-6" />
            </div>
          </div>
          <div className="mt-3 text-[10px] text-emerald-700 font-bold flex items-center gap-1">
            <span>All registered store personnel</span>
          </div>
        </div>

        <div
          onClick={() => { setSelectedStatusFilter('ACTIVE'); setActiveTab('all'); }}
          className="bg-white p-5 rounded-2xl border border-emerald-100 shadow-sm hover:shadow-md transition cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[11px] font-bold text-emerald-700 uppercase tracking-wider">Active Staff</p>
              <h3 className="text-2xl font-black text-emerald-900 mt-1 group-hover:scale-105 transition-transform">{activeStaffCount}</h3>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-800 flex items-center justify-center border border-emerald-200 shadow-xs">
              <UserCheck className="w-6 h-6" />
            </div>
          </div>
          <div className="mt-3 text-[10px] text-emerald-800 font-bold flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping inline-block"></span>
            <span>Active store logins</span>
          </div>
        </div>

        <div
          onClick={() => { setSelectedStatusFilter('SUSPENDED'); setActiveTab('all'); }}
          className="bg-white p-5 rounded-2xl border border-amber-100 shadow-sm hover:shadow-md transition cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[11px] font-bold text-amber-700 uppercase tracking-wider">Suspended Staff</p>
              <h3 className="text-2xl font-black text-amber-900 mt-1 group-hover:scale-105 transition-transform">{suspendedStaffCount}</h3>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center border border-amber-200 shadow-xs">
              <UserX className="w-6 h-6" />
            </div>
          </div>
          <div className="mt-3 text-[10px] text-amber-700 font-bold flex items-center gap-1">
            <span>Access temporarily locked</span>
          </div>
        </div>

        <div
          onClick={() => setActiveTab('deleted')}
          className="bg-white p-5 rounded-2xl border border-rose-100 shadow-sm hover:shadow-md transition cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[11px] font-bold text-rose-700 uppercase tracking-wider">Deleted Archive</p>
              <h3 className="text-2xl font-black text-rose-900 mt-1 group-hover:scale-105 transition-transform">{deletedStaffCount}</h3>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center border border-rose-200 shadow-xs">
              <Trash2 className="w-6 h-6" />
            </div>
          </div>
          <div className="mt-3 text-[10px] text-rose-700 font-bold flex items-center gap-1">
            <span>stored in deleted_users table</span>
          </div>
        </div>
      </div>

      {/* ─── TAB 1: ALL STAFF LISTING ────────────────────────────────────────── */}
      {activeTab === 'all' && (
        <div className="space-y-4 animate-fadeIn">
          {/* Filters Bar */}
          <div className="bg-white p-4 rounded-2xl shadow-sm border border-emerald-100 flex flex-col md:flex-row gap-3 justify-between items-center">
            <div className="relative flex-1 w-full">
              <Search className="w-4 h-4 absolute left-3 top-3 text-gray-400" />
              <input
                type="text"
                placeholder="Search staff by ID (0001), name, email, phone, designation, group..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 text-xs bg-gray-50 border border-gray-200 rounded-xl text-gray-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2 w-full md:w-auto justify-end">
              {/* Sort By Dropdown */}
              <div className="flex items-center gap-1 bg-gray-50 px-2 py-1.5 rounded-xl border border-gray-200">
                <ArrowUpDown className="w-3.5 h-3.5 text-gray-400" />
                <select
                  value={sortBy}
                  onChange={e => setSortBy(e.target.value as any)}
                  className="text-xs bg-transparent text-gray-900 font-bold focus:outline-none cursor-pointer"
                  title="Sort staff records"
                >
                  <option value="recent_login">Recent Login First</option>
                  <option value="newest">Newest Created First</option>
                  <option value="id_asc">User ID (0001 → 9999)</option>
                  <option value="id_desc">User ID (9999 → 0001)</option>
                  <option value="name_asc">Name (A → Z)</option>
                </select>
              </div>

              {/* Role Filter */}
              <select
                value={selectedRoleFilter}
                onChange={e => setSelectedRoleFilter(e.target.value)}
                className="px-3 py-2 text-xs bg-gray-50 border border-gray-200 rounded-xl text-gray-900 font-semibold"
              >
                <option value="ALL">All Roles</option>
                {availableRoles.map(r => (
                  <option key={r.role} value={r.role}>{r.title}</option>
                ))}
              </select>

              {/* Department Filter */}
              <select
                value={selectedDeptFilter}
                onChange={e => setSelectedDeptFilter(e.target.value)}
                className="px-3 py-2 text-xs bg-gray-50 border border-gray-200 rounded-xl text-gray-900 font-semibold"
              >
                <option value="ALL">All Departments</option>
                {DEPARTMENTS.map(d => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>

              {/* Status Filter */}
              <select
                value={selectedStatusFilter}
                onChange={e => setSelectedStatusFilter(e.target.value)}
                className="px-3 py-2 text-xs bg-gray-50 border border-gray-200 rounded-xl text-gray-900 font-semibold"
              >
                <option value="ALL">All Statuses</option>
                <option value="ACTIVE">Active Only</option>
                <option value="SUSPENDED">Suspended Only</option>
              </select>

              <button
                onClick={() => {
                  setSearchQuery('');
                  setSelectedRoleFilter('ALL');
                  setSelectedDeptFilter('ALL');
                  setSelectedStatusFilter('ALL');
                  setSortBy('recent_login');
                }}
                className="px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold text-xs rounded-xl flex items-center gap-1 transition cursor-pointer"
                title="Reset Filters"
              >
                <RotateCcw className="w-3.5 h-3.5" /> Reset
              </button>

              <button
                onClick={() => setActiveTab('create')}
                className="px-4 py-2 bg-emerald-800 hover:bg-emerald-900 text-white font-bold text-xs rounded-xl shadow-sm flex items-center gap-1.5 whitespace-nowrap transition active:scale-95 cursor-pointer"
              >
                <UserPlus className="w-4 h-4" /> Add New Staff
              </button>
            </div>
          </div>

          {/* Staff Table */}
          <div className="bg-white rounded-2xl shadow-sm border border-emerald-100 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-emerald-50/70 text-emerald-950 uppercase text-[10px] font-bold tracking-wider border-b border-emerald-100">
                  <tr>
                    <th className="p-3.5 w-10 text-center">
                      <input
                        type="checkbox"
                        checked={paginatedStaff.length > 0 && paginatedStaff.every(s => selectedStaffIds.includes(s.id))}
                        onChange={toggleSelectCurrentPage}
                        className="rounded text-emerald-600 focus:ring-emerald-500 cursor-pointer w-4 h-4"
                        title="Select All on Current Page"
                      />
                    </th>
                    <th className="p-3.5">Staff Member</th>
                    <th className="p-3.5">Group &amp; Department</th>
                    <th className="p-3.5">Role</th>
                    <th className="p-3.5 text-center">Status</th>
                    <th className="p-3.5">Last Login</th>
                    <th className="p-3.5">Contact Details</th>
                    <th className="p-3.5 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 text-gray-700">
                  {visibleStaff.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-16 text-center text-gray-400">
                        <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center mx-auto shadow-2xs mb-2">
                          <Users className="w-6 h-6 text-emerald-700" />
                        </div>
                        <p className="font-black text-sm text-gray-800">No Active Staff Members in Directory</p>
                        <p className="text-xs text-gray-500 mt-1 max-w-sm mx-auto">There are currently no staff accounts created in the team management ledger.</p>
                        <div className="pt-3">
                          <button
                            onClick={() => setActiveTab('create')}
                            className="px-4 py-2 bg-emerald-800 hover:bg-emerald-900 text-white font-bold text-xs rounded-xl shadow-xs inline-flex items-center gap-1.5 transition cursor-pointer"
                          >
                            <Plus className="w-3.5 h-3.5" /> Add Staff Member
                          </button>
                        </div>
                      </td>
                    </tr>
                  ) : filteredStaff.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-12 text-center text-gray-400">
                        <Users className="w-10 h-10 mx-auto mb-2 opacity-40 text-emerald-600" />
                        <p className="font-bold text-sm text-gray-600">No Staff Members Match Search Criteria</p>
                        <p className="text-xs text-gray-500 mt-1">Try resetting the search keyword or role filters.</p>
                        <div className="pt-3">
                          <button
                            onClick={() => { setSearchQuery(''); setSelectedRoleFilter('ALL'); setSelectedStatusFilter('ALL'); setSelectedDeptFilter('ALL'); }}
                            className="px-4 py-2 bg-emerald-800 hover:bg-emerald-900 text-white font-bold text-xs rounded-xl shadow-xs inline-flex items-center gap-1.5 transition cursor-pointer"
                          >
                            <RotateCcw className="w-3.5 h-3.5" /> Clear All Filters
                          </button>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    paginatedStaff.map(staff => {
                      const roleMeta = rolesInfo.find(r => r.role === staff.role);
                      const isSelected = selectedStaffIds.includes(staff.id);
                      const isStaffActive = staff.status === 'ACTIVE' && staff.is_active !== false;

                      return (
                        <tr key={staff.id} className={`hover:bg-emerald-50/30 transition ${isSelected ? 'bg-emerald-50/60' : ''}`}>
                          {/* Multi-Select Checkbox */}
                          <td className="p-3.5 text-center">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => toggleSelectStaff(staff.id)}
                              className="rounded text-emerald-600 focus:ring-emerald-500 cursor-pointer w-4 h-4"
                            />
                          </td>

                          {/* Staff Member */}
                          <td className="p-3.5">
                            <button
                              onClick={() => setViewingStaff(staff)}
                              className="flex items-center gap-3 text-left group"
                            >
                              <div className="w-9 h-9 rounded-full bg-amber-400 text-emerald-950 font-black flex items-center justify-center text-xs shadow-xs group-hover:scale-105 transition-transform shrink-0">
                                {(staff.full_name || staff.email || 'S').charAt(0).toUpperCase()}
                              </div>
                              <div>
                                <div className="font-extrabold text-emerald-950 text-xs group-hover:underline flex items-center gap-1.5">
                                  <span>{staff.full_name || staff.email || 'Staff Member'}</span>
                                  <span className="text-[10px] bg-emerald-100 text-emerald-900 font-mono font-black px-1.5 py-0.5 rounded border border-emerald-300">
                                    #{formatUserId(staff.id)}
                                  </span>
                                </div>
                                <div className="text-[11px] text-gray-500 font-medium">{staff.designation || 'Staff'}</div>
                              </div>
                            </button>
                          </td>

                          {/* Group & Department */}
                          <td className="p-3.5">
                            <div className="font-bold text-gray-900">{staff.department || 'Store Operations'}</div>
                            <div className="text-[10px] text-emerald-800 font-semibold">{staff.user_group || 'General Operations'}</div>
                          </td>

                          {/* Assigned Role - 3D BADGE */}
                          <td className="p-3.5">
                            {get3DRoleBadge(staff.role, roleMeta?.title)}
                          </td>

                          {/* Status with Pop Modal Confirmation */}
                          <td className="p-3.5 text-center">
                            <div className="inline-flex items-center gap-1.5">
                              <span className={`px-2.5 py-1 rounded-full text-[10px] font-black inline-flex items-center gap-1.5 ${
                                isStaffActive
                                  ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                                  : 'bg-rose-100 text-rose-800 border border-rose-300'
                              }`}>
                                <span className={`w-2 h-2 rounded-full ${isStaffActive ? 'bg-emerald-500' : 'bg-rose-500'}`}></span>
                                {isStaffActive ? 'Active' : 'Suspended'}
                              </span>
                              {isStaffActive ? (
                                <button
                                  type="button"
                                  onClick={() => requestSuspendStaff(staff)}
                                  title="Suspend User Account (Lock Access)"
                                  className="p-1 hover:bg-amber-100 text-amber-700 rounded transition cursor-pointer"
                                >
                                  <UserX className="w-3.5 h-3.5" />
                                </button>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => requestRestoreStaff(staff)}
                                  title="Activate User Account (Restore Access)"
                                  className="p-1 hover:bg-emerald-100 text-emerald-700 rounded transition cursor-pointer"
                                >
                                  <UserCheck className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                          </td>

                          {/* Last Login Timestamp */}
                          <td className="p-3.5">
                            <div className="flex items-center gap-1.5 text-gray-700 font-medium">
                              <Calendar className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                              <span className="font-mono text-[11px] font-semibold">
                                {formatTimestamp(staff.last_login_at)}
                              </span>
                            </div>
                            {staff.last_login_at && (
                              <div className="text-[10px] text-emerald-700 font-bold ml-5">
                                Verified Session
                              </div>
                            )}
                          </td>

                          {/* Contact Details */}
                          <td className="p-3.5">
                            <div className="flex items-center gap-1.5 text-gray-600 font-medium">
                              <Mail className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                              <span>{staff.email}</span>
                            </div>
                            <div className="flex items-center gap-1.5 text-gray-500 text-[11px] mt-0.5">
                              <Phone className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                              <span>{staff.phone}</span>
                            </div>
                          </td>

                          {/* Actions */}
                          <td className="p-3.5 text-center">
                            <div className="flex items-center justify-center gap-1.5">
                              {/* Switch Login Button */}
                              <button
                                onClick={() => setSwitchingUser(staff)}
                                className="p-1.5 bg-purple-50 text-purple-800 rounded-lg hover:bg-purple-100 font-bold transition border border-purple-200 shadow-xs cursor-pointer"
                                title="Switch Session / Login as this User"
                              >
                                <LogIn className="w-4 h-4 text-purple-700" />
                              </button>

                              {/* View Profile Button */}
                              <button
                                onClick={() => setViewingStaff(staff)}
                                className="p-1.5 bg-emerald-50 text-emerald-800 rounded-lg hover:bg-emerald-100 transition border border-emerald-200 shadow-xs cursor-pointer"
                                title="View Complete Staff Profile & Password"
                              >
                                <Eye className="w-4 h-4" />
                              </button>

                              {/* Edit Profile Button */}
                              <button
                                onClick={() => {
                                  setEditingStaff(staff);
                                  setEditPasswordInput('');
                                  setShowPasswordInEdit(false);
                                }}
                                className="p-1.5 bg-blue-50 text-blue-800 rounded-lg hover:bg-blue-100 transition border border-blue-200 shadow-xs cursor-pointer"
                                title="Edit Staff Profile, Password & Status"
                              >
                                <Edit2 className="w-4 h-4" />
                              </button>

                              {/* Delete Staff Button */}
                              <button
                                onClick={() => setDeletingStaff(staff)}
                                className="p-1.5 bg-rose-50 text-rose-600 rounded-lg hover:bg-rose-100 transition border border-rose-200 shadow-xs cursor-pointer"
                                title="Archive or Permanently Delete Staff"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
            {filteredStaff.length > 0 && (
              <div className="p-4 bg-gray-50/70 border-t border-gray-100 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-gray-600">
                <div className="flex items-center gap-3">
                  <span>
                    Showing <strong className="text-gray-900 font-bold">{Math.min(filteredStaff.length, (currentPage - 1) * pageSize + 1)}</strong> to{' '}
                    <strong className="text-gray-900 font-bold">{Math.min(currentPage * pageSize, filteredStaff.length)}</strong> of{' '}
                    <strong className="text-gray-900 font-bold">{filteredStaff.length}</strong> staff members
                  </span>
                  <div className="flex items-center gap-1 ml-2">
                    <span className="text-[11px] text-gray-500">Show:</span>
                    <select
                      value={pageSize}
                      onChange={e => {
                        setPageSize(Number(e.target.value));
                        setCurrentPage(1);
                      }}
                      className="bg-white border border-gray-200 rounded-lg px-2 py-1 text-xs font-bold text-gray-800 focus:outline-none cursor-pointer"
                    >
                      <option value={10}>10</option>
                      <option value={25}>25</option>
                      <option value={50}>50</option>
                      <option value={100}>100</option>
                    </select>
                  </div>
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className="px-3 py-1.5 bg-white border border-gray-200 rounded-xl font-bold text-xs hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed transition cursor-pointer"
                  >
                    Previous
                  </button>

                  <div className="flex items-center gap-1">
                    {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                      <button
                        key={page}
                        onClick={() => setCurrentPage(page)}
                        className={`w-8 h-8 rounded-xl font-bold text-xs flex items-center justify-center transition cursor-pointer ${
                          currentPage === page
                            ? 'bg-emerald-800 text-white shadow-xs'
                            : 'bg-white border border-gray-200 text-gray-700 hover:bg-gray-100'
                        }`}
                      >
                        {page}
                      </button>
                    ))}
                  </div>

                  <button
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                    className="px-3 py-1.5 bg-white border border-gray-200 rounded-xl font-bold text-xs hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed transition cursor-pointer"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Floating Bulk Action Bar */}
          {selectedStaffIds.length > 0 && (
            <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 bg-gray-900/95 text-white px-5 py-3 rounded-2xl shadow-2xl border border-gray-700 flex flex-wrap items-center gap-3 backdrop-blur-md animate-fadeIn">
              <div className="flex items-center gap-2 pr-3 border-r border-gray-700">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse"></span>
                <span className="font-black text-xs text-amber-300">
                  {selectedStaffIds.length} staff selected
                </span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={requestBulkSuspend}
                  className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 transition shadow-xs cursor-pointer"
                >
                  <UserX className="w-3.5 h-3.5" /> Suspend
                </button>

                <button
                  type="button"
                  onClick={requestBulkActivate}
                  className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 transition shadow-xs cursor-pointer"
                >
                  <UserCheck className="w-3.5 h-3.5" /> Activate
                </button>

                <button
                  type="button"
                  onClick={requestBulkDelete}
                  className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 transition shadow-xs cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" /> Move to Archive
                </button>

                <button
                  type="button"
                  onClick={handleBulkExport}
                  className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 transition shadow-xs cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" /> Export Selected
                </button>

                <button
                  type="button"
                  onClick={clearSelection}
                  className="p-1.5 hover:bg-gray-800 text-gray-400 hover:text-white rounded-lg transition ml-1 cursor-pointer"
                  title="Deselect All"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ─── TAB 2: CREATE STAFF ────────────────────────────────────────────── */}
      {activeTab === 'create' && (
        <div className="max-w-3xl mx-auto bg-white p-6 sm:p-8 rounded-3xl shadow-sm border border-emerald-100 animate-fadeIn">
          <div className="flex items-center justify-between mb-4 border-b border-gray-100 pb-3">
            <div>
              <h2 className="text-lg font-bold text-emerald-950 flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-emerald-600" /> Create New Staff Account
              </h2>
              <p className="text-xs text-gray-500 mt-0.5">
                Register store staff personnel with unique 4-digit user ID, credentials, department, and role.
              </p>
            </div>
            <div className="text-right">
              <span className="text-[10px] text-gray-400 font-bold uppercase block">Auto-Assigned ID</span>
              <span className="font-mono font-black text-sm text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-xl border border-emerald-200 inline-block mt-0.5">
                #{getNextUserId(staffList, deletedStaffList)}
              </span>
            </div>
          </div>

          <form onSubmit={handleCreateStaffSubmit} className="space-y-4 text-xs">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block font-semibold mb-1 text-emerald-950">Full Name *</label>
                <input
                  type="text"
                  required
                  value={newStaff.full_name}
                  onChange={e => setNewStaff({ ...newStaff, full_name: e.target.value })}
                  placeholder="e.g. Saravanan Kumar"
                  className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block font-semibold mb-1 text-emerald-950">Designation *</label>
                <input
                  type="text"
                  required
                  value={newStaff.designation}
                  onChange={e => setNewStaff({ ...newStaff, designation: e.target.value })}
                  placeholder="e.g. Senior Billing Executive"
                  className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl text-gray-900"
                />
              </div>

              <div>
                <label className="block font-semibold mb-1 text-emerald-950">Email Address (Login ID) *</label>
                <input
                  type="email"
                  required
                  value={newStaff.email}
                  onChange={e => setNewStaff({ ...newStaff, email: e.target.value })}
                  placeholder="saravanan@mrvivasayi.in"
                  className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl text-gray-900"
                />
              </div>

              <div>
                <label className="block font-semibold mb-1 text-emerald-950">Phone Number *</label>
                <input
                  type="text"
                  required
                  value={newStaff.phone}
                  onChange={e => setNewStaff({ ...newStaff, phone: e.target.value })}
                  placeholder="+91 97893 25262"
                  className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl text-gray-900"
                />
              </div>

              <div>
                <label className="block font-semibold mb-1 text-emerald-950">User Group *</label>
                <select
                  value={newStaff.user_group}
                  onChange={e => setNewStaff({ ...newStaff, user_group: e.target.value })}
                  className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 font-semibold"
                >
                  {USER_GROUPS.map(g => (
                    <option key={g} value={g}>{g}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold mb-1 text-emerald-950">Department *</label>
                <select
                  value={newStaff.department}
                  onChange={e => setNewStaff({ ...newStaff, department: e.target.value })}
                  className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 font-semibold"
                >
                  {DEPARTMENTS.map(d => (
                    <option key={d} value={d}>{d}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold mb-1 text-emerald-950">Joining Date *</label>
                <input
                  type="date"
                  required
                  value={newStaff.joining_date}
                  onChange={e => setNewStaff({ ...newStaff, joining_date: e.target.value })}
                  className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 font-mono"
                />
              </div>

              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="block font-semibold text-emerald-950">Account Password *</label>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => {
                        setNewStaff({ ...newStaff, password: '@@12345678@@' });
                        setShowPasswordInCreate(true);
                      }}
                      className="text-[10px] font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 px-2 py-0.5 rounded-md border border-emerald-200"
                    >
                      Default
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const rand = generateRandomPassword();
                        setNewStaff({ ...newStaff, password: rand });
                        setShowPasswordInCreate(true);
                      }}
                      className="text-[10px] font-bold text-amber-700 bg-amber-50 hover:bg-amber-100 px-2 py-0.5 rounded-md border border-amber-200 flex items-center gap-1"
                    >
                      <Dices className="w-3 h-3" /> Random
                    </button>
                  </div>
                </div>
                <div className="relative">
                  <input
                    type={showPasswordInCreate ? "text" : "password"}
                    placeholder="Enter password (default: @@12345678@@)"
                    value={newStaff.password}
                    onChange={e => setNewStaff({ ...newStaff, password: e.target.value })}
                    className="w-full p-2.5 pr-9 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPasswordInCreate(!showPasswordInCreate)}
                    className="absolute right-2.5 top-2.5 text-gray-400 hover:text-emerald-700"
                  >
                    {showPasswordInCreate ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block font-semibold mb-1 text-emerald-950">Assign System Role *</label>
                <select
                  value={newStaff.role}
                  onChange={e => setNewStaff({ ...newStaff, role: e.target.value })}
                  className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 font-bold"
                >
                  {availableRoles.map(r => (
                    <option key={r.role} value={r.role}>{r.title} ({r.role})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold mb-1 text-emerald-950">Account Status *</label>
                <select
                  value={newStaff.status}
                  onChange={e => setNewStaff({ ...newStaff, status: e.target.value as any })}
                  className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 font-bold"
                >
                  <option value="ACTIVE">ACTIVE (Normal Login Access)</option>
                  <option value="SUSPENDED">SUSPENDED (Access Locked)</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block font-semibold mb-1 text-emerald-950">Emergency Contact</label>
              <input
                type="text"
                value={newStaff.emergency_contact}
                onChange={e => setNewStaff({ ...newStaff, emergency_contact: e.target.value })}
                className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl text-gray-900"
                placeholder="+91 98765 00000 (Relationship)"
              />
            </div>

            <div>
              <label className="block font-semibold mb-1 text-emerald-950">Staff Bio & Background</label>
              <textarea
                rows={3}
                value={newStaff.bio}
                onChange={e => setNewStaff({ ...newStaff, bio: e.target.value })}
                className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl text-gray-900"
                placeholder="Write brief background, skills, or operational notes..."
              />
            </div>

            <div className="pt-4 flex justify-end gap-3 border-t border-gray-100">
              <button
                type="button"
                onClick={() => setActiveTab('all')}
                className="px-4 py-2.5 bg-gray-100 text-gray-700 rounded-xl font-bold hover:bg-gray-200 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-6 py-2.5 bg-emerald-800 text-white rounded-xl font-bold hover:bg-emerald-900 shadow-sm cursor-pointer"
              >
                Save &amp; Create Staff Account
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ─── TAB: DELETED ARCHIVE (deleted_users table) ───────────────────── */}
      {activeTab === 'deleted' && (
        <div className="space-y-4 animate-fadeIn">
          <div className="bg-white p-5 rounded-2xl shadow-sm border border-rose-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
            <div>
              <h2 className="text-base font-bold text-rose-950 flex items-center gap-2">
                <Trash2 className="w-5 h-5 text-rose-600" />
                Deleted Staff Archive (<code className="font-mono text-xs bg-rose-50 px-2 py-0.5 rounded text-rose-700">deleted_users</code> table)
              </h2>
              <p className="text-xs text-gray-500 mt-0.5">
                Staff accounts removed from the active directory are moved to the <code className="font-mono">deleted_users</code> table. You can restore them to active directory or purge permanently.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-rose-800 bg-rose-50 px-3 py-1.5 rounded-xl border border-rose-200">
                {visibleDeletedStaff.length} Archived Account{visibleDeletedStaff.length === 1 ? '' : 's'}
              </span>
            </div>
          </div>

          {/* Deleted Users Table */}
          <div className="bg-white rounded-2xl shadow-sm border border-rose-100 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-rose-50/70 text-rose-950 uppercase text-[10px] font-bold tracking-wider border-b border-rose-100">
                  <tr>
                    <th className="p-3.5">User ID</th>
                    <th className="p-3.5">Staff Member</th>
                    <th className="p-3.5">Role &amp; Department</th>
                    <th className="p-3.5">Contact Details</th>
                    <th className="p-3.5">Deleted Timestamp</th>
                    <th className="p-3.5">Deleted By</th>
                    <th className="p-3.5 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 text-gray-700">
                  {visibleDeletedStaff.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-16 text-center text-gray-400">
                        <div className="w-12 h-12 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center mx-auto shadow-2xs mb-2">
                          <Trash2 className="w-6 h-6" />
                        </div>
                        <p className="font-black text-sm text-gray-800">No Deleted Staff Accounts</p>
                        <p className="text-xs text-gray-500 mt-1 max-w-sm mx-auto">
                          The <code className="font-mono">deleted_users</code> table is clean. Removed accounts will be safely preserved here.
                        </p>
                      </td>
                    </tr>
                  ) : (
                    visibleDeletedStaff.map(staff => (
                      <tr key={staff.id} className="hover:bg-rose-50/20 transition">
                        <td className="p-3.5">
                          <span className="text-xs bg-rose-100 text-rose-900 font-mono font-black px-2 py-1 rounded-lg border border-rose-300">
                            #{formatUserId(staff.id)}
                          </span>
                        </td>
                        <td className="p-3.5">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-rose-100 text-rose-800 font-black flex items-center justify-center text-xs shrink-0">
                              {(staff.full_name || staff.email || 'S').charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <div className="font-bold text-gray-900 line-through text-xs">{staff.full_name}</div>
                              <div className="text-[11px] text-gray-500">{staff.designation || 'Former Staff'}</div>
                            </div>
                          </div>
                        </td>
                        <td className="p-3.5">
                          <div>{get3DRoleBadge(staff.role)}</div>
                          <div className="text-[10px] text-gray-500 mt-1">{staff.department || 'Store Operations'}</div>
                        </td>
                        <td className="p-3.5">
                          <div className="font-mono text-gray-700 text-xs">{staff.email}</div>
                          <div className="text-[11px] text-gray-500">{staff.phone}</div>
                        </td>
                        <td className="p-3.5">
                          <div className="font-mono text-[11px] text-gray-600 flex items-center gap-1">
                            <Calendar className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                            <span>{formatTimestamp(staff.deleted_at || staff.updated_at)}</span>
                          </div>
                        </td>
                        <td className="p-3.5">
                          <span className="px-2 py-0.5 bg-gray-100 text-gray-700 font-semibold rounded text-[10px]">
                            {staff.deleted_by || 'Administrator'}
                          </span>
                        </td>
                        <td className="p-3.5 text-center">
                          <div className="flex items-center justify-center gap-2">
                            <button
                              type="button"
                              onClick={() => requestRestoreFromDeletedArchive(staff)}
                              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-xs flex items-center gap-1 transition cursor-pointer"
                              title="Restore Account back to active users directory"
                            >
                              <RotateCcw className="w-3.5 h-3.5" />
                              <span>Restore Account</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => requestPurgeFromDeletedArchive(staff)}
                              className="p-1.5 bg-rose-100 hover:bg-rose-200 text-rose-700 rounded-xl transition cursor-pointer"
                              title="Permanently Purge Record from database"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ─── TAB 3: HIERARCHICAL PERMISSIONS MATRIX ─────────────────────────── */}
      {activeTab === 'permissions' && (
        <div className="space-y-4 animate-fadeIn">
          {/* Top Control Bar */}
          <div className="bg-white p-5 rounded-2xl shadow-sm border border-emerald-100 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div>
              <h2 className="text-base font-bold text-emerald-950 flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-emerald-600" /> Hierarchical Permission Editor
              </h2>
              <p className="text-xs text-gray-500 mt-0.5">
                Configure View, Create, Edit, Delete, Approve, and Export permissions by Role or for individual Staff members.
              </p>
            </div>

            {/* Target Selector & Global Actions */}
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex bg-gray-100 p-1 rounded-xl">
                <button
                  onClick={() => setPermissionTargetType('ROLE')}
                  className={`px-3 py-1.5 text-xs font-bold rounded-lg transition ${
                    permissionTargetType === 'ROLE' ? 'bg-white text-emerald-950 shadow-xs' : 'text-gray-600'
                  }`}
                >
                  Role-Based
                </button>
                <button
                  onClick={() => setPermissionTargetType('STAFF')}
                  className={`px-3 py-1.5 text-xs font-bold rounded-lg transition ${
                    permissionTargetType === 'STAFF' ? 'bg-white text-emerald-950 shadow-xs' : 'text-gray-600'
                  }`}
                >
                  Staff-Based
                </button>
              </div>

              {permissionTargetType === 'ROLE' ? (
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-emerald-950">Target Role:</span>
                  <select
                    value={selectedRoleMatrix}
                    onChange={e => setSelectedRoleMatrix(e.target.value)}
                    className="px-3 py-2 text-xs bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-950 font-extrabold focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    {availableRoles.map(r => (
                      <option key={r.role} value={r.role}>{r.title} ({r.role})</option>
                    ))}
                  </select>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-emerald-950">Target Staff:</span>
                  <select
                    value={selectedStaffMatrix}
                    onChange={e => setSelectedStaffMatrix(e.target.value)}
                    className="px-3 py-2 text-xs bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-950 font-extrabold focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    {visibleStaff.map(s => (
                      <option key={s.id} value={s.id}>{s.full_name} ({s.role})</option>
                    ))}
                  </select>
                </div>
              )}

              {/* Quick Global Toggles */}
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => setAllGlobalPermissions(true)}
                  className="px-2.5 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-[11px] font-bold rounded-lg border border-emerald-200 transition"
                  title="Grant all available permissions"
                >
                  Select All
                </button>
                <button
                  onClick={() => setAllGlobalPermissions(false)}
                  className="px-2.5 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-800 text-[11px] font-bold rounded-lg border border-rose-200 transition"
                  title="Clear all permissions"
                >
                  Clear All
                </button>
              </div>
            </div>
          </div>

          {/* Search & Accordion Controls */}
          <div className="bg-white p-3.5 rounded-2xl shadow-sm border border-emerald-100 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
            <div className="relative w-full sm:w-80">
              <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-gray-400" />
              <input
                type="text"
                placeholder="Search modules or submenus..."
                value={permissionSearch}
                onChange={e => setPermissionSearch(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-xs"
              />
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  const allOpen: Record<string, boolean> = {};
                  HIERARCHICAL_PERMISSION_TREE.forEach(m => { allOpen[m.id] = true; });
                  setExpandedModules(allOpen);
                }}
                className="px-2.5 py-1 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-lg text-[11px]"
              >
                Expand All
              </button>
              <button
                onClick={() => setExpandedModules({})}
                className="px-2.5 py-1 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-lg text-[11px]"
              >
                Collapse All
              </button>
            </div>
          </div>

          {/* Hierarchical Tree Matrix */}
          <div className="space-y-3">
            {filteredPermissionModules.map(module => {
              const isExpanded = expandedModules[module.id] ?? false;

              // Count granted permissions in this module
              const subCount = module.submenus.length;
              let grantedActions = 0;
              let totalAvailableActions = 0;
              module.submenus.forEach(sub => {
                totalAvailableActions += sub.availableActions.length;
                sub.availableActions.forEach(act => {
                  if (activeTargetPermissions[sub.id]?.[act]) grantedActions++;
                });
              });

              return (
                <div key={module.id} className="bg-white rounded-2xl shadow-sm border border-emerald-100 overflow-hidden">
                  {/* Module Header Row */}
                  <div className="p-4 bg-emerald-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-emerald-100">
                    <button
                      onClick={() => setExpandedModules(prev => ({ ...prev, [module.id]: !prev[module.id] }))}
                      className="flex items-center gap-3 text-left flex-1 group"
                    >
                      <div className="p-1 rounded-lg bg-emerald-100 text-emerald-800 group-hover:bg-emerald-200 transition">
                        {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                      </div>
                      <div>
                        <div className="font-extrabold text-emerald-950 text-sm flex items-center gap-2">
                          <span>{module.title}</span>
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold border border-emerald-200">
                            {subCount} submenus • {grantedActions}/{totalAvailableActions} active
                          </span>
                        </div>
                        <p className="text-[11px] text-gray-500 mt-0.5">{module.description}</p>
                      </div>
                    </button>

                    <div className="flex items-center gap-2 self-end sm:self-center">
                      <button
                        onClick={() => toggleAllInModule(module.id, true)}
                        className="px-2 py-1 bg-white hover:bg-emerald-100 text-emerald-900 border border-emerald-200 rounded-lg text-[10px] font-bold transition"
                      >
                        Select Module
                      </button>
                      <button
                        onClick={() => toggleAllInModule(module.id, false)}
                        className="px-2 py-1 bg-white hover:bg-rose-100 text-rose-900 border border-rose-200 rounded-lg text-[10px] font-bold transition"
                      >
                        Clear Module
                      </button>
                    </div>
                  </div>

                  {/* Submenu Table (if expanded) */}
                  {isExpanded && (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-gray-50 text-gray-700 uppercase text-[10px] font-bold tracking-wider border-b border-gray-100">
                          <tr>
                            <th className="p-3 w-1/3">Submenu Feature</th>
                            <th className="p-3 text-center">View</th>
                            <th className="p-3 text-center">Create</th>
                            <th className="p-3 text-center">Edit</th>
                            <th className="p-3 text-center">Delete</th>
                            <th className="p-3 text-center">Approve</th>
                            <th className="p-3 text-center">Export</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 text-gray-700">
                          {module.submenus.map(sub => {
                            const subPerms = activeTargetPermissions[sub.id] || { view: false, create: false, edit: false, delete: false, approve: false, export: false };

                            return (
                              <tr key={sub.id} className="hover:bg-emerald-50/20 transition">
                                <td className="p-3">
                                  <div className="font-bold text-emerald-950 text-xs">{sub.label}</div>
                                  <div className="text-[10px] text-gray-400 mt-0.5">{sub.description}</div>
                                  {permissionTargetType === 'STAFF' && (
                                    <div className="mt-1">
                                      <span className="text-[9px] font-semibold text-gray-400 font-mono">
                                        ID: {sub.id}
                                      </span>
                                    </div>
                                  )}
                                </td>

                                {ALL_PERMISSION_ACTIONS.map(action => {
                                  const isAvailable = sub.availableActions.includes(action);
                                  const isChecked = subPerms[action] ?? false;

                                  if (!isAvailable) {
                                    return (
                                      <td key={action} className="p-3 text-center text-gray-300">
                                        <span className="text-gray-300 select-none">—</span>
                                      </td>
                                    );
                                  }

                                  return (
                                    <td key={action} className="p-3 text-center">
                                      <button
                                        type="button"
                                        onClick={() => togglePermission(sub.id, action)}
                                        className={`w-7 h-7 rounded-lg inline-flex items-center justify-center transition active:scale-90 border ${
                                          isChecked
                                            ? 'bg-emerald-600 text-white border-emerald-700 shadow-xs'
                                            : 'bg-gray-100 text-gray-400 hover:bg-gray-200 border-gray-200'
                                        }`}
                                        title={`${isChecked ? 'Disable' : 'Enable'} ${action} on ${sub.label}`}
                                      >
                                        {isChecked ? <Check className="w-4 h-4 stroke-[3]" /> : <X className="w-3.5 h-3.5 opacity-40" />}
                                      </button>
                                    </td>
                                  );
                                })}
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Bottom Save Bar */}
          <div className="p-4 bg-white rounded-2xl border border-emerald-100 shadow-sm flex flex-col sm:flex-row justify-between items-center gap-3">
            <div className="text-xs text-gray-500">
              <span className="font-bold text-emerald-950">Target:</span>{' '}
              {permissionTargetType === 'ROLE' ? `Role: ${selectedRoleMatrix}` : `Staff: ${staffList.find(s => s.id === selectedStaffMatrix)?.full_name || selectedStaffMatrix}`}
              <span className="ml-2 text-gray-400">• Click Save to apply and persist across database.</span>
            </div>
            <button
              onClick={handleSavePermissions}
              className="px-6 py-2.5 bg-emerald-800 text-white font-bold text-xs rounded-xl hover:bg-emerald-900 shadow-sm transition active:scale-95 flex items-center gap-1.5"
            >
              <CheckCircle2 className="w-4 h-4" /> Save Permissions Matrix
            </button>
          </div>
        </div>
      )}

      {/* ─── TAB 4: ROLE MANAGEMENT & CUSTOM ROLE CREATOR ───────────────────── */}
      {activeTab === 'roles' && (
        <div className="space-y-4 animate-fadeIn">
          <div className="bg-white p-5 rounded-2xl shadow-sm border border-emerald-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
            <div>
              <h2 className="text-base font-bold text-emerald-950 flex items-center gap-2">
                <Shield className="w-5 h-5 text-emerald-600" /> User Role Definitions & Custom Role Creator
              </h2>
              <p className="text-xs text-gray-500 mt-0.5">
                Manage built-in roles, create custom role definitions, duplicate permissions from existing templates, and assign roles to departments.
              </p>
            </div>

            <button
              onClick={() => setShowCreateRoleModal(true)}
              className="px-4 py-2 bg-emerald-800 hover:bg-emerald-900 text-white font-bold text-xs rounded-xl shadow-xs flex items-center gap-1.5 transition active:scale-95 whitespace-nowrap"
            >
              <Plus className="w-4 h-4" /> Add Custom Role
            </button>
          </div>

          {/* Roles Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {availableRoles.map(r => {
              const assignedStaffCount = visibleStaff.filter(s => s.role === r.role).length;

              return (
                <div key={r.role} className="bg-white p-5 rounded-2xl shadow-sm border border-emerald-100 flex flex-col justify-between hover:shadow-md transition">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold border ${r.badgeColor}`}>
                        Level {r.level} {r.isCustom && '• CUSTOM'}
                      </span>
                      <span className="text-xs font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-lg border border-emerald-100">
                        {assignedStaffCount} Staff Assigned
                      </span>
                    </div>

                    <h3 className="text-base font-extrabold text-emerald-950 mb-1">{r.title}</h3>
                    <p className="text-xs text-gray-500 leading-relaxed mb-3">{r.desc}</p>

                    {r.department && (
                      <div className="text-[11px] text-gray-600 font-semibold mb-3 flex items-center gap-1">
                        <Building className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Department: {r.department}</span>
                      </div>
                    )}
                  </div>

                  <div className="pt-3 border-t border-gray-100 flex flex-wrap justify-between items-center gap-2 text-xs">
                    <span className="font-mono text-emerald-900 font-bold text-[11px]">{r.role}</span>

                    <div className="flex items-center gap-1.5">
                      {/* Duplicate Button */}
                      <button
                        onClick={() => {
                          setDuplicatingRole(r);
                          setDuplicateForm({
                            title: `Assistant ${r.title}`,
                            code: `ASST_${r.role}`
                          });
                        }}
                        className="p-1.5 bg-gray-100 text-gray-700 hover:bg-gray-200 rounded-lg text-xs font-bold transition border border-gray-200"
                        title="Duplicate Role & Permissions"
                      >
                        <Copy className="w-3.5 h-3.5" />
                      </button>

                      {/* Edit Role Button (if custom) */}
                      {r.isCustom && (
                        <button
                          onClick={() => setEditingRole(r)}
                          className="p-1.5 bg-blue-50 text-blue-800 hover:bg-blue-100 rounded-lg text-xs font-bold transition border border-blue-200"
                          title="Edit Custom Role"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                      )}

                      {/* Delete Custom Role Button */}
                      {r.isCustom && (
                        <button
                          onClick={() => setDeletingRole(r)}
                          className="p-1.5 bg-rose-50 text-rose-600 hover:bg-rose-100 rounded-lg text-xs font-bold transition border border-rose-200"
                          title="Delete Custom Role"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}

                      {/* Configure Matrix Button */}
                      <button
                        onClick={() => {
                          setSelectedRoleMatrix(r.role);
                          setPermissionTargetType('ROLE');
                          setActiveTab('permissions');
                        }}
                        className="px-2.5 py-1 bg-emerald-50 text-emerald-800 font-bold rounded-lg hover:bg-emerald-100 text-[11px] border border-emerald-200"
                      >
                        Matrix →
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ─── MODAL: EDIT STAFF PROFILE ───────────────────────────────────────── */}
      {editingStaff && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-xl w-full p-6 shadow-2xl border border-emerald-100 space-y-4 animate-fadeIn max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <div className="flex items-center gap-2">
                <Edit2 className="w-5 h-5 text-emerald-600" />
                <div>
                  <h3 className="font-extrabold text-emerald-950 text-base">
                    Edit Staff Profile: {editingStaff.full_name}
                  </h3>
                  <span className="text-[10px] font-mono text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 font-bold">
                    User ID: #{formatUserId(editingStaff.id)}
                  </span>
                </div>
              </div>
              <button onClick={() => setEditingStaff(null)} className="text-gray-400 hover:text-gray-600 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleUpdateStaff} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-gray-700 mb-1">Full Name *</label>
                <input
                  type="text"
                  required
                  value={editingStaff.full_name}
                  onChange={(e) => setEditingStaff({ ...editingStaff, full_name: e.target.value })}
                  className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Email Address</label>
                  <input
                    type="email"
                    value={editingStaff.email}
                    onChange={(e) => setEditingStaff({ ...editingStaff, email: e.target.value })}
                    className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl"
                  />
                </div>
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Phone Number</label>
                  <input
                    type="text"
                    value={editingStaff.phone}
                    onChange={(e) => setEditingStaff({ ...editingStaff, phone: e.target.value })}
                    className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl"
                  />
                </div>

                <div>
                  <label className="block font-bold text-gray-700 mb-1">User Group</label>
                  <select
                    value={editingStaff.user_group || USER_GROUPS[0]}
                    onChange={(e) => setEditingStaff({ ...editingStaff, user_group: e.target.value })}
                    className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl font-bold"
                  >
                    {USER_GROUPS.map(g => (
                      <option key={g} value={g}>{g}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-gray-700 mb-1">Department</label>
                  <select
                    value={editingStaff.department || DEPARTMENTS[0]}
                    onChange={(e) => setEditingStaff({ ...editingStaff, department: e.target.value })}
                    className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl font-bold"
                  >
                    {DEPARTMENTS.map(d => (
                      <option key={d} value={d}>{d}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-gray-700 mb-1">Designation</label>
                  <input
                    type="text"
                    value={editingStaff.designation}
                    onChange={(e) => setEditingStaff({ ...editingStaff, designation: e.target.value })}
                    className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl"
                  />
                </div>

                <div>
                  <label className="block font-bold text-gray-700 mb-1">Joining Date</label>
                  <input
                    type="date"
                    value={editingStaff.joining_date || editingStaff.created_at}
                    onChange={(e) => setEditingStaff({ ...editingStaff, joining_date: e.target.value })}
                    className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Assigned Role</label>
                  <select
                    value={editingStaff.role}
                    onChange={(e) => setEditingStaff({ ...editingStaff, role: e.target.value })}
                    className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl font-bold"
                  >
                    {availableRoles.map(r => (
                      <option key={r.role} value={r.role}>{r.title} ({r.role})</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-gray-700 mb-1">Status</label>
                  <select
                    value={editingStaff.status}
                    onChange={(e) => setEditingStaff({ ...editingStaff, status: e.target.value as any })}
                    className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl font-bold"
                  >
                    <option value="ACTIVE">ACTIVE (Normal Access)</option>
                    <option value="SUSPENDED">SUSPENDED (Access Locked)</option>
                  </select>
                </div>
              </div>

              <div className="p-3.5 bg-gray-50 rounded-2xl border border-gray-200 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <label className="block font-bold text-gray-800 text-xs">Current Staff Password</label>
                    <span className="text-[10px] text-gray-500">Stored credentials for this account</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="font-mono text-xs font-bold text-emerald-950 bg-white px-2.5 py-1 rounded-lg border border-gray-200 select-all">
                      {showPasswordInEdit ? getDisplayPassword(editingStaff) : '••••••••••••'}
                    </span>
                    <button
                      type="button"
                      onClick={() => setShowPasswordInEdit(!showPasswordInEdit)}
                      className="p-1 text-gray-400 hover:text-emerald-800 transition cursor-pointer"
                      title={showPasswordInEdit ? "Hide Password" : "Show Password"}
                    >
                      {showPasswordInEdit ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard.writeText(getDisplayPassword(editingStaff));
                        toast.success(`Copied current password for ${editingStaff.full_name}!`);
                      }}
                      className="p-1 text-gray-400 hover:text-emerald-800 transition cursor-pointer"
                      title="Copy Current Password"
                    >
                      <Copy className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                <div className="pt-2 border-t border-gray-200/80">
                  <div className="flex justify-between items-center mb-1">
                    <label className="block font-bold text-gray-800 text-xs">Change Password (Optional)</label>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => {
                          setEditPasswordInput('@@12345678@@');
                          setShowPasswordInEdit(true);
                        }}
                        className="text-[10px] font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 px-2 py-0.5 rounded-md border border-emerald-200 cursor-pointer"
                      >
                        Set Default (@@12345678@@)
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          const rand = generateRandomPassword();
                          setEditPasswordInput(rand);
                          setShowPasswordInEdit(true);
                        }}
                        className="text-[10px] font-bold text-amber-700 bg-amber-50 hover:bg-amber-100 px-2 py-0.5 rounded-md border border-amber-200 flex items-center gap-1 cursor-pointer"
                      >
                        <Dices className="w-3 h-3" /> Random
                      </button>
                    </div>
                  </div>
                  <div className="relative">
                    <input
                      type={showPasswordInEdit ? "text" : "password"}
                      placeholder="Enter new password (leave blank to keep current)"
                      value={editPasswordInput}
                      onChange={(e) => setEditPasswordInput(e.target.value)}
                      className="w-full p-2.5 pr-9 bg-white border border-gray-200 rounded-xl font-mono text-xs"
                    />
                  </div>
                  <div className="text-[10px] text-gray-500 font-mono mt-1.5 flex items-center gap-1">
                    <Lock className="w-3 h-3 text-emerald-600" />
                    <span>Security: Applied with SHA-256 hash when saved to users table</span>
                  </div>
                </div>
              </div>

              <div>
                <label className="block font-bold text-gray-700 mb-1">Emergency Contact</label>
                <input
                  type="text"
                  value={editingStaff.emergency_contact}
                  onChange={(e) => setEditingStaff({ ...editingStaff, emergency_contact: e.target.value })}
                  className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl"
                />
              </div>

              <div>
                <label className="block font-bold text-gray-700 mb-1">Staff Bio</label>
                <textarea
                  rows={3}
                  value={editingStaff.bio}
                  onChange={(e) => setEditingStaff({ ...editingStaff, bio: e.target.value })}
                  className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl"
                />
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setEditingStaff(null)}
                  className="px-4 py-2 bg-gray-100 text-gray-700 font-bold rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-800 text-white font-bold rounded-xl shadow-xs"
                >
                  Save All Updates
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── MODAL: VIEW STAFF PROFILE ───────────────────────────────────────── */}
      {viewingStaff && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 shadow-2xl border border-emerald-100 space-y-6 animate-fadeIn">
            <div className="flex items-center justify-between border-b border-gray-100 pb-4">
              <div className="flex items-center space-x-3">
                <div className="w-14 h-14 rounded-full bg-amber-400 text-emerald-950 font-black text-xl flex items-center justify-center shadow-xs">
                  {String(viewingStaff.full_name || viewingStaff.email || 'S').charAt(0).toUpperCase()}
                </div>
                <div>
                  <h3 className="font-extrabold text-emerald-950 text-lg flex items-center gap-2">
                    <span>{viewingStaff.full_name || viewingStaff.email || 'Staff Member'}</span>
                    <span className="text-xs bg-emerald-100 text-emerald-900 font-mono font-black px-2 py-0.5 rounded-lg border border-emerald-300">
                      #{formatUserId(viewingStaff.id)}
                    </span>
                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black inline-flex items-center gap-1.5 ${
                      viewingStaff.status === 'ACTIVE' && viewingStaff.is_active !== false
                        ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                        : 'bg-rose-100 text-rose-800 border border-rose-300'
                    }`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${viewingStaff.status === 'ACTIVE' && viewingStaff.is_active !== false ? 'bg-emerald-500' : 'bg-rose-500'}`}></span>
                      {viewingStaff.status === 'ACTIVE' && viewingStaff.is_active !== false ? 'Active' : 'Suspended'}
                    </span>
                  </h3>
                  <p className="text-xs text-gray-500">
                    {viewingStaff.designation} • {viewingStaff.department || 'Store Operations'} • {viewingStaff.user_group || 'General Operations'}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    const currentView = viewingStaff;
                    setViewingStaff(null);
                    setEditingStaff(currentView);
                  }}
                  className="px-3 py-1.5 bg-blue-100 text-blue-800 font-bold text-xs rounded-xl hover:bg-blue-200 transition flex items-center gap-1 border border-blue-300 cursor-pointer"
                >
                  <Edit2 className="w-3.5 h-3.5" /> Edit Profile
                </button>

                <button onClick={() => setViewingStaff(null)} className="text-gray-400 hover:text-gray-600 cursor-pointer">
                  <X className="w-6 h-6" />
                </button>
              </div>
            </div>

            <div className="space-y-4 text-xs">
              <div className="bg-emerald-50/70 p-4 rounded-2xl border border-emerald-100">
                <h4 className="font-extrabold text-emerald-950 mb-1">Staff Bio &amp; Background Overview</h4>
                <p className="text-gray-700 leading-relaxed">{viewingStaff.bio || 'Dedicated team member.'}</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-3 bg-gray-50 rounded-xl border border-gray-100">
                  <span className="text-[10px] text-gray-400 font-bold uppercase">Role Title</span>
                  <div className="mt-1">{get3DRoleBadge(viewingStaff.role)}</div>
                </div>
                <div className="p-3 bg-gray-50 rounded-xl border border-gray-100">
                  <span className="text-[10px] text-gray-400 font-bold uppercase">Joining Date</span>
                  <div className="font-bold text-gray-800 mt-0.5 font-mono">{viewingStaff.joining_date || viewingStaff.created_at}</div>
                </div>
                <div className="p-3 bg-gray-50 rounded-xl border border-gray-100">
                  <span className="text-[10px] text-gray-400 font-bold uppercase">Email Address</span>
                  <div className="font-bold text-gray-800 mt-0.5">{viewingStaff.email}</div>
                </div>
                <div className="p-3 bg-gray-50 rounded-xl border border-gray-100">
                  <span className="text-[10px] text-gray-400 font-bold uppercase">Phone Number</span>
                  <div className="font-bold text-gray-800 mt-0.5">{viewingStaff.phone}</div>
                </div>
                <div className="p-3 bg-gray-50 rounded-xl border border-gray-100">
                  <span className="text-[10px] text-gray-400 font-bold uppercase">Department &amp; Group</span>
                  <div className="font-bold text-gray-800 mt-0.5">{viewingStaff.department} ({viewingStaff.user_group})</div>
                </div>
                <div className="p-3 bg-gray-50 rounded-xl border border-gray-100">
                  <span className="text-[10px] text-gray-400 font-bold uppercase">Emergency Contact</span>
                  <div className="font-bold text-gray-800 mt-0.5">{viewingStaff.emergency_contact}</div>
                </div>
                <div className="p-3 bg-gray-50 rounded-xl border border-gray-100">
                  <span className="text-[10px] text-gray-400 font-bold uppercase">Last Login Timestamp</span>
                  <div className="font-bold text-emerald-900 mt-0.5 font-mono flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-emerald-600" />
                    <span>{formatTimestamp(viewingStaff.last_login_at)}</span>
                  </div>
                </div>
                <div className="p-3 bg-gray-50 rounded-xl border border-gray-100">
                  <span className="text-[10px] text-gray-400 font-bold uppercase">Password / Credentials</span>
                  <div className="flex items-center justify-between mt-0.5">
                    <span className="font-mono font-bold text-emerald-950 text-xs select-all">
                      {viewModalPasswordVisible ? getDisplayPassword(viewingStaff) : '••••••••••••'}
                    </span>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => setViewModalPasswordVisible(!viewModalPasswordVisible)}
                        className="p-1 hover:bg-gray-200 text-gray-500 rounded transition cursor-pointer"
                        title={viewModalPasswordVisible ? "Hide Password" : "Show Password"}
                      >
                        {viewModalPasswordVisible ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          navigator.clipboard.writeText(getDisplayPassword(viewingStaff));
                          toast.success('Password copied to clipboard!');
                        }}
                        className="p-1 hover:bg-emerald-100 text-emerald-700 rounded transition cursor-pointer"
                        title="Copy Password"
                      >
                        <Copy className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="pt-2 flex justify-end gap-3 border-t border-gray-100">
              <button
                onClick={() => setViewingStaff(null)}
                className="px-5 py-2 bg-emerald-800 hover:bg-emerald-900 text-white font-bold text-xs rounded-xl shadow-xs cursor-pointer"
              >
                Close Profile
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── MODAL: SWITCH USER LOGIN ────────────────────────────────────────── */}
      {switchingUser && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-purple-100 text-center animate-fadeIn space-y-4">
            <div className="w-16 h-16 rounded-full bg-purple-100 text-purple-700 mx-auto flex items-center justify-center border-4 border-purple-200 shadow-sm">
              <LogIn className="w-8 h-8" />
            </div>

            <h3 className="font-extrabold text-emerald-950 text-lg">Switch User Session Login?</h3>

            <p className="text-xs text-gray-600 leading-relaxed">
              Do you want to switch your active session and log in as <strong className="text-emerald-950">{switchingUser.full_name}</strong> ({switchingUser.role})?
              <br />
              <span className="text-[11px] text-purple-700 font-semibold mt-1 inline-block">The page will refresh to load this staff member's permissions.</span>
            </p>

            {/* 15-second security countdown banner */}
            <div className="p-3 bg-purple-50 rounded-2xl border border-purple-200 text-xs flex items-center justify-between">
              <div className="flex items-center gap-2 text-purple-900 font-bold">
                <span className="w-2.5 h-2.5 rounded-full bg-purple-600 animate-ping"></span>
                <span>Security Session Guard</span>
              </div>
              <span className="font-mono font-black text-purple-800 bg-white px-2.5 py-1 rounded-lg border border-purple-300">
                {switchCountdown}s timeout
              </span>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => setSwitchingUser(null)}
                className="flex-1 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold text-xs rounded-xl cursor-pointer"
              >
                No, Cancel
              </button>
              <button
                type="button"
                onClick={confirmSwitchUser}
                className="flex-1 py-2.5 bg-purple-700 hover:bg-purple-800 text-white font-bold text-xs rounded-xl shadow-sm cursor-pointer"
              >
                Yes, Switch Login ({switchCountdown}s)
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── MODAL: DELETE & SUSPEND STAFF CONFIRMATION ───────────────────────── */}
      {deletingStaff && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-7 shadow-2xl border border-rose-100 space-y-5 animate-fadeIn">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center border border-rose-200">
                  <AlertCircle className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-gray-900 text-base flex items-center gap-2">
                    <span>Manage Staff Removal: {deletingStaff.full_name || deletingStaff.email}</span>
                    <span className="text-xs bg-rose-100 text-rose-800 font-mono font-bold px-2 py-0.5 rounded border border-rose-300">
                      #{formatUserId(deletingStaff.id)}
                    </span>
                  </h3>
                  <p className="text-xs text-gray-500">
                    Choose whether to temporarily suspend access or move to deleted_users archive table.
                  </p>
                </div>
              </div>
              <button onClick={() => setDeletingStaff(null)} className="text-gray-400 hover:text-gray-600 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="bg-gray-50 p-4 rounded-2xl border border-gray-200 text-xs space-y-2">
              <div className="flex justify-between">
                <span className="text-gray-500">Staff Member:</span>
                <span className="font-extrabold text-gray-900">{deletingStaff.full_name || 'N/A'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Email Address:</span>
                <span className="font-mono text-gray-700">{deletingStaff.email}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Designation &amp; Role:</span>
                <span className="font-bold text-emerald-800">{deletingStaff.designation} ({deletingStaff.role})</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Current Status:</span>
                <span className="font-bold uppercase text-amber-700">{deletingStaff.status}</span>
              </div>
            </div>

            <div className="space-y-3 pt-1">
              {/* Option 1: Soft Suspend */}
              <div className="p-3.5 bg-amber-50/70 rounded-2xl border border-amber-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h4 className="font-bold text-amber-950 text-xs flex items-center gap-1.5">
                    <UserX className="w-4 h-4 text-amber-600" /> Option A: Suspend Access (Safe)
                  </h4>
                  <p className="text-[11px] text-amber-800/80 mt-0.5">
                    Locks login credentials immediately. Profile data and history are preserved.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => confirmSuspendStaff(deletingStaff)}
                  className="px-3.5 py-2 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs rounded-xl shadow-xs shrink-0 transition cursor-pointer"
                >
                  Suspend Account
                </button>
              </div>

              {/* Option 2: Archive to deleted_users Table */}
              <div className="p-3.5 bg-rose-50/60 rounded-2xl border border-rose-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h4 className="font-bold text-rose-950 text-xs flex items-center gap-1.5">
                    <Trash2 className="w-4 h-4 text-rose-600" /> Option B: Move to deleted_users Table
                  </h4>
                  <p className="text-[11px] text-rose-700/80 mt-0.5">
                    Removes from active directory and safely moves into <code className="font-mono font-bold">deleted_users</code> table. Can be restored anytime with 1 click.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={confirmDeleteStaff}
                  className="px-3.5 py-2 bg-rose-700 hover:bg-rose-800 text-white font-bold text-xs rounded-xl shadow-xs shrink-0 transition cursor-pointer"
                >
                  Move to deleted_users
                </button>
              </div>

              {/* Option 3: Permanent Delete from DB */}
              <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h4 className="font-bold text-slate-900 text-xs flex items-center gap-1.5">
                    <AlertCircle className="w-4 h-4 text-slate-600" /> Option C: Permanent Purge
                  </h4>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Permanently purges this record from database storage without archiving.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={confirmPermanentDeleteStaff}
                  className="px-3.5 py-2 bg-slate-700 hover:bg-slate-800 text-white font-bold text-xs rounded-xl shadow-xs shrink-0 transition cursor-pointer"
                >
                  Purge Directly
                </button>
              </div>
            </div>

            <div className="flex justify-end pt-2 border-t border-gray-100">
              <button
                type="button"
                onClick={() => setDeletingStaff(null)}
                className="px-5 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold text-xs rounded-xl transition cursor-pointer"
              >
                Cancel / Keep Account
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── MODAL: CREATE CUSTOM ROLE ───────────────────────────────────────── */}
      {showCreateRoleModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-emerald-100 space-y-4 animate-fadeIn">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <h3 className="font-extrabold text-emerald-950 text-base flex items-center gap-2">
                <Shield className="w-5 h-5 text-emerald-600" /> Create Custom User Role
              </h3>
              <button onClick={() => setShowCreateRoleModal(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateCustomRoleSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-gray-700 mb-1">Role Title *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Procurement Specialist"
                  value={newCustomRole.title}
                  onChange={e => setNewCustomRole({ ...newCustomRole, title: e.target.value })}
                  className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl"
                />
              </div>

              <div>
                <label className="block font-bold text-gray-700 mb-1">Role System Code *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. PROCUREMENT_SPECIALIST"
                  value={newCustomRole.code}
                  onChange={e => setNewCustomRole({ ...newCustomRole, code: e.target.value })}
                  className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl font-mono uppercase"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Security Level (1-7)</label>
                  <input
                    type="number"
                    min={1}
                    max={7}
                    value={newCustomRole.level}
                    onChange={e => setNewCustomRole({ ...newCustomRole, level: Number(e.target.value) })}
                    className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl"
                  />
                </div>

                <div>
                  <label className="block font-bold text-gray-700 mb-1">Department</label>
                  <select
                    value={newCustomRole.department}
                    onChange={e => setNewCustomRole({ ...newCustomRole, department: e.target.value })}
                    className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl"
                  >
                    {DEPARTMENTS.map(d => (
                      <option key={d} value={d}>{d}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-bold text-gray-700 mb-1">Badge Color Theme</label>
                <select
                  value={newCustomRole.badgeColor}
                  onChange={e => setNewCustomRole({ ...newCustomRole, badgeColor: e.target.value })}
                  className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl text-[11px]"
                >
                  <option value="bg-indigo-100 text-indigo-800 border-indigo-200">Indigo Theme</option>
                  <option value="bg-emerald-100 text-emerald-800 border-emerald-200">Emerald Theme</option>
                  <option value="bg-amber-100 text-amber-800 border-amber-200">Amber Theme</option>
                  <option value="bg-teal-100 text-teal-800 border-teal-200">Teal Theme</option>
                  <option value="bg-purple-100 text-purple-800 border-purple-200">Purple Theme</option>
                  <option value="bg-cyan-100 text-cyan-800 border-cyan-200">Cyan Theme</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-gray-700 mb-1">Role Description</label>
                <textarea
                  rows={2}
                  placeholder="Describe scope of responsibilities..."
                  value={newCustomRole.desc}
                  onChange={e => setNewCustomRole({ ...newCustomRole, desc: e.target.value })}
                  className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl"
                />
              </div>

              <div className="flex justify-end gap-3 pt-2 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setShowCreateRoleModal(false)}
                  className="px-4 py-2 bg-gray-100 text-gray-700 font-bold rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-800 text-white font-bold rounded-xl shadow-xs"
                >
                  Create Custom Role
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── MODAL: DUPLICATE ROLE ───────────────────────────────────────────── */}
      {duplicatingRole && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-emerald-100 space-y-4 animate-fadeIn">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <h3 className="font-extrabold text-emerald-950 text-base flex items-center gap-2">
                <Copy className="w-5 h-5 text-indigo-600" /> Duplicate Role: {duplicatingRole.title}
              </h3>
              <button onClick={() => setDuplicatingRole(null)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-gray-500">
              This will create a new custom role with an exact clone of all {duplicatingRole.title}'s permission matrix values.
            </p>

            <form onSubmit={handleDuplicateRoleSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-gray-700 mb-1">New Role Title *</label>
                <input
                  type="text"
                  required
                  value={duplicateForm.title}
                  onChange={e => setDuplicateForm({ ...duplicateForm, title: e.target.value })}
                  placeholder="e.g. Assistant Operations Manager"
                  className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl"
                />
              </div>

              <div>
                <label className="block font-bold text-gray-700 mb-1">New Role Code *</label>
                <input
                  type="text"
                  required
                  value={duplicateForm.code}
                  onChange={e => setDuplicateForm({ ...duplicateForm, code: e.target.value })}
                  placeholder="e.g. ASST_OPS_MANAGER"
                  className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl font-mono uppercase"
                />
              </div>

              <div className="flex justify-end gap-3 pt-2 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setDuplicatingRole(null)}
                  className="px-4 py-2 bg-gray-100 text-gray-700 font-bold rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-indigo-700 text-white font-bold rounded-xl shadow-xs hover:bg-indigo-800"
                >
                  Confirm &amp; Duplicate Role
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── MODAL: EDIT ROLE ────────────────────────────────────────────────── */}
      {editingRole && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-emerald-100 space-y-4 animate-fadeIn">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <h3 className="font-extrabold text-emerald-950 text-base flex items-center gap-2">
                <Edit2 className="w-5 h-5 text-emerald-600" /> Edit Role: {editingRole.role}
              </h3>
              <button onClick={() => setEditingRole(null)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleUpdateRoleSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-gray-700 mb-1">Role Title *</label>
                <input
                  type="text"
                  required
                  value={editingRole.title}
                  onChange={e => setEditingRole({ ...editingRole, title: e.target.value })}
                  className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Level (1-7)</label>
                  <input
                    type="number"
                    min={1}
                    max={7}
                    value={editingRole.level}
                    onChange={e => setEditingRole({ ...editingRole, level: Number(e.target.value) })}
                    className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl"
                  />
                </div>

                <div>
                  <label className="block font-bold text-gray-700 mb-1">Department</label>
                  <select
                    value={editingRole.department || DEPARTMENTS[0]}
                    onChange={e => setEditingRole({ ...editingRole, department: e.target.value })}
                    className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl"
                  >
                    {DEPARTMENTS.map(d => (
                      <option key={d} value={d}>{d}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-bold text-gray-700 mb-1">Badge Color</label>
                <select
                  value={editingRole.badgeColor}
                  onChange={e => setEditingRole({ ...editingRole, badgeColor: e.target.value })}
                  className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl text-[11px]"
                >
                  <option value="bg-indigo-100 text-indigo-800 border-indigo-200">Indigo Theme</option>
                  <option value="bg-emerald-100 text-emerald-800 border-emerald-200">Emerald Theme</option>
                  <option value="bg-amber-100 text-amber-800 border-amber-200">Amber Theme</option>
                  <option value="bg-teal-100 text-teal-800 border-teal-200">Teal Theme</option>
                  <option value="bg-purple-100 text-purple-800 border-purple-200">Purple Theme</option>
                  <option value="bg-cyan-100 text-cyan-800 border-cyan-200">Cyan Theme</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-gray-700 mb-1">Description</label>
                <textarea
                  rows={2}
                  value={editingRole.desc}
                  onChange={e => setEditingRole({ ...editingRole, desc: e.target.value })}
                  className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl"
                />
              </div>

              <div className="flex justify-end gap-3 pt-2 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setEditingRole(null)}
                  className="px-4 py-2 bg-gray-100 text-gray-700 font-bold rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-800 text-white font-bold rounded-xl shadow-xs"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── MODAL: DELETE ROLE CONFIRMATION ─────────────────────────────────── */}
      {deletingRole && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-emerald-100 text-center animate-fadeIn space-y-4">
            <div className="w-14 h-14 rounded-full bg-rose-100 text-rose-600 mx-auto flex items-center justify-center border-4 border-rose-200">
              <AlertCircle className="w-7 h-7" />
            </div>

            <h3 className="font-extrabold text-emerald-950 text-lg">Delete Custom Role?</h3>

            <p className="text-xs text-gray-500 leading-relaxed">
              Are you sure you want to delete custom role <strong className="text-emerald-900">{deletingRole.title}</strong> ({deletingRole.role})? This cannot be undone.
            </p>

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => setDeletingRole(null)}
                className="flex-1 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold text-xs rounded-xl"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmDeleteRole}
                className="flex-1 py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-xl shadow-xs"
              >
                Yes, Delete Role
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── MODAL: ACTION CONFIRMATION (YES / NO) ─────────────────────────── */}
      {actionConfirmModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-gray-100 space-y-4 animate-fadeIn">
            <div className="flex items-center gap-3 border-b border-gray-100 pb-3">
              <div className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 ${
                actionConfirmModal.confirmButtonColor === 'rose' ? 'bg-rose-100 text-rose-600' :
                actionConfirmModal.confirmButtonColor === 'amber' ? 'bg-amber-100 text-amber-700' :
                actionConfirmModal.confirmButtonColor === 'emerald' ? 'bg-emerald-100 text-emerald-700' :
                'bg-blue-100 text-blue-700'
              }`}>
                <AlertCircle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-extrabold text-gray-900 text-base">{actionConfirmModal.title}</h3>
                <span className="text-[11px] text-gray-500">Security &amp; Confirmation Guard</span>
              </div>
            </div>

            <p className="text-xs text-gray-600 leading-relaxed">
              {actionConfirmModal.subtitle}
            </p>

            {actionConfirmModal.targetStaff && (
              <div className="p-3 bg-gray-50 rounded-xl border border-gray-200 text-xs space-y-1 font-medium">
                <div className="flex justify-between">
                  <span className="text-gray-500">Staff Member:</span>
                  <span className="font-bold text-gray-900">{actionConfirmModal.targetStaff.full_name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">User ID:</span>
                  <span className="font-mono font-bold text-emerald-800">#{formatUserId(actionConfirmModal.targetStaff.id)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Role:</span>
                  <span className="font-bold text-gray-800">{actionConfirmModal.targetStaff.role}</span>
                </div>
              </div>
            )}

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setActionConfirmModal(null)}
                className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold text-xs rounded-xl transition cursor-pointer"
              >
                No, Cancel
              </button>
              <button
                type="button"
                onClick={actionConfirmModal.onConfirm}
                className={`px-5 py-2 font-bold text-xs text-white rounded-xl shadow-sm transition cursor-pointer ${
                  actionConfirmModal.confirmButtonColor === 'rose' ? 'bg-rose-700 hover:bg-rose-800' :
                  actionConfirmModal.confirmButtonColor === 'amber' ? 'bg-amber-600 hover:bg-amber-700' :
                  actionConfirmModal.confirmButtonColor === 'emerald' ? 'bg-emerald-700 hover:bg-emerald-800' :
                  'bg-blue-700 hover:bg-blue-800'
                }`}
              >
                {actionConfirmModal.confirmButtonText}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
