require('dotenv').config()

const crypto = require('crypto')
const express = require('express')
const cors = require('cors')
const bcrypt = require('bcrypt')
const jwt = require('jsonwebtoken')

const { pool, testConnection } = require('./config/db')
const { authenticate, authorize, getSecret } = require('./middleware/auth')
const rateLimit = require('./middleware/rateLimit')
const audit = require('./utils/audit')
const {
  cleanText,
  optionalText,
  validEmail,
  validPassword,
  positiveMoney,
  nonNegativeInt,
  positiveInt,
  validDate,
  splitName,
} = require('./utils/validation')
const { configured: emailConfigured, sendCode } = require('./services/email')

const app = express()
const PORT = Number(process.env.PORT || 3001)
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

function dbError(res, error) {
  console.error('[Bizly][DB]', error)
  if (error?.code === 'ER_DUP_ENTRY') {
    return res.status(409).json({ error: 'Ya existe un registro con esos datos únicos' })
  }
  if (error?.code === 'ER_ROW_IS_REFERENCED_2') {
    return res.status(409).json({ error: 'No se puede eliminar porque el registro está siendo utilizado' })
  }
  return res.status(500).json({ error: 'Ocurrió un error interno. Intenta nuevamente.' })
}

function boolEnv(name) {
  return String(process.env[name] || '').toLowerCase() === 'true'
}

async function deliverCode({ correo, code, purpose }) {
  const templates = {
    verify: {
      subject: 'Verifica tu correo — Bizly',
      title: 'Verificación de correo',
      text: 'Usa este código para confirmar tu cuenta. Expira en 15 minutos.',
    },
    reset: {
      subject: 'Código de recuperación — Bizly',
      title: 'Recuperar contraseña',
      text: 'Usa este código para restablecer tu contraseña. Expira en 15 minutos.',
    },
  }
  const template = templates[purpose]
  if (emailConfigured()) {
    await sendCode({ to: correo, code, ...template })
    return { delivered: true }
  }
  if (process.env.NODE_ENV !== 'production' && boolEnv('DEV_SHOW_EMAIL_CODES')) {
    console.warn(`[Bizly][DEV] Código ${purpose} para ${correo}: ${code}`)
    return { delivered: false, devCode: code }
  }
  return { delivered: false }
}

// Seguridad y límites básicos
app.set('trust proxy', 1)
const allowedOrigins = String(process.env.CORS_ORIGIN || 'http://localhost:5173')
  .split(',')
  .map((x) => x.trim())
  .filter(Boolean)
app.use(cors({
  origin(origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) return callback(null, true)
    return callback(new Error('Origen no permitido por CORS'))
  },
}))
app.use(express.json({ limit: '200kb' }))
app.use((req, res, next) => {
  if (process.env.NODE_ENV === 'production' && boolEnv('FORCE_HTTPS') && !req.secure) {
    return res.redirect(308, `https://${req.get('host')}${req.originalUrl}`)
  }
  next()
})
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff')
  res.setHeader('X-Frame-Options', 'DENY')
  res.setHeader('Referrer-Policy', 'no-referrer')
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()')
  if (process.env.NODE_ENV === 'production') {
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains')
  }
  next()
})

const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 10 })
const mailLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 5 })

// Health check sin datos sensibles
app.get('/', (req, res) => res.json({ service: 'Bizly API', status: 'ok', version: '1.1.0' }))
app.get('/health', async (req, res) => {
  try {
    await pool.query('SELECT 1')
    res.json({ status: 'ok', database: 'ok' })
  } catch {
    res.status(503).json({ status: 'degraded', database: 'unavailable' })
  }
})

// ══════════════════════════════════════════════════════════
// AUTH
// ══════════════════════════════════════════════════════════
app.post('/auth/registro', authLimiter, async (req, res) => {
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
    res.status(201).json({
      ok: true,
      requiereVerificacion: true,
      correo,
      ...(delivery.devCode ? { devCode: delivery.devCode } : {}),
    })
  } catch (error) {
    try { await connection.rollback() } catch {}
    return dbError(res, error)
  } finally {
    connection.release()
  }
})

app.post('/auth/verificar-correo', authLimiter, async (req, res) => {
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
})

app.post('/auth/reenviar-verificacion', mailLimiter, async (req, res) => {
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
})

