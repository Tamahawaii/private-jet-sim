export const mockFleet = [
  {
    tailNumber: 'N174JS',
    model: 'Gulfstream G650ER',
    currentLocation: { lat: 33.9416, lng: -118.4085 }, // LAX
    status: 'Hangar',
  },
  {
    tailNumber: 'N888VIP',
    model: 'Bombardier Global 7500',
    currentLocation: { lat: 40.8500, lng: -74.0615 }, // Teterboro
    status: 'Maintenance',
  },
  {
    tailNumber: 'N999EX',
    model: 'Dassault Falcon 8X',
    currentLocation: { lat: 51.4700, lng: -0.4543 }, // Heathrow
    status: 'Hangar',
  }
];

export const mockRoute = {
  start: { lat: 33.9416, lng: -118.4085 },
  end: { lat: 21.3204, lng: -157.9255 }, // HNL
};
