import { Router, Response } from 'express';
import prisma from '../utils/prisma';
import { authMiddleware, AuthRequest } from '../middleware/auth';

const router = Router();

// ─── POST /api/bets ─ Criar/atualizar aposta ──
router.post('/', authMiddleware, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { poolId, homeScore, awayScore } = req.body;

    if (!poolId || homeScore === undefined || awayScore === undefined) {
      res.status(400).json({ error: 'poolId, homeScore e awayScore são obrigatórios' });
      return;
    }

    if (homeScore < 0 || awayScore < 0) {
      res.status(400).json({ error: 'Placares não podem ser negativos' });
      return;
    }

    const membership = await prisma.poolMember.findUnique({
      where: { userId_poolId: { userId: req.userId!, poolId } },
    });

    if (!membership) {
      res.status(403).json({ error: 'Você não é membro deste bolão' });
      return;
    }

    if (membership.paymentStatus !== 'CONFIRMED') {
      res.status(403).json({ error: 'Pagamento pendente. Realize o pagamento para poder apostar.' });
      return;
    }

    // Busca o jogo vinculado ao bolão
    const pool = await prisma.pool.findUnique({ where: { id: poolId }, include: { match: true } });
    if (!pool || !pool.match) {
      res.status(400).json({ error: 'Este bolão não possui um jogo vinculado' });
      return;
    }

    if (pool.match.status !== 'SCHEDULED') {
      res.status(400).json({ error: 'Não é possível apostar em jogos que já começaram' });
      return;
    }

    const bet = await prisma.bet.upsert({
      where: {
        userId_poolId_matchId: { userId: req.userId!, poolId, matchId: pool.match.id },
      },
      update: { homeScore, awayScore },
      create: {
        userId: req.userId!,
        poolId,
        matchId: pool.match.id,
        homeScore,
        awayScore,
      },
    });

    res.json({ bet, message: 'Aposta registrada com sucesso!' });
  } catch (error) {
    console.error('[BETS] Create error:', error);
    res.status(500).json({ error: 'Erro ao registrar aposta' });
  }
});

// ─── GET /api/bets/pool/:poolId ─ Todas as apostas do bolão ──
router.get('/pool/:poolId', authMiddleware, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const pool = await prisma.pool.findUnique({ where: { id: req.params.poolId } });
    if (!pool?.matchId) {
      res.json([]);
      return;
    }

    const bets = await prisma.bet.findMany({
      where: { poolId: req.params.poolId, matchId: pool.matchId },
      include: {
        user: { select: { id: true, name: true, avatarUrl: true } },
      },
      orderBy: { createdAt: 'asc' },
    });

    // Antes do jogo começar, retorna apenas a aposta do usuário logado
    const matchRecord = await prisma.match.findUnique({ where: { id: pool.matchId } });
    if (matchRecord?.status === 'SCHEDULED') {
      res.json(bets.filter((b: any) => b.userId === req.userId));
      return;
    }

    res.json(bets);
  } catch (error) {
    console.error('[BETS] Pool bets error:', error);
    res.status(500).json({ error: 'Erro ao buscar apostas' });
  }
});

export default router;
