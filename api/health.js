export default function handler(req, res) {
  res.status(200).json({
    ok: true,
    method: req.method,
    env_has_campay_token: !!process.env.CAMPAY_APP_TOKEN,
    env_has_vite_campay_token: !!process.env.VITE_CAMPAY_APP_TOKEN,
    node_version: process.version,
    timestamp: new Date().toISOString(),
  });
}
