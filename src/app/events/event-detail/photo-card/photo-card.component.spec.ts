import { TestBed } from '@angular/core/testing';
import { PhotoCardComponent } from './photo-card.component';
import { IPhoto } from '../../events.service';

const mockPhoto: IPhoto = {
  id: 'p1',
  eventId: 'event-a',
  imageUrl: 'https://example.test/p1.jpg',
  areaId: 'area-1',
  areaName: 'Area 1',
  label: '#123 - Area 1',
  plateNumber: '123',
  capturedAt: '10:00 AM',
};

describe('PhotoCardComponent', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [PhotoCardComponent] });
  });

  it('renders the photo label and emits toggleSelect on click', () => {
    const fixture = TestBed.createComponent(PhotoCardComponent);
    fixture.componentRef.setInput('photo', mockPhoto);
    fixture.componentRef.setInput('price', 15);
    fixture.detectChanges();

    let emitted = false;
    fixture.componentInstance.toggleSelect.subscribe(() => (emitted = true));

    const buttons = Array.from((fixture.nativeElement as HTMLElement).querySelectorAll('button'));
    const selectButton = buttons.find((button) => button.textContent?.includes('Select'))!;
    selectButton.click();

    expect(emitted).toBe(true);
  });

  it('emits previewPhoto when the image is clicked', () => {
    const fixture = TestBed.createComponent(PhotoCardComponent);
    fixture.componentRef.setInput('photo', mockPhoto);
    fixture.componentRef.setInput('price', 15);
    fixture.detectChanges();

    let emitted = false;
    fixture.componentInstance.previewPhoto.subscribe(() => (emitted = true));

    const buttons = Array.from((fixture.nativeElement as HTMLElement).querySelectorAll('button'));
    const previewButton = buttons.find((button) => button.getAttribute('aria-label')?.startsWith('Preview'))!;
    previewButton.click();

    expect(emitted).toBe(true);
  });
});
