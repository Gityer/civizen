import { describe, expect, it } from 'vitest';
import { mrzCheckDigit, mrzExpired, parseMrz } from './mrz';

// ICAO 9303 specimen documents (fictional "Utopia" passport and identity card)
const TD3 = 'P<UTOERIKSSON<<ANNA<MARIA<<<<<<<<<<<<<<<<<<<\nL898902C36UTO7408122F1204159ZE184226B<<<<<10';
const TD1 = 'I<UTOD231458907<<<<<<<<<<<<<<<\n7408122F1204159UTO<<<<<<<<<<<6\nERIKSSON<<ANNA<MARIA<<<<<<<<<<';

describe('MRZ', () => {
  it('computes ICAO check digits', () => {
    expect(mrzCheckDigit('L898902C3')).toBe(6);
    expect(mrzCheckDigit('740812')).toBe(2);
    expect(mrzCheckDigit('120415')).toBe(9);
  });

  it('parses the ICAO passport and identity card specimens', () => {
    expect(parseMrz(TD3)).toMatchObject({ valid: true, format: 'TD3', documentNumber: 'L898902C3', issuingState: 'UTO', birthDate: '1974-08-12',
      expiryDate: '2012-04-15', sex: 'F', surname: 'ERIKSSON', givenNames: 'ANNA MARIA' });
    expect(parseMrz(TD1)).toMatchObject({ valid: true, format: 'TD1', documentNumber: 'D23145890', surname: 'ERIKSSON' });
  });

  it('catches a wrong digit, wrong characters and a wrong shape, and tolerates spaces and lower case', () => {
    expect(parseMrz(TD3.replace(/10$/, '11')).errors).toEqual(['composite']);
    expect(parseMrz(TD3.replace('7408122', '7408123')).errors).toContain('birth_date');
    expect(parseMrz('P<UTO').errors).toEqual(['format']);
    expect(parseMrz(TD3.toLowerCase().replace(/\n/, ' \n ')).valid).toBe(true);
    expect(parseMrz(TD3.replace('ANNA', 'AN-A')).errors).toEqual(['characters']);
  });

  it('knows an expired document', () => {
    expect(mrzExpired(parseMrz(TD3), new Date('2026-10-30'))).toBe(true);
    expect(mrzExpired({ expiryDate: '2034-12-31' }, new Date('2026-10-30'))).toBe(false);
  });
});
