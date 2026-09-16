import { useEffect, useRef, useState } from 'react'
import { useApp } from '../context/AppContext'
import { fmtCOP } from '../services/utils'
import Modal from '../components/Modal'
import Pagination from '../components/Pagination'

const CAT_COLORS = ['#ede9fe', '#dcfce7', '#dbeafe', '#fef9c3', '#fee2e2', '#e0f2fe', '#fce7f3']
const PAGE_SIZE = 12

function parseCsvLine(line) {
  const out = []
  let current = ''
  let quoted = false
  for (let i = 0; i < line.length; i += 1) {
    const ch = line[i]
    if (ch === '"') {
      if (quoted && line[i + 1] === '"') { current += '"'; i += 1 } else quoted = !quoted
    } else if (ch === ',' && !quoted) {
      out.push(current.trim()); current = ''
    } else current += ch
  }
  out.push(current.trim())
  return out
}

function parseProductosCsv(text) {
  const lines = text.replace(/^\uFEFF/, '').split(/\r?\n/).filter((x) => x.trim())
  if (lines.length < 2) throw new Error('El CSV debe tener encabezados y al menos un producto')
  const headers = parseCsvLine(lines[0]).map((h) => h.toLowerCase())
  const required = ['nombre', 'precio', 'stock']
  for (const key of required) if (!headers.includes(key)) throw new Error(`Falta la columna obligatoria: ${key}`)
  return lines.slice(1).map((line) => {
    const cols = parseCsvLine(line)
    const row = Object.fromEntries(headers.map((h, i) => [h, cols[i] ?? '']))
    return { nombre: row.nombre, sku: row.sku || '', categoria: row.categoria || '', precio: Number(row.precio), stock: Number(row.stock) }
  })
}

