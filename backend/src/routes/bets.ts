import { Router, Response } from 'express';
import prisma from '../utils/prisma';
import { authMiddleware, AuthRequest } from '../middleware/auth';

const router = Router();

// ─── POST /api/bets ─ Criar/atualizar aposta ──
router.post('/', authMiddleware, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { poolId, matchId, homeScore, awayScore } = req.body;

    if (!poolId || !matchId || homeScore === undefined || awayScore === undefined) {
      res.status(400).json({ error: 'poolId, matchId, homeScore e awayScore são obrigatórios' });
      return;
    }

    if (homeScore < 0 || awayScore < 0) {
      res.status(400).json({ error: 'Placares não podem ser negativos' });
      return;
    }

    // Verifica se é membro do bolão com pagamento confirmado
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

    // Verifica se o jogo ainda não começou
    const match = await prisma.match.findUnique({ where: { id: matchId } });
    if (!match) {
      res.status(404).json({ error: 'Jogo não encontrado' });
      return;
    }

    if (match.status !== 'SCHEDULED') {
      res.status(400).json({ error: 'Não é possível apostar em jogos que já começaram' });
      return;
    }

    // Verifica se o jogo está no escopo do bolão
    const pool = await prisma.pool.findUnique({ where: { id: poolId } });
    if (!pool) {
      res.status(404).json({ error: 'Bolão não encontrado' });
      return;
    }

    if (pool.matchScope === 'GROUP_STAGE' && match.stage !== 'GROUP') {
      res.status(400).json({ error: 'Este bolão só aceita apostas da fase de grupos' });
      return;
    }

    if (pool.matchScope === 'KNOCKOUT' && match.stage === 'GROUP') {
      res.status(400).json({ error: 'Este bolão só aceita apostas da fase eliminatória' });
      return;
    }

    // Cria ou atualiza a aposta
    const bet = await prisma.bet.upsert({
      where: {
        userId_poolId_matchId: {
          userId: req.userId!,
          poolId,
          matchId,
        },
      },
      update: {
        homeScore,
        awayScore,
      },
      create: {
        userId: req.userId!,
        poolId,
        matchId,
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

// ─── GET /api/bets/pool/:poolId ─ Minhas apostas no bolão ──
router.get('/pool/:poolId', authMiddleware, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const bets = await prisma.bet.findMany({
      where: {
        userId: req.userId,
        poolId: req.params.poolId,
      },
      include: {
        match: true,
      },
      orderBy: { match: { matchDate: 'asc' } },
    });

    res.json(bets);
  } catch (error) {
    console.error('[BETS] My bets error:', error);
    res.status(500).json({ error: 'Erro ao buscar apostas' });
  }
});

// ─── GET /api/bets/pool/:poolId/match/:matchId ─ Todas as apostas (após jogo) ──
router.get('/pool/:poolId/match/:matchId', authMiddleware, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const match = await prisma.match.findUnique({ where: { id: req.params.matchId } });

    if (!match) {
      res.status(404).json({ error: 'Jogo não encontrado' });
      return;
    }

    // Só mostra apostas de todos após o jogo começar
    if (match.status === 'SCHEDULED') {
      // Se o jogo não começou, mostra só a aposta do usuário
      const myBet = await prisma.bet.findUnique({
        where: {
          userId_poolId_matchId: {
            userId: req.userId!,
            poolId: req.params.poolId,
            matchId: req.params.matchId,
          },
        },
      });
      res.json(myBet ? [myBet] : []);
      return;
    }

    // Jogo já começou ou terminou — mostra todas as apostas
    const bets = await prisma.bet.findMany({
      where: {
        poolId: req.params.poolId,
        matchId: req.params.matchId,
      },
      include: {
        user: { select: { id: true, name: true, avatarUrl: true } },
      },
      orderBy: { points: 'desc' },
    });

    res.json(bets);
  } catch (error) {
    console.error('[BETS] Match bets error:', error);
    res.status(500).json({ error: 'Erro ao buscar apostas do jogo' });
  }
});

export default router;
