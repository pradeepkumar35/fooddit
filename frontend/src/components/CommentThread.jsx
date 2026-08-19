import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { createComment, getThread } from '../api/comments'
import { useAuth } from '../hooks/useAuth'
import { useToast } from '../context/ToastContext'
import CommentForm from './CommentForm'
import CommentNode from './CommentNode'
import EmptyState from './EmptyState'
import { CommentThreadSkeleton } from './Skeleton'
import useIsDesktop from '../hooks/useIsDesktop'
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
  const isDesktop = useIsDesktop()
  const [roots, setRoots] = useState(null)
  const [sort, setSort] = useState('best')
  const [error, setError] = useState('')
  const [newCommentId, setNewCommentId] = useState(null)
  const [openReplyId, setOpenReplyId] = useState(null)

  // Only one reply form is open across the whole thread at a time; the sentinel
  // '__root__' represents the top-level compose form, a comment id a nested one.
  // Toggling the currently open id closes it, so a reply form slides shut when
  // a different one is opened.
  const toggleReply = useCallback((id) => {
    setOpenReplyId((current) => (current === id ? null : id))
  }, [])
  const closeReply = useCallback(() => setOpenReplyId(null), [])

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
        <div className="mt-4 border-2 border-chili-500 bg-surface px-3 py-3 text-sm font-semibold text-chili-600 shadow-card">
          {error}
          <button type="button" onClick={load} className="ml-2 font-bold underline">
            Retry
          </button>
        </div>
      )
    }
    return (
      <section className="mt-4 border-t-2 border-ink pt-3">
        <CommentThreadSkeleton />
      </section>
    )
  }

  return (
    <section className="mt-4 border-t-2 border-ink pt-3">
      <div className="flex flex-wrap items-center gap-2">
        <h3 className="sticker px-3 py-1.5 text-sm font-bold uppercase tracking-wide text-ink">
          {count} {count === 1 ? 'comment' : 'comments'}
        </h3>
        {count > 0 && (
          <div className="ml-auto flex flex-wrap gap-1.5">
            {SORT_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                aria-pressed={sort === opt.value}
                onClick={() => setSort(opt.value)}
                className={`border-2 border-ink px-2.5 py-1 text-xs font-bold uppercase tracking-wide transition duration-150 active:translate-x-0.5 active:translate-y-0.5 active:shadow-none ${
                  sort === opt.value
                    ? 'bg-accent text-surface shadow-card'
                    : 'bg-surface text-ink shadow-card hover:bg-accent-soft'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {isAuthenticated ? (
        openReplyId === '__root__' ? (
          <CommentForm
            placeholder="What are your thoughts?"
            autoFocus
            onSubmit={(content) => handleCreate(null, content)}
            onSubmitted={closeReply}
            onCancel={closeReply}
          />
        ) : (
          <div className="mt-2">
            <button
              type="button"
              onClick={() => toggleReply('__root__')}
              className="hard-btn border-2 bg-surface px-3 py-2 text-sm font-bold uppercase tracking-wide text-ink hover:bg-accent hover:text-surface"
            >
              <svg
                viewBox="0 0 24 24"
                className="mr-1.5 inline h-4 w-4"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.75"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
              </svg>
              Reply
            </button>
          </div>
        )
      ) : (
        <p className="mt-2 text-xs font-semibold text-muted">
          <Link to="/login" className="font-bold text-accent transition-colors duration-150 hover:underline">
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
                openReplyId={openReplyId}
                onToggleReply={toggleReply}
                isDesktop={isDesktop}
              />
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
