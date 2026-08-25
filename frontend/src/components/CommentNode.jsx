import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { deleteComment, updateComment } from '../api/comments'
import { useAuth } from '../hooks/useAuth'
import { formatRelativeTime } from '../utils/time'
import { apiErrorMessage } from '../utils/apiError'
import CommentForm from './CommentForm'
import ReportMenu from './ReportMenu'
import Spinner from './Spinner'
import VoteControl from './VoteControl'

const countNodes = (nodes) => nodes.reduce((total, node) => total + 1 + countNodes(node.replies), 0)

// On mobile, subtrees deeper than this start collapsed so an 8-level thread
// isn't forced fully-expanded on a small screen (tap to open further).
const AUTO_COLLAPSE_DEPTH = { mobile: 4, desktop: Number.POSITIVE_INFINITY }

/**
 * One node in the discussion: an inset "reply card" tied to its parent by a
 * corner notch. Nesting does NOT grow per level — every reply sits at the same
 * fixed inset inside its parent's reply zone (the floor), and a mono depth
 * chip L1/L2/L3… carries the nesting signal from there. That keeps 8-level
 * threads single-column-safe on mobile with zero horizontal overflow.
 *
 * Each node has a collapse toggle that folds its whole subtree via an animated
 * grid-rows transition (replies stay mounted, just clipped) and shows the
 * folded reply count; inline editing for its author; delete for its author;
 * report menu for everyone else. Deleted nodes keep their row as "[deleted]"
 * so children stay intact, with all affordances hidden.
 *
 * Reply composition is owned by the parent thread: only one reply form is open
 * at a time across the whole thread ({@code openReplyId}/{@code onToggleReply}).
 * Newly posted comments flash in via {@code highlightId}.
 */
