'use strict';

const test = require('node:test');
const assert = require('node:assert');
const workflow = require('../assets/js/workflow.js');

test('STATUS_META covers every status with a label, class and hint', () => {
    workflow.STATUSES.forEach((status) => {
        const meta = workflow.meta(status);
        assert.ok(meta.label.length > 0, `${status} has a label`);
        assert.ok(meta.className.length > 0, `${status} has a class name`);
        assert.ok(meta.hint.length > 0, `${status} has a hint`);
    });
});

test('staff workflow: Pending -> I\u2019m on it -> In Progress -> Submitted -> Approved', () => {
    assert.ok(workflow.canStaffTransition('pending', 'accepted'));
    assert.ok(!workflow.canStaffTransition('pending', 'in_progress'));
    assert.ok(workflow.canStaffTransition('accepted', 'in_progress'));
    assert.ok(workflow.canStaffTransition('in_progress', 'submitted'));
    assert.ok(!workflow.canStaffTransition('in_progress', 'approved'));
    assert.strictEqual(workflow.staffActions('submitted').length, 0, 'submitted is a waiting state for staff');
    assert.strictEqual(workflow.staffActions('approved').length, 0, 'approved is final for staff');
});

test('rejection loop: Changes Required -> Resubmitted -> Approvable', () => {
    assert.ok(workflow.canStaffTransition('changes_required', 'resubmitted'));
    assert.ok(workflow.canManagerTransition('resubmitted', 'approved'));
    assert.ok(workflow.canManagerTransition('resubmitted', 'changes_required'));
    assert.ok(workflow.canManagerTransition('submitted', 'approved'));
    assert.ok(workflow.canManagerTransition('submitted', 'changes_required'));
});

test('managers cannot approve unfinished tasks, only review submitted work', () => {
    assert.ok(!workflow.canManagerTransition('pending', 'approved'));
    assert.ok(!workflow.canManagerTransition('accepted', 'approved'));
    assert.ok(!workflow.canManagerTransition('in_progress', 'approved'));
    assert.ok(workflow.canManagerTransition('approved', 'in_progress'), 'approved work can be reopened');
});

test('legacy completed status reads as approved but offers no actions', () => {
    assert.strictEqual(workflow.label('completed'), 'Approved');
    assert.ok(workflow.isCompleted('completed'));
    assert.ok(workflow.isCompleted('approved'));
    assert.strictEqual(workflow.staffActions('completed').length, 0);
    assert.ok(!workflow.isReviewStatus('completed'));
    assert.ok(workflow.isReviewStatus('submitted'));
    assert.ok(workflow.isReviewStatus('resubmitted'));
});

test('unknown or empty statuses normalize safely to pending', () => {
    assert.strictEqual(workflow.normalize(null), 'pending');
    assert.strictEqual(workflow.normalize('  SUBMITTED '), 'submitted');
    assert.strictEqual(workflow.label('nonsense'), 'Pending');
    assert.deepStrictEqual(workflow.staffActions('nonsense'), []);
});

test('history entries are bounded and milestone copy is readable', () => {
    const entry = workflow.historyEntry('actor@seedwel.ltd', 'Zacheus Simbaya', 'Approved', 'Great work!');
    assert.strictEqual(entry.actor, 'actor@seedwel.ltd');
    assert.strictEqual(entry.action, 'Approved');
    assert.strictEqual(workflow.milestone('submitted'), 'Submitted for approval');
    assert.strictEqual(workflow.milestone('changes_required'), 'Changes required');
    assert.strictEqual(workflow.milestone('pending'), 'Task created');
});
