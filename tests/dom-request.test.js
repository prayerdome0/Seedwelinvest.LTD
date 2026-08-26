// DOM test for request.html service-request submission with a stubbed Firebase client.
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

(async () => {
    const html = fs.readFileSync(path.join(root, 'request.html'), 'utf8');
    const dom = new JSDOM(html, {
        runScripts: 'outside-only',
        url: 'https://seedwel.ltd/request.html?service=website-package',
        pretendToBeVisual: true
    });
    const w = dom.window;

    // Stub Firebase compat API
    const pushes = [];
    const TIMESTAMP = { '.sv': 'timestamp' };
    w.firebase = {
        apps: [],
        initializeApp: function () { return {}; },
        database: function () {
            return {
                ref: function (path) {
                    if (path !== 'serviceRequests') throw new Error('unexpected ref: ' + path);
                    return {
                        push: async function (value) {
                            pushes.push(value);
                            return { key: 'test-' + pushes.length };
                        }
                    };
                }
            };
        }
    };
    w.firebase.database.ServerValue = { TIMESTAMP: TIMESTAMP };

    w.eval(fs.readFileSync(path.join(root, 'assets/js/site.js'), 'utf8'));

    // Run the page's inline script (it waits for DOMContentLoaded).
    const inline = [...html.matchAll(/<script(?![^>]*\bsrc\b)[^>]*>([\s\S]*?)<\/script>/g)].map((m) => m[1]);
    const pageScript = inline.find((s) => s.includes('serviceRequests')) || inline[inline.length - 1];
    w.eval(pageScript);
    await new Promise((r) => setTimeout(r, 120));

    const doc = w.document;
    check('service preselected from ?service=website-package', doc.getElementById('reqService').value === 'website-package');

    // Fill and submit
    doc.getElementById('reqName').value = 'Jane Mwansa';
    doc.getElementById('reqEmail').value = 'jane@example.com';
    doc.getElementById('reqPhone').value = '+260971234567';
    doc.getElementById('reqBusiness').value = 'Mwansa Traders';
    doc.getElementById('reqDetails').value = 'I need help with TPIN registration for my new shop.';
    doc.getElementById('reqConsent').checked = true;

    doc.getElementById('serviceRequestForm').dispatchEvent(new w.Event('submit', { bubbles: true, cancelable: true }));
    await new Promise((r) => setTimeout(r, 100));

    check('exactly one request pushed', pushes.length === 1);
    const req = pushes[0] || {};
    check('status starts as new', req.status === 'new');
    check('service key saved', req.service === 'website-package');
    check('service label saved', req.serviceLabel === 'Website + Branding Package (website, logo, cards & graphics)');
    check('name saved', req.fullName === 'Jane Mwansa');
    check('business name saved', req.businessName === 'Mwansa Traders');
    check('consent recorded', req.consent === true);
    check('server timestamp used', JSON.stringify(req.submittedAt).includes('timestamp'));
    check('success panel shown', !doc.getElementById('formSuccess').hidden);

    process.exit(failures ? 1 : 0);
})().catch((err) => { console.error(err); process.exit(1); });