app.post('/auth/login', authLimiter, async (req, res) => {
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
})

app.post('/auth/refresh', authLimiter, async (req, res) => {
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
})

app.post('/auth/logout', authenticate, async (req, res) => {
  try {
    await pool.query('UPDATE sesiones SET revocado=1, fecha_revocacion=NOW() WHERE id_sesion=?', [req.user.sid])
    await audit(pool, req.user.id, 'Cerró', 'Auth', 'Cerró sesión', req)
    res.json({ ok: true })
  } catch (error) {
    return dbError(res, error)
  }
})

app.post('/auth/logout-all', authenticate, async (req, res) => {
  try {
    await pool.query('UPDATE sesiones SET revocado=1, fecha_revocacion=NOW() WHERE id_usuario=? AND revocado=0', [req.user.id])
    await audit(pool, req.user.id, 'Cerró', 'Auth', 'Cerró todas sus sesiones', req)
    res.json({ ok: true })
  } catch (error) {
    return dbError(res, error)
  }
})

app.get('/auth/me', authenticate, (req, res) => {
  res.json({ usuario: { ...req.user, nombreCompleto: `${req.user.nombre} ${req.user.apellido || ''}`.trim() } })
})

app.delete('/auth/cuenta', authenticate, authLimiter, async (req, res) => {
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
})

app.post('/auth/recuperar', mailLimiter, async (req, res) => {
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
})

app.post('/auth/reset-password', authLimiter, async (req, res) => {
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
})

// A partir de aquí todas las rutas requieren autenticación
app.use(authenticate)

// ══════════════════════════════════════════════════════════
// PRODUCTOS
// ══════════════════════════════════════════════════════════
app.get('/productos', async (req, res) => {
  try {
    const [rows] = await pool.query("SELECT * FROM productos WHERE estado='Activo' ORDER BY nombre")
    res.json(rows.map((p) => ({
      id: p.id_producto,
      nombre: p.nombre,
      sku: p.sku || '',
      categoria: p.categoria || '',
      precio: Number(p.precio),
      stock: Number(p.stock),
    })))
  } catch (error) { return dbError(res, error) }
})

app.post('/productos', async (req, res) => {
  const nombre = cleanText(req.body.nombre, 150)
  const sku = optionalText(req.body.sku, 50)
  const categoria = optionalText(req.body.categoria, 100)
  const precio = positiveMoney(req.body.precio)
  const stock = nonNegativeInt(Number(req.body.stock))
  if (!nombre || precio === null || stock === null) return res.status(400).json({ error: 'Nombre, precio y stock válidos son obligatorios' })
  try {
    const [result] = await pool.query(
      `INSERT INTO productos (nombre, sku, categoria, precio, stock, estado)
       VALUES (?, ?, ?, ?, ?, 'Activo')`,
      [nombre, sku, categoria, precio, stock]
    )
    await audit(pool, req.user.id, 'Creó', 'Product', `Creó producto: ${nombre}`, req)
    res.status(201).json({ id: result.insertId, nombre, sku: sku || '', categoria: categoria || '', precio, stock })
  } catch (error) { return dbError(res, error) }
})

app.put('/productos/:id', async (req, res) => {
  const id = positiveInt(Number(req.params.id))
  const nombre = cleanText(req.body.nombre, 150)
  const sku = optionalText(req.body.sku, 50)
  const categoria = optionalText(req.body.categoria, 100)
  const precio = positiveMoney(req.body.precio)
  const stock = nonNegativeInt(Number(req.body.stock))
  if (!id || !nombre || precio === null || stock === null) return res.status(400).json({ error: 'Datos de producto inválidos' })
  try {
    const [result] = await pool.query(
      `UPDATE productos SET nombre=?, sku=?, categoria=?, precio=?, stock=?, updated_at=NOW()
       WHERE id_producto=? AND estado='Activo'`,
      [nombre, sku, categoria, precio, stock, id]
    )
    if (!result.affectedRows) return res.status(404).json({ error: 'Producto no encontrado' })
    await audit(pool, req.user.id, 'Actualizó', 'Product', `Editó producto: ${nombre}`, req)
    res.json({ ok: true })
  } catch (error) { return dbError(res, error) }
})

