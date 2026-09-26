import { TestBed } from '@angular/core/testing';
import { IPhoto } from '../events/events.service';
import { IPricingBundle } from './pricing-bundles.service';
import { loadCarts } from './cart-storage';
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

// Bounded top tier (no unbounded fallback), used to exercise the overflow-billing path — with
// STANDARD_BUNDLE's unbounded 10+ tier, no photo count ever overflows.
const ALL_IN_BUNDLE: IPricingBundle = {
  id: 'all-in-bundle',
  photographerId: 'photographer-a',
  name: 'All In Bundle',
  pricingOptions: [{ id: 'jpeg-30mp', label: '30MP JPEG', price: 12 }],
  vouchers: [
    {
      id: 'all-in-voucher',
      name: 'All In Voucher',
      discountType: 'flat-tier',
      conditions: [{ minPhotos: 4, maxPhotos: 5, value: 30 }],
    },
  ],
  fullGalleryEnabled: false,
  fullGalleryPrice: 0,
  eventsUsingCount: 0,
};

const OPTION_ONLY_BUNDLE: IPricingBundle = {
  id: 'option-only-bundle',
  photographerId: 'photographer-a',
  name: 'Option Only Bundle',
  pricingOptions: [{ id: 'jpeg-30mp', label: '30MP JPEG', price: 12 }],
  vouchers: [],
  fullGalleryEnabled: false,
  fullGalleryPrice: 0,
  eventsUsingCount: 0,
};

