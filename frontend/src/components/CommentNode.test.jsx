import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import CommentNode from './CommentNode'

const { deleteComment, updateComment, useAuth } = vi.hoisted(() => ({
  deleteComment: vi.fn(),
  updateComment: vi.fn(),
  useAuth: vi.fn(),
}))

vi.mock('../api/comments', () => ({ deleteComment, updateComment }))
vi.mock('../api/reports', () => ({ createReport: vi.fn() }))
vi.mock('../api/votes', () => ({ castVote: vi.fn() }))
vi.mock('../context/ToastContext', () => ({ useToast: () => vi.fn() }))
vi.mock('../lib/live', () => ({ subscribe: () => () => {} }))
vi.mock('../hooks/useAuth', () => ({ useAuth }))

const author = { id: 'me', name: 'Alice' }
const baseComment = (overrides = {}) => ({
  id: 'c1',
  reviewId: '5',
  parentCommentId: null,
  author,
  content: 'Paneer was excellent',
  createdAt: '2026-01-01T00:00:00Z',
  editedAt: null,
  deleted: false,
  replies: [],
  score: 2,
  myVote: null,
  ...overrides,
})

const renderNode = (comment, props = {}) =>
  render(
    <MemoryRouter>
      <CommentNode comment={comment} reviewId="5" onReply={vi.fn()} onUpdated={vi.fn()} {...props} />
    </MemoryRouter>,
  )

describe('CommentNode', () => {
  beforeEach(() => {
    deleteComment.mockReset().mockResolvedValue({ deleted: true })
    updateComment.mockReset().mockResolvedValue({})
  })

  it('renders the author name and content for a live comment', () => {
    useAuth.mockReturnValue({ isAuthenticated: true, user: { id: 'me' } })
    renderNode(baseComment())

    expect(screen.getByText('Alice')).toBeInTheDocument()
    expect(screen.getByText('Paneer was excellent')).toBeInTheDocument()
  })

  it('renders a [deleted] placeholder and hides all actions for a deleted comment', () => {
    useAuth.mockReturnValue({ isAuthenticated: true, user: { id: 'me' } })
    renderNode(baseComment({ deleted: true }))

    expect(screen.getAllByText('[deleted]')).toHaveLength(2)
    expect(screen.queryByText('Alice')).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Reply' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Edit' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Delete' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /upvote/i })).not.toBeInTheDocument()
  })

  it('shows Edit and Delete only to the author', () => {
    useAuth.mockReturnValue({ isAuthenticated: true, user: { id: 'me' } })
    renderNode(baseComment())

    expect(screen.getByRole('button', { name: 'Edit' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Delete' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'More actions' })).not.toBeInTheDocument()
  })

  it('shows the report menu and not Edit/Delete to a non-author', () => {
    useAuth.mockReturnValue({ isAuthenticated: true, user: { id: 'someone-else' } })
    renderNode(baseComment())

    expect(screen.getByRole('button', { name: 'More actions' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Edit' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Delete' })).not.toBeInTheDocument()
  })

  it('deletes its own comment and refreshes the thread', async () => {
    useAuth.mockReturnValue({ isAuthenticated: true, user: { id: 'me' } })
    const onUpdated = vi.fn()
    renderNode(baseComment(), { onUpdated })

    await userEvent.click(screen.getByRole('button', { name: 'Delete' }))

    await waitFor(() => expect(deleteComment).toHaveBeenCalledWith('5', 'c1'))
    await waitFor(() => expect(onUpdated).toHaveBeenCalled())
  })

  it('opens the single per-thread reply form via the toggle', async () => {
    useAuth.mockReturnValue({ isAuthenticated: true, user: { id: 'me' } })
    const onToggleReply = vi.fn()
    renderNode(baseComment(), { onToggleReply })

    await userEvent.click(screen.getByRole('button', { name: 'Reply' }))

    expect(onToggleReply).toHaveBeenCalledWith('c1')
  })
})