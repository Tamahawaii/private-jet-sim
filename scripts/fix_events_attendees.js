import fs from 'fs';
import path from 'path';

const personas = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'data/personas.json'), 'utf8'));
const events = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'data/events.json'), 'utf8'));

// Build lookup: generic firstname -> exact personaId
const lookup = {};
personas.forEach((p) => {
    const firstName = p.id.split('-')[0].toLowerCase();
    lookup[firstName] = p.id;
});

let changes = 0;
events.forEach(e => {
    if (e.confirmedAttendees && e.confirmedAttendees.length > 0) {
        e.confirmedAttendees = e.confirmedAttendees.map(raw => {
             const key = raw.toLowerCase();
             if (lookup[key]) return lookup[key];
             
             // If they put 'charles' instead of 'charles-b', find first partial match
             const partial = personas.find(p => p.id.startsWith(key));
             if (partial) return partial.id;

             return raw; // Fallback
        });
        changes++;
    }
});

if (changes > 0) {
    fs.writeFileSync(path.join(process.cwd(), 'data/events.json'), JSON.stringify(events, null, 2));
    console.log(`Successfully mapped attendees for ${changes} events.`);
} else {
    console.log(`No changes needed.`);
}
