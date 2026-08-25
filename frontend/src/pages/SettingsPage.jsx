import { useEffect, useState } from 'react'
import { getMe, updateMe, updatePreferences } from '../api/me'
import { Skeleton } from '../components/Skeleton'
import Toggle from '../components/Toggle'
import { useToast } from '../context/ToastContext'
import { useAuth } from '../hooks/useAuth'
import useDarkMode from '../hooks/useDarkMode'

const GENERAL = { value: 'general', label: 'General' }
const PREFERENCES = { value: 'preferences', label: 'Preferences' }
const TABS = [GENERAL, PREFERENCES]

const MODE_OPTIONS = [
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
  { value: 'system', label: 'System' },
]

/**
 * Account settings. The dark-mode control lives HERE and only here (the
 * masthead never carries it) — segmented Light/Dark/System, persisted per
 * account and mirrored to localStorage by useDarkMode.
 */
export default function SettingsPage() {
  const { updateUser } = useAuth()
  const { mode, setMode } = useDarkMode()
  const notify = useToast()

  const [tab, setTab] = useState(GENERAL.value)
  const [loading, setLoading] = useState(true)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [displayMode, setDisplayMode] = useState('system')
  const [notifyOnReviewReply, setNotifyOnReviewReply] = useState(true)
  const [notifyOnCommentReply, setNotifyOnCommentReply] = useState(true)
  const [savingName, setSavingName] = useState(false)
  const [savingPrefs, setSavingPrefs] = useState(false)

  useEffect(() => {
    getMe()
      .then((me) => {
        setName(me.name)
        setEmail(me.email)
        setDisplayMode(me.displayMode.toLowerCase())
        setNotifyOnReviewReply(me.notifyOnReviewReply)
        setNotifyOnCommentReply(me.notifyOnCommentReply)
      })
      .catch(() => notify('Could not load your settings'))
      .finally(() => setLoading(false))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleSaveName = async (event) => {
    event.preventDefault()
    const trimmed = name.trim()
    if (!trimmed) return
    setSavingName(true)
    try {
      const me = await updateMe({ name: trimmed })
      updateUser({ name: me.name })
      notify('Display name updated')
    } catch {
      notify('Could not update your name')
    } finally {
      setSavingName(false)
    }
  }

  const handleDisplayMode = async (next) => {
    setDisplayMode(next)
    setMode(next)
    try {
      await updatePreferences({ displayMode: next.toUpperCase() })
      notify(`Display mode set to ${next}`)
    } catch {
      notify('Could not save display mode')
    }
  }

  const handleSavePreferences = async (event) => {
    event.preventDefault()
    setSavingPrefs(true)
    try {
      await updatePreferences({ notifyOnReviewReply, notifyOnCommentReply })
      notify('Notification preferences saved')
    } catch {
      notify('Could not save notification preferences')
    } finally {
      setSavingPrefs(false)
    }
  }

  const fieldClass =
    'w-full border-[1.5px] border-hair bg-paper px-3 py-2 text-sm text-ink placeholder:text-muted transition-colors duration-150 focus:border-ink focus:outline-none'

  return (
    <div className="mx-auto max-w-[1160px] px-4 pb-20 pt-7 sm:px-6">
      <div className="mx-auto max-w-[720px]">
        <p className="micro-label mb-1">The Ledger · account</p>
        <h1 className="font-serif text-3xl font-bold tracking-tight text-ink">Settings</h1>

        <div className="mt-5 flex flex-wrap gap-2">
          {TABS.map((t) => (
            <button
              key={t.value}
              type="button"
              aria-pressed={tab === t.value}
              onClick={() => setTab(t.value)}
              className={`border-[1.5px] px-3.5 py-2 text-xs font-bold uppercase tracking-wide transition duration-150 ${
                tab === t.value ? 'border-ink bg-ink text-paper' : 'border-hair bg-card text-ink hover:border-ink'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="mt-6 space-y-3">
            <Skeleton className="h-14 w-full border border-hair" />
            <Skeleton className="h-14 w-full border border-hair" />
          </div>
        ) : tab === GENERAL.value ? (
          <div className="panel mt-6 p-6">
            <h2 className="font-serif text-lg font-semibold text-ink">Display name</h2>
            <p className="mt-1 text-sm font-medium text-muted">
              How your name appears on reviews, comments and your profile.
            </p>
            <form onSubmit={handleSaveName} className="mt-4 space-y-4">
              <label className="block">
                <span className="micro-label mb-1 block">Name</span>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  maxLength={60}
                  className={fieldClass}
                  aria-label="Display name"
                />
              </label>
              <button type="submit" disabled={savingName || !name.trim()} className="btn-hard btn-hard-primary px-4 py-2.5 text-sm disabled:opacity-50">
                {savingName ? 'Saving…' : 'Save changes'}
              </button>
            </form>

            <div className="mt-6 border-t border-hair pt-4">
              <p className="micro-label">Account</p>
              <p className="mt-2 text-sm font-semibold text-ink">{email}</p>
            </div>
          </div>
        ) : (
          <div className="mt-6 space-y-5">
            <section className="panel p-6">
              <h2 className="font-serif text-lg font-semibold text-ink">Display mode</h2>
              <p className="mt-1 text-sm font-medium text-muted">
                Choose light, dark, or follow your device. This is the only place the theme can be changed.
              </p>
              <div className="modeseg mt-4 inline-flex border-[1.5px] border-ink" role="group" aria-label="Display mode">
                {MODE_OPTIONS.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => handleDisplayMode(option.value)}
                    aria-pressed={displayMode === option.value}
                    className={`px-5 py-2.5 text-sm font-semibold transition-colors duration-150 ${
                      option !== MODE_OPTIONS[0] ? 'border-l-[1.5px] border-ink' : ''
                    } ${displayMode === option.value ? 'bg-ink text-paper' : 'bg-card text-ink hover:bg-paper'}`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
              <p className="num mt-3 text-xs text-muted">
                Current: {mode === 'dark' ? 'Dark' : mode === 'light' ? 'Light' : 'Following device'}
              </p>
            </section>

            <form onSubmit={handleSavePreferences} className="panel p-6">
              <h2 className="font-serif text-lg font-semibold text-ink">Notifications</h2>
              <p className="mt-1 text-sm font-medium text-muted">
                Choose which replies reach the bell.
              </p>
              <div className="mt-4 space-y-4">
                <label className="flex items-center justify-between gap-4">
                  <span>
                    <span className="block text-sm font-semibold text-ink">Review replies</span>
                    <span className="block text-xs text-muted">When someone comments on your review</span>
                  </span>
                  <Toggle checked={notifyOnReviewReply} onChange={setNotifyOnReviewReply} label="Review replies" />
                </label>
                <label className="flex items-center justify-between gap-4">
                  <span>
                    <span className="block text-sm font-semibold text-ink">Comment replies</span>
                    <span className="block text-xs text-muted">When someone replies to your comment</span>
                  </span>
                  <Toggle checked={notifyOnCommentReply} onChange={setNotifyOnCommentReply} label="Comment replies" />
                </label>
              </div>
              <button type="submit" disabled={savingPrefs} className="btn-hard btn-hard-primary mt-5 px-4 py-2.5 text-sm disabled:opacity-50">
                {savingPrefs ? 'Saving…' : 'Save changes'}
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  )
}