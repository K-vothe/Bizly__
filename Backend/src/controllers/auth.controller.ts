import { Request, Response } from 'express';
import crypto from 'crypto';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
import { ResultSetHeader, RowDataPacket } from 'mysql2/promise';
import { pool } from '../config/db';
import emailService from '../services/email';
import { enviarCorreoOTP } from '../services/email.service';
import AppError from '../utils/AppError';

dotenv.config();

// Blindaje de entorno: el servidor falla de inmediato si JWT_SECRET es inseguro o no existe
const validateJwtSecret = (): string => {
  const secret = process.env.JWT_SECRET;
  if (!secret || secret.trim() === '' || secret.trim().toLowerCase() === 'secret') {
    throw new Error(
      '[Seguridad Crítica] El servidor no puede iniciar: JWT_SECRET no está configurado o utiliza un valor inseguro ("secret").'
    );
  }
  return secret.trim();
};

const JWT_SECRET = validateJwtSecret();

interface UserRow extends RowDataPacket {
  id?: number;
  id_usuario?: number;
  id_empresa: number;
  nombre: string;
  correo: string;
  password: string;
  id_rol?: number;
  rol?: string;
}

export const register = async (
  req: Request,
  res: Response
): Promise<void> => {
  const { nombre_empresa, nombre, email, correo, password } = req.body;
  const userEmail = email || correo;

  if (!nombre_empresa || !nombre || !userEmail || !password) {
    throw new AppError(
      'Todos los campos son obligatorios: nombre_empresa, nombre, email y password',
      400,
      'VALIDATION_ERROR'
    );
  }

  const connection = await pool.getConnection();
  await connection.beginTransaction();

  try {
    // 1. Validar que el email no esté registrado previamente
    const [existing] = await connection.query<RowDataPacket[]>(
      'SELECT id_usuario FROM usuarios WHERE correo = ? LIMIT 1',
      [userEmail]
    );

    if (existing.length > 0) {
      throw new AppError('El correo electrónico ya se encuentra registrado', 409, 'DUPLICATE_ENTRY');
    }

    // 2. Insertar la nueva empresa y recuperar id_empresa
    const [empresaResult] = await connection.query<ResultSetHeader>(
      'INSERT INTO empresas (nombre_empresa) VALUES (?)',
      [nombre_empresa]
    );
    const id_empresa = empresaResult.insertId;

    // 3. Hashear la contraseña con bcrypt (10 salt rounds)
    const hashedPassword = await bcrypt.hash(password, 10);

    // 4. Obtener id_rol para rol owner (por defecto 1)
    const [roleRows] = await connection.query<RowDataPacket[]>(
      "SELECT id_rol FROM roles WHERE nombre_rol IN ('owner', 'administrador', 'admin') ORDER BY FIELD(nombre_rol, 'owner', 'administrador', 'admin') LIMIT 1"
    );
    const id_rol = roleRows[0]?.id_rol || 1;
    const rol = 'owner';

    // 5. Insertar el usuario con rol 'owner' y asociar el id_empresa recién creado
    const [userResult] = await connection.query<ResultSetHeader>(
      'INSERT INTO usuarios (id_empresa, nombre, correo, password, id_rol, rol, verificado, correo_verificado) VALUES (?, ?, ?, ?, ?, ?, 0, 0)',
      [id_empresa, nombre, userEmail, hashedPassword, id_rol, rol]
    );
    const id_usuario = userResult.insertId;

    // Generar código OTP inicial de verificación
    const initialOtp = crypto.randomInt(100000, 999999).toString();
    const expiraEn = new Date(Date.now() + 15 * 60 * 1000); // 15 minutos

    await connection.query(
      'INSERT INTO tokens_verificacion (correo, codigo_otp, expira_en, usado, intentos_fallidos) VALUES (?, ?, ?, 0, 0)',
      [userEmail, initialOtp, expiraEn]
    );

    // 6. Confirmar transacción
    await connection.commit();

    // Enviar código por correo mediante Nodemailer
    try {
      await enviarCorreoOTP(userEmail, initialOtp.toString());
    } catch (mailErr) {
      console.error('[Bizly][OTP] Error enviando correo OTP en registro:', mailErr);
    }
    console.log(`[Bizly OTP DEV] Código inicial para ${userEmail}: ${initialOtp}`);

    // 7. Firmar el token JWT con { id_usuario, email, id_empresa, rol }
    const token = jwt.sign(
      {
        id: id_usuario,
        id_usuario,
        email: userEmail,
        correo: userEmail,
        id_empresa,
        rol,
      },
      JWT_SECRET,
      { expiresIn: '8h' }
    );

    // 8. Retornar status 201 indicando requerimiento de verificación OTP
    res.status(201).json({
      token,
      requiresOtp: true,
      verificado: false,
      mensaje: 'Empresa registrada. Por favor verifica el código enviado a tu correo.',
      usuario: {
        id_usuario,
        nombre,
        email: userEmail,
        id_empresa,
        rol,
      },
      empresa: {
        id_empresa,
        nombre: nombre_empresa,
      },
    });
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
};

export const registerCompanyAndOwner = register;

export const login = async (
  req: Request,
  res: Response
): Promise<void> => {
  const { email, correo, password } = req.body;
  const userEmail = email || correo;

  if (!userEmail || !password) {
    throw new AppError('Correo y contraseña son requeridos', 400, 'VALIDATION_ERROR');
  }

  const [rows] = await pool.query<UserRow[]>(
    'SELECT * FROM usuarios WHERE correo = ? LIMIT 1',
    [userEmail]
  );

  const user = rows[0];

  if (!user) {
    throw new AppError('Credenciales inválidas', 401, 'INVALID_CREDENTIALS');
  }

  const isPasswordValid = await bcrypt.compare(password, user.password);

  if (!isPasswordValid) {
    throw new AppError('Credenciales inválidas', 401, 'INVALID_CREDENTIALS');
  }

  // Control estricto Enterprise: El usuario no puede operar hasta verificar su cuenta
  const estaVerificado = (user as any).verificado === 1 || (user as any).correo_verificado === 1;
  if (!estaVerificado) {
    res.status(403).json({
      error: 'Cuenta no verificada. Por favor verifica tu correo electrónico con el código de 6 dígitos antes de ingresar.',
      noVerificado: true,
      correo: user.correo,
    });
    return;
  }

  const id = user.id ?? user.id_usuario;
  const rol = user.rol || 'admin';

  const token = jwt.sign(
    {
      id,
      id_usuario: id,
      email: user.correo,
      correo: user.correo,
      id_empresa: user.id_empresa,
      rol,
    },
    JWT_SECRET,
    { expiresIn: '8h' }
  );

  res.status(200).json({
    message: 'Inicio de sesión exitoso',
    token,
    usuario: {
      id_usuario: id,
      nombre: user.nombre,
      email: user.correo,
      id_empresa: user.id_empresa,
      rol,
    },
    user: {
      id,
      id_empresa: user.id_empresa,
      rol,
      correo: user.correo,
    },
  });
};

export const forgotPassword = async (
  req: Request,
  res: Response
): Promise<void> => {
  const { email, correo } = req.body;
  const userEmail = (email || correo || '').trim().toLowerCase();

  // Respuesta homogénea para evitar enumeración de usuarios
  const genericMessage = 'Si el correo existe, se han enviado las instrucciones';

  if (!userEmail) {
    res.status(200).json({
      mensaje: genericMessage,
      message: genericMessage,
    });
    return;
  }

  try {
    const [rows] = await pool.query<RowDataPacket[]>(
      'SELECT id_usuario, correo, nombre FROM usuarios WHERE LOWER(correo) = ? LIMIT 1',
      [userEmail]
    );

    if (rows.length > 0) {
      const user = rows[0];
      // Generar código numérico seguro de 6 dígitos
      const recoveryCode = crypto.randomInt(100000, 999999).toString();
      const expira = new Date(Date.now() + 60 * 60 * 1000); // 1 hora de vigencia

      // Invalidar tokens previos no utilizados para este usuario
      await pool.query(
        'UPDATE tokens_recuperacion SET utilizado = 1 WHERE id_usuario = ? AND utilizado = 0',
        [user.id_usuario]
      );

      // Insertar token en tokens_recuperacion
      await pool.query(
        'INSERT INTO tokens_recuperacion (token, fecha_expiracion, utilizado, id_usuario) VALUES (?, ?, 0, ?)',
        [recoveryCode, expira, user.id_usuario]
      );

      // Si el servicio de correo está configurado, enviar el mensaje
      if (emailService.configured()) {
        try {
          await emailService.sendCode({
            to: user.correo,
            subject: 'Recuperación de contraseña - Bizly',
            title: 'Recuperación de Contraseña',
            text: 'Has solicitado restablecer tu contraseña en Bizly. Tu código de recuperación es:',
            code: recoveryCode,
          });
        } catch (emailErr) {
          console.error('[Bizly][Auth] Error enviando correo de recuperación:', emailErr);
        }
      }

      if (process.env.NODE_ENV !== 'production' && process.env.DEV_SHOW_EMAIL_CODES === 'true') {
        console.log(`[Bizly][Auth DEV] Código de recuperación para ${user.correo}: ${recoveryCode}`);
      }
    }

    // Respuesta segura: SIN código en el payload JSON para prevenir fugas de información
    res.status(200).json({
      mensaje: genericMessage,
      message: genericMessage,
    });
  } catch (error) {
    console.error('[Bizly][Auth] Error en forgotPassword:', error);
    res.status(200).json({
      mensaje: genericMessage,
      message: genericMessage,
    });
  }
};

export const resetPassword = async (
  req: Request,
  res: Response
): Promise<void> => {
  const { email, correo, token, codigo, password, nuevaPassword } = req.body;
  const userEmail = (email || correo || '').trim().toLowerCase();
  const nextPassword = password || nuevaPassword;
  const resetToken = (token || codigo || '').trim();

  // Exigir obligatoriamente token de recuperación
  if (!resetToken) {
    throw new AppError('Token de recuperación no proporcionado o inválido', 401, 'INVALID_TOKEN');
  }

  if (!userEmail || !nextPassword) {
    throw new AppError('Correo y nueva contraseña son requeridos', 400, 'VALIDATION_ERROR');
  }

  if (nextPassword.length < 6) {
    throw new AppError('La nueva contraseña debe tener al menos 6 caracteres', 400, 'VALIDATION_ERROR');
  }

  const connection = await pool.getConnection();
  await connection.beginTransaction();

  try {
    // 1. Buscar token en tokens_recuperacion asociado al usuario, vigente y no utilizado
    const [tokenRows] = await connection.query<RowDataPacket[]>(
      `SELECT tr.id_token, tr.id_usuario, tr.token, tr.fecha_expiracion, tr.utilizado, u.correo
       FROM tokens_recuperacion tr
       INNER JOIN usuarios u ON u.id_usuario = tr.id_usuario
       WHERE tr.token = ?
         AND LOWER(u.correo) = ?
         AND tr.utilizado = 0
         AND tr.fecha_expiracion > NOW()
       ORDER BY tr.id_token DESC
       LIMIT 1
       FOR UPDATE`,
      [resetToken, userEmail]
    );

    if (tokenRows.length === 0) {
      throw new AppError('Token de recuperación inválido o expirado', 401, 'INVALID_TOKEN');
    }

    const tokenRecord = tokenRows[0];

    // 2. Marcar el token como utilizado
    await connection.query(
      'UPDATE tokens_recuperacion SET utilizado = 1 WHERE id_token = ?',
      [tokenRecord.id_token]
    );

    // 3. Hashear la nueva contraseña y actualizar usuario
    const hashedPassword = await bcrypt.hash(nextPassword, 10);
    await connection.query(
      'UPDATE usuarios SET password = ? WHERE id_usuario = ?',
      [hashedPassword, tokenRecord.id_usuario]
    );

    await connection.commit();

    res.status(200).json({
      mensaje: 'Contraseña actualizada exitosamente',
      message: 'Contraseña actualizada exitosamente',
    });
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
};

export const getMe = async (req: Request, res: Response): Promise<void> => {
  if (!req.user) {
    res.status(401).json({ error: 'No autenticado' });
    return;
  }

  if (!req.user) {
    throw new AppError('No autenticado', 401, 'UNAUTHORIZED');
  }

  const [rows] = await pool.query<RowDataPacket[]>(
    'SELECT id_usuario, id_empresa, nombre, correo, rol FROM usuarios WHERE id_usuario = ? AND id_empresa = ? LIMIT 1',
    [req.user.id, req.user.id_empresa]
  );

  if (rows.length === 0) {
    throw new AppError('Usuario no encontrado', 404, 'NOT_FOUND');
  }

  const user = rows[0];
  res.status(200).json({
    usuario: {
      id_usuario: user.id_usuario,
      nombre: user.nombre,
      email: user.correo,
      correo: user.correo,
      id_empresa: user.id_empresa,
      rol: user.rol,
    },
    user: {
      id: user.id_usuario,
      id_empresa: user.id_empresa,
      rol: user.rol,
      correo: user.correo,
    },
  });
};

export const logout = async (req: Request, res: Response): Promise<void> => {
  // Limpiar cookies de sesión si existieran
  const cookieOptions = {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict' as const,
  };
  res.clearCookie('token', cookieOptions);
  res.clearCookie('bizly_token', cookieOptions);
  res.clearCookie('refreshToken', cookieOptions);
  res.clearCookie('bizly_refresh_token', cookieOptions);

  // Revocación en base de datos si se envió token en header Authorization
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7).trim();
    if (token) {
      const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
      try {
        await pool.query(
          'UPDATE sesiones SET revocado = 1, fecha_revocacion = NOW() WHERE token_hash = ?',
          [tokenHash]
        );
      } catch {
        // Silencioso si la sesión no estaba persistida en DB
      }
    }
  }

  res.status(200).json({
    mensaje: 'Sesión cerrada exitosamente',
    message: 'Sesión cerrada exitosamente',
  });
};

