import { useEffect, useMemo, useState } from 'react'
import { useApp } from '../context/AppContext'
import { fmtCOP, fmtDate } from '../services/utils'
import Modal from '../components/Modal'
import Badge from '../components/Badge'
import Pagination from '../components/Pagination'

const PAGE_SIZE = 12

export default function Ventas() {
  const { state, registrarVenta, anularVenta, notify } = useApp()
  const { ventas, productos, clientes, config } = state

  const [query, setQuery] = useState('')
  const [sort, setSort] = useState('recent')
  const [page, setPage] = useState(1)
  const [modalVenta, setModalVenta] = useState(false)
  const [modalDetalle, setModalDetalle] = useState(null)
  const [clienteId, setClienteId] = useState('general')
  const [pago, setPago] = useState('Efectivo')
  const [prodId, setProdId] = useState('')
  const [qty, setQty] = useState(1)
  const [items, setItems] = useState([])

  const filtered = useMemo(() => {
    const base = ventas.filter((v) =>
      !query ||
      v.id.toLowerCase().includes(query.toLowerCase()) ||
      (v.clienteNombre || '').toLowerCase().includes(query.toLowerCase()) ||
      (v.usuarioNombre || '').toLowerCase().includes(query.toLowerCase())
    )
    return [...base].sort((a, b) => {
      if (sort === 'oldest') return new Date(a.fecha) - new Date(b.fecha)
      if (sort === 'high') return b.total - a.total
      if (sort === 'low') return a.total - b.total
      return new Date(b.fecha) - new Date(a.fecha)
    })
  }, [ventas, query, sort])

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const visible = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)
  useEffect(() => { setPage(1) }, [query, sort])
  useEffect(() => { if (page > totalPages) setPage(totalPages) }, [page, totalPages])

  function abrirNuevaVenta() {
    setItems([]); setClienteId('general'); setPago('Efectivo')
    setProdId(productos.find((p) => p.stock > 0)?.id || '')
    setQty(1); setModalVenta(true)
  }

  function remainingStock(prodIdValue) {
    const product = productos.find((p) => String(p.id) === String(prodIdValue))
    const already = items.find((i) => String(i.pid) === String(prodIdValue))?.qty || 0
    return Math.max(0, Number(product?.stock || 0) - already)
  }

  function agregarItem() {
    const prod = productos.find((p) => String(p.id) === String(prodId))
    const quantity = Number(qty)
    if (!prod || !Number.isInteger(quantity) || quantity <= 0) return
    const available = remainingStock(prodId)
    if (quantity > available) {
      notify(`Stock insuficiente para ${prod.nombre}. Disponible para agregar: ${available}`, 'error')
      return
    }
    setItems((prev) => {
      const existing = prev.find((i) => String(i.pid) === String(prodId))
      if (existing) return prev.map((i) => String(i.pid) === String(prodId) ? { ...i, qty: i.qty + quantity } : i)
      return [...prev, { pid: prod.id, nombre: prod.nombre, precio: prod.precio, qty: quantity }]
    })
    setQty(1)
  }

  function quitarItem(idx) { setItems((prev) => prev.filter((_, i) => i !== idx)) }

  async function handleRegistrar() {
    if (!items.length) { notify('Agrega al menos un producto', 'error'); return }
    const cli = clientes.find((c) => String(c.id) === String(clienteId))
    const venta = await registrarVenta({
      items,
      clienteId: cli ? cli.id : null,
      clienteNombre: cli?.nombre || 'Cliente general',
      pago,
    })
    if (venta) setModalVenta(false)
  }

  async function handleAnular(v) {
    if (!window.confirm(`¿Anular ${v.id}? El stock será restaurado y la compra se descontará del cliente.`)) return
    const ok = await anularVenta(v.id, v.id_venta)
    if (ok) setModalDetalle(null)
  }

  const total = items.reduce((sum, item) => sum + item.precio * item.qty, 0)
  const selectedProduct = productos.find((p) => String(p.id) === String(prodId))
  const canAdd = selectedProduct && selectedProduct.stock > 0 && Number.isInteger(Number(qty)) && Number(qty) > 0 && Number(qty) <= remainingStock(prodId)

  return (
    <div className="page">
      <div className="page-header-row">
        <div>
          <div className="page-title">Ventas</div>
          <div className="page-sub">{ventas.filter((v) => v.estado === 'completada').length} completadas · {ventas.filter((v) => v.estado === 'anulada').length} anuladas</div>
        </div>
        <button className="btn-primary" onClick={abrirNuevaVenta} disabled={!productos.some((p) => p.stock > 0)}>
          <i className="ti ti-plus" /> Nueva venta
        </button>
      </div>

      <div className="top-bar responsive-filters">
        <div className="search-wrap">
          <i className="ti ti-search" />
          <input className="search-bar" placeholder="Buscar por # venta, cliente o usuario..." value={query} onChange={(e) => setQuery(e.target.value)} />
        </div>
        <select className="form-input filter-select" value={sort} onChange={(e) => setSort(e.target.value)}>
          <option value="recent">Más recientes</option>
          <option value="oldest">Más antiguas</option>
          <option value="high">Mayor total</option>
          <option value="low">Menor total</option>
        </select>
      </div>

      <div className="card table-card">
        <div className="table-scroll">
          <table>
            <thead><tr><th># Venta</th><th>Fecha</th><th>Cliente</th><th>Registró</th><th>Pago</th><th>Total</th><th>Estado</th><th></th></tr></thead>
            <tbody>
              {visible.length === 0 ? <tr><td colSpan={8} className="empty-state">Sin ventas registradas</td></tr> : visible.map((v) => (
                <tr key={v.id}>
                  <td><button className="link-action" onClick={() => setModalDetalle(v)}>{v.id}</button></td>
                  <td>{fmtDate(v.fecha)}</td>
                  <td>{v.clienteNombre}</td>
                  <td>{v.usuarioNombre || '—'}</td>
                  <td>{v.pago}</td>
                  <td>{fmtCOP(v.total)}</td>
                  <td><Badge color={v.estado === 'completada' ? 'green' : 'red'}>{v.estado}</Badge></td>
                  <td><button className="icon-button" onClick={() => setModalDetalle(v)} title="Ver detalle"><i className="ti ti-eye" /></button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      <Pagination page={page} totalPages={totalPages} onPage={setPage} />

      <Modal open={modalVenta} title="Nueva venta" onClose={() => setModalVenta(false)}
        footer={<><button className="btn-secondary" onClick={() => setModalVenta(false)}>Cancelar</button><button className="btn-primary" onClick={handleRegistrar} disabled={!items.length}>Registrar venta</button></>}>
        <div className="form-group">
          <label className="form-label">Cliente</label>
          <select className="form-input" value={clienteId} onChange={(e) => setClienteId(e.target.value)}>
            <option value="general">Cliente general</option>{clientes.map((c) => <option key={c.id} value={c.id}>{c.nombre}</option>)}
          </select>
        </div>
        <div className="form-group">
          <label className="form-label">Método de pago <span className="required-mark">*</span></label>
          <select className="form-input" value={pago} onChange={(e) => setPago(e.target.value)}>
            {['Efectivo', 'Nequi', 'Daviplata', 'Transferencia', 'Tarjeta'].map((m) => <option key={m}>{m}</option>)}
          </select>
        </div>
        <div className="form-group">
          <label className="form-label">Agregar productos <span className="required-mark">*</span></label>
          <div className="sale-add-row">
            <select className="form-input" value={prodId} onChange={(e) => { setProdId(e.target.value); setQty(1) }}>
              <option value="">Selecciona...</option>
              {productos.map((p) => <option key={p.id} value={p.id} disabled={p.stock <= 0}>{p.nombre} — {fmtCOP(p.precio)} — stock {p.stock}</option>)}
            </select>
            <input type="number" className="form-input qty-input" min="1" max={remainingStock(prodId)} step="1" value={qty} onChange={(e) => setQty(Number(e.target.value))} />
            <button className="btn-primary" onClick={agregarItem} disabled={!canAdd}>Agregar</button>
          </div>
          {selectedProduct && <div className="field-hint">Disponible para agregar: {remainingStock(prodId)} unidad(es).</div>}
          <div className="table-scroll">
            <table className="sale-items-table">
              <thead><tr><th>Producto</th><th>Precio</th><th>Cant.</th><th>Subtotal</th><th></th></tr></thead>
              <tbody>
                {items.length === 0 ? <tr><td colSpan={5} className="empty-state compact">Aún no hay productos</td></tr> : items.map((it, idx) => (
                  <tr key={it.pid}>
                    <td>{it.nombre}</td><td>{fmtCOP(it.precio)}</td><td>{it.qty}</td><td>{fmtCOP(it.precio * it.qty)}</td>
                    <td><button className="icon-button danger" onClick={() => quitarItem(idx)} title="Quitar"><i className="ti ti-trash" /></button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="sale-total">Total: {fmtCOP(total)}</div>
        </div>
      </Modal>

      {modalDetalle && (
        <Modal open title={modalDetalle.id} onClose={() => setModalDetalle(null)}
          footer={<><button className="btn-secondary" onClick={() => setModalDetalle(null)}>Cerrar</button>{modalDetalle.estado === 'completada' && <button className="btn-danger-solid" onClick={() => handleAnular(modalDetalle)}>Anular venta</button>}</>}>
          <div className="detail-grid">
            <div><div className="form-label">Cliente</div><div>{modalDetalle.clienteNombre}</div></div>
            <div><div className="form-label">Registró</div><div>{modalDetalle.usuarioNombre || '—'}</div></div>
            <div><div className="form-label">Método de pago</div><div>{modalDetalle.pago}</div></div>
            <div><div className="form-label">Fecha</div><div>{fmtDate(modalDetalle.fecha)}</div></div>
            <div><div className="form-label">Estado</div><Badge color={modalDetalle.estado === 'completada' ? 'green' : 'red'}>{modalDetalle.estado}</Badge></div>
          </div>
          <div className="table-scroll">
            <table className="sale-items-table">
              <thead><tr><th>Producto</th><th>Precio</th><th>Cant.</th><th>Subtotal</th></tr></thead>
              <tbody>{(modalDetalle.items || []).map((it) => <tr key={it.pid}><td>{it.nombre}</td><td>{fmtCOP(it.precio)}</td><td>{it.qty}</td><td>{fmtCOP(it.precio * it.qty)}</td></tr>)}</tbody>
            </table>
          </div>
          <div className="sale-tax">IVA incluido ({config.iva}%): {fmtCOP(modalDetalle.total * config.iva / (100 + config.iva))}</div>
          <div className="sale-total">Total: {fmtCOP(modalDetalle.total)}</div>
        </Modal>
      )}
    </div>
  )
}
