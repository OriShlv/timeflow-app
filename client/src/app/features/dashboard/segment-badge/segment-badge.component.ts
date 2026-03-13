import { Component, input } from '@angular/core';
import { InsightsSegment } from '../insights.service';

@Component({
  selector: 'app-segment-badge',
  standalone: true,
  imports: [],
  template: `
    @if (segment(); as seg) {
      <span class="segment-pill">{{ seg.label }}</span>
    }
  `,
  styles: `
    :host {
      display: inline-block;
    }
    .segment-pill {
      display: inline-flex;
      align-items: center;
      padding: 8px 14px;
      border-radius: 999px;
      background: var(--tf-primary-light);
      color: var(--tf-primary);
      font-size: 0.8125rem;
      font-weight: 600;
    }
  `,
})
export class SegmentBadgeComponent {
  readonly segment = input.required<InsightsSegment | null>();
}
