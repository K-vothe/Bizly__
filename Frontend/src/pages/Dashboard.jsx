import { useApp } from '../context/AppContext'
import { fmtCOP } from '../services/utils'
import BarChart from '../components/BarChart'
import Badge from '../components/Badge'

export default function Dashboard({ onNav, usuario }) {
  const { state } = useApp()
  const { ventas, productos, clientes, config } = state
  const umbral = config.umbral ?? 10
  const esAdmin = usuario?.rol === 'admin'
  const nombreUsuario = usuario?.nombreCompleto || `${usuario?.nombre || ''} ${usuario?.apellido || ''}`.trim()

  const today = new Date().toDateString()
  const ventasHoy = ventas.filter((v) => new Date(v.fecha).toDateString() === today && v.estado === 'completada')
  const misVentasHoy = ventasHoy.filter((v) => !nombreUsuario || v.usuarioNombre === nombreUsuario)
  const totalHoy = ventasHoy.reduce((s, v) => s + v.total, 0)
  const totalMioHoy = misVentasHoy.reduce((s, v) => s + v.total, 0)
  const mesActual = new Date().getMonth()
  const anio = new Date().getFullYear()
  const ventasMes = ventas.filter((v) => {
    const d = new Date(v.fecha)
    return d.getMonth() === mesActual && d.getFullYear() === anio && v.estado === 'completada'
  })
  const totalMes = ventasMes.reduce((s, v) => s + v.total, 0)
  const stockBajo = productos.filter((p) => p.stock <= umbral)

  const labels7 = []
  const data7 = []
  for (let i = 6; i >= 0; i -= 1) {
    const d = new Date(); d.setDate(d.getDate() - i)
    labels7.push(d.toLocaleDateString('es-CO', { day: '2-digit', month: '2-digit' }))
    const ds = d.toDateString()
    const scope = esAdmin ? ventas : ventas.filter((v) => !nombreUsuario || v.usuarioNombre === nombreUsuario)
    data7.push(scope.filter((v) => new Date(v.fecha).toDateString() === ds && v.estado === 'completada').reduce((s, v) => s + v.total, 0))
  }

  const prodCount = {}
  ventas.filter((v) => v.estado === 'completada').forEach((v) => (v.items || []).forEach((it) => { prodCount[it.nombre] = (prodCount[it.nombre] || 0) + it.qty }))
  const topProds = Object.entries(prodCount).sort((a, b) => b[1] - a[1]).slice(0, 5)
  const maxQty = topProds[0]?.[1] || 1

  const cards = esAdmin ? [
    ['ti-shopping-cart', 'Ventas hoy', fmtCOP(totalHoy), `${ventasHoy.length} transacciones`],
    ['ti-trending-up', 'Ingresos del mes', fmtCOP(totalMes), `${ventasMes.length} ventas`],
    ['ti-package', 'Productos activos', productos.length, `${stockBajo.length} con stock bajo`],
    ['ti-users', 'Clientes', clientes.length, 'registrados'],
  ] : [
    ['ti-user-dollar', 'Mis ventas hoy', fmtCOP(totalMioHoy), `${misVentasHoy.length} transacciones propias`],
    ['ti-receipt', 'Ventas del negocio hoy', ventasHoy.length, fmtCOP(totalHoy)],
    ['ti-alert-triangle', 'Stock bajo', stockBajo.length, `umbral: ${umbral} unidades`],
    ['ti-users', 'Clientes disponibles', clientes.length, 'para registrar ventas'],
  ]

  return (
    <div className="page">
      <div className="page-header dashboard-heading">
        <div>
          <div className="page-title">Dashboard</div>
          <div className="page-sub">{esAdmin ? 'Resumen general del negocio' : 'Resumen operativo de tu jornada'}</div>
        </div>
        <div className="dashboard-user"><strong>{nombreUsuario || 'Usuario'}</strong><span>{esAdmin ? 'Administrador' : 'Empleado'}</span></div>
      </div>

      <div className="metric-grid">
        {cards.map(([icon, label, value, sub]) => (
          <div className="metric-card" key={label}>
            <div className="metric-label"><i className={`ti ${icon}`} /> {label}</div>
            <div className="metric-value">{value}</div>
            <div className="metric-sub">{sub}</div>
          </div>
        ))}
      </div>

      <div className="three-col">
        <div className="card">
          <div className="card-header"><span className="card-title">{esAdmin ? 'Ingresos últimos 7 días' : 'Mis ventas últimos 7 días'}</span></div>
          <div className="card-body chart-body"><BarChart labels={labels7} data={data7} height={200} /></div>
        </div>
        <div className="card">
          <div className="card-header"><span className="card-title">Top productos</span></div>
          <div className="card-body">
            {topProds.length === 0 ? <p className="muted-copy">Sin ventas aún</p> : (
              <ul className="top-products-list">
                {topProds.map(([nombre, qty], i) => (
                  <li key={nombre}><div className="rank-num">{i + 1}</div><span className="top-product-name">{nombre}</span><div className="prog-bar"><div className="prog-fill" style={{ width: `${Math.round((qty / maxQty) * 100)}%` }} /></div><span className="top-product-qty">{qty} ud.</span></li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>

      <div className="two-col dashboard-bottom">
        <div className="card">
          <div className="card-header"><span className="card-title warning-title">⚠ Stock bajo</span><button className="link-action" onClick={() => onNav('inventario')}>Ver todo →</button></div>
          <div className="card-body table-card-body"><table><tbody>{stockBajo.length === 0 ? <tr><td colSpan={2} className="empty-state">Todo en orden ✓</td></tr> : stockBajo.slice(0, 5).map((p) => <tr key={p.id}><td>{p.nombre}</td><td><Badge color="yellow">{p.stock} en stock</Badge></td></tr>)}</tbody></table></div>
        </div>
        <div className="card">
          <div className="card-header"><span className="card-title">Ventas recientes</span><button className="link-action" onClick={() => onNav('ventas')}>Ver todo →</button></div>
          <div className="card-body table-card-body"><table><tbody>{ventas.length === 0 ? <tr><td colSpan={3} className="empty-state">Sin ventas aún</td></tr> : ventas.slice(0, 5).map((v) => <tr key={v.id}><td><button className="link-action" onClick={() => onNav('ventas')}>{v.id}</button></td><td className="align-right">{fmtCOP(v.total)}</td><td><Badge color={v.estado === 'completada' ? 'green' : 'red'}>{v.estado}</Badge></td></tr>)}</tbody></table></div>
        </div>
      </div>
    </div>
  )
}
