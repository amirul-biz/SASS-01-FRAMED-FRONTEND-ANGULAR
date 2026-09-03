import { IEvent, IPhoto } from '../events/events.service';
import { IPricingBundle } from '../pricing/pricing-bundles.service';
import { ClientEventDetail, ClientEventPhoto, ClientLatestEvent } from './client.service';

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function formatEventDate(dateStr: string): string {
  const date = new Date(dateStr);
  return `${date.getDate()} ${MONTH_NAMES[date.getMonth()]} ${date.getFullYear()}`;
}

export function formatEventDateRange(startDateStr: string, endDateStr: string): string {
  const start = formatEventDate(startDateStr);
  const end = formatEventDate(endDateStr);
  return start === end ? start : `${start} - ${end}`;
}

export function isEventLive(startDateStr: string, endDateStr: string): boolean {
  const now = Date.now();
  return now >= new Date(startDateStr).getTime() && now <= new Date(endDateStr).getTime();
}

// captured_at is stored as a wall-clock EXIF time with no timezone (TIMESTAMP(3) without time
// zone). The API serializes it with a trailing "Z", so new Date(...) parses those digits as UTC —
// reading them back with getHours()/getMinutes() would reinterpret them in the browser's local
// zone instead, shifting the displayed time by that offset. getUTCHours/getUTCMinutes read the
// digits as stored, which is also what the server-side capturedFrom/capturedTo filter matches
// against.
function formatCapturedAtTime(capturedAt: string | null): string {
  if (!capturedAt) {
    return '';
  }
  const date = new Date(capturedAt);
  let hours = date.getUTCHours();
  const minutes = date.getUTCMinutes().toString().padStart(2, '0');
  const meridiem = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12 || 12;
  return `${hours}:${minutes} ${meridiem}`;
}

export function formatCategory(category: string): string {
  return category.charAt(0) + category.slice(1).toLowerCase();
}

export function toEventCard(event: ClientLatestEvent): IEvent {
  return {
    id: event.id,
    title: event.title,
    category: formatCategory(event.category),
    isLive: isEventLive(event.eventStartDate, event.eventEndDate),
    dateRange: formatEventDateRange(event.eventStartDate, event.eventEndDate),
    location: event.location ?? '',
    coverImageUrl: event.coverPhotoUrl ?? `https://picsum.photos/seed/${event.id}-cover/1600/900`,
    photographerId: event.photographerId,
    photographerName: event.photographerName,
    photoCount: event.photoCount,
    areas: [],
    status: 'published',
    pricingBundleIds: [],
    pricingOptionIds: [],
  };
}

export function toEventDetail(
  event: ClientEventDetail,
): IEvent & { description: string | null; pricingBundles: ClientEventDetail['pricingBundles']; albumCoverPhotoUrls: string[] } {
  return {
    ...toEventCard(event),
    description: event.description,
    pricingBundles: event.pricingBundles,
    albumCoverPhotoUrls: event.albumCoverPhotoUrls,
  };
}

/** Maps the public event's real pricing bundles into the shape the rider-facing pricing engine
 *  (SelectionService, OrderSummaryComponent, CheckoutComponent) already consumes — see
 *  pricing-bundles.service.ts's IPricingBundle. photographerId/eventsUsingCount are carried along
 *  only to satisfy that shape; the rider-facing pricing engine never reads them. */
export function toSelectionBundles(event: ClientEventDetail): IPricingBundle[] {
  return event.pricingBundles.map((bundle) => ({
    ...bundle,
    photographerId: event.photographerId,
    eventsUsingCount: 0,
  }));
}

export function toGalleryPhoto(eventId: string, photo: ClientEventPhoto): IPhoto {
  return {
    id: photo.id,
    eventId,
    imageUrl: photo.url ?? '',
    areaId: '',
    areaName: '',
    label: photo.originalName,
    plateNumber: '',
    capturedAt: formatCapturedAtTime(photo.capturedAt),
    width: photo.width,
    height: photo.height,
  };
}
