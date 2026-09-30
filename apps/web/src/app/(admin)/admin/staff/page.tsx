'use client';

import { useState, useEffect, useMemo } from 'react';
import { apiFetch } from '@/lib/api';
import { useAdminHeader } from '@/contexts/AdminHeaderContext';
import { AdminRouteGuard } from '@/components/admin/AdminRouteGuard';
import { Modal } from '@/components/ui/Modal';
import { EmptyState } from '@/components/ui/EmptyState';
import {
  IAdminUser,
  CreateStaffDto,
  UpdateStaffDto,
} from '@chai-partner/shared';
import { AdminRole } from '@chai-partner/shared';
import { ROLE_CONFIGS } from '@/lib/permissions';
import {
  Users,
  UserPlus,
  Search,
  ShieldCheck,
  ChefHat,
  Receipt,
  Edit2,
  UserX,
  UserCheck,
  AlertCircle,
  KeyRound,
  Mail,
  Phone,
  User,
  CheckCircle2,
  Calendar,
  Lock,
} from 'lucide-react';

export default function AdminStaffPage() {
  return (
    <AdminRouteGuard requiredPermission="staff.manage" title="staff management">
      <StaffManagementContent />
    </AdminRouteGuard>
  );
}

function StaffManagementContent() {
  const [staffList, setStaffList] = useState<IAdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [roleFilter, setRoleFilter] = useState<'all' | AdminRole>('all');

  // Modals state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingStaff, setEditingStaff] = useState<IAdminUser | null>(null);
  const [deactivatingStaff, setDeactivatingStaff] = useState<IAdminUser | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  // Add form fields
  const [addName, setAddName] = useState('');
  const [addEmail, setAddEmail] = useState('');
  const [addPhone, setAddPhone] = useState('');
  const [addRole, setAddRole] = useState<AdminRole>(AdminRole.CASHIER);
  const [addPassword, setAddPassword] = useState('');
  const [formError, setFormError] = useState<string | null>(null);

  // Edit form fields
  const [editName, setEditName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editRole, setEditRole] = useState<AdminRole>(AdminRole.CASHIER);
  const [editPassword, setEditPassword] = useState('');
  const [showRoleChangeWarning, setShowRoleChangeWarning] = useState(false);

  const [currentAdminUser, setCurrentAdminUser] = useState<{ id?: string } | null>(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem('cp_admin_user');
      if (raw) setCurrentAdminUser(JSON.parse(raw));
    } catch {}
    loadStaff();
  }, []);

  const { setHeaderState } = useAdminHeader();
  useEffect(() => {
    setHeaderState({ onRefresh: loadStaff });
    return () => setHeaderState({});
  }, [setHeaderState]);

  const loadStaff = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await apiFetch<IAdminUser[]>('/admin/staff');
      setStaffList(data || []);
    } catch (err: any) {
      setError(err.message || 'Unable to load staff members');
    } finally {
      setLoading(false);
    }
  };

  const filteredStaff = useMemo(() => {
    return staffList.filter((staff) => {
      const matchesSearch =
        searchQuery === '' ||
        staff.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        staff.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (staff.phone && staff.phone.includes(searchQuery));

      const isActive = staff.is_active !== false;
      const matchesStatus =
        statusFilter === 'all' ||
        (statusFilter === 'active' && isActive) ||
        (statusFilter === 'inactive' && !isActive);

      const matchesRole = roleFilter === 'all' || staff.role === roleFilter;

      return matchesSearch && matchesStatus && matchesRole;
    });
  }, [staffList, searchQuery, statusFilter, roleFilter]);

  const activeCount = staffList.filter((s) => s.is_active !== false).length;
  const inactiveCount = staffList.filter((s) => s.is_active === false).length;

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!addName.trim() || !addEmail.trim() || !addPassword.trim()) {
      setFormError('Please enter full name, email, and password.');
      return;
    }

    if (addPassword.length < 6) {
      setFormError('Password must be at least 6 characters.');
      return;
    }

    try {
      setActionLoading(true);
      const payload: CreateStaffDto = {
        name: addName.trim(),
        email: addEmail.trim(),
        phone: addPhone.trim() || undefined,
        role: addRole,
        password: addPassword,
      };

      await apiFetch('/admin/staff', {
        method: 'POST',
        body: JSON.stringify(payload),
      });

      setIsAddModalOpen(false);
      resetAddForm();
      await loadStaff();
    } catch (err: any) {
      setFormError(err.message || 'Failed to create staff account');
    } finally {
      setActionLoading(false);
    }
  };

  const handleEditClick = (staff: IAdminUser) => {
    setEditingStaff(staff);
    setEditName(staff.name);
    setEditPhone(staff.phone || '');
    setEditRole(staff.role);
    setEditPassword('');
    setShowRoleChangeWarning(false);
    setFormError(null);
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingStaff) return;
    setFormError(null);

    if (editRole !== editingStaff.role && !showRoleChangeWarning) {
      setShowRoleChangeWarning(true);
      return;
    }

    try {
      setActionLoading(true);
      const payload: UpdateStaffDto = {
        name: editName.trim(),
        phone: editPhone.trim(),
        role: editRole,
      };
      if (editPassword.trim()) {
        payload.password = editPassword.trim();
      }

      await apiFetch(`/admin/staff/${editingStaff.id}`, {
        method: 'PATCH',
        body: JSON.stringify(payload),
      });

      setEditingStaff(null);
      setShowRoleChangeWarning(false);
      await loadStaff();
    } catch (err: any) {
      setFormError(err.message || 'Failed to update staff member');
    } finally {
      setActionLoading(false);
    }
  };

  const handleToggleStatus = async (staff: IAdminUser) => {
    const targetStatus = staff.is_active === false;
    try {
      setActionLoading(true);
      await apiFetch(`/admin/staff/${staff.id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ is_active: targetStatus }),
      });
      setDeactivatingStaff(null);
      await loadStaff();
    } catch (err: any) {
      setError(err.message || 'Failed to update status');
    } finally {
      setActionLoading(false);
    }
  };

  const resetAddForm = () => {
    setAddName('');
    setAddEmail('');
    setAddPhone('');
    setAddRole(AdminRole.CASHIER);
    setAddPassword('');
    setFormError(null);
  };

  const getRoleIcon = (role: AdminRole) => {
    switch (role) {
      case AdminRole.ADMIN:
        return <ShieldCheck className="w-3.5 h-3.5 text-gold-deep" />;
      case AdminRole.KITCHEN:
        return <ChefHat className="w-3.5 h-3.5 text-warn" />;
      case AdminRole.CASHIER:
        return <Receipt className="w-3.5 h-3.5 text-ink-muted" />;
    }
  };

  return (
    <div className="w-full h-full pb-20">
        {/* â”€â”€ Page Hero & Actions â”€â”€ */}
        <div className="bg-white border border-divider/80 rounded-2xl p-5 sm:p-6 mb-6 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="w-1.5 h-4 bg-gold rounded-full" />
              <span className="text-[10px] font-sans font-bold uppercase tracking-widest text-gold-deep">
                CafÃ© Team Management
              </span>
            </div>
            <h1
              className="text-2xl sm:text-3xl font-serif font-bold text-ink"
              style={{ fontFamily: 'Playfair Display, Georgia, serif' }}
            >
              Staff & Permissions
            </h1>
            <p className="text-xs sm:text-sm text-ink-muted mt-0.5">
              Manage your cafÃ© team members, credentials, and role-based permissions.
            </p>
          </div>

          <button
            type="button"
            onClick={() => {
              resetAddForm();
              setIsAddModalOpen(true);
            }}
            className="h-10 px-5 bg-gold hover:bg-gold-deep text-white rounded-xl text-xs font-bold inline-flex items-center gap-2 shadow-xs transition-all active:scale-98 flex-shrink-0 self-start sm:self-center"
          >
            <UserPlus className="w-4 h-4" />
            <span>Add Staff Member</span>
          </button>
        </div>

        {/* â”€â”€ Search & Filter Bar â”€â”€ */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
          {/* Search box */}
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-ink-faint absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search staff by name, email, or phone..."
              className="w-full pl-9 pr-4 py-2 bg-white border border-divider rounded-xl text-xs text-ink placeholder-ink-faint focus:outline-none focus:ring-2 focus:ring-gold/30 focus:border-gold transition-all"
            />
          </div>

          {/* Status Tabs & Role Filter */}
          <div className="flex items-center gap-2 flex-wrap">
            <div className="inline-flex items-center bg-canvas-warm p-1 rounded-xl border border-divider text-xs">
              <button
                type="button"
                onClick={() => setStatusFilter('all')}
                className={`px-3 py-1 rounded-lg font-semibold transition-all ${
                  statusFilter === 'all'
                    ? 'bg-white text-ink shadow-xs font-bold'
                    : 'text-ink-muted hover:text-ink'
                }`}
              >
                All ({staffList.length})
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter('active')}
                className={`px-3 py-1 rounded-lg font-semibold transition-all ${
                  statusFilter === 'active'
                    ? 'bg-white text-ink shadow-xs font-bold'
                    : 'text-ink-muted hover:text-ink'
                }`}
              >
                Active ({activeCount})
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter('inactive')}
                className={`px-3 py-1 rounded-lg font-semibold transition-all ${
                  statusFilter === 'inactive'
                    ? 'bg-white text-ink shadow-xs font-bold'
                    : 'text-ink-muted hover:text-ink'
                }`}
              >
                Inactive ({inactiveCount})
              </button>
            </div>

            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value as any)}
              className="h-8 px-3 bg-white border border-divider rounded-xl text-xs font-semibold text-ink focus:outline-none focus:ring-2 focus:ring-gold/30"
            >
              <option value="all">All Roles</option>
              <option value={AdminRole.ADMIN}>Owner / Admin</option>
              <option value={AdminRole.KITCHEN}>Head Chef</option>
              <option value={AdminRole.CASHIER}>Cashier POS</option>
            </select>
          </div>
        </div>

        {/* â”€â”€ Staff Table / Cards â”€â”€ */}
        {loading ? (
          <div className="bg-white border border-divider rounded-2xl p-8 space-y-4">
            {[1, 2, 3].map((n) => (
              <div key={n} className="flex items-center gap-4 animate-pulse">
                <div className="w-10 h-10 rounded-xl bg-canvas-warm" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-canvas-warm rounded w-1/4" />
                  <div className="h-3 bg-canvas-warm rounded w-1/3" />
                </div>
              </div>
            ))}
          </div>
        ) : filteredStaff.length === 0 ? (
          <EmptyState
            title="No Staff Members Found"
            description={
              searchQuery
                ? `No staff members matched "${searchQuery}". Try a different keyword.`
                : 'No staff members currently in this category.'
            }
          />
        ) : (
          <div className="bg-white border border-divider/80 rounded-2xl shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-canvas-warm/70 border-b border-divider text-ink-muted text-[10px] uppercase font-bold tracking-wider">
                    <th className="py-3 px-4">Staff Member</th>
                    <th className="py-3 px-4">Role & Access Scope</th>
                    <th className="py-3 px-3">Status</th>
                    <th className="py-3 px-3">Joined Date</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-divider/50">
                  {filteredStaff.map((staff) => {
                    const isActive = staff.is_active !== false;
                    const config = ROLE_CONFIGS[staff.role] || {
                      label: staff.role,
                      scope: 'General',
                      badge: staff.role,
                    };
                    const isSelf = currentAdminUser?.id === staff.id;

                    return (
                      <tr
                        key={staff.id}
                        className={`hover:bg-canvas-warm/30 transition-colors ${
                          !isActive ? 'opacity-65 bg-canvas-warm/15' : ''
                        }`}
                      >
                        {/* Member Identity */}
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-xl bg-canvas-warm border border-divider flex items-center justify-center font-bold text-ink font-mono text-xs flex-shrink-0">
                              {staff.name.slice(0, 2).toUpperCase()}
                            </div>
                            <div className="min-w-0">
                              <div className="font-bold text-ink truncate flex items-center gap-1.5">
                                <span>{staff.name}</span>
                                {isSelf && (
                                  <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-gold-pale text-gold-deep border border-gold-muted/60 font-normal">
                                    You
                                  </span>
                                )}
                              </div>
                              <div className="text-[11px] text-ink-faint truncate font-mono">
                                {staff.email}
                              </div>
                              {staff.phone && (
                                <div className="text-[10px] text-ink-faint font-mono">
                                  +91 {staff.phone}
                                </div>
                              )}
                            </div>
                          </div>
                        </td>

                        {/* Role & Scope */}
                        <td className="py-3 px-4">
                          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-wider uppercase mb-0.5 bg-canvas-warm border border-divider">
                            {getRoleIcon(staff.role)}
                            <span>{config.label}</span>
                          </div>
                          <p className="text-[11px] text-ink-muted leading-tight truncate max-w-xs">
                            {config.scope}
                          </p>
                        </td>

                        {/* Status */}
                        <td className="py-3 px-3 whitespace-nowrap">
                          {isActive ? (
                            <span className="inline-flex items-center gap-1 text-ok font-semibold">
                              <span className="w-1.5 h-1.5 rounded-full bg-ok" />
                              <span>Active</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-ink-faint font-semibold">
                              <span className="w-1.5 h-1.5 rounded-full bg-ink-faint" />
                              <span>Deactivated</span>
                            </span>
                          )}
                        </td>

                        {/* Joined Date */}
                        <td className="py-3 px-3 whitespace-nowrap text-ink-faint font-mono text-[11px]">
                          {staff.created_at
                            ? new Date(staff.created_at).toLocaleDateString()
                            : 'â€”'}
                        </td>

                        {/* Actions */}
                        <td className="py-3 px-4 text-right whitespace-nowrap">
                          <div className="inline-flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => handleEditClick(staff)}
                              className="h-7 px-2.5 bg-canvas-warm hover:bg-white border border-divider hover:border-gold/50 rounded-lg text-xs font-semibold text-ink transition-colors inline-flex items-center gap-1"
                              title="Edit staff details"
                            >
                              <Edit2 className="w-3 h-3 text-ink-muted" />
                              <span>Edit</span>
                            </button>

                            {isActive ? (
                              <button
                                type="button"
                                disabled={isSelf}
                                onClick={() => setDeactivatingStaff(staff)}
                                className="h-7 px-2 bg-canvas-warm hover:bg-danger-bg text-ink-muted hover:text-danger border border-divider hover:border-danger-border rounded-lg text-xs font-semibold transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                                title={isSelf ? 'Cannot deactivate yourself' : 'Deactivate staff account'}
                              >
                                <UserX className="w-3.5 h-3.5" />
                              </button>
                            ) : (
                              <button
                                type="button"
                                onClick={() => handleToggleStatus(staff)}
                                className="h-7 px-2 bg-ok-bg text-ok hover:bg-ok hover:text-white border border-ok-border rounded-lg text-xs font-semibold transition-colors"
                                title="Reactivate staff account"
                              >
                                <UserCheck className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

      {/* â”€â”€ Add Staff Modal â”€â”€ */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title="Add CafÃ© Staff Member"
      >
        <form onSubmit={handleCreateSubmit} className="space-y-4 p-4 text-xs">
          {formError && (
            <div className="p-3 bg-danger-bg border border-danger-border rounded-xl text-danger font-semibold flex items-center gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{formError}</span>
            </div>
          )}

          <div>
            <label className="text-[10px] font-bold uppercase text-ink-muted block mb-1">
              Full Name *
            </label>
            <div className="relative">
              <User className="w-4 h-4 text-ink-faint absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                required
                value={addName}
                onChange={(e) => setAddName(e.target.value)}
                placeholder="e.g. Rahul Shah"
                className="w-full pl-9 pr-3 py-2 bg-canvas-warm/50 border border-divider rounded-xl text-xs text-ink focus:outline-none focus:border-gold"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] font-bold uppercase text-ink-muted block mb-1">
                Email Address *
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-ink-faint absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  required
                  value={addEmail}
                  onChange={(e) => setAddEmail(e.target.value)}
                  placeholder="rahul@chaipartner.com"
                  className="w-full pl-9 pr-3 py-2 bg-canvas-warm/50 border border-divider rounded-xl text-xs text-ink focus:outline-none focus:border-gold"
                />
              </div>
            </div>

            <div>
              <label className="text-[10px] font-bold uppercase text-ink-muted block mb-1">
                Phone Number (Optional)
              </label>
              <div className="relative">
                <Phone className="w-4 h-4 text-ink-faint absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="tel"
                  value={addPhone}
                  onChange={(e) => setAddPhone(e.target.value)}
                  placeholder="9876543210"
                  className="w-full pl-9 pr-3 py-2 bg-canvas-warm/50 border border-divider rounded-xl text-xs text-ink focus:outline-none focus:border-gold"
                />
              </div>
            </div>
          </div>

          <div>
            <label className="text-[10px] font-bold uppercase text-ink-muted block mb-1">
              Role & Operational Access *
            </label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { role: AdminRole.ADMIN, label: 'Owner / Admin', icon: ShieldCheck },
                { role: AdminRole.KITCHEN, label: 'Head Chef', icon: ChefHat },
                { role: AdminRole.CASHIER, label: 'Cashier POS', icon: Receipt },
              ].map((item) => {
                const isSelected = addRole === item.role;
                const Icon = item.icon;
                return (
                  <button
                    key={item.role}
                    type="button"
                    onClick={() => setAddRole(item.role)}
                    className={`p-3 rounded-xl border text-left transition-all ${
                      isSelected
                        ? 'bg-gold-pale border-gold text-ink font-bold shadow-xs'
                        : 'bg-white border-divider text-ink-muted hover:border-gold/40'
                    }`}
                  >
                    <Icon className="w-4 h-4 text-gold-deep mb-1" />
                    <div className="text-xs">{item.label}</div>
                  </button>
                );
              })}
            </div>
            <p className="text-[11px] text-ink-muted mt-2 bg-canvas-warm p-2.5 rounded-lg border border-divider/60 leading-relaxed">
              <span className="font-bold text-ink">Scope: </span>
              {ROLE_CONFIGS[addRole]?.description}
            </p>
          </div>

          <div>
            <label className="text-[10px] font-bold uppercase text-ink-muted block mb-1">
              Initial Login Password * (Min 6 chars)
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-ink-faint absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="password"
                required
                minLength={6}
                value={addPassword}
                onChange={(e) => setAddPassword(e.target.value)}
                placeholder="â€¢â€¢â€¢â€¢â€¢â€¢â€¢â€¢"
                className="w-full pl-9 pr-3 py-2 bg-canvas-warm/50 border border-divider rounded-xl text-xs text-ink focus:outline-none focus:border-gold"
              />
            </div>
          </div>

          <div className="flex gap-2 pt-2 border-t border-divider">
            <button
              type="button"
              onClick={() => setIsAddModalOpen(false)}
              className="flex-1 py-2.5 bg-canvas-warm hover:bg-divider/50 rounded-xl font-bold text-ink transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={actionLoading}
              className="flex-1 py-2.5 bg-gold hover:bg-gold-deep text-white rounded-xl font-bold transition-all shadow-xs disabled:opacity-50"
            >
              {actionLoading ? 'Creating Staff...' : 'Create Account'}
            </button>
          </div>
        </form>
      </Modal>

      {/* â”€â”€ Edit Staff Modal â”€â”€ */}
      {editingStaff && (
        <Modal
          isOpen={!!editingStaff}
          onClose={() => {
            setEditingStaff(null);
            setShowRoleChangeWarning(false);
          }}
          title={`Edit Staff: ${editingStaff.name}`}
        >
          <form onSubmit={handleEditSubmit} className="space-y-4 p-4 text-xs">
            {formError && (
              <div className="p-3 bg-danger-bg border border-danger-border rounded-xl text-danger font-semibold flex items-center gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            {showRoleChangeWarning && (
              <div className="p-3.5 bg-gold-pale border border-gold-muted rounded-xl text-ink space-y-2">
                <div className="font-bold text-gold-deep flex items-center gap-1.5">
                  <AlertCircle className="w-4 h-4" />
                  <span>Confirm Role Permission Change</span>
                </div>
                <p className="text-[11px] text-ink-muted leading-relaxed">
                  Changing this role will immediately modify this staff member&apos;s administrative access across the operations console.
                </p>
                <div className="flex items-center justify-between text-xs font-mono py-1 px-2 bg-white/70 rounded border border-gold-muted/40">
                  <span>Current: <strong>{ROLE_CONFIGS[editingStaff.role]?.label}</strong></span>
                  <span>â†’</span>
                  <span>New: <strong className="text-gold-deep">{ROLE_CONFIGS[editRole]?.label}</strong></span>
                </div>
              </div>
            )}

            <div>
              <label className="text-[10px] font-bold uppercase text-ink-muted block mb-1">
                Full Name
              </label>
              <input
                type="text"
                required
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                className="w-full px-3 py-2 bg-canvas-warm/50 border border-divider rounded-xl text-xs text-ink focus:outline-none focus:border-gold"
              />
            </div>

            <div>
              <label className="text-[10px] font-bold uppercase text-ink-muted block mb-1">
                Phone Number
              </label>
              <input
                type="tel"
                value={editPhone}
                onChange={(e) => setEditPhone(e.target.value)}
                placeholder="9876543210"
                className="w-full px-3 py-2 bg-canvas-warm/50 border border-divider rounded-xl text-xs text-ink focus:outline-none focus:border-gold"
              />
            </div>

            <div>
              <label className="text-[10px] font-bold uppercase text-ink-muted block mb-1">
                Assigned Role
              </label>
              <select
                value={editRole}
                onChange={(e) => {
                  setEditRole(e.target.value as AdminRole);
                  if (e.target.value !== editingStaff.role) {
                    setShowRoleChangeWarning(true);
                  } else {
                    setShowRoleChangeWarning(false);
                  }
                }}
                className="w-full px-3 py-2 bg-canvas-warm/50 border border-divider rounded-xl text-xs text-ink font-semibold focus:outline-none focus:border-gold"
              >
                <option value={AdminRole.ADMIN}>Owner / Admin (Full Access)</option>
                <option value={AdminRole.KITCHEN}>Head Chef (Kitchen Queue Only)</option>
                <option value={AdminRole.CASHIER}>Cashier POS (Billing & Settlements)</option>
              </select>
            </div>

            <div>
              <label className="text-[10px] font-bold uppercase text-ink-muted block mb-1">
                Reset Password (Optional â€” leave blank to keep current)
              </label>
              <input
                type="password"
                minLength={6}
                value={editPassword}
                onChange={(e) => setEditPassword(e.target.value)}
                placeholder="Enter new password (optional)"
                className="w-full px-3 py-2 bg-canvas-warm/50 border border-divider rounded-xl text-xs text-ink focus:outline-none focus:border-gold"
              />
            </div>

            <div className="flex gap-2 pt-2 border-t border-divider">
              <button
                type="button"
                onClick={() => {
                  setEditingStaff(null);
                  setShowRoleChangeWarning(false);
                }}
                className="flex-1 py-2.5 bg-canvas-warm hover:bg-divider/50 rounded-xl font-bold text-ink transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={actionLoading}
                className="flex-1 py-2.5 bg-gold hover:bg-gold-deep text-white rounded-xl font-bold transition-all shadow-xs disabled:opacity-50"
              >
                {actionLoading ? 'Saving...' : showRoleChangeWarning ? 'Confirm & Change Role' : 'Save Changes'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* â”€â”€ Deactivate Confirmation Modal â”€â”€ */}
      {deactivatingStaff && (
        <Modal
          isOpen={!!deactivatingStaff}
          onClose={() => setDeactivatingStaff(null)}
          title="Deactivate Staff Member"
        >
          <div className="p-4 space-y-4 text-xs">
            <div className="p-3.5 bg-danger-bg border border-danger-border rounded-xl text-ink">
              <div className="font-bold text-danger flex items-center gap-1.5 mb-1">
                <AlertCircle className="w-4 h-4" />
                <span>Deactivate {deactivatingStaff.name}?</span>
              </div>
              <p className="text-[11px] text-ink-muted leading-relaxed">
                This staff member will immediately lose access to the staff operations portal and will not be able to log in. Their historical orders and billing actions will remain safely preserved in the database.
              </p>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setDeactivatingStaff(null)}
                className="flex-1 py-2.5 bg-canvas-warm hover:bg-divider/50 rounded-xl font-bold text-ink transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={actionLoading}
                onClick={() => handleToggleStatus(deactivatingStaff)}
                className="flex-1 py-2.5 bg-danger hover:bg-[#A83226] text-white rounded-xl font-bold transition-all shadow-xs disabled:opacity-50"
              >
                {actionLoading ? 'Deactivating...' : 'Confirm Deactivation'}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
