import { ChangeDetectionStrategy, Component, computed, input, output, signal } from '@angular/core';

export type PageWindowEntry = number | 'ellipsis';

// Always keeps page 1, the last page, and a run of `radius` pages either side of the current one
// — the rest collapse into a single "…" marker instead of one button per page (a plain 1..N list
// would render 134 buttons for a 4000-photo gallery at 30/page).
export function buildPageWindow(current: number, total: number, radius = 2): PageWindowEntry[] {
  if (total <= 0) {
    return [];
  }
  const keep = new Set<number>([1, total]);
  for (let p = current - radius; p <= current + radius; p++) {
    if (p >= 1 && p <= total) {
      keep.add(p);
    }
  }
  const sorted = [...keep].sort((a, b) => a - b);
  const result: PageWindowEntry[] = [];
  for (let i = 0; i < sorted.length; i++) {
    if (i > 0 && sorted[i] - sorted[i - 1] > 1) {
      result.push('ellipsis');
    }
    result.push(sorted[i]);
  }
  return result;
}

// event-detail.component.html renders this component twice (above and below the grid) — a
// module-level counter gives each instance unique DOM ids so their <label for> bindings and
// screen readers resolve to the right control instead of always the first instance.
let nextInstanceId = 0;

@Component({
  selector: 'app-paginator',
  templateUrl: './paginator.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PaginatorComponent {
  readonly uid = nextInstanceId++;

  pageNumber = input.required<number>();
  totalPageCount = input.required<number>();
  pageSize = input.required<number>();
  pageSizeOptions = input.required<readonly number[]>();

  pageNumberChange = output<number>();
  pageSizeChange = output<number>();

  readonly pageWindow = computed(() => buildPageWindow(this.pageNumber(), this.totalPageCount()));

  // "Go to page" is a free-typed draft, not bound straight to pageNumber, so an in-progress
  // keystroke (e.g. clearing "3" before typing "30") doesn't fire a navigation on every digit.
  readonly goToDraft = signal('');

  onPageSizeChange(event: globalThis.Event): void {
    this.pageSizeChange.emit(Number((event.target as HTMLSelectElement).value));
  }

  goToPage(page: number): void {
    if (page !== this.pageNumber()) {
      this.pageNumberChange.emit(page);
    }
  }

  onGoToInput(event: globalThis.Event): void {
    this.goToDraft.set((event.target as HTMLInputElement).value);
  }

  commitGoTo(): void {
    const raw = Number(this.goToDraft());
    this.goToDraft.set('');
    if (!Number.isInteger(raw)) {
      return;
    }
    const clamped = Math.min(Math.max(raw, 1), this.totalPageCount());
    this.goToPage(clamped);
  }
}
