import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'

// jsdom has no EventSource; the live-stream hook must degrade gracefully.
class FakeEventSource {
  constructor() {}
  addEventListener() {}
  close() {}
}
vi.stubGlobal('EventSource', FakeEventSource)

vi.mock('../api/restaurants', () => ({
  getRestaurant: vi.fn(),
  getRestaurantStats: vi.fn(),
  listReviews: vi.fn(),
  createReview: vi.fn(),
  updateReview: vi.fn(),
  saveRestaurant: vi.fn(),
  unsaveRestaurant: vi.fn(),
}))
vi.mock('../api/users', () => ({ fetchReputations: vi.fn().mockResolvedValue({ u1: 128 }) }))
vi.mock('../lib/live', () => ({ subscribe: vi.fn(() => () => {}) }))
vi.mock('../api/comments', () => ({
  getThread: vi.fn().mockResolvedValue([]),
  createComment: vi.fn(),
  updateComment: vi.fn(),
  deleteComment: vi.fn(),
}))
vi.mock('../hooks/useAuth', () => ({
  useAuth: () => ({ isAuthenticated: true, user: { id: 'u9', name: 'Tester' } }),
}))

import RestaurantDetailPage from './RestaurantDetailPage'
import { ToastProvider } from '../context/ToastContext'
import {
  getRestaurant,
  getRestaurantStats,
  listReviews,
} from '../api/restaurants'

const SAMPLE_RESTAURANT = {
  id: 'r1',
  name: 'Copper & Curry',
  address: '12 Colaba Causeway',
  cuisineType: 'Biryani',
  priceRange: '₹₹',
  cityName: 'Mumbai',
  citySlug: 'mumbai',
  avgRating: 4.6,
  reviewCount: 2,
  saved: false,
}

const SAMPLE_REVIEWS = [
  {
    id: 'rev1',
    restaurantId: 'r1',
    author: { id: 'u1', name: 'Rohan K.' },
    rating: 5,
    content: 'Smoky rice, tender mutton.',
    createdAt: '2026-01-02T00:00:00Z',
    editedAt: null,
    score: 18,
    myVote: null,
  },
]

const SAMPLE_STATS = {
  rank: 4,
  tier: 'ELITE',
  distribution: { 5: 1 },
  reviewCount: 2,
  firstReviewedAt: '2025-03-01T00:00:00Z',
}

const renderDossier = () =>
  render(
    <MemoryRouter initialEntries={['/restaurants/r1']}>
      <ToastProvider>
        <Routes>
          <Route path="/restaurants/:id" element={<RestaurantDetailPage />} />
        </Routes>
      </ToastProvider>
    </MemoryRouter>,
  )

describe('RestaurantDetailPage — the Dossier', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    getRestaurant.mockResolvedValue(SAMPLE_RESTAURANT)
    getRestaurantStats.mockResolvedValue(SAMPLE_STATS)
    listReviews.mockResolvedValue(SAMPLE_REVIEWS)
  })

  it('mounts and renders the full dossier for /restaurants/r1', async () => {
    renderDossier()

    expect(await screen.findByRole('heading', { level: 1 })).toBeInTheDocument()
    expect(screen.getByText(/12 Colaba Causeway/)).toBeInTheDocument()
    expect(screen.getByText('#4')).toBeInTheDocument()
    expect(await screen.findByText('Smoky rice, tender mutton.')).toBeInTheDocument()
    expect(screen.getByText(/REP 128/)).toBeInTheDocument()
  })

  it('survives the reviews-before-restaurant race (empty-array is truthy!)', async () => {
    // Unreviewed restaurants: listReviews resolves instantly with [], while
    // getRestaurant is still in flight. The old guard `(!restaurant && !reviews)`
    // released the skeleton on the truthy [] and crashed on restaurant.name.
    let resolveRestaurant
    getRestaurant.mockImplementation(
      () => new Promise((resolve) => { resolveRestaurant = resolve }),
    )
    listReviews.mockResolvedValue([])

    renderDossier()

    // Reviews ([] already) landed; the page must still be skeletoning — not
    // crashed — while the restaurant payload is in flight.
    await new Promise((r) => setTimeout(r, 30))
    expect(document.querySelector('.skeleton')).not.toBeNull()

    resolveRestaurant(SAMPLE_RESTAURANT)
    expect(await screen.findByRole('heading', { level: 1 })).toBeInTheDocument()
    expect(screen.getByText(/No reviews yet/)).toBeInTheDocument()
  })
})