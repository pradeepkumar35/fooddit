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
 * Account settings, in a General tab (display name) and a Preferences tab
 * (display mode and which reply notifications to receive).
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
    'w-full border-2 border-ink bg-canvas px-3 py-2 text-sm text-ink placeholder:text-muted focus:border-accent focus:outline-none'

  return (
    <div className="mx-auto max-w-[1080px] px-4 pb-16 pt-6">
      <div className="mx-auto max-w-[640px]">
        <h1 className="font-display text-3xl font-semibold uppercase tracking-wide text-ink">Settings</h1>

        <div className="mt-4 flex flex-wrap gap-2">
          {TABS.map((t) => {
            const active = tab === t.value
            return (
              <button
                key={t.value}
                type="button"
                aria-pressed={active}
                onClick={() => setTab(t.value)}
                className={`border-2 border-ink px-3 py-1.5 text-sm font-bold uppercase tracking-wide transition duration-150 active:translate-x-0.5 active:translate-y-0.5 active:shadow-none ${
                  active ? 'bg-accent text-surface shadow-card' : 'bg-surface text-ink shadow-card hover:bg-accent-soft'
                }`}
              >
                {t.label}
              </button>
            )
          })}
        </div>

        {loading ? (
          <div className="mt-6 space-y-3">
            <Skeleton className="h-12 border-2 border-ink" />
            <Skeleton className="h-12 border-2 border-ink" />
            <Skeleton className="h-12 border-2 border-ink" />
          </div>
        ) : tab === GENERAL.value ? (
          <div className="sticker relative mt-6 p-6">
            <span className="tape" aria-hidden="true" />
            <h2 className="font-display text-base font-semibold uppercase tracking-wide text-ink">Display name</h2>
            <p className="mt-1 text-sm font-semibold text-muted">
              How your name appears on reviews, comments and your profile.
            </p>
            <form onSubmit={handleSaveName} className="mt-4 space-y-4">
              <label className="block">
                <span className="mb-1 block text-xs font-bold uppercase tracking-wide text-muted">
                  Name
                </span>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  maxLength={60}
                  className={fieldClass}
                  aria-label="Display name"
                />
              </label>
              <button
                type="submit"
                disabled={savingName || !name.trim()}
                className="hard-btn border-2 bg-accent px-4 py-2 text-sm text-surface disabled:opacity-50"
              >
                {savingName ? 'Saving…' : 'Save changes'}
              </button>
            </form>

            <div className="mt-6 border-t-2 border-ink/20 pt-4">
              <p className="text-xs font-bold uppercase tracking-wide text-muted">Account</p>
              <p className="mt-2 text-sm font-bold text-ink">Email</p>
              <p className="text-sm font-semibold text-muted">{email}</p>
            </div>
          </div>
        ) : (
          <div className="mt-6 space-y-4">
            <section className="sticker relative p-6">
              <span className="tape" aria-hidden="true" />
              <h2 className="font-display text-base font-semibold uppercase tracking-wide text-ink">Display mode</h2>
              <p className="mt-1 text-sm font-semibold text-muted">
                Choose between light, dark, or following your device setting.
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                {MODE_OPTIONS.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => handleDisplayMode(option.value)}
                    aria-pressed={displayMode === option.value}
                    className={`border-2 border-ink px-4 py-2 text-sm font-bold uppercase tracking-wide transition duration-150 active:translate-x-0.5 active:translate-y-0.5 active:shadow-none ${
                      displayMode === option.value
                        ? 'bg-accent text-surface shadow-card'
                        : 'bg-surface text-ink shadow-card hover:bg-accent-soft'
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
              <p className="mt-3 text-xs font-semibold text-muted">
                Current theme: {mode === 'dark' ? 'Dark' : mode === 'light' ? 'Light' : 'Following your device'}
              </p>
            </section>

            <form
              onSubmit={handleSavePreferences}
              className="sticker relative p-6"
            >
              <span className="tape" aria-hidden="true" />
              <h2 className="font-display text-base font-semibold uppercase tracking-wide text-ink">Notifications</h2>
              <p className="mt-1 text-sm font-semibold text-muted">
                Choose when you receive notifications for replies.
              </p>
              <div className="mt-4 space-y-4">
                <label className="flex items-center justify-between gap-4">
                  <span>
                    <span className="block text-sm font-bold text-ink">Review replies</span>
                    <span className="block text-xs font-semibold text-muted">When someone comments on your review</span>
                  </span>
                  <Toggle
                    checked={notifyOnReviewReply}
                    onChange={setNotifyOnReviewReply}
                    label="Review replies"
                  />
                </label>
                <label className="flex items-center justify-between gap-4">
                  <span>
                    <span className="block text-sm font-bold text-ink">Comment replies</span>
                    <span className="block text-xs font-semibold text-muted">When someone replies to your comment</span>
                  </span>
                  <Toggle
                    checked={notifyOnCommentReply}
                    onChange={setNotifyOnCommentReply}
                    label="Comment replies"
                  />
                </label>
              </div>
              <button
                type="submit"
                disabled={savingPrefs}
                className="hard-btn mt-4 border-2 bg-accent px-4 py-2 text-sm text-surface disabled:opacity-50"
              >
                {savingPrefs ? 'Saving…' : 'Save changes'}
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  )
}
