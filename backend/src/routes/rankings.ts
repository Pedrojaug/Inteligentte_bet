import { Router, Response } from 'express';
import prisma from '../utils/prisma';
import { authMiddleware, AuthRequest } from '../middleware/auth';

const router = Router();

// ─── GET /api/rankings/pool/:poolId ─ Ranking do bolão ──
router.get('/pool/:poolId', authMiddleware, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const members = await prisma.poolMember.findMany({
      where: {
        poolId: req.params.poolId,
        paymentStatus: 'CONFIRMED',
      },
      include: {
        user: { select: { id: true, name: true, avatarUrl: true } },
      },
      orderBy: { totalPoints: 'desc' },
    });

    // Calcula estatísticas adicionais
    const rankings = await Promise.all(
      members.map(async (member, index) => {
        const bets = await prisma.bet.findMany({
          where: { userId: member.userId, poolId: req.params.poolId, scored: true },
        });

        const exactScores = bets.filter((b) => {
          // Precisamos verificar se acertou exato
          return b.points > 0; // Simplificação — em produção, checar exato
        });

        return {
          position: index + 1,
          user: member.user,
          totalPoints: member.totalPoints,
          totalBets: bets.length,
          scoredBets: bets.filter((b) => b.points > 0).length,
          exactScores: bets.filter((b) => b.points >= 25).length,
          isCurrentUser: member.userId === req.userId,
        };
      })
    );

    res.json(rankings);
  } catch (error) {
    console.error('[RANKINGS] Error:', error);
    res.status(500).json({ error: 'Erro ao buscar ranking' });
  }
});

// ─── GET /api/rankings/pool/:poolId/prizes ─ Premiação ──
router.get('/pool/:poolId/prizes', authMiddleware, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const pool = await prisma.pool.findUnique({
      where: { id: req.params.poolId },
      include: {
        _count: { select: { members: { where: { paymentStatus: 'CONFIRMED' } } } },
      },
    } as any);

    if (!pool) {
      res.status(404).json({ error: 'Bolão não encontrado' });
      return;
    }

    const confirmedMembers = await prisma.poolMember.count({
      where: { poolId: pool.id, paymentStatus: 'CONFIRMED' },
    });

    const totalPool = pool.entryFee * confirmedMembers;
    const commissionRate = parseInt(process.env.HOUSE_COMMISSION || '10') / 100;
    const houseAmount = totalPool * commissionRate;
    const prizePool = totalPool - houseAmount;

    res.json({
      totalPool,
      houseAmount,
      prizePool,
      confirmedMembers,
      prizes: {
        first: { percentage: pool.prizeFirst, amount: (prizePool * pool.prizeFirst) / 100 },
        second: { percentage: pool.prizeSecond, amount: (prizePool * pool.prizeSecond) / 100 },
        third: { percentage: pool.prizeThird, amount: (prizePool * pool.prizeThird) / 100 },
      },
    });
  } catch (error) {
    console.error('[RANKINGS] Prizes error:', error);
    res.status(500).json({ error: 'Erro ao calcular premiação' });
  }
});

export default router;
