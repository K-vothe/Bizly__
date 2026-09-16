import { useApp } from '../context/AppContext'
import { getInitials } from '../services/utils'

const NAV_ITEMS = [
  { page: 'dashboard', icon: 'ti-layout-dashboard', label: 'Dashboard' },
  { page: 'ventas', icon: 'ti-shopping-cart', label: 'Ventas' },
  { page: 'inventario', icon: 'ti-package', label: 'Inventario' },
  { page: 'clientes', icon: 'ti-users', label: 'Clientes' },
  { page: 'reportes', icon: 'ti-chart-bar', label: 'Reportes' },
  { page: 'auditoria', icon: 'ti-shield-check', label: 'Auditoría', adminOnly: true },
  { page: 'configuracion', icon: 'ti-settings', label: 'Configuración', adminOnly: true },
  { page: 'cuenta', icon: 'ti-user-cog', label: 'Mi cuenta' },
]

export default function Sidebar({ activePage, onNav, usuario, onLogout, open, onClose }) {
  const { state } = useApp()
  const { config } = state
  const nombreCompleto = usuario?.nombreCompleto || usuario?.nombre || 'Usuario'
  const initials = getInitials(nombreCompleto)
  const esAdmin = usuario?.rol === 'admin'
  const rolLabel = esAdmin ? 'Administrador' : 'Empleado'
  const items = NAV_ITEMS.filter((item) => !item.adminOnly || esAdmin)

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
        {items.map(({ page, icon, label }) => (
          <button key={page} className={`sb-item${activePage === page ? ' active' : ''}`} onClick={() => onNav(page)}>
            <i className={`ti ${icon}`} />{label}
          </button>
        ))}
      </nav>

      <div className="sb-footer">
        <div className="sb-avatar">{initials}</div>
        <div className="sb-footer-info">
          <div className="sb-footer-name">{nombreCompleto}</div>
          <div className="sb-footer-role">{rolLabel}</div>
        </div>
        <button className="sb-logout" title="Cerrar sesión" onClick={onLogout} aria-label="Cerrar sesión">
          <i className="ti ti-logout" />
        </button>
      </div>
    </aside>
  )
}
