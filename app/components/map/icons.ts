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

export async function registerIcons(map: maplibregl.Map): Promise<void> {
  const defs: [string, string][] = [
    ['jet-air', jetSvg('#22d3ee', '#04121a')],
    ['jet-parked', jetSvg('#8a97a8', '#0a0f18')],
    ['jet-selected', jetSvg('#ffffff', '#0891a6', '#22d3ee')],
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
