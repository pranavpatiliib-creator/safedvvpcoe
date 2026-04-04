
// Supabase configuration
// Local defaults keep the site working outside Vercel.
const DEFAULT_SUPABASE_URL = "https://vjkmrnepxbuofpdlxomf.supabase.co";
const DEFAULT_SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZqa21ybmVweGJ1b2ZwZGx4b21mIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzUyMzcwMDYsImV4cCI6MjA5MDgxMzAwNn0.0ho4TmitJ5vkkIfhpg1O-048dLTGFl0Gdu160cym1GA";

function applySupabaseConfig(url, key) {
    if (url) window.SUPABASE_URL = url;
    if (key) window.SUPABASE_ANON_KEY = key;

    window.CONFIG = {
        SUPABASE_URL: window.SUPABASE_URL || DEFAULT_SUPABASE_URL,
        SUPABASE_ANON_KEY: window.SUPABASE_ANON_KEY || DEFAULT_SUPABASE_ANON_KEY
    };

    return window.CONFIG;
}

async function loadSupabaseConfig() {
    try {
        const r = await fetch('/api/public-config', { cache: 'no-store' });
        if (r.ok) {
            const data = await r.json().catch(() => null);
            if (data?.SUPABASE_URL && data?.SUPABASE_ANON_KEY) {
                return applySupabaseConfig(data.SUPABASE_URL, data.SUPABASE_ANON_KEY);
            }
        }
    } catch (e) {
        // Ignore network/config endpoint failures and fall back to local defaults.
    }

    return applySupabaseConfig(window.SUPABASE_URL, window.SUPABASE_ANON_KEY);
}

window.applySupabaseConfig = applySupabaseConfig;
window.loadSupabaseConfig = loadSupabaseConfig;
applySupabaseConfig(window.SUPABASE_URL, window.SUPABASE_ANON_KEY);
