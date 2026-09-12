import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';

// Reusable confirmation dialog. The overlay is styled with scoped :host CSS (not Tailwind
// utilities) so its fixed positioning can never be affected by utility purging or class
// mismatches — this renders identically everywhere it's embedded.
@Component({
  selector: 'app-confirm-dialog',
  templateUrl: './confirm-dialog.component.html',
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
        max-width: 24rem;
        background: #ffffff;
        border-radius: 0.75rem;
        padding: 1.5rem;
        display: flex;
        flex-direction: column;
        gap: 1rem;
        box-shadow: 0 8px 32px rgba(20, 33, 61, 0.24);
      }
      .actions {
        display: flex;
        justify-content: flex-end;
        gap: 0.5rem;
        margin-top: 0.25rem;
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ConfirmDialogComponent {
  readonly title = input.required<string>();
  readonly message = input.required<string>();
  readonly confirmLabel = input<string>('Delete');
  readonly isBusy = input(false);
  // 0-100, shown as a progress bar while isBusy is true. Undefined = plain busy spinner.
  readonly progress = input<number | undefined>(undefined);

  readonly confirmed = output<void>();
  readonly cancelled = output<void>();

  confirm(): void {
    if (!this.isBusy()) {
      this.confirmed.emit();
    }
  }

  cancel(): void {
    if (!this.isBusy()) {
      this.cancelled.emit();
    }
  }
}
