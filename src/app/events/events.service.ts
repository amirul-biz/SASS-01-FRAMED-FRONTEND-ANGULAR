import { Injectable, signal } from '@angular/core';

export type EventStatus = 'draft' | 'published' | 'flagged';

export interface IEventArea {
  id: string;
  name: string;
}

export interface IEvent {
  id: string;
  title: string;
  category: string;
  isLive: boolean;
  dateRange: string;
  location: string;
  coverImageUrl: string;
  photographerId: string;
  photographerName: string;
  photoCount: number;
  areas: IEventArea[];
  status: EventStatus;
  pricingBundleId: string;
}

export interface IPhoto {
  id: string;
  eventId: string;
  imageUrl: string;
  areaId: string;
  areaName: string;
  label: string;
  plateNumber: string;
  capturedAt: string;
}

const INITIAL_EVENTS: IEvent[] = [
  {
    id: 'crankworx-whistler-2024',
    title: 'Crankworx Whistler 2024',
    category: 'Downhill MTB',
    isLive: true,
    dateRange: 'August 15-20, 2024',
    location: 'Whistler Mountain, BC',
    coverImageUrl: 'https://picsum.photos/seed/crankworx-cover/1600/900',
    photographerId: 'alex-rivers',
    photographerName: 'Alex Rivers',
    photoCount: 8,
    status: 'published',
    areas: [
      { id: 'start-gate', name: 'Start Gate' },
      { id: 'rock-garden', name: 'Rock Garden' },
      { id: 'finish-line-jumps', name: 'Finish Line Jumps' },
    ],
    pricingBundleId: 'alex-standard-bundle',
  },
  {
    id: 'bukit-kiara-mtb-challenge-2023',
    title: 'Bukit Kiara MTB Challenge 2023',
    category: 'Mountain Biking',
    isLive: false,
    dateRange: 'November 4, 2023',
    location: 'Kuala Lumpur',
    coverImageUrl: 'https://picsum.photos/seed/bukit-kiara-cover/1600/900',
    photographerId: 'alex-rivers',
    photographerName: 'Alex Rivers',
    photoCount: 6,
    status: 'published',
    areas: [
      { id: 'summit-climb', name: 'Summit Climb' },
      { id: 'forest-descent', name: 'Forest Descent' },
    ],
    pricingBundleId: 'alex-budget-mtb-bundle',
  },
  {
    id: 'national-velodrome-sprint',
    title: 'National Velodrome Sprint',
    category: 'Track Cycling',
    isLive: false,
    dateRange: 'February 18, 2024',
    location: 'Nilai',
    coverImageUrl: 'https://picsum.photos/seed/velodrome-cover/1600/900',
    photographerId: 'alex-rivers',
    photographerName: 'Alex Rivers',
    photoCount: 6,
    status: 'published',
    areas: [
      { id: 'home-straight', name: 'Home Straight' },
      { id: 'banking-turn', name: 'Banking Turn' },
    ],
    pricingBundleId: 'alex-premium-percent-bundle',
  },
  {
    id: 'penang-round-island-tour',
    title: 'Penang Round Island Tour',
    category: 'Road Cycling',
    isLive: false,
    dateRange: 'TBA',
    location: 'Penang',
    coverImageUrl: 'https://picsum.photos/seed/penang-tour-cover/1600/900',
    photographerId: 'alex-rivers',
    photographerName: 'Alex Rivers',
    photoCount: 0,
    status: 'draft',
    areas: [],
    pricingBundleId: 'alex-per-photo-only',
  },
  {
    id: 'klang-valley-century-ride-2024',
    title: 'Klang Valley Century Ride 2024',
    category: 'Road Cycling',
    isLive: false,
    dateRange: 'March 15, 2024',
    location: 'Klang Valley',
    coverImageUrl: 'https://picsum.photos/seed/klang-valley-cover/1600/900',
    photographerId: 'marcus-chen',
    photographerName: 'Marcus Chen',
    photoCount: 6,
    status: 'published',
    areas: [
      { id: 'water-station', name: 'Water Station' },
      { id: 'hill-climb', name: 'Hill Climb' },
    ],
    pricingBundleId: 'marcus-standard-bundle',
  },
  {
    id: 'penang-round-island-epic',
    title: 'Penang Round Island Epic',
    category: 'Road Cycling',
    isLive: false,
    dateRange: 'March 10, 2024',
    location: 'Penang',
    coverImageUrl: 'https://picsum.photos/seed/penang-epic-cover/1600/900',
    photographerId: 'sarah-jenkins',
    photographerName: 'Sarah Jenkins',
    photoCount: 4,
    status: 'draft',
    areas: [{ id: 'coastal-road', name: 'Coastal Road' }],
    pricingBundleId: 'sarah-per-photo-only',
  },
  {
    id: 'urban-night-criterium',
    title: 'Urban Night Criterium',
    category: 'Criterium',
    isLive: false,
    dateRange: 'March 8, 2024',
    location: 'Kuala Lumpur',
    coverImageUrl: 'https://picsum.photos/seed/night-criterium-cover/1600/900',
    photographerId: 'unknown-uploader',
    photographerName: 'Unknown User',
    photoCount: 2,
    status: 'flagged',
    areas: [{ id: 'city-loop', name: 'City Loop' }],
    pricingBundleId: 'unknown-per-photo-only',
  },
];

