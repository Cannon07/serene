export interface DebriefRequest {
  user_id: string;
  drive_id: string;
  post_drive_stress_score?: number; // 0-1
}

export interface EmotionalJourney {
  pre_drive: { stress: number; level: string };
  post_drive: { stress: number; level: string };
  improvement: number;
}

export interface DebriefResponse {
  emotional_journey: EmotionalJourney;
  learnings: string[];
  profile_updates: string[];
  encouragement: string;
}
