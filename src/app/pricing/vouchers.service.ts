import { HttpClient } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { ENVIRONMENT } from '../core/environment.token';

export type WireVoucherDiscountType = 'flat-tier' | 'percent-tier';

export interface IVoucherCondition {
  minPhotos: number;
  maxPhotos: number | null;
  value: number;
}

export interface IVoucher {
  id: string;
  photographerId: string;
  name: string;
  discountType: WireVoucherDiscountType;
  conditions: IVoucherCondition[];
  bundlesUsingCount: number;
}

export type VoucherInput = { name: string; discountType: WireVoucherDiscountType; conditions: IVoucherCondition[] };
export type VoucherChanges = Partial<VoucherInput>;

/** Human-readable rule text for a voucher, e.g. "2-5 photos: RM20 flat, 6+ photos: RM35 flat". */
export function voucherConditionsSummary(voucher: IVoucher): string {
  return voucher.conditions
    .map((c) => {
      const range = c.maxPhotos === null ? `${c.minPhotos}+` : `${c.minPhotos}-${c.maxPhotos}`;
      const amount = voucher.discountType === 'percent-tier' ? `${c.value}% off` : `RM${c.value} flat`;
      return `${range} photos: ${amount}`;
    })
    .join(', ');
}

@Injectable({ providedIn: 'root' })
export class VouchersService {
  private readonly http = inject(HttpClient);
  private readonly env = inject(ENVIRONMENT);

  /** Cache of vouchers, populated photographer-by-photographer as getVouchers() is called for real —
   *  same pattern as PricingBundlesService/PricingOptionsService. No seed data: unlike bundles/options,
   *  nothing outside the vouchers/bundle-form screens reads this cache before a real fetch happens. */
  private readonly cache = signal<IVoucher[]>([]);

  async getVouchers(photographerId: string): Promise<IVoucher[]> {
    const vouchers = await firstValueFrom(this.http.get<IVoucher[]>(`${this.env.apiUrl}/vouchers`));
    this.cache.update((all) => [...all.filter((v) => v.photographerId !== photographerId), ...vouchers]);
    return vouchers;
  }

  getVoucher(id: string): IVoucher | undefined {
    return this.cache().find((v) => v.id === id);
  }

  async createVoucher(photographerId: string, input: VoucherInput): Promise<IVoucher> {
    const created = await firstValueFrom(
      this.http.post<IVoucher>(`${this.env.apiUrl}/vouchers`, input),
    );
    this.cache.update((all) => [...all, created]);
    return created;
  }

  async updateVoucher(id: string, changes: VoucherChanges): Promise<IVoucher> {
    const updated = await firstValueFrom(
      this.http.patch<IVoucher>(`${this.env.apiUrl}/vouchers/${id}`, changes),
    );
    this.cache.update((all) => all.map((v) => (v.id === id ? updated : v)));
    return updated;
  }

  async deleteVoucher(id: string): Promise<void> {
    await firstValueFrom(this.http.delete<void>(`${this.env.apiUrl}/vouchers/${id}`));
    this.cache.update((all) => all.filter((v) => v.id !== id));
  }
}
