function json(res, status, body) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify(body));
}

function getBearerToken(req) {
  const header = req.headers?.authorization || req.headers?.Authorization;
  if (!header || typeof header !== 'string') return null;
  const parts = header.split(' ');
  if (parts.length !== 2) return null;
  if (parts[0].toLowerCase() !== 'bearer') return null;
  return parts[1];
}

function normalizeEnvValue(value) {
  if (typeof value !== 'string') return '';
  return value.trim().replace(/["';]/g, '');
}

function decodeJwtPayload(jwt) {
  try {
    const parts = String(jwt || '').split('.');
    if (parts.length < 2) return null;
    const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const padded = base64 + '='.repeat((4 - (base64.length % 4)) % 4);
    const jsonText = Buffer.from(padded, 'base64').toString('utf8');
    return JSON.parse(jsonText);
  } catch {
    return null;
  }
}

function isServiceRoleKey(key) {
  const payload = decodeJwtPayload(key);
  return payload?.role === 'service_role';
}

async function supabaseFetch(url, options = {}, context = 'Supabase request') {
  try {
    return await fetch(url, options);
  } catch (e) {
    const message = e?.message || String(e);
    throw new Error(`${context} failed for ${url}: ${message}`);
  }
}

async function requireAdmin(req, res) {
  const supabaseUrl = normalizeEnvValue(process.env.SUPABASE_URL);
  const serviceKey = normalizeEnvValue(process.env.SUPABASE_SERVICE_ROLE_KEY);
  const adminEmailsRaw = normalizeEnvValue(process.env.ADMIN_EMAILS);

  if (!supabaseUrl || !serviceKey) {
    json(res, 500, { error: 'Server misconfigured: missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY' });
    return null;
  }

  if (!isServiceRoleKey(serviceKey)) {
    json(res, 500, { error: 'Server misconfigured: SUPABASE_SERVICE_ROLE_KEY is not a service_role key' });
    return null;
  }

  const token = getBearerToken(req);
  if (!token) {
    json(res, 401, { error: 'Missing Authorization Bearer token' });
    return null;
  }

  const authUrl = `${supabaseUrl.replace(/\/$/, '')}/auth/v1/user`;
  const r = await supabaseFetch(authUrl, {
    headers: {
      apikey: serviceKey,
      Authorization: `Bearer ${token}`
    }
  }, 'Supabase auth validation');

  if (!r.ok) {
    json(res, 401, { error: 'Invalid session' });
    return null;
  }

  const user = await r.json();
  const email = (user?.email || '').toLowerCase();
  const allow = adminEmailsRaw
    .split(',')
    .map(s => s.trim().toLowerCase())
    .filter(Boolean);

  if (!email || allow.length === 0 || !allow.includes(email)) {
    json(res, 403, { error: 'Not an admin' });
    return null;
  }

  return { supabaseUrl, serviceKey, user };
}

async function readJson(req) {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  const raw = Buffer.concat(chunks).toString('utf8');
  if (!raw) return {};
  return JSON.parse(raw);
}

module.exports = { requireAdmin, readJson, json, supabaseFetch, normalizeEnvValue };
