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

module.exports = { dbError, boolEnv }
