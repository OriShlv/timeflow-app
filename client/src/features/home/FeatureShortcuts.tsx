import type { ReactElement } from 'react';
import { useNavigate } from 'react-router-dom';

import { Card } from '../../components/ui/Card';
import './FeatureShortcuts.css';

type FeatureItem = {
  id: string;
  title: string;
  description: string;
  path: string;
  accent: string;
};

const FEATURES: FeatureItem[] = [
  {
    id: 'today',
    title: 'Today',
    description: 'Urgent tasks and focus sessions',
    path: '/today',
    accent: 'feature-shortcut--today',
  },
  {
    id: 'tasks',
    title: 'Tasks',
    description: 'Create, filter, and complete work',
    path: '/tasks',
    accent: 'feature-shortcut--tasks',
  },
  {
    id: 'insights',
    title: 'Insights',
    description: 'Trends, stats, and recommendations',
    path: '/insights',
    accent: 'feature-shortcut--insights',
  },
  {
    id: 'profile',
    title: 'Profile',
    description: 'Account and preferences',
    path: '/profile',
    accent: 'feature-shortcut--profile',
  },
];

export function FeatureShortcuts(): ReactElement {
  const navigate = useNavigate();

  return (
    <section className="feature-shortcuts" aria-label="App features">
      <h2 className="feature-shortcuts__title">Explore Timeflow</h2>
      <div className="feature-shortcuts__grid">
        {FEATURES.map((feature) => (
          <button
            key={feature.id}
            type="button"
            className={`feature-shortcut ${feature.accent}`}
            onClick={() => navigate(feature.path)}
          >
            <Card className="feature-shortcut__card">
              <span className="feature-shortcut__name">{feature.title}</span>
              <span className="feature-shortcut__desc">{feature.description}</span>
            </Card>
          </button>
        ))}
      </div>
    </section>
  );
}
