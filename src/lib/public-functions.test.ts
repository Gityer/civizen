import { describe, expect, it } from 'vitest';
import { parseCatalog, parseRoute, placeLabel, publicFunctionErrorKey } from './public-functions';

describe('public functions', () => {
  it('parses a route to a body, and a route to the liaison', () => {
    const toBody = parseRoute({ authority_id: 'transport', authority_name: 'Transport', liaison_position_key: 'liaison_places', liaison_title: 'Liaison: Places',
      body: { id: 'b1', name: 'Streets Department', kind: 'local_government', scope_kind: 'locality', scope_country_code: 'TL', scope_locality_code: 'Testville',
              channel_kind: 'service_request_api', channel_address: 'https://311.example.org', answer_deadline_days: 10, source_url: 'https://example.org' } });
    expect(toBody?.body).toMatchObject({ name: 'Streets Department', answerDeadlineDays: 10, scopeRegionCode: null });
    const toLiaison = parseRoute({ authority_id: 'health', authority_name: 'Health', liaison_position_key: 'liaison_health_social', body: null });
    expect(toLiaison?.body).toBeNull();
    expect(toLiaison?.liaisonPositionKey).toBe('liaison_health_social');
  });

  it('parses the catalogue and labels places planet-first', () => {
    expect(parseCatalog([{ authority_id: 'water', name: 'Water', function_group: 'planet', verified_bodies: '2' }])[0]).toMatchObject({ group: 'planet', verifiedBodies: 2 });
    expect(placeLabel({ scopeKind: 'global', scopeCountryCode: null, scopeRegionCode: null, scopeLocalityCode: null }, 'Planet Earth')).toBe('Planet Earth');
    expect(placeLabel({ scopeKind: 'locality', scopeCountryCode: 'TL', scopeRegionCode: 'TS', scopeLocalityCode: 'Testville' }, 'x')).toBe('TL / TS / Testville');
    expect(publicFunctionErrorKey('source_required')).toBe('organisation.public.errors.source_required');
  });
});