app.delete('/productos/:id', async (req, res) => {
  const id = positiveInt(Number(req.params.id))
  if (!id) return res.status(400).json({ error: 'ID inválido' })
  try {
    const [rows] = await pool.query("SELECT nombre FROM productos WHERE id_producto=? AND estado='Activo'", [id])
    if (!rows[0]) return res.status(404).json({ error: 'Producto no encontrado' })
    await pool.query("UPDATE productos SET estado='Inactivo', updated_at=NOW() WHERE id_producto=?", [id])
    await audit(pool, req.user.id, 'Eliminó', 'Product', `Desactivó producto: ${rows[0].nombre}`, req)
    res.json({ ok: true })
  } catch (error) { return dbError(res, error) }
})

app.post('/productos/importar', async (req, res) => {
  const productos = Array.isArray(req.body.productos) ? req.body.productos : []
  if (!productos.length || productos.length > 500) return res.status(400).json({ error: 'Envía entre 1 y 500 productos' })
  const parsed = []
  for (let i = 0; i < productos.length; i += 1) {
    const p = productos[i]
    const nombre = cleanText(p.nombre, 150)
    const sku = optionalText(p.sku, 50)
    const categoria = optionalText(p.categoria, 100)
    const precio = positiveMoney(p.precio)
    const stock = nonNegativeInt(Number(p.stock))
    if (!nombre || precio === null || stock === null) return res.status(400).json({ error: `Fila ${i + 1}: datos inválidos` })
    parsed.push({ nombre, sku, categoria, precio, stock })
  }

  const connection = await pool.getConnection()
  try {
    await connection.beginTransaction()
    let procesados = 0
    for (const p of parsed) {
      if (p.sku) {
        await connection.query(
          `INSERT INTO productos (nombre, sku, categoria, precio, stock, estado)
           VALUES (?, ?, ?, ?, ?, 'Activo')
           ON DUPLICATE KEY UPDATE nombre=VALUES(nombre), categoria=VALUES(categoria), precio=VALUES(precio), stock=VALUES(stock), estado='Activo', updated_at=NOW()`,
          [p.nombre, p.sku, p.categoria, p.precio, p.stock]
        )
      } else {
        await connection.query(
          `INSERT INTO productos (nombre, sku, categoria, precio, stock, estado) VALUES (?, NULL, ?, ?, ?, 'Activo')`,
          [p.nombre, p.categoria, p.precio, p.stock]
        )
      }
      procesados += 1
    }
    await audit(connection, req.user.id, 'Importó', 'Product', `Importó ${procesados} productos por carga masiva`, req)
    await connection.commit()
    res.json({ ok: true, procesados })
  } catch (error) {
    try { await connection.rollback() } catch {}
    return dbError(res, error)
  } finally {
    connection.release()
  }
})

// ══════════════════════════════════════════════════════════
// CLIENTES
// ══════════════════════════════════════════════════════════
function mapClient(c) {
  return {
    id: c.id_cliente,
    nombre: `${c.nombre}${c.apellido ? ` ${c.apellido}` : ''}`,
    doc: c.documento || '',
    tipo: c.tipo_doc || 'CC',
    tel: c.telefono || '',
    email: c.correo || '',
    totalCompras: Number(c.total_compras || 0),
    numCompras: Number(c.num_compras || 0),
  }
}

app.get('/clientes', async (req, res) => {
  try {
    const [rows] = await pool.query("SELECT * FROM clientes WHERE estado='Activo' ORDER BY nombre, apellido")
    res.json(rows.map(mapClient))
  } catch (error) { return dbError(res, error) }
})

