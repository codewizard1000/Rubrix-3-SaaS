const STRIPE_CHECKOUT_URL = "https://api.stripe.com/v1/checkout/sessions";

const SUBSCRIPTION_PRICE_ENV = {
  basic: {
    monthly: "STRIPE_PRICE_BASIC_MONTHLY",
    annual: "STRIPE_PRICE_BASIC_ANNUAL",
  },
  plus: {
    monthly: "STRIPE_PRICE_PLUS_MONTHLY",
    annual: "STRIPE_PRICE_PLUS_ANNUAL",
  },
  plan_360: {
    monthly: "STRIPE_PRICE_360_MONTHLY",
    annual: "STRIPE_PRICE_360_ANNUAL",
  },
  basic_hd: {
    monthly: "STRIPE_PRICE_BASIC_HD_MONTHLY",
    annual: "STRIPE_PRICE_BASIC_HD_ANNUAL",
  },
  plus_hd: {
    monthly: "STRIPE_PRICE_PLUS_HD_MONTHLY",
    annual: "STRIPE_PRICE_PLUS_HD_ANNUAL",
  },
  plan_360_hd: {
    monthly: "STRIPE_PRICE_360_HD_MONTHLY",
    annual: "STRIPE_PRICE_360_HD_ANNUAL",
  },
};

const TOPUP_PRICE_ENV = {
  core: "STRIPE_PRICE_TOPUP_CORE",
  ai_detection: "STRIPE_PRICE_TOPUP_AI_DETECTION",
  plagiarism: "STRIPE_PRICE_TOPUP_PLAGIARISM",
};

const setCommonHeaders = (res) => {
  res.setHeader("Content-Type", "application/json");
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization, Stripe-Signature");
};

const parseBody = (req) => {
  if (req.body && typeof req.body === "object") {
    return req.body;
  }

  if (typeof req.body === "string" && req.body.trim().length > 0) {
    try {
      return JSON.parse(req.body);
    } catch {
      return {};
    }
  }

  return {};
};

const getSubscriptionPriceId = (planId, interval) => {
  const planEntry = SUBSCRIPTION_PRICE_ENV[planId];
  if (!planEntry) {
    return null;
  }

  const envName = planEntry[interval];
  if (!envName) {
    return null;
  }

  return process.env[envName] || null;
};

const getTopUpPriceId = (topUpType) => {
  const envName = TOPUP_PRICE_ENV[topUpType];
  if (!envName) {
    return null;
  }

  return process.env[envName] || null;
};

const appendMetadata = (formData, metadata) => {
  Object.entries(metadata).forEach(([key, value]) => {
    if (typeof value !== "string" || value.trim().length === 0) {
      return;
    }

    formData.set(`metadata[${key}]`, value);
  });
};

module.exports = async (req, res) => {
  setCommonHeaders(res);

  if (req.method === "OPTIONS") {
    return res.status(204).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({ message: "Method not allowed. Use POST." });
  }

  const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
  if (!stripeSecretKey) {
    return res.status(500).json({ message: "STRIPE_SECRET_KEY is not configured on the server." });
  }

  const payload = parseBody(req);
  const kind = typeof payload.kind === "string" ? payload.kind : "";
  const userId = typeof payload.userId === "string" ? payload.userId.trim() : "";
  const email = typeof payload.email === "string" ? payload.email.trim() : "";
  const discountCode = typeof payload.discountCode === "string" ? payload.discountCode.trim() : "";
  const successUrl =
    typeof payload.successUrl === "string" && payload.successUrl.trim().length > 0
      ? payload.successUrl
      : process.env.STRIPE_CHECKOUT_SUCCESS_URL || "https://rubrix-3-saas.vercel.app/taskpane.html?checkout=success";
  const cancelUrl =
    typeof payload.cancelUrl === "string" && payload.cancelUrl.trim().length > 0
      ? payload.cancelUrl
      : process.env.STRIPE_CHECKOUT_CANCEL_URL || "https://rubrix-3-saas.vercel.app/taskpane.html?checkout=cancel";

  if (!userId) {
    return res.status(400).json({ message: "userId is required." });
  }

  let mode = "payment";
  let priceId = null;
  const metadata = {
    kind,
    user_id: userId,
    email,
    plan_id: "",
    billing_interval: "",
    topup_type: "",
    discount_code: discountCode,
  };

  if (kind === "subscription") {
    mode = "subscription";
    const planId = typeof payload.planId === "string" ? payload.planId : "";
    const billingInterval = payload.billingInterval === "annual" ? "annual" : "monthly";
    priceId = getSubscriptionPriceId(planId, billingInterval);
    metadata.plan_id = planId;
    metadata.billing_interval = billingInterval;

    if (!priceId) {
      return res.status(400).json({
        message: `Missing Stripe price mapping for ${planId} (${billingInterval}). Configure STRIPE_PRICE_* env vars.`,
      });
    }
  } else if (kind === "topup") {
    const topUpType = typeof payload.topUpType === "string" ? payload.topUpType : "";
    priceId = getTopUpPriceId(topUpType);
    metadata.topup_type = topUpType;

    if (!priceId) {
      return res.status(400).json({
        message: `Missing Stripe top-up price mapping for ${topUpType}. Configure STRIPE_PRICE_TOPUP_* env vars.`,
      });
    }
  } else {
    return res.status(400).json({
      message: "Invalid checkout kind. Use 'subscription' or 'topup'.",
    });
  }

  const formData = new URLSearchParams();
  formData.set("mode", mode);
  formData.set("line_items[0][price]", priceId);
  formData.set("line_items[0][quantity]", "1");
  formData.set("success_url", successUrl);
  formData.set("cancel_url", cancelUrl);

  if (email) {
    formData.set("customer_email", email);
  }

  appendMetadata(formData, metadata);

  try {
    const stripeResponse = await fetch(STRIPE_CHECKOUT_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${stripeSecretKey}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: formData.toString(),
    });

    const contentType = stripeResponse.headers.get("content-type") || "";
    const stripePayload = contentType.includes("application/json")
      ? await stripeResponse.json()
      : { message: await stripeResponse.text() };

    if (!stripeResponse.ok) {
      return res.status(stripeResponse.status).json({
        message:
          (typeof stripePayload?.error?.message === "string" && stripePayload.error.message) ||
          (typeof stripePayload?.message === "string" && stripePayload.message) ||
          "Unable to create Stripe checkout session.",
        details: stripePayload,
      });
    }

    return res.status(200).json({
      id: stripePayload.id,
      url: stripePayload.url,
    });
  } catch (error) {
    return res.status(502).json({
      message: "Unable to reach Stripe checkout service.",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
};

