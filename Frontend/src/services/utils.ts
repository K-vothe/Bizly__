export function fmtCOP(n) {
  return '$ ' + Math.round(Number(n) || 0).toLocaleString('es-CO')
}

export function fmtDate(d) {
  const date = new Date(d)
  if (Number.isNaN(date.getTime())) return '—'
  return date.toLocaleString('es-CO', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function getInitials(name = '') {
  return String(name)
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2) || 'U'
}

function csvCell(value) {
  return `"${String(value ?? '').replace(/"/g, '""')}"`
}

export function exportarCSV(ventas) {
  const rows = [['# Venta', 'Fecha', 'Cliente', 'Registró', 'Pago', 'Total', 'Estado']]
  ventas.forEach((v) => rows.push([v.id, fmtDate(v.fecha), v.clienteNombre, v.usuarioNombre || '', v.pago, v.total, v.estado]))
  const csv = '\uFEFF' + rows.map((r) => r.map(csvCell).join(',')).join('\n')
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'ventas_bizly.csv'
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}
