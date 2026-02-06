import { api } from './api';
import { User, UserCreate, UserUpdate, UserStats } from '../types/user';

export const userService = {
  create: (data: UserCreate): Promise<User> =>
    api.post('/api/users', data).then(r => r.data),
  get: (id: string): Promise<User> =>
    api.get(`/api/users/${id}`).then(r => r.data),
  update: (id: string, data: UserUpdate): Promise<User> =>
    api.put(`/api/users/${id}`, data).then(r => r.data),
  getStats: (id: string): Promise<UserStats> =>
    api.get(`/api/users/${id}/stats`).then(r => r.data),
};
