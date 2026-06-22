import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

export interface AuthRequest extends Request {
  userId?: string;
}

export function authMiddleware(req: AuthRequest, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    res.status(401).json({ error: 'Token de autenticação não fornecido' });
    return;
  }

  const parts = authHeader.split(' ');
  if (parts.length !== 2 || parts[0] !== 'Bearer') {
    res.status(401).json({ error: 'Token mal formatado' });
    return;
  }

  const token = parts[1];

  try {
    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) throw new Error('JWT_SECRET not configured');
    const decoded = jwt.verify(token, jwtSecret) as { id: string };
    req.userId = decoded.id;
    next();
  } catch {
    res.status(401).json({ error: 'Token inválido ou expirado' });
  }
}
