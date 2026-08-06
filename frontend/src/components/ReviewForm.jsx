import { useState } from 'react'
import { createReview } from '../api/restaurants'
import { useToast } from '../context/ToastContext'
import { apiErrorMessage, extractFieldErrors, hasFieldErrors } from '../utils/apiError'
import Spinner from './Spinner'

const STAR_LABELS = ['', 'Terrible', 'Poor', 'Average', 'Good', 'Excellent']

/**
 * Star picker + textarea for writing a review. Renders nothing special about
 * auth; the parent decides whether to show it.
 */
export default function ReviewForm({ restaurantId, onCreated }) {
  const notify = useToast()
  const [rating, setRating] = useState(0)
  const [hoverRating, setHoverRating] = useState(0)
  const [content, setContent] = useState('')
  const [fieldErrors, setFieldErrors] = useState({})
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async (event) => {
    event.preventDefault()
    if (rating < 1) {
      setFieldErrors({ rating: 'Please select a star rating.' })
      setError('')
      return
    }
    setFieldErrors({})
    setError('')
    setSubmitting(true)
    try {
      await createReview(restaurantId, { rating, content })
      notify('Review posted')
      setRating(0)
      setContent('')
      onCreated?.()
    } catch (err) {
      if (hasFieldErrors(err)) {
        setFieldErrors(extractFieldErrors(err))
        setError('')
      } else {
        setFieldErrors({})
        setError(apiErrorMessage(err, 'Failed to submit review.'))
      }
    } finally {
      setSubmitting(false)
    }
  }

  const displayed = hoverRating || rating

  return (
    <form onSubmit={handleSubmit} className="rounded-lg border border-line bg-surface p-4 shadow-card">
      <h2 className="font-display text-lg font-semibold text-ink">Write a review</h2>

      <div className="mt-3 flex items-center gap-2">
        <div className="flex" onMouseLeave={() => setHoverRating(0)}>
          {[1, 2, 3, 4, 5].map((value) => (
            <button
              key={value}
              type="button"
              onClick={() => setRating(value)}
              onMouseEnter={() => setHoverRating(value)}
              aria-label={`${value} stars`}
              className={`text-2xl leading-none transition duration-150 ease-out hover:scale-110 active:scale-90 ${
                value <= displayed ? 'text-basil-500' : 'text-ink-300 hover:text-basil-600'
              }`}
            >
              ★
            </button>
          ))}
        </div>
        <span className="text-sm text-muted">
          {rating > 0 ? STAR_LABELS[rating] : 'Select a rating'}
        </span>
      </div>
      {fieldErrors.rating && (
        <p className="mt-1 text-xs font-medium text-chili-600">{fieldErrors.rating}</p>
      )}

      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        maxLength={2000}
        rows={4}
        placeholder="What did you eat? How was the service? Would you go back?"
        className={`mt-3 w-full rounded-lg border px-3 py-2 text-sm text-ink placeholder:text-muted transition-colors duration-150 focus:border-accent ${
          fieldErrors.content ? 'border-chili-500' : 'border-line'
        }`}
      />
      <div className="mt-1 text-right text-xs text-muted">{content.length}/2000</div>
      {fieldErrors.content && (
        <p className="mt-1 text-xs font-medium text-chili-600">{fieldErrors.content}</p>
      )}

      {error && (
        <div className="animate-fade-slide-in mt-2 rounded-lg border border-chili-500/40 bg-surface px-3 py-2 text-sm text-chili-600">
          {error}
        </div>
      )}

      <button
        type="submit"
        disabled={submitting}
        className="mt-3 flex items-center gap-2 rounded-lg bg-accent px-4 py-2 text-sm font-medium text-surface transition duration-150 ease-out hover:bg-accent/90 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
      >
        {submitting && <Spinner />}
        {submitting ? 'Submitting…' : 'Post review'}
      </button>
    </form>
  )
}
