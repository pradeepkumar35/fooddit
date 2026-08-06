import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { createComment, getThread } from '../api/comments'
import { useAuth } from '../hooks/useAuth'
import { useToast } from '../context/ToastContext'
import CommentForm from './CommentForm'
import CommentNode from './CommentNode'
import EmptyState from './EmptyState'
import PillTabs from './PillTabs'
import { CommentThreadSkeleton } from './Skeleton'
import { subscribe } from '../lib/live'

const countNodes = (nodes) => nodes.reduce((total, node) => total + 1 + countNodes(node.replies), 0)

const SORT_OPTIONS = [
  { value: 'best', label: 'Best' },
  { value: 'top', label: 'Top' },
  { value: 'new', label: 'New' },
]

/**
 * The threaded discussion under a review, styled like Reddit's comment section:
 * a count header, the compose box ("What are your thoughts?"), a per-level sort
 * control, then the nested tree. Replies post through {@code handleCreate} with
 * their parent comment id, refetch the whole thread so votes/scores stay
 * accurate, and briefly flag the newly created comment so it animates in.
 */
export default function CommentThread({ reviewId }) {
  const { isAuthenticated } = useAuth()
  const notify = useToast()
  const [roots, setRoots] = useState(null)
  const [sort, setSort] = useState('best')
  const [error, setError] = useState('')
  const [newCommentId, setNewCommentId] = useState(null)

  const load = useCallback(async () => {
    setError('')
    try {
      const thread = await getThread(reviewId, sort)
      setRoots(thread)
    } catch {
      setError('Failed to load comments.')
    }
  }, [reviewId, sort])

  useEffect(() => {
    load()
  }, [load])

  // A new comment (possibly posted by another client) arrived on this review's
  // live stream: refresh so it appears without a page reload.
  useEffect(() => {
    return subscribe('comment.created', (event) => {
      if (event.reviewId === reviewId) load()
    })
  }, [reviewId, load])

  useEffect(() => {
    if (!newCommentId) return
    const timer = setTimeout(() => setNewCommentId(null), 2200)
    return () => clearTimeout(timer)
  }, [newCommentId])

  const handleCreate = useCallback(
    async (parentCommentId, content) => {
      const created = await createComment(reviewId, { content, parentCommentId })
      setNewCommentId(created?.id ?? null)
      notify(parentCommentId ? 'Reply posted' : 'Comment posted')
      await load()
    },
    [reviewId, load, notify],
  )

  const count = roots ? countNodes(roots) : 0

  if (roots === null) {
    if (error) {
      return (
        <div className="mt-4 rounded-lg border border-chili-500/40 bg-surface px-3 py-3 text-sm text-chili-600">
          {error}
          <button type="button" onClick={load} className="ml-2 font-medium underline">
            Retry
          </button>
        </div>
      )
    }
    return (
      <section className="mt-4 border-t border-line pt-3">
        <CommentThreadSkeleton />
      </section>
    )
  }

  return (
    <section className="mt-4 border-t border-line pt-3">
      <div className="flex flex-wrap items-center gap-2">
        <h3 className="text-sm font-semibold text-ink">
          {count} {count === 1 ? 'comment' : 'comments'}
        </h3>
        {count > 0 && (
          <div className="ml-auto">
            <PillTabs size="sm" options={SORT_OPTIONS} value={sort} onChange={setSort} />
          </div>
        )}
      </div>

      {isAuthenticated ? (
        <CommentForm placeholder="What are your thoughts?" onSubmit={(content) => handleCreate(null, content)} />
      ) : (
        <p className="mt-2 text-xs text-muted">
          <Link to="/login" className="font-medium text-accent transition-colors duration-150 hover:underline">
            Log in
          </Link>{' '}
          to join the discussion.
        </p>
      )}

      {roots.length === 0 ? (
        <div className="mt-2">
          <EmptyState
            compact
            title="No comments yet"
            description="Start the discussion — share your thoughts on this review."
            icon={
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
            }
          />
        </div>
      ) : (
        <ul className="mt-3 space-y-3">
          {roots.map((comment) => (
            <li key={comment.id}>
              <CommentNode
                comment={comment}
                reviewId={reviewId}
                onReply={handleCreate}
                onUpdated={load}
                highlightId={newCommentId}
              />
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
