import { Page, expect } from '@playwright/test';
import { userMenuAvatar } from '../../authentication/common-authentication-page-elements';

export class HomePage {
  constructor(
    private page: Page,
    private baseUrl: string = process.env.ALKEMIO_BASE_URL ||
      'http://localhost:3000'
  ) {}

  async goto() {
    await this.page.goto(`${this.baseUrl}/home`);
  }

  async navigateToMyAccount() {
    // CRD: "My Account" is primarily a menuitem inside the header user menu
    // (the avatar button); some home states also expose a direct link in the
    // dashboard navigation. Prefer the direct link, fall back to the menu.
    //
    // Wait for *either* affordance rather than polling the direct link and
    // then falling through: locator.isVisible() ignores its timeout option and
    // resolves immediately, which races the SPA's hydration, while waiting on
    // the direct link alone would burn its full timeout in every state that
    // only renders the avatar. Once one of them is up, isVisible() is a safe
    // instantaneous check.
    const directLink = this.page.getByRole('link', { name: 'My Account' });
    const avatar = userMenuAvatar(this.page);
    await expect(directLink.or(avatar).first()).toBeVisible({
      timeout: 10_000,
    });

    if (await directLink.isVisible()) {
      await directLink.click();
      return;
    }
    await avatar.click();
    await this.page.getByRole('menuitem', { name: 'My Account' }).click();
  }

  get myAccountLink() {
    return this.page.getByRole('link', { name: 'My Account' });
  }
}
