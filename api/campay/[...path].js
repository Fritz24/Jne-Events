/**
 * Server-side proxy for Campay API (avoids browser CORS and keeps the token secret).
 * Set CAMPAY_APP_TOKEN in Vercel project env (not exposed to the browser).
 */
export default async function handler(req, res) {
  if (req.method !== "GET" && req.method !== "POST") {
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

  const segments = Array.isArray(req.query.path)
    ? req.query.path
    : req.query.path
      ? [req.query.path]
      : [];

  if (!segments.length) {
    return res.status(400).json({ message: "Missing Campay API path" });
  }

  const campayUrl = `${baseUrl}/${segments.join("/")}/`;

  try {
    const headers = {
      "Content-Type": "application/json",
      Authorization: `Token ${token}`,
    };

    const fetchOptions = { method: req.method, headers };

    if (req.method === "POST" && req.body) {
      fetchOptions.body = JSON.stringify(req.body);
    }

    const upstream = await fetch(campayUrl, fetchOptions);
    const text = await upstream.text();
    let data;
    try {
      data = text ? JSON.parse(text) : {};
    } catch {
      data = { message: text || "Invalid response from Campay" };
    }

    return res.status(upstream.status).json(data);
  } catch (err) {
    console.error("Campay proxy error:", err);
    return res.status(502).json({ message: err.message || "Campay proxy failed" });
  }
}
