import { ChangeDetectionStrategy, Component, input, output, signal } from '@angular/core';

// Reset-password dialog for a photographer account. The overlay is styled with scoped :host
// CSS (not Tailwind utilities) so its fixed positioning renders identically wherever the
// dialog is embedded — same pattern as ConfirmDialogComponent.
@Component({
  selector: 'app-reset-password-dialog',
  templateUrl: './reset-password-dialog.component.html',
  styles: [
    `
      :host {
        position: fixed;
        inset: 0;
        z-index: 50;
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 2rem;
        background: rgba(0, 0, 0, 0.8);
      }
      .dialog {
        width: 100%;
        max-width: 36rem;
        background: #ffffff;
        border-radius: 0.75rem;
        padding: 1.5rem;
        box-shadow: 0 8px 32px rgba(20, 33, 61, 0.24);
      }
      .link-row {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        margin-top: 1rem;
      }
      .actions {
        display: flex;
        justify-content: flex-end;
        margin-top: 1.5rem;
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ResetPasswordDialogComponent {
  readonly email = input.required<string>();
  readonly isResetting = input(false);
  readonly resetError = input<string | null>(null);
  readonly resetLink = input<string | null>(null);

  readonly copied = signal(false);

  readonly closed = output<void>();
  readonly copyRequested = output<void>();

  copy(): void {
    this.copyRequested.emit();
    this.copied.set(true);
    setTimeout(() => this.copied.set(false), 2000);
  }

  close(): void {
    this.closed.emit();
  }
}