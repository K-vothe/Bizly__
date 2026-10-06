import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { useApp } from '../context/AppContext'
import api, { apiFetch } from '../services/api'
import Badge from '../components/Badge'
import Modal from '../components/Modal'
import PlanUpgradeModal from '../components/PlanUpgradeModal'

export default function Configuracion({ usuario }) {
  const { state, guardarConfig, notify } = useApp()
  const cfg = state.config
  const [tab, setTab] = useState('empresa')
  const [nombre, setNombre] = useState('')
  const [nit, setNit] = useState('')
  const [tel, setTel] = useState('')
  const [email, setEmail] = useState('')
  const [dir, setDir] = useState('')
  const [moneda, setMoneda] = useState(cfg.moneda || 'COP')
  const [iva, setIva] = useState(cfg.iva ?? 19)
  const [umbral, setUmbral] = useState(cfg.umbral ?? 10)
  const [usuarios, setUsuarios] = useState([])
  const [loadingUsers, setLoadingUsers] = useState(false)
  const [loadingEmpresa, setLoadingEmpresa] = useState(false)
  const [savingEmpresa, setSavingEmpresa] = useState(false)

  // Estado del modal de nuevo usuario
  const [modalNuevo, setModalNuevo] = useState(false)
  const [newNombre, setNewNombre] = useState('')
  const [newEmail, setNewEmail] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [newRol, setNewRol] = useState('empleado')
  const [creatingUser, setCreatingUser] = useState(false)
  const [empresaPlan, setEmpresaPlan] = useState('Starter')
  const [upgradeModal, setUpgradeModal] = useState(false)
  const [upgradeMsg, setUpgradeMsg] = useState('')

  async function cargarEmpresa() {
    setLoadingEmpresa(true)
    try {
      const res = await api.get('/empresa')
      const data = res.data
      if (data) {
        setNombre(data.nombre_empresa || data.nombre || '')
        setNit(data.nit || '')
        setTel(data.telefono || data.tel || '')
        setEmail(data.correo || data.email || '')
        setDir(data.direccion || data.dir || '')
        setIva(data.iva !== undefined ? Number(data.iva) : 19)
        setEmpresaPlan(data.plan || 'Starter')
      }
    } catch (error) {
      console.error('Error al cargar datos de empresa:', error)
    } finally {
      setLoadingEmpresa(false)
    }
  }

  useEffect(() => {
    cargarEmpresa()
  }, [])

  async function cargarUsuarios() {
    setLoadingUsers(true)
    try {
      const res = await api.get('/usuarios')
      const list = Array.isArray(res.data) ? res.data : res.data?.usuarios || []
      setUsuarios(list)
    } catch (error) {
      const msg = error.response?.data?.error || error.message || 'No se pudieron cargar los usuarios'
      notify(msg, 'error')
      toast.error(msg)
    } finally {
      setLoadingUsers(false)
    }
  }

  useEffect(() => { if (tab === 'usuarios' && !usuarios.length) cargarUsuarios() }, [tab])

  async function guardar(e) {
    if (e) e.preventDefault()
    if (!nombre.trim()) {
      toast.error('El nombre del negocio es obligatorio')
      return
    }
    const nIva = Number(iva)
    if (isNaN(nIva) || nIva < 0 || nIva > 100) {
      toast.error('El IVA debe ser un número válido entre 0 y 100')
      return
    }

    setSavingEmpresa(true)
    try {
      const formData = {
        nombre_empresa: nombre.trim(),
        nombre: nombre.trim(),
        nit: nit.trim(),
        telefono: tel.trim(),
        tel: tel.trim(),
        direccion: dir.trim(),
        dir: dir.trim(),
        correo: email.trim(),
        email: email.trim(),
        iva: nIva,
      }
      await api.put('/empresa', formData)
      toast.success('Empresa actualizada')
      notify('Empresa actualizada', 'success')
      cargarEmpresa()
    } catch (error) {
      const msg = error.response?.data?.error || error.message || 'Error al actualizar la empresa'
      toast.error(msg)
      notify(msg, 'error')
    } finally {
      setSavingEmpresa(false)
    }
  }

  async function actualizarUsuario(item, patch) {
    const userId = item.id ?? item.id_usuario
    const next = { rol: patch.rol ?? item.rol, estado: patch.estado ?? item.estado }
    try {
      await api.put(`/usuarios/${userId}`, next)
      setUsuarios((prev) => prev.map((u) => ((u.id ?? u.id_usuario) === userId ? { ...u, ...next } : u)))
      notify('Usuario actualizado', 'success')
      toast.success('Usuario actualizado correctamente')
    } catch (error) {
      const msg = error.response?.data?.error || error.message || 'No se pudo actualizar el usuario'
      notify(msg, 'error')
      toast.error(msg)
    }
  }

  async function crearNuevoUsuario(e) {
    e.preventDefault()
    if (!newNombre.trim() || !newEmail.trim() || !newPassword.trim()) {
      toast.error('Nombre, correo y contraseña son obligatorios')
      return
    }
    setCreatingUser(true)
    try {
      const res = await api.post('/usuarios', {
        nombre: newNombre.trim(),
        email: newEmail.trim(),
        password: newPassword,
        rol: newRol,
      })
      toast.success(res.data?.mensaje || res.data?.message || 'Usuario creado exitosamente')
      notify('Usuario creado exitosamente', 'success')
      setModalNuevo(false)
      setNewNombre('')
      setNewEmail('')
      setNewPassword('')
      setNewRol('empleado')
      cargarUsuarios()
    } catch (error) {
      if (error.response?.status === 402) {
        const msg = error.response.data?.error || 'Has alcanzado el límite de colaboradores permitido para tu plan actual.'
        setUpgradeMsg(msg)
        setUpgradeModal(true)
        setModalNuevo(false)
        return
      }
      const msg = error.response?.data?.error || error.message || 'Error al crear usuario'
      toast.error(msg)
      notify(msg, 'error')
    } finally {
      setCreatingUser(false)
    }
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
              <div className="form-group"><label className="form-label">NIT / Identificación Fiscal</label><input className="form-input" placeholder="900123456-1" value={nit} onChange={(e) => setNit(e.target.value)} /></div>
              <div className="form-group"><label className="form-label">Teléfono</label><input className="form-input" inputMode="tel" placeholder="3001234567" value={tel} onChange={(e) => setTel(e.target.value)} /></div>
            </div>
            <div className="form-row">
              <div className="form-group"><label className="form-label">Email</label><input className="form-input" type="email" placeholder="negocio@email.com" value={email} onChange={(e) => setEmail(e.target.value)} /></div>
              <div className="form-group"><label className="form-label">Dirección</label><input className="form-input" placeholder="Calle 1 # 2-3" value={dir} onChange={(e) => setDir(e.target.value)} /></div>
            </div>
            <div className="form-row">
              <div className="form-group"><label className="form-label">Moneda</label><select className="form-input" value={moneda} onChange={(e) => setMoneda(e.target.value)}><option value="COP">COP</option><option value="USD">USD</option></select></div>
              <div className="form-group"><label className="form-label">IVA / Impuesto (%) <span className="required-mark">*</span></label><input className="form-input" type="number" min="0" max="100" step="0.01" value={iva} onChange={(e) => setIva(e.target.value)} /></div>
            </div>
            <div className="form-group">
              <label className="form-label">Umbral de stock bajo <span className="required-mark">*</span></label>
              <input className="form-input" type="number" min="0" step="1" value={umbral} onChange={(e) => setUmbral(e.target.value)} />
              <div className="field-hint">El dashboard mostrará alerta cuando el stock sea igual o inferior a este valor.</div>
            </div>
            <button className="btn-primary" onClick={guardar} disabled={savingEmpresa || loadingEmpresa}>
              {savingEmpresa ? 'Guardando...' : 'Guardar cambios'}
            </button>
          </div>
        </div>
      )}

      {tab === 'usuarios' && (
        <div className="config-section">
          <div className="config-section-title config-title-actions">
            <span>Usuarios y permisos ({usuarios.length})</span>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <button className="btn-secondary" onClick={cargarUsuarios} disabled={loadingUsers}>
                <i className="ti ti-refresh" /> Actualizar
              </button>
              <button className="btn-primary" onClick={() => setModalNuevo(true)}>
                <i className="ti ti-plus" /> Nuevo usuario
              </button>
            </div>
          </div>
          <div className="config-body table-card-body">
            <div className="table-scroll">
              <table>
                <thead><tr><th>Usuario</th><th>Correo</th><th>Rol</th><th>Estado</th></tr></thead>
                <tbody>
                  {loadingUsers && !usuarios.length ? (
                    <tr><td colSpan={4} className="empty-state">Cargando usuarios...</td></tr>
                  ) : usuarios.length === 0 ? (
                    <tr><td colSpan={4} className="empty-state">No hay usuarios registrados aún.</td></tr>
                  ) : (
                    usuarios.map((item) => {
                      const id = item.id ?? item.id_usuario
                      const esPropio = id === (usuario?.id ?? usuario?.id_usuario)
                      const esOwner = item.rol === 'owner'
                      return (
                        <tr key={id}>
                          <td>
                            <strong>{item.nombre} {item.apellido || ''}</strong>
                            {esPropio && <span style={{ marginLeft: '8px', fontSize: '11px', color: '#0284C7' }}>(Tú)</span>}
                          </td>
                          <td>{item.correo || item.email}</td>
                          <td>
                            {esOwner ? (
                              <span style={{ padding: '2px 8px', borderRadius: '12px', fontSize: '11px', fontWeight: 600, background: '#E0F2FE', color: '#0369A1', border: '1px solid #BAE6FD' }}>
                                Propietario
                              </span>
                            ) : (
                              <select
                                className="table-select"
                                value={item.rol === 'admin' ? 'administrador' : item.rol}
                                disabled={esPropio}
                                onChange={(e) => actualizarUsuario(item, { rol: e.target.value })}
                              >
                                <option value="administrador">Administrador</option>
                                <option value="empleado">Empleado</option>
                              </select>
                            )}
                          </td>
                          <td>
                            <select
                              className="table-select"
                              value={item.estado || 'Activo'}
                              disabled={esPropio || esOwner}
                              onChange={(e) => actualizarUsuario(item, { estado: e.target.value })}
                            >
                              <option value="Activo">Activo</option>
                              <option value="Inactivo">Inactivo</option>
                            </select>
                          </td>
                        </tr>
                      )
                    })
                  )}
                </tbody>
              </table>
            </div>
            <p className="field-hint">Las rutas de auditoría, configuración y gestión de usuarios están protegidas por rol en el backend.</p>
          </div>
        </div>
      )}

      {tab === 'plan' && (
        <div className="config-section">
          <div className="config-section-title">Plan actual</div>
          <div className="config-body">
            <div className="plan-card">
              <i className="ti ti-crown" />
              <div>
                <strong>{empresaPlan}</strong>
                <span>
                  {empresaPlan.toLowerCase() === 'business'
                    ? 'Acceso completo a todos los módulos y recursos sin restricciones'
                    : 'Plan inicial: límite de 50 productos y 2 colaboradores'}
                </span>
              </div>
              <Badge color={empresaPlan.toLowerCase() === 'business' ? 'purple' : 'blue'}>Activo</Badge>
            </div>
            {empresaPlan.toLowerCase() !== 'business' && (
              <div style={{ marginTop: '16px' }}>
                <button
                  type="button"
                  className="btn-primary"
                  style={{
                    background: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                  }}
                  onClick={() => {
                    setUpgradeMsg('Aumenta tu capacidad a productos y usuarios ilimitados con el Plan Business.')
                    setUpgradeModal(true)
                  }}
                >
                  <i className="ti ti-crown" />
                  Mejorar a Plan Business
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      <Modal
        open={modalNuevo}
        title="Nuevo colaborador"
        onClose={() => setModalNuevo(false)}
        footer={
          <>
            <button className="btn-secondary" type="button" onClick={() => setModalNuevo(false)}>
              Cancelar
            </button>
            <button className="btn-primary" type="submit" form="form-nuevo-usuario" disabled={creatingUser}>
              {creatingUser ? 'Guardando...' : 'Crear usuario'}
            </button>
          </>
        }
      >
        <form id="form-nuevo-usuario" onSubmit={crearNuevoUsuario}>
          <div className="form-group" style={{ marginBottom: '14px' }}>
            <label className="form-label">Nombre completo <span className="required-mark">*</span></label>
            <input
              className="form-input"
              required
              placeholder="Ej: Carolina Gómez"
              value={newNombre}
              onChange={(e) => setNewNombre(e.target.value)}
            />
          </div>
          <div className="form-group" style={{ marginBottom: '14px' }}>
            <label className="form-label">Correo electrónico <span className="required-mark">*</span></label>
            <input
              className="form-input"
              type="email"
              required
              placeholder="carolina@empresa.com"
              value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
            />
          </div>
          <div className="form-group" style={{ marginBottom: '14px' }}>
            <label className="form-label">Contraseña temporal <span className="required-mark">*</span></label>
            <input
              className="form-input"
              type="password"
              required
              placeholder="Contraseña inicial"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
            />
          </div>
          <div className="form-group">
            <label className="form-label">Rol en la empresa</label>
            <select
              className="form-input"
              value={newRol}
              onChange={(e) => setNewRol(e.target.value)}
            >
              <option value="empleado">Empleado (Ventas y operaciones)</option>
              <option value="administrador">Administrador (Gestión completa)</option>
            </select>
          </div>
        </form>
      </Modal>

      <PlanUpgradeModal
        open={upgradeModal}
        onClose={() => setUpgradeModal(false)}
        limitMessage={upgradeMsg}
        limitType="usuarios"
      />
    </div>
  )
}
