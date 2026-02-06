import { create } from 'zustand';
import { DriveStartResponse } from '../types/drive';
import { Route } from '../types/route';
import { RerouteOption } from '../types/reroute';
import { VoiceCommandResponse } from '../types/voice';

interface DriveState {
  origin: string;
  destination: string;
  routes: Route[];
  selectedRoute: Route | null;
  activeDrive: DriveStartResponse | null;
  currentLocation: { latitude: number; longitude: number } | null;
  isListening: boolean;
  lastVoiceResponse: VoiceCommandResponse | null;
  rerouteOption: RerouteOption | null;
  setOrigin: (v: string) => void;
  setDestination: (v: string) => void;
  setRoutes: (v: Route[]) => void;
  setSelectedRoute: (v: Route | null) => void;
  setActiveDrive: (v: DriveStartResponse | null) => void;
  setCurrentLocation: (v: { latitude: number; longitude: number } | null) => void;
  setIsListening: (v: boolean) => void;
  setLastVoiceResponse: (v: VoiceCommandResponse | null) => void;
  setRerouteOption: (v: RerouteOption | null) => void;
  clear: () => void;
}

export const useDriveStore = create<DriveState>((set) => ({
  origin: '',
  destination: '',
  routes: [],
  selectedRoute: null,
  activeDrive: null,
  currentLocation: null,
  isListening: false,
  lastVoiceResponse: null,
  rerouteOption: null,
  setOrigin: (origin) => set({ origin }),
  setDestination: (destination) => set({ destination }),
  setRoutes: (routes) => set({ routes }),
  setSelectedRoute: (selectedRoute) => set({ selectedRoute }),
  setActiveDrive: (activeDrive) => set({ activeDrive }),
  setCurrentLocation: (currentLocation) => set({ currentLocation }),
  setIsListening: (isListening) => set({ isListening }),
  setLastVoiceResponse: (lastVoiceResponse) => set({ lastVoiceResponse }),
  setRerouteOption: (rerouteOption) => set({ rerouteOption }),
  clear: () => set({ origin: '', destination: '', routes: [], selectedRoute: null, activeDrive: null, currentLocation: null, isListening: false, lastVoiceResponse: null, rerouteOption: null }),
}));
