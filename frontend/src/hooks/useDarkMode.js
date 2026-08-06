import { useCallback, useEffect, useState } from 'react'

const THEME_KEY = 'fooddit.theme'
const MODES = ['light', 'dark', 'system']

function readMode() {
  try {
    const stored = localStorage.getItem(THEME_KEY)
    if (stored && MODES.includes(stored)) return stored
  } catch {
    /* ignore private-mode reads */
  }
  return 'system'
}

function prefersDark() {
  return typeof window !== 'undefined' && window.matchMedia?.('(prefers-color-scheme: dark)').matches
}

/**
 * Theme state with three modes: light, dark and system. The effective `dark`
 * flag drives the .dark class on <html>; when the mode is "system" it follows
 * the OS preference live. The no-flash script in index.html applies the same
 * default before React mounts.
 */
export default function useDarkMode() {
  const [mode, setModeState] = useState(readMode)
  const [dark, setDark] = useState(() => (readMode() === 'dark' ? true : readMode() === 'system' && prefersDark()))

  // Keep the effective flag in sync whenever the mode or OS preference changes.
  useEffect(() => {
    const apply = () => setDark(mode === 'dark' ? true : mode === 'light' ? false : prefersDark())
    apply()
    if (mode === 'system') {
      const media = window.matchMedia('(prefers-color-scheme: dark)')
      media.addEventListener?.('change', apply)
      return () => media.removeEventListener?.('change', apply)
    }
  }, [mode])

  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark)
  }, [dark])

  const setMode = useCallback((next) => {
    setModeState(next)
    try {
      localStorage.setItem(THEME_KEY, next)
    } catch {
      /* ignore private-mode writes */
    }
  }, [])

  // Navbar quick toggle: switch between light and dark (opting out of "system").
  const toggle = useCallback(() => setMode(dark ? 'light' : 'dark'), [dark, setMode])

  return { mode, setMode, dark, toggle }
}
