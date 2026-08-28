import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { ENVIRONMENT } from '../core/environment.token';

export interface IPhotoFormatOption {
  id: string;
  photographerId: string;
  label: string;
  /** the full RM price of a photo delivered in this format — the source of truth for a photo's price */
  price: number;
}

export const STANDARD_FORMAT_OPTION: IPhotoFormatOption = {
  id: 'standard',
  photographerId: '',
  label: 'Standard',
  price: 12,
};

function seedOptionsFor(photographerId: string): IPhotoFormatOption[] {
  return [
    { id: `${photographerId}-jpeg-30mp`, photographerId, label: '30MP JPEG', price: 12 },
    { id: `${photographerId}-jpeg-50mp`, photographerId, label: '50MP JPEG', price: 17 },
    { id: `${photographerId}-heic`, photographerId, label: 'HEIC', price: 15 },
    { id: `${photographerId}-raw`, photographerId, label: 'RAW', price: 27 },
  ];
}

/** Seed data for consumers that read the cache without ever calling getOptions() themselves (checkout's
 *  selection.service, event-detail, photo-preview-modal — outside the pricing-options CRUD screens' scope).
 *  getOptions() below replaces a photographer's slice with real data once actually called; until then, or for
 *  photographers never fetched, these are what those consumers see. */
const SEED_OPTIONS: IPhotoFormatOption[] = [
  ...seedOptionsFor('alex-rivers'),
  ...seedOptionsFor('marcus-chen'),
  ...seedOptionsFor('sarah-jenkins'),
  ...seedOptionsFor('david-lee'),
  ...seedOptionsFor('unknown-uploader'),
];

export type PricingOptionInput = Omit<IPhotoFormatOption, 'id'>;
export type PricingOptionChanges = Partial<Omit<IPhotoFormatOption, 'id' | 'photographerId'>>;

@Injectable({ providedIn: 'root' })
export class PricingOptionsService {
  private readonly http = inject(HttpClient);
  private readonly env = inject(ENVIRONMENT);

  /** Cache of options — seeded with mock data (see SEED_OPTIONS), then replaced photographer-by-photographer
   *  as getOptions() is called for real. Several consumers outside the pricing-options screens (checkout,
   *  selection.service) read getOption() synchronously, so it stays a cache read rather than a network call. */
  private readonly cache = signal<IPhotoFormatOption[]>(SEED_OPTIONS);

  async getOptions(photographerId: string): Promise<IPhotoFormatOption[]> {
    const options = await firstValueFrom(
      this.http.get<IPhotoFormatOption[]>(`${this.env.apiUrl}/pricing-options`, {
        headers: this.headers(photographerId),
      }),
    );
    this.cache.update((all) => [...all.filter((o) => o.photographerId !== photographerId), ...options]);
    return options;
  }

  getOption(id: string): IPhotoFormatOption | undefined {
    return this.cache().find((o) => o.id === id);
  }

  async createOption(input: PricingOptionInput): Promise<IPhotoFormatOption> {
    const created = await firstValueFrom(
      this.http.post<IPhotoFormatOption>(
        `${this.env.apiUrl}/pricing-options`,
        { label: input.label, price: input.price },
        { headers: this.headers(input.photographerId) },
      ),
    );
    this.cache.update((all) => [...all, created]);
    return created;
  }

  async updateOption(id: string, changes: PricingOptionChanges): Promise<IPhotoFormatOption> {
    const photographerId = this.requirePhotographerId(id);
    const updated = await firstValueFrom(
      this.http.patch<IPhotoFormatOption>(`${this.env.apiUrl}/pricing-options/${id}`, changes, {
        headers: this.headers(photographerId),
      }),
    );
    this.cache.update((all) => all.map((o) => (o.id === id ? updated : o)));
    return updated;
  }

  async deleteOption(id: string): Promise<void> {
    const photographerId = this.requirePhotographerId(id);
    await firstValueFrom(
      this.http.delete<void>(`${this.env.apiUrl}/pricing-options/${id}`, {
        headers: this.headers(photographerId),
      }),
    );
    this.cache.update((all) => all.filter((o) => o.id !== id));
  }

  private requirePhotographerId(id: string): string {
    const photographerId = this.getOption(id)?.photographerId;
    if (!photographerId) {
      throw new Error(`Unknown pricing option: ${id}`);
    }
    return photographerId;
  }

  private headers(photographerId: string): HttpHeaders {
    return new HttpHeaders({ 'x-photographer-id': photographerId });
  }
}
