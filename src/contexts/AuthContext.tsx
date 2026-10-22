import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { SYSTEM_STAFF_USERS, getJSONStore, setJSONStore } from '../lib/dbManager';
import { verifyPassword } from '../lib/security';
import type { UserProfile, UserRole } from '../types';
import {
  PermissionAction,
  HIERARCHICAL_PERMISSION_TREE,
  buildDefaultRolePermissions,
  RoleDefinition,
  DEFAULT_SYSTEM_ROLES
} from '../lib/permissionsConfig';

// ---- Role permission hierarchy ----
const ROLE_HIERARCHY: Record<UserRole, number> = {
  SUPER_ADMIN: 10,
  OWNER: 9,
  ADMIN: 8,
  STORE_MANAGER: 7,
  PRODUCT_MANAGER: 6,
  BILLING_MANAGER: 5,
  INVENTORY_MANAGER: 4,
  STAFF: 3,
  SALES_STAFF: 2,
  DELIVERY_STAFF: 2,
  VIEWER: 1,
};

interface AuthContextValue {
  user: UserProfile | null;
  profile: UserProfile | null;
  isLoading: boolean;
  isSwitchingRole: boolean;
  isAuthenticated: boolean;
  demoMode: boolean;
  isSuperAdmin: boolean;
  isAdmin: boolean;

  // Role checking
  hasRole: (minimumRole: UserRole) => boolean;
  hasPermission: (module: string, action: PermissionAction) => boolean;

  // Actions
  switchDemoUser: (role: UserRole) => Promise<void>;
  loginWithSupabase: (email: string, password: string) => Promise<void>;
  logout: () => void;

