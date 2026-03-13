import { Component, inject } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import {
  IonApp,
  IonMenu,
  IonMenuToggle,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
  IonList,
  IonItem,
  IonLabel,
  IonIcon,
} from '@ionic/angular/standalone';
import { IonRouterOutlet } from '@ionic/angular/standalone';

import { AuthService } from './core/auth/auth.service';

@Component({
  selector: 'app-root',
  imports: [
    IonApp,
    IonMenu,
    IonMenuToggle,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonContent,
    IonList,
    IonItem,
    IonLabel,
    IonIcon,
    IonRouterOutlet,
    RouterLink,
  ],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss',
})
export class AppComponent {
  readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  onLogout(): void {
    this.auth.logout();
    this.router.navigate(['/login']);
  }
}
