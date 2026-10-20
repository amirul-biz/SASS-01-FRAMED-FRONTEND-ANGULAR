import { ChangeDetectionStrategy, Component, effect, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { finalize } from 'rxjs';
import { SelectionService } from '../pricing/selection.service';
import { IBundleVoucherSummary } from '../pricing/pricing-bundles.service';
import { ClientService } from '../client/client.service';
import { toSelectionBundles } from '../client/client-event.util';
import { OrderSummaryComponent } from './order-summary/order-summary.component';
import { CreateOrderPayload, OrderResponse, OrderService } from './order.service';
import { getOrderReference } from './order-reference.util';
import { formatCurrency } from '../pricing/currency.util';
import { COUNTRY_DIAL_CODE, CountryCode } from './country-code.constants';
import { toWhatsAppNumber } from '../shared/whatsapp-number.util';

// No payment gateway is integrated yet — orders are simulated by handing the details off to
// WhatsApp so the photographer/platform can confirm payment manually in the meantime.
const WHATSAPP_NUMBER = '60104459106';

@Component({
  selector: 'app-checkout',
  imports: [ReactiveFormsModule, OrderSummaryComponent],
  templateUrl: './checkout.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CheckoutComponent {
  private readonly fb = inject(FormBuilder);
  private readonly router = inject(Router);
  private readonly orderService = inject(OrderService);
  private readonly clientService = inject(ClientService);
  readonly selection = inject(SelectionService);

  readonly orderPlaced = signal(false);
  readonly isSubmitting = signal(false);
  readonly submitError = signal<string | null>(null);
  // WhatsApp-able digits from the event photographer's profile settings (contactNo, falling back
  // to phone). Falls back to the platform number while the profile has no number set.
  private readonly photographerWhatsAppNumber = signal<string | null>(null);
  private readonly loadedEventId = signal<string | null>(null);
  // Generated once for this checkout screen and reused on every retry (network failure, timeout)
  // so a resubmission returns the original order instead of creating a duplicate. Not regenerated
  // per click — a fresh key only makes sense for a fresh CheckoutComponent instance, which normal
  // Angular routing already gives on the next visit to this screen.
  private readonly idempotencyKey = crypto.randomUUID();

  constructor() {
    effect(() => {
      const eventId = this.selection.eventId();
      if (!eventId || this.loadedEventId() === eventId) {
        return;
      }
      this.loadedEventId.set(eventId);
      this.clientService.getEvent(eventId).subscribe({
        next: (event) => {
          this.selection.setBundlesForEvent(eventId, toSelectionBundles(event));
          const digits = (event.photographerContactNo ?? event.photographerPhone ?? '')
            .replace(/\D/g, '');
          if (digits) {
            this.photographerWhatsAppNumber.set(digits);
          }
        },
        error: () => {},
      });
    });
  }

  readonly contactForm = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    countryCode: ['MALAYSIA' as CountryCode],
    phone: ['', Validators.required],
  });

  completePurchase(): void {
    this.contactForm.markAllAsTouched();
    const isFormInvalid = this.contactForm.invalid;
    const isSelectionEmpty = this.selection.selectedCount() === 0;
    const isAlreadySubmitting = this.isSubmitting();

    const isPurchaseBlocked = isFormInvalid || isSelectionEmpty || isAlreadySubmitting;
    if (isPurchaseBlocked) {
      return;
    }

    this.submitError.set(null);
    this.isSubmitting.set(true);

    // Handing the URL to window.open() directly is unreliable on mobile: the OS's wa.me → app
    // handoff often keeps just the phone number and drops the ?text= query for a window.open-
    // spawned context. Opening a blank tab synchronously (still same click tick, so not popup-
    // blocked) and navigating *that* tab via location.href makes it a real top-level navigation,
    // which mobile OSes carry through to the app intact.
    const whatsappTab = window.open('', '_blank');

    this.orderService
      .createOrder(this.buildOrderPayload())
      .pipe(finalize(() => this.isSubmitting.set(false)))
      .subscribe({
        next: (order) => this.handleOrderCreated(order, whatsappTab),
        error: (error: unknown) => {
          whatsappTab?.close();
          this.submitError.set(this.getSubmitErrorMessage(error));
        },
      });
  }

  backToEvents(): void {
    this.router.navigate(['/events']);
  }

  private handleOrderCreated(order: OrderResponse, whatsappTab: Window | null): void {
    const paymentUrl = order.payment?.paymentUrl;
    const hasPaymentRedirect = paymentUrl != null;
    if (hasPaymentRedirect) {
      // A real payment gateway redirect is a normal top-level navigation, not the WhatsApp
      // deep-link handoff below — the blank tab was only opened defensively before we knew
      // which path this order would take.
      whatsappTab?.close();
      this.orderPlaced.set(true);
      this.selection.clear();
      window.location.href = paymentUrl;
      return;
    }
    this.handOffToWhatsApp(order, whatsappTab);
  }

  private handOffToWhatsApp(order: OrderResponse, whatsappTab: Window | null): void {
    const message = this.buildWhatsAppMessage(order);
    const targetNumber = toWhatsAppNumber(this.photographerWhatsAppNumber() ?? WHATSAPP_NUMBER);
    const whatsappUrl = `https://wa.me/${targetNumber}?text=${encodeURIComponent(message)}`;

    if (whatsappTab) {
      whatsappTab.location.href = whatsappUrl;
    } else {
      window.location.href = whatsappUrl;
    }

    this.orderPlaced.set(true);
    this.selection.clear();
  }

  private getSubmitErrorMessage(error: unknown): string {
    const backendMessage = (error as { error?: { message?: string | string[] } })?.error?.message;
    const firstMessage = Array.isArray(backendMessage) ? backendMessage[0] : backendMessage;
    return firstMessage || 'We could not place your order. Please try again.';
  }

  private buildOrderPayload(): CreateOrderPayload {
    const { email, countryCode, phone } = this.contactForm.getRawValue();
    const entries = this.selection.selectedEntries();
    const pricing = this.selection.pricing();
    const match = this.selection.selectedTier();
    const voucher = match?.voucher as IBundleVoucherSummary | undefined;

    return {
      eventId: this.selection.eventId()!,
      email,
      countryCode,
      phone,
      idempotencyKey: this.idempotencyKey,
      items: entries.map((entry) => ({
        photoId: entry.photo.id,
        pricingOptionId: entry.formatOption.id,
        formatLabel: entry.formatOption.label,
        price: entry.formatOption.price,
      })),
      subtotal: this.selection.photosTotal(),
      discountAmount: pricing.bundleDiscount,
      total: pricing.total,
      voucherId: voucher?.id,
      voucherName: voucher?.name,
    };
  }

  private buildWhatsAppMessage(order: OrderResponse): string {
    const { email, countryCode, phone } = this.contactForm.getRawValue();
    const entries = this.selection.selectedEntries();
    const pricing = this.selection.pricing();
    const match = this.selection.selectedTier();
    const voucher = match?.voucher as IBundleVoucherSummary | undefined;

    const dialCode = COUNTRY_DIAL_CODE[countryCode];
    const lines: string[] = [
      'New PICSWEEP Order',
      `Order: #${getOrderReference(order.id)}`,
      '',
      `Contact: ${email} (${dialCode} ${phone})`,
      '',
      `Photos (${entries.length}):`,
    ];

    entries.forEach((entry, index) => {
      lines.push(
        `${index + 1}. ${entry.photo.label} — ${entry.formatOption.label} — ${formatCurrency(entry.formatOption.price)}`,
      );
      lines.push(entry.photo.imageUrl);
    });

    lines.push('');
    lines.push(
      match && voucher
        ? `Voucher Applied: ${voucher.name} (${match.condition.minPhotos}${match.condition.maxPhotos === null ? '+' : '-' + match.condition.maxPhotos} photos) — Saved ${formatCurrency(pricing.bundleDiscount)}`
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
