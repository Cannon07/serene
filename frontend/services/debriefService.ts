import { api } from './api';
import { DebriefRequest, DebriefResponse } from '../types/debrief';

export const debriefService = {
  process: (data: DebriefRequest): Promise<DebriefResponse> =>
    api.post('/api/debrief/process', data).then(r => r.data),
};
