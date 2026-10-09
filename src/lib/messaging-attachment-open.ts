import { buildSharedEncryptionKey, decodePublicKeyBase64 } from '@/lib/messaging-e2ee';
import { openEncryptedAttachment, parseAttachmentLine } from '@/lib/messaging-attachments-e2ee';

/** The shared key of a direct encrypted thread from the device secret and the peer's public key, or null. */
export function threadSharedKeyFrom(mySecretKey: Uint8Array | null, peerPublicKeyB64: string | null): Uint8Array | null {
  const peerPk = peerPublicKeyB64 ? decodePublicKeyBase64(peerPublicKeyB64) : null;
  return mySecretKey && peerPk && mySecretKey.length === 32 && peerPk.length === 32 ? buildSharedEncryptionKey(mySecretKey, peerPk) : null;
}

/**
 * Opens an attachment URL from a message: plain ones open directly, sealed ones are downloaded, decrypted with the
 * thread key and opened from an object URL (revoked a minute later). Calls onFail when the key is missing or the
 * bytes do not open.
 */
export async function openAttachmentUrlWith(url: string, sharedKey: Uint8Array | null, onFail: () => void): Promise<void> {
  const line = parseAttachmentLine(`📎 ${url}`);
  if (!line?.encrypted) {
    window.open(url, '_blank', 'noopener,noreferrer');
    return;
  }
  const opened = sharedKey ? await openEncryptedAttachment(line, sharedKey).catch(() => null) : null;
  if (!opened) {
    onFail();
    return;
  }
  window.open(opened.objectUrl, '_blank', 'noopener,noreferrer');
  window.setTimeout(() => URL.revokeObjectURL(opened.objectUrl), 60_000);
}
