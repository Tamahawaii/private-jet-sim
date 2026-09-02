/**
 * Central place for in-app links. Every detail screen is a static route with a
 * query parameter so the same build runs on Vercel and inside the Android shell
 * (a static export cannot have dynamic path segments).
 */
export const routes = {
  home: () => '/',
  flight: (id: string) => `/flight/live?id=${encodeURIComponent(id)}`,
  planner: (q: Record<string, string | undefined> = {}) => {
    const p = Object.entries(q).filter(([, v]) => v).map(([k, v]) => `${k}=${encodeURIComponent(v as string)}`).join('&');
    return `/flight/new${p ? `?${p}` : ''}`;
  },
  event: (id: string) => `/events/detail?id=${encodeURIComponent(id)}`,
  resort: (id: string) => `/resorts/detail?id=${encodeURIComponent(id)}`,
  aircraft: (tail: string) => `/fleet/detail?tail=${encodeURIComponent(tail)}`,
  persona: (id: string) => `/social/dossier?id=${encodeURIComponent(id)}`,
  dm: (id: string) => `/social/dms/thread?id=${encodeURIComponent(id)}`,
  customPersonaEdit: (id: string) => `/social/custom/edit?id=${encodeURIComponent(id)}`,
  yacht: (id: string) => `/yachts/detail?id=${encodeURIComponent(id)}`,
  residence: (id: string) => `/residences/detail?id=${encodeURIComponent(id)}`,
};

/** Maps links saved by older builds (e.g. notifications) onto the static routes. */
export function resolveLegacyLink(href: string): string {
  const m = href.match(/^\/(flight|events|resorts|fleet|social\/dms|social\/custom|social)\/([^/?#]+)(\/edit)?\/?$/);
  if (!m) return href;
  const [, kind, id, edit] = m;
  if (kind === 'flight' && id !== 'new' && id !== 'live') return routes.flight(id);
  if (kind === 'events' && id !== 'detail') return routes.event(id);
  if (kind === 'resorts' && id !== 'detail') return routes.resort(id);
  if (kind === 'fleet' && id !== 'detail') return routes.aircraft(id);
  if (kind === 'social/dms' && id !== 'thread') return routes.dm(id);
  if (kind === 'social/custom' && edit) return routes.customPersonaEdit(id);
  if (kind === 'social' && !['dms', 'custom', 'dossier'].includes(id)) return routes.persona(id);
  return href;
}
