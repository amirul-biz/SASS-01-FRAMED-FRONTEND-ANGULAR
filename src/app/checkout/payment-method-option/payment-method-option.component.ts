import { ChangeDetectionStrategy, Component, input } from '@angular/core';

@Component({
  selector: 'app-payment-method-option',
  templateUrl: './payment-method-option.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PaymentMethodOptionComponent {
  icon = input.required<string>();
  label = input.required<string>();
  selected = input<boolean>(false);
}
