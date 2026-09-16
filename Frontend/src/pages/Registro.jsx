import { useState } from 'react'
import { publicFetch } from '../services/api'

function passwordOk(value) {
  return value.length >= 8 && /[A-Za-z]/.test(value) && /\d/.test(value)
}

export default function Registro({ onLogin, onIrLogin }) {
  const [paso, setPaso] = useState(1)
  const [nombre, setNombre] = useState('')
  const [apellido, setApellido] = useState('')
  const [correo, setCorreo] = useState('')
  const [password, setPassword] = useState('')
  const [confirmar, setConfirmar] = useState('')
  const [acepta, setAcepta] = useState(false)
  const [codigo, setCodigo] = useState('')
  const [devCode, setDevCode] = useState('')
  const [error, setError] = useState('')
  const [exito, setExito] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleRegistro() {
    if (!nombre.trim() || !correo.trim() || !password || !confirmar) { setError('Completa todos los campos obligatorios'); return }
    if (!/^\S+@\S+\.\S+$/.test(correo.trim())) { setError('Ingresa un correo válido'); return }
    if (!passwordOk(password)) { setError('La contraseña debe tener al menos 8 caracteres e incluir letras y números'); return }
    if (password !== confirmar) { setError('Las contraseñas no coinciden'); return }
    if (!acepta) { setError('Debes aceptar la política de privacidad y el tratamiento de datos'); return }

    setLoading(true); setError(''); setExito('')
    try {
      const data = await publicFetch('/auth/registro', {
        method: 'POST',
        body: JSON.stringify({ nombre: nombre.trim(), apellido: apellido.trim(), correo: correo.trim(), password, aceptaTratamiento: true }),
      })
      setDevCode(data.devCode || '')
      setPaso(2)
      setExito('Cuenta creada. Revisa tu correo e ingresa el código de verificación.')
    } catch (err) {
      setError(err.message || 'No se pudo crear la cuenta')
      if (err.data?.requiereVerificacion) setPaso(2)
    } finally {
      setLoading(false)
    }
  }

  async function verificar() {
    if (!/^\d{6}$/.test(codigo)) { setError('Ingresa el código de 6 dígitos'); return }
    setLoading(true); setError('')
    try {
      const data = await publicFetch('/auth/verificar-correo', {
        method: 'POST',
        body: JSON.stringify({ correo: correo.trim(), codigo }),
      })
      onLogin(data.accessToken || data.token, data.refreshToken, data.usuario)
    } catch (err) {
      setError(err.message || 'No se pudo verificar el correo')
    } finally {
      setLoading(false)
    }
  }

  async function reenviar() {
    setLoading(true); setError(''); setExito('')
    try {
      const data = await publicFetch('/auth/reenviar-verificacion', {
        method: 'POST',
        body: JSON.stringify({ correo: correo.trim() }),
      })
      setDevCode(data.devCode || '')
      setExito('Se generó un nuevo código de verificación.')
    } catch (err) {
      setError(err.message || 'No se pudo reenviar el código')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-bg">
      <div className="auth-card auth-card-wide">
        <div className="auth-logo-wrap">
          <div className="auth-logo-icon"><i className="ti ti-building-store" /></div>
          <div className="auth-logo-name">Bizly</div>
        </div>
        <div className="auth-title">{paso === 1 ? 'Crear cuenta' : 'Verifica tu correo'}</div>
        <div className="auth-sub">{paso === 1 ? 'Regístrate para empezar a usar Bizly' : `Enviamos un código a ${correo}`}</div>

        {error && <div className="form-message error">{error}</div>}
        {exito && <div className="form-message success">{exito}</div>}
        {devCode && <div className="form-message warning">Modo desarrollo: código <strong>{devCode}</strong></div>}

        {paso === 1 ? (
          <>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Nombre <span className="required-mark">*</span></label>
                <input className="form-input" autoComplete="given-name" placeholder="Juan" value={nombre} onChange={(e) => setNombre(e.target.value)} />
              </div>
              <div className="form-group">
                <label className="form-label">Apellido</label>
                <input className="form-input" autoComplete="family-name" placeholder="Pérez" value={apellido} onChange={(e) => setApellido(e.target.value)} />
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Correo electrónico <span className="required-mark">*</span></label>
              <input className="form-input" type="email" autoComplete="email" placeholder="tu@correo.com" value={correo} onChange={(e) => setCorreo(e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">Contraseña <span className="required-mark">*</span></label>
              <input className="form-input" type="password" autoComplete="new-password" placeholder="Mínimo 8 caracteres, letras y números" value={password} onChange={(e) => setPassword(e.target.value)} />
              <div className={`field-hint${password && !passwordOk(password) ? ' invalid' : ''}`}>8 a 72 caracteres, con al menos una letra y un número.</div>
            </div>
            <div className="form-group">
              <label className="form-label">Confirmar contraseña <span className="required-mark">*</span></label>
              <input className="form-input" type="password" autoComplete="new-password" placeholder="••••••••" value={confirmar} onChange={(e) => setConfirmar(e.target.value)} />
              {confirmar && confirmar !== password && <div className="field-hint invalid">Las contraseñas no coinciden.</div>}
            </div>
            <label className="consent-row">
              <input type="checkbox" checked={acepta} onChange={(e) => setAcepta(e.target.checked)} />
              <span>Acepto los <a href="/terminos.html" target="_blank" rel="noreferrer">términos de uso</a> y la <a href="/privacidad.html" target="_blank" rel="noreferrer">política de privacidad y tratamiento de datos</a>. <span className="required-mark">*</span></span>
            </label>
            <button className="btn-primary auth-submit" onClick={handleRegistro} disabled={loading}>{loading ? 'Creando cuenta...' : 'Crear cuenta'}</button>
          </>
        ) : (
          <>
            <div className="form-group">
              <label className="form-label">Código de 6 dígitos <span className="required-mark">*</span></label>
              <input className="form-input code-input" inputMode="numeric" maxLength={6} placeholder="123456" value={codigo} onChange={(e) => setCodigo(e.target.value.replace(/\D/g, ''))} autoFocus />
            </div>
            <button className="btn-primary auth-submit" onClick={verificar} disabled={loading}>{loading ? 'Verificando...' : 'Verificar y entrar'}</button>
            <button className="auth-secondary-link" onClick={reenviar} disabled={loading}>Reenviar código</button>
            <button className="auth-secondary-link" onClick={() => { setPaso(1); setCodigo(''); setError(''); setExito('') }}>← Corregir datos</button>
          </>
        )}

        <div className="auth-links">
          <span>¿Ya tienes cuenta?</span>
          <button className="link-action" onClick={onIrLogin}>Iniciar sesión</button>
        </div>
      </div>
    </div>
  )
}
