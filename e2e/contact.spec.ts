import { expect, test } from '@playwright/test';

/**
 * Contact page (owner decision 2026-10-27): a guest reaches it from the public footer, sees where each kind of question
 * goes and the emergency note. Without `VITE_CONTACT_EMAIL` (as in CI) it says the address is being set up.
 */
test('a guest finds the contact page from the footer', async ({ page }) => {
  await page.goto('/privacy');
  await page.locator('footer').getByRole('link', { name: 'Contact', exact: true }).click();
  await expect(page).toHaveURL(/\/contact$/);
  await expect(page.getByRole('heading', { name: 'Contact', level: 1 })).toBeVisible();
  const email = page.getByTestId('contact-email');
  if (process.env.VITE_CONTACT_EMAIL) {
    await expect(email.getByRole('link', { name: process.env.VITE_CONTACT_EMAIL })).toHaveAttribute('href', `mailto:${process.env.VITE_CONTACT_EMAIL}`);
  } else {
    await expect(email).toContainText('The contact address is being set up');
  }
  await expect(page.getByRole('link', { name: 'Open Moderation' })).toHaveAttribute('href', '/moderation?tab=mine');
  await expect(page.getByTestId('contact-safety')).toContainText('Civizen is not an emergency service');
});
