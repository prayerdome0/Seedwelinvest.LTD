/* ============================================================
   Seedwel Investment LTD — shared site behaviour
   Navigation, gentle scroll reveals, footer, floating WhatsApp
   and the privacy / cookie consent banner.
   ============================================================ */
(function () {
    'use strict';

    if (window.__seedwelSiteJs) return;
    window.__seedwelSiteJs = true;

    var PHONE_DISPLAY = '+260 973 028 342';
    var PHONE_WA = '260973028342';
    var EMAIL = 'seedwelinvestltd@gmail.com';
    var CONSENT_KEY = 'seedwel.consent.v1';
    var reducedMotion = (typeof window.matchMedia === 'function')
        ? window.matchMedia('(prefers-reduced-motion: reduce)')
        : { matches: false };

    /* ─────────── Navigation ─────────── */

    function initNav() {
        var hamburger = document.getElementById('hamburger');
        var mobileMenu = document.getElementById('mobileMenu');
        var overlay = document.getElementById('menuOverlay');
        if (!hamburger || !mobileMenu || !overlay) return;

        function toggleMenu(force) {
            var active = typeof force === 'boolean' ? force : !mobileMenu.classList.contains('active');
            mobileMenu.classList.toggle('active', active);
            overlay.classList.toggle('active', active);
            hamburger.classList.toggle('active', active);
            hamburger.setAttribute('aria-expanded', String(active));
            document.body.style.overflow = active ? 'hidden' : '';
        }

        hamburger.addEventListener('click', function () { toggleMenu(); });
        overlay.addEventListener('click', function () { toggleMenu(false); });
        mobileMenu.querySelectorAll('a').forEach(function (link) {
            link.addEventListener('click', function () { toggleMenu(false); });
        });
        document.addEventListener('keydown', function (event) {
            if (event.key === 'Escape') toggleMenu(false);
        });
    }

    function initHeaderScroll() {
        var header = document.getElementById('header');
        if (!header) return;
        var update = function () { header.classList.toggle('scrolled', window.scrollY > 24); };
        update();
        window.addEventListener('scroll', update, { passive: true });
    }

    /* ─────────── Gentle scroll reveal (once per element) ─────────── */

    var revealObserver = null;

    function initReveal(scope) {
        var items = Array.prototype.slice.call((scope || document).querySelectorAll('.reveal:not(.visible)'));
        if (reducedMotion.matches || !('IntersectionObserver' in window)) {
            items.forEach(function (item) { item.classList.add('visible'); });
            return;
        }
        if (!revealObserver) {
            revealObserver = new IntersectionObserver(function (entries) {
                entries.forEach(function (entry) {
                    if (entry.isIntersecting) {
                        entry.target.classList.add('visible');
                        revealObserver.unobserve(entry.target);
                    }
                });
            }, { threshold: 0.12, rootMargin: '0px 0px -30px 0px' });
        }
        items.forEach(function (item) { revealObserver.observe(item); });
    }

    /* Allow dynamically rendered content (e.g. live portfolio cards) to reveal gently. */
    window.SeedwelRefreshReveals = function () { initReveal(); };

    /* Counters animate once — used only for real, verifiable numbers. */
    function initCounters() {
        var counters = document.querySelectorAll('[data-count]');
        if (!counters.length) return;
        function animate(el) {
            var target = parseFloat(el.dataset.count) || 0;
            var suffix = el.dataset.suffix || '';
            var duration = 1200;
            var start = null;
            function frame(now) {
                if (!start) start = now;
                var progress = Math.min((now - start) / duration, 1);
                var eased = 1 - Math.pow(1 - progress, 3);
                el.textContent = Math.round(target * eased) + suffix;
                if (progress < 1) requestAnimationFrame(frame);
            }
            requestAnimationFrame(frame);
        }
        if (reducedMotion.matches || !('IntersectionObserver' in window)) {
            counters.forEach(function (el) { el.textContent = (parseFloat(el.dataset.count) || 0) + (el.dataset.suffix || ''); });
            return;
        }
        var observer = new IntersectionObserver(function (entries) {
            entries.forEach(function (entry) {
                if (entry.isIntersecting) {
                    animate(entry.target);
                    observer.unobserve(entry.target);
                }
            });
        }, { threshold: 0.4 });
        counters.forEach(function (el) { observer.observe(el); });
    }

    /* ─────────── Professional footer (every public page) ─────────── */

    function buildFooter() {
        if (document.querySelector('.site-footer')) return;
        var year = new Date().getFullYear();
        var el = document.createElement('footer');
        el.className = 'site-footer';
        el.innerHTML =
            '<div class="container">' +
              '<div class="footer-grid">' +
                '<div class="footer-brand">' +
                  '<img src="https://i.ibb.co/svxj52ny/seedwel.png" alt="Seedwel Investment LTD" width="168" height="42" loading="lazy" />' +
                  '<p class="footer-tag">Business Solutions&nbsp;|&nbsp;Technology&nbsp;|&nbsp;Marketing&nbsp;|&nbsp;Professional Services</p>' +
                  '<p>Seedwel Investment LTD helps Zambian businesses register, comply, build their online presence and grow — with clear communication and modern digital tools.</p>' +
                '</div>' +
                '<div class="footer-col">' +
                  '<h4>Quick Links</h4>' +
                  '<a href="index.html">Home</a>' +
                  '<a href="about.html">About</a>' +
                  '<a href="services.html">Services</a>' +
                  '<a href="projects.html">Projects</a>' +
                  '<a href="apply.html">Careers</a>' +
                  '<a href="contact.html">Contact</a>' +
                '</div>' +
                '<div class="footer-col">' +
                  '<h4>Services</h4>' +
                  '<a href="services.html#zra">ZRA Services</a>' +
                  '<a href="services.html#napsa">NAPSA Services</a>' +
                  '<a href="services.html#pacra">PACRA Registration</a>' +
                  '<a href="services.html#web-development">Website Development</a>' +
                  '<a href="services.html#ai-automation">AI Automation</a>' +
                  '<a href="services.html#digital-marketing">Digital Marketing</a>' +
                '</div>' +
                '<div class="footer-col">' +
                  '<h4>Company</h4>' +
                  '<a href="privacy.html">Privacy Policy</a>' +
                  '<a href="cookie-policy.html">Cookie Policy</a>' +
                  '<a href="terms.html">Terms of Service</a>' +
                  '<a href="apply.html">Careers</a>' +
                '</div>' +
                '<div class="footer-col">' +
                  '<h4>Contact</h4>' +
                  '<a href="mailto:' + EMAIL + '"><i class="fa-solid fa-envelope" aria-hidden="true"></i> ' + EMAIL + '</a>' +
                  '<a href="https://wa.me/' + PHONE_WA + '" target="_blank" rel="noopener"><i class="fa-brands fa-whatsapp" aria-hidden="true"></i> WhatsApp us</a>' +
                  '<a href="tel:+' + PHONE_WA + '"><i class="fa-solid fa-phone" aria-hidden="true"></i> ' + PHONE_DISPLAY + '</a>' +
                  '<p><i class="fa-solid fa-location-dot" aria-hidden="true"></i> Kabwe, Zambia</p>' +
                '</div>' +
              '</div>' +
              '<div class="footer-bottom">' +
                '<p>&copy; ' + year + ' Seedwel Investment LTD. All rights reserved.' +
                  ' <a href="support.html">Support</a> ·' +
                  ' <button type="button" class="link-like" data-cookie-settings style="color:inherit;background:none;border:0;padding:0;font:inherit;cursor:pointer;text-decoration:underline;">Cookie settings</button>' +
                '</p>' +
              '</div>' +
            '</div>';
        document.body.appendChild(el);
    }

    /* ─────────── Floating WhatsApp button ─────────── */

    function buildWhatsApp() {
        if (document.querySelector('.floating-whatsapp')) return;
        var a = document.createElement('a');
        a.className = 'floating-whatsapp';
        a.href = 'https://wa.me/' + PHONE_WA + '?text=' + encodeURIComponent('Hello Seedwel, I would like to ask about your services.');
        a.target = '_blank';
        a.rel = 'noopener';
        a.setAttribute('aria-label', 'Chat with Seedwel on WhatsApp');
        a.innerHTML = '<span class="float-label" aria-hidden="true">WhatsApp us</span><i class="fa-brands fa-whatsapp" aria-hidden="true"></i>';
        document.body.appendChild(a);
    }

    /* ─────────── Privacy / cookie consent ─────────── */

    function readConsent() {
        try {
            var raw = window.localStorage.getItem(CONSENT_KEY);
            if (!raw) return null;
            var parsed = JSON.parse(raw);
            if (!parsed || typeof parsed !== 'object' || typeof parsed.analytics !== 'boolean') return null;
            return parsed;
        } catch (_) { return null; }
    }

    function writeConsent(decision, analytics) {
        var record = { v: 1, decision: decision, analytics: !!analytics, at: Date.now() };
        try { window.localStorage.setItem(CONSENT_KEY, JSON.stringify(record)); } catch (_) { /* storage unavailable */ }
        window.dispatchEvent(new CustomEvent('seedwel:consent', { detail: record }));
        return record;
    }

    function buildConsentBanner() {
        if (document.getElementById('cookieBanner')) return;
        var banner = document.createElement('section');
        banner.className = 'cookie-banner';
        banner.id = 'cookieBanner';
        banner.setAttribute('role', 'dialog');
        banner.setAttribute('aria-live', 'polite');
        banner.setAttribute('aria-label', 'Privacy and cookie consent');
        banner.innerHTML =
            '<div class="cookie-banner-inner">' +
              '<div>' +
                '<h2><i class="fa-solid fa-lock" aria-hidden="true"></i> Your Privacy Matters</h2>' +
                '<p>We use cookies and similar technologies to improve your experience, analyse website traffic, and keep our services secure. You can accept all cookies or manage your preferences. ' +
                  '<a href="privacy.html">Privacy Policy</a> &nbsp;|&nbsp; <a href="cookie-policy.html">Cookie Policy</a> &nbsp;|&nbsp; <a href="terms.html">Terms of Service</a></p>' +
              '</div>' +
              '<div class="cookie-actions">' +
                '<button type="button" class="btn btn-ghost" data-cookie-manage>Manage Preferences</button>' +
                '<button type="button" class="btn btn-outline" data-cookie-reject>Reject Non-Essential</button>' +
                '<button type="button" class="btn btn-primary" data-cookie-accept>Accept All</button>' +
              '</div>' +
              '<div class="cookie-prefs" data-cookie-prefs hidden>' +
                '<div class="cookie-pref">' +
                  '<div><strong>Strictly necessary cookies</strong><span>Required for the website and secure sign-in to work. Always active.</span></div>' +
                  '<span class="cookie-pref-state">Always on</span>' +
                '</div>' +
                '<div class="cookie-pref">' +
                  '<div><strong>Analytics cookies</strong><span>Help us understand how visitors use the site so we can improve it. Optional — nothing analytics-related loads unless you allow it.</span></div>' +
                  '<span class="cookie-toggle"><input type="checkbox" id="cookieAnalyticsToggle" aria-label="Allow analytics cookies" /><span class="track" aria-hidden="true"></span></span>' +
                '</div>' +
                '<div class="cookie-actions">' +
                  '<button type="button" class="btn btn-primary" data-cookie-save>Save My Choices</button>' +
                '</div>' +
              '</div>' +
            '</div>';
        document.body.appendChild(banner);

        var prefsOpen = false;

        function syncBodyOffset() {
            var height = banner.classList.contains('open') ? banner.offsetHeight : 0;
            document.body.style.setProperty('--cookie-offset', Math.max(0, height - 22) + 'px');
            document.body.classList.toggle('cookie-banner-open', height > 0);
        }

        function openBanner(showPrefs) {
            banner.classList.add('open');
            prefsOpen = !!showPrefs;
            var prefs = banner.querySelector('[data-cookie-prefs]');
            prefs.hidden = !prefsOpen;
            prefs.classList.toggle('open', prefsOpen);
            var manage = banner.querySelector('[data-cookie-manage]');
            manage.textContent = prefsOpen ? 'Hide Preferences' : 'Manage Preferences';
            syncBodyOffset();
        }

        function closeBanner() {
            banner.classList.remove('open');
            document.body.classList.remove('cookie-banner-open');
            syncBodyOffset();
        }

        banner.querySelector('[data-cookie-accept]').addEventListener('click', function () {
            writeConsent('all', true);
            closeBanner();
        });

        banner.querySelector('[data-cookie-reject]').addEventListener('click', function () {
            writeConsent('necessary', false);
            closeBanner();
        });

        banner.querySelector('[data-cookie-manage]').addEventListener('click', function () {
            var prefs = banner.querySelector('[data-cookie-prefs]');
            prefsOpen = !prefsOpen;
            prefs.hidden = !prefsOpen;
            prefs.classList.toggle('open', prefsOpen);
            this.textContent = prefsOpen ? 'Hide Preferences' : 'Manage Preferences';
            var existing = readConsent();
            banner.querySelector('#cookieAnalyticsToggle').checked = existing ? existing.analytics : false;
            syncBodyOffset();
        });

        banner.querySelector('[data-cookie-save]').addEventListener('click', function () {
            var analyticsAllowed = banner.querySelector('#cookieAnalyticsToggle').checked;
            writeConsent(analyticsAllowed ? 'all' : 'necessary', analyticsAllowed);
            closeBanner();
        });

        document.addEventListener('click', function (event) {
            var settings = event.target.closest('[data-cookie-settings]');
            if (!settings) return;
            var existing = readConsent();
            banner.querySelector('#cookieAnalyticsToggle').checked = existing ? existing.analytics : false;
            openBanner(true);
        });

        window.addEventListener('resize', syncBodyOffset);

        if (!readConsent()) {
            window.setTimeout(function () { openBanner(false); }, 700);
        }

        window.SeedwelReopenConsent = function () { openBanner(true); };
    }

    window.SeedwelConsent = {
        get: readConsent,
        open: function () { if (window.SeedwelReopenConsent) window.SeedwelReopenConsent(); }
    };

    /* ─────────── Boot ─────────── */

    function boot() {
        initNav();
        initHeaderScroll();
        initReveal();
        initCounters();
        buildFooter();
        buildWhatsApp();
        buildConsentBanner();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', boot);
    } else {
        boot();
    }
})();
