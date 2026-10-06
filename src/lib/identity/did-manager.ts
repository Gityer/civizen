import * as crypto from 'crypto';
import { base58btc } from 'multiformats/bases/base58';
import { CID } from 'multiformats/cid';

/**
 * Decentralized Identifier (DID) Manager
 * 
 * Manages the creation, storage, and verification of DIDs (Decentralized Identifiers)
 * using the did:key format with Ed25519 keys.
 * 
 * DIDs are stored in the device's Secure Enclave and never transmitted.
 */

export interface LocalIdentity {
  did: string;                    // did:key:z6Mk...
  publicKey: string;              // Base58-encoded public key
  publicKeyMulticodec: Uint8Array; // Multicodec-encoded public key
  privateKeyPkcs8: Uint8Array;     // PKCS#8 DER private key for local secure storage
  username: string;               // User-chosen identifier
  createdAt: number;              // Timestamp
  version: number;                // Identity version (for upgrades)
}

export interface IdentitySignature {
  signature: string;              // Base58-encoded signature
  did: string;                    // Signer's DID
  timestamp: number;              // Signature timestamp
  message: string;                // Message that was signed
}

const ED25519_PUBLIC_KEY_DER_PREFIX = Buffer.from('302a300506032b6570032100', 'hex');
const base58 = {
  encode: (bytes: Uint8Array): string => base58btc.encode(new Uint8Array(bytes)).slice(1),
  decode: (value: string): Uint8Array => base58btc.decode(`z${value}`),
};

function rawPublicKeyFromSpkiDer(publicKeyDer: Uint8Array): Uint8Array {
  const der = Buffer.from(publicKeyDer);
  if (!der.subarray(0, ED25519_PUBLIC_KEY_DER_PREFIX.length).equals(ED25519_PUBLIC_KEY_DER_PREFIX)) {
    throw new Error('Unsupported Ed25519 public key encoding');
  }
  return new Uint8Array(der.subarray(ED25519_PUBLIC_KEY_DER_PREFIX.length));
}

function spkiDerFromRawPublicKey(publicKey: Uint8Array): Buffer {
  if (publicKey.length !== 32) {
    throw new Error('Ed25519 public key must be 32 bytes');
  }
  return Buffer.concat([ED25519_PUBLIC_KEY_DER_PREFIX, Buffer.from(publicKey)]);
}

/**
 * Generate a new DID using Ed25519 keys
 * 
 * @returns LocalIdentity with generated DID and keys
 */
export function generateDID(): LocalIdentity {
  // Generate Ed25519 key pair
  const { publicKey, privateKey } = crypto.generateKeyPairSync('ed25519', {
    publicKeyEncoding: {
      format: 'der',
      type: 'spki',
    },
    privateKeyEncoding: {
      format: 'der',
      type: 'pkcs8',
    },
  });
  const rawPublicKey = rawPublicKeyFromSpkiDer(publicKey);

  // Encode public key with did:key multicodec prefix (0xed01 for Ed25519).
  const multicodecPublicKey = new Uint8Array([0xed, 0x01, ...rawPublicKey]);

  // Create DID from public key
  const did = `did:key:z${base58.encode(multicodecPublicKey)}`;

  return {
    did,
    publicKey: base58.encode(rawPublicKey),
    publicKeyMulticodec: multicodecPublicKey,
    privateKeyPkcs8: new Uint8Array(privateKey),
    username: '',  // Will be set by user
    createdAt: Date.now(),
    version: 1,
  };
}

/**
 * Sign a message with the user's private key
 * 
 * @param message - Message to sign
 * @param privateKey - Private key (from Secure Enclave)
 * @param did - User's DID
 * @returns IdentitySignature
 */
export function signMessage(
  message: string,
  privateKey: Uint8Array,
  did: string
): IdentitySignature {
  const messageBuffer = Buffer.from(message, 'utf-8');
  const signature = crypto.sign(null, messageBuffer, {
    key: crypto.createPrivateKey({
      key: Buffer.from(privateKey),
      format: 'der',
      type: 'pkcs8',
    }),
  });

  return {
    signature: base58.encode(signature),
    did,
    timestamp: Date.now(),
    message,
  };
}

/**
 * Verify a signature against a public key
 * 
 * @param signature - Signature to verify
 * @param publicKey - Public key (Base58-encoded)
 * @param message - Original message
 * @returns true if signature is valid
 */
export function verifySignature(
  signature: string,
  publicKey: string,
  message: string
): boolean {
  try {
    const signatureBuffer = base58.decode(signature);
    const publicKeyBuffer = base58.decode(publicKey);
    const messageBuffer = Buffer.from(message, 'utf-8');

    const publicKeyObject = crypto.createPublicKey({
      key: spkiDerFromRawPublicKey(publicKeyBuffer),
      format: 'der',
      type: 'spki',
    });

    return crypto.verify(null, messageBuffer, publicKeyObject, signatureBuffer);
  } catch (error) {
    console.error('Signature verification failed:', error);
    return false;
  }
}

/**
 * Verify that a DID is valid (correct format)
 * 
 * @param did - DID to verify
 * @returns true if DID is valid
 */
