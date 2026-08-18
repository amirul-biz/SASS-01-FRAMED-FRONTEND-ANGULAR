import { ChangeDetectionStrategy, Component, computed, inject, input, linkedSignal, signal, untracked } from '@angular/core';
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

  // Flips once after the initial fetch resolves, so the draft below can re-derive itself from a
  // freshly-populated cache without also reacting to unrelated data mutations later in the session.
  private readonly loaded = signal(false);

  readonly isEditMode = computed(() => !!this.id());
  readonly existingOption = computed(() => {
    const id = this.id();
    return id ? this.pricingOptionsService.getOption(id) : undefined;
  });

  // Resets whenever `id` changes or the initial fetch completes, but not on unrelated data mutations
  // elsewhere in the app — the option lookup itself is read untracked for that reason (same pattern as
  // the pricing bundle form).
  readonly draft = linkedSignal<DraftOption>(() => {
    this.id();
    this.loaded();
    const blank: DraftOption = { label: '', price: 0 };
    const existing = untracked(() => this.existingOption());
    return existing ? { label: existing.label, price: existing.price } : blank;
  });

  constructor() {
    this.pricingOptionsService.getOptions(this.auth.demoPhotographerId).then(() => this.loaded.set(true));
  }

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
    const save = id
      ? this.pricingOptionsService.updateOption(id, this.draft())
      : this.pricingOptionsService.createOption({ ...this.draft(), photographerId: this.auth.demoPhotographerId });
    save.then(() => this.router.navigate(['/studio/pricing-options']));
  }
}
