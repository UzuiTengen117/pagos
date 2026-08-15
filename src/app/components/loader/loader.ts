import { Component, inject, OnDestroy, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subject, takeUntil } from 'rxjs';
import { LoadingService } from '../../services/loading';

@Component({
  selector: 'app-loader',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './loader.html',
  styleUrl: './loader.scss',
})
export class LoaderComponent implements OnDestroy {
  private loading = inject(LoadingService);
  private destroy$ = new Subject<void>();

  visible = signal(false);
  fadingOut = signal(false);
  progress = signal(0);

  readonly kickSrc = 'loader.webp';
  readonly stanceSrc = 'loader2.webp';

  private progressTimer: ReturnType<typeof setInterval> | undefined;
  private fadeOutTimer: ReturnType<typeof setTimeout> | undefined;
  private hideTimer: ReturnType<typeof setTimeout> | undefined;

  constructor() {
    this.loading.isLoading$.pipe(takeUntil(this.destroy$)).subscribe((isLoading) => {
      if (isLoading) {
        this.show();
      } else {
        this.hide();
      }
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    this.clearTimers();
  }

  private show(): void {
    this.clearTimers();
    this.fadingOut.set(false);
    this.visible.set(true);
    this.progress.set(0);

    this.progressTimer = setInterval(() => {
      const current = this.progress();
      if (current >= 92) {
        if (this.progressTimer) clearInterval(this.progressTimer);
        return;
      }
      this.progress.set(Math.min(92, current + 1.5 + Math.random() * 3.5));
    }, 180);
  }

  private hide(): void {
    if (!this.visible()) return;
    if (this.progressTimer) {
      clearInterval(this.progressTimer);
      this.progressTimer = undefined;
    }
    this.progress.set(100);

    this.fadeOutTimer = setTimeout(() => {
      this.fadingOut.set(true);
      this.hideTimer = setTimeout(() => {
        this.visible.set(false);
        this.fadingOut.set(false);
      }, 500);
    }, 250);
  }

  private clearTimers(): void {
    if (this.progressTimer) {
      clearInterval(this.progressTimer);
      this.progressTimer = undefined;
    }
    if (this.fadeOutTimer) {
      clearTimeout(this.fadeOutTimer);
      this.fadeOutTimer = undefined;
    }
    if (this.hideTimer) {
      clearTimeout(this.hideTimer);
      this.hideTimer = undefined;
    }
  }
}
