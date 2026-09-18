import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import Pagination from './Pagination'

describe('Pagination jump box', () => {
  it('renders nothing when there is only one page', () => {
    const { container } = render(<Pagination page={0} totalPages={1} onPageChange={vi.fn()} />)
    expect(container).toBeEmptyDOMElement()
  })

  it('jumps straight to a typed page number on Enter', async () => {
    const onPageChange = vi.fn()
    render(<Pagination page={0} totalPages={530} onPageChange={onPageChange} />)

    await userEvent.type(screen.getByLabelText('Go to page'), '217{Enter}')

    // 1-based entry, 0-based page index.
    expect(onPageChange).toHaveBeenCalledWith(216)
  })

  it('clamps out-of-range entries and ignores the current page', async () => {
    const onPageChange = vi.fn()
    render(<Pagination page={5} totalPages={10} onPageChange={onPageChange} />)
    const box = screen.getByLabelText('Go to page')

    await userEvent.type(box, '999{Enter}')
    expect(onPageChange).toHaveBeenLastCalledWith(9)

    await userEvent.type(box, '0{Enter}')
    expect(onPageChange).toHaveBeenLastCalledWith(0)

    // Typing the page already open is a no-op.
    await userEvent.clear(box)
    await userEvent.type(box, '6{Enter}')
    expect(onPageChange).toHaveBeenCalledTimes(2)
  })

  it('keeps the Go button disabled until a number is typed', async () => {
    render(<Pagination page={0} totalPages={30} onPageChange={vi.fn()} />)
    const box = screen.getByLabelText('Go to page')
    const go = screen.getByRole('button', { name: 'Go' })

    expect(go).toBeDisabled()
    await userEvent.type(box, 'abc')
    expect(box).toHaveValue('')
    expect(go).toBeDisabled()

    await userEvent.type(box, '4')
    expect(go).toBeEnabled()
  })
})
