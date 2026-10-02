import { Router } from 'express';
import { pool } from '../db/pool.js';
import { idSchema, createTaskSchema, taskQuerySchema, updateTaskSchema } from '../validators.js';
import { canDeleteTask, taskUpdatePermission } from '../services/taskPermissions.js';

export const tasksRouter = Router();

const taskColumns = `
  t.id, t.title, t.description, t.status, t.priority,
  t.assigned_to AS "assignedTo", assignee.name AS "assigneeName",
  t.due_date::text AS "dueDate", t.created_by AS "createdBy",
  creator.name AS "creatorName", t.created_at AS "createdAt",
  t.updated_at AS "updatedAt"
`;

async function findTask(id, workspaceId) {
  const { rows } = await pool.query(
    `SELECT ${taskColumns}
     FROM tasks t
     LEFT JOIN users assignee ON assignee.id = t.assigned_to
     JOIN users creator ON creator.id = t.created_by
    WHERE t.id = $1 AND t.workspace_id = $2`,
      [id, workspaceId],
  );
  return rows[0];
}

tasksRouter.get('/', async (req, res) => {
  const filters = taskQuerySchema.parse(req.query);
  const search = filters.q ? `%${filters.q.replace(/[\\%_]/g, '\\$&')}%` : null;
  const { rows } = await pool.query(
    `SELECT ${taskColumns}
     FROM tasks t
     LEFT JOIN users assignee ON assignee.id = t.assigned_to
     JOIN users creator ON creator.id = t.created_by
    WHERE t.workspace_id = $1
      AND ($2::text IS NULL OR t.title ILIKE $2 OR t.description ILIKE $2)
      AND ($3::text IS NULL OR t.status = $3)
      AND ($4::text IS NULL OR t.priority = $4)
      AND ($5::text IS NULL OR ($5 = 'unassigned' AND t.assigned_to IS NULL)
        OR t.assigned_to::text = $5)
     ORDER BY
       CASE t.status WHEN 'To Do' THEN 1 WHEN 'In Progress' THEN 2 ELSE 3 END,
       t.due_date ASC NULLS LAST,
       t.created_at DESC
     LIMIT 1000`,
    [req.user.workspaceId, search, filters.status ?? null, filters.priority ?? null, filters.assignedTo ?? null],
  );
  return res.json({ tasks: rows });
});

tasksRouter.post('/', async (req, res) => {
  const input = createTaskSchema.parse(req.body);
  if (input.assignedTo) {
    const { rowCount } = await pool.query(
      'SELECT 1 FROM workspace_members WHERE workspace_id = $1 AND user_id = $2',
      [req.user.workspaceId, input.assignedTo],
    );
    if (!rowCount) return res.status(400).json({ error: 'Choose a member of this workspace.' });
  }
  const { rows } = await pool.query(
    `INSERT INTO tasks (workspace_id, title, description, status, priority, assigned_to, due_date, created_by)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     RETURNING id`,
    [req.user.workspaceId, input.title, input.description, input.status, input.priority, input.assignedTo, input.dueDate, req.user.sub],
  );
  const task = await findTask(rows[0].id, req.user.workspaceId);
  return res.status(201).json({ task });
});

tasksRouter.patch('/:id', async (req, res) => {
  const id = idSchema.parse(req.params.id);
  const input = updateTaskSchema.parse(req.body);
  if (input.assignedTo) {
    const { rowCount } = await pool.query(
      'SELECT 1 FROM workspace_members WHERE workspace_id = $1 AND user_id = $2',
      [req.user.workspaceId, input.assignedTo],
    );
    if (!rowCount) return res.status(400).json({ error: 'Choose a member of this workspace.' });
  }
  const { rows } = await pool.query(
    'SELECT created_by, assigned_to FROM tasks WHERE id = $1 AND workspace_id = $2',
    [id, req.user.workspaceId],
  );
  const current = rows[0];
  if (!current) return res.status(404).json({ error: 'Task not found.' });

  const permission = taskUpdatePermission(req.user.sub, current, input);
  if (!permission) {
    return res.status(403).json({ error: 'Only the task creator can edit task details. Assignees may update status.' });
  }

  const fields = {
    title: 'title',
    description: 'description',
    status: 'status',
    priority: 'priority',
    assignedTo: 'assigned_to',
    dueDate: 'due_date',
  };
  const entries = Object.entries(input);
  const values = entries.map(([, value]) => value);
  const assignments = entries.map(([key], index) => `${fields[key]} = $${index + 1}`);
  values.push(id);
  values.push(req.user.workspaceId);
  await pool.query(
    `UPDATE tasks SET ${assignments.join(', ')} WHERE id = $${values.length - 1} AND workspace_id = $${values.length}`,
    values,
  );
  return res.json({ task: await findTask(id, req.user.workspaceId) });
});

tasksRouter.delete('/:id', async (req, res) => {
  const id = idSchema.parse(req.params.id);
  const { rows } = await pool.query(
    'SELECT created_by FROM tasks WHERE id = $1 AND workspace_id = $2',
    [id, req.user.workspaceId],
  );
  if (!rows[0]) return res.status(404).json({ error: 'Task not found.' });
  if (!canDeleteTask(req.user.sub, rows[0])) {
    return res.status(403).json({ error: 'Only the task creator can delete this task.' });
  }
  await pool.query('DELETE FROM tasks WHERE id = $1 AND workspace_id = $2', [id, req.user.workspaceId]);
  return res.status(204).end();
});