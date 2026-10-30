import { describe, expect, it } from 'vitest';

import { allowedEndpoint } from '../../supabase/functions/public-delivery-open311/endpoint';

describe('Open311 endpoint guard', () => {
  it('calls only https endpoints on public hosts', () => {
    expect(allowedEndpoint('https://city.example.org/open311/v2', false)?.host).toBe('city.example.org');
    expect(allowedEndpoint('http://city.example.org/open311/v2', false)).toBeNull();
    for (const host of ['localhost', '127.0.0.1', '10.1.2.3', '192.168.0.5', '172.18.0.1', '169.254.169.254']) {
      expect(allowedEndpoint(`https://${host}/open311/v2`, false)).toBeNull();
    }
    expect(allowedEndpoint('not a url', false)).toBeNull();
  });

  it('allows plain http and private hosts only when testing locally', () => {
    expect(allowedEndpoint('http://172.18.0.1:4874/open311/v2', true)?.port).toBe('4874');
    expect(allowedEndpoint('ftp://172.18.0.1/x', true)).toBeNull();
  });
});
