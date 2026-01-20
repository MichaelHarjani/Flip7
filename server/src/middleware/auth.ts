import { Request, Response, NextFunction } from 'express';
import { TokenService } from '../services/tokenService.js';
import { PlayerToken } from '../types/multiplayer.js';

declare global {
  namespace Express {
    interface Request {
      playerToken?: PlayerToken;
    }
  }
}

export function authenticate(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing authorization token' });
  }

  const token = authHeader.substring(7);
  const playerToken = TokenService.verifyToken(token);

  if (!playerToken) {
    return res.status(401).json({ error: 'Invalid token' });
  }

  req.playerToken = playerToken;
  next();
}
