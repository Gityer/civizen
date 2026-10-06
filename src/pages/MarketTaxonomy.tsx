import { useNavigate } from 'react-router-dom';

import { MarketCategoryList } from '@/components/market/MarketCategoryList';
import { AppLayout } from '@/components/layout/AppLayout';
import { AppPageHeader } from '@/components/layout/AppPageHeader';
import { useLanguage } from '@/contexts/LanguageContext';
import type { MarketBrowseCategoryId } from '@/lib/market-categories';

export default function MarketTaxonomy() {
  const { t } = useLanguage();
  const navigate = useNavigate();

  const handleSelect = (categoryId: MarketBrowseCategoryId) => {
    navigate(`/market?section=${encodeURIComponent(categoryId)}`);
  };

  return (
    <AppLayout>
      <div className="flex min-h-0 flex-col pb-28">
        <header className="sticky top-0 z-30 border-b border-border/60 bg-background/95 px-3 pb-3 pt-4 backdrop-blur-md supports-backdrop-filter:bg-background/80">
          <AppPageHeader
            title={t('market.taxonomyTitle')}
            subtitle={t('market.taxonomySubtitle')}
            fallbackPath="/market"
            titleClassName="text-xl tracking-tight"
          />
        </header>

        <div className="px-2 pt-3 sm:px-3">
          <MarketCategoryList
            activeCategoryId={null}
            onSelect={handleSelect}
            t={t}
            title={t('market.categoriesTitle')}
          />
        </div>
      </div>
    </AppLayout>
  );
}
