const { requireAdmin, readJson, json, supabaseFetch } = require('../../lib/admin-auth');

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

    if (req.method === 'PUT' || req.method === 'PATCH') {
      const url = new URL(req.url, 'http://localhost');
      const id = url.searchParams.get('id');
      if (!id) {
        json(res, 400, { error: 'Missing id' });
        return;
      }

      const body = await readJson(req);
      const payload = {};

      if (typeof body.question === 'string') payload.question = body.question;
      if (typeof body.type === 'string') payload.type = body.type;
      if (Object.prototype.hasOwnProperty.call(body, 'options')) payload.options = body.options;
      if (Object.prototype.hasOwnProperty.call(body, 'required')) payload.required = !!body.required;

      if (Object.keys(payload).length === 0) {
        json(res, 400, { error: 'No fields provided to update' });
        return;
      }

      const r = await supabaseFetch(`${supabaseUrl.replace(/\/$/, '')}/rest/v1/questions?id=eq.${encodeURIComponent(id)}`, {
        method: 'PATCH',
        headers: {
          apikey: serviceKey,
          Authorization: `Bearer ${serviceKey}`,
          'Content-Type': 'application/json',
          Prefer: 'return=representation'
        },
        body: JSON.stringify(payload)
      }, 'Update question');

      const data = await r.json().catch(() => null);
      if (!r.ok) {
        json(res, 400, { error: data?.message || 'Failed to update question', details: data });
        return;
      }

      json(res, 200, { ok: true, question: Array.isArray(data) ? data[0] : data });
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
