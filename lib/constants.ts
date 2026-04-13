// Sim wide Economy & Flight Logic Constants

export const FLIGHT_COSTS = {
  // Fuel pricing baseline (Jet-A)
  FUEL_PRICE_PER_GALLON: 6.50,
  
  // Personnel and administrative costs
  CREW_HOURLY: 800,
  
  // Navigation & IFR handling flat fee
  NAV_FEES_FLAT: 1200,
  
  // FBO handling (in + out)
  FBO_FEES_FLAT: 2500,
  
  // Lifecycle degradation tax
  WEAR_AND_TEAR_HOURLY: 450
};

export const AI_MODELS = {
  HAIKU: 'claude-haiku-4-5-20251001',
  SONNET: 'claude-sonnet-4-6', 
} as const;
