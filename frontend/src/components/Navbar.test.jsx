import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, useLocation } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import Navbar from './Navbar'

const { suggestRestaurants } = vi.hoisted(() => ({ suggestRestaurants: vi.fn() }))

// Stable activeCity reference: the production LocationContext memoises it, and a
// fresh object per render would churn the autocomplete effect's dependency.
const stableLocation = { activeCity: { citySlug: 'mumbai', cityName: 'Mumbai' } }

vi.mock('../hooks/useAuth', () => ({
  useAuth: () => ({ user: { id: 'u1', name: 'Alice' }, isAuthenticated: false, logout: vi.fn() }),
}))
vi.mock('../hooks/useLocation', () => ({ useLocation: () => stableLocation }))
vi.mock('../api/restaurants', () => ({ suggestRestaurants }))
vi.mock('../context/NotificationsContext', () => ({
  useNotifications: () => ({ items: [], unread: 0, loading: false, load: vi.fn() }),
}))
vi.mock('./LocationBar', () => ({ default: () => null }))

const LocationProbe = () => {
  const location = useLocation()
  return <span data-testid="route">{location.pathname}</span>
}

const renderNavbar = () =>
  render(
    <MemoryRouter initialEntries={['/']}>
      <Navbar />
      <LocationProbe />
    </MemoryRouter>,
  )

describe('Navbar restaurant autocomplete', () => {
  beforeEach(() => {
    suggestRestaurants.mockReset()
  })

  it('fetches city-scoped suggestions while typing and navigates on pick', async () => {
    suggestRestaurants.mockResolvedValue([
      { id: 'r1', name: 'Biryani Diaries', locality: 'Bandra' },
      { id: 'r2', name: 'Biryani House', locality: 'Andheri' },
    ])

    renderNavbar()
    await userEvent.type(screen.getByLabelText('Search restaurants'), 'bir')

    const suggestion = await screen.findByText('Biryani Diaries')
    await userEvent.click(suggestion)

    await waitFor(() =>
      expect(suggestRestaurants).toHaveBeenCalledWith('mumbai', 'bir', expect.anything()),
    )
    await waitFor(() => expect(screen.getByTestId('route')).toHaveTextContent('/restaurants/r1'))
  })

  it('hides the dropdown when the query is too short to search', async () => {
    suggestRestaurants.mockResolvedValue([{ id: 'r1', name: 'Biryani Diaries', locality: 'Bandra' }])

    renderNavbar()

    await userEvent.type(screen.getByLabelText('Search restaurants'), 'b')

    await new Promise((resolve) => setTimeout(resolve, 350))
    expect(suggestRestaurants).not.toHaveBeenCalled()
    expect(screen.queryByText('Biryani Diaries')).not.toBeInTheDocument()
  })
})