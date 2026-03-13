import { Component, inject, input, signal, computed, OnInit } from '@angular/core';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import {
  IonHeader,
  IonToolbar,
  IonTitle,
  IonButtons,
  IonButton,
  IonContent,
  IonInput,
  IonTextarea,
  IonSelect,
  IonSelectOption,
  IonItem,
  IonLabel,
  ModalController,
  AlertController,
} from '@ionic/angular/standalone';

import { TasksService, Task, TaskStatus } from '../tasks.service';

@Component({
  selector: 'app-task-form',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonButtons,
    IonButton,
    IonContent,
    IonInput,
    IonTextarea,
    IonSelect,
    IonSelectOption,
    IonItem,
    IonLabel,
  ],
  template: `
    <ion-header>
      <ion-toolbar>
        <ion-title>{{ isEdit() ? 'Edit task' : 'New task' }}</ion-title>
        <ion-buttons slot="end">
          <ion-button type="button" fill="clear" (click)="close()">Cancel</ion-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>
    <ion-content class="task-form-content">
      <form [formGroup]="form" (ngSubmit)="onSubmit()" class="task-form">
        @if (errorMessage()) {
          <p class="error">{{ errorMessage() }}</p>
        }
        <div class="field-group">
          <ion-item lines="none" class="task-form-item">
            <ion-label position="stacked">Title</ion-label>
            <ion-input
              formControlName="title"
              placeholder="Task title"
              type="text"
            />
          </ion-item>
          @if (form.get('title')?.invalid && form.get('title')?.touched) {
            <p class="field-error">Title is required</p>
          }
        </div>
        <div class="field-group">
          <ion-item lines="none" class="task-form-item">
            <ion-label position="stacked">Description <span class="optional">(optional)</span></ion-label>
            <ion-textarea
              formControlName="description"
              placeholder="Task description"
              rows="3"
            />
          </ion-item>
        </div>
        <div class="field-group">
          <ion-item lines="none" class="task-form-item">
            <ion-label position="stacked">Due date <span class="optional">(optional)</span></ion-label>
            <ion-input
              formControlName="dueAt"
              type="datetime-local"
            />
          </ion-item>
        </div>
        @if (isEdit()) {
          <div class="field-group">
            <ion-item lines="none" class="task-form-item">
              <ion-label position="stacked">Status</ion-label>
              <ion-select formControlName="status" placeholder="Status" interface="alert">
                <ion-select-option value="PENDING">Pending</ion-select-option>
                <ion-select-option value="DONE">Done</ion-select-option>
                <ion-select-option value="CANCELED">Canceled</ion-select-option>
              </ion-select>
            </ion-item>
          </div>
        }
        <ion-button
          type="submit"
          expand="block"
          color="primary"
          class="submit-btn"
          [disabled]="form.invalid || saving()"
        >
          {{ saving() ? 'Saving…' : (isEdit() ? 'Save' : 'Create') }}
        </ion-button>
      </form>
    </ion-content>
  `,
  styles: `
    .task-form-content {
      --background: var(--tf-card);
    }
    .task-form {
      padding: 1.25rem 1rem 1.5rem;
      max-width: 28rem;
      margin: 0 auto;
    }
    .task-form .error {
      color: var(--ion-color-danger);
      margin: 0 0 1.25rem 0;
      padding: 0.75rem 1rem;
      background: color-mix(in srgb, var(--ion-color-danger) 12%, transparent);
      border-radius: 8px;
      font-size: 0.875rem;
    }
    .field-group {
      margin-bottom: 1.25rem;
    }
    .field-error {
      color: var(--ion-color-danger);
      font-size: 0.8125rem;
      margin: 0.375rem 0 0;
      padding-left: 0.25rem;
    }
    .task-form-item {
      --background: var(--tf-input-bg);
      --padding-start: 0.75rem;
      --padding-end: 0.75rem;
      --inner-padding-end: 0;
      --min-height: 3rem;
      --border-radius: 8px;
      border: 1px solid var(--tf-border);
      border-radius: 8px;
      margin-bottom: 0;
    }
    .task-form-item:focus-within {
      border-color: var(--tf-primary);
      box-shadow: 0 0 0 2px color-mix(in srgb, var(--tf-primary) 20%, transparent);
    }
    .task-form-item ion-label {
      color: var(--tf-label);
      font-weight: 500;
      margin-bottom: 0.25rem;
    }
    .optional {
      color: var(--tf-text-muted);
      font-weight: 400;
    }
    .submit-btn {
      margin-top: 0.5rem;
      font-weight: 600;
      letter-spacing: 0.02em;
      --padding-top: 0.75rem;
      --padding-bottom: 0.75rem;
    }
  `,
})
export class TaskFormComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly tasksService = inject(TasksService);
  private readonly modalController = inject(ModalController);
  private readonly alertController = inject(AlertController);

  task = input<Task | null>(null);

  readonly form = this.fb.nonNullable.group({
    title: ['', Validators.required],
    description: [''],
    dueAt: [''],
    status: ['PENDING' as TaskStatus],
  });

  readonly saving = signal(false);
  readonly errorMessage = signal<string | null>(null);

  readonly isEdit = computed(() => this.task() != null);

  ngOnInit(): void {
    const t = this.task();
    if (t) {
      const dueAt = t.dueAt
        ? new Date(t.dueAt).toISOString().slice(0, 16)
        : '';
      this.form.reset({
        title: t.title,
        description: t.description ?? '',
        dueAt,
        status: t.status,
      });
    }
  }

  close(): void {
    this.modalController.dismiss(null, 'cancel');
  }

  async onSubmit(): Promise<void> {
    if (this.form.invalid || this.saving()) return;

    if (this.isEdit()) {
      const alert = await this.alertController.create({
        header: 'Save changes?',
        message: 'Save changes to this task?',
        buttons: [
          { text: 'Cancel', role: 'cancel' },
          { text: 'Save', role: 'confirm' },
        ],
      });
      await alert.present();
      const { role } = await alert.onDidDismiss();
      if (role !== 'confirm') return;
    }

    this.errorMessage.set(null);
    this.saving.set(true);

    const { title, description, dueAt, status } = this.form.getRawValue();
    const dueAtOrUndefined = dueAt.trim()
      ? new Date(dueAt).toISOString()
      : undefined;
    const descOrUndefined = description.trim() || undefined;

    const taskId = this.task()?.id;
    if (taskId) {
      this.tasksService
        .updateTask(taskId, {
          title,
          description: descOrUndefined ?? null,
          dueAt: dueAtOrUndefined ?? null,
          status,
        })
        .subscribe({
          next: (saved) => {
            this.saving.set(false);
            this.modalController.dismiss(saved, 'saved');
          },
          error: (err: Error) => {
            this.errorMessage.set(err.message);
            this.saving.set(false);
          },
        });
    } else {
      this.tasksService
        .createTask({
          title,
          description: descOrUndefined,
          dueAt: dueAtOrUndefined,
        })
        .subscribe({
          next: (saved) => {
            this.saving.set(false);
            this.modalController.dismiss(saved, 'saved');
          },
          error: (err: Error) => {
            this.errorMessage.set(err.message);
            this.saving.set(false);
          },
        });
    }
  }
}
