import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { IPhotographer } from '../photographers.service';

@Component({
  selector: 'app-photographer-card',
  imports: [RouterLink],
  templateUrl: './photographer-card.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PhotographerCardComponent {
  photographer = input.required<IPhotographer>();
}
