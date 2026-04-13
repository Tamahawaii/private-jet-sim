# JETSTREAM — Aircraft Catalog

Expanded fleet catalog with realistic specs, upgrade modules, and pricing. Seeded from `/data/aircraft.json`.

## Design Notes

- Real-world aircraft, real-world specs (close to manufacturer data)
- "Modules" = upgrade slots for fictional game systems (range extender, comms pkg, interior finish)
- Prices reflect approximate used-market or list — tuned for game pacing, not literal accuracy
- Burn rates in GPH at cruise
- Speeds are typical cruise KTAS

## Light Jets

### Embraer Phenom 300 — `embraer-phenom-300`
- Price: $10,500,000
- Speed: 450 KTAS | Range: 2,010 nm | Burn: 190 GPH
- Module slots: 2
- Description: "The bestselling light jet in the world. Exceptional for its class but modest by the standards of your circle."
- Crew: 1 pilot + 1 optional | Pax: 6-8

### Cessna Citation Longitude — `cessna-citation-longitude`
- Price: $29,000,000
- Speed: 466 KTAS | Range: 3,500 nm | Burn: 280 GPH
- Module slots: 2
- Description: "Super-midsize with a flat floor, coast-to-coast range, and a cabin that doesn't announce itself."
- Pax: 8-12

### Embraer Praetor 600 — `embraer-praetor-600`
- Price: $21,000,000
- Speed: 466 KTAS | Range: 4,018 nm | Burn: 300 GPH
- Module slots: 2
- Description: "Punches above its weight. Transatlantic range in a super-midsize. A quiet favorite."
- Pax: 8-12

## Midsize

### Cessna Citation X — `cessna-citation-x`
- Price: $22,000,000
- Speed: 528 KTAS | Range: 3,460 nm | Burn: 340 GPH
- Module slots: 3
- Description: "One of the fastest civilian aircraft in service. You'll beat the weather and most headwinds."
- Pax: 8

### Dassault Falcon 900 — `dassault-falcon-900`
- Price: $15,000,000 (used mid-cycle)
- Speed: 480 KTAS | Range: 4,750 nm | Burn: 420 GPH
- Module slots: 3
- Description: "Trijet reliability and a cabin built for the long haul. The connoisseur's choice."
- Pax: 12-14

## Heavy / Ultra Long Range

### Gulfstream G650ER — `gulfstream-g650er`
- Price: $58,000,000
- Speed: 516 KTAS | Range: 7,500 nm | Burn: 480 GPH
- Module slots: 4
- Description: "The private aviation benchmark. Intercontinental range, 7,500 nm with fuel to spare."
- Pax: 12-14

### Gulfstream G700 — `gulfstream-g700`
- Price: $78,000,000
- Speed: 530 KTAS | Range: 7,750 nm | Burn: 500 GPH
- Module slots: 4
- Description: "Gulfstream's new flagship. The longest, widest cabin in its class. Circadian lighting and ultra-high cabin altitude. You arrive fresh."
- Pax: 13-19

### Gulfstream G800 — `gulfstream-g800`
- Price: $85,000,000
- Speed: 515 KTAS | Range: 8,000 nm | Burn: 500 GPH
- Module slots: 4
- Description: "Farther than the G700 but slightly smaller cabin. For owners who fly true ultra-long-haul routes."
- Pax: 13-19

### Bombardier Global 7500 — `bombardier-global-7500`
- Price: $75,000,000
- Speed: 515 KTAS | Range: 7,700 nm | Burn: 490 GPH
- Module slots: 4
- Description: "Four distinct living spaces. A proper bedroom with a real shower. The lifestyle brief answered."
- Pax: 14-19

### Bombardier Global 8000 — `bombardier-global-8000`
- Price: $73,000,000
- Speed: 530 KTAS | Range: 8,000 nm | Burn: 490 GPH
- Module slots: 4
- Description: "Mach 0.94 in a dash — the fastest civilian aircraft of its era. For those who feel travel time as a personal affront."
- Pax: 14-19

### Dassault Falcon 10X — `dassault-falcon-10x`
- Price: $75,000,000
- Speed: 516 KTAS | Range: 7,500 nm | Burn: 420 GPH
- Module slots: 4
- Description: "Dassault's flagship. Best-in-class cabin width and windows. The pilot's aircraft for the billionaire's route."
- Pax: 16-19

### Dassault Falcon 8X — `dassault-falcon-8x`
- Price: $42,000,000
- Speed: 460 KTAS | Range: 6,450 nm | Burn: 390 GPH
- Module slots: 3
- Description: "Trijet confidence across oceans and mountains. The discerning European choice."
- Pax: 12-16

### Dassault Falcon 7X — `dassault-falcon-7x`
- Price: $28,000,000 (used)
- Speed: 459 KTAS | Range: 5,950 nm | Burn: 390 GPH
- Module slots: 3
- Pax: 12-16

## Super-Long Range Airliners (Status Tier)

### Boeing BBJ 737 — `boeing-bbj-737`
- Price: $90,000,000 (green + completion)
- Speed: 470 KTAS | Range: 6,100 nm | Burn: 900 GPH
- Module slots: 5
- Description: "A private airliner. You arrive with your guests, staff, and dogs. Full galley, stateroom, and two lounges."
- Pax: 25-48

