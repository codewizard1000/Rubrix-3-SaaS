import React from "react";
import {
  SupabaseSession,
  SupabaseUser,
  clearStoredSession,
  extractSessionFromUrlHash,
  fetchSupabaseUser,
  getStoredSession,
  isEmailAuthEnabled,
  isOAuthProviderEnabled,
  isSessionExpiring,
  refreshSupabaseSession,
  sendMagicLinkEmail,
  signOutSupabase,
  startOAuthLogin,
  storeSession,
} from "../Services/supabaseAuth";
import { ensureBillingStateForUser } from "../Services/billing";

interface AuthContextValue {
  session: SupabaseSession | null;
  user: SupabaseUser | null;
  loading: boolean;
  error: string | null;
  authProviderEnabled: {
    email: boolean;
    google: boolean;
    microsoft: boolean;
    facebook: boolean;
  };
  signInWithGoogle: () => void;
  signInWithMicrosoft: () => void;
  signInWithFacebook: () => void;
  sendMagicLink: (email: string) => Promise<{ error?: string }>;
  signOut: () => Promise<void>;
  clearError: () => void;
}

const AuthContext = React.createContext<AuthContextValue | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [session, setSession] = React.useState<SupabaseSession | null>(null);
  const [user, setUser] = React.useState<SupabaseUser | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const authProviderEnabled = React.useMemo(
    () => ({
      email: isEmailAuthEnabled(),
      google: isOAuthProviderEnabled("google"),
      microsoft: isOAuthProviderEnabled("azure"),
      facebook: isOAuthProviderEnabled("facebook"),
    }),
    []
  );

  const applySession = React.useCallback((nextSession: SupabaseSession | null) => {
    if (!nextSession) {
      clearStoredSession();
      setSession(null);
      setUser(null);
      return;
    }

    storeSession(nextSession);
    setSession(nextSession);
    setUser(nextSession.user || null);

    if (nextSession.user?.id) {
      ensureBillingStateForUser(nextSession.user.id);
    }
  }, []);

  const hydrateSession = React.useCallback(async () => {
    setLoading(true);

    const hashSession = await extractSessionFromUrlHash();
    if (hashSession) {
      applySession(hashSession);
      setLoading(false);
      return;
    }

    const storedSession = getStoredSession();
    if (!storedSession) {
      applySession(null);
      setLoading(false);
      return;
    }

    let workingSession = storedSession;

    if (isSessionExpiring(storedSession)) {
      const refreshedSession = await refreshSupabaseSession(storedSession.refresh_token);
      if (!refreshedSession) {
        applySession(null);
        setLoading(false);
        return;
      }

      workingSession = refreshedSession;
    }

    if (!workingSession.user) {
      workingSession.user = (await fetchSupabaseUser(workingSession.access_token)) || undefined;
    }

    applySession(workingSession);
    setLoading(false);
  }, [applySession]);

  React.useEffect(() => {
    hydrateSession();
  }, [hydrateSession]);

  React.useEffect(() => {
    if (!session) {
      return undefined;
    }

    const timer = window.setInterval(async () => {
      if (!session || !isSessionExpiring(session)) {
        return;
      }

      const refreshedSession = await refreshSupabaseSession(session.refresh_token);
      if (!refreshedSession) {
        applySession(null);
        return;
      }

      applySession(refreshedSession);
    }, 60_000);

    return () => window.clearInterval(timer);
  }, [session, applySession]);

  const signInWithGoogle = () => {
    setError(null);
    const result = startOAuthLogin("google");
    if (!result.ok) {
      setError(result.error || "Google sign-in is unavailable.");
    }
  };

  const signInWithMicrosoft = () => {
    setError(null);
    const result = startOAuthLogin("azure");
    if (!result.ok) {
      setError(result.error || "Microsoft sign-in is unavailable.");
    }
  };

  const signInWithFacebook = () => {
    setError(null);
    const result = startOAuthLogin("facebook");
    if (!result.ok) {
      setError(result.error || "Facebook sign-in is unavailable.");
    }
  };

  const sendMagicLink = async (email: string) => {
    setError(null);
    const result = await sendMagicLinkEmail(email);
    if (result.error) {
      setError(result.error);
      return { error: result.error };
    }

    return {};
  };

  const signOut = async () => {
    if (session?.access_token) {
      await signOutSupabase(session.access_token);
    }

    applySession(null);
  };

  const clearError = () => {
    setError(null);
  };

  const value: AuthContextValue = {
    session,
    user,
    loading,
    error,
    authProviderEnabled,
    signInWithGoogle,
    signInWithMicrosoft,
    signInWithFacebook,
    sendMagicLink,
    signOut,
    clearError,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = (): AuthContextValue => {
  const context = React.useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used inside AuthProvider");
  }

  return context;
};
