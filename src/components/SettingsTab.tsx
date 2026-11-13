import React, { useState, useEffect } from 'react';
import {
  AuditLog,
  Business,
  BusinessMember,
  Invitation,
  PermissionSet,
  UserRole,
} from '../types';
import {
  Shield,
  Database,
  Download,
  Check,
  Building2,
  UserPlus,
  Trash2,
  Crown,
  Clock,
  UploadCloud,
  Activity,
  Eye,
  EyeOff,
  KeyRound,
  Mail,
} from 'lucide-react';
import { BUSINESS_TYPE_TEMPLATES, INVITABLE_ROLES } from '../utils/permissions';

interface SettingsTabProps {
  business: Business;
  members: BusinessMember[];
  invitations: Invitation[];
  auditLogs: AuditLog[];
  currentUserId: string;
  permissions: PermissionSet;
  hasLegacyLocalData: boolean;
  onUpdateBusiness: (updates: {
    name: string;
    businessType: string;
    email: string;
    phone: string;
    address: string;
    currency: string;
    taxRate: number;
    receiptFooter: string;
  }) => Promise<void>;
  onInviteStaff: (email: string, role: Exclude<UserRole, 'Owner'>) => Promise<void>;
  onCreateStaffAccount: (input: {
    displayName: string;
    email: string;
    password: string;
    role: Exclude<UserRole, 'Owner'>;
  }) => Promise<void>;
  onRevokeInvitation: (inviteId: string) => Promise<void>;
  onUpdateMemberRole: (
    member: BusinessMember,
    role: Exclude<UserRole, 'Owner'>,
    status: 'active' | 'suspended'
  ) => Promise<void>;
  onRemoveMember: (member: BusinessMember) => Promise<void>;
  onTransferOwnership: (newOwner: BusinessMember) => Promise<void>;
  onExportData: () => void;
  onOpenMigrationAssistant: () => void;
}

