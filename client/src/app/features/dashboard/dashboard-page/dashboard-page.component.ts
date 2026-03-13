import { Component, inject, signal, OnInit } from '@angular/core';
import {
  IonContent,
  IonRefresher,
  IonRefresherContent,
  IonFab,
  IonFabButton,
  IonIcon,
  IonToast,
  ModalController,
  RefresherCustomEvent,
} from '@ionic/angular/standalone';
import { SummaryCardsComponent } from '../summary-cards/summary-cards.component';
import { RecommendationsListComponent } from '../recommendations-list/recommendations-list.component';
import { SegmentBadgeComponent } from '../segment-badge/segment-badge.component';
import { DailyStatsComponent } from '../daily-stats/daily-stats.component';
import { InsightsService, Insights } from '../insights.service';
import { TaskFormComponent } from '../../tasks/task-form/task-form.component';

@Component({
  selector: 'app-dashboard-page',
  standalone: true,
  imports: [
    IonContent,
    IonRefresher,
    IonRefresherContent,
    IonFab,
    IonFabButton,
    IonIcon,
    IonToast,
    SummaryCardsComponent,
    RecommendationsListComponent,
    SegmentBadgeComponent,
    DailyStatsComponent,
    TaskFormComponent,
  ],
  template: `
    <ion-content class="dashboard-content">
      <ion-refresher slot="fixed" (ionRefresh)="onRefresh($event)">
        <ion-refresher-content />
      </ion-refresher>
      <div class="dashboard-inner">
        <header class="dashboard-header">
          <h1 class="dashboard-title">Dashboard</h1>
          <p class="dashboard-subtitle">Your task overview</p>
        </header>
        @if (insights()?.segment; as seg) {
          <div class="dashboard-actions">
            <span class="segment-wrap">
              <app-segment-badge [segment]="seg" />
            </span>
          </div>
        }
        <section class="overview-section">
          <h2 class="section-title">Overview</h2>
          <app-summary-cards [summary]="insights()?.taskSummary ?? null" />
        </section>
        @if (insights()?.daily; as dailyData) {
          <section class="daily-section">
            <app-daily-stats [daily]="dailyData" />
          </section>
        }
        <section class="recommendations-section">
          <h2 class="section-title">Recommendations</h2>
          <app-recommendations-list
            [recommendations]="insights()?.recommendations ?? []"
          />
        </section>
      </div>
      <ion-fab slot="fixed" vertical="bottom" horizontal="end">
        <ion-fab-button type="button" aria-label="Add task" (click)="openCreateTask()">
          <ion-icon name="add" />
        </ion-fab-button>
      </ion-fab>
    </ion-content>
    <ion-toast
      [isOpen]="!!toastMessage()"
      [message]="toastMessage()"
      duration="2500"
      (didDismiss)="toastMessage.set('')"
    />
  `,
  styles: `
    .dashboard-content {
      background: var(--tf-bg);
      --background: var(--tf-bg);
      --color: var(--tf-text);
    }
    .dashboard-inner {
      padding: calc(var(--app-header-height, 56px) + 24px) 24px 6rem;
      max-width: 960px;
      margin: 0 auto;
      min-height: 100%;
    }
    .dashboard-header {
      margin-bottom: 24px;
    }
    .dashboard-title {
      margin: 0 0 4px 0;
      font-size: 1.75rem;
      font-weight: 700;
      letter-spacing: -0.02em;
      color: var(--tf-text);
    }
    .dashboard-subtitle {
      margin: 0;
      font-size: 0.9375rem;
      color: var(--tf-text-muted);
    }
    .dashboard-actions {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 12px;
      margin-bottom: 28px;
    }
    .segment-wrap {
      display: inline-flex;
    }
    .overview-section,
    .daily-section {
      margin-bottom: 28px;
    }
    .section-title {
      margin: 0 0 16px 0;
      font-size: 1rem;
      font-weight: 700;
      letter-spacing: -0.01em;
      color: var(--tf-text);
    }
    .recommendations-section {
      margin-top: 8px;
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
export class DashboardPageComponent implements OnInit {
  private readonly insightsService = inject(InsightsService);
  private readonly modalController = inject(ModalController);

  readonly insights = signal<Insights | null>(null);
  readonly toastMessage = signal('');

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.insightsService.getInsights().subscribe({
      next: (data) => this.insights.set(data),
      error: () => {},
    });
  }

  onRefresh(ev: RefresherCustomEvent): void {
    this.insightsService.getInsights().subscribe({
      next: (data) => {
        this.insights.set(data);
        ev.detail.complete();
      },
      error: () => ev.detail.complete(),
    });
  }

  async openCreateTask(): Promise<void> {
    const modal = await this.modalController.create({
      component: TaskFormComponent,
      componentProps: { task: null },
    });
    await modal.present();
    const { data, role } = await modal.onDidDismiss();
    if (role === 'saved' && data) {
      this.load();
      this.toastMessage.set('Task created');
    }
  }
}
