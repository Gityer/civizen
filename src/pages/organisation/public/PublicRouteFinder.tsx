import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';

import { Card } from '@/components/ui/card';
import { OutlinedField } from '@/components/ui/outlined-field';
import { useLanguage } from '@/contexts/LanguageContext';
import { listGeoCountryCodes } from '@/lib/geo-locations';
import { placeLabel, routePublicFunction, type PublicFunction, type PublicRoute } from '@/lib/public-functions';
import { FunctionSelect } from '@/pages/organisation/public/FunctionSelect';
import { MatterScopeFields } from '@/pages/contribute/matter-form/MatterScopeFields';
import { EMPTY_MATTER_SCOPE, matterScopeForSubmit, matterScopeMissingKey, type MatterScopeValue } from '@/pages/contribute/matter-form/matter-scope';

/** "Who is responsible here?": a function and a place resolve to the body that performs it, or to the liaison. */
export function PublicRouteFinder({ functions }: { functions: PublicFunction[] }) {
  const { t, language } = useLanguage();
  const [functionKey, setFunctionKey] = useState('');
  const [scope, setScope] = useState<MatterScopeValue>(EMPTY_MATTER_SCOPE);
  const [route, setRoute] = useState<PublicRoute | null>(null);
  const countryOptions = useMemo(() => listGeoCountryCodes(language), [language]);

  useEffect(() => {
    if (!functionKey || matterScopeMissingKey(scope)) {
      setRoute(null);
      return;
    }
    let active = true;
    void routePublicFunction(functionKey, matterScopeForSubmit(scope)).then((next) => { if (active) setRoute(next); }, () => undefined);
    return () => { active = false; };
  }, [functionKey, scope]);

  return (
    <Card className="space-y-3 p-4" data-testid="public-route-finder">
      <h2 className="text-base font-semibold text-foreground">{t('organisation.public.finder.title')}</h2>
      <OutlinedField label={t('organisation.public.finder.function')}>
        <FunctionSelect functions={functions} value={functionKey} onChange={setFunctionKey} label={t('organisation.public.finder.function')} testId="public-route-function" />
      </OutlinedField>
      <MatterScopeFields value={scope} onChange={setScope} countryOptions={countryOptions} language={language} t={t} />
      {route ? (
        <div className="rounded-lg bg-muted/50 p-3 text-sm" data-testid="public-route-result">
          {route.body ? (
            <>
              <p className="font-medium text-foreground">{route.body.name}</p>
              <p className="text-muted-foreground">
                {t('organisation.public.finder.servesPlace', { place: placeLabel(route.body, t('organisation.public.planet')) })}
                {route.body.answerDeadlineDays ? ` · ${t('organisation.public.finder.deadline', { days: route.body.answerDeadlineDays })}` : ''}
              </p>
              <a href={route.body.sourceUrl} target="_blank" rel="noopener noreferrer" className="text-primary underline underline-offset-2">
                {t('organisation.public.finder.source')}
              </a>
            </>
          ) : (
            <p>
              {t('organisation.public.finder.noBody')}{' '}
              {route.liaisonPositionKey ? (
                <Link to={`/organisation/${route.liaisonPositionKey}`} className="text-primary underline underline-offset-2">{route.liaisonTitle}</Link>
              ) : null}
            </p>
          )}
        </div>
      ) : null}
    </Card>
  );
}