app.post('/clientes', async (req, res) => {
  const names = splitName(req.body.nombre)
  const documento = optionalText(req.body.doc, 20)
  const tipo = cleanText(req.body.tipo || 'CC', 10).toUpperCase()
  const telefono = optionalText(req.body.tel, 30)
  const correo = req.body.email ? validEmail(req.body.email) : null
  if (!names.nombre) return res.status(400).json({ error: 'El nombre es obligatorio' })
  if (req.body.email && !correo) return res.status(400).json({ error: 'Correo del cliente inválido' })
  if (!['CC', 'NIT', 'CE', 'TI', 'PAS'].includes(tipo)) return res.status(400).json({ error: 'Tipo de documento inválido' })
  try {
    const [result] = await pool.query(
      `INSERT INTO clientes (nombre, apellido, correo, telefono, tipo_doc, documento, total_compras, num_compras, estado)
       VALUES (?, ?, ?, ?, ?, ?, 0, 0, 'Activo')`,
      [names.nombre, names.apellido || null, correo, telefono, tipo, documento]
    )
    await audit(pool, req.user.id, 'Creó', 'Client', `Creó cliente: ${cleanText(req.body.nombre, 200)}`, req)
    const [rows] = await pool.query('SELECT * FROM clientes WHERE id_cliente=?', [result.insertId])
    res.status(201).json(mapClient(rows[0]))
  } catch (error) { return dbError(res, error) }
})

app.put('/clientes/:id', async (req, res) => {
  const id = positiveInt(Number(req.params.id))
  const names = splitName(req.body.nombre)
  const documento = optionalText(req.body.doc, 20)
  const tipo = cleanText(req.body.tipo || 'CC', 10).toUpperCase()
  const telefono = optionalText(req.body.tel, 30)
  const correo = req.body.email ? validEmail(req.body.email) : null
  if (!id || !names.nombre) return res.status(400).json({ error: 'Datos de cliente inválidos' })
  if (req.body.email && !correo) return res.status(400).json({ error: 'Correo del cliente inválido' })
  try {
    const [result] = await pool.query(
      `UPDATE clientes SET nombre=?, apellido=?, correo=?, telefono=?, tipo_doc=?, documento=?, updated_at=NOW()
       WHERE id_cliente=? AND estado='Activo'`,
      [names.nombre, names.apellido || null, correo, telefono, tipo, documento, id]
    )
    if (!result.affectedRows) return res.status(404).json({ error: 'Cliente no encontrado' })
    await audit(pool, req.user.id, 'Actualizó', 'Client', `Editó cliente: ${cleanText(req.body.nombre, 200)}`, req)
    const [rows] = await pool.query('SELECT * FROM clientes WHERE id_cliente=?', [id])
    res.json(mapClient(rows[0]))
  } catch (error) { return dbError(res, error) }
})

app.delete('/clientes/:id', async (req, res) => {
  const id = positiveInt(Number(req.params.id))
  if (!id) return res.status(400).json({ error: 'ID inválido' })
  try {
    const [rows] = await pool.query("SELECT nombre, apellido FROM clientes WHERE id_cliente=? AND estado='Activo'", [id])
    if (!rows[0]) return res.status(404).json({ error: 'Cliente no encontrado' })
    await pool.query("UPDATE clientes SET estado='Inactivo', updated_at=NOW() WHERE id_cliente=?", [id])
    await audit(pool, req.user.id, 'Eliminó', 'Client', `Desactivó cliente: ${rows[0].nombre} ${rows[0].apellido || ''}`.trim(), req)
    res.json({ ok: true })
  } catch (error) { return dbError(res, error) }
})

