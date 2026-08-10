import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { SelectionService } from '../pricing/selection.service';
import { PAYMENT_METHODS, PaymentMethod } from './payment-method.constants';
import { PaymentMethodOptionComponent } from './payment-method-option/payment-method-option.component';
import { OrderSummaryComponent } from './order-summary/order-summary.component';
import { formatCurrency } from '../pricing/currency.util';

// No payment gateway is integrated yet — orders are simulated by handing the details off to
// WhatsApp so the photographer/platform can confirm payment manually in the meantime.
const WHATSAPP_NUMBER = '60104459106';

@Component({
  selector: 'app-checkout',
  imports: [ReactiveFormsModule, PaymentMethodOptionComponent, OrderSummaryComponent],
  templateUrl: './checkout.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CheckoutComponent {
  private readonly fb = inject(FormBuilder);
  private readonly router = inject(Router);
  readonly selection = inject(SelectionService);

  readonly paymentMethods = PAYMENT_METHODS;
  readonly orderPlaced = signal(false);

  readonly contactForm = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    countryCode: ['+60'],
    phone: ['', Validators.required],
  });

  readonly paymentForm = this.fb.nonNullable.group({
    paymentMethod: ['fpx' as PaymentMethod],
  });

  get selectedPaymentMethod(): PaymentMethod {
    return this.paymentForm.controls.paymentMethod.value;
  }

  completePurchase(): void {
    this.contactForm.markAllAsTouched();
    if (this.contactForm.invalid || this.selection.selectedCount() === 0) {
      return;
    }

    const message = this.buildWhatsAppMessage();
    window.open(`https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`, '_blank');

    this.orderPlaced.set(true);
    this.selection.clear();
  }

  backToEvents(): void {
    this.router.navigate(['/events']);
  }

  private buildWhatsAppMessage(): string {
    const { email, countryCode, phone } = this.contactForm.getRawValue();
    const entries = this.selection.selectedEntries();
    const pricing = this.selection.pricing();
    const tier = this.selection.selectedTier();
    const bundle = this.selection.selectedBundle();

    const lines: string[] = ['New PICSWEEP Order', '', `Contact: ${email} (${countryCode} ${phone})`, '', `Photos (${entries.length}):`];

    entries.forEach((entry, index) => {
      lines.push(
        `${index + 1}. [${entry.photo.id}] ${entry.photo.label} — ${entry.formatOption.label} — ${formatCurrency(entry.formatOption.price)}`,
      );
      lines.push(entry.photo.imageUrl);
    });

    lines.push('');
    lines.push(
      tier && bundle
        ? `Voucher Applied: ${bundle.name} (${tier.minQuantity}+ photos) — Saved ${formatCurrency(pricing.bundleDiscount)}`
        : 'Voucher Applied: None',
    );
    lines.push('');
    lines.push(`Subtotal: ${formatCurrency(this.selection.photosTotal())}`);
    if (pricing.bundleApplied) {
      lines.push(`Discount: -${formatCurrency(pricing.bundleDiscount)}`);
    }
    lines.push(`Total: ${formatCurrency(pricing.total)}`);
    lines.push('');
    lines.push('Please confirm my order and arrange payment. Thank you!');

    return lines.join('\n');
  }
}
