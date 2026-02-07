import { api } from './api';
import {
  DriveStartRequest,
  DriveStartResponse,
  DriveDetail,
  DriveEndResponse,
  ActiveDriveResponse,
  DriveListResponse,
  AcceptRerouteRequest,
  AcceptRerouteResponse,
  DriveRatingRequest,
  DriveRatingResponse,
} from '../types/drive';

export const driveService = {
  start: (data: DriveStartRequest): Promise<DriveStartResponse> =>
    api.post('/api/drives/start', data).then(r => r.data),
  get: (id: string): Promise<DriveDetail> =>
    api.get(`/api/drives/${id}`).then(r => r.data),
  end: (id: string): Promise<DriveEndResponse> =>
    api.post(`/api/drives/${id}/end`).then(r => r.data),
  getActive: (userId: string): Promise<ActiveDriveResponse> =>
    api.get(`/api/users/${userId}/active-drive`).then(r => r.data),
  getHistory: (userId: string, limit = 10, offset = 0): Promise<DriveListResponse> =>
    api.get(`/api/users/${userId}/drives`, { params: { limit, offset } }).then(r => r.data),
  acceptReroute: (driveId: string, data: AcceptRerouteRequest): Promise<AcceptRerouteResponse> =>
    api.post(`/api/drives/${driveId}/accept-reroute`, data).then(r => r.data),
  rate: (driveId: string, data: DriveRatingRequest): Promise<DriveRatingResponse> =>
    api.post(`/api/drives/${driveId}/rate`, data).then(r => r.data),
};
