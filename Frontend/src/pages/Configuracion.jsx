import { useEffect, useState } from 'react'
import { useApp } from '../context/AppContext'
import { apiFetch } from '../services/api'
import Badge from '../components/Badge'

export default function Configuracion({ usuario }) {
  const { state, guardarConfig, notify } = useApp()
  const cfg = state.config
  const [tab, setTab] = useState('empresa')
  const [nombre, setNombre] = useState(cfg.nombre || '')
  const [tel, setTel] = useState(cfg.tel || '')
  const [email, setEmail] = useState(cfg.email || '')
  const [dir, setDir] = useState(cfg.dir || '')
  const [moneda, setMoneda] = useState(cfg.moneda || 'COP')
  const [iva, setIva] = useState(cfg.iva ?? 19)
  const [umbral, setUmbral] = useState(cfg.umbral ?? 10)
  const [usuarios, setUsuarios] = useState([])
  const [loadingUsers, setLoadingUsers] = useState(false)

  useEffect(() => {
    setNombre(cfg.nombre || '')
    setTel(cfg.tel || '')
    setEmail(cfg.email || '')
    setDir(cfg.dir || '')
    setMoneda(cfg.moneda || 'COP')
    setIva(cfg.iva ?? 19)
    setUmbral(cfg.umbral ?? 10)
  }, [cfg])

  async function cargarUsuarios() {
    setLoadingUsers(true)
    try { setUsuarios(await apiFetch('/usuarios')) }
    catch (error) { notify(error.message || 'No se pudieron cargar los usuarios', 'error') }
    finally { setLoadingUsers(false) }
  }

  useEffect(() => { if (tab === 'usuarios' && !usuarios.length) cargarUsuarios() }, [tab])

  async function guardar() {
    const nIva = Number(iva)
    const nUmbral = Number(umbral)
    if (!nombre.trim() || !Number.isFinite(nIva) || nIva < 0 || nIva > 100 || !Number.isInteger(nUmbral) || nUmbral < 0) {
      notify('Revisa los datos de configuración', 'error')
      return
    }
    await guardarConfig({ nombre: nombre.trim(), tel: tel.trim(), email: email.trim(), dir: dir.trim(), moneda, iva: nIva, umbral: nUmbral })
  }

  async function actualizarUsuario(item, patch) {
    const next = { rol: patch.rol ?? item.rol, estado: patch.estado ?? item.estado }
    try {
      await apiFetch(`/usuarios/${item.id}`, { method: 'PUT', body: JSON.stringify(next) })
      setUsuarios((prev) => prev.map((u) => u.id === item.id ? { ...u, ...next } : u))
      notify('Usuario actualizado', 'success')
    } catch (error) { notify(error.message || 'No se pudo actualizar el usuario', 'error') }
  }

  return (
    <div className="page">
      <div className="page-header">
        <div className="page-title">Configuración</div>
        <div className="page-sub">Administra la empresa, usuarios y parámetros del sistema</div>
      </div>

      <div className="tabs tabs-scroll">
        <button className={`tab${tab === 'empresa' ? ' active' : ''}`} onClick={() => setTab('empresa')}>Mi empresa</button>
        <button className={`tab${tab === 'usuarios' ? ' active' : ''}`} onClick={() => setTab('usuarios')}>Usuarios</button>
        <button className={`tab${tab === 'plan' ? ' active' : ''}`} onClick={() => setTab('plan')}>Plan</button>
      </div>

      {tab === 'empresa' && (
        <div className="config-section">
          <div className="config-section-title">Información del negocio</div>
          <div className="config-body">
            <div className="form-group">
              <label className="form-label">Nombre del negocio <span className="required-mark">*</span></label>
              <input className="form-input" value={nombre} onChange={(e) => setNombre(e.target.value)} />
            </div>
            <div className="form-row">
              <div className="form-group"><label className="form-label">Teléfono</label><input className="form-input" inputMode="tel" placeholder="3001234567" value={tel} onChange={(e) => setTel(e.target.value)} /></div>
              <div className="form-group"><label className="form-label">Email</label><input className="form-input" type="email" placeholder="negocio@email.com" value={email} onChange={(e) => setEmail(e.target.value)} /></div>
            </div>
            <div className="form-group"><label className="form-label">Dirección</label><input className="form-input" placeholder="Calle 1 # 2-3" value={dir} onChange={(e) => setDir(e.target.value)} /></div>
            <div className="form-row">
              <div className="form-group"><label className="form-label">Moneda</label><select className="form-input" value={moneda} onChange={(e) => setMoneda(e.target.value)}><option value="COP">COP</option><option value="USD">USD</option></select></div>
              <div className="form-group"><label className="form-label">IVA / Impuesto (%) <span className="required-mark">*</span></label><input className="form-input" type="number" min="0" max="100" step="0.01" value={iva} onChange={(e) => setIva(e.target.value)} /></div>
            </div>
            <div className="form-group">
              <label className="form-label">Umbral de stock bajo <span className="required-mark">*</span></label>
              <input className="form-input" type="number" min="0" step="1" value={umbral} onChange={(e) => setUmbral(e.target.value)} />
              <div className="field-hint">El dashboard mostrará alerta cuando el stock sea igual o inferior a este valor.</div>
            </div>
            <button className="btn-primary" onClick={guardar}>Guardar cambios</button>
          </div>
        </div>
      )}

      {tab === 'usuarios' && (
        <div className="config-section">
          <div className="config-section-title config-title-actions">
            <span>Usuarios y permisos</span>
            <button className="btn-secondary" onClick={cargarUsuarios} disabled={loadingUsers}><i className="ti ti-refresh" /> Actualizar</button>
          </div>
          <div className="config-body table-card-body">
            <div className="table-scroll">
              <table>
                <thead><tr><th>Usuario</th><th>Correo</th><th>Verificado</th><th>Rol</th><th>Estado</th></tr></thead>
                <tbody>
                  {loadingUsers && !usuarios.length ? <tr><td colSpan={5} className="empty-state">Cargando...</td></tr> : usuarios.map((item) => (
                    <tr key={item.id}>
                      <td>{item.nombre} {item.apellido}</td>
                      <td>{item.correo}</td>
                      <td><Badge color={item.correo_verificado ? 'green' : 'yellow'}>{item.correo_verificado ? 'Sí' : 'Pendiente'}</Badge></td>
                      <td>
                        <select className="table-select" value={item.rol} disabled={item.id === usuario?.id} onChange={(e) => actualizarUsuario(item, { rol: e.target.value })}>
                          <option value="admin">Administrador</option><option value="empleado">Empleado</option>
                        </select>
                      </td>
                      <td>
                        <select className="table-select" value={item.estado} disabled={item.id === usuario?.id} onChange={(e) => actualizarUsuario(item, { estado: e.target.value })}>
                          <option value="Activo">Activo</option><option value="Inactivo">Inactivo</option>
                        </select>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="field-hint">Las rutas de auditoría, configuración y gestión de usuarios también están protegidas por rol en el backend; ocultar un botón en React no es el único control.</p>
          </div>
        </div>
      )}

      {tab === 'plan' && (
        <div className="config-section">
          <div className="config-section-title">Plan actual</div>
          <div className="config-body">
            <div className="plan-card"><i className="ti ti-crown" /><div><strong>Business</strong><span>Acceso completo a los módulos habilitados</span></div><Badge color="purple">Activo</Badge></div>
          </div>
        </div>
      )}
    </div>
  )
}
