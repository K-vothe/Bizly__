import { Request, Response } from 'express';
import { RowDataPacket } from 'mysql2/promise';
import { pool } from '../config/db';
import catchAsync from '../utils/catchAsync';
import AppError from '../utils/AppError';

export const getDashboardSummary = catchAsync(async (req: Request, res: Response): Promise<void> => {
  if (!req.user || !req.user.id_empresa) {
    throw new AppError('Usuario no autenticado o empresa no identificada', 401, 'UNAUTHORIZED');
  }

  const id_empresa = req.user.id_empresa;

  // Consulta 1: Total facturado y número de transacciones del mes actual
  const [ventasRows] = await pool.query<RowDataPacket[]>(
    `SELECT 
       COALESCE(SUM(total), 0) AS total_mes,
       COUNT(*) AS transacciones_mes,
       COALESCE(SUM(CASE WHEN DATE(fecha_venta) = CURRENT_DATE() THEN total ELSE 0 END), 0) AS total_hoy,
       COALESCE(COUNT(CASE WHEN DATE(fecha_venta) = CURRENT_DATE() THEN 1 END), 0) AS transacciones_hoy
     FROM ventas
     WHERE id_empresa = ? 
       AND LOWER(estado) != 'anulada'
       AND MONTH(fecha_venta) = MONTH(CURRENT_DATE())
       AND YEAR(fecha_venta) = YEAR(CURRENT_DATE())`,
    [id_empresa]
  );

  // Consulta 2: Conteo total de productos y conteo de productos con stock crítico (stock <= 5)
  const [productosRows] = await pool.query<RowDataPacket[]>(
    `SELECT 
       COUNT(*) AS total_productos,
       COALESCE(SUM(CASE WHEN stock <= 5 THEN 1 ELSE 0 END), 0) AS stock_critico
     FROM productos
     WHERE id_empresa = ?
       AND (estado IS NULL OR estado = 'Activo' OR estado = 'activo')`,
    [id_empresa]
  );

  // Consulta 3: Conteo de clientes registrados
  const [clientesRows] = await pool.query<RowDataPacket[]>(
    `SELECT 
       COUNT(*) AS total_clientes
     FROM clientes
     WHERE id_empresa = ?
       AND (estado IS NULL OR estado != 'Inactivo')`,
    [id_empresa]
  );

  // Consulta 4: Serie de tiempo de los últimos 7 días (para gráficos del Dashboard)
  const [semanaRows] = await pool.query<RowDataPacket[]>(
    `SELECT 
       DATE_FORMAT(fecha_venta, '%Y-%m-%d') AS dia,
       COALESCE(SUM(total), 0) AS total,
       COUNT(*) AS transacciones
     FROM ventas
     WHERE id_empresa = ?
       AND LOWER(estado) != 'anulada'
       AND fecha_venta >= DATE_SUB(CURRENT_DATE(), INTERVAL 6 DAY)
     GROUP BY DATE_FORMAT(fecha_venta, '%Y-%m-%d')
     ORDER BY dia ASC`,
    [id_empresa]
  );

  const semanaMap = new Map<string, number>();
  for (const row of semanaRows) {
    semanaMap.set(String(row.dia), Number(row.total) || 0);
  }

  const semanaLabels: string[] = [];
  const semanaData: number[] = [];

  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().split('T')[0];
    const label = d.toLocaleDateString('es-CO', { day: '2-digit', month: '2-digit' });
    semanaLabels.push(label);
    semanaData.push(semanaMap.get(dateStr) || 0);
  }

  const v: any = ventasRows[0] || {};
  const p: any = productosRows[0] || {};
  const c: any = clientesRows[0] || {};

  const totalFacturadoMes = Number(v.total_mes) || 0;
  const transaccionesMes = Number(v.transacciones_mes) || 0;
  const totalHoy = Number(v.total_hoy) || 0;
  const transaccionesHoy = Number(v.transacciones_hoy) || 0;
  const totalProductos = Number(p.total_productos) || 0;
  const stockCritico = Number(p.stock_critico) || 0;
  const totalClientes = Number(c.total_clientes) || 0;

  res.status(200).json({
    ventasMes: {
      total: totalFacturadoMes,
      transacciones: transaccionesMes,
    },
    ventasHoy: {
      total: totalHoy,
      transacciones: transaccionesHoy,
    },
    productos: {
      total: totalProductos,
      stockCritico,
    },
    clientes: {
      total: totalClientes,
    },
    ventasSemana: {
      labels: semanaLabels,
      data: semanaData,
    },
    // Atributos directos para facilitar consumo
    totalFacturadoMes,
    transaccionesMes,
    totalHoy,
    transaccionesHoy,
    totalProductos,
    stockCritico,
    totalClientes,
  });
});
