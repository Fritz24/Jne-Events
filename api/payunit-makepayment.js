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
    });
  }

  const baseUrl = cleanEnvVar(process.env.PAYUNIT_API_URL || "https://gateway.payunit.net").replace(/\/$/, "");
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

  if (mode === "test" && body.transaction_id && body.transaction_id.endsWith("-MOCK")) {
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

  try {
    const upstream = await fetch(`${baseUrl}/api/gateway/makepayment`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": authHeader,
        "x-api-key": apiKey,
        "mode": mode
      },
      body: JSON.stringify(body),
    });

    const text = await upstream.text();
    let data;
    try {
      data = text ? JSON.parse(text) : {};
    } catch {
      data = { message: text || "Invalid response from Payunit makepayment", status: "FAILED" };
    }

    return res.status(upstream.status).json(data);
  } catch (err) {
    console.error("Payunit makepayment error:", err);
    return res.status(502).json({ message: err.message || "Payunit proxy failed", status: "FAILED" });
  }
}
