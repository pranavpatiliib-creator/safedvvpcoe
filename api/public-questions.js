const { json, normalizeEnvValue, supabaseFetch } = require('../lib/admin-auth');

module.exports = async function handler(req, res) {
  try {
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

    const supabaseUrl = normalizeEnvValue(process.env.SUPABASE_URL);
    const serviceKey = normalizeEnvValue(process.env.SUPABASE_SERVICE_ROLE_KEY);

    if (!supabaseUrl || !serviceKey) {
      json(res, 500, { error: 'Server misconfigured: missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY' });
      return;
    }

    const r = await supabaseFetch(
      `${supabaseUrl.replace(/\/$/, '')}/rest/v1/questions?select=*&event_id=eq.${encodeURIComponent(eventId)}&order=id.asc`,
      {
        headers: {
          apikey: serviceKey,
          Authorization: `Bearer ${serviceKey}`
        }
      },
      'Fetch public questions'
    );

    const data = await r.json().catch(() => null);
    if (!r.ok) {
      json(res, 400, { error: data?.message || 'Failed to fetch questions', details: data });
      return;
    }

    json(res, 200, { questions: data || [] });
  } catch (e) {
    console.error(e);
    json(res, 500, { error: e?.message || String(e) });
  }
};