export function isValidDID(did: string): boolean {
  // Check format: did:key:z6Mk...
  if (!did.startsWith('did:key:z')) {
    return false;
  }

  try {
    // Try to decode the multicodec part
    const encodedKey = did.substring('did:key:z'.length);
    const decoded = base58.decode(encodedKey);

    // Check multicodec prefix (0xed01 for Ed25519)
    if (decoded[0] !== 0xed || decoded[1] !== 0x01) {
      return false;
    }

    // Check key length (Ed25519 public key is 32 bytes)
    if (decoded.length !== 34) {
      return false;
    }

    return true;
  } catch (error) {
    return false;
  }
}

/**
 * Extract the public key from a DID
 * 
 * @param did - DID to extract from
 * @returns Base58-encoded public key
 */
export function extractPublicKeyFromDID(did: string): string | null {
  if (!isValidDID(did)) {
    return null;
  }

  try {
    const encodedKey = did.substring('did:key:z'.length);
    const decoded = base58.decode(encodedKey);

    // Remove multicodec prefix (first 2 bytes)
    const publicKey = decoded.slice(2);

    return base58.encode(publicKey);
  } catch (error) {
    console.error('Failed to extract public key from DID:', error);
    return null;
  }
}

/**
 * Create a registration claim for a new user
 * 
 * @param did - User's DID
 * @param username - Desired username
 * @param privateKey - Private key for signing
 * @returns Signed registration claim
 */
export function createRegistrationClaim(
  did: string,
  username: string,
  privateKey: Uint8Array
): IdentitySignature {
  const claim = JSON.stringify({
    type: 'registration',
    did,
    username,
    timestamp: Date.now(),
  });

  return signMessage(claim, privateKey, did);
}

/**
 * Verify a registration claim
 * 
 * @param claim - Registration claim to verify
 * @returns true if claim is valid
 */
export function verifyRegistrationClaim(claim: IdentitySignature): boolean {
  try {
    const claimData = JSON.parse(claim.message);

    // Verify claim structure
    if (claimData.type !== 'registration' || !claimData.did || !claimData.username) {
      return false;
    }

    // Verify DID format
    if (!isValidDID(claimData.did)) {
      return false;
    }

    // Verify signature
    const publicKey = extractPublicKeyFromDID(claimData.did);
    if (!publicKey) {
      return false;
    }

    return verifySignature(claim.signature, publicKey, claim.message);
  } catch (error) {
    console.error('Registration claim verification failed:', error);
    return false;
  }
}

/**
 * Create an authentication token (for session management)
 * 
 * @param did - User's DID
 * @param privateKey - Private key for signing
 * @returns Signed authentication token
 */
export function createAuthToken(
  did: string,
  privateKey: Uint8Array
): IdentitySignature {
  const token = JSON.stringify({
    type: 'auth_token',
    did,
    timestamp: Date.now(),
    expiresAt: Date.now() + 24 * 60 * 60 * 1000,  // 24 hours
  });

  return signMessage(token, privateKey, did);
}

/**
 * Verify an authentication token
 * 
 * @param token - Auth token to verify
 * @returns true if token is valid and not expired
 */
export function verifyAuthToken(token: IdentitySignature): boolean {
  try {
    const tokenData = JSON.parse(token.message);

    // Verify token structure
    if (tokenData.type !== 'auth_token' || !tokenData.did) {
      return false;
    }

    // Check expiration
    if (tokenData.expiresAt < Date.now()) {
      return false;
    }

    // Verify signature
    const publicKey = extractPublicKeyFromDID(tokenData.did);
    if (!publicKey) {
      return false;
    }

    return verifySignature(token.signature, publicKey, token.message);
  } catch (error) {
    console.error('Auth token verification failed:', error);
    return false;
  }
}

/**
 * Create a data integrity proof for a data object
 * 
 * @param data - Data to create proof for
 * @param did - User's DID
 * @param privateKey - Private key for signing
 * @returns Signed integrity proof
 */
export function createIntegrityProof(
  data: unknown,
  did: string,
  privateKey: Uint8Array
): IdentitySignature {
  const dataHash = crypto.createHash('sha256').update(JSON.stringify(data)).digest('hex');

  const proof = JSON.stringify({
    type: 'integrity_proof',
    did,
    dataHash,
    timestamp: Date.now(),
  });

  return signMessage(proof, privateKey, did);
}

/**
 * Verify a data integrity proof
 * 
 * @param data - Data to verify
 * @param proof - Integrity proof
 * @returns true if proof is valid
 */
export function verifyIntegrityProof(data: unknown, proof: IdentitySignature): boolean {
  try {
    const proofData = JSON.parse(proof.message);

    // Verify proof structure
    if (proofData.type !== 'integrity_proof' || !proofData.dataHash) {
      return false;
    }

    // Verify data hash
    const dataHash = crypto.createHash('sha256').update(JSON.stringify(data)).digest('hex');
    if (dataHash !== proofData.dataHash) {
      return false;
    }

    // Verify signature
    const publicKey = extractPublicKeyFromDID(proofData.did);
    if (!publicKey) {
      return false;
    }

    return verifySignature(proof.signature, publicKey, proof.message);
  } catch (error) {
    console.error('Integrity proof verification failed:', error);
    return false;
  }
}
