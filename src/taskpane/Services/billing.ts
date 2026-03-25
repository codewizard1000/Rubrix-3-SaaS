export type BillingInterval = "monthly" | "annual";

export type BillingStatus = "trialing" | "active" | "past_due" | "canceled";

export type BillingPlanId = "trial" | "basic" | "plus" | "plan_360" | "basic_hd" | "plus_hd" | "plan_360_hd";

export type PaidBillingPlanId = Exclude<BillingPlanId, "trial">;

export type FeatureCode = "comments" | "grade_paper" | "writing_assist" | "ai_detector" | "plagiarism";

export type TopUpType = "core" | "ai_detection" | "plagiarism";

export interface BillingPlanDefinition {
  id: PaidBillingPlanId;
  title: string;
  monthlyPrice: number;
  monthlyWordCapacity: number;
  includes: FeatureCode[];
}

interface TopUpBalance {
  purchasedWords: number;
  usedWords: number;
}

interface TopUpMap {
  core: TopUpBalance;
  ai_detection: TopUpBalance;
  plagiarism: TopUpBalance;
}

export interface BillingState {
  version: 2;
  planId: BillingPlanId;
  billingInterval: BillingInterval;
  status: BillingStatus;
  trialStartedAt: string;
  trialWordsUsed: number;
  cycleKey: string;
  cycleStartedAt: string;
  cycleEndsAt: string;
  cycleBaseWordsUsed: number;
  topUps: TopUpMap;
  updatedAt: string;
  stripeCustomerId?: string;
  stripeSubscriptionId?: string;
  discountCode?: string;
}

export interface AccessDecision {
  allowed: boolean;
  message?: string;
  wordsRequested: number;
  feature: FeatureCode;
  planId: BillingPlanId;
  wordsLeftThisMonth: number;
  trialWordsLeft: number;
  topUpType: TopUpType;
  topUpWordsLeft: number;
  featureIncluded: boolean;
}

export interface ConsumeUsageResult {
  ok: boolean;
  message?: string;
  decision: AccessDecision;
  state: BillingState;
  consumedWords: number;
  consumedFromBase: number;
  consumedFromTopUp: number;
}

export interface UsageSummary {
  planId: BillingPlanId;
  billingInterval: BillingInterval;
  status: BillingStatus;
  monthlyBaseCapacity: number;
  monthlyBaseWordsUsed: number;
  monthlyBaseWordsLeft: number;
  trialWordsLeft: number;
  topUpWordsLeft: Record<TopUpType, number>;
  cycleEndsAt: string;
}

export interface UsageLedgerEntry {
  id: string;
  feature: FeatureCode;
  topUpType: TopUpType;
  words: number;
  consumedFromBase: number;
  consumedFromTopUp: number;
  cycleKey: string;
  planId: BillingPlanId;
  createdAt: string;
  metadata?: Record<string, unknown>;
}

export interface StripeCheckoutRequest {
  kind: "subscription" | "topup";
  userId: string;
  email?: string;
  planId?: PaidBillingPlanId;
  billingInterval?: BillingInterval;
  topUpType?: TopUpType;
}

export interface StripeCheckoutResult {
  ok: boolean;
  message: string;
  checkoutUrl?: string;
}

export interface StripeWebhookSyncPayload {
  planId?: PaidBillingPlanId;
  billingInterval?: BillingInterval;
  status?: BillingStatus;
  stripeCustomerId?: string;
  stripeSubscriptionId?: string;
  topUpType?: TopUpType;
  topUpPacks?: number;
}

const BILLING_STORAGE_PREFIX = "rubrix3saas.billing.v2";
const BILLING_LEDGER_PREFIX = "rubrix3saas.billing.ledger.v2";
const TRIAL_WORD_LIMIT = 10_000;
const STANDARD_PLAN_WORD_LIMIT = 200_000;
const HEAVY_DUTY_PLAN_WORD_LIMIT = 2_000_000;
export const TOP_UP_WORD_PACK_SIZE = 50_000;

