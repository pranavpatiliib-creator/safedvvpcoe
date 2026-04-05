const { json, normalizeEnvValue, supabaseFetch } = require('./admin/_auth');

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

    const query = 'select=id,name,role,image_url,display_order&order=display_order.asc.nullslast,name.asc';
    const response = await supabaseFetch(
      `${supabaseUrl.replace(/\/$/, '')}/rest/v1/association_members?${query}`,
      {
        headers: {
          apikey: serviceKey,
          Authorization: `Bearer ${serviceKey}`
        }
      },
      'Fetch association members'
    );

    const data = await response.json().catch(() => null);
    if (!response.ok) {
      json(res, 400, { error: data?.message || 'Failed to fetch association members', details: data });
      return;
    }

    json(res, 200, { members: data || [] });
  } catch (e) {
    console.error(e);
    json(res, 500, { error: e?.message || String(e) });
  }
};
