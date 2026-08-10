import { TestBed } from '@angular/core/testing';
import { PricingOptionsService } from './pricing-options.service';

describe('PricingOptionsService', () => {
  let service: PricingOptionsService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(PricingOptionsService);
  });

  it('returns options scoped to a photographer only', () => {
    const options = service.getOptions('alex-rivers');
    expect(options.length).toBeGreaterThan(0);
    expect(options.every((o) => o.photographerId === 'alex-rivers')).toBe(true);
  });

  it('getOption returns undefined for an unknown id', () => {
    expect(service.getOption('does-not-exist')).toBeUndefined();
  });

  it('createOption generates a slugified id scoped to the photographer and appends the option', () => {
    const before = service.getOptions('alex-rivers').length;

    const created = service.createOption({ photographerId: 'alex-rivers', label: 'Ultra HD', price: 20 });

    expect(created.id).toBe('alex-rivers-ultra-hd');
    expect(service.getOptions('alex-rivers').length).toBe(before + 1);
  });

  it('createOption disambiguates the slug on a label collision', () => {
    const first = service.createOption({ photographerId: 'alex-rivers', label: 'Panorama', price: 8 });
    const second = service.createOption({ photographerId: 'alex-rivers', label: 'Panorama', price: 8 });

    expect(second.id).not.toBe(first.id);
    expect(second.id.startsWith(first.id)).toBe(true);
  });

  it('updateOption merges changes into the existing option only', () => {
    const [option, other] = service.getOptions('alex-rivers');

    service.updateOption(option.id, { price: 99 });

    expect(service.getOption(option.id)?.price).toBe(99);
    expect(service.getOption(other.id)?.price).not.toBe(99);
  });

  it('deleteOption removes the option', () => {
    const created = service.createOption({ photographerId: 'alex-rivers', label: 'Temp Option', price: 5 });

    service.deleteOption(created.id);

    expect(service.getOption(created.id)).toBeUndefined();
  });
});