export const BILLING_PLANS: BillingPlanDefinition[] = [
  {
    id: "basic",
    title: "Basic",
    monthlyPrice: 13.99,
    monthlyWordCapacity: STANDARD_PLAN_WORD_LIMIT,
    includes: ["comments", "grade_paper", "writing_assist"],
  },
  {
    id: "plus",
    title: "Plus",
    monthlyPrice: 19.99,
    monthlyWordCapacity: STANDARD_PLAN_WORD_LIMIT,
    includes: ["comments", "grade_paper", "writing_assist", "ai_detector"],
  },
  {
    id: "plan_360",
    title: "360",
    monthlyPrice: 44.99,
    monthlyWordCapacity: STANDARD_PLAN_WORD_LIMIT,
    includes: ["comments", "grade_paper", "writing_assist", "ai_detector", "plagiarism"],
  },
  {
    id: "basic_hd",
    title: "Basic HD",
    monthlyPrice: 29.99,
    monthlyWordCapacity: HEAVY_DUTY_PLAN_WORD_LIMIT,
    includes: ["comments", "grade_paper", "writing_assist"],
  },
  {
    id: "plus_hd",
    title: "Plus HD",
    monthlyPrice: 59.99,
    monthlyWordCapacity: HEAVY_DUTY_PLAN_WORD_LIMIT,
    includes: ["comments", "grade_paper", "writing_assist", "ai_detector"],
  },
  {
    id: "plan_360_hd",
    title: "360 HD",
    monthlyPrice: 119.99,
    monthlyWordCapacity: HEAVY_DUTY_PLAN_WORD_LIMIT,
    includes: ["comments", "grade_paper", "writing_assist", "ai_detector", "plagiarism"],
  },
];

const FEATURE_LABELS: Record<FeatureCode, string> = {
  comments: "AI comments",
  grade_paper: "AI grade paper",
  writing_assist: "AI writing assist",
  ai_detector: "AI detector",
  plagiarism: "Plagiarism detector",
};

export const TOP_UP_LABELS: Record<TopUpType, string> = {
  core: "Grading/Writing top-up",
  ai_detection: "AI detection top-up",
  plagiarism: "Plagiarism top-up",
};

const FEATURE_TO_TOP_UP: Record<FeatureCode, TopUpType> = {
  comments: "core",
  grade_paper: "core",
  writing_assist: "core",
  ai_detector: "ai_detection",
  plagiarism: "plagiarism",
};

const PLAN_INDEX: Record<PaidBillingPlanId, BillingPlanDefinition> = BILLING_PLANS.reduce(
  (accumulator, plan) => {
    accumulator[plan.id] = plan;
    return accumulator;
  },
  {} as Record<PaidBillingPlanId, BillingPlanDefinition>
);

const toPositiveInt = (value: unknown): number => {
  const numeric = Number(value);
  if (!Number.isFinite(numeric) || numeric <= 0) {
    return 0;
  }

  return Math.floor(numeric);
};

const buildStorageKey = (userId: string): string => `${BILLING_STORAGE_PREFIX}.${userId}`;

const buildLedgerStorageKey = (userId: string): string => `${BILLING_LEDGER_PREFIX}.${userId}`;

const createBlankTopUps = (): TopUpMap => ({
  core: { purchasedWords: 0, usedWords: 0 },
  ai_detection: { purchasedWords: 0, usedWords: 0 },
  plagiarism: { purchasedWords: 0, usedWords: 0 },
});

const getCurrentCycle = (date = new Date()): { key: string; startsAt: string; endsAt: string } => {
  const year = date.getUTCFullYear();
  const month = date.getUTCMonth();
  const start = new Date(Date.UTC(year, month, 1, 0, 0, 0));
  const end = new Date(Date.UTC(year, month + 1, 1, 0, 0, 0));
  const key = `${year}-${String(month + 1).padStart(2, "0")}`;

  return {
    key,
    startsAt: start.toISOString(),
    endsAt: end.toISOString(),
  };
};

