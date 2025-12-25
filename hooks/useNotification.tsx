import { useState, useCallback } from 'react'
import { CheckCircle, XCircle, AlertCircle, X } from 'lucide-react'

export type NotificationType = 'success' | 'error' | 'info' | 'confirm'

interface Notification {
  id: string
  type: NotificationType
  message: string
  onConfirm?: () => void
  onCancel?: () => void
}

export function useNotification() {
  const [notifications, setNotifications] = useState<Notification[]>([])

  const showNotification = useCallback((
    type: NotificationType,
    message: string,
    options?: {
      onConfirm?: () => void
      onCancel?: () => void
      duration?: number
    }
  ) => {
    const id = Math.random().toString(36).substring(7)
    const notification: Notification = {
      id,
      type,
      message,
      onConfirm: options?.onConfirm,
      onCancel: options?.onCancel,
    }

    setNotifications((prev) => [...prev, notification])

    // Auto-remove after duration (default 2s) for non-confirm notifications
    if (type !== 'confirm') {
      setTimeout(() => {
        setNotifications((prev) => prev.filter((n) => n.id !== id))
      }, options?.duration || 2000)
    }
  }, [])

  const success = useCallback((message: string, duration?: number) => {
    showNotification('success', message, { duration })
  }, [showNotification])

  const error = useCallback((message: string, duration?: number) => {
    showNotification('error', message, { duration })
  }, [showNotification])

  const info = useCallback((message: string, duration?: number) => {
    showNotification('info', message, { duration })
  }, [showNotification])

  const confirm = useCallback((
    message: string,
    onConfirm: () => void,
    onCancel?: () => void
  ) => {
    showNotification('confirm', message, { onConfirm, onCancel })
  }, [showNotification])

  const removeNotification = useCallback((id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id))
  }, [])

  const handleConfirm = useCallback((notification: Notification) => {
    notification.onConfirm?.()
    removeNotification(notification.id)
  }, [removeNotification])

  const handleCancel = useCallback((notification: Notification) => {
    notification.onCancel?.()
    removeNotification(notification.id)
  }, [removeNotification])

  const NotificationContainer = useCallback(() => (
    <div className="fixed top-4 right-4 z-50 space-y-2 max-w-md">
      {notifications.map((notification) => (
        <div
          key={notification.id}
          className={`rounded-lg border p-4 shadow-lg animate-in slide-in-from-right ${
            notification.type === 'success'
              ? 'bg-green-500 bg-opacity-20 border-green-500 text-green-200'
              : notification.type === 'error'
              ? 'bg-red-500 bg-opacity-20 border-red-500 text-red-200'
              : notification.type === 'confirm'
              ? 'bg-yellow-500 bg-opacity-20 border-yellow-500 text-yellow-200'
              : 'bg-blue-500 bg-opacity-20 border-blue-500 text-blue-200'
          }`}
        >
          <div className="flex items-start gap-3">
            {notification.type === 'success' && (
              <CheckCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
            )}
            {notification.type === 'error' && (
              <XCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
            )}
            {notification.type === 'info' && (
              <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
            )}
            {notification.type === 'confirm' && (
              <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
            )}
            <div className="flex-1">
              <p className="text-sm font-medium">{notification.message}</p>
              {notification.type === 'confirm' && (
                <div className="flex gap-2 mt-3">
                  <button
                    onClick={() => handleConfirm(notification)}
                    className="bg-green-600 hover:bg-green-500 px-3 py-1 rounded text-xs transition-colors"
                  >
                    Confirm
                  </button>
                  <button
                    onClick={() => handleCancel(notification)}
                    className="bg-gray-600 hover:bg-gray-500 px-3 py-1 rounded text-xs transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              )}
            </div>
            {notification.type !== 'confirm' && (
              <button
                onClick={() => removeNotification(notification.id)}
                className="text-current hover:opacity-70 transition-opacity"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      ))}
    </div>
  ), [notifications, handleConfirm, handleCancel, removeNotification])

  return {
    success,
    error,
    info,
    confirm,
    NotificationContainer,
  }
}
