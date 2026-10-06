import 'express';

declare global {
  namespace Express {
    interface Request {
      user?: {
        id: number;
        id_empresa: number;
        rol: 'owner' | 'administrador' | 'empleado' | 'admin';
        correo: string;
      };
    }
  }
}
