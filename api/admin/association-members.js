const { requireAdmin, readJson, json, supabaseFetch } = require('./_auth');

function sanitizePayload(body = {}) {
  return {
    name: String(body.name || '').trim(),
    role: String(body.role || '').trim(),
    image_url: body.image_url ? String(body.image_url).trim() : null,
    display_order: body.display_order === '' || body.display_order == null
      ? null
      : Number(body.display_order)
  };
}

module.exports = async function handler(req, res) {
  try {
    const ctx = await requireAdmin(req, res);
    if (!ctx) return;

    const { supabaseUrl, serviceKey } = ctx;
    const baseUrl = `${supabaseUrl.replace(/\/$/, '')}/rest/v1/association_members`;

    if (req.method === 'GET') {
      const query = 'select=id,name,role,image_url,display_order&order=display_order.asc.nullslast,name.asc';
      const response = await supabaseFetch(`${baseUrl}?${query}`, {
        headers: {
          apikey: serviceKey,
          Authorization: `Bearer ${serviceKey}`
        }
      }, 'Fetch admin association members');

      const data = await response.json().catch(() => null);
      if (!response.ok) {
        json(res, 400, { error: data?.message || 'Failed to fetch association members', details: data });
        return;
      }

      json(res, 200, { members: data || [] });
      return;
    }

    if (req.method === 'POST') {
      const payload = sanitizePayload(await readJson(req));
      if (!payload.name || !payload.role) {
        json(res, 400, { error: 'Missing name or role' });
        return;
      }

      const response = await supabaseFetch(`${baseUrl}?select=id,name,role,image_url,display_order`, {
        method: 'POST',
        headers: {
          apikey: serviceKey,
          Authorization: `Bearer ${serviceKey}`,
          'Content-Type': 'application/json',
          Prefer: 'return=representation'
        },
        body: JSON.stringify(payload)
      }, 'Create association member');

      const data = await response.json().catch(() => null);
      if (!response.ok) {
        json(res, 400, { error: data?.message || 'Failed to create association member', details: data });
        return;
      }

      json(res, 200, { member: Array.isArray(data) ? data[0] : data });
      return;
    }

    if (req.method === 'PUT') {
      const url = new URL(req.url, 'http://localhost');
      const id = url.searchParams.get('id');
      if (!id) {
        json(res, 400, { error: 'Missing id' });
        return;
      }

      const payload = sanitizePayload(await readJson(req));
      if (!payload.name || !payload.role) {
        json(res, 400, { error: 'Missing name or role' });
        return;
      }

      const response = await supabaseFetch(`${baseUrl}?id=eq.${encodeURIComponent(id)}&select=id,name,role,image_url,display_order`, {
        method: 'PATCH',
        headers: {
          apikey: serviceKey,
          Authorization: `Bearer ${serviceKey}`,
          'Content-Type': 'application/json',
          Prefer: 'return=representation'
        },
        body: JSON.stringify(payload)
      }, 'Update association member');

      const data = await response.json().catch(() => null);
      if (!response.ok) {
        json(res, 400, { error: data?.message || 'Failed to update association member', details: data });
        return;
      }

      json(res, 200, { member: Array.isArray(data) ? data[0] : data });
      return;
    }

    if (req.method === 'DELETE') {
      const url = new URL(req.url, 'http://localhost');
      const id = url.searchParams.get('id');
      if (!id) {
        json(res, 400, { error: 'Missing id' });
        return;
      }

      const response = await supabaseFetch(`${baseUrl}?id=eq.${encodeURIComponent(id)}`, {
        method: 'DELETE',
        headers: {
          apikey: serviceKey,
          Authorization: `Bearer ${serviceKey}`
        }
      }, 'Delete association member');

      if (!response.ok) {
        const details = await response.text().catch(() => '');
        json(res, 400, { error: 'Failed to delete association member', details });
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
