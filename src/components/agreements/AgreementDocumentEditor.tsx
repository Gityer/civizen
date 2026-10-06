import type { MouseEvent, ReactNode } from 'react';
import { useEffect, useState } from 'react';
import { Plus } from 'lucide-react';

import { AgreementChoiceWord } from '@/components/agreements/AgreementChoiceWord';
import { AgreementEndCondition } from '@/components/agreements/AgreementEndCondition';
import { AgreementFitInput, AgreementInlineToken } from '@/components/agreements/AgreementInlineToken';
import { AgreementPartyToken } from '@/components/agreements/AgreementPartyToken';
import { AgreementFormattedBody, AgreementRichText } from '@/components/agreements/AgreementRichText';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useLanguage } from '@/contexts/LanguageContext';
import { sanitizeAgreementReferenceInput, type PartyPersonOrOrg, type SelectedAgreementParty } from '@/lib/agreements-model';
import {
  AGREEMENT_END_CONDITIONS_ALL,
  applyDocumentHeading,
  applyPartyRole,
  templateParagraphText,
  unusedOptionalSections,
  visibleTemplateSections,
  type AgreementDocumentState,
  type AgreementDocumentTemplate,
  type AgreementTemplateParagraph,
  type AgreementTemplateRun,
} from '@/lib/agreements-templates';

type AgreementDocumentEditorProps = {
  template: AgreementDocumentTemplate;
  state: AgreementDocumentState;
  excludeProfileId?: string | null;
  civizenReference?: string | null;
  highlightTokenId?: string | null;
  onChange: (state: AgreementDocumentState) => void;
};

const PUNCTUATION_ONLY = /^[.,;:]+$/;

function translatedOrFallback(t: (key: string) => string, key: string, fallback: string) {
  const value = t(key);
  return value === key ? fallback : value;
}

function addLabel(raw: string) {
  return raw.replace(/^\+\s*/, '');
}

function renderRun(
  run: Exclude<AgreementTemplateRun, string>,
  template: AgreementDocumentTemplate,
  state: AgreementDocumentState,
  excludeProfileId: string | null | undefined,
  highlightTokenId: string | null | undefined,
  onChange: (state: AgreementDocumentState) => void,
) {
  const invalid = highlightTokenId === run.id;
  if (run.kind === 'party') {
    const slot = state.parties[run.id] || { query: '', selected: null, classification: null };
    const role = state.partyRoles[run.id] || template.defaultRoles[run.id] || 'Party';
    const roleOptions = (template.roleOptions[run.id] || [role]).map((label) => ({
      id: label.toLowerCase().replace(/\s+/g, '_'),
      label,
    }));
    return (
      <span data-agreement-token="true" className="relative inline align-baseline">
        <AgreementPartyToken
          id={run.id}
          placeholder={run.placeholder}
          ariaLabel={run.ariaLabel}
          query={slot.query}
          selected={slot.selected}
          classification={slot.classification}
          excludeProfileId={excludeProfileId}
          invalid={invalid}
          onQueryChange={(query) => {
            onChange({
              ...state,
              parties: {
                ...state.parties,
                [run.id]: { query, selected: null, classification: null },
              },
            });
          }}
          onSelect={(party: SelectedAgreementParty) => {
            onChange({
              ...state,
              parties: {
                ...state.parties,
                [run.id]: {
                  query: party.displayName,
                  selected: party,
                  classification: party.civizenKind === 'organization' ? 'organization' : 'person',
                },
              },
            });
          }}
          onClassification={(classification: PartyPersonOrOrg) => {
            onChange({
              ...state,
              parties: {
                ...state.parties,
                [run.id]: { ...slot, classification },
              },
            });
          }}
        />
        {' ('}
        <em className="italic font-normal" data-testid={`agreement-party-role-${run.id}`}>
          {'the '}
          <AgreementChoiceWord
            value={role}
            options={roleOptions}
            ariaLabel={`${role} role`}
            className="italic font-normal"
            onChange={(label) => onChange(applyPartyRole(template, state, run.id, label))}
          />
        </em>
        {')'}
      </span>
    );
  }
  if (run.kind === 'date' && run.id === 'endAt') {
    return (
      <AgreementEndCondition
        state={state}
        conditions={template.endConditions || AGREEMENT_END_CONDITIONS_ALL}
        invalid={invalid}
        onChange={onChange}
      />
    );
  }
  return (
    <AgreementInlineToken
      id={run.id}
      value={state.values[run.id] || ''}
      placeholder={run.placeholder}
      ariaLabel={run.ariaLabel}
      kind={run.kind}
      invalid={invalid}
      onChange={(value) => {
        const next = { ...state.values, [run.id]: value };
        if (run.id === 'endAt' && value.trim()) next.endOpen = 'specific_date';
        onChange({ ...state, values: next });
      }}
    />
  );
}

