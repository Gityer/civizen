import { describe, expect, it } from 'vitest';
import {
  decryptSecretKeyBackup,
  encryptSecretKeyBackup,
  generateRecoveryCode,
  isRecoveryCodeShape,
  normalizeRecoveryCode,
} from './messaging-key-backup';

describe('messaging key backup', () => {
  it('generates a 32-character Crockford code in 8 groups and accepts it in any typing', () => {
    const code = generateRecoveryCode();
    expect(code).toMatch(/^([0-9A-HJKMNP-TV-Z]{4}-){7}[0-9A-HJKMNP-TV-Z]{4}$/);
    expect(isRecoveryCodeShape(code)).toBe(true);
    expect(normalizeRecoveryCode(code.toLowerCase().replace(/-/g, ' '))).toBe(normalizeRecoveryCode(code));
    expect(normalizeRecoveryCode('oIl0')).toBe('0110');
    expect(isRecoveryCodeShape('too-short')).toBe(false);
    expect(generateRecoveryCode()).not.toBe(code);
  });

  it('round-trips the secret key, and a wrong code or damaged blob yields null', async () => {
    const secret = crypto.getRandomValues(new Uint8Array(32));
    const code = generateRecoveryCode();
    const blob = await encryptSecretKeyBackup(secret, 'pub-key', code);
    expect(blob.v).toBe(1);
    expect(blob.public_key).toBe('pub-key');
    expect(JSON.stringify(blob)).not.toContain(Buffer.from(secret).toString('base64'));

    const restored = await decryptSecretKeyBackup(blob, code.toLowerCase());
    expect(restored && Buffer.from(restored).equals(Buffer.from(secret))).toBe(true);

    expect(await decryptSecretKeyBackup(blob, generateRecoveryCode())).toBeNull();
    expect(await decryptSecretKeyBackup({ ...blob, ciphertext: blob.ciphertext.slice(0, -4) + 'AAAA' }, code)).toBeNull();
    expect(await decryptSecretKeyBackup({ ...blob, v: 2 }, code)).toBeNull();
  });

  it('uses a fresh salt and iv per backup, so two backups of the same key differ', async () => {
    const secret = crypto.getRandomValues(new Uint8Array(32));
    const code = generateRecoveryCode();
    const a = await encryptSecretKeyBackup(secret, 'pk', code);
    const b = await encryptSecretKeyBackup(secret, 'pk', code);
    expect(a.salt).not.toBe(b.salt);
    expect(a.ciphertext).not.toBe(b.ciphertext);
  });
});
