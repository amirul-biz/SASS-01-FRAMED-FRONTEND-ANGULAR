import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { ENVIRONMENT } from '../core/environment.token';
import { IPhotoFormatOption, PricingOptionsService } from './pricing-options.service';

describe('PricingOptionsService', () => {
  let service: PricingOptionsService;
  let httpMock: HttpTestingController;
  const apiUrl = 'http://test-api';

  const option: IPhotoFormatOption = {
    id: 'option-1',
    photographerId: 'alex-rivers',
    label: '30MP JPEG',
    price: 12,
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: ENVIRONMENT, useValue: { apiUrl } },
      ],
    });
    service = TestBed.inject(PricingOptionsService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('getOptions fetches from the API with the photographer header and populates the cache', async () => {
    const promise = service.getOptions('alex-rivers');

    const req = httpMock.expectOne(`${apiUrl}/pricing-options`);
    expect(req.request.method).toBe('GET');
    expect(req.request.headers.get('x-photographer-id')).toBe('alex-rivers');
    req.flush([option]);

    expect(await promise).toEqual([option]);
    expect(service.getOption('option-1')).toEqual(option);
  });

  it('getOption returns undefined for an id not yet in the cache', () => {
    expect(service.getOption('does-not-exist')).toBeUndefined();
  });

  it('createOption posts the label/price and appends the response to the cache', async () => {
    const promise = service.createOption({ photographerId: 'alex-rivers', label: 'RAW', price: 27 });

    const req = httpMock.expectOne(`${apiUrl}/pricing-options`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ label: 'RAW', price: 27 });
    expect(req.request.headers.get('x-photographer-id')).toBe('alex-rivers');
    const created = { id: 'option-2', photographerId: 'alex-rivers', label: 'RAW', price: 27 };
    req.flush(created);

    expect(await promise).toEqual(created);
    expect(service.getOption('option-2')).toEqual(created);
  });

  it('updateOption patches using the cached photographerId and updates the cache', async () => {
    const getReq0 = service.getOptions('alex-rivers');
    httpMock.expectOne(`${apiUrl}/pricing-options`).flush([option]);
    await getReq0;

    const promise = service.updateOption('option-1', { price: 99 });

    const req = httpMock.expectOne(`${apiUrl}/pricing-options/option-1`);
    expect(req.request.method).toBe('PATCH');
    expect(req.request.headers.get('x-photographer-id')).toBe('alex-rivers');
    const updated = { ...option, price: 99 };
    req.flush(updated);

    expect(await promise).toEqual(updated);
    expect(service.getOption('option-1')?.price).toBe(99);
  });

  it('updateOption throws when the option is not in the cache', async () => {
    await expect(service.updateOption('missing-id', { price: 1 })).rejects.toThrow();
  });

  it('deleteOption removes the option from the cache once the API confirms', async () => {
    const getReq0 = service.getOptions('alex-rivers');
    httpMock.expectOne(`${apiUrl}/pricing-options`).flush([option]);
    await getReq0;

    const promise = service.deleteOption('option-1');

    const req = httpMock.expectOne(`${apiUrl}/pricing-options/option-1`);
    expect(req.request.method).toBe('DELETE');
    req.flush(null);

    await promise;
    expect(service.getOption('option-1')).toBeUndefined();
  });
});
