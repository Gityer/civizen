import { Camera, Check, Eye, EyeOff, Loader2, PencilLine } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';
import type { WorldCitizenCardProps } from './edit-profile-card-types';

type EditProfileWorldCitizenFrontDetailsProps = Pick<
  WorldCitizenCardProps,
  | 'avatarAlt'
  | 'avatarInitials'
  | 'countryOptions'
  | 'dateOfBirth'
  | 'dateOfBirthLabel'
  | 'displayedPlaceOfBirth'
  | 'editingDateOfBirth'
  | 'editingSex'
  | 'expiryLabel'
  | 'fullNameChangeState'
  | 'handleAvatarUploadClick'
  | 'isBuildModeActive'
  | 'memberSinceLabel'
  | 'officialIdDisplay'
  | 'openPlaceOfBirthPicker'
  | 'placeOfBirthPickerOpen'
  | 'profile'
  | 'renderLayoutRegion'
  | 'schedulePlaceOfBirthPickerClose'
  | 'setDateOfBirth'
  | 'setEditingDateOfBirth'
  | 'setEditingSex'
  | 'setPlaceOfBirth'
  | 'setPlaceOfBirthPickerOpen'
  | 'setSex'
  | 'setShowOfficialId'
  | 'sex'
  | 'sexLabel'
  | 'showOfficialId'
  | 't'
  | 'uploadingAvatar'
>;

