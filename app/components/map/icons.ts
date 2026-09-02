import type maplibregl from 'maplibre-gl';

// Nose-up aircraft silhouette (Material "flight" glyph, Apache-2.0).
const JET_PATH = 'M21 16v-2l-8-5V3.5c0-.83-.67-1.5-1.5-1.5S10 2.67 10 3.5V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5l8 2.5z';

function jetSvg(fill: string, stroke: string, glow?: string): string {
  const size = 64;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 24 24">
    ${glow ? `<defs><filter id="g" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="1.4"/></filter></defs>
    <path d="${JET_PATH}" fill="${glow}" filter="url(#g)" opacity="0.9"/>` : ''}
    <path d="${JET_PATH}" fill="${fill}" stroke="${stroke}" stroke-width="0.9" stroke-linejoin="round"/>
  </svg>`;
}

function loadImage(svg: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image(64, 64);
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
  });
}

// Side-view yacht hull + superstructure (nose up so icon-rotate = heading works like the jet)
const YACHT_PATH = 'M12 2c1.6 0 2.6 1.4 2.9 3.2l.9 8.1c.1.9-.2 1.7-.9 2.3l-1.3 1.1c-.9.8-2.3.8-3.2 0l-1.3-1.1c-.7-.6-1-1.4-.9-2.3l.9-8.1C9.4 3.4 10.4 2 12 2zm0 3.2c-.6 0-1 .5-1 1.1v5.4c0 .6.4 1 1 1s1-.4 1-1V6.3c0-.6-.4-1.1-1-1.1zM8.2 18.6h7.6c.4 0 .7.3.7.7v.6c0 .4-.3.7-.7.7H8.2c-.4 0-.7-.3-.7-.7v-.6c0-.4.3-.7.7-.7z';
const ANCHOR_PATH = 'M12 2a3 3 0 0 1 1 5.83V9h3v2h-3v8.9a8 8 0 0 0 6.9-6.9L22 13a10 10 0 0 1-20 0l2.1 0a8 8 0 0 0 6.9 6.9V11H8V9h3V7.83A3 3 0 0 1 12 2zm0 2a1 1 0 1 0 0 2 1 1 0 0 0 0-2z';
const HOME_PATH = 'M12 3l9 8h-3v9h-5v-6h-2v6H6v-9H3l9-8z';

function glyphSvg(path: string, fill: string, stroke: string, glow?: string): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24">
    ${glow ? `<defs><filter id="g" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="1.4"/></filter></defs><path d="${path}" fill="${glow}" filter="url(#g)" opacity="0.9"/>` : ''}
    <path d="${path}" fill="${fill}" stroke="${stroke}" stroke-width="0.8" stroke-linejoin="round"/>
  </svg>`;
}

export async function registerIcons(map: maplibregl.Map): Promise<void> {
  const defs: [string, string][] = [
    ['jet-air', jetSvg('#22d3ee', '#04121a')],
    ['jet-parked', jetSvg('#8a97a8', '#0a0f18')],
    ['jet-selected', jetSvg('#ffffff', '#0891a6', '#22d3ee')],
    ['yacht-air', glyphSvg(YACHT_PATH, '#7dd3fc', '#04121a')],
    ['yacht-parked', glyphSvg(YACHT_PATH, '#cbd5e1', '#0a0f18')],
    ['yacht-selected', glyphSvg(YACHT_PATH, '#ffffff', '#0891a6', '#22d3ee')],
    ['anchor', glyphSvg(ANCHOR_PATH, '#94a3b8', '#0a0f18')],
    ['home', glyphSvg(HOME_PATH, '#fbbf24', '#0a0f18', '#fbbf24')],
  ];
  await Promise.all(defs.map(async ([id, svg]) => {
    try {
      const img = await loadImage(svg);
      if (!map.hasImage(id)) map.addImage(id, img, { pixelRatio: 2 });
    } catch (e) {
      console.warn('icon load failed', id, e);
    }
  }));
}
