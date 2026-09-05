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

// capturedAt is a real UTC instant (converted from the camera's local wall-clock time at
// upload); convert it back to the viewer's local time for display.
function formatCapturedAtTime(capturedAt: string | null): string {
  if (!capturedAt) {
    return '';
  }
  const date = new Date(capturedAt);
  let hours = date.getHours();
  const minutes = date.getMinutes().toString().padStart(2, '0');
  const meridiem = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12 || 12;
  return `${hours}:${minutes} ${meridiem}`;
}

// This app only serves Malaysia-based events and there's no per-event timezone field, so a fixed
// Asia/Kuala_Lumpur (UTC+8) offset converts the customer's local time-of-day filter selection into
// the UTC time-of-day the backend's capturedMinuteOfDay filter (derived from the stored UTC
// instant) actually compares against.
const EVENT_TIMEZONE_OFFSET_MINUTES = 8 * 60;

export function toUtcTimeOfDay(localTime: string): string {
  const [hourStr, minuteStr] = localTime.split(':');
  const totalMinutes =
    (Number(hourStr) * 60 + Number(minuteStr) - EVENT_TIMEZONE_OFFSET_MINUTES + 1440) % 1440;
  const hours = Math.floor(totalMinutes / 60).toString().padStart(2, '0');
  const minutes = (totalMinutes % 60).toString().padStart(2, '0');
  return `${hours}:${minutes}`;
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
