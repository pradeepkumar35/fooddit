import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import RestaurantListPage from './RestaurantListPage'

const restaurants = [
  {
    id: 'r1',
    name: 'Dosa Dynasty',
    address: '2 MG Road, Mumbai',
    cuisineType: 'South Indian',
    priceRange: '₹',
    cityName: 'Mumbai',
    citySlug: 'mumbai',
    avgRating: 4.5,
    reviewCount: 2,
    createdAt: '2026-01-01T00:00:00Z',
    saved: false,
  },
  {
    id: 'r2',
    name: 'The Biryani Diaries',
    address: '45 T. Nagar, Chennai',
    cuisineType: 'Hyderabadi',
    priceRange: '₹₹',
    cityName: 'Chennai',
    citySlug: 'chennai',
    avgRating: 4.1,
    reviewCount: 1,
    createdAt: '2026-01-02T00:00:00Z',
    saved: false,
  },
]

const { listRestaurants, listCuisines } = vi.hoisted(() => ({
  listRestaurants: vi.fn(),
  listCuisines: vi.fn(),
}))
const { listLocalities } = vi.hoisted(() => ({
  listLocalities: vi.fn(),
}))
const setActiveLocation = vi.fn()

vi.mock('../api/restaurants', () => ({ listRestaurants, listCuisines }))
vi.mock('../api/locations', () => ({ listLocalities }))
vi.mock('../hooks/useAuth', () => ({
  useAuth: () => ({ user: { id: 'u1', name: 'Alice' }, isAuthenticated: false }),
}))
vi.mock('../hooks/useLocation', () => ({
  useLocation: () => ({
    activeCity: { citySlug: 'chennai', cityName: 'Chennai' },
    activeLocality: null,
    setActiveLocation,
    cities: [
      { citySlug: 'chennai', cityName: 'Chennai' },
      { citySlug: 'mumbai', cityName: 'Mumbai' },
      { citySlug: 'delhi', cityName: 'Delhi' },
    ],
  }),
}))

const renderAt = (path) =>
  render(
    <MemoryRouter initialEntries={[path]}>
      <RestaurantListPage />
    </MemoryRouter>,
  )

describe('RestaurantListPage filters', () => {
  beforeEach(() => {
    listRestaurants.mockReset().mockResolvedValue(restaurants)
    listCuisines.mockReset().mockResolvedValue(['South Indian', 'Hyderabadi'])
    listLocalities.mockReset().mockResolvedValue(['MG Road', 'Marina Beach Rd'])
    setActiveLocation.mockReset()
  })

  it('shows cuisine, city, locality and rating selects with All- placeholders and no price filter', () => {
    renderAt('/')
    expect(screen.getByRole('combobox', { name: 'Filter by cuisine' })).toBeInTheDocument()
    expect(screen.getByRole('combobox', { name: 'Filter by city' })).toBeInTheDocument()
    expect(screen.getByRole('combobox', { name: 'Filter by locality' })).toBeInTheDocument()
    expect(screen.getByRole('combobox', { name: 'Filter by rating' })).toBeInTheDocument()
    expect(screen.getByRole('option', { name: 'All Cuisines' })).toBeInTheDocument()
    expect(screen.getByRole('option', { name: 'All Localities' })).toBeInTheDocument()
    expect(screen.getByRole('option', { name: 'All Ratings' })).toBeInTheDocument()
    expect(screen.queryByRole('combobox', { name: 'Filter by price' })).not.toBeInTheDocument()
  })

  it('defaults to the active city and sends it to the API', async () => {
    renderAt('/')
    await screen.findByText('2 restaurants')
    const lastCall = listRestaurants.mock.calls.at(-1)[0]
    expect(lastCall.city).toBe('chennai')
  })

  it('sends the selected city (slug) to the API and clears locality', async () => {
    renderAt('/?locality=Marina')
    await userEvent.selectOptions(screen.getByRole('combobox', { name: 'Filter by city' }), 'mumbai')
    const lastCall = listRestaurants.mock.calls.at(-1)[0]
    expect(lastCall.city).toBe('mumbai')
    expect(lastCall.locality).toBeUndefined()
  })

  it('sends the selected locality to the API', async () => {
    renderAt('/')
    await screen.findByText('2 restaurants')
    await userEvent.selectOptions(
      screen.getByRole('combobox', { name: 'Filter by locality' }),
      await screen.findByRole('option', { name: 'MG Road' }),
    )
    const lastCall = listRestaurants.mock.calls.at(-1)[0]
    expect(lastCall.locality).toBe('MG Road')
  })

  it('sends the selected rating threshold to the API', async () => {
    renderAt('/')
    await userEvent.selectOptions(screen.getByRole('combobox', { name: 'Filter by rating' }), '4')
    const lastCall = listRestaurants.mock.calls.at(-1)[0]
    expect(lastCall.rating).toBe('4')
  })

  it('reads city, locality, rating, search and sort filters from the URL', async () => {
    renderAt('/?city=chennai&locality=Marina&rating=3&q=biryani&sort=new')
    expect(await screen.findByText('2 restaurants')).toBeInTheDocument()
    const lastCall = listRestaurants.mock.calls.at(-1)[0]
    expect(lastCall.city).toBe('chennai')
    expect(lastCall.locality).toBe('Marina')
    expect(lastCall.rating).toBe('3')
    expect(lastCall.q).toBe('biryani')
    expect(lastCall.sort).toBe('new')
  })
})