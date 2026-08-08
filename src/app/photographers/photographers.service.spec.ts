import { TestBed } from '@angular/core/testing';
import { PhotographersService } from './photographers.service';

describe('PhotographersService', () => {
  let service: PhotographersService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(PhotographersService);
  });

  it('returns a non-empty list of photographers', () => {
    expect(service.getPhotographers().length).toBeGreaterThan(0);
  });

  it('computes stats from the events service rather than storing them statically', () => {
    const alex = service.getPhotographer('alex-rivers');
    expect(alex).toBeTruthy();
    expect(alex!.stats.eventsShot).toBeGreaterThan(0);
    expect(alex!.stats.photosUploaded).toBeGreaterThan(0);
  });

  it('getPhotographer returns undefined for an unknown id', () => {
    expect(service.getPhotographer('does-not-exist')).toBeUndefined();
  });

  it('setStatus updates only the targeted photographer', () => {
    service.setStatus('david-lee', 'active');
    expect(service.getPhotographer('david-lee')?.status).toBe('active');
    expect(service.getPhotographer('alex-rivers')?.status).toBe('active');
  });
});
