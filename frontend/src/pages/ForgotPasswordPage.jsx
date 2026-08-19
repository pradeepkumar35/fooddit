import { useState } from 'react'
import { Link } from 'react-router-dom'
import { forgotPassword, resetPassword } from '../api/auth'
import Spinner from '../components/Spinner'
import { useToast } from '../context/ToastContext'
import { apiErrorMessage } from '../utils/apiError'

/**
 * Forgot-password flow in three steps: enter your email (a one-time code is
 * sent — in development it's printed to the backend console), then enter the
 * code plus a new password, then a success screen links back to log in.
 */
export default function ForgotPasswordPage() {
  const notify = useToast()
  const [step, setStep] = useState('email') // email | otp | done
  const [email, setEmail] = useState('')
  const [otp, setOtp] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState('')
  const [info, setInfo] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const fieldClass =
    'w-full border-2 border-ink bg-canvas px-3 py-2 text-sm text-ink placeholder:text-muted focus:border-accent focus:outline-none'

  const handleSendCode = async (event) => {
    event.preventDefault()
    setError('')
    setSubmitting(true)
    try {
      await forgotPassword(email.trim())
      setInfo(
        `If an account exists for ${email.trim()}, a 6-digit code is on its way. ` +
          'In development, check the backend console for the code.',
      )
      setStep('otp')
    } catch (err) {
      setError(apiErrorMessage(err, 'Could not request a reset code. Please try again.'))
    } finally {
      setSubmitting(false)
    }
  }

  const handleResend = async () => {
    setError('')
    setSubmitting(true)
    try {
      await forgotPassword(email.trim())
      notify('A new code has been sent')
    } catch {
      setError('Could not resend the code. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  const handleReset = async (event) => {
    event.preventDefault()
    setError('')
    if (newPassword.length < 8) {
      setError('Password must be at least 8 characters')
      return
    }
    if (newPassword !== confirm) {
      setError('Passwords do not match')
      return
    }
    setSubmitting(true)
    try {
      await resetPassword({ email: email.trim(), otp: otp.trim(), newPassword })
      setStep('done')
    } catch (err) {
      setError(apiErrorMessage(err, 'Could not reset your password. Check the code and try again.'))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="mx-auto mt-12 w-full max-w-md px-4">
      <div className="sticker relative p-6 sm:p-8">
        <span className="tape" aria-hidden="true" />
        {step === 'done' ? (
          <>
            <h1 className="font-display text-3xl font-semibold uppercase tracking-wide text-ink">Password updated</h1>
            <p className="mb-6 mt-1 text-sm font-semibold text-muted">
              Your password has been reset. You can now log in with your new password.
            </p>
            <Link
              to="/login"
              className="hard-btn flex w-full items-center justify-center gap-2 border-2 bg-accent py-2 text-sm text-surface"
            >
              Log in
            </Link>
          </>
        ) : (
          <>
            <h1 className="font-display text-3xl font-semibold uppercase tracking-wide text-ink">Reset your password</h1>
            <p className="mb-6 mt-1 text-sm font-semibold text-muted">
              {step === 'email'
                ? 'Enter your account email and we will send you a one-time code.'
                : `Enter the 6-digit code sent to ${email} and choose a new password.`}
            </p>

            {error && (
              <div className="mb-4 border-2 border-chili-500 bg-surface px-3 py-2 text-sm font-semibold text-chili-600 shadow-card">
                {error}
              </div>
            )}
            {info && (
              <div className="mb-4 border-2 border-basil-500 bg-surface px-3 py-2 text-sm font-semibold text-basil-600 shadow-card">
                {info}
              </div>
            )}

            {step === 'email' ? (
              <form onSubmit={handleSendCode} className="space-y-4">
                <div>
                  <label htmlFor="reset-email" className="mb-1 block text-xs font-bold uppercase tracking-wide text-muted">
                    Email
                  </label>
                  <input
                    id="reset-email"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className={fieldClass}
                    placeholder="you@example.com"
                  />
                </div>
                <button
                  type="submit"
                  disabled={submitting}
                  className="hard-btn flex w-full items-center justify-center gap-2 border-2 bg-accent py-2 text-sm text-surface disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {submitting && <Spinner />}
                  {submitting ? 'Sending code…' : 'Send code'}
                </button>
              </form>
            ) : (
              <form onSubmit={handleReset} className="space-y-4">
                <div>
                  <label htmlFor="reset-otp" className="mb-1 block text-xs font-bold uppercase tracking-wide text-muted">
                    One-time code
                  </label>
                  <input
                    id="reset-otp"
                    inputMode="numeric"
                    required
                    maxLength={6}
                    value={otp}
                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                    className={fieldClass}
                    placeholder="123456"
                  />
                </div>
                <div>
                  <label htmlFor="reset-password" className="mb-1 block text-xs font-bold uppercase tracking-wide text-muted">
                    New password
                  </label>
                  <input
                    id="reset-password"
                    type="password"
                    required
                    minLength={8}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className={fieldClass}
                    placeholder="At least 8 characters"
                  />
                </div>
                <div>
                  <label htmlFor="reset-confirm" className="mb-1 block text-xs font-bold uppercase tracking-wide text-muted">
                    Confirm new password
                  </label>
                  <input
                    id="reset-confirm"
                    type="password"
                    required
                    minLength={8}
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                    className={fieldClass}
                    placeholder="Re-enter your new password"
                  />
                </div>
                <button
                  type="submit"
                  disabled={submitting}
                  className="hard-btn flex w-full items-center justify-center gap-2 border-2 bg-accent py-2 text-sm text-surface disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {submitting && <Spinner />}
                  {submitting ? 'Resetting…' : 'Reset password'}
                </button>
                <p className="text-center text-sm font-semibold text-muted">
                  Didn&apos;t get a code?{' '}
                  <button
                    type="button"
                    onClick={handleResend}
                    disabled={submitting}
                    className="font-bold text-accent transition-colors duration-150 hover:underline"
                  >
                    Resend code
                  </button>
                </p>
              </form>
            )}

            <p className="mt-6 text-center text-sm font-semibold text-muted">
              Remembered it?{' '}
              <Link to="/login" className="font-bold text-accent transition-colors duration-150 hover:underline">
                Log in
              </Link>
            </p>
          </>
        )}
      </div>
    </div>
  )
}
