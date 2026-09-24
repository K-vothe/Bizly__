import axios, { AxiosInstance, InternalAxiosRequestConfig } from 'axios';
import { toast } from 'sonner';

const getBaseURL = (): string => {
  const envUrl = (import.meta.env.VITE_API_URL as string | undefined)?.trim();
  if (!envUrl) return 'http://localhost:4001/api';
  const cleanUrl = envUrl.replace(/\/+$/, '');
  return cleanUrl.endsWith('/api') ? cleanUrl : `${cleanUrl}/api`;
};

export const baseURL = getBaseURL();
export const API_URL = baseURL;


export const TOKEN_KEY = 'token';

export const api: AxiosInstance = axios.create({
  baseURL,
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = localStorage.getItem(TOKEN_KEY) || localStorage.getItem('bizly_token');
    if (token && config.headers) {
      config.headers.Authorization = 'Bearer ' + token.trim();
    }
    if (config.url && config.baseURL?.endsWith('/api') && config.url.startsWith('/api/')) {
      config.url = config.url.replace(/^\/api/, '');
    }
    return config;
  },
  (error) => Promise.reject(error)
);

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response?.status;
    const url = (error.config?.url || '').toLowerCase();

    // 1. Manejo global de 401 (Sesión inválida / Token revocado en caliente)
    if (status === 401) {
      const isAuthEndpoint =
        url.includes('/auth/login') ||
        url.includes('/auth/register') ||
        url.includes('/auth/send-otp') ||
        url.includes('/auth/verify-otp') ||
        url.includes('/auth/reset-password') ||
        url.includes('/auth/forgot-password');

      if (!isAuthEndpoint) {
        clearSession();
        if (typeof window !== 'undefined' && !window.location.pathname.includes('/login')) {
          window.location.href = '/login';
        }
      }
    }

    // 2. Manejo global de 500 o caídas de red (ERR_NETWORK)
    const isNetworkError = !error.response || error.code === 'ERR_NETWORK';
    if (isNetworkError || (typeof status === 'number' && status >= 500)) {
      toast.error('Error interno del servidor. Nuestro equipo ha sido notificado.');
    }

    return Promise.reject(error);
  }
);

export class ApiError extends Error {
  status: number;
  data: unknown;

  constructor(message: string, status = 0, data: unknown = null) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.data = data;
  }
}

export function saveSession({
  accessToken,
  refreshToken,
  usuario,
}: {
  accessToken?: string;
  refreshToken?: string;
  usuario?: any;
}): void {
  if (accessToken) {
    localStorage.setItem(TOKEN_KEY, accessToken);
    localStorage.setItem('bizly_token', accessToken);
  }
  if (refreshToken) localStorage.setItem('bizly_refresh_token', refreshToken);
  if (usuario) localStorage.setItem('bizly_usuario', JSON.stringify(usuario));
}

export function clearSession(): void {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem('bizly_token');
  localStorage.removeItem('bizly_refresh_token');
  localStorage.removeItem('bizly_usuario');
  localStorage.removeItem('refreshToken');
  localStorage.removeItem('usuario');
  localStorage.removeItem('user');
  try {
    sessionStorage.clear();
  } catch {}
}

export async function publicFetch(path: string, options: RequestInit = {}): Promise<any> {
  const url = `${baseURL}${path.startsWith('/') ? '' : '/'}${path}`;
  const res = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new ApiError(data.error || 'Error en la solicitud', res.status, data);
  return data;
}

export async function apiFetch(path: string, options: RequestInit = {}): Promise<any> {
  const token = localStorage.getItem(TOKEN_KEY) || localStorage.getItem('bizly_token');
  const url = `${baseURL}${path.startsWith('/') ? '' : '/'}${path}`;
  const res = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {}),
    },
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new ApiError(data.error || 'Error en la solicitud', res.status, data);
  return data;
}

export default api;
