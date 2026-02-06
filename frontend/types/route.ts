export type StressLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export interface StressPoint {
  location: string;
  type: string;
  severity: string;
}

export interface StressPointWithTip extends StressPoint {
  tip: string;
}

export interface BreathingExercise {
  name: string;
  duration_seconds: number;
  instructions: string[];
}

export interface Route {
  id: string;
  name: string;
  duration_minutes: number;
  distance_km: number;
  calm_score: number;
  stress_level: string;
  is_recommended: boolean;
  stress_points: StressPoint[];
  polyline: string;
  maps_url?: string; // Google Maps deep link
}

export interface RoutePlanResponse {
  routes: Route[];
}

export interface RoutePrepareResponse {
  checklist: string[];
  stress_points_with_tips: StressPointWithTip[];
  breathing_exercise: BreathingExercise;
}
