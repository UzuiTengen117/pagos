import { Component, inject, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ThemeService } from '../../../services/theme';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './header.html',
  styleUrl: './header.scss',
})
export class Header {
  private themeService = inject(ThemeService);
  pageTitle = input<string>('Inicio');
  toggleSidebar = output<void>();

  isDark = this.themeService.isDark;

  onToggle(): void {
    this.toggleSidebar.emit();
  }

  toggleTheme(): void {
    this.themeService.toggle();
  }
}
