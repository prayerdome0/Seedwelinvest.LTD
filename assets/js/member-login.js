(function () {
    'use strict';

    var bootstrap = window.SeedwelFirebase.init();
    var auth = bootstrap.auth;
    var db = bootstrap.db;
    var form = document.getElementById('memberLoginForm');
    var msg = document.getElementById('loginMessage');
    var button = document.getElementById('memberLoginBtn');
    var identityInput = document.getElementById('memberIdentity');

    function show(text, tone) {
        msg.className = 'msg' + (tone ? ' ' + tone : '');
        msg.textContent = text || '';
        msg.style.display = text ? 'block' : 'none';
    }

    async function routeUser(user) {
        if (!user) return;
        if (window.SeedwelFirebase.isAdminUser(user)) {
            window.location.href = '/admin/dashboard';
            return;
        }
        var snap = await db.ref('workers/' + user.uid).once('value');
        var worker = snap.val();
        if (!worker) {
            await auth.signOut();
            show('No active member account is linked to this email yet. Apply first, then wait for an approved registration invitation.', 'error');
            return;
        }
        window.location.href = '/dashboard';
    }

    auth.setPersistence(window.firebase.auth.Auth.Persistence.LOCAL)
        .catch(function () { return auth.setPersistence(window.firebase.auth.Auth.Persistence.SESSION); })
        .finally(function () {
            auth.onAuthStateChanged(function (user) {
                routeUser(user).catch(function (error) {
                    console.error(error);
                    show('Could not verify this account right now. Please try again.', 'error');
                });
            });
        });

    document.getElementById('forgotMemberPassword').addEventListener('click', async function () {
        var identity = identityInput.value.trim();
        if (!identity) {
            show('Enter your email first, then choose password reset.', 'error');
            return;
        }
        try {
            await auth.sendPasswordResetEmail(window.SeedwelFirebase.firebaseSignInEmail(identity));
            show('Password reset instructions were sent if the account exists.', 'success');
        } catch (_) {
            show('Could not send the reset email right now.', 'error');
        }
    });

    form.addEventListener('submit', async function (event) {
        event.preventDefault();
        show('', '');
        var identity = identityInput.value.trim();
        var password = document.getElementById('memberPassword').value;
        if (!identity || !password) {
            show('Enter your email and password to continue.', 'error');
            return;
        }
        button.disabled = true;
        button.textContent = 'Signing in…';
        try {
            var cred = await auth.signInWithEmailAndPassword(window.SeedwelFirebase.firebaseSignInEmail(identity), password);
            await routeUser(cred.user);
        } catch (error) {
            console.error(error);
            show('Sign-in failed. Check your details and try again.', 'error');
        } finally {
            button.disabled = false;
            button.textContent = 'Sign In';
        }
    });
})();
