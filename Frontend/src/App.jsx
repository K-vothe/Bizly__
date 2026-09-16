import { useEffect, useState } from 'react'
import { AppProvider, useApp } from './context/AppContext'
import { apiFetch, clearSession, saveSession } from './services/api'
import Sidebar from './components/Sidebar'
import Toast from './components/Toast'
import Dashboard from './pages/Dashboard'
import Ventas from './pages/Ventas'
import Inventario from './pages/Inventario'
import Clientes from './pages/Clientes'
import Reportes from './pages/Reportes'
import Auditoria from './pages/Auditoria'
import Configuracion from './pages/Configuracion'
import MiCuenta from './pages/MiCuenta'
import Login from './pages/Login'
import Registro from './pages/Registro'
import RecuperarPassword from './pages/RecuperarPassword'

const PAGES = {
  dashboard: Dashboard,
  ventas: Ventas,
  inventario: Inventario,
  clientes: Clientes,
  reportes: Reportes,
  auditoria: Auditoria,
  configuracion: Configuracion,
  cuenta: MiCuenta,
}

const PAGE_LABELS = {
  dashboard: 'Dashboard',
  ventas: 'Ventas',
  inventario: 'Inventario',
  clientes: 'Clientes',
  reportes: 'Reportes',
  auditoria: 'Auditoría',
  configuracion: 'Configuración',
  cuenta: 'Mi cuenta',
}

const ADMIN_ONLY_PAGES = ['auditoria', 'configuracion']

function Shell({ usuario, onLogout, onSessionClosed }) {
  const [activePage, setActivePage] = useState('dashboard')
  const [menuOpen, setMenuOpen] = useState(false)
  const { toast, setToast, state } = useApp()
  const esAdmin = usuario?.rol === 'admin'
  const pageSegura = ADMIN_ONLY_PAGES.includes(activePage) && !esAdmin ? 'dashboard' : activePage
  const PageComponent = PAGES[pageSegura] || Dashboard

  function navigate(page) {
    setActivePage(page)
    setMenuOpen(false)
  }

  return (
    <div className="app-shell">
      <Sidebar
        activePage={pageSegura}
        onNav={navigate}
        usuario={usuario}
        onLogout={onLogout}
        open={menuOpen}
        onClose={() => setMenuOpen(false)}
      />
      {menuOpen && <button className="sidebar-backdrop" aria-label="Cerrar menú" onClick={() => setMenuOpen(false)} />}
      <div className="content-shell">
        <header className="app-header">
          <button className="mobile-menu-btn" onClick={() => setMenuOpen(true)} aria-label="Abrir menú">
            <i className="ti ti-menu-2" />
          </button>
          <div className="app-header-copy">
            <strong>{PAGE_LABELS[pageSegura]}</strong>
            <span>{state.config.nombre || 'Mi Tienda'}</span>
          </div>
          <div className="app-header-user">{usuario?.nombreCompleto || usuario?.nombre}</div>
        </header>
        <main className="main-content">
          <div className="breadcrumb" aria-label="Ruta de navegación">
            <button onClick={() => navigate('dashboard')}>Bizly</button>
            <span>/</span>
            <strong>{PAGE_LABELS[pageSegura]}</strong>
          </div>
          <PageComponent
            onNav={navigate}
            usuario={usuario}
            onLogout={onLogout}
            onSessionClosed={onSessionClosed}
          />
          <footer className="app-footer">Bizly · Sistema de gestión empresarial</footer>
        </main>
      </div>
      <Toast toast={toast} onClose={() => setToast(null)} />
    </div>
  )
}

function SessionSplash() {
  return (
    <div className="session-splash">
      <i className="ti ti-building-store" />
      <span>Bizly</span>
    </div>
  )
}

export default function App() {
  const [auth, setAuth] = useState(null)
  const [pantalla, setPantalla] = useState('login')
  const [checkingSession, setCheckingSession] = useState(true)

  function closeLocalSession() {
    clearSession()
    setAuth(null)
    setPantalla('login')
  }

  useEffect(() => {
    const token = localStorage.getItem('bizly_token')
    const refreshToken = localStorage.getItem('bizly_refresh_token')
    if (!token || !refreshToken) {
      clearSession()
      setCheckingSession(false)
      return
    }

    apiFetch('/auth/me')
      .then(({ usuario }) => {
        saveSession({ usuario })
        setAuth({ token: localStorage.getItem('bizly_token'), refreshToken: localStorage.getItem('bizly_refresh_token'), usuario })
      })
      .catch(closeLocalSession)
      .finally(() => setCheckingSession(false))

    const expire = () => closeLocalSession()
    window.addEventListener('bizly-session-expired', expire)
    return () => window.removeEventListener('bizly-session-expired', expire)
  }, [])

  function handleLogin(accessToken, refreshToken, usuario) {
    saveSession({ accessToken, refreshToken, usuario })
    setAuth({ token: accessToken, refreshToken, usuario })
  }

  async function handleLogout() {
    try { await apiFetch('/auth/logout', { method: 'POST' }) } catch {}
    closeLocalSession()
  }

  if (checkingSession) return <SessionSplash />

  if (auth) {
    return (
      <AppProvider usuario={auth.usuario}>
        <Shell usuario={auth.usuario} onLogout={handleLogout} onSessionClosed={closeLocalSession} />
      </AppProvider>
    )
  }

  if (pantalla === 'registro') {
    return <Registro onLogin={handleLogin} onIrLogin={() => setPantalla('login')} />
  }
  if (pantalla === 'recuperar') {
    return <RecuperarPassword onIrLogin={() => setPantalla('login')} />
  }
  return (
    <Login
      onLogin={handleLogin}
      onIrRegistro={() => setPantalla('registro')}
      onIrRecuperar={() => setPantalla('recuperar')}
    />
  )
}
