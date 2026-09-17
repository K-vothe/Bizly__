import axios, { AxiosInstance, InternalAxiosRequestConfig } from 'axios';

export const baseURL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';
export const API_URL = baseURL;

export const api: AxiosInstance = axios.create({
  baseURL,
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = localStorage.getItem('bizly_token') || localStorage.getItem('token');
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
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
  if (accessToken) localStorage.setItem('bizly_token', accessToken);
  if (refreshToken) localStorage.setItem('bizly_refresh_token', refreshToken);
  if (usuario) localStorage.setItem('bizly_usuario', JSON.stringify(usuario));
}

export function clearSession(): void {
  localStorage.removeItem('bizly_token');
  localStorage.removeItem('bizly_refresh_token');
  localStorage.removeItem('bizly_usuario');
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
  const token = localStorage.getItem('bizly_token') || localStorage.getItem('token');
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
