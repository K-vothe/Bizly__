require('dotenv').config()
const bcrypt = require('bcrypt')
const { pool, testConnection } = require('../config/db')
const { validEmail, validPassword, cleanText } = require('../utils/validation')

async function main() {
  const nombre = cleanText(process.env.ADMIN_NAME || 'Admin', 100)
  const apellido = cleanText(process.env.ADMIN_LASTNAME || 'Bizly', 100)
  const correo = validEmail(process.env.ADMIN_EMAIL || '')
  const password = process.env.ADMIN_PASSWORD || ''

  if (!correo) throw new Error('Define ADMIN_EMAIL válido en Backend/.env')
  if (!validPassword(password)) throw new Error('ADMIN_PASSWORD debe tener 8-72 caracteres, al menos una letra y un número')

  await testConnection()
  const hash = await bcrypt.hash(password, 12)
  await pool.query(
    `INSERT INTO usuarios
       (nombre, apellido, correo, password, estado, id_rol, correo_verificado, acepta_tratamiento, fecha_consentimiento, version_politica)
     VALUES (?, ?, ?, ?, 'Activo', 1, 1, 1, NOW(), '1.0')
     ON DUPLICATE KEY UPDATE
       nombre=VALUES(nombre), apellido=VALUES(apellido), password=VALUES(password), estado='Activo', id_rol=1, correo_verificado=1`,
    [nombre, apellido, correo, hash]
  )
  console.log(`[Bizly] Administrador listo: ${correo}`)
  await pool.end()
}

main().catch(async (error) => {
  console.error('[Bizly] No se pudo crear el administrador:', error.message)
  try { await pool.end() } catch {}
  process.exit(1)
})
