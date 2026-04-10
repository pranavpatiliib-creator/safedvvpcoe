const { json, normalizeEnvValue, supabaseFetch } = require('./admin/_auth');

function normalizeResult(row) {
  if (!row) return null;
  return {
    event_id: row.event_id,
    gallery_enabled: !!row.gallery_enabled,
    gallery_images: Array.isArray(row.gallery_images)
      ? row.gallery_images.map((item) => String(item || '')).filter(Boolean)
      : [],
    winners: Array.isArray(row.winners)
      ? row.winners
          .map((winner, index) => ({
            rank: Number(winner?.rank) || index + 1,
            response_id: winner?.response_id ? String(winner.response_id) : null,
            name: winner?.name ? String(winner.name) : '',
            image_url: winner?.image_url ? String(winner.image_url) : ''
          }))
          .sort((a, b) => a.rank - b.rank)
      : []
  };
}

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
    const eventId = url.searchParams.get('event_id');
    const query = eventId
      ? `select=event_id,gallery_enabled,winners,gallery_images&event_id=eq.${encodeURIComponent(eventId)}`
      : 'select=event_id,gallery_enabled,winners,gallery_images';

    const response = await supabaseFetch(
      `${supabaseUrl.replace(/\/$/, '')}/rest/v1/event_results?${query}`,
      {
        headers: {
          apikey: serviceKey,
          Authorization: `Bearer ${serviceKey}`
        }
      },
      'Fetch public event results'
    );

    const data = await response.json().catch(() => null);
    if (!response.ok) {
      const details = data?.message || data?.error || '';
      const missingTable = /event_results|relation .* does not exist|Could not find the table/i.test(details);
      if (missingTable) {
        json(res, 200, eventId ? { result: null } : { results: [] });
        return;
      }

      json(res, 400, { error: details || 'Failed to fetch event results', details: data });
      return;
    }

    const rows = Array.isArray(data) ? data : [];
    if (eventId) {
      json(res, 200, { result: normalizeResult(rows[0] || null) });
      return;
    }

    json(res, 200, { results: rows.map(normalizeResult).filter(Boolean) });
  } catch (e) {
    console.error(e);
    json(res, 500, { error: e?.message || String(e) });
  }
};
