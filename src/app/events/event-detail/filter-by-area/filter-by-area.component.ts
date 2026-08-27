import { ChangeDetectionStrategy, Component, input, output, signal } from '@angular/core';
import { AreaCount } from '../../events.service';

@Component({
  selector: 'app-filter-by-area',
  templateUrl: './filter-by-area.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FilterByAreaComponent {
  areaCounts = input.required<AreaCount[]>();
  disabled = input(false);
  selectionChange = output<Set<string>>();

  private readonly selected = signal<Set<string>>(new Set());

  isChecked(areaId: string): boolean {
    return this.selected().has(areaId);
  }

  toggle(areaId: string): void {
    const next = new Set(this.selected());
    if (next.has(areaId)) {
      next.delete(areaId);
    } else {
      next.add(areaId);
    }
    this.selected.set(next);
    this.selectionChange.emit(next);
  }
}
