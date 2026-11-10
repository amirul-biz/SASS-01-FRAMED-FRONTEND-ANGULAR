import { Injectable, signal } from '@angular/core';

/**
 * Install-prompt state for the "Install App" affordance.
 *
 * Chrome/Edge/Android fire `beforeinstallprompt` when the app is installable
 * (manifest + icons + SW + HTTPS). The event can be used ONCE and only from a
 * user gesture, so we stash it.
 *
 * Two things this must get right:
 *
 * 1. RACE — the event often fires while the page is still booting, possibly
 *    before Angular instantiates this service. We therefore attach the
 *    listener in the constructor AND check a global that an inline script in
 *    index.html sets, so an early event is never missed.
 *
 * 2. SCOPE — `isIos` must ONLY be true for actual iOS. iPadOS 13+ masquerades
 *    as "Macintosh", so it needs the touch-point test. Getting this wrong
 *    shows the manual hint on Android/desktop, where a real button exists.
 */
interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  readonly userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

const DISMISS_KEY = 'picsweep.installPromptDismissedAt';
/** Kept only so previously-stored dismissal flags are ignored rather than read. */
const DISMISS_COOLDOWN_DAYS = 0;

/** Set by an inline script in index.html if the event fires before we load. */
declare global {
  interface Window {
    __picsweepInstallPrompt?: BeforeInstallPromptEvent | null;
  }
}

@Injectable({ providedIn: 'root' })
export class InstallPromptService {
  private deferred: BeforeInstallPromptEvent | null = null;

  /** True when a captured prompt is available to show. */
  readonly canPrompt = signal(false);

  /** True when already running as an installed app. */
  readonly isStandalone = signal(false);

  /** True only on real iOS/iPadOS, where no programmatic install exists. */
  readonly isIos = signal(false);

  constructor() {
    if (typeof window === 'undefined') return;

    this.isStandalone.set(
      window.matchMedia('(display-mode: standalone)').matches ||
        // iOS Safari's legacy flag
        (navigator as unknown as { standalone?: boolean }).standalone === true
    );

    const ua = navigator.userAgent;
    // iPadOS 13+ reports as desktop "Macintosh"; detect touch-capable Macs.
    const isIpadOs = /Macintosh/.test(ua) && 'ontouchstart' in document;
    this.isIos.set(/iPhone|iPad|iPod/.test(ua) || isIpadOs);

    // 1. Pick up an event captured by the inline bootstrap script, if any.
    const early = window.__picsweepInstallPrompt;
    if (early) this.capture(early);

    // 2. Also listen normally for events that fire after boot.
    window.addEventListener('beforeinstallprompt', (event) => {
      event.preventDefault(); // suppress Chrome's own mini-infobar
      this.capture(event as BeforeInstallPromptEvent);
    });

    window.addEventListener('appinstalled', () => {
      this.deferred = null;
      window.__picsweepInstallPrompt = null;
      this.canPrompt.set(false);
    });
  }

  private capture(event: BeforeInstallPromptEvent): void {
    this.deferred = event;
    window.__picsweepInstallPrompt = event;
    this.canPrompt.set(true);
  }

  /** Show the native prompt. Returns true if the user accepted. */
  async promptInstall(): Promise<boolean> {
    const event = this.deferred;
    if (!event) return false;

    this.deferred = null; // single-use
    window.__picsweepInstallPrompt = null;
    this.canPrompt.set(false);

    await event.prompt();
    const { outcome } = await event.userChoice;
    return outcome === 'accepted';
  }

  /** Remember a dismissal so we don't nag on every visit. */
  dismiss(): void {
    // Intentionally a no-op for visibility: arfan wants the install affordance to be
    // permanent, whether or not the app is already installed. Kept as a method so the
    // templates' (dismissed) handlers keep compiling.
    this.canPrompt.set(false);
  }

  private recentlyDismissed(): boolean {
    return false;
  }

  /**
   * Exposed for the UI: should we show the install affordance?
   *
   * Deliberately always true (except SSR). arfan's requirement: the install entry point
   * persists permanently, whether or not the user has already installed the app, and
   * regardless of whether Chrome supplied a prompt event. The action itself degrades
   * gracefully — a real one-tap install where an event exists, manual instructions
   * otherwise.
   */
  visible(): boolean {
    if (typeof window === 'undefined') return false;
    return true;
  }

  /** True when the platform gives us a real one-tap install (Android/desktop Chrome). */
  canInstallInOneTap(): boolean {
    return this.deferred !== null;
  }
}