// ══════════════════════════════════════════════════════════
// VENTAS
// ══════════════════════════════════════════════════════════
app.get('/ventas', async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT v.*, CONCAT_WS(' ', u.nombre, u.apellido) AS usuario_nombre
       FROM ventas v LEFT JOIN usuarios u ON u.id_usuario=v.id_usuario
       ORDER BY v.fecha_venta DESC LIMIT 1000`
    )
    if (!rows.length) return res.json([])
    const ids = rows.map((v) => v.id_venta)
    const [details] = await pool.query(
      `SELECT dv.*, p.nombre FROM detalle_ventas dv
       JOIN productos p ON p.id_producto=dv.id_producto WHERE dv.id_venta IN (?)`,
      [ids]
    )
    res.json(rows.map((v) => ({
      id: `VTA-${String(v.id_venta).padStart(6, '0')}`,
      id_venta: v.id_venta,
      fecha: v.fecha_venta,
      clienteId: v.id_cliente,
      clienteNombre: v.cliente_nombre || 'Cliente general',
      pago: v.metodo_pago || 'Efectivo',
      total: Number(v.total || 0),
      estado: v.estado || 'completada',
      usuarioNombre: v.usuario_nombre || 'Usuario eliminado',
      items: details.filter((d) => d.id_venta === v.id_venta).map((d) => ({
        pid: d.id_producto,
        nombre: d.nombre,
        precio: Number(d.precio_unitario),
        qty: Number(d.cantidad),
      })),
    })))
  } catch (error) { return dbError(res, error) }
})

app.post('/ventas', async (req, res) => {
  const rawItems = Array.isArray(req.body.items) ? req.body.items : []
  const clienteId = req.body.clienteId ? positiveInt(Number(req.body.clienteId)) : null
  const pago = cleanText(req.body.pago || 'Efectivo', 50)
  if (!rawItems.length || rawItems.length > 100) return res.status(400).json({ error: 'La venta debe tener entre 1 y 100 productos' })

  const quantities = new Map()
  for (const item of rawItems) {
    const pid = positiveInt(Number(item.pid))
    const qty = positiveInt(Number(item.qty))
    if (!pid || !qty) return res.status(400).json({ error: 'Producto o cantidad inválidos' })
    quantities.set(pid, (quantities.get(pid) || 0) + qty)
  }

  const connection = await pool.getConnection()
  try {
    await connection.beginTransaction()
    let clienteNombre = 'Cliente general'
    if (clienteId) {
      const [clients] = await connection.query("SELECT * FROM clientes WHERE id_cliente=? AND estado='Activo' FOR UPDATE", [clienteId])
      if (!clients[0]) {
        await connection.rollback()
        return res.status(400).json({ error: 'El cliente seleccionado no existe o está inactivo' })
      }
      clienteNombre = `${clients[0].nombre} ${clients[0].apellido || ''}`.trim()
    }

    const items = []
    let total = 0
    for (const [pid, qty] of quantities.entries()) {
      const [products] = await connection.query(
        "SELECT id_producto, nombre, precio, stock FROM productos WHERE id_producto=? AND estado='Activo' FOR UPDATE",
        [pid]
      )
      const product = products[0]
      if (!product) {
        await connection.rollback()
        return res.status(400).json({ error: `El producto ${pid} no existe o está inactivo` })
      }
      if (Number(product.stock) < qty) {
        await connection.rollback()
        return res.status(409).json({ error: `Stock insuficiente para ${product.nombre}. Disponible: ${product.stock}` })
      }
      const price = Number(product.precio)
      const subtotal = Math.round(price * qty * 100) / 100
      total += subtotal
      items.push({ pid, qty, nombre: product.nombre, precio: price, subtotal })
    }

    const [[config]] = await connection.query('SELECT iva FROM configuracion WHERE id_config=1')
    const iva = Number(config?.iva ?? 19)
    const impuesto = Math.round((total * iva / (100 + iva)) * 100) / 100
    const subtotal = Math.round((total - impuesto) * 100) / 100

    const [saleResult] = await connection.query(
      `INSERT INTO ventas (subtotal, impuesto, total, metodo_pago, estado, cliente_nombre, id_cliente, id_usuario)
       VALUES (?, ?, ?, ?, 'completada', ?, ?, ?)`,
      [subtotal, impuesto, total, pago, clienteNombre, clienteId, req.user.id]
    )
    const saleId = saleResult.insertId

    await connection.query(
      'INSERT INTO detalle_ventas (id_venta, id_producto, cantidad, precio_unitario, subtotal) VALUES ?',
      [items.map((i) => [saleId, i.pid, i.qty, i.precio, i.subtotal])]
    )
    for (const item of items) {
      await connection.query('UPDATE productos SET stock=stock-?, updated_at=NOW() WHERE id_producto=?', [item.qty, item.pid])
    }
    if (clienteId) {
      await connection.query(
        'UPDATE clientes SET total_compras=total_compras+?, num_compras=num_compras+1, updated_at=NOW() WHERE id_cliente=?',
        [total, clienteId]
      )
    }
    await audit(connection, req.user.id, 'Creó', 'Sale', `Registró venta VTA-${String(saleId).padStart(6, '0')} por $${Math.round(total).toLocaleString('es-CO')}`, req)
    await connection.commit()
    res.status(201).json({
      id_venta: saleId,
      id: `VTA-${String(saleId).padStart(6, '0')}`,
      total,
      subtotal,
      impuesto,
      clienteNombre,
      items,
    })
  } catch (error) {
    try { await connection.rollback() } catch {}
    return dbError(res, error)
  } finally {
    connection.release()
  }
})

app.put('/ventas/:id/anular', async (req, res) => {
  const saleId = positiveInt(Number(req.params.id))
  if (!saleId) return res.status(400).json({ error: 'ID de venta inválido' })
  const connection = await pool.getConnection()
  try {
    await connection.beginTransaction()
    const [sales] = await connection.query('SELECT * FROM ventas WHERE id_venta=? FOR UPDATE', [saleId])
    const sale = sales[0]
    if (!sale) {
      await connection.rollback()
      return res.status(404).json({ error: 'Venta no encontrada' })
    }
    if (sale.estado === 'anulada') {
      await connection.rollback()
      return res.status(409).json({ error: 'La venta ya fue anulada anteriormente' })
    }
    const [items] = await connection.query('SELECT * FROM detalle_ventas WHERE id_venta=?', [saleId])
    for (const item of items) {
      await connection.query('UPDATE productos SET stock=stock+?, updated_at=NOW() WHERE id_producto=?', [item.cantidad, item.id_producto])
    }
    await connection.query("UPDATE ventas SET estado='anulada', fecha_anulacion=NOW(), id_usuario_anulacion=? WHERE id_venta=?", [req.user.id, saleId])
    if (sale.id_cliente) {
      await connection.query(
        `UPDATE clientes SET total_compras=GREATEST(0,total_compras-?), num_compras=GREATEST(0,num_compras-1), updated_at=NOW()
         WHERE id_cliente=?`,
        [sale.total, sale.id_cliente]
      )
    }
    await audit(connection, req.user.id, 'Anuló', 'Sale', `Anuló venta VTA-${String(saleId).padStart(6, '0')}`, req)
    await connection.commit()
    res.json({ ok: true })
  } catch (error) {
    try { await connection.rollback() } catch {}
    return dbError(res, error)
  } finally {
    connection.release()
  }
})

// ══════════════════════════════════════════════════════════
// CONFIGURACIÓN
// ══════════════════════════════════════════════════════════
app.get('/configuracion', async (req, res) => {
  try {
    const [[row]] = await pool.query('SELECT * FROM configuracion WHERE id_config=1')
    res.json({
      nombre: row?.nombre_negocio || 'Mi Tienda',
      tel: row?.telefono || '',
      email: row?.correo || '',
      dir: row?.direccion || '',
      moneda: row?.moneda || 'COP',
      iva: Number(row?.iva ?? 19),
      umbral: Number(row?.umbral_stock ?? 10),
    })
  } catch (error) { return dbError(res, error) }
})

app.put('/configuracion', authorize('admin'), async (req, res) => {
  const nombre = cleanText(req.body.nombre, 150)
  const tel = optionalText(req.body.tel, 30)
  const email = req.body.email ? validEmail(req.body.email) : null
  const dir = optionalText(req.body.dir, 255)
  const moneda = cleanText(req.body.moneda || 'COP', 3).toUpperCase()
  const iva = positiveMoney(req.body.iva)
  const umbral = nonNegativeInt(Number(req.body.umbral))
  if (!nombre || (req.body.email && !email) || !['COP', 'USD'].includes(moneda) || iva === null || iva > 100 || umbral === null) {
    return res.status(400).json({ error: 'Configuración inválida' })
  }
  try {
    await pool.query(
      `UPDATE configuracion SET nombre_negocio=?, telefono=?, correo=?, direccion=?, moneda=?, iva=?, umbral_stock=?, updated_at=NOW()
       WHERE id_config=1`,
      [nombre, tel, email, dir, moneda, iva, umbral]
    )
    await audit(pool, req.user.id, 'Actualizó', 'Company', 'Actualizó configuración de la empresa', req)
    res.json({ ok: true, config: { nombre, tel: tel || '', email: email || '', dir: dir || '', moneda, iva, umbral } })
  } catch (error) { return dbError(res, error) }
})

// ══════════════════════════════════════════════════════════
// REPORTES PARAMETRIZADOS
// ══════════════════════════════════════════════════════════
app.get('/reportes/resumen', async (req, res) => {
  const desde = validDate(req.query.desde) || new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().slice(0, 10)
  const hasta = validDate(req.query.hasta) || new Date().toISOString().slice(0, 10)
  if (desde > hasta) return res.status(400).json({ error: 'La fecha inicial no puede ser posterior a la final' })
  try {
    const params = [desde, hasta]
    const [[summary]] = await pool.query(
      `SELECT COUNT(*) AS ventas, COALESCE(SUM(total),0) AS ingresos, COALESCE(AVG(total),0) AS ticket, COALESCE(SUM(impuesto),0) AS iva
       FROM ventas WHERE estado='completada' AND DATE(fecha_venta) BETWEEN ? AND ?`, params)
    const [payments] = await pool.query(
      `SELECT metodo_pago AS label, COALESCE(SUM(total),0) AS total
       FROM ventas WHERE estado='completada' AND DATE(fecha_venta) BETWEEN ? AND ? GROUP BY metodo_pago ORDER BY total DESC`, params)
    const [top] = await pool.query(
      `SELECT p.nombre, SUM(dv.cantidad) AS unidades, SUM(dv.subtotal) AS ingresos
       FROM detalle_ventas dv JOIN ventas v ON v.id_venta=dv.id_venta JOIN productos p ON p.id_producto=dv.id_producto
       WHERE v.estado='completada' AND DATE(v.fecha_venta) BETWEEN ? AND ?
       GROUP BY p.id_producto, p.nombre ORDER BY ingresos DESC LIMIT 5`, params)
    const [monthly] = await pool.query(
      `SELECT DATE_FORMAT(fecha_venta, '%Y-%m') AS mes, SUM(total) AS total
       FROM ventas WHERE estado='completada' AND fecha_venta >= DATE_SUB(CURDATE(), INTERVAL 5 MONTH)
       GROUP BY DATE_FORMAT(fecha_venta, '%Y-%m') ORDER BY mes`,
    )
    res.json({
      desde,
      hasta,
      ventas: Number(summary.ventas || 0),
      ingresos: Number(summary.ingresos || 0),
      ticket: Number(summary.ticket || 0),
      iva: Number(summary.iva || 0),
      pagos: payments.map((x) => ({ label: x.label || 'Otro', total: Number(x.total || 0) })),
      top: top.map((x) => ({ nombre: x.nombre, unidades: Number(x.unidades || 0), ingresos: Number(x.ingresos || 0) })),
      mensual: monthly.map((x) => ({ mes: x.mes, total: Number(x.total || 0) })),
    })
  } catch (error) { return dbError(res, error) }
})

// ══════════════════════════════════════════════════════════
// AUDITORÍA Y USUARIOS (ADMIN)
// ══════════════════════════════════════════════════════════
app.get('/auditoria', authorize('admin'), async (req, res) => {
  const limit = Math.min(500, Math.max(1, Number(req.query.limit || 200)))
  try {
    const [rows] = await pool.query(
      `SELECT a.*, u.nombre AS user_nombre, u.apellido AS user_apellido
       FROM auditoria a LEFT JOIN usuarios u ON u.id_usuario=a.id_usuario
       ORDER BY a.fecha DESC LIMIT ?`, [limit]
    )
    res.json(rows.map((a) => ({
      id: a.id_auditoria,
      user: a.user_nombre ? `${a.user_nombre} ${a.user_apellido || ''}`.trim() : 'Sistema',
      accion: a.accion || '',
      tipo: a.tipo || '',
      detalle: a.descripcion || '',
      fecha: a.fecha,
    })))
  } catch (error) { return dbError(res, error) }
})

app.get('/usuarios', authorize('admin'), async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT u.id_usuario AS id, u.nombre, u.apellido, u.correo, u.estado, u.fecha_registro, u.ultimo_acceso,
              u.correo_verificado, r.nombre_rol AS rol
       FROM usuarios u JOIN roles r ON r.id_rol=u.id_rol ORDER BY u.fecha_registro DESC`
    )
    res.json(rows)
  } catch (error) { return dbError(res, error) }
})

