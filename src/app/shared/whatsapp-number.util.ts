// Photographers enter their contact number in local Malaysian format (leading 0, no country
// code) — there's no country selector on that field yet. wa.me requires the full international
// number with no leading zero, so normalize before building any wa.me link.
// ponytail: assumes MY (matches the platform's own fallback WhatsApp number); add a country
// selector on the profile field if photographers outside Malaysia need this.
export function toWhatsAppNumber(digits: string): string {
  return digits.startsWith('60') ? digits : `60${digits.replace(/^0+/, '')}`;
}
