const pool = require('../config/db');
const getProductos = async (req, res) => {
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
}

const crearProducto = async (req, res) => {
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
}

const actualizarProducto = async (req, res) => {
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
}

const eliminarProducto = async (req, res) => {
  const id = positiveInt(Number(req.params.id))
  if (!id) return res.status(400).json({ error: 'ID inválido' })
  try {
    const [rows] = await pool.query("SELECT nombre FROM productos WHERE id_producto=? AND estado='Activo'", [id])
    if (!rows[0]) return res.status(404).json({ error: 'Producto no encontrado' })
    await pool.query("UPDATE productos SET estado='Inactivo', updated_at=NOW() WHERE id_producto=?", [id])
    await audit(pool, req.user.id, 'Eliminó', 'Product', `Desactivó producto: ${rows[0].nombre}`, req)
    res.json({ ok: true })
  } catch (error) { return dbError(res, error) }
}

const importarProductos = async (req, res) => {
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
}

module.exports = {
  getProductos,
  crearProducto,
  actualizarProducto,
  eliminarProducto,
  importarProductos
};