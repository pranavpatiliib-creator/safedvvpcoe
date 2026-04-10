const { requireAdmin, readJson, json, supabaseFetch } = require('../../lib/admin-auth');

function normalizeEventResult(body) {
  const winners = Array.isArray(body?.winners)
    ? body.winners
        .map((winner, index) => ({
          rank: Number(winner?.rank) || index + 1,
          response_id: winner?.response_id ? String(winner.response_id).trim() : null,
          name: winner?.name ? String(winner.name).trim() : '',
          image_url: winner?.image_url ? String(winner.image_url).trim() : ''
        }))
        .filter((winner) => winner.name || winner.image_url || winner.response_id)
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

    const url = new URL(req.url, 'http://localhost');
    const action = url.searchParams.get('action') || '';

    if (req.method === 'GET' && action === 'results') {
      const eventId = url.searchParams.get('event_id');
      if (!eventId) {
        json(res, 400, { error: 'Missing event_id' });
        return;
      }

      const resultRes = await supabaseFetch(
        `${supabaseUrl.replace(/\/$/, '')}/rest/v1/event_results?select=event_id,gallery_enabled,winners,gallery_images&event_id=eq.${encodeURIComponent(eventId)}`,
        {
          headers: {
            apikey: serviceKey,
            Authorization: `Bearer ${serviceKey}`
          }
        },
        'Fetch event winners'
      );

      const resultData = await resultRes.json().catch(() => null);
      if (!resultRes.ok) {
        const details = resultData?.message || resultData?.error || '';
        const missingTable = /event_results|relation .* does not exist|Could not find the table/i.test(details);
        if (missingTable) {
          json(res, 200, { result: null });
          return;
        }
        json(res, 400, { error: details || 'Failed to fetch event winners', details: resultData });
        return;
      }

      json(res, 200, { result: Array.isArray(resultData) ? (resultData[0] || null) : resultData });
      return;
    }

    if (req.method === 'POST' && action === 'results') {
      const body = await readJson(req);
      const eventId = body?.event_id;
      if (!eventId) {
        json(res, 400, { error: 'Missing event_id' });
        return;
      }

      const payload = {
        event_id: eventId,
        ...normalizeEventResult(body)
      };

      const resultRes = await supabaseFetch(
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

      const resultData = await resultRes.json().catch(() => null);
      if (!resultRes.ok) {
        json(res, 400, { error: resultData?.message || resultData?.error || 'Failed to save event winners', details: resultData });
        return;
      }

      json(res, 200, { result: Array.isArray(resultData) ? resultData[0] : resultData });
      return;
    }

    if (req.method === 'POST') {
      const body = await readJson(req);
      const payload = {
        title: body.title,
        description: body.description || '',
        date: body.date,
        flyer_url: body.flyer_url || null
      };

      if (!payload.title || !payload.date) {
        json(res, 400, { error: 'Missing title or date' });
        return;
      }

      const r = await supabaseFetch(`${supabaseUrl.replace(/\/$/, '')}/rest/v1/events?select=id,title,description,date,flyer_url`, {
        method: 'POST',
        headers: {
          apikey: serviceKey,
          Authorization: `Bearer ${serviceKey}`,
          'Content-Type': 'application/json',
          Prefer: 'return=representation'
        },
        body: JSON.stringify(payload)
      }, 'Create event');

      const data = await r.json().catch(() => null);
      if (!r.ok) {
        json(res, 400, { error: data?.message || 'Failed to create event', details: data });
        return;
      }

      json(res, 200, { event: Array.isArray(data) ? data[0] : data });
      return;
    }

    if (req.method === 'DELETE') {
      const id = url.searchParams.get('id');
      if (!id) {
        json(res, 400, { error: 'Missing id' });
        return;
      }

      // Delete children first (no DB cascade assumed)
      const del = async (table, query) => {
        const r = await supabaseFetch(`${supabaseUrl.replace(/\/$/, '')}/rest/v1/${table}?${query}`, {
          method: 'DELETE',
          headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` }
        }, `Delete from ${table}`);
        if (!r.ok) {
          const t = await r.text().catch(() => '');
          throw new Error(`Failed to delete from ${table}: ${t || r.status}`);
        }
      };

      await del('responses', `event_id=eq.${encodeURIComponent(id)}`);
      await del('questions', `event_id=eq.${encodeURIComponent(id)}`);
      await del('events', `id=eq.${encodeURIComponent(id)}`);

      json(res, 200, { ok: true });
      return;
    }

    json(res, 405, { error: 'Method not allowed' });
  } catch (e) {
    console.error(e);
    json(res, 500, { error: e?.message || String(e) });
  }
};
