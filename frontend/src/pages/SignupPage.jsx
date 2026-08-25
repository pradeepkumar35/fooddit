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
    `w-full border-[1.5px] px-3 py-2 text-sm text-ink placeholder:text-muted transition-colors duration-150 focus:outline-none ${
      fieldErrors[name] ? 'border-down bg-card' : 'border-hair bg-paper focus:border-inkent'
    }`

  return (
    <div className="mx-auto mt-12 w-full max-w-md px-4">
      <div className="panel relative mt-2 p-6 sm:p-8">
        
        <h1 className="font-serif text-3xl font-bold tracking-tight text-ink">Create your account</h1>
        <p className="mb-6 mt-1 text-sm font-semibold text-muted">
          Join Fooddit to review and discuss restaurants.
        </p>

        {error && (
          <div className="mb-4 border-l-4 border border-hair bg-card px-3 py-2 text-sm font-semibold text-down">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="name" className="micro-label mb-1 block">
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
            {fieldErrors.name && <p className="mt-1 text-xs font-semibold text-down">{fieldErrors.name}</p>}
          </div>

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
              className={fieldClass('email')}
              placeholder="you@example.com"
            />
            {fieldErrors.email && <p className="mt-1 text-xs font-semibold text-down">{fieldErrors.email}</p>}
          </div>

          <div>
            <label htmlFor="password" className="micro-label mb-1 block">
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
              <p className="mt-1 text-xs font-semibold text-down">{fieldErrors.password}</p>
            )}
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="btn-hard btn-hard-primary flex w-full items-center justify-center gap-2 py-2.5 text-sm disabled:cursor-not-allowed disabled:opacity-60"
          >
            {submitting && <Spinner />}
            {submitting ? 'Creating account…' : 'Sign up'}
          </button>
        </form>

        <p className="mt-6 text-center text-sm font-semibold text-muted">
          Already have an account?{' '}
          <Link to="/login" className="font-bold text-emerald transition-colors duration-150 hover:underline">
            Log in
          </Link>
        </p>
      </div>
    </div>
  )
}
