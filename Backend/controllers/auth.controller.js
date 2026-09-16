const crypto = require('crypto')
const bcrypt = require('bcrypt')
const jwt = require('jsonwebtoken')

const { pool } = require('../config/db')
const { getSecret } = require('../middleware/auth')
const audit = require('../utils/audit')
const { dbError } = require('../utils/helpers')
const {
  cleanText,
  validEmail,
  validPassword,
} = require('../utils/validation')
const { configured: emailConfigured, sendCode } = require('../services/email')

const REFRESH_DAYS = Math.max(1, Number(process.env.JWT_REFRESH_DAYS || 7))
const ACCESS_EXPIRES = process.env.JWT_EXPIRES_IN || '1h'
const REFRESH_EXPIRES = process.env.JWT_REFRESH_EXPIRES_IN || `${REFRESH_DAYS}d`
const PRIVACY_VERSION = '1.0'

function refreshSecret() {
  const secret = process.env.JWT_REFRESH_SECRET
  if (!secret && process.env.NODE_ENV === 'production') {
    throw new Error('JWT_REFRESH_SECRET es obligatorio en producción')
  }
  return secret || `${getSecret()}-refresh-dev`
}

function hashValue(value) {
  return crypto.createHash('sha256').update(String(value)).digest('hex')
}

function makeCode() {
  return crypto.randomInt(100000, 1000000).toString()
}

function sessionExpiry() {
  return new Date(Date.now() + REFRESH_DAYS * 24 * 60 * 60 * 1000)
}

function publicUser(row) {
  return {
    id: row.id_usuario,
    nombre: row.nombre,
    apellido: row.apellido || '',
    correo: row.correo,
    nombreCompleto: `${row.nombre} ${row.apellido || ''}`.trim(),
    id_rol: row.id_rol,
    rol: row.nombre_rol || row.rol || 'empleado',
  }
}

