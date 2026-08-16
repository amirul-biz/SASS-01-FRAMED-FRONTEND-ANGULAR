import { Pipe, PipeTransform } from '@angular/core';

@Pipe({ name: 'range' })
export class RangePipe implements PipeTransform {
  transform(count: number): number[] {
    return Array.from({ length: Math.max(0, count) }, (_, index) => index + 1);
  }
}
