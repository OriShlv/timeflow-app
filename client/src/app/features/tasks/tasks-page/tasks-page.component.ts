import { Component, inject, signal, viewChild } from '@angular/core';
import {
  IonContent,
  IonFab,
  IonFabButton,
  IonIcon,
  IonAlert,
  IonToast,
  ModalController,
} from '@ionic/angular/standalone';
import { TasksListComponent } from '../tasks-list/tasks-list.component';
import { TaskFormComponent } from '../task-form/task-form.component';
import { TasksService, Task } from '../tasks.service';

@Component({
  selector: 'app-tasks-page',
  standalone: true,
  imports: [
    TasksListComponent,
    IonContent,
    IonFab,
    IonFabButton,
    IonIcon,
    IonAlert,
    IonToast,
  ],
  template: `
    <ion-content class="tasks-page-content">
      <app-tasks-list
        #list
        (editTask)="onEditTask($event)"
        (deleteTask)="onDeleteTask($event)"
      />
      <ion-fab slot="fixed" vertical="bottom" horizontal="end">
        <ion-fab-button type="button" aria-label="Create task" (click)="openCreateForm()">
          <ion-icon name="add" />
        </ion-fab-button>
      </ion-fab>
    </ion-content>
    <ion-alert
      [isOpen]="deleteAlertOpen()"
      header="Delete task"
      [message]="deleteMessage()"
      [buttons]="deleteButtons"
      (didDismiss)="onDeleteAlertDismiss($event)"
    />
    <ion-toast
      [isOpen]="!!toastMessage()"
      [message]="toastMessage()"
      duration="2500"
      (didDismiss)="toastMessage.set('')"
    />
  `,
  styles: `
    .tasks-page-content {
      background: var(--tf-bg);
      --background: var(--tf-bg);
      --color: var(--tf-text);
      --padding-top: calc(var(--app-header-height, 56px) + 1rem);
      --padding-bottom: 6rem;
    }
    ion-fab-button {
      --background: var(--tf-primary);
      --background-activated: var(--tf-primary-hover);
      --background-hover: var(--tf-primary-hover);
      --color: #fff;
      --box-shadow: var(--tf-shadow-card);
    }
    ion-fab {
      margin-bottom: calc(env(safe-area-inset-bottom) + 0.75rem);
      margin-right: 1rem;
      z-index: 20;
    }
  `,
})
export class TasksPageComponent {
  private readonly tasksService = inject(TasksService);
  private readonly modalController = inject(ModalController);

  protected list = viewChild<TasksListComponent>('list');

  readonly deleteAlertOpen = signal(false);
  readonly taskToDelete = signal<Task | null>(null);
  readonly toastMessage = signal('');

  protected readonly deleteMessage = () => {
    const t = this.taskToDelete();
    return t ? `Delete "${t.title}"?` : '';
  };

  protected readonly deleteButtons = [
    { text: 'Cancel', role: 'cancel' as const },
    { text: 'Delete', role: 'destructive' as const, handler: () => this.confirmDelete() },
  ];

  async openCreateForm(): Promise<void> {
    await this.presentFormModal(null);
  }

  async onEditTask(task: Task): Promise<void> {
    await this.presentFormModal(task);
  }

  onDeleteTask(task: Task): void {
    this.taskToDelete.set(task);
    this.deleteAlertOpen.set(true);
  }

  onDeleteAlertDismiss(ev: CustomEvent): void {
    this.deleteAlertOpen.set(false);
    if (ev.detail.role === 'backdrop') {
      this.taskToDelete.set(null);
    }
  }

  private async presentFormModal(task: Task | null): Promise<void> {
    const isEdit = task != null;
    const modal = await this.modalController.create({
      component: TaskFormComponent,
      componentProps: { task },
    });
    await modal.present();
    const { data, role } = await modal.onDidDismiss<Task>();
    if (role === 'saved' && data) {
      this.list()?.load();
      this.toastMessage.set(isEdit ? 'Task updated' : 'Task created');
    }
  }

  private confirmDelete(): void {
    const task = this.taskToDelete();
    if (!task) return;
    this.tasksService.deleteTask(task.id).subscribe({
      next: () => {
        this.taskToDelete.set(null);
        this.list()?.load();
      },
      error: () => {
        this.taskToDelete.set(null);
      },
    });
  }
}
