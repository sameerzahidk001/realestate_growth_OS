import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { errorHandler } from './middleware/errorHandler.js';

import authRoutes from './routes/authRoutes.js';
import userRoutes from './routes/userRoutes.js';
import leadRoutes from './routes/leadRoutes.js';
import followUpRoutes from './routes/followUpRoutes.js';
import siteVisitRoutes from './routes/siteVisitRoutes.js';
import projectRoutes from './routes/projectRoutes.js';
import dashboardRoutes from './routes/dashboardRoutes.js';
import aiRoutes from './routes/aiRoutes.js';
import bookingRoutes from './routes/bookingRoutes.js';
import marketingRoutes from './routes/marketingRoutes.js';
import customerRoutes from './routes/customerRoutes.js';

const app = express();

app.use(
  cors({
    origin: true,
    credentials: true,
  })
);
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

const mountRoutes = (router) => {
  router.get('/health', async (_, res) => {
    let dbOk = false;
    try {
      const { default: prisma } = await import('./lib/prisma.js');
      await prisma.$queryRaw`SELECT 1`;
      dbOk = true;
    } catch {
      dbOk = false;
    }
    res.json({
      status: 'ok',
      db: dbOk,
      engine: 'postgresql',
      product: "India's First AI Sales Operating System for Real Estate Developers",
      version: '2.1.0',
    });
  });

  router.use('/auth', authRoutes);
  router.use('/users', userRoutes);
  router.use('/leads', leadRoutes);
  router.use('/follow-ups', followUpRoutes);
  router.use('/site-visits', siteVisitRoutes);
  router.use('/projects', projectRoutes);
  router.use('/dashboard', dashboardRoutes);
  router.use('/ai', aiRoutes);
  router.use('/bookings', bookingRoutes);
  router.use('/marketing', marketingRoutes);
  router.use('/customer', customerRoutes);
};

// Support both /api/... and /... (Vercel rewrite can strip /api)
mountRoutes(app);
const api = express.Router();
mountRoutes(api);
app.use('/api', api);

app.use(errorHandler);

export const initApp = async () => app;

export default app;