### Boeing BBJ 787 — `boeing-bbj-787`
- Price: $250,000,000 (green + completion)
- Speed: 490 KTAS | Range: 9,485 nm | Burn: 1,500 GPH
- Module slots: 6
- Description: "The ultra-long-range flagship of the flagships. A flying residence. Only a few dozen exist."
- Pax: 25-40

### Airbus ACJ319neo — `airbus-acj319neo`
- Price: $110,000,000 (green + completion)
- Speed: 470 KTAS | Range: 6,750 nm | Burn: 950 GPH
- Module slots: 5
- Description: "Airbus's answer to the BBJ. Wider cabin, fly-by-wire, quieter ride."
- Pax: 19-40

### Airbus ACJ TwoTwenty — `airbus-acj220`
- Price: $80,000,000
- Speed: 470 KTAS | Range: 5,650 nm | Burn: 750 GPH
- Module slots: 4
- Description: "Airliner-class cabin at business-jet operating cost. Six living zones standard."
- Pax: 18

## Additional Options

### Astra Gulfstream SPX — `astra-gulfstream-spx`
- Price: $6,500,000 (used)
- Speed: 461 KTAS | Range: 2,800 nm | Burn: 220 GPH
- Module slots: 2
- Description: "The value pick. A dependable light midsize for short hops in the portfolio."

### Pilatus PC-24 — `pilatus-pc-24`
- Price: $12,500,000
- Speed: 440 KTAS | Range: 2,000 nm | Burn: 210 GPH
- Module slots: 2
- Description: "The only jet that lands on dirt, grass, and short strips. For the Singita-to-Amangiri routes."

### Sikorsky S-76D — `sikorsky-s76d`
- Price: $15,000,000
- Speed: 155 KTAS | Range: 440 nm | Burn: 85 GPH (per engine)
- Module slots: 1
- Description: "Corporate helicopter for the last mile. Helipad at home. Helipad at the office. Helipad at the resort."
- Note: Category = "helicopter" — for short transfers only

### AgustaWestland AW109 — `agustawestland-aw109`
- Price: $8,500,000
- Speed: 165 KTAS | Range: 515 nm | Burn: 75 GPH
- Module slots: 1
- Description: "The CEO helicopter. Italian engineered. The Portofino arrival."

## Upgrade Modules

Modules are the upgrade layer. Installed on specific aircraft, they persist and provide small bonuses.

### Range
- **Extended Range Tanks** — $1.2M — +8% range, -2% cargo capacity
- **Aerodynamic Winglets Upgrade** — $800k — +3% range

### Interior
- **Cabin Refresh — Muji Minimalist** — $2.5M — +15 prestige bonus (subtle, anti-flash)
- **Cabin Refresh — Hermès Maison Fit** — $6.5M — +40 prestige bonus (very coded)
- **Cabin Refresh — Brabus Custom** — $4.8M — +25 prestige bonus, +10 flashiness score visible to others
- **Primary Bedroom Conversion** — $3.2M — unlocks "restful flight" state on flights >6 hrs (no jet lag recap)
- **Master Shower Installation** — $1.8M — requires Bedroom, +15 prestige

### Performance
- **Avionics Suite Upgrade** — $1.1M — 5% reduced turbulence impact (future use)
- **Mach Boost Package** — $2.8M — +2% cruise speed (heavy jets only)

### Comms / Tech
- **Starlink Cabin Wifi** — $400k — unlocks "Work from Sky" feature (future: earn while flying)
- **Private Meeting Fit** — $1.5M — cabin conference mode, +appearance fee potential for business trips

### Crew
- **Michelin Chef on Staff** — $500k setup + $25k/month — adds "fine dining in flight" flavor text
- **Security Detail Package** — $250k setup + $15k/month — +small prestige, required for certain Tier 5 events

## Data File Structure

```json
// /data/aircraft.json
[
  {
    "id": "gulfstream-g700",
    "name": "Gulfstream G700",
    "manufacturer": "Gulfstream",
    "category": "ultra_long_range",
    "price": 78000000,
    "cruiseSpeedKTAS": 530,
    "rangeNM": 7750,
    "burnGPH": 500,
    "moduleSlots": 4,
    "passengerCapacity": 19,
    "description": "Gulfstream's new flagship. The longest, widest cabin in its class. Circadian lighting and ultra-high cabin altitude. You arrive fresh.",
    "imageUrl": "/imagery/aircraft/gulfstream-g700.jpg",
    "blueprintUrl": "/imagery/blueprints/gulfstream-g700.svg",
    "prestigeTier": 5
  }
  // ... 19 more
]
```

## Starting Fleet (matches current UI)

Seed the player's initial fleet with:
1. **N100JS** — Embraer Phenom 300 (parked HNL) — the humble starter
2. **N125JS** — Cessna Citation X — already in-transit in current screenshots
3. **N150JS** — Dassault Falcon 900 (parked JAC - Jackson Hole)
4. **N302XP** — Bombardier Global 8000 (parked DAL - Dallas Love)
5. **N807XP** — Boeing BBJ 787 (parked PDP - Curbelo International, Punta del Este)

This gives the player immediate variety — short-haul, midsize, heavy, flagship airliner — and matches what you already have on screen.

## Starting Capital

$79.7B (per current UI) — generous but not infinite. Enough for multiple flagship purchases and years of burn.
