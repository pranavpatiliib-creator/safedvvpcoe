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
  return value.trim().replace(/^["']|["']$/g, '').replace(/;$/, '');
}

async function requireAdmin(req, res) {
  const supabaseUrl = normalizeEnvValue(process.env.SUPABASE_URL);
  const serviceKey = normalizeEnvValue(process.env.SUPABASE_SERVICE_ROLE_KEY);
  const adminEmailsRaw = normalizeEnvValue(process.env.ADMIN_EMAILS);

  if (!supabaseUrl || !serviceKey) {
    json(res, 500, { error: 'Server misconfigured: missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY' });
    return null;
  }

  const token = getBearerToken(req);
  if (!token) {
    json(res, 401, { error: 'Missing Authorization Bearer token' });
    return null;
  }

  // Validate token using Supabase Auth admin endpoint (no extra deps).
  const authUrl = `${supabaseUrl.replace(/\/$/, '')}/auth/v1/user`;
  const r = await fetch(authUrl, {
    headers: {
      apikey: serviceKey,
      Authorization: `Bearer ${token}`
    }
  });

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

module.exports = { requireAdmin, readJson, json };
