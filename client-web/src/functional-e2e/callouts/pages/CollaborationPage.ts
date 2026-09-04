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
    // CRD renamed the card-level contribution button to "Add Post" too, so
    // casing no longer disambiguates from the create trigger; scope to the
    // sidebar, which holds only the tab-level trigger. The container differs
    // by page: SpaceSidebar is a <nav aria-label="Space sidebar">, while
    // SubspaceSidebar is an <aside aria-label="SubSpace sidebar"> (role
    // complementary, so getByRole('navigation') cannot cover both).
    return this.page
      .locator('[aria-label="Space sidebar"], [aria-label="SubSpace sidebar"]')
      .getByRole('button', { name: 'Add Post', exact: true });
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
    // exact: avoid also matching the "Whiteboards" responses radio.
    return this.page.getByRole('radio', { name: 'Whiteboard', exact: true });
  }

  get linkCollectionOption() {
    return this.page.getByRole('button', { name: /link.*collection/i });
  }

  get linkOption() {
    return this.page.getByRole('radio', { name: 'Call to Action' });
  }

  // CTA (Call To Action) specific fields
  get ctaLinkTextInput() {
    // CRD: after selecting the "Call to Action" framing, the link's label field
    // is a textbox named "Display Name" (alongside the "URL" textbox).
    return this.page.getByRole('textbox', { name: 'Display Name' });
  }

  get ctaUrlInput() {
    return this.page.getByRole('textbox', { name: 'URL' });
  }

  get memoOption() {
    // exact: avoid also matching the "Memos" responses radio.
    return this.page.getByRole('radio', { name: 'Memo', exact: true });
  }

  // Creation form fields
  get displayNameInput() {
    // CRD: the callout title field is a textbox with accessible name "Title".
    return this.page.getByRole('textbox', { name: 'Title' });
  }

  get descriptionInput() {
    // CRD: the rich-text body editor's accessible name is its placeholder
    // "Write something..." (was "Markdown editor").
    return this.page.getByRole('textbox', { name: 'Write something' });
  }

  get saveAsDraftButton() {
    return this.page.getByRole('button', { name: 'Save Draft' });
  }

  get saveButton() {
    // CRD primary submit is "Post" (create) / "Save" (edit); allow "Publish" too.
    return this.page.getByRole('button', {
      name: /^(create|post|save|publish)$/i,
    });
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
    return this.page.getByRole('radio', { name: 'Links & Files' });
  }

  get collectionPostsOption() {
    return this.page.getByRole('radio', { name: 'Posts' });
  }

  get collectionMemosOption() {
    return this.page.getByRole('radio', { name: 'Memos' });
  }

  get collectionWhiteboardsOption() {
    return this.page.getByRole('radio', { name: 'Whiteboards' });
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
    return this.page.getByRole('menuitem', { name: 'Delete' });
  }

  get settingsButton() {
    return this.page.getByRole('button', { name: /settings/i });
  }

  // Comments section
  get commentInput() {
    // CRD: the comment box is a textbox with placeholder "Add a comment..."
    // (no accessible name/label) under the "Discussion" section heading.
    return this.page.getByPlaceholder('Add a comment...').first();
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
    // CRD: the contribution-add button is named by collection type
    // ("Add post" / "Add link or file" / "Add memo" / "Add whiteboard"),
    // scoped to the open callout detail dialog so it excludes the tab-level
    // "Add Post" create button behind it.
    return this.calloutDialog.getByRole('button', {
      name: /add (post|link|file|memo|whiteboard)/i,
    });
  }

  get contributionsList() {
    // Contributions are rendered as article elements or heading level 3 within the callout dialog
    // Using heading level 3 as a proxy since each contribution has a title rendered as h3
    return this.calloutDialog.getByRole('heading', { level: 2 });
  }

  // Confirmation dialog
  get confirmDialog() {
    // CRD confirmations are Radix AlertDialogs (role=alertdialog),
    // e.g. "Publish this post?", "Delete callout".
    return this.page.getByRole('alertdialog');
  }

  get confirmDeleteButton() {
    return this.confirmDialog.getByRole('button', { name: 'Delete' });
  }

  get confirmButton() {
    return this.confirmDialog.getByRole('button', {
      name: /confirm|yes|delete|publish/i,
    });
  }

  // Methods

  async navigateToSpace(spaceNameId: string) {
    await this.page.goto(`${this.baseUrl}/${spaceNameId}`);
    await this.dismissCookieBanner();
  }

  async navigateToSubspace(spaceNameId: string, subspaceNameId: string) {
    await this.page.goto(
      `${this.baseUrl}/${spaceNameId}/challenges/${subspaceNameId}`
    );
    await this.dismissCookieBanner();
  }

  // CRD: a cookie-consent banner can overlay controls at the viewport bottom
  // (e.g. the create dialog's submit button); dismiss it if present.
  private async dismissCookieBanner() {
    const accept = this.page.getByRole('button', {
      name: /accept all cookies/i,
    });
    if (await accept.isVisible({ timeout: 2000 }).catch(() => false)) {
      await accept.click().catch(() => {});
    }
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
    // CRD: the "Responses" radiogroup is shown inline in the create dialog;
    // no expand step is needed (kept as a no-op for scenario compatibility).
    await Promise.resolve();
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
        // CRD: leaving no Responses radio selected means "no responses".
        break;
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
    return this.page.getByRole('heading', {
      name: name,
      exact: true,
    });
  }

  async clickCallout(name: string) {
    // If this callout's detail dialog is already open (e.g. straight after an
    // edit, where the dialog stays open over the feed), there is nothing to do.
    const openDialog = this.page.getByRole('dialog', { name });
    if (await openDialog.isVisible({ timeout: 1000 }).catch(() => false)) {
      return;
    }
    // CRD: the callout card exposes an "Open {title}" link that opens the
    // callout detail dialog (the heading itself is not the click target).
    // A freshly created callout can take a while to surface in the feed —
    // and for a brand-new DRAFT callout a plain wait is not enough: the feed
    // rendered at navigation time can simply not include it yet (server-side
    // visibility/auth caching), so no amount of waiting on THAT page helps.
    // Poll with reloads: three 10s attempts, reloading between them.
    const link = this.page.getByRole('link', { name: `Open ${name}` });
    for (let attempt = 1; ; attempt++) {
      try {
        await link.click({ timeout: 10000 });
        return;
      } catch (e) {
        if (attempt >= 3) throw e;
        await this.page.reload();
        await this.dismissCookieBanner();
      }
    }
  }

  async isCalloutVisible(name: string): Promise<boolean> {
    const callout = await this.getCalloutByName(name);
    return await callout.isVisible({ timeout: 10000 }).catch(() => false);
  }

  async publishCallout() {
    await this.publishMenuItem.click();
    // CRD: publishing opens a "Publish this post?" alertdialog whose confirm
    // button is "Publish" (a "Notify space members" switch defaults on).
    if (
      await this.confirmDialog.isVisible({ timeout: 5000 }).catch(() => false)
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
    await this.contextualMenuButton.click({ timeout: 5000 });
    // Wait for menu to open
    // await delay(300);
  }

  async editCallout() {
    await this.openContextualMenu();
    await this.editButton.click({ timeout: 5000 });
  }

  async openSettings() {
    await this.settingsButton.click({ timeout: 5000 });
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
    await this.addContributionButton.first().click({ timeout: 5000 });
    await this.page.getByRole('textbox', { name: 'Title' }).fill(title);

    // Post-contribution body editor placeholder is "Write your post..." (the
    // callout create form uses "Write something..."); match either.
    const editor = this.page.getByRole('textbox', {
      name: /write (something|your post)/i,
    });
    await editor.click(); // focus
    await this.page.keyboard.type(content, { delay: 50 });
    await this.saveButton.click();
  }

  async addLinkContribution(url: string, title?: string) {
    await this.addContributionButton.first().click();
    await this.page.getByRole('textbox', { name: 'URL' }).fill(url);
    if (title) {
      // CRD: the link's label field is "Display name" (not "Title").
      await this.page
        .getByRole('textbox', { name: 'Display name' })
        .fill(title);
    }
    // CRD: the link contribution dialog submit button is "Add".
    await this.page.getByRole('button', { name: 'Add', exact: true }).click();
  }

  async getContributionCount(): Promise<number> {
    return await this.contributionsList.count();
  }
}
