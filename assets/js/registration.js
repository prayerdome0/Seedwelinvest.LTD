(function () {
    'use strict';

    var bootstrap = window.SeedwelFirebase.init();
    var auth = bootstrap.auth;
    var db = bootstrap.db;
    var utils = window.SeedwelRecruitment;

    var invite = null;
    var token = utils.queryParam('token') || utils.hashParam('token');
    var message = document.getElementById('registerMessage');
    var loading = document.getElementById('registerLoading');
    var formWrap = document.getElementById('registerFormWrap');
    var successWrap = document.getElementById('registerSuccess');
    var form = document.getElementById('registerForm');
    var button = document.getElementById('registerBtn');

    function show(text, tone) {
        message.className = 'msg' + (tone ? ' ' + tone : '');
        message.textContent = text || '';
        message.style.display = text ? 'block' : 'none';
    }

    function fill(id, value) {
        var el = document.getElementById(id);
        if (el) el.textContent = value || '—';
    }

    function inviteIsUsable(record) {
        return Boolean(record && String(record.status || '').toLowerCase() === 'pending' && Number(record.expiresAt || 0) > Date.now());
    }

    function resolveRole(record) {
        var role = utils.safeText(record.role, 40).toLowerCase();
        if (['admin', 'manager', 'staff', 'client'].indexOf(role) !== -1) return role;
        if (String(record.roleType || '').toLowerCase() === 'member') return 'client';
        if (/virtual\s*assistant/i.test(String(record.position || ''))) return 'manager';
        return 'staff';
    }

    async function loadInvite() {
        if (!token) {
            loading.hidden = true;
            show('This registration link is missing its invitation token.', 'error');
            return;
        }
        var snapshot = await db.ref('registrationInvitations/' + token).once('value');
        invite = snapshot.val();
        loading.hidden = true;
        if (!inviteIsUsable(invite)) {
            show('This invitation link is invalid, expired or has already been used. Please contact Seedwel Investment LTD for a new registration invitation.', 'error');
            return;
        }
        fill('inviteName', invite.fullName);
        fill('inviteEmail', invite.email);
        fill('invitePosition', invite.position);
        fill('inviteDepartment', invite.department || 'Operations');
        var roleLabel = document.getElementById('inviteRoleLabel');
        if (roleLabel) roleLabel.textContent = resolveRole(invite) === 'client' ? 'Client / Business Account' : resolveRole(invite) === 'manager' ? 'Manager / Virtual Assistant' : 'Staff Account';
        formWrap.hidden = false;
    }

    async function completeRegistration(email, password) {
        var credential = await auth.createUserWithEmailAndPassword(email, password);
        var user = credential.user;
        var workerCreated = false;
        var userCreated = false;
        var role = resolveRole(invite);
        var now = window.firebase.database.ServerValue.TIMESTAMP;
        try {
            var workerRecord = {
                fullName: utils.safeText(invite.fullName, 120),
                email: utils.safeText(invite.email, 160).toLowerCase(),
                phone: utils.safeText(invite.phone, 40),
                country: utils.safeText(invite.location, 80),
                role: utils.safeText(invite.position, 120),
                position: utils.safeText(invite.position, 120),
                department: utils.safeText(invite.department, 100),
                workerId: utils.safeText(invite.memberCode, 20),
                memberRecordId: utils.safeText(invite.memberId, 80),
                invitationToken: token,
                commissionRate: 0,
                status: 'active',
                skills: '',
                experience: utils.safeText(invite.experience, 40),
                availability: '',
                approvedAt: now,
                createdAt: now,
                updatedAt: now
            };
            await db.ref('workers/' + user.uid).set(workerRecord);
            workerCreated = true;

            var accountRecord = {
                fullName: utils.safeText(invite.fullName, 120),
                name: utils.safeText(invite.fullName, 120),
                email: utils.safeText(invite.email, 160).toLowerCase(),
                phone: utils.safeText(invite.phone, 40),
                country: utils.safeText(invite.location, 80),
                company: utils.safeText(invite.company, 120),
                role: role,
                accountType: role === 'client' ? 'client' : 'worker',
                position: utils.safeText(invite.position, 120),
                department: utils.safeText(invite.department, 100),
                workerId: utils.safeText(invite.memberCode, 20),
                assignedManagerId: utils.safeText(invite.assignedManagerId, 128),
                assignedManagerName: utils.safeText(invite.assignedManagerName, 120),
                invitationToken: token,
                status: 'active',
                registeredAt: now,
                approvedAt: now,
                createdAt: now,
                updatedAt: now
            };
            await db.ref('users/' + user.uid).set(accountRecord);
            userCreated = true;

            await db.ref('registrationInvitations/' + token).update({
                status: 'registered',
                usedByUid: user.uid,
                usedAt: now
            });
            try {
                await db.ref('adminNotifications').push({
                    title: 'New account registered',
                    body: utils.safeText(invite.fullName, 120) + ' (' + role + ') completed registration.',
                    type: 'member',
                    read: false,
                    link: 'members',
                    createdAt: now
                });
            } catch (_) { /* best-effort notification */ }

            successWrap.hidden = false;
            formWrap.hidden = true;
            fill('successName', invite.fullName);
        } catch (error) {
            if (!userCreated && !workerCreated) {
                try { await user.delete(); } catch (_) {}
            }
            throw error;
        }
    }

    form.addEventListener('submit', async function (event) {
        event.preventDefault();
        show('', '');
        if (!inviteIsUsable(invite)) {
            show('This invitation is no longer valid. Please request a new registration link.', 'error');
            return;
        }
        var password = document.getElementById('password').value;
        var confirm = document.getElementById('confirmPassword').value;
        var agreed = document.getElementById('privacyConsent').checked;
        if (password.length < 8) {
            show('Create a password with at least 8 characters.', 'error');
            return;
        }
        if (password !== confirm) {
            show('Your passwords do not match.', 'error');
            return;
        }
        if (!agreed) {
            show('Please accept the Privacy Policy before creating your account.', 'error');
            return;
        }
        button.disabled = true;
        button.textContent = 'Creating account…';
        try {
            await completeRegistration(invite.email, password);
        } catch (error) {
            console.error(error);
            if (error && error.code === 'auth/email-already-in-use') {
                show('This email already has an account. Use the login page or password reset if your account has already been registered.', 'error');
            } else {
                show(error && error.message ? error.message : 'Registration could not be completed. Please try again.', 'error');
            }
        } finally {
            button.disabled = false;
            button.textContent = 'Create Account';
        }
    });

    document.getElementById('goToDashboardBtn').addEventListener('click', function () {
        var role = invite ? resolveRole(invite) : 'staff';
        var home = { admin: '/admin/dashboard', manager: '/portal/manager', staff: '/dashboard', client: '/portal/client' };
        window.location.href = home[role] || '/dashboard';
    });

    auth.onAuthStateChanged(function (user) {
        if (user && window.SeedwelFirebase.isAdminUser(user)) window.location.href = '/admin/dashboard';
    });

    loadInvite().catch(function (error) {
        console.error(error);
        loading.hidden = true;
        show('The invitation could not be loaded right now. Please try again.', 'error');
    });
})();
