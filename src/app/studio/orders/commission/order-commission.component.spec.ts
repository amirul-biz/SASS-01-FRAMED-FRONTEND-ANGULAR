import { TestBed } from '@angular/core/testing';
import { OrderCommission } from '../../../checkout/order.service';
import { OrderCommissionComponent } from './order-commission.component';

const baseCommission: OrderCommission = {
  commissionType: 'PERCENTAGE_PER_TRANSACTION',
  originalPaymentAmount: 30,
  commissionBaseAmount: 30,
  percentageRateApplied: 10,
  flatAmountApplied: null,
  commissionPerUnitApplied: null,
  unitCount: null,
  totalUnitCost: null,
  averageCostPerUnit: null,
  averageCommissionPerUnit: null,
  commissionAmount: 3,
  commissionImposedAt: '2026-09-20T10:00:00Z',
};

function render(commission: OrderCommission): string {
  const fixture = TestBed.createComponent(OrderCommissionComponent);
  fixture.componentRef.setInput('commission', commission);
  fixture.detectChanges();
  return (fixture.nativeElement as HTMLElement).textContent!.replace(/\s+/g, ' ');
}

describe('OrderCommissionComponent', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [OrderCommissionComponent] });
  });

  it('percentage per transaction: shows the amount paid, the rate and the commission', () => {
    const text = render(baseCommission);

    expect(text).toContain('Percentage per transaction');
    expect(text).toContain('Amount paid RM 30.00');
    expect(text).toContain('Commission rate 10%');
    expect(text).toContain('-RM 3.00');
  });

  it('amount per transaction: shows the amount paid and the fixed fee', () => {
    const text = render({
      ...baseCommission,
      commissionType: 'AMOUNT_PER_TRANSACTION',
      percentageRateApplied: null,
      flatAmountApplied: 2.5,
      commissionAmount: 2.5,
    });

    expect(text).toContain('Fixed amount per transaction');
    expect(text).toContain('Fixed fee for this order RM 2.50');
    expect(text).toContain('-RM 2.50');
  });

  it('percentage per unit: shows photo count, cost per photo, rate and commission per photo', () => {
    const text = render({
      ...baseCommission,
      commissionType: 'PERCENTAGE_PER_UNIT',
      commissionBaseAmount: 60,
      unitCount: 3,
      totalUnitCost: 60,
      averageCostPerUnit: 20,
      averageCommissionPerUnit: 2,
      commissionAmount: 6,
    });

    expect(text).toContain('Percentage per photo');
    expect(text).toContain('Total photos 3');
    expect(text).toContain('Average cost per photo RM 20.00');
    expect(text).toContain('Total photo cost RM 60.00');
    expect(text).toContain('Commission rate 10%');
    expect(text).toContain('Average commission per photo RM 2.00');
    expect(text).toContain('Total commission RM 6.00');
  });

  it('amount per unit: shows photo count, cost per photo and the fixed commission per photo', () => {
    const text = render({
      ...baseCommission,
      commissionType: 'AMOUNT_PER_UNIT',
      commissionBaseAmount: 60,
      percentageRateApplied: null,
      commissionPerUnitApplied: 1.5,
      unitCount: 3,
      totalUnitCost: 60,
      averageCostPerUnit: 20,
      commissionAmount: 4.5,
    });

    expect(text).toContain('Fixed amount per photo');
    expect(text).toContain('Total photos 3');
    expect(text).toContain('Commission per photo RM 1.50');
    expect(text).toContain('Total commission RM 4.50');
  });

  it('shows how much the photographer keeps after the commission', () => {
    expect(render(baseCommission)).toMatch(/You keep\s*RM 27\.00/);
  });
});
