import { useEffect, useState } from 'react'
import { getMe, updateMe, updatePreferences } from '../api/me'
import PillTabs from '../components/PillTabs'
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
    'w-full rounded-lg border border-line bg-canvas px-3 py-2 text-sm text-ink placeholder:text-muted focus:outline-none'

  return (
    <div className="mx-auto max-w-[1080px] px-4 pb-16 pt-6">
      <div className="mx-auto max-w-[640px]">
        <h1 className="font-display text-2xl font-semibold text-ink">Settings</h1>

        <div className="mt-4">
          <PillTabs options={TABS} value={tab} onChange={setTab} size="sm" label="Settings tabs" />
        </div>

        {loading ? (
          <div className="mt-6 space-y-3">
            <Skeleton className="h-12 rounded-lg" />
            <Skeleton className="h-12 rounded-lg" />
            <Skeleton className="h-12 rounded-lg" />
          </div>
        ) : tab === GENERAL.value ? (
          <div className="mt-6 rounded-lg border border-line bg-surface p-6 shadow-card">
            <h2 className="font-display text-base font-semibold text-ink">Display name</h2>
            <p className="mt-1 text-sm text-muted">
              How your name appears on reviews, comments and your profile.
            </p>
            <form onSubmit={handleSaveName} className="mt-4 space-y-4">
              <label className="block">
                <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-muted">
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
                className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-surface transition duration-150 ease-out hover:bg-accent/90 active:scale-95 disabled:opacity-50"
              >
                {savingName ? 'Saving…' : 'Save changes'}
              </button>
            </form>

            <div className="mt-6 border-t border-line pt-4">
              <p className="text-xs font-medium uppercase tracking-wide text-muted">Account</p>
              <p className="mt-2 text-sm text-ink">Email</p>
              <p className="text-sm text-muted">{email}</p>
            </div>
          </div>
        ) : (
          <div className="mt-6 space-y-4">
            <section className="rounded-lg border border-line bg-surface p-6 shadow-card">
              <h2 className="font-display text-base font-semibold text-ink">Display mode</h2>
              <p className="mt-1 text-sm text-muted">
                Choose between light, dark, or following your device setting.
              </p>
              <div className="mt-4 flex gap-2">
                {MODE_OPTIONS.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => handleDisplayMode(option.value)}
                    aria-pressed={displayMode === option.value}
                    className={`rounded-lg border px-4 py-2 text-sm font-medium transition-colors duration-150 ${
                      displayMode === option.value
                        ? 'border-accent bg-accent text-surface'
                        : 'border-line text-ink hover:border-accent hover:text-accent'
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
              <p className="mt-3 text-xs text-muted">
                Current theme: {mode === 'dark' ? 'Dark' : mode === 'light' ? 'Light' : 'Following your device'}
              </p>
            </section>

            <form
              onSubmit={handleSavePreferences}
              className="rounded-lg border border-line bg-surface p-6 shadow-card"
            >
              <h2 className="font-display text-base font-semibold text-ink">Notifications</h2>
              <p className="mt-1 text-sm text-muted">
                Choose when you receive notifications for replies.
              </p>
              <div className="mt-4 space-y-4">
                <label className="flex items-center justify-between gap-4">
                  <span>
                    <span className="block text-sm font-medium text-ink">Review replies</span>
                    <span className="block text-xs text-muted">When someone comments on your review</span>
                  </span>
                  <Toggle
                    checked={notifyOnReviewReply}
                    onChange={setNotifyOnReviewReply}
                    label="Review replies"
                  />
                </label>
                <label className="flex items-center justify-between gap-4">
                  <span>
                    <span className="block text-sm font-medium text-ink">Comment replies</span>
                    <span className="block text-xs text-muted">When someone replies to your comment</span>
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
                className="mt-4 rounded-lg bg-accent px-4 py-2 text-sm font-medium text-surface transition duration-150 ease-out hover:bg-accent/90 active:scale-95 disabled:opacity-50"
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
