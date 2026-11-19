// Pinged by a Vercel cron every 2 days so the free Supabase project never sits idle
// long enough to pause (Supabase pauses free projects after about a week without activity).
export default async function handler(req, res) {
  const url = process.env.VITE_SUPABASE_URL
  const key = process.env.VITE_SUPABASE_ANON_KEY
  if (!url || !key) return res.status(500).json({ ok: false, error: 'Supabase env vars missing' })
  try {
    const r = await fetch(`${url}/rest/v1/subjects?select=id&limit=1`, {
      headers: { apikey: key, Authorization: `Bearer ${key}` },
    })
    return res.status(r.ok ? 200 : 502).json({ ok: r.ok, status: r.status, at: new Date().toISOString() })
  } catch (e) {
    return res.status(502).json({ ok: false, error: String(e?.message || e) })
  }
}
