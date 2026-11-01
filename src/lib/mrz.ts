/**
 * Machine-readable zone (ICAO 9303) of passports (TD3, 2 x 44), visas/cards (TD2, 2 x 36) and identity cards (TD1,
 * 3 x 30): check digits and fields. The member sees problems as they type; the server checks again
 * (`public.parse_mrz`), so this is for feedback only.
 */
export type MrzResult = {
  valid: boolean;
  errors: string[];
  format: 'TD1' | 'TD2' | 'TD3' | null;
  documentNumber: string;
  issuingState: string;
  nationality: string;
  birthDate: string | null;
  expiryDate: string | null;
  sex: string;
  surname: string;
  givenNames: string;
};

const EMPTY: MrzResult = {
  valid: false, errors: ['format'], format: null, documentNumber: '', issuingState: '', nationality: '', birthDate: null,
  expiryDate: null, sex: '', surname: '', givenNames: '',
};

export function mrzCheckDigit(value: string): number {
  const weights = [7, 3, 1];
  let sum = 0;
  for (let i = 0; i < value.length; i += 1) {
    const char = value[i];
    const n = /[0-9]/.test(char) ? Number(char) : /[A-Z]/.test(char) ? char.charCodeAt(0) - 55 : 0;
    sum += n * weights[i % 3];
  }
  return sum % 10;
}

function digitOk(field: string, digit: string): boolean {
  if (digit === '<') return /^<*$/.test(field);
  return /^[0-9]$/.test(digit) && mrzCheckDigit(field) === Number(digit);
}

function mrzDate(yymmdd: string, kind: 'birth' | 'expiry', now = new Date()): string | null {
  if (!/^[0-9]{6}$/.test(yymmdd)) return null;
  const yy = Number(yymmdd.slice(0, 2));
  const year = kind === 'birth' && 2000 + yy > now.getUTCFullYear() ? 1900 + yy : 2000 + yy;
  const month = yymmdd.slice(2, 4);
  const day = yymmdd.slice(4, 6);
  const date = new Date(`${year}-${month}-${day}T00:00:00Z`);
  return Number.isNaN(date.getTime()) || date.getUTCDate() !== Number(day) ? null : `${year}-${month}-${day}`;
}

/** Upper-cases, drops spaces and splits the MRZ into its lines. */
export function normalizeMrz(raw: string): string[] {
  return raw.toUpperCase().replace(/[ \t\r]/g, '').split(/\n+/).filter(Boolean);
}

export function parseMrz(raw: string, now = new Date()): MrzResult {
  const lines = normalizeMrz(raw);
  let format: MrzResult['format'] = null;
  if (lines.length === 2 && lines[0].length === 44 && lines[1].length === 44) format = 'TD3';
  else if (lines.length === 2 && lines[0].length === 36 && lines[1].length === 36) format = 'TD2';
  else if (lines.length === 3 && lines.every((line) => line.length === 30)) format = 'TD1';
  if (!format) return EMPTY;
  if (lines.some((line) => !/^[A-Z0-9<]+$/.test(line))) return { ...EMPTY, errors: ['characters'] };
  const [l1, l2, l3] = lines;
  const errors: string[] = [];
  let number: string; let numberCd: string; let birth: string; let birthCd: string; let expiry: string; let expiryCd: string;
  let nationality: string; let sex: string; let names: string; let composite: string; let compositeCd: string;
  if (format === 'TD1') {
    number = l1.slice(5, 14); numberCd = l1[14];
    birth = l2.slice(0, 6); birthCd = l2[6]; sex = l2[7];
    expiry = l2.slice(8, 14); expiryCd = l2[14]; nationality = l2.slice(15, 18);
    composite = l1.slice(5, 30) + l2.slice(0, 7) + l2.slice(8, 15) + l2.slice(18, 29); compositeCd = l2[29];
    names = l3;
  } else {
    number = l2.slice(0, 9); numberCd = l2[9]; nationality = l2.slice(10, 13);
    birth = l2.slice(13, 19); birthCd = l2[19]; sex = l2[20];
    expiry = l2.slice(21, 27); expiryCd = l2[27];
    names = l1.slice(5);
    if (format === 'TD3') {
      if (!digitOk(l2.slice(28, 42), l2[42])) errors.push('personal_number');
      composite = l2.slice(0, 10) + l2.slice(13, 20) + l2.slice(21, 43); compositeCd = l2[43];
    } else {
      composite = l2.slice(0, 10) + l2.slice(13, 20) + l2.slice(21, 35); compositeCd = l2[35];
    }
  }
  if (!digitOk(number, numberCd)) errors.push('document_number');
  if (!digitOk(birth, birthCd)) errors.push('birth_date');
  if (!digitOk(expiry, expiryCd)) errors.push('expiry_date');
  if (!digitOk(composite, compositeCd)) errors.push('composite');
  const [surnamePart, ...rest] = names.split('<<');
  return {
    valid: errors.length === 0, errors, format,
    documentNumber: number.replace(/<+$/, ''), issuingState: l1.slice(2, 5).replace(/</g, ''), nationality: nationality.replace(/</g, ''),
    birthDate: mrzDate(birth, 'birth', now), expiryDate: mrzDate(expiry, 'expiry', now), sex: sex.replace('<', ''),
    surname: surnamePart.replace(/</g, ' ').trim(), givenNames: rest.join(' ').replace(/</g, ' ').replace(/\s+/g, ' ').trim(),
  };
}

/** Whether the document has expired, by its MRZ expiry date. */
export function mrzExpired(result: Pick<MrzResult, 'expiryDate'>, now = new Date()): boolean {
  return Boolean(result.expiryDate) && Date.parse(`${result.expiryDate}T23:59:59Z`) < now.getTime();
}
