import { useCallback, useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { getThread, createComment } from '../api/comments'
import { useAuth } from '../hooks/useAuth'
import useIsDesktop from '../hooks/useIsDesktop'
import { subscribe } from '../lib/live'
import CommentForm from './CommentForm'
import CommentNode from './CommentNode'
import EmptyState from './EmptyState'
import { CommentThreadSkeleton } from './Skeleton'

const SORT_OPTIONS = [
  { value: 'best', label: 'Best' },
  { value: 'top', label: 'Top' },
  { value: 'new', label: 'New' },
]

/**
 * The discussion under a review. Owns: loading + Best/Top/New sorting of the
 * reply tree, the single per-thread reply form (one open at a time across all
 * nodes), live inserts — including the very first comment on a brand-new
 * review via review.created — and collapse state handed down to each node.
 */
export default function CommentThread({ reviewId }) {
  const { isAuthenticated } = useAuth()
  const isDesktop = useIsDesktop()
  const [roots, setRoots] = useState(null)
  const [error, setError] = useState('')
  const [sort, setSort] = useState('best')
  const [count, setCount] = useState(0)
  const [openReplyId, setOpenReplyId] = useState(null)
  const [newCommentId, setNewCommentId] = useState(null)
  const flashTimerRef = useRef(null)
  const sortRef = useRef(sort)

  useEffect(() => {
    sortRef.current = sort
  }, [sort])

  const load = useCallback(() => {
    getThread(reviewId, sortRef.current)
      .then((thread) => {
        // Tolerate both the envelope shape ({comments,totalCount}) and a bare
        // array (older mocks/clients).
        const list = Array.isArray(thread) ? thread : (thread?.comments ?? [])
        setRoots(list)
        setCount(Array.isArray(thread) ? countNodes(list) : (thread?.totalCount ?? countNodes(list)))
      })
      .catch(() => {
        setRoots([])
        setError('Failed to load the discussion. Please try again.')
      })
  }, [reviewId])

  useEffect(() => {
    setRoots(null)
    setError('')
    load()
  }, [load])

  // Live inserts from other clients (same stream that powers vote tallies).
  // A brand-new review's first comment also arrives this way.
  useEffect(() => {
    return subscribe('comment.created', (event) => {
      if (event.reviewId !== reviewId) return
      setCount((c) => c + 1)
      setNewCommentId(event.comment?.id ?? null)
      clearTimeout(flashTimerRef.current)
      flashTimerRef.current = setTimeout(() => setNewCommentId(null), 2600)
      if (roots !== null) load()
    })
  }, [reviewId, roots, load])

  useEffect(() => () => clearTimeout(flashTimerRef.current), [])

  const handleCreate = async (parentCommentId, content) => {
    await createComment(reviewId, { parentCommentId, content })
    load()
  }

  const toggleReply = useCallback(
    (id) => setOpenReplyId((current) => (current === id ? null : id)),
    [],
  )
  const closeReply = useCallback(() => setOpenReplyId(null), [])

  function countNodes(nodes) {
    return nodes.reduce((total, node) => total + 1 + countNodes(node.replies), 0)
  }

  if (roots === null) {
    if (error) {
      return (
        <div className="mt-4 border-[1.5px] border-down bg-card px-3 py-3 text-sm font-semibold text-down">
          {error}{' '}
          <button type="button" onClick={load} className="font-bold underline">
            Retry
          </button>
        </div>
      )
    }
    return (
      <div className="mt-4">
        <p className="micro-label mb-3">Discussion</p>
        <CommentThreadSkeleton />
      </div>
    )
  }

  return (
    <section className="mt-5 border-t border-dashed border-hair pt-4" aria-label="Discussion">
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <span className="micro-label">Discussion · {count} {count === 1 ? 'reply' : 'replies'}</span>
        {count > 0 && (
          <div className="ml-auto flex gap-1.5">
            {SORT_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                aria-pressed={sort === opt.value}
                onClick={() => setSort(opt.value)}
                className={`px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide transition duration-150 ${
                  sort === opt.value ? 'bg-ink text-paper' : 'text-muted hover:text-ink'
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
          <div className="mb-3">
            <button
              type="button"
              onClick={() => toggleReply('__root__')}
              className="btn-hard px-3.5 py-2 text-xs uppercase tracking-wide"
            >
              Reply
            </button>
          </div>
        )
      ) : (
        <p className="mb-3 text-sm font-medium text-muted">
          <Link to="/login" className="font-bold text-emerald hover:underline">
            Log in
          </Link>{' '}
          to join the discussion.
        </p>
      )}

      {roots.length === 0 ? (
        <EmptyState
          compact
          title="No comments yet"
          description="Start the discussion — share your thoughts on this review."
          icon={<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />}
        />
      ) : (
        <ul className="space-y-3">
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