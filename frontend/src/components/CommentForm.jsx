import { useEffect, useRef, useState } from 'react'
import { createComment } from '../api/comments'
import Spinner from './Spinner'
import { apiErrorMessage } from '../utils/apiError'

/**
 * Reply/comment composition: hairline field on the paper tone, mono submit in
 * a hard-shadow primary button, inline error line. Validation stays enforced
 * (2000-char ceiling, non-empty) with NO visible character counter — the
 * browser's maxLength silently caps input.
 */
export default function CommentForm({
  placeholder = 'Write a comment…',
  submitLabel = 'Post comment',
  autoFocus = false,
  onSubmit,
  onSubmitted,
  onCancel,
}) {
  const [content, setContent] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const mounted = useRef(true)

  useEffect(() => () => {
    mounted.current = false
  }, [])

  const handleSubmit = async (event) => {
    event.preventDefault()
    if (submitting || !content.trim()) return
    setSubmitting(true)
    setError('')
    try {
      await onSubmit(content.trim())
      if (!mounted.current) return
      setContent('')
      onSubmitted?.()
    } catch (err) {
      if (mounted.current) setError(apiErrorMessage(err, 'Failed to post. Please try again.'))
    } finally {
      if (mounted.current) setSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="border border-hair bg-card p-3">
      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        maxLength={2000}
        rows={2}
        placeholder={placeholder}
        autoFocus={autoFocus}
        className="w-full resize-y border-[1.5px] border-hair bg-paper px-3 py-2 font-serif text-base leading-relaxed text-ink placeholder:text-muted transition-colors duration-150 focus:border-ink focus:outline-none"
      />
      {error && <p className="mt-1 text-xs font-semibold text-down">{error}</p>}
      <div className="mt-1.5 flex items-center justify-end gap-2">
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="px-3 py-2 text-xs font-semibold uppercase tracking-wide text-muted transition-colors duration-150 hover:text-ink"
          >
            Cancel
          </button>
        )}
        <button
          type="submit"
          disabled={submitting || !content.trim()}
          className="btn-hard btn-hard-primary px-3.5 py-2 text-xs disabled:opacity-50"
        >
          {submitting && <Spinner />}
          {submitting ? 'Posting…' : submitLabel}
        </button>
      </div>
    </form>
  )
}