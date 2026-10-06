import { Link } from 'react-router-dom';
import { useLanguage } from '@/contexts/LanguageContext';

const NotFound = () => {
  const { t } = useLanguage();

  return (
    <main className="flex min-h-screen items-center justify-center bg-muted px-4">
      <div className="text-center">
        <h1 className="mb-4 text-4xl font-bold">404</h1>
        <p className="mb-4 text-xl text-muted-foreground">{t('notFound.title')}</p>
        <Link to="/" className="text-primary underline hover:text-primary/90">
          {t('notFound.returnHome')}
        </Link>
      </div>
    </main>
  );
};

export default NotFound;
