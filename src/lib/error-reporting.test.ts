import { beforeEach, describe, expect, it, vi } from 'vitest';

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

describe('sending reports', () => {
  it('sends to Civizen\'s collector when no endpoint is configured', async () => {
    const rpc = vi.fn().mockResolvedValue({ data: null, error: null });
    vi.doMock('@/integrations/supabase/client', () => ({ supabase: { rpc } }));
    vi.stubEnv('VITE_ERROR_REPORT_ENDPOINT', '');
    const { reportError, resetErrorReportDedupe: reset } = await import('./error-reporting');
    reset();
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    reportError(new Error('collector check'), 'window');
    await vi.waitFor(() => expect(rpc).toHaveBeenCalledTimes(1));
    expect(rpc.mock.calls[0][0]).toBe('record_client_error');
    expect(rpc.mock.calls[0][1].p_report).toMatchObject({ kind: 'window', message: 'collector check' });
    vi.unstubAllEnvs();
    vi.doUnmock('@/integrations/supabase/client');
  });
});
