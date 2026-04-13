/**
 * JETSTREAM IMAGERY GENERATION SCRIPT
 * 
 * One-time batch generation of imagery for personas, events, resorts, and aircraft.
 * Uses Google AI Studio (Imagen 4) via REST API.
 * 
 * SETUP:
 *   1. Get Google AI Studio API key: https://aistudio.google.com
 *   2. Add to .env.local: GOOGLE_AI_API_KEY=your_key_here
 *   3. Install: npm install --save-dev dotenv
 *   4. Run: node scripts/generate_imagery.js
 *   
 * USAGE:
 *   - Iterates over personas.json, events.json, resorts.json
 *   - Generates images via Imagen 4
 *   - Saves to /public/portraits, /public/imagery/events, /public/imagery/resorts
 *   - Updates JSON files with imageUrl paths
 *   - SKIPS entities that already have imageUrl set (idempotent)
 *   
 * COST: ~$0.04 per image. ~100 images total = ~$4 USD.
 */

const fs = require('fs');
const path = require('path');
const https = require('https');
require('dotenv').config({ path: '.env.local' });

const API_KEY = process.env.GOOGLE_AI_API_KEY;
if (!API_KEY) {
  console.error('ERROR: GOOGLE_AI_API_KEY not found in .env.local');
  process.exit(1);
}

