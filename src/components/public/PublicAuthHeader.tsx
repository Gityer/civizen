import { CivizenBrandIcon } from '@/components/brand/CivizenBrandIcon';
import { useLanguage } from '@/contexts/LanguageContext';

type PublicAuthHeaderProps = {
  title: string;
  subtitle: string;
};

export function PublicAuthHeader({ title, subtitle }: PublicAuthHeaderProps) {
  const { t } = useLanguage();

  return (
    <div className="mb-8 text-center">
      <div className="mb-3 inline-flex flex-col items-start text-left">
        <div className="flex items-center gap-3">
          <CivizenBrandIcon className="h-10 w-10" />
          <h1 className="font-display text-3xl font-bold leading-none text-foreground">{title}</h1>
        </div>
        <p className="mt-1.5 pl-13 text-sm font-medium text-primary">
          {t('onboarding.slogan')}
        </p>
      </div>
      <p className="text-muted-foreground">{subtitle}</p>
    </div>
  );
}
