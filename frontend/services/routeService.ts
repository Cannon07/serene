import { api } from './api';
import { RoutePlanResponse, RoutePrepareResponse } from '../types/route';
import { RerouteRequest, RerouteResponse } from '../types/reroute';

export const routeService = {
  plan: (data: { user_id: string; origin: string; destination: string; departure_time?: string }): Promise<RoutePlanResponse> =>
    api.post('/api/routes/plan', data).then(r => r.data),
  prepare: (data: { user_id: string; route_id: string }): Promise<RoutePrepareResponse> =>
    api.post('/api/routes/prepare', data).then(r => r.data),
  reroute: (data: RerouteRequest): Promise<RerouteResponse> =>
    api.post('/api/routes/reroute', data).then(r => r.data),
};
