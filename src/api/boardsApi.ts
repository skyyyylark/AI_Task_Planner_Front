import api from './axiosInstance'
import type { TaskBoardDto } from '../types'

export const boardsApi = {
  getAll: () =>
    api.get<TaskBoardDto[]>('/taskboards/getAllBoards'),

  getById: (id: string) =>
    api.get<TaskBoardDto>(`/taskboards/getBoardById/${id}`),

  create: (data: { title: string; description?: string }) =>
    api.post<TaskBoardDto>('/taskboards', data),

  update: (data: { id: string; title: string; description?: string }) =>
    api.put<string>('/taskboards/updateTaskBoard', data),

  delete: (id: string) =>
    api.delete(`/taskboards/deleteTaskBoard/${id}`),
}