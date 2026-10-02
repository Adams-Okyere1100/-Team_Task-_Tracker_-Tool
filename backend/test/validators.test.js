import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createTaskSchema,
  loginSchema,
  registerSchema,
  taskQuerySchema,
  updateTaskSchema,
} from '../src/validators.js';

test('registration normalizes email and rejects short passwords', () => {
  assert.equal(registerSchema.parse({ name: ' Sam ', email: 'SAM@example.com', password: 'longpass1', workspaceName: 'Studio' }).email, 'sam@example.com');
  assert.equal(registerSchema.safeParse({ name: 'Sam', email: 'sam@example.com', password: 'short', workspaceName: 'Studio' }).success, false);
  assert.equal(registerSchema.safeParse({ name: 'Sam', email: 'sam@example.com', password: 'é'.repeat(40), workspaceName: 'Studio' }).success, false);
});

test('registration requires exactly one workspace creation name or invite token', () => {
  const base = { name: 'Sam', email: 'sam@example.com', password: 'longpass1' };
  assert.equal(registerSchema.safeParse({ ...base, workspaceName: 'Studio' }).success, true);
  assert.equal(registerSchema.safeParse({ ...base, inviteToken: 'a'.repeat(43) }).success, true);
  assert.equal(registerSchema.safeParse(base).success, false);
  assert.equal(registerSchema.safeParse({ ...base, workspaceName: 'Studio', inviteToken: 'a'.repeat(43) }).success, false);
});

test('login rejects unexpected fields', () => {
  assert.equal(loginSchema.safeParse({ email: 'sam@example.com', password: 'longpass1', admin: true }).success, false);
});

test('task creation applies defaults and validates dates', () => {
  const parsed = createTaskSchema.parse({ title: 'Prepare demo' });
  assert.equal(parsed.status, 'To Do');
  assert.equal(parsed.priority, 'Medium');
  assert.equal(parsed.assignedTo, null);
  assert.equal(createTaskSchema.safeParse({ title: 'Prepare demo', dueDate: '2026-02-31' }).success, false);
});

test('task updates require at least one allowed field', () => {
  assert.equal(updateTaskSchema.safeParse({}).success, false);
  assert.equal(updateTaskSchema.safeParse({ status: 'Completed' }).success, true);
  assert.equal(updateTaskSchema.safeParse({ createdBy: 'another-user' }).success, false);
});

test('task query filters accept supported values only', () => {
  assert.equal(taskQuerySchema.safeParse({ priority: 'High', assignedTo: 'unassigned' }).success, true);
  assert.equal(taskQuerySchema.safeParse({ status: 'Blocked' }).success, false);
});