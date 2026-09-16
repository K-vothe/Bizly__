import { useEffect, useState } from 'react'
import { useApp } from '../context/AppContext'
import { fmtDate, getInitials } from '../services/utils'
import Badge from '../components/Badge'
import Pagination from '../components/Pagination'

const PAGE_SIZE = 15

function badgeColor(accion) {
  if (accion === 'Creó' || accion === 'Verificó' || accion === 'Inició') return 'green'
  if (accion === 'Anuló' || accion === 'Eliminó') return 'red'
  return 'blue'
}

export default function Auditoria() {
  const { state } = useApp()
  const [query, setQuery] = useState('')
  const [page, setPage] = useState(1)

  const filtered = state.auditoria.filter((a) =>
    !query ||
    (a.user || '').toLowerCase().includes(query.toLowerCase()) ||
    (a.detalle || '').toLowerCase().includes(query.toLowerCase()) ||
    (a.tipo || '').toLowerCase().includes(query.toLowerCase()) ||
    (a.accion || '').toLowerCase().includes(query.toLowerCase())
  )
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const visible = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  useEffect(() => { setPage(1) }, [query])
  useEffect(() => { if (page > totalPages) setPage(totalPages) }, [page, totalPages])

  return (
    <div className="page">
      <div className="page-header">
        <div className="page-title">Centro de Auditoría</div>
        <div className="page-sub">Actividad registrada automáticamente por el servidor</div>
      </div>

      <div className="top-bar">
        <div className="search-wrap">
          <i className="ti ti-search" />
          <input className="search-bar" placeholder="Buscar por usuario, acción o módulo..." value={query} onChange={(e) => setQuery(e.target.value)} />
        </div>
      </div>

      <div className="card">
        <div className="card-body">
          {visible.length === 0 ? <div className="empty-state">Sin actividad registrada</div> : visible.map((a) => (
            <div className="audit-item" key={a.id}>
              <div className="audit-avatar">{getInitials(a.user || 'Sistema')}</div>
              <div className="audit-main">
                <div className="audit-action">
                  <strong>{a.user || 'Sistema'}</strong>{' '}
                  <Badge color={badgeColor(a.accion)}>{a.accion}</Badge>{' '}
                  <span>{a.tipo}</span>
                  <br />
                  <span>{a.detalle}</span>
                </div>
              </div>
              <div className="audit-time">{fmtDate(a.fecha)}</div>
            </div>
          ))}
        </div>
      </div>
      <Pagination page={page} totalPages={totalPages} onPage={setPage} />
    </div>
  )
}
