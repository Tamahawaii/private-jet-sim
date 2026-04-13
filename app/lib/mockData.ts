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
  layoutImage?: string;
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
  layoutImage: `/layouts/${a.id.replace(/-/g, '_')}.png`
}));

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
