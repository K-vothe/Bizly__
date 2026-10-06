import { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import { ResultSetHeader, RowDataPacket } from 'mysql2/promise';
import { pool } from '../config/db';

export const getUsuariosEmpresa = async (req: Request, res: Response): Promise<void> => {
  if (!req.user || !req.user.id_empresa) {
    res.status(401).json({ error: 'Usuario no autenticado o empresa no identificada' });
    return;
  }

  const id_empresa = req.user.id_empresa;

  try {
    const [rows] = await pool.query<RowDataPacket[]>(
      `SELECT 
         u.id_usuario,
         u.id_usuario AS id,
         u.nombre,
         u.apellido,
         u.correo,
         u.correo AS email,
         COALESCE(u.rol, r.nombre_rol, 'empleado') AS rol,
         u.estado,
         u.correo_verificado,
         u.fecha_registro,
         u.fecha_registro AS creado_en
       FROM usuarios u
       LEFT JOIN roles r ON r.id_rol = u.id_rol
       WHERE u.id_empresa = ? 
         AND (u.estado IS NULL OR u.estado = 'Activo')
       ORDER BY u.id_usuario DESC`,
      [id_empresa]
    );

    res.status(200).json(rows);
  } catch (error) {
    console.error('[Bizly][Usuarios] Error en getUsuariosEmpresa:', error);
    res.status(500).json({ error: 'Error interno al obtener los usuarios de la empresa' });
  }
};

export const createUsuarioEmpresa = async (req: Request, res: Response): Promise<void> => {
  if (!req.user || !req.user.id_empresa) {
    res.status(401).json({ error: 'Usuario no autenticado o empresa no identificada' });
    return;
  }

  const id_empresa = req.user.id_empresa;
  const { nombre, apellido, email, correo, password, rol } = req.body;

  const userNombre = (nombre || '').trim();
  const userApellido = (apellido || '').trim();
  const userEmail = (email || correo || '').trim();

  if (!userNombre || !userEmail || !password) {
    res.status(400).json({ error: 'Nombre, correo y contraseña son obligatorios' });
    return;
  }

  const targetRol = rol === 'administrador' || rol === 'admin' ? 'administrador' : 'empleado';

  try {
    // Validar si el correo ya está registrado en el sistema
    const [existing] = await pool.query<RowDataPacket[]>(
      'SELECT id_usuario FROM usuarios WHERE correo = ? LIMIT 1',
      [userEmail]
    );

    if (existing.length > 0) {
      res.status(409).json({ error: 'El correo electrónico ya se encuentra registrado' });
      return;
    }

    // Obtener id_rol
    const [roleRows] = await pool.query<RowDataPacket[]>(
      'SELECT id_rol FROM roles WHERE nombre_rol = ? LIMIT 1',
      [targetRol]
    );
    const id_rol = roleRows[0]?.id_rol || (targetRol === 'administrador' ? 2 : 3);

    const hashedPassword = await bcrypt.hash(password, 10);

    const [result] = await pool.query<ResultSetHeader>(
      `INSERT INTO usuarios (id_empresa, nombre, apellido, correo, password, id_rol, rol, estado, correo_verificado)
       VALUES (?, ?, ?, ?, ?, ?, ?, 'Activo', 1)`,
      [id_empresa, userNombre, userApellido, userEmail, hashedPassword, id_rol, targetRol]
    );

    const id_usuario = result.insertId;

    res.status(201).json({
      mensaje: 'Usuario creado exitosamente',
      message: 'Usuario creado exitosamente',
      usuario: {
        id_usuario,
        id: id_usuario,
        id_empresa,
        nombre: userNombre,
        apellido: userApellido,
        email: userEmail,
        correo: userEmail,
        rol: targetRol,
        estado: 'Activo',
        correo_verificado: 1,
      },
    });
  } catch (error) {
    console.error('[Bizly][Usuarios] Error en createUsuarioEmpresa:', error);
    res.status(500).json({ error: 'Error interno al registrar el usuario' });
  }
};

export const updateUsuarioEmpresa = async (req: Request, res: Response): Promise<void> => {
  if (!req.user || !req.user.id_empresa) {
    res.status(401).json({ error: 'Usuario no autenticado o empresa no identificada' });
    return;
  }

  const id_empresa = req.user.id_empresa;
  const { id } = req.params;
  const { rol, estado } = req.body;

  try {
    let id_rol: number | null = null;
    let targetRol: string | null = null;

    if (rol) {
      targetRol = rol === 'administrador' || rol === 'admin' ? 'administrador' : rol === 'owner' ? 'owner' : 'empleado';
      const [roleRows] = await pool.query<RowDataPacket[]>(
        'SELECT id_rol FROM roles WHERE nombre_rol = ? LIMIT 1',
        [targetRol]
      );
      id_rol = roleRows[0]?.id_rol || null;
    }

    const [result] = await pool.query<ResultSetHeader>(
      `UPDATE usuarios
       SET rol = COALESCE(?, rol),
           id_rol = COALESCE(?, id_rol),
           estado = COALESCE(?, estado)
       WHERE id_usuario = ? AND id_empresa = ?`,
      [targetRol, id_rol, estado || null, id, id_empresa]
    );

    if (result.affectedRows === 0) {
      res.status(404).json({ error: 'Usuario no encontrado en la empresa' });
      return;
    }

    res.status(200).json({ message: 'Usuario actualizado exitosamente' });
  } catch (error) {
    console.error('[Bizly][Usuarios] Error en updateUsuarioEmpresa:', error);
    res.status(500).json({ error: 'Error interno al actualizar el usuario' });
  }
};
