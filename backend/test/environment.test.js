import test from 'node:test';
import assert from 'node:assert/strict';
import { assertEnvironment } from '../src/config/env.js';

test('environment validation requires a database URL and strong JWT secret', () => {
  assert.throws(() => assertEnvironment({}), /DATABASE_URL, JWT_SECRET/);
  assert.throws(() => assertEnvironment({ DATABASE_URL: 'postgres://localhost/app', JWT_SECRET: 'short' }), /at least 32 characters/);
  assert.doesNotThrow(() => assertEnvironment({ DATABASE_URL: 'postgres://localhost/app', JWT_SECRET: 'x'.repeat(32) }));
});