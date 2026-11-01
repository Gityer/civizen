import { describe, expect, it } from 'vitest';
import { averageDescriptor, classifyMove, descriptorDistance, eyeAspectRatio, nextLivenessState, yawRatio, type Move } from './face-checks';

/** A synthetic 68-point face: edges at x=0 and x=100, eyes at y=40, chin at y=100; the nose and eyelids move. */
function face({ noseX = 50, noseY = 70, eyeOpen = 6 }: { noseX?: number; noseY?: number; eyeOpen?: number }) {
  const points = Array.from({ length: 68 }, () => ({ x: 50, y: 50 }));
  points[0] = { x: 0, y: 50 };
  points[16] = { x: 100, y: 50 };
  points[8] = { x: 50, y: 100 };
  points[30] = { x: noseX, y: noseY };
  const eye = (start: number, cx: number) => {
    points[start] = { x: cx - 10, y: 40 };
    points[start + 1] = { x: cx - 4, y: 40 - eyeOpen / 2 };
    points[start + 2] = { x: cx + 4, y: 40 - eyeOpen / 2 };
    points[start + 3] = { x: cx + 10, y: 40 };
    points[start + 4] = { x: cx + 4, y: 40 + eyeOpen / 2 };
    points[start + 5] = { x: cx - 4, y: 40 + eyeOpen / 2 };
  };
  eye(36, 30);
  eye(42, 70);
  return points;
}

describe('face checks', () => {
  const baseline = { yaw: 0.5, pitch: 0.5 };
  it('reads head moves against the neutral pose', () => {
    expect(yawRatio(face({}))).toBeCloseTo(0.5);
    expect(classifyMove(face({}), baseline)).toBeNull();
    expect(classifyMove(face({ noseX: 70 }), baseline)).toBe('left');
    expect(classifyMove(face({ noseX: 30 }), baseline)).toBe('right');
    expect(classifyMove(face({ noseY: 60 }), baseline)).toBe('up');
    expect(classifyMove(face({ noseY: 80 }), baseline)).toBe('down');
  });

  it('sees closed eyes', () => {
    expect(eyeAspectRatio(face({ eyeOpen: 1 }))).toBeLessThan(eyeAspectRatio(face({ eyeOpen: 6 })) * 0.7);
  });

  it('counts the requested moves in order, each after returning to neutral', () => {
    const requested: Move[] = ['left', 'left'];
    let state = { done: 0, neutral: false };
    for (const move of [null, 'left', 'left', 'left', null, 'right', 'left'] as (Move | null)[]) state = nextLivenessState(state, requested, move);
    expect(state.done).toBe(2);
    let other = { done: 0, neutral: false };
    for (const move of [null, 'right', null, 'up'] as (Move | null)[]) other = nextLivenessState(other, ['left', 'up'], move);
    expect(other.done).toBe(0);
  });

  it('compares face descriptors', () => {
    const a = new Float32Array([0, 0, 0]);
    const b = new Float32Array([3, 4, 0]);
    expect(descriptorDistance(a, b)).toBe(5);
    expect(Array.from(averageDescriptor([a, b]) ?? [])).toEqual([1.5, 2, 0]);
    expect(averageDescriptor([])).toBeNull();
  });
});
