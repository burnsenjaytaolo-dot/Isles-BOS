import React, { useState } from 'react';
import {
  Building2,
  Eye,
  EyeOff,
  Mail,
  Lock,
  User as UserIcon,
  ArrowRight,
  CheckCircle2,
  RefreshCw,
  LogOut,
  ShieldCheck,
  X,
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

type AuthMode = 'signin' | 'signup' | 'forgot';

export const AuthScreen: React.FC = () => {
  const {
    user,
    isEmailVerified,
    signInWithGoogle,
    signInWithEmail,
    signUpWithEmail,
    sendPasswordReset,
    resendVerificationEmail,
    reloadAuthUser,
    logout,
    authError,
    clearAuthError,
  } = useAuth();

  const [mode, setMode] = useState<AuthMode>('signin');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const switchMode = (next: AuthMode) => {
    setMode(next);
    setLocalError(null);
    setStatusMessage(null);
    clearAuthError();
  };

  // Email verification gate for unverified email/password signups
  if (user && !isEmailVerified) {
    const handleCheckVerified = async () => {
      setSubmitting(true);
      setLocalError(null);
      setStatusMessage(null);
      try {
        const verified = await reloadAuthUser();
        if (!verified) {
          setLocalError(
            'Your email address is not verified yet. Please click the verification link in your inbox, then try again.'
          );
        }
      } catch (err) {
        setLocalError(err instanceof Error ? err.message : 'Unable to check verification status.');
      } finally {
        setSubmitting(false);
      }
    };

    const handleResend = async () => {
      setSubmitting(true);
      setLocalError(null);
      setStatusMessage(null);
      try {
        await resendVerificationEmail();
        setStatusMessage(`Verification email sent to ${user.email}. Check your inbox and spam folder.`);
      } catch (err) {
        setLocalError(err instanceof Error ? err.message : 'Failed to send verification email.');
      } finally {
        setSubmitting(false);
      }
    };

    return (
      <div className="min-h-screen bg-[#F3F6FA] flex items-center justify-center p-4">
        <div className="w-full max-w-md bg-white border border-[#E2E8F0] rounded-xl shadow-sm overflow-hidden">
          <div className="bg-[#0F172A] px-6 py-5 text-white flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-[#2563EB] flex items-center justify-center shrink-0">
              <Mail className="w-4 h-4 text-white" />
            </div>
            <div>
              <div className="text-sm font-bold tracking-wider">ISLES BOS</div>
              <div className="text-xs text-slate-400">Verify your email to unlock workspace</div>
            </div>
          </div>

          <div className="p-6 space-y-4">
            <div>
              <h1 className="text-lg font-bold text-[#111827]">Confirm your email address</h1>
              <p className="text-xs text-[#64748B] mt-1 leading-relaxed">
                For multi-tenant security, Isles BOS requires a verified email before creating or
                accessing business ledgers. We sent a verification link to{' '}
                <strong className="text-[#111827]">{user.email}</strong>.
              </p>
            </div>

            {(localError || authError) && (
              <div
                role="alert"
                className="p-3 rounded-lg bg-red-50 border border-red-200 text-xs font-medium text-[#DC2626]"
              >
                {localError || authError}
              </div>
            )}

            {statusMessage && (
              <div
                role="status"
                className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-xs font-medium text-[#16A34A]"
              >
                {statusMessage}
              </div>
            )}

            <div className="space-y-2.5 pt-1">
              <button
                type="button"
                disabled={submitting}
                onClick={handleCheckVerified}
                className="w-full h-10 rounded-lg bg-[#2563EB] hover:bg-[#1D4ED8] disabled:opacity-60 text-white text-xs font-semibold inline-flex items-center justify-center gap-2 transition-colors"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${submitting ? 'animate-spin' : ''}`} />
                <span>I&apos;ve Verified My Email — Continue</span>
              </button>

              <button
                type="button"
                disabled={submitting}
                onClick={handleResend}
                className="w-full h-10 rounded-lg border border-[#E2E8F0] bg-white hover:bg-slate-50 text-[#111827] text-xs font-semibold transition-colors"
              >
                Resend Verification Email
              </button>

              <button
                type="button"
                disabled={submitting}
                onClick={() => void logout()}
                className="w-full h-9 rounded-lg text-[#64748B] hover:text-[#111827] text-xs font-medium inline-flex items-center justify-center gap-1.5"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Sign out and use another account</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);
    setStatusMessage(null);
    clearAuthError();

    if (mode === 'forgot') {
      if (!email.trim()) {
        setLocalError('Please enter your account email address.');
        return;
      }
      setSubmitting(true);
      try {
        await sendPasswordReset(email);
        setStatusMessage(
          `If an account exists for ${email.trim()}, a password reset email has been dispatched.`
        );
      } catch (err) {
        setLocalError(err instanceof Error ? err.message : 'Unable to send reset email.');
      } finally {
        setSubmitting(false);
      }
      return;
    }

    if (mode === 'signup') {
      if (!fullName.trim()) {
        setLocalError('Please enter your full name.');
        return;
      }
      if (password.length < 6) {
        setLocalError('Password must be at least 6 characters long.');
        return;
      }
      if (password !== confirmPassword) {
        setLocalError('Passwords do not match.');
        return;
      }
      setSubmitting(true);
      try {
        await signUpWithEmail(fullName, email, password);
      } catch (err) {
        setLocalError(err instanceof Error ? err.message : 'Failed to create account.');
      } finally {
        setSubmitting(false);
      }
      return;
    }

    // Sign in
    if (!email.trim() || !password) {
      setLocalError('Please enter both your email and password.');
      return;
    }
    setSubmitting(true);
    try {
      await signInWithEmail(email, password);
    } catch (err) {
      setLocalError(err instanceof Error ? err.message : 'Sign-in failed.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setLocalError(null);
    setStatusMessage(null);
    clearAuthError();
    setSubmitting(true);
    try {
      await signInWithGoogle();
    } catch (err) {
      setLocalError(err instanceof Error ? err.message : 'Google sign-in failed.');
    } finally {
      setSubmitting(false);
    }
  };

  const displayedError = localError || authError;

  return (
    <div className="min-h-screen bg-[#F3F6FA] flex flex-col lg:flex-row">
      {/* Left Brand Panel */}
      <div className="lg:w-[44%] bg-[#0F172A] text-white px-5 py-4 sm:px-8 sm:py-6 lg:p-12 flex flex-col justify-between border-b lg:border-b-0 lg:border-r border-slate-800">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 lg:w-10 lg:h-10 rounded-lg bg-[#2563EB] flex items-center justify-center shrink-0">
              <Building2 className="w-4 h-4 lg:w-5 lg:h-5 text-white" />
            </div>
            <div>
              <div className="text-sm lg:text-base font-bold tracking-wider leading-tight">
                ISLES BOS
              </div>
              <div className="text-[11px] lg:text-xs text-slate-400">
                Business Operating System
              </div>
            </div>
          </div>

          <div className="mt-3 lg:mt-16 max-w-md space-y-2 lg:space-y-4">
            <h1 className="text-base sm:text-xl lg:text-3xl font-bold tracking-tight leading-snug">
              Multi-business sales, inventory, and credit control in one cloud ledger.
            </h1>
            <p className="hidden lg:block text-sm text-slate-300 leading-relaxed">
              Built for Pacific retail stores, hardware yards, wholesalers, and service operators.
              Run multiple isolated businesses under one account and collaborate safely with staff
              role permissions.
            </p>
          </div>

          <div className="hidden lg:grid mt-8 grid-cols-1 gap-3 max-w-md">
            <div className="bg-[#1E293B] border border-slate-700/80 rounded-lg p-3.5 flex items-start gap-3">
              <ShieldCheck className="w-4 h-4 text-[#60A5FA] shrink-0 mt-0.5" />
              <div>
                <div className="text-xs font-semibold text-white">Tenant-Isolated Cloud Data</div>
                <div className="text-[11px] text-slate-400 mt-0.5">
                  Each business maintains separate customers, stock, invoices, expenses, and staff.
                </div>
              </div>
            </div>
            <div className="bg-[#1E293B] border border-slate-700/80 rounded-lg p-3.5 flex items-start gap-3">
              <CheckCircle2 className="w-4 h-4 text-[#16A34A] shrink-0 mt-0.5" />
              <div>
                <div className="text-xs font-semibold text-white">Real-Time Staff Operations</div>
                <div className="text-[11px] text-slate-400 mt-0.5">
                  Atomic stock deductions, sequential invoices, and immutable audit trails.
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="hidden lg:flex mt-8 pt-6 border-t border-slate-800 text-[11px] text-slate-400 items-center justify-between">
          <span>Solomon Islands &amp; Pacific SaaS Edition</span>
          <span>SBD Ready</span>
        </div>
      </div>

      {/* Right Authentication Form */}
      <div className="flex-1 flex items-start lg:items-center justify-center p-4 sm:p-8 lg:p-10">
        <div className="w-full max-w-md bg-white border border-[#E2E8F0] rounded-xl shadow-xs p-5 sm:p-8 space-y-5">
          {/* Tabs for Sign In / Sign Up */}
          {mode !== 'forgot' ? (
            <div className="grid grid-cols-2 p-1 bg-[#F3F6FA] border border-[#E2E8F0] rounded-lg">
              <button
                type="button"
                onClick={() => switchMode('signin')}
                className={`h-9 rounded-md text-xs font-semibold transition-colors ${
                  mode === 'signin'
                    ? 'bg-white text-[#111827] shadow-2xs border border-[#E2E8F0]'
                    : 'text-[#64748B] hover:text-[#111827]'
                }`}
              >
                Sign In
              </button>
              <button
                type="button"
                onClick={() => switchMode('signup')}
                className={`h-9 rounded-md text-xs font-semibold transition-colors ${
                  mode === 'signup'
                    ? 'bg-white text-[#111827] shadow-2xs border border-[#E2E8F0]'
                    : 'text-[#64748B] hover:text-[#111827]'
                }`}
              >
                Create Account
              </button>
            </div>
          ) : (
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold text-[#111827]">Reset Password</h2>
              <button
                type="button"
                onClick={() => switchMode('signin')}
                className="text-xs font-semibold text-[#2563EB] hover:text-[#1D4ED8]"
              >
                Back to Sign In
              </button>
            </div>
          )}

          <div>
            <h2 className="text-lg font-bold text-[#111827]">
              {mode === 'signin'
                ? 'Welcome back'
                : mode === 'signup'
                ? 'Register your Isles BOS account'
                : 'Recover account access'}
            </h2>
            <p className="text-xs text-[#64748B] mt-0.5">
              {mode === 'signin'
                ? 'Sign in to access your businesses and real-time ledgers.'
                : mode === 'signup'
                ? 'Create an owner or staff account to manage your business.'
                : 'Enter your email to receive a Firebase password reset link.'}
            </p>
          </div>

          {displayedError && (
            <div
              role="alert"
              className="p-3 rounded-lg bg-red-50 border border-red-200 text-xs font-medium text-[#DC2626] leading-relaxed"
            >
              {displayedError}
            </div>
          )}

          {statusMessage && (
            <div
              role="status"
              className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-xs font-medium text-[#16A34A] leading-relaxed"
            >
              {statusMessage}
            </div>
          )}

          {/* Google Sign In */}
          {mode !== 'forgot' && (
            <>
              <button
                type="button"
                disabled={submitting}
                onClick={handleGoogleSignIn}
                className="w-full h-10 px-4 rounded-lg border border-[#E2E8F0] bg-white hover:bg-slate-50 disabled:opacity-60 text-[#111827] text-xs font-semibold flex items-center justify-center gap-2.5 transition-colors"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" aria-hidden="true">
                  <path
                    fill="#4285F4"
                    d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17Z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.11-6.72-4.96H1.29v3.14C3.26 21.3 7.31 24 12 24Z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.28 14.24c-.24-.72-.38-1.49-.38-2.24s.14-1.52.38-2.24V6.62H1.29C.47 8.24 0 10.06 0 12s.47 3.76 1.29 5.38l3.99-3.14Z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.31 0 3.26 2.7 1.29 6.62l3.99 3.14c.95-2.85 3.6-4.96 6.72-4.96Z"
                  />
                </svg>
                <span>Continue with Google</span>
              </button>

              <div className="relative flex items-center py-0.5">
                <div className="flex-grow border-t border-[#E2E8F0]" />
                <span className="shrink-0 mx-3 text-[11px] font-medium text-[#64748B] uppercase tracking-wider">
                  or with email
                </span>
                <div className="flex-grow border-t border-[#E2E8F0]" />
              </div>
            </>
          )}

          <form onSubmit={handleSubmit} className="space-y-3.5">
            {mode === 'signup' && (
              <div>
                <label
                  htmlFor="auth-fullname"
                  className="block text-xs font-semibold text-[#111827] mb-1.5"
                >
                  Full Name
                </label>
                <div className="relative">
                  <UserIcon className="w-4 h-4 text-[#64748B] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    id="auth-fullname"
                    type="text"
                    placeholder="e.g. Robert Maeta"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="w-full h-10 pl-9 pr-3 bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg text-[13px] text-[#111827] focus:outline-none focus:ring-2 focus:ring-[#2563EB]/25 focus:border-[#2563EB]"
                    required
                  />
                </div>
              </div>
            )}

            <div>
              <label
                htmlFor="auth-email"
                className="block text-xs font-semibold text-[#111827] mb-1.5"
              >
                Email Address
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-[#64748B] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  id="auth-email"
                  type="email"
                  autoComplete="email"
                  placeholder="name@business.sb"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full h-10 pl-9 pr-3 bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg text-[13px] text-[#111827] focus:outline-none focus:ring-2 focus:ring-[#2563EB]/25 focus:border-[#2563EB]"
                  required
                />
              </div>
            </div>

            {mode !== 'forgot' && (
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label
                    htmlFor="auth-password"
                    className="block text-xs font-semibold text-[#111827]"
                  >
                    Password
                  </label>
                  {mode === 'signin' && (
                    <button
                      type="button"
                      onClick={() => switchMode('forgot')}
                      className="text-[11px] font-semibold text-[#2563EB] hover:text-[#1D4ED8]"
                    >
                      Forgot password?
                    </button>
                  )}
                </div>
                <div className="relative">
                  <Lock className="w-4 h-4 text-[#64748B] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    id="auth-password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full h-10 pl-9 pr-10 bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg text-[13px] text-[#111827] focus:outline-none focus:ring-2 focus:ring-[#2563EB]/25 focus:border-[#2563EB]"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((p) => !p)}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-[#64748B] hover:text-[#111827]"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            )}

            {mode === 'signup' && (
              <div>
                <label
                  htmlFor="auth-confirm-password"
                  className="block text-xs font-semibold text-[#111827] mb-1.5"
                >
                  Confirm Password
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-[#64748B] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    id="auth-confirm-password"
                    type={showConfirmPassword ? 'text' : 'password'}
                    autoComplete="new-password"
                    placeholder="Repeat your password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full h-10 pl-9 pr-10 bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg text-[13px] text-[#111827] focus:outline-none focus:ring-2 focus:ring-[#2563EB]/25 focus:border-[#2563EB]"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword((p) => !p)}
                    aria-label={showConfirmPassword ? 'Hide confirm password' : 'Show confirm password'}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-[#64748B] hover:text-[#111827]"
                  >
                    {showConfirmPassword ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="w-full h-10 rounded-lg bg-[#2563EB] hover:bg-[#1D4ED8] disabled:opacity-60 text-white text-xs font-semibold inline-flex items-center justify-center gap-2 transition-colors mt-1"
            >
              <span>
                {submitting
                  ? 'Processing...'
                  : mode === 'signin'
                  ? 'Sign In to Workspace'
                  : mode === 'signup'
                  ? 'Create Account'
                  : 'Send Reset Link'}
              </span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export const AccountProfileModal: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const { user, userProfile, updateAccountName, logout } = useAuth();
  const [name, setName] = useState(userProfile?.displayName || user?.displayName || '');
  const [saving, setSaving] = useState(false);
  const [savedMsg, setSavedMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setSaving(true);
    setErrorMsg(null);
    setSavedMsg(null);
    try {
      await updateAccountName(name);
      setSavedMsg('Account display name updated.');
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Unable to update profile.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 bg-slate-900/60 backdrop-blur-[1px] z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="account-profile-title"
    >
      <div className="bg-white rounded-lg border border-[#E2E8F0] max-w-md w-full shadow-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-[#E2E8F0] flex items-center justify-between">
          <div>
            <h3 id="account-profile-title" className="text-base font-bold text-[#111827]">
              User Account &amp; Session
            </h3>
            <p className="text-xs text-[#64748B]">Manage your Isles BOS cloud identity</p>
          </div>
          <button
            type="button"
            aria-label="Close account modal"
            onClick={onClose}
            className="w-8 h-8 rounded-md hover:bg-slate-100 text-[#64748B] flex items-center justify-center"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSave} className="p-5 space-y-4">
          {errorMsg && (
            <div className="p-3 rounded-md bg-red-50 border border-red-200 text-xs font-medium text-[#DC2626]">
              {errorMsg}
            </div>
          )}
          {savedMsg && (
            <div className="p-3 rounded-md bg-emerald-50 border border-emerald-200 text-xs font-medium text-[#16A34A]">
              {savedMsg}
            </div>
          )}

          <div>
            <label
              htmlFor="account-email"
              className="block text-xs font-semibold text-[#111827] mb-1.5"
            >
              Signed-in Email
            </label>
            <input
              id="account-email"
              type="text"
              value={user?.email || ''}
              disabled
              className="w-full h-10 px-3 bg-slate-100 border border-[#E2E8F0] rounded-md text-[13px] text-[#64748B]"
            />
          </div>

          <div>
            <label
              htmlFor="account-display-name"
              className="block text-xs font-semibold text-[#111827] mb-1.5"
            >
              Display Name
            </label>
            <input
              id="account-display-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full h-10 px-3 bg-[#F8FAFC] border border-[#E2E8F0] rounded-md text-[13px] text-[#111827]"
              required
            />
          </div>

          <div className="flex items-center justify-between pt-3 border-t border-[#E2E8F0] gap-2.5">
            <button
              type="button"
              onClick={() => {
                onClose();
                void logout();
              }}
              className="h-9 px-3.5 rounded-md border border-red-200 bg-red-50 hover:bg-red-100 text-[#DC2626] text-xs font-semibold inline-flex items-center gap-1.5"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Sign Out</span>
            </button>

            <button
              type="submit"
              disabled={saving}
              className="h-9 px-4 rounded-md bg-[#2563EB] hover:bg-[#1D4ED8] disabled:opacity-60 text-white text-xs font-semibold"
            >
              {saving ? 'Saving...' : 'Save Name'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