async function createSession(user, req, connection = pool) {
  const sid = crypto.randomUUID()
  const accessToken = jwt.sign(
    { id: user.id_usuario, correo: user.correo, id_rol: user.id_rol, sid, type: 'access' },
    getSecret(),
    { expiresIn: ACCESS_EXPIRES }
  )
  const refreshToken = jwt.sign(
    { id: user.id_usuario, sid, type: 'refresh' },
    refreshSecret(),
    { expiresIn: REFRESH_EXPIRES }
  )
  await connection.query(
    `INSERT INTO sesiones (id_sesion, id_usuario, token_hash, fecha_expiracion, ip, user_agent)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [sid, user.id_usuario, hashValue(refreshToken), sessionExpiry(), req.ip || null, req.headers['user-agent'] || null]
  )
  return { accessToken, refreshToken }
}

async function deliverCode({ correo, code, purpose }) {
  const templates = {
    verify: { subject: 'Verifica tu correo — Bizly', title: 'Verificación de correo', text: 'Usa este código para confirmar tu cuenta. Expira en 15 minutos.' },
    reset: { subject: 'Código de recuperación — Bizly', title: 'Recuperar contraseña', text: 'Usa este código para restablecer tu contraseña. Expira en 15 minutos.' },
  }
  const template = templates[purpose]
  if (emailConfigured()) {
    await sendCode({ to: correo, code, ...template })
    return { delivered: true }
  }
  if (process.env.NODE_ENV !== 'production' && String(process.env.DEV_SHOW_EMAIL_CODES || '').toLowerCase() === 'true') {
    console.warn(`[Bizly][DEV] Código ${purpose} para ${correo}: ${code}`)
    return { delivered: false, devCode: code }
  }
  return { delivered: false }
}

async function registro(req, res) {
  const nombre = cleanText(req.body.nombre, 100)
  const apellido = cleanText(req.body.apellido, 100)
  const correo = validEmail(req.body.correo)
  const password = String(req.body.password || '')
  const aceptaTratamiento = req.body.aceptaTratamiento === true

  if (!nombre || !correo || !password) return res.status(400).json({ error: 'Nombre, correo y contraseña son obligatorios' })
  if (!validPassword(password)) return res.status(400).json({ error: 'La contraseña debe tener 8 a 72 caracteres e incluir letras y números' })
  if (!aceptaTratamiento) return res.status(400).json({ error: 'Debes aceptar la política de privacidad y el tratamiento de datos' })

  const connection = await pool.getConnection()
  try {
    await connection.beginTransaction()
    const [existing] = await connection.query('SELECT id_usuario, correo_verificado FROM usuarios WHERE correo=? LIMIT 1', [correo])
    if (existing[0]?.correo_verificado) {
      await connection.rollback()
      return res.status(409).json({ error: 'Ya existe una cuenta verificada con ese correo' })
    }

    const hash = await bcrypt.hash(password, 12)
    let idUsuario
    if (existing[0]) {
      idUsuario = existing[0].id_usuario
      await connection.query(
        `UPDATE usuarios SET nombre=?, apellido=?, password=?, estado='Activo', id_rol=2,
         acepta_tratamiento=1, fecha_consentimiento=NOW(), version_politica=? WHERE id_usuario=?`,
        [nombre, apellido, hash, PRIVACY_VERSION, idUsuario]
      )
    } else {
      const [result] = await connection.query(
        `INSERT INTO usuarios
         (nombre, apellido, correo, password, estado, id_rol, correo_verificado, acepta_tratamiento, fecha_consentimiento, version_politica)
         VALUES (?, ?, ?, ?, 'Activo', 2, 0, 1, NOW(), ?)`,
        [nombre, apellido, correo, hash, PRIVACY_VERSION]
      )
      idUsuario = result.insertId
    }

    const code = makeCode()
    await connection.query('DELETE FROM tokens_verificacion WHERE id_usuario=?', [idUsuario])
    await connection.query(
      `INSERT INTO tokens_verificacion (token_hash, fecha_expiracion, utilizado, id_usuario)
       VALUES (?, DATE_ADD(NOW(), INTERVAL 15 MINUTE), 0, ?)`,
      [hashValue(code), idUsuario]
    )
    await connection.commit()

    const delivery = await deliverCode({ correo, code, purpose: 'verify' })
    if (!delivery.delivered && !delivery.devCode) {
      return res.status(503).json({
        error: 'La cuenta fue creada, pero el correo no está configurado. Configura EMAIL_USER y EMAIL_PASS o usa el modo de desarrollo.',
        requiereVerificacion: true,
        correo,
      })
    }
    res.status(201).json({ ok: true, requiereVerificacion: true, correo, ...(delivery.devCode ? { devCode: delivery.devCode } : {}) })
  } catch (error) {
    try { await connection.rollback() } catch {}
    return dbError(res, error)
  } finally {
    connection.release()
  }
}

async function verificarCorreo(req, res) {
  const correo = validEmail(req.body.correo)
  const codigo = cleanText(req.body.codigo, 6)
  if (!correo || !/^\d{6}$/.test(codigo)) return res.status(400).json({ error: 'Correo y código válidos son obligatorios' })

  const connection = await pool.getConnection()
  try {
    await connection.beginTransaction()
    const [rows] = await connection.query(
      `SELECT tv.id_token, u.* , r.nombre_rol
       FROM tokens_verificacion tv
       JOIN usuarios u ON u.id_usuario=tv.id_usuario
       JOIN roles r ON r.id_rol=u.id_rol
       WHERE u.correo=? AND tv.token_hash=? AND tv.utilizado=0 AND tv.fecha_expiracion>NOW()
       ORDER BY tv.id_token DESC LIMIT 1 FOR UPDATE`,
      [correo, hashValue(codigo)]
    )
    const user = rows[0]
    if (!user) {
      await connection.rollback()
      return res.status(400).json({ error: 'Código inválido o expirado' })
    }
    await connection.query('UPDATE tokens_verificacion SET utilizado=1 WHERE id_token=?', [user.id_token])
    await connection.query('UPDATE usuarios SET correo_verificado=1 WHERE id_usuario=?', [user.id_usuario])
    const tokens = await createSession(user, req, connection)
    await audit(connection, user.id_usuario, 'Verificó', 'Auth', 'Verificó su correo electrónico', req)
    await connection.commit()
    res.json({ ...tokens, token: tokens.accessToken, usuario: publicUser(user) })
  } catch (error) {
    try { await connection.rollback() } catch {}
    return dbError(res, error)
  } finally {
    connection.release()
  }
}

async function reenviarVerificacion(req, res) {
  const correo = validEmail(req.body.correo)
  if (!correo) return res.status(400).json({ error: 'Correo inválido' })
  try {
    const [users] = await pool.query('SELECT id_usuario, correo_verificado FROM usuarios WHERE correo=? LIMIT 1', [correo])
    if (!users[0] || users[0].correo_verificado) return res.json({ ok: true })
    const code = makeCode()
    await pool.query('DELETE FROM tokens_verificacion WHERE id_usuario=?', [users[0].id_usuario])
    await pool.query(
      `INSERT INTO tokens_verificacion (token_hash, fecha_expiracion, utilizado, id_usuario)
       VALUES (?, DATE_ADD(NOW(), INTERVAL 15 MINUTE), 0, ?)`,
      [hashValue(code), users[0].id_usuario]
    )
    const delivery = await deliverCode({ correo, code, purpose: 'verify' })
    res.json({ ok: true, ...(delivery.devCode ? { devCode: delivery.devCode } : {}) })
  } catch (error) {
    return dbError(res, error)
  }
}

async function login(req, res) {
  const correo = validEmail(req.body.correo)
  const password = String(req.body.password || '')
  if (!correo || !password) return res.status(400).json({ error: 'Correo y contraseña son obligatorios' })

  try {
    const [rows] = await pool.query(
      `SELECT u.*, r.nombre_rol FROM usuarios u
       JOIN roles r ON r.id_rol=u.id_rol WHERE u.correo=? LIMIT 1`,
      [correo]
    )
    const user = rows[0]
    if (!user) return res.status(401).json({ error: 'Correo o contraseña incorrectos' })
    if (String(user.estado).toLowerCase() !== 'activo') return res.status(403).json({ error: 'La cuenta está inactiva' })
    if (!user.correo_verificado) return res.status(403).json({ error: 'Debes verificar tu correo antes de iniciar sesión', code: 'EMAIL_NOT_VERIFIED' })
    if (user.bloqueado_hasta && new Date(user.bloqueado_hasta) > new Date()) {
      return res.status(429).json({ error: 'Cuenta temporalmente bloqueada por demasiados intentos. Intenta más tarde.' })
    }

    const valid = await bcrypt.compare(password, user.password)
    if (!valid) {
      const attempts = Number(user.intentos_fallidos || 0) + 1
      if (attempts >= 5) {
        await pool.query('UPDATE usuarios SET intentos_fallidos=0, bloqueado_hasta=DATE_ADD(NOW(), INTERVAL 15 MINUTE) WHERE id_usuario=?', [user.id_usuario])
      } else {
        await pool.query('UPDATE usuarios SET intentos_fallidos=? WHERE id_usuario=?', [attempts, user.id_usuario])
      }
      return res.status(401).json({ error: 'Correo o contraseña incorrectos' })
    }

    await pool.query('UPDATE usuarios SET intentos_fallidos=0, bloqueado_hasta=NULL, ultimo_acceso=NOW() WHERE id_usuario=?', [user.id_usuario])
    const tokens = await createSession(user, req)
    await audit(pool, user.id_usuario, 'Inició', 'Auth', 'Inició sesión', req)
    res.json({ ...tokens, token: tokens.accessToken, usuario: publicUser(user) })
  } catch (error) {
    return dbError(res, error)
  }
}

async function refresh(req, res) {
  const refreshToken = String(req.body.refreshToken || '')
  if (!refreshToken) return res.status(400).json({ error: 'Refresh token obligatorio' })
  try {
    const payload = jwt.verify(refreshToken, refreshSecret())
    if (payload.type !== 'refresh' || !payload.sid) return res.status(401).json({ error: 'Refresh token inválido' })
    const [rows] = await pool.query(
      `SELECT s.*, u.correo, u.id_rol, u.estado
       FROM sesiones s JOIN usuarios u ON u.id_usuario=s.id_usuario
       WHERE s.id_sesion=? AND s.id_usuario=? AND s.token_hash=? AND s.revocado=0 AND s.fecha_expiracion>NOW() LIMIT 1`,
      [payload.sid, payload.id, hashValue(refreshToken)]
    )
    const session = rows[0]
    if (!session || String(session.estado).toLowerCase() !== 'activo') return res.status(401).json({ error: 'Sesión inválida o expirada' })

    const accessToken = jwt.sign(
      { id: session.id_usuario, correo: session.correo, id_rol: session.id_rol, sid: session.id_sesion, type: 'access' },
      getSecret(),
      { expiresIn: ACCESS_EXPIRES }
    )
    const newRefreshToken = jwt.sign(
      { id: session.id_usuario, sid: session.id_sesion, type: 'refresh' },
      refreshSecret(),
      { expiresIn: REFRESH_EXPIRES }
    )
    await pool.query('UPDATE sesiones SET token_hash=?, fecha_expiracion=? WHERE id_sesion=?', [hashValue(newRefreshToken), sessionExpiry(), session.id_sesion])
    res.json({ accessToken, refreshToken: newRefreshToken, token: accessToken })
  } catch {
    return res.status(401).json({ error: 'Refresh token inválido o expirado' })
  }
}

async function logout(req, res) {
  try {
    await pool.query('UPDATE sesiones SET revocado=1, fecha_revocacion=NOW() WHERE id_sesion=?', [req.user.sid])
    await audit(pool, req.user.id, 'Cerró', 'Auth', 'Cerró sesión', req)
    res.json({ ok: true })
  } catch (error) {
    return dbError(res, error)
  }
}

async function logoutAll(req, res) {
  try {
    await pool.query('UPDATE sesiones SET revocado=1, fecha_revocacion=NOW() WHERE id_usuario=? AND revocado=0', [req.user.id])
    await audit(pool, req.user.id, 'Cerró', 'Auth', 'Cerró todas sus sesiones', req)
    res.json({ ok: true })
  } catch (error) {
    return dbError(res, error)
  }
}

function me(req, res) {
  res.json({ usuario: { ...req.user, nombreCompleto: `${req.user.nombre} ${req.user.apellido || ''}`.trim() } })
}

async function eliminarCuenta(req, res) {
  const password = String(req.body.password || '')
  const confirmation = cleanText(req.body.confirmacion, 20)
  if (!password || confirmation !== 'ELIMINAR') return res.status(400).json({ error: 'Debes escribir ELIMINAR y confirmar tu contraseña' })

  const connection = await pool.getConnection()
  try {
    await connection.beginTransaction()
    const [rows] = await connection.query('SELECT * FROM usuarios WHERE id_usuario=? FOR UPDATE', [req.user.id])
    const user = rows[0]
    if (!user || !(await bcrypt.compare(password, user.password))) {
      await connection.rollback()
      return res.status(401).json({ error: 'Contraseña incorrecta' })
    }
    if (user.id_rol === 1) {
      const [[count]] = await connection.query("SELECT COUNT(*) AS total FROM usuarios WHERE id_rol=1 AND estado='Activo'")
      if (count.total <= 1) {
        await connection.rollback()
        return res.status(409).json({ error: 'No puedes eliminar la única cuenta administradora activa' })
      }
    }
    await audit(connection, req.user.id, 'Eliminó', 'Account', 'Solicitó la eliminación de su cuenta', req)
    await connection.query("UPDATE usuarios SET estado='Inactivo', correo=CONCAT('deleted-', id_usuario, '-', UNIX_TIMESTAMP(), '@anon.local') WHERE id_usuario=?", [req.user.id])
    await connection.query('UPDATE sesiones SET revocado=1, fecha_revocacion=NOW() WHERE id_usuario=?', [req.user.id])
    await connection.commit()
    res.json({ ok: true })
  } catch (error) {
    try { await connection.rollback() } catch {}
    return dbError(res, error)
  } finally {
    connection.release()
  }
}

async function recuperar(req, res) {
  const correo = validEmail(req.body.correo)
  if (!correo) return res.status(400).json({ error: 'Correo inválido' })
  try {
    const [rows] = await pool.query("SELECT id_usuario FROM usuarios WHERE correo=? AND estado='Activo' LIMIT 1", [correo])
    if (!rows[0]) return res.json({ ok: true })
    const code = makeCode()
    await pool.query('DELETE FROM tokens_recuperacion WHERE id_usuario=? AND utilizado=0', [rows[0].id_usuario])
    await pool.query(
      `INSERT INTO tokens_recuperacion (token, fecha_expiracion, utilizado, id_usuario)
       VALUES (?, DATE_ADD(NOW(), INTERVAL 15 MINUTE), 0, ?)`,
      [hashValue(code), rows[0].id_usuario]
    )
    const delivery = await deliverCode({ correo, code, purpose: 'reset' })
    res.json({ ok: true, ...(delivery.devCode ? { devCode: delivery.devCode } : {}) })
  } catch (error) {
    return dbError(res, error)
  }
}

async function resetPassword(req, res) {
  const correo = validEmail(req.body.correo)
  const codigo = cleanText(req.body.codigo, 6)
  const newPassword = String(req.body.nuevaPassword || '')
  if (!correo || !/^\d{6}$/.test(codigo) || !validPassword(newPassword)) {
    return res.status(400).json({ error: 'Código, correo y contraseña válida son obligatorios' })
  }
  const connection = await pool.getConnection()
  try {
    await connection.beginTransaction()
    const [rows] = await connection.query(
      `SELECT t.id_token, u.id_usuario
       FROM tokens_recuperacion t JOIN usuarios u ON u.id_usuario=t.id_usuario
       WHERE u.correo=? AND t.token=? AND t.utilizado=0 AND t.fecha_expiracion>NOW()
       ORDER BY t.id_token DESC LIMIT 1 FOR UPDATE`,
      [correo, hashValue(codigo)]
    )
    if (!rows[0]) {
      await connection.rollback()
      return res.status(400).json({ error: 'Código inválido o expirado' })
    }
    const hash = await bcrypt.hash(newPassword, 12)
    await connection.query('UPDATE usuarios SET password=?, intentos_fallidos=0, bloqueado_hasta=NULL WHERE id_usuario=?', [hash, rows[0].id_usuario])
    await connection.query('UPDATE tokens_recuperacion SET utilizado=1 WHERE id_token=?', [rows[0].id_token])
    await connection.query('UPDATE sesiones SET revocado=1, fecha_revocacion=NOW() WHERE id_usuario=? AND revocado=0', [rows[0].id_usuario])
    await audit(connection, rows[0].id_usuario, 'Actualizó', 'Auth', 'Restableció su contraseña', req)
    await connection.commit()
    res.json({ ok: true })
  } catch (error) {
    try { await connection.rollback() } catch {}
    return dbError(res, error)
  } finally {
    connection.release()
  }
}

module.exports = {
  registro, verificarCorreo, reenviarVerificacion, login, refresh,
  logout, logoutAll, me, eliminarCuenta, recuperar, resetPassword,
}
