export type ResolutionGoal = 'WORK_COMMUTE' | 'HIGHWAY_ANXIETY' | 'LONGER_TRIPS' | 'NIGHT_DRIVING' | 'VISIT_FAMILY' | 'OTHER';
export type DrivingExperience = 'NEW' | 'SOME' | 'EXPERIENCED';
export type DrivingFrequency = 'DAILY' | 'FEW_TIMES_WEEK' | 'OCCASIONALLY' | 'RARELY';
export type StressTrigger = 'HEAVY_TRAFFIC' | 'HONKING' | 'HIGHWAYS' | 'NIGHT_DRIVING' | 'COMPLEX_INTERSECTIONS' | 'CONSTRUCTION' | 'PEDESTRIAN_AREAS';
export type CalmingPreference = 'CALMING_MUSIC' | 'DEEP_BREATHING' | 'TALKING' | 'PULLING_OVER' | 'SILENCE';

export interface StressTriggerItem {
  trigger: StressTrigger;
  severity: number; // 1-5
}

export interface CalmingPreferenceItem {
  preference: CalmingPreference;
  effectiveness: number; // 1-5
}

export interface UserCreate {
  name: string;
  resolution_goal: ResolutionGoal;
  resolution_deadline?: string; // ISO date
  driving_experience: DrivingExperience;
  driving_frequency: DrivingFrequency;
  stress_triggers: StressTrigger[];
  calming_preferences: CalmingPreference[];
}

export interface UserUpdate {
  name?: string;
  resolution_goal?: ResolutionGoal;
  resolution_deadline?: string;
  driving_experience?: DrivingExperience;
  driving_frequency?: DrivingFrequency;
  stress_triggers?: StressTrigger[];
  calming_preferences?: CalmingPreference[];
}

export interface User {
  id: string;
  name: string;
  resolution_goal: ResolutionGoal;
  resolution_deadline: string | null;
  driving_experience: DrivingExperience;
  driving_frequency: DrivingFrequency;
  stress_triggers: StressTriggerItem[];
  calming_preferences: CalmingPreferenceItem[];
  created_at: string;
}

export interface UserStats {
  total_drives: number;
  completed_drives: number;
  average_pre_stress: number | null;
  average_post_stress: number | null;
  stress_improvement: number | null;
  reroute_acceptance_rate: number | null;
  drives_this_week: number;
  current_streak: number;
}
