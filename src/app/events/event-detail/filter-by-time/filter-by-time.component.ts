import { ChangeDetectionStrategy, Component, computed, output, signal } from '@angular/core';

export interface TimeRange {
  from: string;
  to: string;
}

interface TimePreset {
  label: string;
  from: string;
  to: string;
}

const TIME_PRESETS: TimePreset[] = [
  { label: 'Morning', from: '06:00', to: '12:00' },
  { label: 'Afternoon', from: '12:00', to: '17:00' },
  { label: 'Evening', from: '17:00', to: '21:00' },
];

@Component({
  selector: 'app-filter-by-time',
  templateUrl: './filter-by-time.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FilterByTimeComponent {
  readonly presets = TIME_PRESETS;
  readonly fromTime = signal('');
  readonly toTime = signal('');
  readonly timeRangeChange = output<TimeRange>();

  readonly hasActiveFilter = computed(() => this.fromTime() !== '' || this.toTime() !== '');

  readonly activeRangeLabel = computed(() => {
    const from = this.fromTime() ? this.formatTime(this.fromTime()) : 'start of day';
    const to = this.toTime() ? this.formatTime(this.toTime()) : 'end of day';
    return `${from} – ${to}`;
  });

  setFromTime(value: string): void {
    this.fromTime.set(value);
    this.emitTimeRange();
  }

  setToTime(value: string): void {
    this.toTime.set(value);
    this.emitTimeRange();
  }

  applyPreset(preset: TimePreset): void {
    const active = this.isPresetActive(preset);
    this.fromTime.set(active ? '' : preset.from);
    this.toTime.set(active ? '' : preset.to);
    this.emitTimeRange();
  }

  clear(): void {
    this.fromTime.set('');
    this.toTime.set('');
    this.emitTimeRange();
  }

  isPresetActive(preset: TimePreset): boolean {
    return this.fromTime() === preset.from && this.toTime() === preset.to;
  }

  private emitTimeRange(): void {
    this.timeRangeChange.emit({ from: this.fromTime(), to: this.toTime() });
  }

  private formatTime(value: string): string {
    const [hourStr, minute] = value.split(':');
    const hour = Number(hourStr);
    if (Number.isNaN(hour)) {
      return value;
    }
    const period = hour < 12 ? 'AM' : 'PM';
    const displayHour = hour % 12 === 0 ? 12 : hour % 12;
    return `${displayHour}:${minute} ${period}`;
  }
}
