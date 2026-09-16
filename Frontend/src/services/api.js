export const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001'

export class ApiError extends Error {
  constructor(message, status = 0, data = null) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.data = data
  }
}

function parseJsonSafe(res) {
  return res.json().catch(() => ({}))
}

export function saveSession({ accessToken, refreshToken, usuario }) {
  if (accessToken) localStorage.setItem('bizly_token', accessToken)
  if (refreshToken) localStorage.setItem('bizly_refresh_token', refreshToken)
  if (usuario) localStorage.setItem('bizly_usuario', JSON.stringify(usuario))
}

export function clearSession() {
  localStorage.removeItem('bizly_token')
  localStorage.removeItem('bizly_refresh_token')
  localStorage.removeItem('bizly_usuario')
}

async function refreshSession() {
  const refreshToken = localStorage.getItem('bizly_refresh_token')
  if (!refreshToken) return false
  try {
    const res = await fetch(`${API_URL}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    })
    const data = await parseJsonSafe(res)
    if (!res.ok) return false
    saveSession({ accessToken: data.accessToken || data.token, refreshToken: data.refreshToken })
    return true
  } catch {
    return false
  }
}

export async function publicFetch(path, options = {}) {
  const res = await fetch(API_URL + path, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
  })
  const data = await parseJsonSafe(res)
  if (!res.ok) throw new ApiError(data.error || 'Error en la solicitud', res.status, data)
  return data
}

export async function apiFetch(path, options = {}, retry = true) {
  const token = localStorage.getItem('bizly_token')
  const res = await fetch(API_URL + path, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {}),
    },
  })

  if (res.status === 401 && retry && localStorage.getItem('bizly_refresh_token')) {
    const refreshed = await refreshSession()
    if (refreshed) return apiFetch(path, options, false)
    clearSession()
    window.dispatchEvent(new Event('bizly-session-expired'))
  }

  const data = await parseJsonSafe(res)
  if (!res.ok) throw new ApiError(data.error || 'Error en la solicitud', res.status, data)
  return data
}
