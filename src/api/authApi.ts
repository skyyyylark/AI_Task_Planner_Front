import api from './axiosInstance'
import type { AuthResponseDto } from '../types'

export const authApi = {
  register: (data: { username: string; email: string; password: string }) =>
    api.post('/auth/register', data),

  login: (data: { email: string; password: string }) =>
    api.post<AuthResponseDto>('/auth/login', data),

  logout: (refreshToken: string) =>
    api.post('/auth/logout', { refreshToken }),

  refresh: (refreshToken: string) =>
    api.post<AuthResponseDto>('/auth/refresh', { refreshToken }),
}