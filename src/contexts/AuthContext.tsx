import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import {
  User,
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  sendEmailVerification,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  updateProfile,
} from 'firebase/auth';
import { auth, googleProvider } from '../firebase';
import { BusinessMembershipIndex, Invitation, UserProfile } from '../types';
import {
  subscribePendingInvitationsForEmail,
  subscribeUserMemberships,
  syncUserProfile,
  updateOwnUserDisplayName,
} from '../services/firestoreService';

interface AuthContextValue {
  authReady: boolean;
  user: User | null;
  userProfile: UserProfile | null;
  isEmailVerified: boolean;
  memberships: BusinessMembershipIndex[];
  membershipsLoading: boolean;
  pendingInvites: Invitation[];
  activeBusinessId: string | null;
  activeMembership: BusinessMembershipIndex | null;
  authError: string | null;
  clearAuthError: () => void;
  selectBusiness: (businessId: string) => void;
  signInWithGoogle: () => Promise<void>;
  signInWithEmail: (email: string, password: string) => Promise<void>;
  signUpWithEmail: (fullName: string, email: string, password: string) => Promise<void>;
  sendPasswordReset: (email: string) => Promise<void>;
  resendVerificationEmail: () => Promise<void>;
  reloadAuthUser: () => Promise<boolean>;
  updateAccountName: (displayName: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function formatFirebaseAuthError(error: unknown): string {
  const code = (error as { code?: string })?.code || '';
  switch (code) {
    case 'auth/invalid-credential':
    case 'auth/wrong-password':
    case 'auth/user-not-found':
      return 'Incorrect email address or password. Please check your credentials and try again.';
    case 'auth/email-already-in-use':
      return 'An account with this email already exists. Please sign in instead.';
    case 'auth/weak-password':
      return 'Password is too weak. Use at least 6 characters with letters and numbers.';
    case 'auth/invalid-email':
      return 'Please enter a valid email address.';
    case 'auth/popup-closed-by-user':
      return 'Google sign-in popup was closed before completion.';
    case 'auth/popup-blocked':
      return 'Popup was blocked by the browser. Allow popups for this site and try again.';
    case 'auth/operation-not-allowed':
      return 'Email/Password sign-in is not yet enabled in Firebase Console (Authentication → Sign-in method). Use Continue with Google or enable Email/Password.';
    case 'auth/too-many-requests':
      return 'Too many attempts. Please wait a moment before trying again.';
    default:
      return error instanceof Error ? error.message : 'Authentication failed. Please try again.';
  }
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [authReady, setAuthReady] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [isEmailVerified, setIsEmailVerified] = useState(false);
  const [memberships, setMemberships] = useState<BusinessMembershipIndex[]>([]);
  const [membershipsLoading, setMembershipsLoading] = useState(false);
  const [pendingInvites, setPendingInvites] = useState<Invitation[]>([]);
  const [activeBusinessId, setActiveBusinessId] = useState<string | null>(null);
  const [authError, setAuthError] = useState<string | null>(null);

  const clearAuthError = useCallback(() => setAuthError(null), []);

  useEffect(() => {
    const unsubAuth = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);
      setIsEmailVerified(Boolean(firebaseUser?.emailVerified));

      if (!firebaseUser) {
        setUserProfile(null);
        setMemberships([]);
        setPendingInvites([]);
        setActiveBusinessId(null);
        setMembershipsLoading(false);
        setAuthReady(true);
        return;
      }

      setMembershipsLoading(true);
      try {
        const profile = await syncUserProfile(firebaseUser);
        setUserProfile(profile);
      } catch (err) {
        console.error('Failed to sync user profile:', err);
      }
      setAuthReady(true);
    });

    return () => unsubAuth();
  }, []);

  // Subscribe to memberships and pending invitations ONLY when signed in and verified
  useEffect(() => {
    if (!user || !isEmailVerified) {
      setMemberships([]);
      setPendingInvites([]);
      setMembershipsLoading(false);
      return;
    }

    setMembershipsLoading(true);
    const unsubMemberships = subscribeUserMemberships(user.uid, (list) => {
      const sorted = [...list].sort((a, b) => a.businessName.localeCompare(b.businessName));
      setMemberships(sorted);
      setMembershipsLoading(false);

      setActiveBusinessId((prev) => {
        if (prev && sorted.some((m) => m.businessId === prev)) {
          return prev;
        }
        const savedPref = sessionStorage.getItem(`isles_bos_active_biz_${user.uid}`);
        if (savedPref && sorted.some((m) => m.businessId === savedPref)) {
          return savedPref;
        }
        return sorted[0]?.businessId ?? null;
      });
    });

    const unsubInvites = user.email
      ? subscribePendingInvitationsForEmail(user.email, (invites) => {
          setPendingInvites(invites);
        })
      : () => {};

    return () => {
      unsubMemberships();
      unsubInvites();
    };
  }, [user, isEmailVerified]);

  const selectBusiness = useCallback(
    (businessId: string) => {
      setActiveBusinessId(businessId);
      if (user) {
        sessionStorage.setItem(`isles_bos_active_biz_${user.uid}`, businessId);
      }
    },
    [user]
  );

  const signInWithGoogle = useCallback(async () => {
    setAuthError(null);
    try {
      const cred = await signInWithPopup(auth, googleProvider);
      setIsEmailVerified(Boolean(cred.user.emailVerified));
      const profile = await syncUserProfile(cred.user);
      setUserProfile(profile);
    } catch (err) {
      const msg = formatFirebaseAuthError(err);
      setAuthError(msg);
      throw new Error(msg);
    }
  }, []);

  const signInWithEmail = useCallback(async (email: string, password: string) => {
    setAuthError(null);
    try {
      const cred = await signInWithEmailAndPassword(auth, email.trim(), password);
      setIsEmailVerified(Boolean(cred.user.emailVerified));
      const profile = await syncUserProfile(cred.user);
      setUserProfile(profile);
    } catch (err) {
      const msg = formatFirebaseAuthError(err);
      setAuthError(msg);
      throw new Error(msg);
    }
  }, []);

  const signUpWithEmail = useCallback(
    async (fullName: string, email: string, password: string) => {
      setAuthError(null);
      try {
        const cred = await createUserWithEmailAndPassword(auth, email.trim(), password);
        await updateProfile(cred.user, { displayName: fullName.trim() });
        await sendEmailVerification(cred.user);
        setIsEmailVerified(Boolean(cred.user.emailVerified));
        const profile = await syncUserProfile(cred.user, fullName.trim());
        setUserProfile(profile);
      } catch (err) {
        const msg = formatFirebaseAuthError(err);
        setAuthError(msg);
        throw new Error(msg);
      }
    },
    []
  );

  const sendPasswordReset = useCallback(async (email: string) => {
    setAuthError(null);
    try {
      await sendPasswordResetEmail(auth, email.trim());
    } catch (err) {
      const msg = formatFirebaseAuthError(err);
      setAuthError(msg);
      throw new Error(msg);
    }
  }, []);

  const resendVerificationEmail = useCallback(async () => {
    if (!auth.currentUser) return;
    setAuthError(null);
    try {
      await sendEmailVerification(auth.currentUser);
    } catch (err) {
      const msg = formatFirebaseAuthError(err);
      setAuthError(msg);
      throw new Error(msg);
    }
  }, []);

  const reloadAuthUser = useCallback(async (): Promise<boolean> => {
    if (!auth.currentUser) return false;
    await auth.currentUser.reload();
    const verified = Boolean(auth.currentUser.emailVerified);
    setUser(auth.currentUser);
    setIsEmailVerified(verified);
    return verified;
  }, []);

  const updateAccountName = useCallback(
    async (displayName: string) => {
      if (!auth.currentUser) return;
      await updateProfile(auth.currentUser, { displayName: displayName.trim() });
      await updateOwnUserDisplayName(auth.currentUser, displayName.trim());
      setUserProfile((prev) =>
        prev ? { ...prev, displayName: displayName.trim() } : prev
      );
    },
    []
  );

  const logout = useCallback(async () => {
    setAuthError(null);
    await signOut(auth);
  }, []);

  const activeMembership =
    memberships.find((m) => m.businessId === activeBusinessId) || null;

  return (
    <AuthContext.Provider
      value={{
        authReady,
        user,
        userProfile,
        isEmailVerified,
        memberships,
        membershipsLoading,
        pendingInvites,
        activeBusinessId,
        activeMembership,
        authError,
        clearAuthError,
        selectBusiness,
        signInWithGoogle,
        signInWithEmail,
        signUpWithEmail,
        sendPasswordReset,
        resendVerificationEmail,
        reloadAuthUser,
        updateAccountName,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
}
