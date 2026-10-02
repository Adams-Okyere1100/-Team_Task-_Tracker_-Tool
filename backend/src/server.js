import 'dotenv/config';
import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { pathToFileURL } from 'node:url';
import { pool } from './db/pool.js';
import { authRouter } from './routes/auth.js';
import { invitationsRouter } from './routes/invitations.js';
import { tasksRouter } from './routes/tasks.js';
import { usersRouter } from './routes/users.js';
import { requireAuth } from './middleware/auth.js';
import { notFound, errorHandler } from './middleware/errors.js';
import { originOptions, requireTrustedOrigin } from './middleware/origin.js';
import { assertEnvironment } from './config/env.js';

export const app = express();

app.disable('x-powered-by');
app.set('trust proxy', 1);
app.use(helmet());
app.use(cors(originOptions()));
app.use(express.json({ limit: '20kb' }));
app.use(cookieParser());
app.use(requireTrustedOrigin);

app.get('/api/health', async (req, res) => {
  await pool.query('SELECT 1');
  return res.json({ status: 'ok' });
});

app.use('/api/auth', authRouter);
app.use('/api/invitations', requireAuth, invitationsRouter);
app.use('/api/tasks', requireAuth, tasksRouter);
app.use('/api/users', requireAuth, usersRouter);
app.use(notFound);
app.use(errorHandler);

const isDirectRun = process.argv[1]
  && import.meta.url === pathToFileURL(process.argv[1]).href;

if (isDirectRun) {
  assertEnvironment();
  const port = Number(process.env.PORT || 3000);
  app.listen(port, () => console.log(`API server listening on port ${port}`));
}