import { useState, useCallback } from 'react'
import type { Toast } from '../types'

export function useToast() {
  const [toasts, setToasts] = useState<Toast[]>([])

  const addToast = useCallback((type: Toast['type'], message: string) => {
    const id = crypto.randomUUID()
    const toast: Toast = { id, type, message }
    setToasts(prev => [...prev, toast])

    // Auto-dismiss after 3 seconds
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id))
    }, 3000)

    return id
  }, [])

  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id))
  }, [])

  const success = useCallback((msg: string) => addToast('success', msg), [addToast])
  const error = useCallback((msg: string) => addToast('error', msg), [addToast])
  const warning = useCallback((msg: string) => addToast('warning', msg), [addToast])
  const info = useCallback((msg: string) => addToast('info', msg), [addToast])

  return { toasts, addToast, removeToast, success, error, warning, info }
}
