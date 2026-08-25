import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'

vi.mock('./api/client', () => ({
  client: { get: vi.fn(() => Promise.resolve({ data: {} })), post: vi.fn(), patch: vi.fn(), delete: vi.fn() },
  API_URL: 'http://localhost:8080/api',
  loadAuth: vi.fn(() => null),
  saveAuth: vi.fn(),
  clearAuth: vi.fn(),
}))
vi.mock('./api/restaurants', () => ({
  fetchLedger: vi.fn().mockResolvedValue({ content: [], page: 0, size: 30, totalElements: 0, totalPages: 0 }),
  listRestaurants: vi.fn().mockResolvedValue([]),
  listCuisines: vi.fn().mockResolvedValue([]),
  getRestaurantStats: vi.fn(),
  suggestRestaurants: vi.fn().mockResolvedValue([]),
}))

import App from './App'
import { AuthProvider } from './context/AuthContext'
import { LocationProvider } from './context/LocationContext'
import { ToastProvider } from './context/ToastContext'

describe('App smoke', () => {
  it('mounts the full tree at "/" without crashing (provider regression guard)', async () => {
    window.history.pushState({}, '', '/')
    render(
      <MemoryRouter initialEntries={['/']}>
        <AuthProvider>
          <ToastProvider>
            <LocationProvider>
              <App />
            </LocationProvider>
          </ToastProvider>
        </AuthProvider>
      </MemoryRouter>,
    )
    // Ledger chrome renders instead of a blank page.
    expect(await screen.findByText(/The City Ledger|Mumbai|Chennai/i)).toBeInTheDocument()
    expect(screen.getByLabelText('Search restaurants')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Most discussed' })).toBeInTheDocument()
  })
})