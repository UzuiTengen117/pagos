import { Injectable } from '@angular/core';
import { Subject } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class RefreshService {
  private refreshSubject = new Subject<void>();
  readonly refresh$ = this.refreshSubject.asObservable();

  refresh(): void {
    this.refreshSubject.next();
  }
}
