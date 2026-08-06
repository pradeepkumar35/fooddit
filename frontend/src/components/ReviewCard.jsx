import { useState } from 'react'
import { Link } from 'react-router-dom'
import { updateReview } from '../api/restaurants'
import { useAuth } from '../hooks/useAuth'
import { formatRelativeTime } from '../utils/time'
import { apiErrorMessage } from '../utils/apiError'
import CommentThread from './CommentThread'
import RatingStars from './RatingStars'
import ReportMenu from './ReportMenu'
import Spinner from './Spinner'
import VoteControl from './VoteControl'

/**
 * A review rendered as an expanded Reddit post: vote control on the left,
 * author/rating/timestamp metadata with an "(edited)" marker and a report menu,
 * the review text (inline-editable by its author), and the threaded comment
 * discussion directly below.
 */
export default function ReviewCard({ review, onUpdated }) {
  const { user } = useAuth()
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(review.content)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const isAuthor = user?.id === review.author.id

  const startEdit = () => {
    setDraft(review.content)
    setError('')
    setEditing(true)
  }

  const saveEdit = async () => {
    if (!draft.trim()) return
    setSaving(true)
    setError('')
    try {
      await updateReview(review.id, { content: draft.trim() })
      setEditing(false)
      onUpdated?.()
    } catch (err) {
      setError(apiErrorMessage(err, 'Failed to update review.'))
    } finally {
      setSaving(false)
    }
  }

  return (
    <article className="rounded-lg border border-line bg-surface p-4 shadow-card transition duration-150 ease-out hover:-translate-y-0.5 hover:border-accent/30 hover:shadow-card-hover">
      <div className="flex gap-3">
        <VoteControl
          votableType="REVIEW"
          votableId={review.id}
          initialScore={review.score}
          initialMyVote={review.myVote}
        />

        <div className="min-w-0 flex-1 break-words">
          <header className="flex flex-wrap items-center gap-2 text-sm">
            <Link
              to={`/users/${review.author.id}`}
              className="font-semibold text-ink transition-colors duration-150 hover:text-accent"
            >
              {review.author.name}
            </Link>
            <RatingStars value={review.rating} className="text-base" />
            <span className="text-muted">· {formatRelativeTime(review.createdAt)}</span>
            {review.editedAt && <span className="text-xs italic text-muted">(edited)</span>}
            <span className="ml-auto flex items-center gap-1">
              {isAuthor && !editing && (
                <button
                  type="button"
                  onClick={startEdit}
                  className="-mx-1 -my-2 rounded px-2 py-2 text-xs font-medium text-muted transition-colors duration-150 hover:text-accent"
                >
                  Edit
                </button>
              )}
              <ReportMenu targetType="REVIEW" targetId={review.id} />
            </span>
          </header>

          {editing ? (
            <div className="animate-fade-slide-in mt-2">
              <textarea
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                maxLength={2000}
                rows={4}
                autoFocus
                className="w-full resize-y rounded-lg border border-line bg-canvas px-3 py-2 text-sm text-ink transition-colors duration-150 focus:border-accent"
              />
              {error && <p className="mt-1 text-xs text-chili-600">{error}</p>}
              <div className="mt-1 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setEditing(false)}
                  className="rounded-lg px-3 py-2 text-sm text-muted transition-colors duration-150 hover:text-ink"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={saveEdit}
                  disabled={saving || !draft.trim()}
                  className="flex items-center gap-2 rounded-lg bg-accent px-3 py-2 text-sm font-medium text-surface transition duration-150 ease-out hover:bg-accent/90 active:scale-95 disabled:opacity-50"
                >
                  {saving && <Spinner />}
                  {saving ? 'Saving…' : 'Save'}
                </button>
              </div>
            </div>
          ) : (
            <p className="mt-2 break-words whitespace-pre-wrap text-base leading-relaxed text-ink/85">
              {review.content}
            </p>
          )}
        </div>
      </div>

      <CommentThread reviewId={review.id} />
    </article>
  )
}