const createDefaultState = (): BillingState => {
  const nowIso = new Date().toISOString();
  const cycle = getCurrentCycle();

  return {
    version: 2,
    planId: "trial",
    billingInterval: "monthly",
    status: "trialing",
    trialStartedAt: nowIso,
    trialWordsUsed: 0,
    cycleKey: cycle.key,
    cycleStartedAt: cycle.startsAt,
    cycleEndsAt: cycle.endsAt,
    cycleBaseWordsUsed: 0,
    topUps: createBlankTopUps(),
    updatedAt: nowIso,
  };
};

const normalizeState = (raw: Partial<BillingState>): BillingState => {
  const fallback = createDefaultState();
  const nowIso = new Date().toISOString();

  const planId = (() => {
    if (raw.planId === "trial") {
      return "trial" as BillingPlanId;
    }

    if (raw.planId && raw.planId in PLAN_INDEX) {
      return raw.planId as BillingPlanId;
    }

    return fallback.planId;
  })();

  const billingInterval: BillingInterval = raw.billingInterval === "annual" ? "annual" : "monthly";

  const status: BillingStatus =
    raw.status === "active" || raw.status === "past_due" || raw.status === "canceled" || raw.status === "trialing"
      ? raw.status
      : fallback.status;

  return {
    version: 2,
    planId,
    billingInterval,
    status,
    trialStartedAt:
      typeof raw.trialStartedAt === "string" && raw.trialStartedAt.trim().length > 0
        ? raw.trialStartedAt
        : fallback.trialStartedAt,
    trialWordsUsed: toPositiveInt(raw.trialWordsUsed),
    cycleKey: typeof raw.cycleKey === "string" && raw.cycleKey.trim().length > 0 ? raw.cycleKey : fallback.cycleKey,
    cycleStartedAt:
      typeof raw.cycleStartedAt === "string" && raw.cycleStartedAt.trim().length > 0
        ? raw.cycleStartedAt
        : fallback.cycleStartedAt,
    cycleEndsAt:
      typeof raw.cycleEndsAt === "string" && raw.cycleEndsAt.trim().length > 0
        ? raw.cycleEndsAt
        : fallback.cycleEndsAt,
    cycleBaseWordsUsed: toPositiveInt(raw.cycleBaseWordsUsed),
    topUps: {
      core: {
        purchasedWords: toPositiveInt(raw.topUps?.core?.purchasedWords),
        usedWords: toPositiveInt(raw.topUps?.core?.usedWords),
      },
      ai_detection: {
        purchasedWords: toPositiveInt(raw.topUps?.ai_detection?.purchasedWords),
        usedWords: toPositiveInt(raw.topUps?.ai_detection?.usedWords),
      },
      plagiarism: {
        purchasedWords: toPositiveInt(raw.topUps?.plagiarism?.purchasedWords),
        usedWords: toPositiveInt(raw.topUps?.plagiarism?.usedWords),
      },
    },
    updatedAt: typeof raw.updatedAt === "string" && raw.updatedAt.trim().length > 0 ? raw.updatedAt : nowIso,
    stripeCustomerId: typeof raw.stripeCustomerId === "string" ? raw.stripeCustomerId : undefined,
    stripeSubscriptionId: typeof raw.stripeSubscriptionId === "string" ? raw.stripeSubscriptionId : undefined,
    discountCode: typeof raw.discountCode === "string" ? raw.discountCode : undefined,
  };
};

const reconcileCycle = (state: BillingState): BillingState => {
  const current = getCurrentCycle();
  if (state.cycleKey === current.key) {
    return state;
  }

  return {
    ...state,
    cycleKey: current.key,
    cycleStartedAt: current.startsAt,
    cycleEndsAt: current.endsAt,
    cycleBaseWordsUsed: 0,
    topUps: createBlankTopUps(),
    updatedAt: new Date().toISOString(),
  };
};

const persistState = (userId: string, state: BillingState): BillingState => {
  const normalized = {
    ...state,
    updatedAt: new Date().toISOString(),
  };

  localStorage.setItem(buildStorageKey(userId), JSON.stringify(normalized));
  return normalized;
};

