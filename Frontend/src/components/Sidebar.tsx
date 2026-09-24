import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { clearSession, api } from '../services/api';
import { Usuario } from './ProtectedRoute';

interface NavItem {
  path: string;
  icon: string;
  label: string;
  adminOnly?: boolean;
}

const NAV_ITEMS: NavItem[] = [
  { path: '/dashboard', icon: 'ti-layout-dashboard', label: 'Dashboard' },
  { path: '/ventas', icon: 'ti-shopping-cart', label: 'Ventas' },
  { path: '/inventario', icon: 'ti-package', label: 'Inventario' },
  { path: '/clientes', icon: 'ti-users', label: 'Clientes' },
  { path: '/reportes', icon: 'ti-chart-bar', label: 'Reportes' },
  { path: '/auditoria', icon: 'ti-shield-check', label: 'Auditoría', adminOnly: true },
  { path: '/configuracion', icon: 'ti-settings', label: 'Configuración', adminOnly: true },
  { path: '/cuenta', icon: 'ti-user-cog', label: 'Mi cuenta' },
];

export interface SidebarProps {
  usuario?: Usuario | null;
  onLogout?: () => void;
  open?: boolean;
  onClose?: () => void;
}

export default function Sidebar({ usuario, onLogout, open, onClose }: SidebarProps) {
  const navigate = useNavigate();
  const { state } = (useApp() as any) || {};
  const config = state?.config || {};
  const nombreCompleto = usuario?.nombreCompleto || usuario?.nombre || 'Usuario';
  const initials = (usuario?.nombre || usuario?.nombreCompleto || usuario?.email || usuario?.correo || 'U')
    .split(' ')
    .filter(Boolean)
    .map((n: string) => n[0])
    .join('')
    .substring(0, 2)
    .toUpperCase() || 'U';

  const esAdmin = ['admin', 'administrador', 'owner'].includes((usuario?.rol || '').toLowerCase());
  const rolLabel = usuario?.rol === 'owner' ? 'Propietario' : esAdmin ? 'Administrador' : 'Empleado';
  const items = NAV_ITEMS.filter((item) => !item.adminOnly || esAdmin);

  const handleLogout = async () => {
    try {
      await api.post('/auth/logout');
    } catch {}
    clearSession();
    if (onLogout) {
      onLogout();
    }
    navigate('/login');
  };

  return (
    <aside className={`sidebar${open ? ' open' : ''}`}>
      <div className="sb-brand">
        <button className="sb-mobile-close" onClick={onClose} aria-label="Cerrar menú">×</button>
        <div className="sb-logo">
          <div className="sb-logo-icon"><i className="ti ti-building-store" /></div>
          <div>
            <div className="sb-name">{config.nombre || 'Mi Tienda'}</div>
            <div className="sb-sub">{nombreCompleto}</div>
          </div>
        </div>
        <div className="sb-plan"><span>Plan Business</span></div>
      </div>

      <nav className="sb-nav">
        {items.map(({ path, icon, label }) => (
          <NavLink
            key={path}
            to={path}
            onClick={onClose}
            className={({ isActive }) =>
              `sb-item ${isActive ? 'active font-semibold' : ''}`
            }
          >
            <i className={`ti ${icon}`} />
            <span>{label}</span>
          </NavLink>
        ))}
      </nav>

      <div className="sb-footer">
        <div className="sb-avatar">{initials}</div>
        <div className="sb-footer-info">
          <div className="sb-footer-name">{nombreCompleto}</div>
          <div className="sb-footer-role">{rolLabel}</div>
        </div>
        <button
          className="sb-logout"
          title="Cerrar sesión"
          onClick={handleLogout}
          aria-label="Cerrar sesión"
        >
          <i className="ti ti-logout" />
        </button>
      </div>
    </aside>
  );
}
