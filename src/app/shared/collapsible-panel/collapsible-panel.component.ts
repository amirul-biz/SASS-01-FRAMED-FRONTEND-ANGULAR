import { ChangeDetectionStrategy, Component, input, signal } from '@angular/core';

// Wraps a sidebar panel (Filter by Time, Find Your Photos) in a card that is always expanded at
// `lg` and up, and a tap-to-expand accordion below it — on mobile the sidebar stacks above the
// photo grid, so keeping every panel permanently open would push the first photo ~900px down.
@Component({
  selector: 'app-collapsible-panel',
  templateUrl: './collapsible-panel.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CollapsiblePanelComponent {
  title = input.required<string>();

  // Only read below `lg` — the template's `lg:block` keeps the body visible at `lg`+ regardless.
  readonly expanded = signal(false);

  toggle(): void {
    this.expanded.update((v) => !v);
  }
}
