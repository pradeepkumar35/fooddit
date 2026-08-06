import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import ReviewForm from './ReviewForm'

const { createReview } = vi.hoisted(() => ({ createReview: vi.fn() }))

vi.mock('../api/restaurants', () => ({ createReview }))

const VALIDATION_ERROR = {
  response: {
    data: {
      message: 'Validation failed',
      fieldErrors: { content: 'Review text is required' },
    },
  },
}

describe('ReviewForm', () => {
  beforeEach(() => {
    createReview.mockReset()
  })

  it('submits the selected rating and content', async () => {
    const user = userEvent.setup()
    createReview.mockResolvedValue({})

    render(<ReviewForm restaurantId="r1" />)
    await user.click(screen.getByRole('button', { name: '5 stars' }))
    await user.type(screen.getByPlaceholderText(/what did you eat/i), 'Great food')
    await user.click(screen.getByRole('button', { name: 'Post review' }))

    await waitFor(() =>
      expect(createReview).toHaveBeenCalledWith('r1', { rating: 5, content: 'Great food' }),
    )
  })

  it('keeps the max-length validation but hides the visible character counter', async () => {
    const user = userEvent.setup()

    render(<ReviewForm restaurantId="r1" />)
    const textarea = screen.getByPlaceholderText(/what did you eat/i)
    expect(textarea).toHaveAttribute('maxlength', '2000')

    await user.type(textarea, 'Large but still validated')

    // No `/2000` (or any) character counter should be rendered.
    expect(screen.queryByText(/\/2000/)).not.toBeInTheDocument()
    expect(screen.queryByText(/characters/)).not.toBeInTheDocument()
    expect(textarea).toHaveAttribute('maxlength', '2000')
  })

  it('shows the specific content error instead of the generic "Validation failed" summary', async () => {
    const user = userEvent.setup()
    createReview.mockRejectedValue(VALIDATION_ERROR)

    render(<ReviewForm restaurantId="r1" />)
    await user.click(screen.getByRole('button', { name: '5 stars' }))
    await user.click(screen.getByRole('button', { name: 'Post review' }))

    expect(await screen.findByText('Review text is required')).toBeInTheDocument()
    expect(screen.queryByText('Validation failed')).not.toBeInTheDocument()
    expect(screen.queryByText('Failed to submit review.')).not.toBeInTheDocument()
  })

  it('shows a rating error near the stars when no rating is selected', async () => {
    const user = userEvent.setup()

    render(<ReviewForm restaurantId="r1" />)
    await user.type(screen.getByPlaceholderText(/what did you eat/i), 'No stars yet')
    await user.click(screen.getByRole('button', { name: 'Post review' }))

    expect(screen.getByText('Please select a star rating.')).toBeInTheDocument()
    expect(createReview).not.toHaveBeenCalled()
  })

  it('falls back to the request message for non-field errors', async () => {
    const user = userEvent.setup()
    createReview.mockRejectedValue({ response: { data: { message: 'Something else went wrong' } } })

    render(<ReviewForm restaurantId="r1" />)
    await user.click(screen.getByRole('button', { name: '4 stars' }))
    await user.type(screen.getByPlaceholderText(/what did you eat/i), 'Nice')
    await user.click(screen.getByRole('button', { name: 'Post review' }))

    expect(await screen.findByText('Something else went wrong')).toBeInTheDocument()
  })
})
