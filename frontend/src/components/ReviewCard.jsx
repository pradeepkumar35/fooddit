import { useState } from 'react'
import { Link } from 'react-router-dom'
import { updateReview } from '../api/restaurants'
import { useAuth } from '../hooks/useAuth'
import { formatRelativeTime } from '../utils/time'
import { apiErrorMessage } from '../utils/apiError'
import CommentThread from './CommentThread'
import ReportMenu from './ReportMenu'
import Spinner from './Spinner'
import VerdictDots from './VerdictDots'
import VoteControl from './VoteControl'

/**
 * A dossier review entry: rotated stamp avatar with initials, author name +
 * lifetime REP badge, mono timestamp, dot-scale verdict, serif body, bordered
 * vote cluster and action row; the whole threaded discussion unfolds beneath
 * under a dashed rule.
 */
export default function ReviewCard({ review, rep, onUpdated }) {
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
    <article className="panel-hair p-5">
      <div className="flex flex-wrap items-center gap-3">
        <span
          aria-hidden="true"
          className="grid h-11 w-11 shrink-0 -rotate-[5deg] place-items-center rounded-full font-mono text-sm font-bold text-white"
          style={{ background: 'linear-gradient(140deg,#33415C,#1C2430)' }}
        >
          {review.author.name.charAt(0).toUpperCase()}
        </span>
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <Link
              to={`/users/${review.author.id}`}
              className="text-sm font-bold text-ink transition-colors duration-150 hover:text-emerald"
            >
              {review.author.name}
            </Link>
            {typeof rep === 'number' && (
              <span
                title="Lifetime net upvotes across this reviewer's reviews and comments"
                className="num border border-gold px-1.5 py-px text-[10px] font-semibold tracking-wide text-gold"
              >
                REP {rep}
              </span>
            )}
            <span className="num text-xs text-muted">{formatRelativeTime(review.createdAt)}</span>
            {review.editedAt && <span className="text-[10px] italic text-muted">(edited)</span>}
          </div>
        </div>
        <span className="ml-auto">
          <VerdictDots value={review.rating} />
        </span>
      </div>

      {editing ? (
        <div className="animate-fade-slide-in mt-3">
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            maxLength={2000}
            rows={4}
            autoFocus
            className="w-full resize-y border-[1.5px] border-hair bg-paper px-3 py-2 font-serif text-base leading-relaxed text-ink focus:border-ink focus:outline-none"
          />
          {error && <p className="mt-1 text-xs font-semibold text-down">{error}</p>}
          <div className="mt-2 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => setEditing(false)}
              className="px-3 py-2 text-xs font-semibold uppercase tracking-wide text-muted transition-colors duration-150 hover:text-ink"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={saveEdit}
              disabled={saving || !draft.trim()}
              className="btn-hard btn-hard-primary px-3.5 py-2 text-xs disabled:opacity-50"
            >
              {saving && <Spinner />}
              {saving ? 'Saving…' : 'Save'}
            </button>
          </div>
        </div>
      ) : (
        <p className="mt-3 break-words whitespace-pre-wrap font-serif text-[15.5px] leading-relaxed text-ink/90">
          {review.content}
        </p>
      )}

      <div className="mt-4 flex flex-wrap items-center gap-2.5">
        <VoteControl
          votableType="REVIEW"
          votableId={review.id}
          initialScore={review.score}
          initialMyVote={review.myVote}
          size="sm"
        />
        {isAuthor && !editing && (
          <button
            type="button"
            onClick={startEdit}
            className="border border-hair px-2.5 py-1.5 text-[11.5px] font-semibold text-muted transition duration-150 hover:border-ink hover:text-ink"
          >
            Edit
          </button>
        )}
        {!isAuthor && <ReportMenu targetType="REVIEW" targetId={review.id} />}
      </div>

      <CommentThread reviewId={review.id} />
    </article>
  )
}