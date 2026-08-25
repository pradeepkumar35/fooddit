import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import RestaurantListPage from './RestaurantListPage'

const rows = [
  {
    id: 'r1',
    name: 'Dosa Dynasty',
    cuisineType: 'South Indian',
    cuisines: ['South Indian'],
    locality: 'T. Nagar',
    cityName: 'Chennai',
    citySlug: 'chennai',
    avgRating: 4.5,
    reviewCount: 2,
    rank: 3,
    tier: 'ELITE',
    commentCount: 12,
    lastActivityAt: '2026-01-02T00:00:00Z',
    latestReview: { authorName: 'Ravi', rating: 5, content: 'Crispest dosas around.', createdAt: '2026-01-01T00:00:00Z' },
    monthlyVotes: 4,
    saved: false,
  },
  {
    id: 'r2',
    name: 'The Biryani Diaries',
    cuisineType: 'Hyderabadi',
    locality: 'Marina Beach Rd',
    cityName: 'Chennai',
    citySlug: 'chennai',
    avgRating: 4.1,
    reviewCount: 1,
    rank: 7,
    tier: 'GREAT',
    commentCount: 3,
    lastActivityAt: null,
    latestReview: null,
    monthlyVotes: 0,
    saved: false,
  },
]

const pageEnvelope = (content) => ({
  content,
  page: 0,
  size: 30,
  totalElements: content.length,
  totalPages: 1,
})

const { fetchLedger, listRestaurants, listCuisines } = vi.hoisted(() => ({
  fetchLedger: vi.fn(),
  listRestaurants: vi.fn(),
  listCuisines: vi.fn(),
}))
const { listLocalities } = vi.hoisted(() => ({ listLocalities: vi.fn() }))
const setActiveLocation = vi.fn()

vi.mock('../api/restaurants', () => ({ fetchLedger, listRestaurants, listCuisines }))
vi.mock('../api/locations', () => ({ listLocalities }))
vi.mock('../hooks/useAuth', () => ({
  useAuth: () => ({ user: { id: 'u1', name: 'Alice' }, isAuthenticated: false }),
}))
vi.mock('../hooks/useLocation', () => ({
  useLocation: () => ({
    activeCity: { citySlug: 'chennai', cityName: 'Chennai' },
    activeLocality: null,
    setActiveLocation,
    setSwitcherOpen: vi.fn(),
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

describe('RestaurantListPage — the City Ledger', () => {
  beforeEach(() => {
    fetchLedger.mockReset().mockResolvedValue(pageEnvelope(rows))
    listRestaurants.mockReset().mockResolvedValue(rows)
    listCuisines.mockReset().mockResolvedValue(['South Indian', 'Hyderabadi'])
    listLocalities.mockReset().mockResolvedValue([])
    setActiveLocation.mockReset()
  })

  it('renders enriched ledger rows with rank, tier seal and discussion co-headline', async () => {
    renderAt('/')
    expect(await screen.findByText('Dosa Dynasty')).toBeInTheDocument()

    expect(fetchLedger).toHaveBeenCalledTimes(1)
    const firstCall = fetchLedger.mock.calls.at(-1)[0]
    expect(firstCall.city).toBe('chennai')
    expect(firstCall.sort).toBe('mostdiscussed')
    expect(firstCall.size).toBe(30)

    // Context column
    expect(screen.getByText('3', { selector: '.num b' })).toBeInTheDocument()
    // Discussion co-headline: snippet + comment count + activity
    expect(screen.getByText(/Crispest dosas around/)).toBeInTheDocument()
    expect(screen.getByText('💬 12')).toBeInTheDocument()
  })

  it('keeps Most discussed as the default sort with equal alternatives', async () => {
    renderAt('/')
    await screen.findByText('Dosa Dynasty')

    const sortRow = screen.getByRole('button', { name: 'Most discussed' })
    expect(sortRow).toHaveAttribute('aria-pressed', 'true')

    await userEvent.click(screen.getByRole('button', { name: 'Newest' }))
    const lastCall = fetchLedger.mock.calls.at(-1)[0]
    expect(lastCall.sort).toBe('new')
    // Switching sort resets to the first page.
    expect(lastCall.page).toBe(0)
  })

  it('sends cuisine and minimum-rating filters to the paginated query', async () => {
    renderAt('/?cuisine=South%20Indian&rating=4&locality=T.%20Nagar')
    await screen.findByText('Dosa Dynasty')

    const params = fetchLedger.mock.calls.at(-1)[0]
    expect(params.cuisine).toBe('South Indian')
    expect(params.rating).toBe('4')
    expect(params.locality).toBe('T. Nagar')

    await userEvent.selectOptions(screen.getByRole('combobox', { name: 'Filter by cuisine' }), 'South Indian')
    expect(fetchLedger.mock.calls.at(-1)[0].cuisine).toBe('South Indian')
    expect(fetchLedger.mock.calls.at(-1)[0].page).toBe(0)

    await userEvent.selectOptions(screen.getByRole('combobox', { name: 'Filter by rating' }), '3')
    expect(fetchLedger.mock.calls.at(-1)[0].rating).toBe('3')
  })

  it('walks pages through the pager control instead of slicing client-side', async () => {
    fetchLedger.mockResolvedValue({ ...pageEnvelope(rows), totalElements: 60, totalPages: 2 })
    renderAt('/?page=0')
    await screen.findByText('Dosa Dynasty')

    await userEvent.click(screen.getByRole('button', { name: 'Next ›' }))
    expect(await screen.findByText('Dosa Dynasty')).toBeInTheDocument()
    expect(fetchLedger.mock.calls.at(-1)[0].page).toBe(1)
  })

  it('shows an empty-ledger state when a city has no matching entries', async () => {
    fetchLedger.mockResolvedValue(pageEnvelope([]))
    renderAt('/?city=atlantis')
    expect(await screen.findByText('Nothing on the ledger yet')).toBeInTheDocument()
  })

  it('expands a row into its newest-review preview and dossier link', async () => {
    renderAt('/')
    await screen.findByText('Dosa Dynasty')

    await userEvent.click(screen.getByRole('button', { name: /Show details for Dosa Dynasty/ }))

    // The preview appears both as the row teaser and inside the opened panel.
    const previews = await screen.findAllByText(/Crispest dosas around\./)
    expect(previews.length).toBeGreaterThanOrEqual(1)
    expect(screen.getByRole('link', { name: /Open the dossier →/ })).toHaveAttribute(
      'href',
      '/restaurants/r1',
    )
  })

  it('reads deep links from the URL without clobbering them', async () => {
    renderAt('/?city=chennai&sort=rating&page=2')
    await screen.findByText('Dosa Dynasty')
    const params = fetchLedger.mock.calls.at(-1)[0]
    expect(params.city).toBe('chennai')
    expect(params.sort).toBe('rating')
    expect(params.page).toBe(2)
  })

  it('still serves the MAP secondary view from the full feed endpoint', async () => {
    renderAt('/?view=map')
    await screen.findByLabelText(/Map of restaurants in Chennai/)
    expect(listRestaurants).toHaveBeenCalled()
    expect(fetchLedger).not.toHaveBeenCalled()
  })
})