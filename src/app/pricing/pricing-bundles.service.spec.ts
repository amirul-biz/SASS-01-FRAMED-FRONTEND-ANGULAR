import { TestBed } from '@angular/core/testing';
import { PricingBundlesService } from './pricing-bundles.service';
import { EventsService } from '../events/events.service';

describe('PricingBundlesService', () => {
  let service: PricingBundlesService;
  let eventsService: EventsService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(PricingBundlesService);
    eventsService = TestBed.inject(EventsService);
  });

  it('returns bundles scoped to a photographer only', () => {
    const bundles = service.getBundles('alex-rivers');
    expect(bundles.length).toBeGreaterThan(0);
    expect(bundles.every((b) => b.photographerId === 'alex-rivers')).toBe(true);
  });

  it('getBundle returns undefined for an unknown id', () => {
    expect(service.getBundle('does-not-exist')).toBeUndefined();
  });

  it('createBundle generates a slugified id and appends the bundle', () => {
    const before = service.getBundles('alex-rivers').length;

    const created = service.createBundle({
      photographerId: 'alex-rivers',
      name: 'Weekend Special!',
      basePrice: 20,
      bundleModel: 'none',
      bundleTiers: [],
      fullGalleryEnabled: false,
      fullGalleryPrice: 0,
    });

    expect(created.id).toBe('weekend-special');
    expect(service.getBundles('alex-rivers').length).toBe(before + 1);
  });

  it('createBundle disambiguates the slug on a name collision', () => {
    const [existing] = service.getBundles('alex-rivers');

    const created = service.createBundle({
      photographerId: 'alex-rivers',
      name: existing.name,
      basePrice: 10,
      bundleModel: 'none',
      bundleTiers: [],
      fullGalleryEnabled: false,
      fullGalleryPrice: 0,
    });

    expect(created.id).not.toBe(existing.id);
    expect(created.id.startsWith(existing.id)).toBe(true);
  });

  it('updateBundle merges changes into the existing bundle only', () => {
    const [bundle, other] = service.getBundles('alex-rivers');

    service.updateBundle(bundle.id, { basePrice: 99 });

    expect(service.getBundle(bundle.id)?.basePrice).toBe(99);
    expect(service.getBundle(other.id)?.basePrice).not.toBe(99);
  });

  it('eventCountUsingBundle reflects how many events reference a bundle', () => {
    const [event] = eventsService.getEvents();
    expect(service.eventCountUsingBundle(event.pricingBundleId)).toBeGreaterThan(0);
    expect(service.eventCountUsingBundle('does-not-exist')).toBe(0);
  });

  it('deleteBundle is blocked while an event still references it', () => {
    const [event] = eventsService.getEvents();
    const result = service.deleteBundle(event.pricingBundleId);
    expect(result).toBe(false);
    expect(service.getBundle(event.pricingBundleId)).toBeTruthy();
  });

  it('deleteBundle succeeds once no event references it', () => {
    const created = service.createBundle({
      photographerId: 'alex-rivers',
      name: 'Unused Bundle',
      basePrice: 10,
      bundleModel: 'none',
      bundleTiers: [],
      fullGalleryEnabled: false,
      fullGalleryPrice: 0,
    });

    const result = service.deleteBundle(created.id);

    expect(result).toBe(true);
    expect(service.getBundle(created.id)).toBeUndefined();
  });
});
