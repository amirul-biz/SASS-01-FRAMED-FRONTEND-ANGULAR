import { ChangeDetectionStrategy, Component, output, signal } from '@angular/core';

type SearchTab = 'plate' | 'ai';

export interface TimeRange {
  from: string;
  to: string;
}

@Component({
  selector: 'app-find-your-photos',
  templateUrl: './find-your-photos.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FindYourPhotosComponent {
  readonly activeTab = signal<SearchTab>('plate');
  readonly plateSearch = output<string>();

  readonly fromTime = signal('');
  readonly toTime = signal('');
  readonly timeRangeChange = output<TimeRange>();

  setTab(tab: SearchTab): void {
    this.activeTab.set(tab);
  }

  search(value: string): void {
    this.plateSearch.emit(value);
  }

  setFromTime(value: string): void {
    this.fromTime.set(value);
    this.emitTimeRange();
  }

  setToTime(value: string): void {
    this.toTime.set(value);
    this.emitTimeRange();
  }

  private emitTimeRange(): void {
    this.timeRangeChange.emit({ from: this.fromTime(), to: this.toTime() });
  }
}
