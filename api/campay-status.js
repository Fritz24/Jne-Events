export const config = {
  api: { bodyParser: true },
};

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  const token = process.env.CAMPAY_APP_TOKEN || process.env.VITE_CAMPAY_APP_TOKEN;
  if (!token) {
    return res.status(500).json({
      message: "Campay is not configured. Add CAMPAY_APP_TOKEN to your server environment.",
    });
  }

  const baseUrl = (
    process.env.CAMPAY_API_URL ||
    process.env.VITE_CAMPAY_API_URL ||
    "https://demo.campay.net/api"
  ).replace(/\/$/, "");

  const reference = req.query.reference;
  if (!reference) {
    return res.status(400).json({ message: "Missing reference parameter" });
  }

  try {
    const upstream = await fetch(`${baseUrl}/transaction/${reference}/`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Token ${token}`,
      },
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
    console.error("Campay status error:", err);
    return res.status(502).json({ message: err.message || "Campay proxy failed" });
  }
}
