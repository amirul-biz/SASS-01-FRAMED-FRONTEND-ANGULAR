import { IEvent } from '../events/events.service';
import { ClientLatestEvent } from './client.service';

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function formatEventDate(dateStr: string): string {
  const date = new Date(dateStr);
  return `${date.getDate()} ${MONTH_NAMES[date.getMonth()]} ${date.getFullYear()}`;
}

function formatEventDateRange(startDateStr: string, endDateStr: string): string {
  const start = formatEventDate(startDateStr);
  const end = formatEventDate(endDateStr);
  return start === end ? start : `${start} - ${end}`;
}

function isEventLive(startDateStr: string, endDateStr: string): boolean {
  const now = Date.now();
  return now >= new Date(startDateStr).getTime() && now <= new Date(endDateStr).getTime();
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