describe('SelectionService', () => {
  let service: SelectionService;

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({});
    service = TestBed.inject(SelectionService);
    service.setBundlesForEvent('event-a', [OPTION_ONLY_BUNDLE]);
    service.setBundlesForEvent('event-b', [OPTION_ONLY_BUNDLE]);
  });

  afterEach(() => {
    localStorage.clear();
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

  it('keeps each event\'s selection separate when photos from two events are toggled', () => {
    const eventAPhotos = [photo('event-a', 1), photo('event-a', 2)];
    const eventBPhotos = [photo('event-b', 1)];

    service.toggle(eventAPhotos[0]);
    service.toggle(eventAPhotos[1]);
    expect(service.selectedCount()).toBe(2);

    service.toggle(eventBPhotos[0]);

    // Adding from event B makes it the active cart...
    expect(service.eventId()).toBe('event-b');
    expect(service.selectedCount()).toBe(1);
    expect(service.isSelected(eventBPhotos[0].id)).toBe(true);

    // ...but event A's selection is still intact underneath, not wiped.
    service.setActiveEvent('event-a');
    expect(service.selectedCount()).toBe(2);
    expect(service.isSelected(eventAPhotos[0].id)).toBe(true);
    expect(service.isSelected(eventAPhotos[1].id)).toBe(true);
  });

  it('setActiveEvent switches which cart pricing is computed against', () => {
    service.setBundlesForEvent('event-a', [STANDARD_BUNDLE]);
    const aPhotos = Array.from({ length: 5 }, (_, i) => photo('event-a', i));
    aPhotos.forEach((p) => service.toggle(p));
    expect(service.pricing().bundleApplied).toBe(true);

    service.toggle(photo('event-b', 1));
    expect(service.eventId()).toBe('event-b');
    expect(service.pricing().bundleApplied).toBe(false);
    expect(service.selectedCount()).toBe(1);

    service.setActiveEvent('event-a');
    expect(service.pricing().bundleApplied).toBe(true);
    expect(service.selectedCount()).toBe(5);
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

  it('does not add a photo when the event has no pricing options (there is no default price)', () => {
    const p = photo('event-c', 1);

    service.toggle(p);

    expect(service.selectedCount()).toBe(0);
    expect(service.isSelected(p.id)).toBe(false);
    expect(service.eventCarts()).toEqual([]);
  });

  it('ignores a refused add without disturbing the active cart', () => {
    service.toggle(photo('event-a', 1));

    service.toggle(photo('event-c', 1));

    expect(service.eventId()).toBe('event-a');
    expect(service.selectedCount()).toBe(1);
  });

  it('selectWithFormat ignores a format the event does not offer', () => {
    const p = photo('event-a', 1);

    service.selectWithFormat(p, 'not-a-real-format');

    expect(service.selectedCount()).toBe(0);
  });

  it('prices a photo at the photographer-defined option', () => {
    service.toggle(photo('event-a', 1));

    expect(service.selectedEntries()[0].formatOption).toEqual({ id: 'jpeg-30mp', label: '30MP JPEG', price: 12 });
  });

  describe('re-syncing a cart to the event\'s current pricing', () => {
    const bundleWith = (id: string, label: string, price: number): IPricingBundle => ({
      ...OPTION_ONLY_BUNDLE,
      pricingOptions: [{ id, label, price }],
    });

    it('re-maps a stale snapshot when the option was re-created with a new id (same format)', () => {
      service.setBundlesForEvent('event-a', [bundleWith('old-id', 'Full Resolution', 20)]);
      service.toggle(photo('event-a', 1));
      expect(service.selectedEntries()[0].formatId).toBe('old-id');

      service.setBundlesForEvent('event-a', [bundleWith('new-id', 'Full Resolution', 20)]);

      const [entry] = service.selectedEntries();
      expect(entry.formatId).toBe('new-id');
      expect(entry.formatOption).toEqual({ id: 'new-id', label: 'Full Resolution', price: 20 });
    });

    it('refreshes the price when the photographer changed it', () => {
      service.setBundlesForEvent('event-a', [bundleWith('opt-1', 'Full Resolution', 20)]);
      service.toggle(photo('event-a', 1));

      service.setBundlesForEvent('event-a', [bundleWith('opt-1', 'Full Resolution', 25)]);

      expect(service.selectedEntries()[0].formatOption.price).toBe(25);
      expect(service.photosTotal()).toBe(25);
    });

    it('falls back to the first option when the snapshot\'s format no longer exists', () => {
      service.setBundlesForEvent('event-a', [bundleWith('opt-1', 'RAW', 30)]);
      service.toggle(photo('event-a', 1));

      service.setBundlesForEvent('event-a', [bundleWith('opt-2', 'Full Resolution', 20)]);

      expect(service.selectedEntries()[0].formatOption).toEqual({ id: 'opt-2', label: 'Full Resolution', price: 20 });
    });

    it('drops the photos and repoints the active cart when the event loses all pricing options', () => {
      service.toggle(photo('event-a', 1));
      service.toggle(photo('event-b', 1));

      service.setBundlesForEvent('event-b', []);

      expect(service.eventCarts().map((c) => c.eventId)).toEqual(['event-a']);
      expect(service.eventId()).toBe('event-a');
    });

    it('leaves an up-to-date cart untouched', () => {
      service.toggle(photo('event-a', 1));
      const before = service.selectedEntries()[0];

      service.setBundlesForEvent('event-a', [OPTION_ONLY_BUNDLE]);

      expect(service.selectedEntries()[0]).toBe(before);
    });
  });

  it('clear() empties only the active cart, leaving other events intact', () => {
    const aPhoto = photo('event-a', 1);
    const bPhoto = photo('event-b', 1);
    service.toggle(aPhoto);
    service.toggle(bPhoto); // event-b is now active

    service.clear();

    // Only event-b's cart is gone; event-a's is untouched and becomes active since it's all
    // that's left.
    expect(service.eventCarts().map((c) => c.eventId)).toEqual(['event-a']);
    expect(service.eventId()).toBe('event-a');
    expect(service.selectedCount()).toBe(1);
    expect(service.isSelected(aPhoto.id)).toBe(true);
  });

  it('clearEvent removes only the specified event\'s cart', () => {
    const aPhoto = photo('event-a', 1);
    const bPhoto = photo('event-b', 1);
    service.toggle(aPhoto);
    service.toggle(bPhoto);

    service.clearEvent('event-a');

    expect(service.eventCarts().map((c) => c.eventId)).toEqual(['event-b']);
    expect(service.eventId()).toBe('event-b');
    expect(service.selectedCount()).toBe(1);
  });

  it('deletes an event\'s cart when its last photo is toggled off, and repoints the active event', () => {
    const aPhoto = photo('event-a', 1);
    const bPhoto = photo('event-b', 1);
    service.toggle(aPhoto); // event-a active
    service.toggle(bPhoto); // event-b active

    service.toggle(bPhoto); // remove the only item in event-b's cart

    expect(service.eventCarts().map((c) => c.eventId)).toEqual(['event-a']);
    expect(service.eventId()).toBe('event-a');
    expect(service.selectedCount()).toBe(1);
  });

  it('bills photos beyond the flat-tier cap as extra instead of losing the discount entirely', () => {
    // ALL_IN_BUNDLE: RM12/photo, voucher tier 4-5 -> RM30 flat, no unbounded fallback tier.
    service.setBundlesForEvent('event-a', [ALL_IN_BUNDLE]);
    const photos = Array.from({ length: 6 }, (_, i) => photo('event-a', i));
    photos.forEach((p) => service.toggle(p));

    expect(service.pricing().bundleApplied).toBe(true);
    expect(service.pricing().extraCount).toBe(1);
    expect(service.pricing().extraTotal).toBe(12);
    expect(service.pricing().total).toBe(42);
  });

  it('persists carts to storage and restores them via loadCarts', () => {
    const p = photo('event-a', 1);
    service.toggle(p);
    service.setEventContext('event-a', { title: 'BTIC WEH', coverImageUrl: 'https://example.com/cover.jpg' });

    TestBed.tick();

    const restored = loadCarts();
    expect(restored.activeId).toBe('event-a');
    const cart = restored.carts.get('event-a');
    expect(cart?.items.get(p.id)?.photo.id).toBe(p.id);
    expect(cart?.eventTitle).toBe('BTIC WEH');
  });
});
