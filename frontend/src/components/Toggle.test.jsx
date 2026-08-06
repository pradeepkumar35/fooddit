import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import Toggle from './Toggle'

describe('Toggle', () => {
  it('reports its state and flips on click', async () => {
    const onChange = vi.fn()
    render(<Toggle checked={false} onChange={onChange} label="Review replies" />)

    const button = screen.getByRole('switch', { name: 'Review replies' })
    expect(button).toHaveAttribute('aria-checked', 'false')

    await userEvent.click(button)
    expect(onChange).toHaveBeenCalledWith(true)
  })

  it('renders the checked state', () => {
    render(<Toggle checked onChange={() => {}} label="Comment replies" />)
    expect(screen.getByRole('switch', { name: 'Comment replies' })).toHaveAttribute('aria-checked', 'true')
  })
})
