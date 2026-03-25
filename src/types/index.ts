export interface AuthResponseDto {
  accessToken: string
  refreshToken: string
  expiresAt: string
}

export interface TaskBoardDto {
  id: string
  title: string
  description: string | null
  createdAt: string
  taskCount: number
}

export type TaskStatus = 'Todo' | 'InProgress' | 'Done'
export type TaskPriority = 'Low' | 'Medium' | 'High'

export interface TaskItemDto {
  id: string
  title: string
  description: string | null
  status: TaskStatus
  priority: TaskPriority
  deadline: string | null
  isVoiceCreated: boolean
  createdAt: string
  updatedAt: string | null
}

export interface VoiceResultDto {
  intent: string
  title: string | null
  description: string | null
  priority: TaskPriority | null
  deadline: string | null
  searchQuery: string | null
  message: string | null
}

export interface TaskRecommendationItemDto {
  taskId: string
  title: string
  order: number
  reason: string
}

export interface TaskRecommendationsDto {
  recommendations: TaskRecommendationItemDto[]
  summary: string
}