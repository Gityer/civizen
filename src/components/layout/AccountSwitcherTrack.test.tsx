import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { AccountSwitcherTrack } from '@/components/layout/AccountSwitcherTrack';
import { accountSwitcherDragScrollLeft, accountSwitcherWheelDelta } from '@/components/layout/account-switcher-scroll';

describe('AccountSwitcherTrack', () => {
  it('uses vertical wheel distance when it is the dominant axis', () => {
    expect(accountSwitcherWheelDelta(0, 40)).toBe(40);
    expect(accountSwitcherWheelDelta(-12, 3)).toBe(-12);
  });

  it('maps a drag offset onto scrollLeft', () => {
    expect(accountSwitcherDragScrollLeft(40, 120, 60)).toBe(100);
  });

  it('scrolls horizontally from a vertical mouse wheel', () => {
    render(
      <AccountSwitcherTrack>
        <div data-testid="card-a">A</div>
        <div data-testid="card-b">B</div>
      </AccountSwitcherTrack>,
    );

    const track = screen.getByTestId('account-switcher-track');
    let scrollLeft = 80;
    Object.defineProperty(track, 'scrollWidth', { configurable: true, value: 800 });
    Object.defineProperty(track, 'clientWidth', { configurable: true, value: 300 });
    Object.defineProperty(track, 'scrollLeft', {
      configurable: true,
      get: () => scrollLeft,
      set: (value) => {
        scrollLeft = Number(value);
      },
    });

    fireEvent.wheel(track, { deltaX: 0, deltaY: 36 });
    expect(scrollLeft).toBe(116);
  });

  it('drags horizontally with a pointer and does not click a card after a swipe', () => {
    const onCardClick = vi.fn();
    render(
      <AccountSwitcherTrack>
        <button type="button" onClick={onCardClick}>
          Neighbor
        </button>
      </AccountSwitcherTrack>,
    );

    const track = screen.getByTestId('account-switcher-track');
    let scrollLeft = 40;
    Object.defineProperty(track, 'scrollWidth', { configurable: true, value: 800 });
    Object.defineProperty(track, 'clientWidth', { configurable: true, value: 300 });
    Object.defineProperty(track, 'scrollLeft', {
      configurable: true,
      get: () => scrollLeft,
      set: (value) => {
        scrollLeft = Number(value);
      },
    });
    track.setPointerCapture = vi.fn();
    track.releasePointerCapture = vi.fn();
    track.hasPointerCapture = vi.fn(() => true);

    const dispatchPointer = (type: string, clientX: number) => {
      const event = new Event(type, { bubbles: true, cancelable: true });
      Object.defineProperty(event, 'pointerId', { value: 1 });
      Object.defineProperty(event, 'clientX', { value: clientX });
      Object.defineProperty(event, 'button', { value: 0 });
      Object.defineProperty(event, 'pointerType', { value: 'touch' });
      track.dispatchEvent(event);
    };

    dispatchPointer('pointerdown', 120);
    dispatchPointer('pointermove', 60);
    expect(scrollLeft).toBe(100);

    dispatchPointer('pointerup', 60);
    fireEvent.click(screen.getByRole('button', { name: 'Neighbor' }));
    expect(onCardClick).not.toHaveBeenCalled();

    dispatchPointer('pointerdown', 60);
    fireEvent.click(screen.getByRole('button', { name: 'Neighbor' }));
    expect(onCardClick).toHaveBeenCalledTimes(1);
  });

  it('keeps a tap without a drag as a card click', () => {
    const onCardClick = vi.fn();
    render(
      <AccountSwitcherTrack>
        <button type="button" onClick={onCardClick}>
          Neighbor
        </button>
      </AccountSwitcherTrack>,
    );

    const track = screen.getByTestId('account-switcher-track');
    Object.defineProperty(track, 'scrollWidth', { configurable: true, value: 800 });
    Object.defineProperty(track, 'clientWidth', { configurable: true, value: 300 });

    fireEvent.click(screen.getByRole('button', { name: 'Neighbor' }));
    expect(onCardClick).toHaveBeenCalledTimes(1);
  });
});
