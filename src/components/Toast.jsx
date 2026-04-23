import { createContext, useCallback, useContext, useState } from 'react'

const ToastContext = createContext(null)

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])

  const addToast = useCallback((message, duration = 4000) => {
    const id = Date.now() + Math.random()
    setToasts((prev) => [...prev.slice(-4), { id, message }])
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), duration)
  }, [])

  return (
    <ToastContext.Provider value={addToast}>
      {children}
      {toasts.length > 0 && (
        <div className="fixed bottom-4 right-4 z-[60] flex flex-col gap-2 pointer-events-none">
          {toasts.map((t) => (
            <div
              key={t.id}
              role="status"
              className="pixel-panel px-4 py-2 text-[10px] text-stone-300 bg-stone-900/95 border border-stone-700 shadow-lg pointer-events-auto animate-fade-in"
            >
              {t.message}
            </div>
          ))}
        </div>
      )}
    </ToastContext.Provider>
  )
}

// eslint-disable-next-line react-refresh/only-export-components -- context + hook live together
export function useToast() {
  return useContext(ToastContext) ?? (() => {})
}
