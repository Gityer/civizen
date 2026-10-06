import { beforeEach, describe, expect, it } from 'vitest';

import { buildErrorReport, resetErrorReportDedupe, shouldReport } from './error-reporting';

describe('error reporting', () => {
  beforeEach(() => resetErrorReportDedupe());

  it('builds a small report without query strings or long stacks', () => {
    const error = new Error('boom');
    error.stack = Array.from({ length: 20 }, (_, i) => `line ${i}`).join('\n');
    const report = buildErrorReport(error, 'render', '/governance/voting/e1?token=secret#x', new Date('2026-10-06T00:00:00Z'));
    expect(report.route).toBe('/governance/voting/e1');
    expect(report.message).toBe('boom');
    expect(report.stack?.split('\n')).toHaveLength(8);
    expect(report.at).toBe('2026-10-06T00:00:00.000Z');
    expect(report.appVersion).toBeTruthy();
  });

  it('accepts non-Error values', () => {
    expect(buildErrorReport('plain string', 'window', '/').message).toBe('plain string');
    expect(buildErrorReport({ code: 42 }, 'promise', '/').message).toBe('{"code":42}');
  });

  it('reports a repeated message only once per minute', () => {
    const report = { kind: 'window' as const, message: 'same' };
    expect(shouldReport(report, 1_000)).toBe(true);
    expect(shouldReport(report, 30_000)).toBe(false);
    expect(shouldReport(report, 70_000)).toBe(true);
    expect(shouldReport({ kind: 'render', message: 'same' }, 70_000)).toBe(true);
  });
});
