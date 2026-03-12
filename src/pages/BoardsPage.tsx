import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { boardsApi } from '../api/boardsApi'
import { useAuthStore } from '../store/authStore'
import type { TaskBoardDto } from '../types'

export default function BoardsPage() {
  const navigate = useNavigate()
  const logout = useAuthStore((s) => s.logout)
  const queryClient = useQueryClient()

  const [showCreate, setShowCreate] = useState(false)
  const [form, setForm] = useState({ title: '', description: '' })

  const { data: boards, isLoading } = useQuery({
    queryKey: ['boards'],
    queryFn: () => boardsApi.getAll().then((r) => r.data),
  })

  const createMutation = useMutation({
    mutationFn: boardsApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['boards'] })
      setShowCreate(false)
      setForm({ title: '', description: '' })
    },
  })

  const deleteMutation = useMutation({
    mutationFn: boardsApi.delete,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['boards'] }),
  })

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault()
    createMutation.mutate(form)
  }

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      {/* Header */}
      <header className="border-b border-zinc-800 px-6 py-4 flex items-center justify-between">
        <h1 className="text-2xl font-black tracking-tighter">
          task<span className="text-indigo-500">planner</span>
        </h1>
        <button
          onClick={handleLogout}
          className="text-zinc-500 hover:text-white text-sm transition-colors"
        >
          Выйти
        </button>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-10">
        {/* Title row */}
        <div className="flex items-center justify-between mb-8">
          <h2 className="text-2xl font-bold">Мои доски</h2>
          <button
            onClick={() => setShowCreate(true)}
            className="bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors"
          >
            + Новая доска
          </button>
        </div>

        {/* Create form */}
        {showCreate && (
          <div className="mb-6 bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
            <h3 className="text-lg font-semibold mb-4">Новая доска</h3>
            <form onSubmit={handleCreate} className="space-y-3">
              <input
                type="text"
                placeholder="Название доски"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-2.5 text-white placeholder-zinc-600 focus:outline-none focus:border-indigo-500 transition-colors"
              />
              <input
                type="text"
                placeholder="Описание (необязательно)"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-2.5 text-white placeholder-zinc-600 focus:outline-none focus:border-indigo-500 transition-colors"
              />
              <div className="flex gap-2">
                <button
                  type="submit"
                  disabled={createMutation.isPending}
                  className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors"
                >
                  {createMutation.isPending ? 'Создаём...' : 'Создать'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowCreate(false)}
                  className="text-zinc-400 hover:text-white text-sm px-4 py-2 rounded-lg transition-colors"
                >
                  Отмена
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Boards grid */}
        {isLoading ? (
          <div className="text-zinc-500 text-center py-20">Загружаем доски...</div>
        ) : boards?.length === 0 ? (
          <div className="text-zinc-600 text-center py-20">
            <p className="text-lg">Досок пока нет</p>
            <p className="text-sm mt-1">Создайте первую доску чтобы начать</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {boards?.map((board: TaskBoardDto) => (
              <div
                key={board.id}
                onClick={() => navigate(`/boards/${board.id}`)}
                className="bg-zinc-900 border border-zinc-800 hover:border-indigo-500/50 rounded-2xl p-6 cursor-pointer transition-all group"
              >
                <div className="flex items-start justify-between mb-3">
                  <h3 className="font-semibold text-white group-hover:text-indigo-400 transition-colors">
                    {board.title}
                  </h3>
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      deleteMutation.mutate(board.id)
                    }}
                    className="text-zinc-600 hover:text-red-400 transition-colors text-sm"
                  >
                    ✕
                  </button>
                </div>
                {board.description && (
                  <p className="text-zinc-500 text-sm mb-4 line-clamp-2">{board.description}</p>
                )}
                <div className="text-xs text-zinc-600">
                  {board.taskCount} {board.taskCount === 1 ? 'задача' : 'задач'}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}