import { Page, expect } from '@playwright/test';
import { acceptCookiesIfVisible } from '@src/functional-e2e/helpers/cookies.helper';

export class SpacePage {
  constructor(
    private page: Page,
    private baseUrl: string = process.env.ALKEMIO_BASE_URL ||
      'http://localhost:3000'
  ) {}

  // Navigation tabs
  get homeTab() {
    return this.page.getByRole('tab', { name: 'Home' });
  }

  get communityTab() {
    return this.page.getByRole('tab', { name: 'community' });
  }

  get subspacesTab() {
    return this.page.getByRole('tab', { name: 'Subspaces' });
  }

  get knowledgeTab() {
    return this.page.getByRole('tab', { name: 'Knowledge' });
  }

  get settingsTab() {
    return this.page.getByRole('tab', { name: 'Settings' });
  }

  // Success dialog
  get successDialog() {
    return this.page.getByRole('dialog');
  }

  get successDialogText() {
    return this.page.getByText(/Your Space is Ready/);
  }

  get getStartedButton() {
    return this.page.getByRole('button', { name: 'Get Started' });
  }

  get getStartedButtonUppercase() {
    return this.page.getByRole('button', { name: 'GET STARTED' });
  }

  // Tutorial headings
  get tutorialHeadings() {
    return this.page.getByRole('heading', { level: 2 });
  }

  // Methods
  async goto(spaceUrl: string) {
    await this.page.goto(`${this.baseUrl}/${spaceUrl}`);
    await acceptCookiesIfVisible(this.page);
  }

  async waitForSpaceReady(timeout: number = 30000) {
    await expect(this.successDialogText).toBeVisible({ timeout });
  }

  async clickGetStarted() {
    // Try both button name variants
    const btn = this.page.getByRole('button', { name: /get started/i });
    await btn.click();
  }

  async dismissSuccessDialog() {
    await this.clickGetStarted();
    await expect(this.successDialog).toBeHidden();
  }

  async navigateToSettings() {
    await this.settingsTab.click();
  }

  async verifySpaceTitle(title: string) {
    await expect(this.page.getByRole('heading', { name: title })).toBeVisible();
  }

  async verifyTutorialsPresent(minCount: number = 2) {
    const tutorialHeadingPattern = /^[👋📚↪️🤝⚙️🧩🧹]/u;
    const allHeadings = this.tutorialHeadings;

    // Wait for at least one tutorial heading to appear
    await expect(async () => {
      const headings = await allHeadings.all();
      const tutorialHeadings = [];
      for (const heading of headings) {
        const text = await heading.textContent();
        if (text && tutorialHeadingPattern.test(text)) {
          tutorialHeadings.push(text);
        }
      }
      expect(tutorialHeadings.length).toBeGreaterThanOrEqual(minCount);
    }).toPass({ timeout: 15000 });
  }
}
