import { Request, Response } from 'express';
import { ResultSetHeader, RowDataPacket } from 'mysql2/promise';
import { pool } from '../config/db';
import { registrarAuditoria } from '../services/auditoria.service';
import AppError from '../utils/AppError';

export const getProductos = async (req: Request, res: Response): Promise<void> => {
  if (!req.user || !req.user.id_empresa) {
    throw new AppError('Usuario no autenticado o empresa no identificada', 401, 'UNAUTHORIZED');
  }

  const id_empresa = req.user.id_empresa;

  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT 
       p.id_producto AS id,
       p.id_producto,
       p.id_empresa,
       p.id_categoria,
       p.nombre,
       p.sku,
       COALESCE(p.categoria, c.nombre_categoria, '') AS categoria,
       p.descripcion,
       p.precio,
       p.stock,
       p.estado,
       p.fecha_creacion,
       p.updated_at
     FROM productos p
     LEFT JOIN categorias c ON c.id_categoria = p.id_categoria AND c.id_empresa = p.id_empresa
     WHERE p.id_empresa = ?
     ORDER BY p.id_producto DESC`,
    [id_empresa]
  );

  res.status(200).json(rows);
};

export const createProducto = async (req: Request, res: Response): Promise<void> => {
  if (!req.user || !req.user.id_empresa) {
    throw new AppError('Usuario no autenticado o empresa no identificada', 401, 'UNAUTHORIZED');
  }

  const id_empresa = req.user.id_empresa;
  const { nombre, sku, categoria, precio, stock, descripcion } = req.body;

  if (!nombre || precio === undefined || stock === undefined) {
    throw new AppError('Nombre, precio y stock son campos obligatorios', 400, 'VALIDATION_ERROR');
  }

  const numPrecio = Number(precio);
  const numStock = Number(stock);

  if (isNaN(numPrecio) || numPrecio < 0 || isNaN(numStock) || numStock < 0) {
    throw new AppError('Precio y stock deben ser valores numéricos válidos y no negativos', 400, 'VALIDATION_ERROR');
  }

  let id_categoria: number | null = null;
  let nombreCategoriaStr = '';

  // Si el campo categoría viene como string, crearla automáticamente si no existe para la empresa
  if (typeof categoria === 'string' && categoria.trim() !== '') {
    nombreCategoriaStr = categoria.trim();

    const [catRows] = await pool.query<RowDataPacket[]>(
      'SELECT id_categoria FROM categorias WHERE nombre_categoria = ? AND id_empresa = ? LIMIT 1',
      [nombreCategoriaStr, id_empresa]
    );

    if (catRows.length > 0) {
      id_categoria = catRows[0].id_categoria;
    } else {
      const [catResult] = await pool.query<ResultSetHeader>(
        'INSERT INTO categorias (id_empresa, nombre_categoria, descripcion, estado) VALUES (?, ?, ?, ?)',
        [id_empresa, nombreCategoriaStr, `Categoría ${nombreCategoriaStr}`, 'Activo']
      );
      id_categoria = catResult.insertId;
    }
  } else if (typeof categoria === 'number') {
    id_categoria = categoria;
  }

  const [productoResult] = await pool.query<ResultSetHeader>(
    `INSERT INTO productos (id_empresa, id_categoria, nombre, sku, categoria, descripcion, precio, stock, estado)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'Activo')`,
    [
      id_empresa,
      id_categoria,
      nombre.trim(),
      sku ? String(sku).trim() : null,
      nombreCategoriaStr || null,
      descripcion ? String(descripcion).trim() : '',
      numPrecio,
      numStock,
    ]
  );

  const id_producto = productoResult.insertId;

  const nuevoProducto = {
    id: id_producto,
    id_producto,
    id_empresa,
    id_categoria,
    nombre: nombre.trim(),
    sku: sku ? String(sku).trim() : '',
    categoria: nombreCategoriaStr,
    descripcion: descripcion ? String(descripcion).trim() : '',
    precio: numPrecio,
    stock: numStock,
    estado: 'Activo',
  };

  // Trazabilidad asíncrona de auditoría
  registrarAuditoria(
    id_empresa,
    req.user.id,
    'CREACIÓN DE PRODUCTO',
    'PRODUCTOS',
    {
      id_producto,
      nombre: nuevoProducto.nombre,
      sku: nuevoProducto.sku,
      precio: numPrecio,
      stock: numStock,
    },
    {
      ip: req.ip,
      user_agent: req.headers['user-agent'] as string,
    }
  );

  res.status(201).json({
    message: 'Producto creado exitosamente',
    producto: nuevoProducto,
    ...nuevoProducto,
  });
};

export const updateProducto = async (req: Request, res: Response): Promise<void> => {
  if (!req.user || !req.user.id_empresa) {
    throw new AppError('Usuario no autenticado o empresa no identificada', 401, 'UNAUTHORIZED');
  }

  const id_empresa = req.user.id_empresa;
  const { id } = req.params;
  const { nombre, sku, categoria, precio, stock, descripcion, estado } = req.body;

  let id_categoria: number | null = null;
  let nombreCategoriaStr = '';

  if (typeof categoria === 'string' && categoria.trim() !== '') {
    nombreCategoriaStr = categoria.trim();
    const [catRows] = await pool.query<RowDataPacket[]>(
      'SELECT id_categoria FROM categorias WHERE nombre_categoria = ? AND id_empresa = ? LIMIT 1',
      [nombreCategoriaStr, id_empresa]
    );
    if (catRows.length > 0) {
      id_categoria = catRows[0].id_categoria;
    } else {
      const [catResult] = await pool.query<ResultSetHeader>(
        'INSERT INTO categorias (id_empresa, nombre_categoria, descripcion, estado) VALUES (?, ?, ?, ?)',
        [id_empresa, nombreCategoriaStr, `Categoría ${nombreCategoriaStr}`, 'Activo']
      );
      id_categoria = catResult.insertId;
    }
  } else if (typeof categoria === 'number') {
    id_categoria = categoria;
  }

  const [result] = await pool.query<ResultSetHeader>(
    `UPDATE productos 
     SET nombre = COALESCE(?, nombre),
         sku = COALESCE(?, sku),
         id_categoria = COALESCE(?, id_categoria),
         categoria = COALESCE(?, categoria),
         precio = COALESCE(?, precio),
         stock = COALESCE(?, stock),
         descripcion = COALESCE(?, descripcion),
         estado = COALESCE(?, estado)
     WHERE id_producto = ? AND id_empresa = ?`,
    [
      nombre !== undefined ? String(nombre).trim() : null,
      sku !== undefined ? String(sku).trim() : null,
      id_categoria,
      nombreCategoriaStr || null,
      precio !== undefined ? Number(precio) : null,
      stock !== undefined ? Number(stock) : null,
      descripcion !== undefined ? String(descripcion).trim() : null,
      estado !== undefined ? String(estado).trim() : null,
      id,
      id_empresa,
    ]
  );

  if (result.affectedRows === 0) {
    throw new AppError('Producto no encontrado', 404, 'NOT_FOUND');
  }

  res.status(200).json({ message: 'Producto actualizado exitosamente' });
};

export const deleteProducto = async (req: Request, res: Response): Promise<void> => {
  if (!req.user || !req.user.id_empresa) {
    throw new AppError('Usuario no autenticado o empresa no identificada', 401, 'UNAUTHORIZED');
  }

  const id_empresa = req.user.id_empresa;
  const { id } = req.params;

  const [result] = await pool.query<ResultSetHeader>(
    `UPDATE productos SET estado = 'Inactivo' WHERE id_producto = ? AND id_empresa = ?`,
    [id, id_empresa]
  );

  if (result.affectedRows === 0) {
    throw new AppError('Producto no encontrado', 404, 'NOT_FOUND');
  }

  // Trazabilidad asíncrona de auditoría
  registrarAuditoria(
    id_empresa,
    req.user.id,
    'ELIMINACIÓN DE PRODUCTO',
    'PRODUCTOS',
    {
      id_producto: Number(id),
      estado: 'Inactivo',
    },
    {
      ip: req.ip,
      user_agent: req.headers['user-agent'] as string,
    }
  );

  res.status(200).json({ message: 'Producto desactivado exitosamente' });
};

interface ProductoCsvItem {
  nombre: string;
  sku?: string;
  precio: number;
  stock: number;
  categoria?: string;
}

export const importarProductos = async (req: Request, res: Response): Promise<void> => {
  if (!req.user || !req.user.id_empresa) {
    throw new AppError('Usuario no autenticado o empresa no identificada', 401, 'UNAUTHORIZED');
  }

  const id_empresa = req.user.id_empresa;
  const listaProductos: ProductoCsvItem[] = req.body.productos;

  if (!Array.isArray(listaProductos) || listaProductos.length === 0) {
    throw new AppError('Debe proporcionar un arreglo de productos no vacío', 400, 'VALIDATION_ERROR');
  }

  if (listaProductos.length > 500) {
    throw new AppError('La importación no puede superar los 500 productos por carga', 400, 'CSV_LIMIT_EXCEEDED');
  }

  const connection = await pool.getConnection();
  await connection.beginTransaction();

  try {
    let insertados = 0;
    const categoriaMap = new Map<string, number>();

    for (let i = 0; i < listaProductos.length; i++) {
      const p = listaProductos[i];
      const nombre = (p.nombre || '').trim();
      const numPrecio = Number(p.precio);
      const numStock = Number(p.stock);

      if (!nombre) {
        throw new AppError(`El producto en la fila ${i + 1} no tiene un nombre válido`, 400, 'INVALID_CSV_ROW');
      }

      if (isNaN(numPrecio) || numPrecio < 0) {
        throw new AppError(`El producto "${nombre}" (fila ${i + 1}) tiene un precio inválido`, 400, 'INVALID_CSV_ROW');
      }

      if (isNaN(numStock) || numStock < 0) {
        throw new AppError(`El producto "${nombre}" (fila ${i + 1}) tiene un stock inválido`, 400, 'INVALID_CSV_ROW');
      }

      let id_categoria: number | null = null;
      let nombreCategoriaStr = '';

      if (typeof p.categoria === 'string' && p.categoria.trim() !== '') {
        nombreCategoriaStr = p.categoria.trim();
        const catKey = nombreCategoriaStr.toLowerCase();
        if (categoriaMap.has(catKey)) {
          id_categoria = categoriaMap.get(catKey)!;
        } else {
          const [catRows] = await connection.query<RowDataPacket[]>(
            'SELECT id_categoria FROM categorias WHERE LOWER(nombre_categoria) = LOWER(?) AND id_empresa = ? LIMIT 1',
            [nombreCategoriaStr, id_empresa]
          );

          if (catRows.length > 0) {
            id_categoria = Number(catRows[0].id_categoria);
          } else {
            const [catResult] = await connection.query<ResultSetHeader>(
              'INSERT INTO categorias (id_empresa, nombre_categoria, descripcion, estado) VALUES (?, ?, ?, ?)',
              [id_empresa, nombreCategoriaStr, `Categoría ${nombreCategoriaStr}`, 'Activo']
            );
            id_categoria = Number(catResult.insertId);
          }
          if (id_categoria) {
            categoriaMap.set(catKey, id_categoria);
          }
        }
      }

      const sku = p.sku ? String(p.sku).trim() : null;

      if (sku) {
        const [existingSkuRows] = await connection.query<RowDataPacket[]>(
          'SELECT id_producto FROM productos WHERE sku = ? AND id_empresa = ? LIMIT 1',
          [sku, id_empresa]
        );

        if (existingSkuRows.length > 0) {
          const existingId = existingSkuRows[0].id_producto;
          await connection.query(
            `UPDATE productos 
             SET nombre = ?,
                 id_categoria = COALESCE(?, id_categoria),
                 categoria = COALESCE(?, categoria),
                 precio = ?,
                 stock = stock + ?,
                 estado = 'Activo'
             WHERE id_producto = ? AND id_empresa = ?`,
            [nombre, id_categoria, nombreCategoriaStr || null, numPrecio, numStock, existingId, id_empresa]
          );
          insertados++;
          continue;
        }
      }

      await connection.query(
        `INSERT INTO productos (id_empresa, id_categoria, nombre, sku, categoria, precio, stock, estado)
         VALUES (?, ?, ?, ?, ?, ?, ?, 'Activo')`,
        [id_empresa, id_categoria, nombre, sku, nombreCategoriaStr || null, numPrecio, numStock]
      );
      insertados++;
    }

    await connection.commit();

    // Trazabilidad asíncrona de auditoría
    registrarAuditoria(
      id_empresa,
      req.user.id,
      'IMPORTACIÓN MASIVA DE PRODUCTOS',
      'PRODUCTOS',
      {
        importados: insertados,
        procesados: insertados,
      },
      {
        ip: req.ip,
        user_agent: req.headers['user-agent'] as string,
      }
    );

    res.status(201).json({
      mensaje: 'Importación completada con éxito',
      message: 'Importación completada con éxito',
      importados: insertados,
      procesados: insertados,
    });
  } catch (error: any) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
};


