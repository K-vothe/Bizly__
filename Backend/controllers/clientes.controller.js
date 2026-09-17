const { pool } = require('../config/db')
const audit = require('../utils/audit')

const {
  cleanText,
  optionalText,
  validEmail,
  positiveInt,
  splitName,
} = require('../utils/validation')

function dbError(res, error) {
  console.error('[Bizly][DB]', error)

  if (error?.code === 'ER_DUP_ENTRY') {
    return res.status(409).json({
      error: 'Ya existe un registro con esos datos únicos',
    })
  }

  if (error?.code === 'ER_ROW_IS_REFERENCED_2') {
    return res.status(409).json({
      error: 'No se puede eliminar porque el registro está siendo utilizado',
    })
  }

  return res.status(500).json({
    error: 'Ocurrió un error interno. Intenta nuevamente.',
  })
}

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

async function getClientes(req, res) {
  try {
    const [rows] = await pool.query(
      "SELECT * FROM clientes WHERE estado='Activo' ORDER BY nombre, apellido"
    )

    res.json(rows.map(mapClient))
  } catch (error) {
    return dbError(res, error)
  }
}

async function createCliente(req, res) {
  const names = splitName(req.body.nombre)
  const documento = optionalText(req.body.doc, 20)
  const tipo = cleanText(req.body.tipo || 'CC', 10).toUpperCase()
  const telefono = optionalText(req.body.tel, 30)
  const correo = req.body.email
    ? validEmail(req.body.email)
    : null

  if (!names.nombre) {
    return res.status(400).json({
      error: 'El nombre es obligatorio',
    })
  }

  if (req.body.email && !correo) {
    return res.status(400).json({
      error: 'Correo del cliente inválido',
    })
  }

  if (!['CC', 'NIT', 'CE', 'TI', 'PAS'].includes(tipo)) {
    return res.status(400).json({
      error: 'Tipo de documento inválido',
    })
  }

  try {
    const [result] = await pool.query(
      `INSERT INTO clientes
       (nombre, apellido, correo, telefono, tipo_doc, documento, total_compras, num_compras, estado)
       VALUES (?, ?, ?, ?, ?, ?, 0, 0, 'Activo')`,
      [
        names.nombre,
        names.apellido || null,
        correo,
        telefono,
        tipo,
        documento,
      ]
    )

    await audit(
      pool,
      req.user.id,
      'Creó',
      'Client',
      `Creó cliente: ${cleanText(req.body.nombre, 200)}`,
      req
    )

    const [rows] = await pool.query(
      'SELECT * FROM clientes WHERE id_cliente=?',
      [result.insertId]
    )

    res.status(201).json(mapClient(rows[0]))
  } catch (error) {
    return dbError(res, error)
  }
}

async function updateCliente(req, res) {
  const id = positiveInt(Number(req.params.id))
  const names = splitName(req.body.nombre)
  const documento = optionalText(req.body.doc, 20)
  const tipo = cleanText(req.body.tipo || 'CC', 10).toUpperCase()
  const telefono = optionalText(req.body.tel, 30)
  const correo = req.body.email
    ? validEmail(req.body.email)
    : null

  if (!id || !names.nombre) {
    return res.status(400).json({
      error: 'Datos de cliente inválidos',
    })
  }

  if (req.body.email && !correo) {
    return res.status(400).json({
      error: 'Correo del cliente inválido',
    })
  }

  try {
    const [result] = await pool.query(
      `UPDATE clientes
       SET nombre=?, apellido=?, correo=?, telefono=?, tipo_doc=?, documento=?, updated_at=NOW()
       WHERE id_cliente=? AND estado='Activo'`,
      [
        names.nombre,
        names.apellido || null,
        correo,
        telefono,
        tipo,
        documento,
        id,
      ]
    )

    if (!result.affectedRows) {
      return res.status(404).json({
        error: 'Cliente no encontrado',
      })
    }

    await audit(
      pool,
      req.user.id,
      'Actualizó',
      'Client',
      `Editó cliente: ${cleanText(req.body.nombre, 200)}`,
      req
    )

    const [rows] = await pool.query(
      'SELECT * FROM clientes WHERE id_cliente=?',
      [id]
    )

    res.json(mapClient(rows[0]))
  } catch (error) {
    return dbError(res, error)
  }
}

async function deleteCliente(req, res) {
  const id = positiveInt(Number(req.params.id))

  if (!id) {
    return res.status(400).json({
      error: 'ID inválido',
    })
  }

  try {
    const [rows] = await pool.query(
      "SELECT nombre, apellido FROM clientes WHERE id_cliente=? AND estado='Activo'",
      [id]
    )

    if (!rows[0]) {
      return res.status(404).json({
        error: 'Cliente no encontrado',
      })
    }

    await pool.query(
      "UPDATE clientes SET estado='Inactivo', updated_at=NOW() WHERE id_cliente=?",
      [id]
    )

    await audit(
      pool,
      req.user.id,
      'Eliminó',
      'Client',
      `Desactivó cliente: ${rows[0].nombre} ${rows[0].apellido || ''}`.trim(),
      req
    )

    res.json({
      ok: true,
    })
  } catch (error) {
    return dbError(res, error)
  }
}

module.exports = {
  getClientes,
  createCliente,
  updateCliente,
  deleteCliente,
}