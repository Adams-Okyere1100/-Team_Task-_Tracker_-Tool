import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { rateLimit } from 'express-rate-limit';
import { createHash } from 'node:crypto';
import { pool } from '../db/pool.js';
import { requireAuth } from '../middleware/auth.js';
import { sessionCookieOptions } from '../middleware/origin.js';
import { loginSchema, registerSchema } from '../validators.js';

export const authRouter = Router();

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: { error: 'Too many sign-in attempts. Try again in 15 minutes.' },
});
const dummyPasswordHash = bcrypt.hashSync('not-a-real-user-password', 12);

function issueSession(user, res) {
  const token = jwt.sign(
    {
      sub: user.id,
      email: user.email,
      name: user.name,
      workspaceId: user.workspace_id,
    },
    process.env.JWT_SECRET,
    { algorithm: 'HS256', expiresIn: '12h' },
  );
  res.cookie('team_task_session', token, sessionCookieOptions);
}

function publicUser(row) {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    createdAt: row.created_at,
    workspaceId: row.workspace_id,
    workspaceName: row.workspace_name,
    workspaceRole: row.workspace_role,
  };
}

authRouter.post('/register', loginLimiter, async (req, res) => {
  const input = registerSchema.parse(req.body);
  const passwordHash = await bcrypt.hash(input.password, 12);
  const client = await pool.connect();

  try {
    await client.query('BEGIN');
    const { rows } = await client.query(
      `INSERT INTO users (name, email, password_hash)
       VALUES ($1, $2, $3)
       RETURNING id, name, email, created_at`,
      [input.name, input.email, passwordHash],
    );
    const newUser = rows[0];
    let workspace;

    if (input.inviteToken) {
      const tokenHash = createHash('sha256').update(input.inviteToken).digest('hex');
      const invitationResult = await client.query(
        `SELECT id, workspace_id
         FROM workspace_invitations
         WHERE token_hash = $1 AND accepted_at IS NULL AND expires_at > NOW()
         FOR UPDATE`,
        [tokenHash],
      );
      const invitation = invitationResult.rows[0];
      if (!invitation) {
        const error = new Error('This invitation link is invalid, expired, or already used.');
        error.statusCode = 400;
        throw error;
      }

      const workspaceResult = await client.query(
        'SELECT id, name FROM workspaces WHERE id = $1',
        [invitation.workspace_id],
      );
      workspace = { ...workspaceResult.rows[0], role: 'member' };
      await client.query(
        'INSERT INTO workspace_members (workspace_id, user_id, role) VALUES ($1, $2, $3)',
        [workspace.id, newUser.id, workspace.role],
      );
      await client.query(
        'UPDATE workspace_invitations SET accepted_at = NOW() WHERE id = $1',
        [invitation.id],
      );
    } else {
      const workspaceResult = await client.query(
        'INSERT INTO workspaces (name, created_by) VALUES ($1, $2) RETURNING id, name',
        [input.workspaceName, newUser.id],
      );
      workspace = { ...workspaceResult.rows[0], role: 'owner' };
      await client.query(
        'INSERT INTO workspace_members (workspace_id, user_id, role) VALUES ($1, $2, $3)',
        [workspace.id, newUser.id, workspace.role],
      );
    }

    await client.query('COMMIT');
    const user = {
      ...newUser,
      workspace_id: workspace.id,
      workspace_name: workspace.name,
      workspace_role: workspace.role,
    };
    issueSession(user, res);
    return res.status(201).json({ user: publicUser(user) });
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
});

authRouter.post('/login', loginLimiter, async (req, res) => {
  const input = loginSchema.parse(req.body);
  const { rows } = await pool.query(
    `SELECT u.id, u.name, u.email, u.password_hash, u.created_at,
            wm.workspace_id, wm.role AS workspace_role, w.name AS workspace_name
     FROM users u
     JOIN workspace_members wm ON wm.user_id = u.id
     JOIN workspaces w ON w.id = wm.workspace_id
     WHERE u.email = $1`,
    [input.email],
  );
  const user = rows[0];
  const passwordMatches = await bcrypt.compare(input.password, user?.password_hash ?? dummyPasswordHash);

  if (!user || !passwordMatches) {
    return res.status(401).json({ error: 'Email or password is incorrect.' });
  }

  issueSession(user, res);
  return res.json({ user: publicUser(user) });
});

authRouter.post('/logout', (req, res) => {
  const { maxAge, ...clearOptions } = sessionCookieOptions;
  res.clearCookie('team_task_session', clearOptions);
  return res.status(204).end();
});

authRouter.get('/me', requireAuth, async (req, res) => {
  const { rows } = await pool.query(
    `SELECT u.id, u.name, u.email, u.created_at,
            wm.workspace_id, wm.role AS workspace_role, w.name AS workspace_name
     FROM users u
     JOIN workspace_members wm ON wm.user_id = u.id
     JOIN workspaces w ON w.id = wm.workspace_id
     WHERE u.id = $1 AND wm.workspace_id = $2`,
    [req.user.sub, req.user.workspaceId],
  );
  if (!rows[0]) return res.status(401).json({ error: 'Account no longer exists.' });
  return res.json({ user: publicUser(rows[0]) });
});