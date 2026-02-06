export interface VideoAnalysisResult {
  stress_score: number;
  stress_level: string;
  emotions: { fear: number; anxiety: number; anger: number; joy: number; calm: number };
  detected_concerns: string[];
  recommendations: string[];
}

export interface AudioAnalysisResult {
  stress_score: number;
  stress_level: string;
  trigger_intervention: boolean;
  intervention_type?: string;
}
