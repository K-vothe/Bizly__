import { Request, Response, NextFunction } from 'express';
import { RowDataPacket } from 'mysql2/promise';
import { pool } from '../config/db';

export interface PlanConfig {
  nombre: string;
  maxProductos: number;
  maxUsuarios: number;
}

export const PLANES: Record<string, PlanConfig> = {
  Starter: { nombre: 'Starter', maxProductos: 50, maxUsuarios: 2 },
  Business: { nombre: 'Business', maxProductos: 99999, maxUsuarios: 99999 },
  Enterprise: { nombre: 'Enterprise', maxProductos: 99999, maxUsuarios: 99999 },
};

/**
 * Obtiene la configuración de plan de una empresa.
 * Por defecto retorna Starter si no está configurada.
 */
export async function getEmpresaPlan(id_empresa: number): Promise<PlanConfig> {
  try {
    const [rows] = await pool.query<RowDataPacket[]>(
      'SELECT plan FROM empresas WHERE id_empresa = ? LIMIT 1',
      [id_empresa]
    );

    const planName = rows[0]?.plan || 'Starter';
    return PLANES[planName] || PLANES.Starter;
  } catch (err) {
    console.error('[Bizly][PlanLimits] Error obteniendo plan de empresa:', err);
    return PLANES.Starter;
  }
}

/**
 * Middleware para controlar el límite de productos según el plan SaaS (Fase 11).
 * Si la empresa supera el límite permitido, retorna 402 Payment Required.
 */
export const checkProductLimit = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  if (!req.user || !req.user.id_empresa) {
    res.status(401).json({ error: 'Usuario no autenticado o empresa no identificada' });
    return;
  }

  const id_empresa = req.user.id_empresa;

  try {
    const plan = await getEmpresaPlan(id_empresa);

    const [rows] = await pool.query<RowDataPacket[]>(
      "SELECT COUNT(*) as total FROM productos WHERE id_empresa = ? AND (estado IS NULL OR estado = 'Activo')",
      [id_empresa]
    );

    const totalProductos = Number(rows[0]?.total || 0);
    const cantidadNuevos = Array.isArray(req.body?.productos) ? req.body.productos.length : 1;

    if (totalProductos + cantidadNuevos > plan.maxProductos) {
      res.status(402).json({
        error: 'Límite de plan alcanzado. Mejora tu suscripción.',
        codigo: 'PLAN_LIMIT_REACHED',
        code: 'PLAN_LIMIT_REACHED',
        mensaje: `Has alcanzado el límite de ${plan.maxProductos} productos de tu plan ${plan.nombre}. Actualiza tu plan para continuar agregando inventario.`,
        plan: plan.nombre,
        limite: plan.maxProductos,
        actual: totalProductos,
        solicitados: cantidadNuevos,
      });
      return;
    }

    next();
  } catch (error) {
    console.error('[Bizly][PlanLimits] Error verificando límite de productos:', error);
    next();
  }
};

/**
 * Middleware para controlar el límite de usuarios/colaboradores según el plan SaaS (Fase 11).
 * Si la empresa supera el límite permitido, retorna 402 Payment Required.
 */
export const checkUserLimit = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  if (!req.user || !req.user.id_empresa) {
    res.status(401).json({ error: 'Usuario no autenticado o empresa no identificada' });
    return;
  }

  const id_empresa = req.user.id_empresa;

  try {
    const plan = await getEmpresaPlan(id_empresa);

    const [rows] = await pool.query<RowDataPacket[]>(
      "SELECT COUNT(*) as total FROM usuarios WHERE id_empresa = ? AND (estado IS NULL OR estado = 'Activo')",
      [id_empresa]
    );

    const totalUsuarios = Number(rows[0]?.total || 0);

    if (totalUsuarios >= plan.maxUsuarios) {
      res.status(402).json({
        error: 'Límite de usuarios alcanzado para tu plan. Mejora tu suscripción.',
        codigo: 'PLAN_USER_LIMIT_REACHED',
        code: 'PLAN_LIMIT_REACHED',
        mensaje: `Has alcanzado el límite de ${plan.maxUsuarios} colaboradores para tu plan ${plan.nombre}. Pasa a Business para invitar colaboradores ilimitados.`,
        plan: plan.nombre,
        limite: plan.maxUsuarios,
        actual: totalUsuarios,
      });
      return;
    }

    next();
  } catch (error) {
    console.error('[Bizly][PlanLimits] Error verificando límite de usuarios:', error);
    next();
  }
};
