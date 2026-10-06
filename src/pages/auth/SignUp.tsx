import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { PhoneCountryPicker } from '@/components/auth/PhoneCountryPicker';
import { SignUpSuccessState } from '@/components/auth/SignUpSuccessState';
import { detectLocalePreferences, loadLanguageOptions, type LanguageOption } from '@/lib/i18n.runtime';
import { getCountryFlag, getCountryName } from '@/lib/countries';
import { getPhoneCountryOptions, getPhoneCountrySummary, type PhoneCountryOption } from '@/lib/phone';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Mail, Lock, User, ArrowRight, Globe, Phone } from 'lucide-react';
import { PublicAuthHeader } from '@/components/public/PublicAuthHeader';
import { PublicPageShell } from '@/components/public/PublicPageShell';
import { TERMS_ACCEPTANCE_VERSION } from '@/lib/terms-version';
import { resolveAuthReturnPath } from '@/lib/auth-return-path';
import { savePendingAuthReturn } from '@/lib/pending-auth-return';

export default function SignUp() {
  const navigate = useNavigate();
  const location = useLocation();
  const { signUp } = useAuth();
  // Arriving from a page such as a ballot: keep sign-up short and return there afterwards.
  const returnPath = resolveAuthReturnPath(location.state, '');
  const quickMode = Boolean(returnPath);
  const { t, language } = useLanguage();
  const detected = detectLocalePreferences();
  const [languageOptions, setLanguageOptions] = useState<readonly LanguageOption[]>([]);
  const [countryPickerOpen, setCountryPickerOpen] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [selectedCountryCode, setSelectedCountryCode] = useState(detected.countryCode);
  const [country, setCountry] = useState(detected.country);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [preferredLanguage, setPreferredLanguage] = useState(detected.languageCode);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [successContactLabel, setSuccessContactLabel] = useState('');
  const [successWasPhone, setSuccessWasPhone] = useState(false);
  const [selectedPhoneCountry, setSelectedPhoneCountry] = useState<PhoneCountryOption>({ code: detected.countryCode, label: detected.country, flag: getCountryFlag(detected.countryCode), dialCode: '' });
  const countryOptions = useMemo(() => getPhoneCountryOptions(language), [language]);

  useEffect(() => {
    let active = true;

    const loadOptions = async () => {
      const options = await loadLanguageOptions();
      if (active) setLanguageOptions(options);
    };

    void loadOptions();

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    setSelectedPhoneCountry(getPhoneCountrySummary(selectedCountryCode, language));
    setCountry(getCountryName(selectedCountryCode, language));
  }, [language, selectedCountryCode]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!acceptedTerms) {
      setError(t('auth.mustAcceptTerms'));
      return;
    }

    if (!quickMode && !dateOfBirth) {
      setError(t('auth.dateOfBirthRequired'));
      return;
    }

    const trimmedEmail = email.trim();
    const trimmedPhone = phoneNumber.trim();
    const normalizedPhoneDigits = trimmedPhone.replace(/\D/g, '');
    const latestPhoneCountry = getPhoneCountrySummary(selectedCountryCode, language);

    if (!trimmedEmail && !trimmedPhone) {
      setError(t('auth.contactMethodRequired'));
      return;
    }

    if (trimmedEmail && trimmedPhone) {
      setError(t('auth.contactMethodExclusive'));
      return;
    }

    if (trimmedPhone && !normalizedPhoneDigits) {
      setError(t('auth.phoneInvalid'));
      return;
    }

    setLoading(true);

    try {
      if (quickMode) savePendingAuthReturn(location.state);
      const { error } = await signUp({
        email: trimmedEmail || undefined,
        phoneNumber: trimmedPhone || undefined,
        phoneCountryCode: latestPhoneCountry.dialCode || undefined,
      }, password, {
        full_name: fullName || undefined,
        date_of_birth: dateOfBirth || undefined,
        country: country || undefined,
        country_code: selectedCountryCode || undefined,
        language_code: preferredLanguage,
        phone_country_code: latestPhoneCountry.dialCode || undefined,
        phone_number: trimmedPhone || undefined,
        terms_accepted_at: new Date().toISOString(),
        terms_version: TERMS_ACCEPTANCE_VERSION,
        terms_acceptance_method: 'signup',
      }, { redirectPath: returnPath || undefined });

      if (error) {
        setError(error.message);
        return;
      }

      setSuccessContactLabel(trimmedEmail || `${latestPhoneCountry.dialCode}${normalizedPhoneDigits}` || trimmedPhone);
      setSuccessWasPhone(!trimmedEmail);
      setSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not create account');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    const successTitle = successWasPhone ? t('auth.accountReadyTitle') : t('auth.checkEmailTitle');
    const successMessage = successWasPhone ? t('auth.accountReadyMessage', { phone: successContactLabel }) : t('auth.checkEmailMessage', { email: successContactLabel });

    return (
      <PublicPageShell
        contentClassName="flex flex-col justify-center px-6 py-12"
        maxWidthClass="max-w-sm"
        sectionTrail={[{ label: t('auth.signupTitle') }]}
      >
        <SignUpSuccessState
          backToLoginLabel={t('auth.backToLogin')}
          message={successMessage}
          onBackToLogin={() => navigate('/login', { state: location.state })}
          title={successTitle}
        />
      </PublicPageShell>
    );
  }

  return (
    <PublicPageShell
      contentClassName="flex flex-col justify-center px-6 py-12"
      maxWidthClass="max-w-sm"
      sectionTrail={[{ label: t('auth.signupTitle') }]}
    >
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mx-auto w-full max-w-sm"
      >
          <PublicAuthHeader title={t('auth.signupTitle')} subtitle={t('auth.signupSubtitle')} />

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {!quickMode ? (
            <>
            <div className="space-y-2">
              <Label htmlFor="fullName">{t('auth.fullName')}</Label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <Input
                  id="fullName"
                  type="text"
                  placeholder={t('auth.fullNamePlaceholder')}
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="pl-10"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="dateOfBirth">{t('auth.dateOfBirth')}</Label>
              <Input
                id="dateOfBirth"
                type="date"
                value={dateOfBirth}
                onChange={(e) => setDateOfBirth(e.target.value)}
                required
              />
            </div>
            </>
            ) : (
              <p className="text-sm text-muted-foreground">{t('auth.quickVoteSignup')}</p>
            )}

            <div className="space-y-2">
              <Label htmlFor="phone">{t('auth.phone')}</Label>
              <div className="flex gap-2">
                <PhoneCountryPicker
                  countryOptions={countryOptions}
                  countryPickerOpen={countryPickerOpen}
                  emptyLabel={t('editProfile.countryNotFound')}
                  searchPlaceholder={t('auth.searchCountryCode')}
                  selectedCountryCode={selectedCountryCode}
                  selectedPhoneCountry={selectedPhoneCountry}
                  setCountryPickerOpen={setCountryPickerOpen}
                  onCountrySelect={(option) => {
                    setSelectedCountryCode(option.code);
                    setCountry(option.label);
                    setCountryPickerOpen(false);
                  }}
                />

                <div className="relative flex-1">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                  <Input
                    id="phone"
                    type="tel"
                    placeholder={t('auth.phonePlaceholder')}
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                {t('auth.phoneDetected', { country: country, code: selectedPhoneCountry.dialCode })}
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">{t('auth.emailOptional')}</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  placeholder={t('auth.emailOptionalPlaceholder')}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-10"
                />
              </div>
              <p className="text-xs text-muted-foreground">{t('auth.contactMethodHint')}</p>
            </div>

            {!quickMode ? (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="country">{t('auth.country')}</Label>
                <div className="relative">
                  <Globe className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                  <Input
                    id="country"
                    type="text"
                    value={country}
                    readOnly
                    className="pl-10"
                  />
                </div>
                <p className="text-xs text-muted-foreground">{t('common.countryDetected')}</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="language">{t('auth.language')}</Label>
                <Select value={preferredLanguage} onValueChange={(value) => setPreferredLanguage(value as typeof preferredLanguage)}>
                  <SelectTrigger id="language">
                    <SelectValue placeholder={t('auth.language')} />
                  </SelectTrigger>
                  <SelectContent>
                    {languageOptions.map((option) => (
                      <SelectItem key={option.code} value={option.code}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            ) : null}

            <div className="space-y-2">
              <Label htmlFor="password">{t('auth.password')}</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <Input
                  id="password"
                  type="password"
                  placeholder={t('auth.passwordPlaceholder')}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-10"
                  required
                  minLength={6}
                />
              </div>
            </div>

            <div className="rounded-2xl border border-border/60 bg-card/70 p-4">
              <div className="flex items-start gap-3">
                <Checkbox
                  id="terms"
                  checked={acceptedTerms}
                  onCheckedChange={(checked) => setAcceptedTerms(Boolean(checked))}
                  className="mt-0.5"
                />
                <div className="space-y-1">
                  <Label htmlFor="terms" className="text-sm font-medium leading-5 text-foreground">
                    {t('auth.acceptTermsPrefix')}{' '}
                    <Link to="/terms" className="text-primary hover:underline">
                      {t('auth.termsOfUse')}
                    </Link>
                  </Label>
                  <p className="text-xs text-muted-foreground">{t('auth.acceptTermsDescription')}</p>
                  <p className="text-xs text-muted-foreground">{t('worldCitizenshipNotice.short')}</p>
                  <p className="text-xs">
                    <Link to="/about/world-citizenship" className="text-primary hover:underline">
                      {t('worldCitizenshipNotice.title')}
                    </Link>
                    {' · '}
                    <Link to="/about/legal-status" className="text-primary hover:underline">
                      {t('legalStatusNotice.title')}
                    </Link>
                  </p>
                </div>
              </div>
            </div>

            {error && (
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-sm text-destructive"
              >
                {error}
              </motion.p>
            )}

            <Button
              type="submit"
              className="w-full gap-2"
              disabled={loading || !acceptedTerms}
            >
              {loading ? t('auth.creatingAccount') : t('auth.createAccount')}
              <ArrowRight className="w-4 h-4" />
            </Button>
          </form>

          <p className="text-center mt-6 text-sm text-muted-foreground">
            {t('auth.alreadyHaveAccount')}{' '}
            <Link to="/login" state={location.state} className="text-primary hover:underline font-medium">
              {t('auth.signInLink')}
            </Link>
          </p>
          <p className="text-center mt-3 text-sm text-muted-foreground">
            <Link to="/download" className="text-primary hover:underline font-medium">
              {t('auth.downloadAndroid')}
            </Link>
          </p>
        </motion.div>
    </PublicPageShell>
  );
}