app.put('/usuarios/:id', authorize('admin'), async (req, res) => {
  const id = positiveInt(Number(req.params.id))
  const rol = cleanText(req.body.rol, 20).toLowerCase()
  const estado = cleanText(req.body.estado, 20)
  if (!id || !['admin', 'empleado'].includes(rol) || !['Activo', 'Inactivo'].includes(estado)) {
    return res.status(400).json({ error: 'Rol o estado inválido' })
  }
  try {
    if (id === req.user.id && (estado === 'Inactivo' || rol !== req.user.rol)) {
      return res.status(409).json({ error: 'No puedes desactivar ni cambiar el rol de tu propia cuenta desde este módulo' })
    }
    const [[target]] = await pool.query(
      `SELECT u.estado, r.nombre_rol AS rol
       FROM usuarios u JOIN roles r ON r.id_rol=u.id_rol WHERE u.id_usuario=?`,
      [id]
    )
    if (!target) return res.status(404).json({ error: 'Usuario no encontrado' })
    if (target.rol === 'admin' && target.estado === 'Activo' && (rol !== 'admin' || estado !== 'Activo')) {
      const [[count]] = await pool.query(
        `SELECT COUNT(*) AS total FROM usuarios u JOIN roles r ON r.id_rol=u.id_rol
         WHERE r.nombre_rol='admin' AND u.estado='Activo'`
      )
      if (Number(count.total) <= 1) return res.status(409).json({ error: 'Debe existir al menos un administrador activo' })
    }
    const [[role]] = await pool.query('SELECT id_rol FROM roles WHERE nombre_rol=?', [rol])
    const [result] = await pool.query('UPDATE usuarios SET id_rol=?, estado=? WHERE id_usuario=?', [role.id_rol, estado, id])
    if (estado === 'Inactivo') await pool.query('UPDATE sesiones SET revocado=1, fecha_revocacion=NOW() WHERE id_usuario=?', [id])
    await audit(pool, req.user.id, 'Actualizó', 'User', `Actualizó usuario #${id}: rol=${rol}, estado=${estado}`, req)
    res.json({ ok: true })
  } catch (error) { return dbError(res, error) }
})

