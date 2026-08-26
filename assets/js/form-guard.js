/* ============================================================
   Seedwel Investment LTD — public form spam protection
   ------------------------------------------------------------
   Layered, privacy-friendly bot defence for the public forms
   (contact, service request and job application). No third-party
   CAPTCHA, no tracking, nothing sent anywhere extra.

   Layers:
     1. Honeypot  — a hidden field real people never fill in.
     2. Timing    — submissions faster than a human can read.
     3. Rate limit— per-browser submission budget in localStorage.
     4. Content   — link flooding and gibberish heuristics.

   Usage:
       var guard = SeedwelFormGuard.protect(formEl, { key: 'contact' });
       ...
       var verdict = guard.check({ message: text });
       if (!verdict.ok) { showError(verdict.reason); return; }
       ...on success:
       guard.recordSubmission();
   ============================================================ */
(function (global) {
    'use strict';

    var MIN_SECONDS = 4;            // humans need at least this long
    var MAX_PER_WINDOW = 5;         // submissions allowed per window
    var WINDOW_MS = 60 * 60 * 1000; // one hour
    var MAX_LINKS = 3;              // links tolerated in a free-text field
    var STORE_PREFIX = 'seedwel.formguard.';

    var GENERIC_ERROR = 'We could not verify this submission. Please refresh the page and try again.';
    var RATE_ERROR = 'You have sent several submissions already. Please wait a little while, or reach us on WhatsApp: +260 973 028 342.';
    var SPEED_ERROR = 'That was submitted very quickly. Please take a moment to review your details and try again.';
    var LINK_ERROR = 'Your message contains too many links. Please describe what you need in your own words.';

    function now() { return Date.now(); }

    function readHistory(key) {
        try {
            var raw = global.localStorage.getItem(STORE_PREFIX + key);
            if (!raw) return [];
            var parsed = JSON.parse(raw);
            if (!Array.isArray(parsed)) return [];
            return parsed.filter(function (t) { return typeof t === 'number' && now() - t < WINDOW_MS; });
        } catch (_) {
            return [];
        }
    }

    function writeHistory(key, list) {
        try {
            global.localStorage.setItem(STORE_PREFIX + key, JSON.stringify(list));
        } catch (_) { /* private mode — rate limiting simply degrades */ }
    }

    /** Injects the honeypot field. Hidden from sight AND from assistive tech. */
    function addHoneypot(form, key) {
        var wrap = form.querySelector('[data-guard-honeypot]');
        if (wrap) return wrap.querySelector('input');

        wrap = document.createElement('div');
        wrap.setAttribute('data-guard-honeypot', '');
        wrap.setAttribute('aria-hidden', 'true');
        // Off-screen rather than display:none — some bots skip hidden inputs.
        wrap.style.cssText =
            'position:absolute!important;left:-9999px!important;top:auto!important;' +
            'width:1px!important;height:1px!important;overflow:hidden!important;';

        var label = document.createElement('label');
        label.setAttribute('for', 'sw-website-' + key);
        label.textContent = 'Leave this field empty';

        var input = document.createElement('input');
        input.type = 'text';
        input.id = 'sw-website-' + key;
        input.name = 'website_url';
        input.tabIndex = -1;
        input.autocomplete = 'off';
        input.setAttribute('aria-hidden', 'true');

        wrap.appendChild(label);
        wrap.appendChild(input);
        form.appendChild(wrap);
        return input;
    }

    function countLinks(text) {
        if (!text) return 0;
        var matches = String(text).match(/(https?:\/\/|www\.)\S+/gi);
        return matches ? matches.length : 0;
    }

    function looksLikeSpam(text) {
        if (!text) return false;
        var value = String(text);
        // A long run of a single character, e.g. "aaaaaaaaaaaaaaa".
        if (/(.)\1{14,}/.test(value)) return true;
        // Shouting with no lower-case at all, in a reasonably long message.
        if (value.length > 60 && value === value.toUpperCase() && /[A-Z]/.test(value)) return true;
        return false;
    }

    function protect(form, options) {
        options = options || {};
        var key = options.key || form.id || 'form';
        var minSeconds = typeof options.minSeconds === 'number' ? options.minSeconds : MIN_SECONDS;
        var maxPerWindow = typeof options.maxPerWindow === 'number' ? options.maxPerWindow : MAX_PER_WINDOW;

        var honeypot = form ? addHoneypot(form, key) : null;
        var loadedAt = now();

        return {
            /**
             * Runs every guard layer.
             * @param {{message?: string}} payload free-text to inspect
             * @returns {{ok: boolean, reason?: string, silent?: boolean}}
             */
            check: function (payload) {
                payload = payload || {};

                // 1. Honeypot — only a bot fills this.
                if (honeypot && honeypot.value.trim() !== '') {
                    return { ok: false, reason: GENERIC_ERROR, silent: true };
                }

                // 2. Timing.
                if ((now() - loadedAt) < minSeconds * 1000) {
                    return { ok: false, reason: SPEED_ERROR };
                }

                // 3. Rate limit.
                var history = readHistory(key);
                if (history.length >= maxPerWindow) {
                    return { ok: false, reason: RATE_ERROR };
                }

                // 4. Content heuristics.
                if (countLinks(payload.message) > MAX_LINKS) {
                    return { ok: false, reason: LINK_ERROR };
                }
                if (looksLikeSpam(payload.message)) {
                    return { ok: false, reason: 'Please describe your enquiry in normal sentences so we can help properly.' };
                }

                return { ok: true };
            },

            /** Call after a submission actually succeeds. */
            recordSubmission: function () {
                var history = readHistory(key);
                history.push(now());
                writeHistory(key, history);
            },

            /** Exposed for tests. */
            _internals: { countLinks: countLinks, looksLikeSpam: looksLikeSpam }
        };
    }

    global.SeedwelFormGuard = {
        protect: protect,
        countLinks: countLinks,
        looksLikeSpam: looksLikeSpam,
        MIN_SECONDS: MIN_SECONDS,
        MAX_PER_WINDOW: MAX_PER_WINDOW
    };
})(typeof window !== 'undefined' ? window : globalThis);

if (typeof module !== 'undefined' && module.exports) {
    module.exports = (typeof window !== 'undefined' ? window : globalThis).SeedwelFormGuard;
}
