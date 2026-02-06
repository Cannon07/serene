import { api } from './api';
import { DashboardMetrics, UserMetrics, EventSummary } from '../types/metrics';

export const metricsService = {
  getDashboard: (): Promise<DashboardMetrics> =>
    api.get('/api/metrics/dashboard').then(r => r.data),
  getUserMetrics: (userId: string): Promise<UserMetrics> =>
    api.get(`/api/metrics/user/${userId}`).then(r => r.data),
  getEventSummary: (): Promise<EventSummary> =>
    api.get('/api/metrics/events/summary').then(r => r.data),
};
