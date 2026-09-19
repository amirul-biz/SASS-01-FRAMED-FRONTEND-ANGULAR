import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { MerchantPaymentPlatformService } from './merchant-payment-platform.service';

export const paymentPlatformApprovedGuard: CanActivateFn = async () => {
  const paymentPlatformService = inject(MerchantPaymentPlatformService);
  const router = inject(Router);

  try {
    const options = await firstValueFrom(paymentPlatformService.getMyPaymentPlatformOptions());
    const hasApprovedOption = options.some((option) => option.approvalStatus === 'APPROVED');
    if (!hasApprovedOption) {
      return router.createUrlTree(['/studio/profile-settings']);
    }
    return true;
  } catch {
    return router.createUrlTree(['/studio/profile-settings']);
  }
};
