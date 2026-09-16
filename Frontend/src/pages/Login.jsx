import { useState } from 'react'
import { publicFetch } from '../services/api'

export default function Login({ onLogin, onIrRegistro, onIrRecuperar }) {
  const [correo, setCorreo] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleLogin() {
    if (!correo.trim() || !password) { setError('Completa correo y contraseña'); return }
    setLoading(true); setError('')
    try {
      const data = await publicFetch('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ correo: correo.trim(), password }),
      })
      onLogin(data.accessToken || data.token, data.refreshToken, data.usuario)
    } catch (err) {
      setError(err.message || 'No se pudo iniciar sesión')
    } finally {
      setLoading(false)
    }
  }

  function handleKey(e) { if (e.key === 'Enter' && !loading) handleLogin() }

  return (
    <div className="auth-bg">
      <div className="auth-card">
        <div className="auth-logo-wrap">
          <div className="auth-logo-icon"><i className="ti ti-building-store" /></div>
          <div className="auth-logo-name">Bizly</div>
        </div>
        <div className="auth-title">Bienvenido de vuelta</div>
        <div className="auth-sub">Inicia sesión para continuar</div>

        {error && <div className="form-message error">{error}</div>}

        <div className="form-group">
          <label className="form-label">Correo electrónico <span className="required-mark">*</span></label>
          <input className="form-input" type="email" autoComplete="email" placeholder="tu@correo.com"
            value={correo} onChange={(e) => setCorreo(e.target.value)} onKeyDown={handleKey} autoFocus />
        </div>
        <div className="form-group">
          <label className="form-label">Contraseña <span className="required-mark">*</span></label>
          <input className="form-input" type="password" autoComplete="current-password" placeholder="••••••••"
            value={password} onChange={(e) => setPassword(e.target.value)} onKeyDown={handleKey} />
        </div>

        <button className="btn-primary auth-submit" onClick={handleLogin} disabled={loading}>
          {loading ? 'Iniciando sesión...' : 'Iniciar sesión'}
        </button>

        <div className="auth-links">
          <button className="link-action" onClick={onIrRecuperar}>¿Olvidaste tu contraseña?</button>
          <span>·</span>
          <button className="link-action" onClick={onIrRegistro}>Crear cuenta</button>
        </div>
      </div>
    </div>
  )
}
