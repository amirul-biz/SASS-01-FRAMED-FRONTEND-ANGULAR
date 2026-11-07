import { Injectable, signal } from '@angular/core';

/**
 * Android/Chrome install prompt.
 *
 * The browser fires `beforeinstallprompt` once, and only if the app meets
 * the installability criteria (manifest + icons + SW + HTTPS). We must
 * capture and stash the event — it can only be used once, and only from a
 * user gesture.
 *
 * iOS never fires it, so `isIosInstallable` exposes a manual
 * "Share -> Add to Home Screen" hint instead.
 */
interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  readonly userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

const DISMISS_KEY = 'picsweep.installPromptDismissedAt';
const DISMISS_COOLDOWN_DAYS = 14;

@Injectable({ providedIn: 'root' })
export class InstallPromptService {
  private deferred: BeforeInstallPromptEvent | null = null;

  /** True when a captured prompt is available to show. */
  readonly canPrompt = signal(false);

  /** True when already running as an installed app. */
  readonly isStandalone = signal(false);

  /** True on iOS Safari, where we show the manual hint instead. */
  readonly isIos = signal(false);

  constructor() {
    if (typeof window === 'undefined') return;

    this.isStandalone.set(
      window.matchMedia('(display-mode: standalone)').matches ||
        // iOS Safari's legacy flag
        (navigator as unknown as { standalone?: boolean }).standalone === true
    );

    const ua = navigator.userAgent;
    // iPadOS 13+ reports as Mac; detect touch-capable "Macs".
    const isIpadOs = /Macintosh/.test(ua) && 'ontoumax' in document;
    this.isIos.set(/iPhone|iPad|iPod/.test(ua) || isIpadOs);

    window.addEventListener('beforeinstallprompt', (event) => {
      event.preventDefault(); // stop Chrome's mini-infobar
      this.deferred = event as BeforeInstallPromptEvent;
      if (!this.isStandalone() && !this.recentlyDismissed()) {
        this.canPrompt.set(true);
      }
    });

    window.addEventListener('appinstalled', () => {
      this.deferred = null;
      this.canPrompt.set(false);
    });
  }

  /** Show the native prompt. Returns true if the user accepted. */
  async promptInstall(): Promise<boolean> {
    const event = this.deferred;
    if (!event) return false;

    this.deferred = null; // single-use
    this.canPrompt.set(false);

    await event.prompt();
    const { outcome } = await event.userChoice;
    return outcome === 'accepted';
  }

  /** Remember a dismissal so we don't nag on every visit. */
  dismiss(): void {
    this.canPrompt.set(false);
    try {
      localStorage.setItem(DISMISS_KEY, String(Date.now()));
    } catch {
      /* private mode / storage disabled — just don't persist */
    }
  }

  private recentlyDismissed(): boolean {
    try {
      const raw = localStorage.getItem(DISMISS_KEY);
      if (!raw) return false;
      const days = (Date.now() - Number(raw)) / 86_400_000;
      return days < DISMISS_COOLDOWN_DAYS;
    } catch {
      return false;
    }
  }
}
