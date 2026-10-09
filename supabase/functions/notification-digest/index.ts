/**
 * Daily e-mail digest of unread notifications for members who opted in (Settings > Privacy).
 *
 * Invoked by an operator cron (POST with header `x-digest-secret: $DIGEST_CRON_SECRET`, or a
 * service-role bearer token). Reads `notification_digest_candidates()` with the service role, sends
 * one plain-text e-mail per member over SMTP, and records each send with `record_notification_digest`
 * so nobody is mailed twice for the same items.
 *
 * Environment (the functions container needs these; the SMTP values are the same ones GoTrue uses):
 *   SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
 *   SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_ADMIN_EMAIL (from), SMTP_SENDER_NAME
 *   DIGEST_CRON_SECRET   shared secret for the cron caller
 *   DIGEST_SITE_URL      link base, default https://civizen.world
 *   DIGEST_DRY_RUN       "1" lists candidates without sending
 */
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.4';
import nodemailer from 'npm:nodemailer@6.9.16';

type DigestItem = {
  type: string;
  title: string;
  body: string | null;
  entity_type: string | null;
  entity_id: string | null;
  created_at: string;
};
type Candidate = { profile_id: string; email: string; language_code: string; display_name: string; items: DigestItem[] };

const SUBJECT: Record<string, (count: number) => string> = {
  en: (n) => `Civizen: ${n} ${n === 1 ? 'update' : 'updates'} waiting for you`,
  hy: (n) => `Civizen․ ${n} նոր ծանուցում`,
  ru: (n) => `Civizen: ${n} ${n === 1 ? 'новое уведомление' : 'новых уведомлений'}`,
};
const INTRO: Record<string, (name: string) => string> = {
  en: (name) => `Hello ${name},\n\nHere is what happened on Civizen since your last digest:`,
  hy: (name) => `Բարև, ${name}։\n\nԱյս ընթացքում Civizen-ում տեղի է ունեցել հետևյալը․`,
  ru: (name) => `Здравствуйте, ${name}!\n\nВот что произошло на Civizen с вашего последнего дайджеста:`,
};
const OUTRO: Record<string, string> = {
  en: 'You receive this because you turned on the e-mail digest in Settings > Privacy. Turn it off there any time.',
  hy: 'Դուք ստանում եք այս նամակը, քանի որ միացրել եք էլ. փոստի ամփոփագիրը Կարգավորումներ > Գաղտնիություն բաժնում։ Այն կարող եք անջատել նույն տեղում։',
  ru: 'Вы получаете это письмо, потому что включили почтовый дайджест в Настройки > Конфиденциальность. Отключить его можно там же.',
};

function routeFor(item: DigestItem, base: string): string {
  const id = item.entity_id ?? '';
  switch (item.entity_type) {
    case 'civic_election':
      return `${base}/governance/voting/${id}`;
    case 'civic_voting_proposal':
      return `${base}/governance/voting/proposals/${id}`;
    case 'matter':
      return `${base}/contribute/matters/${id}`;
    case 'agreement':
      return `${base}/agreements/${id}`;
    default:
      return `${base}/notifications`;
  }
}

function renderDigest(candidate: Candidate, base: string): { subject: string; text: string } {
  const lang = ['en', 'hy', 'ru'].includes(candidate.language_code) ? candidate.language_code : 'en';
  const items = candidate.items ?? [];
  const lines = items.map((item) => `• ${item.title}${item.body ? ` — ${item.body}` : ''}\n  ${routeFor(item, base)}`);
  const text = `${INTRO[lang](candidate.display_name || 'there')}\n\n${lines.join('\n\n')}\n\n${OUTRO[lang]}\n`;
  return { subject: SUBJECT[lang](items.length), text };
}

function authorized(request: Request, serviceRoleKey: string): boolean {
  const secret = Deno.env.get('DIGEST_CRON_SECRET') ?? '';
  const header = request.headers.get('x-digest-secret') ?? '';
  if (secret && header === secret) return true;
  const bearer = (request.headers.get('authorization') ?? '').replace(/^Bearer\s+/i, '');
  return Boolean(serviceRoleKey) && bearer === serviceRoleKey;
}

Deno.serve(async (request) => {
  if (request.method !== 'POST') return new Response('method_not_allowed', { status: 405 });
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
  if (!authorized(request, serviceRoleKey)) return new Response('unauthorized', { status: 401 });

  const supabase = createClient(Deno.env.get('SUPABASE_URL') ?? '', serviceRoleKey, { auth: { persistSession: false } });
  const { data, error } = await supabase.rpc('notification_digest_candidates');
  if (error) return Response.json({ error: error.message }, { status: 500 });
  const candidates = (data ?? []) as Candidate[];
  const base = (Deno.env.get('DIGEST_SITE_URL') ?? 'https://civizen.world').replace(/\/$/, '');
  const dryRun = Deno.env.get('DIGEST_DRY_RUN') === '1';

  const host = Deno.env.get('SMTP_HOST') ?? '';
  if (!host && !dryRun) return Response.json({ error: 'smtp_not_configured', candidates: candidates.length }, { status: 503 });
  const transport = dryRun
    ? null
    : nodemailer.createTransport({
        host,
        port: Number(Deno.env.get('SMTP_PORT') ?? '587'),
        secure: Number(Deno.env.get('SMTP_PORT') ?? '587') === 465,
        auth: { user: Deno.env.get('SMTP_USER') ?? '', pass: Deno.env.get('SMTP_PASS') ?? '' },
      });
  const from = `${Deno.env.get('SMTP_SENDER_NAME') ?? 'Civizen'} <${Deno.env.get('SMTP_ADMIN_EMAIL') ?? 'no-reply@civizen.world'}>`;

  const sent: Array<{ profile_id: string; items: number }> = [];
  const failed: Array<{ profile_id: string; error: string }> = [];
  for (const candidate of candidates) {
    const items = candidate.items ?? [];
    if (items.length === 0) continue;
    const through = items.reduce((max, item) => (item.created_at > max ? item.created_at : max), items[0].created_at);
    try {
      if (transport) {
        const { subject, text } = renderDigest(candidate, base);
        await transport.sendMail({ from, to: candidate.email, subject, text });
      }
      if (!dryRun) {
        const { error: recordError } = await supabase.rpc('record_notification_digest', {
          p_profile_id: candidate.profile_id,
          p_item_count: items.length,
          p_through: through,
        });
        if (recordError) throw new Error(recordError.message);
      }
      sent.push({ profile_id: candidate.profile_id, items: items.length });
    } catch (err) {
      failed.push({ profile_id: candidate.profile_id, error: err instanceof Error ? err.message : String(err) });
    }
  }
  return Response.json({ dry_run: dryRun, candidates: candidates.length, sent, failed });
});
