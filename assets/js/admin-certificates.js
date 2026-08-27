/**
 * Admin certificate studio controller (/admin/certificates).
 *
 * Two workspaces share this page:
 *   1. "Issue certificate" — fills in the Seedwel certificate template, keeps a
 *      list of issued certificates in this browser, and downloads one as
 *      PNG/PDF or the whole list as a single combined PDF.
 *   2. "Reference library" — the 167 third-party sample images from
 *      assets/certificates, each stamped as a sample, downloadable individually
 *      or bundled into one combined PDF.
 *
 * Layout maths lives in assets/js/certificate-utils.js; PDF assembly uses the
 * vendored jsPDF build in assets/js/vendor/jspdf.umd.min.js (same-origin, so it
 * is allowed by the site CSP and works offline).
 */
(function (global) {
    'use strict';

    var C = global.SeedwelCertificates;

    var MANIFEST_URL = '/assets/certificates/manifest.json';
    var LOGO_URL = '/seedwel.png';
    var ISSUED_KEY = 'seedwel.certificates.issued';
    var MAX_ISSUED = 60;

    var DEFAULTS = Object.freeze({
        recipient: 'Zacheus Simbaya',
        course: 'AI & Automation Fundamentals',
        awardType: 'Certificate of Completion',
        description: 'Completed the supervised practical programme, including the final assessment.',
        signerName: 'Zacheus Simbaya',
        signerRole: 'Founder & Lead Digital Strategist',
        company: 'SEEDWEL INVESTMENT LTD',
        verifyUrl: 'seedwel.ltd/verify',
        accent: '#dc2626',
        format: 'a4',
        orientation: 'landscape',
        nameStyle: 'script'
    });

    var state = {
        manifest: { items: [], counts: { verified: 0, sample: 0 }, total: 0 },
        items: [],
        visible: [],
        selected: {},
        previewItem: null,
        logo: null,
        issued: [],
        owned: [],
        busy: false
    };

    // ------------------------------------------------------------------ dom

    function $(id) { return document.getElementById(id); }

    function on(element, event, handler) {
        if (element) element.addEventListener(event, handler);
    }

    function debounce(fn, wait) {
        var timer = null;
        return function () {
            var args = arguments;
            clearTimeout(timer);
            timer = setTimeout(function () { fn.apply(null, args); }, wait);
        };
    }

    function text(id, value) {
        var el = $(id);
        if (el) el.textContent = value;
    }

    function setMessage(message, tone) {
        var el = $('pageMessage');
        if (!el) return;
        el.className = 'msg' + (tone ? ' ' + tone : '');
        el.textContent = message || '';
        el.style.display = message ? 'block' : 'none';
    }

    function setBusy(busy, label) {
        state.busy = busy;
        var bar = $('workProgress');
        var copy = $('workProgressText');
        document.querySelectorAll('[data-busy-lock]').forEach(function (button) {
            button.disabled = busy;
        });
        if (bar) {
            bar.hidden = !busy;
            var fill = $('workProgressBar');
            if (fill) fill.style.width = '0%';
        }
        if (copy) copy.textContent = label || '';
    }

    function setProgress(done, total, label) {
        var fill = $('workProgressBar');
        if (fill && total) fill.style.width = Math.round((done / total) * 100) + '%';
        text('workProgressText', label || '');
    }

    function downloadBlob(blob, filename) {
        var url = URL.createObjectURL(blob);
        var link = document.createElement('a');
        link.href = url;
        link.download = filename;
        link.rel = 'noopener';
        document.body.appendChild(link);
        link.click();
        link.remove();
        setTimeout(function () { URL.revokeObjectURL(url); }, 30000);
    }

    function loadImage(src) {
        return new Promise(function (resolve, reject) {
            var image = new Image();
            image.onload = function () { resolve(image); };
            image.onerror = function () { reject(new Error('Could not load ' + src)); };
            image.src = src;
        });
    }

    function makeCanvas(width, height) {
        var canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        return canvas;
    }

    function toBlob(canvas, type, quality) {
        return new Promise(function (resolve, reject) {
            canvas.toBlob(function (blob) {
                if (blob) resolve(blob);
                else reject(new Error('The browser could not encode that image.'));
            }, type || 'image/png', quality);
        });
    }

    function yieldToBrowser() {
        return new Promise(function (resolve) { setTimeout(resolve, 0); });
    }

    function today() { return C.todayInputValue(new Date()); }

    function stampDate() { return C.formatIssueDate(today()); }

    // ------------------------------------------------------------------ pdf

    function pdfConstructor() {
        var ctor = (global.jspdf && global.jspdf.jsPDF) || global.jsPDF;
        if (!ctor) throw new Error('The PDF library did not load. Reload the page and try again.');
        return ctor;
    }

    /**
     * Builds a single PDF from page descriptors.
     * page = { format: [widthMm, heightMm], orientation, render: function (doc) {} }
     */
    function buildPdf(pages, properties) {
        if (!pages.length) throw new Error('There is nothing to put in the PDF yet.');
        var Ctor = pdfConstructor();
        var doc = new Ctor({
            orientation: pages[0].orientation,
            unit: 'mm',
            format: pages[0].format,
            compress: true
        });

        pages.forEach(function (page, index) {
            if (index > 0) doc.addPage(page.format, page.orientation);
            page.render(doc);
        });

        if (properties) {
            doc.setProperties({
                title: properties.title || 'Seedwel certificates',
                author: properties.author || DEFAULTS.company,
                subject: properties.subject || '',
                creator: 'Seedwel admin certificate studio'
            });
        }
        return doc.output('blob');
    }

    /** Full-bleed page from an already-rendered canvas (certificates, cover pages). */
    function canvasPage(canvas, format, orientation, quality) {
        var dims = C.PAGE_SIZES[format] ? C.PAGE_SIZES[format] : C.PAGE_SIZES.a4;
        var size = orientation === 'portrait' ? dims.portrait : dims.landscape;
        var dataUrl = canvas.toDataURL('image/jpeg', quality === undefined ? 0.92 : quality);
        return {
            format: [size[0], size[1]],
            orientation: orientation === 'portrait' ? 'portrait' : 'landscape',
            render: function (doc) {
                doc.addImage(dataUrl, 'JPEG', 0, 0, size[0], size[1], undefined, 'FAST');
            }
        };
    }

    /**
     * One reference-library page: the untouched sample image, a rotated
     * "reference sample" stamp and a caption. Laid out from samplePagePlan so it
     * matches the canvas preview exactly.
     */
    function samplePageDescriptor(item, imageDataUrl, imageWidth, imageHeight) {
        var plan = C.samplePagePlan(item, imageWidth, imageHeight, { orientation: 'portrait' });
        var MM_TO_PT = 72 / 25.4;

        return {
            format: [plan.pageWidth, plan.pageHeight],
            orientation: 'portrait',
            plan: plan,
            render: function (doc) {
                doc.addImage(imageDataUrl, 'JPEG', plan.image.x, plan.image.y, plan.image.width, plan.image.height, undefined, 'FAST');

                // stamp (jsPDF angles are counter-clockwise, canvas angles are clockwise)
                doc.setFont('helvetica', 'bold');
                doc.setTextColor(220, 38, 38);
                var stampPt = C.fitFontByWidth(function (value, pt) {
                    doc.setFontSize(pt);
                    return doc.getTextWidth(value);
                }, plan.stamp.text, plan.image.width * 0.92, plan.stamp.size * MM_TO_PT, 10);
                doc.setFontSize(stampPt);
                var hasGState = typeof doc.setGState === 'function' && typeof doc.GState === 'function';
                if (hasGState) doc.setGState(new doc.GState({ opacity: 0.45 }));
                doc.text(plan.stamp.text, plan.stamp.x, plan.stamp.y, { align: 'center', angle: -plan.stamp.angle });
                if (hasGState) doc.setGState(new doc.GState({ opacity: 1 }));

                // caption
                var caption = plan.caption;
                var rightX = plan.pageWidth - plan.margin;
                doc.setDrawColor(229, 231, 235);
                doc.setLineWidth(0.3);
                doc.line(caption.x, caption.y - 3, rightX, caption.y - 3);

                doc.setFont('helvetica', 'bold');
                doc.setFontSize(12);
                doc.setTextColor(17, 24, 39);
                doc.text(caption.provider, caption.x, caption.y + 5);

                doc.setFont('helvetica', 'normal');
                doc.setFontSize(9);
                doc.setTextColor(107, 114, 128);
                doc.text(caption.credential, caption.x, caption.y + 11);
                doc.text(caption.source, caption.x, caption.y + 16.5);

                doc.setFont('helvetica', 'bold');
                doc.setFontSize(9);
                if (caption.status === 'verified') doc.setTextColor(22, 101, 52);
                else doc.setTextColor(146, 64, 14);
                doc.text(caption.statusLabel, rightX, caption.y + 5, { align: 'right' });

                doc.setFont('helvetica', 'normal');
                doc.setTextColor(107, 114, 128);
                doc.text(caption.numberLabel, rightX, caption.y + 11, { align: 'right' });
            }
        };
    }

    // ---------------------------------------------------- issued certificates

    function readIssued() {
        try {
            var raw = global.localStorage.getItem(ISSUED_KEY);
            var list = raw ? JSON.parse(raw) : [];
            return Array.isArray(list) ? list.filter(function (entry) { return entry && entry.recipient; }) : [];
        } catch (error) {
            return [];
        }
    }

    function writeIssued(list) {
        try {
            global.localStorage.setItem(ISSUED_KEY, JSON.stringify(list.slice(0, MAX_ISSUED)));
        } catch (error) {
            setMessage('That certificate could not be saved in this browser (storage is full or blocked).', 'error');
        }
    }

    function readFormData() {
        var utils = global.SeedwelUtils || {};
        var clean = function (id, max, fallback) {
            var el = $(id);
            if (!el) return fallback || '';
            var value = utils.safeText ? utils.safeText(el.value, max) : String(el.value || '').trim().slice(0, max);
            return value || (fallback || '');
        };
        var select = function (id, fallback) {
            var el = $(id);
            return el && el.value ? el.value : fallback;
        };

        var recipient = clean('certRecipient', 60, DEFAULTS.recipient);
        var course = clean('certCourse', 90, DEFAULTS.course);
        var dateValue = clean('certIssuedOn', 10, today());
        var seed = clean('certIdSeed', 40, recipient + '|' + course + '|' + dateValue);

        return {
            recipient: recipient,
            course: course,
            awardType: select('certAward', DEFAULTS.awardType),
            description: clean('certDescription', 220, ''),
            issuedOn: dateValue,
            certificateId: clean('certId', 24, C.certificateId(seed)),
            signerName: clean('certSignerName', 60, DEFAULTS.signerName),
            signerRole: clean('certSignerRole', 70, DEFAULTS.signerRole),
            company: clean('certCompany', 60, DEFAULTS.company),
            verifyUrl: clean('certVerifyUrl', 80, ''),
            accent: /^#[0-9a-f]{6}$/i.test(select('certAccent', DEFAULTS.accent)) ? select('certAccent', DEFAULTS.accent) : DEFAULTS.accent,
            format: C.PAGE_SIZES[select('certFormat', DEFAULTS.format)] ? select('certFormat', DEFAULTS.format) : DEFAULTS.format,
            orientation: select('certOrientation', DEFAULTS.orientation) === 'portrait' ? 'portrait' : 'landscape',
            nameStyle: C.NAME_STYLES[select('certNameStyle', DEFAULTS.nameStyle)] ? select('certNameStyle', DEFAULTS.nameStyle) : DEFAULTS.nameStyle
        };
    }

    function certificateCanvas(data, dpi) {
        var size = C.renderSize(data.format, data.orientation, dpi || 200);
        var canvas = makeCanvas(size.width, size.height);
        var ctx = canvas.getContext('2d');
        C.drawCertificate(ctx, data, size, state.logo);
        return canvas;
    }

    async function ensureFonts() {
        if (!global.document || !global.document.fonts) return;
        var wanted = [
            "700 40px Montserrat",
            "800 40px Montserrat",
            "700 40px 'Playfair Display'",
            "400 40px 'Great Vibes'",
            "400 20px Inter",
            "600 20px Inter"
        ];
        try {
            await Promise.all(wanted.map(function (spec) { return global.document.fonts.load(spec); }));
            await global.document.fonts.ready;
        } catch (error) {
            // Fonts are a nicety; fall back to the stack declared in certificate-utils.
        }
    }

    var renderPreview = null; // assigned during init (debounced)

    function renderIssuedList() {
        var list = $('issuedList');
        if (!list) return;
        text('issuedCount', String(state.issued.length));

        if (!state.issued.length) {
            list.innerHTML = '<div class="empty-state">No certificates saved in this browser yet. Fill in the form and choose <strong>Save to issued list</strong> to build a combined PDF later.</div>';
            return;
        }

        list.innerHTML = state.issued.map(function (entry) {
            return '<li class="issued-item" data-id="' + C.htmlEscape(entry.certificateId) + '">'
                + '<span class="issued-id">' + C.htmlEscape(entry.certificateId) + '</span>'
                + '<span class="issued-detail"><strong>' + C.htmlEscape(entry.recipient) + '</strong>'
                + '<em>' + C.htmlEscape(entry.course) + ' · ' + C.htmlEscape(C.formatIssueDate(entry.issuedOn)) + '</em></span>'
                + '<span class="issued-actions">'
                + '<button class="btn btn-ghost" type="button" data-action="load">Edit</button>'
                + '<button class="btn btn-ghost" type="button" data-action="png">PNG</button>'
                + '<button class="btn btn-danger" type="button" data-action="remove">Remove</button>'
                + '</span></li>';
        }).join('');
    }

    // ------------------------------------------------------- reference grid

    function renderGrid() {
        var grid = $('libraryGrid');
        if (!grid) return;

        var query = $('librarySearch') ? $('librarySearch').value : '';
        var status = $('libraryStatus') ? $('libraryStatus').value : 'all';
        state.visible = C.filterItems(state.items, query, status);

        text('libraryCount', state.visible.length + ' of ' + state.items.length);
        var selectedCount = Object.keys(state.selected).filter(function (key) { return state.selected[key]; }).length;
        text('librarySelectedCount', String(selectedCount));

        if (!state.visible.length) {
            grid.innerHTML = '<div class="empty-state">No samples match that search.</div>';
            return;
        }

        grid.innerHTML = state.visible.map(function (item) {
            var checked = state.selected[item.slug] ? ' checked' : '';
            return '<article class="cert-card" data-slug="' + C.htmlEscape(item.slug) + '">'
                + '<label class="cert-pick"><input type="checkbox" data-role="pick" value="' + C.htmlEscape(item.slug) + '"' + checked + ' />'
                + '<img loading="lazy" src="/assets/certificates/' + C.htmlEscape(item.image) + '" alt="' + C.htmlEscape(item.provider) + ' sample" /></label>'
                + '<div class="cert-card-body">'
                + '<h3>' + C.htmlEscape(item.provider) + '</h3>'
                + '<p>' + C.htmlEscape(item.credential || 'AI credential sample') + '</p>'
                + '<span class="cert-badge ' + (item.status === 'verified' ? 'is-verified' : 'is-sample') + '">' + C.htmlEscape(item.statusLabel) + '</span>'
                + '</div>'
                + '<div class="cert-card-actions">'
                + '<button class="btn btn-ghost" type="button" data-role="preview">Preview</button>'
                + '<button class="btn btn-ghost" type="button" data-role="download">PNG</button>'
                + (item.sourceUrl ? '<a class="btn btn-ghost" href="' + C.htmlEscape(item.sourceUrl) + '" target="_blank" rel="noreferrer">Source</a>' : '')
                + '</div></article>';
        }).join('');
    }

    function findItem(slug) {
        return state.items.filter(function (item) { return item.slug === slug; })[0] || null;
    }

    async function renderSamplePreview(item) {
        var canvas = $('libraryPreview');
        if (!canvas || !item) return;
        state.previewItem = item;
        var image = await loadImage('/assets/certificates/' + item.image);
        var size = C.renderSize('a4', 'portrait', 96);
        canvas.width = size.width;
        canvas.height = size.height;
        var ctx = canvas.getContext('2d');
        C.drawSamplePage(ctx, image, item, size);
        text('libraryPreviewTitle', item.provider);
        text('libraryPreviewMeta', (item.credential || 'AI credential sample') + ' · ' + item.statusLabel);
        var holder = $('libraryPreviewPanel');
        if (holder) holder.hidden = false;
    }

    async function sampleImageDataUrl(item, maxSize) {
        var image = await loadImage('/assets/certificates/' + item.image);
        var limit = maxSize || 1400;
        var scale = Math.min(1, limit / Math.max(image.width, image.height));
        var canvas = makeCanvas(Math.max(1, Math.round(image.width * scale)), Math.max(1, Math.round(image.height * scale)));
        var ctx = canvas.getContext('2d');
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
        return { dataUrl: canvas.toDataURL('image/jpeg', 0.9), width: canvas.width, height: canvas.height, source: image };
    }

    async function downloadSamplePng(item) {
        var image = await loadImage('/assets/certificates/' + item.image);
        var size = C.renderSize('a4', 'portrait', 150);
        var canvas = makeCanvas(size.width, size.height);
        C.drawSamplePage(canvas.getContext('2d'), image, item, size);
        var blob = await toBlob(canvas, 'image/png');
        downloadBlob(blob, C.slugify(item.provider, 'sample') + '-' + C.slugify(item.credential, 'reference') + '-reference-sample.png');
    }

    function referenceCoverCanvas(counts, total, preparedFor) {
        var size = C.renderSize('a4', 'portrait', 150);
        var canvas = makeCanvas(size.width, size.height);
        C.drawCoverPage(canvas.getContext('2d'), {
            eyebrow: DEFAULTS.company + ' · Reference library',
            title: 'AI Certificate Reference Library',
            subtitle: 'Sample images showing what AI credentials from ' + total + ' providers look like. Nothing in this pack was issued by Seedwel.',
            lines: [
                'Prepared for::' + preparedFor,
                'Samples::' + total + ' (' + counts.verified + ' full certificate documents, ' + counts.sample + ' badge or credential samples)',
                'Generated::' + stampDate()
            ],
            note: 'Every page keeps the original provider details and is stamped "Reference sample — not a credential". These images must not be presented as certificates held by anyone at Seedwel.',
            footer: 'Seedwel Investment LTD · seedwel.ltd'
        }, size);
        return canvas;
    }

    async function downloadReferencePdf(onlySelected) {
        var targets = onlySelected
            ? state.items.filter(function (item) { return state.selected[item.slug]; })
            : state.visible;

        if (!targets.length) {
            setMessage(onlySelected ? 'Tick at least one sample first.' : 'There are no samples to bundle yet.', 'error');
            return;
        }

        setBusy(true, 'Preparing ' + targets.length + ' sample page(s)…');
        setMessage('', '');

        try {
            var pages = [canvasPage(referenceCoverCanvas(state.manifest.counts, state.manifest.total, readFormData().recipient), 'a4', 'portrait')];

            for (var index = 0; index < targets.length; index += 1) {
                var item = targets[index];
                var prepared = await sampleImageDataUrl(item);
                pages.push(samplePageDescriptor(item, prepared.dataUrl, prepared.width, prepared.height));
                setProgress(index + 1, targets.length, 'Rendering ' + (index + 1) + ' of ' + targets.length + ' — ' + item.provider);
                await yieldToBrowser();
            }

            var blob = buildPdf(pages, {
                title: 'AI Certificate Reference Library',
                subject: targets.length + ' third-party AI credential samples'
            });
            downloadBlob(blob, 'AI-Certificate-Reference-Library-' + targets.length + '-samples.pdf');
            setMessage('Bundled ' + targets.length + ' sample page(s) into one PDF.', 'success');
        } catch (error) {
            console.error(error);
            setMessage(error.message || 'The PDF could not be built.', 'error');
        } finally {
            setBusy(false, '');
        }
    }

    // -------------------------------------------------- your own certificates

    var MAX_UPLOAD_EDGE = 2000;

    function readAsDataUrl(file) {
        return new Promise(function (resolve, reject) {
            var reader = new FileReader();
            reader.onload = function () { resolve(reader.result); };
            reader.onerror = function () { reject(new Error(file.name + ' could not be read.')); };
            reader.readAsDataURL(file);
        });
    }

    /**
     * Reads an uploaded certificate file and downscales it to a JPEG that is
     * still sharp at print size. The picture itself is never drawn over — these
     * are the originals issued to the holder, so they already carry the name.
     */
    async function readFileAsCertificate(file) {
        if (!/^image\//.test(file.type || '')) {
            throw new Error(file.name + ' is not an image. Open the certificate and save it as PNG or JPG first.');
        }
        var dataUrl = await readAsDataUrl(file);
        var image = await loadImage(dataUrl);
        var scale = Math.min(1, MAX_UPLOAD_EDGE / Math.max(image.width, image.height));
        var canvas = makeCanvas(
            Math.max(1, Math.round(image.width * scale)),
            Math.max(1, Math.round(image.height * scale))
        );
        var ctx = canvas.getContext('2d');
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(image, 0, 0, canvas.width, canvas.height);

        return {
            id: 'owned-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 7),
            name: file.name,
            label: '',
            meta: '',
            width: canvas.width,
            height: canvas.height,
            dataUrl: canvas.toDataURL('image/jpeg', 0.9)
        };
    }

    function renderOwnedList() {
        var list = $('ownedList');
        if (!list) return;
        text('ownedCount', String(state.owned.length));
        var button = $('ownedDownloadPdf');
        if (button) button.disabled = !state.owned.length;

        if (!state.owned.length) {
            list.innerHTML = '<div class="empty-state">No certificate files added yet. Drop the originals in above and they will be bundled into one PDF.</div>';
            return;
        }

        list.innerHTML = state.owned.map(function (entry, index) {
            return '<li class="issued-item owned-item" data-id="' + C.htmlEscape(entry.id) + '">'
                + '<img class="owned-thumb" src="' + C.htmlEscape(entry.dataUrl) + '" alt="' + C.htmlEscape(entry.name) + '" />'
                + '<span class="owned-fields">'
                + '<input type="text" data-role="label" maxlength="90" placeholder="Provider and course (printed under the page)" value="' + C.htmlEscape(entry.label) + '" />'
                + '<input type="text" data-role="meta" maxlength="110" placeholder="Optional detail — issued date, ID" value="' + C.htmlEscape(entry.meta) + '" />'
                + '<em>' + C.htmlEscape(entry.name) + ' · ' + entry.width + '×' + entry.height + 'px</em>'
                + '</span>'
                + '<span class="issued-actions">'
                + '<button class="btn btn-ghost" type="button" data-action="up"' + (index === 0 ? ' disabled' : '') + '><i class="fa-solid fa-arrow-up"></i></button>'
                + '<button class="btn btn-ghost" type="button" data-action="down"' + (index === state.owned.length - 1 ? ' disabled' : '') + '><i class="fa-solid fa-arrow-down"></i></button>'
                + '<button class="btn btn-ghost" type="button" data-action="png">PNG</button>'
                + '<button class="btn btn-danger" type="button" data-action="remove">Remove</button>'
                + '</span></li>';
        }).join('');
    }

    function ownedPageDescriptor(entry) {
        var plan = C.ownedPagePlan(entry, entry.width, entry.height);
        return {
            format: [plan.pageWidth, plan.pageHeight],
            orientation: plan.orientation,
            plan: plan,
            render: function (doc) {
                doc.addImage(entry.dataUrl, 'JPEG', plan.image.x, plan.image.y, plan.image.width, plan.image.height, undefined, 'FAST');
                if (plan.captionMm) {
                    doc.setFont('helvetica', 'bold');
                    doc.setFontSize(12);
                    doc.setTextColor(17, 24, 39);
                    doc.text(plan.caption.label, plan.caption.x, plan.caption.y + 4.5);
                    if (plan.caption.meta) {
                        doc.setFont('helvetica', 'normal');
                        doc.setFontSize(9);
                        doc.setTextColor(107, 114, 128);
                        doc.text(plan.caption.meta, plan.caption.x, plan.caption.y + 10.5);
                    }
                }
            }
        };
    }

    function ownedCoverCanvas(holder, count) {
        var size = C.renderSize('a4', 'portrait', 150);
        var canvas = makeCanvas(size.width, size.height);
        C.drawCoverPage(canvas.getContext('2d'), {
            eyebrow: DEFAULTS.company + ' · Certificate pack',
            title: 'Certificates of ' + holder,
            subtitle: 'Every page in this pack is an original certificate file, reproduced exactly as it was issued.',
            lines: [
                'Holder::' + holder,
                'Certificates::' + count,
                'Generated::' + stampDate()
            ],
            note: 'Issued by the provider named on each certificate. Check any credential with the provider listed on its page.',
            footer: DEFAULTS.company + ' · seedwel.ltd'
        }, size);
        return canvas;
    }

    async function addOwnedFiles(fileList) {
        var files = Array.prototype.slice.call(fileList || []);
        if (!files.length) return;

        setBusy(true, 'Reading ' + files.length + ' file(s)…');
        setMessage('', '');
        var added = 0;
        var failures = [];

        try {
            for (var index = 0; index < files.length; index += 1) {
                try {
                    state.owned.push(await readFileAsCertificate(files[index]));
                    added += 1;
                } catch (error) {
                    failures.push(error.message || files[index].name);
                }
                setProgress(index + 1, files.length, 'Reading ' + (index + 1) + ' of ' + files.length + ' — ' + files[index].name);
                renderOwnedList();
                await yieldToBrowser();
            }
            if (added) setMessage(added + ' certificate file(s) added' + (failures.length ? ' — ' + failures.length + ' skipped.' : '.'), failures.length ? 'error' : 'success');
            else setMessage(failures.join(' '), 'error');
        } finally {
            setBusy(false, '');
        }
    }

    async function downloadOwnedPng(entry) {
        var image = await loadImage(entry.dataUrl);
        var plan = C.ownedPagePlan(entry, entry.width, entry.height);
        var size = C.renderSize(plan.format, plan.orientation, 150);
        var canvas = makeCanvas(size.width, size.height);
        C.drawOwnedPage(canvas.getContext('2d'), image, entry, size, plan);
        var blob = await toBlob(canvas, 'image/png');
        downloadBlob(blob, C.slugify(entry.label || entry.name, 'certificate') + '.png');
    }

    async function downloadOwnedPdf() {
        if (!state.owned.length) {
            setMessage('Add at least one certificate file first.', 'error');
            return;
        }

        var holderEl = $('ownedHolder');
        var holder = (holderEl && String(holderEl.value).trim()) || DEFAULTS.recipient;
        setBusy(true, 'Building your certificate PDF…');
        setMessage('', '');

        try {
            var pages = [canvasPage(ownedCoverCanvas(holder, state.owned.length), 'a4', 'portrait')];
            for (var index = 0; index < state.owned.length; index += 1) {
                pages.push(ownedPageDescriptor(state.owned[index]));
                setProgress(index + 1, state.owned.length, 'Adding page ' + (index + 1) + ' of ' + state.owned.length);
                await yieldToBrowser();
            }

            var blob = buildPdf(pages, {
                title: 'Certificates of ' + holder,
                subject: state.owned.length + ' certificate file(s)'
            });
            downloadBlob(blob, C.pdfFileName(holder, C.slugify(holder) + '-Certificates'));
            setMessage('Downloaded ' + state.owned.length + ' certificate(s) as one PDF.', 'success');
        } catch (error) {
            console.error(error);
            setMessage(error.message || 'The PDF could not be built.', 'error');
        } finally {
            setBusy(false, '');
        }
    }

    // ------------------------------------------------- issued certificate pdf

    async function downloadIssuedPdf() {
        if (!state.issued.length) {
            setMessage('Save at least one certificate to the issued list first.', 'error');
            return;
        }

        setBusy(true, 'Building the combined certificate PDF…');
        setMessage('', '');

        try {
            await ensureFonts();
            var size = C.renderSize('a4', 'portrait', 150);
            var cover = makeCanvas(size.width, size.height);
            C.drawCoverPage(cover.getContext('2d'), {
                eyebrow: DEFAULTS.company,
                title: 'Certificates issued to ' + state.issued[0].recipient,
                subtitle: 'Every certificate in this pack was generated in the Seedwel admin certificate studio and can be checked against its ID.',
                lines: [
                    'Recipient::' + state.issued[0].recipient,
                    'Certificates::' + state.issued.length,
                    'Generated::' + stampDate()
                ],
                note: 'Verify any certificate at ' + (state.issued[0].verifyUrl || 'seedwel.ltd/verify') + ' using the certificate ID printed at the foot of the page.',
                footer: DEFAULTS.company + ' · seedwel.ltd'
            }, size);

            var pages = [canvasPage(cover, 'a4', 'portrait')];
            for (var index = 0; index < state.issued.length; index += 1) {
                var entry = state.issued[index];
                pages.push(canvasPage(certificateCanvas(entry, 200), entry.format, entry.orientation));
                setProgress(index + 1, state.issued.length, 'Rendering certificate ' + (index + 1) + ' of ' + state.issued.length);
                await yieldToBrowser();
            }

            var blob = buildPdf(pages, {
                title: state.issued[0].recipient + ' — Seedwel certificates',
                subject: state.issued.length + ' Seedwel-issued certificate(s)'
            });
            downloadBlob(blob, C.pdfFileName(state.issued[0].recipient));
            setMessage('Downloaded ' + state.issued.length + ' certificate(s) as one PDF.', 'success');
        } catch (error) {
            console.error(error);
            setMessage(error.message || 'The PDF could not be built.', 'error');
        } finally {
            setBusy(false, '');
        }
    }

    // ------------------------------------------------------------------ init

    async function init() {
        await ensureFonts();

        try {
            state.logo = await loadImage(LOGO_URL);
        } catch (error) {
            state.logo = null; // the template draws fine without the logo
        }

        state.issued = readIssued();

        try {
            var response = await fetch(MANIFEST_URL, { cache: 'no-cache' });
            if (!response.ok) throw new Error('The certificate manifest could not be loaded (HTTP ' + response.status + ').');
            state.manifest = C.normaliseManifest(await response.json());
            state.items = state.manifest.items;
            text('libraryTotal', String(state.manifest.total));
        } catch (error) {
            console.error(error);
            setMessage(error.message || 'The reference library could not be loaded.', 'error');
        }

        // tabs
        var panels = { issue: 'issuePanel', library: 'libraryPanel', mine: 'minePanel' };
        document.querySelectorAll('.cert-tab').forEach(function (tab) {
            on(tab, 'click', function () {
                var target = tab.getAttribute('data-tab');
                document.querySelectorAll('.cert-tab').forEach(function (other) {
                    other.classList.toggle('active', other === tab);
                    other.setAttribute('aria-selected', other === tab ? 'true' : 'false');
                });
                Object.keys(panels).forEach(function (key) {
                    var panel = $(panels[key]);
                    if (panel) panel.hidden = key !== target;
                });
            });
        });

        // issue form
        var defaults = DEFAULTS;
        var fieldDefaults = {
            certRecipient: defaults.recipient,
            certCourse: defaults.course,
            certDescription: defaults.description,
            certIssuedOn: today(),
            certSignerName: defaults.signerName,
            certSignerRole: defaults.signerRole,
            certCompany: defaults.company,
            certVerifyUrl: defaults.verifyUrl,
            certAccent: defaults.accent,
            certFormat: defaults.format,
            certOrientation: defaults.orientation,
            certNameStyle: defaults.nameStyle
        };
        Object.keys(fieldDefaults).forEach(function (id) {
            var el = $(id);
            if (el && !el.value) el.value = fieldDefaults[id];
        });
        C.AWARD_TYPES.forEach(function (award) {
            var select = $('certAward');
            if (!select) return;
            var option = document.createElement('option');
            option.value = award;
            option.textContent = award;
            if (award === defaults.awardType) option.selected = true;
            select.appendChild(option);
        });
        if (!$('certId').value) $('certId').value = C.certificateId(defaults.recipient + '|' + defaults.course);

        renderPreview = debounce(function () {
            var data = readFormData();
            var size = C.renderSize(data.format, data.orientation, 96);
            var canvas = $('certPreview');
            if (!canvas) return;
            canvas.width = size.width;
            canvas.height = size.height;
            C.drawCertificate(canvas.getContext('2d'), data, size, state.logo);
            text('certPreviewMeta', data.awardType + ' · ' + C.PAGE_SIZES[data.format].label + ' ' + data.orientation + ' · ' + data.certificateId);
        }, 220);

        ['input', 'change'].forEach(function (event) {
            document.querySelectorAll('#issueForm input, #issueForm select, #issueForm textarea').forEach(function (field) {
                on(field, event, renderPreview);
            });
        });

        on($('certIdSeed'), 'change', function () {
            $('certId').value = C.certificateId($('certIdSeed').value || readFormData().recipient);
            renderPreview();
        });
        on($('certIdRegenerate'), 'click', function () {
            $('certId').value = C.certificateId(readFormData().recipient + '|' + Date.now());
            renderPreview();
        });

        on($('downloadPngBtn'), 'click', async function () {
            try {
                await ensureFonts();
                var data = readFormData();
                var blob = await toBlob(certificateCanvas(data, 250), 'image/png');
                downloadBlob(blob, C.slugify(data.recipient) + '-' + C.slugify(data.awardType) + '-' + data.certificateId + '.png');
                setMessage('Downloaded ' + data.certificateId + ' as a PNG.', 'success');
            } catch (error) {
                setMessage(error.message || 'That image could not be created.', 'error');
            }
        });

        on($('downloadPdfBtn'), 'click', async function () {
            try {
                await ensureFonts();
                var data = readFormData();
                var blob = buildPdf([canvasPage(certificateCanvas(data, 250), data.format, data.orientation, 0.95)], {
                    title: data.awardType + ' — ' + data.recipient,
                    subject: data.course
                });
                downloadBlob(blob, C.pdfFileName(data.recipient, C.slugify(data.recipient) + '-' + data.certificateId));
                setMessage('Downloaded ' + data.certificateId + ' as a PDF.', 'success');
            } catch (error) {
                setMessage(error.message || 'That PDF could not be created.', 'error');
            }
        });

        on($('saveIssuedBtn'), 'click', function () {
            var data = readFormData();
            data.savedAt = new Date().toISOString();
            state.issued = state.issued.filter(function (entry) { return entry.certificateId !== data.certificateId; });
            state.issued.unshift(data);
            if (state.issued.length > MAX_ISSUED) state.issued = state.issued.slice(0, MAX_ISSUED);
            writeIssued(state.issued);
            renderIssuedList();
            setMessage('Saved ' + data.certificateId + ' to the issued list (' + state.issued.length + ' in this browser).', 'success');
        });

        on($('downloadIssuedPdfBtn'), 'click', downloadIssuedPdf);

        on($('clearIssuedBtn'), 'click', function () {
            if (!state.issued.length) return;
            if (!global.confirm('Remove all ' + state.issued.length + ' saved certificate(s) from this browser?')) return;
            state.issued = [];
            writeIssued(state.issued);
            renderIssuedList();
            setMessage('Cleared the issued list.', 'success');
        });

        on($('issuedList'), 'click', function (event) {
            var button = event.target.closest('button[data-action]');
            if (!button) return;
            var row = button.closest('.issued-item');
            var id = row ? row.getAttribute('data-id') : null;
            var entry = state.issued.filter(function (item) { return item.certificateId === id; })[0];
            if (!entry) return;
            var action = button.getAttribute('data-action');

            if (action === 'remove') {
                state.issued = state.issued.filter(function (item) { return item.certificateId !== id; });
                writeIssued(state.issued);
                renderIssuedList();
                return;
            }
            if (action === 'load') {
                Object.keys(entry).forEach(function (key) {
                    var field = $('cert' + key.charAt(0).toUpperCase() + key.slice(1));
                    if (field && typeof entry[key] === 'string') field.value = entry[key];
                });
                renderPreview();
                setMessage('Loaded ' + id + ' back into the form.', 'success');
                return;
            }
            if (action === 'png') {
                (async function () {
                    try {
                        await ensureFonts();
                        var blob = await toBlob(certificateCanvas(entry, 250), 'image/png');
                        downloadBlob(blob, C.slugify(entry.recipient) + '-' + entry.certificateId + '.png');
                    } catch (error) {
                        setMessage(error.message || 'That image could not be created.', 'error');
                    }
                }());
            }
        });

        // reference library
        on($('librarySearch'), 'input', debounce(renderGrid, 160));
        on($('libraryStatus'), 'change', renderGrid);

        on($('librarySelectAll'), 'click', function () {
            state.visible.forEach(function (item) { state.selected[item.slug] = true; });
            renderGrid();
        });
        on($('librarySelectNone'), 'click', function () {
            state.selected = {};
            renderGrid();
        });
        on($('libraryDownloadAll'), 'click', function () { downloadReferencePdf(false); });
        on($('libraryDownloadSelected'), 'click', function () { downloadReferencePdf(true); });
        on($('libraryPreviewDownload'), 'click', function () {
            if (state.previewItem) downloadSamplePng(state.previewItem);
        });

        on($('libraryGrid'), 'click', async function (event) {
            var checkbox = event.target.closest('input[data-role="pick"]');
            if (checkbox) {
                state.selected[checkbox.value] = checkbox.checked;
                var selectedCount = Object.keys(state.selected).filter(function (key) { return state.selected[key]; }).length;
                text('librarySelectedCount', String(selectedCount));
                return;
            }
            var button = event.target.closest('button[data-role]');
            if (!button) return;
            var card = button.closest('.cert-card');
            var item = card ? findItem(card.getAttribute('data-slug')) : null;
            if (!item) return;

            if (button.getAttribute('data-role') === 'preview') {
                try {
                    await renderSamplePreview(item);
                } catch (error) {
                    setMessage(error.message || 'That preview could not be loaded.', 'error');
                }
                return;
            }
            try {
                await downloadSamplePng(item);
                setMessage('Downloaded the ' + item.provider + ' sample as a stamped PNG.', 'success');
            } catch (error) {
                setMessage(error.message || 'That image could not be created.', 'error');
            }
        });

        // my own certificates
        var holderField = $('ownedHolder');
        if (holderField && !holderField.value) holderField.value = DEFAULTS.recipient;

        var fileInput = $('ownedFiles');
        on(fileInput, 'change', function () {
            addOwnedFiles(fileInput.files);
            fileInput.value = '';
        });

        var drop = $('ownedDrop');
        if (drop) {
            on(drop, 'click', function () { fileInput.click(); });
            ['dragenter', 'dragover'].forEach(function (event) {
                on(drop, event, function (e) { e.preventDefault(); drop.classList.add('is-dragging'); });
            });
            ['dragleave', 'drop'].forEach(function (event) {
                on(drop, event, function (e) { e.preventDefault(); drop.classList.remove('is-dragging'); });
            });
            on(drop, 'drop', function (e) {
                if (e.dataTransfer && e.dataTransfer.files) addOwnedFiles(e.dataTransfer.files);
            });
        }

        on($('ownedDownloadPdf'), 'click', downloadOwnedPdf);

        on($('ownedClear'), 'click', function () {
            if (!state.owned.length) return;
            if (!global.confirm('Remove all ' + state.owned.length + ' added certificate file(s)?')) return;
            state.owned = [];
            renderOwnedList();
            setMessage('Cleared the certificate pack.', 'success');
        });

        on($('ownedList'), 'input', function (event) {
            var input = event.target.closest('input[data-role]');
            if (!input) return;
            var row = input.closest('.owned-item');
            var entry = state.owned.filter(function (item) { return item.id === row.getAttribute('data-id'); })[0];
            if (entry) entry[input.getAttribute('data-role')] = input.value;
        });

        on($('ownedList'), 'click', function (event) {
            var button = event.target.closest('button[data-action]');
            if (!button) return;
            var row = button.closest('.owned-item');
            var id = row ? row.getAttribute('data-id') : null;
            var index = state.owned.findIndex(function (item) { return item.id === id; });
            if (index === -1) return;
            var action = button.getAttribute('data-action');

            if (action === 'remove') {
                state.owned.splice(index, 1);
                renderOwnedList();
                return;
            }
            if (action === 'up' && index > 0) {
                state.owned.splice(index - 1, 0, state.owned.splice(index, 1)[0]);
                renderOwnedList();
                return;
            }
            if (action === 'down' && index < state.owned.length - 1) {
                state.owned.splice(index + 1, 0, state.owned.splice(index, 1)[0]);
                renderOwnedList();
                return;
            }
            if (action === 'png') {
                downloadOwnedPng(state.owned[index]).catch(function (error) {
                    setMessage(error.message || 'That image could not be created.', 'error');
                });
            }
        });

        renderOwnedList();
        renderGrid();
        renderIssuedList();
        renderPreview();
        setMessage('', '');
    }

    global.SeedwelCertificateStudio = Object.freeze({
        DEFAULTS: DEFAULTS,
        ISSUED_KEY: ISSUED_KEY,
        buildPdf: buildPdf,
        canvasPage: canvasPage,
        downloadIssuedPdf: downloadIssuedPdf,
        downloadReferencePdf: downloadReferencePdf,
        init: init,
        ownedCoverCanvas: ownedCoverCanvas,
        ownedPageDescriptor: ownedPageDescriptor,
        pdfConstructor: pdfConstructor,
        readFormData: readFormData,
        readIssued: readIssued,
        samplePageDescriptor: samplePageDescriptor,
        state: state
    });

    if (typeof module !== 'undefined' && module.exports) {
        module.exports = global.SeedwelCertificateStudio;
    }

    function start() {
        // Outside a browser (node --test) the module is required only for its exports.
        if (!global.document) return;
        if (global.SeedwelAdminShared && typeof global.SeedwelAdminShared.withAdminPage === 'function') {
            global.SeedwelAdminShared.withAdminPage(function () { return init(); });
        } else {
            init();
        }
    }

    if (global.document && global.document.readyState === 'loading') {
        global.document.addEventListener('DOMContentLoaded', start);
    } else {
        start();
    }
})(typeof window !== 'undefined' ? window : globalThis);
