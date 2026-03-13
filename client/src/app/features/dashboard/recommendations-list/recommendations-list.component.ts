import { Component, input } from '@angular/core';
import { InsightsRecommendation } from '../insights.service';

@Component({
  selector: 'app-recommendations-list',
  standalone: true,
  imports: [],
  template: `
    <div class="recommendations-card">
      @for (rec of recommendations(); track rec.id) {
        <div class="rec-item">
          <p class="rec-message">{{ rec.message }}</p>
          @if (rec.evidence) {
            <p class="rec-evidence">{{ formatEvidence(rec.evidence) }}</p>
          }
        </div>
      }
      @empty {
        <p class="rec-empty">No recommendations yet.</p>
      }
    </div>
  `,
  styles: `
    .recommendations-card {
      background: var(--tf-card);
      border-radius: var(--tf-radius);
      box-shadow: var(--tf-shadow-card);
      border: 1px solid var(--tf-border);
      padding: 20px;
    }
    .rec-item {
      padding: 12px 0;
      border-bottom: 1px solid var(--tf-border);
    }
    .rec-item:last-child {
      border-bottom: none;
      padding-bottom: 0;
    }
    .rec-item:first-child {
      padding-top: 0;
    }
    .rec-message {
      margin: 0;
      font-size: 0.9375rem;
      font-weight: 500;
      color: var(--tf-text);
    }
    .rec-evidence {
      margin: 4px 0 0 0;
      font-size: 0.8125rem;
      color: var(--tf-text-muted);
    }
    .rec-empty {
      margin: 0;
      font-size: 0.9375rem;
      color: var(--tf-text-muted);
    }
  `,
})
export class RecommendationsListComponent {
  readonly recommendations = input.required<InsightsRecommendation[]>();

  formatEvidence(evidence: unknown): string {
    if (typeof evidence === 'string') return evidence;
    if (evidence != null && typeof evidence === 'object') {
      return JSON.stringify(evidence);
    }
    return '';
  }
}
