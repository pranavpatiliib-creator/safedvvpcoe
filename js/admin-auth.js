// Admin authentication helpers (Supabase Auth)
// - On `admin.html`, call `requireAdminAuth()` to protect the page.
// - On `admin-login.html`, call `initAdminLogin()` to enable login form.

(function () {
    async function requireAdminAuth() {
        try {
            const client = await window.waitForSupabaseClient();
            const { data, error } = await client.auth.getSession();
            if (error) throw error;

            const session = data?.session;
            if (!session) {
                window.location.href = 'admin-login.html';
                return;
            }

            // Optional: show logged-in email if a placeholder exists
            const userEmailEl = document.getElementById('adminUserEmail');
            if (userEmailEl) userEmailEl.textContent = session.user?.email || '';

            const logoutBtn = document.getElementById('logoutBtn');
            if (logoutBtn && !logoutBtn.__bound) {
                logoutBtn.__bound = true;
                logoutBtn.addEventListener('click', async (e) => {
                    e.preventDefault();
                    try {
                        const { error: signOutError } = await client.auth.signOut();
                        if (signOutError) throw signOutError;
                        window.location.href = 'admin-login.html';
                    } catch (err) {
                        console.error('Logout error:', err);
                        alert(`Logout failed: ${err?.message || err}`);
                    }
                });
            }
        } catch (err) {
            console.error('Auth check failed:', err);
            alert(`Auth error: ${err?.message || err}`);
        }
    }

    async function initAdminLogin() {
        const form = document.getElementById('adminLoginForm');
        const emailInput = document.getElementById('adminEmail');
        const passwordInput = document.getElementById('adminPassword');
        const btn = document.getElementById('adminLoginBtn');
        const errorEl = document.getElementById('adminLoginError');

        if (!form || !emailInput || !passwordInput || !btn) return;

        try {
            const client = await window.waitForSupabaseClient();
            const { data } = await client.auth.getSession();
            if (data?.session) {
                window.location.href = 'admin.html';
                return;
            }
        } catch (e) {
            // ignore; user can still attempt login
        }

        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            if (errorEl) errorEl.textContent = '';

            const email = emailInput.value.trim();
            const password = passwordInput.value;

            if (!email || !password) {
                if (errorEl) errorEl.textContent = 'Please enter email and password.';
                return;
            }

            try {
                const client = await window.waitForSupabaseClient();
                btn.disabled = true;
                btn.textContent = 'Signing in...';

                const { data, error } = await client.auth.signInWithPassword({ email, password });
                if (error) throw error;
                if (!data?.session) throw new Error('No session returned');

                window.location.href = 'admin.html';
            } catch (err) {
                console.error('Login error:', err);
                const msg = err?.message || String(err);
                if (errorEl) errorEl.textContent = msg;
                else alert(`Login failed: ${msg}`);
            } finally {
                btn.disabled = false;
                btn.textContent = 'Login';
            }
        });
    }

    window.requireAdminAuth = requireAdminAuth;
    window.initAdminLogin = initAdminLogin;
})();

