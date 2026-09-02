import aircraftData from '../../data/aircraft.json';

export interface CatalogItem {
  id: string;
  model: string;
  speedKnots: number;
  rangeNM: number;
  fuelBurnGPH: number;
  costPerNM: number;
  price: number;
  cabinSlots: number;
  layoutImage: string | null;
  imageUrl: string | null;
  category: string;
  manufacturer: string;
  description: string;
  passengerCapacity: number;
  prestigeTier: number;
}

export const SHOP_CATALOG: CatalogItem[] = aircraftData.map(a => ({
  id: a.id,
  model: a.name,
  speedKnots: a.cruiseSpeedKTAS,
  rangeNM: a.rangeNM,
  fuelBurnGPH: a.burnGPH,
  costPerNM: a.costPerNM,
  price: a.price,
  cabinSlots: a.moduleSlots,
  layoutImage: (a as any).layoutImage,
  imageUrl: (a as any).imageUrl || null,
  category: a.category,
  manufacturer: a.manufacturer,
  description: a.description,
  passengerCapacity: a.passengerCapacity,
  prestigeTier: a.prestigeTier,
}));

/** Artwork for an owned aircraft (matched to the catalog by model id, then by name). */
export function aircraftImage(a: { modelId?: string; model?: string; modelName?: string }): string | null {
  const byId = SHOP_CATALOG.find(c => c.id === a.modelId);
  if (byId?.imageUrl) return byId.imageUrl;
  const name = (a.model || a.modelName || '').toLowerCase();
  const byName = SHOP_CATALOG.find(c => c.model.toLowerCase() === name);
  return byName?.imageUrl || null;
}

export function catalogFor(a: { modelId?: string; model?: string; modelName?: string }): CatalogItem | undefined {
  return SHOP_CATALOG.find(c => c.id === a.modelId) || SHOP_CATALOG.find(c => c.model.toLowerCase() === (a.model || a.modelName || '').toLowerCase());
}

// Provide the starter selection from the catalog based on expected specs
const starterIds = [
  'embraer-phenom-300',
  'cessna-citation-x',
  'dassault-falcon-900',
  'bombardier-global-8000',
  'boeing-bbj-787'
];

export const STARTER_FLEET: CatalogItem[] = starterIds
  .map(id => SHOP_CATALOG.find(c => c.id === id)!)
  .filter(Boolean);
