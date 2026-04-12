import { create } from 'zustand';

export type FlightPhase = 'Hangar' | 'Pre-flight' | 'Taxi' | 'Takeoff' | 'Cruise' | 'Landing';
export type ActiveView = 'Fleet' | 'Logistics' | 'Configurator';

export type ModuleType = 'Executive' | 'MasterSuite' | 'Galley' | 'Cinema' | 'Empty';

interface AppState {
  flightPhase: FlightPhase;
  selectedAircraft: string | null;
  weatherEnabled: boolean;
  activeView: ActiveView;
  cabinSlots: ModuleType[];
  
  setFlightPhase: (phase: FlightPhase) => void;
  setSelectedAircraft: (tailNumber: string | null) => void;
  setWeatherEnabled: (enabled: boolean) => void;
  setActiveView: (view: ActiveView) => void;
  setCabinSlot: (index: number, module: ModuleType) => void;
  resetCabinSlots: () => void;
}

export const useStore = create<AppState>((set) => ({
  flightPhase: 'Hangar',
  selectedAircraft: null,
  weatherEnabled: false,
  activeView: 'Fleet',
  cabinSlots: ['Empty', 'Empty', 'Empty', 'Empty'],
  
  setFlightPhase: (phase) => set({ flightPhase: phase }),
  setSelectedAircraft: (tailNumber) => set({ selectedAircraft: tailNumber }),
  setWeatherEnabled: (enabled) => set({ weatherEnabled: enabled }),
  setActiveView: (view) => set({ activeView: view }),
  setCabinSlot: (index, module) => set((state) => {
    const newSlots = [...state.cabinSlots];
    newSlots[index] = module;
    return { cabinSlots: newSlots };
  }),
  resetCabinSlots: () => set({ cabinSlots: ['Empty', 'Empty', 'Empty', 'Empty'] }),
}));