export const sendOtp = async (req: Request, res: Response): Promise<void> => {
  const { correo, email } = req.body;
  const userEmail = (correo || email || '').trim().toLowerCase();

  if (!userEmail || !/^\S+@\S+\.\S+$/.test(userEmail)) {
    throw new AppError('Correo electrónico válido es requerido', 400, 'VALIDATION_ERROR');
  }

  // 1. Rate Limiting: verificar si ya existe un token activo creado hace menos de 60 segundos
  const [recentTokens] = await pool.query<RowDataPacket[]>(
    `SELECT id, TIMESTAMPDIFF(SECOND, creado_en, NOW()) as segundos_transcurridos 
     FROM tokens_verificacion 
     WHERE LOWER(correo) = ? AND usado = 0 AND expira_en > NOW()
     ORDER BY id DESC LIMIT 1`,
    [userEmail]
  );

  if (recentTokens.length > 0) {
    const segundos = recentTokens[0].segundos_transcurridos ?? 0;
    if (segundos < 60) {
      const restante = 60 - segundos;
      throw new AppError(
        `Debes esperar ${restante} segundos antes de solicitar un nuevo código de verificación`,
        429,
        'RATE_LIMIT_EXCEEDED'
      );
    }
  }

  // 2. Generar OTP numérico seguro de 6 dígitos
  const codigoOtp = crypto.randomInt(100000, 999999).toString();
  const expiraEn = new Date(Date.now() + 15 * 60 * 1000); // 15 minutos

  // 3. Invalidar tokens previos del mismo correo
  await pool.query(
    'UPDATE tokens_verificacion SET usado = 1 WHERE LOWER(correo) = ? AND usado = 0',
    [userEmail]
  );

  // 4. Insertar nuevo token con intentos_fallidos = 0
  await pool.query(
    'INSERT INTO tokens_verificacion (correo, codigo_otp, expira_en, usado, intentos_fallidos) VALUES (?, ?, ?, 0, 0)',
    [userEmail, codigoOtp, expiraEn]
  );

  // 5. Enviar por email mediante Nodemailer
  await enviarCorreoOTP(userEmail, codigoOtp.toString());

  console.log(`[Bizly OTP DEV] Código generado para ${userEmail}: ${codigoOtp}`);

  res.status(200).json({
    mensaje: 'Código de verificación enviado exitosamente',
    message: 'Código de verificación enviado exitosamente',
  });
};

