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
    <form onSubmit={handleSubmit} className="mt-2">
      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        maxLength={2000}
        rows={2}
        placeholder={placeholder}
        autoFocus={autoFocus}
        className="w-full resize-y rounded-lg border border-line bg-surface px-3 py-2 text-sm text-ink placeholder:text-muted transition-colors duration-150 focus:border-accent"
      />
      {error && <p className="mt-1 text-xs text-chili-600">{error}</p>}
      <div className="mt-1 flex items-center justify-between">
        <span className="text-xs text-muted">{content.length}/2000</span>
        <div className="flex gap-2">
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              className="rounded-lg px-3 py-2 text-sm text-muted transition-colors duration-150 hover:text-ink"
            >
              Cancel
            </button>
          )}
          <button
            type="submit"
            disabled={submitting || !content.trim()}
            className="flex items-center gap-2 rounded-lg bg-accent px-3 py-2 text-sm font-medium text-surface transition duration-150 ease-out hover:bg-accent/90 active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {submitting && <Spinner />}
            {submitting ? 'Posting…' : submitLabel}
          </button>
        </div>
      </div>
    </form>
  )
}