app.delete('/usuarios/:id', authorize('admin'), async (req, res) => {
  const id = positiveInt(Number(req.params.id))
  if (!id) return res.status(400).json({ error: 'ID inválido' })
  if (id === req.user.id) return res.status(409).json({ error: 'No puedes desactivar tu propia cuenta desde este módulo' })
  try {
    const [[target]] = await pool.query(
      `SELECT u.estado, r.nombre_rol AS rol
       FROM usuarios u JOIN roles r ON r.id_rol=u.id_rol WHERE u.id_usuario=?`,
      [id]
    )
    if (!target) return res.status(404).json({ error: 'Usuario no encontrado' })
    if (target.rol === 'admin' && target.estado === 'Activo') {
      const [[count]] = await pool.query(
        `SELECT COUNT(*) AS total FROM usuarios u JOIN roles r ON r.id_rol=u.id_rol
         WHERE r.nombre_rol='admin' AND u.estado='Activo'`
      )
      if (Number(count.total) <= 1) return res.status(409).json({ error: 'Debe existir al menos un administrador activo' })
    }
    const [result] = await pool.query("UPDATE usuarios SET estado='Inactivo' WHERE id_usuario=?", [id])
    await pool.query('UPDATE sesiones SET revocado=1, fecha_revocacion=NOW() WHERE id_usuario=?', [id])
    await audit(pool, req.user.id, 'Eliminó', 'User', `Desactivó usuario #${id}`, req)
    res.json({ ok: true })
  } catch (error) { return dbError(res, error) }
})

app.use((req, res) => res.status(404).json({ error: 'Ruta no encontrada' }))
app.use((error, req, res, next) => {
  console.error('[Bizly][API]', error)
  if (error?.message === 'Origen no permitido por CORS') return res.status(403).json({ error: 'Origen no permitido' })
  res.status(500).json({ error: 'Error interno del servidor' })
})

async function start() {
  if (process.env.NODE_ENV === 'production') {
    if (!process.env.JWT_SECRET || !process.env.JWT_REFRESH_SECRET) {
      throw new Error('JWT_SECRET y JWT_REFRESH_SECRET son obligatorios en producción')
    }
  }
  await testConnection()
  app.listen(PORT, () => console.log(`[Bizly] API ejecutándose en puerto ${PORT}`))
}

start().catch((error) => {
  console.error('[Bizly] No se pudo iniciar la API:', error.message)
  process.exit(1)
})
