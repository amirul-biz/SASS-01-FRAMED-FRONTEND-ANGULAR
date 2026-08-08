import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { EventCardComponent } from './event-card.component';
import { IEvent } from '../../events/events.service';

const mockEvent: IEvent = {
  id: 'test-event',
  title: 'Test Event',
  category: 'Test Category',
  isLive: true,
  dateRange: 'Jan 1-2, 2025',
  location: 'Test City',
  coverImageUrl: 'https://example.test/cover.jpg',
  photographerId: 'p1',
  photographerName: 'Test Photographer',
  photoCount: 5,
  areas: [],
  status: 'published',
  pricingBundleId: 'test-bundle',
};

describe('EventCardComponent', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [EventCardComponent],
      providers: [provideRouter([])],
    });
  });

  it('renders the event title and photo count', () => {
    const fixture = TestBed.createComponent(EventCardComponent);
    fixture.componentRef.setInput('event', mockEvent);
    fixture.detectChanges();
    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('Test Event');
    expect(text).toContain('5');
  });
});
