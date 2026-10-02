import { Router } from 'express';
import { pool } from '../db/pool.js';

export const usersRouter = Router();

usersRouter.get('/', async (req, res) => {
  const { rows } = await pool.query(
    `SELECT u.id, u.name
     FROM users u
     JOIN workspace_members wm ON wm.user_id = u.id
     WHERE wm.workspace_id = $1
     ORDER BY u.name ASC
     LIMIT 500`,
    [req.user.workspaceId],
  );
  return res.json({ users: rows });
});