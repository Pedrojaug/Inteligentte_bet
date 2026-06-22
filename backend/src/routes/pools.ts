import { Router, Response } from 'express';
import prisma from '../utils/prisma';
import { authMiddleware, AuthRequest } from '../middleware/auth';
import { generatePoolCode } from '../utils/helpers';

const router = Router();

// ─── POST /api/pools ─ Criar bolão ────────
router.post('/', authMiddleware, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { name, description, entryFee, maxParticipants, isPublic, matchId, prizeFirst, prizeSecond, prizeThird } = req.body;

    if (!name || !entryFee || !matchId) {
      res.status(400).json({ error: 'Nome, valor de entrada e jogo são obrigatórios' });
      return;
    }

    if (entryFee < 1) {
      res.status(400).json({ error: 'Valor mínimo de entrada é R$ 1,00' });
      return;
    }

    const match = await prisma.match.findUnique({ where: { id: matchId } });
    if (!match) {
      res.status(404).json({ error: 'Jogo não encontrado' });
      return;
    }
    if (match.status !== 'SCHEDULED') {
      res.status(400).json({ error: 'Só é possível criar bolões para jogos ainda não iniciados' });
      return;
    }

    const p1 = prizeFirst ?? 60;
    const p2 = prizeSecond ?? 25;
    const p3 = prizeThird ?? 15;
    if (p1 + p2 + p3 !== 100) {
      res.status(400).json({ error: 'As porcentagens de premiação devem somar 100%' });
      return;
    }

    let code = generatePoolCode();
    let codeExists = await prisma.pool.findUnique({ where: { code } });
    while (codeExists) {
      code = generatePoolCode();
      codeExists = await prisma.pool.findUnique({ where: { code } });
    }

    const pool = await prisma.pool.create({
      data: {
        name,
        description: description || null,
        code,
        entryFee,
        maxParticipants: maxParticipants || 100,
        isPublic: isPublic !== undefined ? isPublic : true,
        prizeFirst: p1,
        prizeSecond: p2,
        prizeThird: p3,
        matchId,
        creatorId: req.userId!,
      },
      include: { match: true },
    });

    await prisma.poolMember.create({
      data: {
        userId: req.userId!,
        poolId: pool.id,
        role: 'CREATOR',
        paymentStatus: 'CONFIRMED',
      },
    });

    res.status(201).json(pool);
  } catch (error) {
    console.error('[POOLS] Create error:', error);
    res.status(500).json({ error: 'Erro ao criar bolão' });
  }
});

// ─── GET /api/pools ─ Listar públicos ─────
router.get('/', async (req, res: Response): Promise<void> => {
  try {
    const { search, status } = req.query;

    const pools = await prisma.pool.findMany({
      where: {
        isPublic: true,
        status: (status as any) || 'OPEN',
        ...(search && { name: { contains: search as string, mode: 'insensitive' } }),
      },
      include: {
        creator: { select: { id: true, name: true, avatarUrl: true } },
        match: true,
        _count: { select: { members: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    res.json(pools);
  } catch (error) {
    console.error('[POOLS] List error:', error);
    res.status(500).json({ error: 'Erro ao listar bolões' });
  }
});

// ─── GET /api/pools/my ─ Meus bolões ──────
router.get('/my', authMiddleware, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const memberships = await prisma.poolMember.findMany({
      where: { userId: req.userId },
      include: {
        pool: {
          include: {
            creator: { select: { id: true, name: true, avatarUrl: true } },
            match: true,
            _count: { select: { members: true } },
          },
        },
      },
      orderBy: { joinedAt: 'desc' },
    });

    res.json(memberships.map((m: any) => ({
      ...m.pool,
      myRole: m.role,
      myPaymentStatus: m.paymentStatus,
      myPoints: m.totalPoints,
    })));
  } catch (error) {
    console.error('[POOLS] My pools error:', error);
    res.status(500).json({ error: 'Erro ao buscar seus bolões' });
  }
});

// ─── GET /api/pools/join/:code ─ Info por código ──
router.get('/join/:code', async (req, res: Response): Promise<void> => {
  try {
    const pool = await prisma.pool.findUnique({
      where: { code: req.params.code.toUpperCase() },
      include: {
        creator: { select: { id: true, name: true, avatarUrl: true } },
        match: true,
        _count: { select: { members: true } },
      },
    });

    if (!pool) {
      res.status(404).json({ error: 'Bolão não encontrado' });
      return;
    }

    res.json(pool);
  } catch (error) {
    console.error('[POOLS] Join info error:', error);
    res.status(500).json({ error: 'Erro ao buscar bolão' });
  }
});

// ─── GET /api/pools/:id ─ Detalhes ────────
router.get('/:id', authMiddleware, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const pool = await prisma.pool.findUnique({
      where: { id: req.params.id },
      include: {
        creator: { select: { id: true, name: true, avatarUrl: true } },
        match: true,
        members: {
          include: { user: { select: { id: true, name: true, avatarUrl: true } } },
          orderBy: { totalPoints: 'desc' },
        },
        bets: {
          include: { user: { select: { id: true, name: true, avatarUrl: true } } },
          orderBy: { createdAt: 'asc' },
        },
        _count: { select: { members: true, bets: true } },
      },
    });

    if (!pool) {
      res.status(404).json({ error: 'Bolão não encontrado' });
      return;
    }

    const membership = pool.members.find((m: any) => m.userId === req.userId);

    res.json({
      ...pool,
      isMember: !!membership,
      myRole: membership?.role,
      myPaymentStatus: membership?.paymentStatus,
      myPoints: membership?.totalPoints,
    });
  } catch (error) {
    console.error('[POOLS] Get pool error:', error);
    res.status(500).json({ error: 'Erro ao buscar bolão' });
  }
});

// ─── POST /api/pools/:id/join ─ Entrar ────
router.post('/:id/join', authMiddleware, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const pool = await prisma.pool.findUnique({
      where: { id: req.params.id },
      include: { _count: { select: { members: true } } },
    });

    if (!pool) {
      res.status(404).json({ error: 'Bolão não encontrado' });
      return;
    }

    if (pool.status !== 'OPEN') {
      res.status(400).json({ error: 'Este bolão não está aceitando novos participantes' });
      return;
    }

    if (pool._count.members >= pool.maxParticipants) {
      res.status(400).json({ error: 'Bolão lotado' });
      return;
    }

    const existingMember = await prisma.poolMember.findUnique({
      where: { userId_poolId: { userId: req.userId!, poolId: pool.id } },
    });

    if (existingMember) {
      res.status(400).json({ error: 'Você já participa deste bolão' });
      return;
    }

    const member = await prisma.poolMember.create({
      data: {
        userId: req.userId!,
        poolId: pool.id,
        role: 'MEMBER',
        paymentStatus: 'PENDING',
      },
    });

    res.status(201).json({
      member,
      message: 'Inscrição realizada! Realize o pagamento para confirmar.',
      entryFee: pool.entryFee,
    });
  } catch (error) {
    console.error('[POOLS] Join error:', error);
    res.status(500).json({ error: 'Erro ao entrar no bolão' });
  }
});

