import test from 'node:test';
import assert from 'node:assert/strict';
import { canDeleteTask, taskUpdatePermission } from '../src/services/taskPermissions.js';

const task = { created_by: 'creator-id', assigned_to: 'assignee-id' };

test('creator may edit task details and delete the task', () => {
  assert.equal(taskUpdatePermission('creator-id', task, { title: 'Updated' }), 'edit');
  assert.equal(canDeleteTask('creator-id', task), true);
});

test('assignee may change only task status', () => {
  assert.equal(taskUpdatePermission('assignee-id', task, { status: 'Completed' }), 'status');
  assert.equal(taskUpdatePermission('assignee-id', task, { title: 'Updated' }), null);
  assert.equal(taskUpdatePermission('assignee-id', task, { status: 'Completed', title: 'Updated' }), null);
  assert.equal(canDeleteTask('assignee-id', task), false);
});

test('unrelated team member cannot edit or delete a task', () => {
  assert.equal(taskUpdatePermission('other-id', task, { status: 'Completed' }), null);
  assert.equal(canDeleteTask('other-id', task), false);
});