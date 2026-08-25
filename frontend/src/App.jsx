import { Navigate, Route, Routes, useLocation } from 'react-router-dom'
import Navbar from './components/Navbar'
import ProtectedRoute from './components/ProtectedRoute'
import { NotificationsProvider } from './context/NotificationsContext'
import ForgotPasswordPage from './pages/ForgotPasswordPage'
import LoginPage from './pages/LoginPage'
import SignupPage from './pages/SignupPage'
import RestaurantListPage from './pages/RestaurantListPage'
import RestaurantDetailPage from './pages/RestaurantDetailPage'
import SettingsPage from './pages/SettingsPage'
import UserProfilePage from './pages/UserProfilePage'

/**
 * Route transitions key on the pathname only — query-param changes (search,
 * sort, filters, ledger page, Ledger|Map tab) re-render the same page in place
 * without remounting, so nothing flickers while you refine a view.
 */
function PageTransition() {
  const location = useLocation()
  return (
    <main key={location.pathname} className="animate-page-in">
      <Routes location={location}>
        <Route path="/" element={<RestaurantListPage />} />
        <Route path="/restaurants/:id" element={<RestaurantDetailPage />} />
        <Route path="/users/:userId" element={<UserProfilePage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/signup" element={<SignupPage />} />

        {/* Layout route: ProtectedRoute renders <Outlet/> for authed users. */}
        <Route element={<ProtectedRoute />}>
          <Route path="/profile" element={<UserProfilePage />} />
          <Route path="/settings" element={<SettingsPage />} />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </main>
  )
}

/**
 * Router itself lives in main.jsx. NotificationsProvider must sit above the
 * navbar — dropping it blanks the entire app (the bell's context throws).
 */
export default function App() {
  return (
    <div className="min-h-screen text-ink">
      <NotificationsProvider>
        <Navbar />
        <PageTransition />
      </NotificationsProvider>
    </div>
  )
}