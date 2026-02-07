export type RouteType = 'FASTEST' | 'CALMEST';
export type EventType = 'STRESS_DETECTED' | 'INTERVENTION' | 'REROUTE_OFFERED' | 'REROUTE_ACCEPTED' | 'VOICE_COMMAND' | 'PULL_OVER_REQUESTED';

export interface DriveStartRequest {
  user_id: string;
  origin: string;
  destination: string;
  selected_route_type: RouteType;
  pre_drive_stress?: number; // 0-1
  maps_url?: string;
}

export interface DriveStartResponse {
  id: string;
  user_id: string;
  started_at: string;
  origin: string;
  destination: string;
  selected_route_type: string;
  pre_drive_stress: number | null;
  maps_url: string | null;
  status: 'IN_PROGRESS' | 'COMPLETED';
}

export interface DriveEvent {
  id: string;
  timestamp: string;
  event_type: EventType;
  stress_level: number | null;
  details: Record<string, unknown> | null;
}

export interface DriveDetail {
  id: string;
  user_id: string;
  started_at: string;
  completed_at: string | null;
  origin: string;
  destination: string;
  selected_route_type: string;
  pre_drive_stress: number | null;
  post_drive_stress: number | null;
  interventions_triggered: number;
  reroutes_offered: number;
  reroutes_accepted: number;
  rating: number | null;
  events: DriveEvent[];
}

export interface DriveSummary {
  events_count: number;
  interventions_triggered: number;
  reroutes_offered: number;
  reroutes_accepted: number;
  avg_stress_level: number | null;
}

export interface DriveEndResponse {
  id: string;
  completed_at: string;
  duration_minutes: number;
  summary: DriveSummary;
}

export interface ActiveDriveResponse {
  id: string;
  started_at: string;
  origin: string;
  destination: string;
  selected_route_type: string;
  pre_drive_stress: number | null;
  maps_url: string | null;
  events_count: number;
  latest_stress_level: number | null;
}

export interface DriveListItem {
  id: string;
  started_at: string;
  completed_at: string | null;
  origin: string;
  destination: string;
  pre_drive_stress: number | null;
  post_drive_stress: number | null;
  rating: number | null;
}

export interface DriveListResponse {
  drives: DriveListItem[];
  total: number;
  limit: number;
  offset: number;
}

export interface AcceptRerouteRequest {
  route_name: string;
  calm_score_improvement?: number;
}

export interface AcceptRerouteResponse {
  success: boolean;
  reroutes_accepted: number;
}

export interface DriveRatingRequest {
  rating: number; // 1-5
}

export interface DriveRatingResponse {
  success: boolean;
  drive_id: string;
  rating: number;
}
