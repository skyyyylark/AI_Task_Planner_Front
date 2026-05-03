// src/api/profileApi.ts
import api from './axiosInstance'

export const profileApi = {
  linkTelegram: (chatId: string) =>
    api.post('/profile/link-telegram', { chatId }),
}