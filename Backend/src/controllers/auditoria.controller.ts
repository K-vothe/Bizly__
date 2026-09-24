import { Request, Response } from 'express';
import { RowDataPacket } from 'mysql2/promise';
import { pool } from '../config/db';

export const getAuditoria = async (req: Request, res: Response): Promise<void> => {
  if (!req.user || !req.user.id_empresa) {
    res.status(401).json({ error: 'Usuario no autenticado o empresa no identificada' });
    return;
  }

  const id_empresa = req.user.id_empresa;
  const limit = Math.max(1, Math.min(100, Number(req.query.limit || 50)));
  const offset = Math.max(0, Number(req.query.offset || 0));

  try {
    const query = `
      SELECT 
        a.id_auditoria as id,
        a.id_auditoria,
        a.id_empresa,
        a.id_usuario,
        a.accion,
        COALESCE(a.modulo, a.tipo, 'SISTEMA') as modulo,
        a.tipo,
        a.descripcion,
        a.descripcion as detalle,
        a.detalles,
        a.fecha,
        a.ip,
        COALESCE(u.nombre, 'Sistema') as usuario_nombre,
        u.correo as usuario_correo,
        COALESCE(u.nombre, u.correo, 'Sistema') as user
      FROM auditoria a
      LEFT JOIN usuarios u ON a.id_usuario = u.id_usuario
      WHERE a.id_empresa = ?
      ORDER BY a.fecha DESC
      LIMIT ? OFFSET ?
    `;

    const [rows] = await pool.query<RowDataPacket[]>(query, [id_empresa, limit, offset]);

    const [countResult] = await pool.query<RowDataPacket[]>(
      'SELECT COUNT(*) as total FROM auditoria WHERE id_empresa = ?',
      [id_empresa]
    );
    const total = countResult[0]?.total || 0;

    res.status(200).json({
      auditoria: rows,
      auditorias: rows,
      total,
      limit,
      offset,
    });
  } catch (error) {
    console.error('[Bizly][Auditoria] Error al consultar auditoría:', error);
    res.status(500).json({ error: 'Error interno al consultar registros de auditoría' });
  }
};
