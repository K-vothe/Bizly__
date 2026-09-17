import { Request, Response } from 'express';
import { ResultSetHeader, RowDataPacket } from 'mysql2/promise';
import { pool } from '../config/db';

class VentaError extends Error {
  statusCode: number;

  constructor(message: string, statusCode = 400) {
    super(message);
    this.statusCode = statusCode;
  }
}

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
    res.status(401).json({ error: 'Usuario no autenticado o empresa no identificada' });
    return;
  }

  const id_empresa = req.user.id_empresa;
  const id_usuario = req.user.id;

  const { id_cliente, clienteId, metodo_pago, pago, items, productos, detalles } = req.body;
  const cliente_id = id_cliente ? Number(id_cliente) : clienteId ? Number(clienteId) : null;
  const forma_pago = metodo_pago || pago || 'Efectivo';
  const listaItems = items || productos || detalles;

  if (!Array.isArray(listaItems) || listaItems.length === 0) {
    res.status(400).json({ error: 'Debe incluir al menos un producto en la venta' });
    return;
  }

  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    let totalCalculado = 0;
    const detallesInsertar: ItemDetalle[] = [];

    for (const item of listaItems) {
      const id_producto = Number(item.id_producto ?? item.pid ?? item.producto_id);
      const cantidad = Number(item.cantidad ?? item.qty);

      if (!id_producto || isNaN(id_producto) || !cantidad || isNaN(cantidad) || cantidad <= 0) {
        throw new VentaError('Datos de producto o cantidad inválidos', 400);
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
        throw new VentaError(
          `El producto con ID ${id_producto} no pertenece a la empresa o no existe`,
          404
        );
      }

      if (producto.estado !== 'Activo') {
        throw new VentaError(
          `El producto "${producto.nombre}" no se encuentra activo`,
          400
        );
      }

      if (producto.stock < cantidad) {
        throw new VentaError(
          `Stock insuficiente para el producto "${producto.nombre}". Stock disponible: ${producto.stock}, solicitado: ${cantidad}`,
          400
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

    // Registrar la venta en la tabla ventas con estado 'Completada'
    const [ventaResult] = await connection.query<ResultSetHeader>(
      `INSERT INTO ventas (id_empresa, id_usuario, id_cliente, total, metodo_pago, estado)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [id_empresa, id_usuario, cliente_id, totalCalculado, forma_pago, 'Completada']
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

    res.status(201).json({
      message: 'Venta registrada exitosamente',
      id_venta,
      id_empresa,
      id_usuario,
      id_cliente: cliente_id,
      total: totalCalculado,
      metodo_pago: forma_pago,
      estado: 'Completada',
      detalles: detallesInsertar,
    });
  } catch (error) {
    await connection.rollback();
    if (error instanceof VentaError) {
      res.status(error.statusCode).json({ error: error.message });
      return;
    }
    console.error('[Bizly][Ventas] Error en createVenta:', error);
    res.status(500).json({ error: 'Error interno al registrar la venta' });
  } finally {
    connection.release();
  }
};

export const getVentas = async (req: Request, res: Response): Promise<void> => {
  if (!req.user || !req.user.id_empresa) {
    res.status(401).json({ error: 'Usuario no autenticado o empresa no identificada' });
    return;
  }

  const id_empresa = req.user.id_empresa;

  try {
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
  } catch (error) {
    console.error('[Bizly][Ventas] Error en getVentas:', error);
    res.status(500).json({ error: 'Error interno al obtener las ventas' });
  }
};
