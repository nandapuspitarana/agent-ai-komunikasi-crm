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

  // Audit logs state
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [auditLoading, setAuditLoading] = useState(false);

  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  // Fetch users
  useEffect(() => {
    if (activeTab === 'users') {
      fetchUsers();
    }
  }, [activeTab]);

  // Fetch audit logs
  useEffect(() => {
    if (activeTab === 'audit-logs') {
      fetchAuditLogs();
    }
  }, [activeTab]);

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
              <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors">
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
                          <button className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors">
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

            <form className="max-w-2xl space-y-6">
              {/* Tenant Name */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Tenant Name
                </label>
                <input
                  type="text"
                  defaultValue="Demo Tenant"
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                />
              </div>

              {/* Website */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Website URL
                </label>
                <input
                  type="url"
                  defaultValue="https://example.com"
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                />
              </div>

              {/* Widget Color */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Widget Primary Color
                </label>
                <div className="flex items-center gap-4">
                  <input
                    type="color"
                    defaultValue="#3b82f6"
                    className="h-10 w-16 rounded-lg cursor-pointer border border-slate-300"
                  />
                  <code className="text-sm text-slate-600">#3b82f6</code>
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Description
                </label>
                <textarea
                  defaultValue="Our customer support chatbot"
                  rows={4}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                />
              </div>

              {/* Submit */}
              <button
                type="submit"
                className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors"
              >
                <Save size={18} />
                Save Settings
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
