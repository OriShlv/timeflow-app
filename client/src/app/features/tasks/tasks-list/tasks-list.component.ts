import { Component, inject, signal, OnInit, output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import {
  IonSearchbar,
  IonSelect,
  IonSelectOption,
  IonButton,
} from '@ionic/angular/standalone';

import { TasksService, Task, TaskStatus, ListTasksParams } from '../tasks.service';

const STATUS_OPTIONS: { value: TaskStatus | ''; label: string }[] = [
  { value: '', label: 'All' },
  { value: 'PENDING', label: 'Pending' },
  { value: 'DONE', label: 'Done' },
  { value: 'CANCELED', label: 'Canceled' },
];

@Component({
  selector: 'app-tasks-list',
  standalone: true,
  imports: [
    FormsModule,
    IonSearchbar,
    IonSelect,
    IonSelectOption,
    IonButton,
  ],
  template: `
    <div class="tasks-list">
      <section class="filters-section">
        <ion-searchbar
          [value]="searchQuery()"
          (ionInput)="onSearchInput($event)"
          placeholder="Search tasks"
          debounce="300"
          class="search-bar"
        />
        <div class="filters-row">
          <ion-select
            [value]="statusFilter()"
            (ionChange)="onStatusChange($event)"
            placeholder="Status"
            interface="popover"
            class="filter-select"
          >
            @for (opt of statusOptions; track opt.value) {
              <ion-select-option [value]="opt.value">{{ opt.label }}</ion-select-option>
            }
          </ion-select>
          <input
            type="date"
            [value]="fromDate()"
            (change)="onFromChange($event)"
            class="date-input"
            title="From"
          />
          <span class="date-sep">–</span>
          <input
            type="date"
            [value]="toDate()"
            (change)="onToChange($event)"
            class="date-input"
            title="To"
          />
          <ion-button fill="outline" size="small" (click)="clearFilters()">Clear</ion-button>
          <ion-button size="small" (click)="applyFilters()">Apply</ion-button>
        </div>
      </section>

      @if (error()) {
        <div class="error-banner">{{ error() }}</div>
      }

      @if (!loading() && tasks().length > 0) {
        <div class="progress-bar-wrap">
          <div class="progress-bar" role="progressbar" [attr.aria-valuenow]="doneCount()" [attr.aria-valuemax]="tasks().length">
            <div class="progress-fill" [style.width.%]="progressPercent()"></div>
          </div>
          <span class="progress-label">{{ doneCount() }} of {{ tasks().length }} done</span>
        </div>
      }

      <div class="task-cards">
        @for (task of tasks(); track task.id) {
          <article class="task-card" [class.task-done]="task.status === 'DONE'">
            <div class="task-card-status" [attr.data-status]="task.status"></div>
            <div class="task-card-body">
              <h3 class="task-title">{{ task.title }}</h3>
              @if (task.description) {
                <p class="task-desc">{{ task.description }}</p>
              }
              @if (task.dueAt) {
                <p class="task-due">{{ formatDue(task.dueAt) }}</p>
              }
              <div class="task-card-footer">
                <span class="status-pill" [attr.data-status]="task.status">{{ statusLabel(task.status) }}</span>
                <div class="task-actions">
                  <ion-button type="button" fill="clear" size="small" (click)="editTask.emit(task)">Edit</ion-button>
                  <ion-button type="button" fill="clear" size="small" color="danger" (click)="deleteTask.emit(task); $event.stopPropagation()">Delete</ion-button>
                </div>
              </div>
            </div>
          </article>
        } @empty {
          @if (!loading()) {
            <div class="empty-state">No tasks yet</div>
          }
        }
      </div>

      @if (totalPages() > 1) {
        <div class="pagination">
          <ion-button fill="outline" size="small" [disabled]="page() <= 1" (click)="goToPage(page() - 1)">Prev</ion-button>
          <span class="page-info">Page {{ page() }} of {{ totalPages() }}</span>
          <ion-button fill="outline" size="small" [disabled]="page() >= totalPages()" (click)="goToPage(page() + 1)">Next</ion-button>
        </div>
      }
    </div>
  `,
  styles: `
    .tasks-list {
      --background: var(--tf-bg);
      --color: var(--tf-text);
      color-scheme: light;
      padding: 0 1rem 1rem;
      max-width: 720px;
      margin: 0 auto;
    }
    .filters-section {
      background: var(--tf-card);
      border-radius: var(--tf-radius);
      box-shadow: var(--tf-shadow-card);
      padding: 1rem;
      margin-bottom: 1rem;
    }
    .filters-section .search-bar {
      padding: 0;
      --background: var(--tf-input-bg);
      --border-radius: var(--tf-radius-sm);
    }
    .filters-row {
      display: flex;
      align-items: center;
      flex-wrap: wrap;
      gap: 0.5rem;
      margin-top: 0.75rem;
    }
    .filter-select {
      min-width: 120px;
    }
    .date-input {
      padding: 0.4rem 0.5rem;
      border: 1px solid var(--tf-border);
      border-radius: var(--tf-radius-sm);
      font-size: 0.875rem;
      background: var(--tf-input-bg);
      color: var(--tf-text);
    }
    .date-sep { color: var(--tf-text-muted); font-size: 0.875rem; }
    .error-banner {
      background: color-mix(in srgb, var(--ion-color-danger) 12%, transparent);
      color: var(--ion-color-danger);
      padding: 0.75rem 1rem;
      border-radius: var(--tf-radius-sm);
      margin-bottom: 1rem;
      font-size: 0.875rem;
    }
    .progress-bar-wrap {
      margin-bottom: 1rem;
    }
    .progress-bar {
      height: 6px;
      background: var(--tf-border);
      border-radius: 3px;
      overflow: hidden;
      margin-bottom: 0.25rem;
    }
    .progress-fill {
      height: 100%;
      background: var(--tf-primary);
      border-radius: 3px;
      transition: width 0.2s ease;
    }
    .progress-label {
      font-size: 0.8125rem;
      color: var(--tf-text-muted);
    }
    .task-cards { display: flex; flex-direction: column; gap: 0.75rem; }
    .task-card {
      display: flex;
      background: var(--tf-card);
      border-radius: var(--tf-radius);
      box-shadow: var(--tf-shadow-card);
      overflow: hidden;
      border: 1px solid var(--tf-border);
    }
    .task-card-status {
      width: 4px;
      flex-shrink: 0;
      background: var(--tf-primary);
    }
    .task-card-status[data-status="DONE"] { background: var(--ion-color-success); }
    .task-card-status[data-status="CANCELED"] { background: var(--tf-text-muted); }
    .task-card-body { flex: 1; padding: 1rem; min-width: 0; }
    .task-title {
      margin: 0 0 0.25rem 0;
      font-size: 1rem;
      font-weight: 600;
      color: var(--tf-text);
      letter-spacing: -0.01em;
    }
    .task-done .task-title { text-decoration: line-through; color: var(--tf-text-muted); }
    .task-desc {
      margin: 0 0 0.5rem 0;
      font-size: 0.875rem;
      color: var(--tf-text-muted);
      line-height: 1.4;
    }
    .task-due {
      margin: 0 0 0.5rem 0;
      font-size: 0.8125rem;
      color: var(--tf-text-muted);
    }
    .task-card-footer {
      display: flex;
      align-items: center;
      justify-content: space-between;
      flex-wrap: wrap;
      gap: 0.5rem;
      margin-top: 0.5rem;
      padding-top: 0.5rem;
      border-top: 1px solid var(--tf-border);
    }
    .status-pill {
      font-size: 0.75rem;
      font-weight: 500;
      padding: 0.2rem 0.5rem;
      border-radius: 999px;
      background: color-mix(in srgb, var(--tf-primary) 18%, transparent);
      color: var(--tf-primary);
    }
    .status-pill[data-status="DONE"] {
      background: color-mix(in srgb, var(--ion-color-success) 18%, transparent);
      color: var(--ion-color-success);
    }
    .status-pill[data-status="CANCELED"] {
      background: var(--tf-border);
      color: var(--tf-text-muted);
    }
    .task-actions { display: flex; gap: 0; }
    .empty-state {
      text-align: center;
      padding: 2rem 1rem;
      color: var(--tf-text-muted);
      font-size: 0.9375rem;
    }
    .pagination {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 1rem;
      margin-top: 1.25rem;
    }
    .page-info { font-size: 0.875rem; color: var(--tf-text-muted); }
  `,
})
export class TasksListComponent implements OnInit {
  private readonly tasksService = inject(TasksService);

  readonly editTask = output<Task>();
  readonly deleteTask = output<Task>();

  readonly statusOptions = STATUS_OPTIONS;
  readonly searchQuery = signal('');
  readonly statusFilter = signal<TaskStatus | ''>('');
  readonly fromDate = signal('');
  readonly toDate = signal('');
  readonly page = signal(1);
  readonly pageSize = signal(20);
  readonly totalPages = signal(1);
  readonly total = signal(0);

  readonly tasks = signal<Task[]>([]);
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.error.set(null);
    const params: ListTasksParams = {
      page: this.page(),
      pageSize: this.pageSize(),
      sort: 'createdAt',
      order: 'desc',
    };
    const q = this.searchQuery().trim();
    if (q) params.q = q;
    const status = this.statusFilter();
    if (status) params.status = status;
    const from = this.fromDate();
    if (from) params.from = `${from}T00:00:00.000Z`;
    const to = this.toDate();
    if (to) params.to = `${to}T23:59:59.999Z`;

    this.tasksService.getTasks(params).subscribe({
      next: (result) => {
        this.tasks.set(result.items);
        this.totalPages.set(result.totalPages);
        this.total.set(result.total);
        this.loading.set(false);
      },
      error: (err: Error) => {
        this.error.set(err.message);
        this.loading.set(false);
      },
    });
  }

  onSearchInput(ev: Event): void {
    const e = ev as CustomEvent<{ value: string }>;
    this.searchQuery.set(e.detail?.value ?? '');
    this.page.set(1);
    this.load();
  }

  onStatusChange(ev: Event): void {
    const e = ev as CustomEvent<{ value: TaskStatus | '' }>;
    this.statusFilter.set(e.detail?.value ?? '');
  }

  onFromChange(ev: Event): void {
    const target = ev.target as HTMLInputElement;
    this.fromDate.set(target.value ?? '');
  }

  onToChange(ev: Event): void {
    const target = ev.target as HTMLInputElement;
    this.toDate.set(target.value ?? '');
  }

  clearFilters(): void {
    this.searchQuery.set('');
    this.statusFilter.set('');
    this.fromDate.set('');
    this.toDate.set('');
    this.page.set(1);
  }

  applyFilters(): void {
    this.page.set(1);
    this.load();
  }

  goToPage(p: number): void {
    if (p < 1 || p > this.totalPages()) return;
    this.page.set(p);
    this.load();
  }

  doneCount = () => this.tasks().filter((t) => t.status === 'DONE').length;
  progressPercent = () => {
    const n = this.tasks().length;
    return n === 0 ? 0 : (this.doneCount() / n) * 100;
  };

  statusLabel(status: TaskStatus): string {
    switch (status) {
      case 'DONE':
        return 'Done';
      case 'CANCELED':
        return 'Canceled';
      default:
        return 'Pending';
    }
  }

  formatDue(dueAt: string): string {
    const d = new Date(dueAt);
    return d.toLocaleDateString(undefined, {
      dateStyle: 'short',
      timeStyle: 'short',
    });
  }
}
