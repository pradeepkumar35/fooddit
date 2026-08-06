import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'

/**
 * Wraps routes that require a logged-in user. Unauthenticated visitors are
 * redirected to /login, remembering where they came from so login can send them
 * back.
 */
export default function ProtectedRoute() {
  const { isAuthenticated } = useAuth()
  const location = useLocation()

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }
  return <Outlet />
}
