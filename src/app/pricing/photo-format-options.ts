export interface IPhotoFormatOption {
  id: string;
  label: string;
  /** flat RM add-on per photo, on top of the bundle's per-photo price */
  extraPrice: number;
}

export const PHOTO_FORMAT_OPTIONS: IPhotoFormatOption[] = [
  { id: 'jpeg-30mp', label: '30MP JPEG', extraPrice: 0 },
  { id: 'jpeg-50mp', label: '50MP JPEG', extraPrice: 5 },
  { id: 'heic', label: 'HEIC', extraPrice: 3 },
  { id: 'raw', label: 'RAW', extraPrice: 12 },
];

export const DEFAULT_FORMAT_OPTION = PHOTO_FORMAT_OPTIONS[0];

export function getFormatOption(formatId: string): IPhotoFormatOption {
  return PHOTO_FORMAT_OPTIONS.find((option) => option.id === formatId) ?? DEFAULT_FORMAT_OPTION;
}
