const fs = require('fs');
const path = require('path');

const personasFile = path.join(__dirname, '../jetstream-spec/04-AI-PERSONAS.md');
const outputFile = path.join(__dirname, '../data/personas.json');

const content = fs.readFileSync(personasFile, 'utf8');

const regex = /### \d+\.\s+([^\—]+[^\s])\s*—\s*`([^`]+)`\n- \*\*Archetype\*\*: ([^\n]+)\n- \*\*Age\*\*: (\d+)\s*\|\s*\*\*Nationality\*\*: ([^\n]+)\n- \*\*Net worth\*\*: \$([\d\.]+)B \(([^\)]+)\)\n- \*\*Home base\*\*: ([A-Z]{4})(?:\s+\([^\)]+\))?(?:\s*\/\s*([A-Z]{4})\s+\([^\)]+\))?\n- \*\*Bio\*\*: ([^\n]+)\n- \*\*Personality\*\*: warmth (\d+), ambition (\d+), flashiness (\d+), loyalty (\d+), humor (\d+)\n- \*\*Interests\*\*: ([^\n]+)\n- \*\*Fleet\*\*: ([^\n]+)\n- \*\*Voice\*\*: ([^\n]+)\n- \*\*Rivals\*\*: ([^\n]+)\n- \*\*Close friends\*\*: ([^\n]+)/g;

function slugify(text) {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

function extractIds(text) {
  if (text.toLowerCase() === 'none publicly' || text.toLowerCase() === 'none') return [];
  // For names like "Sasha Volkov, Alessandro Conti", we split by comma, remove parenthesis context, slugify
  return text.split(',').map(part => {
    let rawStr = part.replace(/\(.*?\)/g, '').trim(); // Remove anything in parens
    if (rawStr.startsWith('None')) return null;
    return slugify(rawStr);
  }).filter(Boolean);
}

const personas = [];
let match;

while ((match = regex.exec(content)) !== null) {
  const fleetRaw = match[17].split(',').map(s => s.trim());
  const fleetInfo = fleetRaw.map(modelStr => {
    return {
      modelId: slugify(modelStr),
      tailNumber: 'N' + Math.floor(Math.random() * 900 + 100) + 'PE' // Dummy tail
    };
  });

  personas.push({
    id: match[2],
    displayName: match[1].trim(),
    archetype: match[3].trim(),
    age: parseInt(match[4], 10),
    nationality: match[5].trim(),
    netWorth: parseFloat(match[6]),
    bio: match[10].trim(),
    personality: {
      warmth: parseInt(match[11], 10),
      ambition: parseInt(match[12], 10),
      flashiness: parseInt(match[13], 10),
      loyalty: parseInt(match[14], 10),
      humor: parseInt(match[15], 10)
    },
    interests: match[16].split(',').map(i => i.trim()),
    homeBaseICAO: match[8],
    fleet: fleetInfo,
    portraitUrl: `/portraits/${match[2]}.jpg`,
    voiceStyle: match[18].trim(),
    rivals: extractIds(match[19]),
    closeFriends: extractIds(match[20])
  });
}

// Ensure the directory exists
fs.mkdirSync(path.dirname(outputFile), { recursive: true });
fs.writeFileSync(outputFile, JSON.stringify(personas, null, 2));

console.log(`Successfully generated data/personas.json with ${personas.length} personas.`);
