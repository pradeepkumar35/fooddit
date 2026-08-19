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
 * A review as a zine sticker: vote chips on a ticket stub, a stamp avatar,
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
  const tilt = ['-rotate-[0.4deg]', 'rotate-[0.3deg]', '-rotate-[0.5deg]', 'rotate-[0.4deg]'][
    Math.abs(review.author.name.length) % 4
  ]

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
    <article className={`sticker relative p-4 ${tilt} cursor-pointer`}>
      <span className="tape" aria-hidden="true" />
      <div className="flex gap-3">
        <div className="w-16 shrink-0 border-2 border-r-[3px] border-r-dashed border-ink bg-canvas/60 p-1.5">
          <VoteControl
            votableType="REVIEW"
            votableId={review.id}
            initialScore={review.score}
            initialMyVote={review.myVote}
            size="sm"
          />
        </div>

        <div className="min-w-0 flex-1 break-words">
          <header className="flex flex-wrap items-center gap-2 text-sm">
            <span className="sticker grid h-8 w-8 -rotate-3 place-items-center bg-accent text-xs font-bold text-surface">
              {review.author.name.charAt(0).toUpperCase()}
            </span>
            <Link
              to={`/users/${review.author.id}`}
              className="font-bold text-ink transition-colors duration-150 hover:text-accent"
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
                  className="border-2 border-ink bg-surface px-2 py-1.5 text-xs font-bold uppercase tracking-wide text-muted shadow-card transition duration-150 hover:text-accent active:translate-x-0.5 active:translate-y-0.5 active:shadow-none"
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
                className="w-full resize-y border-2 border-ink bg-surface px-3 py-2 font-serif text-base leading-relaxed text-ink shadow-card focus:border-accent focus:outline-none"
              />
              {error && <p className="mt-1 text-xs font-semibold text-chili-600">{error}</p>}
              <div className="mt-1 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setEditing(false)}
                  className="px-3 py-2 text-sm text-muted transition-colors duration-150 hover:text-ink"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={saveEdit}
                  disabled={saving || !draft.trim()}
                  className="hard-btn border-2 bg-accent px-3 py-2 text-sm text-surface disabled:opacity-50"
                >
                  {saving && <Spinner />}
                  {saving ? 'Saving…' : 'Save'}
                </button>
              </div>
            </div>
          ) : (
            <p className="mt-2 break-words whitespace-pre-wrap font-serif text-lg leading-relaxed text-ink/85">
              {review.content}
            </p>
          )}
        </div>
      </div>

      <CommentThread reviewId={review.id} />
    </article>
  )
}