import { create } from 'zustand';

interface OnboardingState {
  name: string;
  goal: string;
  deadline: string;
  experience: string;
  frequency: string;
  triggers: string[];
  preferences: string[];
  setName: (v: string) => void;
  setGoal: (v: string) => void;
  setDeadline: (v: string) => void;
  setExperience: (v: string) => void;
  setFrequency: (v: string) => void;
  toggleTrigger: (v: string) => void;
  togglePreference: (v: string) => void;
  reset: () => void;
}

export const useOnboardingStore = create<OnboardingState>((set) => ({
  name: '',
  goal: '',
  deadline: '',
  experience: '',
  frequency: '',
  triggers: [],
  preferences: [],
  setName: (name) => set({ name }),
  setGoal: (goal) => set({ goal }),
  setDeadline: (deadline) => set({ deadline }),
  setExperience: (experience) => set({ experience }),
  setFrequency: (frequency) => set({ frequency }),
  toggleTrigger: (t) => set((s) => ({ triggers: s.triggers.includes(t) ? s.triggers.filter(x => x !== t) : [...s.triggers, t] })),
  togglePreference: (p) => set((s) => ({ preferences: s.preferences.includes(p) ? s.preferences.filter(x => x !== p) : [...s.preferences, p] })),
  reset: () => set({ name: '', goal: '', deadline: '', experience: '', frequency: '', triggers: [], preferences: [] }),
}));
