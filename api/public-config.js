module.exports = async function handler(req, res) {
  try {
    const normalizeEnvValue = (value) => {
      if (typeof value !== 'string') return '';
      return value.trim().replace(/["';]/g, '');
    };

    const supabaseUrl = normalizeEnvValue(process.env.SUPABASE_URL) || 'https://vjkmrnepxbuofpdlxomf.supabase.co';
    const supabaseAnonKey =
      normalizeEnvValue(process.env.SUPABASE_ANON_KEY) ||
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZqa21ybmVweGJ1b2ZwZGx4b21mIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzUyMzcwMDYsImV4cCI6MjA5MDgxMzAwNn0.0ho4TmitJ5vkkIfhpg1O-048dLTGFl0Gdu160cym1GA';

    res.statusCode = 200;
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Cache-Control', 'no-store');
    res.end(JSON.stringify({ SUPABASE_URL: supabaseUrl, SUPABASE_ANON_KEY: supabaseAnonKey }));
  } catch (e) {
    res.statusCode = 500;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ error: e?.message || String(e) }));
  }
};
