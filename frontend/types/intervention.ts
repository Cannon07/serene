export interface InterventionRequest {
  user_id: string;
  drive_id?: string;
  stress_score: number; // 0-1
  stress_level: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  current_location?: { latitude: number; longitude: number };
  destination?: string;
  current_route_calm_score?: number;
  context?: string;
}

export interface BreathingContent {
  name: string;
  duration_seconds: number;
  instructions: string[];
  audio_script?: string;
}

export interface GroundingContent {
  name: string;
  instructions: string[];
  audio_script?: string;
}

export interface RerouteOptionBrief {
  current_route_calm_score: number;
  alternative_route_name: string;
  alternative_route_calm_score: number;
  extra_time_minutes: number;
  maps_url: string;
}

export interface InterventionResponse {
  intervention_type: string;
  stress_level: string;
  stress_score: number;
  message: string;
  breathing_content?: BreathingContent;
  grounding_content?: GroundingContent;
  pull_over_guidance?: string[];
  reroute_available: boolean;
  reroute_option?: RerouteOptionBrief;
  sources: string[];
}
