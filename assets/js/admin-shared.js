(function (global) {
    'use strict';

    var bootstrap = global.SeedwelFirebase.init();
    var auth = bootstrap.auth;
    var db = bootstrap.db;

    function $(id) { return document.getElementById(id); }

    function setMessage(id, text, tone) {
        var el = $(id);
        if (!el) return;
        el.className = 'msg' + (tone ? ' ' + tone : '');
        el.textContent = text || '';
        el.style.display = text ? 'block' : 'none';
    }

    function setSignedInUser(user) {
        var el = $('signedInEmail');
        if (el) el.textContent = user && user.email ? user.email : '';
    }

    function ensureActiveNav() {
        var page = document.body.getAttribute('data-page');
        document.querySelectorAll('.sidebar-nav a[data-page]').forEach(function (link) {
            link.classList.toggle('active', link.getAttribute('data-page') === page);
        });
    }

    function attachLogout() {
        var button = $('logoutBtn');
        if (!button) return;
        button.addEventListener('click', async function () {
            try { await auth.signOut(); }
            finally { global.location.href = '/admin/login'; }
        });
    }

    async function isAdminRoleUser(user) {
        if (!user) return false;
        try {
            var snap = await db.ref('users/' + user.uid).once('value');
            var record = snap.val();
            return Boolean(record && String(record.role || '').toLowerCase() === 'admin');
        } catch (_) {
            return false;
        }
    }

    function withAdminPage(setup) {
        ensureActiveNav();
        attachLogout();
        auth.setPersistence(global.firebase.auth.Auth.Persistence.LOCAL)
            .catch(function () { return auth.setPersistence(global.firebase.auth.Auth.Persistence.SESSION); })
            .finally(function () {
                auth.onAuthStateChanged(async function (user) {
                    if (!user) {
                        global.location.href = '/admin/login';
                        return;
                    }
                    var allowed = global.SeedwelFirebase.isAdminUser(user) || await isAdminRoleUser(user);
                    if (!allowed) {
                        await auth.signOut().catch(function () {});
                        global.location.href = '/admin/login?error=unauthorized';
                        return;
                    }
                    setSignedInUser(user);
                    try {
                        await setup({ user: user, auth: auth, db: db, $: $, setMessage: setMessage });
                    } catch (error) {
                        console.error(error);
                        setMessage('pageMessage', error && error.message ? error.message : 'The page could not be loaded.', 'error');
                    }
                });
            });
    }

    global.SeedwelAdminShared = Object.freeze({
        $: $, auth: auth, db: db, setMessage: setMessage, setSignedInUser: setSignedInUser, withAdminPage: withAdminPage
    });
})(window);
