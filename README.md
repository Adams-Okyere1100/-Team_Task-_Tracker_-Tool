# Tandem Team Task Tracker

A shared team workspace for assigning work, tracking progress, and keeping due dates visible. The app is built with React, Vite, and Tailwind CSS, backed by Express and PostgreSQL.

## Features

- Account registration and sign-in with bcrypt password hashing and signed JWT sessions in HttpOnly cookies.
- Isolated team workspaces; owners invite members with one-use links that expire after seven days.
- Shared Kanban board with To Do, In Progress, and Completed columns.
- Create, edit, assign, and delete tasks with descriptions, priority, and due dates.
- Search by task title, description, assignee, or creator; filter by priority and assignee.
- Team completion and overdue summaries, plus personal views for assigned and created tasks.
- Creator-only task editing/deletion; an assignee can update a task's status.
- Responsive dashboard, request validation, protected routes, rate-limited sign-in, and origin checks.

## Requirements

- Node.js 20.19+ or 22.12+.
- PostgreSQL 14+.

## Local development

1. Create a PostgreSQL database named `team_task_tracker`.
2. Copy `backend/.env.example` to `backend/.env` and set `DATABASE_URL` and a private `JWT_SECRET` with at least 32 characters. Keep `.env` files out of version control.
3. Set up the tables and indexes:

	```sh
	cd backend
	npm ci
	npm run db:setup
	npm run dev
	```

4. In a second terminal, configure and start the frontend:

	```sh
	cd frontend
	cp .env.example .env
	npm ci
	npm run dev
	```

The client runs at `http://localhost:5173` and the API at `http://localhost:3000`. The API health check at `/api/health` verifies the database connection. Registration creates a private workspace, or accepts a one-use invitation link to join an existing team. The first account in a workspace is its owner and can create member invitations.

## Environment variables

### Backend

| Variable | Required | Description |
| --- | --- | --- |
| `DATABASE_URL` | Yes | PostgreSQL connection URL. |
| `JWT_SECRET` | Yes | Secret of at least 32 characters used to sign sessions. |
| `CLIENT_ORIGINS` | No | Comma-separated exact browser origins allowed by CORS and state-changing request checks. Defaults to `http://localhost:5173`. |
| `DATABASE_SSL` | No | Set to `true` when the database requires TLS. |
| `NODE_ENV` | No | Use `production` for secure cross-site session cookies. |
| `PORT` | No | API listen port; defaults to `3000`. |

### Frontend

| Variable | Required | Description |
| --- | --- | --- |
| `VITE_API_URL` | No | API base URL including `/api`. Local `.env.example` uses `/api` through the Vite proxy; set the full deployed API URL (for example, `https://your-api.onrender.com/api`) in Vercel. |

## API overview

Task, user, and invitation endpoints require the session cookie. Members can only see tasks and people in their workspace. Task ownership rules restrict writes; only workspace owners can create invite links.

| Method | Path | Purpose |
| --- | --- | --- |
| `POST` | `/api/auth/register` | Create a workspace with `workspaceName`, or join with `inviteToken`, then sign in. |
| `POST` | `/api/invitations` | Create a seven-day, one-use invitation link as workspace owner. |
| `POST` | `/api/auth/login` | Sign in. |
| `POST` | `/api/auth/logout` | Clear the session cookie. |
| `GET` | `/api/auth/me` | Get the current account. |
| `GET` | `/api/users` | List assignable team members. |
| `GET` | `/api/tasks` | List tasks; supports `q`, `status`, `priority`, and `assignedTo` filters. |
| `POST` | `/api/tasks` | Create a task. |
| `PATCH` | `/api/tasks/:id` | Edit a task or update an assigned task's status. |
| `DELETE` | `/api/tasks/:id` | Delete a task as its creator. |
| `GET` | `/api/health` | Check API and database connectivity. |

Task status values are `To Do`, `In Progress`, and `Completed`; priorities are `Low`, `Medium`, and `High`.

## Database

The schema and idempotent setup script are in `backend/src/db/schema.sql` and `backend/src/db/setup.js`. Existing users and tasks are migrated together into an `Existing Team` workspace; review that membership before using migrated data with real teams. Existing users must sign in again after migration. The `users` table stores bcrypt hashes, never plaintext passwords. Tasks, assignments, and member lists are scoped to workspace membership.

## Tests and production build

```sh
cd backend
npm test

cd ../frontend
npm run build
```

The backend tests cover input validation, task write permissions, and invitation token handling. With a local database configured and the schema initialized, run the database-backed workspace isolation test with `RUN_DB_INTEGRATION_TESTS=true npm test` from `backend`.

## Deployment

### Render API and PostgreSQL

The root `render.yaml` defines a Render web service and managed PostgreSQL database. Create a Blueprint deployment from this repository. Provide `CLIENT_ORIGINS` when prompted with the exact deployed Vercel origin, without a trailing slash. The service initializes the idempotent schema as part of its start command.

### Vercel frontend

Import the repository in Vercel and set the project root directory to `frontend`. Set `VITE_API_URL` to the Render API URL followed by `/api`, for example `https://your-api.onrender.com/api`, then deploy. The `frontend/vercel.json` rewrite supports client-side fallback routing.

Both production origins must use HTTPS. The API uses credentialed CORS, exact origin allow-listing, and `Secure`, `HttpOnly`, `SameSite=None` cookies in production. For browsers that block third-party cookies, use frontend and API custom domains under the same site and configure the matching exact frontend origin in `CLIENT_ORIGINS`.
