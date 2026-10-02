import { Router } from 'express';
import { pool } from '../db/pool.js';
import { generateInvitationToken, hashInvitationToken } from '../services/workspaceInvitations.js';

export const invitationsRouter = Router();

invitationsRouter.post('/', async (req, res) => {
  if (req.user.workspaceRole !== 'owner') {
    return res.status(403).json({ error: 'Only workspace owners can invite members.' });
  }

  const token = generateInvitationToken();
  const { rows } = await pool.query(
    `INSERT INTO workspace_invitations (workspace_id, token_hash, created_by, expires_at)
     VALUES ($1, $2, $3, NOW() + INTERVAL '7 days')
     RETURNING expires_at`,
    [req.user.workspaceId, hashInvitationToken(token), req.user.sub],
  );
  return res.status(201).json({ token, expiresAt: rows[0].expires_at });
});