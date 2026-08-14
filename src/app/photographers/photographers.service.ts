import { Injectable, inject, signal } from '@angular/core';
import { EventsService } from '../events/events.service';

export type PhotographerStatus = 'active' | 'suspended';

export interface IPhotographerStats {
  eventsShot: number;
  photosUploaded: number;
}

export interface IPhotographer {
  id: string;
  name: string;
  email: string;
  avatarUrl: string;
  bio: string;
  location: string;
  stats: IPhotographerStats;
  status: PhotographerStatus;
  joinedDate: string;
}

interface PhotographerSeed {
  id: string;
  name: string;
  email: string;
  avatarUrl: string;
  bio: string;
  location: string;
  status: PhotographerStatus;
  joinedDate: string;
}

const SEED: PhotographerSeed[] = [
  {
    id: 'alex-rivers',
    name: 'Alex Rivers',
    email: 'alex.rivers@example.com',
    avatarUrl: 'https://i.pravatar.cc/150?u=alex-rivers',
    bio: 'Lead photographer specializing in downhill MTB and track cycling across Malaysia and abroad.',
    location: 'Kuala Lumpur, Malaysia',
    status: 'active',
    joinedDate: 'March 1, 2022',
  },
  {
    id: 'marcus-chen',
    name: 'Marcus Chen',
    email: 'marcus.c@example.com',
    avatarUrl: 'https://i.pravatar.cc/150?u=marcus-chen',
    bio: 'Endurance and road cycling specialist covering century rides across the Klang Valley.',
    location: 'Klang Valley, Malaysia',
    status: 'active',
    joinedDate: 'October 12, 2023',
  },
  {
    id: 'sarah-jenkins',
    name: 'Sarah Jenkins',
    email: 'sarah.j@example.com',
    avatarUrl: 'https://i.pravatar.cc/150?u=sarah-jenkins',
    bio: 'Coastal road cycling and touring photography around Penang.',
    location: 'Penang, Malaysia',
    status: 'active',
    joinedDate: 'November 5, 2023',
  },
  {
    id: 'david-lee',
    name: 'David Lee',
    email: 'david.l@example.com',
    avatarUrl: 'https://i.pravatar.cc/150?u=david-lee',
    bio: 'Account suspended pending review.',
    location: 'Malaysia',
    status: 'suspended',
    joinedDate: 'January 22, 2024',
  },
  {
    id: 'unknown-uploader',
    name: 'Unknown User',
    email: 'unverified@example.com',
    avatarUrl: 'https://i.pravatar.cc/150?u=unknown-uploader',
    bio: 'Unverified uploader — not a registered photographer account.',
    location: '—',
    status: 'suspended',
    joinedDate: '—',
  },
];

@Injectable({ providedIn: 'root' })
export class PhotographersService {
  private readonly eventsService = inject(EventsService);
  private readonly photographers = signal<PhotographerSeed[]>(SEED);

  getPhotographers(): IPhotographer[] {
    return this.photographers().map((seed) => this.toPhotographer(seed));
  }

  getPhotographer(id: string): IPhotographer | undefined {
    const seed = this.photographers().find((p) => p.id === id);
    return seed ? this.toPhotographer(seed) : undefined;
  }

  setStatus(id: string, status: PhotographerStatus): void {
    this.photographers.update((list) => list.map((p) => (p.id === id ? { ...p, status } : p)));
  }

  private toPhotographer(seed: PhotographerSeed): IPhotographer {
    const events = this.eventsService.getEventsByPhotographer(seed.id);
    const photosUploaded = events.reduce((sum, e) => sum + this.eventsService.getPhotos(e.id).length, 0);
    return {
      ...seed,
      stats: { eventsShot: events.length, photosUploaded },
    };
  }
}
