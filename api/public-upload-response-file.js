const { json, normalizeEnvValue, readJson, supabaseFetch } = require('./admin/_auth');

function safeFilename(name) {
  const base = String(name || 'response-file').trim().toLowerCase();
  return base.replace(/[^a-z0-9._-]/g, '-').replace(/-+/g, '-');
}

module.exports = async function handler(req, res) {
  try {
    if (req.method !== 'POST') {
      json(res, 405, { error: 'Method not allowed' });
      return;
    }

    const body = await readJson(req);
    const filename = safeFilename(body?.filename || 'response-file.bin');
    const contentType = body?.contentType || 'application/octet-stream';
    const dataBase64 = body?.dataBase64;

    if (!dataBase64 || typeof dataBase64 !== 'string') {
      json(res, 400, { error: 'Missing file data' });
      return;
    }

    const supabaseUrl = normalizeEnvValue(process.env.SUPABASE_URL);
    const serviceKey = normalizeEnvValue(process.env.SUPABASE_SERVICE_ROLE_KEY);

    if (!supabaseUrl || !serviceKey) {
      json(res, 500, { error: 'Server misconfigured: missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY' });
      return;
    }

    const ext = (filename.split('.').pop() || 'bin').replace(/[^a-z0-9]/g, '') || 'bin';
    const objectPath = `responses/${Date.now()}-${Math.random().toString(16).slice(2)}.${ext}`;
    const objectUrl = `${supabaseUrl.replace(/\/$/, '')}/storage/v1/object/flyers/${encodeURIComponent(objectPath)}`;
    const fileBuffer = Buffer.from(dataBase64, 'base64');

    const uploadRes = await supabaseFetch(objectUrl, {
      method: 'POST',
      headers: {
        apikey: serviceKey,
        Authorization: `Bearer ${serviceKey}`,
        'Content-Type': contentType,
        'x-upsert': 'true'
      },
      body: fileBuffer
    }, 'Response file upload');

    if (!uploadRes.ok) {
      const text = await uploadRes.text().catch(() => '');
      json(res, 400, { error: 'Response file upload failed', details: text || uploadRes.statusText });
      return;
    }

    const publicUrl = `${supabaseUrl.replace(/\/$/, '')}/storage/v1/object/public/flyers/${encodeURIComponent(objectPath)}`;
    json(res, 200, { url: publicUrl, path: objectPath });
  } catch (e) {
    console.error(e);
    json(res, 500, { error: e?.message || String(e) });
  }
};
