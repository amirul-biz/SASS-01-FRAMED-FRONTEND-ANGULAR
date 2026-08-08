import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { IEvent } from '../../events/events.service';

@Component({
  selector: 'app-event-card',
  imports: [RouterLink],
  templateUrl: './event-card.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EventCardComponent {
  event = input.required<IEvent>();
}
