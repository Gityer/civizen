import { useState } from 'react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { organisationErrorKey, submitContactMessage, type ContactTopic } from '@/lib/organisation';
import { rateLimitInfo } from '@/lib/rate-limit';

const TOPICS: Array<{ value: ContactTopic; labelKey: string }> = [
  { value: 'general', labelKey: 'contact.form.topics.general' },
  { value: 'privacy', labelKey: 'contact.form.topics.privacy' },
  { value: 'safety', labelKey: 'contact.form.topics.safety' },
  { value: 'security', labelKey: 'contact.form.topics.security' },
  { value: 'press', labelKey: 'contact.form.topics.press' },
];

/** Sends a message to the position that answers the chosen topic (see /organisation), not to a personal inbox. */
export function ContactForm() {
  const { t } = useLanguage();
  const { user } = useAuth();
  const [topic, setTopic] = useState<ContactTopic>('general');
  const [name, setName] = useState('');
  const [email, setEmail] = useState(user?.email ?? '');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    setBusy(true);
    setError(null);
    try {
      await submitContactMessage(topic, name, email, message);
      setSent(true);
    } catch (failure) {
      setError(rateLimitInfo(failure) ? t('contact.form.tooMany') : t(organisationErrorKey(failure instanceof Error ? failure.message : '')));
    } finally {
      setBusy(false);
    }
  };

  if (sent) {
    return <p className="text-sm text-foreground" role="status" data-testid="contact-form-sent">{t('contact.form.sent')}</p>;
  }
  return (
    <form className="space-y-2" data-testid="contact-form" onSubmit={(event) => { event.preventDefault(); void submit(); }}>
      <Select value={topic} onValueChange={(value) => setTopic(value as ContactTopic)}>
        <SelectTrigger aria-label={t('contact.form.topic')} data-testid="contact-form-topic"><SelectValue /></SelectTrigger>
        <SelectContent>
          {TOPICS.map((item) => <SelectItem key={item.value} value={item.value}>{t(item.labelKey)}</SelectItem>)}
        </SelectContent>
      </Select>
      <Input value={name} onChange={(e) => setName(e.target.value)} placeholder={t('contact.form.name')} aria-label={t('contact.form.name')} autoComplete="name" />
      <Input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder={t('contact.form.email')}
        aria-label={t('contact.form.email')} autoComplete="email" />
      <Textarea required value={message} onChange={(e) => setMessage(e.target.value)} rows={4} maxLength={4000}
        placeholder={t('contact.form.message')} aria-label={t('contact.form.message')} />
      <p className="text-xs text-muted-foreground">{t('contact.form.routing')}</p>
      {error ? <p className="text-sm text-destructive" role="alert">{error}</p> : null}
      <Button type="submit" size="sm" disabled={busy || message.trim().length < 10 || !email.includes('@')} data-testid="contact-form-send">
        {t('contact.form.send')}
      </Button>
    </form>
  );
}
