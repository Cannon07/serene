export interface Location {
  latitude: number; // -90 to 90
  longitude: number; // -180 to 180
}

export interface RerouteRequest {
  user_id: string;
  current_location: Location;
  destination: string;
  current_route_calm_score?: number;
  drive_id?: string;
}

export interface RerouteOption {
  name: string;
  calm_score: number;
  stress_level: string;
  duration_minutes: number;
  distance_km: number;
  extra_time_minutes: number;
  calm_score_improvement: number;
  maps_url: string; // Google Maps deep link
  stress_points: { location: string; type: string; severity: string }[];
}

export interface RerouteResponse {
  reroute_available: boolean;
  message: string;
  current_route?: Record<string, unknown>;
  suggested_route?: RerouteOption;
}
