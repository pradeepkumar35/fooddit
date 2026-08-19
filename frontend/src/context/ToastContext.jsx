import { createContext, useCallback, useContext, useRef, useState } from 'react'

const ToastContext = createContext(() => {})

const ACCENTS = {
  success: 'border-l-up',
  error: 'border-l-down',
  info: 'border-l-muted',
}

/**
 * Tiny toast system: {@code useToast()} returns a {@code notify(message, type)}
 * function. Toasts slide in from the bottom-right corner and auto-dismiss after
 * ~2.6s. Only the last four are kept on screen.
 */
export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])
  const counter = useRef(0)

  const remove = useCallback((id) => {
    setToasts((current) => current.filter((t) => t.id !== id))
  }, [])

  const dismiss = useCallback(
    (id) => {
      setToasts((current) => current.map((t) => (t.id === id ? { ...t, leaving: true } : t)))
      setTimeout(() => remove(id), 220)
    },
    [remove],
  )

  const notify = useCallback(
    (message, type = 'success') => {
      const id = ++counter.current
      setToasts((current) => [...current.slice(-3), { id, message, type }])
      setTimeout(() => dismiss(id), 2600)
    },
    [dismiss],
  )

  return (
    <ToastContext.Provider value={notify}>
      {children}
      <div className="pointer-events-none fixed bottom-4 right-4 z-50 flex flex-col items-end gap-2">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            role="status"
            className={`pointer-events-auto max-w-xs border-2 border-ink border-l-4 bg-surface px-4 py-3 font-serif text-sm font-semibold leading-relaxed text-ink shadow-card-hover ${
              ACCENTS[toast.type] ?? ACCENTS.success
            } ${toast.leaving ? 'animate-toast-out' : 'animate-toast-in'}`}
          >
            {toast.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast() {
  return useContext(ToastContext)
}
