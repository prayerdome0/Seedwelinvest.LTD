/**
 * Seedwel Workplace — shared portal runtime.
 *
 * Responsibilities:
 *  - Resolve the signed-in user's account and role (always from the database,
 *    never from a value chosen in the browser).
 *  - Route each role to the right workspace after sign-in.
 *  - Gate private pages by role.
 *  - Provide small shared helpers (nav, audit, notifications, task history).
 *
 * Roles: admin, manager (also Virtual Assistant), staff, client.
 */
(function (global) {
    'use strict';

    var bootstrap = global.SeedwelFirebase.init();
    var auth = bootstrap.auth;
    var db = bootstrap.db;
    var utils = global.SeedwelRecruitment;
    var ADMIN_EMAIL = global.SeedwelFirebase.adminEmail;

    var ROLE_HOME = Object.freeze({
        admin: '/admin/dashboard',
        manager: '/portal/manager',
        staff: '/dashboard',
        client: '/portal/client'
    });

    var ROLE_LABELS = Object.freeze({
        admin: 'Administrator',
        manager: 'Manager / Virtual Assistant',
        staff: 'Staff',
        client: 'Client / Business'
    });

    function $(id) { return document.getElementById(id); }

    function esc(value) { return utils.escapeHtml(value); }

    function roleHome(role) { return ROLE_HOME[role] || '/dashboard'; }

    function roleLabel(role) { return ROLE_LABELS[role] || 'Member'; }

    function isLegacyVirtualAssistant(position) {
        return /virtual\s*assistant/i.test(String(position || ''));
    }

    /** Build a portal account from a legacy worker record (pre-roles data). */
    function legacyAccount(worker, user) {
        var position = utils.safeText(worker.position || worker.role, 120);
        var role = isLegacyVirtualAssistant(position) ? 'manager' : 'staff';
        return {
            uid: user ? user.uid : '',
            fullName: utils.safeText(worker.fullName, 120),
            name: utils.safeText(worker.fullName, 120),
            email: utils.safeText(worker.email || (user && user.email), 160).toLowerCase(),
            phone: utils.safeText(worker.phone, 40),
            country: utils.safeText(worker.country || worker.location, 80),
            role: role,
            position: position || 'Team Member',
            department: utils.safeText(worker.department, 100),
            status: utils.safeText(worker.status, 40) || 'active',
            workerId: utils.safeText(worker.workerId, 20),
            assignedManagerId: utils.safeText(worker.assignedManagerId, 128),
            assignedManagerName: utils.safeText(worker.assignedManagerName, 120),
            createdAt: Number(worker.createdAt || worker.approvedAt || 0),
            updatedAt: Number(worker.updatedAt || worker.approvedAt || 0),
            profilePhotoUrl: utils.safeText(worker.profilePhotoUrl, 500),
            source: 'legacy-worker'
        };
    }

    /** Resolve the portal account record for the signed-in user. */
    async function accountFor(user) {
        var snap = await db.ref('users/' + user.uid).once('value');
        var record = snap.val();
        if (record) {
            var role = utils.safeText(record.role, 40) || 'staff';
            if (role !== 'admin' && role !== 'manager' && role !== 'staff' && role !== 'client') role = 'staff';
            record.uid = user.uid;
            record.role = role;
            record.fullName = utils.safeText(record.fullName || record.name, 120);
            record.name = record.fullName;
            record.email = utils.safeText(record.email || user.email, 160).toLowerCase();
            record.status = utils.safeText(record.status, 40) || 'active';
            record.source = 'users';
            return record;
        }
        var workerSnap = await db.ref('workers/' + user.uid).once('value');
        var worker = workerSnap.val();
        return worker ? legacyAccount(worker, user) : null;
    }

    async function roleFor(user) {
        var account = await accountFor(user);
        return account ? account.role : null;
    }

    /** Route the signed-in user to the workspace for their role. */
    async function routeUser(user) {
        if (!user) { global.location.href = '/login'; return; }
        if (utils.safeText(user.email, 160).toLowerCase() === ADMIN_EMAIL) {
            global.location.href = '/admin/dashboard';
            return;
        }
        var account = await accountFor(user);
        if (!account) {
            await auth.signOut().catch(function () {});
            global.location.href = '/login';
            return;
        }
        global.location.href = roleHome(account.role);
    }

    function bindShell(account, activeKey) {
        var nameEl = $('signedInName');
        var emailEl = $('signedInEmail');
        if (nameEl) nameEl.textContent = account.fullName || account.email || 'Member';
        if (emailEl) emailEl.textContent = account.email || '';
        var roleEl = $('signedInRole');
        if (roleEl) roleEl.textContent = roleLabel(account.role);
        var managerEl = $('assignedManagerChip');
        if (managerEl) {
            managerEl.textContent = account.assignedManagerName ? 'Manager: ' + account.assignedManagerName : '';
            managerEl.hidden = !account.assignedManagerName;
        }
        document.querySelectorAll('.sidebar-nav a[data-page]').forEach(function (link) {
            link.classList.toggle('active', link.getAttribute('data-page') === activeKey);
        });
        var logout = $('logoutBtn');
        if (logout) {
            logout.addEventListener('click', async function () {
                try { await auth.signOut(); } finally { global.location.href = '/login'; }
            });
        }
    }

    /** Gate a page for the listed roles; call setup with the resolved context. */
    function gate(roles, setup) {
        auth.setPersistence(global.firebase.auth.Auth.Persistence.LOCAL)
            .catch(function () { return auth.setPersistence(global.firebase.auth.Auth.Persistence.SESSION); })
            .finally(function () {
                auth.onAuthStateChanged(async function (user) {
                    var fail = function (href) { global.location.href = href; };
                    if (!user) { fail('/login'); return; }
                    if (utils.safeText(user.email, 160).toLowerCase() === ADMIN_EMAIL) {
                        fail('/admin/dashboard');
                        return;
                    }
                    var account;
                    try {
                        account = await accountFor(user);
                    } catch (error) {
                        console.error('Portal account resolution failed:', error);
                        fail('/login');
                        return;
                    }
                    if (!account || !account.uid) {
                        await auth.signOut().catch(function () {});
                        fail('/login');
                        return;
                    }
                    if (String(account.status || '').toLowerCase() !== 'active') {
                        // The staff dashboard renders suspended / needs-info screens.
                        fail('/dashboard');
                        return;
                    }
                    if (roles.indexOf(account.role) === -1) {
                        fail(roleHome(account.role));
                        return;
                    }
                    try {
                        await setup({ user: user, account: account, auth: auth, db: db, $: $, esc: esc });
                    } catch (error) {
                        console.error('Portal page setup failed:', error);
                        var message = $('pageMessage');
                        if (message) {
                            message.className = 'msg error';
                            message.style.display = 'block';
                            message.textContent = error && error.message ? error.message : 'The page could not be loaded. Please try again.';
                        }
                    }
                });
            });
    }

    /** Best-effort notification push to a user's bell. */
    async function notify(uid, title, body, link, type) {
        if (!uid) return;
        try {
            await db.ref('notifications/' + uid).push({
                title: utils.safeText(title, 200),
                body: utils.safeText(body, 1000),
                type: utils.safeText(type || 'task', 40),
                link: utils.safeText(link || '', 160),
                read: false,
                createdAt: global.firebase.database.ServerValue.TIMESTAMP
            });
        } catch (error) {
            console.warn('Notification push skipped:', error);
        }
    }

    /** Append an auditable history entry under a task record. */
    async function pushHistory(recordRef, entry) {
        await recordRef.child('history').push(Object.assign({}, entry, {
            at: global.firebase.database.ServerValue.TIMESTAMP
        }));
    }

    /** Append a comment under a task record. */
    async function addComment(recordRef, comment) {
        await recordRef.child('comments').push(Object.assign({}, comment, {
            at: global.firebase.database.ServerValue.TIMESTAMP
        }));
    }

    /** Append an entry to the shared administrator audit log. */
    async function audit(action, target, detail, account) {
        try {
            await db.ref('auditLog').push({
                action: utils.safeText(action, 80),
                target: utils.safeText(target, 200),
                detail: utils.safeText(detail, 500),
                actor: account && account.email ? utils.safeText(account.email, 160) : ADMIN_EMAIL,
                actorName: account && account.fullName ? utils.safeText(account.fullName, 120) : '',
                at: global.firebase.database.ServerValue.TIMESTAMP
            });
        } catch (error) {
            console.warn('Audit entry skipped:', error);
        }
    }

    global.SeedwelPortal = Object.freeze({
        ADMIN_EMAIL: ADMIN_EMAIL,
        ROLE_HOME: ROLE_HOME,
        ROLE_LABELS: ROLE_LABELS,
        $: $,
        esc: esc,
        roleHome: roleHome,
        roleLabel: roleLabel,
        accountFor: accountFor,
        roleFor: roleFor,
        routeUser: routeUser,
        bindShell: bindShell,
        gate: gate,
        notify: notify,
        pushHistory: pushHistory,
        addComment: addComment,
        audit: audit,
        auth: auth,
        db: db
    });
})(window);
