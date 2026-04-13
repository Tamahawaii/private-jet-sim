const fs = require('fs');
const path = require('path');

const specFile = path.join(__dirname, '../jetstream-spec/06-RESORTS-CATALOG.md');
const outputFile = path.join(__dirname, '../data/resorts.json');

const content = fs.readFileSync(specFile, 'utf8');

const regex = /\d+\.\s+\*\*([^*]+)\*\*\s+—\s+Tier\s+(\d+)\s+\|\s+([A-Z]{4})(?:\s+\([^)]+\))?\s+\|\s+\$([\d,]+)\/night base[\s\S]*?(?=(?:\n\d+\.\s+\*\*|$))/g;

function slugify(text) {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

const resorts = [];
let match;
while ((match = regex.exec(content)) !== null) {
  const name = match[1].trim();
  const prestigeTier = parseInt(match[2], 10);
  const icao = match[3].trim();
  const baseRate = parseInt(match[4].replace(/,/g, ''), 10);
  const fullBlock = match[0];
  
  // Extracting basic info from lines
  let signatureExperiences = [];
  const sigMatch = fullBlock.match(/- Signature:\s+([^\n]+)/);
  if (sigMatch) {
    const items = sigMatch[1].split('),').map(s => s.trim());
    for (let item of items) {
      if (!item.endsWith(')')) item += ')';
      const detailMatch = item.match(/(.+?)\s+\(\$([\d,]+)(?:\/.*?)?\)/);
      if (detailMatch) {
        signatureExperiences.push({
          name: detailMatch[1].trim(),
          priceUSD: parseInt(detailMatch[2].replace(/,/g, ''), 10),
          description: "Exclusive " + detailMatch[1].trim()
        });
      }
    }
  }

  resorts.push({
    id: slugify(name),
    name: name,
    brand: name.split(' ')[0],
    locationICAO: icao,
    locationCity: 'Local City',
    locationCountry: 'Local Country',
    nightlyRateUSD: baseRate,
    suiteOptions: [
      { name: "Standard Suite", rateMultiplier: 1.0 },
      { name: "Premium Villa", rateMultiplier: 2.0 },
      { name: "Owner's Residence", rateMultiplier: 4.5 }
    ],
    amenities: ["Spa", "Fine Dining", "Private Transfers", "Infinity Pool"],
    signatureExperiences: signatureExperiences,
    prestigeTier: prestigeTier,
    description: `The world-renowned ${name}.`,
    imageUrl: `/imagery/resorts/${slugify(name)}.jpg`
  });
}

// Ensure the directory exists
fs.mkdirSync(path.dirname(outputFile), { recursive: true });
fs.writeFileSync(outputFile, JSON.stringify(resorts, null, 2));

console.log(`Successfully generated data/resorts.json with ${resorts.length} resorts.`);
