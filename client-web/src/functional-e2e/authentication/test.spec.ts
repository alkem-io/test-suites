// TabsPage.ts

// class TabsPage {
//   constructor(page) {
//     this.page = page;
//     this.homeTab = 'a[href="/checkdefaultcallouts?tab=1"]';
//     this.communityTab = 'a[href="/checkdefaultcallouts?tab=2"]';
//     this.subspacesTab = 'a[href="/checkdefaultcallouts?tab=3"]';
//     this.knowledgeTab = 'a[href="/checkdefaultcallouts?tab=4"]';
//     this.settingsTab = 'a[href="/checkdefaultcallouts/settings"]';
//   }

//   async navigateToTab(tab) {
//     await this.page.click(tab);
//   }

//   async isTabSelected(tab) {
//     const isSelected = await this.page.evaluate(selector => {
//       return (
//         document.querySelector(selector).getAttribute('aria-selected') ===
//         'true'
//       );
//     }, tab);
//     return isSelected;
//   }
// }

// export default TabsPage;

// test.spec.ts
import { test, expect } from '@playwright/test';
import { TabsPage } from './TabsPage';
import { TestScenarioNoPreCreationConfig } from '@alkemio/tests-lib/dist/scenario/config/test-scenario-config';
import { createOrganization, TestScenarioFactory } from '@alkemio/tests-lib';

const baseUrl = 'https://dev-alkem.io/checkdefaultcallouts';

const scenarioConfig: TestScenarioNoPreCreationConfig = {
  name: 'organization',
};
beforeAll(async () => {
  const a = await TestScenarioFactory.createBaseScenario(scenarioConfig);
  console.log('Scenario created:', a);
});

test.describe('Tabs Navigation Tests', () => {
  let tabsPage: TabsPage;

  test.beforeEach(async ({ page }) => {
    tabsPage = new TabsPage(page);
    await page.goto(baseUrl);
  });

  test('should select Home tab', async () => {
    const a = await createOrganization(
      'Test Organization',
      'test-organization',
      'test-organization'
    );
    const orgId = a.data?.createOrganization?.id ?? '';
    console.log('Organization created:', a);

    await tabsPage.navigateToTab(tabsPage.homeTab);
    expect(await tabsPage.isTabSelected(tabsPage.homeTab)).toBe(true);
    expect(await tabsPage.isTabSelected(tabsPage.communityTab)).toBe(false);
    expect(await tabsPage.isTabSelected(tabsPage.subspacesTab)).toBe(false);
    expect(await tabsPage.isTabSelected(tabsPage.knowledgeTab)).toBe(false);
  });

  test('should select Community tab', async () => {
    await tabsPage.navigateToTab(tabsPage.communityTab);
    expect(await tabsPage.isTabSelected(tabsPage.communityTab)).toBe(true);
    expect(await tabsPage.isTabSelected(tabsPage.homeTab)).toBe(false);
    expect(await tabsPage.isTabSelected(tabsPage.subspacesTab)).toBe(false);
    expect(await tabsPage.isTabSelected(tabsPage.knowledgeTab)).toBe(false);
  });

  test('should select Subspaces tab', async () => {
    await tabsPage.navigateToTab(tabsPage.subspacesTab);
    expect(await tabsPage.isTabSelected(tabsPage.subspacesTab)).toBe(true);
    expect(await tabsPage.isTabSelected(tabsPage.homeTab)).toBe(false);
    expect(await tabsPage.isTabSelected(tabsPage.communityTab)).toBe(false);
    expect(await tabsPage.isTabSelected(tabsPage.knowledgeTab)).toBe(false);
  });

  test('should select Knowledge tab', async () => {
    await tabsPage.navigateToTab(tabsPage.knowledgeTab);
    expect(await tabsPage.isTabSelected(tabsPage.knowledgeTab)).toBe(true);
    expect(await tabsPage.isTabSelected(tabsPage.homeTab)).toBe(false);
    expect(await tabsPage.isTabSelected(tabsPage.communityTab)).toBe(false);
    expect(await tabsPage.isTabSelected(tabsPage.subspacesTab)).toBe(false);
  });

  test('should select Settings tab', async () => {
    await tabsPage.navigateToTab(tabsPage.settingsTab);
    expect(await tabsPage.isTabSelected(tabsPage.settingsTab)).toBe(false);
  });
});