function renderParagraph(
  runs: AgreementTemplateRun[],
  template: AgreementDocumentTemplate,
  state: AgreementDocumentState,
  excludeProfileId: string | null | undefined,
  highlightTokenId: string | null | undefined,
  onChange: (state: AgreementDocumentState) => void,
) {
  const nodes: ReactNode[] = [];
  for (let index = 0; index < runs.length; index += 1) {
    const run = runs[index];
    const next = runs[index + 1];
    const glue = typeof next === 'string' && PUNCTUATION_ONLY.test(next.trim());
    if (typeof run === 'string') {
      if (PUNCTUATION_ONLY.test(run.trim())) {
        nodes.push(run);
        continue;
      }
      nodes.push(
        <span
          key={`wording-${index}`}
          data-agreement-wording="true"
          className="cursor-text border-b border-transparent hover:border-dashed hover:border-foreground/40"
        >
          {run}
        </span>,
      );
      continue;
    }
    const token = renderRun(run, template, state, excludeProfileId, highlightTokenId, onChange);
    if (run.kind === 'multiline') {
      nodes.push(
        <span key={run.id} className="inline align-baseline">
          {token}
        </span>,
      );
      continue;
    }
    if (glue) {
      nodes.push(
        <span key={run.id} className="whitespace-nowrap">
          {token}
          {next}
        </span>,
      );
      index += 1;
      continue;
    }
    nodes.push(<span key={run.id}>{token}</span>);
  }
  return nodes;
}

function isInteractiveTarget(target: EventTarget | null) {
  return Boolean(
    (target as HTMLElement | null)?.closest?.('input, textarea, button, [contenteditable="true"], [data-agreement-token]'),
  );
}

function DocumentParagraph({
  paragraph,
  template,
  state,
  excludeProfileId,
  highlightTokenId,
  onChange,
}: {
  paragraph: AgreementTemplateParagraph;
  template: AgreementDocumentTemplate;
  state: AgreementDocumentState;
  excludeProfileId: string | null | undefined;
  highlightTokenId?: string | null;
  onChange: (state: AgreementDocumentState) => void;
}) {
  const { t } = useLanguage();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState('');
  const templateText = templateParagraphText(paragraph, state);
  const override = state.paragraphWording?.[paragraph.id];
  const ariaLabel = t('agreements.editParagraph');

  const setWording = (next: string) => {
    const paragraphWording = { ...(state.paragraphWording || {}) };
    if (next === templateText) delete paragraphWording[paragraph.id];
    else paragraphWording[paragraph.id] = next;
    onChange({ ...state, paragraphWording });
  };

  const beginEdit = () => {
    setDraft(override ?? templateText);
    setEditing(true);
  };

  if (editing) {
    return (
      <div className="mb-3 last:mb-0">
        <AgreementRichText
          value={draft}
          placeholder={ariaLabel}
          ariaLabel={ariaLabel}
          testId={`agreement-paragraph-editor-${paragraph.id}`}
          autoFocus
          onChange={setDraft}
          onBlur={(next) => {
            setWording(next);
            setEditing(false);
          }}
          onCancel={() => {
            setDraft(override ?? templateText);
            setEditing(false);
          }}
        />
      </div>
    );
  }

  if (override != null) {
    return (
      <div className="mb-3 last:mb-0">
        <button
          type="button"
          data-testid={`agreement-paragraph-wording-${paragraph.id}`}
          aria-label={ariaLabel}
          className="block w-full border-0 border-b border-transparent bg-transparent p-0 text-left font-[inherit] leading-[inherit] text-inherit hover:border-dashed hover:border-foreground/40 focus:border-dashed focus:border-foreground/40 focus:outline-none"
          onClick={beginEdit}
        >
          <AgreementFormattedBody html={override} />
        </button>
      </div>
    );
  }

  return (
    <div
      data-testid={`agreement-paragraph-${paragraph.id}`}
      className="mb-3 cursor-text last:mb-0"
      onClick={(event: MouseEvent<HTMLDivElement>) => {
        if (isInteractiveTarget(event.target)) return;
        beginEdit();
      }}
    >
      {renderParagraph(paragraph.runs, template, state, excludeProfileId, highlightTokenId, onChange)}
    </div>
  );
}

