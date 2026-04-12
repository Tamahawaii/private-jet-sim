import { create } from 'zustand';

export type FlightPhase = 'Hangar' | 'Pre-flight' | 'Taxi' | 'Takeoff' | 'Cruise' | 'Landing';
export type ActiveView = 'Fleet' | 'Logistics' | 'Configurator' | 'StateMachine';
export type ModuleType = 'Executive' | 'MasterSuite' | 'Galley' | 'Cinema' | 'Empty';

export interface LocationData {
  lat: number;
  lng: number;
  name: string;
}

export interface Aircraft {
  id: string;
  tailNumber: string;
  model: string;
  flightPhase: FlightPhase;
  currentLocation: LocationData;
  destination: LocationData | null;
  lockedUntil: number | null; 
}

interface AppState {
  fleet: Aircraft[];
  selectedAircraftId: string | null;
  weatherEnabled: boolean;
  activeView: ActiveView;
  cabinSlots: ModuleType[];
  timeMultiplier: number;
  
  addAircraft: (tailNumber: string, model: string) => void;
  updateAircraft: (id: string, updates: Partial<Aircraft>) => void;
  setSelectedAircraftId: (id: string | null) => void;
  setWeatherEnabled: (enabled: boolean) => void;
  setActiveView: (view: ActiveView) => void;
  setCabinSlot: (index: number, module: ModuleType) => void;
  setTimeMultiplier: (multiplier: number) => void;
}

export const MAIN_HUBS: Record<string, LocationData> = {
  LAX: { lat: 33.9416, lng: -118.4085, name: 'LAX' },
  HNL: { lat: 21.3204, lng: -157.9255, name: 'HNL' },
  JFK: { lat: 40.6413, lng: -73.7781, name: 'JFK' },
  LHR: { lat: 51.4700, lng: -0.4543, name: 'LHR' },
  DXB: { lat: 25.2532, lng: 55.3657, name: 'DXB' }
};

export const useStore = create<AppState>((set) => ({
  fleet: [
    {
      id: 'mock-1',
      tailNumber: 'N174JS',
      model: 'Gulfstream G650ER',
      flightPhase: 'Hangar',
      currentLocation: MAIN_HUBS.LAX,
      destination: MAIN_HUBS.HNL,
      lockedUntil: null
    }
  ],
  selectedAircraftId: 'mock-1',
  weatherEnabled: false,
  activeView: 'Fleet', 
  cabinSlots: ['Empty', 'Empty', 'Empty', 'Empty'],
  timeMultiplier: 60, // Default 60x speed
  
  addAircraft: (tailNumber, model) => set((state) => ({
    fleet: [
      ...state.fleet,
      {
        id: crypto.randomUUID(),
        tailNumber,
        model,
        flightPhase: 'Hangar',
        currentLocation: MAIN_HUBS.LAX,
        destination: null,
        lockedUntil: null
      }
    ]
  })),

  updateAircraft: (id, updates) => set((state) => ({
    fleet: state.fleet.map(jet => jet.id === id ? { ...jet, ...updates } : jet)
  })),

  setSelectedAircraftId: (id) => set({ selectedAircraftId: id }),
  setWeatherEnabled: (enabled) => set({ weatherEnabled: enabled }),
  setActiveView: (view) => set({ activeView: view }),
  setCabinSlot: (index, module) => set((state) => {
    const newSlots = [...state.cabinSlots];
    newSlots[index] = module;
    return { cabinSlots: newSlots };
  }),
  setTimeMultiplier: (m) => set({ timeMultiplier: m })
}));
