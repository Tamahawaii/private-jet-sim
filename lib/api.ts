/**
 * fetch() for the game's own API routes. On the web it is a plain relative
 * fetch. Inside the Android shell the static bundle has no server, so the
 * call is handed to the native layer (which talks to the live deployment
 * without CORS) and resolved back through window.__jsNativeResolve.
 */

type Pending = { resolve: (r: Response) => void; reject: (e: Error) => void };

declare global {
  interface Window {
    JetstreamNative?: {
      vibrate?: (ms: number) => void;
      isNative?: () => boolean;
      request?: (id: string, method: string, path: string, body: string | null) => void;
      saveFile?: (name: string, base64: string, mime: string) => void;
      reload?: () => void;
    };
    __jsNativeResolve?: (id: string, status: number, body: string) => void;
    __jsNativePending?: Record<string, Pending>;
  }
}

export function isNativeShell(): boolean {
  return typeof window !== 'undefined' && !!window.JetstreamNative?.request;
}

export async function apiFetch(path: string, init: { method?: string; body?: string } = {}): Promise<Response> {
  if (!isNativeShell()) {
    return fetch(path, { method: init.method || 'GET', headers: { 'Content-Type': 'application/json' }, body: init.body });
  }
  const id = Math.random().toString(36).slice(2) + Date.now().toString(36);
  if (!window.__jsNativePending) {
    window.__jsNativePending = {};
    window.__jsNativeResolve = (rid, status, body) => {
      const p = window.__jsNativePending?.[rid];
      if (!p) return;
      delete window.__jsNativePending![rid];
      p.resolve(new Response(body, { status, headers: { 'Content-Type': 'application/json' } }));
    };
  }
  return new Promise<Response>((resolve, reject) => {
    window.__jsNativePending![id] = { resolve, reject };
    setTimeout(() => {
      if (window.__jsNativePending?.[id]) { delete window.__jsNativePending[id]; reject(new Error('native request timeout')); }
    }, 60000);
    try {
      window.JetstreamNative!.request!(id, init.method || 'GET', path, init.body ?? null);
    } catch (e) {
      delete window.__jsNativePending![id];
      reject(e as Error);
    }
  });
}
