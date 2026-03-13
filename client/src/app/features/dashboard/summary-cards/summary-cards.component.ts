import { Component, input } from '@angular/core';
import { IonCard, IonCardContent, IonCardHeader, IonCardTitle } from '@ionic/angular/standalone';
import { TaskSummary } from '../insights.service';

@Component({
  selector: 'app-summary-cards',
  standalone: true,
  imports: [IonCard, IonCardHeader, IonCardTitle, IonCardContent],
  template: `
    @if (summary(); as s) {
      <div class="summary-cards">
        <ion-card>
          <ion-card-header>
            <ion-card-title>Total</ion-card-title>
          </ion-card-header>
          <ion-card-content>{{ s.total }}</ion-card-content>
        </ion-card>
        <ion-card>
          <ion-card-header>
            <ion-card-title>Done</ion-card-title>
          </ion-card-header>
          <ion-card-content>{{ s.done }}</ion-card-content>
        </ion-card>
        <ion-card>
          <ion-card-header>
            <ion-card-title>Pending</ion-card-title>
          </ion-card-header>
          <ion-card-content>{{ s.pending }}</ion-card-content>
        </ion-card>
        <ion-card>
          <ion-card-header>
            <ion-card-title>Overdue</ion-card-title>
          </ion-card-header>
          <ion-card-content>{{ s.overdue }}</ion-card-content>
        </ion-card>
        <ion-card>
          <ion-card-header>
            <ion-card-title>Completion rate</ion-card-title>
          </ion-card-header>
          <ion-card-content>{{ (s.completionRate * 100).toFixed(1) }}%</ion-card-content>
        </ion-card>
      </div>
    }
  `,
  styles: `
    .summary-cards {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
      gap: 16px;
      padding: 0;
    }
    ion-card {
      margin: 0;
      --background: var(--tf-card);
      --color: var(--tf-text);
      border-radius: var(--tf-radius);
      box-shadow: var(--tf-shadow-card);
      border: 1px solid var(--tf-border);
      overflow: hidden;
    }
    ion-card-header {
      padding: 16px 16px 8px;
    }
    ion-card-title {
      font-size: 0.75rem;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.04em;
      color: var(--tf-text-muted);
    }
    ion-card-content {
      padding: 8px 16px 16px;
      font-size: 1.5rem;
      font-weight: 700;
      letter-spacing: -0.02em;
      color: var(--tf-text);
    }
  `,
})
export class SummaryCardsComponent {
  readonly summary = input.required<TaskSummary | null>();
}
