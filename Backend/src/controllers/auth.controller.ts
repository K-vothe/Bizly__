import { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { ResultSetHeader, RowDataPacket } from 'mysql2/promise';
import { pool } from '../config/db';

interface UserRow extends RowDataPacket {
  id?: number;
  id_usuario?: number;
  id_empresa: number;
  nombre: string;
  correo: string;
  password: string;
  rol: 'owner' | 'administrador' | 'empleado';
}

export const registerCompanyAndOwner = async (
  req: Request,
  res: Response
): Promise<void> => {
  const {
    nombre_empresa,
    identificacion_fiscal,
    nombre,
    correo,
    password,
  } = req.body;

  if (!nombre_empresa || !identificacion_fiscal || !nombre || !correo || !password) {
    res.status(400).json({
      error: 'Todos los campos son obligatorios: nombre_empresa, identificacion_fiscal, nombre, correo y password',
    });
    return;
  }

  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    const [empresaResult] = await connection.query<ResultSetHeader>(
      'INSERT INTO empresas (nombre_empresa, identificacion_fiscal) VALUES (?, ?)',
      [nombre_empresa, identificacion_fiscal]
    );

    const id_empresa = empresaResult.insertId;

    const hashedPassword = await bcrypt.hash(password, 10);

    const [userResult] = await connection.query<ResultSetHeader>(
      'INSERT INTO usuarios (id_empresa, nombre, correo, password, rol) VALUES (?, ?, ?, ?, ?)',
      [id_empresa, nombre, correo, hashedPassword, 'owner']
    );

    await connection.commit();

    res.status(201).json({
      message: 'Empresa y usuario inicial registrados exitosamente',
      data: {
        id_empresa,
        id_usuario: userResult.insertId,
        nombre,
        correo,
        rol: 'owner',
      },
    });
  } catch (error) {
    await connection.rollback();
    if ((error as { code?: string })?.code === 'ER_DUP_ENTRY') {
      res.status(409).json({ error: 'La empresa o el usuario ya se encuentra registrado' });
      return;
    }
    res.status(500).json({ error: 'Error al registrar empresa y usuario inicial' });
  } finally {
    connection.release();
  }
};

export const login = async (
  req: Request,
  res: Response
): Promise<void> => {
  const { correo, password } = req.body;

  if (!correo || !password) {
    res.status(400).json({ error: 'Correo y contraseña son requeridos' });
    return;
  }

  try {
    const [rows] = await pool.query<UserRow[]>(
      'SELECT * FROM usuarios WHERE correo = ? LIMIT 1',
      [correo]
    );

    const user = rows[0];

    if (!user) {
      res.status(401).json({ error: 'Credenciales inválidas' });
      return;
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      res.status(401).json({ error: 'Credenciales inválidas' });
      return;
    }

    const secret = process.env.JWT_SECRET;
    if (!secret) {
      res.status(500).json({ error: 'JWT_SECRET no configurado en el servidor' });
      return;
    }

    const id = user.id ?? user.id_usuario;

    const token = jwt.sign(
      {
        id,
        id_empresa: user.id_empresa,
        rol: user.rol,
        correo: user.correo,
      },
      secret,
      { expiresIn: '8h' }
    );

    res.status(200).json({
      message: 'Inicio de sesión exitoso',
      token,
      user: {
        id,
        id_empresa: user.id_empresa,
        rol: user.rol,
        correo: user.correo,
      },
    });
  } catch (error) {
    res.status(500).json({ error: 'Error interno del servidor al iniciar sesión' });
  }
};
