import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { InstallPromptService } from '../../core/install-prompt.service';

/**
 * "Install Picsweep" row for the mobile hamburger menu.
 *
 * Sits inside the nav sheet alongside Homepage/Events/Login — where users
 * already look for app-level actions — instead of a floating banner that
 * covers content on a small screen.
 *
 * Android/Chrome: a plain tappable row. One tap -> native install prompt.
 * iOS Safari: NO button. Apple exposes no API for programmatic install, so a
 * button would silently do nothing. We render a quiet one-line hint instead.
 */
@Component({
  selector: 'app-install-menu-item',
  template: `
    @if (visible()) {
      <div class="h-unit bg-outline-variant/30 my-xs"></div>
      @if (isIos()) {
        <p class="ios-hint" aria-label="How to install on iPhone">
          Install: tap <strong>Share</strong>, then
          <strong>Add to Home Screen</strong>
        </p>
      } @else {
        <button type="button" class="install-row" (click)="install()">
          <span class="material-symbols-outlined row-icon">install_mobile</span>
          <span class="row-label">Install App</span>
        </button>
      }
    }
  `,
  styles: [
    `
      :host {
        display: contents;
      }
      .install-row {
        display: flex;
        align-items: center;
        gap: 0.75rem;
        min-height: 2.75rem;
        width: 100%;
        padding: 0;
        border: 0;
        background: transparent;
        font-family: inherit;
        font-size: 1rem;
        color: #e4007c;
        font-weight: 600;
        cursor: pointer;
        text-align: left;
      }
      .row-icon {
        font-size: 22px;
      }
      .ios-hint {
        display: flex;
        align-items: center;
        min-height: 2.75rem;
        margin: 0;
        font-size: 0.875rem;
        line-height: 1.4;
        color: rgba(20, 33, 61, 0.62);
      }
      .ios-hint strong {
        color: rgba(20, 33, 61, 0.82);
        font-weight: 600;
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class InstallMenuItemComponent {
  private readonly prompt = inject(InstallPromptService);

  readonly isIos = this.prompt.isIos.asReadonly();

  visible(): boolean {
    if (this.prompt.isStandalone()) return false;
    return this.prompt.canPrompt() || this.isIos();
  }

  async install(): Promise<void> {
    await this.prompt.promptInstall();
  }
}
