'use client';

export const dynamic = 'force-dynamic';

import { useState, useEffect } from 'react';
import {
  User,
  Users,
  Lock,
  Building2,
  Eye,
  EyeOff,
  Save,
  Plus,
  Edit2,
  Trash2,
  CheckCircle,
  AlertCircle,
  LogOut,
} from 'lucide-react';
import { useSession } from 'next-auth/react';

type TabType = 'account' | 'users' | 'audit-logs' | 'tenant';

export default function SettingsPage() {
  const { data: session } = useSession();
  const [activeTab, setActiveTab] = useState<TabType>('account');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordMessage, setPasswordMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Users state
  const [users, setUsers] = useState<any[]>([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [editingUser, setEditingUser] = useState<any | null>(null);
  const [isUpdatingUser, setIsUpdatingUser] = useState(false);
  const [isAddingUser, setIsAddingUser] = useState(false);
  const [newUser, setNewUser] = useState({ name: '', email: '', password: '', role: 'AGENT', tenantId: '' });
  const [isCreatingUser, setIsCreatingUser] = useState(false);
  const [tenantsList, setTenantsList] = useState<any[]>([]);
  const [newTenantName, setNewTenantName] = useState('');

  // Audit logs state
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [auditLoading, setAuditLoading] = useState(false);

  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  // Tenant settings state
  const [tenant, setTenant] = useState<any>(null);
  const [tenantLoading, setTenantLoading] = useState(false);
  const [tenantSaveLoading, setTenantSaveLoading] = useState(false);

  // Fetch users & tenants
  useEffect(() => {
    if (activeTab === 'users' || activeTab === 'tenant') {
      fetchUsers();
      if ((session?.user as any)?.role === 'SUPER_ADMIN') {
        fetchTenantsList();
      }
    }
  }, [activeTab, session]);

  const fetchTenantsList = async () => {
    try {
      const res = await fetch('/api/tenants');
      if (res.ok) {
        const data = await res.json();
        setTenantsList(data.tenants || []);
      }
    } catch (error) {
      console.error('Failed to fetch tenants:', error);
    }
  };

  // Fetch audit logs
  useEffect(() => {
    if (activeTab === 'audit-logs') {
      fetchAuditLogs();
    }
  }, [activeTab]);

  // Fetch tenant settings
  useEffect(() => {
    if (activeTab === 'tenant') {
      fetchTenantSettings();
    }
  }, [activeTab]);

  const fetchTenantSettings = async () => {
    setTenantLoading(true);
    try {
      const res = await fetch('/api/tenant');
      if (res.ok) {
        const data = await res.json();
        setTenant(data.tenant);
      }
    } catch (error) {
      console.error('Failed to fetch tenant:', error);
    } finally {
      setTenantLoading(false);
    }
  };

  const handleTenantSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tenant) return;
    setTenantSaveLoading(true);
    try {
      const res = await fetch('/api/tenant', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: tenant.name,
          aiSystemPrompt: tenant.aiSystemPrompt,
          handoffAgentId: tenant.handoffAgentId,
          activeFlowId: tenant.activeFlowId,
          themeBrandColor: tenant.themeBrandColor,
          themeUserBubbleColor: tenant.themeUserBubbleColor,
          themeBotBubbleColor: tenant.themeBotBubbleColor,
        }),
      });
      if (res.ok) {
        alert('Tenant settings saved successfully!');
      } else {
        alert('Failed to save settings');
      }
    } catch (error) {
      console.error(error);
      alert('Error saving tenant settings');
    } finally {
      setTenantSaveLoading(false);
    }
  };

  const fetchUsers = async () => {
    setUsersLoading(true);
    try {
      const res = await fetch('/api/users');
      if (res.ok) {
        const data = await res.json();
        setUsers(data.users || []);
      }
    } catch (error) {
      console.error('Failed to fetch users:', error);
    } finally {
      setUsersLoading(false);
    }
  };

  const handleUpdateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;
    setIsUpdatingUser(true);
    try {
      const res = await fetch(`/api/users/${editingUser.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: editingUser.name,
          email: editingUser.email,
          role: editingUser.role,
          isActive: editingUser.isActive,
        }),
      });

      if (res.ok) {
        setEditingUser(null);
        fetchUsers();
      } else {
        const data = await res.json();
        alert(data.error || 'Failed to update user');
      }
    } catch (error) {
      console.error(error);
      alert('Error updating user');
    } finally {
      setIsUpdatingUser(false);
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsCreatingUser(true);
    try {
      const res = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newUser.name,
          email: newUser.email,
          password: newUser.password,
          role: newUser.role,
          tenantId: newUser.tenantId === 'NEW' ? undefined : (newUser.tenantId || undefined),
          newTenantName: newUser.tenantId === 'NEW' ? newTenantName : undefined,
          isActive: true,
        }),
      });

      if (res.ok) {
        setIsAddingUser(false);
        setNewUser({ name: '', email: '', password: '', role: 'AGENT', tenantId: '' });
        setNewTenantName('');
        fetchUsers();
        if ((session?.user as any)?.role === 'SUPER_ADMIN') fetchTenantsList();
      } else {
        const data = await res.json();
        alert(data.error || 'Failed to create user');
      }
    } catch (error) {
      console.error(error);
      alert('Error creating user');
    } finally {
      setIsCreatingUser(false);
    }
  };

  const fetchAuditLogs = async () => {
    setAuditLoading(true);
    try {
      const res = await fetch('/api/audit-logs?limit=20');
      if (res.ok) {
        const data = await res.json();
        setAuditLogs(data.logs || []);
      }
    } catch (error) {
      console.error('Failed to fetch audit logs:', error);
    } finally {
      setAuditLoading(false);
    }
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordLoading(true);
    setPasswordMessage(null);

    try {
      const res = await fetch(`/api/users/${session?.user?.id}/change-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          currentPassword: passwordForm.currentPassword,
          newPassword: passwordForm.newPassword,
          confirmPassword: passwordForm.confirmPassword,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setPasswordMessage({ type: 'error', text: data.error || 'Failed to change password' });
      } else {
        setPasswordMessage({ type: 'success', text: 'Password changed successfully!' });
        setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
      }
    } catch (error) {
      setPasswordMessage({ type: 'error', text: 'An error occurred. Please try again.' });
    } finally {
      setPasswordLoading(false);
    }
  };

  const tabs = [
    { id: 'account', label: 'Account', icon: User },
    { id: 'users', label: 'Users', icon: Users },
    { id: 'audit-logs', label: 'Audit Logs', icon: LogOut },
    { id: 'tenant', label: 'Tenant Settings', icon: Building2 },
  ];

  return (
    <div className="p-8 max-w-6xl mx-auto">
      {/* Page Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900">Settings</h1>
        <p className="text-slate-600 mt-2">Manage your account, users, and system settings</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-8 border-b border-slate-200">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as TabType)}
              className={`px-4 py-3 font-medium text-sm border-b-2 transition-colors flex items-center gap-2 ${
                isActive
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-slate-600 hover:text-slate-900'
              }`}
            >
              <Icon size={18} />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Tab Content */}
      <div className="bg-white rounded-lg shadow-sm border border-slate-200">
        {/* Account Tab */}
        {activeTab === 'account' && (
          <div className="p-8">
            <h2 className="text-xl font-bold text-slate-900 mb-6">Change Password</h2>

            <form onSubmit={handlePasswordChange} className="max-w-md space-y-5">
              {/* Current Password */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Current Password
                </label>
                <div className="relative">
                  <input
                    type={showCurrentPassword ? 'text' : 'password'}
                    value={passwordForm.currentPassword}
                    onChange={(e) =>
                      setPasswordForm({ ...passwordForm, currentPassword: e.target.value })
                    }
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                    placeholder="Enter current password"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-700"
                  >
                    {showCurrentPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              {/* New Password */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  New Password
                </label>
                <div className="relative">
                  <input
                    type={showNewPassword ? 'text' : 'password'}
                    value={passwordForm.newPassword}
                    onChange={(e) =>
                      setPasswordForm({ ...passwordForm, newPassword: e.target.value })
                    }
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                    placeholder="Enter new password (min 8 chars)"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-700"
                  >
                    {showNewPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              {/* Confirm Password */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Confirm Password
                </label>
                <div className="relative">
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    value={passwordForm.confirmPassword}
                    onChange={(e) =>
                      setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })
                    }
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                    placeholder="Confirm new password"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-700"
                  >
                    {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              {/* Message */}
              {passwordMessage && (
                <div
                  className={`p-4 rounded-lg flex items-center gap-3 ${
                    passwordMessage.type === 'success'
                      ? 'bg-green-50 text-green-800 border border-green-200'
                      : 'bg-red-50 text-red-800 border border-red-200'
                  }`}
                >
                  {passwordMessage.type === 'success' ? (
                    <CheckCircle size={20} />
                  ) : (
                    <AlertCircle size={20} />
                  )}
                  <span className="text-sm font-medium">{passwordMessage.text}</span>
                </div>
              )}

              {/* Submit Button */}
              <button
                type="submit"
                disabled={passwordLoading}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Save size={18} />
                {passwordLoading ? 'Saving...' : 'Save Password'}
              </button>
            </form>
          </div>
        )}

        {/* Users Tab */}
        {activeTab === 'users' && (
          <div className="p-8">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-slate-900">User Management</h2>
              <button 
                onClick={() => setIsAddingUser(true)}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors"
              >
                <Plus size={18} />
                Add User
              </button>
            </div>

            {usersLoading ? (
              <div className="text-center py-8">
                <div className="inline-block w-8 h-8 border-4 border-slate-200 border-t-blue-500 rounded-full animate-spin"></div>
                <p className="text-slate-600 mt-3">Loading users...</p>
              </div>
            ) : users.length === 0 ? (
              <div className="text-center py-8 text-slate-500">
                <p>No users found</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 border-b border-slate-200">
                    <tr>
                      <th className="px-4 py-3 text-left font-semibold text-slate-700">Name</th>
                      <th className="px-4 py-3 text-left font-semibold text-slate-700">Email</th>
                      <th className="px-4 py-3 text-left font-semibold text-slate-700">Role</th>
                      <th className="px-4 py-3 text-left font-semibold text-slate-700">Status</th>
                      <th className="px-4 py-3 text-left font-semibold text-slate-700">Last Login</th>
                      <th className="px-4 py-3 text-right font-semibold text-slate-700">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {users.map((user) => (
                      <tr key={user.id} className="hover:bg-slate-50 transition-colors">
                        <td className="px-4 py-3 text-slate-900 font-medium">{user.name || 'N/A'}</td>
                        <td className="px-4 py-3 text-slate-600">{user.email}</td>
                        <td className="px-4 py-3">
                          <span className={`px-2.5 py-0.5 font-medium rounded-full text-xs ${
                            user.role === 'SUPER_ADMIN' ? 'bg-purple-100 text-purple-700' :
                            user.role === 'AGENT' ? 'bg-blue-100 text-blue-700' :
                            'bg-green-100 text-green-700'
                          }`}>
                            {user.role}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`px-2.5 py-0.5 font-medium rounded-full text-xs ${
                            user.isActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                          }`}>
                            {user.isActive ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-slate-600">
                          {user.lastLoginAt ? new Date(user.lastLoginAt).toLocaleDateString() : 'Never'}
                        </td>
                        <td className="px-4 py-3 text-right flex items-center justify-end gap-2">
                          <button 
                            onClick={() => setEditingUser(user)}
                            className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          >
                            <Edit2 size={16} />
                          </button>
                          <button className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                            <Trash2 size={16} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {!usersLoading && users.length > 0 && (
              <p className="text-xs text-slate-500 mt-4">Showing {users.length} of {users.length} users</p>
            )}

            {/* Edit User Modal */}
            {editingUser && (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
                <div className="bg-white p-6 rounded-lg w-full max-w-md shadow-xl">
                  <h3 className="text-lg font-bold mb-4 text-slate-900">Edit User</h3>
                  <form onSubmit={handleUpdateUser} className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Name</label>
                      <input
                        type="text"
                        value={editingUser.name || ''}
                        onChange={(e) => setEditingUser({...editingUser, name: e.target.value})}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
                      <input
                        type="email"
                        value={editingUser.email || ''}
                        onChange={(e) => setEditingUser({...editingUser, email: e.target.value})}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Role (Hak Akses)</label>
                      <select
                        value={editingUser.role || ''}
                        onChange={(e) => setEditingUser({...editingUser, role: e.target.value})}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white"
                        disabled={(session?.user as any)?.role !== 'SUPER_ADMIN'}
                      >
                        <option value="SUPER_ADMIN">Super Admin</option>
                        <option value="AGENT">Agent</option>
                        <option value="BUSINESS_PARTNER">Business Partner</option>
                      </select>
                      {(session?.user as any)?.role !== 'SUPER_ADMIN' && (
                        <p className="text-xs text-slate-500 mt-1">Only Super Admin can change roles.</p>
                      )}
                    </div>
                    <div className="flex items-center gap-2 pt-2">
                      <input
                        type="checkbox"
                        id="isActive"
                        checked={editingUser.isActive || false}
                        onChange={(e) => setEditingUser({...editingUser, isActive: e.target.checked})}
                        disabled={(session?.user as any)?.role !== 'SUPER_ADMIN'}
                        className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                      />
                      <label htmlFor="isActive" className="text-sm font-medium text-slate-700">Active Status</label>
                    </div>
                    {editingUser.tenant && (
                      <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 mt-4">
                        <p className="text-sm font-bold text-slate-800 mb-2">Tenant Details (Sisi Admin)</p>
                        <div className="space-y-2">
                          <p className="text-xs text-slate-600">
                            <span className="font-medium">Tenant ID:</span>{' '}
                            <code className="bg-slate-200 px-1 rounded ml-1">{editingUser.tenantId}</code>
                          </p>
                          <p className="text-xs text-slate-600">
                            <span className="font-medium">Tenant Name:</span> {editingUser.tenant.name}
                          </p>
                        </div>
                        
                        <div className="mt-4 grid grid-cols-2 gap-3">
                          <div className="bg-white p-3 rounded border border-slate-200 text-center">
                            <p className="text-xs text-slate-500 font-medium uppercase tracking-wider mb-1">Human Agents</p>
                            <p className="font-bold text-xl text-blue-600">{editingUser.tenant._count?.users || 0}</p>
                          </div>
                          <div className="bg-white p-3 rounded border border-slate-200 text-center">
                            <p className="text-xs text-slate-500 font-medium uppercase tracking-wider mb-1">AI Flows</p>
                            <p className="font-bold text-xl text-purple-600">{editingUser.tenant._count?.flows || 0}</p>
                          </div>
                        </div>
                      </div>
                    )}
                    
                    <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-slate-200">
                      <button
                        type="button"
                        onClick={() => setEditingUser(null)}
                        className="px-4 py-2 text-slate-700 font-medium hover:bg-slate-100 rounded-lg transition-colors"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={isUpdatingUser}
                        className="px-4 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center gap-2"
                      >
                        {isUpdatingUser ? 'Saving...' : 'Save Changes'}
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}

            {/* Add User Modal */}
            {isAddingUser && (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
                <div className="bg-white p-6 rounded-lg w-full max-w-md shadow-xl">
                  <h3 className="text-lg font-bold mb-4 text-slate-900">Add New User</h3>
                  <form onSubmit={handleCreateUser} className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Name</label>
                      <input
                        type="text"
                        value={newUser.name}
                        onChange={(e) => setNewUser({...newUser, name: e.target.value})}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
                      <input
                        type="email"
                        value={newUser.email}
                        onChange={(e) => setNewUser({...newUser, email: e.target.value})}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Password</label>
                      <input
                        type="password"
                        value={newUser.password}
                        onChange={(e) => setNewUser({...newUser, password: e.target.value})}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                        required
                        minLength={6}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Role (Hak Akses)</label>
                      <select
                        value={newUser.role}
                        onChange={(e) => setNewUser({...newUser, role: e.target.value})}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white"
                        disabled={(session?.user as any)?.role !== 'SUPER_ADMIN'}
                      >
                        {(session?.user as any)?.role === 'SUPER_ADMIN' && <option value="SUPER_ADMIN">Super Admin</option>}
                        <option value="AGENT">Agent</option>
                        <option value="BUSINESS_PARTNER">Business Partner</option>
                      </select>
                    </div>
                    {(session?.user as any)?.role === 'SUPER_ADMIN' && (
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Bisnis Owner / Tenant</label>
                        <select
                          value={newUser.tenantId}
                          onChange={(e) => setNewUser({...newUser, tenantId: e.target.value})}
                          className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white"
                        >
                          <option value="">-- Kosongkan (Bukan Agent Spesifik) --</option>
                          {tenantsList.map((t) => (
                            <option key={t.id} value={t.id}>{t.name} (ID: {t.id.substring(0, 8)}...)</option>
                          ))}
                          {newUser.role === 'BUSINESS_PARTNER' && (
                            <option value="NEW">-- Buat Bisnis Baru (Otomatis) --</option>
                          )}
                        </select>
                      </div>
                    )}
                    {newUser.tenantId === 'NEW' && (session?.user as any)?.role === 'SUPER_ADMIN' && (
                      <div className="pl-4 border-l-2 border-blue-500">
                        <label className="block text-sm font-medium text-slate-700 mb-1">Nama Bisnis Baru</label>
                        <input
                          type="text"
                          value={newTenantName}
                          onChange={(e) => setNewTenantName(e.target.value)}
                          className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-blue-50"
                          placeholder={`Misal: Bisnis milik ${newUser.name || 'User'}`}
                          required={newUser.tenantId === 'NEW'}
                        />
                      </div>
                    )}
                    <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-slate-200">
                      <button
                        type="button"
                        onClick={() => setIsAddingUser(false)}
                        className="px-4 py-2 text-slate-700 font-medium hover:bg-slate-100 rounded-lg transition-colors"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={isCreatingUser}
                        className="px-4 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center gap-2"
                      >
                        {isCreatingUser ? 'Creating...' : 'Create User'}
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Audit Logs Tab */}
        {activeTab === 'audit-logs' && (
          <div className="p-8">
            <h2 className="text-xl font-bold text-slate-900 mb-6">Audit Logs</h2>

            {auditLoading ? (
              <div className="text-center py-8">
                <div className="inline-block w-8 h-8 border-4 border-slate-200 border-t-blue-500 rounded-full animate-spin"></div>
                <p className="text-slate-600 mt-3">Loading audit logs...</p>
              </div>
            ) : auditLogs.length === 0 ? (
              <div className="text-center py-8 text-slate-500">
                <p>No audit logs found</p>
              </div>
            ) : (
              <div className="space-y-6 max-w-4xl">
                {auditLogs.map((log, index) => {
                  const actionColors: Record<string, { bg: string; text: string; dot: string }> = {
                    'LOGIN': { bg: 'bg-blue-50', text: 'text-blue-900', dot: 'bg-blue-600' },
                    'LOGOUT': { bg: 'bg-slate-50', text: 'text-slate-900', dot: 'bg-slate-600' },
                    'PASSWORD_CHANGED': { bg: 'bg-yellow-50', text: 'text-yellow-900', dot: 'bg-yellow-600' },
                    'USER_CREATED': { bg: 'bg-green-50', text: 'text-green-900', dot: 'bg-green-600' },
                    'USER_UPDATED': { bg: 'bg-blue-50', text: 'text-blue-900', dot: 'bg-blue-600' },
                    'USER_DELETED': { bg: 'bg-red-50', text: 'text-red-900', dot: 'bg-red-600' },
                    'ROLE_CHANGED': { bg: 'bg-purple-50', text: 'text-purple-900', dot: 'bg-purple-600' },
                    'STATUS_CHANGED': { bg: 'bg-orange-50', text: 'text-orange-900', dot: 'bg-orange-600' },
                    'DOCUMENT_UPLOADED': { bg: 'bg-emerald-50', text: 'text-emerald-900', dot: 'bg-emerald-600' },
                    'DOCUMENT_DELETED': { bg: 'bg-red-50', text: 'text-red-900', dot: 'bg-red-600' },
                    'AI_AGENT_CREATED': { bg: 'bg-indigo-50', text: 'text-indigo-900', dot: 'bg-indigo-600' },
                    'AI_AGENT_UPDATED': { bg: 'bg-blue-50', text: 'text-blue-900', dot: 'bg-blue-600' },
                    'AI_AGENT_DELETED': { bg: 'bg-red-50', text: 'text-red-900', dot: 'bg-red-600' },
                    'DATA_IMPORTED': { bg: 'bg-teal-50', text: 'text-teal-900', dot: 'bg-teal-600' },
                    'DATA_EXPORTED': { bg: 'bg-cyan-50', text: 'text-cyan-900', dot: 'bg-cyan-600' },
                    'CHAT_MESSAGE_SENT': { bg: 'bg-fuchsia-50', text: 'text-fuchsia-900', dot: 'bg-fuchsia-600' },
                  };

                  const color = actionColors[log.action] || { bg: 'bg-slate-50', text: 'text-slate-900', dot: 'bg-slate-600' };

                  return (
                    <div key={log.id} className={`p-4 rounded-lg border border-slate-200 ${color.bg}`}>
                      <div className="flex gap-4">
                        <div className="flex flex-col items-center pt-1">
                          <div className={`w-3 h-3 rounded-full ${color.dot}`}></div>
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center justify-between mb-1">
                            <p className={`font-bold text-sm ${color.text}`}>
                              {log.action.replace(/_/g, ' ')}
                            </p>
                            <span className="text-xs text-slate-600">
                              {new Date(log.createdAt).toLocaleString()}
                            </span>
                          </div>
                          <p className={`text-sm ${color.text} opacity-75`}>
                            {log.user?.name || log.user?.email || 'System'} - {log.entityType}
                          </p>
                          {log.changes && Object.keys(log.changes).length > 0 && (
                            <div className="mt-2 text-xs text-slate-700 bg-white bg-opacity-50 p-2 rounded border border-slate-200">
                              <pre className="font-mono">{JSON.stringify(log.changes, null, 2)}</pre>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Tenant Settings Tab */}
        {activeTab === 'tenant' && (
          <div className="p-8">
            <h2 className="text-xl font-bold text-slate-900 mb-6">Tenant Settings</h2>

            {tenantLoading ? (
              <div className="text-center py-8">
                <div className="inline-block w-8 h-8 border-4 border-slate-200 border-t-blue-500 rounded-full animate-spin"></div>
                <p className="text-slate-600 mt-3">Loading tenant settings...</p>
              </div>
            ) : !tenant ? (
              <div className="text-center py-8 text-slate-500">
                <p>No tenant configuration found</p>
              </div>
            ) : (
              <form onSubmit={handleTenantSave} className="max-w-2xl space-y-6">
                {/* Tenant Name */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Tenant Name
                  </label>
                  <input
                    type="text"
                    value={tenant.name || ''}
                    onChange={(e) => setTenant({ ...tenant, name: e.target.value })}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                  />
                </div>

                <div className="pt-6 border-t border-slate-200">
                  <h3 className="text-lg font-bold text-slate-800 mb-4">Global AI Rules</h3>
                  
                  {/* Active AI Agent */}
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Active AI Agent (Flow)
                    </label>
                    <p className="text-xs text-slate-500 mb-2">
                      Pilih Agent AI (Flow) mana yang akan membalas pesan masuk dari pengguna.
                    </p>
                    <select
                      value={tenant.activeFlowId || ''}
                      onChange={(e) => setTenant({ ...tenant, activeFlowId: e.target.value || null })}
                      className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all bg-white"
                    >
                      <option value="">-- Gunakan pengaturan global (Default) --</option>
                      {tenant?.flows?.map((flow: any) => (
                        <option key={flow.id} value={flow.id}>
                          {flow.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* AI System Prompt */}
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Global AI System Prompt
                    </label>
                    <p className="text-xs text-slate-500 mb-2">
                      Instruksi global untuk AI yang berlaku untuk semua agent di tenant ini.
                    </p>
                    <textarea
                      value={tenant.aiSystemPrompt || ''}
                      onChange={(e) => setTenant({ ...tenant, aiSystemPrompt: e.target.value })}
                      rows={4}
                      className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all font-mono text-sm"
                      placeholder="You are a helpful assistant..."
                    />
                  </div>

                  {/* Handoff Agent */}
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Default Handoff Agent (Human Queue)
                    </label>
                    <p className="text-xs text-slate-500 mb-2">
                      Siapa yang akan ditugaskan (atau nama siapa yang akan disebut oleh AI) ketika pengguna meminta bantuan manusia?
                    </p>
                    <select
                      value={tenant.handoffAgentId || ''}
                      onChange={(e) => setTenant({ ...tenant, handoffAgentId: e.target.value || null })}
                      className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all bg-white"
                    >
                      <option value="">-- No specific agent (Queue) --</option>
                      {users.map((user) => (
                        <option key={user.id} value={user.id}>
                          {user.name || user.email} ({user.role})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="pt-6 border-t border-slate-200">
                  <h3 className="text-lg font-bold text-slate-800 mb-4">Widget Appearance</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Brand Color</label>
                      <p className="text-xs text-slate-500 mb-2">Warna utama untuk Header dan Tombol.</p>
                      <div className="flex gap-2">
                        <input 
                          type="color" 
                          value={tenant.themeBrandColor || '#801517'}
                          onChange={(e) => setTenant({...tenant, themeBrandColor: e.target.value})}
                          className="w-10 h-10 p-1 border border-slate-300 rounded cursor-pointer shrink-0 bg-white"
                        />
                        <input 
                          type="text" 
                          value={tenant.themeBrandColor || '#801517'}
                          onChange={(e) => setTenant({...tenant, themeBrandColor: e.target.value})}
                          className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none font-mono text-sm uppercase bg-white"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">User Bubble</label>
                      <p className="text-xs text-slate-500 mb-2">Warna balon chat untuk Pengguna.</p>
                      <div className="flex gap-2">
                        <input 
                          type="color" 
                          value={tenant.themeUserBubbleColor || '#801517'}
                          onChange={(e) => setTenant({...tenant, themeUserBubbleColor: e.target.value})}
                          className="w-10 h-10 p-1 border border-slate-300 rounded cursor-pointer shrink-0 bg-white"
                        />
                        <input 
                          type="text" 
                          value={tenant.themeUserBubbleColor || '#801517'}
                          onChange={(e) => setTenant({...tenant, themeUserBubbleColor: e.target.value})}
                          className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none font-mono text-sm uppercase bg-white"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Bot Bubble</label>
                      <p className="text-xs text-slate-500 mb-2">Warna balon chat untuk AI.</p>
                      <div className="flex gap-2">
                        <input 
                          type="color" 
                          value={tenant.themeBotBubbleColor || '#ffffff'}
                          onChange={(e) => setTenant({...tenant, themeBotBubbleColor: e.target.value})}
                          className="w-10 h-10 p-1 border border-slate-300 rounded cursor-pointer shrink-0 bg-white"
                        />
                        <input 
                          type="text" 
                          value={tenant.themeBotBubbleColor || '#ffffff'}
                          onChange={(e) => setTenant({...tenant, themeBotBubbleColor: e.target.value})}
                          className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none font-mono text-sm uppercase bg-white"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Submit */}
                <div className="pt-4">
                  <button
                    type="submit"
                    disabled={tenantSaveLoading}
                    className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                  >
                    <Save size={18} />
                    {tenantSaveLoading ? 'Saving...' : 'Save Settings'}
                  </button>
                </div>
              </form>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
