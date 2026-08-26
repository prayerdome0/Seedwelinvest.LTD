// DOM smoke test for the shared site script (footer, WhatsApp, cookie consent, reveal).
// Requires the dev dependency jsdom; skips automatically when it is unavailable.
const fs = require('fs');
const path = require('path');

let JSDOM;
try { JSDOM = require('jsdom').JSDOM; }
catch (_) { console.log('SKIP: jsdom is not installed (npm install)'); process.exit(0); }

const root = path.join(__dirname, '..');
let failures = 0;
function check(label, condition) {
    if (condition) console.log('PASS:', label);
    else { failures++; console.log('FAIL:', label); }
}

async function loadPage(file) {
    const html = fs.readFileSync(path.join(root, file), 'utf8');
    const dom = new JSDOM(html, {
        runScripts: 'dangerously',
        resources: 'usable',
        url: 'https://seedwel.ltd/' + file,
        pretendToBeVisual: true
    });
    // Inline site.js manually (jsdom won't fetch defer scripts reliably in this setup).
    const siteJs = fs.readFileSync(path.join(root, 'assets/js/site.js'), 'utf8');
    await new Promise((resolve) => {
        if (dom.window.document.readyState === 'complete') resolve();
        else dom.window.addEventListener('load', resolve);
    });
    dom.window.eval(siteJs);
    // Let timers (banner delay) run.
    await new Promise((resolve) => setTimeout(resolve, 900));
    return dom;
}

(async () => {
    const dom = await loadPage('index.html');
    const doc = dom.window.document;

    check('footer injected', Boolean(doc.querySelector('.site-footer')));
    check('footer has all five columns', doc.querySelectorAll('.site-footer .footer-col').length === 4 && Boolean(doc.querySelector('.site-footer .footer-brand')));
    check('footer copyright present', doc.querySelector('.site-footer .footer-bottom').textContent.includes('Seedwel Investment LTD. All rights reserved.'));
    check('footer links: privacy, cookie policy, terms', ['privacy.html', 'cookie-policy.html', 'terms.html'].every((href) => doc.querySelector(`.site-footer a[href="${href}"]`)));
    check('footer services column lists ZRA/NAPSA/PACRA', ['services.html#zra', 'services.html#napsa', 'services.html#pacra'].every((href) => doc.querySelector(`.site-footer a[href="${href}"]`)));
    check('floating WhatsApp injected', Boolean(doc.querySelector('.floating-whatsapp')));
    check('cookie banner injected', Boolean(doc.getElementById('cookieBanner')));

    const banner = doc.getElementById('cookieBanner');
    check('banner opens automatically for new visitor', banner.classList.contains('open'));
    check('banner has Accept All', Boolean(banner.querySelector('[data-cookie-accept]')));
    check('banner has Reject Non-Essential', Boolean(banner.querySelector('[data-cookie-reject]')));
    check('banner has Manage Preferences', Boolean(banner.querySelector('[data-cookie-manage]')));
    check('banner links privacy | cookie | terms', ['privacy.html', 'cookie-policy.html', 'terms.html'].every((href) => banner.querySelector(`a[href="${href}"]`)));

    // Genuine reject choice
    banner.querySelector('[data-cookie-reject]').click();
    await new Promise((r) => setTimeout(r, 50));
    const stored = JSON.parse(dom.window.localStorage.getItem('seedwel.consent.v1') || 'null');
    check('reject stores analytics=false', stored && stored.analytics === false && stored.decision === 'necessary');
    check('banner closes after reject', !banner.classList.contains('open'));

    // Re-open via cookie settings
    doc.querySelector('[data-cookie-settings]').click();
    await new Promise((r) => setTimeout(r, 50));
    check('cookie settings reopens banner', banner.classList.contains('open'));
    check('preferences panel visible', !banner.querySelector('[data-cookie-prefs]').hidden);

    // Accept-all from prefs
    banner.querySelector('[data-cookie-save]').click();
    await new Promise((r) => setTimeout(r, 50));
    const stored2 = JSON.parse(dom.window.localStorage.getItem('seedwel.consent.v1') || 'null');
    check('save stores analytics=false (toggle untouched)', stored2 && stored2.analytics === false);
    banner.querySelector('[data-cookie-accept]').click();
    await new Promise((r) => setTimeout(r, 50));
    const stored3 = JSON.parse(dom.window.localStorage.getItem('seedwel.consent.v1') || 'null');
    check('accept-all stores analytics=true', stored3 && stored3.analytics === true);

    // Reveal: elements should become visible when observed (jsdom IntersectionObserver is missing -> fallback marks visible)
    check('reveal fallback marks elements visible', doc.querySelectorAll('.reveal.visible').length > 0);

    // Consent API
    check('SeedwelConsent API exposed', typeof dom.window.SeedwelConsent.get === 'function');

    process.exit(failures ? 1 : 0);
})().catch((err) => { console.error(err); process.exit(1); });
