import { TestBed } from '@angular/core/testing';
import { EventsService } from './events.service';

describe('EventsService', () => {
  let service: EventsService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(EventsService);
  });

  it('returns a non-empty list of events', () => {
    expect(service.getEvents().length).toBeGreaterThan(0);
  });

  it('getPublishedEvents only returns published events', () => {
    const published = service.getPublishedEvents();
    expect(published.length).toBeGreaterThan(0);
    expect(published.every((e) => e.status === 'published')).toBe(true);
    expect(published.some((e) => e.status === 'draft')).toBe(false);
  });

  it('every photo references a valid event id and area id', () => {
    for (const event of service.getEvents()) {
      const photos = service.getPhotos(event.id);
      for (const p of photos) {
        expect(p.eventId).toBe(event.id);
        expect(event.areas.some((a) => a.id === p.areaId)).toBe(true);
      }
    }
  });

  it('area counts sum to the total photo count for the event', () => {
    for (const event of service.getEvents()) {
      const counts = service.getAreaCounts(event.id);
      const sum = counts.reduce((acc, c) => acc + c.count, 0);
      expect(sum).toBe(service.getPhotos(event.id).length);
    }
  });

  it('getEventsByPhotographer filters to that photographer only', () => {
    const events = service.getEventsByPhotographer('alex-rivers');
    expect(events.length).toBeGreaterThan(0);
    expect(events.every((e) => e.photographerId === 'alex-rivers')).toBe(true);
  });

  it('searchByPlate filters to matching plate numbers only', () => {
    const [event] = service.getEvents();
    const plate = service.getPhotos(event.id)[0].plateNumber;
    const results = service.searchByPlate(event.id, plate);
    expect(results.length).toBeGreaterThan(0);
    expect(results.every((p) => p.plateNumber.includes(plate))).toBe(true);
  });

  it('searchByPlate returns all photos for a blank query', () => {
    const [event] = service.getEvents();
    expect(service.searchByPlate(event.id, '  ')).toEqual(service.getPhotos(event.id));
  });

  it('getEvent returns undefined for an unknown id', () => {
    expect(service.getEvent('does-not-exist')).toBeUndefined();
  });

  it('assignPricingBundles updates the voucher references for that event only', () => {
    const [event, other] = service.getEvents();
    const newBundleIds = ['some-other-bundle'];

    service.assignPricingBundles(event.id, newBundleIds);

    expect(service.getEvent(event.id)?.pricingBundleIds).toEqual(newBundleIds);
    expect(service.getEvent(other.id)?.pricingBundleIds).not.toEqual(newBundleIds);
  });

  it('assignPricingOptions updates the pricing-option references for that event only', () => {
    const [event, other] = service.getEvents();
    const newOptionIds = ['some-other-option'];

    service.assignPricingOptions(event.id, newOptionIds);

    expect(service.getEvent(event.id)?.pricingOptionIds).toEqual(newOptionIds);
    expect(service.getEvent(other.id)?.pricingOptionIds).not.toEqual(newOptionIds);
  });

  it('setEventStatus updates only the targeted event', () => {
    const [event] = service.getEvents();
    service.setEventStatus(event.id, 'flagged');
    expect(service.getEvent(event.id)?.status).toBe('flagged');
  });

  it('addPhoto appends a photo and increments the event photo count', () => {
    const [event] = service.getEvents();
    const before = service.getPhotos(event.id).length;
    const beforeCount = service.getEvent(event.id)!.photoCount;

    const added = service.addPhoto(event.id, {
      imageUrl: 'https://example.test/new.jpg',
      areaId: event.areas[0]?.id ?? 'area-1',
      areaName: event.areas[0]?.name ?? 'Area 1',
      label: 'New upload',
      plateNumber: '999',
      capturedAt: '12:00 PM',
    });

    expect(service.getPhotos(event.id).length).toBe(before + 1);
    expect(service.getEvent(event.id)?.photoCount).toBe(beforeCount + 1);
    expect(added.eventId).toBe(event.id);
  });

  it('createEvent adds a new draft event with a slugified id and the given pricing bundle', () => {
    const before = service.getEvents().length;

    const created = service.createEvent({
      title: 'My New Race!',
      category: 'Road Cycling',
      location: 'Ipoh',
      dateRange: 'December 1, 2024',
      photographerId: 'alex-rivers',
      photographerName: 'Alex Rivers',
      pricingBundleIds: ['alex-standard-bundle'],
      pricingOptionIds: ['alex-rivers-jpeg-30mp'],
    });

    expect(service.getEvents().length).toBe(before + 1);
    expect(created.id).toBe('my-new-race');
    expect(created.status).toBe('draft');
    expect(created.photoCount).toBe(0);
    expect(created.pricingBundleIds).toEqual(['alex-standard-bundle']);
    expect(created.pricingOptionIds).toEqual(['alex-rivers-jpeg-30mp']);
    expect(service.getEvent(created.id)).toEqual(created);
  });

  it('createEvent disambiguates the slug when the title collides with an existing event', () => {
    const [existing] = service.getEvents();

    const created = service.createEvent({
      title: existing.title,
      category: 'Test',
      location: 'Test',
      dateRange: 'Test',
      photographerId: 'alex-rivers',
      photographerName: 'Alex Rivers',
      pricingBundleIds: ['alex-standard-bundle'],
      pricingOptionIds: ['alex-rivers-jpeg-30mp'],
    });

    expect(created.id).not.toBe(existing.id);
    expect(created.id.startsWith(existing.id)).toBe(true);
  });
});
