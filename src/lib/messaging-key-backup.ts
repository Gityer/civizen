/**
 * Messaging key backup and recovery (Phase 7 step 7.1). The private messaging key lives only on the device
 * (IndexedDB). A recovery code (160 random bits, shown once as 8 groups of 4 Crockford base32 characters) protects
 * an encrypted copy of that key kept on the server, so a member can restore the same identity on another device or
 * after clearing site data. The server never sees the code or the key: the copy is AES-256-GCM under a key derived
 * from the code with HKDF-SHA-256 and a fresh salt.
 */
const CROCKFORD = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';
const BACKUP_VERSION = 1;
const HKDF_INFO = 'civizen-messaging-key-backup-v1';

export type MessagingKeyBackupBlob = {
  v: number;
  salt: string;
  iv: string;
  ciphertext: string;
  public_key: string;
  created_at: string;
};

function bytesToBase64(bytes: Uint8Array): string {
  let binary = '';
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary);
}

function base64ToBytes(value: string): Uint8Array {
  const binary = atob(value);
  const out = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) out[i] = binary.charCodeAt(i);
  return out;
}

function crockfordEncode(bytes: Uint8Array): string {
  let bits = 0;
  let value = 0;
  let out = '';
  for (const byte of bytes) {
    value = (value << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      out += CROCKFORD[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  if (bits > 0) out += CROCKFORD[(value << (5 - bits)) & 31];
  return out;
}

/** A fresh recovery code: 20 random bytes as 32 characters in 8 groups, e.g. `7K3M-Q2VX-...`. */
export function generateRecoveryCode(): string {
  const bytes = new Uint8Array(20);
  crypto.getRandomValues(bytes);
  return crockfordEncode(bytes).match(/.{1,4}/g)!.join('-');
}

/** Upper-cases, drops separators and maps the Crockford look-alikes (O→0, I/L→1) so a typed code tolerates them. */
export function normalizeRecoveryCode(input: string): string {
  return input
    .toUpperCase()
    .replace(/[^0-9A-Z]/g, '')
    .replace(/O/g, '0')
    .replace(/[IL]/g, '1');
}

export function isRecoveryCodeShape(input: string): boolean {
  const normalized = normalizeRecoveryCode(input);
  return normalized.length === 32 && [...normalized].every((c) => CROCKFORD.includes(c));
}

async function deriveBackupKey(code: string, salt: Uint8Array): Promise<CryptoKey> {
  const ikm = await crypto.subtle.importKey('raw', new TextEncoder().encode(normalizeRecoveryCode(code)), 'HKDF', false, ['deriveKey']);
  return crypto.subtle.deriveKey(
    { name: 'HKDF', hash: 'SHA-256', salt: salt as BufferSource, info: new TextEncoder().encode(HKDF_INFO) },
    ikm,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt'],
  );
}

/** Encrypts the device's secret key under the recovery code; `publicKey` is kept in clear to detect a stale backup. */
export async function encryptSecretKeyBackup(secretKey: Uint8Array, publicKeyBase64: string, code: string): Promise<MessagingKeyBackupBlob> {
  if (!isRecoveryCodeShape(code)) throw new Error('recovery code has the wrong shape');
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await deriveBackupKey(code, salt);
  const ciphertext = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv: iv as BufferSource }, key, secretKey as BufferSource));
  return { v: BACKUP_VERSION, salt: bytesToBase64(salt), iv: bytesToBase64(iv), ciphertext: bytesToBase64(ciphertext), public_key: publicKeyBase64, created_at: new Date().toISOString() };
}

/** Returns the secret key, or null when the code is wrong or the blob is damaged. */
export async function decryptSecretKeyBackup(blob: MessagingKeyBackupBlob, code: string): Promise<Uint8Array | null> {
  if (!blob || blob.v !== BACKUP_VERSION || !isRecoveryCodeShape(code)) return null;
  try {
    const key = await deriveBackupKey(code, base64ToBytes(blob.salt));
    const plain = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: base64ToBytes(blob.iv) as BufferSource }, key, base64ToBytes(blob.ciphertext) as BufferSource);
    return new Uint8Array(plain);
  } catch {
    return null;
  }
}

/** The subset of the Supabase client these helpers use; typed loosely so tests can pass a fake. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type BackupClient = { from: (table: string) => any };

export type StoredBackupMeta = { created_at: string; public_key: string } | null;

export async function saveKeyBackup(client: BackupClient, profileId: string, blob: MessagingKeyBackupBlob): Promise<void> {
  const { error } = await client
    .from('messaging_key_backups')
    .upsert({ profile_id: profileId, blob, public_key: blob.public_key, updated_at: new Date().toISOString() }, { onConflict: 'profile_id' });
  if (error) throw new Error(error.message);
}

export async function loadKeyBackup(client: BackupClient, profileId: string): Promise<MessagingKeyBackupBlob | null> {
  const { data, error } = await client.from('messaging_key_backups').select('blob').eq('profile_id', profileId).maybeSingle();
  if (error) throw new Error(error.message);
  return (data?.blob as MessagingKeyBackupBlob | undefined) ?? null;
}

export async function loadKeyBackupMeta(client: BackupClient, profileId: string): Promise<StoredBackupMeta> {
  const { data, error } = await client.from('messaging_key_backups').select('public_key, updated_at').eq('profile_id', profileId).maybeSingle();
  if (error) throw new Error(error.message);
  return data ? { created_at: String(data.updated_at), public_key: String(data.public_key) } : null;
}

export async function deleteKeyBackup(client: BackupClient, profileId: string): Promise<void> {
  const { error } = await client.from('messaging_key_backups').delete().eq('profile_id', profileId);
  if (error) throw new Error(error.message);
}
