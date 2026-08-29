import { ChangeDetectionStrategy, Component, input, output, signal } from '@angular/core';

type SearchTab = 'plate' | 'ai';

@Component({
  selector: 'app-find-your-photos',
  templateUrl: './find-your-photos.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FindYourPhotosComponent {
  readonly disabledSearch = input(false);
  readonly activeTab = signal<SearchTab>('plate');
  readonly plateSearch = output<string>();

  setTab(tab: SearchTab): void {
    this.activeTab.set(tab);
  }

  search(value: string): void {
    this.plateSearch.emit(value);
  }
}
