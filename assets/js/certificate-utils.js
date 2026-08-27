/**
 * Shared certificate logic for the admin certificate studio.
 *
 * Everything in here is pure: no DOM lookups, no fetches, no globals. Drawing
 * helpers take a CanvasRenderingContext2D-shaped object so they can be exercised
 * in Node tests with a recording stub. The browser controller lives in
 * assets/js/admin-certificates.js and only wires these helpers to the page.
 *
 * Two things are produced by this module:
 *   1. Seedwel-issued certificates (drawCertificate) — our own template, named
 *      for whoever we are issuing to.
 *   2. Reference-library pages (drawSamplePage) — third-party sample images that
 *      are always stamped as samples and never re-named.
 */
(function (global) {
    'use strict';

    var BRAND = Object.freeze({
        accent: '#dc2626',
        accentDark: '#991b1b',
        ink: '#111827',
        slate: '#475569',
        muted: '#6b7280',
        line: '#e5e7eb',
        soft: '#f8fafc',
        paper: '#ffffff'
    });

    var FONTS = Object.freeze({
        display: "'Playfair Display', Georgia, 'Times New Roman', serif",
        sans: "Montserrat, 'Inter', system-ui, sans-serif",
        body: "'Inter', system-ui, -apple-system, sans-serif",
        script: "'Great Vibes', 'Playfair Display', cursive"
    });

    var NAME_STYLES = Object.freeze({
        script: { label: 'Script', font: FONTS.script, tracking: 0, weight: '400' },
        serif: { label: 'Serif', font: FONTS.display, tracking: 0, weight: '700' },
        sans: { label: 'Modern sans', font: FONTS.sans, tracking: 0.06, weight: '800' }
    });

    var AWARD_TYPES = Object.freeze([
        'Certificate of Completion',
        'Certificate of Achievement',
        'Certificate of Participation',
        'Professional Certificate',
        'Letter of Appreciation'
    ]);

    var PAGE_SIZES = Object.freeze({
        a4: { label: 'A4', landscape: [297, 210], portrait: [210, 297] },
        letter: { label: 'US Letter', landscape: [279.4, 215.9], portrait: [215.9, 279.4] }
    });

    var SAMPLE_STAMP = 'REFERENCE SAMPLE — NOT A CREDENTIAL';

    // ---------------------------------------------------------------- helpers

    function clamp(value, min, max) {
        return Math.min(max, Math.max(min, value));
    }

    function round(value, places) {
        var factor = Math.pow(10, places === undefined ? 2 : places);
        return Math.round(value * factor) / factor;
    }

    /** "#dc2626" + 0.4 -> "rgba(220, 38, 38, 0.4)" */
    function withAlpha(hex, alpha) {
        var clean = String(hex || '').replace('#', '');
        if (clean.length === 3) {
            clean = clean.split('').map(function (c) { return c + c; }).join('');
        }
        var int = parseInt(clean, 16);
        if (!isFinite(int)) return hex;
        return 'rgba(' + ((int >> 16) & 255) + ', ' + ((int >> 8) & 255) + ', ' + (int & 255) + ', ' + alpha + ')';
    }

    /** File-system and URL safe name, e.g. "Zacheus Simbaya" -> "Zacheus-Simbaya". */
    function slugify(text, fallback) {
        var slug = String(text || '')
            .normalize('NFKD')
            .replace(/[\u0300-\u036f]/g, '')
            .replace(/[^A-Za-z0-9]+/g, '-')
            .replace(/^-+|-+$/g, '')
            .slice(0, 60);
        return slug || (fallback || 'certificate');
    }

    function pdfFileName(recipient, prefix, extension) {
        var ext = extension || 'pdf';
        var who = slugify(recipient, '');
        var head = prefix || (who ? who + '-Seedwel-Certificates' : 'Seedwel-Certificates');
        return head.replace(/\.[a-z0-9]+$/i, '') + '.' + ext;
    }

    function htmlEscape(text) {
        return String(text === undefined || text === null ? '' : text)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }

    function truncate(text, max) {
        var value = String(text || '');
        return value.length > max ? value.slice(0, max - 1).trimEnd() + '…' : value;
    }

    var MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

    /** "2026-08-27" -> "27 August 2026" (falls back to the raw string). */
    function formatIssueDate(value) {
        if (!value) return '';
        var parts = String(value).slice(0, 10).split('-');
        if (parts.length !== 3) return String(value);
        var day = Number(parts[2]);
        var month = MONTHS[Number(parts[1]) - 1];
        if (!month || !day) return String(value);
        return day + ' ' + month + ' ' + parts[0];
    }

    function todayInputValue(now) {
        var date = now || new Date();
        var month = String(date.getMonth() + 1).padStart(2, '0');
        var day = String(date.getDate()).padStart(2, '0');
        return date.getFullYear() + '-' + month + '-' + day;
    }

    function fnv1a(text) {
        var hash = 0x811c9dc5;
        for (var i = 0; i < text.length; i += 1) {
            hash ^= text.charCodeAt(i);
            hash = (hash + ((hash << 1) + (hash << 4) + (hash << 7) + (hash << 8) + (hash << 24))) >>> 0;
        }
        return hash >>> 0;
    }

    /** Deterministic, human-readable certificate id: SEED-2026-7QK4 */
    function certificateId(seed, now) {
        var date = now || new Date();
        var code = fnv1a(String(seed) + '|' + date.getFullYear()).toString(36).toUpperCase().replace(/[^A-Z0-9]/g, '');
        while (code.length < 4) code += '0';
        return 'SEED-' + date.getFullYear() + '-' + code.slice(0, 4);
    }

    // -------------------------------------------------------------- text fit

    /**
     * Largest font size at which `text` fits `maxWidth`.
     * `measure(text, sizePx)` must return the rendered width — works for a canvas
     * context and for jsPDF's getTextWidth alike.
     */
    function fitFontByWidth(measure, text, maxWidth, maxSize, minSize) {
        var floor = minSize === undefined ? 6 : minSize;
        var size = maxSize;
        while (size > floor && measure(text, size) > maxWidth) {
            size -= Math.max(0.5, size * 0.04);
        }
        return round(size, 1);
    }

    /** Splits a CSS font shorthand into its parts (weight/family are what we re-emit). */
    function fontParts(template) {
        var value = String(template || '');
        var pxMatch = /\d+(?:\.\d+)?px/.exec(value);
        var weightMatch = /(?:^|\s)(\d{3})(?:\s|$)/.exec(value);
        return {
            italic: /\bitalic\b/.test(value),
            weight: weightMatch ? weightMatch[1] : '400',
            family: pxMatch ? value.slice(pxMatch.index + pxMatch[0].length).trim() : 'sans-serif'
        };
    }

    /** Canvas convenience wrapper around fitFontByWidth. */
    function fitFontSize(ctx, text, maxWidth, maxSize, minSize) {
        var parts = fontParts(ctx.font);
        var size = fitFontByWidth(function (value, px) {
            ctx.font = fontString(parts.weight, px, parts.family, parts.italic);
            return measureWidth(ctx, value, 0);
        }, text, maxWidth, maxSize, minSize);
        ctx.font = fontString(parts.weight, size, parts.family, parts.italic);
        return size;
    }

    /** Width of `text` including `tracking` (em units) between characters. */
    function measureWidth(ctx, text, tracking) {
        var base = ctx.measureText(String(text)).width;
        if (!tracking) return base;
        var size = currentFontSize(ctx);
        return base + tracking * size * (String(text).length - 1);
    }

    function currentFontSize(ctx) {
        var match = /(\d+(?:\.\d+)?)px/.exec(ctx.font || '');
        return match ? parseFloat(match[1]) : 16;
    }

    function fontString(weight, size, family, italic) {
        return (italic ? 'italic ' : '') + weight + ' ' + round(size, 1) + 'px ' + family;
    }

    /** Draws `text` at (x, y) with letter-spacing in em units, honouring ctx.textAlign. */
    function drawTracked(ctx, text, x, y, tracking) {
        var value = String(text);
        if (!tracking) { ctx.fillText(value, x, y); return { width: measureWidth(ctx, value, 0) }; }

        var size = currentFontSize(ctx);
        var gap = tracking * size;
        var width = measureWidth(ctx, value, tracking);
        var align = ctx.textAlign || 'left';
        var cursor = align === 'center' ? x - width / 2 : (align === 'right' ? x - width : x);

        for (var i = 0; i < value.length; i += 1) {
            ctx.fillText(value[i], cursor, y);
            cursor += ctx.measureText(value[i]).width + gap;
        }
        return { width: width };
    }

    /** Greedy word wrap; when lines are dropped the last kept line ends with an ellipsis. */
    function wrapText(ctx, text, maxWidth, maxLines) {
        var words = String(text || '').split(/\s+/).filter(Boolean);
        var lines = [];
        var current = '';

        for (var i = 0; i < words.length; i += 1) {
            var candidate = current ? current + ' ' + words[i] : words[i];
            if (!current || measureWidth(ctx, candidate, 0) <= maxWidth) {
                current = candidate;
                continue;
            }
            lines.push(current);
            current = words[i];
        }
        if (current) lines.push(current);

        if (maxLines && lines.length > maxLines) {
            var kept = lines.slice(0, maxLines);
            kept[maxLines - 1] = truncate(kept[maxLines - 1], 88) + ' …';
            return kept;
        }
        return lines;
    }

    // ------------------------------------------------------- page geometry

    /**
     * Works out the page and the rectangle an image should be drawn into.
     * Orientation follows the image so certificates and screenshots both fill
     * the sheet, and `reserveBottomMm` keeps space for a caption.
     */
    function pageFit(imgWidth, imgHeight, options) {
        var opts = options || {};
        var format = PAGE_SIZES[opts.format] ? opts.format : 'a4';
        var margin = opts.marginMm === undefined ? 10 : opts.marginMm;
        var reserve = opts.reserveBottomMm || 0;
        var forceOrientation = opts.orientation;

        var landscape = forceOrientation
            ? forceOrientation === 'landscape'
            : Number(imgWidth) >= Number(imgHeight);
        var dims = landscape ? PAGE_SIZES[format].landscape : PAGE_SIZES[format].portrait;
        var pageW = dims[0];
        var pageH = dims[1];

        var boxW = pageW - margin * 2;
        var boxH = pageH - margin * 2 - reserve;
        var scale = Math.min(boxW / imgWidth, boxH / imgHeight);
        var w = imgWidth * scale;
        var h = imgHeight * scale;

        return {
            format: format,
            orientation: landscape ? 'landscape' : 'portrait',
            pageWidth: pageW,
            pageHeight: pageH,
            margin: margin,
            x: round(margin + (boxW - w) / 2),
            y: round(margin + (boxH - h) / 2),
            width: round(w),
            height: round(h),
            scale: scale
        };
    }

    /** Pixel size to rasterise a page at, e.g. a4 landscape @200dpi -> 2339 x 1654. */
    function renderSize(format, orientation, dpi) {
        var size = PAGE_SIZES[format] || PAGE_SIZES.a4;
        var dims = orientation === 'portrait' ? size.portrait : size.landscape;
        var factor = (dpi || 200) / 25.4;
        return {
            width: Math.round(dims[0] * factor),
            height: Math.round(dims[1] * factor),
            format: size.label,
            orientation: orientation === 'portrait' ? 'portrait' : 'landscape'
        };
    }

    function rule(ctx, x, y, width, colour, lineWidth) {
        ctx.save();
        ctx.strokeStyle = colour;
        ctx.lineWidth = lineWidth || 1;
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x + width, y);
        ctx.stroke();
        ctx.restore();
    }

    // ------------------------------------------------- Seedwel certificate

    /**
     * Draws a Seedwel-branded certificate.
     *
     * data: { recipient, course, awardType, description, issuedOn, certificateId,
     *         signerName, signerRole, company, accent, verifyUrl, nameStyle }
     * size: { width, height } in pixels
     * logo: optional HTMLImageElement-ish object with width/height
     */
    function drawCertificate(ctx, data, size, logo) {
        var w = size.width;
        var h = size.height;
        var accent = data.accent || BRAND.accent;
        var landscape = w >= h;
        var u = w / 1000; // layout unit: 1000 units across the sheet

        ctx.save();
        ctx.fillStyle = BRAND.paper;
        ctx.fillRect(0, 0, w, h);

        // subtle corner wash so the sheet is not flat white
        ctx.fillStyle = withAlpha(accent, 0.05);
        ctx.fillRect(0, 0, w, h * (landscape ? 0.09 : 0.06));
        ctx.fillRect(0, h - h * (landscape ? 0.09 : 0.06), w, h * (landscape ? 0.09 : 0.06));

        // double frame
        var outer = Math.round(u * 26);
        ctx.strokeStyle = accent;
        ctx.lineWidth = Math.max(2, Math.round(u * 4));
        ctx.strokeRect(outer, outer, w - outer * 2, h - outer * 2);
        var inner = outer + Math.round(u * 12);
        ctx.strokeStyle = withAlpha(accent, 0.4);
        ctx.lineWidth = Math.max(1, Math.round(u * 1.2));
        ctx.strokeRect(inner, inner, w - inner * 2, h - inner * 2);

        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        var footerTop = h - (landscape ? h * 0.17 : h * 0.12);

        var top = landscape ? h * 0.155 : h * 0.1;
        if (logo && logo.width) {
            var logoH = Math.round(h * (landscape ? 0.1 : 0.075));
            var logoW = Math.round(logoH * (logo.width / logo.height));
            ctx.drawImage(logo, (w - logoW) / 2, top - logoH - h * 0.015, logoW, logoH);
        }

        // company line (letter-spaced, always fits)
        var companyText = String(data.company || 'SEEDWEL INVESTMENT LTD').toUpperCase();
        ctx.fillStyle = accent;
        var companySize = fitFontByWidth(function (value, px) {
            ctx.font = fontString('700', px, FONTS.sans);
            return measureWidth(ctx, value, 0.24);
        }, companyText, w * 0.82, u * 22, u * 12);
        ctx.font = fontString('700', companySize, FONTS.sans);
        drawTracked(ctx, companyText, w / 2, top, 0.24);

        // award title (letter-spaced, always fits)
        var awardText = String(data.awardType || AWARD_TYPES[0]).toUpperCase();
        ctx.fillStyle = BRAND.ink;
        var titleSize = fitFontByWidth(function (value, px) {
            ctx.font = fontString('700', px, FONTS.display);
            return measureWidth(ctx, value, 0.05);
        }, awardText, w * 0.86, u * 52, u * 22);
        ctx.font = fontString('700', titleSize, FONTS.display);
        var titleY = top + u * 78;
        drawTracked(ctx, awardText, w / 2, titleY, 0.05);

        rule(ctx, w / 2 - u * 90, titleY + u * 42, u * 180, accent, Math.max(2, u * 2.4));

        // preamble
        ctx.fillStyle = BRAND.slate;
        ctx.font = fontString('400', u * 20, FONTS.body, true);
        ctx.fillText('This is to certify that', w / 2, titleY + u * 86);

        // recipient name (fitted to the sheet width)
        var style = NAME_STYLES[data.nameStyle] || NAME_STYLES.script;
        var nameMaxSize = data.nameStyle === 'script' ? u * 96 : u * 62;
        ctx.fillStyle = BRAND.ink;
        var nameSize = fitFontByWidth(function (value, px) {
            ctx.font = fontString(style.weight, px, style.font);
            return measureWidth(ctx, value, style.tracking);
        }, String(data.recipient || ''), w * 0.72, nameMaxSize, u * 26);
        ctx.font = fontString(style.weight, nameSize, style.font);
        var nameY = titleY + u * 150;
        drawTracked(ctx, String(data.recipient || ''), w / 2, nameY, style.tracking);

        var nameRuleW = Math.min(w * 0.62, measureWidth(ctx, String(data.recipient || ''), style.tracking) + u * 90);
        rule(ctx, w / 2 - nameRuleW / 2, nameY + u * 50, nameRuleW, BRAND.line, Math.max(1, u * 1.4));

        // course
        ctx.fillStyle = BRAND.slate;
        ctx.font = fontString('400', u * 20, FONTS.body);
        ctx.fillText('has successfully completed', w / 2, nameY + u * 92);

        ctx.fillStyle = BRAND.ink;
        ctx.font = fontString('700', u * 34, FONTS.sans);
        var courseLines = wrapText(ctx, String(data.course || ''), w * 0.7, 2);
        var courseY = nameY + u * 136;
        courseLines.forEach(function (line, index) {
            ctx.fillText(line, w / 2, courseY + index * u * 40);
        });

        // description (kept clear of the footer blocks)
        if (data.description) {
            ctx.fillStyle = BRAND.muted;
            ctx.font = fontString('400', u * 17, FONTS.body);
            var descY = courseY + courseLines.length * u * 40 + u * 12;
            var descLines = wrapText(ctx, String(data.description), w * 0.66, landscape ? 2 : 3);
            while (descLines.length && descY + descLines.length * u * 26 > footerTop - u * 8) {
                descLines.pop();
                if (descLines.length) descLines[descLines.length - 1] = truncate(descLines[descLines.length - 1], 88) + ' …';
            }
            descLines.forEach(function (line, index) {
                ctx.fillText(line, w / 2, descY + index * u * 26);
            });
        }

        // footer blocks: issued on / id / signature
        var footerY = footerTop;
        var leftX = landscape ? w * 0.22 : w * 0.3;
        var rightX = landscape ? w * 0.78 : w * 0.7;

        ctx.textAlign = 'center';
        ctx.fillStyle = BRAND.muted;
        ctx.font = fontString('600', u * 13, FONTS.sans);
        drawTracked(ctx, 'ISSUED ON', leftX, footerY - u * 26, 0.16);
        ctx.fillStyle = BRAND.ink;
        ctx.font = fontString('600', u * 20, FONTS.body);
        ctx.fillText(formatIssueDate(data.issuedOn), leftX, footerY);
        rule(ctx, leftX - u * 90, footerY + u * 22, u * 180, BRAND.line, Math.max(1, u * 1.2));

        ctx.fillStyle = BRAND.muted;
        ctx.font = fontString('600', u * 13, FONTS.sans);
        drawTracked(ctx, 'CERTIFICATE ID', rightX, footerY - u * 46, 0.16);

        var sigLineW = u * 200;
        rule(ctx, rightX - sigLineW / 2, footerY - u * 22, sigLineW, BRAND.ink, Math.max(1, u * 1.6));
        ctx.fillStyle = BRAND.ink;
        var signerSize = fitFontByWidth(function (value, px) {
            ctx.font = fontString('400', px, FONTS.script);
            return measureWidth(ctx, value, 0);
        }, String(data.signerName || ''), w * 0.28, u * 34, u * 14);
        ctx.font = fontString('400', signerSize, FONTS.script);
        ctx.fillText(String(data.signerName || ''), rightX, footerY + u * 12);
        ctx.fillStyle = BRAND.muted;
        ctx.font = fontString('500', u * 14, FONTS.body);
        ctx.fillText(String(data.signerRole || ''), rightX, footerY + u * 40);
        ctx.font = fontString('700', u * 15, FONTS.sans);
        ctx.fillStyle = accent;
        ctx.fillText(String(data.certificateId || ''), rightX, footerY - u * 30);

        // verification strip
        var verify = String(data.verifyUrl || '');
        if (verify) {
            ctx.fillStyle = BRAND.muted;
            ctx.font = fontString('500', u * 13, FONTS.body);
            ctx.textAlign = 'center';
            ctx.fillText('Verify this certificate at ' + verify + '  ·  ID ' + String(data.certificateId || ''), w / 2, h - (landscape ? h * 0.055 : h * 0.04));
        }

        ctx.restore();
        return { width: w, height: h };
    }

    // -------------------------------------------------- reference library

    /**
     * Layout plan (in millimetres) for one reference-library page. Both the
     * canvas renderer and the PDF writer read this, so a single download and a
     * bundled PDF page always look the same.
     */
    function samplePagePlan(item, imgWidth, imgHeight, options) {
        var opts = options || {};
        var format = PAGE_SIZES[opts.format] ? opts.format : 'a4';
        var orientation = opts.orientation === 'landscape' ? 'landscape' : 'portrait';
        var margin = opts.marginMm === undefined ? 12 : opts.marginMm;
        var captionMm = opts.captionMm || 26;

        var fit = pageFit(imgWidth, imgHeight, {
            format: format,
            orientation: orientation,
            marginMm: margin,
            reserveBottomMm: captionMm
        });

        var captionY = fit.pageHeight - margin - captionMm + 8;

        return {
            format: format,
            orientation: orientation,
            pageWidth: fit.pageWidth,
            pageHeight: fit.pageHeight,
            margin: margin,
            captionMm: captionMm,
            image: fit,
            caption: {
                x: margin,
                y: captionY,
                provider: truncate(item.provider || 'Provider', 70),
                credential: truncate(item.credential || 'AI credential sample', 110),
                source: truncate(item.sourceUrl || 'no public source recorded', 120),
                statusLabel: String(item.statusLabel || '').toUpperCase(),
                status: item.status === 'sample' ? 'sample' : 'verified',
                numberLabel: 'Sample #' + (item.number || '')
            },
            stamp: {
                text: SAMPLE_STAMP,
                x: round(fit.pageWidth / 2),
                y: round(fit.y + fit.height / 2),
                angle: -20,
                size: round(fit.pageWidth / 7.5)
            }
        };
    }

    /**
     * Renders a reference-library page onto a canvas (used for single-image
     * downloads and the on-screen preview).
     *
     * The original holder's details are never altered — the stamp exists so the
     * image cannot be passed off as a certificate belonging to anyone at Seedwel.
     */
    function drawSamplePage(ctx, image, item, size, plan) {
        var layout = plan || samplePagePlan(item, image.width, image.height);
        var w = size.width;
        var h = size.height;
        var k = w / layout.pageWidth; // mm -> px
        var rect = layout.image;

        ctx.save();
        ctx.fillStyle = BRAND.paper;
        ctx.fillRect(0, 0, w, h);

        var drawX = rect.x * k;
        var drawY = rect.y * k;
        var drawW = rect.width * k;
        var drawH = rect.height * k;

        ctx.fillStyle = BRAND.soft;
        ctx.fillRect(drawX, drawY, drawW, drawH);
        ctx.drawImage(image, drawX, drawY, drawW, drawH);
        ctx.strokeStyle = BRAND.line;
        ctx.lineWidth = Math.max(1, Math.round(w / 1200));
        ctx.strokeRect(drawX, drawY, drawW, drawH);

        // diagonal stamp across the image
        ctx.save();
        ctx.translate(layout.stamp.x * k, layout.stamp.y * k);
        ctx.rotate((layout.stamp.angle * Math.PI) / 180);
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.globalAlpha = 0.45;
        ctx.fillStyle = BRAND.accent;
        fitFontSize(ctx, layout.stamp.text, drawW * 0.92, layout.stamp.size * k, 8 * k);
        ctx.fillText(layout.stamp.text, 0, 0);
        ctx.globalAlpha = 1;
        ctx.restore();

        // caption
        var caption = layout.caption;
        var padX = caption.x * k;
        var bandY = caption.y * k;
        rule(ctx, padX, bandY - 8 * k, (layout.pageWidth - layout.margin * 2) * k, BRAND.line, Math.max(1, Math.round(w / 1200)));

        ctx.textAlign = 'left';
        ctx.textBaseline = 'alphabetic';
        ctx.fillStyle = BRAND.ink;
        ctx.font = fontString('700', 5 * k, FONTS.sans);
        ctx.fillText(caption.provider, padX, bandY + 5 * k);

        ctx.fillStyle = BRAND.muted;
        ctx.font = fontString('500', 3.4 * k, FONTS.body);
        ctx.fillText(caption.credential, padX, bandY + 11 * k);
        ctx.fillText(caption.source, padX, bandY + 16.5 * k);

        ctx.textAlign = 'right';
        ctx.fillStyle = caption.status === 'verified' ? '#166534' : '#92400e';
        ctx.font = fontString('700', 3.4 * k, FONTS.sans);
        ctx.fillText(caption.statusLabel, (layout.pageWidth - layout.margin) * k, bandY + 5 * k);
        ctx.fillStyle = BRAND.muted;
        ctx.font = fontString('500', 3.2 * k, FONTS.body);
        ctx.fillText(caption.numberLabel, (layout.pageWidth - layout.margin) * k, bandY + 11 * k);

        ctx.restore();
        return {
            width: w,
            height: h,
            imageRect: { x: round(drawX), y: round(drawY), width: round(drawW), height: round(drawH) }
        };
    }

    // ------------------------------------------------- your own certificates

    /**
     * Layout plan for a page holding a certificate file the admin uploaded
     * themselves. The image is never altered — it already carries the holder's
     * name — and an optional caption records what it is.
     */
    function ownedPagePlan(item, imgWidth, imgHeight, options) {
        var opts = options || {};
        var format = PAGE_SIZES[opts.format] ? opts.format : 'a4';
        var margin = opts.marginMm === undefined ? 12 : opts.marginMm;
        var hasCaption = Boolean((item.label || '').trim() || (item.meta || '').trim());
        var captionMm = hasCaption ? (opts.captionMm || 20) : 0;

        var fit = pageFit(imgWidth, imgHeight, {
            format: format,
            marginMm: margin,
            reserveBottomMm: captionMm
        });

        return {
            format: format,
            orientation: fit.orientation,
            pageWidth: fit.pageWidth,
            pageHeight: fit.pageHeight,
            margin: margin,
            captionMm: captionMm,
            image: fit,
            caption: {
                x: margin,
                y: fit.pageHeight - margin - captionMm + 8,
                label: truncate((item.label || '').trim(), 90),
                meta: truncate((item.meta || '').trim(), 110)
            }
        };
    }

    /** Renders one uploaded certificate onto a canvas (single-page download). */
    function drawOwnedPage(ctx, image, item, size, plan) {
        var layout = plan || ownedPagePlan(item, image.width, image.height);
        var w = size.width;
        var h = size.height;
        var k = w / layout.pageWidth;
        var rect = layout.image;

        ctx.save();
        ctx.fillStyle = BRAND.paper;
        ctx.fillRect(0, 0, w, h);

        var drawX = rect.x * k;
        var drawY = rect.y * k;
        var drawW = rect.width * k;
        var drawH = rect.height * k;
        ctx.drawImage(image, drawX, drawY, drawW, drawH);
        ctx.strokeStyle = BRAND.line;
        ctx.lineWidth = Math.max(1, Math.round(w / 1400));
        ctx.strokeRect(drawX, drawY, drawW, drawH);

        if (layout.captionMm) {
            var caption = layout.caption;
            ctx.textAlign = 'left';
            ctx.textBaseline = 'alphabetic';
            ctx.fillStyle = BRAND.ink;
            ctx.font = fontString('700', 4.6 * k, FONTS.sans);
            ctx.fillText(caption.label, caption.x * k, caption.y * k + 4.6 * k);
            if (caption.meta) {
                ctx.fillStyle = BRAND.muted;
                ctx.font = fontString('500', 3.2 * k, FONTS.body);
                ctx.fillText(caption.meta, caption.x * k, caption.y * k + 11 * k);
            }
        }

        ctx.restore();
        return { width: w, height: h, imageRect: { x: round(drawX), y: round(drawY), width: round(drawW), height: round(drawH) } };
    }

    // --------------------------------------------------------- cover page

    /**
     * Title page for a bundled PDF.
     * data: { eyebrow, title, subtitle, lines: [string], note, footer, accent }
     */
    function drawCoverPage(ctx, data, size) {
        var w = size.width;
        var h = size.height;
        var accent = data.accent || BRAND.accent;
        var u = w / 1000;

        ctx.save();
        ctx.fillStyle = BRAND.paper;
        ctx.fillRect(0, 0, w, h);

        ctx.fillStyle = accent;
        ctx.fillRect(0, 0, w, h * 0.012);
        ctx.fillRect(0, h - h * 0.012, w, h * 0.012);

        var x = w * 0.1;
        var y = h * 0.22;

        ctx.textAlign = 'left';
        ctx.textBaseline = 'alphabetic';

        if (data.eyebrow) {
            ctx.fillStyle = accent;
            ctx.font = fontString('700', u * 20, FONTS.sans);
            drawTracked(ctx, String(data.eyebrow).toUpperCase(), x, y, 0.22);
            y += u * 46;
        }

        ctx.fillStyle = BRAND.ink;
        ctx.font = fontString('700', u * 62, FONTS.display);
        var titleLines = wrapText(ctx, String(data.title || ''), w * 0.8, 3);
        titleLines.forEach(function (line, index) {
            ctx.fillText(line, x, y + index * u * 72);
        });
        y += titleLines.length * u * 72;

        if (data.subtitle) {
            ctx.fillStyle = BRAND.slate;
            ctx.font = fontString('400', u * 24, FONTS.body);
            var subtitleLines = wrapText(ctx, String(data.subtitle), w * 0.76, 3);
            subtitleLines.forEach(function (line, index) {
                ctx.fillText(line, x, y + u * 20 + index * u * 34);
            });
            y += u * 20 + subtitleLines.length * u * 34;
        }

        rule(ctx, x, y + u * 20, u * 160, accent, Math.max(2, u * 3));
        y += u * 70;

        var lines = Array.isArray(data.lines) ? data.lines.filter(Boolean) : [];
        lines.forEach(function (line, index) {
            var split = String(line).split('::');
            var label = split.length > 1 ? split[0].trim() : '';
            var value = split.length > 1 ? split.slice(1).join('::').trim() : String(line);

            if (label) {
                ctx.fillStyle = BRAND.muted;
                ctx.font = fontString('600', u * 15, FONTS.sans);
                drawTracked(ctx, label.toUpperCase(), x, y + index * u * 42, 0.14);
            }
            ctx.fillStyle = BRAND.ink;
            ctx.font = fontString('600', u * 24, FONTS.body);
            ctx.fillText(truncate(value, 90), x + (label ? u * 150 : 0), y + index * u * 42);
        });
        y += lines.length * u * 42 + u * 30;

        if (data.note) {
            ctx.fillStyle = withAlpha(accent, 0.08);
            ctx.fillRect(x, y, w * 0.8, u * 92);
            ctx.fillStyle = BRAND.slate;
            ctx.font = fontString('400', u * 17, FONTS.body);
            var noteLines = wrapText(ctx, String(data.note), w * 0.72, 4);
            noteLines.forEach(function (line, index) {
                ctx.fillText(line, x + u * 24, y + u * 34 + index * u * 26);
            });
            y += u * 92 + u * 40;
        }

        if (data.footer) {
            ctx.fillStyle = BRAND.muted;
            ctx.font = fontString('500', u * 15, FONTS.body);
            ctx.fillText(String(data.footer), x, h * 0.92);
        }

        ctx.restore();
        return { width: w, height: h };
    }

    // ------------------------------------------------------------ manifest

    /** Normalises and validates a manifest payload fetched from /assets/certificates/manifest.json. */
    function normaliseManifest(payload) {
        var items = Array.isArray(payload && payload.items) ? payload.items : [];
        var clean = items
            .filter(function (item) { return item && item.image; })
            .map(function (item) {
                return {
                    number: Number(item.number) || 0,
                    provider: String(item.provider || 'Unknown provider'),
                    credential: String(item.credential || ''),
                    status: item.status === 'sample' ? 'sample' : 'verified',
                    statusLabel: String(item.statusLabel || ''),
                    image: String(item.image),
                    slug: String(item.slug || slugify(item.provider)),
                    sourceUrl: /^https?:\/\//i.test(String(item.sourceUrl || '')) ? String(item.sourceUrl) : ''
                };
            })
            .sort(function (a, b) { return a.number - b.number; });

        return {
            generatedAt: (payload && payload.generatedAt) || '',
            total: clean.length,
            counts: {
                verified: clean.filter(function (item) { return item.status === 'verified'; }).length,
                sample: clean.filter(function (item) { return item.status === 'sample'; }).length
            },
            items: clean
        };
    }

    function filterItems(items, query, status) {
        var needle = String(query || '').trim().toLowerCase();
        return items.filter(function (item) {
            if (status && status !== 'all' && item.status !== status) return false;
            if (!needle) return true;
            return (item.provider + ' ' + item.credential + ' ' + item.slug).toLowerCase().indexOf(needle) !== -1;
        });
    }

    var api = {
        AWARD_TYPES: AWARD_TYPES,
        BRAND: BRAND,
        FONTS: FONTS,
        NAME_STYLES: NAME_STYLES,
        PAGE_SIZES: PAGE_SIZES,
        SAMPLE_STAMP: SAMPLE_STAMP,
        certificateId: certificateId,
        clamp: clamp,
        drawCertificate: drawCertificate,
        drawCoverPage: drawCoverPage,
        drawSamplePage: drawSamplePage,
        drawTracked: drawTracked,
        filterItems: filterItems,
        fitFontByWidth: fitFontByWidth,
        fitFontSize: fitFontSize,
        fontParts: fontParts,
        fontString: fontString,
        formatIssueDate: formatIssueDate,
        htmlEscape: htmlEscape,
        measureWidth: measureWidth,
        normaliseManifest: normaliseManifest,
        ownedPagePlan: ownedPagePlan,
        drawOwnedPage: drawOwnedPage,
        pageFit: pageFit,
        pdfFileName: pdfFileName,
        renderSize: renderSize,
        round: round,
        samplePagePlan: samplePagePlan,
        slugify: slugify,
        todayInputValue: todayInputValue,
        truncate: truncate,
        withAlpha: withAlpha,
        wrapText: wrapText
    };

    global.SeedwelCertificates = api;

    if (typeof module !== 'undefined' && module.exports) {
        module.exports = api;
    }
})(typeof window !== 'undefined' ? window : globalThis);
