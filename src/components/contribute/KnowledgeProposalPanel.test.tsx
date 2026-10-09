import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { KnowledgeProposalPanel } from './KnowledgeProposalPanel';

const proposeKnowledgeResource = vi.fn();
const proposeKnowledgeGap = vi.fn();

vi.mock('@/lib/knowledge-api', () => ({
  proposeKnowledgeResource: (...args: unknown[]) => proposeKnowledgeResource(...args),
  proposeKnowledgeGap: (...args: unknown[]) => proposeKnowledgeGap(...args),
}));
vi.mock('@/contexts/LanguageContext', () => ({ useLanguage: () => ({ t: (key: string) => key, language: 'en' }) }));

describe('KnowledgeProposalPanel', () => {
  beforeEach(() => {
    proposeKnowledgeResource.mockReset();
    proposeKnowledgeGap.mockReset();
  });

  it('sends a resource proposal with the space id', async () => {
    proposeKnowledgeResource.mockResolvedValue('r1');
    const onSubmitted = vi.fn();
    render(<KnowledgeProposalPanel spaceId="s1" onSubmitted={onSubmitted} />);
    fireEvent.click(screen.getByText('contribute.knowledge.proposeResource'));
    fireEvent.change(screen.getByLabelText('contribute.knowledge.proposeTitle'), { target: { value: 'A guide' } });
    fireEvent.change(screen.getByLabelText('contribute.knowledge.proposeSummary'), { target: { value: 'Why it helps' } });
    fireEvent.change(screen.getByLabelText('contribute.knowledge.proposeUrl'), { target: { value: 'https://example.org' } });
    fireEvent.click(screen.getByText('contribute.knowledge.proposeSend'));
    await waitFor(() => expect(proposeKnowledgeResource).toHaveBeenCalledWith({ spaceId: 's1', title: 'A guide', summary: 'Why it helps', externalUrl: 'https://example.org' }));
    await waitFor(() => expect(onSubmitted).toHaveBeenCalled());
    expect(screen.getByTestId('knowledge-proposal-actions')).toBeTruthy();
  });

  it('reports a gap and refuses an empty form', async () => {
    proposeKnowledgeGap.mockResolvedValue('g1');
    render(<KnowledgeProposalPanel spaceId="s1" />);
    fireEvent.click(screen.getByText('contribute.knowledge.reportGap'));
    fireEvent.click(screen.getByText('contribute.knowledge.proposeSend'));
    expect(proposeKnowledgeGap).not.toHaveBeenCalled();
    fireEvent.change(screen.getByLabelText('contribute.knowledge.proposeTitle'), { target: { value: 'Winter heating' } });
    fireEvent.change(screen.getByLabelText('contribute.knowledge.gapDescription'), { target: { value: 'Nothing covers it.' } });
    fireEvent.click(screen.getByText('contribute.knowledge.proposeSend'));
    await waitFor(() => expect(proposeKnowledgeGap).toHaveBeenCalledWith({ spaceId: 's1', title: 'Winter heating', description: 'Nothing covers it.' }));
  });
});
