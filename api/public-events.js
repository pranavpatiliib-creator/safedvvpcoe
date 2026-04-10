const { json, normalizeEnvValue, supabaseFetch } = require('../lib/admin-auth');

module.exports = async function handler(req, res) {
  try {
    if (req.method !== 'GET') {
      json(res, 405, { error: 'Method not allowed' });
      return;
    }

    const supabaseUrl = normalizeEnvValue(process.env.SUPABASE_URL);
    const serviceKey = normalizeEnvValue(process.env.SUPABASE_SERVICE_ROLE_KEY);

    if (!supabaseUrl || !serviceKey) {
      json(res, 500, { error: 'Server misconfigured: missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY' });
      return;
    }

    const url = new URL(req.url, 'http://localhost');
    const includeResults = url.searchParams.get('include_results') === '1';

    const r = await supabaseFetch(
      `${supabaseUrl.replace(/\/$/, '')}/rest/v1/events?select=id,title,description,date,flyer_url&order=date.desc`,
      {
        headers: {
          apikey: serviceKey,
          Authorization: `Bearer ${serviceKey}`
        }
      },
      'Fetch public events'
    );

    const data = await r.json().catch(() => null);
    if (!r.ok) {
      json(res, 400, { error: data?.message || 'Failed to fetch events', details: data });
      return;
    }

    const events = data || [];

    if (!includeResults) {
      json(res, 200, { events });
      return;
    }

    const resultsRes = await supabaseFetch(
      `${supabaseUrl.replace(/\/$/, '')}/rest/v1/event_results?select=event_id,gallery_enabled,winners,gallery_images`,
      {
        headers: {
          apikey: serviceKey,
          Authorization: `Bearer ${serviceKey}`
        }
      },
      'Fetch public event results'
    );

    const resultData = await resultsRes.json().catch(() => null);
    if (!resultsRes.ok) {
      const details = resultData?.message || resultData?.error || '';
      const missingTable = /event_results|relation .* does not exist|Could not find the table/i.test(details);
      if (missingTable) {
        json(res, 200, { events, results: [] });
        return;
      }

      json(res, 400, { error: details || 'Failed to fetch event results', details: resultData });
      return;
    }

    const results = Array.isArray(resultData) ? resultData.map((row) => ({
      event_id: row.event_id,
      gallery_enabled: !!row.gallery_enabled,
      gallery_images: Array.isArray(row.gallery_images) ? row.gallery_images.map((item) => String(item || '')).filter(Boolean) : [],
      winners: Array.isArray(row.winners)
        ? row.winners.map((winner, index) => ({
            rank: Number(winner?.rank) || index + 1,
            response_id: winner?.response_id ? String(winner.response_id) : null,
            name: winner?.name ? String(winner.name) : '',
            image_url: winner?.image_url ? String(winner.image_url) : ''
          })).sort((a, b) => a.rank - b.rank)
        : []
    })) : [];

    json(res, 200, { events, results });
  } catch (e) {
    console.error(e);
    json(res, 500, { error: e?.message || String(e) });
  }
};
