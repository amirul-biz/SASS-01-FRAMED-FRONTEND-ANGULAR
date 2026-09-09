import { ChangeDetectionStrategy, Component, ElementRef, computed, forwardRef, input, signal, viewChild } from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';

// Dropdown with a type-to-filter search — used where the option list is long enough (categories,
// future lookups) that a native <select> scan is tedious. CVA-based so it plugs into Reactive
// Forms with plain formControlName.
@Component({
  selector: 'app-searchable-select',
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => SearchableSelectComponent),
      multi: true,
    },
  ],
  templateUrl: './searchable-select.component.html',
  host: {
    '(document:click)': 'onOutsideClick($event)',
  },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SearchableSelectComponent implements ControlValueAccessor {
  readonly options = input.required<string[]>();
  readonly placeholder = input<string>('Select...');

  readonly value = signal('');
  readonly isOpen = signal(false);
  readonly draft = signal('');

  readonly filteredOptions = computed(() => {
    const query = this.draft().trim().toLowerCase();
    const options = this.options();
    if (!query) {
      return options;
    }
    return options.filter((option) => option.toLowerCase().includes(query));
  });

  private readonly searchInput = viewChild<ElementRef<HTMLInputElement>>('searchInput');
  private onChange: (value: string) => void = () => {};
  private touched: () => void = () => {};
  private isDisabled = false;

  open(): void {
    if (this.isDisabled || this.isOpen()) {
      return;
    }
    this.isOpen.set(true);
    this.draft.set('');
    // Focus after the panel renders — the input is always in the DOM, but the frame delay avoids
    // the focus being swallowed by Angular's re-render on OnPush.
    setTimeout(() => this.searchInput()?.nativeElement.focus());
  }

  onInput(event: Event): void {
    this.draft.set((event.target as HTMLInputElement).value);
  }

  select(option: string): void {
    this.value.set(option);
    this.isOpen.set(false);
    this.onChange(option);
    this.markTouched();
  }

  selectFirst(): void {
    const first = this.filteredOptions()[0];
    if (first) {
      this.select(first);
    }
  }

  close(): void {
    this.isOpen.set(false);
  }

  onOutsideClick(event: MouseEvent): void {
    if (this.isOpen() && !this.elementRef.nativeElement.contains(event.target)) {
      this.isOpen.set(false);
    }
  }

  writeValue(value: string): void {
    this.value.set(value ?? '');
  }

  registerOnChange(fn: (value: string) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.touched = fn;
  }

  markTouched(): void {
    this.touched();
  }

  setDisabledState(isDisabled: boolean): void {
    this.isDisabled = isDisabled;
  }

  constructor(private readonly elementRef: ElementRef) {}
}
