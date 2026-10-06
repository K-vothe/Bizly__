import { Request, Response } from 'express';
import { ResultSetHeader, RowDataPacket } from 'mysql2/promise';
import { pool } from '../config/db';

export const getClientes = async (req: Request, res: Response): Promise<void> => {
  if (!req.user || !req.user.id_empresa) {
    res.status(401).json({ error: 'Usuario no autenticado o empresa no identificada' });
    return;
  }

  const id_empresa = req.user.id_empresa;

  try {
    const [rows] = await pool.query<RowDataPacket[]>(
      `SELECT 
         id_cliente AS id,
         id_cliente,
         id_empresa,
         nombre,
         apellido,
         correo,
         correo AS email,
         telefono,
         telefono AS tel,
         tipo_doc,
         tipo_doc AS tipo,
         documento,
         documento AS doc,
         total_compras,
         total_compras AS totalCompras,
         num_compras,
         num_compras AS numCompras,
         estado,
         fecha_registro,
         updated_at
       FROM clientes
       WHERE id_empresa = ? AND (estado IS NULL OR estado = 'Activo')
       ORDER BY id_cliente DESC`,
      [id_empresa]
    );

    res.status(200).json(rows);
  } catch (error) {
    console.error('[Bizly][Clientes] Error en getClientes:', error);
    res.status(500).json({ error: 'Error interno al obtener los clientes' });
  }
};

export const createCliente = async (req: Request, res: Response): Promise<void> => {
  if (!req.user || !req.user.id_empresa) {
    res.status(401).json({ error: 'Usuario no autenticado o empresa no identificada' });
    return;
  }

  const id_empresa = req.user.id_empresa;
  const { nombre, apellido, correo, email, telefono, tel, tipo_doc, tipo, documento, doc } = req.body;

  const clientNombre = (nombre || '').trim();
  const clientTipoDoc = (tipo_doc || tipo || 'CC').trim();
  const clientDoc = (documento || doc || '').trim();
  const clientApellido = (apellido || '').trim();
  const clientCorreo = (correo || email || '').trim();
  const clientTel = (telefono || tel || '').trim();

  if (!clientNombre || !clientDoc || !clientTipoDoc) {
    res.status(400).json({ error: 'Nombre, documento y tipo de documento son campos obligatorios' });
    return;
  }

  try {
    // Verificar unicidad de documento por empresa
    const [existing] = await pool.query<RowDataPacket[]>(
      'SELECT id_cliente FROM clientes WHERE id_empresa = ? AND tipo_doc = ? AND documento = ? LIMIT 1',
      [id_empresa, clientTipoDoc, clientDoc]
    );

    if (existing.length > 0) {
      res.status(409).json({
        error: `Ya existe un cliente registrado con ${clientTipoDoc} ${clientDoc} en esta empresa`,
      });
      return;
    }

    const [result] = await pool.query<ResultSetHeader>(
      `INSERT INTO clientes (id_empresa, nombre, apellido, correo, telefono, tipo_doc, documento, estado)
       VALUES (?, ?, ?, ?, ?, ?, ?, 'Activo')`,
      [
        id_empresa,
        clientNombre,
        clientApellido || null,
        clientCorreo || null,
        clientTel || null,
        clientTipoDoc,
        clientDoc,
      ]
    );

    const id_cliente = result.insertId;

    const nuevoCliente = {
      id: id_cliente,
      id_cliente,
      id_empresa,
      nombre: clientNombre,
      apellido: clientApellido,
      correo: clientCorreo,
      email: clientCorreo,
      telefono: clientTel,
      tel: clientTel,
      tipo_doc: clientTipoDoc,
      tipo: clientTipoDoc,
      documento: clientDoc,
      doc: clientDoc,
      total_compras: 0,
      totalCompras: 0,
      num_compras: 0,
      numCompras: 0,
      estado: 'Activo',
    };

    res.status(201).json(nuevoCliente);
  } catch (error) {
    console.error('[Bizly][Clientes] Error en createCliente:', error);
    res.status(500).json({ error: 'Error interno al registrar el cliente' });
  }
};

