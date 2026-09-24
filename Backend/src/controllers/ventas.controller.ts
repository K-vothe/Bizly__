import { Request, Response } from 'express';
import { ResultSetHeader, RowDataPacket } from 'mysql2/promise';
import { pool } from '../config/db';
import { registrarAuditoria } from '../services/auditoria.service';
import AppError from '../utils/AppError';

interface ProductoRow extends RowDataPacket {
  id_producto: number;
  nombre: string;
  precio: number;
  stock: number;
  estado: string;
  id_empresa: number;
}

interface ItemDetalle {
  id_producto: number;
  cantidad: number;
  precio_unitario: number;
  subtotal: number;
}

export const createVenta = async (req: Request, res: Response): Promise<void> => {
  if (!req.user || !req.user.id_empresa) {
    throw new AppError('Usuario no autenticado o empresa no identificada', 401, 'UNAUTHORIZED');
  }

  const id_empresa = req.user.id_empresa;
  const id_usuario = req.user.id;

  const { id_cliente, clienteId, metodo_pago, pago, items, productos, detalles } = req.body;
  const cliente_id = id_cliente ? Number(id_cliente) : clienteId ? Number(clienteId) : null;
  const forma_pago = metodo_pago || pago || 'Efectivo';
  const listaItems = items || productos || detalles;

  if (!Array.isArray(listaItems) || listaItems.length === 0) {
    throw new AppError('Debe incluir al menos un producto en la venta', 400, 'VALIDATION_ERROR');
  }

  const connection = await pool.getConnection();
  await connection.beginTransaction();

  try {
    let totalCalculado = 0;
    const detallesInsertar: ItemDetalle[] = [];

    for (const item of listaItems) {
      const id_producto = Number(item.id_producto ?? item.pid ?? item.producto_id);
      const cantidad = Number(item.cantidad ?? item.qty);

      if (!id_producto || isNaN(id_producto) || !cantidad || isNaN(cantidad) || cantidad <= 0) {
        throw new AppError('Datos de producto o cantidad inválidos', 400, 'INVALID_SALE_DATA');
      }

      // Validar producto por empresa, estado 'Activo' y stock con SELECT ... FOR UPDATE
      const [rows] = await connection.query<ProductoRow[]>(
        `SELECT id_producto, nombre, precio, stock, estado, id_empresa
         FROM productos
         WHERE id_producto = ? AND id_empresa = ?
         FOR UPDATE`,
        [id_producto, id_empresa]
      );

      const producto = rows[0];

      if (!producto) {
        throw new AppError(
          `El producto con ID ${id_producto} no pertenece a la empresa o no existe`,
          404,
          'PRODUCT_NOT_FOUND'
        );
      }

      if (producto.estado !== 'Activo') {
        throw new AppError(
          `El producto "${producto.nombre}" no se encuentra activo`,
          400,
          'PRODUCT_INACTIVE'
        );
      }

      if (producto.stock < cantidad) {
        throw new AppError(
          `Stock insuficiente para el producto "${producto.nombre}". Stock disponible: ${producto.stock}, solicitado: ${cantidad}`,
          400,
          'INSUFFICIENT_STOCK'
        );
      }

      // Descontar stock correspondiente en la tabla productos
      await connection.query(
        `UPDATE productos
         SET stock = stock - ?
         WHERE id_producto = ? AND id_empresa = ?`,
        [cantidad, id_producto, id_empresa]
      );

      const precioUnitario = Number(producto.precio);
      const subtotal = precioUnitario * cantidad;
      totalCalculado += subtotal;

      detallesInsertar.push({
        id_producto,
        cantidad,
        precio_unitario: precioUnitario,
        subtotal,
      });
    }

    // Obtener porcentaje de IVA configurado para la empresa (por defecto 19%)
    const [empresaRows] = await connection.query<RowDataPacket[]>(
      'SELECT iva FROM empresas WHERE id_empresa = ? LIMIT 1',
      [id_empresa]
    );
    const porcentajeIva = empresaRows[0]?.iva !== undefined ? Number(empresaRows[0].iva) : 19;

    // Cálculo fiscal: subtotal = total / (1 + (iva / 100)), impuesto = total - subtotal
    const divisor = 1 + (porcentajeIva / 100);
    const subtotalCalculado = Number((totalCalculado / divisor).toFixed(2));
    const impuestoCalculado = Number((totalCalculado - subtotalCalculado).toFixed(2));

    // Registrar la venta en la tabla ventas con estado 'Completada', registrando subtotal e impuesto
    const [ventaResult] = await connection.query<ResultSetHeader>(
      `INSERT INTO ventas (id_empresa, id_usuario, id_cliente, subtotal, impuesto, total, metodo_pago, estado)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id_empresa,
        id_usuario,
        cliente_id,
        subtotalCalculado,
        impuestoCalculado,
        totalCalculado,
        forma_pago,
        'Completada',
      ]
    );

    const id_venta = ventaResult.insertId;

    // Insertar el desglose en detalle_ventas
    for (const detalle of detallesInsertar) {
      await connection.query(
        `INSERT INTO detalle_ventas (id_venta, id_producto, cantidad, precio_unitario, subtotal)
         VALUES (?, ?, ?, ?, ?)`,
        [
          id_venta,
          detalle.id_producto,
          detalle.cantidad,
          detalle.precio_unitario,
          detalle.subtotal,
        ]
      );
    }

    // Si se incluye id_cliente, actualizar total_compras y num_compras en clientes filtrando por id_empresa
    if (cliente_id) {
      await connection.query(
        `UPDATE clientes
         SET total_compras = total_compras + ?,
             num_compras = num_compras + 1
         WHERE id_cliente = ? AND id_empresa = ?`,
        [totalCalculado, cliente_id, id_empresa]
      );
    }

    await connection.commit();

    // Registrar trazabilidad de auditoría asíncrona
    registrarAuditoria(
      id_empresa,
      id_usuario,
      'CREACIÓN DE VENTA',
      'VENTAS',
      {
        id_venta,
        total: totalCalculado,
        subtotal: subtotalCalculado,
        items: detallesInsertar.length,
        metodo_pago: forma_pago,
      },
      {
        ip: req.ip,
        user_agent: req.headers['user-agent'] as string,
      }
    );

    res.status(201).json({
      message: 'Venta registrada exitosamente',
      id_venta,
      id_empresa,
      id_usuario,
      id_cliente: cliente_id,
      subtotal: subtotalCalculado,
      impuesto: impuestoCalculado,
      total: totalCalculado,
      metodo_pago: forma_pago,
      estado: 'Completada',
      detalles: detallesInsertar,
    });
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
};

export const getVentas = async (req: Request, res: Response): Promise<void> => {
  if (!req.user || !req.user.id_empresa) {
    throw new AppError('Usuario no autenticado o empresa no identificada', 401, 'UNAUTHORIZED');
  }

  const id_empresa = req.user.id_empresa;

  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT
       v.*,
       c.nombre AS cliente_nombre,
       c.apellido AS cliente_apellido,
       c.correo AS cliente_correo,
       c.documento AS cliente_documento,
       u.nombre AS usuario_nombre,
       u.correo AS usuario_correo
     FROM ventas v
     LEFT JOIN clientes c ON c.id_cliente = v.id_cliente AND c.id_empresa = v.id_empresa
     LEFT JOIN usuarios u ON u.id_usuario = v.id_usuario
     WHERE v.id_empresa = ?
     ORDER BY v.fecha_venta DESC`,
    [id_empresa]
  );

  res.status(200).json(rows);
};

export const anularVenta = async (req: Request, res: Response): Promise<void> => {
  if (!req.user || !req.user.id_empresa) {
    throw new AppError('Usuario no autenticado o empresa no identificada', 401, 'UNAUTHORIZED');
  }

  const id_empresa = req.user.id_empresa;
  const { id } = req.params;

  const connection = await pool.getConnection();
  await connection.beginTransaction();

  try {
    // 1. Obtener la venta bloqueando la fila
    const [ventasRows] = await connection.query<RowDataPacket[]>(
      `SELECT id_venta, id_empresa, id_cliente, total, estado
       FROM ventas
       WHERE id_venta = ? AND id_empresa = ?
       FOR UPDATE`,
      [id, id_empresa]
    );

    const venta = ventasRows[0];

    if (!venta) {
      throw new AppError('Venta no encontrada', 404, 'NOT_FOUND');
    }

    if (String(venta.estado).toLowerCase() === 'anulada') {
      throw new AppError('La venta ya se encuentra anulada', 400, 'VENTA_ALREADY_ANNULLED');
    }

    // 2. Cambiar estado a 'Anulada'
    await connection.query(
      `UPDATE ventas
       SET estado = 'Anulada'
       WHERE id_venta = ? AND id_empresa = ?`,
      [id, id_empresa]
    );

    // 3. Obtener los detalles de la venta para restituir stock
    const [detalles] = await connection.query<RowDataPacket[]>(
      `SELECT id_producto, cantidad
       FROM detalle_ventas
       WHERE id_venta = ?`,
      [id]
    );

    for (const item of detalles) {
      await connection.query(
        `UPDATE productos
         SET stock = stock + ?
         WHERE id_producto = ? AND id_empresa = ?`,
        [item.cantidad, item.id_producto, id_empresa]
      );
    }

    // 4. Si la venta tenía un cliente asociado, revertir total_compras y num_compras
    if (venta.id_cliente) {
      await connection.query(
        `UPDATE clientes
         SET total_compras = GREATEST(0, total_compras - ?),
             num_compras = GREATEST(0, num_compras - 1)
         WHERE id_cliente = ? AND id_empresa = ?`,
        [venta.total, venta.id_cliente, id_empresa]
      );
    }

    await connection.commit();

    // Registrar trazabilidad de auditoría asíncrona
    registrarAuditoria(
      id_empresa,
      req.user.id,
      'ANULACIÓN DE VENTA',
      'VENTAS',
      {
        id_venta: Number(id),
        total: venta.total,
        motivo: req.body?.motivo || 'Anulación autorizada',
        items_restaurados: detalles.length,
      },
      {
        ip: req.ip,
        user_agent: req.headers['user-agent'] as string,
      }
    );

    res.status(200).json({
      message: 'Venta anulada e inventario restaurado exitosamente',
      id_venta: Number(id),
      estado: 'Anulada',
    });
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
};

