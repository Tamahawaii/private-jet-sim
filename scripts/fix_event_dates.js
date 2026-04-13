import fs from 'fs';
import path from 'path';

const events = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'data/events.json'), 'utf8'));

const dates = {
  "world-economic-forum-davos-2026": { start: "2026-01-19", end: "2026-01-23" },
  "sundance-film-festival-2026": { start: "2026-01-22", end: "2026-02-01" },
  "australian-open-men-s-final-2026": { start: "2026-01-24", end: "2026-01-26" },
  "art-sg-frieze-la-winter-shows-2026": { start: "2026-02-15", end: "2026-02-18" },
  "super-bowl-2026": { start: "2026-02-07", end: "2026-02-09" },
  "bafta-awards-2026": { start: "2026-02-16", end: "2026-02-17" },
  "oscars-vanity-fair-party-2026": { start: "2026-03-01", end: "2026-03-02" },
  "paris-fashion-week-f-w-2026": { start: "2026-02-24", end: "2026-03-04" },
  "milan-design-week-salone-del-mobile-2026": { start: "2026-04-07", end: "2026-04-13" },
  "coachella-weekend-1-2026": { start: "2026-04-10", end: "2026-04-12" },
  "coachella-weekend-2-2026": { start: "2026-04-17", end: "2026-04-19" },
  "kentucky-derby-2026": { start: "2026-05-02", end: "2026-05-03" },
  "met-gala-2026": { start: "2026-05-04", end: "2026-05-05" },
  "cannes-film-festival-2026": { start: "2026-05-13", end: "2026-05-24" },
  "monaco-grand-prix-2026": { start: "2026-05-22", end: "2026-05-25" },
  "art-basel-basel-2026": { start: "2026-06-19", end: "2026-06-22" },
  "royal-ascot-2026": { start: "2026-06-17", end: "2026-06-21" },
  "wimbledon-men-s-final-2026": { start: "2026-07-11", end: "2026-07-13" },
  "sun-valley-allen-co-conference-2026": { start: "2026-07-08", end: "2026-07-13" },
  "aspen-ideas-festival-2026": { start: "2026-06-28", end: "2026-07-04" },
  "cowes-week-yacht-regatta-2026": { start: "2026-08-02", end: "2026-08-09" },
  "monaco-yacht-show-2026": { start: "2026-09-24", end: "2026-09-27" },
  "hamptons-season-watermill-ball-polo-2026": { start: "2026-07-25", end: "2026-07-27" },
  "salzburg-festival-2026": { start: "2026-07-20", end: "2026-08-31" },
  "edinburgh-international-festival-2026": { start: "2026-08-02", end: "2026-08-24" },
  "burning-man-for-the-silicon-valley-set-2026": { start: "2026-08-24", end: "2026-09-01" },
  "venice-film-festival-2026": { start: "2026-08-27", end: "2026-09-06" },
  "us-open-men-s-final-2026": { start: "2026-09-05", end: "2026-09-07" },
  "milan-fashion-week-paris-fashion-week-s-s-2026": { start: "2026-09-18", end: "2026-10-07" },
  "frieze-london-frieze-masters-2026": { start: "2026-10-15", end: "2026-10-19" },
  "japanese-grand-prix-2026": { start: "2026-10-10", end: "2026-10-12" },
  "pebble-beach-concours-d-elegance-2026": { start: "2026-08-16", end: "2026-08-18" },
  "breeders-cup-2026": { start: "2026-10-31", end: "2026-11-01" },
  "art-basel-miami-beach-2026": { start: "2026-12-03", end: "2026-12-07" },
  "kennedy-center-honors-2026": { start: "2026-12-06", end: "2026-12-08" },
  "abu-dhabi-grand-prix-2026": { start: "2026-12-05", end: "2026-12-07" },
  "venice-nye-gala-varies-2026": { start: "2026-12-31", end: "2027-01-01" },
  "st-barths-new-year-s-eve-2026": { start: "2026-12-29", end: "2027-01-02" },
  "aspen-new-year-s-2026": { start: "2026-12-26", end: "2027-01-02" }
};

let changes = 0;
events.forEach(e => {
    if (dates[e.id]) {
        e.startDate = `${dates[e.id].start}T00:00:00.000Z`;
        e.endDate = `${dates[e.id].end}T23:59:59.000Z`;
        changes++;
    }
});

fs.writeFileSync(path.join(process.cwd(), 'data/events.json'), JSON.stringify(events, null, 2));
console.log(`Successfully mapped dates for ${changes} events.`);
