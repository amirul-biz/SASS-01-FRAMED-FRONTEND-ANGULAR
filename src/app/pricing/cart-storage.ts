import type { EventCart, SelectedEntry } from './selection.service';

const STORAGE_KEY = 'picsweep.cart.v1';
const STORAGE_VERSION = 1;

interface PersistedCart {
  eventId: string;
  eventTitle: string;
  coverImageUrl: string;
  items: SelectedEntry[];
}

interface PersistedState {
  version: number;
  activeId: string | null;
  carts: PersistedCart[];
}

export interface LoadedCarts {
  carts: Map<string, EventCart>;
  activeId: string | null;
}

const EMPTY: LoadedCarts = { carts: new Map(), activeId: null };

function hasLocalStorage(): boolean {
  try {
    return typeof localStorage !== 'undefined';
  } catch {
    return false;
  }
}

/** Best-effort restore of every rider's cart across events. Malformed JSON, a storage-schema
 *  version bump, or a disabled/unavailable localStorage (SSR, private browsing) all just fall
 *  back to an empty cart rather than throwing — losing a persisted cart is not a page-breaking bug. */
export function loadCarts(): LoadedCarts {
  if (!hasLocalStorage()) {
    return EMPTY;
  }
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return EMPTY;
    }
    const parsed = JSON.parse(raw) as PersistedState;
    if (parsed.version !== STORAGE_VERSION || !Array.isArray(parsed.carts)) {
      return EMPTY;
    }
    const carts = new Map<string, EventCart>(
      parsed.carts.map((cart) => [
        cart.eventId,
        {
          eventId: cart.eventId,
          eventTitle: cart.eventTitle,
          coverImageUrl: cart.coverImageUrl,
          items: new Map(cart.items.map((entry) => [entry.photo.id, entry])),
        },
      ]),
    );
    return { carts, activeId: parsed.activeId ?? null };
  } catch {
    return EMPTY;
  }
}

export function saveCarts(carts: Map<string, EventCart>, activeId: string | null): void {
  if (!hasLocalStorage()) {
    return;
  }
  try {
    const state: PersistedState = {
      version: STORAGE_VERSION,
      activeId,
      carts: Array.from(carts.values()).map((cart) => ({
        eventId: cart.eventId,
        eventTitle: cart.eventTitle,
        coverImageUrl: cart.coverImageUrl,
        items: Array.from(cart.items.values()),
      })),
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Storage full or disabled mid-session — the in-memory cart still works, it just won't survive
    // a refresh this time.
  }
}
