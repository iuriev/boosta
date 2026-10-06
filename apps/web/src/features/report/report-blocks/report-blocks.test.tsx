import type { ReportBlock } from '@boosta/contracts';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { ReportSection } from './report-blocks';

describe('ReportSection', () => {
  it('renders a text block as a titled paragraph', () => {
    render(
      <ReportSection
        block={{ key: 'summary', type: 'text', title: 'Summary', text: 'In women, ADHD can…' }}
      />,
    );

    expect(screen.getByRole('heading', { level: 2, name: 'Summary' })).toBeInTheDocument();
    expect(screen.getByText('In women, ADHD can…')).toBeInTheDocument();
  });

  it('renders a checklist with its introduction and every item', () => {
    render(
      <ReportSection
        block={{
          key: 'strengths',
          type: 'checklist',
          title: 'Strengths',
          intro: 'You may recognise these.',
          items: ['Creative thinking', 'High energy'],
        }}
      />,
    );

    expect(screen.getByText('You may recognise these.')).toBeInTheDocument();
    expect(screen.getAllByRole('listitem').map((item) => item.textContent)).toEqual([
      'Creative thinking',
      'High energy',
    ]);
  });

  it('renders text with bullets, including the closing paragraph when there is one', () => {
    render(
      <ReportSection
        block={{
          key: 'traits',
          type: 'text-with-bullets',
          title: 'Traits',
          intro: 'Women with ADHD may:',
          items: ['Feel overwhelmed', 'Mask symptoms'],
          outro: 'These are patterns, not a diagnosis.',
        }}
      />,
    );

    expect(screen.getByText('Women with ADHD may:')).toBeInTheDocument();
    expect(screen.getAllByRole('listitem')).toHaveLength(2);
    expect(screen.getByText('These are patterns, not a diagnosis.')).toBeInTheDocument();
  });

  it('renders questions as disclosures with only the first one open', () => {
    render(
      <ReportSection
        block={{
          key: 'faq',
          type: 'faq',
          title: 'FAQ',
          items: [
            { question: 'Is this a diagnosis?', answer: 'No.' },
            { question: 'Can I retake the test?', answer: 'Yes.' },
          ],
        }}
      />,
    );

    expect(screen.getByText('No.').closest('details')).toHaveAttribute('open');
    expect(screen.getByText('Yes.').closest('details')).not.toHaveAttribute('open');
    expect(screen.getByText('Can I retake the test?').closest('summary')).toBeInTheDocument();
  });

  it.each<[string, ReportBlock]>([
    ['a checklist', { key: 'strengths', type: 'checklist', title: 'Strengths', items: [] }],
    ['a list of questions', { key: 'faq', type: 'faq', title: 'FAQ', items: [] }],
  ])('leaves out %s that has no items', (_name, block) => {
    const { container } = render(<ReportSection block={block} />);

    expect(container).toBeEmptyDOMElement();
  });

  it('leaves out a block type added to the API after this build', () => {
    const fromNewerApi = {
      key: 'trend',
      type: 'chart',
      title: 'Your trend',
      points: [40, 55],
    } as unknown as ReportBlock;

    const { container } = render(<ReportSection block={fromNewerApi} />);

    expect(container).toBeEmptyDOMElement();
  });
});
