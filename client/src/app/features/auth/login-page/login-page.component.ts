import { Component, inject } from '@angular/core';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import {
  IonContent,
  IonInput,
  IonButton,
  ViewWillEnter,
} from '@ionic/angular/standalone';

import { AuthService } from '../../../core/auth/auth.service';

@Component({
  selector: 'app-login-page',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    RouterLink,
    IonContent,
    IonInput,
    IonButton,
  ],
  template: `
    <ion-content class="auth-page">
      <div class="auth-form-container">
        <div class="auth-card">
          <form [formGroup]="form" (ngSubmit)="onSubmit()" class="login-form">
            <h1>Log in</h1>
            <p class="greeting">Nice to see you again</p>
            @if (errorMessage) {
              <p class="error">{{ errorMessage }}</p>
            }
            <div class="form-fields">
          <div class="form-field">
            <label for="email">Email</label>
            <div class="input-wrap">
            <ion-input
              id="email"
              formControlName="email"
              type="email"
              autocomplete="email"
              placeholder="you@example.com"
            />
            </div>
          </div>
          @if (form.get('email')?.invalid && form.get('email')?.touched) {
            <p class="field-error">Valid email is required</p>
          }
          <div class="form-field">
            <label for="password">Password</label>
            <div class="input-wrap">
            <ion-input
              id="password"
              formControlName="password"
              type="password"
              autocomplete="current-password"
              placeholder="Min 8 characters"
            />
            </div>
          </div>
          @if (form.get('password')?.invalid && form.get('password')?.touched) {
            <p class="field-error">Password must be at least 8 characters</p>
          }
        </div>
        <ion-button
          type="submit"
          expand="block"
          [disabled]="form.invalid || loading"
        >
          {{ loading ? 'Logging in…' : 'Log in' }}
        </ion-button>
        <p class="register-link">
          Don't have an account?
          <a routerLink="/register">Register</a>
        </p>
      </form>
        </div>
      </div>
    </ion-content>
  `,
  styles: `
    .auth-page {
      --background: var(--tf-bg-start);
    }
    .auth-form-container {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      min-height: 100dvh;
      box-sizing: border-box;
      padding: 2rem 1rem;
    }
    .auth-card {
      background: var(--tf-card);
      color-scheme: light;
      border-radius: 16px;
      box-shadow: 0 8px 32px rgba(0, 0, 0, 0.12), 0 2px 8px rgba(0, 0, 0, 0.06);
      border: 1px solid var(--tf-border);
      padding: 2rem;
      width: 100%;
      max-width: 420px;
    }
    .login-form {
      width: 100%;
    }
    h1 {
      margin: 0 0 0.25rem 0;
      font-size: 2rem;
      font-weight: 700;
      color: var(--tf-text);
    }
    .greeting {
      margin: 0 0 1.5rem 0;
      color: var(--tf-text);
      font-size: 1rem;
      opacity: 0.9;
    }
    .error {
      color: var(--ion-color-danger);
      margin: 0 0 1rem 0;
    }
    .field-error {
      color: var(--ion-color-danger);
      font-size: 0.875rem;
      margin: -0.5rem 0 1rem 1rem;
    }
    .form-fields {
      display: flex;
      flex-direction: column;
      gap: 0;
    }
    .form-field {
      margin-bottom: 1rem;
    }
    .form-field label {
      display: block;
      color: var(--tf-label);
      font-size: 0.9375rem;
      font-weight: 600;
      margin-bottom: 0.5rem;
    }
    .input-wrap {
      background: var(--tf-input-bg);
      border-radius: 8px;
      border: 1px solid var(--tf-border);
    }
    ion-input {
      --background: transparent;
      --color: var(--tf-input-text);
      --placeholder-color: var(--tf-text-muted);
      --padding-top: 0.75rem;
      --padding-bottom: 0.75rem;
      --padding-start: 1rem;
      --padding-end: 1rem;
      display: block;
    }
    ion-button {
      margin-top: 1.25rem;
      --padding-top: 1rem;
      --padding-bottom: 1rem;
      --background: var(--tf-primary);
      --background-hover: var(--tf-primary-hover);
      --background-activated: var(--tf-primary-hover);
    }
    .register-link {
      margin-top: 1.5rem;
      text-align: center;
      color: var(--tf-text);
    }
    .register-link a {
      color: var(--tf-primary);
      text-decoration: none;
      font-weight: 500;
    }
    .register-link a:hover {
      text-decoration: underline;
    }
  `,
})
export class LoginPageComponent implements ViewWillEnter {
  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  form = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(8)]],
  });

  loading = false;
  errorMessage: string | null = null;

  ionViewWillEnter(): void {
    this.form.reset({ email: '', password: '' });
    this.errorMessage = null;
    this.loading = false;
  }

  onSubmit(): void {
    if (this.form.invalid || this.loading) {
      return;
    }
    this.errorMessage = null;
    this.loading = true;
    const { email, password } = this.form.getRawValue();
    this.auth.login(email, password).subscribe({
      next: () => {
        this.router.navigate(['/dashboard']);
      },
      error: (err: Error) => {
        this.loading = false;
        this.errorMessage = err.message;
      },
    });
  }
}
