import type { WorldCitizenCardProps } from './edit-profile-card-types';

type EditProfileWorldCitizenBackProps = Pick<
  WorldCitizenCardProps,
  'didDisplay' | 'givenName' | 'mrzLines' | 'renderLayoutRegion' | 'surname' | 't' | 'worldCitizenCardSide'
>;

export function EditProfileWorldCitizenBack({
  didDisplay,
  givenName,
  mrzLines,
  renderLayoutRegion,
  surname,
  t,
  worldCitizenCardSide,
}: EditProfileWorldCitizenBackProps) {
  return (
    <div
      className="absolute inset-0 overflow-hidden rounded-[26px] border border-cyan-300/20 bg-[radial-gradient(circle_at_top_left,rgba(69,213,204,0.18),transparent_38%),linear-gradient(160deg,#0b1720,#112730_56%,#0d1d22)] p-3.5 shadow-[0_18px_48px_rgba(4,10,12,0.28)]"
      data-build-ignore={worldCitizenCardSide !== 'back' ? 'true' : undefined}
      data-build-key="editProfileWorldCitizenBack"
      data-build-label="Card Background (Back Page)"
      style={{ backfaceVisibility: 'hidden', WebkitBackfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}
    >
      <div className="flex h-full flex-col">
        <div className="flex items-start gap-3">
          {renderLayoutRegion(
            'wcBackNames',
            <div className="min-w-0">
              <div className="grid grid-cols-2 gap-3 text-[10px] uppercase tracking-[0.22em] text-cyan-50/85">
                <p data-build-key="wcBackGivenNameLabel" data-build-label="Back Given Name Label">{t('editProfile.givenName')}</p>
                <p className="pl-2" data-build-key="wcBackSurnameLabel" data-build-label="Back Surname Label">{t('editProfile.surname')}</p>
              </div>
              <div className="mt-2 grid grid-cols-2 gap-3">
                <div className="min-w-0">
                  <p className="mt-1 truncate text-[1.05rem] leading-none font-display font-semibold text-white" data-build-key="wcBackGivenNameValue" data-build-label="Back Given Name Value">
                    {givenName}
                  </p>
                </div>
                <div className="min-w-0 pl-2">
                  <p className="mt-1 truncate text-[1.05rem] leading-none font-display font-semibold text-white" data-build-key="wcBackSurnameValue" data-build-label="Back Surname Value">
                    {surname}
                  </p>
                </div>
              </div>
            </div>,
            { className: 'min-w-0 flex-1', roundedClassName: 'rounded-[18px]' },
          )}
        </div>

        <div className="mt-3 grid grid-cols-1 gap-2 text-[10px] leading-tight text-cyan-50">
          {renderLayoutRegion(
            'wcBackIssuer',
            <div className="rounded-2xl border border-cyan-50/12 bg-white/6 px-3 py-2">
              <p className="uppercase tracking-[0.16em] text-cyan-50/70" data-build-key="wcBackIssuerLabel" data-build-label="Back Issuer Label">
                Issuer
              </p>
              <p className="mt-1 text-white" data-build-key="wcBackIssuerValue" data-build-label="Back Issuer Value">
                WLD / Terra
              </p>
            </div>,
            { roundedClassName: 'rounded-2xl' },
          )}
        </div>

        {renderLayoutRegion(
          'wcBackDid',
          <div className="mt-2.5 flex items-center gap-1.5 rounded-[18px] border border-cyan-50/12 bg-white/6 px-3 py-2.5">
            <p className="shrink-0 text-[10px] uppercase tracking-[0.2em] text-cyan-50/80" data-build-key="wcBackDidLabel" data-build-label="Back DID Label">
              {t('editProfile.did')}:
            </p>
            <p className="min-w-0 flex-1 truncate font-mono text-[11px] leading-none text-cyan-50/95" data-build-key="wcBackDidValue" data-build-label="Back DID Value">
              {didDisplay || '—'}
            </p>
          </div>,
          { roundedClassName: 'rounded-[18px]' },
        )}

        {renderLayoutRegion(
          'wcBackMrz',
          <div className="mt-auto rounded-[18px] border border-cyan-50/12 bg-black/20 px-3 py-2.5 text-cyan-50/95">
            <div className="space-y-0.5 leading-tight">
              {mrzLines.map((line, index) => (
                <div
                  key={line}
                  className="flex w-full items-center justify-between font-mrz text-[9.5px]"
                  data-build-key={index === 0 ? 'wcBackMrzLine1' : index === 1 ? 'wcBackMrzLine2' : 'wcBackMrzLine3'}
                  data-build-label={index === 0 ? 'Back MRZ Line 1' : index === 1 ? 'Back MRZ Line 2' : 'Back MRZ Line 3'}
                >
                  {line.split('').map((char, charIndex) => (
                    <span key={`${line}-${charIndex}`} className="shrink-0">
                      {char}
                    </span>
                  ))}
                </div>
              ))}
            </div>
          </div>,
          { roundedClassName: 'rounded-[18px]' },
        )}
      </div>
    </div>
  );
}