function photo(
  eventId: string,
  index: number,
  areaId: string,
  areaName: string,
  plateNumber: string,
  capturedAt: string,
): IPhoto {
  return {
    id: `${eventId}-p${index}`,
    eventId,
    imageUrl: `https://picsum.photos/seed/${eventId}-${index}/800/800`,
    areaId,
    areaName,
    label: `#${plateNumber} - ${areaName}`,
    plateNumber,
    capturedAt,
  };
}

const INITIAL_PHOTOS: IPhoto[] = [
  // Crankworx Whistler 2024
  photo('crankworx-whistler-2024', 1, 'start-gate', 'Start Gate', '402', '09:58 AM'),
  photo('crankworx-whistler-2024', 2, 'start-gate', 'Start Gate', '317', '10:12 AM'),
  photo('crankworx-whistler-2024', 3, 'rock-garden', 'Rock Garden', '402', '10:45 AM'),
  photo('crankworx-whistler-2024', 4, 'rock-garden', 'Rock Garden', '317', '10:48 AM'),
  photo('crankworx-whistler-2024', 5, 'rock-garden', 'Rock Garden', '128', '10:51 AM'),
  photo('crankworx-whistler-2024', 6, 'finish-line-jumps', 'Finish', '402', '11:02 AM'),
  photo('crankworx-whistler-2024', 7, 'finish-line-jumps', 'Finish', '128', '11:05 AM'),
  photo('crankworx-whistler-2024', 8, 'finish-line-jumps', 'Finish', '055', '11:10 AM'),
  // Bukit Kiara MTB Challenge 2023
  photo('bukit-kiara-mtb-challenge-2023', 1, 'summit-climb', 'Summit Climb', '210', '08:05 AM'),
  photo('bukit-kiara-mtb-challenge-2023', 2, 'summit-climb', 'Summit Climb', '188', '08:12 AM'),
  photo('bukit-kiara-mtb-challenge-2023', 3, 'forest-descent', 'Forest Descent', '210', '08:40 AM'),
  photo('bukit-kiara-mtb-challenge-2023', 4, 'forest-descent', 'Forest Descent', '045', '08:44 AM'),
  photo('bukit-kiara-mtb-challenge-2023', 5, 'forest-descent', 'Forest Descent', '188', '08:47 AM'),
  photo('bukit-kiara-mtb-challenge-2023', 6, 'summit-climb', 'Summit Climb', '045', '08:09 AM'),
  // National Velodrome Sprint
  photo('national-velodrome-sprint', 1, 'home-straight', 'Home Straight', '007', '06:15 PM'),
  photo('national-velodrome-sprint', 2, 'home-straight', 'Home Straight', '013', '06:18 PM'),
  photo('national-velodrome-sprint', 3, 'banking-turn', 'Banking Turn', '007', '06:22 PM'),
  photo('national-velodrome-sprint', 4, 'banking-turn', 'Banking Turn', '029', '06:25 PM'),
  photo('national-velodrome-sprint', 5, 'banking-turn', 'Banking Turn', '013', '06:27 PM'),
  photo('national-velodrome-sprint', 6, 'home-straight', 'Home Straight', '029', '06:30 PM'),
  // Klang Valley Century Ride 2024
  photo('klang-valley-century-ride-2024', 1, 'water-station', 'Water Station', '331', '07:10 AM'),
  photo('klang-valley-century-ride-2024', 2, 'water-station', 'Water Station', '118', '07:15 AM'),
  photo('klang-valley-century-ride-2024', 3, 'hill-climb', 'Hill Climb', '331', '08:02 AM'),
  photo('klang-valley-century-ride-2024', 4, 'hill-climb', 'Hill Climb', '256', '08:06 AM'),
  photo('klang-valley-century-ride-2024', 5, 'hill-climb', 'Hill Climb', '118', '08:09 AM'),
  photo('klang-valley-century-ride-2024', 6, 'water-station', 'Water Station', '256', '07:18 AM'),
  // Penang Round Island Epic
  photo('penang-round-island-epic', 1, 'coastal-road', 'Coastal Road', '091', '06:40 AM'),
  photo('penang-round-island-epic', 2, 'coastal-road', 'Coastal Road', '154', '06:52 AM'),
  photo('penang-round-island-epic', 3, 'coastal-road', 'Coastal Road', '091', '07:05 AM'),
  photo('penang-round-island-epic', 4, 'coastal-road', 'Coastal Road', '154', '07:12 AM'),
  // Urban Night Criterium
  photo('urban-night-criterium', 1, 'city-loop', 'City Loop', '077', '09:20 PM'),
  photo('urban-night-criterium', 2, 'city-loop', 'City Loop', '077', '09:35 PM'),
];

