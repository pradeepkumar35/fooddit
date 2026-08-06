import { Navigate, Route, Routes, useLocation } from 'react-router-dom'
import Navbar from './components/Navbar'
import ProtectedRoute from './components/ProtectedRoute'
import ForgotPasswordPage from './pages/ForgotPasswordPage'
import LoginPage from './pages/LoginPage'
import SignupPage from './pages/SignupPage'
import RestaurantListPage from './pages/RestaurantListPage'
import RestaurantDetailPage from './pages/RestaurantDetailPage'
import SettingsPage from './pages/SettingsPage'
import UserProfilePage from './pages/UserProfilePage'

export default function App() {
  const location = useLocation()

  return (
    <div className="min-h-screen bg-canvas text-ink">
      <Navbar />
      {/* Keyed on pathname so each route change fades the new page in; query
          changes (search, sort, tabs) don't remount and stay flicker-free. */}
      <main key={location.pathname} className="animate-page-in">
        <Routes location={location}>
          <Route path="/" element={<RestaurantListPage />} />
          <Route path="/restaurants/:id" element={<RestaurantDetailPage />} />
          <Route path="/users/:userId" element={<UserProfilePage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/signup" element={<SignupPage />} />

          <Route element={<ProtectedRoute />}>
            <Route path="/profile" element={<UserProfilePage />} />
            <Route path="/settings" element={<SettingsPage />} />
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
    </div>
  )
}
