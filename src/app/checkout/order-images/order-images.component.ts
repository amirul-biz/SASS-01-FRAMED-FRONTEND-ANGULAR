import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { getOrderReference } from '../order-reference.util';
import { OrderResponse, OrderService } from '../order.service';

type ImagesPageStatus = 'loading' | 'ready' | 'unavailable';

// Landing page for the "View your photos" link in the delivery email — public, read via
// ?orderId= in the URL. Reuses the same gated receipt endpoint as OrderReceiptComponent; each
// item's photoUrl is already a direct, servable R2 URL (same buildPublicUrl pattern the checkout
// response already uses), no extra signing step needed here.
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
      error: () => this.status.set('unavailable'),
    });
  }
}
