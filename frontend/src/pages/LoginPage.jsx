import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { useToast } from '../context/ToastContext'
import { apiErrorMessage } from '../utils/apiError'
import Spinner from '../components/Spinner'

export default function LoginPage() {
  const { login } = useAuth()
  const notify = useToast()
  const navigate = useNavigate()
  const location = useLocation()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const from = location.state?.from?.pathname || '/'

  const handleSubmit = async (event) => {
    event.preventDefault()
    setError('')
    setSubmitting(true)
    try {
      await login({ email, password })
      notify('Welcome back!')
      navigate(from, { replace: true })
    } catch (err) {
      setError(apiErrorMessage(err, 'Login failed. Please try again.'))
    } finally {
      setSubmitting(false)
    }
  }

  const fieldClass =
    'w-full rounded-lg border border-line px-3 py-2 text-sm text-ink placeholder:text-muted transition-colors duration-150 focus:border-accent'

  return (
    <div className="mx-auto mt-12 w-full max-w-md px-4">
      <div className="rounded-lg border border-line bg-surface p-6 shadow-card sm:p-8">
        <h1 className="font-display text-2xl font-semibold text-ink">Log in</h1>
        <p className="mb-6 mt-1 text-sm text-muted">Welcome back to Fooddit.</p>

        {error && (
          <div className="mb-4 rounded-lg border border-chili-500/40 bg-surface px-3 py-2 text-sm text-chili-600">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="email" className="mb-1 block text-sm font-medium text-ink">
              Email
            </label>
            <input
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={fieldClass}
              placeholder="you@example.com"
            />
          </div>

          <div>
            <label htmlFor="password" className="mb-1 block text-sm font-medium text-ink">
              Password
            </label>
            <input
              id="password"
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={fieldClass}
              placeholder="••••••••"
            />
            <div className="mt-1 text-right">
              <Link
                to="/forgot-password"
                className="text-xs font-medium text-muted transition-colors duration-150 hover:text-accent"
              >
                Forgot password?
              </Link>
            </div>
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-accent py-2 text-sm font-medium text-surface transition duration-150 ease-out hover:bg-accent/90 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {submitting && <Spinner />}
            {submitting ? 'Logging in…' : 'Log in'}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-muted">
          New to Fooddit?{' '}
          <Link to="/signup" className="font-medium text-accent transition-colors duration-150 hover:underline">
            Create an account
          </Link>
        </p>
      </div>
    </div>
  )
}
