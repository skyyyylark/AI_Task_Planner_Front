import api from './axiosInstance'
import type { TaskRecommendationsDto } from '../types'

export const aiApi = {
  getRecommendations: (boardId: string) =>
    api.get<TaskRecommendationsDto>(`/taskitems/recommendations/${boardId}`),
}