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
    // dashboard navigation. Try the direct link first, then fall back to
    // opening the user menu.
    //
    // Note: locator.isVisible() ignores its timeout option and resolves
    // immediately, which races the SPA's hydration — wait explicitly instead.
    const directLink = this.page.getByRole('link', { name: 'My Account' });
    const directLinkVisible = await directLink
      .waitFor({ state: 'visible', timeout: 10_000 })
      .then(() => true)
      .catch(() => false);
    if (directLinkVisible) {
      await directLink.click();
      return;
    }
    await userMenuAvatar(this.page).click();
    await this.page.getByRole('menuitem', { name: 'My Account' }).click();
  }

  get myAccountLink() {
    return this.page.getByRole('link', { name: 'My Account' });
  }
}
