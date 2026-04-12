export interface CatalogItem {
  model: string;
  speedKnots: number;
  fuelBurnGPH: number;
  costPerNM: number;
  price: number;
  cabinSlots: number;
  layoutImage?: string;
}

export const STARTER_FLEET: CatalogItem[] = [
  { model: 'Embraer Phenom 300', speedKnots: 450, fuelBurnGPH: 190, costPerNM: 5, price: 9000000, cabinSlots: 2, layoutImage: '/layouts/phenom_300.png' },
  { model: 'Cessna Citation X', speedKnots: 528, fuelBurnGPH: 340, costPerNM: 8, price: 20000000, cabinSlots: 3, layoutImage: '/layouts/citation_x.png' },
  { model: 'Dassault Falcon 900', speedKnots: 480, fuelBurnGPH: 420, costPerNM: 12, price: 42000000, cabinSlots: 4, layoutImage: '/layouts/falcon_900.png' },
];

export const SHOP_CATALOG: CatalogItem[] = [
  { model: 'Astra Gulfstream SPX', speedKnots: 461, fuelBurnGPH: 220, costPerNM: 6, price: 6500000, cabinSlots: 2 },
  { model: 'Dassault Falcon 10X', speedKnots: 516, fuelBurnGPH: 420, costPerNM: 15, price: 75000000, cabinSlots: 4 },
  { model: 'Gulfstream G700', speedKnots: 530, fuelBurnGPH: 500, costPerNM: 18, price: 78000000, cabinSlots: 4 },
  { model: 'Bombardier Global 8000', speedKnots: 530, fuelBurnGPH: 490, costPerNM: 17, price: 73000000, cabinSlots: 4 },
  { model: 'Cessna Citation Longitude', speedKnots: 466, fuelBurnGPH: 280, costPerNM: 9, price: 29000000, cabinSlots: 2 },
  { model: 'Embraer Praetor 600', speedKnots: 466, fuelBurnGPH: 300, costPerNM: 10, price: 21000000, cabinSlots: 2 },
  { model: 'Boeing BBJ 787', speedKnots: 490, fuelBurnGPH: 1500, costPerNM: 45, price: 250000000, cabinSlots: 6 },
];
