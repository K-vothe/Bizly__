import { useState } from 'react'
import { publicFetch } from '../services/api'

function passwordOk(value) {
  return value.length >= 8 && /[A-Za-z]/.test(value) && /\d/.test(value)
}

export default function RecuperarPassword({ onIrLogin }) {
  const [paso, setPaso] = useState(1)
  const [correo, setCorreo] = useState('')
  const [codigo, setCodigo] = useState('')
  const [nueva, setNueva] = useState('')
  const [confirmar, setConfirmar] = useState('')
  const [error, setError] = useState('')
  const [exito, setExito] = useState('')
  const [devCode, setDevCode] = useState('')
  const [loading, setLoading] = useState(false)

  async function enviarCodigo() {
    if (!/^\S+@\S+\.\S+$/.test(correo.trim())) { setError('Ingresa un correo válido'); return }
    setLoading(true); setError(''); setExito('')
    try {
      const data = await publicFetch('/auth/recuperar', { method: 'POST', body: JSON.stringify({ correo: correo.trim() }) })
      setDevCode(data.devCode || '')
      setPaso(2)
      setExito('Si el correo está registrado, recibirás un código de recuperación.')
    } catch (err) {
      setError(err.message || 'No se pudo solicitar el código')
    } finally { setLoading(false) }
  }

  async function resetPassword() {
    if (!/^\d{6}$/.test(codigo)) { setError('Ingresa el código de 6 dígitos'); return }
    if (!passwordOk(nueva)) { setError('La nueva contraseña debe tener al menos 8 caracteres e incluir letras y números'); return }
    if (nueva !== confirmar) { setError('Las contraseñas no coinciden'); return }
    setLoading(true); setError('')
    try {
      await publicFetch('/auth/reset-password', {
        method: 'POST',
        body: JSON.stringify({ correo: correo.trim(), codigo, nuevaPassword: nueva }),
      })
      setExito('Contraseña actualizada. Todas las sesiones anteriores fueron cerradas.')
      setDevCode('')
      setTimeout(onIrLogin, 1200)
    } catch (err) {
      setError(err.message || 'Código inválido o expirado')
    } finally { setLoading(false) }
  }

  return (
    <div className="auth-bg">
      <div className="auth-card">
        <div className="auth-logo-wrap">
          <div className="auth-logo-icon"><i className="ti ti-building-store" /></div>
          <div className="auth-logo-name">Bizly</div>
        </div>
        <div className="auth-title">Recuperar contraseña</div>
        <div className="auth-sub">{paso === 1 ? 'Te enviaremos un código de 6 dígitos.' : `Ingresa el código enviado a ${correo}.`}</div>

        {error && <div className="form-message error">{error}</div>}
        {exito && <div className="form-message success">{exito}</div>}
        {devCode && <div className="form-message warning">Modo desarrollo: código <strong>{devCode}</strong></div>}

        {paso === 1 ? (
          <>
            <div className="form-group">
              <label className="form-label">Correo electrónico <span className="required-mark">*</span></label>
              <input className="form-input" type="email" autoComplete="email" placeholder="tu@correo.com" value={correo} onChange={(e) => setCorreo(e.target.value)} autoFocus />
            </div>
            <button className="btn-primary auth-submit" onClick={enviarCodigo} disabled={loading}>{loading ? 'Enviando...' : 'Enviar código'}</button>
          </>
        ) : (
          <>
            <div className="form-group">
              <label className="form-label">Código <span className="required-mark">*</span></label>
              <input className="form-input code-input" inputMode="numeric" maxLength={6} placeholder="123456" value={codigo} onChange={(e) => setCodigo(e.target.value.replace(/\D/g, ''))} autoFocus />
            </div>
            <div className="form-group">
              <label className="form-label">Nueva contraseña <span className="required-mark">*</span></label>
              <input className="form-input" type="password" autoComplete="new-password" placeholder="Mínimo 8 caracteres" value={nueva} onChange={(e) => setNueva(e.target.value)} />
              <div className={`field-hint${nueva && !passwordOk(nueva) ? ' invalid' : ''}`}>Incluye letras y números.</div>
            </div>
            <div className="form-group">
              <label className="form-label">Confirmar contraseña <span className="required-mark">*</span></label>
              <input className="form-input" type="password" autoComplete="new-password" placeholder="••••••••" value={confirmar} onChange={(e) => setConfirmar(e.target.value)} />
            </div>
            <button className="btn-primary auth-submit" onClick={resetPassword} disabled={loading}>{loading ? 'Actualizando...' : 'Cambiar contraseña'}</button>
            <button className="auth-secondary-link" onClick={() => { setPaso(1); setError(''); setExito(''); setDevCode('') }}>← Volver a ingresar correo</button>
          </>
        )}
        <div className="auth-links"><button className="link-action" onClick={onIrLogin}>← Volver al login</button></div>
      </div>
    </div>
  )
}
