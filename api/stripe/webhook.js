const crypto = require("crypto");

const setCommonHeaders = (res) => {
  res.setHeader("Content-Type", "application/json");
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization, Stripe-Signature");
};

const getRawBody = (req) => {
  if (typeof req.body === "string") {
    return req.body;
  }

  if (Buffer.isBuffer(req.body)) {
    return req.body.toString("utf8");
  }

  if (req.body && typeof req.body === "object") {
    return JSON.stringify(req.body);
  }

  return "";
};

const parseStripeSignatureHeader = (signatureHeader) => {
  const parts = String(signatureHeader || "")
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);

  const parsed = {
    timestamp: "",
    signatures: [],
  };

  parts.forEach((part) => {
    const [key, value] = part.split("=");
    if (!key || !value) {
      return;
    }

    if (key === "t") {
      parsed.timestamp = value;
    } else if (key === "v1") {
      parsed.signatures.push(value);
    }
  });

  return parsed;
};

const verifyStripeSignature = (rawBody, signatureHeader, webhookSecret) => {
  const parsed = parseStripeSignatureHeader(signatureHeader);
  if (!parsed.timestamp || parsed.signatures.length === 0) {
    return false;
  }

  const payload = `${parsed.timestamp}.${rawBody}`;
  const expected = crypto.createHmac("sha256", webhookSecret).update(payload, "utf8").digest("hex");
  const expectedBuffer = Buffer.from(expected);

  return parsed.signatures.some((signature) => {
    const incoming = Buffer.from(signature);
    return incoming.length === expectedBuffer.length && crypto.timingSafeEqual(incoming, expectedBuffer);
  });
};

const applyEventToSupabase = async (eventPayload) => {
  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    return {
      ok: false,
      message: "SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY is missing; skipped webhook persistence.",
    };
  }

  const response = await fetch(`${supabaseUrl}/rest/v1/rpc/billing_apply_stripe_event`, {
    method: "POST",
    headers: {
      apikey: serviceRoleKey,
      Authorization: `Bearer ${serviceRoleKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      event_payload: eventPayload,
    }),
  });

  if (!response.ok) {
    const details = await response.text().catch(() => "");
    return {
      ok: false,
      message: `Supabase RPC failed with status ${response.status}.`,
      details,
    };
  }

  return { ok: true };
};

module.exports = async (req, res) => {
  setCommonHeaders(res);

  if (req.method === "OPTIONS") {
    return res.status(204).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({ message: "Method not allowed. Use POST." });
  }

  const rawBody = getRawBody(req);
  if (!rawBody) {
    return res.status(400).json({ message: "Webhook payload is empty." });
  }

  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (webhookSecret) {
    const signatureHeader = req.headers["stripe-signature"];
    const valid = verifyStripeSignature(rawBody, signatureHeader, webhookSecret);
    if (!valid) {
      return res.status(400).json({ message: "Invalid Stripe webhook signature." });
    }
  }

  let eventPayload;
  try {
    eventPayload = JSON.parse(rawBody);
  } catch {
    return res.status(400).json({ message: "Webhook payload must be valid JSON." });
  }

  const supportedTypes = new Set([
    "checkout.session.completed",
    "customer.subscription.created",
    "customer.subscription.updated",
    "customer.subscription.deleted",
    "invoice.paid",
    "invoice.payment_failed",
  ]);

  if (!supportedTypes.has(String(eventPayload?.type || ""))) {
    return res.status(200).json({
      received: true,
      ignored: true,
      message: `Event type ${eventPayload?.type || "unknown"} is not handled.`,
    });
  }

  try {
    const persistence = await applyEventToSupabase(eventPayload);
    if (!persistence.ok) {
      return res.status(202).json({
        received: true,
        persisted: false,
        message: persistence.message,
        details: persistence.details,
      });
    }

    return res.status(200).json({
      received: true,
      persisted: true,
    });
  } catch (error) {
    return res.status(500).json({
      received: true,
      persisted: false,
      message: "Unexpected webhook handling error.",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
};

