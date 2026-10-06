import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { CarouselItem } from '@/components/ui/carousel';
import { DeferredQrCode } from '@/components/ui/DeferredQrCode';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { LAYOUT_REGION_LABELS } from '@/lib/edit-profile-helpers';

type ProfileSnapshot = {
  full_name?: string | null;
  is_verified?: boolean | null;
};

type RenderLayoutRegion = (
  key: keyof typeof LAYOUT_REGION_LABELS,
  children: ReactNode,
  options?: {
    className?: string;
    roundedClassName?: string;
  },
) => ReactNode;

type EditProfileSocialCardProps = {
  didDisplay: string | null;
  formattedLsi: string | null;
  fullName: string;
  lsiQrValue: string | null;
  profile: ProfileSnapshot | null;
  renderLayoutRegion: RenderLayoutRegion;
  socialCardSide: 'front' | 'back';
  t: (key: string) => string;
  toggleSocialCardSide: () => void;
};

export function EditProfileSocialCard({
  didDisplay,
  formattedLsi,
  fullName,
  lsiQrValue,
  profile,
  renderLayoutRegion,
  socialCardSide,
  t,
  toggleSocialCardSide,
}: EditProfileSocialCardProps) {
  const displayName = fullName || profile?.full_name || t('home.worldCitizen');

  return (
    <CarouselItem className="pl-4">
      <div
        className="cursor-pointer text-sky-50"
        style={{ aspectRatio: '1.586 / 1', perspective: '1600px' }}
        role="button"
        tabIndex={0}
        data-build-key="editProfileSocialCard"
        data-build-label={LAYOUT_REGION_LABELS.editProfileSocialCard}
        aria-label={`Social Card ${socialCardSide === 'front' ? 'front' : 'back'}`}
        onClick={toggleSocialCardSide}
        onKeyDown={(event) => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            toggleSocialCardSide();
          }
        }}
      >
        <div
          className="relative h-full w-full transition-transform duration-700 transform-3d"
          style={{
            transform: socialCardSide === 'front' ? 'rotateY(0deg)' : 'rotateY(180deg)',
            transitionTimingFunction: 'cubic-bezier(0.22, 1, 0.36, 1)',
          }}
        >
          <div
            className="absolute inset-0 overflow-hidden rounded-[26px] border border-sky-400/20 bg-[radial-gradient(circle_at_top_right,rgba(125,211,252,0.22),transparent_34%),linear-gradient(165deg,#0a1524,#12233c_52%,#0b1829)] p-3.5 text-sky-50 shadow-[0_18px_48px_rgba(4,10,20,0.28)]"
            data-build-ignore={socialCardSide !== 'front' ? 'true' : undefined}
            data-build-key="editProfileSocialFront"
            data-build-label={LAYOUT_REGION_LABELS.editProfileSocialFront}
            style={{ backfaceVisibility: 'hidden', WebkitBackfaceVisibility: 'hidden' }}
          >
            <div className="flex h-full flex-col">
              <div className="flex items-start justify-between gap-3">
                {renderLayoutRegion(
                  'socialFrontTitle',
                  <div className="min-w-0">
                    <p className="text-[10px] uppercase tracking-[0.28em] text-sky-200">
                      {t('editProfile.socialCard')}
                    </p>
                    <h2 className="mt-2 text-[1.6rem] leading-none font-display font-semibold text-white">
                      {displayName}
                    </h2>
                    <div className="mt-1.5 text-[13px] leading-none text-sky-50">
                      {t('editProfile.activeWorldCitizen')}
                    </div>
                  </div>,
                  { className: 'min-w-0 flex-1', roundedClassName: 'rounded-[18px]' },
                )}
                {renderLayoutRegion(
                  'socialFrontBadge',
                  <div className="rounded-2xl border border-white/10 bg-white/10 px-3 py-2 text-right">
                    <p className="text-[10px] uppercase tracking-[0.22em] text-sky-200">LSI</p>
                    <p className="mt-1 text-base font-display font-semibold text-white">VC</p>
                  </div>,
                  { roundedClassName: 'rounded-2xl' },
                )}
              </div>

              {renderLayoutRegion(
                'socialFrontIdentifier',
                <div className="mt-3 flex items-start justify-between gap-3 rounded-[22px] border border-white/10 bg-black/20 px-4 py-2.5">
                  <div className="min-w-0 flex flex-1 items-center gap-3">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <p className="shrink-0 cursor-help text-[10px] uppercase tracking-[0.2em] text-sky-200">
                          {t('editProfile.ssn')}
                        </p>
                      </TooltipTrigger>
                      <TooltipContent>{t('editProfile.socialSecurityNumber')}</TooltipContent>
                    </Tooltip>
                    <div className="min-w-0 truncate font-mono text-[1.06rem] leading-none tracking-[0.14em] text-white">
                      {formattedLsi || '—'}
                    </div>
                  </div>
                </div>,
                { roundedClassName: 'rounded-[22px]' },
              )}

              <p className="mt-2 text-[10px] leading-relaxed text-sky-100/80">
                {t('worldCitizenshipNotice.credential')}{' '}
                <Link
                  to="/about/world-citizenship"
                  className="underline underline-offset-2 hover:text-sky-50"
                  onClick={(event) => event.stopPropagation()}
                >
                  {t('worldCitizenshipNotice.learnMore')}
                </Link>
              </p>

              <div className="mt-2.5 grid grid-cols-2 gap-2 text-[10px] leading-tight text-sky-50">
                {renderLayoutRegion(
                  'socialFrontVerification',
                  <div className="rounded-2xl border border-white/10 bg-white/8 px-3 py-2">
                    <p className="uppercase tracking-[0.16em] text-sky-200">{t('editProfile.verification')}</p>
                    <p className="mt-1 text-sky-50">{profile?.is_verified ? 'Verified credential' : t('editProfile.activeWorldCitizen')}</p>
                  </div>,
                  { roundedClassName: 'rounded-2xl' },
                )}
                {renderLayoutRegion(
                  'socialFrontRegistry',
                  <div className="rounded-2xl border border-white/10 bg-white/8 px-3 py-2">
                    <p className="uppercase tracking-[0.16em] text-sky-200">{t('editProfile.registryCode')}</p>
                    <p className="mt-1 text-sky-50">{formattedLsi?.slice(0, 4) || 'LVLA'}</p>
                  </div>,
                  { roundedClassName: 'rounded-2xl' },
                )}
              </div>

              {renderLayoutRegion(
                'socialFrontFooter',
                <div className="mt-auto flex items-end justify-end gap-1 pt-3 text-sky-100/45">
                  <ChevronLeft className="h-4 w-4" />
                  <ChevronRight className="h-4 w-4" />
                </div>,
                { roundedClassName: 'rounded-xl' },
              )}
            </div>
          </div>

          <div
            className="absolute inset-0 overflow-hidden rounded-[26px] border border-sky-400/20 bg-[radial-gradient(circle_at_top_right,rgba(125,211,252,0.18),transparent_34%),linear-gradient(165deg,#08111d,#102036_52%,#0a1524)] p-3.5 text-sky-50 shadow-[0_18px_48px_rgba(4,10,20,0.28)]"
            data-build-ignore={socialCardSide !== 'back' ? 'true' : undefined}
            data-build-key="editProfileSocialBack"
            data-build-label={LAYOUT_REGION_LABELS.editProfileSocialBack}
            style={{ backfaceVisibility: 'hidden', WebkitBackfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}
          >
            <div className="flex h-full flex-col">
              <div className="flex items-start justify-between gap-3">
                {renderLayoutRegion(
                  'socialBackTitle',
                  <div className="min-w-0">
                    <p className="text-[10px] uppercase tracking-[0.28em] text-sky-200">
                      {t('editProfile.socialCard')}
                    </p>
                    <h2 className="mt-2 text-[1.15rem] leading-none font-display font-semibold text-white">
                      {displayName}
                    </h2>
                  </div>,
                  { className: 'min-w-0 flex-1', roundedClassName: 'rounded-[18px]' },
                )}
                {renderLayoutRegion(
                  'socialBackBadge',
                  <div className="rounded-2xl border border-white/10 bg-white/10 px-3 py-2 text-right">
                    <p className="text-[10px] uppercase tracking-[0.22em] text-sky-200">LSI</p>
                    <p className="mt-1 text-base font-display font-semibold text-white">VC</p>
                  </div>,
                  { roundedClassName: 'rounded-2xl' },
                )}
              </div>

              <div className="mt-3 flex items-start justify-between gap-3 rounded-[22px] border border-white/10 bg-black/20 px-4 py-2.5">
                {renderLayoutRegion(
                  'socialBackVerification',
                  <div className="min-w-0">
                    <p className="text-[10px] uppercase tracking-[0.2em] text-sky-200">{t('editProfile.verification')}</p>
                    <p className="mt-1 text-[10px] leading-tight text-sky-50">{t('editProfile.selectiveDisclosure')}</p>
                  </div>,
                  { className: 'min-w-0 flex-1', roundedClassName: 'rounded-[18px]' },
                )}
                {renderLayoutRegion(
                  'socialBackQr',
                  <div className="shrink-0 rounded-2xl bg-white p-2">
                    {lsiQrValue ? (
                      <DeferredQrCode value={lsiQrValue} size={60} includeMargin bgColor="#ffffff" fgColor="#0f172a" />
                    ) : null}
                  </div>,
                  { roundedClassName: 'rounded-2xl' },
                )}
              </div>

              <div className="mt-2.5 grid grid-cols-2 gap-2 text-[10px] leading-tight text-sky-50">
                {renderLayoutRegion(
                  'socialBackLegacy',
                  <div className="rounded-2xl border border-white/10 bg-white/8 px-3 py-2">
                    <p className="uppercase tracking-[0.16em] text-sky-200">{t('editProfile.legacy')}</p>
                    <p className="mt-1 text-sky-50">{t('editProfile.nfcReady')}</p>
                  </div>,
                  { roundedClassName: 'rounded-2xl' },
                )}
                {renderLayoutRegion(
                  'socialBackDid',
                  <div className="rounded-2xl border border-white/10 bg-white/8 px-3 py-2">
                    <p className="uppercase tracking-[0.16em] text-sky-200">DID</p>
                    <p className="mt-1 truncate font-mono text-sky-50">{didDisplay || '—'}</p>
                  </div>,
                  { roundedClassName: 'rounded-2xl' },
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </CarouselItem>
  );
}
