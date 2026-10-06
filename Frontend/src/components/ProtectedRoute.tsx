import React, { useRef } from 'react';
import { Navigate, useLocation, Outlet } from 'react-router-dom';
import { toast } from 'sonner';
import { TOKEN_KEY } from '../services/api';

export interface Usuario {
  id?: number;
  nombre?: string;
  nombreCompleto?: string;
  apellido?: string;
  correo?: string;
  rol?: string;
  [key: string]: any;
}

interface ProtectedRouteProps {
  usuario?: Usuario | null;
  allowedRoles?: string[];
  children?: React.ReactNode;
}

export default function ProtectedRoute({
  usuario,
  allowedRoles,
  children,
}: ProtectedRouteProps) {
  const location = useLocation();
  const notifiedRef = useRef(false);

  // Guardia 1: Autenticación
  const token =
    localStorage.getItem(TOKEN_KEY) || localStorage.getItem('bizly_token');

  if (!token) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  // Obtener usuario desde prop o almacenamiento local
  let currentUser = usuario;
  if (!currentUser) {
    try {
      const stored = localStorage.getItem('bizly_usuario');
      if (stored) currentUser = JSON.parse(stored);
    } catch {
      currentUser = null;
    }
  }

  // Guardia 2: RBAC (Control de Acceso Basado en Roles)
  if (allowedRoles && allowedRoles.length > 0) {
    const userRole = (currentUser?.rol || '').toLowerCase().trim();
    const normalizedAllowed = allowedRoles.map((r) => r.toLowerCase().trim());
    const isAllowed = normalizedAllowed.includes(userRole);

    if (!isAllowed) {
      if (!notifiedRef.current) {
        toast.error('Acceso denegado');
        notifiedRef.current = true;
      }
      return <Navigate to="/dashboard" replace />;
    }
  }

  return children ? <>{children}</> : <Outlet />;
}
