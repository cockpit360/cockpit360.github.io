const { test, expect } = require('@playwright/test');
const SIZES = [[360, 740], [390, 844], [768, 1024], [1280, 800]];

for (const [w, h] of SIZES) {
  test('page de connexion ' + w + 'x' + h + ' : aucune erreur, pas de débordement', async ({ page }) => {
    const errs = [];
    page.on('pageerror', e => errs.push('pageerror: ' + e.message));
    page.on('console', m => { if (m.type() === 'error' && !/Failed to load resource|net::ERR|script.google.com/.test(m.text())) errs.push('console: ' + m.text()); });
    page.on('dialog', d => { errs.push('dialog: ' + d.message()); d.dismiss(); });
    await page.setViewportSize({ width: w, height: h });
    await page.goto('/index.html');
    await page.waitForTimeout(1500);
    await expect(page.locator('#passGate')).toBeVisible();
    await expect(page.locator('#passGate input[type=password]')).toBeVisible();
    const sw = await page.evaluate(() => document.documentElement.scrollWidth);
    expect(sw, 'débordement horizontal').toBeLessThanOrEqual(w);
    expect(errs).toEqual([]);
  });
}

test('un mauvais mot de passe ne déverrouille pas la page', async ({ page }) => {
  await page.goto('/index.html');
  await page.fill('#passGate input[type=password]', 'mot-de-passe-incorrect');
  await page.keyboard.press('Enter');
  await page.waitForTimeout(2500);
  await expect(page.locator('#passGate')).toBeVisible();
});