const IMAGEN_ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/imagen-4.0-generate-preview-06-06:predict?key=${API_KEY}`;

// Shared editorial style suffix applied to ALL prompts for consistency
const STYLE_SUFFIX = `Editorial photograph, Kinfolk magazine aesthetic, shot on Kodak Portra 400 film, natural lighting, minimal styling, muted earth tones, shallow depth of field, 35mm lens, no text, no watermarks, no logos.`;

// -----------------------------------------------------------------------------
// PROMPT BUILDERS
// -----------------------------------------------------------------------------

function buildPersonaPrompt(persona) {
  const ageDesc = persona.age < 35 ? 'in their early thirties' : persona.age < 45 ? 'in their late thirties / early forties' : persona.age < 55 ? 'in their late forties' : 'in their mid-fifties';
  
  return `Editorial portrait photograph of a ${persona.gender} ${ageDesc}, ${persona.region} background. ${persona.voiceStyle.split('.')[0]}. ${persona.tastes.wears || 'simple elegant clothing'}. Neutral background, slightly turned toward camera, considered expression. ${STYLE_SUFFIX}`;
}

function buildEventPrompt(event) {
  // Categorize for visual treatment
  const visualHint = {
    'sport': 'atmospheric scene of motorsports or sport event',
    'art': 'gallery interior or art fair scene',
    'music': 'festival or concert scene at golden hour',
    'fashion': 'runway interior or behind-the-scenes',
    'gala': 'elegant evening event interior',
    'season': 'aspirational seasonal destination',
    'summit': 'corporate retreat interior',
    'film': 'film festival venue exterior'
  }[event.category] || 'aspirational event scene';
  
  return `${visualHint} at ${event.locationCity}, ${event.locationCountry}. ${event.shortDescription || event.description.split('.')[0]}. No people in foreground, atmospheric, scene-setting. ${STYLE_SUFFIX}`;
}

function buildResortPrompt(resort) {
  const angleHint = resort.category.includes('coastal') || resort.category.includes('island') ? 'aerial or coastal exterior view' : 
                    resort.category.includes('urban') ? 'architectural exterior detail' :
                    resort.category.includes('desert') || resort.category.includes('remote') ? 'expansive landscape with structure' :
                    'exterior architectural view';
  
  return `${angleHint} of luxury resort, ${resort.city}, ${resort.country}. ${resort.shortDescription}. Golden hour lighting, no people, no text. ${STYLE_SUFFIX}`;
}

// -----------------------------------------------------------------------------
// API CALL
// -----------------------------------------------------------------------------

async function generateImage(prompt, outputPath) {
  return new Promise((resolve, reject) => {
    const requestBody = JSON.stringify({
      instances: [{ prompt }],
      parameters: {
        sampleCount: 1,
        aspectRatio: '4:3',
        safetyFilterLevel: 'BLOCK_ONLY_HIGH',
        personGeneration: 'ALLOW_ADULT'
      }
    });

    const url = new URL(IMAGEN_ENDPOINT);
    const options = {
      hostname: url.hostname,
      path: url.pathname + url.search,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(requestBody)
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          if (json.error) {
            return reject(new Error(json.error.message));
          }
          if (!json.predictions || !json.predictions[0]) {
            return reject(new Error('No image returned'));
          }
          const base64Data = json.predictions[0].bytesBase64Encoded;
          const buffer = Buffer.from(base64Data, 'base64');
          fs.writeFileSync(outputPath, buffer);
          resolve(outputPath);
        } catch (err) {
          reject(err);
        }
      });
    });

    req.on('error', reject);
    req.write(requestBody);
    req.end();
  });
}

// -----------------------------------------------------------------------------
// PROCESSORS
// -----------------------------------------------------------------------------

async function processPersonas() {
  console.log('\n=== PERSONAS ===');
  const personasPath = path.join(process.cwd(), 'data', 'personas.json');
  const personas = JSON.parse(fs.readFileSync(personasPath, 'utf-8'));
  const outputDir = path.join(process.cwd(), 'public', 'portraits');
  fs.mkdirSync(outputDir, { recursive: true });
  
  let updated = false;
  for (const persona of personas) {
    if (persona.imageUrl) {
      console.log(`SKIP ${persona.id} (already has image)`);
      continue;
    }
    const outputPath = path.join(outputDir, `${persona.id}.jpg`);
    const prompt = buildPersonaPrompt(persona);
    
    console.log(`GENERATING ${persona.id}...`);
    try {
      await generateImage(prompt, outputPath);
      persona.imageUrl = `/portraits/${persona.id}.jpg`;
      updated = true;
      console.log(`  ✓ Saved to ${outputPath}`);
    } catch (err) {
      console.error(`  ✗ Failed: ${err.message}`);
    }
    
    // Rate limit: 1 request per 2 seconds
    await new Promise(r => setTimeout(r, 2000));
  }
  
  if (updated) {
    fs.writeFileSync(personasPath, JSON.stringify(personas, null, 2));
    console.log(`Updated ${personasPath}`);
  }
}

async function processEvents() {
  console.log('\n=== EVENTS ===');
  const eventsPath = path.join(process.cwd(), 'data', 'events.json');
  const events = JSON.parse(fs.readFileSync(eventsPath, 'utf-8'));
  const outputDir = path.join(process.cwd(), 'public', 'imagery', 'events');
  fs.mkdirSync(outputDir, { recursive: true });
  
  let updated = false;
  for (const event of events) {
    if (event.imageUrl) {
      console.log(`SKIP ${event.id} (already has image)`);
      continue;
    }
    const outputPath = path.join(outputDir, `${event.id}.jpg`);
    const prompt = buildEventPrompt(event);
    
    console.log(`GENERATING ${event.id}...`);
    try {
      await generateImage(prompt, outputPath);
      event.imageUrl = `/imagery/events/${event.id}.jpg`;
      updated = true;
      console.log(`  ✓ Saved`);
    } catch (err) {
      console.error(`  ✗ Failed: ${err.message}`);
    }
    
    await new Promise(r => setTimeout(r, 2000));
  }
  
  if (updated) {
    fs.writeFileSync(eventsPath, JSON.stringify(events, null, 2));
    console.log(`Updated ${eventsPath}`);
  }
}

async function processResorts() {
  console.log('\n=== RESORTS ===');
  const resortsPath = path.join(process.cwd(), 'data', 'resorts.json');
  const resorts = JSON.parse(fs.readFileSync(resortsPath, 'utf-8'));
  const outputDir = path.join(process.cwd(), 'public', 'imagery', 'resorts');
  fs.mkdirSync(outputDir, { recursive: true });
  
  let updated = false;
  for (const resort of resorts) {
    if (resort.imageUrl) {
      console.log(`SKIP ${resort.id} (already has image)`);
      continue;
    }
    const outputPath = path.join(outputDir, `${resort.id}.jpg`);
    const prompt = buildResortPrompt(resort);
    
    console.log(`GENERATING ${resort.id}...`);
    try {
      await generateImage(prompt, outputPath);
      resort.imageUrl = `/imagery/resorts/${resort.id}.jpg`;
      updated = true;
      console.log(`  ✓ Saved`);
    } catch (err) {
      console.error(`  ✗ Failed: ${err.message}`);
    }
    
    await new Promise(r => setTimeout(r, 2000));
  }
  
  if (updated) {
    fs.writeFileSync(resortsPath, JSON.stringify(resorts, null, 2));
    console.log(`Updated ${resortsPath}`);
  }
}

// -----------------------------------------------------------------------------
// MAIN
// -----------------------------------------------------------------------------

async function main() {
  console.log('JETSTREAM IMAGERY GENERATION');
  console.log('============================');
  console.log(`Using Imagen 4 via Google AI Studio`);
  console.log(`Style: ${STYLE_SUFFIX.substring(0, 80)}...`);
  console.log();
  
  const args = process.argv.slice(2);
  const mode = args[0] || 'all';
  
  try {
    if (mode === 'all' || mode === 'personas') await processPersonas();
    if (mode === 'all' || mode === 'events') await processEvents();
    if (mode === 'all' || mode === 'resorts') await processResorts();
    
    console.log('\n✓ DONE');
    console.log('Next: commit /public images and updated /data JSON files');
  } catch (err) {
    console.error('FATAL:', err);
    process.exit(1);
  }
}

main();
