import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../../auth/auth.service';
import { PricingOptionsService } from '../../../pricing/pricing-options.service';
import { formatCurrency } from '../../../pricing/currency.util';

@Component({
  selector: 'app-pricing-options-list',
  imports: [RouterLink],
  templateUrl: './pricing-options-list.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PricingOptionsListComponent {
  private readonly auth = inject(AuthService);
  private readonly pricingOptionsService = inject(PricingOptionsService);

  readonly formatCurrency = formatCurrency;

  readonly options = computed(() => this.pricingOptionsService.getOptions(this.auth.demoPhotographerId));

  deleteOption(id: string): void {
    this.pricingOptionsService.deleteOption(id);
  }
}
