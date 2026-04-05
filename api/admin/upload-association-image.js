const { requireAdmin, readJson, json, supabaseFetch } = require('./_auth');

function safeFilename(name) {
  const base = String(name || 'association-image').trim().toLowerCase();
  return base.replace(/[^a-z0-9._-]/g, '-').replace(/-+/g, '-');
}

module.exports = async function handler(req, res) {
  try {
    const ctx = await requireAdmin(req, res);
    if (!ctx) return;

    if (req.method !== 'POST') {
      json(res, 405, { error: 'Method not allowed' });
      return;
    }

    const { supabaseUrl, serviceKey } = ctx;
    const body = await readJson(req);
    const filename = safeFilename(body?.filename || 'association-image.png');
    const contentType = body?.contentType || 'application/octet-stream';
    const dataBase64 = body?.dataBase64;

    if (!dataBase64 || typeof dataBase64 !== 'string') {
      json(res, 400, { error: 'Missing file data' });
      return;
    }

    const ext = (filename.split('.').pop() || 'png').replace(/[^a-z0-9]/g, '') || 'png';
    const objectPath = `association/${Date.now()}-${Math.random().toString(16).slice(2)}.${ext}`;
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
    }, 'Association image upload');

    if (!uploadRes.ok) {
      const details = await uploadRes.text().catch(() => '');
      json(res, 400, { error: 'Association image upload failed', details: details || uploadRes.statusText });
      return;
    }

    const publicUrl = `${supabaseUrl.replace(/\/$/, '')}/storage/v1/object/public/flyers/${encodeURIComponent(objectPath)}`;
    json(res, 200, { url: publicUrl, path: objectPath });
  } catch (e) {
    console.error(e);
    json(res, 500, { error: e?.message || String(e) });
  }
};
