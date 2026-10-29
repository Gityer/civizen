import { useEffect, useState } from 'react';

import { OutlinedField } from '@/components/ui/outlined-field';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useLanguage } from '@/contexts/LanguageContext';
import { loadFunctionCatalog, routePublicFunction, type PublicFunction, type PublicRoute } from '@/lib/public-functions';
import { categorizeSolutionIssue } from '@/lib/solution-categorize';
import { matterScopeForSubmit, matterScopeMissingKey, type MatterScopeValue } from '@/pages/contribute/matter-form/matter-scope';

/**
 * A Matter for "a public authority": the member picks the public function (suggested from the text), and the place
 * from the scope fields decides who receives it: the mapped body there, or a Civizen liaison who finds it.
 */
export function MatterPublicAuthorityField({ title, description, scope, value, onChange }: {
  title: string;
  description: string;
  scope: MatterScopeValue;
  value: string;
  onChange: (authorityId: string) => void;
}) {
  const { t } = useLanguage();
  const [functions, setFunctions] = useState<PublicFunction[]>([]);
  const [route, setRoute] = useState<PublicRoute | null>(null);

  useEffect(() => {
    void loadFunctionCatalog().then((rows) => setFunctions(rows.filter((row) => row.group !== 'civizen')), () => setFunctions([]));
  }, []);
  useEffect(() => {
    if (value || !functions.length) return;
    const suggested = categorizeSolutionIssue(title, description).authority?.id;
    if (suggested && functions.some((fn) => fn.authorityId === suggested)) onChange(suggested);
  }, [functions, title, description, value, onChange]);
  useEffect(() => {
    if (!value || matterScopeMissingKey(scope)) {
      setRoute(null);
      return;
    }
    let active = true;
    void routePublicFunction(value, matterScopeForSubmit(scope)).then((next) => { if (active) setRoute(next); }, () => undefined);
    return () => { active = false; };
  }, [value, scope]);

  return (
    <div className="space-y-1" data-testid="matter-public-authority">
      <OutlinedField label={t('contribute.matters.publicAuthority.function')}>
        <Select value={value || 'none'} onValueChange={(next) => onChange(next === 'none' ? '' : next)}>
          <SelectTrigger aria-label={t('contribute.matters.publicAuthority.function')} data-testid="matter-public-function"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="none">{t('organisation.public.finder.chooseFunction')}</SelectItem>
            {functions.map((fn) => <SelectItem key={fn.authorityId} value={fn.authorityId}>{fn.name}</SelectItem>)}
          </SelectContent>
        </Select>
      </OutlinedField>
      <p className="text-xs text-muted-foreground" data-testid="matter-public-route">
        {route?.body
          ? t('contribute.matters.publicAuthority.toBody', { body: route.body.name })
          : t('contribute.matters.publicAuthority.toLiaison')}
      </p>
    </div>
  );
}
