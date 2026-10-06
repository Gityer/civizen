import { AgreementChoiceWord } from '@/components/agreements/AgreementChoiceWord';
import { AgreementInlineToken } from '@/components/agreements/AgreementInlineToken';
import { useLanguage } from '@/contexts/LanguageContext';
import { addCalendarYears, formatAgreementDate, localIsoDate } from '@/lib/agreements-model';
import {
  AGREEMENT_END_CONDITIONS_ALL,
  agreementEndCondition,
  type AgreementDocumentState,
  type AgreementEndConditionId,
} from '@/lib/agreements-templates';

type AgreementEndConditionProps = {
  state: AgreementDocumentState;
  conditions?: AgreementEndConditionId[];
  invalid?: boolean;
  onChange: (state: AgreementDocumentState) => void;
};

function conditionLabel(
  id: AgreementEndConditionId,
  t: (key: string) => string,
  endAt?: string,
) {
  if (id === 'specific_date') {
    return endAt?.trim() ? formatAgreementDate(endAt) : t('agreements.end.specificDate');
  }
  if (id === 'until_completed') return t('agreements.end.untilCompleted');
  if (id === 'ongoing') return t('agreements.end.ongoing');
  return t('agreements.end.untilTerminated');
}

export function AgreementEndCondition({
  state,
  conditions = AGREEMENT_END_CONDITIONS_ALL,
  invalid,
  onChange,
}: AgreementEndConditionProps) {
  const { t } = useLanguage();
  const current = agreementEndCondition(state);
  const allowed = conditions.length ? conditions : AGREEMENT_END_CONDITIONS_ALL;

  const apply = (next: AgreementEndConditionId) => {
    const values: Record<string, string> = { ...state.values, endOpen: next };
    if (next === 'specific_date' && !values.endAt?.trim()) {
      values.endAt = addCalendarYears(values.startAt?.trim() || localIsoDate(), 1);
    }
    onChange({ ...state, values });
  };

  const options = allowed
    .filter((id) => id !== current)
    .map((id) => ({
      id,
      label: id === 'ongoing'
        ? t('agreements.end.ongoingPhrase')
        : id === 'specific_date'
          ? `${t('agreements.end.until')} ${conditionLabel(id, t, state.values.endAt)}`
          : `${t('agreements.end.until')} ${conditionLabel(id, t)}`,
    }));

  if (current === 'specific_date') {
    return (
      <>
        {' '}
        <AgreementChoiceWord
          value={t('agreements.end.until')}
          options={options}
          ariaLabel={t('agreements.endCondition')}
          allowRename={false}
          onChange={(_label, optionId) => {
            if (optionId) apply(optionId as AgreementEndConditionId);
          }}
        />
        {' '}
        <AgreementInlineToken
          id="endAt"
          value={state.values.endAt || ''}
          placeholder={t('agreements.end.selectDate')}
          ariaLabel={t('agreements.end.selectDate')}
          kind="date"
          invalid={invalid}
          onChange={(value) => {
            onChange({
              ...state,
              values: { ...state.values, endAt: value, endOpen: 'specific_date' },
            });
          }}
        />
      </>
    );
  }

  if (current === 'ongoing') {
    return (
      <>
        {' '}
        <AgreementChoiceWord
          value={t('agreements.end.ongoingPhrase')}
          options={options}
          ariaLabel={t('agreements.endCondition')}
          allowRename={false}
          onChange={(_label, optionId) => {
            if (optionId) apply(optionId as AgreementEndConditionId);
          }}
        />
      </>
    );
  }

  return (
    <>
      {' '}
      <AgreementChoiceWord
        value={`${t('agreements.end.until')} ${conditionLabel(current, t)}`}
        options={options}
        ariaLabel={t('agreements.endCondition')}
        allowRename={false}
        onChange={(_label, optionId) => {
          if (optionId) apply(optionId as AgreementEndConditionId);
        }}
      />
    </>
  );
}
