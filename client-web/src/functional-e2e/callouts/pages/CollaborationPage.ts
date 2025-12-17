import { delay } from '@alkemio/tests-lib';
import { Page, expect, Locator } from '@playwright/test';

/**
 * Page object for the Space/Subspace Collaboration (Knowledge) tab
 * Handles callout viewing and management
 */
export class CollaborationPage {
  constructor(
    private page: Page,
    private baseUrl: string = process.env.ALKEMIO_BASE_URL ||
      'http://localhost:3000'
  ) {}

  // Navigation
  get knowledgeTab() {
    return this.page.getByRole('tab', { name: 'Knowledge' });
  }

  // Callout creation
  get addCalloutButton() {
    return this.page.getByRole('button', { name: /post/i }).first();
  }

  get createCalloutButton() {
    return this.page.getByRole('button', { name: /create.*callout/i });
  }

  // Callout list
  get calloutCards() {
    return this.page.locator('[data-testid="callout-card"]');
  }

  // Callout types in creation dialog
  get postCollectionOption() {
    return this.page.getByRole('button', { name: /post.*collection/i });
  }

  get whiteboardOption() {
    return this.page.getByRole('button', { name: /whiteboard/i });
  }

  get linkCollectionOption() {
    return this.page.getByRole('button', { name: /link.*collection/i });
  }

  get linkOption() {
    return this.page.getByRole('button', { name: /cta/i });
  }

  get memoOption() {
    return this.page.getByRole('button', { name: /memo/i });
  }

  // Creation form fields
  get displayNameInput() {
    return this.page.getByLabel(/display.*name|title|name/i).first();
  }

  get descriptionInput() {
    return this.page.getByLabel(/description/i).first();
  }

  get saveAsDraftButton() {
    return this.page.getByRole('button', { name: /save as draft/i });
  }

  get saveButton() {
    return this.page.getByRole('button', { name: /post/i });
  }

  get cancelButton() {
    return this.page.getByRole('button', { name: /cancel/i });
  }

  // Draft/Published indicators
  get draftIndicator() {
    return this.page.locator('[data-testid="draft-indicator"], .draft-badge');
  }

  get publishMenuItem() {
    return this.page.getByRole('menuitem', { name: /publish|unpublish/i });
  }

  get shareMenuItem() {
    return this.page.getByRole('menuitem', { name: /share/i });
  }

  // Callout details page
  get contextualMenuButton() {
    return this.page.locator('#callout-settings-button').first();
  }

  get editButton() {
    return this.page.getByRole('menuitem', { name: /edit/i });
  }

  get deleteButton() {
    return this.page.getByRole('menuitem', { name: /delete/i });
  }

  get settingsButton() {
    return this.page.getByRole('button', { name: /settings/i });
  }

  // Comments section
  get commentsSection() {
    return this.page.locator('[data-testid="comments-section"], .comments');
  }

  get commentInput() {
    return this.page.getByPlaceholder(/Type your comment here/i);
  }

  get postCommentButton() {
    return this.page.getByRole('button', { name: /post|send|submit/i });
  }

  get commentsList() {
    return this.page.locator('[data-testid="comment"], .comment-item');
  }

  // Contributions
  get addContributionButton() {
    return this.page.getByRole('button', {
      name: /add.*post|add.*link|contribute/i,
    });
  }

  get contributionsList() {
    return this.page.locator(
      '[data-testid="contribution"], .contribution-item'
    );
  }

  // Confirmation dialog
  get confirmDialog() {
    return this.page.getByRole('dialog');
  }

  get confirmButton() {
    return this.page.getByRole('button', {
      name: /confirm|yes|delete|publish/i,
    });
  }

  // Methods

  async navigateToSpace(spaceNameId: string) {
    await this.page.goto(`${this.baseUrl}/${spaceNameId}`);
  }

  async navigateToSubspace(spaceNameId: string, subspaceNameId: string) {
    await this.page.goto(
      `${this.baseUrl}/${spaceNameId}/challenges/${subspaceNameId}`
    );
  }

  async openKnowledgeTab() {
    await this.knowledgeTab.click();
    // Wait for the tab content to load
    await this.page.waitForLoadState('networkidle');
  }

  async isAddCalloutVisible(): Promise<boolean> {
    return await this.addCalloutButton
      .isVisible({ timeout: 5000 })
      .catch(() => false);
  }

