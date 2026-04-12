import { create } from 'zustand';

export type FlightPhase = 'Hangar' | 'Pre-flight' | 'Taxi' | 'Takeoff' | 'Cruise' | 'Landing';
export type ActiveView = 'Fleet' | 'Logistics' | 'Configurator' | 'StateMachine';
export type ModuleType = 'Executive' | 'MasterSuite' | 'Galley' | 'Cinema' | 'Empty';

export interface LocationData {
  lat: number;
  lng: number;
  name: string;
}

export interface RouteLeg {
  id: string;
  origin: LocationData;
  destination: LocationData;
}

export interface Aircraft {
  id: string;
  tailNumber: string;
  model: string;
  speedKnots: number;
  flightPhase: FlightPhase;
  currentLocation: LocationData;
  destination: LocationData | null;
  scheduledRoutes: RouteLeg[];
  lockedUntil: number | null; 
  launchedAt: number | null;
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
  setAircraftRoute: (id: string, originName: string, destinationName: string) => void;
  addScheduledLeg: (aircraftId: string, originName: string, destinationName: string) => void;
  removeScheduledLeg: (aircraftId: string, legId: string) => void;
  clearSchedule: (aircraftId: string) => void;
}

export const MAIN_HUBS: Record<string, LocationData> = {
  LAX: { lat: 33.9416, lng: -118.4085, name: 'LAX' },
  SFO: { lat: 37.6213, lng: -122.3790, name: 'SFO' },
  JFK: { lat: 40.6413, lng: -73.7781, name: 'JFK' },
  MIA: { lat: 25.7959, lng: -80.2870, name: 'MIA' },
  ORD: { lat: 41.9742, lng: -87.9073, name: 'ORD' },
  LHR: { lat: 51.4700, lng: -0.4543, name: 'LHR' },
  CDG: { lat: 49.0097, lng: 2.5479, name: 'CDG' },
  FRA: { lat: 50.0379, lng: 8.5622, name: 'FRA' },
  DXB: { lat: 25.2532, lng: 55.3657, name: 'DXB' },
  HND: { lat: 35.5494, lng: 139.7798, name: 'HND' },
  HKG: { lat: 22.3080, lng: 113.9185, name: 'HKG' },
  SIN: { lat: 1.3644, lng: 103.9915, name: 'SIN' },
  SYD: { lat: -33.9399, lng: 151.1753, name: 'SYD' },
  GRU: { lat: -23.4356, lng: -46.4731, name: 'GRU' },
  JNB: { lat: -26.1367, lng: 28.2411, name: 'JNB' },
  HNL: { lat: 21.3204, lng: -157.9255, name: 'HNL' },
  VCE: { lat: 45.5053, lng: 12.3396, name: 'VCE' },
  ZRH: { lat: 47.4582, lng: 8.5555, name: 'ZRH' },
  GVA: { lat: 46.2370, lng: 6.1092, name: 'GVA' },
  NCE: { lat: 43.6584, lng: 7.2159, name: 'NCE' }
};

export const useStore = create<AppState>((set) => ({
  fleet: [
    {
      id: 'mock-1',
      tailNumber: 'N174JS',
      model: 'Gulfstream G650ER',
      speedKnots: 516,
      flightPhase: 'Hangar',
      currentLocation: MAIN_HUBS.LAX,
      destination: MAIN_HUBS.HNL,
      scheduledRoutes: [],
      lockedUntil: null,
      launchedAt: null
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
        speedKnots: model.includes('8X') ? 488 : 516,
        flightPhase: 'Hangar',
        currentLocation: MAIN_HUBS.LAX,
        destination: null,
        scheduledRoutes: [],
        lockedUntil: null,
        launchedAt: null
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
  setTimeMultiplier: (m) => set({ timeMultiplier: m }),
  setAircraftRoute: (id, originName, destinationName) => set((state) => {
    const origin = Object.values(MAIN_HUBS).find(h => h.name === originName);
    const destination = destinationName ? Object.values(MAIN_HUBS).find(h => h.name === destinationName) : null;
    if (!origin) return state;
    
    return {
      fleet: state.fleet.map(jet => jet.id === id ? { ...jet, currentLocation: origin, destination: destination || null } : jet)
    };
  }),
  addScheduledLeg: (id, originName, destinationName) => set((state) => {
    const origin = Object.values(MAIN_HUBS).find(h => h.name === originName);
    const destination = Object.values(MAIN_HUBS).find(h => h.name === destinationName);
    if (!origin || !destination) return state;
    return {
      fleet: state.fleet.map(jet => jet.id === id ? { 
        ...jet, 
        scheduledRoutes: [...jet.scheduledRoutes, { id: crypto.randomUUID(), origin, destination }] 
      } : jet)
    };
  }),
  removeScheduledLeg: (id, legId) => set((state) => ({
    fleet: state.fleet.map(jet => jet.id === id ? {
      ...jet,
      scheduledRoutes: jet.scheduledRoutes.filter(leg => leg.id !== legId)
    } : jet)
  })),
  clearSchedule: (id) => set((state) => ({
    fleet: state.fleet.map(jet => jet.id === id ? { ...jet, scheduledRoutes: [] } : jet)
  }))
}));
