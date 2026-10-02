import test from 'node:test';
import assert from 'node:assert/strict';
import { generateInvitationToken, hashInvitationToken } from '../src/services/workspaceInvitations.js';

test('invitation tokens are random bearer secrets stored as one-way hashes', () => {
  const firstToken = generateInvitationToken();
  const secondToken = generateInvitationToken();

  assert.equal(firstToken.length, 43);
  assert.notEqual(firstToken, secondToken);
  assert.equal(hashInvitationToken(firstToken).length, 64);
  assert.notEqual(hashInvitationToken(firstToken), firstToken);
  assert.equal(hashInvitationToken(firstToken), hashInvitationToken(firstToken));
});