function DocumentSectionTitle({
  sectionId,
  title,
  state,
  onChange,
  onRemove,
}: {
  sectionId: string;
  title: string;
  state: AgreementDocumentState;
  onChange: (state: AgreementDocumentState) => void;
  onRemove?: () => void;
}) {
  const { t } = useLanguage();
  const [editing, setEditing] = useState(false);
  const value = state.sectionTitles?.[sectionId] || title;

  if (editing) {
    return (
      <h3 className="mb-1.5 text-[0.95rem] font-semibold text-foreground">
        <AgreementFitInput
          id={`agreement-section-title-${sectionId}`}
          testId={`agreement-section-title-${sectionId}`}
          value={value}
          placeholder={title}
          ariaLabel={t('agreements.customSectionTitle')}
          autoFocus
          onChange={(next) => {
            onChange({
              ...state,
              sectionTitles: { ...state.sectionTitles, [sectionId]: next },
            });
          }}
          onBlur={() => setEditing(false)}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              event.preventDefault();
              setEditing(false);
            }
            if (event.key === 'Escape') {
              onChange({
                ...state,
                sectionTitles: { ...state.sectionTitles, [sectionId]: title },
              });
              setEditing(false);
            }
          }}
        />
      </h3>
    );
  }

  return (
    <h3 className="mb-1.5 flex items-baseline justify-between gap-3 text-[0.95rem] font-semibold text-foreground">
      <button
        type="button"
        aria-label={t('agreements.customSectionTitle')}
        className="border-0 border-b border-transparent bg-transparent p-0 text-left font-[inherit] leading-[inherit] text-inherit hover:border-dashed hover:border-foreground/40 focus:border-dashed focus:border-foreground/40 focus:outline-none"
        onClick={() => setEditing(true)}
      >
        {value}
      </button>
      {onRemove ? (
        <button
          type="button"
          data-testid={`agreements-remove-${sectionId}`}
          aria-label={t('agreements.removeTerm')}
          className="shrink-0 text-[11px] font-normal text-muted-foreground/80 hover:text-foreground"
          onClick={onRemove}
        >
          {t('agreements.removeTerm')}
        </button>
      ) : null}
    </h3>
  );
}

