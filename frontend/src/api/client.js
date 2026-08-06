import axios from 'axios'

const AUTH_KEY = 'fooddit.auth'

export function loadAuth() {
  try {
    return JSON.parse(localStorage.getItem(AUTH_KEY)) ?? null
  } catch {
    return null
  }
}

export function saveAuth(auth) {
  localStorage.setItem(AUTH_KEY, JSON.stringify(auth))
}

export function clearAuth() {
  localStorage.removeItem(AUTH_KEY)
}

/**
 * Shared Axios instance. Points at /api (proxied to the backend in dev, or
 * overridden with VITE_API_URL in production). Attaches the JWT from storage on
 * every request, and signs the user out on a 401 from an authenticated request.
 */
export const client = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
})

client.interceptors.request.use((config) => {
  const auth = loadAuth()
  if (auth?.token) {
    config.headers.Authorization = `Bearer ${auth.token}`
  }
  return config
})

client.interceptors.response.use(
  (response) => response,
  (error) => {
    const requestWasAuthenticated = Boolean(error.config?.headers?.Authorization)
    if (error.response?.status === 401 && requestWasAuthenticated) {
      clearAuth()
      window.dispatchEvent(new Event('fooddit:unauthorized'))
    }
    return Promise.reject(error)
  },
)
