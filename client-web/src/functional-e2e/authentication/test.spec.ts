import { test, expect } from '@playwright/test';
import { TabsPage } from './TabsPage';
import {
  createOrganization,
  TestScenarioFactory,
  TestScenarioNoPreCreationConfig,
} from '@alkemio/tests-lib';
import { testConfiguration } from '@src/config/test.configuration';

const baseUrl = `${testConfiguration.endPoints.server}/checkdefaultcallouts`; //'https://dev-alkem.io/checkdefaultcallouts';

const scenarioConfig: TestScenarioNoPreCreationConfig = {
  name: 'organization',
};
test.beforeAll(async () => {
  await TestScenarioFactory.createBaseScenarioEmpty(scenarioConfig);
  console.log('Scenario setup completed');
});

test.describe.skip('Tabs Navigation Tests', () => {
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
