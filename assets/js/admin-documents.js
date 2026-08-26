(function () {
    'use strict';

    var utils = window.SeedwelRecruitment;
    var shared = window.SeedwelAdminShared;

    function $(id) { return document.getElementById(id); }

    var ALLOWED_EXTENSIONS = ['pdf', 'doc', 'docx'];
    var MAX_BYTES = 10 * 1024 * 1024;

    var form = $('documentForm');
    var fileDrop = $('docFileDrop');
    var fileInput = $('docFileInput');
    var fileNameLabel = $('docFileName');
    var uploadBtn = $('uploadBtn');
    var uploadProgress = $('uploadProgress');
    var uploadProgressBar = $('uploadProgressBar');
    var uploadStatus = $('uploadStatus');

    var documents = {};      // id -> record
    var searchTerm = '';
    var statusFilter = 'all';
    var ctx = null;

    /* ─────────────── helpers ─────────────── */

    function extensionOf(file) {
        var match = String(file && file.name || '').toLowerCase().match(/\.([a-z0-9]+)$/);
        return match ? match[1] : '';
    }

    function fileError(file) {
        if (!file) return '';
        if (!file.size) return 'The selected file is empty.';
        if (file.size > MAX_BYTES) return 'Documents must be 10 MB or smaller.';
        if (ALLOWED_EXTENSIONS.indexOf(extensionOf(file)) === -1) return 'Choose a PDF, DOC or DOCX file.';
        return '';
    }

    function setStatus(message, tone) {
        uploadStatus.textContent = message || '';
        uploadStatus.style.color = tone === 'error' ? '#b91c1c' : tone === 'success' ? '#16a34a' : '';
    }

    function showPageMessage(text, tone) {
        shared.setMessage('pageMessage', text, tone);
        if (text) window.setTimeout(function () { shared.setMessage('pageMessage', '', ''); }, 6000);
    }

    function selectedRoles() {
        return Array.prototype.slice.call(document.querySelectorAll('#rolePick input[name="role"]:checked'))
            .map(function (input) { return input.value; });
    }

    function recordFromForm(file, asset, roles) {
        return {
            title: utils.safeText($('docTitle').value, 200),
            description: utils.safeText($('docDescription').value, 1000),
            category: utils.safeText($('docCategory').value, 40) || 'other',
            fileName: utils.safeText(file.name || 'document', 200),
            cloudinaryPublicId: asset.publicId,
            format: asset.format || extensionOf(file),
            fileSize: Number(asset.bytes || file.size || 0),
            uploadedBy: (ctx && ctx.user && ctx.user.email) || 'administrator',
            roles: roles.reduce(function (map, role) { map[role] = true; return map; }, {}),
            status: 'draft',
            createdAt: window.firebase.database.ServerValue.TIMESTAMP,
            updatedAt: window.firebase.database.ServerValue.TIMESTAMP
        };
    }

    function indexEntry(record) {
        return {
            title: record.title,
            description: record.description || '',
            category: record.category || 'other',
            fileName: record.fileName,
            format: record.format,
            fileSize: Number(record.fileSize || 0),
            status: 'published',
            updatedAt: window.firebase.database.ServerValue.TIMESTAMP
        };
    }

    /* ─────────────── file picker ─────────────── */

    function presentFile(file) {
        var error = fileError(file);
        if (error) {
            fileInput.value = '';
            fileNameLabel.textContent = '';
            fileDrop.classList.remove('has-file');
            setStatus(error, 'error');
            return false;
        }
        fileNameLabel.textContent = file.name + ' · ' + (file.size / (1024 * 1024)).toFixed(2) + ' MB';
        fileDrop.classList.remove('is-invalid');
        fileDrop.classList.add('has-file');
        setStatus('Ready to upload.', 'success');
        return true;
    }

    fileDrop.addEventListener('click', function () { fileInput.click(); });
    fileDrop.addEventListener('keydown', function (event) {
        if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); fileInput.click(); }
    });
    fileDrop.addEventListener('dragover', function (event) { event.preventDefault(); fileDrop.classList.add('is-dragging'); });
    fileDrop.addEventListener('dragleave', function () { fileDrop.classList.remove('is-dragging'); });
    fileDrop.addEventListener('drop', function (event) {
        event.preventDefault();
        fileDrop.classList.remove('is-dragging');
        var file = event.dataTransfer && event.dataTransfer.files && event.dataTransfer.files[0];
        if (!file) return;
        try {
            var transfer = new DataTransfer();
            transfer.items.add(file);
            fileInput.files = transfer.files;
        } catch (_) {
            try { fileInput.files = event.dataTransfer.files; } catch (_) { setStatus('Drag-and-drop is not supported here — click to choose the file.', 'error'); return; }
        }
        presentFile(fileInput.files[0]);
    });
    fileInput.addEventListener('change', function () {
        if (this.files && this.files[0]) presentFile(this.files[0]);
        else { fileNameLabel.textContent = ''; fileDrop.classList.remove('has-file'); setStatus('', ''); }
    });

    /* ─────────────── upload ─────────────── */

    form.addEventListener('submit', async function (event) {
        event.preventDefault();
        var file = fileInput.files && fileInput.files[0];
        var roles = selectedRoles();
        var title = utils.safeText($('docTitle').value, 200);

        var fileProblem = fileError(file);
        if (fileProblem) { setStatus(fileProblem, 'error'); fileDrop.focus(); return; }
        if (title.length < 2) { showPageMessage('Give the document a clear title.', 'error'); $('docTitle').focus(); return; }
        if (!roles.length) { showPageMessage('Select at least one role that should see this document.', 'error'); return; }

        uploadBtn.disabled = true;
        uploadProgress.setAttribute('aria-hidden', 'false');
        uploadProgressBar.style.width = '4%';
        setStatus('Preparing secure upload…', '');
        try {
            var asset = await window.SeedwelCloudinary.upload(file, {
                kind: 'document',
                ownerName: roles[0],
                user: ctx.user,
                onProgress: function (progress) {
                    uploadProgressBar.style.width = (4 + progress * 0.86) + '%';
                    setStatus('Uploading securely… ' + progress + '%', '');
                }
            });
            uploadProgressBar.style.width = '94%';
            setStatus('Saving document record…', '');

            var record = recordFromForm(file, asset, roles);
            var pushed = await ctx.db.ref('documents').push(record);
            await utils.recordAudit(ctx.db, 'Document uploaded', record.title, 'Worker document stored as a draft for: ' + roles.join(', ') + '.');

            uploadProgressBar.style.width = '100%';
            setStatus('Uploaded. Publish it below when it is ready for the team.', 'success');
            showPageMessage('"' + record.title + '" uploaded as a draft. Publish it to make it visible to ' + roles.join(' and ') + '.', 'success');

            form.reset();
            fileInput.value = '';
            fileNameLabel.textContent = '';
            fileDrop.classList.remove('has-file');
            window.setTimeout(function () {
                uploadProgress.setAttribute('aria-hidden', 'true');
                uploadProgressBar.style.width = '0';
                setStatus('', '');
            }, 1800);
        } catch (error) {
            console.error('Document upload error:', error);
            setStatus(error && error.message ? error.message : 'The upload failed. Please try again.', 'error');
            showPageMessage('The document could not be uploaded. ' + (error && error.message ? error.message : ''), 'error');
        } finally {
            uploadBtn.disabled = false;
        }
    });

    /* ─────────────── library ─────────────── */

    function categoryLabel(category) {
        var labels = {
            onboarding: 'Onboarding', role: 'Role Description', handbook: 'Handbook',
            guidelines: 'Guidelines', policy: 'Policy', procedure: 'Procedure / SOP',
            template: 'Template', contacts: 'Contacts', other: 'Document'
        };
        return labels[category] || 'Document';
    }

    function renderRow(id, record) {
        var roles = Object.keys(record.roles || {});
        var tr = document.createElement('tr');

        var docCell = document.createElement('td');
        var strong = document.createElement('strong');
        strong.textContent = record.title || 'Untitled document';
        var small = document.createElement('small');
        small.textContent = (record.fileName || '') + (record.fileSize ? ' · ' + (Number(record.fileSize) / (1024 * 1024)).toFixed(2) + ' MB' : '') + ' · ' + categoryLabel(record.category);
        docCell.append(strong, small);

        var rolesCell = document.createElement('td');
        rolesCell.textContent = roles.length ? roles.join(', ') : '— no role selected';

        var statusCell = document.createElement('td');
        var published = record.status === 'published';
        var badge = document.createElement('span');
        badge.className = 'status-badge ' + (published ? 'active' : 'pending');
        badge.textContent = published ? 'Published' : 'Draft';
        statusCell.appendChild(badge);

        var updatedCell = document.createElement('td');
        updatedCell.textContent = utils.formatDateTime(record.updatedAt || record.createdAt);

        var actionsCell = document.createElement('td');
        var actions = document.createElement('div');
        actions.className = 'row-actions';

        if (!published) {
            var publish = document.createElement('button');
            publish.type = 'button';
            publish.className = 'btn btn-primary';
            publish.innerHTML = '<i class="fa-solid fa-paper-plane"></i> Publish';
            publish.addEventListener('click', function () { publishDocument(id, record).catch(handleActionError); });
            actions.appendChild(publish);
        } else {
            var unpublish = document.createElement('button');
            unpublish.type = 'button';
            unpublish.className = 'btn btn-secondary';
            unpublish.innerHTML = '<i class="fa-solid fa-eye-slash"></i> Unpublish';
            unpublish.addEventListener('click', function () { unpublishDocument(id, record).catch(handleActionError); });
            actions.appendChild(unpublish);
        }

        var remove = document.createElement('button');
        remove.type = 'button';
        remove.className = 'btn btn-danger';
        remove.innerHTML = '<i class="fa-solid fa-trash"></i> Delete';
        remove.addEventListener('click', function () { deleteDocument(id, record).catch(handleActionError); });
        actions.appendChild(remove);

        actionsCell.appendChild(actions);
        tr.append(docCell, rolesCell, statusCell, updatedCell, actionsCell);
        return tr;
    }

    function handleActionError(error) {
        console.error(error);
        showPageMessage(error && error.message ? error.message : 'The action could not be completed.', 'error');
    }

    function renderLibrary() {
        var tbody = $('documentsTableBody');
        if (!tbody) return;
        var entries = Object.keys(documents).map(function (id) {
            return { id: id, record: documents[id] || {} };
        }).sort(function (a, b) {
            return Number(b.record.createdAt || 0) - Number(a.record.createdAt || 0);
        }).filter(function (entry) {
            if (statusFilter === 'published' && entry.record.status !== 'published') return false;
            if (statusFilter === 'draft' && entry.record.status === 'published') return false;
            if (statusFilter !== 'all' && statusFilter !== 'published' && statusFilter !== 'draft') {
                if (!entry.record.roles || !entry.record.roles[statusFilter]) return false;
            }
            if (searchTerm) {
                var haystack = [entry.record.title, entry.record.fileName, Object.keys(entry.record.roles || {}).join(' ')].join(' ').toLowerCase();
                if (haystack.indexOf(searchTerm) === -1) return false;
            }
            return true;
        });

        tbody.replaceChildren();
        if (!entries.length) {
            var tr = document.createElement('tr');
            var td = document.createElement('td');
            td.colSpan = 5;
            var empty = document.createElement('div');
            empty.className = 'empty-state';
            empty.textContent = documents && Object.keys(documents).length
                ? 'No documents match the current filters.'
                : 'No documents uploaded yet. Use the upload form above to add the first one.';
            td.appendChild(empty);
            tr.appendChild(td);
            tbody.appendChild(tr);
            return;
        }
        entries.forEach(function (entry) { tbody.appendChild(renderRow(entry.id, entry.record)); });
    }

    function loadLibrary() {
        ctx.db.ref('documents').on('value', function (snapshot) {
            documents = snapshot.val() || {};
            renderLibrary();
        }, function (error) {
            console.error(error);
            var tbody = $('documentsTableBody');
            if (tbody) tbody.innerHTML = '<tr><td colspan="5"><div class="empty-state">The document library could not be loaded. Check that the latest Database Rules are deployed.</div></td></tr>';
        });
    }

    /* ─────────────── actions ─────────────── */

    async function publishDocument(id, record) {
        var roles = Object.keys(record.roles || {});
        if (!roles.length) throw new Error('This document has no roles selected. Delete it and upload it again with at least one role.');

        var updates = {};
        updates['status'] = 'published';
        updates['publishedAt'] = window.firebase.database.ServerValue.TIMESTAMP;
        updates['updatedAt'] = window.firebase.database.ServerValue.TIMESTAMP;
        await ctx.db.ref('documents/' + id).update(updates);

        var entry = indexEntry(Object.assign({}, record, { status: 'published' }));
        for (var i = 0; i < roles.length; i += 1) {
            await ctx.db.ref('documentsByRole/' + roles[i] + '/' + id).set(entry);
        }
        await utils.recordAudit(ctx.db, 'Document published', record.title, 'Now visible to: ' + roles.join(', ') + '.');
        showPageMessage('"' + record.title + '" is now visible to ' + roles.join(' and ') + ' in their dashboards.', 'success');
    }

    async function unpublishDocument(id, record) {
        var roles = Object.keys(record.roles || {});
        await ctx.db.ref('documents/' + id).update({
            status: 'draft',
            updatedAt: window.firebase.database.ServerValue.TIMESTAMP
        });
        for (var i = 0; i < roles.length; i += 1) {
            await ctx.db.ref('documentsByRole/' + roles[i] + '/' + id).remove();
        }
        await utils.recordAudit(ctx.db, 'Document unpublished', record.title, 'Removed from worker dashboards.');
        showPageMessage('"' + record.title + '" is back to draft and no longer visible to workers.', 'success');
    }

    async function deleteDocument(id, record) {
        var confirmed = window.confirm('Delete "' + (record.title || 'this document') + '" permanently? It will be removed from Cloudinary and from every worker dashboard.');
        if (!confirmed) return;

        var roles = Object.keys(record.roles || {});
        if (record.cloudinaryPublicId) {
            try {
                await window.SeedwelCloudinary.remove({ kind: 'document', publicId: record.cloudinaryPublicId, user: ctx.user });
            } catch (error) {
                // Continue removing the database records even if the asset was
                // already gone from Cloudinary; the reference must not survive.
                console.warn('Cloudinary delete returned:', error);
            }
        }
        for (var i = 0; i < roles.length; i += 1) {
            await ctx.db.ref('documentsByRole/' + roles[i] + '/' + id).remove().catch(function () {});
        }
        await ctx.db.ref('documents/' + id).remove();
        await utils.recordAudit(ctx.db, 'Document deleted', record.title, 'Removed the file and all worker visibility.');
        showPageMessage('"' + record.title + '" was deleted.', 'success');
    }

    /* ─────────────── filters ─────────────── */

    $('documentSearch').addEventListener('input', utils.debounce(function (event) {
        searchTerm = String(event.target.value || '').toLowerCase();
        renderLibrary();
    }, 160));

    $('documentFilter').addEventListener('change', function (event) {
        statusFilter = event.target.value;
        renderLibrary();
    });

    $('refreshDocuments').addEventListener('click', function () {
        ctx.db.ref('documents').once('value').then(function (snapshot) {
            documents = snapshot.val() || {};
            renderLibrary();
            showPageMessage('Document library refreshed.', 'success');
        }).catch(handleActionError);
    });

    /* ─────────────── boot ─────────────── */

    shared.withAdminPage(function (setup) {
        ctx = setup;
        loadLibrary();
    });
})();
