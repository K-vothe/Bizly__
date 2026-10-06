import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { TOKEN_KEY } from '../services/api';

interface PublicRouteProps {
  children?: React.ReactNode;
}

export default function PublicRoute({ children }: PublicRouteProps) {
  const token = localStorage.getItem(TOKEN_KEY) || localStorage.getItem('bizly_token');

  if (token) {
    return <Navigate to="/dashboard" replace />;
  }

  return children ? <>{children}</> : <Outlet />;
}
