const fs = require('fs');
const path = require('path');

const files = process.argv.slice(2);
let failed = false;

for (const file of files) {
    const html = fs.readFileSync(file, 'utf8');
    const blocks = [...html.matchAll(/<script([^>]*)>([\s\S]*?)<\/script>/g)];
    blocks.forEach((match, i) => {
        const attrs = match[1] || '';
        const body = match[2];
        if (/\bsrc\s*=/.test(attrs)) return; // external script
        const typeMatch = attrs.match(/type\s*=\s*["']([^"']+)["']/);
        const type = typeMatch ? typeMatch[1] : 'text/javascript';
        if (type.includes('ld+json') || type.includes('json')) {
            try {
                JSON.parse(body);
                console.log(`${path.basename(file)} script#${i}: JSON-LD OK`);
            } catch (e) {
                failed = true;
                console.log(`${path.basename(file)} script#${i}: JSON ERROR — ${e.message}`);
            }
            return;
        }
        try {
            new Function(body);
            console.log(`${path.basename(file)} script#${i}: JS OK`);
        } catch (e) {
            failed = true;
            console.log(`${path.basename(file)} script#${i}: SYNTAX ERROR — ${e.message}`);
        }
    });
    const open = (html.match(/<section/g) || []).length;
    const close = (html.match(/<\/section>/g) || []).length;
    console.log(`${path.basename(file)}: <section> ${open}/${close} ${open === close ? 'OK' : 'MISMATCH'}`);
}

process.exit(failed ? 1 : 0);
