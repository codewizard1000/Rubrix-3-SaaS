export type OAuthProvider = "google" | "azure";

export interface SupabaseUser {
  id: string;
  email?: string;
  user_metadata?: Record<string, unknown>;
}

export interface SupabaseSession {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  expires_at: number;
  token_type: string;
  user?: SupabaseUser;
}

const DEFAULT_SUPABASE_URL = "https://zlgrzxvwyilvcnzocrrk.supabase.co";
const DEFAULT_SUPABASE_PUBLISHABLE_KEY = "sb_publishable_-x3VIM-IJWU3VN-PE1hN9Q_rFZUeKMz";

const SESSION_STORAGE_KEY = "rubrix3saas.supabase.session";

export const getSupabaseUrl = (): string =>
  process.env.SUPABASE_URL || DEFAULT_SUPABASE_URL;

export const getSupabasePublishableKey = (): string =>
  process.env.SUPABASE_PUBLISHABLE_KEY || DEFAULT_SUPABASE_PUBLISHABLE_KEY;

const getAuthHeaders = (accessToken?: string): Record<string, string> => {
  const headers: Record<string, string> = {
    apikey: getSupabasePublishableKey(),
    "Content-Type": "application/json",
  };

  if (accessToken) {
    headers.Authorization = `Bearer ${accessToken}`;
  }

  return headers;
};

const normalizeSession = (raw: Partial<SupabaseSession>): SupabaseSession | null => {
  if (!raw.access_token || !raw.refresh_token) {
    return null;
  }

  const expiresIn = Number(raw.expires_in || 3600);
  const expiresAt = Number(raw.expires_at || Math.floor(Date.now() / 1000) + expiresIn);

  return {
    access_token: raw.access_token,
    refresh_token: raw.refresh_token,
    expires_in: expiresIn,
    expires_at: expiresAt,
    token_type: raw.token_type || "bearer",
    user: raw.user,
  };
};

export const getStoredSession = (): SupabaseSession | null => {
  try {
    const raw = localStorage.getItem(SESSION_STORAGE_KEY);
    if (!raw) {
      return null;
    }

    return normalizeSession(JSON.parse(raw));
  } catch (error) {
    console.error("Failed to read stored auth session", error);
    return null;
  }
};

export const storeSession = (session: SupabaseSession | null) => {
  if (!session) {
    localStorage.removeItem(SESSION_STORAGE_KEY);
    return;
  }

  localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session));
};

export const clearStoredSession = () => {
  localStorage.removeItem(SESSION_STORAGE_KEY);
};

export const getRedirectUrl = (): string => {
  if (process.env.SUPABASE_AUTH_REDIRECT_URL) {
    return process.env.SUPABASE_AUTH_REDIRECT_URL;
  }

  return `${window.location.origin}${window.location.pathname}`;
};

export const startOAuthLogin = (provider: OAuthProvider) => {
  const authUrl = new URL(`${getSupabaseUrl()}/auth/v1/authorize`);
  authUrl.searchParams.set("provider", provider);
  authUrl.searchParams.set("redirect_to", getRedirectUrl());

  window.location.assign(authUrl.toString());
};

export const sendMagicLinkEmail = async (email: string): Promise<{ error?: string }> => {
  try {
    const response = await fetch(`${getSupabaseUrl()}/auth/v1/otp`, {
      method: "POST",
      headers: getAuthHeaders(),
      body: JSON.stringify({
        email,
        create_user: true,
        options: {
          email_redirect_to: getRedirectUrl(),
        },
      }),
    });

    if (!response.ok) {
      const errorPayload = await response.json().catch(() => ({}));
      return { error: errorPayload?.msg || errorPayload?.error_description || "Unable to send magic link." };
    }

    return {};
  } catch (error) {
    console.error("Email auth request failed", error);
    return { error: "Network error while sending magic link." };
  }
};

export const fetchSupabaseUser = async (accessToken: string): Promise<SupabaseUser | null> => {
  try {
    const response = await fetch(`${getSupabaseUrl()}/auth/v1/user`, {
      method: "GET",
      headers: getAuthHeaders(accessToken),
    });

    if (!response.ok) {
      return null;
    }

    return (await response.json()) as SupabaseUser;
  } catch (error) {
    console.error("Failed to fetch Supabase user", error);
    return null;
  }
};

export const refreshSupabaseSession = async (refreshToken: string): Promise<SupabaseSession | null> => {
  try {
    const response = await fetch(`${getSupabaseUrl()}/auth/v1/token?grant_type=refresh_token`, {
      method: "POST",
      headers: getAuthHeaders(),
      body: JSON.stringify({ refresh_token: refreshToken }),
    });

    if (!response.ok) {
      return null;
    }

    const payload = await response.json();
    const normalized = normalizeSession(payload);
    if (!normalized) {
      return null;
    }

    if (!normalized.user) {
      normalized.user = await fetchSupabaseUser(normalized.access_token) || undefined;
    }

    return normalized;
  } catch (error) {
    console.error("Failed to refresh Supabase session", error);
    return null;
  }
};

export const signOutSupabase = async (accessToken: string) => {
  try {
    await fetch(`${getSupabaseUrl()}/auth/v1/logout`, {
      method: "POST",
      headers: getAuthHeaders(accessToken),
    });
  } catch (error) {
    console.error("Sign out request failed", error);
  }
};

const verifyOtpToken = async (tokenHash: string, type: string): Promise<SupabaseSession | null> => {
  try {
    const response = await fetch(`${getSupabaseUrl()}/auth/v1/verify`, {
      method: "POST",
      headers: getAuthHeaders(),
      body: JSON.stringify({
        token_hash: tokenHash,
        type,
      }),
    });

    if (!response.ok) {
      return null;
    }

    const payload = await response.json();
    const session = normalizeSession(payload);
    if (!session) {
      return null;
    }

    if (!session.user) {
      session.user = (await fetchSupabaseUser(session.access_token)) || undefined;
    }

    return session;
  } catch (error) {
    console.error("Failed to verify OTP token", error);
    return null;
  }
};

export const extractSessionFromUrlHash = async (): Promise<SupabaseSession | null> => {
  const searchParams = new URLSearchParams(window.location.search);
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type");

  // New Supabase magic-link format uses token_hash + type in query params.
  if (tokenHash && type) {
    const verifiedSession = await verifyOtpToken(tokenHash, type);
    const sanitizedUrl = window.location.pathname;
    window.history.replaceState({}, document.title, sanitizedUrl);
    if (verifiedSession) {
      return verifiedSession;
    }
  }

  const hash = window.location.hash;
  if (!hash || !hash.includes("access_token=")) {
    return null;
  }

  const params = new URLSearchParams(hash.replace(/^#/, ""));

  const session = normalizeSession({
    access_token: params.get("access_token") || "",
    refresh_token: params.get("refresh_token") || "",
    token_type: params.get("token_type") || "bearer",
    expires_in: Number(params.get("expires_in") || 3600),
    expires_at: Number(params.get("expires_at") || 0),
  });

  const sanitizedUrl = window.location.pathname;
  window.history.replaceState({}, document.title, sanitizedUrl);

  if (!session) {
    return null;
  }

  session.user = (await fetchSupabaseUser(session.access_token)) || undefined;
  return session;
};

export const isSessionExpiring = (session: SupabaseSession, leadSeconds = 120): boolean => {
  return session.expires_at <= Math.floor(Date.now() / 1000) + leadSeconds;
};
