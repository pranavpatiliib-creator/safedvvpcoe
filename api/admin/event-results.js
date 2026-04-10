const { requireAdmin, readJson, json, supabaseFetch } = require('./_auth');

function normalizeResult(body) {
  const winners = Array.isArray(body?.winners)
    ? body.winners
        .map((winner, index) => ({
          rank: Number(winner?.rank) || index + 1,
          response_id: winner?.response_id ? String(winner.response_id).trim() : null,
          name: winner?.name ? String(winner.name).trim() : '',
          image_url: winner?.image_url ? String(winner.image_url).trim() : ''
        }))
        .filter((winner) => winner.name || winner.image_url)
        .sort((a, b) => a.rank - b.rank)
        .slice(0, 3)
    : [];

  return {
    gallery_enabled: !!body?.gallery_enabled,
    gallery_images: Array.isArray(body?.gallery_images)
      ? body.gallery_images.map((item) => String(item || '').trim()).filter(Boolean)
      : [],
    winners
  };
}

module.exports = async function handler(req, res) {
  try {
    const ctx = await requireAdmin(req, res);
    if (!ctx) return;

    const { supabaseUrl, serviceKey } = ctx;

    if (req.method !== 'POST') {
      json(res, 405, { error: 'Method not allowed' });
      return;
    }

    const body = await readJson(req);
    const eventId = body?.event_id;
    if (!eventId) {
      json(res, 400, { error: 'Missing event_id' });
      return;
    }

    const payload = {
      event_id: eventId,
      ...normalizeResult(body)
    };

    const response = await supabaseFetch(
      `${supabaseUrl.replace(/\/$/, '')}/rest/v1/event_results?on_conflict=event_id&select=event_id,gallery_enabled,winners,gallery_images`,
      {
        method: 'POST',
        headers: {
          apikey: serviceKey,
          Authorization: `Bearer ${serviceKey}`,
          'Content-Type': 'application/json',
          Prefer: 'resolution=merge-duplicates,return=representation'
        },
        body: JSON.stringify(payload)
      },
      'Save event winners'
    );

    const data = await response.json().catch(() => null);
    if (!response.ok) {
      json(res, 400, { error: data?.message || data?.error || 'Failed to save event winners', details: data });
      return;
    }

    json(res, 200, { result: Array.isArray(data) ? data[0] : data });
  } catch (e) {
    console.error(e);
    json(res, 500, { error: e?.message || String(e) });
  }
};
