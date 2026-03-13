import { Component, input } from '@angular/core';
import {
  IonCard,
  IonCardHeader,
  IonCardTitle,
  IonCardContent,
  IonGrid,
  IonRow,
  IonCol,
} from '@ionic/angular/standalone';
import { InsightsDaily } from '../insights.service';

@Component({
  selector: 'app-daily-stats',
  standalone: true,
  imports: [
    IonCard,
    IonCardHeader,
    IonCardTitle,
    IonCardContent,
    IonGrid,
    IonRow,
    IonCol,
  ],
  template: `
    @if (daily(); as d) {
      <ion-card>
        <ion-card-header>
          <ion-card-title>Daily stats ({{ formatDay(d.day) }})</ion-card-title>
        </ion-card-header>
        <ion-card-content>
          <ion-grid>
            <ion-row>
              <ion-col size="6"><strong>Created</strong></ion-col>
              <ion-col size="6">{{ d.createdCount }}</ion-col>
            </ion-row>
            <ion-row>
              <ion-col size="6"><strong>Completed</strong></ion-col>
              <ion-col size="6">{{ d.completedCount }}</ion-col>
            </ion-row>
            <ion-row>
              <ion-col size="6"><strong>Completion rate</strong></ion-col>
              <ion-col size="6">{{ (d.completionRate * 100).toFixed(1) }}%</ion-col>
            </ion-row>
            <ion-row>
              <ion-col size="6"><strong>With due date</strong></ion-col>
              <ion-col size="6">{{ d.tasksWithDueAt }}</ion-col>
            </ion-row>
            <ion-row>
              <ion-col size="6"><strong>Overdue</strong></ion-col>
              <ion-col size="6">{{ d.overdueCount }}</ion-col>
            </ion-row>
            <ion-row>
              <ion-col size="6"><strong>Avg completion lag (h)</strong></ion-col>
              <ion-col size="6">{{ d.avgCompletionLagH.toFixed(1) }}</ion-col>
            </ion-row>
          </ion-grid>
        </ion-card-content>
      </ion-card>
    }
  `,
  styles: `
    ion-card {
      margin: 0;
      --background: var(--tf-card);
      --color: var(--tf-text);
      border-radius: var(--tf-radius);
      box-shadow: var(--tf-shadow-card);
      border: 1px solid var(--tf-border);
    }
    ion-card-header {
      padding: 16px 16px 8px;
    }
    ion-card-title {
      font-size: 0.875rem;
      font-weight: 600;
      color: var(--tf-text-muted);
    }
    ion-card-content {
      padding: 8px 16px 16px;
    }
    ion-row + ion-row {
      margin-top: 8px;
    }
  `,
})
export class DailyStatsComponent {
  readonly daily = input.required<InsightsDaily | null>();

  formatDay(day: string): string {
    return new Date(day).toLocaleDateString(undefined, {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    });
  }
}
