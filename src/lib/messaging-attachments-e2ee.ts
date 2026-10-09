import nacl from 'tweetnacl';

/**
 * Attachments in end-to-end encrypted chats (Phase 7 step 7.1). The file bytes are sealed with the thread's shared
 * key before upload; the message line carries the signed URL plus the nonce, name and type in its fragment, and the
 * line itself travels inside the encrypted message, so storage holds ciphertext and the server never sees the key.
 */
export const ATTACHMENT_PREFIXES = ['📎', '📷', '🎤'] as const;
const E2EE_MARK = 'e2ee=';

const bytesToBase64 = (bytes: Uint8Array): string => {
  let binary = '';
  for (let i = 0; i < bytes.length; i += 1) binary += String.fromCharCode(bytes[i]);
  return btoa(binary);
};
const base64ToBytes = (value: string): Uint8Array | null => {
  try {
    const raw = atob(value);
    const out = new Uint8Array(raw.length);
    for (let i = 0; i < raw.length; i += 1) out[i] = raw.charCodeAt(i);
    return out;
  } catch {
    return null;
  }
};

export function encryptAttachmentBytes(bytes: Uint8Array, sharedKey: Uint8Array): { nonceB64: string; cipher: Uint8Array } {
  const nonce = nacl.randomBytes(nacl.secretbox.nonceLength);
  return { nonceB64: bytesToBase64(nonce), cipher: nacl.secretbox(bytes, nonce, sharedKey) };
}

export function decryptAttachmentBytes(cipher: Uint8Array, nonceB64: string, sharedKey: Uint8Array): Uint8Array | null {
  const nonce = base64ToBytes(nonceB64);
  if (!nonce) return null;
  return nacl.secretbox.open(cipher, nonce, sharedKey);
}

export type AttachmentLine = {
  prefix: string;
  url: string;
  encrypted: { nonceB64: string; name: string; type: string } | null;
};

export function buildEncryptedAttachmentLine(prefix: string, signedUrl: string, nonceB64: string, name: string, type: string): string {
  const params = new URLSearchParams({ nonce: nonceB64, name, type });
  return `${prefix} ${signedUrl}#${E2EE_MARK}1&${params.toString()}`;
}

/** Recognizes `<prefix> <url>` attachment lines; the fragment tells whether the bytes are sealed. */
export function parseAttachmentLine(content: string | null | undefined): AttachmentLine | null {
  const text = (content ?? '').trim();
  const prefix = ATTACHMENT_PREFIXES.find((p) => text.startsWith(`${p} `));
  if (!prefix) return null;
  const url = text.slice(prefix.length + 1).trim().split(/\s+/)[0];
  if (!/^https?:\/\//i.test(url)) return null;
  const hash = url.indexOf('#');
  if (hash < 0 || !url.slice(hash + 1).startsWith(E2EE_MARK)) return { prefix, url, encrypted: null };
  const params = new URLSearchParams(url.slice(hash + 1 + E2EE_MARK.length + 2));
  const nonceB64 = params.get('nonce') ?? '';
  if (!nonceB64) return { prefix, url, encrypted: null };
  return {
    prefix,
    url: url.slice(0, hash),
    encrypted: { nonceB64, name: params.get('name') || 'attachment', type: params.get('type') || 'application/octet-stream' },
  };
}

/** Downloads the sealed bytes, opens them with the shared key and returns an object URL for the browser to show. */
export async function openEncryptedAttachment(line: AttachmentLine, sharedKey: Uint8Array): Promise<{ objectUrl: string; name: string } | null> {
  if (!line.encrypted) return null;
  const response = await fetch(line.url);
  if (!response.ok) return null;
  const cipher = new Uint8Array(await response.arrayBuffer());
  const plain = decryptAttachmentBytes(cipher, line.encrypted.nonceB64, sharedKey);
  if (!plain) return null;
  const blob = new Blob([plain.slice()], { type: line.encrypted.type });
  return { objectUrl: URL.createObjectURL(blob), name: line.encrypted.name };
}
