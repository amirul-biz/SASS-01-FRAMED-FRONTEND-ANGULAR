export const COUNTRY_CODES = ['MALAYSIA', 'SINGAPORE'] as const;
export type CountryCode = (typeof COUNTRY_CODES)[number];

// Maps the backend enum name to the dial code shown in the UI and sent in the WhatsApp message.
export const COUNTRY_DIAL_CODE: Record<CountryCode, string> = {
  MALAYSIA: '+60',
  SINGAPORE: '+65',
};
