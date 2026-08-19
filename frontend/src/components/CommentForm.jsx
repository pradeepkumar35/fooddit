import { useState } from 'react'
import { apiErrorMessage } from '../utils/apiError'
import Spinner from './Spinner'

/**
 * Textarea form used for both top-level comments and inline replies.
 * {@code onSubmit} receives the trimmed content and should reject (throw) when
 * posting fails; {@code onSubmitted} fires after a successful post so parents
 * can close an inline reply form.
 */
export default function CommentForm({
  placeholder,
  submitLabel = 'Post comment',
  autoFocus = false,
  onSubmit,
  onSubmitted,
  onCancel,
}) {
  const [content, setContent] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async (event) => {
    event.preventDefault()
    if (!content.trim()) return
    setError('')
    setSubmitting(true)
    try {
      await onSubmit(content)
      setContent('')
      onSubmitted?.()
    } catch (err) {
      setError(apiErrorMessage(err, 'Failed to post comment.'))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="mt-2 border-2 border-ink bg-surface p-3 shadow-card">
      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        maxLength={2000}
        rows={2}
        placeholder={placeholder}
        autoFocus={autoFocus}
        className="w-full resize-y border-2 border-ink bg-canvas px-3 py-2 font-serif text-base leading-relaxed text-ink placeholder:text-muted focus:border-accent focus:outline-none"
      />
      {error && <p className="mt-1 text-xs font-semibold text-chili-600">{error}</p>}
      <div className="mt-1 flex items-center justify-end gap-2">
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="px-3 py-2 text-sm text-muted transition-colors duration-150 hover:text-ink"
          >
            Cancel
          </button>
        )}
        <button
          type="submit"
          disabled={submitting || !content.trim()}
          className="hard-btn border-2 bg-accent px-3 py-2 text-sm text-surface disabled:cursor-not-allowed disabled:opacity-50"
        >
          {submitting && <Spinner />}
          {submitting ? 'Posting…' : submitLabel}
        </button>
      </div>
    </form>
  )
}
