const { requireAdmin, readJson, json, supabaseFetch } = require('./_auth');

function safeFilename(name) {
  const base = String(name || 'event-image').trim().toLowerCase();
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
    const eventId = body?.event_id;
    const filename = safeFilename(body?.filename || 'event-image.jpg');
    const contentType = body?.contentType || 'image/jpeg';
    const dataBase64 = body?.dataBase64;

    if (!eventId) {
      json(res, 400, { error: 'Missing event_id' });
      return;
    }

    if (!dataBase64 || typeof dataBase64 !== 'string') {
      json(res, 400, { error: 'Missing file data' });
      return;
    }

    const ext = (filename.split('.').pop() || 'jpg').replace(/[^a-z0-9]/g, '') || 'jpg';
    const objectPath = `events/${encodeURIComponent(String(eventId))}/${Date.now()}-${Math.random().toString(16).slice(2)}.${ext}`;
    const objectUrl = `${supabaseUrl.replace(/\/$/, '')}/storage/v1/object/flyers/${objectPath}`;

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
    }, 'Event image upload');

    if (!uploadRes.ok) {
      const t = await uploadRes.text().catch(() => '');
      json(res, 400, { error: 'Event image upload failed', details: t || uploadRes.statusText });
      return;
    }

    const publicUrl = `${supabaseUrl.replace(/\/$/, '')}/storage/v1/object/public/flyers/${objectPath}`;
    json(res, 200, { url: publicUrl, path: objectPath });
  } catch (e) {
    console.error(e);
    json(res, 500, { error: e?.message || String(e) });
  }
};
