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

    const cleanCpf = cpf ? cpf.replace(/\D/g, '') : null;
    const cleanPhone = phone ? phone.replace(/\D/g, '') : null;

    const user = await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        phone: cleanPhone,
        cpf: cleanCpf,
      },
    });

    const token = jwt.sign(
      { id: user.id },
      process.env.JWT_SECRET!,
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
      process.env.JWT_SECRET!,
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
    const { name, phone, cpf, avatarUrl } = req.body;
    const cleanCpf = cpf ? cpf.replace(/\D/g, '') : undefined;
    const cleanPhone = phone ? phone.replace(/\D/g, '') : undefined;

    const user = await prisma.user.update({
      where: { id: req.userId },
      data: {
        ...(name && { name }),
        ...(cleanPhone && { phone: cleanPhone }),
        ...(cleanCpf && { cpf: cleanCpf }),
        ...(avatarUrl !== undefined && { avatarUrl }),
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

// ─── POST /api/auth/recover-email ──────────
router.post('/recover-email', async (req, res: Response): Promise<void> => {
  try {
    const { cpf, phone } = req.body;

    if (!cpf || !phone) {
      res.status(400).json({ error: 'CPF e telefone são obrigatórios' });
      return;
    }

    const cleanCpf = cpf.replace(/\D/g, '');
    const cleanPhone = phone.replace(/\D/g, '');

    const user = await prisma.user.findFirst({
      where: {
        cpf: cleanCpf,
        phone: cleanPhone,
      },
    });

    if (!user) {
      res.status(404).json({ error: 'Nenhum usuário encontrado com estes dados' });
      return;
    }

    res.json({ email: user.email });
  } catch (error) {
    console.error('[AUTH] Recover email error:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// ─── POST /api/auth/reset-password ─────────
router.post('/reset-password', async (req, res: Response): Promise<void> => {
  try {
    const { email, cpf, newPassword } = req.body;

    if (!email || !cpf || !newPassword) {
      res.status(400).json({ error: 'Email, CPF e nova senha são obrigatórios' });
      return;
    }

    if (newPassword.length < 6) {
      res.status(400).json({ error: 'A nova senha deve ter no mínimo 6 caracteres' });
      return;
    }

    const cleanCpf = cpf.replace(/\D/g, '');

    const user = await prisma.user.findFirst({
      where: {
        email,
        cpf: cleanCpf,
      },
    });

    if (!user) {
      res.status(404).json({ error: 'Usuário ou CPF não conferem' });
      return;
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    await prisma.user.update({
      where: { id: user.id },
      data: { password: hashedPassword },
    });

    res.json({ message: 'Senha redefinida com sucesso!' });
  } catch (error) {
    console.error('[AUTH] Reset password error:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

export default router;
