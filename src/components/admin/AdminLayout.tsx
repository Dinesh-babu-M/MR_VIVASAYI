import React, { useState, useEffect } from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, ShoppingCart, Package, Boxes, Users, Truck,
  MessageSquare, Send, BarChart3, Globe, Shield, LogOut,
  Menu, X, Bell, ExternalLink, ChevronDown, ChevronRight, ChevronLeft, UserPlus,
  ShieldCheck, Key, UserCheck, Layers, Sparkles, PanelLeftClose, PanelLeftOpen,
  AlertTriangle, Trash2, CheckCheck, User, CheckCircle, Volume2, Settings, Receipt
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useNotifications, SystemNotification } from '../../contexts/NotificationContext';
import Logo from '../common/Logo';
import { SYSTEM_STAFF_USERS, getJSONStore } from '../../lib/dbManager';
import type { UserRole } from '../../types';

interface SidebarSubmenu {
  path: string;
  label: string;
  badge?: string;
  badgeColor?: string;
  minRole: UserRole;
  module: string;
}

interface SidebarGroupRaw {
  id: string;
  title: string;
  icon: string;
  groupBadge?: string;
  groupBadgeColor?: string;
  submenus: SidebarSubmenu[];
}

interface SidebarGroup {
  id: string;
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  groupBadge?: string;
  groupBadgeColor?: string;
  submenus: SidebarSubmenu[];
}

const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  LayoutDashboard,
  ShoppingCart,
  Boxes,
  Users,
  MessageSquare,
  UserCheck,
  Globe,
  Shield,
  BarChart3,
  Settings,
  Receipt
};

