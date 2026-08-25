import { useState } from 'react'
import { createReview } from '../api/restaurants'
import Spinner from './Spinner'
import { apiErrorMessage } from '../utils/apiError'

const STAR_LABELS = { 1: 'Awful', 2: 'Poor', 3: 'Good', 4: 'Great', 5: 'Exceptional' }

/**
 * The review composer on the Dossier: serif invitation, oversized star picker,
 * hairline field with INLINE field-level validation (rating + content) and no
 * visible character counter — maxLength stays enforced silently. Submit shows
 * a loading state while the request is in flight.
 */
export default function ReviewForm({ restaurantId, onCreated }) {
  const [rating, setRating] = useState(0)
  const [hoverRating, setHoverRating] = useState(0)
  const [content, setContent] = useState('')
  const [fieldErrors, setFieldErrors] = useState({})
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const displayed = hoverRating || rating

  const handleSubmit = async (event) => {
    event.preventDefault()
    if (!rating) {
      // Client-side: the star verdict is required before anything posts.
      setFieldErrors({ rating: 'Please select a star rating.' })
      return
    }

    setSubmitting(true)
    setError('')
    try {
      await createReview(restaurantId, { rating, content: content.trim() })
      onCreated?.()
    } catch (err) {
      if (err.response?.data?.fieldErrors) {
        setFieldErrors(err.response.data.fieldErrors)
      } else {
        setError(apiErrorMessage(err, 'Failed to submit review.'))
      }
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="panel p-5" aria-label="Write a review">
      <h3 className="font-serif text-lg font-semibold text-ink">Been here? Add your verdict.</h3>
      <p className="mt-1 text-sm font-medium text-muted">
        Rate what you ate — then the discussion starts under your review.
      </p>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <div className="flex" onMouseLeave={() => setHoverRating(0)}>
          {[1, 2, 3, 4, 5].map((value) => (
            <button
              key={value}
              type="button"
              onClick={() => setRating(value)}
              onMouseEnter={() => setHoverRating(value)}
              aria-label={`${value} stars`}
              className="p-1 text-3xl leading-none transition-transform duration-150 hover:-translate-y-0.5"
              style={{ color: value <= displayed ? 'var(--color-gold)' : 'var(--color-hair)' }}
            >
              ★
            </button>
          ))}
        </div>
        <span className="font-serif text-sm italic text-muted">
          {rating > 0 ? STAR_LABELS[rating] : 'Select a rating'}
        </span>
      </div>
      {fieldErrors.rating && (
        <p role="alert" className="mt-1 text-xs font-semibold text-down">
          {fieldErrors.rating}
        </p>
      )}

      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        maxLength={2000}
        rows={4}
        placeholder="What did you eat? How was the service? Would you go back?"
        className={`mt-3 w-full resize-y border-[1.5px] bg-paper px-3 py-2 font-serif text-base leading-relaxed text-ink placeholder:text-muted focus:outline-none ${
          fieldErrors.content ? 'border-down' : 'border-hair focus:border-ink'
        }`}
      />
      {fieldErrors.content && (
        <p role="alert" className="mt-1 text-xs font-semibold text-down">
          {fieldErrors.content}
        </p>
      )}

      {error && (
        <div role="alert" className="animate-fade-slide-in mt-3 border-[1.5px] border-down bg-card px-3 py-2 text-sm font-semibold text-down">
          {error}
        </div>
      )}

      <button type="submit" disabled={submitting} className="btn-hard btn-hard-primary mt-4 px-5 py-2.5 text-sm disabled:opacity-60">
        {submitting && <Spinner />}
        {submitting ? 'Posting…' : 'Post review'}
      </button>
    </form>
  )
}