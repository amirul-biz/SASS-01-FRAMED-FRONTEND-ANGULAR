import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { getOrderReference } from '../order-reference.util';
import { OrderResponse, OrderService } from '../order.service';

// 'unpaid' is deliberately distinct from 'unavailable': the receipt endpoint answers 400 "This
// order has not been paid yet" for a real order that simply hasn't been confirmed by the
// photographer, while 404 means the id matches nothing. The customer needs different guidance for
// each — "check back later" vs "your link is wrong".
type ImagesPageStatus = 'loading' | 'ready' | 'unpaid' | 'unavailable';

// Landing page for the "View your photos" link in the delivery email, and for the link a
// photographer copies out of the studio order list — public, read via ?orderId= in the URL. Reuses
// the same gated receipt endpoint as OrderReceiptComponent; each item's photoUrl is already a
// direct, servable R2 URL (same buildPublicUrl pattern the checkout response already uses), no
// extra signing step needed here.
@Component({
  selector: 'app-order-images',
  imports: [RouterLink],
  templateUrl: './order-images.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OrderImagesComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly orderService = inject(OrderService);

  readonly status = signal<ImagesPageStatus>('loading');
  readonly order = signal<OrderResponse | null>(null);
  readonly orderReference = getOrderReference;

  ngOnInit(): void {
    this.load();
  }

  // Re-runs the same fetch — backs the "Check again" button on the unpaid state, so a customer
  // sitting on this page picks up the photos the moment the photographer marks the order paid.
  reload(): void {
    this.status.set('loading');
    this.load();
  }

  private load(): void {
    const orderId = this.route.snapshot.queryParamMap.get('orderId');
    if (!orderId) {
      this.status.set('unavailable');
      return;
    }

    this.orderService.getOrderReceipt(orderId).subscribe({
      next: (order) => {
        this.order.set(order);
        this.status.set('ready');
      },
      error: (error: unknown) => {
        const isUnpaid = error instanceof HttpErrorResponse && error.status === 400;
        this.status.set(isUnpaid ? 'unpaid' : 'unavailable');
      },
    });
  }
}
