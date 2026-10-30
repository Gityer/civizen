import { describe, expect, it } from 'vitest';
import { deliveryErrorKey, isAnswerLate, parseBodyDetail, parseCoverage, parseMatterPublicStatus } from './public-delivery';

describe('public delivery', () => {
  it('parses a Matter\'s public status with deliveries', () => {
    const status = parseMatterPublicStatus({
      function_key: 'street_lighting', function_name: 'Street lighting', body: { id: 'b', name: 'Streets', answer_deadline_days: 10 }, office: null,
      deliveries: [{ id: 'd', body_name: 'Streets', channel_kind: 'web_form', reference: 'R1', delivered_at: '2026-10-01', answer_due_at: '2026-10-11', status: 'overdue' }],
      candidate_bodies: [], can_handle: true,
    });
    expect(status).toMatchObject({ functionName: 'Street lighting', canHandle: true, body: { answerDeadlineDays: 10 }, deliveries: [{ status: 'overdue', reference: 'R1' }] });
    expect(parseMatterPublicStatus(null)).toBeNull();
  });

  it('knows a late answer', () => {
    const now = Date.parse('2026-10-30T00:00:00Z');
    expect(isAnswerLate({ status: 'delivered', answerDueAt: '2026-10-20T00:00:00Z' }, now)).toBe(true);
    expect(isAnswerLate({ status: 'answered', answerDueAt: '2026-10-20T00:00:00Z' }, now)).toBe(false);
    expect(isAnswerLate({ status: 'delivered', answerDueAt: '2026-11-20T00:00:00Z' }, now)).toBe(false);
  });

  it('parses coverage, a body page and errors', () => {
    expect(parseCoverage([{ function_key: 'transport', name: 'Transport', division_code: '04', status: 'overlap', bodies: [{ id: 'a', name: 'A', scope_kind: 'locality' }] }])[0])
      .toMatchObject({ status: 'overlap', bodies: [{ scopeKind: 'locality' }] });
    expect(parseBodyDetail({ id: 'b', name: 'Streets', scope_kind: 'locality', functions: [{ function_key: 'transport', name: 'Transport' }], offices: [{ position_key: 'office_x', title: 'Desk', held: true }] }))
      .toMatchObject({ functions: [{ functionKey: 'transport' }], offices: [{ held: true }] });
    expect(deliveryErrorKey('no_body')).toBe('organisation.public.delivery.errors.no_body');
  });
});
