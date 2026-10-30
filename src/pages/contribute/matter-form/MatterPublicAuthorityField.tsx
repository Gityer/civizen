import { useEffect, useState } from 'react';

import { OutlinedField } from '@/components/ui/outlined-field';
import { useLanguage } from '@/contexts/LanguageContext';
import { loadFunctionCatalog, routePublicFunction, suggestPublicFunction, type PublicFunction, type PublicRoute } from '@/lib/public-functions';
import { FunctionSelect } from '@/pages/organisation/public/FunctionSelect';
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
  onChange: (functionKey: string) => void;
}) {
  const { t } = useLanguage();
  const [functions, setFunctions] = useState<PublicFunction[]>([]);
  const [route, setRoute] = useState<PublicRoute | null>(null);

  useEffect(() => {
    void loadFunctionCatalog().then((rows) => setFunctions(rows.filter((row) => row.divisionCode !== 'civizen')), () => setFunctions([]));
  }, []);
  useEffect(() => {
    if (value || !functions.length) return;
    const suggested = suggestPublicFunction(title, description, functions);
    if (suggested) onChange(suggested.functionKey);
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
        <FunctionSelect functions={functions} value={value} onChange={onChange} label={t('contribute.matters.publicAuthority.function')} testId="matter-public-function" />
      </OutlinedField>
      <p className="text-xs text-muted-foreground" data-testid="matter-public-route">
        {route?.body
          ? t('contribute.matters.publicAuthority.toBody', { body: route.body.name })
          : t('contribute.matters.publicAuthority.toLiaison')}
      </p>
    </div>
  );
}
