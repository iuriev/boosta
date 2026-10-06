import type { Report } from '@boosta/contracts';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { ReportView } from './report-view';

const REPORT: Report = {
  score: 70,
  level: 'high',
  levelLabel: 'High ADHD Traits',
  gender: 'female',
  submittedAt: '2026-10-06T09:00:00.000Z',
  sections: [
    { key: 'summary', type: 'text', title: 'Summary', text: 'Summary text' },
    { key: 'strengths', type: 'checklist', title: 'Strengths', items: ['Creative thinking'] },
    { key: 'trend', type: 'chart', title: 'Trend' } as unknown as Report['sections'][number],
    { key: 'faq', type: 'faq', title: 'FAQ', items: [{ question: 'Why?', answer: 'Because.' }] },
  ],
};

describe('ReportView', () => {
  it('shows the score and the level', () => {
    render(<ReportView report={REPORT} />);

    expect(screen.getByRole('heading', { level: 1, name: 'Your ADHD score' })).toBeInTheDocument();
    expect(screen.getByText('High ADHD Traits')).toBeInTheDocument();
    expect(screen.getByRole('figure')).toHaveTextContent('Score: 70 / 100');
  });

  it('renders the sections in the order the API sent them, skipping one it cannot render', () => {
    render(<ReportView report={REPORT} />);

    expect(
      screen.getAllByRole('heading', { level: 2 }).map((heading) => heading.textContent),
    ).toEqual(['Summary', 'Strengths', 'FAQ']);
  });

  it.each([
    [130, '100 / 100'],
    [-5, '0 / 100'],
  ])('keeps a score of %i inside the scale', (score, shown) => {
    render(<ReportView report={{ ...REPORT, score }} />);

    expect(screen.getByRole('figure')).toHaveTextContent(shown);
  });
});
