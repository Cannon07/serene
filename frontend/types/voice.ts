export type VoiceCommandType = 'STRESS_REPORT' | 'REROUTE' | 'PULL_OVER' | 'ETA_UPDATE' | 'END_DRIVE' | 'UNKNOWN';
export type VoiceAction = 'TRIGGER_INTERVENTION' | 'FIND_ROUTE' | 'FIND_SAFE_SPOT' | 'PROVIDE_ETA' | 'START_DEBRIEF' | 'NONE';

export interface VoiceCommandRequest {
  user_id: string;
  drive_id?: string;
  transcribed_text: string;
  context: 'PRE_DRIVE' | 'DURING_DRIVE' | 'POST_DRIVE';
  current_location?: { latitude: number; longitude: number };
  destination?: string;
  current_route_calm_score?: number;
}

export interface VoiceCommandResponse {
  understood: boolean;
  command_type: VoiceCommandType;
  action: VoiceAction;
  speech_response: string; // Text-to-speech friendly response
  intervention?: Record<string, unknown>; // Intervention details if triggered
  reroute?: Record<string, unknown>; // Reroute details if available
  eta_info?: Record<string, unknown>; // ETA information if requested
}
