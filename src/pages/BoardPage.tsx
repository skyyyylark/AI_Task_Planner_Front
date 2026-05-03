import { useState, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { boardsApi } from '../api/boardsApi'
import { tasksApi } from '../api/tasksApi'
import { aiApi } from '../api/aiApi'
import type { TaskItemDto, TaskPriority } from '../types'
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd'
import type { DropResult } from '@hello-pangea/dnd'
import DeadlineNotifier from '../components/Deadlinenotifier'

const formatDeadline = (deadline: string) => {
  const date = new Date(deadline)

  const dateStr = date.toLocaleDateString('ru-RU', {
    day: 'numeric', month: 'long', year: 'numeric',
    timeZone: 'Asia/Bishkek'
  })

  const hours = date.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Bishkek' })
  const h = parseInt(date.toLocaleString('ru-RU', { hour: 'numeric', hour12: false, timeZone: 'Asia/Bishkek' }))
  const m = date.toLocaleString('ru-RU', { minute: 'numeric', timeZone: 'Asia/Bishkek' })

  // Если время 23:59 — показываем только дату
  if (h === 23 && parseInt(m) === 59) return dateStr

  return `${dateStr}, ${hours}`
}

const priorityLabel: Record<TaskPriority, string> = {
  Low: 'Низкий',
  Medium: 'Средний',
  High: 'Высокий',
}

const priorityColor: Record<TaskPriority, string> = {
  Low: 'text-green-400 bg-green-400/10',
  Medium: 'text-yellow-400 bg-yellow-400/10',
  High: 'text-red-400 bg-red-400/10',
}

const statusColor: Record<string, string> = {
  Todo: 'text-zinc-400 bg-zinc-400/10',
  InProgress: 'text-blue-400 bg-blue-400/10',
  Done: 'text-green-400 bg-green-400/10',
}

const statusLabel: Record<string, string> = {
  Todo: 'К выполнению',
  InProgress: 'В процессе',
  Done: 'Выполнено',
}

type TaskForm = {
  title: string
  description: string
  priority: TaskPriority
  deadline: string
}

type VoiceStatus = 'idle' | 'listening' | 'processing'

export default function BoardPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const [searchTerm, setSearchTerm] = useState('')
  const [showCreate, setShowCreate] = useState(false)
  const [editTask, setEditTask] = useState<TaskItemDto | null>(null)
  const [detailTask, setDetailTask] = useState<TaskItemDto | null>(null)
  const [showRecommendations, setShowRecommendations] = useState(false)

  const [form, setForm] = useState<TaskForm>({
    title: '', description: '', priority: 'Medium', deadline: ''
  })

  const { data: taskDetail, isLoading: isDetailLoading } = useQuery({
    queryKey: ['task', detailTask?.id],
    queryFn: () => tasksApi.getById(detailTask!.id).then((r) => r.data),
    enabled: !!detailTask,
  })

  const { data: recommendations, isLoading: isRecsLoading, refetch: fetchRecs } = useQuery({
    queryKey: ['recommendations', id],
    queryFn: () => aiApi.getRecommendations(id!).then((r) => r.data),
    enabled: false,
  })

  const [voiceStatus, setVoiceStatus] = useState<VoiceStatus>('idle')
  const [voiceMessage, setVoiceMessage] = useState<string | null>(null)
  const recognitionRef = useRef<any>(null)

  const { data: board } = useQuery({
    queryKey: ['board', id],
    queryFn: () => boardsApi.getById(id!).then((r) => r.data),
  })

  const { data: tasks, isLoading } = useQuery({
    queryKey: ['tasks', id, searchTerm],
    queryFn: () =>
      searchTerm
        ? tasksApi.search(id!, searchTerm).then((r) => r.data)
        : tasksApi.getByBoard(id!).then((r) => r.data),
  })

  const createMutation = useMutation({
    mutationFn: tasksApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks', id] })
      queryClient.invalidateQueries({ queryKey: ['boards'] })
      setShowCreate(false)
      setForm({ title: '', description: '', priority: 'Medium', deadline: '' })
    },
  })

  const updateMutation = useMutation({
    mutationFn: tasksApi.update,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks', id] })
      setEditTask(null)
    },
  })

  const completeMutation = useMutation({
    mutationFn: tasksApi.complete,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['tasks', id] }),
  })

  const deleteMutation = useMutation({
    mutationFn: tasksApi.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks', id] })
      queryClient.invalidateQueries({ queryKey: ['boards'] })
    },
  })

  const changeStatusMutation = useMutation({
    mutationFn: ({ taskId, status }: { taskId: string; status: string }) =>
      tasksApi.changeStatus(taskId, status),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['tasks', id] }),
  })

  const handleDragEnd = (result: DropResult) => {
    if (!result.destination) return
    if (result.source.droppableId === result.destination.droppableId) return
    changeStatusMutation.mutate({
      taskId: result.draggableId,
      status: result.destination.droppableId,
    })
  }

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault()
    createMutation.mutate({
      boardId: id!,
      title: form.title,
      description: form.description || undefined,
      priority: form.priority,
      deadline: form.deadline || undefined,
    })
  }

  const handleUpdate = (e: React.FormEvent) => {
    e.preventDefault()
    if (!editTask) return
    updateMutation.mutate({
      id: editTask.id,
      title: form.title,
      description: form.description || undefined,
      priority: form.priority,
      deadline: form.deadline || undefined,
    })
  }

  const openEdit = (task: TaskItemDto) => {
    setEditTask(task)
    setShowCreate(false)
    setForm({
      title: task.title,
      description: task.description ?? '',
      priority: task.priority,
      deadline: task.deadline ? task.deadline.split('T')[0] : '',
    })
  }

  const startListening = () => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition

    if (!SpeechRecognition) {
      alert('Ваш браузер не поддерживает голосовой ввод')
      return
    }

    const recognition = new SpeechRecognition()
    recognition.lang = 'ru-RU'
    recognition.continuous = false
    recognition.interimResults = false

    recognition.onstart = () => {
      setVoiceStatus('listening')
      setVoiceMessage(null)
    }

    recognition.onresult = async (event: any) => {
      const transcript = event.results[0][0].transcript
      setVoiceStatus('processing')
      setVoiceMessage(`Распознано: "${transcript}"`)

      try {
        const { data } = await tasksApi.processVoice(transcript, id!)
        setVoiceMessage(data.message ?? 'Готово')

        if (data.intent === 'SearchTasks' && data.searchQuery) {
          setSearchTerm(data.searchQuery)
          const { data: found } = await tasksApi.search(id!, data.searchQuery)
          if (found.length === 1) setDetailTask(found[0])
        }

        if (data.intent === 'GetRecommendations') {
          fetchRecs()
          setShowRecommendations(true)
        }

        queryClient.invalidateQueries({ queryKey: ['tasks', id] })
        queryClient.invalidateQueries({ queryKey: ['boards'] })
      } catch {
        setVoiceMessage('Ошибка обработки команды')
      } finally {
        setVoiceStatus('idle')
      }
    }

    recognition.onend = () => {
      if (voiceStatus === 'listening') setVoiceStatus('idle')
    }

    recognition.onerror = () => {
      setVoiceStatus('idle')
      setVoiceMessage('Ошибка микрофона')
    }

    recognitionRef.current = recognition
    recognition.start()
  }

  const stopListening = () => {
    recognitionRef.current?.stop()
    setVoiceStatus('idle')
  }

  const todoTasks = tasks?.filter((t) => t.status === 'Todo') ?? []
  const inProgressTasks = tasks?.filter((t) => t.status === 'InProgress') ?? []
  const doneTasks = tasks?.filter((t) => t.status === 'Done') ?? []

  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      <header className="border-b border-zinc-800 px-6 py-4 flex items-center gap-4">
        <button onClick={() => navigate('/boards')} className="text-zinc-500 hover:text-white transition-colors">
          ← Назад
        </button>
        <h1 className="text-xl font-bold">{board?.title ?? '...'}</h1>
        
        {board?.description && <span className="text-zinc-600 text-sm">{board.description}</span>}
      </header>
