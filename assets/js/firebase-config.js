(function (global) {
    'use strict';

    var firebaseConfig = {
        apiKey: 'AIzaSyA-BpRy-RVc2rqIG6uiRu_XrGEu1ZGnQwU',
        authDomain: 'seedwel-investment-limited.firebaseapp.com',
        databaseURL: 'https://seedwel-investment-limited-default-rtdb.firebaseio.com',
        projectId: 'seedwel-investment-limited',
        storageBucket: 'seedwel-investment-limited.firebasestorage.app',
        messagingSenderId: '197778268619',
        appId: '1:197778268619:web:92f29d88fa5a22dbfa964e'
    };

    var ADMIN_EMAIL = 'zacheussimbaya@gmail.com';
    var ADMIN_LOGIN_ID = 'seedwel@admin';

    function initFirebase() {
        if (!global.firebase) throw new Error('Firebase is not loaded on this page.');
        if (!global.firebase.apps.length) global.firebase.initializeApp(firebaseConfig);
        return {
            app: global.firebase.app(),
            auth: typeof global.firebase.auth === 'function' ? global.firebase.auth() : null,
            db: typeof global.firebase.database === 'function' ? global.firebase.database() : null
        };
    }

    function firebaseSignInEmail(value) {
        var identity = String(value || '').trim().toLowerCase();
        return identity === ADMIN_LOGIN_ID ? ADMIN_EMAIL : identity;
    }

    function isAdminUser(user) {
        return Boolean(user && user.email && String(user.email).toLowerCase() === ADMIN_EMAIL);
    }

    global.SeedwelFirebase = Object.freeze({
        config: firebaseConfig,
        adminEmail: ADMIN_EMAIL,
        adminLoginId: ADMIN_LOGIN_ID,
        init: initFirebase,
        firebaseSignInEmail: firebaseSignInEmail,
        isAdminUser: isAdminUser
    });
})(window);
