import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { LocationProvider, useLocation } from './LocationContext'

const { listCities } = vi.hoisted(() => ({ listCities: vi.fn() }))
const { listAddresses } = vi.hoisted(() => ({ listAddresses: vi.fn() }))

vi.mock('../api/locations', () => ({ listCities }))
vi.mock('../api/addresses', () => ({ listAddresses }))
vi.mock('./AuthContext', () => ({
  useAuth: () => ({ isAuthenticated: false }),
}))

const CITIES = [
  { citySlug: 'bangalore', cityName: 'Bangalore' },
  { citySlug: 'mumbai', cityName: 'Mumbai' },
]

function Harness() {
  const { cities, activeCity, activeLocality, setActiveLocation } = useLocation()
  return (
    <div>
      <span data-testid="cities">{cities.map((c) => c.citySlug).join(',')}</span>
      <span data-testid="active">
        {activeCity ? `${activeCity.citySlug}:${activeLocality ?? ''}` : 'none'}
      </span>
      <button type="button" onClick={() => setActiveLocation('mumbai', 'Marine Drive')}>
        Pick Mumbai
      </button>
    </div>
  )
}

const renderProvider = () =>
  render(
    <LocationProvider>
      <Harness />
    </LocationProvider>,
  )

describe('LocationContext', () => {
  beforeEach(() => {
    listCities.mockReset().mockResolvedValue(CITIES)
    listAddresses.mockReset().mockResolvedValue([])
    localStorage.removeItem('fooddit.location')
  })

  it('loads cities and defaults the active location to the first city', async () => {
    renderProvider()
    expect(await screen.findByTestId('cities')).toHaveTextContent('bangalore,mumbai')
    await waitFor(() => expect(screen.getByTestId('active')).toHaveTextContent('bangalore:'))
  })

  it('persists a chosen location and restores it on remount', async () => {
    const first = renderProvider()
    await waitFor(() => expect(screen.getByTestId('active')).toHaveTextContent('bangalore:'))
    await userEvent.click(screen.getByRole('button', { name: 'Pick Mumbai' }))
    await waitFor(() => expect(screen.getByTestId('active')).toHaveTextContent('mumbai:Marine Drive'))
    expect(JSON.parse(localStorage.getItem('fooddit.location'))).toEqual({
      citySlug: 'mumbai',
      locality: 'Marine Drive',
    })

    first.unmount()
    renderProvider()
    await waitFor(() => expect(screen.getByTestId('active')).toHaveTextContent('mumbai:Marine Drive'))
  })

  it('falls back to the first city when the stored city is not serviceable', async () => {
    localStorage.setItem('fooddit.location', JSON.stringify({ citySlug: 'atlantis', locality: null }))
    renderProvider()
    await waitFor(() => expect(screen.getByTestId('active')).toHaveTextContent('bangalore:'))
  })
})