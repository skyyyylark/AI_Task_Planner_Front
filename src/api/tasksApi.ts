import api from './axiosInstance'
import type { TaskItemDto, TaskPriority, VoiceResultDto } from '../types'

const priorityMap: Record<TaskPriority, number> = {
  Low: 0,
  Medium: 1,
  High: 2,
}


export const tasksApi = {
  getByBoard: (boardId: string) =>
    api.get<TaskItemDto[]>('/taskitems/getTasksByBoard', { params: { boardId } }),

  getById: (taskId: string) =>
    api.get<TaskItemDto>(`/taskitems/getTaskDetailsById/${taskId}`),

  search: (boardId: string, searchTerm: string) =>
    api.get<TaskItemDto[]>('/taskitems/searchTaskByTerm', { params: { boardId, searchTerm } }),

  processVoice: (text: string, boardId: string) =>
    api.post<VoiceResultDto>('/voice/process', { text, boardId }),

create: (data: {
  boardId: string
  title: string
  description?: string
  priority: TaskPriority
  deadline?: string
  isVoiceCreated?: boolean
}) => api.post<TaskItemDto>('/taskitems/createTask', {
  ...data,
  priority: priorityMap[data.priority],
}),

  update: (data: {
    id: string
    title: string
    description?: string
    priority: TaskPriority
    deadline?: string
  }) => api.put<string>('/taskitems/updateTask', data),

  complete: (taskId: string) =>
    api.patch<string>('/taskitems/completeTask', taskId),

  delete: (taskId: string) =>
    api.delete(`/taskitems/deleteTask/${taskId}`),
  
  changeStatus: (taskId: string, status: string) =>
  api.patch(`/taskitems/changeStatus/${taskId}`, JSON.stringify(status), {
    headers: { 'Content-Type': 'application/json' }
  }),
}
