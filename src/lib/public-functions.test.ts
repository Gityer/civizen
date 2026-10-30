import { describe, expect, it } from 'vitest';
import { parseCatalog, parseRoute, placeLabel, publicFunctionErrorKey, suggestPublicFunction, type PublicFunction } from './public-functions';

describe('public functions', () => {
  it('parses a route to a body, and a route to the liaison', () => {
    const toBody = parseRoute({ function_key: 'transport', function_name: 'Transport', division_code: '04', liaison_position_key: 'liaison_economic_affairs', liaison_title: 'Liaison: Economic Affairs',
      body: { id: 'b1', name: 'Streets Department', kind: 'local_government', scope_kind: 'locality', scope_country_code: 'TL', scope_locality_code: 'Testville',
              channel_kind: 'service_request_api', channel_address: 'https://311.example.org', answer_deadline_days: 10, source_url: 'https://example.org' } });
    expect(toBody?.body).toMatchObject({ name: 'Streets Department', answerDeadlineDays: 10, scopeRegionCode: null });
    const toLiaison = parseRoute({ function_key: 'public_health', function_name: 'Public health', division_code: '07', liaison_position_key: 'liaison_health', body: null });
    expect(toLiaison?.body).toBeNull();
    expect(toLiaison?.liaisonPositionKey).toBe('liaison_health');
  });

  it('parses the catalogue and labels places planet-first', () => {
    expect(parseCatalog([{ function_key: 'water_supply', name: 'Water supply', division_code: '06', cofog_code: '06.3', origin: 'cofog', verified_bodies: '2' }])[0])
      .toMatchObject({ divisionCode: '06', cofogCode: '06.3', origin: 'cofog', verifiedBodies: 2 });
    expect(placeLabel({ scopeKind: 'global', scopeCountryCode: null, scopeRegionCode: null, scopeLocalityCode: null }, 'Planet Earth')).toBe('Planet Earth');
    expect(placeLabel({ scopeKind: 'locality', scopeCountryCode: 'TL', scopeRegionCode: 'TS', scopeLocalityCode: 'Testville' }, 'x')).toBe('TL / TS / Testville');
    expect(publicFunctionErrorKey('source_required')).toBe('organisation.public.errors.source_required');
  });

  it('suggests the function whose keywords the text mentions', () => {
    const fn = (functionKey: string, keywords: string[]): PublicFunction => ({ functionKey, name: functionKey, description: '', divisionCode: '01',
      divisionName: '', cofogCode: null, origin: 'cofog', keywords, liaisonPositionKey: null, verifiedBodies: 0 });
    const functions = [fn('transport', ['road', 'pothole']), fn('digital_government', ['website', 'data breach'])];
    expect(suggestPublicFunction('Big pothole', 'on the road by my house', functions)?.functionKey).toBe('transport');
    expect(suggestPublicFunction('The city website leaks data', 'a data breach exposed names', functions)?.functionKey).toBe('digital_government');
    expect(suggestPublicFunction('Hello', 'nothing relevant', functions)).toBeNull();
    expect(suggestPublicFunction('roadside', '', functions)).toBeNull();
  });
});
