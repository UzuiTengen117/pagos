import { Component, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './header.html',
  styleUrl: './header.scss',
})
export class Header {
  pageTitle = input<string>('Inicio');
  toggleSidebar = output<void>();

  onToggle(): void {
    this.toggleSidebar.emit();
  }
}
