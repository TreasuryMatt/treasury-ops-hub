import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';

dotenv.config();

import { authRouter } from './routes/auth';
import { resourcesRouter } from './routes/resources';
import { projectsRouter } from './routes/projects';
import { assignmentsRouter } from './routes/assignments';
import { adminRouter } from './routes/admin';
import { requestsRouter } from './routes/requests';
import { statusProjectsRouter } from './routes/statusProjects';
import { programsRouter } from './routes/programs';
import { applicationsRouter } from './routes/applications';
import { portfoliosRouter } from './routes/portfolios';
import { statusAdminRouter } from './routes/statusAdmin';
import { notificationsRouter } from './routes/notifications';
import { risksRouter } from './routes/risks';
import { issuesRouter } from './routes/issues';
import { intakeRouter } from './routes/intake';
import { intakeAiRouter } from './routes/intakeAi';
import { startPopAlertJob } from './jobs/popAlertJob';
import { startUpdateDueJob } from './jobs/updateDueJob';
import { errorHandler } from './middleware/errorHandler';

const app = express();
const PORT = process.env.PORT || 3021;

// ─── Middleware ───────────────────────────────────────────────────────────────
app.use(helmet());
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:3020',
  credentials: true,
}));
app.use(morgan('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// ─── Health check ─────────────────────────────────────────────────────────────
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ─── API Routes ───────────────────────────────────────────────────────────────
app.use('/api/auth', authRouter);
app.use('/api/resources', resourcesRouter);
app.use('/api/projects', projectsRouter);
app.use('/api/assignments', assignmentsRouter);
app.use('/api/admin', adminRouter);
app.use('/api/requests', requestsRouter);
app.use('/api/status-projects', statusProjectsRouter);
app.use('/api/programs', programsRouter);
app.use('/api/applications', applicationsRouter);
app.use('/api/portfolios', portfoliosRouter);
app.use('/api/status-admin', statusAdminRouter);
app.use('/api/notifications', notificationsRouter);
app.use('/api/risks', risksRouter);
app.use('/api/issues', issuesRouter);
app.use('/api/intake', intakeRouter);
app.use('/api/intake/ai', intakeAiRouter);

// ─── Error handler (must be last) ─────────────────────────────────────────────
app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`Staffing server running on http://localhost:${PORT}`);
  startPopAlertJob();
  startUpdateDueJob();
});

export default app;
