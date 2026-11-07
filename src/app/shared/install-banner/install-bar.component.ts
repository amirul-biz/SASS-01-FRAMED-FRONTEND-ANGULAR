import { ChangeDetectionStrategy, Component, effect, inject } from '@angular/core';
import { InstallPromptService } from '../../core/install-prompt.service';

/**
 * "Install app" affordance for desktop / tablet.
 *
 * Lives INSIDE the fixed header, above the nav row — a floating corner banner
 * was easy to miss on a laptop and covered content. Hidden below `md`, where
 * the hamburger menu item is used instead (see InstallMenuItemComponent).
 *
 * When visible it sets --install-bar-h on :host (its own measured height), so
 * the fixed header and the page spacer in consumer-shell can offset by exactly
 * the right amount. When hidden the var is unset and the default 0px applies.
 *
 * Only rendered when the browser actually handed us an install prompt.
 */
@Component({
  selector: 'app-install-bar',
  template: `
    @if (visible()) {
      <div class="bar" role="region" aria-label="Install Picsweep">
        <div class="inner">
          <span class="material-symbols-outlined bar-icon">install_desktop</span>
          <p class="copy">
            <strong>Install Picsweep</strong> — faster access to your event photos.
          </p>
          <button type="button" class="install" (click)="install()">Install</button>
          <button type="button" class="dismiss" (click)="dismiss()" aria-label="Dismiss">
            <span class="material-symbols-outlined">close</span>
          </button>
        </div>
      </div>
    }
  `,
  styles: [
    `
      :host {
        display: block;
      }
      /* Mobile uses the hamburger menu item instead. */
      @media (max-width: 767px) {
        :host {
          display: none;
        }
      }
      .bar {
        background: #14213d;
        color: #ffffff;
      }
      .inner {
        max-width: 90rem;
        margin: 0 auto;
        display: flex;
        align-items: center;
        gap: 0.75rem;
        padding: 0.5rem 1.5rem;
        font-family: system-ui, -apple-system, 'Segoe UI', sans-serif;
      }
      .bar-icon {
        font-size: 20px;
        opacity: 0.85;
        flex-shrink: 0;
      }
      .copy {
        margin: 0;
        flex: 1 1 auto;
        font-size: 0.8125rem;
        line-height: 1.3;
        color: rgba(255, 255, 255, 0.82);
      }
      .copy strong {
        color: #ffffff;
      }
      .install {
        background: #e4007c;
        color: #ffffff;
        border: 0;
        border-radius: 999px;
        padding: 0.375rem 1rem;
        font-size: 0.8125rem;
        font-weight: 600;
        font-family: inherit;
        cursor: pointer;
        flex-shrink: 0;
      }
      .dismiss {
        background: transparent;
        border: 0;
        color: rgba(255, 255, 255, 0.6);
        cursor: pointer;
        display: flex;
        align-items: center;
        padding: 0.25rem;
        flex-shrink: 0;
      }
      .dismiss .material-symbols-outlined {
        font-size: 18px;
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class InstallBarComponent {
  private readonly prompt = inject(InstallPromptService);

  readonly canPrompt = this.prompt.canPrompt.asReadonly();

  constructor() {
    // The page spacer in consumer-shell is a sibling of the header, so it
    // cannot inherit a var declared on the bar's own :host. Publish the height
    // on <html> instead — one place every consumer can read from.
    effect(() => {
      const shown = this.visible();
      const root = document.documentElement;
      if (shown) {
        root.style.setProperty('--install-bar-h', '2.25rem');
      } else {
        root.style.removeProperty('--install-bar-h');
      }
    });
  }

  visible(): boolean {
    // Desktop bar only when a real native prompt exists — iOS has no prompt,
    // and the manual hint belongs in the mobile menu, not a desktop bar.
    return this.canPrompt() && !this.prompt.isStandalone();
  }

  async install(): Promise<void> {
    await this.prompt.promptInstall();
  }

  dismiss(): void {
    this.prompt.dismiss();
  }
}
