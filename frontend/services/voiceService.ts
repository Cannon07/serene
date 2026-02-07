import { api } from './api';
import { VoiceCommandRequest, VoiceCommandResponse } from '../types/voice';

export const voiceService = {
  sendCommand: (data: VoiceCommandRequest): Promise<VoiceCommandResponse> =>
    api.post('/api/voice/command', data).then(r => r.data),

  /** Transcribe audio blob via OpenAI Whisper. Returns transcribed text. */
  transcribe: (blob: Blob): Promise<{ text: string }> => {
    const formData = new FormData();
    formData.append('file', blob, 'audio.webm');
    return api
      .post('/api/voice/transcribe', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      .then((r) => r.data);
  },

  /** Convert text to speech via OpenAI TTS. Returns audio Blob (mp3). */
  speak: (text: string, voice = 'nova'): Promise<Blob> => {
    const formData = new FormData();
    formData.append('text', text);
    formData.append('voice', voice);
    return api
      .post('/api/voice/speak', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        responseType: 'blob',
      })
      .then((r) => r.data);
  },
};
