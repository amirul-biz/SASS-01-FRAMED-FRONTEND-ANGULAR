import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { HeaderComponent } from '../header/header.component';
import { FooterComponent } from '../footer/footer.component';

@Component({
  selector: 'app-consumer-shell',
  imports: [RouterOutlet, HeaderComponent, FooterComponent],
  templateUrl: './consumer-shell.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ConsumerShellComponent {}
