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
    'w-full border-[1.5px] border-hair bg-paper px-3 py-2 text-sm text-ink placeholder:text-muted focus:border-accent focus:outline-none'

  return (
    <div className="mx-auto mt-12 w-full max-w-md px-4">
      <div className="panel relative mt-2 p-6 sm:p-8">
        
        <h1 className="font-serif text-3xl font-bold tracking-tight text-ink">Log in</h1>
        <p className="mb-6 mt-1 text-sm font-semibold text-muted">Welcome back to Fooddit.</p>

        {error && (
          <div className="mb-4 border-l-4 border border-hair bg-card px-3 py-2 text-sm font-semibold text-down">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="email" className="micro-label mb-1 block">
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
            <label htmlFor="password" className="micro-label mb-1 block">
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
                className="text-xs font-bold text-muted transition-colors duration-150 hover:text-emerald"
              >
                Forgot password?
              </Link>
            </div>
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="btn-hard btn-hard-primary flex w-full items-center justify-center gap-2 py-2.5 text-sm disabled:cursor-not-allowed disabled:opacity-60"
          >
            {submitting && <Spinner />}
            {submitting ? 'Logging in…' : 'Log in'}
          </button>
        </form>

        <p className="mt-6 text-center text-sm font-semibold text-muted">
          New to Fooddit?{' '}
          <Link to="/signup" className="font-bold text-emerald transition-colors duration-150 hover:underline">
            Create an account
          </Link>
        </p>
      </div>
    </div>
  )
}
