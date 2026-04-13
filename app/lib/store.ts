import { create } from 'zustand';

export interface LocationData {
  lat: number;
  lng: number;
  name: string;
}

interface AppState {
  selectedAircraftId: string | null;
  weatherEnabled: boolean;
  timeMultiplier: number;
  provisionalRoute: { origin: LocationData, destination: LocationData } | null;
  
  playerLevel: number;
  mapStyle: 'FlightAware' | 'Satellite' | 'Dark' | 'Roads';
  zenMode: boolean;
  activeView: 'Map' | 'Fleet' | 'Shop';

  // Sim Clock State
  baselineRealTime: number;
  baselineSimTime: number;

  setSelectedAircraftId: (id: string | null) => void;
  setProvisionalRoute: (route: { origin: LocationData, destination: LocationData } | null) => void;
  setWeatherEnabled: (enabled: boolean) => void;
  setZenMode: (enabled: boolean) => void;
  setActiveView: (view: 'Map' | 'Fleet' | 'Shop') => void;
  setMapStyle: (style: 'FlightAware' | 'Satellite' | 'Dark' | 'Roads') => void;
  
  // Advanced Simulation Controls
  setTimeMultiplier: (m: number) => void;
  advanceSimClock: (ms: number) => void;
  getNow: () => number;
}

export const useStore = create<AppState>()((set, get) => ({
  selectedAircraftId: null,
  weatherEnabled: true,
  timeMultiplier: 1,
  provisionalRoute: null,
  
  playerLevel: 1,
  mapStyle: 'Dark',
  zenMode: true,
  activeView: 'Map',

  baselineRealTime: Date.now(),
  baselineSimTime: Date.now(),

  setSelectedAircraftId: (id) => set({ selectedAircraftId: id }),
  setProvisionalRoute: (route) => set({ provisionalRoute: route }),
  setWeatherEnabled: (enabled) => set({ weatherEnabled: enabled }),
  setZenMode: (enabled) => set({ zenMode: enabled }),
  setActiveView: (view) => set({ activeView: view }),
  setMapStyle: (style) => set({ mapStyle: style }),
  
  setTimeMultiplier: (m) => {
    const currentSimTime = get().getNow();
    set({ 
      timeMultiplier: m,
      baselineRealTime: Date.now(),
      baselineSimTime: currentSimTime
    });
  },

  advanceSimClock: (ms) => {
    const currentSimTime = get().getNow();
    set({
      baselineRealTime: Date.now(),
      baselineSimTime: currentSimTime + ms
    });
  },

  getNow: () => {
    const state = get();
    const realElapsed = Date.now() - state.baselineRealTime;
    return state.baselineSimTime + (realElapsed * state.timeMultiplier);
  }
}));
