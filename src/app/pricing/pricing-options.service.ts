import { Injectable, signal } from '@angular/core';

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

function optionsFor(photographerId: string): IPhotoFormatOption[] {
  return [
    { id: `${photographerId}-jpeg-30mp`, photographerId, label: '30MP JPEG', price: 12 },
    { id: `${photographerId}-jpeg-50mp`, photographerId, label: '50MP JPEG', price: 17 },
    { id: `${photographerId}-heic`, photographerId, label: 'HEIC', price: 15 },
    { id: `${photographerId}-raw`, photographerId, label: 'RAW', price: 27 },
  ];
}

const INITIAL_OPTIONS: IPhotoFormatOption[] = [
  ...optionsFor('alex-rivers'),
  ...optionsFor('marcus-chen'),
  ...optionsFor('sarah-jenkins'),
  ...optionsFor('david-lee'),
  ...optionsFor('unknown-uploader'),
];

export type PricingOptionInput = Omit<IPhotoFormatOption, 'id'>;
export type PricingOptionChanges = Partial<Omit<IPhotoFormatOption, 'id' | 'photographerId'>>;

@Injectable({ providedIn: 'root' })
export class PricingOptionsService {
  private readonly options = signal<IPhotoFormatOption[]>(INITIAL_OPTIONS);

  getOptions(photographerId: string): IPhotoFormatOption[] {
    return this.options().filter((o) => o.photographerId === photographerId);
  }

  getOption(id: string): IPhotoFormatOption | undefined {
    return this.options().find((o) => o.id === id);
  }

  createOption(input: PricingOptionInput): IPhotoFormatOption {
    const id = this.uniqueSlug(input.photographerId, input.label);
    const option: IPhotoFormatOption = { ...input, id };
    this.options.update((list) => [...list, option]);
    return option;
  }

  updateOption(id: string, changes: PricingOptionChanges): void {
    this.options.update((list) => list.map((o) => (o.id === id ? { ...o, ...changes } : o)));
  }

  deleteOption(id: string): void {
    this.options.update((list) => list.filter((o) => o.id !== id));
  }

  private uniqueSlug(photographerId: string, label: string): string {
    const hyphenated = label
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .split('-')
      .filter(Boolean)
      .join('-');
    const base = `${photographerId}-${hyphenated || 'format'}`;

    let slug = base;
    let suffix = 2;
    while (this.getOption(slug)) {
      slug = `${base}-${suffix}`;
      suffix++;
    }
    return slug;
  }
}
