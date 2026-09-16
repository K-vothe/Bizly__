import { useState } from 'react'
import { apiFetch } from '../services/api'
import { useApp } from '../context/AppContext'
import Modal from '../components/Modal'

export default function MiCuenta({ usuario, onSessionClosed }) {
  const { notify } = useApp()
  const [modalDelete, setModalDelete] = useState(false)
  const [password, setPassword] = useState('')
  const [confirmacion, setConfirmacion] = useState('')
  const [loading, setLoading] = useState(false)

  async function logoutAll() {
    if (!window.confirm('¿Cerrar todas las sesiones de Bizly en todos tus dispositivos?')) return
    setLoading(true)
    try {
      await apiFetch('/auth/logout-all', { method: 'POST' })
      onSessionClosed()
    } catch (error) {
      notify(error.message || 'No se pudieron cerrar las sesiones', 'error')
      setLoading(false)
    }
  }

  async function deleteAccount() {
    if (confirmacion !== 'ELIMINAR' || !password) {
      notify('Escribe ELIMINAR y confirma tu contraseña', 'error')
      return
    }
    setLoading(true)
    try {
      await apiFetch('/auth/cuenta', {
        method: 'DELETE',
        body: JSON.stringify({ password, confirmacion }),
      })
      onSessionClosed()
    } catch (error) {
      notify(error.message || 'No se pudo eliminar la cuenta', 'error')
      setLoading(false)
    }
  }

  return (
    <div className="page">
      <div className="page-header">
        <div className="page-title">Mi cuenta</div>
        <div className="page-sub">Información personal y seguridad de sesión</div>
      </div>

      <div className="two-col account-grid">
        <section className="card">
          <div className="card-header"><span className="card-title">Perfil</span></div>
          <div className="card-body account-details">
            <div><span>Nombre</span><strong>{usuario?.nombreCompleto || `${usuario?.nombre || ''} ${usuario?.apellido || ''}`.trim()}</strong></div>
            <div><span>Correo</span><strong>{usuario?.correo}</strong></div>
            <div><span>Rol</span><strong>{usuario?.rol === 'admin' ? 'Administrador' : 'Empleado'}</strong></div>
          </div>
        </section>

        <section className="card">
          <div className="card-header"><span className="card-title">Seguridad</span></div>
          <div className="card-body">
            <p className="section-copy">Si perdiste acceso a otro equipo o sospechas que alguien inició sesión con tu cuenta, puedes revocar todas las sesiones activas.</p>
            <button className="btn-secondary" onClick={logoutAll} disabled={loading}>
              <i className="ti ti-devices-off" /> Cerrar sesión en todos los dispositivos
            </button>
          </div>
        </section>
      </div>

      <section className="config-section danger-zone">
        <div className="config-section-title">Zona de riesgo</div>
        <div className="config-body">
          <p className="section-copy">Eliminar la cuenta la desactiva, anonimiza el correo y cierra todas las sesiones. Los registros contables y de auditoría necesarios para conservar la integridad del negocio no se eliminan.</p>
          <button className="btn-danger-solid" onClick={() => { setPassword(''); setConfirmacion(''); setModalDelete(true) }}>
            Eliminar mi cuenta
          </button>
        </div>
      </section>

      <Modal
        open={modalDelete}
        title="Confirmar eliminación de cuenta"
        onClose={() => setModalDelete(false)}
        footer={(
          <>
            <button className="btn-secondary" onClick={() => setModalDelete(false)}>Cancelar</button>
            <button className="btn-danger-solid" onClick={deleteAccount} disabled={loading}>Eliminar definitivamente</button>
          </>
        )}
      >
        <div className="form-message warning">Esta acción cerrará tus sesiones y desactivará la cuenta.</div>
        <div className="form-group">
          <label className="form-label">Contraseña <span className="required-mark">*</span></label>
          <input className="form-input" type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} />
        </div>
        <div className="form-group">
          <label className="form-label">Escribe ELIMINAR para confirmar <span className="required-mark">*</span></label>
          <input className="form-input" value={confirmacion} onChange={(e) => setConfirmacion(e.target.value.toUpperCase())} placeholder="ELIMINAR" />
        </div>
      </Modal>
    </div>
  )
}
