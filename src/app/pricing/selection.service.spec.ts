import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { ENVIRONMENT } from '../core/environment.token';
import { EventsService, IPhoto } from '../events/events.service';
import { SelectionService } from './selection.service';

describe('SelectionService', () => {
  let service: SelectionService;
  let eventsService: EventsService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: ENVIRONMENT, useValue: { apiUrl: 'http://test-api' } },
      ],
    });
    service = TestBed.inject(SelectionService);
    eventsService = TestBed.inject(EventsService);
  });

  function photosFor(eventId: string): IPhoto[] {
    return eventsService.getPhotos(eventId);
  }

  it('starts empty', () => {
    expect(service.selectedCount()).toBe(0);
    expect(service.selectedPhotos()).toEqual([]);
  });

  it('adds a photo on toggle and removes it on a second toggle', () => {
    const [photo] = photosFor('crankworx-whistler-2024');

    service.toggle(photo);
    expect(service.selectedCount()).toBe(1);
    expect(service.isSelected(photo.id)).toBe(true);

    service.toggle(photo);
    expect(service.selectedCount()).toBe(0);
    expect(service.isSelected(photo.id)).toBe(false);
  });

  it('clears the previous selection when a photo from a different event is toggled on', () => {
    const crankworxPhotos = photosFor('crankworx-whistler-2024');
    const bukitKiaraPhotos = photosFor('bukit-kiara-mtb-challenge-2023');

    service.toggle(crankworxPhotos[0]);
    service.toggle(crankworxPhotos[1]);
    expect(service.selectedCount()).toBe(2);

    service.toggle(bukitKiaraPhotos[0]);

    expect(service.selectedCount()).toBe(1);
    expect(service.isSelected(bukitKiaraPhotos[0].id)).toBe(true);
    expect(service.eventId()).toBe('bukit-kiara-mtb-challenge-2023');
  });

  it('recomputes pricing reactively using the selected event own pricing config', () => {
    // crankworx-whistler-2024 is photographed by alex-rivers; quick-select defaults to their
    // cheapest pricing option (30MP JPEG, RM12/photo). Bundle: flat-tier 5+ -> RM30 (RM6/photo),
    // a flat bulk rate independent of which pricing option was chosen.
    const photos = photosFor('crankworx-whistler-2024');

    for (let i = 0; i < 4; i++) {
      service.toggle(photos[i]);
    }
    expect(service.pricing().bundleApplied).toBe(false);
    expect(service.pricing().pricePerPhoto).toBe(12);
    expect(service.photosTotal()).toBe(48);

    service.toggle(photos[4]);

    expect(service.pricing().bundleApplied).toBe(true);
    expect(service.pricing().pricePerPhoto).toBe(6);
    expect(service.pricing().total).toBe(32);
  });

  it('clear empties the selection', () => {
    const [photo] = photosFor('crankworx-whistler-2024');
    service.toggle(photo);
    service.clear();
    expect(service.selectedCount()).toBe(0);
  });
});
