import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { ConsumerShellComponent } from './consumer-shell.component';

describe('ConsumerShellComponent', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [ConsumerShellComponent],
      providers: [provideRouter([])],
    });
  });

  it('renders the header and footer', () => {
    const fixture = TestBed.createComponent(ConsumerShellComponent);
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('app-header')).toBeTruthy();
    expect(compiled.querySelector('app-footer')).toBeTruthy();
  });
});
