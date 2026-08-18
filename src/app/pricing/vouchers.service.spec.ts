import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { ENVIRONMENT } from '../core/environment.token';
import { IVoucher, VouchersService } from './vouchers.service';

describe('VouchersService', () => {
  let service: VouchersService;
  let httpMock: HttpTestingController;
  const apiUrl = 'http://test-api';

  const voucher: IVoucher = {
    id: 'voucher-1',
    photographerId: 'photographer-1',
    name: 'Group Discount',
    discountType: 'percent-tier',
    conditions: [
      { minPhotos: 3, maxPhotos: 5, value: 50 },
      { minPhotos: 10, maxPhotos: null, value: 40 },
    ],
    bundlesUsingCount: 0,
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: ENVIRONMENT, useValue: { apiUrl } },
      ],
    });
    service = TestBed.inject(VouchersService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('getVouchers fetches from the API and populates the cache', async () => {
    const promise = service.getVouchers('photographer-1');

    const req = httpMock.expectOne(`${apiUrl}/vouchers`);
    expect(req.request.method).toBe('GET');
    req.flush([voucher]);

    expect(await promise).toEqual([voucher]);
    expect(service.getVoucher('voucher-1')).toEqual(voucher);
  });

  it('getVoucher returns undefined for an id not yet in the cache', () => {
    expect(service.getVoucher('does-not-exist')).toBeUndefined();
  });

  it('createVoucher posts the fields and appends the response to the cache', async () => {
    const promise = service.createVoucher('photographer-1', {
      name: 'Group Discount',
      discountType: 'percent-tier',
      conditions: voucher.conditions,
    });

    const req = httpMock.expectOne(`${apiUrl}/vouchers`);
    expect(req.request.method).toBe('POST');
    req.flush(voucher);

    expect(await promise).toEqual(voucher);
    expect(service.getVoucher('voucher-1')).toEqual(voucher);
  });

  it('updateVoucher patches and updates the cache', async () => {
    const getReq0 = service.getVouchers('photographer-1');
    httpMock.expectOne(`${apiUrl}/vouchers`).flush([voucher]);
    await getReq0;

    const promise = service.updateVoucher('voucher-1', { name: 'Renamed' });

    const req = httpMock.expectOne(`${apiUrl}/vouchers/voucher-1`);
    expect(req.request.method).toBe('PATCH');
    const updated = { ...voucher, name: 'Renamed' };
    req.flush(updated);

    expect(await promise).toEqual(updated);
    expect(service.getVoucher('voucher-1')?.name).toBe('Renamed');
  });

  it('deleteVoucher removes it from the cache once the API confirms', async () => {
    const getReq0 = service.getVouchers('photographer-1');
    httpMock.expectOne(`${apiUrl}/vouchers`).flush([voucher]);
    await getReq0;

    const promise = service.deleteVoucher('voucher-1');

    const req = httpMock.expectOne(`${apiUrl}/vouchers/voucher-1`);
    expect(req.request.method).toBe('DELETE');
    req.flush(null);

    await promise;
    expect(service.getVoucher('voucher-1')).toBeUndefined();
  });

  it('deleteVoucher propagates a 409 when a bundle still references the voucher', async () => {
    const getReq0 = service.getVouchers('photographer-1');
    httpMock.expectOne(`${apiUrl}/vouchers`).flush([voucher]);
    await getReq0;

    const promise = service.deleteVoucher('voucher-1');

    const req = httpMock.expectOne(`${apiUrl}/vouchers/voucher-1`);
    req.flush('in use', { status: 409, statusText: 'Conflict' });

    await expect(promise).rejects.toBeTruthy();
    expect(service.getVoucher('voucher-1')).toEqual(voucher);
  });
});
