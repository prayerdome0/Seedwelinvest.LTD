(function () {
    'use strict';

    var bootstrap = window.SeedwelFirebase.init();
    var auth = bootstrap.auth;
    var form = document.getElementById('adminLoginForm');
    var msg = document.getElementById('loginMessage');
    var button = document.getElementById('adminLoginBtn');
    var identityInput = document.getElementById('adminIdentity');

    function show(text, tone) {
        msg.className = 'msg' + (tone ? ' ' + tone : '');
        msg.textContent = text || '';
        msg.style.display = text ? 'block' : 'none';
    }

    auth.setPersistence(window.firebase.auth.Auth.Persistence.LOCAL)
        .catch(function () { return auth.setPersistence(window.firebase.auth.Auth.Persistence.SESSION); })
        .finally(function () {
            auth.onAuthStateChanged(function (user) {
                if (window.SeedwelFirebase.isAdminUser(user)) window.location.href = '/admin/dashboard';
            });
        });

    if (new URLSearchParams(window.location.search).get('error') === 'unauthorized') {
        show('That account is not authorized for the admin area.', 'error');
    }

    document.getElementById('forgotAdminPassword').addEventListener('click', async function () {
        var identity = identityInput.value.trim();
        if (!identity) {
            show('Enter the admin email or account ID first.', 'error');
            return;
        }
        try {
            await auth.sendPasswordResetEmail(window.SeedwelFirebase.firebaseSignInEmail(identity));
            show('Password reset instructions were sent to the administrator account.', 'success');
        } catch (_) {
            show('Could not send the reset email right now.', 'error');
        }
    });

    form.addEventListener('submit', async function (event) {
        event.preventDefault();
        show('', '');
        var identity = identityInput.value.trim();
        var password = document.getElementById('adminPassword').value;
        if (!identity || !password) {
            show('Enter the admin account ID or email and your password.', 'error');
            return;
        }
        button.disabled = true;
        button.textContent = 'Signing in…';
        try {
            var cred = await auth.signInWithEmailAndPassword(window.SeedwelFirebase.firebaseSignInEmail(identity), password);
            if (!window.SeedwelFirebase.isAdminUser(cred.user)) {
                await auth.signOut();
                show('That account is not authorized for the admin area.', 'error');
                return;
            }
            window.location.href = '/admin/dashboard';
        } catch (error) {
            console.error(error);
            show('Sign-in failed. Check the admin credentials and try again.', 'error');
        } finally {
            button.disabled = false;
            button.textContent = 'Sign In to Admin';
        }
    });
})();
