const { json, normalizeEnvValue, readJson, supabaseFetch } = require('./admin/_auth');

module.exports = async function handler(req, res) {
  try {
    if (req.method !== 'POST') {
      json(res, 405, { error: 'Method not allowed' });
      return;
    }

    const body = await readJson(req);
    const eventId = body?.event_id;
    const answers = body?.answers;

    if (!eventId) {
      json(res, 400, { error: 'Missing event_id' });
      return;
    }

    if (!answers || typeof answers !== 'object' || Array.isArray(answers)) {
      json(res, 400, { error: 'Missing answers payload' });
      return;
    }

    const supabaseUrl = normalizeEnvValue(process.env.SUPABASE_URL);
    const serviceKey = normalizeEnvValue(process.env.SUPABASE_SERVICE_ROLE_KEY);

    if (!supabaseUrl || !serviceKey) {
      json(res, 500, { error: 'Server misconfigured: missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY' });
      return;
    }

    const r = await supabaseFetch(
      `${supabaseUrl.replace(/\/$/, '')}/rest/v1/responses`,
      {
        method: 'POST',
        headers: {
          apikey: serviceKey,
          Authorization: `Bearer ${serviceKey}`,
          'Content-Type': 'application/json',
          Prefer: 'return=representation'
        },
        body: JSON.stringify({
          event_id: eventId,
          answers
        })
      },
      'Submit response'
    );

    const data = await r.json().catch(() => null);
    if (!r.ok) {
      json(res, 400, { error: data?.message || 'Failed to submit response', details: data });
      return;
    }

    json(res, 200, { ok: true, response: Array.isArray(data) ? data[0] : data });
  } catch (e) {
    console.error(e);
    json(res, 500, { error: e?.message || String(e) });
  }
};
