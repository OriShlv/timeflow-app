import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { IonContent } from '@ionic/angular/standalone';

@Component({
  selector: 'app-register-page',
  standalone: true,
  imports: [IonContent, RouterLink],
  template: `
    <ion-content>
      <p>Register page (form placeholder)</p>
      <a routerLink="/login">Login</a>
    </ion-content>
  `,
})
export class RegisterPageComponent {}
