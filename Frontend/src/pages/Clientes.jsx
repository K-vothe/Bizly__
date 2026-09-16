import { useEffect, useState } from 'react'
import { useApp } from '../context/AppContext'
import { fmtCOP, getInitials } from '../services/utils'
import Modal from '../components/Modal'
import Pagination from '../components/Pagination'

const PAGE_SIZE = 9

export default function Clientes() {
  const { state, guardarCliente, eliminarCliente } = useApp()
  const { clientes } = state

  const [query, setQuery] = useState('')
  const [page, setPage] = useState(1)
  const [modal, setModal] = useState(false)
  const [editId, setEditId] = useState(null)
  const [nombre, setNombre] = useState('')
  const [doc, setDoc] = useState('')
  const [tipo, setTipo] = useState('CC')
  const [tel, setTel] = useState('')
  const [email, setEmail] = useState('')

  const filtered = clientes.filter((c) =>
    !query ||
    c.nombre.toLowerCase().includes(query.toLowerCase()) ||
    (c.doc || '').includes(query) ||
    (c.tel || '').includes(query) ||
    (c.email || '').toLowerCase().includes(query.toLowerCase())
  )
  const sorted = [...filtered].sort((a, b) => (b.totalCompras || 0) - (a.totalCompras || 0))
  const totalPages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE))
  const visible = sorted.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  useEffect(() => { setPage(1) }, [query])
  useEffect(() => { if (page > totalPages) setPage(totalPages) }, [page, totalPages])

  function resetForm() {
    setEditId(null); setNombre(''); setDoc(''); setTipo('CC'); setTel(''); setEmail('')
  }

  function abrirNuevo() {
    resetForm()
    setModal(true)
  }

  function abrirEditar(cliente) {
    setEditId(cliente.id)
    setNombre(cliente.nombre)
    setDoc(cliente.doc || '')
    setTipo(cliente.tipo || 'CC')
    setTel(cliente.tel || '')
    setEmail(cliente.email || '')
    setModal(true)
  }

  async function guardar() {
    if (!nombre.trim()) return
    if (email && !/^\S+@\S+\.\S+$/.test(email)) return
    const ok = await guardarCliente({ id: editId, nombre: nombre.trim(), doc: doc.trim(), tipo, tel: tel.trim(), email: email.trim() })
    if (ok) setModal(false)
  }

  async function eliminar(cliente) {
    if (!window.confirm(`¿Desactivar al cliente "${cliente.nombre}"? Sus ventas históricas se conservarán.`)) return
    await eliminarCliente(cliente.id)
  }

  const emailInvalid = Boolean(email && !/^\S+@\S+\.\S+$/.test(email))

  return (
    <div className="page">
      <div className="page-header-row">
        <div>
          <div className="page-title">Clientes</div>
          <div className="page-sub">{clientes.length} registrados</div>
        </div>
        <button className="btn-primary" onClick={abrirNuevo}><i className="ti ti-plus" /> Nuevo cliente</button>
      </div>

      <div className="top-bar">
        <div className="search-wrap">
          <i className="ti ti-search" />
          <input className="search-bar" placeholder="Buscar por nombre, documento, teléfono o email..." value={query} onChange={(e) => setQuery(e.target.value)} />
        </div>
      </div>

      {visible.length === 0 ? (
        <div className="empty-state">Sin clientes para mostrar.</div>
      ) : (
        <>
          <div className="client-grid">
            {visible.map((c) => (
              <div className="client-card" key={c.id}>
                <div className="client-card-head">
                  <div className="client-avatar">{getInitials(c.nombre)}</div>
                  <div className="client-card-main">
                    <div className="client-name">{c.nombre}</div>
                    <div className="client-id">{c.doc ? `${c.tipo} ${c.doc}` : 'Sin documento'}</div>
                  </div>
                  <button className="icon-button" title="Editar cliente" onClick={() => abrirEditar(c)}><i className="ti ti-edit" /></button>
                </div>
                <div className="client-stats">
                  <span><i className="ti ti-shopping-bag" /> {c.numCompras || 0} compras</span>
                  <span className="client-amount">{fmtCOP(c.totalCompras || 0)}</span>
                </div>
                {c.tel && <div className="client-contact"><i className="ti ti-phone" /> {c.tel}</div>}
                {c.email && <div className="client-contact"><i className="ti ti-mail" /> {c.email}</div>}
                <div className="client-actions">
                  <button className="btn-secondary" onClick={() => abrirEditar(c)}><i className="ti ti-edit" /> Editar</button>
                  <button className="btn-danger" onClick={() => eliminar(c)}><i className="ti ti-trash" /> Desactivar</button>
                </div>
              </div>
            ))}
          </div>
          <Pagination page={page} totalPages={totalPages} onPage={setPage} />
        </>
      )}

      <Modal
        open={modal}
        title={editId ? 'Editar cliente' : 'Nuevo cliente'}
        onClose={() => setModal(false)}
        footer={(
          <>
            <button className="btn-secondary" onClick={() => setModal(false)}>Cancelar</button>
            <button className="btn-primary" onClick={guardar} disabled={!nombre.trim() || emailInvalid}>Guardar</button>
          </>
        )}
      >
        <div className="form-group">
          <label className="form-label">Nombre completo <span className="required-mark">*</span></label>
          <input className="form-input" placeholder="María López" value={nombre} onChange={(e) => setNombre(e.target.value)} />
          {!nombre.trim() && <div className="field-hint">Campo obligatorio.</div>}
        </div>
        <div className="form-row">
          <div className="form-group">
            <label className="form-label">Documento</label>
            <input className="form-input" placeholder="12345678" value={doc} onChange={(e) => setDoc(e.target.value.replace(/[^0-9A-Za-z-]/g, ''))} />
          </div>
          <div className="form-group">
            <label className="form-label">Tipo</label>
            <select className="form-input" value={tipo} onChange={(e) => setTipo(e.target.value)}>
              <option>CC</option><option>NIT</option><option>CE</option><option>TI</option><option>PAS</option>
            </select>
          </div>
        </div>
        <div className="form-row">
          <div className="form-group">
            <label className="form-label">Teléfono</label>
            <input className="form-input" inputMode="tel" placeholder="3001234567" value={tel} onChange={(e) => setTel(e.target.value.replace(/[^0-9+ -]/g, ''))} />
          </div>
          <div className="form-group">
            <label className="form-label">Email</label>
            <input className="form-input" type="email" placeholder="cliente@email.com" value={email} onChange={(e) => setEmail(e.target.value)} />
            {emailInvalid && <div className="field-hint invalid">Correo inválido.</div>}
          </div>
        </div>
      </Modal>
    </div>
  )
}
