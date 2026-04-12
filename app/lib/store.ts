import { create } from 'zustand';

export type FlightPhase = 'Hangar' | 'Pre-flight' | 'Taxi' | 'Takeoff' | 'Cruise' | 'Landing';

interface AppState {
  flightPhase: FlightPhase;
  selectedAircraft: string | null;
  weatherEnabled: boolean;
  setFlightPhase: (phase: FlightPhase) => void;
  setSelectedAircraft: (tailNumber: string | null) => void;
  setWeatherEnabled: (enabled: boolean) => void;
}

export const useStore = create<AppState>((set) => ({
  flightPhase: 'Hangar',
  selectedAircraft: null,
  weatherEnabled: false,
  setFlightPhase: (phase) => set({ flightPhase: phase }),
  setSelectedAircraft: (tailNumber) => set({ selectedAircraft: tailNumber }),
  setWeatherEnabled: (enabled) => set({ weatherEnabled: enabled }),
}));
