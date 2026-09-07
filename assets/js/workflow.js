/**
 * Seedwel Workplace — task workflow state machine (pure, dependency-free).
 *
 * Workflow for staff:
 *   Pending -> "I'm on it" (accepted) -> In Progress -> Submitted
 *   Submitted -> Approved              (manager/admin)
 *   Submitted -> Changes Required      (manager/admin)
 *   Changes Required -> Resubmitted -> Approved
 *
 * The module is intentionally side-effect free so it can be unit tested in
 * Node and loaded directly in the browser (window.SeedwelWorkflow).
 */
(function (root, factory) {
    'use strict';
    var api = factory();
    if (typeof module === 'object' && module.exports) module.exports = api;
    if (root) root.SeedwelWorkflow = api;
})(typeof window !== 'undefined' ? window : null, function () {
    'use strict';

    var STATUSES = Object.freeze([
        'pending',
        'accepted',
        'in_progress',
        'submitted',
        'approved',
        'changes_required',
        'resubmitted'
    ]);

    // Legacy status 'completed' is treated as approved for display purposes.
    var STATUS_META = Object.freeze({
        pending: { label: 'Pending', className: 'pending', icon: 'fa-hourglass-half', hint: 'Waiting for someone to take this on.' },
        accepted: { label: "I'm On It", className: 'accepted', icon: 'fa-hand-point-up', hint: 'A team member has accepted this task.' },
        in_progress: { label: 'In Progress', className: 'in_progress', icon: 'fa-spinner', hint: 'Work is underway.' },
        submitted: { label: 'Submitted', className: 'submitted', icon: 'fa-paper-plane', hint: 'Awaiting approval from your manager.' },
        approved: { label: 'Approved', className: 'approved', icon: 'fa-circle-check', hint: 'Approved. Great work.' },
        'changes_required': { label: 'Changes Required', className: 'changes_required', icon: 'fa-pen-to-square', hint: 'Your manager asked for changes. Review the note and resubmit.' },
        resubmitted: { label: 'Resubmitted', className: 'resubmitted', icon: 'fa-rotate', hint: 'Resubmitted — awaiting approval from your manager.' },
        completed: { label: 'Approved', className: 'approved', icon: 'fa-circle-check', hint: 'Approved. Great work.' }
    });

    // Staff-facing actions, keyed by current status.
    var STAFF_ACTIONS = Object.freeze({
        pending: [
            { key: 'accept', label: "I'm on it", to: 'accepted', icon: 'fa-hand-point-up', cls: 'primary' }
        ],
        accepted: [
            { key: 'start', label: 'Start work', to: 'in_progress', icon: 'fa-play', cls: 'primary' },
            { key: 'back', label: 'Back to pending', to: 'pending', icon: 'fa-arrow-rotate-left', cls: 'ghost' }
        ],
        in_progress: [
            { key: 'submit', label: 'Submit for approval', to: 'submitted', icon: 'fa-paper-plane', cls: 'primary' },
            { key: 'back', label: 'Back to pending', to: 'pending', icon: 'fa-arrow-rotate-left', cls: 'ghost' }
        ],
        'changes_required': [
            { key: 'resubmit', label: 'Resubmit for approval', to: 'resubmitted', icon: 'fa-paper-plane', cls: 'primary' }
        ],
        submitted: [],
        resubmitted: [],
        approved: [],
        completed: []
    });

    // Manager/administrator review actions.
    var MANAGER_ACTIONS = Object.freeze({
        submitted: [
            { key: 'approve', label: 'Approve', to: 'approved', icon: 'fa-circle-check', cls: 'success' },
            { key: 'reject', label: 'Request changes', to: 'changes_required', icon: 'fa-pen-to-square', cls: 'danger' }
        ],
        resubmitted: [
            { key: 'approve', label: 'Approve', to: 'approved', icon: 'fa-circle-check', cls: 'success' },
            { key: 'reject', label: 'Request changes', to: 'changes_required', icon: 'fa-pen-to-square', cls: 'danger' }
        ],
        approved: [
            { key: 'reopen', label: 'Reopen', to: 'in_progress', icon: 'fa-arrow-rotate-left', cls: 'ghost' }
        ],
        'changes_required': [
            { key: 'reopen', label: 'Reopen', to: 'in_progress', icon: 'fa-arrow-rotate-left', cls: 'ghost' }
        ],
        pending: [],
        accepted: [],
        in_progress: []
    });

    function isKnown(status) {
        var value = String(status == null ? '' : status).trim().toLowerCase();
        return STATUSES.indexOf(value) !== -1 || value === 'completed';
    }

    function normalize(status) {
        var value = String(status == null ? '' : status).trim().toLowerCase();
        return STATUSES.indexOf(value) !== -1 || value === 'completed' ? value : 'pending';
    }

    function meta(status) {
        var key = normalize(status);
        return STATUS_META[key] || STATUS_META.pending;
    }

    function label(status) {
        return meta(status).label;
    }

    function staffActions(status) {
        return isKnown(status) ? (STAFF_ACTIONS[normalize(status)] || []).slice() : [];
    }

    function managerActions(status) {
        return isKnown(status) ? (MANAGER_ACTIONS[normalize(status)] || []).slice() : [];
    }

    function canStaffTransition(from, to) {
        return staffActions(from).some(function (action) { return action.to === to; });
    }

    function canManagerTransition(from, to) {
        return managerActions(from).some(function (action) { return action.to === to; });
    }

    function isReviewStatus(status) {
        var key = normalize(status);
        return key === 'submitted' || key === 'resubmitted';
    }

    function isCompleted(status) {
        var key = normalize(status);
        return key === 'approved' || key === 'completed';
    }

    function historyEntry(actor, actorName, action, note) {
        return {
            actor: String(actor == null ? '' : actor).slice(0, 160),
            actorName: String(actorName == null ? '' : actorName).slice(0, 120),
            action: String(action == null ? '' : action).slice(0, 80),
            note: String(note == null ? '' : note).slice(0, 1000)
        };
    }

    function milestone(status) {
        switch (normalize(status)) {
            case 'accepted': return 'Task accepted';
            case 'in_progress': return 'Work started';
            case 'submitted': return 'Submitted for approval';
            case 'approved':
            case 'completed': return 'Task approved';
            case 'changes_required': return 'Changes required';
            case 'resubmitted': return 'Resubmitted for approval';
            default: return 'Task created';
        }
    }

    return Object.freeze({
        STATUSES: STATUSES,
        STATUS_META: STATUS_META,
        normalize: normalize,
        meta: meta,
        label: label,
        staffActions: staffActions,
        managerActions: managerActions,
        canStaffTransition: canStaffTransition,
        canManagerTransition: canManagerTransition,
        isReviewStatus: isReviewStatus,
        isCompleted: isCompleted,
        historyEntry: historyEntry,
        milestone: milestone
    });
});
