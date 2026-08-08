import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { SelectionService } from '../pricing/selection.service';
import { PAYMENT_METHODS, PaymentMethod } from './payment-method.constants';
import { PaymentMethodOptionComponent } from './payment-method-option/payment-method-option.component';
import { OrderSummaryComponent } from './order-summary/order-summary.component';

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
    this.orderPlaced.set(true);
    this.selection.clear();
  }

  backToEvents(): void {
    this.router.navigate(['/events']);
  }
}