export interface AreaCount {
  area: string;
  areaId: string;
  count: number;
}

@Injectable({ providedIn: 'root' })
export class EventsService {
  private readonly events = signal<IEvent[]>(INITIAL_EVENTS);
  private readonly photos = signal<IPhoto[]>(INITIAL_PHOTOS);

  getEvents(): IEvent[] {
    return this.events();
  }

  getPublishedEvents(): IEvent[] {
    return this.events().filter((e) => e.status === 'published');
  }

  getEvent(id: string): IEvent | undefined {
    return this.events().find((event) => event.id === id);
  }

  getEventsByPhotographer(photographerId: string): IEvent[] {
    return this.events().filter((event) => event.photographerId === photographerId);
  }

  getPhotos(eventId: string): IPhoto[] {
    return this.photos().filter((p) => p.eventId === eventId);
  }

  getAreaCounts(eventId: string): AreaCount[] {
    const event = this.getEvent(eventId);
    if (!event) {
      return [];
    }
    const photos = this.getPhotos(eventId);
    return event.areas.map((area) => ({
      area: area.name,
      areaId: area.id,
      count: photos.filter((p) => p.areaId === area.id).length,
    }));
  }

  searchByPlate(eventId: string, plate: string): IPhoto[] {
    const normalized = plate.trim();
    if (!normalized) {
      return this.getPhotos(eventId);
    }
    return this.getPhotos(eventId).filter((p) => p.plateNumber.includes(normalized));
  }

  assignPricingBundle(eventId: string, pricingBundleId: string): void {
    this.events.update((list) => list.map((e) => (e.id === eventId ? { ...e, pricingBundleId } : e)));
  }

  setEventStatus(eventId: string, status: EventStatus): void {
    this.events.update((list) => list.map((e) => (e.id === eventId ? { ...e, status } : e)));
  }

  addPhoto(eventId: string, photo: Omit<IPhoto, 'id' | 'eventId'>): IPhoto {
    const newPhoto: IPhoto = { ...photo, id: `${eventId}-p${Date.now()}-${this.photos().length}`, eventId };
    this.photos.update((list) => [...list, newPhoto]);
    this.events.update((list) => list.map((e) => (e.id === eventId ? { ...e, photoCount: e.photoCount + 1 } : e)));
    return newPhoto;
  }

  createEvent(input: {
    title: string;
    category: string;
    location: string;
    dateRange: string;
    photographerId: string;
    photographerName: string;
    pricingBundleId: string;
  }): IEvent {
    const id = this.uniqueSlug(input.title);
    const newEvent: IEvent = {
      id,
      title: input.title,
      category: input.category,
      location: input.location,
      dateRange: input.dateRange,
      photographerId: input.photographerId,
      photographerName: input.photographerName,
      pricingBundleId: input.pricingBundleId,
      isLive: false,
      photoCount: 0,
      status: 'draft',
      areas: [],
      coverImageUrl: `https://picsum.photos/seed/${id}-cover/1600/900`,
    };
    this.events.update((list) => [...list, newEvent]);
    return newEvent;
  }

  private uniqueSlug(title: string): string {
    const hyphenated = title
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .split('-')
      .filter(Boolean)
      .join('-');
    const base = hyphenated || 'event';

    let slug = base;
    let suffix = 2;
    while (this.getEvent(slug)) {
      slug = `${base}-${suffix}`;
      suffix++;
    }
    return slug;
  }
}
