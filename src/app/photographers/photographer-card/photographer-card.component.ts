import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ClientTopPhotographer } from '../../client/client.service';

const AVATAR_FALLBACK_BASE = 'https://i.pravatar.cc/300?u=';

@Component({
  selector: 'app-photographer-card',
  imports: [RouterLink],
  templateUrl: './photographer-card.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PhotographerCardComponent {
  photographer = input.required<ClientTopPhotographer>();

  avatarUrl(): string {
    const photographer = this.photographer();
    return photographer.profileImageUrl ?? `${AVATAR_FALLBACK_BASE}${photographer.id}`;
  }
}