export const verifyOtp = async (req: Request, res: Response): Promise<void> => {
  const { correo, email, codigo, otp } = req.body;
  const userEmail = (correo || email || '').trim().toLowerCase();
  const rawCode = String(codigo ?? otp ?? '').trim();

  if (!userEmail) {
    throw new AppError('Correo electrónico es requerido', 400, 'VALIDATION_ERROR');
  }

  // Validación estricta: exactamente 6 dígitos numéricos
  if (!/^\d{6}$/.test(rawCode)) {
    throw new AppError('El código de verificación debe contener exactamente 6 dígitos numéricos', 400, 'VALIDATION_ERROR');
  }

  const connection = await pool.getConnection();
  await connection.beginTransaction();

  try {
    // 1. Buscar token activo con bloqueo FOR UPDATE
    const [rows] = await connection.query<RowDataPacket[]>(
      `SELECT id, codigo_otp, expira_en, usado, intentos_fallidos 
       FROM tokens_verificacion 
       WHERE LOWER(correo) = ? AND usado = 0 AND expira_en > NOW() 
       ORDER BY id DESC LIMIT 1 FOR UPDATE`,
      [userEmail]
    );

    if (rows.length === 0) {
      await connection.rollback();
      res.status(400).json({ error: 'Código de verificación expirado o inexistente. Solicita uno nuevo.' });
      return;
    }

    const tokenRow = rows[0];

    // 2. Si ya agotó los intentos (>= 3), bloquear de inmediato
    if (tokenRow.intentos_fallidos >= 3) {
      await connection.query(
        'UPDATE tokens_verificacion SET usado = 1 WHERE id = ?',
        [tokenRow.id]
      );
      await connection.commit();
      res.status(403).json({ error: 'Demasiados intentos fallidos. Solicita un nuevo código.' });
      return;
    }

    // 3. Comparar el código
    if (tokenRow.codigo_otp !== rawCode) {
      const nuevosIntentos = tokenRow.intentos_fallidos + 1;

      if (nuevosIntentos >= 3) {
        await connection.query(
          'UPDATE tokens_verificacion SET intentos_fallidos = ?, usado = 1 WHERE id = ?',
          [nuevosIntentos, tokenRow.id]
        );
        await connection.commit();
        res.status(403).json({ error: 'Demasiados intentos fallidos. Solicita un nuevo código.' });
        return;
      } else {
        await connection.query(
          'UPDATE tokens_verificacion SET intentos_fallidos = ? WHERE id = ?',
          [nuevosIntentos, tokenRow.id]
        );
        await connection.commit();
        const intentosRestantes = 3 - nuevosIntentos;
        res.status(400).json({
          error: `Código de verificación incorrecto. Te quedan ${intentosRestantes} intento(s).`,
          intentosRestantes,
        });
        return;
      }
    }

    // 4. Éxito: marcar token como usado
    await connection.query(
      'UPDATE tokens_verificacion SET usado = 1 WHERE id = ?',
      [tokenRow.id]
    );

    // 5. Actualizar usuario y empresa a verificado = 1
    await connection.query(
      'UPDATE usuarios SET verificado = 1, correo_verificado = 1 WHERE LOWER(correo) = ?',
      [userEmail]
    );

    await connection.query(
      `UPDATE empresas SET verificado = 1 WHERE id_empresa IN (
        SELECT id_empresa FROM usuarios WHERE LOWER(correo) = ?
      )`,
      [userEmail]
    );

    // 6. Obtener datos del usuario para emisión de sesión
    const [userRows] = await connection.query<RowDataPacket[]>(
      'SELECT id_usuario, id_empresa, nombre, correo, rol FROM usuarios WHERE LOWER(correo) = ? LIMIT 1',
      [userEmail]
    );

    let token = null;
    let usuarioData = null;

    if (userRows.length > 0) {
      const u = userRows[0];
      const id = u.id_usuario;
      const rol = u.rol || 'owner';
      token = jwt.sign(
        {
          id,
          id_usuario: id,
          email: u.correo,
          correo: u.correo,
          id_empresa: u.id_empresa,
          rol,
        },
        JWT_SECRET,
        { expiresIn: '8h' }
      );
      usuarioData = {
        id_usuario: id,
        nombre: u.nombre,
        email: u.correo,
        id_empresa: u.id_empresa,
        rol,
      };
    }

    await connection.commit();

    res.status(200).json({
      mensaje: 'Código verificado con éxito. Tu cuenta ha sido activada.',
      message: 'Código verificado con éxito. Tu cuenta ha sido activada.',
      verificado: true,
      token,
      usuario: usuarioData,
    });
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
};

export const googleAuth = async (req: Request, res: Response): Promise<void> => {
  res.status(501).json({
    mensaje: 'Google Auth pendiente de configuración de Client ID',
    message: 'Google Auth pendiente de configuración de Client ID',
  });
};

