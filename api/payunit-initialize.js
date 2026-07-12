export const config = {
  api: { bodyParser: true },
};

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  const cleanEnvVar = (val) => {
    if (!val) return '';
    return val.replace(/^["']|["']$/g, '').trim();
  };

  const apiUser = cleanEnvVar(process.env.PAYUNIT_API_USER);
  const apiPassword = cleanEnvVar(process.env.PAYUNIT_API_PASSWORD);
  const apiKey = cleanEnvVar(process.env.PAYUNIT_API_KEY);
  const rawMode = cleanEnvVar(process.env.PAYUNIT_MODE || "test");
  const mode = rawMode === "sandbox" ? "test" : rawMode;

  if (!apiUser || !apiPassword || !apiKey) {
    return res.status(500).json({
      message: "Payunit credentials are not fully configured in environment variables.",
      debug: { hasUser: !!apiUser, hasPassword: !!apiPassword, hasKey: !!apiKey }
    });
  }

  const baseUrl = "https://gateway.payunit.net"; // hardcoded to avoid any env var issue
  const authHeader = `Basic ${Buffer.from(`${apiUser}:${apiPassword}`).toString("base64")}`;

  // Read raw body safely
  let body;
  if (typeof req.body === "string") {
    try {
      body = JSON.parse(req.body);
    } catch {
      body = req.body;
    }
  } else {
    body = req.body || {};
  }

  console.log("PayUnit Initialize Request:", {
    url: `${baseUrl}/api/gateway/initialize`,
    mode,
    body: JSON.stringify(body),
    apiKeyPrefix: apiKey.substring(0, 8),
    authHeaderLength: authHeader.length
  });

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 25000); // 25 second timeout

    const upstream = await fetch(`${baseUrl}/api/gateway/initialize`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": authHeader,
        "x-api-key": apiKey,
        "mode": mode
      },
      body: JSON.stringify(body),
      signal: controller.signal
    });

    clearTimeout(timeout);

    const text = await upstream.text();
    console.log("PayUnit Initialize Response:", upstream.status, text.substring(0, 500));

    let data;
    try {
      data = text ? JSON.parse(text) : {};
    } catch {
      data = { message: text || "Invalid response from Payunit", status: "FAILED" };
    }

    return res.status(upstream.status).json(data);
  } catch (err) {
    console.error("Payunit initialization error:", err.name, err.message, err.cause);
    return res.status(502).json({
      message: err.message || "Payunit proxy failed",
      status: "FAILED",
      errorType: err.name,
      cause: err.cause?.message || err.cause?.code || null
    });
  }
}
