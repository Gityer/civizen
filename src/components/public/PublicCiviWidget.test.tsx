import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { PublicCiviWidget } from '@/components/public/PublicCiviWidget';
import { panelSizeAfterEdgeDrag, panelSizeAfterNwDrag, civiBubbleIsTailed, scrollTopForLastExchange } from '@/components/public/civi-widget-layout';
import { CIVI_AVATAR_STORAGE_KEY, setCiviAvatarId } from '@/lib/civi-avatar';
import { baseTranslations, translateMessage } from '@/lib/i18n';

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    t: (key: string, vars?: Record<string, string | number>) => translateMessage(baseTranslations, key, vars),
    language: 'en',
  }),
}));

vi.mock('@/lib/civi-public', async () => {
  const actual = await vi.importActual<typeof import('@/lib/civi-public')>('@/lib/civi-public');
  return {
    ...actual,
    askCiviPublic: vi.fn(async () => 'Civizen is an open participatory system.'),
  };
});

describe('PublicCiviWidget', () => {
  beforeEach(() => {
    window.sessionStorage.clear();
    window.localStorage.removeItem(CIVI_AVATAR_STORAGE_KEY);
    window.localStorage.removeItem('civizen.public-civi-size');
    setCiviAvatarId('c');
  });

  it('opens a public Civi chat without requiring sign-in', async () => {
    render(
      <MemoryRouter>
        <PublicCiviWidget />
      </MemoryRouter>,
    );

    fireEvent.click(screen.getByTestId('public-civi-open'));
    expect(screen.getByTestId('public-civi-panel')).toBeInTheDocument();
    expect(screen.getByText('Civi. Your')).toBeInTheDocument();
    expect(screen.getByText('AI')).toBeInTheDocument();
    expect(screen.getByText('Assistant')).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText('Ask about Civizen'), {
      target: { value: 'What is Civizen?' },
    });
    fireEvent.click(screen.getByLabelText('Send'));

    expect(await screen.findByText('Civizen is an open participatory system.')).toBeInTheDocument();
    expect(screen.getByTestId('civi-chat-bubble-user').className).toContain('civi-chat-bubble--user');
    expect(screen.getByTestId('civi-chat-bubble-user').className).toContain('civi-chat-bubble--tailed');
    expect(screen.getByTestId('civi-chat-bubble-assistant').className).toContain('civi-chat-bubble--assistant');
    expect(screen.getByTestId('civi-chat-bubble-assistant').className).toContain('civi-chat-bubble--tailed');
    expect(screen.getByTestId('civi-chat-tail-user')).toBeInTheDocument();
    expect(screen.getByTestId('civi-chat-tail-assistant')).toBeInTheDocument();
    const userTailClass = screen.getByTestId('civi-chat-tail-user').getAttribute('class') ?? '';
    const assistantTailClass = screen.getByTestId('civi-chat-tail-assistant').getAttribute('class') ?? '';
    expect(userTailClass).toContain('top-0');
    expect(userTailClass).toContain('-right-2');
    expect(assistantTailClass).toContain('top-0');
    expect(assistantTailClass).toContain('-left-2');
  });

  it('puts a tail only on the first bubble in a same-sender run', () => {
    const run = [{ role: 'user' }, { role: 'user' }, { role: 'assistant' }, { role: 'assistant' }];
    expect(civiBubbleIsTailed(run, 0)).toBe(true);
    expect(civiBubbleIsTailed(run, 1)).toBe(false);
    expect(civiBubbleIsTailed(run, 2)).toBe(true);
    expect(civiBubbleIsTailed(run, 3)).toBe(false);
  });

  it('enlarges the panel when the upper-left corner is dragged left and up', () => {
    const next = panelSizeAfterNwDrag({ width: 352, height: 448 }, 400, 400, 280, 280);
    expect(next.width).toBeGreaterThan(352);
    expect(next.height).toBeGreaterThan(448);
  });

  it('changes only height from the top edge and only width from the left edge', () => {
    const taller = panelSizeAfterEdgeDrag({ width: 352, height: 448 }, 200, 400, 200, 300, 'n');
    expect(taller.width).toBe(352);
    expect(taller.height).toBeGreaterThan(448);
    const wider = panelSizeAfterEdgeDrag({ width: 352, height: 448 }, 400, 200, 280, 200, 'w');
    expect(wider.width).toBeGreaterThan(352);
    expect(wider.height).toBe(448);
  });

  it('keeps the last question and answer in view when they fit', () => {
    expect(scrollTopForLastExchange(80, 200, 160)).toBe(40);
    expect(scrollTopForLastExchange(80, 400, 160)).toBe(80);
  });

  it('lets visitors resize from the top and left edges and hides the message scrollbar', () => {
    render(
      <MemoryRouter>
        <PublicCiviWidget />
      </MemoryRouter>,
    );
    fireEvent.click(screen.getByTestId('public-civi-open'));

    const corner = screen.getByTestId('public-civi-resize');
    expect(corner.className).toMatch(/rounded-tl-2xl/);
    expect(screen.getByTestId('public-civi-resize-n')).toBeInTheDocument();
    expect(screen.getByTestId('public-civi-resize-w')).toBeInTheDocument();

    const thread = screen.getByTestId('public-civi-thread');
    expect(thread.className).toContain('civi-thread-scroll');
    expect(thread.className).toContain('touch-pan-y');
    expect(thread.style.scrollbarWidth).toBe('none');
  });
});
