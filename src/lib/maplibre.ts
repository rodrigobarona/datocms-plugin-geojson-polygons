import { setWorkerUrl } from 'maplibre-gl';

let configured = false;

/**
 * The worker files are copied next to index.html, and the plugin is served
 * from a versioned CDN folder, so the URL must be relative to the document.
 */
export function configureMapLibreWorker(): void {
  if (configured) {
    return;
  }

  setWorkerUrl(new URL('./maplibre-gl-worker.mjs', document.baseURI).href);
  configured = true;
}

export function isCoarsePointer(): boolean {
  return window.matchMedia('(pointer: coarse)').matches;
}
