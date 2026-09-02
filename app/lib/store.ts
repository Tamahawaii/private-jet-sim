import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

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

export type MapStyleId = 'Dark' | 'Satellite' | 'Roads' | 'FlightAware';
export type MapProjection = 'globe' | 'flat';
export type PeekTarget =
  | { kind: 'aircraft'; id: string }
  | { kind: 'event'; id: string }
  | { kind: 'resort'; id: string }
  | { kind: 'persona'; id: string }
  | { kind: 'airport'; id: string }
  | { kind: 'yacht'; id: string }
  | { kind: 'marina'; id: string }
  | { kind: 'residence'; id: string };

export interface MapLayerToggles {
  fleet: boolean;
  friends: boolean;
  events: boolean;
  resorts: boolean;
  airports: boolean;
  weather: boolean;
  daylight: boolean;
  marinas: boolean;
  homes: boolean;
}

interface AppState {
  selectedAircraftId: string | null;
  weatherEnabled: boolean;
  timeMultiplier: number;
  provisionalRoute: { origin: LocationData, destination: LocationData } | null;

  playerLevel: number;
  mapStyle: MapStyleId;
  mapProjection: MapProjection;
  mapLayers: MapLayerToggles;
  followSelected: boolean;
  peek: PeekTarget | null;
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
  setMapStyle: (style: MapStyleId) => void;
  setMapProjection: (p: MapProjection) => void;
  toggleMapLayer: (layer: keyof MapLayerToggles) => void;
  setFollowSelected: (v: boolean) => void;
  setPeek: (p: PeekTarget | null) => void;

  // Advanced Simulation Controls
  setTimeMultiplier: (m: number) => void;
  advanceSimClock: (ms: number) => void;
  getNow: () => number;
}

const CLOCK_KEY = 'jetstream-clock';

/**
 * Restores the simulation clock from the last snapshot. Time closed passes at
 * 1x real time (a 7h flight still takes 7h if you close the app), and any
 * speed-up is reset — matching the spec's "resume from T" rule.
 */
function resumeClock(): { baselineRealTime: number; baselineSimTime: number } {
  const now = Date.now();
  if (typeof window === 'undefined') return { baselineRealTime: now, baselineSimTime: now };
  try {
    const raw = localStorage.getItem(CLOCK_KEY);
    if (raw) {
      const { simAt, realAt } = JSON.parse(raw) as { simAt: number; realAt: number };
      if (isFinite(simAt) && isFinite(realAt) && realAt <= now + 60000) {
        const elapsed = Math.max(0, now - realAt);
        // Never let the sim fall behind real time.
        return { baselineRealTime: now, baselineSimTime: Math.max(now, simAt + elapsed) };
      }
    }
  } catch { /* ignore */ }
  return { baselineRealTime: now, baselineSimTime: now };
}

export function persistClock() {
  if (typeof window === 'undefined') return;
  try {
    const st = useStore.getState();
    localStorage.setItem(CLOCK_KEY, JSON.stringify({ simAt: st.getNow(), realAt: Date.now() }));
  } catch { /* ignore */ }
}

export const useStore = create<AppState>()(
  persist(
    (set, get) => ({
      selectedAircraftId: null,
      weatherEnabled: false,
      timeMultiplier: 1,
      provisionalRoute: null,

      playerLevel: 1,
      mapStyle: 'Dark',
      mapProjection: 'globe',
      mapLayers: { fleet: true, friends: true, events: true, resorts: true, airports: true, weather: false, daylight: true, marinas: true, homes: true },
      followSelected: true,
      peek: null,
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

      ...resumeClock(),

      setSelectedAircraftId: (id) => set({ selectedAircraftId: id }),
      setProvisionalRoute: (route) => set({ provisionalRoute: route }),
      setWeatherEnabled: (enabled) => set({ weatherEnabled: enabled }),
      setZenMode: (enabled) => set({ zenMode: enabled }),
      setActiveView: (view) => set({ activeView: view }),
      setMapStyle: (style) => set({ mapStyle: style }),
      setMapProjection: (p) => set({ mapProjection: p }),
      toggleMapLayer: (layer) => set((s) => ({ mapLayers: { ...s.mapLayers, [layer]: !s.mapLayers[layer] } })),
      setFollowSelected: (v) => set({ followSelected: v }),
      setPeek: (p) => set({ peek: p }),

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
        persistClock();
      },

      getNow: () => {
        const state = get();
        const realElapsed = Date.now() - state.baselineRealTime;
        return state.baselineSimTime + (realElapsed * state.timeMultiplier);
      }
    }),
    {
      name: 'jetstream-ui',
      storage: createJSONStorage(() => localStorage),
      // Cosmetic preferences persist here; the sim clock has its own snapshot (see persistClock).
      partialize: (s) => ({ mapStyle: s.mapStyle, mapProjection: s.mapProjection, mapLayers: s.mapLayers, zenMode: s.zenMode }),
      merge: (persisted, current) => {
        const p = (persisted || {}) as Partial<AppState>;
        return { ...current, ...p, mapLayers: { ...current.mapLayers, ...(p.mapLayers || {}) } };
      },
    }
  )
);
