import React from 'react'
import { CheckCircle, XCircle, AlertTriangle, Info, X } from 'lucide-react'
import type { Toast } from '../../types'

interface ToastContainerProps {
  toasts: Toast[]
  onRemove: (id: string) => void
}

const icons = {
  success: <CheckCircle className="w-5 h-5 text-emerald-400 shrink-0" />,
  error: <XCircle className="w-5 h-5 text-red-400 shrink-0" />,
  warning: <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0" />,
  info: <Info className="w-5 h-5 text-blue-400 shrink-0" />,
}

const borderColors = {
  success: 'border-emerald-500/30',
  error: 'border-red-500/30',
  warning: 'border-amber-500/30',
  info: 'border-blue-500/30',
}

export function ToastContainer({ toasts, onRemove }: ToastContainerProps) {
  return (
    <div className="fixed top-5 right-5 z-50 flex flex-col gap-2">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`toast border ${borderColors[toast.type]}`}
          style={{ animation: 'slideInRight 0.3s ease-out' }}
        >
          {icons[toast.type]}
          <span className="flex-1 text-sm">{toast.message}</span>
          <button
            onClick={() => onRemove(toast.id)}
            className="text-slate-500 hover:text-slate-300 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      ))}
    </div>
  )
}
