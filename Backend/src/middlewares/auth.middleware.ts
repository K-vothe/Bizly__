import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

interface JwtUserPayload {
  id: number;
  id_empresa: number;
  rol: 'owner' | 'administrador' | 'empleado';
  correo: string;
}

export const authenticate = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Token no proporcionado o formato inválido' });
    return;
  }

  const token = authHeader.substring(7).trim();
  if (!token) {
    res.status(401).json({ error: 'Token no proporcionado' });
    return;
  }

  const secret = process.env.JWT_SECRET;
  if (!secret) {
    res.status(401).json({ error: 'JWT_SECRET no configurado' });
    return;
  }

  try {
    const decoded = jwt.verify(token, secret) as unknown as JwtUserPayload;

    if (!decoded || !decoded.id || !decoded.id_empresa || !decoded.rol || !decoded.correo) {
      res.status(401).json({ error: 'Token inválido' });
      return;
    }

    req.user = {
      id: decoded.id,
      id_empresa: decoded.id_empresa,
      rol: decoded.rol,
      correo: decoded.correo,
    };

    next();
  } catch {
    res.status(401).json({ error: 'Token inválido o expirado' });
    return;
  }
};

export const authorize = (...rolesPermitidos: string[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user || !rolesPermitidos.includes(req.user.rol)) {
      res.status(403).json({ error: 'Acceso no autorizado' });
      return;
    }

    next();
  };
};
