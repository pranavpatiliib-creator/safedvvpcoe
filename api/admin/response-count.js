const { requireAdmin, json, supabaseFetch } = require('./_auth');

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
      `${supabaseUrl.replace(/\/$/, '')}/rest/v1/responses?event_id=eq.${encodeURIComponent(eventId)}&select=id`,
      {
        headers: {
          apikey: serviceKey,
          Authorization: `Bearer ${serviceKey}`,
          Prefer: 'count=exact,head=true'
        }
      }
    , 'Fetch response count');

    if (!r.ok) {
      const t = await r.text().catch(() => '');
      json(res, 400, { error: t || 'Failed to fetch count' });
      return;
    }

    const countHeader = r.headers.get('content-range') || '';
    const total = Number(countHeader.split('/')[1] || 0);
    json(res, 200, { count: Number.isFinite(total) ? total : 0 });
  } catch (e) {
    console.error(e);
    json(res, 500, { error: e?.message || String(e) });
  }
};
