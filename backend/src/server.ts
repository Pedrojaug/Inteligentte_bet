import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import rateLimit from 'express-rate-limit';
import cron from 'node-cron';

import authRoutes from './routes/auth';
import poolRoutes from './routes/pools';
import betRoutes from './routes/bets';
import matchRoutes from './routes/matches';
import paymentRoutes from './routes/payments';
import rankingRoutes from './routes/rankings';
import { syncMatches, calculateFinishedMatchScores } from './jobs/syncMatches';
import prisma from './utils/prisma';

dotenv.config();

if (!process.env.JWT_SECRET) {
  console.error('[STARTUP] FATAL: JWT_SECRET environment variable is not set.');
  process.exit(1);
}

const app = express();
const PORT = process.env.PORT || 3001;

// ─── Middleware ────────────────────────────
const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:3000',
];

if (process.env.FRONTEND_URL) {
  allowedOrigins.push(process.env.FRONTEND_URL.replace(/\/$/, ''));
}

app.use(cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    // Remove trailing slash for comparison
    const sanitizedOrigin = origin.replace(/\/$/, '');
    if (allowedOrigins.includes(sanitizedOrigin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
}));
app.use(express.json());

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
});
app.use(limiter);

// ─── Routes ───────────────────────────────
app.use('/api/auth', authRoutes);
app.use('/api/pools', poolRoutes);
app.use('/api/bets', betRoutes);
app.use('/api/matches', matchRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/rankings', rankingRoutes);

// Health check
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString(), service: 'Bolão Inteligentte API' });
});

// ─── Cron Jobs ────────────────────────────
// Sync matches every 5 minutes during match hours (10:00-23:59 UTC)
cron.schedule('*/5 10-23 * * *', async () => {
  console.log('[CRON] Syncing live matches...');
  try {
    await syncMatches();
    await calculateFinishedMatchScores();
  } catch (error) {
    console.error('[CRON] Error syncing matches:', error);
  }
});

// Full sync every hour during off-hours
cron.schedule('0 0-9 * * *', async () => {
  console.log('[CRON] Off-hours full sync...');
  try {
    await syncMatches();
  } catch (error) {
    console.error('[CRON] Error in off-hours sync:', error);
  }
});

// ─── Start Server ─────────────────────────
app.listen(PORT, async () => {
  console.log(`\n⚽ Bolão Inteligentte API running on port ${PORT}`);
  console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`📡 CORS origin: ${process.env.FRONTEND_URL || 'http://localhost:5173'}\n`);

  // Seeding inicial no startup se o banco estiver vazio
  try {
    const matchCount = await prisma.match.count();
    if (matchCount === 0) {
      console.log('[STARTUP] Nenhum jogo encontrado no banco. Iniciando sincronização/seeding de jogos...');
      await syncMatches();
    }
  } catch (error) {
    console.error('[STARTUP] Erro ao sincronizar jogos no startup:', error);
  }
});

export default app;
