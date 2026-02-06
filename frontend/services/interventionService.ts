import { api } from './api';
import { InterventionRequest, InterventionResponse } from '../types/intervention';

export const interventionService = {
  decide: (data: InterventionRequest): Promise<InterventionResponse> =>
    api.post('/api/intervention/decide', data).then(r => r.data),
  getCalmingMessage: (data: InterventionRequest): Promise<InterventionResponse> =>
    api.post('/api/intervention/calming-message', data).then(r => r.data),
  getBreathingExercise: (data: InterventionRequest): Promise<InterventionResponse> =>
    api.post('/api/intervention/breathing-exercise', data).then(r => r.data),
  getGroundingExercise: (data: InterventionRequest): Promise<InterventionResponse> =>
    api.post('/api/intervention/grounding-exercise', data).then(r => r.data),
};