<DeadlineNotifier tasks={tasks ?? []} />
      <main className="max-w-6xl mx-auto px-6 py-8">
        <div className="flex flex-wrap items-center gap-3 mb-6">
          <input
            type="text"
            placeholder="Поиск задач..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="flex-1 min-w-48 bg-zinc-900 border border-zinc-800 rounded-lg px-4 py-2 text-white placeholder-zinc-600 focus:outline-none focus:border-indigo-500 transition-colors text-sm"
          />
          <button
            onClick={voiceStatus === 'listening' ? stopListening : startListening}
            disabled={voiceStatus === 'processing'}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
              voiceStatus === 'listening' ? 'bg-red-500 hover:bg-red-400 text-white animate-pulse'
              : voiceStatus === 'processing' ? 'bg-zinc-700 text-zinc-400 cursor-wait'
              : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-300'
            }`}
          >
            🎤{' '}
            {voiceStatus === 'listening' ? 'Слушаю...'
              : voiceStatus === 'processing' ? 'Обрабатываю...'
              : 'Голосовая команда'}
          </button>
          <button
            onClick={() => { fetchRecs(); setShowRecommendations(true) }}
            className="bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-sm font-semibold px-4 py-2 rounded-lg transition-colors"
          >
            ✨ Рекомендации
          </button>
          <button
            onClick={() => {
              setEditTask(null)
              setForm({ title: '', description: '', priority: 'Medium', deadline: '' })
              setShowCreate(true)
            }}
            className="bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors"
          >
            + Задача
          </button>
        </div>

        {voiceMessage && (
          <div className="mb-4 px-4 py-3 bg-indigo-500/10 border border-indigo-500/20 rounded-lg flex items-center justify-between">
            <span className="text-indigo-300 text-sm">🎤 {voiceMessage}</span>
            <button onClick={() => setVoiceMessage(null)} className="text-zinc-500 hover:text-white text-xs transition-colors">✕</button>
          </div>
        )}

        {(showCreate || editTask) && (
          <div className="mb-8 bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
            <h3 className="text-lg font-semibold mb-4">{editTask ? 'Редактировать задачу' : 'Новая задача'}</h3>
            <form onSubmit={editTask ? handleUpdate : handleCreate} className="space-y-3">
              <input
                type="text"
                placeholder="Название задачи"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-2.5 text-white placeholder-zinc-600 focus:outline-none focus:border-indigo-500 transition-colors"
              />
              <textarea
                placeholder="Описание (необязательно)"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                rows={2}
                className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-2.5 text-white placeholder-zinc-600 focus:outline-none focus:border-indigo-500 transition-colors resize-none"
              />
              <div className="flex gap-3">
                <select
                  value={form.priority}
                  onChange={(e) => setForm({ ...form, priority: e.target.value as TaskPriority })}
                  className="bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-indigo-500 transition-colors"
                >
                  <option value="Low">Низкий приоритет</option>
                  <option value="Medium">Средний приоритет</option>
                  <option value="High">Высокий приоритет</option>
                </select>
                <input
                  type="date"
                  value={form.deadline}
                  onChange={(e) => setForm({ ...form, deadline: e.target.value })}
                  className="bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-indigo-500 transition-colors"
                />
              </div>
              <div className="flex gap-2">
                <button
                  type="submit"
                  disabled={createMutation.isPending || updateMutation.isPending}
                  className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors"
                >
                  {editTask ? 'Сохранить' : 'Создать'}
                </button>
                <button
                  type="button"
                  onClick={() => { setShowCreate(false); setEditTask(null) }}
                  className="text-zinc-400 hover:text-white text-sm px-4 py-2 rounded-lg transition-colors"
                >
                  Отмена
                </button>
              </div>
            </form>
          </div>
        )}

        {isLoading ? (
          <div className="text-zinc-500 text-center py-20">Загружаем задачи...</div>
        ) : (
          <DragDropContext onDragEnd={handleDragEnd}>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {[
                { tasks: todoTasks, status: 'Todo' },
                { tasks: inProgressTasks, status: 'InProgress' },
                { tasks: doneTasks, status: 'Done' },
              ].map((col) => (
                <div key={col.status}>
                  <div className="flex items-center gap-2 mb-4">
                    <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${statusColor[col.status]}`}>
                      {statusLabel[col.status]}
                    </span>
                    <span className="text-zinc-600 text-sm">{col.tasks.length}</span>
                  </div>

                  <Droppable droppableId={col.status}>
                    {(provided, snapshot) => (
                      <div
                        ref={provided.innerRef}
                        {...provided.droppableProps}
                        className={`space-y-3 min-h-24 rounded-xl transition-colors ${snapshot.isDraggingOver ? 'bg-zinc-800/50' : ''}`}
                      >
                        {col.tasks.map((task, index) => (
                          <Draggable key={task.id} draggableId={task.id} index={index}>
                            {(provided, snapshot) => (
                              <div
                                ref={provided.innerRef}
                                {...provided.draggableProps}
                                {...provided.dragHandleProps}
                                className={`bg-zinc-900 border rounded-xl p-4 transition-all ${
                                  snapshot.isDragging
                                    ? 'border-indigo-500/50 shadow-lg shadow-indigo-500/10 rotate-1'
                                    : 'border-zinc-800 hover:border-zinc-700'
                                }`}
                              >
                                <div className="flex items-start justify-between gap-2 mb-2">
                                  <h4
                                    onClick={() => setDetailTask(task)}
                                    className="font-medium text-sm text-white leading-snug cursor-pointer hover:text-indigo-400 transition-colors"
                                  >
                                    {task.title}
                                  </h4>
                                  <div className="flex gap-1 shrink-0">
                                    {task.isVoiceCreated && (
                                      <span className="text-xs text-indigo-400" title="Создано голосом">🎤</span>
                                    )}
                                    <button onClick={() => openEdit(task)} className="text-zinc-600 hover:text-white transition-colors text-xs">✎</button>
                                    <button onClick={() => deleteMutation.mutate(task.id)} className="text-zinc-600 hover:text-red-400 transition-colors text-xs">✕</button>
                                  </div>
                                </div>

                                {task.description && (
                                  <p className="text-zinc-500 text-xs mb-3 line-clamp-2">{task.description}</p>
                                )}

                                <div className="flex items-center justify-between">
                                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${priorityColor[task.priority]}`}>
                                    {priorityLabel[task.priority]}
                                  </span>
                                  {task.deadline && (
                                    <span className="text-zinc-600 text-xs">
                                      {formatDeadline(task.deadline)}
                                    </span>
                                  )}
                                </div>

                                {task.status !== 'Done' && (
                                  <button
                                    onClick={() => completeMutation.mutate(task.id)}
                                    className="mt-3 w-full text-xs text-zinc-500 hover:text-green-400 border border-zinc-800 hover:border-green-400/30 rounded-lg py-1.5 transition-all"
                                  >
                                    ✓ Выполнено
                                  </button>
                                )}
                              </div>
                            )}
                          </Draggable>
                        ))}
                        {provided.placeholder}

                        {col.tasks.length === 0 && !snapshot.isDraggingOver && (
                          <div className="border border-dashed border-zinc-800 rounded-xl p-6 text-center text-zinc-700 text-sm">
                            Нет задач
                          </div>
                        )}
                      </div>
                    )}
                  </Droppable>
                </div>
              ))}
            </div>
          </DragDropContext>
        )}

        {/* Task Detail Modal */}
        {detailTask && (
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 px-4"
            onClick={() => setDetailTask(null)}
          >
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 w-full max-w-lg" onClick={(e) => e.stopPropagation()}>
              {isDetailLoading ? (
                <div className="text-zinc-500 text-center py-8">Загружаем...</div>
              ) : taskDetail ? (
                <>
                  <div className="flex items-start justify-between mb-4">
                    <h2 className="text-lg font-bold text-white pr-4">{taskDetail.title}</h2>
                    <button onClick={() => setDetailTask(null)} className="text-zinc-500 hover:text-white transition-colors shrink-0">✕</button>
                  </div>

                  <div className="space-y-3">
                    {taskDetail.description && (
                      <div>
                        <p className="text-xs text-zinc-500 mb-1">Описание</p>
                        <p className="text-sm text-zinc-300">{taskDetail.description}</p>
                      </div>
                    )}
                    <div className="flex gap-4">
                      <div>
                        <p className="text-xs text-zinc-500 mb-1">Статус</p>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusColor[taskDetail.status]}`}>{statusLabel[taskDetail.status]}</span>
                      </div>
                      <div>
                        <p className="text-xs text-zinc-500 mb-1">Приоритет</p>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${priorityColor[taskDetail.priority]}`}>{priorityLabel[taskDetail.priority]}</span>
                      </div>
                      {taskDetail.isVoiceCreated && (
                        <div>
                          <p className="text-xs text-zinc-500 mb-1">Источник</p>
                          <span className="text-xs text-indigo-400">🎤 Голосом</span>
                        </div>
                      )}
                    </div>
                    {taskDetail.deadline && (
                        <div>
                          <p className="text-xs text-zinc-500 mb-1">Дедлайн</p>
                          <p className="text-sm text-zinc-300">{formatDeadline(taskDetail.deadline)}</p>
                        </div>
                      )}
                    <div className="flex gap-4">
                      <div>
                        <p className="text-xs text-zinc-500 mb-1">Создано</p>
                        <p className="text-sm text-zinc-400">{new Date(taskDetail.createdAt).toLocaleDateString('ru-RU')}</p>
                      </div>
                      {taskDetail.updatedAt && (
                        <div>
                          <p className="text-xs text-zinc-500 mb-1">Обновлено</p>
                          <p className="text-sm text-zinc-400">{new Date(taskDetail.updatedAt).toLocaleDateString('ru-RU')}</p>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex gap-2 mt-6">
                    <button
                      onClick={() => { openEdit(taskDetail); setDetailTask(null) }}
                      className="flex-1 bg-zinc-800 hover:bg-zinc-700 text-white text-sm font-semibold py-2 rounded-lg transition-colors"
                    >
                      ✎ Редактировать
                    </button>
                    {taskDetail.status !== 'Done' && (
                      <button
                        onClick={() => { completeMutation.mutate(taskDetail.id); setDetailTask(null) }}
                        className="flex-1 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold py-2 rounded-lg transition-colors"
                      >
                        ✓ Выполнено
                      </button>
                    )}
                  </div>
                </>
              ) : null}
            </div>
          </div>
        )}

        {/* Recommendations Modal */}
        {showRecommendations && (
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 px-4"
            onClick={() => setShowRecommendations(false)}
          >
            <div
              className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 w-full max-w-lg max-h-[80vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-bold text-white">✨ AI Рекомендации</h2>
                <button onClick={() => setShowRecommendations(false)} className="text-zinc-500 hover:text-white transition-colors">✕</button>
              </div>

              {isRecsLoading ? (
                <div className="text-zinc-500 text-center py-8">AI анализирует задачи...</div>
              ) : recommendations ? (
                <>
                  {recommendations.summary && (
                    <div className="mb-4 px-4 py-3 bg-indigo-500/10 border border-indigo-500/20 rounded-lg">
                      <p className="text-indigo-300 text-sm">{recommendations.summary}</p>
                    </div>
                  )}
                  <div className="space-y-3">
                    {recommendations.recommendations.map((rec, index) => (
                      <div key={rec.taskId} className="bg-zinc-800 rounded-xl p-4 flex gap-4 items-start">
                        <span className="text-2xl font-black text-zinc-600 shrink-0">{index + 1}</span>
                        <div>
                          <p className="text-white font-medium text-sm mb-1">{rec.title}</p>
                          <p className="text-zinc-500 text-xs">{rec.reason}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <div className="text-zinc-600 text-center py-8">Нет данных</div>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  )
}