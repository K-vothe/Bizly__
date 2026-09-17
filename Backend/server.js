require('dotenv').config()

const express = require('express')
const cors = require('cors')

const { pool, testConnection } = require('./config/db')
const { authenticate, authorize } = require('./middleware/auth')
const rateLimit = require('./middleware/rateLimit')
const audit = require('./utils/audit')
const {
  cleanText,
  optionalText,
  validEmail,
  positiveMoney,
  nonNegativeInt,
  positiveInt,
  validDate,
  splitName,
} = require('./utils/validation')

const app = express()
const PORT = Number(process.env.PORT || 3001)

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
app.use('/auth', require('./routes/auth.routes'))

// A partir de aquí todas las rutas requieren autenticación
app.use(authenticate)


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