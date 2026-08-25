'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const publicPages = [
    'index.html',
    'about.html',
    'services.html',
    'projects.html',
    'apply.html',
    'contact.html',
    'support.html',
    'privacy.html',
    'terms.html'
];

test('public pages load the local AI styles and deferred client once', () => {
    for (const page of publicPages) {
        const html = read(page);
        assert.equal((html.match(/assets\/css\/local-ai\.css/g) || []).length, 1, `${page} should load local AI CSS once`);
        assert.equal((html.match(/assets\/js\/local-ai\.js/g) || []).length, 1, `${page} should load local AI JS once`);
        assert.match(html, /<script src="assets\/js\/local-ai\.js" defer><\/script>/, `${page} should defer local AI startup`);
    }
});

test('local AI uses a pinned browser model and dedicated WebGPU worker', () => {
    const client = read('assets/js/local-ai.js');
    const worker = read('assets/js/local-ai-worker.js');

    assert.match(client, /Qwen2\.5-0\.5B-Instruct-q4f16_1-MLC/);
    assert.match(client, /CreateWebWorkerMLCEngine/);
    assert.match(client, /stream:\s*true/);
    assert.match(client, /'gpu' in navigator/);
    assert.match(worker, /WebWorkerMLCEngineHandler/);
    assert.match(worker, /@mlc-ai\/web-llm@0\.2\.84/);
    assert.doesNotMatch(client, /api\.openai\.com|generativelanguage\.googleapis\.com|api\.anthropic\.com/);
});

test('local AI is opt-in, bounded, locally stored, and safely renders model text', () => {
    const client = read('assets/js/local-ai.js');

    assert.match(client, /Download &amp; start local AI/);
    assert.match(client, /maxlength="\$\{MAX_INPUT_LENGTH\}"/);
    assert.match(client, /sessionStorage\.setItem/);
    assert.match(client, /responseMessage\.bubble\.textContent = answer/);
    assert.match(client, /The model is cached locally after setup/);
});

test('private operations pages do not initialize the public assistant', () => {
    for (const page of ['admin.html', 'dashboard.html', 'login.html', 'verify.html']) {
        assert.doesNotMatch(read(page), /assets\/js\/local-ai\.js/, `${page} should remain free of the public assistant`);
    }
});

test('privacy and terms disclose local model behavior and limitations', () => {
    assert.match(read('privacy.html'), /Local AI assistant/);
    assert.match(read('privacy.html'), /chat content is not sent to Seedwel/i);
    assert.match(read('terms.html'), /answers are automated, may be incomplete or incorrect/i);
});
