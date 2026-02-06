import { api } from './api';
import { VoiceCommandRequest, VoiceCommandResponse } from '../types/voice';

export const voiceService = {
  sendCommand: (data: VoiceCommandRequest): Promise<VoiceCommandResponse> =>
    api.post('/api/voice/command', data).then(r => r.data),
};
