const { requireAdmin, json, supabaseFetch } = require('../../lib/admin-auth');

module.exports = async function handler(req, res) {
  try {
    const ctx = await requireAdmin(req, res);
    if (!ctx) return;

    const { supabaseUrl, serviceKey } = ctx;

    if (req.method !== 'GET') {
      json(res, 405, { error: 'Method not allowed' });
      return;
    }

    const url = new URL(req.url, 'http://localhost');
    const eventId = url.searchParams.get('event_id');
    if (!eventId) {
      json(res, 400, { error: 'Missing event_id' });
      return;
    }

    const r = await supabaseFetch(
      `${supabaseUrl.replace(/\/$/, '')}/rest/v1/responses?select=*&event_id=eq.${encodeURIComponent(eventId)}&order=created_at.desc`,
      { headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` } }
    , 'Fetch responses');

    const data = await r.json().catch(() => null);
    if (!r.ok) {
      json(res, 400, { error: data?.message || 'Failed to fetch responses', details: data });
      return;
    }

    json(res, 200, { responses: data || [] });
  } catch (e) {
    console.error(e);
    json(res, 500, { error: e?.message || String(e) });
  }
};
