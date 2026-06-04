export const config = {
  api: { bodyParser: true },
};

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  const token = process.env.CAMPAY_APP_TOKEN || process.env.VITE_CAMPAY_APP_TOKEN;
  if (!token) {
    return res.status(500).json({
      message: "Campay is not configured. Add CAMPAY_APP_TOKEN to your Vercel environment variables.",
    });
  }

  const baseUrl = (
    process.env.CAMPAY_API_URL ||
    process.env.VITE_CAMPAY_API_URL ||
    "https://demo.campay.net/api"
  ).replace(/\/$/, "");

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

  try {
    const upstream = await fetch(`${baseUrl}/collect/`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Token ${token}`,
      },
      body: JSON.stringify(body),
    });

    const text = await upstream.text();
    let data;
    try {
      data = text ? JSON.parse(text) : {};
    } catch {
      data = { message: text || "Invalid response from Campay" };
    }

    return res.status(upstream.status).json(data);
  } catch (err) {
    console.error("Campay collect error:", err);
    return res.status(502).json({ message: err.message || "Campay proxy failed" });
  }
}
