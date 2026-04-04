const { requireAdmin, readJson, json } = require('./_auth');

module.exports = async function handler(req, res) {
  try {
    const ctx = await requireAdmin(req, res);
    if (!ctx) return;

    const { supabaseUrl, serviceKey } = ctx;

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

      const r = await fetch(`${supabaseUrl}/rest/v1/events?select=id,title,description,date,flyer_url`, {
        method: 'POST',
        headers: {
          apikey: serviceKey,
          Authorization: `Bearer ${serviceKey}`,
          'Content-Type': 'application/json',
          Prefer: 'return=representation'
        },
        body: JSON.stringify(payload)
      });

      const data = await r.json().catch(() => null);
      if (!r.ok) {
        json(res, 400, { error: data?.message || 'Failed to create event', details: data });
        return;
      }

      json(res, 200, { event: Array.isArray(data) ? data[0] : data });
      return;
    }

    if (req.method === 'DELETE') {
      const url = new URL(req.url, 'http://localhost');
      const id = url.searchParams.get('id');
      if (!id) {
        json(res, 400, { error: 'Missing id' });
        return;
      }

      // Delete children first (no DB cascade assumed)
      const del = async (table, query) => {
        const r = await fetch(`${supabaseUrl}/rest/v1/${table}?${query}`, {
          method: 'DELETE',
          headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` }
        });
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

