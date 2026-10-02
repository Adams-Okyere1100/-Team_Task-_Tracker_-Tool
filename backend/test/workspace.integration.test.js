import 'dotenv/config';
import test from 'node:test';
import assert from 'node:assert/strict';
import { app } from '../src/server.js';
import { pool } from '../src/db/pool.js';

test('workspaces isolate tasks and members, and invitations are one-use', {
  skip: process.env.RUN_DB_INTEGRATION_TESTS !== 'true',
}, async () => {
  const server = app.listen(0, '127.0.0.1');
  await new Promise((resolve) => server.once('listening', resolve));
  const api = `http://127.0.0.1:${server.address().port}/api`;
  const createdUsers = [];
  const createdWorkspaces = [];

  async function request(path, { method = 'GET', body, cookie } = {}) {
    const headers = { origin: 'http://localhost:5173' };
    if (body !== undefined) headers['content-type'] = 'application/json';
    if (cookie) headers.cookie = cookie;
    const response = await fetch(`${api}${path}`, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    const session = response.headers.get('set-cookie')?.match(/team_task_session=[^;]+/)?.[0] || cookie;
    const payload = response.status === 204 ? null : await response.json();
    return { status: response.status, payload, cookie: session };
  }

  try {
    const suffix = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const owner = await request('/auth/register', {
      method: 'POST',
      body: {
        name: 'Workspace Owner',
        email: `owner-${suffix}@example.com`,
        password: 'StrongPass123',
        workspaceName: `Alpha ${suffix}`,
      },
    });
    assert.equal(owner.status, 201);
    createdUsers.push(owner.payload.user.id);
    createdWorkspaces.push(owner.payload.user.workspaceId);

    const task = await request('/tasks', {
      method: 'POST',
      cookie: owner.cookie,
      body: { title: `Private task ${suffix}` },
    });
    assert.equal(task.status, 201);

    const invitation = await request('/invitations', {
      method: 'POST',
      cookie: owner.cookie,
      body: {},
    });
    assert.equal(invitation.status, 201);

    const member = await request('/auth/register', {
      method: 'POST',
      body: {
        name: 'Workspace Member',
        email: `member-${suffix}@example.com`,
        password: 'StrongPass123',
        inviteToken: invitation.payload.token,
      },
    });
    assert.equal(member.status, 201);
    createdUsers.push(member.payload.user.id);
    assert.equal(member.payload.user.workspaceId, owner.payload.user.workspaceId);
    assert.equal(member.payload.user.workspaceRole, 'member');

    const memberInvite = await request('/invitations', {
      method: 'POST',
      cookie: member.cookie,
      body: {},
    });
    assert.equal(memberInvite.status, 403);

    const memberList = await request('/users', { cookie: member.cookie });
    assert.equal(memberList.payload.users.length, 2);

    const otherOwner = await request('/auth/register', {
      method: 'POST',
      body: {
        name: 'Other Owner',
        email: `other-${suffix}@example.com`,
        password: 'StrongPass123',
        workspaceName: `Beta ${suffix}`,
      },
    });
    assert.equal(otherOwner.status, 201);
    createdUsers.push(otherOwner.payload.user.id);
    createdWorkspaces.push(otherOwner.payload.user.workspaceId);

    const otherTasks = await request('/tasks', { cookie: otherOwner.cookie });
    const otherMembers = await request('/users', { cookie: otherOwner.cookie });
    assert.deepEqual(otherTasks.payload.tasks, []);
    assert.equal(otherMembers.payload.users.length, 1);

    const crossWorkspaceTask = await request(`/tasks/${task.payload.task.id}`, {
      method: 'PATCH',
      cookie: otherOwner.cookie,
      body: { title: 'Attempted access' },
    });
    assert.equal(crossWorkspaceTask.status, 404);

    const replay = await request('/auth/register', {
      method: 'POST',
      body: {
        name: 'Invite Replay',
        email: `replay-${suffix}@example.com`,
        password: 'StrongPass123',
        inviteToken: invitation.payload.token,
      },
    });
    assert.equal(replay.status, 400);
  } finally {
    if (createdWorkspaces.length) {
      await pool.query('DELETE FROM workspaces WHERE id = ANY($1::uuid[])', [createdWorkspaces]);
    }
    if (createdUsers.length) {
      await pool.query('DELETE FROM users WHERE id = ANY($1::uuid[])', [createdUsers]);
    }
    await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
    await pool.end();
  }
});