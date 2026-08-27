import { TestBed } from '@angular/core/testing';
import { IPhoto } from '../events/events.service';
import { IPricingBundle } from './pricing-bundles.service';
import { SelectionService } from './selection.service';

function photo(eventId: string, index: number): IPhoto {
  return {
    id: `${eventId}-p${index}`,
    eventId,
    imageUrl: `https://example.com/${eventId}-${index}.jpg`,
    areaId: '',
    areaName: '',
    label: `Photo ${index}`,
    plateNumber: '',
    capturedAt: '',
  };
}

// One pricing option at RM12/photo, and a flat-tier voucher unlocking a flat RM30 (5-9 photos,
// RM6/photo) or RM50 (10+ photos) bulk rate — independent of the per-photo option price, matching
// how a real photographer-configured bundle looks once fetched from the API.
const STANDARD_BUNDLE: IPricingBundle = {
  id: 'standard-bundle',
  photographerId: 'photographer-a',
  name: 'Standard Bundle',
  pricingOptions: [{ id: 'jpeg-30mp', label: '30MP JPEG', price: 12 }],
  vouchers: [
    {
      id: 'standard-voucher',
      name: 'Standard Voucher',
      discountType: 'flat-tier',
      conditions: [
        { minPhotos: 5, maxPhotos: 9, value: 30 },
        { minPhotos: 10, maxPhotos: null, value: 50 },
      ],
    },
  ],
  fullGalleryEnabled: false,
  fullGalleryPrice: 0,
  eventsUsingCount: 0,
};

describe('SelectionService', () => {
  let service: SelectionService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(SelectionService);
  });

  it('starts empty', () => {
    expect(service.selectedCount()).toBe(0);
    expect(service.selectedPhotos()).toEqual([]);
  });

  it('adds a photo on toggle and removes it on a second toggle', () => {
    const p = photo('event-a', 1);

    service.toggle(p);
    expect(service.selectedCount()).toBe(1);
    expect(service.isSelected(p.id)).toBe(true);

    service.toggle(p);
    expect(service.selectedCount()).toBe(0);
    expect(service.isSelected(p.id)).toBe(false);
  });

  it('clears the previous selection when a photo from a different event is toggled on', () => {
    const eventAPhotos = [photo('event-a', 1), photo('event-a', 2)];
    const eventBPhotos = [photo('event-b', 1)];

    service.toggle(eventAPhotos[0]);
    service.toggle(eventAPhotos[1]);
    expect(service.selectedCount()).toBe(2);

    service.toggle(eventBPhotos[0]);

    expect(service.selectedCount()).toBe(1);
    expect(service.isSelected(eventBPhotos[0].id)).toBe(true);
    expect(service.eventId()).toBe('event-b');
  });

  it('recomputes pricing reactively using the selected event own pricing config', () => {
    // Quick-select defaults to the event's cheapest/first pricing option (30MP JPEG, RM12/photo).
    // Voucher: flat-tier 5-9 photos -> RM30 (RM6/photo), a flat bulk rate independent of which
    // pricing option was chosen.
    service.setBundlesForEvent('event-a', [STANDARD_BUNDLE]);
    const photos = Array.from({ length: 5 }, (_, i) => photo('event-a', i));

    for (let i = 0; i < 4; i++) {
      service.toggle(photos[i]);
    }
    expect(service.pricing().bundleApplied).toBe(false);
    expect(service.pricing().pricePerPhoto).toBe(12);
    expect(service.photosTotal()).toBe(48);

    service.toggle(photos[4]);

    expect(service.pricing().bundleApplied).toBe(true);
    expect(service.pricing().pricePerPhoto).toBe(6);
    expect(service.pricing().total).toBe(30);
  });

  it('falls back to the standard format/price when the event has no pricing bundle attached', () => {
    const p = photo('event-c', 1);

    service.toggle(p);

    expect(service.selectedEntries()[0].formatOption.price).toBe(12);
  });

  it('clear empties the selection', () => {
    const p = photo('event-a', 1);
    service.toggle(p);
    service.clear();
    expect(service.selectedCount()).toBe(0);
  });
});
