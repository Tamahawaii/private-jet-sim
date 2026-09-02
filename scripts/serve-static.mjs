// Serves the Android static bundle with the same path rules as the APK's
// asset interceptor, so the export can be exercised in a desktop browser.
import http from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import path from 'node:path';

const ROOT = process.argv[2] || 'android/app/src/main/assets/www';
const PORT = Number(process.env.PORT || 3106);
const MIME = { html: 'text/html', js: 'application/javascript', css: 'text/css', json: 'application/json', txt: 'text/plain', svg: 'image/svg+xml', png: 'image/png', jpg: 'image/jpeg', woff2: 'font/woff2', ico: 'image/x-icon', webmanifest: 'application/manifest+json' };

async function exists(p) { try { return (await stat(p)).isFile(); } catch { return false; } }

http.createServer(async (req, res) => {
  let p = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  if (p.endsWith('/')) p += 'index.html';
  const candidates = [p, p + '.html', p + '/index.html'];
  let file = null;
  for (const c of candidates) { const f = path.join(ROOT, c); if (await exists(f)) { file = f; break; } }
  if (!file) file = path.join(ROOT, '404.html');
  const ext = file.split('.').pop();
  res.writeHead(await exists(file) ? 200 : 404, { 'Content-Type': MIME[ext] || 'application/octet-stream', 'Cache-Control': 'no-cache' });
  res.end(await readFile(file).catch(() => 'missing'));
}).listen(PORT, () => console.log('static bundle on http://localhost:' + PORT));
