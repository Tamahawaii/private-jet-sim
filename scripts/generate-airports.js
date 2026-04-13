const fs = require('fs');
const readline = require('readline');
const https = require('https');

const URL = 'https://davidmegginson.github.io/ourairports-data/airports.csv';
const OUTPUT_FILE = './data/airports.json';

async function generate() {
    console.log('Fetching OurAirports CSV...');
    
    const fileStream = fs.createWriteStream('./scripts/airports.csv');
    await new Promise((resolve, reject) => {
        https.get(URL, (response) => {
            if (response.statusCode === 301 || response.statusCode === 302) {
                // handle redirect
                https.get(response.headers.location, (res) => {
                    res.pipe(fileStream);
                    res.on('end', resolve);
                });
            } else {
                response.pipe(fileStream);
                response.on('end', resolve);
                response.on('error', reject);
            }
        });
    });

    console.log('Parsing CSV...');
    const result = [];
    
    const readInterface = readline.createInterface({
        input: fs.createReadStream('./scripts/airports.csv'),
        console: false
    });

    let isHeader = true;
    let headers = [];
    
    // id,ident,type,name,latitude_deg,longitude_deg,elevation_ft,continent,iso_country,iso_region,municipality,scheduled_service,gps_code,iata_code,local_code,home_link,wikipedia_link,keywords
    for await (const line of readInterface) {
        // basic csv split ignoring commas inside quotes
        const match = line.match(/(".*?"|[^",\s]+)(?=\s*,|\s*$)/g);
        if (!match) continue;
        
        // better csv split
        let cols = [];
        let cur = '';
        let inQuote = false;
        for (let i = 0; i < line.length; i++) {
            if (line[i] === '"') {
                inQuote = !inQuote;
            } else if (line[i] === ',' && !inQuote) {
                cols.push(cur.trim());
                cur = '';
            } else {
                cur += line[i];
            }
        }
        cols.push(cur.trim());
        
        if (isHeader) {
            headers = cols.map(c => c.replace(/"/g, ''));
            isHeader = false;
            continue;
        }

        const row = {};
        headers.forEach((h, i) => {
            row[h] = cols[i] ? cols[i].replace(/^"|"$/g, '') : null;
        });

        if (['large_airport', 'medium_airport', 'small_airport'].includes(row.type) && row.ident && row.ident.length >= 3) {
            // Priority to gps_code (ICAO) then ident if it's 4 chars
            let icao = row.gps_code || row.ident;
            if (icao && icao.length >= 3) {
                 result.push({
                    icao: icao,
                    name: row.name,
                    city: row.municipality,
                    country: row.iso_country,
                    lat: parseFloat(row.latitude_deg),
                    lng: parseFloat(row.longitude_deg)
                });
            }
        }
    }

    // Force add specific event ICAO fallbacks just in case the dataset missed them or misclassified them
    const required = ["OMAA", "LFSB", "KOPF", "KVNY", "LFPB", "LSZH", "EGGW", "KASE", "LFMN", "VHHH", "RJTT", "LSZA", "LIMJ", "LFMD"];
    
    console.log(`Parsed ${result.length} airports.`);
    const missing = required.filter(req => !result.some(r => r.icao === req));
    console.log("Missing required:", missing);

    fs.writeFileSync(OUTPUT_FILE, JSON.stringify(result, null, 2));
    console.log(`Saved to ${OUTPUT_FILE}`);
}

generate().catch(console.error);
