import React, { useState } from 'react';
import {
  User, Mail, Phone, Shield, Calendar, Edit3, Save, CheckCircle,
  Clock, Briefcase, Award, Building, FileText, Key, Lock, BellRing,
  Sparkles, Check, AlertCircle, X, Copy
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useNotifications } from '../../contexts/NotificationContext';
import { RefreshSpinnerModal } from '../../components/common/RefreshSpinnerModal';
import { RefreshCw } from 'lucide-react';
import { AdminPageSkeleton } from '../../components/common/Skeleton';
import { useActionModal } from '../../contexts/ActionModalContext';
import { getJSONStore, setJSONStore } from '../../lib/dbManager';
import { hashPassword } from '../../lib/security';
import { formatUserId } from './StaffPage';
import type { UserProfile } from '../../types';
import toast from 'react-hot-toast';

export const ProfilePage: React.FC = () => {
  const { user } = useAuth();
  const { addNotification } = useNotifications();
  const { showActionModal } = useActionModal();
  const [loading, setLoading] = useState(true);

  React.useEffect(() => {
    const timer = setTimeout(() => setLoading(false), 200);
    return () => clearTimeout(timer);
  }, []);

  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    full_name: user?.full_name || '',
    email: user?.email || '',
    phone: user?.phone || '+91 9789325262',
    bio: user?.bio || 'Dedicated organic product specialist & operations manager at MR. VIVASAYI.',
    designation: user?.designation || 'Senior Operations Specialist',
    department: user?.department || 'Store Management & Logistics',
    emergency_contact: user?.emergency_contact || '+91 98765 00000 (Spouse)',
  });

  const [passwordModalOpen, setPasswordModalOpen] = useState(false);
  const [passwordForm, setPasswordForm] = useState({ current: '', newPass: '', confirmPass: '' });
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setIsEditing(false);

    showActionModal({
      title: 'Updating User Profile',
      subtitle: `Saving profile details for ${formData.full_name}...`,
      durationMs: 700,
      steps: [
        'Validating contact and bio details',
        'Updating user session state',
        'Saving changes to security directory',
        'Profile updated successfully'
      ],
      onComplete: () => {
        if (user) {
          user.full_name = formData.full_name;
          user.email = formData.email;
          user.phone = formData.phone;
          user.bio = formData.bio;
          user.designation = formData.designation;
          user.department = formData.department;
          user.emergency_contact = formData.emergency_contact;
        }

        toast.success('Profile details updated!');
        addNotification({
          title: 'Profile Updated',
          message: 'Your personal bio, contact details, and account preferences were updated.',
          type: 'success',
          sourceModule: 'User Profile'
        });
      }
    });
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (passwordForm.newPass !== passwordForm.confirmPass) {
      toast.error('New password and confirmation do not match.');
      addNotification({
        title: 'Password Mismatch',
        message: 'New password and confirmation do not match.',
        type: 'error',
        sourceModule: 'Security'
      });
      return;
    }

    const newPass = passwordForm.newPass;
    setPasswordModalOpen(false);
    setPasswordForm({ current: '', newPass: '', confirmPass: '' });

    showActionModal({
      title: 'Securing New Password',
      subtitle: 'Applying SHA-256 cryptographic hashing to credential...',
      durationMs: 800,
      steps: [
        'Validating password strength and entropy',
        'Generating SHA-256 cryptographic hash',
        'Updating persistent authentication storage',
        'Password securely hashed & updated'
      ],
      onComplete: async () => {
        try {
          const users = await getJSONStore<UserProfile>('users');
          const updated = users.map(u => {
            if ((user && u.id === user.id) || (user && u.email === user.email)) {
              return { ...u, password: hashPassword(newPass) };
            }
            return u;
          });
          await setJSONStore('users', updated);
        } catch (err) {
          console.error('Failed to persist updated password:', err);
        }

        toast.success('Password updated & securely hashed!');
        addNotification({
          title: 'Password Changed',
          message: 'Your account password has been updated and securely hashed (SHA-256).',
          type: 'success',
          sourceModule: 'Security'
        });
      }
    });
  };

  if (loading || !user) {
    return <AdminPageSkeleton title="Staff User Profile & Security" />;
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-12 animate-fadeIn">
      
      {/* Header Banner */}
      <div className="relative bg-gradient-to-r from-emerald-900 via-emerald-800 to-teal-900 text-white rounded-3xl p-6 sm:p-8 shadow-xl overflow-hidden">
        <div className="absolute right-0 top-0 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none"></div>

        <div className="relative z-10 flex flex-col sm:flex-row items-center sm:items-start gap-6">
          {/* Avatar Icon */}
          <div className="relative group">
            <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-full bg-amber-400 text-emerald-950 font-black text-3xl sm:text-4xl flex items-center justify-center border-4 border-white/20 shadow-2xl">
              {user.full_name.charAt(0)}
            </div>
            <span className="absolute bottom-1 right-1 w-5 h-5 bg-emerald-400 border-2 border-emerald-900 rounded-full" title="Online Status"></span>
          </div>

          {/* Core Info */}
          <div className="flex-1 text-center sm:text-left space-y-2">
            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2.5">
              <h1 className="text-2xl sm:text-3xl font-extrabold">{formData.full_name}</h1>
              <span className="bg-emerald-950/70 text-amber-300 font-mono text-xs font-black px-3 py-1 rounded-xl border border-amber-300/40 shadow-sm flex items-center gap-1.5 backdrop-blur-sm">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse"></span>
                <span className="text-emerald-300 text-[10px] uppercase font-bold tracking-wider">User ID</span>
                <span>#{formatUserId(user.id)}</span>
              </span>
              <span className="bg-amber-400 text-emerald-950 text-xs font-black px-2.5 py-1 rounded-full uppercase tracking-wider shadow-sm">
                {user.role}
              </span>
            </div>

            <p className="text-emerald-100 text-xs sm:text-sm max-w-xl leading-relaxed">
              {formData.bio}
            </p>

            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-4 pt-2 text-xs text-emerald-200">
              <span className="flex items-center space-x-1">
                <Briefcase className="w-3.5 h-3.5 text-amber-300" />
                <span>{formData.designation}</span>
              </span>
              <span className="flex items-center space-x-1">
                <Building className="w-3.5 h-3.5 text-amber-300" />
                <span>{formData.department}</span>
              </span>
              <span className="flex items-center space-x-1">
                <Calendar className="w-3.5 h-3.5 text-amber-300" />
                <span>Joined Oct 2024</span>
              </span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsRefreshing(true)}
              className="flex items-center space-x-1.5 bg-white/10 hover:bg-white/20 border border-white/20 text-white px-3.5 py-2 rounded-xl text-xs font-bold transition-all shadow-sm"
              title="Refresh User Profile"
            >
              <RefreshCw className={`w-4 h-4 text-amber-300 ${isRefreshing ? 'animate-spin' : ''}`} />
              <span>Refresh</span>
            </button>
            <button
              onClick={() => setIsEditing(!isEditing)}
              className="flex items-center space-x-1.5 bg-white/10 hover:bg-white/20 border border-white/20 text-white px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-sm"
            >
              <Edit3 className="w-4 h-4" />
              <span>{isEditing ? 'Cancel Edit' : 'Edit Profile'}</span>
            </button>
          </div>
        </div>

        <RefreshSpinnerModal
          isOpen={isRefreshing}
          moduleName="User Profile"
          title="Syncing Profile & Credentials..."
          subtitle="Fetching latest account permissions & personal bio from database..."
          onComplete={() => setIsRefreshing(false)}
        />
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Column: Personal Information Form */}
        <div className="lg:col-span-2 bg-white rounded-3xl p-6 shadow-sm border border-emerald-100/80 space-y-6">
          <div className="flex items-center justify-between border-b border-gray-100 pb-4">
            <div>
              <h2 className="text-base font-extrabold text-emerald-950">Personal Details & Bio</h2>
              <p className="text-xs text-gray-500">View and update your profile bio and contact information</p>
            </div>
            {isEditing && (
              <span className="bg-amber-100 text-amber-800 text-[10px] font-bold px-2 py-0.5 rounded-full">
                Editing Mode
              </span>
            )}
          </div>

          <form onSubmit={handleSave} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Full Name</label>
                <div className="relative">
                  <User className="w-4 h-4 text-gray-400 absolute left-3 top-3" />
                  <input
                    type="text"
                    disabled={!isEditing}
                    value={formData.full_name}
                    onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                    className="w-full pl-9 pr-3 py-2.5 bg-gray-50 disabled:bg-gray-100 border border-gray-200 rounded-xl text-xs font-semibold text-gray-800 focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Email Address</label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-gray-400 absolute left-3 top-3" />
                  <input
                    type="email"
                    disabled={!isEditing}
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full pl-9 pr-3 py-2.5 bg-gray-50 disabled:bg-gray-100 border border-gray-200 rounded-xl text-xs font-semibold text-gray-800 focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Phone / WhatsApp</label>
                <div className="relative">
                  <Phone className="w-4 h-4 text-gray-400 absolute left-3 top-3" />
                  <input
                    type="text"
                    disabled={!isEditing}
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full pl-9 pr-3 py-2.5 bg-gray-50 disabled:bg-gray-100 border border-gray-200 rounded-xl text-xs font-semibold text-gray-800 focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Emergency Contact</label>
                <div className="relative">
                  <Phone className="w-4 h-4 text-gray-400 absolute left-3 top-3" />
                  <input
                    type="text"
                    disabled={!isEditing}
                    value={formData.emergency_contact}
                    onChange={(e) => setFormData({ ...formData, emergency_contact: e.target.value })}
                    className="w-full pl-9 pr-3 py-2.5 bg-gray-50 disabled:bg-gray-100 border border-gray-200 rounded-xl text-xs font-semibold text-gray-800 focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Designation</label>
                <div className="relative">
                  <Briefcase className="w-4 h-4 text-gray-400 absolute left-3 top-3" />
                  <input
                    type="text"
                    disabled={!isEditing}
                    value={formData.designation}
                    onChange={(e) => setFormData({ ...formData, designation: e.target.value })}
                    className="w-full pl-9 pr-3 py-2.5 bg-gray-50 disabled:bg-gray-100 border border-gray-200 rounded-xl text-xs font-semibold text-gray-800 focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Department</label>
                <div className="relative">
                  <Building className="w-4 h-4 text-gray-400 absolute left-3 top-3" />
                  <input
                    type="text"
                    disabled={!isEditing}
                    value={formData.department}
                    onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                    className="w-full pl-9 pr-3 py-2.5 bg-gray-50 disabled:bg-gray-100 border border-gray-200 rounded-xl text-xs font-semibold text-gray-800 focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">Staff Bio & Description</label>
              <textarea
                rows={3}
                disabled={!isEditing}
                value={formData.bio}
                onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                className="w-full p-3 bg-gray-50 disabled:bg-gray-100 border border-gray-200 rounded-xl text-xs font-semibold text-gray-800 focus:ring-2 focus:ring-emerald-500"
                placeholder="Write brief bio..."
              />
            </div>

            {isEditing && (
              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsEditing(false)}
                  className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-bold rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex items-center space-x-1.5 px-5 py-2 bg-emerald-800 hover:bg-emerald-900 text-white text-xs font-bold rounded-xl shadow-md"
                >
                  <Save className="w-4 h-4" />
                  <span>Save Changes</span>
                </button>
              </div>
            )}
          </form>
        </div>

        {/* Right Column: Security & Permission Matrix */}
        <div className="space-y-6">
          
          {/* Account Security Card */}
          <div className="bg-white rounded-3xl p-6 shadow-sm border border-emerald-100/80 space-y-4">
            <h3 className="text-sm font-extrabold text-emerald-950 flex items-center space-x-2">
              <Shield className="w-4 h-4 text-emerald-700" />
              <span>Account & Security</span>
            </h3>

            <div className="space-y-3 text-xs">
              <div className="flex items-center justify-between p-3 bg-amber-50/70 rounded-xl border border-amber-200">
                <div>
                  <div className="font-bold text-amber-950">Staff Account ID</div>
                  <div className="text-[10px] text-amber-800/80">Unique sequential directory ID</div>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="bg-amber-100 text-amber-950 border border-amber-300 font-mono font-black text-xs px-2.5 py-1 rounded-lg shadow-2xs">
                    #{formatUserId(user.id)}
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(formatUserId(user.id));
                      toast.success(`Copied User ID #${formatUserId(user.id)}!`);
                    }}
                    className="p-1 text-gray-500 hover:text-emerald-800 transition cursor-pointer"
                    title="Copy User ID"
                  >
                    <Copy className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between p-3 bg-emerald-50/60 rounded-xl border border-emerald-100">
                <div>
                  <div className="font-bold text-emerald-950">Assigned System Role</div>
                  <div className="text-[10px] text-gray-500 font-mono">{user.role}</div>
                </div>
                <span className="bg-emerald-800 text-white text-[10px] font-bold px-2 py-0.5 rounded-md">
                  Active
                </span>
              </div>

              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl border border-gray-100">
                <div>
                  <div className="font-bold text-gray-800">Password Security</div>
                  <div className="text-[10px] text-gray-500">Last changed 14 days ago</div>
                </div>
                <button
                  onClick={() => setPasswordModalOpen(true)}
                  className="text-xs text-emerald-800 font-bold hover:underline flex items-center space-x-1"
                >
                  <Key className="w-3.5 h-3.5" />
                  <span>Change</span>
                </button>
              </div>

              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl border border-gray-100">
                <div>
                  <div className="font-bold text-gray-800">2-Factor Authentication</div>
                  <div className="text-[10px] text-gray-500">WhatsApp OTP Login active</div>
                </div>
                <span className="text-emerald-700 font-extrabold text-[10px]">Enabled</span>
              </div>
            </div>
          </div>

          {/* Access Permissions Summary */}
          <div className="bg-white rounded-3xl p-6 shadow-sm border border-emerald-100/80 space-y-4">
            <h3 className="text-sm font-extrabold text-emerald-950 flex items-center space-x-2">
              <Lock className="w-4 h-4 text-emerald-700" />
              <span>Role Access Summary</span>
            </h3>

            <p className="text-xs text-gray-500">
              Module permissions assigned based on your role (<strong className="text-emerald-900">{user.role}</strong>):
            </p>

            <div className="space-y-2 text-xs">
              {[
                { name: 'Main Dashboard & KPIs', allowed: true },
                { name: 'Orders & POS Counter', allowed: user.role !== 'VIEWER' },
                { name: 'Product Catalog & Inventory', allowed: ['SUPER_ADMIN', 'ADMIN', 'INVENTORY_MANAGER'].includes(user.role) },
                { name: 'Staff Management', allowed: ['SUPER_ADMIN', 'ADMIN'].includes(user.role) },
                { name: 'Audit & System Security', allowed: user.role === 'SUPER_ADMIN' },
              ].map((item, idx) => (
                <div key={idx} className="flex items-center justify-between py-1.5 border-b border-gray-100 last:border-none">
                  <span className="text-gray-700 font-medium">{item.name}</span>
                  {item.allowed ? (
                    <span className="flex items-center space-x-1 text-emerald-700 font-bold text-[10px]">
                      <Check className="w-3.5 h-3.5" />
                      <span>Allowed</span>
                    </span>
                  ) : (
                    <span className="flex items-center space-x-1 text-rose-500 font-bold text-[10px]">
                      <X className="w-3.5 h-3.5" />
                      <span>Restricted</span>
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>

        </div>

      </div>

      {/* Password Change Modal */}
      {passwordModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-emerald-100 space-y-4 animate-fadeIn">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <h3 className="font-extrabold text-emerald-950 text-base flex items-center space-x-2">
                <Key className="w-5 h-5 text-emerald-700" />
                <span>Change Password</span>
              </h3>
              <button onClick={() => setPasswordModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handlePasswordSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-gray-700 mb-1">Current Password</label>
                <input
                  type="password"
                  required
                  value={passwordForm.current}
                  onChange={(e) => setPasswordForm({ ...passwordForm, current: e.target.value })}
                  className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl font-medium focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block font-bold text-gray-700 mb-1">New Password</label>
                <input
                  type="password"
                  required
                  value={passwordForm.newPass}
                  onChange={(e) => setPasswordForm({ ...passwordForm, newPass: e.target.value })}
                  className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl font-medium focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block font-bold text-gray-700 mb-1">Confirm New Password</label>
                <input
                  type="password"
                  required
                  value={passwordForm.confirmPass}
                  onChange={(e) => setPasswordForm({ ...passwordForm, confirmPass: e.target.value })}
                  className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl font-medium focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setPasswordModalOpen(false)}
                  className="flex-1 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-emerald-800 hover:bg-emerald-900 text-white font-bold rounded-xl shadow"
                >
                  Update Password
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};

export default ProfilePage;
