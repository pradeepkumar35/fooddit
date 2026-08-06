import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import * as authApi from '../api/auth'
import { clearAuth, loadAuth, saveAuth } from '../api/client'

const AuthContext = createContext(null)

/**
 * Holds the JWT and the current user. Persists them to localStorage so a page
 * refresh keeps the session, and listens for the 401 event fired by the Axios
 * interceptor to log out automatically.
 */
export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => loadAuth()?.token ?? null)
  const [user, setUser] = useState(() => loadAuth()?.user ?? null)

  useEffect(() => {
    const handleUnauthorized = () => {
      setToken(null)
      setUser(null)
    }
    window.addEventListener('fooddit:unauthorized', handleUnauthorized)
    return () => window.removeEventListener('fooddit:unauthorized', handleUnauthorized)
  }, [])

  const persist = useCallback((data) => {
    saveAuth({ token: data.token, user: data.user })
    setToken(data.token)
    setUser(data.user)
  }, [])

  const login = useCallback(
    async (credentials) => {
      const data = await authApi.login(credentials)
      persist(data)
      return data.user
    },
    [persist],
  )

  const signup = useCallback(
    async (details) => {
      const data = await authApi.signup(details)
      persist(data)
      return data.user
    },
    [persist],
  )

  const logout = useCallback(() => {
    clearAuth()
    setToken(null)
    setUser(null)
  }, [])

  // Reflect account changes (e.g. a renamed display name) without re-logging in.
  const updateUser = useCallback(
    (nextUser) => {
      setUser((current) => {
        const merged = { ...current, ...nextUser }
        saveAuth({ token, user: merged })
        return merged
      })
    },
    [token],
  )

  const value = useMemo(
    () => ({ token, user, isAuthenticated: Boolean(token), login, signup, logout, updateUser }),
    [token, user, login, signup, logout, updateUser],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
