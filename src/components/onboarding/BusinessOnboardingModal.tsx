import React, { useState } from 'react';
import {
  Building2,
  Check,
  ChevronLeft,
  ChevronRight,
  LogOut,
  Mail,
  Sparkles,
  X,
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { BUSINESS_TYPE_TEMPLATES } from '../../utils/permissions';
import { acceptInvitationAtomic, createBusinessAtomic } from '../../services/firestoreService';
import { BusinessType } from '../../types';

interface BusinessOnboardingProps {
  isModal?: boolean;
  onClose?: () => void;
  onBusinessReady: (businessId: string) => void;
}

export const BusinessOnboardingModal: React.FC<BusinessOnboardingProps> = ({
  isModal = false,
  onClose,
  onBusinessReady,
}) => {
  const { user, userProfile, pendingInvites, logout, selectBusiness } = useAuth();
  const [step, setStep] = useState<1 | 2>(1);
  const [businessName, setBusinessName] = useState('');
  const [businessType, setBusinessType] = useState<BusinessType>('Retail & General Store');
  const [email, setEmail] = useState(user?.email || '');
  const [phone, setPhone] = useState('+677 ');
  const [address, setAddress] = useState('');
  const [country, setCountry] = useState('Solomon Islands');
  const [currency, setCurrency] = useState('SBD');
  const [timezone, setTimezone] = useState('Pacific/Guadalcanal');
  const [submitting, setSubmitting] = useState(false);
  const [acceptingId, setAcceptingId] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleAcceptInvite = async (inviteId: string) => {
    if (!user) return;
    setAcceptingId(inviteId);
    setErrorMsg(null);
    try {
      const bizId = await acceptInvitationAtomic(
        user,
        userProfile?.displayName || user.displayName || 'Staff Member',
        inviteId
      );
      selectBusiness(bizId);
      onBusinessReady(bizId);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Unable to accept invitation.');
    } finally {
      setAcceptingId(null);
    }
  };

  const handleCreateBusiness = async () => {
    if (!user) return;
    if (!businessName.trim()) {
      setErrorMsg('Please enter your business name.');
      setStep(1);
      return;
    }
    setSubmitting(true);
    setErrorMsg(null);
    try {
      const created = await createBusinessAtomic(
        user,
        userProfile?.displayName || user.displayName || 'Owner',
        {
          name: businessName.trim(),
          businessType,
          email: email.trim(),
          phone: phone.trim(),
          address: address.trim(),
          country: country.trim() || 'Solomon Islands',
          currency: currency.trim() || 'SBD',
          timezone: timezone.trim() || 'Pacific/Guadalcanal',
        }
      );
      selectBusiness(created.id);
      onBusinessReady(created.id);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Failed to create business.');
    } finally {
      setSubmitting(false);
    }
  };

  const content = (
    <div className="bg-white border border-[#E2E8F0] rounded-xl shadow-lg w-full max-w-3xl overflow-hidden flex flex-col max-h-[92vh]">
      {/* Header */}
      <div className="px-6 py-4 bg-[#0F172A] text-white flex items-center justify-between gap-3 shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-9 h-9 rounded-lg bg-[#2563EB] flex items-center justify-center shrink-0">
            <Building2 className="w-4 h-4 text-white" />
          </div>
          <div className="min-w-0">
            <h2 className="text-base font-bold leading-tight truncate">
              {isModal ? 'Create New Business' : 'Welcome to Isles BOS — Setup Your Business'}
            </h2>
            <p className="text-xs text-slate-300 mt-0.5">
              Step {step} of 2 · {step === 1 ? 'Business Details' : 'Select Business Type'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {!isModal && (
            <button
              type="button"
              onClick={() => void logout()}
              className="h-8 px-3 rounded-md bg-[#1E293B] hover:bg-slate-700 text-xs font-medium text-slate-200 inline-flex items-center gap-1.5 whitespace-nowrap"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Sign Out</span>
            </button>
          )}
          {isModal && onClose && (
            <button
              type="button"
              aria-label="Close create business dialog"
              onClick={onClose}
              className="w-8 h-8 rounded-md hover:bg-[#1E293B] text-slate-300 flex items-center justify-center"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      <div className="p-6 overflow-y-auto space-y-5">
        {/* Pending Staff Invitations Banner */}
        {pendingInvites.length > 0 && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 space-y-3">
            <div className="flex items-center gap-2 text-xs font-bold text-[#1D4ED8] uppercase tracking-wider">
              <Mail className="w-4 h-4" />
              <span>Pending Team Invitations ({pendingInvites.length})</span>
            </div>
            <div className="space-y-2">
              {pendingInvites.map((inv) => (
                <div
                  key={inv.id}
                  className="bg-white border border-blue-200 rounded-md p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                >
                  <div>
                    <div className="text-sm font-bold text-[#111827]">{inv.businessName}</div>
                    <div className="text-xs text-[#64748B]">
                      Invited by {inv.invitedByName} as{' '}
                      <strong className="text-[#111827]">{inv.role}</strong> · {inv.businessType}
                    </div>
                  </div>
                  <button
                    type="button"
                    disabled={acceptingId === inv.id}
                    onClick={() => handleAcceptInvite(inv.id)}
                    className="h-9 px-4 rounded-md bg-[#2563EB] hover:bg-[#1D4ED8] disabled:opacity-60 text-white text-xs font-semibold shrink-0"
                  >
                    {acceptingId === inv.id ? 'Joining...' : 'Accept & Join Business'}
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Step Indicator */}
        <div className="flex items-center gap-2">
          <div
            className={`flex-1 h-1.5 rounded-full ${
              step >= 1 ? 'bg-[#2563EB]' : 'bg-[#E2E8F0]'
            }`}
          />
          <div
            className={`flex-1 h-1.5 rounded-full ${
              step >= 2 ? 'bg-[#2563EB]' : 'bg-[#E2E8F0]'
            }`}
          />
        </div>

        {errorMsg && (
          <div
            role="alert"
            className="p-3 rounded-lg bg-red-50 border border-red-200 text-xs font-medium text-[#DC2626]"
          >
            {errorMsg}
          </div>
        )}

        {step === 1 ? (
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <label
                  htmlFor="ob-name"
                  className="block text-xs font-semibold text-[#111827] mb-1.5"
                >
                  Business Name *
                </label>
                <input
                  id="ob-name"
                  type="text"
                  placeholder="e.g. Honiara Retail Store"
                  value={businessName}
                  onChange={(e) => {
                    setBusinessName(e.target.value);
                    setErrorMsg(null);
                  }}
                  className="w-full h-10 px-3 bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg text-[13px] text-[#111827] focus:outline-none focus:ring-2 focus:ring-[#2563EB]/25 focus:border-[#2563EB]"
                  required
                />
              </div>

              <div>
                <label
                  htmlFor="ob-email"
                  className="block text-xs font-semibold text-[#111827] mb-1.5"
                >
                  Business Email
                </label>
                <input
                  id="ob-email"
                  type="email"
                  placeholder="sales@yourbusiness.sb"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full h-10 px-3 bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg text-[13px]"
                />
              </div>

              <div>
                <label
                  htmlFor="ob-phone"
                  className="block text-xs font-semibold text-[#111827] mb-1.5"
                >
                  Phone Number
                </label>
                <input
                  id="ob-phone"
                  type="text"
                  placeholder="+677 7481920"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full h-10 px-3 bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg text-[13px]"
                />
              </div>

              <div className="sm:col-span-2">
                <label
                  htmlFor="ob-address"
                  className="block text-xs font-semibold text-[#111827] mb-1.5"
                >
                  Street / Shop Location
                </label>
                <input
                  id="ob-address"
                  type="text"
                  placeholder="e.g. Mendana Avenue, Point Cruz, Honiara"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  className="w-full h-10 px-3 bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg text-[13px]"
                />
              </div>

              <div>
                <label
                  htmlFor="ob-country"
                  className="block text-xs font-semibold text-[#111827] mb-1.5"
                >
                  Country
                </label>
                <input
                  id="ob-country"
                  type="text"
                  value={country}
                  onChange={(e) => setCountry(e.target.value)}
                  className="w-full h-10 px-3 bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg text-[13px]"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label
                    htmlFor="ob-currency"
                    className="block text-xs font-semibold text-[#111827] mb-1.5"
                  >
                    Currency
                  </label>
                  <select
                    id="ob-currency"
                    value={currency}
                    onChange={(e) => setCurrency(e.target.value)}
                    className="w-full h-10 px-3 bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg text-[13px] font-medium"
                  >
                    <option value="SBD">SBD ($)</option>
                    <option value="AUD">AUD ($)</option>
                    <option value="USD">USD ($)</option>
                    <option value="FJD">FJD ($)</option>
                    <option value="PGK">PGK (K)</option>
                    <option value="VUV">VUV (VT)</option>
                  </select>
                </div>

                <div>
                  <label
                    htmlFor="ob-timezone"
                    className="block text-xs font-semibold text-[#111827] mb-1.5"
                  >
                    Timezone
                  </label>
                  <select
                    id="ob-timezone"
                    value={timezone}
                    onChange={(e) => setTimezone(e.target.value)}
                    className="w-full h-10 px-3 bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg text-[13px]"
                  >
                    <option value="Pacific/Guadalcanal">Pacific/Guadalcanal</option>
                    <option value="Pacific/Port_Moresby">Pacific/Port_Moresby</option>
                    <option value="Pacific/Fiji">Pacific/Fiji</option>
                    <option value="Pacific/Efate">Pacific/Efate</option>
                    <option value="Australia/Sydney">Australia/Sydney</option>
                  </select>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-xs text-[#64748B]">
                Choose a template to configure initial product &amp; expense categories and invoice
                numbering.
              </p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {BUSINESS_TYPE_TEMPLATES.map((tpl) => {
                const selected = businessType === tpl.type;
                return (
                  <button
                    key={tpl.type}
                    type="button"
                    onClick={() => setBusinessType(tpl.type)}
                    className={`text-left p-3.5 rounded-lg border transition-colors flex flex-col justify-between gap-2 ${
                      selected
                        ? 'border-[#2563EB] bg-blue-50/70 ring-1 ring-[#2563EB]'
                        : 'border-[#E2E8F0] bg-white hover:bg-[#F8FAFC]'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-bold text-[#111827]">{tpl.type}</span>
                        {selected && (
                          <span className="w-4 h-4 rounded-full bg-[#2563EB] text-white flex items-center justify-center shrink-0">
                            <Check className="w-2.5 h-2.5" />
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-[#64748B] mt-1 leading-snug">{tpl.tagline}</p>
                    </div>
                    <div className="text-[10px] font-mono text-[#64748B]">
                      Prefix: {tpl.invoicePrefix} · {tpl.productCategories.slice(0, 3).join(', ')}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="px-6 py-4 bg-[#F8FAFC] border-t border-[#E2E8F0] flex flex-wrap items-center justify-between gap-2 shrink-0">
        {step === 1 ? (
          <>
            <span className="text-xs text-[#64748B]">
              You will be assigned as <strong className="text-[#111827]">Owner</strong>.
            </span>
            <button
              type="button"
              onClick={() => {
                if (!businessName.trim()) {
                  setErrorMsg('Please enter your business name before continuing.');
                  return;
                }
                setErrorMsg(null);
                setStep(2);
              }}
              className="h-9 px-4 rounded-lg bg-[#2563EB] hover:bg-[#1D4ED8] text-white text-xs font-semibold inline-flex items-center gap-1.5"
            >
              <span>Next: Business Type</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </>
        ) : (
          <>
            <button
              type="button"
              disabled={submitting}
              onClick={() => setStep(1)}
              className="h-9 px-3.5 rounded-lg border border-[#E2E8F0] bg-white hover:bg-slate-50 text-[#111827] text-xs font-semibold inline-flex items-center gap-1"
            >
              <ChevronLeft className="w-4 h-4" />
              <span>Back</span>
            </button>
            <button
              type="button"
              disabled={submitting}
              onClick={handleCreateBusiness}
              className="h-9 px-5 rounded-lg bg-[#2563EB] hover:bg-[#1D4ED8] disabled:opacity-60 text-white text-xs font-semibold inline-flex items-center gap-1.5"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>{submitting ? 'Provisioning Business...' : 'Create Business'}</span>
            </button>
          </>
        )}
      </div>
    </div>
  );

  if (isModal) {
    return (
      <div
        className="fixed inset-0 bg-slate-900/60 backdrop-blur-[1px] z-50 flex items-center justify-center p-4"
        role="dialog"
        aria-modal="true"
      >
        {content}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F3F6FA] flex items-center justify-center p-4">
      {content}
    </div>
  );
};
