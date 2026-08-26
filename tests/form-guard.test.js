// Unit tests for the public-form spam guard (assets/js/form-guard.js).
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

function freshWindow() {
    const dom = new JSDOM('<!DOCTYPE html><body><form id="f"></form></body>', {
        url: 'https://seedwel.ltd/contact',
        runScripts: 'outside-only'
    });
    dom.window.eval(fs.readFileSync(path.join(root, 'assets/js/form-guard.js'), 'utf8'));
    return dom.window;
}

// ─── Honeypot ───────────────────────────────────────────────────────────────
{
    const w = freshWindow();
    const form = w.document.getElementById('f');
    const guard = w.SeedwelFormGuard.protect(form, { key: 'hp', minSeconds: 0 });

    const field = form.querySelector('[data-guard-honeypot] input');
    check('honeypot input is created', Boolean(field));
    check('honeypot is removed from the tab order', field.tabIndex === -1);
    check('honeypot is hidden from assistive tech', field.getAttribute('aria-hidden') === 'true');
    check('honeypot has autocomplete off', field.getAttribute('autocomplete') === 'off');

    check('empty honeypot passes', guard.check({ message: 'A normal enquiry about a website.' }).ok === true);

    field.value = 'bot';
    const verdict = guard.check({ message: 'A normal enquiry about a website.' });
    check('filled honeypot is rejected', verdict.ok === false);
    check('honeypot rejection is silent to the bot', verdict.silent === true);
    check('honeypot rejection gives a generic reason', /could not verify/i.test(verdict.reason));
}

// ─── Timing ─────────────────────────────────────────────────────────────────
{
    const w = freshWindow();
    const form = w.document.getElementById('f');
    const guard = w.SeedwelFormGuard.protect(form, { key: 'time', minSeconds: 5 });

    check('instant submission is rejected', guard.check({ message: 'Hello there, I need a site.' }).ok === false);

    const realNow = w.Date.now;
    w.Date.now = () => realNow() + 10000;
    check('submission after 10s is accepted', guard.check({ message: 'Hello there, I need a site.' }).ok === true);
    w.Date.now = realNow;
}

// ─── Rate limiting ──────────────────────────────────────────────────────────
{
    const w = freshWindow();
    const form = w.document.getElementById('f');
    const guard = w.SeedwelFormGuard.protect(form, { key: 'rate', minSeconds: 0, maxPerWindow: 3 });

    const msg = { message: 'Please quote me for a logo and business cards.' };
    check('1st submission allowed', guard.check(msg).ok === true);
    guard.recordSubmission();
    check('2nd submission allowed', guard.check(msg).ok === true);
    guard.recordSubmission();
    check('3rd submission allowed', guard.check(msg).ok === true);
    guard.recordSubmission();

    const blocked = guard.check(msg);
    check('4th submission is rate limited', blocked.ok === false);
    check('rate-limit message offers WhatsApp instead', /whatsapp/i.test(blocked.reason));
}

// ─── Rate-limit window expiry ───────────────────────────────────────────────
{
    const w = freshWindow();
    const form = w.document.getElementById('f');
    const guard = w.SeedwelFormGuard.protect(form, { key: 'window', minSeconds: 0, maxPerWindow: 1 });

    guard.recordSubmission();
    check('budget is exhausted immediately after use', guard.check({ message: 'hello there' }).ok === false);

    const realNow = w.Date.now;
    w.Date.now = () => realNow() + 2 * 60 * 60 * 1000; // two hours later
    check('budget resets after the window passes', guard.check({ message: 'hello there' }).ok === true);
    w.Date.now = realNow;
}

// ─── Content heuristics ─────────────────────────────────────────────────────
{
    const w = freshWindow();
    const G = w.SeedwelFormGuard;

    check('counts zero links in clean text', G.countLinks('I need a website for my shop.') === 0);
    check('counts http and www links', G.countLinks('see http://a.com and www.b.com') === 2);

    const form = w.document.getElementById('f');
    const guard = G.protect(form, { key: 'content', minSeconds: 0 });

    const linkSpam = 'buy http://a.com http://b.com http://c.com http://d.com now';
    check('link flooding is rejected', guard.check({ message: linkSpam }).ok === false);
    check('three links are still allowed', guard.check({ message: 'refs: http://a.com http://b.com http://c.com' }).ok === true);

    check('repeated-character gibberish is rejected', guard.check({ message: 'aaaaaaaaaaaaaaaaaaaaaa' }).ok === false);
    check('all-caps shouting is rejected', guard.check({
        message: 'BUY CHEAP PRODUCTS RIGHT NOW LIMITED TIME OFFER CLICK HERE TODAY FRIEND'
    }).ok === false);
    check('normal sentence-case text is accepted', guard.check({
        message: 'Hello, I would like a quote for a website and a logo for my business in Kabwe.'
    }).ok === true);
    check('a short ALL CAPS acronym is not treated as shouting', guard.check({
        message: 'I need help with my TPIN and PACRA registration please.'
    }).ok === true);
}

// ─── Isolation between forms ────────────────────────────────────────────────
{
    const w = freshWindow();
    const form = w.document.getElementById('f');
    const a = w.SeedwelFormGuard.protect(form, { key: 'form-a', minSeconds: 0, maxPerWindow: 1 });
    const b = w.SeedwelFormGuard.protect(form, { key: 'form-b', minSeconds: 0, maxPerWindow: 1 });

    a.recordSubmission();
    check('exhausting one form does not block another', b.check({ message: 'hello there' }).ok === true);
}

process.exit(failures ? 1 : 0);
