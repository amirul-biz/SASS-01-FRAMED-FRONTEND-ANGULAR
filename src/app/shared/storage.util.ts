const UNITS = ['B', 'KB', 'MB', 'GB', 'TB'];
const MB_PER_GB = 1024;

export function formatBytes(bytes: number): string {
  let value = bytes;
  let unit = 0;
  while (value >= 1024 && unit < UNITS.length - 1) {
    value /= 1024;
    unit += 1;
  }
  return `${unit === 0 ? value : value.toFixed(1)} ${UNITS[unit]}`;
}

// The API error filter nests the text ({ message: { message } }); validation errors send an array.
export function apiErrorMessage(error: unknown, fallback: string): string {
  const body = (error as { error?: { message?: unknown } })?.error?.message;
  const inner =
    typeof body === 'object' && body !== null && !Array.isArray(body)
      ? (body as { message?: unknown }).message
      : body;
  if (Array.isArray(inner)) {
    return inner.join(' ');
  }
  return typeof inner === 'string' ? inner : fallback;
}

// Limits are stored in MB but always shown in GB.
export function mbToGb(mb: number): number {
  return Math.round((mb / MB_PER_GB) * 1000) / 1000;
}

export function gbToMb(gb: number): number {
  return Math.round(gb * MB_PER_GB);
}

export function formatGb(mb: number): string {
  return `${mbToGb(mb)} GB`;
}
