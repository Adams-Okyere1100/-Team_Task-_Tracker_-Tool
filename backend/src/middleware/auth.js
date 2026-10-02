import jwt from 'jsonwebtoken';
import { pool } from '../db/pool.js';

export async function requireAuth(req, res, next) {
  const token = req.cookies?.team_task_session;

  if (!token) {
    return res.status(401).json({ error: 'Authentication required.' });
  }

  let claims;
  try {
    claims = jwt.verify(token, process.env.JWT_SECRET, { algorithms: ['HS256'] });
  } catch {
    return res.status(401).json({ error: 'Your session has expired. Please sign in again.' });
  }

  const { rows } = await pool.query(
    `SELECT wm.workspace_id, wm.role AS workspace_role, w.name AS workspace_name
     FROM workspace_members wm
     JOIN workspaces w ON w.id = wm.workspace_id
     WHERE wm.user_id = $1 AND wm.workspace_id = $2`,
    [claims.sub, claims.workspaceId],
  );
  if (!rows[0]) {
    return res.status(401).json({ error: 'Your workspace access has changed. Please sign in again.' });
  }
  req.user = {
    ...claims,
    workspaceId: rows[0].workspace_id,
    workspaceRole: rows[0].workspace_role,
    workspaceName: rows[0].workspace_name,
  };
  return next();
}