  // Legacy signIn/signOut aliases
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSwitchingRole, setIsSwitchingRole] = useState(false);
  const [demoMode, setDemoMode] = useState(false);

  const [usersList, setUsersList] = useState<UserProfile[]>([]);
  const [rolesList, setRolesList] = useState<RoleDefinition[]>(DEFAULT_SYSTEM_ROLES);

  useEffect(() => {
    async function initAuth() {
      // 100% users.json and roles.json based account loading
      const [loadedUsers, loadedRoles] = await Promise.all([
        getJSONStore<UserProfile>('users'),
        getJSONStore<RoleDefinition>('roles')
      ]);
      setUsersList(loadedUsers || []);
      if (loadedRoles && loadedRoles.length > 0) {
        setRolesList(loadedRoles);
      }

      const savedUserEmail = localStorage.getItem('mrvivasayi_active_user_email');
      if (savedUserEmail) {
        const found = (loadedUsers || []).find(u => u.email && u.email.toLowerCase() === savedUserEmail.toLowerCase());
        if (found) {
          if (found.status === 'SUSPENDED' || (found as any).status === 'DELETED' || found.is_active === false) {
            localStorage.removeItem('mrvivasayi_active_user_email');
            setUser(null);
            setIsLoading(false);
            return;
          }
          setUser(found);
          setIsLoading(false);
          return;
        }
      }

      // No active authenticated session -> guest user (proper route protection)
      setUser(null);
      setIsLoading(false);
    }

    initAuth();
  }, []);

  const switchDemoUser = useCallback(async (role: UserRole): Promise<void> => {
    setIsSwitchingRole(true);
    try {
      const loadedUsers = await getJSONStore<UserProfile>('users');
      const found = (loadedUsers || []).find(u => u.role === role) || SYSTEM_STAFF_USERS[role];
      if (found) {
        if (found.status === 'SUSPENDED' || (found as any).status === 'DELETED' || found.is_active === false) {
          throw new Error(`This user account (${found.email}) has been suspended by the administrator. Login access is denied.`);
        }
        const nowIso = new Date().toISOString();
        const updated = { ...found, last_login_at: nowIso };
        setUser(updated);
        localStorage.setItem('mrvivasayi_active_user_email', found.email);
        const updatedList = (loadedUsers || []).map(u => u.id === found.id ? { ...u, last_login_at: nowIso } : u);
        setJSONStore('users', updatedList).catch(() => {});
      } else {
        throw new Error(`No staff profile found for role: ${role}`);
      }
    } finally {
      setIsSwitchingRole(false);
    }
  }, []);

  const loginWithSupabase = useCallback(async (email: string, password: string): Promise<void> => {
    setIsSwitchingRole(true);
    try {
      const cleanEmail = email.trim().toLowerCase();
      const loadedUsers = await getJSONStore<UserProfile>('users');
      const matched = (loadedUsers || []).find(u => u.email && u.email.trim().toLowerCase() === cleanEmail);

      if (matched) {
        // Check if user is suspended or deactivated
        if (matched.status === 'SUSPENDED' || (matched as any).status === 'DELETED' || matched.is_active === false) {
          throw new Error('This user account has been suspended by the administrator. Login access is denied.');
        }

        const isValid = verifyPassword(password, matched.password);
        if (!isValid) {
          throw new Error('Incorrect password. Please verify your credentials.');
        }

        // Update real last_login_at timestamp in database
        const nowIso = new Date().toISOString();
        const updatedUser = { ...matched, last_login_at: nowIso };
        setUser(updatedUser);
        localStorage.setItem('mrvivasayi_active_user_email', matched.email);

        const updatedList = (loadedUsers || []).map(u => u.id === matched.id ? { ...u, last_login_at: nowIso } : u);
        setJSONStore('users', updatedList).catch(() => {});
        return;
      }

      // Check if user is in deleted_users archive
      const deletedUsers = await getJSONStore<UserProfile>('deleted_users');
      const deletedMatch = (deletedUsers || []).find(u => u.email && u.email.trim().toLowerCase() === cleanEmail);
      if (deletedMatch) {
        throw new Error('This user account has been archived or deleted by the administrator. Login access is denied.');
      }

      // Fallback to SYSTEM_STAFF_USERS
      const systemUser = Object.values(SYSTEM_STAFF_USERS).find(u => u.email.toLowerCase() === cleanEmail);
      if (systemUser) {
        if (systemUser.status === 'SUSPENDED' || systemUser.is_active === false) {
          throw new Error('This user account has been suspended by the administrator. Login access is denied.');
        }
        const isValid = verifyPassword(password, systemUser.password);
        if (!isValid) {
          throw new Error('Incorrect password. Please verify your credentials.');
        }
        const nowIso = new Date().toISOString();
        const updatedUser = { ...systemUser, last_login_at: nowIso };
        setUser(updatedUser);
        localStorage.setItem('mrvivasayi_active_user_email', systemUser.email);
        return;
      }
      
      if (isSupabaseConfigured()) {
        const { error } = await supabase.auth.signInWithPassword({ email: cleanEmail, password });
        if (error) {
          throw new Error(error.message);
        }
      } else {
        throw new Error(`User account "${email}" not found in database.`);
      }
    } finally {
      setIsSwitchingRole(false);
    }
  }, []);

  const logout = useCallback(() => {
    setIsSwitchingRole(true);
    setTimeout(() => {
      localStorage.removeItem('mrvivasayi_active_user_email');
      setUser(null);
      setIsSwitchingRole(false);
    }, 300);
  }, []);

  const signIn = useCallback(async (email: string, password: string): Promise<{ error: string | null }> => {
    try {
      await loginWithSupabase(email, password);
      return { error: null };
    } catch (err: any) {
      return { error: err.message };
    }
  }, [loginWithSupabase]);

  const signOut = useCallback(async () => logout(), [logout]);

  const hasRole = useCallback((minimumRole: UserRole): boolean => {
    if (!user) return false;
    const userLevel = ROLE_HIERARCHY[user.role as UserRole] ?? 0;
    const requiredLevel = ROLE_HIERARCHY[minimumRole] ?? 99;
    return userLevel >= requiredLevel;
  }, [user]);

  const hasPermission = useCallback((module: string, action: PermissionAction): boolean => {
    if (!user) return false;
    // 1. Super Admin and Business Owner have full, unrestricted permissions
    if (user.role === 'SUPER_ADMIN' || user.role === 'OWNER') return true;

    // 2. Individual Custom Permissions Overrides (configured per-staff member)
    if (user.custom_permissions && typeof user.custom_permissions === 'object') {
      const staffPerms = user.custom_permissions as Record<string, Record<PermissionAction, boolean>>;
      // Direct submenu or module key match
      if (staffPerms[module] && typeof staffPerms[module][action] === 'boolean') {
        return staffPerms[module][action];
      }
      // If checking a parent module ID (e.g. 'pos', 'orders', 'products'), check if any child submenu has permission
      const matchedModule = HIERARCHICAL_PERMISSION_TREE.find(m => m.id === module);
      if (matchedModule) {
        const hasAnySubmenuPerm = matchedModule.submenus.some(sub => staffPerms[sub.id]?.[action] === true);
        if (hasAnySubmenuPerm) return true;
      }
    }

    // 3. Role-Based Permissions (loaded from custom roles or built-in system role defaults)
    const activeRole = rolesList.find(r => r.role === user.role) || DEFAULT_SYSTEM_ROLES.find(r => r.role === user.role);
    const rolePerms = activeRole?.permissions || buildDefaultRolePermissions(user.role);

    if (rolePerms) {
      // Direct key check
      if (rolePerms[module] && typeof rolePerms[module][action] === 'boolean') {
        return rolePerms[module][action];
      }
      // Check parent module
      const matchedModule = HIERARCHICAL_PERMISSION_TREE.find(m => m.id === module);
      if (matchedModule) {
        const hasAnySubmenuPerm = matchedModule.submenus.some(sub => rolePerms[sub.id]?.[action] === true);
        if (hasAnySubmenuPerm) return true;
      }
    }

    // 4. Fallback safe role level logic
    if (user.role === 'ADMIN') {
      const restricted = ['audit_logs', 'user_roles'];
      if (restricted.includes(module) && (action === 'delete' || action === 'approve')) return false;
      return true;
    }
    if (user.role === 'VIEWER') return action === 'view';
    if (user.role === 'DELIVERY_STAFF') return (module === 'orders' || module === 'customers') && (action === 'view' || action === 'edit');
    if (user.role === 'SALES_STAFF') return ['orders', 'products', 'customers', 'pos'].includes(module) && action !== 'delete';
    if (user.role === 'INVENTORY_MANAGER') return ['inventory', 'products', 'suppliers'].includes(module) && action !== 'delete';

    return false;
  }, [user, rolesList]);

  const value: AuthContextValue = {
    user,
    profile: user,
    isLoading,
    isSwitchingRole,
    isAuthenticated: user !== null,
    demoMode,
    isSuperAdmin: user?.role === 'SUPER_ADMIN',
    isAdmin: user?.role === 'SUPER_ADMIN' || user?.role === 'ADMIN',
    hasRole,
    hasPermission,
    switchDemoUser,
    loginWithSupabase,
    logout,
    signIn,
    signOut,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
