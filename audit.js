const fs = require('fs');
const personas = require('./data/personas.json');
const resorts = require('./data/resorts.json');
const events = require('./data/events.json');

const personaIds = new Set(personas.map(p => p.id));
console.log(`Total Personas in data/personas.json: ${personaIds.size}`);

// Check archetype
const missingArchetype = personas.filter(p => !p.archetype).map(p => p.id);
console.log(`Personas missing 'archetype': ${missingArchetype.length}`);
if (missingArchetype.length > 0) {
    console.log(`IDs: ${missingArchetype.join(', ')}`);
}

// Find orphans in resorts
const orphansInResorts = new Set();
resorts.forEach(r => {
    if (r.preferredBy) {
        r.preferredBy.forEach(id => {
            if (!personaIds.has(id)) orphansInResorts.add(id);
        });
    }
});

// Find orphans in events
const orphansInEvents = new Set();
events.forEach(e => {
    if (e.confirmedAttendees) {
        e.confirmedAttendees.forEach(id => {
            if (!personaIds.has(id)) orphansInEvents.add(id);
        });
    }
});

console.log("Orphans in Resorts:", Array.from(orphansInResorts));
console.log("Orphans in Events:", Array.from(orphansInEvents));
