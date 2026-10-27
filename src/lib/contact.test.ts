import { describe, expect, it } from 'vitest';
import { contactEmail } from './contact';

describe('contactEmail', () => {
  it('uses a configured address and ignores empty or malformed ones', () => {
    expect(contactEmail({ VITE_CONTACT_EMAIL: ' hello@example.org ' })).toBe('hello@example.org');
    expect(contactEmail({})).toBeNull();
    expect(contactEmail({ VITE_CONTACT_EMAIL: '' })).toBeNull();
    expect(contactEmail({ VITE_CONTACT_EMAIL: 'not an address' })).toBeNull();
  });
});
