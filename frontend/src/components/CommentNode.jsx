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

// Indentation stops growing past these depths so deep threads can't push
// content off narrow screens; the vertical connector line carries the rest.
const MAX_INDENT_DEPTH = { mobile: 5, desktop: 8 }
// On mobile, subtrees deeper than this start collapsed so an 8-level thread
// isn't forced fully-expanded on a small screen (tap to open further).
const AUTO_COLLAPSE_DEPTH = { mobile: 4, desktop: Number.POSITIVE_INFINITY }

/**
 * A single node in the threaded comment tree, rendered as a zine reply card
 * (Direction D): a bordered "cardn" with a stamped avatar, an actions row of
 * chunky chips (vote / reply / edit / delete / report), and a reply form that
 * unfolds under a dashed rule. Nested replies sit under a thick colored rail
 * that cycles blue → orange → gold → red by depth, and each node has a collapse
 * toggle that folds its whole subtree closed via an animated grid-rows
 * transition (the replies stay mounted, just clipped), a chevron that rotates
 * on toggle, inline editing for its author, a delete action for its author,
 * and a report menu.
 *
 * Indentation is not a literal 1:1 map of depth: nested nodes compound a fixed
 * {@code var(--thread-indent)} step (8px below md, 24px at md+) so a depth-d
 * reply sits {@code min(d, cap) * step} from the thread's edge; the step drops
 * to zero past the cap (5 levels on mobile, 8 on desktop) so deeper replies
 * stop shifting right and the rail alone carries the nesting.
 * {@code isDesktop} also decides the auto-collapse threshold for very deep
 * threads.
 *
 * A deleted comment keeps its row so the reply tree stays intact: the author
 * name and content are replaced by a muted "[deleted]" placeholder and all
 * interactive affordances (vote, reply, edit, report, delete) are hidden, but
 * the collapse toggle and reply count remain so nested replies stay reachable.
 *
 * Reply composition is owned by the parent thread: only one reply form is open
 * at a time across the whole thread, selected via {@code openReplyId} /
 * {@code onToggleReply}. Newly posted comments are flagged via
 * {@code highlightId} so they animate into the thread.
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
  const maxIndentDepth = isDesktop ? MAX_INDENT_DEPTH.desktop : MAX_INDENT_DEPTH.mobile
  const autoCollapseDepth = isDesktop ? AUTO_COLLAPSE_DEPTH.desktop : AUTO_COLLAPSE_DEPTH.mobile
  // Each node contributes one fixed indent unit to its own row; the boxes nest,
  // so a depth-4 reply sits 4 * unit from the thread's edge. Past the cap the
  // step is zero and deeper replies stay at the same column.
  const indentStep = depth > 0 && depth <= maxIndentDepth ? 1 : 0
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

  const railColor = ['var(--color-up)', 'var(--color-accent)', 'var(--color-gold)', 'var(--color-down)'][depth % 4]

  return (
    <div
      className={`relative ${highlighted ? 'animate-fade-slide-in' : ''}`}
      style={{ paddingLeft: `calc(${indentStep} * var(--thread-indent))` }}
    >
      <div className={`cardn ${deleted ? 'cardn--deleted' : ''}`}>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setCollapsed((value) => !value)}
            aria-expanded={!collapsed}
            aria-label={collapsed ? 'Expand replies' : 'Collapse replies'}
            className="grid h-6 w-6 shrink-0 place-items-center border-2 border-ink bg-surface text-muted shadow-card transition duration-150 hover:bg-accent-soft hover:text-ink active:translate-x-0.5 active:translate-y-0.5 active:shadow-none"
          >
            <svg
              viewBox="0 0 24 24"
              className={`h-3 w-3 transition-transform duration-200 ease-in-out ${
                collapsed ? '-rotate-90' : ''
              }`}
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
              className="grid h-7 w-7 shrink-0 -rotate-2 place-items-center border-2 border-ink bg-basil-100 font-display text-xs font-semibold text-ink"
            >
              {comment.author.name.charAt(0).toUpperCase()}
            </span>
          )}

          {deleted ? (
            <span className="font-semibold text-muted">[deleted]</span>
          ) : (
            <Link
              to={`/users/${comment.author.id}`}
              className="text-sm font-bold text-ink transition-colors duration-150 hover:text-accent"
            >
              {comment.author.name}
            </Link>
          )}

          <span className="text-[10px] font-bold uppercase tracking-wide text-muted">
            {formatRelativeTime(comment.createdAt)}
          </span>
          {!deleted && comment.editedAt && <span className="text-[10px] italic text-muted">(edited)</span>}
          {collapsed && childCount > 0 && (
            <span className="text-xs font-semibold text-muted">(+{childCount})</span>
          )}
        </div>

        {deleted ? (
          <p className="mt-1 break-words text-sm italic leading-relaxed text-muted">[deleted]</p>
        ) : editing ? (
          <div className="animate-fade-slide-in mt-2">
            <textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              maxLength={2000}
              rows={2}
              autoFocus
              className="w-full resize-y border-2 border-ink bg-canvas px-3 py-2 font-serif text-base leading-relaxed text-ink shadow-card focus:border-accent focus:outline-none"
            />
            {error && <p className="mt-1 text-xs font-semibold text-chili-600">{error}</p>}
            <div className="mt-1 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setEditing(false)}
                className="px-3 py-2 text-xs font-bold uppercase tracking-wide text-muted transition-colors duration-150 hover:text-ink"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={saveEdit}
                disabled={saving || !draft.trim()}
                className="hard-btn flex items-center gap-2 border-2 bg-accent px-3 py-2 text-xs font-bold uppercase tracking-wide text-surface disabled:opacity-50"
              >
                {saving && <Spinner />}
                {saving ? 'Saving…' : 'Save'}
              </button>
            </div>
          </div>
        ) : (
          <p className="mt-1 break-words whitespace-pre-wrap font-serif text-base leading-relaxed text-ink/85">
            {comment.content}
          </p>
        )}

        {!deleted && (
          <>
            <div className="mt-3 flex flex-wrap items-center gap-1.5">
              <VoteControl
                votableType="COMMENT"
                votableId={comment.id}
                initialScore={comment.score}
                initialMyVote={comment.myVote}
                size="chip"
              />
              <button
                type="button"
                onClick={startReply}
                className="border-2 border-ink bg-surface px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide text-ink shadow-card transition duration-150 hover:bg-basil-500 active:translate-x-0.5 active:translate-y-0.5 active:shadow-none"
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
                  className="border-2 border-ink bg-surface px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide text-ink shadow-card transition duration-150 hover:bg-basil-500 active:translate-x-0.5 active:translate-y-0.5 active:shadow-none"
                >
                  Edit
                </button>
              )}
              {isAuthor && (
                <button
                  type="button"
                  onClick={handleDelete}
                  disabled={deleting}
                  className="flex items-center gap-1 border-2 border-ink bg-surface px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide text-ink shadow-card transition duration-150 hover:bg-chili-500 hover:text-surface active:translate-x-0.5 active:translate-y-0.5 active:shadow-none disabled:opacity-50"
                >
                  {deleting && <Spinner />}
                  {deleting ? 'Deleting…' : 'Delete'}
                </button>
              )}
              {!isAuthor && <ReportMenu targetType="COMMENT" targetId={comment.id} />}
            </div>

            {error && <p className="mt-2 break-words text-xs font-semibold text-chili-600">{error}</p>}

            {replyOpen && (
              <div className="animate-fade-slide-in mt-3 border-t-2 border-dashed border-ink/25 pt-3">
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
          className={`nested grid transition-[grid-template-rows] duration-200 ease-in-out ${
            collapsed ? 'grid-rows-[0fr]' : 'grid-rows-[1fr]'
          }`}
        >
          <span aria-hidden="true" className="bg-line" style={{ background: railColor }} />
          <div className="min-h-0 overflow-hidden">
            <div className="space-y-3">
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
