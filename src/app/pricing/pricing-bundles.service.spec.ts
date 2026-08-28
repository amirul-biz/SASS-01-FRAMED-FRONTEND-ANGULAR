import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { ENVIRONMENT } from '../core/environment.token';
import { IPricingBundle, PricingBundlesService } from './pricing-bundles.service';

describe('PricingBundlesService', () => {
  let service: PricingBundlesService;
  let httpMock: HttpTestingController;
  const apiUrl = 'http://test-api';

  const bundle: IPricingBundle = {
    id: 'bundle-1',
    photographerId: 'alex-rivers',
    name: 'Standard Bundle',
    pricingOptions: [{ id: 'option-1', label: 'HEIC', price: 15 }],
    vouchers: [{ id: 'voucher-1', name: 'Group Discount', discountType: 'flat-tier', conditions: [{ minPhotos: 5, maxPhotos: null, value: 30 }] }],
    fullGalleryEnabled: false,
    fullGalleryPrice: 0,
    eventsUsingCount: 0,
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: ENVIRONMENT, useValue: { apiUrl } },
      ],
    });
    service = TestBed.inject(PricingBundlesService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('getBundles fetches from the API with the photographer header and populates the cache', async () => {
    const promise = service.getBundles('alex-rivers');

    const req = httpMock.expectOne(`${apiUrl}/pricing-bundles`);
    expect(req.request.method).toBe('GET');
    expect(req.request.headers.get('x-photographer-id')).toBe('alex-rivers');
    req.flush([bundle]);

    expect(await promise).toEqual([bundle]);
    expect(service.getBundle('bundle-1')).toEqual(bundle);
  });

  it('getBundle returns undefined for an id not yet in the cache', () => {
    expect(service.getBundle('does-not-exist')).toBeUndefined();
  });

  it('fetchBundle fetches a single bundle by id and populates the cache', async () => {
    const promise = service.fetchBundle('alex-rivers', 'bundle-1');

    const req = httpMock.expectOne(`${apiUrl}/pricing-bundles/bundle-1`);
    expect(req.request.method).toBe('GET');
    expect(req.request.headers.get('x-photographer-id')).toBe('alex-rivers');
    req.flush(bundle);

    expect(await promise).toEqual(bundle);
    expect(service.getBundle('bundle-1')).toEqual(bundle);
  });

  it('createBundle posts the bundle fields and appends the response to the cache', async () => {
    const promise = service.createBundle({
      photographerId: 'alex-rivers',
      name: 'Budget Bundle',
      voucherIds: [],
      pricingOptionIds: ['option-1'],
      fullGalleryEnabled: false,
      fullGalleryPrice: 0,
    });

    const req = httpMock.expectOne(`${apiUrl}/pricing-bundles`);
    expect(req.request.method).toBe('POST');
    expect(req.request.headers.get('x-photographer-id')).toBe('alex-rivers');
    const created = { ...bundle, id: 'bundle-2', name: 'Budget Bundle', vouchers: [] };
    req.flush(created);

    expect(await promise).toEqual(created);
    expect(service.getBundle('bundle-2')).toEqual(created);
  });

  it('updateBundle patches using the cached photographerId and updates the cache', async () => {
    const getReq0 = service.getBundles('alex-rivers');
    httpMock.expectOne(`${apiUrl}/pricing-bundles`).flush([bundle]);
    await getReq0;

    const promise = service.updateBundle('bundle-1', { name: 'Renamed Bundle' });

    const req = httpMock.expectOne(`${apiUrl}/pricing-bundles/bundle-1`);
    expect(req.request.method).toBe('PATCH');
    const updated = { ...bundle, name: 'Renamed Bundle' };
    req.flush(updated);

    expect(await promise).toEqual(updated);
    expect(service.getBundle('bundle-1')?.name).toBe('Renamed Bundle');
  });

  it('deleteBundle removes the bundle from the cache once the API confirms', async () => {
    const getReq0 = service.getBundles('alex-rivers');
    httpMock.expectOne(`${apiUrl}/pricing-bundles`).flush([bundle]);
    await getReq0;

    const promise = service.deleteBundle('bundle-1');

    const req = httpMock.expectOne(`${apiUrl}/pricing-bundles/bundle-1`);
    expect(req.request.method).toBe('DELETE');
    req.flush(null);

    await promise;
    expect(service.getBundle('bundle-1')).toBeUndefined();
  });

  it('deleteBundle propagates a 409 when an event still references the bundle', async () => {
    const getReq0 = service.getBundles('alex-rivers');
    httpMock.expectOne(`${apiUrl}/pricing-bundles`).flush([bundle]);
    await getReq0;

    const promise = service.deleteBundle('bundle-1');

    const req = httpMock.expectOne(`${apiUrl}/pricing-bundles/bundle-1`);
    req.flush('in use', { status: 409, statusText: 'Conflict' });

    await expect(promise).rejects.toBeTruthy();
    expect(service.getBundle('bundle-1')).toEqual(bundle);
  });
});
