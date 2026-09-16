const jwt = require('jsonwebtoken')
const { pool } = require('../config/db')

function getSecret() {
  const secret = process.env.JWT_SECRET
  if (!secret && process.env.NODE_ENV === 'production') {
    throw new Error('JWT_SECRET es obligatorio en producción')
  }
  return secret || 'dev-only-change-this-secret'
}

async function authenticate(req, res, next) {
  const header = req.headers.authorization || ''
  const [scheme, token] = header.split(' ')
  if (scheme !== 'Bearer' || !token) {
    return res.status(401).json({ error: 'Autenticación requerida' })
  }

  try {
    const payload = jwt.verify(token, getSecret())
    if (payload.type !== 'access' || !payload.sid) {
      return res.status(401).json({ error: 'Token inválido' })
    }

    const [rows] = await pool.query(
      `SELECT s.id_sesion, s.id_usuario, s.revocado, s.fecha_expiracion,
              u.correo, u.nombre, u.apellido, u.estado, u.id_rol, r.nombre_rol
       FROM sesiones s
       JOIN usuarios u ON u.id_usuario = s.id_usuario
       JOIN roles r ON r.id_rol = u.id_rol
       WHERE s.id_sesion = ? AND s.id_usuario = ? LIMIT 1`,
      [payload.sid, payload.id]
    )

    const session = rows[0]
    if (!session || session.revocado || new Date(session.fecha_expiracion) <= new Date()) {
      return res.status(401).json({ error: 'Sesión expirada o revocada' })
    }
    if (String(session.estado).toLowerCase() !== 'activo') {
      return res.status(403).json({ error: 'Usuario inactivo' })
    }

    req.user = {
      id: session.id_usuario,
      correo: session.correo,
      nombre: session.nombre,
      apellido: session.apellido,
      id_rol: session.id_rol,
      rol: session.nombre_rol,
      sid: session.id_sesion,
    }
    next()
  } catch (error) {
    if (error?.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token expirado', code: 'TOKEN_EXPIRED' })
    }
    return res.status(401).json({ error: 'Token inválido' })
  }
}

function authorize(...roles) {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.rol)) {
      return res.status(403).json({ error: 'No tienes permisos para realizar esta acción' })
    }
    next()
  }
}

module.exports = { authenticate, authorize, getSecret }
