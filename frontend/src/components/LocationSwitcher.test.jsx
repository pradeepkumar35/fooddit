import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, useSearchParams } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import LocationBar from './LocationBar'
import { ToastProvider } from '../context/ToastContext'
import { LocationProvider } from '../context/LocationContext'

const { listCities, listLocalities } = vi.hoisted(() => ({
  listCities: vi.fn(),
  listLocalities: vi.fn(),
}))
const { listAddresses, createAddress, deleteAddress, setDefaultAddress } = vi.hoisted(() => ({
  listAddresses: vi.fn(),
  createAddress: vi.fn(),
  deleteAddress: vi.fn(),
  setDefaultAddress: vi.fn(),
}))
const resolveCity = vi.fn()

vi.mock('../api/locations', () => ({ listCities, listLocalities }))
vi.mock('../api/addresses', () => ({
  listAddresses,
  createAddress,
  deleteAddress,
  setDefaultAddress,
}))
vi.mock('../utils/geo', () => ({ resolveLocation: (...args) => resolveCity(...args) }))
vi.mock('../context/AuthContext', () => ({
  useAuth: () => ({ isAuthenticated: false }),
}))
vi.mock('../hooks/useAuth', () => ({
  useAuth: () => ({ isAuthenticated: false }),
}))

const CITIES = [
  { citySlug: 'bangalore', cityName: 'Bangalore' },
  { citySlug: 'mumbai', cityName: 'Mumbai' },
]

function UrlProbe() {
  const [sp] = useSearchParams()
  return <div data-testid="url">{sp.toString()}</div>
}

const renderSwitcher = () =>
  render(
    <MemoryRouter initialEntries={['/']}>
      <ToastProvider>
        <LocationProvider>
          <LocationBar />
          <UrlProbe />
        </LocationProvider>
      </ToastProvider>
    </MemoryRouter>,
  )

describe('LocationSwitcher', () => {
  beforeEach(() => {
    listCities.mockReset().mockResolvedValue(CITIES)
    listLocalities.mockReset().mockResolvedValue(['Koramangala', 'Indiranagar'])
    listAddresses.mockReset().mockResolvedValue([])
    createAddress.mockReset().mockResolvedValue({})
    deleteAddress.mockReset().mockResolvedValue({})
    setDefaultAddress.mockReset().mockResolvedValue({})
    resolveCity.mockReset()
    localStorage.removeItem('fooddit.location')
  })

  it('navigates to the feed with the chosen city when a locality chip is picked', async () => {
    renderSwitcher()
    await userEvent.click(screen.getByRole('button', { name: 'Choose location' }))

    await userEvent.click(await screen.findByRole('button', { name: 'Mumbai' }))
    await waitFor(() => expect(listLocalities).toHaveBeenCalledWith('mumbai'))
    await userEvent.click(await screen.findByRole('button', { name: 'Entire Mumbai' }))

    await waitFor(() => expect(screen.getByTestId('url')).toHaveTextContent('city=mumbai'))
  })

  it('applies a locality, not just the city', async () => {
    renderSwitcher()
    await userEvent.click(screen.getByRole('button', { name: 'Choose location' }))
    await userEvent.click(await screen.findByRole('button', { name: 'Bangalore' }))
    await userEvent.click(await screen.findByRole('button', { name: 'Koramangala' }))
    await waitFor(() =>
      expect(screen.getByTestId('url')).toHaveTextContent('city=bangalore'),
    )
    await waitFor(() =>
      expect(screen.getByTestId('url')).toHaveTextContent('locality=Koramangala'),
    )
  })

  it('uses the current location when geolocation resolves to a serviceable city', async () => {
    const getCurrentPosition = vi.fn((success) =>
      success({ coords: { latitude: 12.9716, longitude: 77.5946 } }),
    )
    Object.defineProperty(global.navigator, 'geolocation', {
      value: { getCurrentPosition },
      configurable: true,
    })
    resolveCity.mockResolvedValue({ citySlug: 'bangalore', cityName: 'Bangalore' })

    renderSwitcher()
    await userEvent.click(screen.getByRole('button', { name: 'Choose location' }))
    await userEvent.click(await screen.findByRole('button', { name: 'Use my current location' }))

    expect(await screen.findByText('Bangalore — choose a locality')).toBeInTheDocument()
  })

  it('shows a not-deliverable message when the location is not serviceable', async () => {
    const getCurrentPosition = vi.fn((success) => success({ coords: { latitude: 0, longitude: 0 } }))
    Object.defineProperty(global.navigator, 'geolocation', {
      value: { getCurrentPosition },
      configurable: true,
    })
    resolveCity.mockResolvedValue(null)

    renderSwitcher()
    await userEvent.click(screen.getByRole('button', { name: 'Choose location' }))
    await userEvent.click(await screen.findByRole('button', { name: 'Use my current location' }))

    expect(
      await screen.findByText(/We don't deliver to this location yet/),
    ).toBeInTheDocument()
  })
})