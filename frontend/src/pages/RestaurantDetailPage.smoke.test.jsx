import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'

// jsdom has no EventSource; the live-stream hook must degrade gracefully.
class FakeEventSource {
  constructor() {}
  addEventListener() {}
  close() {}
}
vi.stubGlobal('EventSource', FakeEventSource)

const { sampleReviews } = vi.hoisted(() => ({
  sampleReviews: [
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
  ],
}))

vi.mock('../api/restaurants', () => ({
  getRestaurant: vi.fn().mockResolvedValue({
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
  }),
  getRestaurantStats: vi.fn().mockResolvedValue({
    rank: 4,
    tier: 'ELITE',
    distribution: { 5: 1 },
    reviewCount: 2,
    firstReviewedAt: '2025-03-01T00:00:00Z',
  }),
  listReviews: vi.fn().mockResolvedValue(sampleReviews),
  createReview: vi.fn(),
  updateReview: vi.fn(),
  saveRestaurant: vi.fn(),
  unsaveRestaurant: vi.fn(),
}))
vi.mock('../api/users', () => ({ fetchReputations: vi.fn().mockResolvedValue({ u1: 128 }) }))
vi.mock('../lib/live', () => ({ subscribe: vi.fn(() => () => {}) }))
vi.mock('../api/comments', () => ({ getThread: vi.fn().mockResolvedValue([]), createComment: vi.fn(), updateComment: vi.fn(), deleteComment: vi.fn() }))

import RestaurantDetailPage from './RestaurantDetailPage'
import { ToastProvider } from '../context/ToastContext'

vi.mock('../hooks/useAuth', () => ({
  useAuth: () => ({ isAuthenticated: true, user: { id: 'u9', name: 'Tester' } }),
}))

describe('RestaurantDetailPage — the Dossier', () => {
  it('mounts and renders the full dossier for /restaurants/r1', async () => {
    render(
      <MemoryRouter initialEntries={['/restaurants/r1']}>
        <ToastProvider>
          <Routes>
            <Route path="/restaurants/:id" element={<RestaurantDetailPage />} />
          </Routes>
        </ToastProvider>
      </MemoryRouter>,
    )

    expect(await screen.findByRole('heading', { level: 1 })).toBeInTheDocument()
    expect(screen.getByText(/12 Colaba Causeway/)).toBeInTheDocument()
    expect(screen.getByText('#4')).toBeInTheDocument()
    expect(await screen.findByText('Smoky rice, tender mutton.')).toBeInTheDocument()
    expect(screen.getByText(/REP 128/)).toBeInTheDocument()
  })
})