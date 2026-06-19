import { Router, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import prisma from '../utils/prisma';
import { authMiddleware, AuthRequest } from '../middleware/auth';

const router = Router();

// ─── POST /api/auth/register ──────────────
router.post('/register', async (req, res: Response): Promise<void> => {
  try {
    const { name, email, password, phone, cpf } = req.body;

    if (!name || !email || !password) {
      res.status(400).json({ error: 'Nome, email e senha são obrigatórios' });
      return;
    }

    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      res.status(400).json({ error: 'Este email já está cadastrado' });
      return;
    }

    if (cpf) {
      const existingCpf = await prisma.user.findUnique({ where: { cpf } });
      if (existingCpf) {
        res.status(400).json({ error: 'Este CPF já está cadastrado' });
        return;
      }
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        phone: phone || null,
        cpf: cpf || null,
      },
    });

    const token = jwt.sign(
      { id: user.id },
      process.env.JWT_SECRET || 'fallback-secret',
      { expiresIn: '7d' }
    );

    res.status(201).json({
      user: { id: user.id, name: user.name, email: user.email, phone: user.phone },
      token,
    });
  } catch (error) {
    console.error('[AUTH] Register error:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// ─── POST /api/auth/login ─────────────────
router.post('/login', async (req, res: Response): Promise<void> => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      res.status(400).json({ error: 'Email e senha são obrigatórios' });
      return;
    }

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      res.status(401).json({ error: 'Credenciais inválidas' });
      return;
    }

    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      res.status(401).json({ error: 'Credenciais inválidas' });
      return;
    }

    const token = jwt.sign(
      { id: user.id },
      process.env.JWT_SECRET || 'fallback-secret',
      { expiresIn: '7d' }
    );

    res.json({
      user: { id: user.id, name: user.name, email: user.email, phone: user.phone, avatarUrl: user.avatarUrl },
      token,
    });
  } catch (error) {
    console.error('[AUTH] Login error:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// ─── GET /api/auth/me ─────────────────────
router.get('/me', authMiddleware, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.userId },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        cpf: true,
        avatarUrl: true,
        createdAt: true,
        _count: {
          select: {
            createdPools: true,
            memberships: true,
            bets: true,
          },
        },
      },
    });

    if (!user) {
      res.status(404).json({ error: 'Usuário não encontrado' });
      return;
    }

    res.json(user);
  } catch (error) {
    console.error('[AUTH] Get me error:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// ─── PUT /api/auth/profile ────────────────
router.put('/profile', authMiddleware, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { name, phone, cpf } = req.body;

    const user = await prisma.user.update({
      where: { id: req.userId },
      data: {
        ...(name && { name }),
        ...(phone && { phone }),
        ...(cpf && { cpf }),
      },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        cpf: true,
        avatarUrl: true,
      },
    });

    res.json(user);
  } catch (error) {
    console.error('[AUTH] Profile update error:', error);
    res.status(500).json({ error: 'Erro ao atualizar perfil' });
  }
});

export default router;
