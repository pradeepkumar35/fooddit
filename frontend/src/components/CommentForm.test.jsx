import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import CommentForm from './CommentForm'

describe('CommentForm', () => {
  it('submits content and notifies the parent', async () => {
    const user = userEvent.setup()
    const onSubmit = vi.fn().mockResolvedValue()
    const onSubmitted = vi.fn()

    render(<CommentForm placeholder="Add a comment" onSubmit={onSubmit} onSubmitted={onSubmitted} />)
    await user.type(screen.getByPlaceholderText('Add a comment'), 'hello there')
    await user.click(screen.getByRole('button', { name: 'Post comment' }))

    await waitFor(() => expect(onSubmit).toHaveBeenCalledWith('hello there'))
    await waitFor(() => expect(onSubmitted).toHaveBeenCalled())
  })

  it('shows the specific content error instead of the generic summary', async () => {
    const user = userEvent.setup()
    const onSubmit = vi.fn().mockRejectedValue({
      response: {
        data: {
          message: 'Validation failed',
          fieldErrors: { content: 'Comment text is required' },
        },
      },
    })

    render(<CommentForm placeholder="Add a comment" onSubmit={onSubmit} />)
    await user.type(screen.getByPlaceholderText('Add a comment'), 'x')
    await user.click(screen.getByRole('button', { name: 'Post comment' }))

    expect(await screen.findByText('Comment text is required')).toBeInTheDocument()
    expect(screen.queryByText('Validation failed')).not.toBeInTheDocument()
    expect(screen.queryByText('Failed to post comment.')).not.toBeInTheDocument()
  })

  it('disables submit until there is content', async () => {
    render(<CommentForm placeholder="Add a comment" onSubmit={vi.fn()} />)

    const button = screen.getByRole('button', { name: 'Post comment' })
    expect(button).toBeDisabled()
  })
})
