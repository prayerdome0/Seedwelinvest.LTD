/**
 * Prepares brand and content images for the web.
 *
 *   npx tsx scripts/optimize-images.ts
 *
 * - re-encodes the photography in /public/images at a web-friendly quality
 * - builds logo variants from seedwel.png
 * - builds a default Open Graph image (1200×630)
 */
import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';

const root = process.cwd();
const imagesDir = path.join(root, 'public', 'images');
const FONT = '/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf';
const FONT_BOLD = '/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf';

async function main() {
  /* --------------------------------------------------------------- photos */
  if (fs.existsSync(imagesDir)) {
    for (const file of fs.readdirSync(imagesDir)) {
      if (!/\.(jpe?g|png)$/i.test(file)) continue;
      const target = path.join(imagesDir, file);
      const before = fs.statSync(target).size;
      const out = path.join(imagesDir, file.replace(/\.(jpe?g|png)$/i, '.jpg'));
      await sharp(target)
        .rotate()
        .resize({ width: 1600, withoutEnlargement: true })
        .jpeg({ quality: 78, mozjpeg: true, progressive: true })
        .toFile(out === target ? `${target}.tmp` : out);
      if (out === target) fs.renameSync(`${target}.tmp`, target);
      const after = fs.statSync(out).size;
      console.log(`${path.basename(out)}  ${Math.round(before / 1024)}KB → ${Math.round(after / 1024)}KB`);
    }
  }

  /* ----------------------------------------------------------------- logo */
  const logoSource = path.join(root, 'seedwel.png');
  if (fs.existsSync(logoSource)) {
    for (const [name, size] of [
      ['logo.png', 256],
      ['logo-512.png', 512],
    ] as Array<[string, number]>) {
      await sharp(logoSource).resize(size, size, { fit: 'cover' }).png({ quality: 90, compressionLevel: 9 }).toFile(path.join(root, 'public', name));
      const kb = Math.round(fs.statSync(path.join(root, 'public', name)).size / 1024);
      console.log(`${name} (${size}px) ${kb}KB`);
    }
    // Apple touch icon (opaque, no transparency artefacts)
    await sharp(logoSource)
      .resize(180, 180, { fit: 'cover' })
      .flatten({ background: '#0F172A' })
      .png({ compressionLevel: 9 })
      .toFile(path.join(root, 'public', 'apple-touch-icon.png'));
    console.log('apple-touch-icon.png');
  }

  /* ------------------------------------------------------- Open Graph image */
  const hero = path.join(imagesDir, 'hero-office.jpg');
  if (fs.existsSync(hero) && fs.existsSync(logoSource)) {
    const width = 1200;
    const height = 630;
    const base = await sharp(hero).resize(width, height, { fit: 'cover' }).toBuffer();

    const overlay = Buffer.from(
      `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">
        <defs>
          <linearGradient id="g" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stop-color="#080E1B" stop-opacity="0.95"/>
            <stop offset="0.62" stop-color="#0F172A" stop-opacity="0.82"/>
            <stop offset="1" stop-color="#0F172A" stop-opacity="0.45"/>
          </linearGradient>
        </defs>
        <rect width="${width}" height="${height}" fill="url(#g)"/>
      </svg>`,
    );

    const textBlock = Buffer.from(
      `<svg xmlns="http://www.w3.org/2000/svg" width="${width - 144}" height="340">
        <text x="0" y="58" font-family="DejaVu Sans" font-size="26" fill="#F2CF80" letter-spacing="4">SEEDWEL INVESTMENT LIMITED</text>
        <text x="0" y="148" font-family="DejaVu Sans" font-weight="bold" font-size="62" fill="#ffffff">Building Businesses.</text>
        <text x="0" y="222" font-family="DejaVu Sans" font-weight="bold" font-size="62" fill="#ffffff">Creating Opportunities.</text>
        <text x="0" y="296" font-family="DejaVu Sans" font-weight="bold" font-size="62" fill="#F64A55">Driving Digital Growth.</text>
      </svg>`,
    );

    await sharp(base)
      .composite([
        { input: overlay, top: 0, left: 0 },
        { input: await sharp(logoSource).resize(120, 120).toBuffer(), top: 72, left: 72 },
        { input: textBlock, top: 232, left: 72 },
      ])
      .jpeg({ quality: 82, mozjpeg: true })
      .toFile(path.join(root, 'public', 'og-default.jpg'));
    console.log('og-default.jpg');
  }

  console.log('done');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

// keep references for the linter
void FONT;
void FONT_BOLD;