export default function Inventario() {
  const { state, guardarProducto, eliminarProducto, importarProductos, notify } = useApp()
  const { productos, config } = state
  const umbral = config.umbral ?? 10
  const fileRef = useRef(null)

  const [query, setQuery] = useState('')
  const [catFil, setCatFil] = useState('')
  const [stkFil, setStkFil] = useState('')
  const [page, setPage] = useState(1)
  const [modal, setModal] = useState(false)
  const [editId, setEditId] = useState(null)
  const [nombre, setNombre] = useState('')
  const [sku, setSku] = useState('')
  const [categoria, setCategoria] = useState('')
  const [precio, setPrecio] = useState('')
  const [stock, setStock] = useState('')

  const cats = [...new Set(productos.map((p) => p.categoria).filter(Boolean))]
  const catMap = Object.fromEntries(cats.map((c, i) => [c, CAT_COLORS[i % CAT_COLORS.length]]))

  let filtered = productos
  if (query) filtered = filtered.filter((p) => p.nombre.toLowerCase().includes(query.toLowerCase()) || (p.sku || '').toLowerCase().includes(query.toLowerCase()))
  if (catFil) filtered = filtered.filter((p) => p.categoria === catFil)
  if (stkFil === 'bajo') filtered = filtered.filter((p) => p.stock <= umbral)
  if (stkFil === 'ok') filtered = filtered.filter((p) => p.stock > umbral)

  const bajo = productos.filter((p) => p.stock <= umbral)
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const visible = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  useEffect(() => { setPage(1) }, [query, catFil, stkFil])
  useEffect(() => { if (page > totalPages) setPage(totalPages) }, [page, totalPages])

  function abrirNuevo() {
    setEditId(null); setNombre(''); setSku(''); setCategoria(''); setPrecio(''); setStock('')
    setModal(true)
  }

  function abrirEditar(p) {
    setEditId(p.id); setNombre(p.nombre); setSku(p.sku || ''); setCategoria(p.categoria || ''); setPrecio(String(p.precio)); setStock(String(p.stock)); setModal(true)
  }

  async function guardar() {
    const nPrecio = Number(precio)
    const nStock = Number(stock)
    if (!nombre.trim() || !Number.isFinite(nPrecio) || nPrecio < 0 || !Number.isInteger(nStock) || nStock < 0) return
    const ok = await guardarProducto({ id: editId, nombre: nombre.trim(), sku: sku.trim(), categoria: categoria.trim(), precio: nPrecio, stock: nStock })
    if (ok) setModal(false)
  }

  async function eliminar(p) {
    if (!window.confirm(`¿Desactivar "${p.nombre}"? El historial de ventas se conservará.`)) return
    await eliminarProducto(p.id)
  }

  async function cargarCsv(event) {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    try {
      const text = await file.text()
      const data = parseProductosCsv(text)
      if (data.length > 500) throw new Error('El archivo no puede superar 500 productos por carga')
      if (!window.confirm(`Se procesarán ${data.length} producto(s). Si un SKU ya existe, se actualizará. ¿Continuar?`)) return
      await importarProductos(data)
    } catch (error) {
      notify(error.message || 'CSV inválido', 'error')
    }
  }

  const priceInvalid = precio !== '' && (!Number.isFinite(Number(precio)) || Number(precio) < 0)
  const stockInvalid = stock !== '' && (!Number.isInteger(Number(stock)) || Number(stock) < 0)

  return (
    <div className="page">
      <div className="page-header-row">
        <div>
          <div className="page-title">Inventario</div>
          <div className="page-sub">{productos.length} productos · {bajo.length} con stock bajo</div>
        </div>
        <div className="header-actions">
          <input ref={fileRef} type="file" accept=".csv,text/csv" hidden onChange={cargarCsv} />
          <button className="btn-secondary" onClick={() => fileRef.current?.click()}><i className="ti ti-file-import" /> Importar CSV</button>
          <button className="btn-primary" onClick={abrirNuevo}><i className="ti ti-plus" /> Nuevo producto</button>
        </div>
      </div>

      {bajo.length > 0 && <div className="alert-banner"><i className="ti ti-alert-triangle" /> {bajo.length} producto(s) con stock bajo o agotado</div>}

      <div className="top-bar responsive-filters">
        <div className="search-wrap">
          <i className="ti ti-search" />
          <input className="search-bar" placeholder="Buscar por nombre o SKU..." value={query} onChange={(e) => setQuery(e.target.value)} />
        </div>
        <select className="form-input filter-select" value={catFil} onChange={(e) => setCatFil(e.target.value)}>
          <option value="">Todas las categorías</option>{cats.map((c) => <option key={c}>{c}</option>)}
        </select>
        <select className="form-input filter-select" value={stkFil} onChange={(e) => setStkFil(e.target.value)}>
          <option value="">Todo el stock</option><option value="bajo">Stock bajo</option><option value="ok">Stock normal</option>
        </select>
      </div>

      {visible.length === 0 ? <div className="empty-state">Sin productos para mostrar.</div> : (
        <>
          <div className="inv-grid">
            {visible.map((p) => (
              <div className="inv-card" key={p.id}>
                <div className="inv-img"><i className="ti ti-package" /></div>
                <div className="inv-name">{p.nombre}</div>
                <div className="inv-sku">SKU: {p.sku || '—'}</div>
                {p.categoria && <div className="inv-category"><span style={{ background: catMap[p.categoria] || '#f3f4f6' }}>{p.categoria}</span></div>}
                <div className="inv-row">
                  <span className="inv-price">{fmtCOP(p.precio)}</span>
                  <span className={`inv-stock${p.stock <= umbral ? ' low' : ''}`}>{p.stock} und.</span>
                </div>
                <div className="inv-actions">
                  <button className="btn-secondary" onClick={() => abrirEditar(p)}><i className="ti ti-edit" /> Editar</button>
                  <button className="btn-danger" onClick={() => eliminar(p)}><i className="ti ti-trash" /> Desactivar</button>
                </div>
              </div>
            ))}
          </div>
          <Pagination page={page} totalPages={totalPages} onPage={setPage} />
        </>
      )}

      <Modal open={modal} title={editId ? 'Editar producto' : 'Nuevo producto'} onClose={() => setModal(false)}
        footer={<><button className="btn-secondary" onClick={() => setModal(false)}>Cancelar</button><button className="btn-primary" onClick={guardar} disabled={!nombre.trim() || priceInvalid || stockInvalid || precio === '' || stock === ''}>Guardar</button></>}>
        <div className="form-group">
          <label className="form-label">Nombre del producto <span className="required-mark">*</span></label>
          <input className="form-input" placeholder="Leche entera 1L" value={nombre} onChange={(e) => setNombre(e.target.value)} />
        </div>
        <div className="form-row">
          <div className="form-group">
            <label className="form-label">SKU</label>
            <input className="form-input" placeholder="BEB-001" value={sku} onChange={(e) => setSku(e.target.value.toUpperCase())} />
          </div>
          <div className="form-group">
            <label className="form-label">Categoría</label>
            <input className="form-input" placeholder="Bebidas" value={categoria} onChange={(e) => setCategoria(e.target.value)} />
          </div>
        </div>
        <div className="form-row">
          <div className="form-group">
            <label className="form-label">Precio (COP) <span className="required-mark">*</span></label>
            <input className="form-input" type="number" min="0" step="0.01" value={precio} onChange={(e) => setPrecio(e.target.value)} />
            {priceInvalid && <div className="field-hint invalid">El precio no puede ser negativo.</div>}
          </div>
          <div className="form-group">
            <label className="form-label">Stock <span className="required-mark">*</span></label>
            <input className="form-input" type="number" min="0" step="1" value={stock} onChange={(e) => setStock(e.target.value)} />
            {stockInvalid && <div className="field-hint invalid">Usa un número entero igual o mayor que 0.</div>}
          </div>
        </div>
      </Modal>
    </div>
  )
}
