import { useEffect, useMemo, useState } from 'react';
import { FileImage } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useLanguage } from '@/contexts/LanguageContext';
import { mrzExpired, normalizeMrz, parseMrz } from '@/lib/mrz';

export type DocumentInput = { file: File; mrz: string };

/**
 * Step 2: a photo of the identity page and the machine-readable zone (the two or three lines of letters, digits and
 * "<" at the bottom), typed as printed. Check digits are verified as the member types; the server checks again.
 */
export function DocumentStep({ onNext, onBack }: { onNext: (input: DocumentInput) => void; onBack: () => void }) {
  const { t } = useLanguage();
  const [file, setFile] = useState<File | null>(null);
  const [mrz, setMrz] = useState('');
  const preview = useMemo(() => (file ? URL.createObjectURL(file) : null), [file]);
  useEffect(() => () => { if (preview) URL.revokeObjectURL(preview); }, [preview]);

  const parsed = useMemo(() => (mrz.trim() ? parseMrz(mrz) : null), [mrz]);
  const expired = parsed?.valid ? mrzExpired(parsed) : false;
  const ready = Boolean(file && parsed?.valid && !expired);

  return (
    <Card className="space-y-4 p-4" data-testid="verify-document-step">
      <h2 className="text-base font-semibold">{t('verify.document.title')}</h2>
      <p className="text-sm text-muted-foreground">{t('verify.document.hint')}</p>

      <div className="space-y-2">
        <Label htmlFor="verify-document-photo">{t('verify.document.photo')}</Label>
        <input id="verify-document-photo" data-testid="verify-document-photo" type="file" accept="image/jpeg,image/png,image/webp"
          capture="environment" className="block w-full text-sm" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
        {preview ? (
          <img src={preview} alt={t('verify.document.photoAlt')} className="max-h-56 rounded-md border object-contain" />
        ) : (
          <p className="flex items-center gap-2 text-xs text-muted-foreground"><FileImage className="h-4 w-4" aria-hidden />{t('verify.document.photoHint')}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="verify-mrz">{t('verify.document.mrz')}</Label>
        <Textarea id="verify-mrz" data-testid="verify-mrz" value={mrz} rows={3} spellCheck={false} autoCapitalize="characters"
          className="font-mono text-xs uppercase" placeholder="P<UTOERIKSSON<<ANNA<MARIA<<<<<<<<<<<<<<<<<<<"
          onChange={(e) => setMrz(e.target.value)} aria-describedby="verify-mrz-feedback" />
        <p className="text-xs text-muted-foreground">{t('verify.document.mrzHint')}</p>
        <div id="verify-mrz-feedback" aria-live="polite" className="text-xs">
          {parsed && !parsed.valid ? (
            <p className="text-destructive" data-testid="verify-mrz-invalid">
              {t('verify.document.mrzInvalid')} {parsed.errors.map((code) => t(`verify.mrz.${code}`)).join(' · ')}
            </p>
          ) : null}
          {parsed?.valid && expired ? <p className="text-destructive">{t('verify.errors.document_expired')}</p> : null}
          {parsed?.valid && !expired ? (
            <p className="text-foreground" data-testid="verify-mrz-valid">
              {t('verify.document.mrzValid', {
                name: `${parsed.givenNames} ${parsed.surname}`.trim(),
                birth: parsed.birthDate ?? '—',
                state: parsed.issuingState,
              })}
            </p>
          ) : null}
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button type="button" variant="outline" onClick={onBack}>{t('verify.back')}</Button>
        <Button type="button" data-testid="verify-document-next" disabled={!ready}
          onClick={() => file && onNext({ file, mrz: normalizeMrz(mrz).join('\n') })}>
          {t('verify.next')}
        </Button>
      </div>
    </Card>
  );
}