const getPlanForState = (state: BillingState): BillingPlanDefinition | null => {
  if (state.planId === "trial") {
    return null;
  }

  return PLAN_INDEX[state.planId];
};

const getTopUpWordsLeft = (state: BillingState, topUpType: TopUpType): number => {
  const topUp = state.topUps[topUpType];
  return Math.max(0, topUp.purchasedWords - topUp.usedWords);
};

const getMonthlyBaseCapacity = (state: BillingState): number => {
  if (state.planId === "trial") {
    return TRIAL_WORD_LIMIT;
  }

  return getPlanForState(state)?.monthlyWordCapacity || STANDARD_PLAN_WORD_LIMIT;
};

const appendUsageLedger = (userId: string, entry: UsageLedgerEntry) => {
  try {
    const raw = localStorage.getItem(buildLedgerStorageKey(userId));
    const parsed = raw ? (JSON.parse(raw) as UsageLedgerEntry[]) : [];
    const ledger = Array.isArray(parsed) ? parsed : [];
    const next = [entry, ...ledger].slice(0, 250);
    localStorage.setItem(buildLedgerStorageKey(userId), JSON.stringify(next));
  } catch (error) {
    console.error("Unable to persist usage ledger", error);
  }
};

const createUpgradeMessage = (feature: FeatureCode): string => {
  const label = FEATURE_LABELS[feature];
  if (feature === "ai_detector") {
    return `${label} requires Plus, 360, Plus HD, or 360 HD. You can also use an AI detection top-up.`;
  }

  if (feature === "plagiarism") {
    return `${label} requires 360 or 360 HD. You can also use a plagiarism top-up.`;
  }

  return `${label} requires an active subscription.`;
};

export const loadBillingState = (userId: string): BillingState | null => {
  try {
    const raw = localStorage.getItem(buildStorageKey(userId));
    if (!raw) {
      return null;
    }

    const parsed = JSON.parse(raw);
    return reconcileCycle(normalizeState(parsed));
  } catch (error) {
    console.error("Failed to parse billing state", error);
    return null;
  }
};

export const saveBillingState = (userId: string, state: BillingState): BillingState => {
  return persistState(userId, reconcileCycle(normalizeState(state)));
};

export const ensureBillingStateForUser = (userId: string): BillingState => {
  const existing = loadBillingState(userId);
  if (!existing) {
    return persistState(userId, createDefaultState());
  }

  return persistState(userId, existing);
};

export const getBillingPlan = (planId: PaidBillingPlanId): BillingPlanDefinition => PLAN_INDEX[planId];

export const getAnnualPrice = (monthlyPrice: number): number => {
  return Number((monthlyPrice * 12 * 0.8).toFixed(2));
};

export const estimateWords = (text: string): number => {
  const trimmed = text.trim();
  if (!trimmed) {
    return 0;
  }

  return trimmed.split(/\s+/).length;
};

export const getTrialWordsRemaining = (state: BillingState): number => {
  return Math.max(0, TRIAL_WORD_LIMIT - state.trialWordsUsed);
};

export const getWordsLeftThisMonth = (state: BillingState): number => {
  if (state.planId === "trial") {
    return getTrialWordsRemaining(state);
  }

  return Math.max(0, getMonthlyBaseCapacity(state) - state.cycleBaseWordsUsed);
};

export const getUsageSummary = (userId: string): UsageSummary => {
  const state = ensureBillingStateForUser(userId);
  const monthlyBaseCapacity = getMonthlyBaseCapacity(state);
  const monthlyBaseWordsLeft = getWordsLeftThisMonth(state);

  return {
    planId: state.planId,
    billingInterval: state.billingInterval,
    status: state.status,
    monthlyBaseCapacity,
    monthlyBaseWordsUsed: state.planId === "trial" ? state.trialWordsUsed : state.cycleBaseWordsUsed,
    monthlyBaseWordsLeft,
    trialWordsLeft: getTrialWordsRemaining(state),
    topUpWordsLeft: {
      core: getTopUpWordsLeft(state, "core"),
      ai_detection: getTopUpWordsLeft(state, "ai_detection"),
      plagiarism: getTopUpWordsLeft(state, "plagiarism"),
    },
    cycleEndsAt: state.cycleEndsAt,
  };
};

