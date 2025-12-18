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
    return this.page.getByRole('button', { name: /create|post/i }).first();
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
    return this.page.getByRole('button', { name: /Call To Action/i });
  }

  // CTA (Call To Action) specific fields
  get ctaLinkTextInput() {
    return this.page.getByRole('textbox', { name: 'Call To Action' });
  }

  get ctaUrlInput() {
    return this.page.getByRole('textbox', { name: 'URL' });
  }

  get memoOption() {
    return this.page.getByRole('button', { name: /memo/i });
  }

  // Creation form fields
  get displayNameInput() {
    return this.page.getByLabel(/display.*name|title|name/i).first();
  }

  get descriptionInput() {
    // TipTap rich text editor - contenteditable div with aria-label
    return this.page.getByRole('textbox', { name: 'Markdown editor' });
  }

  get saveAsDraftButton() {
    return this.page.getByRole('button', { name: /save as draft/i });
  }

  get saveButton() {
    return this.page.getByRole('button', { name: /^(create|post|save)$/i });
  }

  get cancelButton() {
    return this.page.getByRole('button', { name: /cancel/i });
  }

  // Response Options (in create callout dialog)
  get responseOptionsExpandButton() {
    return this.page.getByRole('button', { name: 'Expand' });
  }

  get responseOptionsHeading() {
    return this.page.getByRole('heading', { name: 'Response Options' });
  }

  // Collection type options
  get collectionNoneOption() {
    return this.page.getByRole('button', { name: 'None' }).last();
  }

  get collectionLinksFilesOption() {
    return this.page.getByRole('button', { name: 'Links & Files' });
  }

  get collectionPostsOption() {
    return this.page.getByRole('button', { name: 'Posts' });
  }

  get collectionMemosOption() {
    return this.page.getByRole('button', { name: 'Memos' });
  }

  get collectionWhiteboardsOption() {
    return this.page.getByRole('button', { name: 'Whiteboards' });
  }

  // Draft/Published indicators
  get draftIndicator() {
    return this.page.locator('[data-testid="draft-indicator"], .draft-badge');
  }

  get publishMenuItem() {
    return this.page.getByRole('menuitem', { name: /^(publish)$/i });
  }
  get unpublishMenuItem() {
    return this.page.getByRole('menuitem', { name: /^(unpublish)$/i });
  }

  get shareMenuItem() {
    return this.page.getByRole('menuitem', { name: /share/i });
  }

  // Callout details page
  get calloutDialog() {
    return this.page.getByRole('dialog');
  }

  get contextualMenuButton() {
    // Settings button inside the callout dialog (not the ones on the cards in the page)
    return this.calloutDialog.getByRole('button', { name: 'settings' });
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

  // Comments section - selectors verified via Playwright browser inspection
  get commentInput() {
    return this.page
      .getByRole('textbox', { name: 'Type your comment here' })
      .first();
  }

  get postCommentButton() {
    return this.page.getByRole('button', { name: 'Send' });
  }

  get deleteCommentButton() {
    return this.page.getByRole('button', { name: 'Delete' });
  }

  get replyButton() {
    return this.page.getByRole('button', { name: 'Reply' });
  }

  get addReactionButton() {
    return this.page.getByRole('button', { name: 'Add reaction' });
  }

  get insertEmojiButton() {
    return this.page.getByRole('button', { name: 'Insert Emoji' });
  }

  get mentionSomeoneButton() {
    return this.page.getByRole('button', { name: 'Mention someone' });
  }

  // Contributions
  get addContributionButton() {
    return this.page.getByRole('button', {
      name: /add|post/i,
    });
  }

  get contributionsList() {
    // Contributions are rendered as article elements or heading level 3 within the callout dialog
    // Using heading level 3 as a proxy since each contribution has a title rendered as h3
    return this.calloutDialog.getByRole('heading', { level: 2 });
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
      // TipTap editor - use fill() which works with contenteditable divs
      await this.descriptionInput.first().fill(description);
    }
  }

  async saveCallout(asDraft: boolean = false) {
    if (asDraft) {
      await this.saveAsDraftButton.click();
    } else {
      await this.saveButton.click();
    }
  }

  async expandResponseOptions() {
    await this.responseOptionsExpandButton.click();
    await delay(300); // Wait for animation
  }

  async selectCollectionType(
    type: 'none' | 'links' | 'posts' | 'memos' | 'whiteboards'
  ) {
    switch (type) {
      case 'links':
        await this.collectionLinksFilesOption.click();
        break;
      case 'posts':
        await this.collectionPostsOption.click();
        break;
      case 'memos':
        await this.collectionMemosOption.click();
        break;
      case 'whiteboards':
        await this.collectionWhiteboardsOption.click();
        break;
      case 'none':
      default:
        await this.collectionNoneOption.click();
    }
  }

  async createCallout(
    type: 'post' | 'whiteboard' | 'link' | 'memo',
    displayName: string,
    description?: string,
    asDraft: boolean = false,
    ctaOptions?: { linkText: string; url: string }
  ) {
    await this.clickAddCallout();
    await this.selectCalloutType(type);
    await this.fillCalloutDetails(displayName, description);

    // For CTA (link) callouts, fill the required link text and URL
    if (type === 'link' && ctaOptions) {
      await this.ctaLinkTextInput.fill(ctaOptions.linkText);
      await this.ctaUrlInput.fill(ctaOptions.url);
    }

    await delay(300); // Small delay to ensure the button is enabled
    await this.saveCallout(asDraft);

    // Wait for the callout to appear in the list after creation
    await expect(
      this.page.getByRole('heading', { name: displayName }).first()
    ).toBeVisible({ timeout: 10000 });
  }

  async createCalloutWithContributions(
    displayName: string,
    collectionType: 'links' | 'posts' | 'memos' | 'whiteboards',
    description?: string,
    asDraft: boolean = false
  ) {
    await this.clickAddCallout();
    await this.fillCalloutDetails(displayName, description);

    // Expand response options and select collection type
    await this.expandResponseOptions();
    await this.selectCollectionType(collectionType);

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
    // Click to focus the input
    await this.commentInput.click();

    // Use pressSequentially on the element to trigger proper input events
    await this.commentInput.pressSequentially(commentText);

    // Click the send button
    await this.postCommentButton.click();
  }

  async deleteComment(index: number = 0) {
    await this.deleteCommentButton.nth(index).click();
  }

  async replyToComment(replyText: string, index: number = 0) {
    await this.replyButton.nth(index).click();
    await this.commentInput.click();
    await this.commentInput.pressSequentially(replyText);
    await this.postCommentButton.click();
  }

  async getCommentCount(): Promise<number> {
    // Count Reply buttons as a proxy for comment count (each comment has a Reply button)
    return await this.replyButton.count();
  }

  async isCommentVisible(text: string): Promise<boolean> {
    return await this.page
      .getByText(text)
      .isVisible({ timeout: 5000 })
      .catch(() => false);
  }

  async isDeleteCommentButtonVisible(): Promise<boolean> {
    return await this.deleteCommentButton
      .first()
      .isVisible({ timeout: 5000 })
      .catch(() => false);
  }

  async isReplyButtonVisible(): Promise<boolean> {
    return await this.replyButton
      .first()
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
    // await this.page.getByLabel(/content|description/i).fill(content);

    const editor = this.page.getByRole('textbox', { name: /markdown editor/i });
    await editor.click(); // focus
    await this.page.keyboard.type(content, { delay: 50 });
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