export default function CommentNode({
  comment,
  reviewId,
  onReply,
  onUpdated,
  highlightId = null,
  openReplyId = null,
  onToggleReply,
  depth = 0,
  isDesktop = false,
}) {
  const { isAuthenticated, user } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const hasReplies = comment.replies.length > 0
  const autoCollapseDepth = isDesktop ? AUTO_COLLAPSE_DEPTH.desktop : AUTO_COLLAPSE_DEPTH.mobile
  const [collapsed, setCollapsed] = useState(() => hasReplies && depth >= autoCollapseDepth)
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(comment.content)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState('')

  const highlighted = highlightId === comment.id
  const deleted = Boolean(comment.deleted)

  const childCount = countNodes(comment.replies)
  const isAuthor = user?.id === comment.author.id
  const replyOpen = openReplyId === comment.id

  const startReply = () => {
    if (!isAuthenticated) {
      navigate('/login', { state: { from: location } })
      return
    }
    onToggleReply(comment.id)
  }

  const saveEdit = async () => {
    if (!draft.trim()) return
    setSaving(true)
    setError('')
    try {
      await updateComment(reviewId, comment.id, { content: draft.trim() })
      setEditing(false)
      onUpdated?.()
    } catch (err) {
      setError(apiErrorMessage(err, 'Failed to update comment.'))
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!isAuthenticated || deleting) return
    setDeleting(true)
    setError('')
    try {
      await deleteComment(reviewId, comment.id)
      onUpdated?.()
    } catch (err) {
      setError(apiErrorMessage(err, 'Failed to delete comment.'))
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div className={highlighted ? 'animate-newflash' : ''}>
      <div className={`reply-notch relative rounded-xl border bg-paper ${deleted ? 'border-dashed opacity-70' : 'border-hair'}`}>
        <div className="flex flex-wrap items-center gap-2 px-3.5 pt-3">
          {/* Collapse toggle — always rendered; folds the whole subtree. */}
          <button
            type="button"
            onClick={() => setCollapsed((value) => !value)}
            aria-expanded={!collapsed}
            aria-label={collapsed ? 'Expand replies' : 'Collapse replies'}
            className="grid h-6 w-6 shrink-0 place-items-center border border-hair text-muted transition duration-150 hover:border-ink hover:text-ink active:translate-y-px"
          >
            <svg
              viewBox="0 0 24 24"
              className={`h-3 w-3 transition-transform duration-200 ease-in-out ${collapsed ? '-rotate-90' : ''}`}
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="m6 9 6 6 6-6" />
            </svg>
          </button>

          {!deleted && (
            <span
              aria-hidden="true"
              className="grid h-7 w-7 shrink-0 -rotate-2 place-items-center border border-hair bg-paper font-mono text-[11px] font-bold text-ink"
            >
              {comment.author.name.charAt(0).toUpperCase()}
            </span>
          )}

          {deleted ? (
            <span className="text-sm font-semibold text-muted">[deleted]</span>
          ) : (
            <Link
              to={`/users/${comment.author.id}`}
              className="text-sm font-bold text-ink transition-colors duration-150 hover:text-emerald"
            >
              {comment.author.name}
            </Link>
          )}

          <span className="num text-[10.5px] uppercase tracking-wider text-muted">
            {formatRelativeTime(comment.createdAt)}
          </span>
          {!deleted && comment.editedAt && <span className="text-[10px] italic text-muted">(edited)</span>}
          {collapsed && childCount > 0 && (
            <span className="num text-xs font-semibold text-muted">(+{childCount})</span>
          )}
          {depth > 0 && <span className="depth num ml-auto border-[1.5px] border-tierslate px-1.5 py-px text-[9.5px] font-semibold tracking-widest text-tierslate">L{depth}</span>}
        </div>

        {deleted ? (
          <p className="break-words px-3.5 pb-3 pt-1.5 text-sm italic leading-relaxed text-muted">[deleted]</p>
        ) : editing ? (
          <div className="animate-fade-slide-in px-3.5 pb-3 pt-2">
            <textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              maxLength={2000}
              rows={2}
              autoFocus
              className="w-full resize-y border-[1.5px] border-hair bg-card px-3 py-2 font-serif text-base leading-relaxed text-ink focus:border-ink focus:outline-none"
            />
            {error && <p className="mt-1 text-xs font-semibold text-down">{error}</p>}
            <div className="mt-1.5 flex items-center justify-end gap-2">
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
          <p className="break-words whitespace-pre-wrap px-3.5 pb-3 pt-1.5 text-sm leading-relaxed text-ink/90">
            {comment.content}
          </p>
        )}

        {!deleted && (
          <>
            <div className="flex flex-wrap items-center gap-2 px-3.5 pb-3.5">
              <VoteControl
                votableType="COMMENT"
                votableId={comment.id}
                initialScore={comment.score}
                initialMyVote={comment.myVote}
                size="sm"
              />
              <button
                type="button"
                onClick={startReply}
                className="border border-hair px-2.5 py-1.5 text-[11.5px] font-semibold text-muted transition duration-150 hover:border-ink hover:text-ink"
              >
                Reply
              </button>
              {isAuthor && !editing && (
                <button
                  type="button"
                  onClick={() => {
                    setDraft(comment.content)
                    setError('')
                    setEditing(true)
                  }}
                  className="border border-hair px-2.5 py-1.5 text-[11.5px] font-semibold text-muted transition duration-150 hover:border-ink hover:text-ink"
                >
                  Edit
                </button>
              )}
              {isAuthor && (
                <button
                  type="button"
                  onClick={handleDelete}
                  disabled={deleting}
                  className="flex items-center gap-1 border border-hair px-2.5 py-1.5 text-[11.5px] font-semibold text-muted transition duration-150 hover:border-down hover:text-down disabled:opacity-50"
                >
                  {deleting && <Spinner />}
                  {deleting ? 'Deleting…' : 'Delete'}
                </button>
              )}
              {!isAuthor && <ReportMenu targetType="COMMENT" targetId={comment.id} />}
            </div>

            {error && <p className="break-words px-3.5 pb-3 text-xs font-semibold text-down">{error}</p>}

            {replyOpen && (
              <div className="animate-fade-slide-in border-t border-dashed border-hair px-3.5 pb-3.5 pt-3">
                <CommentForm
                  placeholder={`Reply to ${comment.author.name}…`}
                  submitLabel="Reply"
                  autoFocus
                  onSubmit={(content) => onReply(comment.id, content)}
                  onSubmitted={() => onToggleReply(comment.id)}
                  onCancel={() => onToggleReply(comment.id)}
                />
              </div>
            )}
          </>
        )}
      </div>

      {hasReplies && (
        <div
          className={`grid transition-[grid-template-rows] duration-200 ease-in-out ${
            collapsed ? 'grid-rows-[0fr]' : 'grid-rows-[1fr]'
          }`}
        >
          <div className="min-h-0 overflow-hidden">
            {/* The floor: every nesting level sits at this same fixed inset —
               depth chips above carry the signal instead of shrinking columns. */}
            <div className="ml-4 space-y-2.5 pb-0.5 pt-2.5 md:ml-[26px]">
              {comment.replies.map((child) => (
                <CommentNode
                  key={child.id}
                  comment={child}
                  reviewId={reviewId}
                  onReply={onReply}
                  onUpdated={onUpdated}
                  highlightId={highlightId}
                  openReplyId={openReplyId}
                  onToggleReply={onToggleReply}
                  depth={depth + 1}
                  isDesktop={isDesktop}
                />
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}