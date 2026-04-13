const fs = require('fs');
const path = require('path');

const specFile = path.join(__dirname, '../jetstream-spec/05-EVENTS-CALENDAR.md');
const outputFile = path.join(__dirname, '../data/events.json');

const content = fs.readFileSync(specFile, 'utf8');

const regex = /\d+\.\s+\*\*([^*]+)\*\*\s+—\s+Tier\s+(\d+)\n\s+-\s+([^\n]+)\n\s+-\s+Dates:\s+([^\n]+)\n\s+-\s+(?:Prestige required:\s+(\d+)\s+\|\s+)?Ticket:\s+\$([\d,]+|\w+)(?:\s+\([^)]+\))?\n(?:\s+-\s+Dress:\s+([^\n]+)\n)?\s+-\s+Attending:\s+([^\n]+)/g;

function slugify(text) {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

const events = [];
let match;
while ((match = regex.exec(content)) !== null) {
  const name = match[1].trim();
  const locationLine = match[3].split('|');
  const city = locationLine[0].trim();
  const icaoMatch = locationLine[1] ? locationLine[1].match(/([A-Z]{4})/) : null;
  const icao = icaoMatch ? icaoMatch[1] : (city === 'Varies' || city === 'Multiple' ? 'Varies' : 'XXXX');
  
  const icaoStr = (city === 'Varies annually' || city === 'Varies') ? 'Varies' : icao;

  const attendingStr = match[8].trim();
  const attendeesRaw = attendingStr.split(',').map(s => s.trim());
  const attendees = attendeesRaw.map(s => {
    // If it says "none", return null
    if (s.toLowerCase() === 'none') return null;
    return slugify(s);
  }).filter(Boolean);

  let ticketCost = 0;
  const costStr = match[6].replace(/,/g, '');
  if (!isNaN(parseInt(costStr, 10))) {
    ticketCost = parseInt(costStr, 10);
  }

  // To simulate actual dates, we set them roughly for 2026.
  let start = `2026-06-01T00:00:00.000Z`;
  let end = `2026-06-02T23:59:59.000Z`;

  events.push({
    id: slugify(name) + '-2026',
    name: name,
    category: 'gala', // Fallback
    locationICAO: icaoStr,
    locationCity: city,
    locationCountry: "Global",
    startDate: start,
    endDate: end,
    prestigeTier: parseInt(match[2], 10),
    prestigeRequired: match[5] ? parseInt(match[5], 10) : 0,
    ticketPrice: ticketCost,
    dressCode: match[7] ? match[7].trim() : "Resort formal",
    description: `The ${name} is a Tier ${match[2]} event.`,
    imageUrl: `/imagery/events/${slugify(name)}.jpg`,
    confirmedAttendees: attendees
  });
}

// Ensure the directory exists
fs.mkdirSync(path.dirname(outputFile), { recursive: true });
fs.writeFileSync(outputFile, JSON.stringify(events, null, 2));

console.log(`Successfully generated data/events.json with ${events.length} events.`);
