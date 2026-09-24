import React, { useEffect, useState } from 'react';
import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
  useLocation,
  useNavigate,
  Link,
  Outlet,
} from 'react-router-dom';
import { Toaster } from 'sonner';
import { AppProvider, useApp } from './context/AppContext';
import api, { clearSession, saveSession, TOKEN_KEY } from './services/api';
import Sidebar from './components/Sidebar';
import Toast from './components/Toast';
import ProtectedRoute, { Usuario } from './components/ProtectedRoute';
import PublicRoute from './components/PublicRoute';
import Dashboard from './pages/Dashboard';
import VentasPage from './pages/VentasPage';
import Inventario from './pages/Inventario';
import Clientes from './pages/Clientes';
import ReportesPage from './pages/ReportesPage';
import Auditoria from './pages/Auditoria';
import Configuracion from './pages/Configuracion';
import MiCuenta from './pages/MiCuenta';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import ForgotPasswordPage from './pages/ForgotPasswordPage';
import LandingPage from './pages/LandingPage';
import AboutPage from './pages/AboutPage';

export type { Usuario };

export interface AuthSession {
  token: string | null;
  refreshToken: string | null;
  usuario: Usuario;
}

const PAGE_LABELS: Record<string, string> = {
  dashboard: 'Dashboard',
  ventas: 'Ventas',
  inventario: 'Inventario',
  clientes: 'Clientes',
  reportes: 'Reportes',
  auditoria: 'Auditoría',
  configuracion: 'Configuración',
  cuenta: 'Mi cuenta',
};

const ADMIN_ROLES = ['admin', 'administrador', 'owner'];

