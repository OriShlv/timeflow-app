import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { IonContent } from '@ionic/angular/standalone';

@Component({
  selector: 'app-login-page',
  standalone: true,
  imports: [IonContent, RouterLink],
  template: `
    <ion-content>
      <p>Login page (form placeholder)</p>
      <a routerLink="/register">Register</a>
    </ion-content>
  `,
})
export class LoginPageComponent {}
