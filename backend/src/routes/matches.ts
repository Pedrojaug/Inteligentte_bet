import { Router, Response } from 'express';
import prisma from '../utils/prisma';
import { syncMatches } from '../jobs/syncMatches';
import { authMiddleware } from '../middleware/auth';

const router = Router();

// ─── POST /api/matches/sync ─ Sincronizar manual ──
router.post('/sync', authMiddleware, async (_req, res: Response): Promise<void> => {
  try {
    await syncMatches();
    res.json({ message: 'Jogos sincronizados com sucesso!' });
  } catch (error) {
    console.error('[MATCHES] Manual sync error:', error);
    res.status(500).json({ error: 'Erro ao sincronizar jogos' });
  }
});

// ─── GET /api/matches ─ Listar jogos ──────
router.get('/', async (req, res: Response): Promise<void> => {
  try {
    const { group, stage, status, date } = req.query;

    const matches = await prisma.match.findMany({
      where: {
        ...(group && { group: group as string }),
        ...(stage && { stage: stage as any }),
        ...(status && { status: status as any }),
        ...(date && {
          matchDate: {
            gte: new Date(date as string),
            lt: new Date(new Date(date as string).getTime() + 24 * 60 * 60 * 1000),
          },
        }),
      },
      orderBy: { matchDate: 'asc' },
    });

    res.json(matches);
  } catch (error) {
    console.error('[MATCHES] List error:', error);
    res.status(500).json({ error: 'Erro ao buscar jogos' });
  }
});

// ─── GET /api/matches/live ─ Jogos ao vivo ──
router.get('/live', async (_req, res: Response): Promise<void> => {
  try {
    const liveMatches = await prisma.match.findMany({
      where: {
        status: { in: ['LIVE', 'HALFTIME', 'EXTRA_TIME', 'PENALTIES'] },
      },
      orderBy: { matchDate: 'asc' },
    });

    res.json(liveMatches);
  } catch (error) {
    console.error('[MATCHES] Live error:', error);
    res.status(500).json({ error: 'Erro ao buscar jogos ao vivo' });
  }
});

// ─── GET /api/matches/today ─ Jogos de hoje ──
router.get('/today', async (_req, res: Response): Promise<void> => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const matches = await prisma.match.findMany({
      where: {
        matchDate: { gte: today, lt: tomorrow },
      },
      orderBy: { matchDate: 'asc' },
    });

    res.json(matches);
  } catch (error) {
    console.error('[MATCHES] Today error:', error);
    res.status(500).json({ error: 'Erro ao buscar jogos de hoje' });
  }
});

// ─── GET /api/matches/upcoming ─ Próximos jogos ──
router.get('/upcoming', async (_req, res: Response): Promise<void> => {
  try {
    const matches = await prisma.match.findMany({
      where: {
        status: 'SCHEDULED',
        matchDate: { gte: new Date() },
      },
      orderBy: { matchDate: 'asc' },
      take: 10,
    });

    res.json(matches);
  } catch (error) {
    console.error('[MATCHES] Upcoming error:', error);
    res.status(500).json({ error: 'Erro ao buscar próximos jogos' });
  }
});

// ─── GET /api/matches/:id ─ Detalhes do jogo ──
router.get('/:id', async (req, res: Response): Promise<void> => {
  try {
    const match = await prisma.match.findUnique({
      where: { id: req.params.id },
    });

    if (!match) {
      res.status(404).json({ error: 'Jogo não encontrado' });
      return;
    }

    res.json(match);
  } catch (error) {
    console.error('[MATCHES] Get error:', error);
    res.status(500).json({ error: 'Erro ao buscar jogo' });
  }
});

export default router;
