import { useEffect, useMemo, useState } from 'react'
import { useApp } from '../context/AppContext'
import { fmtCOP, exportarCSV } from '../services/utils'
import BarChart from '../components/BarChart'
import DoughnutChart from '../components/DoughnutChart'

function todayStr() { return new Date().toISOString().split('T')[0] }
function monthStartStr() { const t = todayStr(); return `${t.slice(0, 8)}01` }

export default function Reportes() {
  const { state, obtenerReporte, notify } = useApp()
  const { ventas } = state
  const [desde, setDesde] = useState(monthStartStr())
  const [hasta, setHasta] = useState(todayStr())
  const [loading, setLoading] = useState(false)
  const [reporte, setReporte] = useState({ ventas: 0, ingresos: 0, ticket: 0, iva: 0, pagos: [], top: [], mensual: [] })

  useEffect(() => {
    if (!desde || !hasta || desde > hasta) return
    let cancelled = false
    setLoading(true)
    obtenerReporte(desde, hasta)
      .then((data) => { if (!cancelled) setReporte(data) })
      .catch((error) => { if (!cancelled) notify(error.message || 'No se pudo generar el reporte', 'error') })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [desde, hasta])

  const ventasFiltradas = useMemo(() => ventas.filter((v) => {
    if (v.estado !== 'completada') return false
    const d = new Date(v.fecha)
    return (!desde || d >= new Date(`${desde}T00:00:00`)) && (!hasta || d <= new Date(`${hasta}T23:59:59`))
  }), [ventas, desde, hasta])

  const monthMap = Object.fromEntries((reporte.mensual || []).map((x) => [x.mes, x.total]))
  const labels = []
  const monthlyData = []
  for (let i = 5; i >= 0; i -= 1) {
    const date = new Date(); date.setDate(1); date.setMonth(date.getMonth() - i)
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
    labels.push(date.toLocaleDateString('es-CO', { month: 'short', year: '2-digit' }))
    monthlyData.push(Number(monthMap[key] || 0))
  }

  const invalidRange = Boolean(desde && hasta && desde > hasta)

  return (
    <div className="page">
      <div className="page-header-row">
        <div>
          <div className="page-title">Reportes</div>
          <div className="page-sub">Análisis generado por el backend y exportación de datos</div>
        </div>
        <button className="btn-secondary" onClick={() => exportarCSV(ventasFiltradas)} disabled={!ventasFiltradas.length}>
          <i className="ti ti-download" /> Exportar período
        </button>
      </div>

      <div className="report-filter">
        <span>Período:</span>
        <input type="date" className="form-input" value={desde} max={hasta || undefined} onChange={(e) => setDesde(e.target.value)} />
        <span>hasta</span>
        <input type="date" className="form-input" value={hasta} min={desde || undefined} onChange={(e) => setHasta(e.target.value)} />
        {loading && <span className="loading-inline"><i className="ti ti-loader-2" /> Actualizando...</span>}
      </div>
      {invalidRange && <div className="form-message error">La fecha inicial no puede ser posterior a la final.</div>}

      <div className="metric-grid">
        <div className="metric-card"><div className="metric-label">Ventas del período</div><div className="metric-value">{reporte.ventas}</div></div>
        <div className="metric-card"><div className="metric-label">Ingresos</div><div className="metric-value">{fmtCOP(reporte.ingresos)}</div></div>
        <div className="metric-card"><div className="metric-label">Ticket promedio</div><div className="metric-value">{fmtCOP(reporte.ticket)}</div></div>
        <div className="metric-card"><div className="metric-label">IVA recaudado</div><div className="metric-value">{fmtCOP(reporte.iva)}</div></div>
      </div>

      <div className="three-col">
        <div className="card">
          <div className="card-header"><span className="card-title">Tendencia mensual (6 meses)</span></div>
          <div className="card-body chart-body"><BarChart labels={labels} data={monthlyData} height={220} /></div>
        </div>
        <div className="card">
          <div className="card-header"><span className="card-title">Métodos de pago</span></div>
          <div className="card-body chart-body">
            {!reporte.pagos?.length ? <div className="empty-state">Sin datos en el período</div> : <DoughnutChart labels={reporte.pagos.map((x) => x.label)} data={reporte.pagos.map((x) => x.total)} height={220} />}
          </div>
        </div>
      </div>

      <div className="card report-top-card">
        <div className="card-header"><span className="card-title">Top 5 productos por ingresos</span></div>
        <div className="card-body table-card-body">
          <div className="table-scroll">
            <table>
              <thead><tr><th>Producto</th><th>Unidades</th><th>Ingresos</th></tr></thead>
              <tbody>
                {!reporte.top?.length ? <tr><td colSpan={3} className="empty-state">Sin datos en el período</td></tr> : reporte.top.map((item) => (
                  <tr key={item.nombre}><td>{item.nombre}</td><td>{item.unidades}</td><td>{fmtCOP(item.ingresos)}</td></tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}
