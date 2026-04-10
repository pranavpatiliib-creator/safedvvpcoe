const { json, normalizeEnvValue, readJson, supabaseFetch } = require('../lib/admin-auth');

function safeFilename(name) {
  const base = String(name || 'response-file').trim().toLowerCase();
  return base.replace(/[^a-z0-9._-]/g, '-').replace(/-+/g, '-');
}

async function uploadResponseFile({ supabaseUrl, serviceKey, file }) {
  const filename = safeFilename(file?.fileName || 'response-file.bin');
  const contentType = file?.contentType || 'application/octet-stream';
  const dataBase64 = file?.dataBase64;

  if (!dataBase64 || typeof dataBase64 !== 'string') {
    throw new Error('Missing file data');
  }

  const ext = (filename.split('.').pop() || 'bin').replace(/[^a-z0-9]/g, '') || 'bin';
  const objectPath = `responses/${Date.now()}-${Math.random().toString(16).slice(2)}.${ext}`;
  const objectUrl = `${supabaseUrl.replace(/\/$/, '')}/storage/v1/object/flyers/${encodeURIComponent(objectPath)}`;
  const fileBuffer = Buffer.from(dataBase64, 'base64');

  const uploadRes = await supabaseFetch(
    objectUrl,
    {
      method: 'POST',
      headers: {
        apikey: serviceKey,
        Authorization: `Bearer ${serviceKey}`,
        'Content-Type': contentType,
        'x-upsert': 'true'
      },
      body: fileBuffer
    },
    'Response file upload'
  );

  if (!uploadRes.ok) {
    const text = await uploadRes.text().catch(() => '');
    throw new Error(text || 'Response file upload failed');
  }

  return {
    url: `${supabaseUrl.replace(/\/$/, '')}/storage/v1/object/public/flyers/${encodeURIComponent(objectPath)}`,
    fileName: file?.fileName || filename,
    contentType,
    size: file?.size || 0
  };
}

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

    const normalizedAnswers = {};
    for (const [questionId, value] of Object.entries(answers)) {
      if (value && typeof value === 'object' && value.__fileUpload) {
        normalizedAnswers[questionId] = await uploadResponseFile({
          supabaseUrl,
          serviceKey,
          file: value
        });
      } else {
        normalizedAnswers[questionId] = value;
      }
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
          answers: normalizedAnswers
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
