const fs = require('fs');
const events = JSON.parse(fs.readFileSync('./data/events.json', 'utf8'));
const canonicalPersonas = JSON.parse(fs.readFileSync('./jetstream-spec/personas.json', 'utf8'));
const canonicalIds = new Set(canonicalPersonas.map(p => p.id));

const orphans = new Set();
let foundMismatches = {};

events.forEach(e => {
    if (e.confirmedAttendees) {
        e.confirmedAttendees.forEach(id => {
            if (!canonicalIds.has(id)) {
                orphans.add(id);
                foundMismatches[id] = (foundMismatches[id] || 0) + 1;
            }
        });
    }
});

console.log("Canonical IDs:", Array.from(canonicalIds));
console.log("Orphaned IDs found in events.json:", orphans);
console.log("Counts:", foundMismatches);
