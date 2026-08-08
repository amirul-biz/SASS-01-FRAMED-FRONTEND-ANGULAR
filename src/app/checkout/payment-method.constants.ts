export type PaymentMethod = 'fpx' | 'card' | 'ewallet';

export interface IPaymentMethodConfig {
  value: PaymentMethod;
  label: string;
  icon: string;
}

export const PAYMENT_METHODS: IPaymentMethodConfig[] = [
  { value: 'fpx', label: 'FPX Banking', icon: 'account_balance' },
  { value: 'card', label: 'Credit/Debit Card', icon: 'credit_card' },
  { value: 'ewallet', label: 'E-Wallet', icon: 'account_balance_wallet' },
];
