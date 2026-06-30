export default function handler(req, res) {
  res.status(200).json({
    ok: true,
    method: req.method,
    env_has_payunit_user: !!process.env.PAYUNIT_API_USER,
    env_has_payunit_password: !!process.env.PAYUNIT_API_PASSWORD,
    env_has_payunit_key: !!process.env.PAYUNIT_API_KEY,
    node_version: process.version,
    timestamp: new Date().toISOString(),
  });
}
