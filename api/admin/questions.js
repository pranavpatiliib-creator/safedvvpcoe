const { requireAdmin, readJson, json, supabaseFetch } = require('./_auth');

module.exports = async function handler(req, res) {
  try {
    const ctx = await requireAdmin(req, res);
    if (!ctx) return;

    const { supabaseUrl, serviceKey } = ctx;

    if (req.method === 'POST') {
      const body = await readJson(req);
      const items = Array.isArray(body.questions) ? body.questions : [];

      if (items.length === 0) {
        json(res, 400, { error: 'No questions provided' });
        return;
      }

      const r = await supabaseFetch(`${supabaseUrl.replace(/\/$/, '')}/rest/v1/questions`, {
        method: 'POST',
        headers: {
          apikey: serviceKey,
          Authorization: `Bearer ${serviceKey}`,
          'Content-Type': 'application/json',
          Prefer: 'return=minimal'
        },
        body: JSON.stringify(items)
      }, 'Create questions');

      if (!r.ok) {
        const data = await r.json().catch(() => null);
        json(res, 400, { error: data?.message || 'Failed to create questions', details: data });
        return;
      }

      json(res, 200, { ok: true });
      return;
    }

    if (req.method === 'DELETE') {
      const url = new URL(req.url, 'http://localhost');
      const id = url.searchParams.get('id');
      if (!id) {
        json(res, 400, { error: 'Missing id' });
        return;
      }

      const r = await supabaseFetch(`${supabaseUrl.replace(/\/$/, '')}/rest/v1/questions?id=eq.${encodeURIComponent(id)}`, {
        method: 'DELETE',
        headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` }
      }, 'Delete question');

      if (!r.ok) {
        const t = await r.text().catch(() => '');
        json(res, 400, { error: t || 'Failed to delete question' });
        return;
      }

      json(res, 200, { ok: true });
      return;
    }

    json(res, 405, { error: 'Method not allowed' });
  } catch (e) {
    console.error(e);
    json(res, 500, { error: e?.message || String(e) });
  }
};
