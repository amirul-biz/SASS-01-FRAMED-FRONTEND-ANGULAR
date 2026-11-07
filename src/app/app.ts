import { Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { InstallBannerComponent } from './shared/install-banner/install-banner.component';
import { PwaService } from './core/pwa.service';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, InstallBannerComponent],
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App {
  // Injecting registers the service worker (production builds only).
  private readonly pwa = inject(PwaService);
}
