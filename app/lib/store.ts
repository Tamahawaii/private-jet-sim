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
  playerCash: number;
  mapStyle: 'FlightAware' | 'Satellite' | 'Dark' | 'Roads';
  zenMode: boolean;
  activeView: 'Map' | 'Fleet' | 'Shop';

  setSelectedAircraftId: (id: string | null) => void;
  setProvisionalRoute: (route: { origin: LocationData, destination: LocationData } | null) => void;
  setWeatherEnabled: (enabled: boolean) => void;
  setZenMode: (enabled: boolean) => void;
  setActiveView: (view: 'Map' | 'Fleet' | 'Shop') => void;
  setMapStyle: (style: 'FlightAware' | 'Satellite' | 'Dark' | 'Roads') => void;
  setTimeMultiplier: (m: number) => void;
  setPlayerCash: (amount: number) => void;
}

export const useStore = create<AppState>()((set, get) => ({
  selectedAircraftId: null,
  weatherEnabled: true,
  timeMultiplier: 1,
  provisionalRoute: null,
  
  playerLevel: 1,
  playerCash: 79700000000, // $79.7B matching spec
  mapStyle: 'FlightAware',
  zenMode: true,
  activeView: 'Map',

  setSelectedAircraftId: (id) => set({ selectedAircraftId: id }),
  setProvisionalRoute: (route) => set({ provisionalRoute: route }),
  setWeatherEnabled: (enabled) => set({ weatherEnabled: enabled }),
  setZenMode: (enabled) => set({ zenMode: enabled }),
  setActiveView: (view) => set({ activeView: view }),
  setMapStyle: (style) => set({ mapStyle: style }),
  setTimeMultiplier: (m) => set({ timeMultiplier: m }),
  setPlayerCash: (amount) => set({ playerCash: amount })
}));
