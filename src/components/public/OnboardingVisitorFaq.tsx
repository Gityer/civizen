import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { useLanguage } from '@/contexts/LanguageContext';
import { onboardingSectionTitleClass } from '@/components/public/onboarding-styles';

const faqItems = [
  { questionKey: 'onboarding.faqWhatQuestion', answerKey: 'onboarding.faqWhatAnswer' },
  { questionKey: 'onboarding.faqGovernmentQuestion', answerKey: 'onboarding.faqGovernmentAnswer' },
  { questionKey: 'onboarding.faqRecognitionQuestion', answerKey: 'onboarding.faqRecognitionAnswer' },
  { questionKey: 'onboarding.faqOpenSourceQuestion', answerKey: 'onboarding.faqOpenSourceAnswer' },
  { questionKey: 'onboarding.faqWhoQuestion', answerKey: 'onboarding.faqWhoAnswer' },
  { questionKey: 'onboarding.faqNowQuestion', answerKey: 'onboarding.faqNowAnswer' },
] as const;

export function OnboardingFaq() {
  const { t } = useLanguage();

  return (
    <section className="space-y-4">
      <h2 className={onboardingSectionTitleClass}>{t('onboarding.faqTitle')}</h2>
      <Accordion type="single" collapsible className="rounded-2xl border border-border/50 bg-card/50 px-4 sm:px-5">
        {faqItems.map((item, index) => (
          <AccordionItem key={item.questionKey} value={`faq-${index}`} className="border-border/40">
            <AccordionTrigger className="text-left text-sm font-medium hover:no-underline sm:text-base">
              {t(item.questionKey)}
            </AccordionTrigger>
            <AccordionContent className="text-sm leading-relaxed text-muted-foreground">
              {t(item.answerKey)}
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </section>
  );
}
