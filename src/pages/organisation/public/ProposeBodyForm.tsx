import { useMemo, useState } from 'react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { OutlinedField } from '@/components/ui/outlined-field';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useLanguage } from '@/contexts/LanguageContext';
import { listGeoCountryCodes } from '@/lib/geo-locations';
import { CHANNEL_KINDS, proposePublicBody, publicFunctionErrorKey, type PublicFunction } from '@/lib/public-functions';
import { MatterScopeFields } from '@/pages/contribute/matter-form/MatterScopeFields';
import { EMPTY_MATTER_SCOPE, matterScopeForSubmit, matterScopeMissingKey, type MatterScopeValue } from '@/pages/contribute/matter-form/matter-scope';

const CHANNEL_KEYS: Record<(typeof CHANNEL_KINDS)[number], string> = {
  web_form: 'organisation.public.propose.channels.web_form',
  email: 'organisation.public.propose.channels.email',
  service_request_api: 'organisation.public.propose.channels.service_request_api',
  postal: 'organisation.public.propose.channels.postal',
  phone: 'organisation.public.propose.channels.phone',
};

/** A member suggests the public body that performs a function in a place, with an official source to check. */
export function ProposeBodyForm({ functions }: { functions: PublicFunction[] }) {
  const { t, language } = useLanguage();
  const countryOptions = useMemo(() => listGeoCountryCodes(language), [language]);
  const [name, setName] = useState('');
  const [scope, setScope] = useState<MatterScopeValue>(EMPTY_MATTER_SCOPE);
  const [chosen, setChosen] = useState<string[]>([]);
  const [channelKind, setChannelKind] = useState<(typeof CHANNEL_KINDS)[number]>('web_form');
  const [channelAddress, setChannelAddress] = useState('');
  const [website, setWebsite] = useState('');
  const [deadline, setDeadline] = useState('');
  const [sourceUrl, setSourceUrl] = useState('');
  const [notes, setNotes] = useState('');
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);

  const ready = name.trim().length >= 2 && chosen.length > 0 && channelAddress.trim().length >= 3
    && sourceUrl.startsWith('https://') && !matterScopeMissingKey(scope);

  const submit = async () => {
    setBusy(true);
    try {
      await proposePublicBody({
        ...matterScopeForSubmit(scope), name: name.trim(), kind: 'other', functions: chosen, website: website.trim(),
        channelKind, channelAddress: channelAddress.trim(), answerDeadlineDays: deadline ? Number(deadline) : null,
        sourceUrl: sourceUrl.trim(), notes: notes.trim(),
      });
      setSent(true);
    } catch (error) {
      toast.error(t(publicFunctionErrorKey(error instanceof Error ? error.message : '')));
    } finally {
      setBusy(false);
    }
  };

  if (sent) {
    return <Card className="p-4 text-sm" role="status" data-testid="propose-body-sent">{t('organisation.public.propose.sent')}</Card>;
  }
  return (
    <Card className="space-y-3 p-4" data-testid="propose-body">
      <h2 className="text-base font-semibold text-foreground">{t('organisation.public.propose.title')}</h2>
      <p className="text-sm text-muted-foreground">{t('organisation.public.propose.body')}</p>
      <OutlinedField label={t('organisation.public.propose.name')}>
        <Input value={name} onChange={(e) => setName(e.target.value)} aria-label={t('organisation.public.propose.name')} />
      </OutlinedField>
      <MatterScopeFields value={scope} onChange={setScope} countryOptions={countryOptions} language={language} t={t} />
      <fieldset className="space-y-1">
        <legend className="text-sm font-medium text-foreground">{t('organisation.public.propose.functions')}</legend>
        <div className="grid max-h-56 gap-1 overflow-y-auto rounded-lg border border-border/60 p-2 sm:grid-cols-2">
          {functions.map((fn) => (
            <label key={fn.authorityId} className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={chosen.includes(fn.authorityId)}
                onChange={(e) => setChosen((current) => (e.target.checked ? [...current, fn.authorityId] : current.filter((id) => id !== fn.authorityId)))} />
              {fn.name}
            </label>
          ))}
        </div>
      </fieldset>
      <OutlinedField label={t('organisation.public.propose.channel')}>
        <Select value={channelKind} onValueChange={(value) => setChannelKind(value as (typeof CHANNEL_KINDS)[number])}>
          <SelectTrigger aria-label={t('organisation.public.propose.channel')}><SelectValue /></SelectTrigger>
          <SelectContent>
            {CHANNEL_KINDS.map((kind) => <SelectItem key={kind} value={kind}>{t(CHANNEL_KEYS[kind])}</SelectItem>)}
          </SelectContent>
        </Select>
      </OutlinedField>
      <OutlinedField label={t('organisation.public.propose.channelAddress')}>
        <Input value={channelAddress} onChange={(e) => setChannelAddress(e.target.value)} aria-label={t('organisation.public.propose.channelAddress')} />
      </OutlinedField>
      <OutlinedField label={t('organisation.public.propose.website')}>
        <Input value={website} onChange={(e) => setWebsite(e.target.value)} aria-label={t('organisation.public.propose.website')} />
      </OutlinedField>
      <OutlinedField label={t('organisation.public.propose.deadline')}>
        <Input type="number" min={1} max={365} value={deadline} onChange={(e) => setDeadline(e.target.value)} aria-label={t('organisation.public.propose.deadline')} />
      </OutlinedField>
      <OutlinedField label={t('organisation.public.propose.source')}>
        <Input value={sourceUrl} onChange={(e) => setSourceUrl(e.target.value)} placeholder="https://" aria-label={t('organisation.public.propose.source')} />
      </OutlinedField>
      <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} placeholder={t('organisation.public.propose.notes')}
        aria-label={t('organisation.public.propose.notes')} />
      <Button type="button" size="sm" disabled={busy || !ready} onClick={() => void submit()} data-testid="propose-body-send">
        {t('organisation.public.propose.send')}
      </Button>
    </Card>
  );
}
