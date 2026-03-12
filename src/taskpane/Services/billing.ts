export type BillingPlan = "trial" | "monthly" | "yearly" | "free_membership";

export interface BillingState {
  plan: BillingPlan;
  trialStartedAt: string;
  trialEndsAt: string;
  discountCode?: string;
  updatedAt: string;
}

const BILLING_STORAGE_PREFIX = "rubrix3saas.billing";
const TRIAL_DAYS = 30;

const buildStorageKey = (userId: string): string => `${BILLING_STORAGE_PREFIX}.${userId}`;

const addDays = (date: Date, days: number): Date => {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
};

const createDefaultTrialState = (): BillingState => {
  const now = new Date();
  return {
    plan: "trial",
    trialStartedAt: now.toISOString(),
    trialEndsAt: addDays(now, TRIAL_DAYS).toISOString(),
    updatedAt: now.toISOString(),
  };
};

export const loadBillingState = (userId: string): BillingState | null => {
  try {
    const raw = localStorage.getItem(buildStorageKey(userId));
    if (!raw) {
      return null;
    }

    return JSON.parse(raw) as BillingState;
  } catch (error) {
    console.error("Failed to parse billing state", error);
    return null;
  }
};

export const saveBillingState = (userId: string, state: BillingState): BillingState => {
  const normalized = {
    ...state,
    updatedAt: new Date().toISOString(),
  };

  localStorage.setItem(buildStorageKey(userId), JSON.stringify(normalized));
  return normalized;
};

export const ensureBillingStateForUser = (userId: string): BillingState => {
  const existing = loadBillingState(userId);
  if (existing) {
    return existing;
  }

  const trialState = createDefaultTrialState();
  return saveBillingState(userId, trialState);
};

export const getTrialDaysRemaining = (state: BillingState): number => {
  const end = new Date(state.trialEndsAt).getTime();
  const now = Date.now();
  const diff = end - now;
  if (diff <= 0) {
    return 0;
  }

  return Math.ceil(diff / (24 * 60 * 60 * 1000));
};

export const isTrialActive = (state: BillingState): boolean =>
  state.plan === "trial" && new Date(state.trialEndsAt).getTime() > Date.now();

const parseFreeCodes = (): string[] =>
  (process.env.FREE_MEMBERSHIP_CODES || "")
    .split(",")
    .map((code) => code.trim().toUpperCase())
    .filter(Boolean);

export const applyFreeMembershipCode = (
  userId: string,
  state: BillingState,
  code: string
): { ok: boolean; message: string; state?: BillingState } => {
  const normalizedCode = code.trim().toUpperCase();
  if (!normalizedCode) {
    return { ok: false, message: "Enter a discount or free membership code." };
  }

  const validCodes = parseFreeCodes();
  if (!validCodes.includes(normalizedCode)) {
    return { ok: false, message: "Code is invalid or not active." };
  }

  const nextState: BillingState = {
    ...state,
    plan: "free_membership",
    discountCode: normalizedCode,
    updatedAt: new Date().toISOString(),
  };

  return {
    ok: true,
    message: "Free membership code accepted.",
    state: saveBillingState(userId, nextState),
  };
};

const withPlanParams = (baseUrl: string, plan: "monthly" | "yearly", code?: string): string => {
  const url = new URL(baseUrl);
  url.searchParams.set("plan", plan);

  if (code) {
    url.searchParams.set("discount_code", code);
  }

  return url.toString();
};

export const startStripeCheckout = async (options: {
  plan: "monthly" | "yearly";
  code?: string;
  email?: string;
  userId?: string;
}): Promise<{ ok: boolean; message: string; checkoutUrl?: string }> => {
  const endpoint = process.env.STRIPE_CHECKOUT_ENDPOINT;

  if (endpoint) {
    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(options),
      });

      if (!response.ok) {
        return {
          ok: false,
          message: "Checkout endpoint returned an error.",
        };
      }

      const payload = await response.json();
      if (!payload?.url) {
        return {
          ok: false,
          message: "Checkout endpoint response is missing a redirect URL.",
        };
      }

      window.open(payload.url, "_blank", "noopener,noreferrer");
      return { ok: true, message: "Opened Stripe checkout.", checkoutUrl: payload.url };
    } catch (error) {
      console.error("Stripe checkout endpoint request failed", error);
      return { ok: false, message: "Unable to reach checkout endpoint." };
    }
  }

  const url =
    options.plan === "monthly"
      ? process.env.STRIPE_MONTHLY_CHECKOUT_URL
      : process.env.STRIPE_YEARLY_CHECKOUT_URL;

  if (!url) {
    return {
      ok: false,
      message:
        "Stripe checkout is not configured. Set STRIPE_CHECKOUT_ENDPOINT or plan-specific checkout URLs.",
    };
  }

  const checkoutUrl = withPlanParams(url, options.plan, options.code);
  window.open(checkoutUrl, "_blank", "noopener,noreferrer");

  return {
    ok: true,
    message: "Opened Stripe checkout.",
    checkoutUrl,
  };
};
