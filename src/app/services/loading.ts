import { Injectable } from '@angular/core';
import { Subject } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class LoadingService {
  private counter = 0;
  private isLoadingValue = false;

  isLoading$ = new Subject<boolean>();

  show(): void {
    this.counter++;
    if (!this.isLoadingValue) {
      this.isLoadingValue = true;
      this.isLoading$.next(true);
    }
  }

  hide(): void {
    this.counter = Math.max(0, this.counter - 1);
    if (this.isLoadingValue && this.counter === 0) {
      this.isLoadingValue = false;
      this.isLoading$.next(false);
    }
  }

  reset(): void {
    this.counter = 0;
    if (this.isLoadingValue) {
      this.isLoadingValue = false;
      this.isLoading$.next(false);
    }
  }
}