export const getUsageLedger = (userId: string): UsageLedgerEntry[] => {
  try {
    const raw = localStorage.getItem(buildLedgerStorageKey(userId));
    if (!raw) {
      return [];
    }

    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed as UsageLedgerEntry[];
  } catch (error) {
    console.error("Failed to parse usage ledger", error);
    return [];
  }
};

export const checkUsageAccess = (userId: string, feature: FeatureCode, wordsRequested: number): AccessDecision => {
  const state = ensureBillingStateForUser(userId);
  const requestedWords = Math.max(1, toPositiveInt(wordsRequested));
  const topUpType = FEATURE_TO_TOP_UP[feature];
  const topUpWordsLeft = getTopUpWordsLeft(state, topUpType);
  const wordsLeftThisMonth = getWordsLeftThisMonth(state);
  const trialWordsLeft = getTrialWordsRemaining(state);

  if (state.planId === "trial") {
    if (trialWordsLeft <= 0) {
      return {
        allowed: false,
        message: "Your 10,000-word trial limit is exhausted. Choose a subscription plan to continue.",
        wordsRequested: requestedWords,
        feature,
        planId: state.planId,
        wordsLeftThisMonth,
        trialWordsLeft,
        topUpType,
        topUpWordsLeft,
        featureIncluded: true,
      };
    }

    if (requestedWords > trialWordsLeft) {
      return {
        allowed: false,
        message: `This action needs ${requestedWords.toLocaleString()} words, but only ${trialWordsLeft.toLocaleString()} trial words remain.`,
        wordsRequested: requestedWords,
        feature,
        planId: state.planId,
        wordsLeftThisMonth,
        trialWordsLeft,
        topUpType,
        topUpWordsLeft,
        featureIncluded: true,
      };
    }

    return {
      allowed: true,
      wordsRequested: requestedWords,
      feature,
      planId: state.planId,
      wordsLeftThisMonth,
      trialWordsLeft,
      topUpType,
      topUpWordsLeft,
      featureIncluded: true,
    };
  }

  const plan = getPlanForState(state);
  const featureIncluded = Boolean(plan?.includes.includes(feature));

  if (!featureIncluded && topUpWordsLeft <= 0) {
    return {
      allowed: false,
      message: createUpgradeMessage(feature),
      wordsRequested: requestedWords,
      feature,
      planId: state.planId,
      wordsLeftThisMonth,
      trialWordsLeft,
      topUpType,
      topUpWordsLeft,
      featureIncluded,
    };
  }

  if (!featureIncluded && topUpWordsLeft < requestedWords) {
    return {
      allowed: false,
      message: `${TOP_UP_LABELS[topUpType]} required. Need ${requestedWords.toLocaleString()} words but only ${topUpWordsLeft.toLocaleString()} available.`,
      wordsRequested: requestedWords,
      feature,
      planId: state.planId,
      wordsLeftThisMonth,
      trialWordsLeft,
      topUpType,
      topUpWordsLeft,
      featureIncluded,
    };
  }

  const wordsCoveredByBase = Math.min(wordsLeftThisMonth, requestedWords);
  const remainingAfterBase = requestedWords - wordsCoveredByBase;

  if (remainingAfterBase > 0 && topUpWordsLeft < remainingAfterBase) {
    return {
      allowed: false,
      message: `${TOP_UP_LABELS[topUpType]} required. Need ${remainingAfterBase.toLocaleString()} extra words but only ${topUpWordsLeft.toLocaleString()} available.`,
      wordsRequested: requestedWords,
      feature,
      planId: state.planId,
      wordsLeftThisMonth,
      trialWordsLeft,
      topUpType,
      topUpWordsLeft,
      featureIncluded,
    };
  }

  return {
    allowed: true,
    wordsRequested: requestedWords,
    feature,
    planId: state.planId,
    wordsLeftThisMonth,
    trialWordsLeft,
    topUpType,
    topUpWordsLeft,
    featureIncluded,
  };
};

