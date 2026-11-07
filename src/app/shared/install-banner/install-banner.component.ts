import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { InstallPromptService } from '../../core/install-prompt.service';

/**
 * "Add Picsweep to your home screen" banner.
 *
 * Renders only when the browser has handed us a usable install prompt
 * (Chrome/Edge/Android) or when we're on iOS Safari, where we show the
 * manual Share -> Add to Home Screen instructions instead.
 *
 * Mounted once in App so it works on every route, including the public
 * order pages that customers land on from an email link.
 */
@Component({
  selector: 'app-install-banner',
  template: `
    @if (showBanner()) {
      <div
        class="banner"
        role="dialog"
        aria-live="polite"
        aria-label="Install Picsweep"
      >
        <img src="icon-192.png" alt="" class="icon" />
        <div class="copy">
          <p class="title">Install Picsweep</p>
          <p class="body">
            @if (isIos()) {
              Tap <strong>Share</strong> then <strong>Add to Home Screen</strong>
              to open your photos faster.
            } @else {
              Add Picsweep to your home screen for faster access to your orders.
            }
          </p>
        </div>
        <div class="actions">
          @if (!isIos()) {
            <button type="button" class="install" (click)="install()">Install</button>
          }
          <button type="button" class="dismiss" (click)="dismiss()" aria-label="Dismiss">
            Not now
          </button>
        </div>
      </div>
    }
  `,
  styles: [
    `
      :host {
        position: fixed;
        left: 0;
        right: 0;
        bottom: 0;
        z-index: 40;
        display: flex;
        justify-content: center;
        padding: 1rem;
        pointer-events: none;
      }
      .banner {
        pointer-events: auto;
        width: 100%;
        max-width: 26rem;
        display: flex;
        align-items: center;
        gap: 0.875rem;
        padding: 0.875rem 1rem;
        background: #14213d;
        color: #ffffff;
        border-radius: 0.875rem;
        box-shadow: 0 8px 32px rgba(0, 0, 0, 0.32);
      }
      .icon {
        width: 2.5rem;
        height: 2.5rem;
        border-radius: 0.5rem;
        flex-shrink: 0;
      }
      .copy {
        flex: 1 1 auto;
        min-width: 0;
      }
      .title {
        margin: 0 0 0.125rem;
        font-size: 0.875rem;
        font-weight: 600;
        line-height: 1.25;
      }
      .body {
        margin: 0;
        font-size: 0.75rem;
        line-height: 1.4;
        color: rgba(255, 255, 255, 0.72);
      }
      .actions {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        flex-shrink: 0;
      }
      button {
        font-size: 0.8125rem;
        font-weight: 600;
        border-radius: 999px;
        border: 0;
        cursor: pointer;
        padding: 0.5rem 0.875rem;
        font-family: inherit;
      }
      .install {
        background: #e4007c;
        color: #ffffff;
      }
      .dismiss {
        background: transparent;
        color: rgba(255, 255, 255, 0.72);
        padding: 0.5rem 0.25rem;
      }
      @media (max-width: 22rem) {
        .banner {
          flex-wrap: wrap;
        }
        .actions {
          width: 100%;
          justify-content: flex-end;
        }
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class InstallBannerComponent {
  private readonly prompt = inject(InstallPromptService);

  readonly canPrompt = this.prompt.canPrompt.asReadonly();
  readonly isStandalone = this.prompt.isStandalone.asReadonly();
  readonly isIos = this.prompt.isIos.asReadonly();

  /** Android shows it only with a real prompt; iOS shows the manual hint. */
  showBanner(): boolean {
    if (this.isStandalone()) return false;
    return this.canPrompt() || this.isIos();
  }

  async install(): Promise<void> {
    await this.prompt.promptInstall();
  }

  dismiss(): void {
    this.prompt.dismiss();
  }
}
