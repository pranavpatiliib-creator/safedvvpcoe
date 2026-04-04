
// Supabase client initialization (CDN: @supabase/supabase-js)
// Important: attach to `window` so other scripts can always access it.
var supabaseClient;
window.__supabaseInit = window.__supabaseInit || { ok: false, error: null };

function loadScriptOnce(src) {
    return new Promise((resolve, reject) => {
        const existing = document.querySelector(`script[src="${src}"]`);
        if (existing) {
            existing.addEventListener('load', () => resolve());
            existing.addEventListener('error', () => reject(new Error(`Failed to load ${src}`)));
            // If it already loaded, resolve on next tick.
            setTimeout(resolve, 0);
            return;
        }

        const script = document.createElement('script');
        script.src = src;
        script.async = true;
        script.addEventListener('load', () => resolve());
        script.addEventListener('error', () => reject(new Error(`Failed to load ${src}`)));
        document.head.appendChild(script);
    });
}

async function initSupabaseClient() {
    try {
        // Refresh config in the background, but do not block client startup on it.
        if (typeof window.loadSupabaseConfig === 'function') {
            window.loadSupabaseConfig().catch(() => {});
        }

        if (typeof supabase === 'undefined') {
            // First try a local vendored copy (works even if CDNs are blocked).
            // This does not require any HTML changes.
            try {
                await loadScriptOnce('js/vendor/supabase.js');
            } catch (e) {
                // ignore and try CDNs next
            }

            // Fallback: try to load from CDNs if available.
            const candidates = [
                // jsdelivr (Supabase docs commonly use this)
                'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.43.0/dist/main.min.js',
                // jsdelivr UMD fallback
                'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.43.0/dist/umd/supabase.js'
            ];

            let loaded = false;
            for (const url of candidates) {
                try {
                    await loadScriptOnce(url);
                    if (typeof supabase !== 'undefined') {
                        loaded = true;
                        break;
                    }
                } catch (e) {
                    // continue trying other CDNs
                }
            }

            if (!loaded && typeof supabase === 'undefined') {
                throw new Error('Supabase library not loaded from any CDN (jsdelivr/unpkg/cdnjs)');
            }
        }

        if (typeof supabase === 'undefined') {
            throw new Error('Supabase library not loaded (window.supabase is undefined)');
        }

        const url = window.CONFIG?.SUPABASE_URL || (typeof SUPABASE_URL !== 'undefined' ? SUPABASE_URL : null);
        const key = window.CONFIG?.SUPABASE_ANON_KEY || (typeof SUPABASE_ANON_KEY !== 'undefined' ? SUPABASE_ANON_KEY : null);

        if (!url || !key) {
            throw new Error('Supabase config missing (load `js/config.js` before `js/supabase-client.js`)');
        }

        supabaseClient = supabase.createClient(url, key);
        window.supabaseClient = supabaseClient;
        window.__supabaseInit.ok = true;
        window.__supabaseInit.error = null;
    } catch (e) {
        window.__supabaseInit.ok = false;
        window.__supabaseInit.error = e?.message || String(e);
        console.error('Failed to initialize Supabase client:', e);
    }
}

window.waitForSupabaseClient = async function waitForSupabaseClient(timeoutMs = 10000) {
    const start = Date.now();

    // Kick off init if it hasn't succeeded yet.
    if (!window.__supabaseInit.ok && !supabaseClient) {
        // Fire and forget; callers wait below.
        initSupabaseClient();
    }

    while (Date.now() - start < timeoutMs) {
        if (window.supabaseClient) return window.supabaseClient;
        await new Promise(r => setTimeout(r, 50));
    }

    const reason = window.__supabaseInit?.error ? ` (${window.__supabaseInit.error})` : '';
    throw new Error(`Supabase client not initialized${reason}`);
};

// Attempt init immediately (sync pages still work; async pages can waitForSupabaseClient).
initSupabaseClient();