export function AgreementDocumentEditor({
  template,
  state,
  excludeProfileId,
  civizenReference,
  highlightTokenId,
  onChange,
}: AgreementDocumentEditorProps) {
  const { t } = useLanguage();
  const sections = visibleTemplateSections(template, state);
  const unused = unusedOptionalSections(template, state);
  const optionalIds = new Set(template.optional.map((item) => item.id));

  useEffect(() => {
    if (!highlightTokenId) return;
    const node = document.querySelector(`[data-testid="agreement-token-${highlightTokenId}"]`) as HTMLElement | null;
    node?.focus?.();
    node?.scrollIntoView?.({ block: 'center', behavior: 'smooth' });
  }, [highlightTokenId]);

  const addOptional = (id: string) => {
    if (state.visibleOptional.includes(id)) return;
    onChange({ ...state, visibleOptional: [...state.visibleOptional, id] });
  };

  const addCustomSection = () => {
    onChange({
      ...state,
      extraSections: [
        ...state.extraSections,
        { id: `custom-${Date.now()}`, title: '', body: '' },
      ],
    });
  };

  return (
    <article
      data-testid="agreement-document"
      className="px-0 py-1 text-[0.95rem] leading-[1.7] text-foreground"
    >
      <div className="mb-4 flex items-baseline justify-between gap-4">
        <h2 className="min-w-0 text-xl font-semibold tracking-tight">
          <AgreementChoiceWord
            value={state.documentHeading || template.documentHeading}
            options={template.headingOptions}
            ariaLabel={t('agreements.fieldType')}
            className="text-xl font-semibold tracking-tight"
            onChange={(label, optionId) => onChange(applyDocumentHeading(template, state, label, optionId))}
          />
        </h2>
        <AgreementFitInput
          id="agreement-party-reference"
          testId="agreement-party-reference"
          value={state.partyReference}
          placeholder={t('agreements.partyReferencePlaceholder')}
          ariaLabel={t('agreements.partyReference')}
          tone="muted"
          className="min-w-19 shrink-0 text-right text-sm"
          onChange={(value) => onChange({
            ...state,
            partyReference: sanitizeAgreementReferenceInput(value),
            partyReferenceManual: true,
          })}
        />
      </div>
      {sections.map((section) => (
        <section key={section.id} className="mb-5 last:mb-0">
          {section.title ? (
            <DocumentSectionTitle
              sectionId={section.id}
              title={section.title}
              state={state}
              onChange={onChange}
              onRemove={optionalIds.has(section.id) ? () => {
                onChange({
                  ...state,
                  visibleOptional: state.visibleOptional.filter((id) => id !== section.id),
                });
              } : undefined}
            />
          ) : null}
          {section.paragraphs.map((paragraph) => (
            <DocumentParagraph
              key={paragraph.id}
              paragraph={paragraph}
              template={template}
              state={state}
              excludeProfileId={excludeProfileId}
              highlightTokenId={highlightTokenId}
              onChange={onChange}
            />
          ))}
        </section>
      ))}

      {state.extraSections.map((item, index) => (
        <section key={item.id} className="mb-5 space-y-1">
          <div className="flex items-baseline justify-between gap-3">
            <Input
              value={item.title}
              onChange={(event) => {
                const extraSections = state.extraSections.map((section, current) => (
                  current === index ? { ...section, title: event.target.value } : section
                ));
                onChange({ ...state, extraSections });
              }}
              placeholder={t('agreements.customSectionTitle')}
              aria-label={t('agreements.customSectionTitle')}
              className="h-8 border-0 border-b border-dashed px-0 text-[0.95rem] font-semibold shadow-none"
            />
            <button
              type="button"
              data-testid={`agreements-remove-${item.id}`}
              aria-label={t('agreements.removeTerm')}
              className="shrink-0 text-[11px] font-normal text-muted-foreground/80 hover:text-foreground"
              onClick={() => {
                onChange({
                  ...state,
                  extraSections: state.extraSections.filter((section) => section.id !== item.id),
                });
              }}
            >
              {t('agreements.removeTerm')}
            </button>
          </div>
          <AgreementRichText
            value={item.body}
            placeholder={t('agreements.customSectionBody')}
            ariaLabel={t('agreements.customSectionBody')}
            testId={`agreement-extra-body-${item.id}`}
            onChange={(body) => {
              const extraSections = state.extraSections.map((section, current) => (
                current === index ? { ...section, body } : section
              ));
              onChange({ ...state, extraSections });
            }}
          />
        </section>
      ))}

      {unused.length > 0 || template.allowCustomSections ? (
        <div className="mt-6 border-t border-border/40 pt-3">
          <p className="mb-1.5 text-xs text-muted-foreground">{t('agreements.addTerms')}</p>
          <div className="flex flex-col items-start gap-1">
            {unused.map((item) => (
              <button
                key={item.id}
                type="button"
                data-testid={`agreements-add-${item.id}`}
                className="inline-flex items-center gap-1 text-left text-sm text-muted-foreground hover:text-foreground"
                onClick={() => addOptional(item.id)}
              >
                <Plus className="h-3.5 w-3.5" aria-hidden />
                {addLabel(translatedOrFallback(t, item.addLabelKey || '', `Add ${item.title || item.id}`))}
              </button>
            ))}
            {template.allowCustomSections ? (
              <button
                type="button"
                data-testid="agreements-add-custom-section"
                className="inline-flex items-center gap-1 text-left text-sm text-muted-foreground hover:text-foreground"
                onClick={addCustomSection}
              >
                <Plus className="h-3.5 w-3.5" aria-hidden />
                {addLabel(t('agreements.add.anotherSection'))}
              </button>
            ) : null}
          </div>
        </div>
      ) : null}
      {civizenReference ? (
        <p
          data-testid="agreement-civizen-reference"
          className="mt-8 text-right text-[11px] leading-none text-muted-foreground/80"
        >
          {civizenReference}
        </p>
      ) : null}
    </article>
  );
}

export function AgreementDocumentActions({
  busy,
  onCreate,
}: {
  busy: boolean;
  onCreate: () => void;
}) {
  const { t } = useLanguage();
  return (
    <Button type="button" data-testid="agreements-create-submit" onClick={onCreate} disabled={busy}>
      {busy ? t('agreements.startWorking') : t('agreements.createConfirm')}
    </Button>
  );
}
