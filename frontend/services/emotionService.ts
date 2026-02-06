import { api } from './api';
import { VideoAnalysisResult, AudioAnalysisResult } from '../types/emotion';

export const emotionService = {
  analyzeVideo: (blob: Blob, context: string): Promise<VideoAnalysisResult> => {
    const formData = new FormData();
    formData.append('file', blob, 'video.webm');
    formData.append('context', context);
    return api.post('/api/emotion/video', formData, { headers: { 'Content-Type': 'multipart/form-data' } }).then(r => r.data);
  },
  analyzeAudio: (blob: Blob, driveId?: string): Promise<AudioAnalysisResult> => {
    const formData = new FormData();
    formData.append('file', blob, 'audio.webm');
    if (driveId) formData.append('drive_id', driveId);
    return api.post('/api/emotion/audio', formData, { headers: { 'Content-Type': 'multipart/form-data' } }).then(r => r.data);
  },
};
