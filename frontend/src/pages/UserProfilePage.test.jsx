import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import UserProfilePage from './UserProfilePage'

const mockUser = {
  id: 'u1',
  name: 'Alice',
  email: 'alice@example.com',
  createdAt: '2026-01-01T00:00:00Z',
}

const profileWithComments = {
  user: mockUser,
  reviews: [],
  comments: [
    {
      id: 'c1',
      reviewId: 'rv1',
      restaurantId: 'r1',
      restaurantName: 'The Biryani Diaries',
      reviewContent: 'Great biryani and courteous staff.',
      content: 'Love the paneer here.',
      createdAt: '2026-01-02T00:00:00Z',
      editedAt: null,
      score: 3,
      myVote: null,
    },
  ],
}

const { getProfile, listSavedRestaurants } = vi.hoisted(() => ({
  getProfile: vi.fn(),
  listSavedRestaurants: vi.fn().mockResolvedValue([]),
}))

vi.mock('../api/users', () => ({ getProfile }))
vi.mock('../api/restaurants', () => ({ listSavedRestaurants }))
vi.mock('../hooks/useAuth', () => ({
  useAuth: () => ({ user: mockUser, isAuthenticated: true }),
}))

const renderAt = (path) =>
  render(
    <MemoryRouter initialEntries={[path]}>
      <UserProfilePage />
    </MemoryRouter>,
  )

describe('UserProfilePage comments tab', () => {
  beforeEach(() => {
    getProfile.mockReset()
  })

  it('renders comments with restaurant context when opened with ?tab=comments', async () => {
    getProfile.mockResolvedValue(profileWithComments)

    renderAt('/profile?tab=comments')

    expect(await screen.findByText('Love the paneer here.')).toBeInTheDocument()
    expect(screen.getByText('The Biryani Diaries')).toBeInTheDocument()
    const link = screen.getByRole('link', { name: 'The Biryani Diaries' })
    expect(link).toHaveAttribute('href', '/restaurants/r1')
    expect(screen.getByText('Great biryani and courteous staff.')).toBeInTheDocument()
  })

  it('shows the empty state when the user has no comments', async () => {
    getProfile.mockResolvedValue({ user: mockUser, reviews: [], comments: [] })

    renderAt('/profile?tab=comments')

    expect(await screen.findByText('No comments yet')).toBeInTheDocument()
  })

  it('switches to the comments tab when the tab is clicked', async () => {
    getProfile.mockResolvedValue(profileWithComments)

    renderAt('/profile')

    await userEvent.click(await screen.findByRole('button', { name: 'Comments' }))

    expect(await screen.findByText('Love the paneer here.')).toBeInTheDocument()
  })
})
