import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { formatCurrency } from '../../pricing/currency.util';
import { getOrderReference } from '../order-reference.util';
import { OrderResponse, OrderService } from '../order.service';
import { downloadReceiptPdf } from '../receipt-pdf.util';

type ReceiptPageStatus = 'loading' | 'ready' | 'unavailable';

// Landing page for the "View your receipt" link in the delivery email — public, read via
// ?orderId= in the URL. The backend 400s/404s if the order was never paid or doesn't exist, so
// this page never has anything to render for a tampered/guessed orderId beyond the generic
// "not available" state.
@Component({
  selector: 'app-order-receipt',
  imports: [RouterLink, DatePipe],
  templateUrl: './order-receipt.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OrderReceiptComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly orderService = inject(OrderService);

  readonly status = signal<ReceiptPageStatus>('loading');
  readonly order = signal<OrderResponse | null>(null);
  readonly orderReference = getOrderReference;
  readonly formatCurrency = formatCurrency;

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

  downloadPdf(): void {
    const order = this.order();
    if (!order) {
      return;
    }

    downloadReceiptPdf(order);
  }
}
