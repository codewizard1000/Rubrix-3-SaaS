const WINSTON_AI_URL = "https://api.gowinston.ai/v2/ai-content-detection";

const setCommonHeaders = (res) => {
  res.setHeader("Content-Type", "application/json");
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
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

module.exports = async (req, res) => {
  setCommonHeaders(res);

  if (req.method === "OPTIONS") {
    return res.status(204).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({ message: "Method not allowed. Use POST." });
  }

  const apiKey = process.env.WINSTON_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ message: "WINSTON_API_KEY is not configured on the server." });
  }

  const body = parseBody(req);
  const text = typeof body.text === "string" ? body.text.trim() : "";
  if (!text) {
    return res.status(400).json({ message: "Request body must include a non-empty text field." });
  }

  try {
    const upstreamResponse = await fetch(WINSTON_AI_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({ text }),
    });

    const contentType = upstreamResponse.headers.get("content-type") || "";
    const upstreamPayload = contentType.includes("application/json")
      ? await upstreamResponse.json()
      : { message: await upstreamResponse.text() };

    if (!upstreamResponse.ok) {
      const message =
        (typeof upstreamPayload?.message === "string" && upstreamPayload.message) ||
        (typeof upstreamPayload?.error === "string" && upstreamPayload.error) ||
        `Winston request failed with status ${upstreamResponse.status}.`;

      return res.status(upstreamResponse.status).json({
        message,
        details: upstreamPayload,
      });
    }

    return res.status(200).json(upstreamPayload);
  } catch (error) {
    return res.status(502).json({
      message: "Unable to reach Winston AI detection service.",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
};
