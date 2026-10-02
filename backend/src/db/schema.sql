CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(60) NOT NULL,
  email VARCHAR(254) NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS workspaces (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(80) NOT NULL,
  created_by UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS workspace_members (
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  user_id UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  role VARCHAR(20) NOT NULL CHECK (role IN ('owner', 'member')),
  joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (workspace_id, user_id)
);

CREATE TABLE IF NOT EXISTS workspace_invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  token_hash CHAR(64) NOT NULL UNIQUE,
  created_by UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL,
  accepted_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  title VARCHAR(140) NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  status VARCHAR(20) NOT NULL DEFAULT 'To Do'
    CHECK (status IN ('To Do', 'In Progress', 'Completed')),
  priority VARCHAR(10) NOT NULL DEFAULT 'Medium'
    CHECK (priority IN ('Low', 'Medium', 'High')),
  assigned_to UUID REFERENCES users(id) ON DELETE SET NULL,
  due_date DATE,
  created_by UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE tasks
  ADD COLUMN IF NOT EXISTS workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE;

DO $$
DECLARE
  bootstrap_user UUID;
  bootstrap_workspace UUID;
BEGIN
  SELECT id INTO bootstrap_user
  FROM users
  WHERE NOT EXISTS (
    SELECT 1 FROM workspace_members WHERE workspace_members.user_id = users.id
  )
  ORDER BY created_at, id
  LIMIT 1;

  IF bootstrap_user IS NOT NULL THEN
    INSERT INTO workspaces (name, created_by)
    VALUES ('Existing Team', bootstrap_user)
    RETURNING id INTO bootstrap_workspace;

    INSERT INTO workspace_members (workspace_id, user_id, role)
    SELECT bootstrap_workspace, users.id,
      CASE WHEN users.id = bootstrap_user THEN 'owner' ELSE 'member' END
    FROM users
    WHERE NOT EXISTS (
      SELECT 1 FROM workspace_members WHERE workspace_members.user_id = users.id
    )
    ON CONFLICT (user_id) DO NOTHING;
  END IF;
END $$;

UPDATE tasks
SET workspace_id = workspace_members.workspace_id
FROM workspace_members
WHERE tasks.created_by = workspace_members.user_id
  AND tasks.workspace_id IS NULL;

ALTER TABLE tasks ALTER COLUMN workspace_id SET NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'tasks_creator_workspace_fkey') THEN
    ALTER TABLE tasks ADD CONSTRAINT tasks_creator_workspace_fkey
      FOREIGN KEY (workspace_id, created_by)
      REFERENCES workspace_members(workspace_id, user_id);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'tasks_assignee_workspace_fkey') THEN
    ALTER TABLE tasks ADD CONSTRAINT tasks_assignee_workspace_fkey
      FOREIGN KEY (workspace_id, assigned_to)
      REFERENCES workspace_members(workspace_id, user_id);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS workspace_members_user_idx ON workspace_members(user_id);
CREATE INDEX IF NOT EXISTS workspace_invitations_workspace_idx ON workspace_invitations(workspace_id);
CREATE INDEX IF NOT EXISTS tasks_workspace_idx ON tasks(workspace_id);
CREATE INDEX IF NOT EXISTS tasks_status_idx ON tasks(status);
CREATE INDEX IF NOT EXISTS tasks_assigned_to_idx ON tasks(assigned_to);
CREATE INDEX IF NOT EXISTS tasks_created_by_idx ON tasks(created_by);
CREATE INDEX IF NOT EXISTS tasks_due_date_idx ON tasks(due_date);

CREATE OR REPLACE FUNCTION update_task_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS tasks_updated_at_trigger ON tasks;
CREATE TRIGGER tasks_updated_at_trigger
BEFORE UPDATE ON tasks
FOR EACH ROW EXECUTE FUNCTION update_task_updated_at();