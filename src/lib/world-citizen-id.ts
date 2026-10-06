import type { AppRole } from './access-control';

const MRZ_WEIGHTS = [7, 3, 1] as const;
const LUHN36_ALPHABET = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';

function mrzCharValue(char: string): number {
  if (char === '<') return 0;
  if (/[0-9]/.test(char)) return Number(char);
  if (/[A-Z]/.test(char)) return char.charCodeAt(0) - 55;
  return 0;
}

export function computeMrzCheckDigit(value: string): number {
  return value
    .toUpperCase()
    .split('')
    .reduce((sum, char, index) => sum + mrzCharValue(char) * MRZ_WEIGHTS[index % MRZ_WEIGHTS.length], 0) % 10;
}

export function getWorldCitizenStatusPrefix(role?: AppRole | null, isVerified?: boolean | null) {
  if (role === 'founder') {
    return 'F';
  }
  if (role === 'system' || role === 'admin' || role === 'moderator' || role === 'market_manager') {
    return 'G';
  }
  if (role === 'citizen' || role === 'certified') {
    return 'W';
  }
  return isVerified ? 'W' : 'E';
}

export function getWorldCitizenStatusLabel(
  role: string | null | undefined,
  prefix: string,
  t: (key: string) => string,
) {
  if (role === 'founder') return t('editProfile.founder');
  if (prefix === 'G') return t('editProfile.guardian');
  if (prefix === 'W') return t('editProfile.worldCitizen');
  return t('editProfile.explorer');
}

export function maskWorldCitizenId(value: string, reveal: boolean) {
  if (reveal) return value;
  return value
    .split('')
    .map((char, index) => (index < 4 ? '•' : char))
    .join('');
}

export function getWorldCitizenIdParts(value: string, reveal: boolean) {
  const masked = maskWorldCitizenId(value, reveal);
  return {
    leading: masked.slice(0, Math.max(0, masked.length - 5)),
    trailing: masked.slice(-5),
  };
}

export function maskSsn(value: string, reveal: boolean) {
  if (reveal) return value;
  const digits = value.replace(/\D/g, '').slice(0, 9);
  if (digits.length !== 9) return value;
  return `•••-••-${digits.slice(5, 9)}`;
}

export function normalizeSsn(value?: string | null) {
  if (!value) return null;
  const digits = value.replace(/\D/g, '').slice(0, 9);
  if (digits.length !== 9) return value;
  return `${digits.slice(0, 3)}-${digits.slice(3, 5)}-${digits.slice(5, 9)}`;
}

export function buildCivizenDid(officialId: string) {
  return `did:civizen:${officialId}`;
}

/** Normalize stored DIDs to the Civizen method (also maps pre-rebrand `did:levela:`). */
export function normalizeCivizenDid(did: string | null | undefined): string | null {
  if (!did) return null;
  if (did.startsWith('did:civizen:')) return did;
  if (did.startsWith('did:levela:')) return `did:civizen:${did.slice('did:levela:'.length)}`;
  return did;
}

export function isCivizenDid(did: string | null | undefined): boolean {
  if (!did) return false;
  return Boolean(normalizeCivizenDid(did)?.startsWith('did:civizen:'));
}

/** @deprecated Use isCivizenDid */
export const isCivizenOrLegacyDid = isCivizenDid;


export function normalizeCivizenSocialId(value?: string | null) {
  if (!value) return null;
  const compact = value.toUpperCase().replace(/[^A-Z0-9]/g, '');
  if (compact.length !== 12) return value.toUpperCase();
  return `${compact.slice(0, 4)}-${compact.slice(4, 8)}-${compact.slice(8, 12)}`;
}

function luhn36Value(char: string) {
  const index = LUHN36_ALPHABET.indexOf(char.toUpperCase());
  return index >= 0 ? index : 0;
}

export function computeLuhnMod36CheckChar(value: string) {
  const compact = value.toUpperCase().replace(/[^A-Z0-9]/g, '');
  let factor = 2;
  let sum = 0;

  for (let index = compact.length - 1; index >= 0; index -= 1) {
    const codePoint = luhn36Value(compact[index]);
    let addend = factor * codePoint;
    factor = factor === 2 ? 1 : 2;
    addend = Math.floor(addend / 36) + (addend % 36);
    sum += addend;
  }

  const remainder = sum % 36;
  const checkCodePoint = (36 - remainder) % 36;
  return LUHN36_ALPHABET[checkCodePoint];
}

export function buildCivizenLsiQrValue(officialId: string, lsi: string) {
  return JSON.stringify({
    type: 'civizen-social-credential-request',
    did: buildCivizenDid(officialId),
    lsi,
  });
}

function formatMrzDate(date?: Date | null) {
  if (!date || Number.isNaN(date.getTime())) return '<<<<<<';
  const year = date.getUTCFullYear().toString().slice(-2);
  const month = `${date.getUTCMonth() + 1}`.padStart(2, '0');
  const day = `${date.getUTCDate()}`.padStart(2, '0');
  return `${year}${month}${day}`;
}

function sanitizeMrzText(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
    .replace(/[^A-Z0-9 ]/g, '')
    .trim();
}

function formatMrzName(fullName?: string | null) {
  const normalized = sanitizeMrzText(fullName || '');
  if (!normalized) return 'WORLD<<CITIZEN'.padEnd(30, '<').slice(0, 30);

  const parts = normalized.split(/\s+/).filter(Boolean);
  const surname = parts.length > 1 ? parts[parts.length - 1] : parts[0];
  const givenNames = parts.length > 1 ? parts.slice(0, -1).join('<') : 'WORLD<CITIZEN';
  return `${surname}<<${givenNames}`.replace(/ /g, '<').padEnd(30, '<').slice(0, 30);
}

export function buildWorldCitizenMrz({
  officialId,
  fullName,
  createdAt,
}: {
  officialId: string;
  fullName?: string | null;
  createdAt?: string | null;
}) {
  const line1 = `I<WLD${officialId}`.padEnd(30, '<').slice(0, 30);
  const birthDate = '<<<<<<';
  const birthCheck = computeMrzCheckDigit(birthDate);
  const expiryDate = formatMrzDate(
    createdAt ? new Date(new Date(createdAt).setUTCFullYear(new Date(createdAt).getUTCFullYear() + 10)) : null,
  );
  const expiryCheck = computeMrzCheckDigit(expiryDate);
  const line2Core = `${birthDate}${birthCheck}<${expiryDate}${expiryCheck}WLD<<<<`;
  const line2 = `${line2Core}${computeMrzCheckDigit(line2Core)}`.padEnd(30, '<').slice(0, 30);
  const line3 = formatMrzName(fullName);

  return [line1, line2, line3];
}
