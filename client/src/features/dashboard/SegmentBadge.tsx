import type { ReactElement } from 'react';
import type { InsightsSegment } from '../../lib/types';
import './SegmentBadge.css';

export type SegmentBadgeProps = {
  segment: InsightsSegment | null;
};

export function SegmentBadge(props: SegmentBadgeProps): ReactElement | null {
  if (props.segment === null) {
    return null;
  }

  return <span className="segment-pill">{props.segment.label}</span>;
}
