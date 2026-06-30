export const config = {
  api: { bodyParser: true },
};

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  const { transactionId } = req.query;
  if (!transactionId) {
    return res.status(400).json({ message: "Missing transactionId parameter" });
  }

  const cleanEnvVar = (val) => {
    if (!val) return '';
    return val.replace(/^["']|["']$/g, '').trim();
  };

  const apiUser = cleanEnvVar(process.env.PAYUNIT_API_USER);
  const apiPassword = cleanEnvVar(process.env.PAYUNIT_API_PASSWORD);
  const apiKey = cleanEnvVar(process.env.PAYUNIT_API_KEY);
  const mode = cleanEnvVar(process.env.PAYUNIT_MODE || "sandbox");

  if (!apiUser || !apiPassword || !apiKey) {
    return res.status(500).json({
      message: "Payunit credentials are not fully configured in environment variables.",
    });
  }

  const baseUrl = cleanEnvVar(process.env.PAYUNIT_API_URL || "https://gateway.payunit.net").replace(/\/$/, "");
  const authHeader = `Basic ${Buffer.from(`${apiUser}:${apiPassword}`).toString("base64")}`;

  try {
    const upstream = await fetch(`${baseUrl}/api/gateway/paymentstatus/${transactionId}`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        "Authorization": authHeader,
        "x-api-key": apiKey,
        "mode": mode
      }
    });

    const text = await upstream.text();
    let data;
    try {
      data = text ? JSON.parse(text) : {};
    } catch {
      data = { message: text || "Invalid response from Payunit paymentstatus", status: "FAILED" };
    }

    return res.status(upstream.status).json(data);
  } catch (err) {
    console.error("Payunit paymentstatus error:", err);
    return res.status(502).json({ message: err.message || "Payunit proxy failed", status: "FAILED" });
  }
}
