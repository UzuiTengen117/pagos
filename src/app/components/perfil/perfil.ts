import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../services/auth';
import { Usuario } from '../../models/usuario.model';

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

@Component({
  selector: 'app-perfil',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './perfil.html',
  styleUrl: './perfil.scss',
})
export class Perfil implements OnInit {
  private authService = inject(AuthService);

  usuario = signal<Usuario | null>(null);
  nombre = '';
  primerApellido = '';
  segundoApellido = '';
  email = '';
  username = '';

  currentPassword = '';
  newPassword = '';
  confirmNewPassword = '';



  photoPreview = signal<string>('');
  selectedFile = signal<File | null>(null);

  uploadingPhoto = signal(false);
  savingProfile = signal(false);
  changingPassword = signal(false);

  photoError = signal('');
  profileError = signal('');
  profileSuccess = signal('');
  passwordError = signal('');
  passwordSuccess = signal('');

  ngOnInit(): void {
    const user = this.authService.currentUser();
    if (user) {
      this.usuario.set(user);
      this.nombre = user.nombre;
      this.primerApellido = user.primerApellido;
      this.segundoApellido = user.segundoApellido;
      this.email = user.email;
      this.username = user.username;
      if (user.foto) {
        this.photoPreview.set(user.foto);
      }
    }
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (!input.files || input.files.length === 0) return;

    const file = input.files[0];
    this.photoError.set('');

    if (!ALLOWED_TYPES.includes(file.type)) {
      this.photoError.set('Formato no permitido. Usa JPG, PNG o WEBP.');
      input.value = '';
      return;
    }

    this.compressImage(file).then(compressed => {
      this.selectedFile.set(compressed);
      const reader = new FileReader();
      reader.onload = () => {
        this.photoPreview.set(reader.result as string);
      };
      reader.readAsDataURL(compressed);
    });
  }

  private compressImage(file: File): Promise<File> {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = () => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const MAX_WIDTH = 1200;
          const MAX_HEIGHT = 1200;
          let { width, height } = img;

          if (width > MAX_WIDTH || height > MAX_HEIGHT) {
            if (width > height) {
              height = (height / width) * MAX_WIDTH;
              width = MAX_WIDTH;
            } else {
              width = (width / height) * MAX_HEIGHT;
              height = MAX_HEIGHT;
            }
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d')!;
          ctx.drawImage(img, 0, 0, width, height);
          canvas.toBlob((blob) => {
            if (blob) {
              resolve(new File([blob], file.name, { type: 'image/jpeg', lastModified: Date.now() }));
            } else {
              resolve(file);
            }
          }, 'image/jpeg', 0.8);
        };
        img.src = reader.result as string;
      };
      reader.readAsDataURL(file);
    });
  }

  uploadPhoto(): void {
    const file = this.selectedFile();
    if (!file) return;

    this.uploadingPhoto.set(true);
    this.photoError.set('');

    this.authService.uploadPhoto(file).subscribe({
      next: () => {
        this.uploadingPhoto.set(false);
        this.selectedFile.set(null);
      },
      error: (err) => {
        this.uploadingPhoto.set(false);
        this.photoError.set(err.error?.message || 'Error al subir la foto.');
      },
    });
  }

  removePhotoPreview(): void {
    this.photoPreview.set(this.usuario()?.foto || '');
    this.selectedFile.set(null);
    this.photoError.set('');
  }

  deletePhoto(): void {
    this.uploadingPhoto.set(true);
    this.photoError.set('');

    this.authService.deletePhoto().subscribe({
      next: () => {
        this.uploadingPhoto.set(false);
        this.photoPreview.set('');
        this.selectedFile.set(null);
        this.usuario.set(this.authService.currentUser());
      },
      error: (err) => {
        this.uploadingPhoto.set(false);
        this.photoError.set(err.error?.message || 'Error al eliminar la foto.');
      },
    });
  }

  saveProfile(): void {
    const user = this.usuario();
    if (!user) return;

    if (!this.nombre.trim() || !this.email.trim() || !this.username.trim()) {
      this.profileError.set('Nombre, usuario y correo son obligatorios.');
      return;
    }

    this.savingProfile.set(true);
    this.profileError.set('');
    this.profileSuccess.set('');

    const updated: Usuario = {
      ...user,
      nombre: this.nombre.trim(),
      primerApellido: this.primerApellido.trim(),
      segundoApellido: this.segundoApellido.trim(),
      email: this.email.trim(),
      username: this.username.trim(),
    };

    this.authService.updateProfile(updated).subscribe({
      next: () => {
        this.savingProfile.set(false);
        this.profileSuccess.set('Perfil actualizado correctamente.');
        this.usuario.set(this.authService.currentUser());
      },
      error: (err) => {
        this.savingProfile.set(false);
        this.profileError.set(err.error?.message || 'Error al actualizar el perfil.');
      },
    });
  }

  changePassword(): void {
    if (!this.currentPassword || !this.newPassword || !this.confirmNewPassword) {
      this.passwordError.set('Completa todos los campos de contraseña.');
      return;
    }

    if (this.newPassword.length < 6) {
      this.passwordError.set('La nueva contraseña debe tener al menos 6 caracteres.');
      return;
    }

    if (this.newPassword !== this.confirmNewPassword) {
      this.passwordError.set('Las contraseñas no coinciden.');
      return;
    }

    this.changingPassword.set(true);
    this.passwordError.set('');
    this.passwordSuccess.set('');

    this.authService.changePassword(this.currentPassword, this.newPassword).subscribe({
      next: () => {
        this.changingPassword.set(false);
        this.passwordSuccess.set('Contraseña cambiada correctamente.');
        this.currentPassword = '';
        this.newPassword = '';
        this.confirmNewPassword = '';
      },
      error: (err) => {
        this.changingPassword.set(false);
        this.passwordError.set(err.error?.message || 'Error al cambiar la contraseña. Verifica la contraseña actual.');
      },
    });
  }

  get initials(): string {
    const u = this.usuario();
    if (!u) return '';
    return `${u.nombre?.charAt(0) || ''}${u.primerApellido?.charAt(0) || ''}`.toUpperCase();
  }
}