export const SettingsTab: React.FC<SettingsTabProps> = ({
  business,
  members,
  invitations,
  auditLogs,
  currentUserId,
  permissions,
  hasLegacyLocalData,
  onUpdateBusiness,
  onInviteStaff,
  onCreateStaffAccount,
  onRevokeInvitation,
  onUpdateMemberRole,
  onRemoveMember,
  onTransferOwnership,
  onExportData,
  onOpenMigrationAssistant,
}) => {
  const [formData, setFormData] = useState({
    name: business.name,
    businessType: business.businessType,
    email: business.email,
    phone: business.phone,
    address: business.address,
    currency: business.currency,
    taxRate: business.taxRate,
    receiptFooter: business.receiptFooter,
  });

  const [savingProfile, setSavingProfile] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Staff provisioning & invite state
  const [staffMode, setStaffMode] = useState<'create' | 'invite'>('create');
  const [staffName, setStaffName] = useState('');
  const [staffEmail, setStaffEmail] = useState('');
  const [staffPassword, setStaffPassword] = useState('');
  const [showStaffPassword, setShowStaffPassword] = useState(false);
  const [staffRole, setStaffRole] = useState<Exclude<UserRole, 'Owner'>>('Cashier');
  const [creatingStaff, setCreatingStaff] = useState(false);

  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<Exclude<UserRole, 'Owner'>>('Cashier');
  const [inviting, setInviting] = useState(false);
  const [inviteSuccess, setInviteSuccess] = useState<string | null>(null);
  const [transferTarget, setTransferTarget] = useState<BusinessMember | null>(null);
  const [transferring, setTransferring] = useState(false);

  useEffect(() => {
    setFormData({
      name: business.name,
      businessType: business.businessType,
      email: business.email,
      phone: business.phone,
      address: business.address,
      currency: business.currency,
      taxRate: business.taxRate,
      receiptFooter: business.receiptFooter,
    });
  }, [business]);

  const handleSubmitProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!permissions.canManageSettings) return;
    setSavingProfile(true);
    setErrorMsg(null);
    setSavedSuccess(false);
    try {
      await onUpdateBusiness(formData);
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 3500);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Unable to save business profile.');
    } finally {
      setSavingProfile(false);
    }
  };

  const handleCreateStaffSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!permissions.canInviteStaff) return;
    setCreatingStaff(true);
    setErrorMsg(null);
    setInviteSuccess(null);
    try {
      const normalizedEmail = staffEmail.trim().toLowerCase();
      await onCreateStaffAccount({
        displayName: staffName.trim(),
        email: normalizedEmail,
        password: staffPassword,
        role: staffRole,
      });
      setInviteSuccess(
        `Staff account created for ${staffName.trim()} (${normalizedEmail}) as ${staffRole}. A verification email was dispatched so they can sign in with their email and password.`
      );
      setStaffName('');
      setStaffEmail('');
      setStaffPassword('');
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Failed to create staff account.');
    } finally {
      setCreatingStaff(false);
    }
  };

  const handleInviteSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail.trim() || !permissions.canInviteStaff) return;
    setInviting(true);
    setErrorMsg(null);
    setInviteSuccess(null);
    try {
      await onInviteStaff(inviteEmail.trim(), inviteRole);
      setInviteSuccess(`Invitation created for ${inviteEmail.trim().toLowerCase()} as ${inviteRole}.`);
      setInviteEmail('');
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Failed to send invitation.');
    } finally {
      setInviting(false);
    }
  };

  return (
    <div className="space-y-5 max-w-6xl w-full min-w-0">
      {savedSuccess && (
        <div
          role="status"
          className="bg-emerald-50 border border-emerald-200 text-[#16A34A] px-4 py-3 rounded-lg flex items-center gap-2.5 text-xs font-semibold"
        >
          <Check className="w-4 h-4 shrink-0" />
          <span>Business settings updated in Cloud Firestore.</span>
        </div>
      )}

      {inviteSuccess && (
        <div
          role="status"
          className="bg-blue-50 border border-blue-200 text-[#1D4ED8] px-4 py-3 rounded-lg flex items-center gap-2.5 text-xs font-semibold"
        >
          <Check className="w-4 h-4 shrink-0" />
          <span>{inviteSuccess}</span>
        </div>
      )}

      {errorMsg && (
        <div
          role="alert"
          className="bg-red-50 border border-red-200 text-[#DC2626] px-4 py-3 rounded-lg text-xs font-semibold"
        >
          {errorMsg}
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-5 items-start">
        {/* Left: Business Profile Form */}
        <form
          onSubmit={handleSubmitProfile}
          className="xl:col-span-6 bg-white border border-[#E2E8F0] rounded-lg overflow-hidden min-w-0"
        >
          <div className="px-5 py-4 border-b border-[#E2E8F0] flex items-center gap-2">
            <Building2 className="w-4 h-4 text-[#2563EB]" />
            <div>
              <h2 className="text-[14px] font-semibold text-[#111827]">Business Profile</h2>
              <p className="text-[12px] text-[#64748B]">
                Isolated profile, tax rate, and receipt footer for {business.name}
              </p>
            </div>
          </div>

          <div className="p-5 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label
                  htmlFor="business-name"
                  className="block text-xs font-semibold text-[#111827] mb-1.5"
                >
                  Business Name
                </label>
                <input
                  id="business-name"
                  type="text"
                  disabled={!permissions.canManageSettings}
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full h-10 px-3 bg-[#F8FAFC] disabled:opacity-70 border border-[#E2E8F0] rounded-md text-[13px] text-[#111827]"
                  required
                />
              </div>

              <div>
                <label
                  htmlFor="business-type"
                  className="block text-xs font-semibold text-[#111827] mb-1.5"
                >
                  Business Type
                </label>
                <select
                  id="business-type"
                  disabled={!permissions.canManageSettings}
                  value={formData.businessType}
                  onChange={(e) => setFormData({ ...formData, businessType: e.target.value })}
                  className="w-full h-10 px-3 bg-[#F8FAFC] disabled:opacity-70 border border-[#E2E8F0] rounded-md text-[13px] text-[#111827]"
                >
                  {BUSINESS_TYPE_TEMPLATES.map((t) => (
                    <option key={t.type} value={t.type}>
                      {t.type}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label
                  htmlFor="business-phone"
                  className="block text-xs font-semibold text-[#111827] mb-1.5"
                >
                  Phone Number
                </label>
                <input
                  id="business-phone"
                  type="text"
                  disabled={!permissions.canManageSettings}
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="w-full h-10 px-3 bg-[#F8FAFC] disabled:opacity-70 border border-[#E2E8F0] rounded-md text-[13px] text-[#111827]"
                />
              </div>

              <div>
                <label
                  htmlFor="business-email"
                  className="block text-xs font-semibold text-[#111827] mb-1.5"
                >
                  Email Address
                </label>
                <input
                  id="business-email"
                  type="email"
                  disabled={!permissions.canManageSettings}
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full h-10 px-3 bg-[#F8FAFC] disabled:opacity-70 border border-[#E2E8F0] rounded-md text-[13px] text-[#111827]"
                />
              </div>

              <div className="sm:col-span-2">
                <label
                  htmlFor="business-address"
                  className="block text-xs font-semibold text-[#111827] mb-1.5"
                >
                  Business Address
                </label>
                <input
                  id="business-address"
                  type="text"
                  disabled={!permissions.canManageSettings}
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  className="w-full h-10 px-3 bg-[#F8FAFC] disabled:opacity-70 border border-[#E2E8F0] rounded-md text-[13px] text-[#111827]"
                />
              </div>

              <div>
                <label
                  htmlFor="business-currency"
                  className="block text-xs font-semibold text-[#111827] mb-1.5"
                >
                  Currency
                </label>
                <select
                  id="business-currency"
                  disabled={!permissions.canManageSettings}
                  value={formData.currency}
                  onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
                  className="w-full h-10 px-3 bg-[#F8FAFC] disabled:opacity-70 border border-[#E2E8F0] rounded-md text-[13px] font-medium"
                >
                  <option value="SBD">SBD</option>
                  <option value="AUD">AUD</option>
                  <option value="USD">USD</option>
                  <option value="FJD">FJD</option>
                  <option value="PGK">PGK</option>
                  <option value="VUV">VUV</option>
                </select>
              </div>

              <div>
                <label
                  htmlFor="business-tax"
                  className="block text-xs font-semibold text-[#111827] mb-1.5"
                >
                  Tax Rate (%)
                </label>
                <input
                  id="business-tax"
                  type="number"
                  min="0"
                  max="100"
                  step="0.1"
                  disabled={!permissions.canManageSettings}
                  value={formData.taxRate}
                  onChange={(e) =>
                    setFormData({ ...formData, taxRate: parseFloat(e.target.value) || 0 })
                  }
                  className="w-full h-10 px-3 bg-[#F8FAFC] disabled:opacity-70 border border-[#E2E8F0] rounded-md text-[13px] tabular-nums"
                />
              </div>

              <div className="sm:col-span-2">
                <label
                  htmlFor="receipt-footer"
                  className="block text-xs font-semibold text-[#111827] mb-1.5"
                >
                  Receipt Footer Note
                </label>
                <input
                  id="receipt-footer"
                  type="text"
                  disabled={!permissions.canManageSettings}
                  value={formData.receiptFooter}
                  onChange={(e) => setFormData({ ...formData, receiptFooter: e.target.value })}
                  className="w-full h-10 px-3 bg-[#F8FAFC] disabled:opacity-70 border border-[#E2E8F0] rounded-md text-[13px] text-[#111827]"
                />
              </div>
            </div>

            {permissions.canManageSettings && (
              <div className="pt-4 border-t border-[#E2E8F0] flex justify-end">
                <button
                  type="submit"
                  disabled={savingProfile}
                  className="h-9 px-4 rounded-md bg-[#2563EB] hover:bg-[#1D4ED8] disabled:opacity-60 text-white text-xs font-semibold transition-colors"
                >
                  {savingProfile ? 'Saving...' : 'Save Business Profile'}
                </button>
              </div>
            )}
          </div>
        </form>

        {/* Right: Team, Invitations & Cloud Backup/Migration */}
        <div className="xl:col-span-6 space-y-5 min-w-0">
          {/* Team & RBAC Members */}
          <div className="bg-white border border-[#E2E8F0] rounded-lg overflow-hidden">
            <div className="px-5 py-4 border-b border-[#E2E8F0] flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Shield className="w-4 h-4 text-[#2563EB]" />
                <div>
                  <h2 className="text-[14px] font-semibold text-[#111827]">
                    Staff &amp; Role Access ({members.length})
                  </h2>
                  <p className="text-[12px] text-[#64748B]">
                    Multi-staff role permissions enforced by Firestore Rules
                  </p>
                </div>
              </div>
            </div>

            {/* Add / Invite Staff Section */}
            {permissions.canInviteStaff && (
              <div className="px-5 py-4 bg-[#F8FAFC] border-b border-[#E2E8F0] space-y-3">
                <div className="grid grid-cols-2 p-0.5 bg-white border border-[#E2E8F0] rounded-md">
                  <button
                    type="button"
                    onClick={() => {
                      setStaffMode('create');
                      setErrorMsg(null);
                    }}
                    className={`h-8 px-2 rounded text-[11px] sm:text-xs font-semibold inline-flex items-center justify-center gap-1.5 whitespace-nowrap transition-colors ${
                      staffMode === 'create'
                        ? 'bg-[#2563EB] text-white'
                        : 'text-[#64748B] hover:text-[#111827]'
                    }`}
                  >
                    <KeyRound className="w-3.5 h-3.5 shrink-0" />
                    <span>Email &amp; Password</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setStaffMode('invite');
                      setErrorMsg(null);
                    }}
                    className={`h-8 px-2 rounded text-[11px] sm:text-xs font-semibold inline-flex items-center justify-center gap-1.5 whitespace-nowrap transition-colors ${
                      staffMode === 'invite'
                        ? 'bg-[#2563EB] text-white'
                        : 'text-[#64748B] hover:text-[#111827]'
                    }`}
                  >
                    <Mail className="w-3.5 h-3.5 shrink-0" />
                    <span>Send Invite</span>
                  </button>
                </div>

                {staffMode === 'create' ? (
                  <form onSubmit={handleCreateStaffSubmit} className="space-y-2.5">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      <div>
                        <label
                          htmlFor="staff-create-name"
                          className="block text-[11px] font-semibold text-[#111827] mb-1"
                        >
                          Staff Full Name *
                        </label>
                        <input
                          id="staff-create-name"
                          type="text"
                          placeholder="e.g. Maria Siale"
                          value={staffName}
                          onChange={(e) => setStaffName(e.target.value)}
                          className="w-full h-9 px-3 bg-white border border-[#E2E8F0] rounded-md text-xs text-[#111827]"
                          required
                        />
                      </div>

                      <div>
                        <label
                          htmlFor="staff-create-role"
                          className="block text-[11px] font-semibold text-[#111827] mb-1"
                        >
                          Assigned Role
                        </label>
                        <select
                          id="staff-create-role"
                          value={staffRole}
                          onChange={(e) => setStaffRole(e.target.value as Exclude<UserRole, 'Owner'>)}
                          className="w-full h-9 px-2.5 bg-white border border-[#E2E8F0] rounded-md text-xs font-medium text-[#111827]"
                        >
                          {INVITABLE_ROLES.map((r) => (
                            <option key={r} value={r}>
                              {r}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label
                          htmlFor="staff-create-email"
                          className="block text-[11px] font-semibold text-[#111827] mb-1"
                        >
                          Staff Email *
                        </label>
                        <input
                          id="staff-create-email"
                          type="email"
                          placeholder="cashier@business.sb"
                          value={staffEmail}
                          onChange={(e) => setStaffEmail(e.target.value)}
                          className="w-full h-9 px-3 bg-white border border-[#E2E8F0] rounded-md text-xs text-[#111827]"
                          required
                        />
                      </div>

                      <div>
                        <label
                          htmlFor="staff-create-password"
                          className="block text-[11px] font-semibold text-[#111827] mb-1"
                        >
                          Temporary Password * (min 6 chars)
                        </label>
                        <div className="relative">
                          <input
                            id="staff-create-password"
                            type={showStaffPassword ? 'text' : 'password'}
                            autoComplete="new-password"
                            placeholder="At least 6 characters"
                            value={staffPassword}
                            onChange={(e) => setStaffPassword(e.target.value)}
                            minLength={6}
                            className="w-full h-9 pl-3 pr-9 bg-white border border-[#E2E8F0] rounded-md text-xs text-[#111827]"
                            required
                          />
                          <button
                            type="button"
                            aria-label={showStaffPassword ? 'Hide staff password' : 'Show staff password'}
                            onClick={() => setShowStaffPassword((p) => !p)}
                            className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-[#64748B] hover:text-[#111827]"
                          >
                            {showStaffPassword ? (
                              <EyeOff className="w-3.5 h-3.5" />
                            ) : (
                              <Eye className="w-3.5 h-3.5" />
                            )}
                          </button>
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-0.5">
                      <span className="text-[11px] text-[#64748B]">
                        Creates the staff login without signing you out.
                      </span>
                      <button
                        type="submit"
                        disabled={creatingStaff}
                        className="h-9 px-4 rounded-md bg-[#2563EB] hover:bg-[#1D4ED8] disabled:opacity-60 text-white text-xs font-semibold inline-flex items-center justify-center gap-1.5 whitespace-nowrap"
                      >
                        <UserPlus className="w-3.5 h-3.5" />
                        <span>{creatingStaff ? 'Creating Staff...' : 'Create Staff Account'}</span>
                      </button>
                    </div>
                  </form>
                ) : (
                  <form
                    onSubmit={handleInviteSubmit}
                    className="flex flex-col sm:flex-row gap-2"
                  >
                    <input
                      type="email"
                      aria-label="Staff email to invite"
                      placeholder="staff@email.com"
                      value={inviteEmail}
                      onChange={(e) => setInviteEmail(e.target.value)}
                      className="flex-1 h-9 px-3 bg-white border border-[#E2E8F0] rounded-md text-xs text-[#111827]"
                      required
                    />
                    <select
                      aria-label="Invited staff role"
                      value={inviteRole}
                      onChange={(e) => setInviteRole(e.target.value as Exclude<UserRole, 'Owner'>)}
                      className="h-9 px-2.5 bg-white border border-[#E2E8F0] rounded-md text-xs font-medium text-[#111827]"
                    >
                      {INVITABLE_ROLES.map((r) => (
                        <option key={r} value={r}>
                          {r}
                        </option>
                      ))}
                    </select>
                    <button
                      type="submit"
                      disabled={inviting}
                      className="h-9 px-3.5 rounded-md bg-[#2563EB] hover:bg-[#1D4ED8] disabled:opacity-60 text-white text-xs font-semibold inline-flex items-center justify-center gap-1.5 whitespace-nowrap"
                    >
                      <UserPlus className="w-3.5 h-3.5" />
                      <span>{inviting ? 'Sending...' : 'Invite'}</span>
                    </button>
                  </form>
                )}
              </div>
            )}

            {/* Active Members List */}
            <div className="divide-y divide-[#E2E8F0]">
              {members.map((member) => {
                const isSelf = member.userId === currentUserId;
                const isMemberOwner = member.role === 'Owner';
                const canEditTarget =
                  permissions.canManageRoles &&
                  !isSelf &&
                  !isMemberOwner &&
                  (permissions.canTransferOwnership || member.role !== 'Administrator');

                return (
                  <div
                    key={member.userId}
                    className="px-5 py-3 flex flex-wrap items-center justify-between gap-2 text-[13px]"
                  >
                    <div className="min-w-0">
                      <div className="font-semibold text-[#111827] flex items-center gap-1.5">
                        <span className="truncate">{member.displayName}</span>
                        {isSelf && (
                          <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-slate-100 text-[#64748B]">
                            You
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-[#64748B] truncate">{member.email}</div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      {canEditTarget ? (
                        <>
                          <select
                            aria-label={`Role for ${member.displayName}`}
                            value={member.role}
                            onChange={(e) =>
                              void onUpdateMemberRole(
                                member,
                                e.target.value as Exclude<UserRole, 'Owner'>,
                                member.status
                              )
                            }
                            className="h-7 px-2 rounded border border-[#E2E8F0] bg-[#F8FAFC] text-xs font-medium text-[#111827]"
                          >
                            {INVITABLE_ROLES.map((r) => (
                              <option key={r} value={r}>
                                {r}
                              </option>
                            ))}
                          </select>
                          {permissions.canTransferOwnership && (
                            <button
                              type="button"
                              title="Transfer ownership to this member"
                              onClick={() => setTransferTarget(member)}
                              className="h-7 px-2 rounded border border-[#E2E8F0] hover:bg-amber-50 hover:border-amber-200 text-[#64748B] hover:text-[#D97706]"
                            >
                              <Crown className="w-3.5 h-3.5" />
                            </button>
                          )}
                          <button
                            type="button"
                            title="Remove staff member"
                            onClick={() => void onRemoveMember(member)}
                            className="h-7 px-2 rounded border border-[#E2E8F0] hover:bg-red-50 hover:border-red-200 text-[#64748B] hover:text-[#DC2626]"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </>
                      ) : (
                        <span className="px-2.5 py-0.5 rounded border border-[#E2E8F0] bg-[#F8FAFC] text-[#111827] text-xs font-medium">
                          {member.role}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Ownership transfer inline confirmation */}
            {transferTarget && (
              <div className="p-4 bg-amber-50 border-t border-amber-200 space-y-2.5">
                <p className="text-xs font-semibold text-amber-900">
                  Transfer ownership of {business.name} to {transferTarget.displayName} (
                  {transferTarget.email})? Your role will change to Administrator.
                </p>
                <div className="flex gap-2">
                  <button
                    type="button"
                    disabled={transferring}
                    onClick={async () => {
                      setTransferring(true);
                      try {
                        await onTransferOwnership(transferTarget);
                        setTransferTarget(null);
                      } finally {
                        setTransferring(false);
                      }
                    }}
                    className="h-8 px-3 rounded bg-[#D97706] hover:bg-amber-700 text-white text-xs font-semibold"
                  >
                    {transferring ? 'Transferring...' : 'Confirm Transfer'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setTransferTarget(null)}
                    className="h-8 px-3 rounded border border-[#E2E8F0] bg-white text-xs font-semibold text-[#111827]"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {/* Pending Sent Invitations */}
            {invitations.length > 0 && (
              <div className="border-t border-[#E2E8F0] bg-[#F8FAFC] px-5 py-3 space-y-2">
                <div className="text-[11px] font-bold uppercase tracking-wider text-[#64748B] flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5" />
                  <span>Staff Invitations</span>
                </div>
                <div className="space-y-1.5">
                  {invitations.slice(0, 6).map((inv) => (
                    <div
                      key={inv.id}
                      className="flex items-center justify-between gap-2 text-xs bg-white border border-[#E2E8F0] rounded px-3 py-2"
                    >
                      <div className="min-w-0">
                        <span className="font-semibold text-[#111827] truncate block">
                          {inv.email}
                        </span>
                        <span className="text-[11px] text-[#64748B]">
                          {inv.role} · Status: <strong>{inv.status}</strong>
                        </span>
                      </div>
                      {inv.status === 'pending' && permissions.canInviteStaff && (
                        <button
                          type="button"
                          onClick={() => void onRevokeInvitation(inv.id)}
                          className="h-7 px-2.5 rounded border border-red-200 text-[#DC2626] hover:bg-red-50 text-[11px] font-semibold shrink-0"
                        >
                          Revoke
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Data Export & Legacy Migration */}
          <div className="bg-white border border-[#E2E8F0] rounded-lg overflow-hidden">
            <div className="px-5 py-4 border-b border-[#E2E8F0] flex items-center gap-2">
              <Database className="w-4 h-4 text-[#2563EB]" />
              <div>
                <h2 className="text-[14px] font-semibold text-[#111827]">
                  Cloud Backup &amp; Legacy Migration
                </h2>
                <p className="text-[12px] text-[#64748B]">
                  Export active business data or import legacy browser records
                </p>
              </div>
            </div>

            <div className="p-5 space-y-3">
              {permissions.canExportData && (
                <button
                  type="button"
                  onClick={onExportData}
                  className="w-full h-9 px-4 rounded-md bg-[#2563EB] hover:bg-[#1D4ED8] text-white text-xs font-semibold inline-flex items-center justify-center gap-2 transition-colors"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Export Cloud Business Backup (JSON)</span>
                </button>
              )}

              {permissions.canMigrateData && (
                <button
                  type="button"
                  onClick={onOpenMigrationAssistant}
                  className={`w-full h-9 px-4 rounded-md text-xs font-semibold inline-flex items-center justify-center gap-2 transition-colors border ${
                    hasLegacyLocalData
                      ? 'border-[#2563EB]/40 bg-blue-50 text-[#1D4ED8] hover:bg-blue-100'
                      : 'border-[#E2E8F0] bg-white hover:bg-slate-50 text-[#111827]'
                  }`}
                >
                  <UploadCloud className="w-3.5 h-3.5" />
                  <span>
                    {hasLegacyLocalData
                      ? 'Import Detected Browser LocalStorage Data'
                      : 'Open LocalStorage Migration Assistant'}
                  </span>
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Immutable Audit Trail */}
      <div className="bg-white border border-[#E2E8F0] rounded-lg overflow-hidden min-w-0">
        <div className="px-5 py-3.5 border-b border-[#E2E8F0] flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <Activity className="w-4 h-4 text-[#2563EB] shrink-0" />
            <div className="min-w-0">
              <h2 className="text-[14px] font-semibold text-[#111827]">Business Audit Log</h2>
              <p className="text-[12px] text-[#64748B]">
                Immutable activity ledger for sales, stock movements, expenses, and staff changes
              </p>
            </div>
          </div>
          <span className="text-xs font-semibold text-[#64748B] tabular-nums shrink-0">
            Latest {Math.min(auditLogs.length, 20)} events
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-[#F8FAFC] border-b border-[#E2E8F0] text-[11px] font-semibold uppercase tracking-wider text-[#64748B]">
                <th className="py-2.5 px-4">Action</th>
                <th className="py-2.5 px-4">Summary</th>
                <th className="py-2.5 px-4">Actor</th>
                <th className="py-2.5 px-4 text-right">Timestamp</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E2E8F0] text-xs">
              {auditLogs.length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-8 text-center text-[#64748B]">
                    No audit events recorded yet.
                  </td>
                </tr>
              ) : (
                auditLogs.slice(0, 20).map((log) => (
                  <tr key={log.id} className="hover:bg-[#F8FAFC]">
                    <td className="py-2.5 px-4 font-mono text-[11px] font-semibold text-[#2563EB] whitespace-nowrap">
                      {log.action}
                    </td>
                    <td className="py-2.5 px-4 text-[#111827]">{log.summary}</td>
                    <td className="py-2.5 px-4 text-[#64748B] whitespace-nowrap">
                      {log.actorEmail || log.actorId}
                    </td>
                    <td className="py-2.5 px-4 text-right text-[#64748B] whitespace-nowrap tabular-nums">
                      {new Date(log.createdAt).toLocaleString()}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
