import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import ForgotPasswordPage from './ForgotPasswordPage'

const { forgotPassword, resetPassword } = vi.hoisted(() => ({
  forgotPassword: vi.fn(),
  resetPassword: vi.fn(),
}))

vi.mock('../api/auth', () => ({ forgotPassword, resetPassword }))
vi.mock('../context/ToastContext', () => ({
  useToast: () => vi.fn(),
}))

const renderPage = () =>
  render(
    <MemoryRouter>
      <ForgotPasswordPage />
    </MemoryRouter>,
  )

describe('ForgotPasswordPage', () => {
  beforeEach(() => {
    forgotPassword.mockReset().mockResolvedValue(undefined)
    resetPassword.mockReset().mockResolvedValue(undefined)
  })

  it('sends the email and moves to the code step', async () => {
    renderPage()

    await userEvent.type(screen.getByLabelText('Email'), 'alice@example.com')
    await userEvent.click(screen.getByRole('button', { name: 'Send code' }))

    expect(forgotPassword).toHaveBeenCalledWith('alice@example.com')
    expect(await screen.findByLabelText('One-time code')).toBeInTheDocument()
    expect(screen.getByText(/check the backend console/i)).toBeInTheDocument()
  })

  it('rejects mismatched passwords on the reset step', async () => {
    renderPage()
    await userEvent.type(screen.getByLabelText('Email'), 'alice@example.com')
    await userEvent.click(screen.getByRole('button', { name: 'Send code' }))

    await userEvent.type(await screen.findByLabelText('One-time code'), '123456')
    await userEvent.type(screen.getByLabelText('New password'), 'newPassword1')
    await userEvent.type(screen.getByLabelText('Confirm new password'), 'newPassword2')
    await userEvent.click(screen.getByRole('button', { name: 'Reset password' }))

    expect(screen.getByText('Passwords do not match')).toBeInTheDocument()
    expect(resetPassword).not.toHaveBeenCalled()
  })

  it('resets the password with a matching pair and shows success', async () => {
    renderPage()
    await userEvent.type(screen.getByLabelText('Email'), 'alice@example.com')
    await userEvent.click(screen.getByRole('button', { name: 'Send code' }))

    await userEvent.type(await screen.findByLabelText('One-time code'), '123456')
    await userEvent.type(screen.getByLabelText('New password'), 'newPassword1')
    await userEvent.type(screen.getByLabelText('Confirm new password'), 'newPassword1')
    await userEvent.click(screen.getByRole('button', { name: 'Reset password' }))

    expect(resetPassword).toHaveBeenCalledWith({
      email: 'alice@example.com',
      otp: '123456',
      newPassword: 'newPassword1',
    })
    expect(await screen.findByText('Password updated')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Log in' })).toBeInTheDocument()
  })
})