export function EditProfileWorldCitizenFrontDetails({
  avatarAlt,
  avatarInitials,
  countryOptions,
  dateOfBirth,
  dateOfBirthLabel,
  displayedPlaceOfBirth,
  editingDateOfBirth,
  editingSex,
  expiryLabel,
  fullNameChangeState,
  handleAvatarUploadClick,
  isBuildModeActive,
  memberSinceLabel,
  officialIdDisplay,
  openPlaceOfBirthPicker,
  placeOfBirthPickerOpen,
  profile,
  renderLayoutRegion,
  schedulePlaceOfBirthPickerClose,
  setDateOfBirth,
  setEditingDateOfBirth,
  setEditingSex,
  setPlaceOfBirth,
  setPlaceOfBirthPickerOpen,
  setSex,
  setShowOfficialId,
  sex,
  sexLabel,
  showOfficialId,
  t,
  uploadingAvatar,
}: EditProfileWorldCitizenFrontDetailsProps) {
  return (
    <div className="mt-0.5 grid flex-1 grid-cols-[94px_1fr] items-start gap-1.5">
      <div data-build-key="wcFrontPhotoLayer" data-build-label="Photo Layer">
        {renderLayoutRegion(
          'wcFrontPhoto',
          <div className="relative self-start overflow-hidden rounded-[22px] border border-cyan-50/15 bg-black/20 shadow-inner aspect-[0.78/1] min-h-[112px]">
            {profile?.avatar_url ? (
              <img src={profile.avatar_url} alt={avatarAlt} className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-full min-h-[132px] items-center justify-center bg-[radial-gradient(circle_at_top_left,rgba(69,213,204,0.22),transparent_42%),linear-gradient(160deg,#12323a,#0f2328)] text-2xl font-display text-cyan-50">
                {avatarInitials}
              </div>
            )}
            <div className="pointer-events-none absolute inset-0 bg-linear-to-b from-transparent via-transparent to-black/30" />
            <button
              type="button"
              data-build-ignore="true"
              onClick={(event) => {
                event.stopPropagation();
                handleAvatarUploadClick();
              }}
              disabled={uploadingAvatar}
              aria-label={t('common.changePhoto')}
              className="absolute inset-0 flex items-center justify-center bg-slate-950/45 opacity-0 transition-opacity duration-200 hover:opacity-100 focus-visible:opacity-100 disabled:cursor-wait group-hover:opacity-100"
            >
              <span className="flex h-10 w-10 items-center justify-center rounded-full border border-cyan-50/20 bg-black/45 text-cyan-50 shadow-lg">
                {uploadingAvatar ? <Loader2 className="h-4 w-4 animate-spin" /> : <Camera className="h-4 w-4" />}
              </span>
            </button>
          </div>,
          { roundedClassName: 'rounded-[22px]' },
        )}
      </div>

      {renderLayoutRegion(
        'wcFrontInfoCompactGroup',
        <div className="relative flex min-h-0 flex-col">
          <div className="grid grid-cols-[1fr_0.5fr] gap-x-1.5 gap-y-0.5">
            {renderLayoutRegion(
              'wcFrontIdLineCompact',
              <div className="col-span-2 flex items-center justify-between gap-3 rounded-[16px] bg-white/6 px-2.5 py-1">
                <div className="min-w-0 flex flex-1 items-center gap-2">
                  <p className="shrink-0 text-[8px] uppercase tracking-[0.14em] text-cyan-50/62" data-build-key="wcFrontIdLineCompactLabel" data-build-label="ID Label">
                    {t('editProfile.id')}
                  </p>
                  <div className="flex min-w-0 items-center gap-0.5 font-mono text-[0.9rem] leading-none tracking-[0.14em]" data-build-key="wcFrontIdLineCompactValue" data-build-label="ID Value">
                    {officialIdDisplay ? (
                      <>
                        <span className="truncate text-white">{officialIdDisplay.leading}</span>
                        <span className="truncate font-semibold text-cyan-300">{officialIdDisplay.trailing}</span>
                      </>
                    ) : (
                      <span className="text-white">—</span>
                    )}
                  </div>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  data-build-key="wcFrontIdLineCompactToggle"
                  data-build-label="ID Visibility Toggle"
                  className="grid h-7 w-7 shrink-0 place-items-center rounded-full text-cyan-50! hover:bg-white/10 hover:text-white! focus-visible:text-white!"
                  onClick={(event) => {
                    event.stopPropagation();
                    if (isBuildModeActive()) return;
                    setShowOfficialId((current) => !current);
                  }}
                  aria-label={showOfficialId ? t('editProfile.hideId') : t('editProfile.showId')}
                >
                  {showOfficialId ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                </Button>
              </div>,
              { roundedClassName: 'rounded-[16px]' },
            )}

            {renderLayoutRegion(
              'wcFrontBirthPlaceCompact',
              <Popover open={placeOfBirthPickerOpen} onOpenChange={setPlaceOfBirthPickerOpen}>
                <div
                  className="group/place"
                  data-build-key="wcFrontBirthPlaceFrame"
                  data-build-label="ID front place of birth interaction frame"
                  onMouseEnter={openPlaceOfBirthPicker}
                  onMouseLeave={schedulePlaceOfBirthPickerClose}
                >
                  <PopoverTrigger asChild>
                    <button
                      type="button"
                      data-build-key="wcFrontBirthPlaceTrigger"
                      data-build-label="ID front place of birth trigger button"
                      onClick={(event) => {
                        event.stopPropagation();
                        setPlaceOfBirthPickerOpen((current) => !current);
                      }}
                      className="flex w-full flex-col rounded-[16px] bg-black/8 px-2 py-0.75 text-left"
                    >
                      <p className="text-[8px] uppercase tracking-[0.14em] text-cyan-50/62" data-build-key="wcFrontBirthPlaceCompactLabel" data-build-label="Place of Birth Label">
                        {t('editProfile.placeOfBirth')}
                      </p>
                      <p className="mt-0.5 truncate text-[0.9rem] leading-none font-display font-semibold text-white" data-build-key="wcFrontBirthPlaceCompactValue" data-build-label="Place of Birth Value">
                        {displayedPlaceOfBirth || '—'}
                      </p>
                    </button>
                  </PopoverTrigger>
                  <PopoverContent
                    className="w-[220px] p-0"
                    align="start"
                    sideOffset={0}
                    onMouseEnter={openPlaceOfBirthPicker}
                    onMouseLeave={schedulePlaceOfBirthPickerClose}
                    onClick={(event) => event.stopPropagation()}
                  >
                    <Command>
                      <CommandInput placeholder={t('editProfile.searchCountryPlaceholder')} />
                      <CommandList>
                        <CommandEmpty>{t('editProfile.countryNotFound')}</CommandEmpty>
                        <CommandGroup>
                          {countryOptions.map((option) => (
                            <CommandItem
                              key={option.code}
                              value={option.label}
                              onSelect={() => {
                                setPlaceOfBirth(option.label);
                                setPlaceOfBirthPickerOpen(false);
                              }}
                            >
                              <Check className={cn('mr-2 h-4 w-4', displayedPlaceOfBirth === option.label ? 'opacity-100' : 'opacity-0')} />
                              {option.label}
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </div>
              </Popover>,
              { className: 'col-span-2', roundedClassName: 'rounded-[16px]' },
            )}

            {renderLayoutRegion(
              'wcFrontDobCompact',
              <div className="group/dob rounded-[16px] bg-black/8 px-2 py-0.5">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-[8px] uppercase tracking-[0.14em] text-cyan-50/62" data-build-key="wcFrontDobCompactLabel" data-build-label="Date of Birth Label">
                    {t('editProfile.dateOfBirth')}
                  </p>
                  {fullNameChangeState.canEdit ? (
                    <button
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation();
                        setEditingDateOfBirth(true);
                      }}
                      className="shrink-0 rounded-full p-1 text-cyan-50/70 opacity-0 transition-all duration-150 hover:bg-white/8 hover:text-white group-hover/dob:opacity-100 focus-visible:opacity-100"
                      aria-label={t('editProfile.dateOfBirth')}
                    >
                      <PencilLine className="h-3.5 w-3.5" />
                    </button>
                  ) : null}
                </div>
                {editingDateOfBirth ? (
                  <Input
                    type="date"
                    value={dateOfBirth}
                    onClick={(event) => event.stopPropagation()}
                    onChange={(event) => setDateOfBirth(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter') {
                        event.preventDefault();
                        setEditingDateOfBirth(false);
                      }
                    }}
                    onBlur={() => setEditingDateOfBirth(false)}
                    className="mt-0.5 h-7 border-cyan-50/15 bg-white/10 px-2 text-[11px] text-white scheme-dark focus-visible:ring-cyan-300"
                  />
                ) : (
                  <p className="mt-0.5 truncate text-[0.9rem] leading-none font-display font-semibold text-white" data-build-key="wcFrontDobCompactValue" data-build-label="Date of Birth Value">
                    {dateOfBirthLabel || '—'}
                  </p>
                )}
              </div>,
              { roundedClassName: 'rounded-[16px]' },
            )}

            {renderLayoutRegion(
              'wcFrontSexCompact',
              <div className="group/sex rounded-[16px] bg-black/8 px-2 py-0.5">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-[8px] uppercase tracking-[0.14em] text-cyan-50/62" data-build-key="wcFrontSexCompactLabel" data-build-label="Sex Label">
                    {t('editProfile.sex')}
                  </p>
                  {!editingSex && fullNameChangeState.canEdit ? (
                    <button
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation();
                        setEditingSex(true);
                      }}
                      className="shrink-0 rounded-full p-1 text-cyan-50/70 opacity-0 transition-all duration-150 hover:bg-white/8 hover:text-white group-hover/sex:opacity-100 focus-visible:opacity-100"
                      aria-label={t('editProfile.sex')}
                    >
                      <PencilLine className="h-3.5 w-3.5" />
                    </button>
                  ) : null}
                </div>
                {editingSex ? (
                  <Select
                    value={sex || '__none__'}
                    onValueChange={(value) => {
                      setSex(value === '__none__' ? '' : value);
                      setEditingSex(false);
                    }}
                  >
                    <SelectTrigger className="mt-0.5 h-7 min-w-[64px] border-cyan-50/15 bg-white/10 px-2 text-[12px] text-cyan-50 focus:ring-cyan-300" onClick={(event) => event.stopPropagation()}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent onClick={(event) => event.stopPropagation()}>
                      <SelectItem value="M">{t('editProfile.sexMale')}</SelectItem>
                      <SelectItem value="F">{t('editProfile.sexFemale')}</SelectItem>
                      <SelectItem value="X">{t('editProfile.sexOther')}</SelectItem>
                      <SelectItem value="__none__">—</SelectItem>
                    </SelectContent>
                  </Select>
                ) : (
                  <p className="mt-0.5 truncate text-[0.9rem] leading-none font-display font-semibold text-white" data-build-key="wcFrontSexCompactValue" data-build-label="Sex Value">
                    {sexLabel}
                  </p>
                )}
              </div>,
              { roundedClassName: 'rounded-[16px]' },
            )}
          </div>

          <div className="mt-0.5 space-y-0.5">
            {renderLayoutRegion(
              'wcFrontExpiresCompact',
              <div className="flex items-baseline justify-between gap-2 rounded-[16px] bg-black/8 px-2 py-0.5">
                <p className="shrink-0 text-[6.5px] uppercase tracking-[0.12em] text-cyan-50/62" data-build-key="wcFrontExpiresCompactLabel" data-build-label="Card Expires Label">
                  {t('editProfile.cardExpires')}
                </p>
                <p className="truncate text-[0.86rem] leading-none font-display font-semibold text-white" data-build-key="wcFrontExpiresCompactValue" data-build-label="Card Expires Date">
                  {expiryLabel || '—'}
                </p>
              </div>,
              { roundedClassName: 'rounded-[16px]' },
            )}

            {renderLayoutRegion(
              'wcFrontMemberSinceCompact',
              <div className="flex items-baseline justify-between gap-2 rounded-[16px] bg-black/8 px-2 py-0.5">
                <p className="shrink-0 text-[6.5px] uppercase tracking-[0.12em] text-cyan-50/62" data-build-key="wcFrontMemberSinceCompactLabel" data-build-label="Member Since Label">
                  {t('editProfile.memberSince')}
                </p>
                <p className="truncate text-[0.86rem] leading-none font-display font-semibold text-white" data-build-key="wcFrontMemberSinceCompactValue" data-build-label="Member Since Date">
                  {memberSinceLabel || '—'}
                </p>
              </div>,
              { roundedClassName: 'rounded-[16px]' },
            )}
          </div>
        </div>,
        { roundedClassName: 'rounded-[18px]' },
      )}
    </div>
  );
}
