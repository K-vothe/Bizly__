async function audit(db, userId, accion, tipo, descripcion, req = null) {
  const ip = req?.ip || null
  const userAgent = req?.headers?.['user-agent'] || null
  await db.query(
    `INSERT INTO auditoria (accion, tipo, descripcion, id_usuario, ip, user_agent)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [accion, tipo, descripcion, userId || null, ip, userAgent]
  )
}

module.exports = audit
