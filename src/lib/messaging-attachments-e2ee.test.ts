import nacl from 'tweetnacl';
import { describe, expect, it } from 'vitest';

import { buildEncryptedAttachmentLine, decryptAttachmentBytes, encryptAttachmentBytes, parseAttachmentLine } from './messaging-attachments-e2ee';

describe('encrypted attachments', () => {
  it('seals and opens bytes with the shared key only', () => {
    const key = nacl.randomBytes(32);
    const other = nacl.randomBytes(32);
    const bytes = new Uint8Array([1, 2, 3, 4, 5, 250]);
    const sealed = encryptAttachmentBytes(bytes, key);
    expect(sealed.cipher).not.toEqual(bytes);
    expect(Array.from(decryptAttachmentBytes(sealed.cipher, sealed.nonceB64, key) ?? [])).toEqual(Array.from(bytes));
    expect(decryptAttachmentBytes(sealed.cipher, sealed.nonceB64, other)).toBeNull();
  });

  it('builds and parses attachment lines, sealed or plain', () => {
    const line = buildEncryptedAttachmentLine('📎', 'https://files.example/sign?token=abc', 'bm9uY2U=', 'report final.pdf', 'application/pdf');
    const parsed = parseAttachmentLine(line);
    expect(parsed).toEqual({
      prefix: '📎',
      url: 'https://files.example/sign?token=abc',
      encrypted: { nonceB64: 'bm9uY2U=', name: 'report final.pdf', type: 'application/pdf' },
    });
    expect(parseAttachmentLine('📷 https://files.example/photo.jpg')).toEqual({ prefix: '📷', url: 'https://files.example/photo.jpg', encrypted: null });
    expect(parseAttachmentLine('hello https://example.org')).toBeNull();
    expect(parseAttachmentLine('📎 not-a-url')).toBeNull();
  });
});