export const consumeUsage = (
  userId: string,
  feature: FeatureCode,
  wordsRequested: number,
  metadata?: Record<string, unknown>
): ConsumeUsageResult => {
  const decision = checkUsageAccess(userId, feature, wordsRequested);
  const state = ensureBillingStateForUser(userId);

  if (!decision.allowed) {
    return {
      ok: false,
      message: decision.message,
      decision,
      state,
      consumedWords: 0,
      consumedFromBase: 0,
      consumedFromTopUp: 0,
    };
  }

  const requestedWords = decision.wordsRequested;
  let consumedFromBase = 0;
  let consumedFromTopUp = 0;

  if (state.planId === "trial") {
    state.trialWordsUsed += requestedWords;
    consumedFromBase = requestedWords;
  } else {
    if (!decision.featureIncluded) {
      consumedFromTopUp = requestedWords;
      const topUpType = FEATURE_TO_TOP_UP[feature];
      state.topUps[topUpType].usedWords += consumedFromTopUp;
    } else {
      const baseWordsLeft = getWordsLeftThisMonth(state);
      consumedFromBase = Math.min(baseWordsLeft, requestedWords);
      consumedFromTopUp = requestedWords - consumedFromBase;

      state.cycleBaseWordsUsed += consumedFromBase;

      if (consumedFromTopUp > 0) {
        const topUpType = FEATURE_TO_TOP_UP[feature];
        state.topUps[topUpType].usedWords += consumedFromTopUp;
      }
    }
  }

  const saved = saveBillingState(userId, state);

  appendUsageLedger(userId, {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`,
    feature,
    topUpType: FEATURE_TO_TOP_UP[feature],
    words: requestedWords,
    consumedFromBase,
    consumedFromTopUp,
    cycleKey: saved.cycleKey,
    planId: saved.planId,
    createdAt: new Date().toISOString(),
    metadata,
  });

  return {
    ok: true,
    decision,
    state: saved,
    consumedWords: requestedWords,
    consumedFromBase,
    consumedFromTopUp,
  };
};

export const applyTopUpPack = (userId: string, topUpType: TopUpType, packs = 1): BillingState => {
  const state = ensureBillingStateForUser(userId);
  const safePacks = Math.max(1, toPositiveInt(packs));
  state.topUps[topUpType].purchasedWords += safePacks * TOP_UP_WORD_PACK_SIZE;
  return saveBillingState(userId, state);
};

export const setSubscriptionPlanForUser = (
  userId: string,
  planId: PaidBillingPlanId,
  billingInterval: BillingInterval,
  status: BillingStatus = "active"
): BillingState => {
  const state = ensureBillingStateForUser(userId);
  state.planId = planId;
  state.billingInterval = billingInterval;
  state.status = status;
  return saveBillingState(userId, state);
};

export const syncBillingStateFromStripeWebhook = (userId: string, payload: StripeWebhookSyncPayload): BillingState => {
  const state = ensureBillingStateForUser(userId);

  if (payload.planId) {
    state.planId = payload.planId;
  }

  if (payload.billingInterval) {
    state.billingInterval = payload.billingInterval;
  }

  if (payload.status) {
    state.status = payload.status;
  }

  if (payload.stripeCustomerId) {
    state.stripeCustomerId = payload.stripeCustomerId;
  }

  if (payload.stripeSubscriptionId) {
    state.stripeSubscriptionId = payload.stripeSubscriptionId;
  }

  if (payload.topUpType) {
    const packs = Math.max(1, toPositiveInt(payload.topUpPacks || 1));
    state.topUps[payload.topUpType].purchasedWords += packs * TOP_UP_WORD_PACK_SIZE;
  }

  return saveBillingState(userId, state);
};

const withPlanParams = (
  baseUrl: string,
  planId: PaidBillingPlanId,
  billingInterval: BillingInterval,
  code?: string
): string => {
  const url = new URL(baseUrl);
  url.searchParams.set("plan_id", planId);
  url.searchParams.set("billing_interval", billingInterval);

  if (code) {
    url.searchParams.set("discount_code", code);
  }

  return url.toString();
};

const openCheckoutUrl = (url: string) => {
  window.open(url, "_blank", "noopener,noreferrer");
};

const getDirectCheckoutUrl = (request: StripeCheckoutRequest, discountCode?: string): string | null => {
  const env = process.env as Record<string, string | undefined>;

  if (request.kind === "subscription") {
    if (!request.planId || !request.billingInterval) {
      return null;
    }

    const envKey =
      request.billingInterval === "annual"
        ? `STRIPE_${request.planId.toUpperCase()}_ANNUAL_CHECKOUT_URL`
        : `STRIPE_${request.planId.toUpperCase()}_MONTHLY_CHECKOUT_URL`;

    const baseUrl = env[envKey];
    if (!baseUrl) {
      return null;
    }

    return withPlanParams(baseUrl, request.planId, request.billingInterval, discountCode);
  }

  const topUpKey = request.topUpType ? request.topUpType.toUpperCase() : "";
  const envKey = `STRIPE_TOPUP_${topUpKey}_CHECKOUT_URL`;
  return env[envKey] || null;
};

export const startStripeCheckout = async (
  request: StripeCheckoutRequest,
  discountCode?: string
): Promise<StripeCheckoutResult> => {
  const checkoutEndpoint = process.env.STRIPE_CHECKOUT_ENDPOINT || "/api/stripe/checkout";
  const baseUrl = `${window.location.origin}${window.location.pathname}`;

  try {
    const response = await fetch(checkoutEndpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        ...request,
        discountCode,
        successUrl: `${baseUrl}?checkout=success`,
        cancelUrl: `${baseUrl}?checkout=cancel`,
      }),
    });

    if (response.ok) {
      const payload = await response.json();
      if (payload?.url && typeof payload.url === "string") {
        openCheckoutUrl(payload.url);
        return {
          ok: true,
          message: "Opened Stripe checkout.",
          checkoutUrl: payload.url,
        };
      }

      return {
        ok: false,
        message: "Checkout endpoint response is missing URL.",
      };
    }

    const errorPayload = await response.json().catch(() => ({}));
    const message =
      (typeof errorPayload?.message === "string" && errorPayload.message) ||
      `Checkout request failed with status ${response.status}.`;

    return {
      ok: false,
      message,
    };
  } catch (error) {
    console.error("Stripe checkout endpoint request failed", error);

    const directUrl = getDirectCheckoutUrl(request, discountCode);
    if (directUrl) {
      openCheckoutUrl(directUrl);
      return {
        ok: true,
        message: "Opened Stripe checkout URL fallback.",
        checkoutUrl: directUrl,
      };
    }

    return {
      ok: false,
      message: "Unable to start Stripe checkout. Configure STRIPE_CHECKOUT_ENDPOINT or checkout URLs.",
    };
  }
};

export const formatPrice = (price: number): string => {
  return `$${price.toFixed(2)}`;
};

export const formatPlanName = (planId: BillingPlanId): string => {
  if (planId === "trial") {
    return "Trial";
  }

  return PLAN_INDEX[planId].title;
};

export const isFeatureIncluded = (state: BillingState, feature: FeatureCode): boolean => {
  if (state.planId === "trial") {
    return true;
  }

  const plan = getPlanForState(state);
  return Boolean(plan?.includes.includes(feature));
};

export const getFeatureLabel = (feature: FeatureCode): string => FEATURE_LABELS[feature];

export const getFeatureTopUpType = (feature: FeatureCode): TopUpType => FEATURE_TO_TOP_UP[feature];
