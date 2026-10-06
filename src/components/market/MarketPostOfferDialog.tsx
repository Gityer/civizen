import { PostMarketListingDialog } from '@/components/market/PostMarketListingDialog';

interface MarketPostOfferDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sellerProfileId: string;
  onCreated: () => void;
  t: (key: string) => string;
}

/** The Market page's "post an offer" dialog with its copy bound to the `market.postOffer*` keys. */
export function MarketPostOfferDialog({ open, onOpenChange, sellerProfileId, onCreated, t }: MarketPostOfferDialogProps) {
  return (
    <PostMarketListingDialog
      open={open}
      onOpenChange={onOpenChange}
      sellerProfileId={sellerProfileId}
      onCreated={onCreated}
      dialogTitle={t('market.postOfferTitle')}
      dialogDescription={t('market.postOfferDescription')}
      titleLabel={t('market.postOfferFieldTitle')}
      descriptionLabel={t('market.postOfferFieldDescription')}
      priceLabel={t('market.postOfferFieldPrice')}
      priceHint={t('market.postOfferPriceHint')}
      submitLabel={t('market.postOfferSubmit')}
      submittingLabel={t('market.postOfferSubmitting')}
      cancelLabel={t('market.postOfferCancel')}
      titleRequired={t('market.postOfferTitleRequired')}
      priceRequired={t('market.postOfferPriceRequired')}
      saveError={t('market.postOfferSaveError')}
      quantityLabel={t('market.postOfferQuantityLabel')}
      quantityHint={t('market.postOfferQuantityHint')}
      quantityInvalid={t('market.postOfferQuantityInvalid')}
      kindLabel={t('market.postOfferKindLabel')}
      kindProduct={t('market.postOfferKindProduct')}
      kindService={t('market.postOfferKindService')}
      kindHint={t('market.postOfferKindHint')}
    />
  );
}