  async clickAddCallout() {
    await this.addCalloutButton.click();
  }

  async selectCalloutType(type: 'post' | 'whiteboard' | 'link' | 'memo') {
    switch (type) {
      case 'whiteboard':
        await this.whiteboardOption.click();
        break;
      case 'link':
        await this.linkOption.click();
        break;
      case 'memo':
        await this.memoOption.click();
        break;
      case 'post':
      default:
      // Default selected (post)
    }
  }

  async fillCalloutDetails(displayName: string, description?: string) {
    await this.displayNameInput.fill(displayName);
    if (description) {
      // todo: fix this
      // await this.descriptionInput.fill(description);
    }
  }

  async saveCallout(asDraft: boolean = false) {
    if (asDraft) {
      await this.saveAsDraftButton.click();
    } else {
      await this.saveButton.click();
    }
  }

  async createCallout(
    type: 'post' | 'whiteboard' | 'link',
    displayName: string,
    description?: string,
    asDraft: boolean = false
  ) {
    await this.clickAddCallout();
    await this.selectCalloutType(type);
    await this.fillCalloutDetails(displayName, description);
    await delay(300); // Small delay to ensure the button is enabled
    await this.saveCallout(asDraft);

    // Wait for the callout to appear in the list after creation
    await expect(
      this.page.getByRole('heading', { name: displayName }).first()
    ).toBeVisible({ timeout: 10000 });
  }

  async getCalloutByName(name: string): Promise<Locator> {
    return this.page
      .getByRole('heading', {
        name: name,
      })
      .first();
  }

  async clickCallout(name: string) {
    const callout = await this.getCalloutByName(name);
    await callout.click();
  }

  async isCalloutVisible(name: string): Promise<boolean> {
    const callout = await this.getCalloutByName(name);
    return await callout.isVisible({ timeout: 5000 }).catch(() => false);
  }

  async publishCallout() {
    await this.publishMenuItem.click();
    // Wait for confirmation if dialog appears
    if (
      await this.confirmDialog.isVisible({ timeout: 2000 }).catch(() => false)
    ) {
      await this.confirmButton.click();
    }
  }

  async deleteCallout() {
    await this.openContextualMenu();
    await this.deleteButton.click();
    // Confirm deletion
    await expect(this.confirmDialog).toBeVisible();
    await this.confirmButton.click();
  }

  async addComment(commentText: string) {
    await this.commentInput.fill(commentText);
    await this.postCommentButton.click();
  }

  async getCommentCount(): Promise<number> {
    return await this.commentsList.count();
  }

  async isCommentVisible(text: string): Promise<boolean> {
    return await this.page
      .getByText(text)
      .isVisible({ timeout: 5000 })
      .catch(() => false);
  }

  async openContextualMenu() {
    await this.contextualMenuButton.click();
    // Wait for menu to open
    await delay(300);
  }

  async editCallout() {
    await this.openContextualMenu();
    await this.editButton.click();
  }

  async openSettings() {
    await this.settingsButton.click();
  }

  async isEditButtonVisible(): Promise<boolean> {
    try {
      await this.openContextualMenu();
      return await this.editButton
        .isVisible({ timeout: 5000 })
        .catch(() => false);
    } catch {
      return false;
    }
  }

  async isDeleteButtonVisible(): Promise<boolean> {
    try {
      await this.openContextualMenu();
      return await this.deleteButton
        .isVisible({ timeout: 5000 })
        .catch(() => false);
    } catch {
      return false;
    }
  }

  async isCommentInputVisible(): Promise<boolean> {
    return await this.commentInput
      .isVisible({ timeout: 5000 })
      .catch(() => false);
  }

  async addPostContribution(title: string, content: string) {
    await this.addContributionButton.click();
    await this.page.getByLabel(/title/i).fill(title);
    await this.page.getByLabel(/content|description/i).fill(content);
    await this.saveButton.click();
  }

  async addLinkContribution(url: string, title?: string) {
    await this.addContributionButton.click();
    await this.page.getByLabel(/url/i).fill(url);
    if (title) {
      await this.page.getByLabel(/title/i).fill(title);
    }
    await this.saveButton.click();
  }

  async getContributionCount(): Promise<number> {
    return await this.contributionsList.count();
  }
}
