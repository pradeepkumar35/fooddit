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

/**
 * A single node in the threaded comment tree. Nested replies are indented under
 * a vertical connector line on every level (Reddit's signature threading
 * visual). Each comment has a collapse toggle that folds its whole subtree
 * closed via an animated grid-rows transition (the replies stay mounted, just
 * clipped), a chevron that rotates on toggle, a subtle hover highlight, inline
 * editing for its author, a delete action for its author, and a report menu.
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
}) {
  const { isAuthenticated, user } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [collapsed, setCollapsed] = useState(false)
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
    <div className={highlighted ? 'animate-fade-slide-in' : ''}>
      <div className="-mx-1 flex gap-2 rounded-md p-1 transition-colors duration-150 hover:bg-canvas/50">
        {deleted ? (
          <div className="w-8 shrink-0" aria-hidden="true" />
        ) : (
          <VoteControl
            votableType="COMMENT"
            votableId={comment.id}
            initialScore={comment.score}
            initialMyVote={comment.myVote}
            size="sm"
          />
        )}

        <div className="min-w-0 flex-1">
          <header className="text-xs text-muted">
            <button
              type="button"
              onClick={() => setCollapsed((value) => !value)}
              aria-expanded={!collapsed}
              aria-label={collapsed ? 'Expand replies' : 'Collapse replies'}
              className="align-middle text-muted transition-colors duration-150 hover:text-accent"
            >
              <svg
                viewBox="0 0 24 24"
                className={`h-3 w-3 transition-transform duration-200 ease-in-out ${
                  collapsed ? '-rotate-90' : ''
                }`}
                fill="none"
                stroke="currentColor"
                strokeWidth="1.75"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="m6 9 6 6 6-6" />
              </svg>
            </button>{' '}
            {deleted ? (
              <span className="font-semibold text-muted">[deleted]</span>
            ) : (
              <Link
                to={`/users/${comment.author.id}`}
                className="font-semibold text-ink transition-colors duration-150 hover:text-accent"
              >
                {comment.author.name}
              </Link>
            )}{' '}
            · {formatRelativeTime(comment.createdAt)}
            {!deleted && comment.editedAt && <span className="ml-1 italic">(edited)</span>}
            {collapsed && childCount > 0 && (
              <span className="ml-1 font-medium text-muted">(+{childCount})</span>
            )}
          </header>

          {deleted ? (
            <p className="mt-1 text-sm italic leading-relaxed text-muted">[deleted]</p>
          ) : editing ? (
            <div className="animate-fade-slide-in mt-1">
              <textarea
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                maxLength={2000}
                rows={2}
                autoFocus
                className="w-full resize-y rounded-lg border border-line bg-canvas px-3 py-2 text-sm text-ink"
              />
              {error && <p className="mt-1 text-xs text-chili-600">{error}</p>}
              <div className="mt-1 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setEditing(false)}
                  className="text-xs text-muted transition-colors duration-150 hover:text-ink"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={saveEdit}
                  disabled={saving || !draft.trim()}
                  className="flex items-center gap-2 rounded-lg bg-accent px-3 py-1 text-xs font-medium text-surface transition duration-150 ease-out hover:bg-accent/90 active:scale-95 disabled:opacity-50"
                >
                  {saving && <Spinner />}
                  {saving ? 'Saving…' : 'Save'}
                </button>
              </div>
            </div>
          ) : (
            <p className="mt-1 whitespace-pre-wrap text-sm leading-relaxed text-ink/80">
              {comment.content}
            </p>
          )}

          {!deleted && (
            <>
              <div className="mt-1 flex items-center gap-1">
                <button
                  type="button"
                  onClick={startReply}
                  className="text-xs font-medium text-muted transition-colors duration-150 hover:text-accent"
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
                    className="text-xs font-medium text-muted transition-colors duration-150 hover:text-accent"
                  >
                    Edit
                  </button>
                )}
                {isAuthor && (
                  <button
                    type="button"
                    onClick={handleDelete}
                    disabled={deleting}
                    className="flex items-center gap-1 text-xs font-medium text-muted transition-colors duration-150 hover:text-chili-600 disabled:opacity-50"
                  >
                    {deleting && <Spinner />}
                    {deleting ? 'Deleting…' : 'Delete'}
                  </button>
                )}
                {!isAuthor && <ReportMenu targetType="COMMENT" targetId={comment.id} />}
              </div>

              {error && <p className="mt-1 text-xs text-chili-600">{error}</p>}

              {replyOpen && (
                <div className="animate-fade-slide-in">
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
      </div>

      {comment.replies.length > 0 && (
        <div
          className={`grid transition-[grid-template-rows] duration-200 ease-in-out ${
            collapsed ? 'grid-rows-[0fr]' : 'grid-rows-[1fr]'
          }`}
        >
          <div className="min-h-0 overflow-hidden">
            <div className="ml-6 mt-2 space-y-3 border-l-2 border-line pl-3">
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
                />
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
