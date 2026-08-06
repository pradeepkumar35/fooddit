import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import ReportMenu from './ReportMenu'

const { createReport, useAuth } = vi.hoisted(() => ({
  createReport: vi.fn(),
  useAuth: vi.fn(),
}))

vi.mock('../api/reports', () => ({ createReport }))
vi.mock('../context/ToastContext', () => ({ useToast: () => vi.fn() }))
vi.mock('../hooks/useAuth', () => ({ useAuth }))

const renderMenu = (props) =>
  render(
    <MemoryRouter>
      <ReportMenu targetType="COMMENT" targetId="c1" {...props} />
    </MemoryRouter>,
  )

describe('ReportMenu', () => {
  beforeEach(() => {
    createReport.mockReset()
    useAuth.mockReturnValue({ isAuthenticated: true })
  })

  it('submits a comment report with the right target type and id', async () => {
    createReport.mockResolvedValue({ id: 'r1' })
    renderMenu()

    await userEvent.click(screen.getByRole('button', { name: 'More actions' }))
    await userEvent.click(screen.getByRole('button', { name: 'Spam' }))

    await waitFor(() =>
      expect(createReport).toHaveBeenCalledWith({ targetType: 'COMMENT', targetId: 'c1', reason: 'SPAM' }),
    )
    expect(await screen.findByText('Reported')).toBeInTheDocument()
  })

  it('surfaces the backend message when a comment report fails', async () => {
    createReport.mockRejectedValue({
      response: { status: 400, data: { message: 'You cannot report a deleted comment' } },
    })
    renderMenu()

    await userEvent.click(screen.getByRole('button', { name: 'More actions' }))
    await userEvent.click(screen.getByRole('button', { name: 'Harassment' }))

    expect(await screen.findByText('You cannot report a deleted comment')).toBeInTheDocument()
  })

  it('redirects anonymous users to login before submitting', async () => {
    useAuth.mockReturnValue({ isAuthenticated: false })
    renderMenu()

    await userEvent.click(screen.getByRole('button', { name: 'More actions' }))
    await userEvent.click(screen.getByRole('button', { name: 'Off-topic' }))

    await waitFor(() => expect(createReport).not.toHaveBeenCalled())
  })
})