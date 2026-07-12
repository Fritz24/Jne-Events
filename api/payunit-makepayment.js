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

  // Mock mode bypass
  if (mode === "test" && body.transaction_id && body.transaction_id.endsWith("MOCK")) {
    return res.status(200).json({
      status: "SUCCESS",
      message: "Direct payment push simulated successfully (Mock Mode)",
      description: "payment successfully completed",
      data: {
        transaction_id: body.transaction_id,
        transaction_status: "SUCCESS"
      }
    });
  }

  console.log("PayUnit MakePayment Request:", {
    mode,
    gateway: body.gateway,
    amount: body.amount,
    transactionId: body.transaction_id,
    phonePrefix: body.phone_number ? body.phone_number.substring(0, 5) : "none",
    currency: body.currency
  });

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 25000); // 25 second timeout

    const upstream = await fetch(`${baseUrl}/api/gateway/makepayment`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": authHeader,
        "x-api-key": apiKey,
        "mode": mode,
        "Expect": "" // Suppress 100-continue header that causes 417
      },
      body: JSON.stringify(body),
      signal: controller.signal
    });

    clearTimeout(timeout);

    const text = await upstream.text();
    console.log("PayUnit MakePayment Response:", upstream.status, text.substring(0, 500));

    let data;
    try {
      data = text ? JSON.parse(text) : {};
    } catch {
      data = { message: text || "Invalid response from Payunit makepayment", status: "FAILED" };
    }

    return res.status(upstream.status).json(data);
  } catch (err) {
    console.error("Payunit makepayment error:", err.name, err.message, err.cause);
    return res.status(502).json({
      message: err.message || "Payunit proxy failed",
      status: "FAILED",
      errorType: err.name,
      cause: err.cause?.message || err.cause?.code || null
    });
  }
}
