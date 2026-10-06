import { Request, Response } from 'express';
import { RowDataPacket } from 'mysql2/promise';
import { pool } from '../config/db';

export const getEmpresa = async (req: Request, res: Response): Promise<void> => {
  if (!req.user || !req.user.id_empresa) {
    res.status(401).json({ error: 'Usuario no autenticado o empresa no identificada' });
    return;
  }

  const id_empresa = req.user.id_empresa;

  try {
    const [rows] = await pool.query<RowDataPacket[]>(
      'SELECT nombre_empresa, nit, telefono, direccion, correo, iva, plan FROM empresas WHERE id_empresa = ?',
      [id_empresa]
    );

    if (rows.length === 0) {
      res.status(404).json({ error: 'Empresa no encontrada' });
      return;
    }

    const empresa = rows[0];
    res.status(200).json({
      nombre_empresa: empresa.nombre_empresa,
      nombre: empresa.nombre_empresa,
      nit: empresa.nit || '',
      telefono: empresa.telefono || '',
      tel: empresa.telefono || '',
      direccion: empresa.direccion || '',
      dir: empresa.direccion || '',
      correo: empresa.correo || '',
      email: empresa.correo || '',
      iva: Number(empresa.iva) ?? 19,
      plan: empresa.plan || 'Starter',
    });
  } catch (error) {
    console.error('[Bizly][Empresa] Error en getEmpresa:', error);
    res.status(500).json({ error: 'Error interno al obtener los datos de la empresa' });
  }
};

export const updateEmpresa = async (req: Request, res: Response): Promise<void> => {
  if (!req.user || !req.user.id_empresa) {
    res.status(401).json({ error: 'Usuario no autenticado o empresa no identificada' });
    return;
  }

  const id_empresa = req.user.id_empresa;
  const { nombre_empresa, nombre, nit, telefono, tel, direccion, dir, correo, email, iva } = req.body;

  const targetNombre = (nombre_empresa ?? nombre ?? '').trim();
  const targetNit = nit !== undefined ? String(nit).trim() : null;
  const targetTel = (telefono ?? tel ?? '').trim() || null;
  const targetDir = (direccion ?? dir ?? '').trim() || null;
  const targetCorreo = (correo ?? email ?? '').trim() || null;
  const targetIva = iva !== undefined ? Number(iva) : 19.00;

  if (!targetNombre) {
    res.status(400).json({ error: 'El nombre de la empresa es obligatorio' });
    return;
  }

  try {
    await pool.query(
      `UPDATE empresas 
       SET nombre_empresa = ?, nit = ?, telefono = ?, direccion = ?, correo = ?, iva = ? 
       WHERE id_empresa = ?`,
      [targetNombre, targetNit, targetTel, targetDir, targetCorreo, targetIva, id_empresa]
    );

    res.status(200).json({
      mensaje: 'Empresa actualizada exitosamente',
      message: 'Empresa actualizada exitosamente',
      empresa: {
        id_empresa,
        nombre_empresa: targetNombre,
        nombre: targetNombre,
        nit: targetNit,
        telefono: targetTel,
        tel: targetTel,
        direccion: targetDir,
        dir: targetDir,
        correo: targetCorreo,
        email: targetCorreo,
        iva: targetIva,
      },
    });
  } catch (error) {
    console.error('[Bizly][Empresa] Error en updateEmpresa:', error);
    res.status(500).json({ error: 'Error interno al actualizar la empresa' });
  }
};
