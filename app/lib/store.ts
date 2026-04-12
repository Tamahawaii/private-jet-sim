import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { STARTER_FLEET, CatalogItem } from './mockData';

export type FlightPhase = 'Hangar' | 'Pre-flight' | 'Taxi' | 'Takeoff' | 'Cruise' | 'Landing';
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
  fuelBurnGPH: number;
  costPerNM: number;
  purchasePrice: number;
  layoutImage?: string;
  cabinConfig: ModuleType[];
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
  timeMultiplier: number;
  provisionalRoute: { origin: LocationData, destination: LocationData } | null;
  
  // Game UI State
  playerLevel: number;
  playerCash: number;
  mapStyle: 'FlightAware' | 'Satellite' | 'Dark' | 'Roads';

  buyAircraft: (catalogItem: CatalogItem) => void;
  quickLaunchFlight: (id: string, destination: LocationData) => void;
  updateAircraft: (id: string, updates: Partial<Aircraft>) => void;
  setSelectedAircraftId: (id: string | null) => void;
  setProvisionalRoute: (route: { origin: LocationData, destination: LocationData } | null) => void;
  setWeatherEnabled: (enabled: boolean) => void;
  setMapStyle: (style: 'FlightAware' | 'Satellite' | 'Dark' | 'Roads') => void;
  setCabinSlot: (aircraftId: string, index: number, module: ModuleType) => void;
  setTimeMultiplier: (multiplier: number) => void;
  setAircraftRoute: (id: string, origin: LocationData, destination: LocationData | null) => void;
  addScheduledLeg: (aircraftId: string, origin: LocationData, destination: LocationData) => void;
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

export const useStore = create<AppState>()(
  persist(
    (set) => ({
      fleet: STARTER_FLEET.map((j, i) => ({
        id: `start-jet-${i+1}`,
        tailNumber: `N${100 + i * 25}JS`,
        model: j.model,
        speedKnots: j.speedKnots,
        fuelBurnGPH: j.fuelBurnGPH,
        costPerNM: j.costPerNM,
        purchasePrice: j.price,
        layoutImage: j.layoutImage,
        cabinConfig: Array(j.cabinSlots).fill('Empty'),
        flightPhase: 'Hangar',
        currentLocation: Object.values(MAIN_HUBS)[i],
        destination: null,
        scheduledRoutes: [],
        lockedUntil: null,
        launchedAt: null
      })),
      selectedAircraftId: 'start-jet-1',
      weatherEnabled: false,
      timeMultiplier: 60,
      provisionalRoute: null,
      playerLevel: 1,
      playerCash: 80000000000, // $80 Billion
      mapStyle: 'FlightAware',

  buyAircraft: (item) => set((state) => {
    // ... handles buy logic ...
    if (state.playerCash >= item.price) {
       const newAircraft: Aircraft = {
         id: `bought-jet-${Date.now()}`,
         tailNumber: `N${Math.floor(Math.random() * 900) + 100}XP`,
         model: item.model,
         speedKnots: item.speedKnots,
         fuelBurnGPH: item.fuelBurnGPH,
         costPerNM: item.costPerNM,
         purchasePrice: item.price,
         layoutImage: item.layoutImage,
         cabinConfig: Array(item.cabinSlots).fill('Empty'),
         flightPhase: 'Hangar',
         currentLocation: MAIN_HUBS.LAX, // always starts at LAX
         destination: null,
         scheduledRoutes: [],
         lockedUntil: null,
         launchedAt: null
       };
       return {
         playerCash: state.playerCash - item.price,
         fleet: [...state.fleet, newAircraft],
         selectedAircraftId: newAircraft.id
       };
    }
    return state;
  }),

  quickLaunchFlight: (id, destination) => set((state) => {
     const plane = state.fleet.find(f => f.id === id);
     if (!plane) return state;

     const distLat = Math.abs(plane.currentLocation.lat - destination.lat) * 60;
     const distLng = Math.abs(plane.currentLocation.lng - destination.lng) * 60;
     const distNM = Math.sqrt(distLat*distLat + distLng*distLng);
     let hours = distNM / plane.speedKnots;
     
     // Minimum flight time of 40 mins to support full phase intervals 
     // (10m Pre-flight + 15m Taxi + 5m Takeoff + x Cruise + 10m Landing)
     if (hours < 0.66) hours = 0.66;

     return {
        fleet: state.fleet.map(jet => jet.id === id ? {
            ...jet,
            flightPhase: 'Pre-flight', // Start realistically!
            destination: destination,
            launchedAt: Date.now(),
            lockedUntil: Date.now() + ((hours * 3600000) / state.timeMultiplier)
        } : jet)
     };
  }),

  updateAircraft: (id, updates) => set((state) => ({
    fleet: state.fleet.map(jet => jet.id === id ? { ...jet, ...updates } : jet)
  })),

  setSelectedAircraftId: (id) => set({ selectedAircraftId: id }),
  setWeatherEnabled: (enabled) => set({ weatherEnabled: enabled }),
  setCabinSlot: (id, index, module) => set((state) => ({
    fleet: state.fleet.map(jet => {
      if (jet.id === id) {
        const newConfig = [...jet.cabinConfig];
        newConfig[index] = module;
        return { ...jet, cabinConfig: newConfig };
      }
      return jet;
    })
  })),
  setTimeMultiplier: (m) => set({ timeMultiplier: m }),
  setAircraftRoute: (id, origin, destination) => set((state) => ({
    fleet: state.fleet.map(jet => jet.id === id ? { ...jet, currentLocation: origin, destination } : jet)
  })),
  addScheduledLeg: (id, origin, destination) => set((state) => ({
    fleet: state.fleet.map(jet => jet.id === id ? { 
      ...jet, 
      scheduledRoutes: [...jet.scheduledRoutes, { id: crypto.randomUUID(), origin, destination }] 
    } : jet)
  })),
  removeScheduledLeg: (id, legId) => set((state) => ({
    fleet: state.fleet.map(jet => jet.id === id ? {
      ...jet,
      scheduledRoutes: jet.scheduledRoutes.filter(leg => leg.id !== legId)
    } : jet)
  })),
  clearSchedule: (id) => set((state) => ({
    fleet: state.fleet.map(jet => jet.id === id ? { ...jet, scheduledRoutes: [] } : jet)
  })),
  setProvisionalRoute: (route) => set({ provisionalRoute: route }),
  setMapStyle: (style) => set({ mapStyle: style })
}),
{ name: 'jetstream-dispatch-v1' }
));
