import { execFileSync } from 'node:child_process';
import http from 'node:http';
import { expect, test, type Browser, type Page } from '@playwright/test';

/**
 * Delivery through a city service-request system (Open311 GeoReport v2), against a local mock city: the liaison (the
 * founder office while vacant) sends the Matter from its page, the city's request id becomes the reference, and when
 * the city closes the request its notes are recorded as the answer. Needs the edge functions served with
 * OPEN311_ALLOW_PRIVATE_HTTP=1 (CI does). Fictional body. Local stack only.
 */
const API = process.env.CIVIZEN_E2E_SUPABASE_URL ?? '';
const PASSWORD = process.env.CIVIZEN_E2E_PASSWORD || 'civizen-local';
const DB = process.env.CIVIZEN_LOCAL_DB_CONTAINER || 'supabase_db_civizen-local';
const PORT = 4874;

function sql(statement: string): string {
  return execFileSync('docker', ['exec', '-i', DB, 'psql', '-U', 'postgres', '-At', '-c', statement], { encoding: 'utf8' }).trim();
}
const last = (out: string) => out.split('\n').filter((line) => !line.startsWith('INSERT ')).pop() ?? '';

async function signedIn(browser: Browser, email: string): Promise<Page> {
  const page = await (await browser.newContext()).newPage();
  await page.goto('/login');
  const url = await page.evaluate(async () => {
    const mod = await import('/src/integrations/supabase/client.ts');
    return (mod as { supabase: { supabaseUrl: string } }).supabase.supabaseUrl;
  });
  expect(url, 'e2e must run against the local Supabase stack, never production').toMatch(/localhost|127\.0\.0\.1/);
  await page.getByPlaceholder(/janesmith/).fill(email);
  await page.getByPlaceholder('••••••••').fill(PASSWORD);
  await page.getByRole('button', { name: 'Sign In' }).click();
  await page.waitForURL((u) => !u.pathname.startsWith('/login'));
  return page;
}

test.skip(!API, 'edge functions are not served');

test('a Matter goes through a city service-request system and the closed request becomes the answer', async ({ browser }) => {
  test.setTimeout(150_000);
  const received: string[] = [];
  const city = http.createServer((req, res) => {
    let body = '';
    req.on('data', (chunk) => { body += chunk; });
    req.on('end', () => {
      res.setHeader('Content-Type', 'application/json');
      if (req.method === 'POST' && req.url === '/open311/v2/requests.json') {
        received.push(body);
        res.end(JSON.stringify([{ service_request_id: `SR-${received.length}` }]));
      } else if (req.method === 'GET' && req.url?.startsWith('/open311/v2/requests/SR-')) {
        res.end(JSON.stringify([{ service_request_id: 'SR-1', status: 'closed', status_notes: 'Lamp replaced by the night crew.' }]));
      } else {
        res.statusCode = 404;
        res.end('[]');
      }
    });
  });
  await new Promise<void>((resolve) => city.listen(PORT, '0.0.0.0', resolve));
  const gateway = execFileSync('docker', ['network', 'inspect', 'supabase_network_civizen-local', '--format', '{{(index .IPAM.Config 0).Gateway}}'], { encoding: 'utf8' }).trim();
  const stamp = Date.now().toString(36);
  const asCitizen = "SELECT set_config('request.jwt.claims', json_build_object('sub', (SELECT user_id FROM public.profiles WHERE username = 'citizen' LIMIT 1), 'role', 'authenticated')::text, false);";
  let bodyId = '';
  let matterId = '';
  sql(`UPDATE public.org_position_terms SET ended_at = now(), end_reason = 'e2e reset' WHERE (position_key LIKE 'liaison_%' OR position_key LIKE 'office_%') AND ended_at IS NULL`);
  try {
    bodyId = last(sql(`INSERT INTO public.public_bodies (name, kind, scope_kind, scope_country_code, scope_region_code, scope_locality_code, channel_kind, channel_address,
        source_url, status) VALUES ('E2E City 311 ${stamp}', 'local_government', 'locality', 'OZ', 'O1', 'Otown', 'service_request_api',
        'http://${gateway}:${PORT}/open311/v2|streetlight', 'https://otown.example.org/311', 'verified') RETURNING id`));
    sql(`INSERT INTO public.public_body_functions (body_id, function_key) VALUES ('${bodyId}', 'street_lighting')`);
    matterId = last(sql(`${asCitizen} SELECT public.create_matter(jsonb_build_object('title', 'Open311 e2e ${stamp}', 'description', 'Fictional: the lamp on Elm Street is out.',
        'matter_type', 'issue', 'visibility', 'public', 'addressee_kind', 'organization', 'addressee_profile_id', public.resolve_civizen_org_profile(),
        'scope_kind', 'locality', 'scope_country_code', 'OZ', 'scope_region_code', 'O1', 'scope_locality_code', 'Otown', 'submit', true));`));
    sql(`${asCitizen} SELECT public.set_matter_public_route('${matterId}', 'street_lighting');`);

    const founder = await signedIn(browser, 'maturehumanity@test.civizen.local');
    await founder.goto(`/contribute/matters/${matterId}`);
    const card = founder.getByTestId('matter-public-status');
    await card.getByTestId('public-delivery-open311').click();
    await expect(card.getByTestId('public-delivery')).toContainText('reference SR-1', { timeout: 30_000 });
    expect(received[0]).toContain('service_code=streetlight');
    expect(decodeURIComponent(received[0].replace(/\+/g, ' '))).toContain('the lamp on Elm Street is out');

    await card.getByTestId('public-delivery-refresh').click();
    await expect(card.getByTestId('public-delivery')).toContainText('Lamp replaced by the night crew.', { timeout: 30_000 });
  } finally {
    city.close();
    if (matterId) {
      sql(`DELETE FROM public.org_position_log WHERE item_id IN (SELECT id FROM public.org_position_items WHERE source_ref = '${matterId}')`);
      sql(`DELETE FROM public.org_position_items WHERE source_ref = '${matterId}'`);
      sql(`DELETE FROM public.matters WHERE id = '${matterId}'`);
    }
    if (bodyId) sql(`DELETE FROM public.public_bodies WHERE id = '${bodyId}'`);
  }
});