export const updateCliente = async (req: Request, res: Response): Promise<void> => {
  if (!req.user || !req.user.id_empresa) {
    res.status(401).json({ error: 'Usuario no autenticado o empresa no identificada' });
    return;
  }

  const id_empresa = req.user.id_empresa;
  const { id } = req.params;
  const { nombre, apellido, correo, email, telefono, tel, tipo_doc, tipo, documento, doc, estado } = req.body;

  try {
    const [existingRows] = await pool.query<RowDataPacket[]>(
      'SELECT id_cliente, tipo_doc, documento FROM clientes WHERE id_cliente = ? AND id_empresa = ? LIMIT 1',
      [id, id_empresa]
    );

    if (existingRows.length === 0) {
      res.status(404).json({ error: 'Cliente no encontrado' });
      return;
    }

    const existingCliente = existingRows[0];
    const nextTipoDoc = tipo_doc !== undefined || tipo !== undefined ? String(tipo_doc ?? tipo).trim() : null;
    const nextDoc = documento !== undefined || doc !== undefined ? String(documento ?? doc).trim() : null;

    // Si se modifica tipo o documento, verificar que no colisione con otro cliente de la misma empresa
    const targetTipoDoc = nextTipoDoc || existingCliente.tipo_doc;
    const targetDoc = nextDoc || existingCliente.documento;

    if (nextTipoDoc !== null || nextDoc !== null) {
      const [duplicate] = await pool.query<RowDataPacket[]>(
        'SELECT id_cliente FROM clientes WHERE id_empresa = ? AND tipo_doc = ? AND documento = ? AND id_cliente != ? LIMIT 1',
        [id_empresa, targetTipoDoc, targetDoc, id]
      );

      if (duplicate.length > 0) {
        res.status(409).json({
          error: `Ya existe otro cliente con ${targetTipoDoc} ${targetDoc} en esta empresa`,
        });
        return;
      }
    }

    const nextNombre = nombre !== undefined ? String(nombre).trim() : null;
    const nextApellido = apellido !== undefined ? String(apellido).trim() : null;
    const nextCorreo = correo !== undefined || email !== undefined ? String(correo ?? email).trim() : null;
    const nextTel = telefono !== undefined || tel !== undefined ? String(telefono ?? tel).trim() : null;
    const nextEstado = estado !== undefined ? String(estado).trim() : null;

    await pool.query<ResultSetHeader>(
      `UPDATE clientes
       SET nombre = COALESCE(?, nombre),
           apellido = COALESCE(?, apellido),
           correo = COALESCE(?, correo),
           telefono = COALESCE(?, telefono),
           tipo_doc = COALESCE(?, tipo_doc),
           documento = COALESCE(?, documento),
           estado = COALESCE(?, estado)
       WHERE id_cliente = ? AND id_empresa = ?`,
      [
        nextNombre,
        nextApellido,
        nextCorreo,
        nextTel,
        nextTipoDoc,
        nextDoc,
        nextEstado,
        id,
        id_empresa,
      ]
    );

    const [updatedRows] = await pool.query<RowDataPacket[]>(
      `SELECT 
         id_cliente AS id,
         id_cliente,
         id_empresa,
         nombre,
         apellido,
         correo,
         correo AS email,
         telefono,
         telefono AS tel,
         tipo_doc,
         tipo_doc AS tipo,
         documento,
         documento AS doc,
         total_compras,
         total_compras AS totalCompras,
         num_compras,
         num_compras AS numCompras,
         estado
       FROM clientes
       WHERE id_cliente = ? AND id_empresa = ?`,
      [id, id_empresa]
    );

    res.status(200).json(updatedRows[0] || { message: 'Cliente actualizado exitosamente' });
  } catch (error) {
    console.error('[Bizly][Clientes] Error en updateCliente:', error);
    res.status(500).json({ error: 'Error interno al actualizar el cliente' });
  }
};

export const deleteCliente = async (req: Request, res: Response): Promise<void> => {
  if (!req.user || !req.user.id_empresa) {
    res.status(401).json({ error: 'Usuario no autenticado o empresa no identificada' });
    return;
  }

  const id_empresa = req.user.id_empresa;
  const { id } = req.params;

  try {
    const [result] = await pool.query<ResultSetHeader>(
      "UPDATE clientes SET estado = 'Inactivo' WHERE id_cliente = ? AND id_empresa = ?",
      [id, id_empresa]
    );

    if (result.affectedRows === 0) {
      res.status(404).json({ error: 'Cliente no encontrado' });
      return;
    }

    res.status(200).json({ message: 'Cliente desactivado exitosamente' });
  } catch (error) {
    console.error('[Bizly][Clientes] Error en deleteCliente:', error);
    res.status(500).json({ error: 'Error interno al desactivar el cliente' });
  }
};
