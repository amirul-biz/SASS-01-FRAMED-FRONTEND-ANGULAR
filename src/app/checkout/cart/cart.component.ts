import { ChangeDetectionStrategy, Component, DestroyRef, effect, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { ClientService } from '../../client/client.service';
import { toSelectionBundles } from '../../client/client-event.util';
import { SelectionService } from '../../pricing/selection.service';
import { OrderSummaryComponent } from '../order-summary/order-summary.component';

@Component({
  selector: 'app-cart',
  imports: [RouterLink, OrderSummaryComponent],
  templateUrl: './cart.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CartComponent {
  readonly selection = inject(SelectionService);
  private readonly clientService = inject(ClientService);
  private readonly destroyRef = inject(DestroyRef);

  constructor() {
    // Pricing-bundle data lives only in memory (see selection.service.ts), so a cart restored from
    // storage — e.g. after a refresh, or one the rider never actually browsed to this session —
    // has no voucher options or format prices to compute from yet. Refetch once per event the
    // moment its cart becomes active; hasBundlesFor() skips events already fetched this session.
    effect(() => {
      const eventId = this.selection.eventId();
      if (!eventId || this.selection.hasBundlesFor(eventId)) {
        return;
      }
      this.clientService
        .getEvent(eventId)
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe({
          next: (event) => this.selection.setBundlesForEvent(eventId, toSelectionBundles(event)),
          error: () => {},
        });
    });
  }

  selectEvent(eventId: string): void {
    this.selection.setActiveEvent(eventId);
  }

  removeCart(eventId: string, event: Event): void {
    event.stopPropagation();
    this.selection.clearEvent(eventId);
  }
}
