import { create } from 'zustand';
import { InterventionResponse } from '../types/intervention';

interface InterventionState {
  activeIntervention: InterventionResponse | null;
  isVisible: boolean;
  setActiveIntervention: (v: InterventionResponse | null) => void;
  setIsVisible: (v: boolean) => void;
  dismiss: () => void;
}

export const useInterventionStore = create<InterventionState>((set) => ({
  activeIntervention: null,
  isVisible: false,
  setActiveIntervention: (activeIntervention) => set({ activeIntervention, isVisible: !!activeIntervention }),
  setIsVisible: (isVisible) => set({ isVisible }),
  dismiss: () => set({ activeIntervention: null, isVisible: false }),
}));