function MainLayout({
  usuario,
  onLogout,
}: {
  usuario?: Usuario | null;
  onLogout: () => void;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const { toast, setToast, state } = (useApp() as any) || {};
  const location = useLocation();

  const currentPath = location.pathname.replace(/^\//, '').split('/')[0] || 'dashboard';
  const pageLabel = PAGE_LABELS[currentPath] || 'Dashboard';

  return (
    <div className="app-shell">
      <Sidebar
        usuario={usuario}
        onLogout={onLogout}
        open={menuOpen}
        onClose={() => setMenuOpen(false)}
      />
      {menuOpen && (
        <button
          className="sidebar-backdrop"
          aria-label="Cerrar menú"
          onClick={() => setMenuOpen(false)}
        />
      )}
      <div className="content-shell">
        <header className="app-header">
          <button
            className="mobile-menu-btn"
            onClick={() => setMenuOpen(true)}
            aria-label="Abrir menú"
          >
            <i className="ti ti-menu-2" />
          </button>
          <div className="app-header-copy">
            <strong>{pageLabel}</strong>
            <span>{state?.config?.nombre || 'Mi Tienda'}</span>
          </div>
          <div className="app-header-user">
            {usuario?.nombreCompleto || usuario?.nombre}
          </div>
        </header>
        <main className="main-content">
          <div className="breadcrumb" aria-label="Ruta de navegación">
            <Link to="/dashboard">Bizly</Link>
            <span>/</span>
            <strong>{pageLabel}</strong>
          </div>
          <Outlet />
          <footer className="app-footer">Bizly · Sistema de gestión empresarial</footer>
        </main>
      </div>
      <Toast toast={toast} onClose={() => setToast?.(null)} />
    </div>
  );
}

function SessionSplash() {
  return (
    <div className="session-splash">
      <i className="ti ti-building-store" />
      <span>Bizly</span>
    </div>
  );
}

function AppContent() {
  const [auth, setAuth] = useState<AuthSession | null>(null);
  const [checkingSession, setCheckingSession] = useState(true);
  const navigate = useNavigate();

  function closeLocalSession() {
    clearSession();
    setAuth(null);
    navigate('/login', { replace: true });
  }

  useEffect(() => {
    const token =
      localStorage.getItem(TOKEN_KEY) || localStorage.getItem('bizly_token');
    if (!token) {
      clearSession();
      setCheckingSession(false);
      return;
    }

    api
      .get('/auth/me')
      .then((res) => {
        const usuario: Usuario = res.data?.usuario || res.data;
        saveSession({ usuario });
        setAuth({
          token:
            localStorage.getItem(TOKEN_KEY) ||
            localStorage.getItem('bizly_token'),
          refreshToken: localStorage.getItem('bizly_refresh_token'),
          usuario,
        });
      })
      .catch(closeLocalSession)
      .finally(() => setCheckingSession(false));

    const expire = () => closeLocalSession();
    window.addEventListener('bizly-session-expired', expire);
    return () => window.removeEventListener('bizly-session-expired', expire);
  }, []);

  function handleLogin(
    accessToken: string,
    refreshToken: string,
    usuario: Usuario
  ) {
    saveSession({ accessToken, refreshToken, usuario });
    setAuth({ token: accessToken, refreshToken, usuario });
    navigate('/dashboard', { replace: true });
  }

  async function handleLogout() {
    try {
      await api.post('/auth/logout');
    } catch {}
    closeLocalSession();
  }

  if (checkingSession) {
    return <SessionSplash />;
  }

  return (
    <>
      <Toaster position="top-right" richColors />
      <Routes>
        {/* Rutas Públicas */}
        <Route
          path="/login"
          element={
            <PublicRoute>
              <LoginPage
                onLogin={handleLogin}
                onIrRegistro={() => navigate('/registro')}
                onIrRecuperar={() => navigate('/recuperar')}
              />
            </PublicRoute>
          }
        />
        <Route
          path="/registro"
          element={
            <PublicRoute>
              <RegisterPage
                onLogin={handleLogin}
                onIrLogin={() => navigate('/login')}
              />
            </PublicRoute>
          }
        />
        <Route
          path="/recuperar"
          element={
            <PublicRoute>
              <ForgotPasswordPage onIrLogin={() => navigate('/login')} />
            </PublicRoute>
          }
        />
        <Route
          path="/forgot-password"
          element={<Navigate to="/recuperar" replace />}
        />
        <Route
          path="/quienes-somos"
          element={
            <PublicRoute>
              <AboutPage />
            </PublicRoute>
          }
        />

        {/* Rutas Privadas / Protegidas dentro de MainLayout */}
        <Route
          element={
            <ProtectedRoute usuario={auth?.usuario}>
              <AppProvider usuario={auth?.usuario}>
                <MainLayout
                  usuario={auth?.usuario}
                  onLogout={handleLogout}
                />
              </AppProvider>
            </ProtectedRoute>
          }
        >
          <Route
            path="/dashboard"
            element={
              <Dashboard
                onNav={(page: string) =>
                  navigate(page.startsWith('/') ? page : `/${page}`)
                }
                usuario={auth?.usuario}
              />
            }
          />
          <Route path="/ventas" element={<VentasPage />} />
          <Route path="/inventario" element={<Inventario />} />
          <Route path="/clientes" element={<Clientes />} />
          <Route path="/reportes" element={<ReportesPage />} />
          <Route
            path="/cuenta"
            element={
              <MiCuenta
                usuario={auth?.usuario}
                onSessionClosed={closeLocalSession}
              />
            }
          />

          {/* Rutas Administrativas con RBAC estricto */}
          <Route
            path="/auditoria"
            element={
              <ProtectedRoute
                usuario={auth?.usuario}
                allowedRoles={ADMIN_ROLES}
              >
                <Auditoria />
              </ProtectedRoute>
            }
          />
          <Route
            path="/configuracion"
            element={
              <ProtectedRoute
                usuario={auth?.usuario}
                allowedRoles={ADMIN_ROLES}
              >
                <Configuracion usuario={auth?.usuario} />
              </ProtectedRoute>
            }
          />
        </Route>

        {/* Ruta Pública Principal: Landing Page B2B */}
        <Route
          path="/"
          element={
            <PublicRoute>
              <LandingPage />
            </PublicRoute>
          }
        />
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AppContent />
    </BrowserRouter>
  );
}