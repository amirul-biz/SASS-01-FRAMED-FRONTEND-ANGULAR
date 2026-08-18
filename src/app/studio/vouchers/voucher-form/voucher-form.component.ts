import { ChangeDetectionStrategy, Component, computed, inject, input, linkedSignal, signal, untracked } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../auth/auth.service';
import { IVoucherCondition, VouchersService, WireVoucherDiscountType } from '../../../pricing/vouchers.service';

type DraftVoucher = { name: string; discountType: WireVoucherDiscountType; conditions: IVoucherCondition[] };

@Component({
  selector: 'app-voucher-form',
  imports: [RouterLink],
  templateUrl: './voucher-form.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class VoucherFormComponent {
  private readonly auth = inject(AuthService);
  private readonly vouchersService = inject(VouchersService);
  private readonly router = inject(Router);

  id = input<string>();

  private readonly loaded = signal(false);

  readonly isEditMode = computed(() => !!this.id());
  readonly existingVoucher = computed(() => {
    const id = this.id();
    return id ? this.vouchersService.getVoucher(id) : undefined;
  });

  readonly draft = linkedSignal<DraftVoucher>(() => {
    this.id();
    this.loaded();
    const blank: DraftVoucher = { name: '', discountType: 'percent-tier', conditions: [] };
    const existing = untracked(() => this.existingVoucher());
    return existing
      ? { name: existing.name, discountType: existing.discountType, conditions: structuredClone(existing.conditions) }
      : blank;
  });

  constructor() {
    const id = this.id();
    if (id) {
      this.vouchersService.getVouchers(this.auth.photographerId()!).then(() => this.loaded.set(true));
    } else {
      this.loaded.set(true);
    }
  }

  setName(value: string): void {
    this.draft.update((d) => ({ ...d, name: value }));
  }

  setDiscountType(type: WireVoucherDiscountType): void {
    this.draft.update((d) => ({ ...d, discountType: type }));
  }

  addCondition(): void {
    const newCondition: IVoucherCondition = { minPhotos: 1, maxPhotos: null, value: this.draft().discountType === 'percent-tier' ? 10 : 30 };
    this.draft.update((d) => ({ ...d, conditions: [...d.conditions, newCondition] }));
  }

  removeCondition(index: number): void {
    this.draft.update((d) => ({ ...d, conditions: d.conditions.filter((_, i) => i !== index) }));
  }

  updateConditionMin(index: number, value: string): void {
    const minPhotos = Number(value) || 0;
    this.draft.update((d) => ({
      ...d,
      conditions: d.conditions.map((c, i) => (i === index ? { ...c, minPhotos } : c)),
    }));
  }

  updateConditionMax(index: number, value: string): void {
    const maxPhotos = value.trim() === '' ? null : Number(value) || null;
    this.draft.update((d) => ({
      ...d,
      conditions: d.conditions.map((c, i) => (i === index ? { ...c, maxPhotos } : c)),
    }));
  }

  updateConditionValue(index: number, value: string): void {
    const conditionValue = Number(value) || 0;
    this.draft.update((d) => ({
      ...d,
      conditions: d.conditions.map((c, i) => (i === index ? { ...c, value: conditionValue } : c)),
    }));
  }

  save(): void {
    if (!this.draft().name.trim()) {
      return;
    }
    const id = this.id();
    const save = id
      ? this.vouchersService.updateVoucher(id, this.draft())
      : this.vouchersService.createVoucher(this.auth.photographerId()!, this.draft());
    save.then(() => this.router.navigate(['/studio/vouchers']));
  }
}
