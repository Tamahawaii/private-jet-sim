import { create } from 'zustand';

export interface LocationData {
  lat: number;
  lng: number;
  name: string;
}

export interface ToastMessage {
  id: string;
  message: string;
  link?: string;
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

  // Toasts
  toasts: ToastMessage[];
  addToast: (toast: Omit<ToastMessage, 'id'>) => void;
  removeToast: (id: string) => void;

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

  toasts: [],
  addToast: (t) => {
     const id = Math.random().toString(36).slice(2);
     set((s) => ({ toasts: [...s.toasts, { id, ...t }] }));
     // Auto remove after 6s
     setTimeout(() => {
        set((s) => ({ toasts: s.toasts.filter(toast => toast.id !== id) }));
     }, 6000);
  },
  removeToast: (id) => set((s) => ({ toasts: s.toasts.filter(t => t.id !== id) })),

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
