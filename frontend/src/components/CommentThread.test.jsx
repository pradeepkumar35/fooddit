import { render, screen, act } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import CommentThread from './CommentThread'

const mocks = vi.hoisted(() => {
  const handlers = {}
  const subscribe = vi.fn((event, handler) => {
    handlers[event] = handler
    return () => {}
  })
  const getThread = vi.fn()
  const createComment = vi.fn()
  return { subscribe, handlers, getThread, createComment }
})

vi.mock('../api/comments', () => ({ getThread: mocks.getThread, createComment: mocks.createComment }))
vi.mock('../api/votes', () => ({ castVote: vi.fn() }))
vi.mock('../api/reports', () => ({ createReport: vi.fn() }))
vi.mock('../context/ToastContext', () => ({ useToast: () => vi.fn() }))
vi.mock('../lib/live', () => ({ subscribe: mocks.subscribe }))
vi.mock('../hooks/useAuth', () => ({
  useAuth: () => ({ isAuthenticated: false, user: null }),
}))
vi.mock('../hooks/useIsDesktop', () => ({ default: () => false }))

const rootComment = () => ({
  id: 'c1',
  reviewId: '5',
  parentCommentId: null,
  author: { id: 'u1', name: 'Alice' },
  content: 'First comment!',
  createdAt: '2026-01-01T00:00:00Z',
  editedAt: null,
  deleted: false,
  replies: [],
  score: 1,
  myVote: null,
})

const renderThread = () =>
  render(
    <MemoryRouter>
      <CommentThread reviewId="5" />
    </MemoryRouter>,
  )

describe('CommentThread live updates', () => {
  beforeEach(() => {
    mocks.subscribe.mockClear()
    mocks.getThread.mockReset()
    mocks.createComment.mockReset()
    delete mocks.handlers['comment.created']
  })

  it('subscribes to the live stream even when the thread is empty, so the very first comment appears without a reload', async () => {
    mocks.getThread.mockResolvedValueOnce([])
    renderThread()

    // The thread renders its empty state and is subscribed from the start,
    // independent of whether any comments exist yet.
    expect(await screen.findByText('No comments yet')).toBeInTheDocument()
    expect(mocks.getThread).toHaveBeenCalledTimes(1)
    expect(typeof mocks.handlers['comment.created']).toBe('function')

    // A brand-new first comment arrives over the restaurant's SSE stream.
    mocks.getThread.mockResolvedValueOnce([rootComment()])
    await act(async () => {
      mocks.handlers['comment.created']({ reviewId: '5' })
    })

    // It appears in the DOM without any page reload — exactly like a second or
    // third comment after it already does.
    expect(await screen.findByText('First comment!')).toBeInTheDocument()
    expect(mocks.getThread).toHaveBeenCalledTimes(2)
  })

  it('ignores comment events for other reviews', async () => {
    mocks.getThread.mockResolvedValueOnce([])
    renderThread()
    await screen.findByText('No comments yet')
    expect(mocks.getThread).toHaveBeenCalledTimes(1)

    await act(async () => {
      mocks.handlers['comment.created']({ reviewId: 'other-review' })
    })
    expect(mocks.getThread).toHaveBeenCalledTimes(1)
  })
})