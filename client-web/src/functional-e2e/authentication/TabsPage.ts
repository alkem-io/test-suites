import { Page } from '@playwright/test';

export class TabsPage {
  page: Page;
  homeTab: string;
  communityTab: string;
  subspacesTab: string;
  knowledgeTab: string;
  settingsTab: string;

  constructor(page: Page) {
    this.page = page;
    this.homeTab = 'a[href="/checkdefaultcallouts?tab=1"]';
    this.communityTab = 'a[href="/checkdefaultcallouts?tab=2"]';
    this.subspacesTab = 'a[href="/checkdefaultcallouts?tab=3"]';
    this.knowledgeTab = 'a[href="/checkdefaultcallouts?tab=4"]';
    this.settingsTab = 'a[href="/checkdefaultcallouts/settings"]';
  }

  async navigateToTab(tab: string): Promise<void> {
    await this.page.click(tab);
  }

  async isTabSelected(tab: string): Promise<boolean> {
    const isSelected = await this.page.evaluate(selector => {
      const element = document.querySelector(selector);
      if (!element) return false;
      return element.getAttribute('aria-selected') === 'true';
    }, tab);
    return isSelected;
  }
}
