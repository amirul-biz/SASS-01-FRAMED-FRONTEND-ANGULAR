import { Injectable, isDevMode } from '@angular/core';

/**
 * Hand-written service worker registration.
 *
 * Deliberately does NOT import @angular/service-worker — public/sw.js is
 * plain JS with no build step and no dependency. This service only:
 *   - registers /sw.js in production builds
 *   - detects when a new worker is waiting, so the UI can offer "reload"
 *
 * Skipped in dev so hot reload isn't fighting the cache.
 */
@Injectable({ providedIn: 'root' })
export class PwaService {
  private updateReady = false;

  constructor() {
    if (isDevMode()) return;
    if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return;

    window.addEventListener('load', () => {
      navigator.serviceWorker
        .register('/sw.js', { scope: '/' })
        .then((reg) => {
          // A worker already waiting means a previous update was never applied.
          if (reg.waiting) this.updateReady = true;

          reg.addEventListener('updatefound', () => {
            const incoming = reg.installing;
            if (!incoming) return;
            incoming.addEventListener('statechange', () => {
              // New worker finished installing while an older one still controls
              // the page -> it's waiting for us to activate.
              if (incoming.state === 'installed' && navigator.serviceWorker.controller) {
                this.updateReady = true;
              }
            });
          });
        })
        .catch((err) => console.warn('[pwa] sw registration failed', err));
    });
  }

  /** True once a newer worker has installed and is waiting. */
  get isUpdateReady(): boolean {
    return this.updateReady;
  }

  /** Tell the waiting worker to activate, then reload into the new version. */
  async activateUpdate(): Promise<void> {
    if (!('serviceWorker' in navigator)) return;
    const reg = await navigator.serviceWorker.getRegistration();
    reg?.waiting?.postMessage('SKIP_WAITING');
    // Give the worker a tick to claim clients before reloading.
    await new Promise((r) => setTimeout(r, 100));
    window.location.reload();
  }
}