export const AdminLayout: React.FC = () => {
  const { user, logout, hasRole, hasPermission } = useAuth();
  const { notifications, unreadCount, markAsRead, markAllAsRead, removeNotification, clearAll, playSound } = useNotifications();
  const location = useLocation();
  const navigate = useNavigate();

  const [navGroups, setNavGroups] = useState<SidebarGroup[]>([]);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [notifDrawerOpen, setNotifDrawerOpen] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);

  useEffect(() => {
    async function loadNavigation() {
      try {
        const rawGroups = await getJSONStore<SidebarGroupRaw>('navigation');
        if (Array.isArray(rawGroups) && rawGroups.length > 0) {
          let mergedGroups = [...rawGroups];
          if (!mergedGroups.some(g => g.id === 'sample_billing')) {
            const sampleGroup: SidebarGroupRaw = {
              id: "sample_billing",
              title: "Sample Billing",
              icon: "Receipt",
              groupBadge: "Demo",
              groupBadgeColor: "bg-indigo-100 text-indigo-800 border-indigo-200",
              submenus: [
                {
                  path: "/admin/sample-pos",
                  label: "Sample POS Counter",
                  badge: "Test POS",
                  badgeColor: "bg-indigo-100 text-indigo-800",
                  minRole: "STAFF",
                  module: "pos"
                },
                {
                  path: "/admin/sample-invoices",
                  label: "Sample Invoices & Orders",
                  badge: "Invoices",
                  badgeColor: "bg-amber-100 text-amber-800",
                  minRole: "STAFF",
                  module: "orders"
                }
              ]
            };
            const crmIdx = mergedGroups.findIndex(g => g.id === 'crm');
            if (crmIdx !== -1) {
              mergedGroups.splice(crmIdx, 0, sampleGroup);
            } else {
              mergedGroups.push(sampleGroup);
            }
          }

          const mapped: SidebarGroup[] = mergedGroups.map(g => ({
            ...g,
            icon: ICON_MAP[g.icon] || LayoutDashboard
          }));
          setNavGroups(mapped);
        }
      } catch (err) {
        console.warn('Failed to load navigation from JSON store:', err);
      }
    }
    loadNavigation();
  }, []);

  const getActiveGroupFromPath = (path: string, groups: SidebarGroup[]): string => {
    for (const group of groups) {
      if (group.submenus.some(s => s.path === path || (s.path !== '/admin' && path.startsWith(s.path)))) {
        return group.id;
      }
    }
    return 'dashboard';
  };

  const [activeGroupId, setActiveGroupId] = useState<string>('dashboard');

  useEffect(() => {
    if (navGroups.length > 0) {
      const currentGroup = getActiveGroupFromPath(location.pathname, navGroups);
      setActiveGroupId(currentGroup);
    }
  }, [location.pathname, navGroups]);

  const handleGroupToggle = (groupId: string) => {
    setActiveGroupId(prev => (prev === groupId ? '' : groupId));
  };

  const confirmLogout = () => {
    setShowLogoutModal(false);
    logout();
    navigate('/admin/login');
  };

  // Permission Filtering Function
  const isSubmenuAllowed = (sub: SidebarSubmenu): boolean => {
    return hasRole(sub.minRole) && hasPermission(sub.module, 'view');
  };

  return (
    <div className="min-h-screen bg-gray-100 text-gray-900 flex flex-col font-sans">
      
      {/* Top Navbar */}
      <header className="bg-emerald-950 text-white sticky top-0 z-30 shadow-md border-b border-emerald-900">
        <div className="px-4 sm:px-6 py-3 flex items-center justify-between">
          
          <div className="flex items-center space-x-3">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="lg:hidden p-2 rounded-lg text-emerald-200 hover:text-white hover:bg-emerald-900"
            >
              {sidebarOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
            <Link to="/admin" className="flex items-center gap-2.5">
              <Logo variant="full" theme="dark" size="sm" showTagline={false} />
              <span className="hidden sm:inline-block text-[10px] bg-amber-400 text-emerald-950 px-2 py-0.5 rounded-md font-black uppercase tracking-wider shadow-sm">
                ADMIN WORKSPACE
              </span>
            </Link>
          </div>

          {/* Quick Actions, Notifications & Profile */}
          <div className="flex items-center space-x-3">
            
            {/* Direct Link to Public Store */}
            <Link
              to="/"
              target="_blank"
              className="hidden sm:flex items-center space-x-1.5 text-xs text-emerald-100 hover:text-white bg-emerald-900 hover:bg-emerald-800 px-3 py-1.5 rounded-xl border border-emerald-800 transition-colors font-semibold"
            >
              <Globe className="w-3.5 h-3.5 text-amber-300" />
              <span>Public Store</span>
              <ExternalLink className="w-3 h-3" />
            </Link>

            {/* Notification Bell Icon Module (Replaces Role Switcher Dropdown) */}
            <div className="relative">
              <button
                onClick={() => setNotifDrawerOpen(!notifDrawerOpen)}
                className="relative p-2 rounded-xl bg-emerald-900 hover:bg-emerald-800 border border-emerald-800 text-amber-300 transition-colors shadow-sm flex items-center justify-center"
                title="System Notifications & Alerts"
              >
                <Bell className="w-4 h-4 text-amber-300" />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-rose-500 text-white text-[10px] font-black w-4 h-4 rounded-full flex items-center justify-center animate-pulse shadow-sm">
                    {unreadCount}
                  </span>
                )}
              </button>

              {/* Notification Drawer Popover */}
              {notifDrawerOpen && (
                <div className="absolute right-0 top-full mt-2 w-80 sm:w-96 bg-white rounded-2xl shadow-2xl border border-emerald-100 py-3 z-50 animate-fadeIn text-gray-900">
                  <div className="px-4 pb-2 border-b border-gray-100 flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Bell className="w-4 h-4 text-emerald-700" />
                      <h4 className="font-extrabold text-sm text-emerald-950">Notifications</h4>
                      <span className="bg-emerald-100 text-emerald-800 text-[10px] font-extrabold px-2 py-0.5 rounded-full">
                        {unreadCount} unread
                      </span>
                    </div>

                    <div className="flex items-center space-x-1">
                      <button
                        onClick={playSound}
                        className="p-1 text-gray-400 hover:text-emerald-700 rounded"
                        title="Test Chime Sound"
                      >
                        <Volume2 className="w-3.5 h-3.5" />
                      </button>
                      {unreadCount > 0 && (
                        <button
                          onClick={markAllAsRead}
                          className="text-[10px] font-bold text-emerald-700 hover:underline flex items-center space-x-1"
                        >
                          <CheckCheck className="w-3 h-3" />
                          <span>Mark all read</span>
                        </button>
                      )}
                      {notifications.length > 0 && (
                        <button
                          onClick={clearAll}
                          className="text-[10px] font-bold text-rose-600 hover:underline p-1"
                          title="Clear all notifications"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Notification List */}
                  <div className="max-h-80 overflow-y-auto divide-y divide-gray-100">
                    {notifications.length === 0 ? (
                      <div className="p-6 text-center text-xs text-gray-400">
                        <CheckCircle className="w-8 h-8 mx-auto mb-2 text-emerald-300" />
                        <span>No new notifications</span>
                      </div>
                    ) : (
                      notifications.map((notif: SystemNotification) => (
                        <div
                          key={notif.id}
                          className={`p-3.5 text-xs transition-colors flex items-start justify-between gap-2 ${
                            !notif.read ? 'bg-emerald-50/70 border-l-4 border-emerald-600' : 'hover:bg-gray-50'
                          }`}
                        >
                          <div className="flex-1">
                            <div className="flex items-center justify-between mb-1">
                              <span className="font-bold text-emerald-950">{notif.title}</span>
                              <span className="text-[9px] text-gray-400 font-mono">
                                {new Date(notif.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </span>
                            </div>
                            <p className="text-gray-600 text-[11px] leading-relaxed mb-1.5">{notif.message}</p>
                            
                            <div className="flex items-center justify-between text-[10px]">
                              {notif.sourceModule && (
                                <span className="bg-emerald-100 text-emerald-800 font-bold px-1.5 py-0.5 rounded">
                                  {notif.sourceModule}
                                </span>
                              )}
                              {notif.actionUrl && (
                                <Link
                                  to={notif.actionUrl}
                                  onClick={() => {
                                    markAsRead(notif.id);
                                    setNotifDrawerOpen(false);
                                  }}
                                  className="text-emerald-700 font-bold hover:underline"
                                >
                                  View details →
                                </Link>
                              )}
                            </div>
                          </div>

                          <button
                            onClick={() => removeNotification(notif.id)}
                            className="text-gray-300 hover:text-rose-500 p-1 transition-colors"
                            title="Remove"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))
                    )}
                  </div>

                  <div className="px-4 pt-2 border-t border-gray-100 text-center">
                    <span className="text-[10px] text-gray-400">Audio chime enabled for live alerts</span>
                  </div>
                </div>
              )}
            </div>

            {/* Profile Click -> Separate Profile Page */}
            <div className="flex items-center space-x-2.5 pl-2 border-l border-emerald-800">
              <Link
                to="/admin/profile"
                className="w-8 h-8 rounded-full bg-amber-400 hover:bg-amber-300 text-emerald-950 font-black flex items-center justify-center text-xs shadow-sm transition-transform hover:scale-105"
                title="View My Separate Profile Page"
              >
                {user?.full_name?.charAt(0) || 'A'}
              </Link>

              <button
                onClick={() => setShowLogoutModal(true)}
                className="p-2 rounded-xl text-emerald-200 hover:text-rose-300 hover:bg-emerald-900 transition-colors"
                title="Log out"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>

          </div>

        </div>
      </header>

      {/* Main Workspace Body */}
      <div className="flex-1 flex overflow-hidden">
        
        {/* Sidebar Nav */}
        <aside
          className={`fixed inset-y-0 left-0 z-20 bg-emerald-100/90 border-r border-emerald-200/80 pt-16 lg:pt-0 transform transition-all duration-200 lg:static lg:translate-x-0 flex flex-col justify-between ${
            sidebarCollapsed ? 'lg:w-20 w-64' : 'w-64'
          } ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}
        >
          {/* Top Logo & Minimize/Extend Sidebar Header */}
          <div className="p-4 border-b border-emerald-200/80 bg-emerald-200/50 flex items-center justify-between">
            {!sidebarCollapsed ? (
              <Link to="/admin" className="flex items-center gap-2.5 overflow-hidden">
                <Logo variant="full" theme="light" size="md" showTagline={false} />
              </Link>
            ) : (
              <Link to="/admin" className="mx-auto flex justify-center" title="MR. VIVASAYI Admin Workspace">
                <Logo variant="icon" theme="light" size="md" />
              </Link>
            )}

            {/* Desktop Minimize / Extend Toggle Button */}
            <button
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
              className="hidden lg:flex p-1.5 rounded-xl bg-white hover:bg-emerald-200 text-emerald-950 border border-emerald-300/80 shadow-sm transition-all flex-shrink-0"
              title={sidebarCollapsed ? 'Extend Sidebar' : 'Minimize Sidebar'}
            >
              {sidebarCollapsed ? (
                <ChevronRight className="w-4 h-4 text-emerald-950" />
              ) : (
                <ChevronLeft className="w-4 h-4 text-emerald-950" />
              )}
            </button>
          </div>

          {/* Navigation Groups */}
          <div className="px-3 py-4 space-y-3 overflow-y-auto flex-1">
            
            {navGroups.map(group => {
              const allowedSubmenus = group.submenus.filter(isSubmenuAllowed);
              if (allowedSubmenus.length === 0) return null;

              const GroupIcon = group.icon;

              // Check if Dashboard single menu
              if (group.id === 'dashboard') {
                const sub = allowedSubmenus[0];
                const isActive = location.pathname === sub.path;
                return (
                  <Link
                    key={group.id}
                    to={sub.path}
                    onClick={() => setSidebarOpen(false)}
                    className={`w-full flex items-center ${
                      sidebarCollapsed ? 'justify-center px-2' : 'justify-between px-3'
                    } py-2.5 rounded-xl text-xs font-extrabold transition-all ${
                      isActive
                        ? 'bg-emerald-800 text-white shadow-md'
                        : 'text-emerald-950 hover:bg-emerald-200/70 hover:text-emerald-950'
                    }`}
                    title={sidebarCollapsed ? 'Main Dashboard' : undefined}
                  >
                    <div className="flex items-center space-x-2.5">
                      <GroupIcon className={`w-4 h-4 ${isActive ? 'text-amber-300' : 'text-emerald-800'}`} />
                      {!sidebarCollapsed && <span>{group.title}</span>}
                    </div>
                  </Link>
                );
              }

              const isGroupOpen = activeGroupId === group.id;

              return (
                <div key={group.id} className="space-y-1">
                  
                  {/* Group Header Button */}
                  <button
                    onClick={() => handleGroupToggle(group.id)}
                    className={`w-full flex items-center ${
                      sidebarCollapsed ? 'justify-center px-2' : 'justify-between px-3'
                    } py-2 text-[11px] font-bold uppercase tracking-wider rounded-xl transition-all ${
                      isGroupOpen
                        ? 'text-emerald-950 bg-emerald-200/60 font-black'
                        : 'text-emerald-900 hover:bg-emerald-200/50 hover:text-emerald-950'
                    }`}
                    title={sidebarCollapsed ? group.title : undefined}
                  >
                    <div className="flex items-center space-x-2">
                      <GroupIcon className={`w-4 h-4 ${isGroupOpen ? 'text-emerald-800' : 'text-emerald-700'}`} />
                      {!sidebarCollapsed && <span>{group.title}</span>}
                    </div>

                    {!sidebarCollapsed && (
                      <div className="flex items-center space-x-1.5">
                        {group.groupBadge && (
                          <span className={`px-1.5 py-0.5 rounded text-[9px] font-extrabold border ${group.groupBadgeColor || 'bg-emerald-200/70 text-emerald-950'}`}>
                            {group.groupBadge}
                          </span>
                        )}
                        <ChevronDown className={`w-3.5 h-3.5 text-emerald-700 transition-transform duration-200 ${isGroupOpen ? 'rotate-0 text-emerald-900 font-bold' : '-rotate-90'}`} />
                      </div>
                    )}
                  </button>

                  {/* Submenu List with Connector Tree Lines |- */}
                  {isGroupOpen && (
                    <div className={`relative ${sidebarCollapsed ? 'pl-0' : 'ml-4 pl-3 space-y-1.5 py-1'}`}>
                      {!sidebarCollapsed && (
                        <div className="absolute left-0 top-1 bottom-3 w-[2px] bg-emerald-300 rounded-full"></div>
                      )}

                      {allowedSubmenus.map((sub) => {
                        // Strict exact path matching so only the clicked submenu is active!
                        const isActive = location.pathname === sub.path ||
                          (sub.path !== '/admin' && sub.path !== '/admin/settings' && sub.path !== '/admin/customers' && location.pathname.startsWith(sub.path + '/'));

                        return (
                          <div key={sub.path} className="relative flex items-center">
                            {!sidebarCollapsed && (
                              <div className={`absolute -left-[12px] top-1/2 -translate-y-1/2 w-3 h-[2px] transition-colors ${
                                isActive ? 'bg-emerald-800' : 'bg-emerald-300'
                              }`}></div>
                            )}

                            <Link
                              to={sub.path}
                              onClick={() => setSidebarOpen(false)}
                              className={`w-full flex items-center ${
                                sidebarCollapsed ? 'justify-center px-2 py-2' : 'justify-between px-3 py-2'
                              } rounded-xl text-xs transition-all ${
                                isActive
                                  ? 'bg-emerald-800 text-white font-bold shadow-md'
                                  : 'text-emerald-950 font-semibold hover:bg-emerald-200/70 hover:text-emerald-950'
                              }`}
                              title={sidebarCollapsed ? sub.label : undefined}
                            >
                              <span className="truncate">{sidebarCollapsed ? sub.label.charAt(0) : sub.label}</span>
                              {!sidebarCollapsed && sub.badge && (
                                <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${
                                  isActive ? 'bg-amber-400 text-emerald-950 font-black shadow-sm' : sub.badgeColor || 'bg-emerald-200/80 text-emerald-950'
                                }`}>
                                  {sub.badge}
                                </span>
                              )}
                            </Link>
                          </div>
                        );
                      })}
                    </div>
                  )}

                </div>
              );
            })}

          </div>

          {/* Bottom Active User Profile Link & Logout */}
          <div className="p-3.5 border-t border-emerald-200/80 bg-emerald-200/50 text-xs">
            {!sidebarCollapsed ? (
              <Link to="/admin/profile" className="block group">
                <div className="font-bold text-emerald-950 truncate group-hover:text-emerald-700">{user?.full_name}</div>
                <div className="text-[11px] text-emerald-800 font-medium truncate">{user?.email}</div>
                <div className="text-[10px] text-emerald-700 mt-1 flex items-center justify-between">
                  <span>Role:</span>
                  <span className="font-mono font-bold bg-amber-300 text-emerald-950 px-1.5 py-0.5 rounded shadow-sm">
                    {user?.role}
                  </span>
                </div>
              </Link>
            ) : (
              <button
                onClick={() => setShowLogoutModal(true)}
                className="w-full py-2 flex items-center justify-center text-rose-600 hover:bg-rose-50 rounded-xl"
                title="Log Out"
              >
                <LogOut className="w-5 h-5" />
              </button>
            )}
          </div>
        </aside>

        {/* Content Area */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 bg-gray-50">
          <Outlet />
        </main>

      </div>

      {/* Logout Confirmation Modal */}
      {showLogoutModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-emerald-100 text-center animate-fadeIn">
            <div className="w-12 h-12 rounded-full bg-rose-100 text-rose-600 mx-auto flex items-center justify-center mb-3">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-extrabold text-emerald-950 mb-1">Confirm Logout</h3>
            <p className="text-xs text-gray-500 mb-6">
              Are you sure you want to log out of the <strong className="text-emerald-900">MR. VIVASAYI Admin Workspace</strong>?
            </p>

            <div className="flex gap-3">
              <button
                onClick={() => setShowLogoutModal(false)}
                className="flex-1 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-bold rounded-xl"
              >
                Cancel
              </button>
              <button
                onClick={confirmLogout}
                className="flex-1 py-2.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl shadow"
              >
                Yes, Log Out
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default AdminLayout;
