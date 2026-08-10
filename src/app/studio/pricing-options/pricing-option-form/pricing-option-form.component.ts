import { ChangeDetectionStrategy, Component, computed, inject, input, linkedSignal, untracked } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../auth/auth.service';
import { PricingOptionsService } from '../../../pricing/pricing-options.service';

interface DraftOption {
  label: string;
  price: number;
}

@Component({
  selector: 'app-pricing-option-form',
  imports: [RouterLink],
  templateUrl: './pricing-option-form.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PricingOptionFormComponent {
  private readonly auth = inject(AuthService);
  private readonly pricingOptionsService = inject(PricingOptionsService);
  private readonly router = inject(Router);

  id = input<string>();

  readonly isEditMode = computed(() => !!this.id());
  readonly existingOption = computed(() => {
    const id = this.id();
    return id ? this.pricingOptionsService.getOption(id) : undefined;
  });

  // Resets whenever `id` changes, but not on unrelated data mutations elsewhere in the app —
  // the option lookup itself is read untracked for that reason (same pattern as the pricing bundle form).
  readonly draft = linkedSignal<DraftOption>(() => {
    this.id();
    const blank: DraftOption = { label: '', price: 0 };
    const existing = untracked(() => this.existingOption());
    return existing ? { label: existing.label, price: existing.price } : blank;
  });

  setLabel(value: string): void {
    this.draft.update((d) => ({ ...d, label: value }));
  }

  setPrice(value: string): void {
    const price = Number(value) || 0;
    this.draft.update((d) => ({ ...d, price }));
  }

  save(): void {
    if (!this.draft().label.trim()) {
      return;
    }
    const id = this.id();
    if (id) {
      this.pricingOptionsService.updateOption(id, this.draft());
    } else {
      this.pricingOptionsService.createOption({ ...this.draft(), photographerId: this.auth.demoPhotographerId });
    }
    this.router.navigate(['/studio/pricing-options']);
  }
}
