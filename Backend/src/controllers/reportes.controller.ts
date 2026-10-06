import { Request, Response } from 'express';
import { RowDataPacket } from 'mysql2/promise';
import { pool } from '../config/db';
import catchAsync from '../utils/catchAsync';
import AppError from '../utils/AppError';

const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

export const getResumenReportes = catchAsync(async (req: Request, res: Response): Promise<void> => {
  if (!req.user || !req.user.id_empresa) {
    throw new AppError('Usuario no autenticado o empresa no identificada', 401, 'UNAUTHORIZED');
  }

  const id_empresa = req.user.id_empresa;
  let { desde, hasta } = req.query;

  const hoy = new Date();
  const hace30Dias = new Date();
  hace30Dias.setDate(hoy.getDate() - 30);

  const desdeStr = (desde ? String(desde).trim() : hace30Dias.toISOString().split('T')[0]);
  const hastaStr = (hasta ? String(hasta).trim() : hoy.toISOString().split('T')[0]);

  // Validación estricta con Regex para prevenir inyecciones SQL y entradas malformadas
  if (!DATE_REGEX.test(desdeStr)) {
    throw new AppError('Formato de fecha \"desde\" inválido. Utilice YYYY-MM-DD', 400, 'INVALID_DATE_FORMAT');
  }
  if (!DATE_REGEX.test(hastaStr)) {
    throw new AppError('Formato de fecha \"hasta\" inválido. Utilice YYYY-MM-DD', 400, 'INVALID_DATE_FORMAT');
  }

  if (desdeStr > hastaStr) {
    throw new AppError('El rango de fechas es inválido: \"desde\" no puede ser posterior a \"hasta\"', 400, 'INVALID_DATE_RANGE');
  }

  const desdeParam = `${desdeStr} 00:00:00`;
  const hastaParam = `${hastaStr} 23:59:59`;

  // 1. Consulta de métricas acumuladas del período
  const [metricasRows] = await pool.query<RowDataPacket[]>(
    `SELECT
       COALESCE(SUM(total), 0) AS ventas_totales,
       COALESCE(SUM(subtotal), 0) AS subtotal,
       COALESCE(SUM(impuesto), 0) AS impuestos,
       COUNT(*) AS total_transacciones
     FROM ventas
     WHERE id_empresa = ?
       AND LOWER(estado) != 'anulada'
       AND fecha_venta >= ?
       AND fecha_venta <= ?`,
    [id_empresa, desdeParam, hastaParam]
  );

  const r: any = metricasRows[0] || {};
  const ventasTotales = Number(r.ventas_totales) || 0;
  const subtotal = Number(r.subtotal) || 0;
  const impuestos = Number(r.impuestos) || 0;
  const totalTransacciones = Number(r.total_transacciones) || 0;
  const ticketPromedio = totalTransacciones > 0 ? Number((ventasTotales / totalTransacciones).toFixed(2)) : 0;

  // 2. Consulta de serie de tiempo agrupada por día (BarChart)
  const [serieRows] = await pool.query<RowDataPacket[]>(
    `SELECT
       DATE_FORMAT(fecha_venta, '%Y-%m-%d') AS fecha,
       COALESCE(SUM(total), 0) AS total,
       COUNT(*) AS transacciones
     FROM ventas
     WHERE id_empresa = ?
       AND LOWER(estado) != 'anulada'
       AND fecha_venta >= ?
       AND fecha_venta <= ?
     GROUP BY DATE_FORMAT(fecha_venta, '%Y-%m-%d')
     ORDER BY fecha ASC`,
    [id_empresa, desdeParam, hastaParam]
  );

  const serieTiempo = serieRows.map((r) => ({
    fecha: String(r.fecha),
    creado_en: String(r.fecha),
    total: Number(r.total) || 0,
    transacciones: Number(r.transacciones) || 0,
  }));

  // 3. Consulta de los 5 productos más vendidos en el rango (JOIN optimizado)
  const [topRows] = await pool.query<RowDataPacket[]>(
    `SELECT
       p.id_producto,
       p.nombre,
       COALESCE(p.sku, '') AS sku,
       COALESCE(SUM(dv.cantidad), 0) AS cantidad_vendida,
       COALESCE(SUM(dv.subtotal), 0) AS ingresos
     FROM detalle_ventas dv
     INNER JOIN ventas v ON dv.id_venta = v.id_venta
     INNER JOIN productos p ON dv.id_producto = p.id_producto
     WHERE v.id_empresa = ?
       AND LOWER(v.estado) != 'anulada'
       AND v.fecha_venta >= ?
       AND v.fecha_venta <= ?
     GROUP BY p.id_producto, p.nombre, p.sku
     ORDER BY cantidad_vendida DESC
     LIMIT 5`,
    [id_empresa, desdeParam, hastaParam]
  );

  const productosTop = topRows.map((r) => ({
    id_producto: Number(r.id_producto),
    nombre: String(r.nombre),
    sku: String(r.sku),
    cantidad_vendida: Number(r.cantidad_vendida) || 0,
    unidades: Number(r.cantidad_vendida) || 0,
    ingresos: Number(r.ingresos) || 0,
  }));

  // 4. Consulta de distribución de métodos de pago (DoughnutChart)
  const [pagosRows] = await pool.query<RowDataPacket[]>(
    `SELECT
       metodo_pago AS metodo,
       COALESCE(SUM(total), 0) AS total,
       COUNT(*) AS transacciones
     FROM ventas
     WHERE id_empresa = ?
       AND LOWER(estado) != 'anulada'
       AND fecha_venta >= ?
       AND fecha_venta <= ?
     GROUP BY metodo_pago
     ORDER BY total DESC`,
    [id_empresa, desdeParam, hastaParam]
  );

  const metodosPago = pagosRows.map((r) => ({
    metodo: String(r.metodo),
    label: String(r.metodo),
    total: Number(r.total) || 0,
    transacciones: Number(r.transacciones) || 0,
  }));

  res.status(200).json({
    rango: {
      desde: desdeStr,
      hasta: hastaStr,
    },
    ventas_totales: ventasTotales,
    subtotal,
    impuestos,
    total_transacciones: totalTransacciones,
    ticket_promedio: ticketPromedio,
    serie_tiempo: serieTiempo,
    productos_top: productosTop,
    metodos_pago: metodosPago,
    // Compatibilidad hacia atrás
    ingresos: ventasTotales,
    ventas: totalTransacciones,
    ticket: ticketPromedio,
    iva: impuestos,
    top: productosTop,
    pagos: metodosPago,
  });
});
