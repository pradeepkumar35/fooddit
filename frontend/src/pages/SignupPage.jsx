import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { useToast } from '../context/ToastContext'
import Spinner from '../components/Spinner'

export default function SignupPage() {
  const { signup } = useAuth()
  const notify = useToast()
  const navigate = useNavigate()
  const location = useLocation()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [fieldErrors, setFieldErrors] = useState({})
  const [submitting, setSubmitting] = useState(false)

  const from = location.state?.from?.pathname || '/'

  const handleSubmit = async (event) => {
    event.preventDefault()
    setError('')
    setFieldErrors({})

    if (!/^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.com$/.test(email.trim())) {
      setFieldErrors({ email: 'Email must end in .com' })
      return
    }

    setSubmitting(true)
    try {
      await signup({ name, email, password })
      notify('Account created — welcome!')
      navigate(from, { replace: true })
    } catch (err) {
      if (err.response?.data?.fieldErrors) {
        setFieldErrors(err.response.data.fieldErrors)
      } else {
        setError(err.response?.data?.message || 'Signup failed. Please try again.')
      }
    } finally {
      setSubmitting(false)
    }
  }

  const fieldClass = (name) =>
    `w-full rounded-lg border px-3 py-2 text-sm text-ink placeholder:text-muted transition-colors duration-150 focus:border-accent ${
      fieldErrors[name] ? 'border-chili-500' : 'border-line'
    }`

  return (
    <div className="mx-auto mt-12 w-full max-w-md px-4">
      <div className="rounded-lg border border-line bg-surface p-6 shadow-card sm:p-8">
        <h1 className="font-display text-2xl font-semibold text-ink">Create your account</h1>
        <p className="mb-6 mt-1 text-sm text-muted">
          Join Fooddit to review and discuss restaurants.
        </p>

        {error && (
          <div className="mb-4 rounded-lg border border-chili-500/40 bg-surface px-3 py-2 text-sm text-chili-600">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="name" className="mb-1 block text-sm font-medium text-ink">
              Name
            </label>
            <input
              id="name"
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className={fieldClass('name')}
              placeholder="Jane Foodie"
            />
            {fieldErrors.name && <p className="mt-1 text-xs text-chili-600">{fieldErrors.name}</p>}
          </div>

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
              className={fieldClass('email')}
              placeholder="you@example.com"
            />
            {fieldErrors.email && <p className="mt-1 text-xs text-chili-600">{fieldErrors.email}</p>}
          </div>

          <div>
            <label htmlFor="password" className="mb-1 block text-sm font-medium text-ink">
              Password
            </label>
            <input
              id="password"
              type="password"
              required
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={fieldClass('password')}
              placeholder="At least 8 characters"
            />
            {fieldErrors.password && (
              <p className="mt-1 text-xs text-chili-600">{fieldErrors.password}</p>
            )}
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-accent py-2 text-sm font-medium text-surface transition duration-150 ease-out hover:bg-accent/90 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {submitting && <Spinner />}
            {submitting ? 'Creating account…' : 'Sign up'}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-muted">
          Already have an account?{' '}
          <Link to="/login" className="font-medium text-accent transition-colors duration-150 hover:underline">
            Log in
          </Link>
        </p>
      </div>
    </div>
  )
}