// ─── POST /api/pools/:id/leave ─ Sair (apenas com pagamento pendente) ────
router.post('/:id/leave', authMiddleware, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const membership = await prisma.poolMember.findUnique({
      where: { userId_poolId: { userId: req.userId!, poolId: req.params.id } },
    });

    if (!membership) {
      res.status(404).json({ error: 'Você não participa deste bolão' });
      return;
    }

    if (membership.role === 'CREATOR') {
      res.status(400).json({ error: 'O criador não pode sair do bolão. Use a opção de apagar o bolão.' });
      return;
    }

    if (membership.paymentStatus === 'CONFIRMED') {
      res.status(400).json({ error: 'Não é possível sair após confirmar o pagamento' });
      return;
    }

    await prisma.payment.deleteMany({
      where: { userId: req.userId!, poolId: req.params.id, status: 'PENDING' },
    });

    await prisma.bet.deleteMany({
      where: { userId: req.userId!, poolId: req.params.id },
    });

    await prisma.poolMember.delete({
      where: { userId_poolId: { userId: req.userId!, poolId: req.params.id } },
    });

    res.json({ message: 'Você saiu do bolão com sucesso' });
  } catch (error) {
    console.error('[POOLS] Leave error:', error);
    res.status(500).json({ error: 'Erro ao sair do bolão' });
  }
});

// ─── DELETE /api/pools/:id ─ Apagar bolão (criador, sem outros membros) ────
router.delete('/:id', authMiddleware, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const pool = await prisma.pool.findUnique({
      where: { id: req.params.id },
      include: { _count: { select: { members: true } } },
    });

    if (!pool) {
      res.status(404).json({ error: 'Bolão não encontrado' });
      return;
    }

    if (pool.creatorId !== req.userId) {
      res.status(403).json({ error: 'Apenas o criador pode apagar o bolão' });
      return;
    }

    // Permite apagar apenas se o único membro for o próprio criador
    if (pool._count.members > 1) {
      res.status(400).json({ error: 'Não é possível apagar o bolão com participantes inscritos' });
      return;
    }

    // Remove tudo na ordem certa
    await prisma.payment.deleteMany({ where: { poolId: pool.id } });
    await prisma.bet.deleteMany({ where: { poolId: pool.id } });
    await prisma.poolMember.deleteMany({ where: { poolId: pool.id } });
    await prisma.pool.delete({ where: { id: pool.id } });

    res.json({ message: 'Bolão apagado com sucesso' });
  } catch (error) {
    console.error('[POOLS] Delete error:', error);
    res.status(500).json({ error: 'Erro ao apagar bolão' });
  }
});

// ─── PUT /api/pools/:id ─ Editar (criador) ──
router.put('/:id', authMiddleware, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const pool = await prisma.pool.findUnique({ where: { id: req.params.id } });

    if (!pool) {
      res.status(404).json({ error: 'Bolão não encontrado' });
      return;
    }

    if (pool.creatorId !== req.userId) {
      res.status(403).json({ error: 'Apenas o criador pode editar o bolão' });
      return;
    }

    const { name, description, maxParticipants, isPublic } = req.body;

    const updated = await prisma.pool.update({
      where: { id: pool.id },
      data: {
        ...(name && { name }),
        ...(description !== undefined && { description }),
        ...(maxParticipants && { maxParticipants }),
        ...(isPublic !== undefined && { isPublic }),
      },
    });

    res.json(updated);
  } catch (error) {
    console.error('[POOLS] Update error:', error);
    res.status(500).json({ error: 'Erro ao atualizar bolão' });
  }
});

// ─── GET /api/pools/:id/members ───────────
router.get('/:id/members', authMiddleware, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const members = await prisma.poolMember.findMany({
      where: { poolId: req.params.id },
      include: { user: { select: { id: true, name: true, avatarUrl: true } } },
      orderBy: { totalPoints: 'desc' },
    });

    res.json(members);
  } catch (error) {
    console.error('[POOLS] Members error:', error);
    res.status(500).json({ error: 'Erro ao buscar membros' });
  }
});

export default router;
