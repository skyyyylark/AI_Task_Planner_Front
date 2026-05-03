import { useEffect, useRef, useState } from 'react'
import type { TaskItemDto } from '../types'

interface Toast {
  id: string
  message: string
  type: 'warning' | 'danger'
}

interface Props {
  tasks: TaskItemDto[]
}

export default function DeadlineNotifier({ tasks }: Props) {
  const [toasts, setToasts] = useState<Toast[]>([])
  const notifiedRef = useRef<Set<string>>(new Set())

  const speak = (text: string) => {
    const utterance = new SpeechSynthesisUtterance(text)
    utterance.lang = 'ru-RU'
    utterance.rate = 0.9
    window.speechSynthesis.speak(utterance)
  }

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }

  useEffect(() => {
    if (!tasks.length) return

    const now = new Date()
    const newToasts: Toast[] = []

    tasks.forEach((task) => {
      if (task.status === 'Done' || !task.deadline) return

      const deadline = new Date(task.deadline)
      const diffMs = deadline.getTime() - now.getTime()
      const diffHours = diffMs / (1000 * 60 * 60)
      const createdAt = new Date(task.createdAt)
      const ageSeconds = (now.getTime() - createdAt.getTime()) / 1000

      // Не проверяем только что созданные задачи (первые 60 секунд)
      if (ageSeconds < 60) return

      const notifyKey = `${task.id}`
      const overdueKey = `overdue-${task.id}`

      // Просроченная задача
      if (diffMs < 0 && !notifiedRef.current.has(overdueKey)) {
        notifiedRef.current.add(overdueKey)
        const msg = `Задача просрочена: ${task.title}`
        newToasts.push({ id: overdueKey, message: `🔴 ${msg}`, type: 'danger' })
        speak(msg)
      }

      // За 24 часа до дедлайна
      if (diffHours > 0 && diffHours <= 24 && !notifiedRef.current.has(notifyKey)) {
        notifiedRef.current.add(notifyKey)
        const hours = Math.round(diffHours)
        const msg = `Срочная задача: ${task.title}. До дедлайна ${hours} ${hours === 1 ? 'час' : 'часа'}`
        newToasts.push({ id: notifyKey, message: `⚠️ ${msg}`, type: 'warning' })
        speak(msg)
      }
    })

    if (newToasts.length) {
      setToasts((prev) => [...prev, ...newToasts])
      newToasts.forEach((t) => {
        setTimeout(() => removeToast(t.id), 8000)
      })
    }
  }, [tasks])

  if (!toasts.length) return null

  return (
    <div className="fixed top-4 right-4 z-[100] flex flex-col gap-2 max-w-sm">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`flex items-start gap-3 px-4 py-3 rounded-xl border shadow-lg backdrop-blur-sm ${
            toast.type === 'danger'
              ? 'bg-red-950/90 border-red-500/30 text-red-200'
              : 'bg-yellow-950/90 border-yellow-500/30 text-yellow-200'
          }`}
        >
          <p className="text-sm flex-1">{toast.message}</p>
          <button
            onClick={() => removeToast(toast.id)}
            className="text-xs opacity-50 hover:opacity-100 transition-opacity shrink-0 mt-0.5"
          >
            ✕
          </button>
        </div>
      ))}
    </div>
  )
}