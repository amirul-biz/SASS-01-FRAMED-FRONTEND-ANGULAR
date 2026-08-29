import { ChangeDetectionStrategy, Component, output, signal } from '@angular/core';

export interface TimeRange {
  from: string;
  to: string;
}

@Component({
  selector: 'app-filter-by-time',
  templateUrl: './filter-by-time.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FilterByTimeComponent {
  readonly fromTime = signal('');
  readonly toTime = signal('');
  readonly timeRangeChange = output<TimeRange>();

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
