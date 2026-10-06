import { pool } from '../config/db';

export interface AuditoriaParams {
  id_empresa: number;
  id_usuario?: number | null;
  accion: string;
  modulo: string;
  detalles_json?: any;
  ip?: string | null;
  user_agent?: string | null;
}

/**
 * Registra una acción de auditoría en segundo plano sin bloquear el flujo transaccional principal.
 *
 * @param id_empresa ID de la empresa (tenant)
 * @param id_usuario ID del usuario que ejecuta la acción (o null si es del sistema)
 * @param accion Nombre de la acción (ej: 'ANULACIÓN DE VENTA', 'ELIMINACIÓN DE PRODUCTO')
 * @param modulo Módulo del sistema (ej: 'VENTAS', 'PRODUCTOS', 'USUARIOS')
 * @param detalles_json Objeto o texto con los detalles de la operación
 * @param extra Metadatos opcionales como IP y User-Agent
 */
export const registrarAuditoria = (
  id_empresa: number,
  id_usuario: number | null = null,
  accion: string,
  modulo: string,
  detalles_json: any = null,
  extra?: { ip?: string | null; user_agent?: string | null }
): void => {
  setImmediate(async () => {
    try {
      if (!id_empresa) return;

      const desc =
        typeof detalles_json === 'string'
          ? detalles_json
          : detalles_json?.mensaje ||
            detalles_json?.motivo ||
            detalles_json?.descripcion ||
            `${accion} en ${modulo}`;

      const detallesParsed =
        detalles_json !== null && typeof detalles_json === 'object'
          ? JSON.stringify(detalles_json)
          : null;

      const query = `
        INSERT INTO auditoria 
        (id_empresa, id_usuario, accion, modulo, tipo, descripcion, detalles, ip, user_agent)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;

      await pool.query(query, [
        id_empresa,
        id_usuario || null,
        accion.toUpperCase(),
        modulo.toUpperCase(),
        modulo.toUpperCase(),
        desc,
        detallesParsed,
        extra?.ip || null,
        extra?.user_agent || null,
      ]);
    } catch (error) {
      console.error('[Bizly][Auditoria] Error registrando traza en segundo plano:', error);
    }
  });
};
